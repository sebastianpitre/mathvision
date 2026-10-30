/* =========================================================
   GIRAGAMIF · RULETA DE LA SUERTE
   ---------------------------------------------------------
   El administrador crea ruletas con premios y el % de
   probabilidad de cada uno (suman 100). Cada giro cuesta
   tiquetes 🎫, que se ganan en las misiones de los eventos.

   El premio lo elige el servidor (con números aleatorios
   criptográficos); el navegador solo anima la ruleta hasta
   donde el servidor dijo.
========================================================= */

import crypto from "node:crypto";

import { pool, enTransaccion } from "../database/db.js";
import { entregarRecompensa } from "../progreso/progreso.js";
import { entregarCosmetico } from "../perfiles/cosmeticos.js";
import { errorConEstado } from "../http/ruta.js";

export const TIPOS_PREMIO = {
    oro: "Oro",
    diamantes: "Diamantes",
    tickets: "Tiquetes",
    personaje: "Personaje",
    foto: "Foto de perfil",
    marco: "Marco",
    nada: "Sigue intentando",
};

const MAX_PREMIOS = 12;

/* Nombre e imagen de cada premio (para la ruleta y el modal). */
async function conDetalle(premios) {
    const personajes = premios.filter((p) => p.tipo === "personaje").map((p) => p.ref);
    const cosmeticos = premios.filter((p) => p.tipo === "foto" || p.tipo === "marco").map((p) => Number(p.ref));
    const [{ rows: ps }, { rows: cs }] = await Promise.all([
        pool.query("SELECT id, name, thumbnail_path FROM characters WHERE id = ANY($1)", [personajes]),
        pool.query("SELECT id, nombre, ruta FROM cosmeticos WHERE id = ANY($1)", [cosmeticos]),
    ]);
    const p = new Map(ps.map((x) => [x.id, x]));
    const c = new Map(cs.map((x) => [x.id, x]));
    return premios.map((x) => {
        let nombre = TIPOS_PREMIO[x.tipo];
        let imagen = null;
        if (x.tipo === "oro" || x.tipo === "diamantes" || x.tipo === "tickets") nombre = `${x.cantidad} ${TIPOS_PREMIO[x.tipo].toLowerCase()}`;
        if (x.tipo === "personaje") ({ name: nombre = "Personaje", thumbnail_path: imagen = null } = p.get(x.ref) || {});
        if (x.tipo === "foto" || x.tipo === "marco") ({ nombre = TIPOS_PREMIO[x.tipo], ruta: imagen = null } = c.get(Number(x.ref)) || {});
        return {
            id: x.id,
            tipo: x.tipo,
            cantidad: x.cantidad,
            ref: x.ref,
            nombre,
            imagen,
            probabilidad: Number(x.probabilidad),
            repetido_oro: x.repetido_oro,
        };
    });
}

/* ---------------- Jugador ---------------- */

export async function ruletasDelJugador(userId) {
    const { rows: ruletas } = await pool.query(
        `
        SELECT * FROM ruletas
        WHERE activo AND (inicio IS NULL OR inicio <= NOW()) AND (fin IS NULL OR fin > NOW())
        ORDER BY orden, id
        `
    );
    const { rows: premios } = await pool.query(
        "SELECT * FROM ruleta_premios WHERE ruleta_id = ANY($1) ORDER BY orden, id",
        [ruletas.map((r) => r.id)]
    );
    const detalle = await conDetalle(premios);
    const { rows: perfil } = await pool.query("SELECT tickets FROM player_profiles WHERE user_id = $1", [userId]);
    const { rows: ultimos } = await pool.query(
        `
        SELECT g.creado_en, g.entregado, g.ruleta_id, g.premio_id
        FROM ruleta_giros g
        WHERE g.user_id = $1
        ORDER BY g.creado_en DESC
        LIMIT 10
        `,
        [userId]
    );
    return {
        tickets: perfil[0]?.tickets ?? 0,
        ruletas: ruletas.map((r) => ({
            id: r.id,
            nombre: r.nombre,
            descripcion: r.descripcion,
            costo: r.costo,
            fin: r.fin,
            premios: detalle.filter((p) => premios.find((x) => x.id === p.id)?.ruleta_id === r.id),
        })),
        ultimos,
    };
}

/* Elige un premio según su probabilidad (pesos). */
function elegir(premios) {
    const total = premios.reduce((s, p) => s + Number(p.probabilidad), 0);
    if (total <= 0) return premios[0];
    let n = (crypto.randomInt(0, 1_000_000_000) / 1_000_000_000) * total;
    for (const p of premios) {
        n -= Number(p.probabilidad);
        if (n < 0) return p;
    }
    return premios[premios.length - 1];
}

export async function girar(userId, ruletaId) {
    return enTransaccion(async (client) => {
        const { rows: rs } = await client.query(
            `
            SELECT * FROM ruletas
            WHERE id = $1 AND activo AND (inicio IS NULL OR inicio <= NOW()) AND (fin IS NULL OR fin > NOW())
            `,
            [ruletaId]
        );
        const ruleta = rs[0];
        if (!ruleta) throw errorConEstado("Esa ruleta no está disponible.", 404);

        const { rows: premios } = await client.query("SELECT * FROM ruleta_premios WHERE ruleta_id = $1 ORDER BY orden, id", [ruleta.id]);
        if (!premios.length) throw errorConEstado("Esta ruleta todavía no tiene premios.");

        const { rows: perfil } = await client.query("SELECT tickets FROM player_profiles WHERE user_id = $1 FOR UPDATE", [userId]);
        const tiene = perfil[0]?.tickets ?? 0;
        if (tiene < ruleta.costo) {
            throw errorConEstado(`Necesitas ${ruleta.costo} 🎫 para girar. Gánalos en las misiones de los eventos.`);
        }
        await client.query("UPDATE player_profiles SET tickets = tickets - $2 WHERE user_id = $1", [userId, ruleta.costo]);

        const premio = elegir(premios);
        const entregado = { tipo: premio.tipo, cantidad: premio.cantidad, repetido: false, oro: 0, diamantes: 0, tickets: 0 };

        if (premio.tipo === "oro") entregado.oro = premio.cantidad;
        if (premio.tipo === "diamantes") entregado.diamantes = premio.cantidad;
        if (premio.tipo === "tickets") {
            entregado.tickets = premio.cantidad;
            await client.query("UPDATE player_profiles SET tickets = tickets + $2 WHERE user_id = $1", [userId, premio.cantidad]);
        }
        if (premio.tipo === "personaje") {
            const { rowCount } = await client.query(
                `
                INSERT INTO personajes_jugador (user_id, character_id, moneda)
                SELECT $1, id, 'ruleta' FROM characters WHERE id = $2
                ON CONFLICT DO NOTHING
                `,
                [userId, premio.ref]
            );
            if (!rowCount) entregado.repetido = true;
        }
        if (premio.tipo === "foto" || premio.tipo === "marco") {
            const nuevo = await entregarCosmetico(client, userId, Number(premio.ref), `ruleta:${ruleta.id}`);
            if (!nuevo) entregado.repetido = true;
        }
        // Si ya lo tenía, recibe oro de compensación.
        if (entregado.repetido) entregado.oro = premio.repetido_oro || 0;

        if (entregado.oro || entregado.diamantes) {
            await entregarRecompensa(client, userId, { oro: entregado.oro, diamantes: entregado.diamantes });
        }

        await client.query(
            "INSERT INTO ruleta_giros (user_id, ruleta_id, premio_id, entregado) VALUES ($1, $2, $3, $4)",
            [userId, ruleta.id, premio.id, JSON.stringify(entregado)]
        );

        const { rows: final } = await client.query("SELECT tickets FROM player_profiles WHERE user_id = $1", [userId]);
        return { premioId: premio.id, entregado, tickets: final[0].tickets };
    });
}

/* ---------------- Panel ---------------- */

export async function listarRuletasAdmin() {
    const { rows: ruletas } = await pool.query(
        `
        SELECT r.*, (SELECT COUNT(*)::int FROM ruleta_giros g WHERE g.ruleta_id = r.id) AS giros
        FROM ruletas r ORDER BY r.orden, r.id DESC
        `
    );
    const { rows: premios } = await pool.query(
        `
        SELECT p.*, (SELECT COUNT(*)::int FROM ruleta_giros g WHERE g.premio_id = p.id) AS salio
        FROM ruleta_premios p ORDER BY p.orden, p.id
        `
    );
    const detalle = await conDetalle(premios);
    return ruletas.map((r) => ({
        ...r,
        premios: premios
            .filter((p) => p.ruleta_id === r.id)
            .map((p) => ({ ...detalle.find((d) => d.id === p.id), salio: p.salio })),
    }));
}

async function limpiar(datos = {}) {
    const nombre = String(datos.nombre || "").trim().slice(0, 80);
    if (!nombre) throw errorConEstado("Ponle un nombre a la ruleta.");
    const costo = Math.round(Number(datos.costo));
    if (!Number.isFinite(costo) || costo < 1 || costo > 1000) throw errorConEstado("El costo va de 1 a 1.000 tiquetes.");
    const fecha = (v) => {
        if (!v) return null;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) throw errorConEstado("Fecha no válida.");
        return d;
    };
    const inicio = fecha(datos.inicio);
    const fin = fecha(datos.fin);
    if (inicio && fin && fin <= inicio) throw errorConEstado("La fecha de fin debe ser después del inicio.");

    const premios = Array.isArray(datos.premios) ? datos.premios : [];
    if (premios.length < 2) throw errorConEstado("La ruleta necesita al menos 2 premios.");
    if (premios.length > MAX_PREMIOS) throw errorConEstado(`Máximo ${MAX_PREMIOS} premios por ruleta.`);

    const { rows: personajes } = await pool.query("SELECT id FROM characters");
    const { rows: cosmeticos } = await pool.query("SELECT id, tipo FROM cosmeticos");
    const hayPersonaje = new Set(personajes.map((p) => p.id));
    const tipoCosmetico = new Map(cosmeticos.map((c) => [c.id, c.tipo]));

    const limpios = premios.map((p, i) => {
        const n = i + 1;
        if (!TIPOS_PREMIO[p.tipo]) throw errorConEstado(`Premio ${n}: tipo no válido.`);
        const probabilidad = Math.round(Number(p.probabilidad) * 1000) / 1000;
        if (!Number.isFinite(probabilidad) || probabilidad < 0 || probabilidad > 100) throw errorConEstado(`Premio ${n}: el % va de 0 a 100.`);
        const cantidad = Math.max(0, Math.min(1000000, Math.round(Number(p.cantidad) || 0)));
        if (["oro", "diamantes", "tickets"].includes(p.tipo) && cantidad < 1) throw errorConEstado(`Premio ${n}: pon la cantidad.`);
        const ref = p.ref != null && p.ref !== "" ? String(p.ref) : null;
        if (p.tipo === "personaje" && !hayPersonaje.has(ref)) throw errorConEstado(`Premio ${n}: elige el personaje.`);
        if ((p.tipo === "foto" || p.tipo === "marco") && tipoCosmetico.get(Number(ref)) !== p.tipo) throw errorConEstado(`Premio ${n}: elige ${p.tipo === "foto" ? "la foto" : "el marco"}.`);
        return {
            id: p.id ? Number(p.id) : null,
            tipo: p.tipo,
            cantidad,
            ref: ["personaje", "foto", "marco"].includes(p.tipo) ? ref : null,
            probabilidad,
            repetido_oro: Math.max(0, Math.min(1000000, Math.round(Number(p.repetido_oro) || 0))),
            orden: i,
        };
    });

    const suma = limpios.reduce((s, p) => s + p.probabilidad, 0);
    if (Math.abs(suma - 100) > 0.01) throw errorConEstado(`Los porcentajes deben sumar 100 % (ahora suman ${Math.round(suma * 100) / 100} %).`);

    return {
        nombre,
        descripcion: datos.descripcion ? String(datos.descripcion).trim().slice(0, 300) : null,
        costo,
        activo: datos.activo !== false,
        inicio,
        fin,
        orden: Math.round(Number(datos.orden) || 0),
        premios: limpios,
    };
}

export async function guardarRuleta(id, datos) {
    const r = await limpiar(datos);
    return enTransaccion(async (client) => {
        let ruletaId = id;
        if (id) {
            const { rowCount } = await client.query(
                "UPDATE ruletas SET nombre=$2, descripcion=$3, costo=$4, activo=$5, inicio=$6, fin=$7, orden=$8 WHERE id=$1",
                [id, r.nombre, r.descripcion, r.costo, r.activo, r.inicio, r.fin, r.orden]
            );
            if (!rowCount) throw errorConEstado("Esa ruleta no existe.", 404);
            const quedan = r.premios.filter((p) => p.id).map((p) => p.id);
            await client.query("DELETE FROM ruleta_premios WHERE ruleta_id = $1 AND NOT (id = ANY($2))", [id, quedan]);
        } else {
            const { rows } = await client.query(
                "INSERT INTO ruletas (nombre, descripcion, costo, activo, inicio, fin, orden) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
                [r.nombre, r.descripcion, r.costo, r.activo, r.inicio, r.fin, r.orden]
            );
            ruletaId = rows[0].id;
        }
        for (const p of r.premios) {
            const v = [ruletaId, p.tipo, p.cantidad, p.ref, p.probabilidad, p.repetido_oro, p.orden];
            if (p.id) {
                await client.query(
                    "UPDATE ruleta_premios SET tipo=$2, cantidad=$3, ref=$4, probabilidad=$5, repetido_oro=$6, orden=$7 WHERE ruleta_id=$1 AND id=$8",
                    [...v, p.id]
                );
            } else {
                await client.query(
                    "INSERT INTO ruleta_premios (ruleta_id, tipo, cantidad, ref, probabilidad, repetido_oro, orden) VALUES ($1,$2,$3,$4,$5,$6,$7)",
                    v
                );
            }
        }
        return ruletaId;
    });
}

export async function borrarRuleta(id) {
    const { rowCount } = await pool.query("DELETE FROM ruletas WHERE id = $1", [id]);
    if (!rowCount) throw errorConEstado("Esa ruleta no existe.", 404);
}

/* El admin regala tiquetes (por ejemplo, para probar). */
export async function regalarTickets(userId, cantidad) {
    const n = Math.round(Number(cantidad));
    if (!Number.isFinite(n) || n < 1 || n > 10000) throw errorConEstado("Cantidad de 1 a 10.000.");
    const { rowCount } = await pool.query("UPDATE player_profiles SET tickets = tickets + $2 WHERE user_id = $1", [userId, n]);
    if (!rowCount) throw errorConEstado("Jugador no encontrado.", 404);
}
