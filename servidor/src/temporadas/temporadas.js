/* =========================================================
   TEMPORADAS Y RANGOS (como Free Fire)
   ---------------------------------------------------------
   Cada temporada dura lo que diga el panel (2 meses por
   defecto). En ella cada partida suma o resta puntos:
     gana  +30 · empata +12 · pierde -8   (nunca baja de 0)
   y los puntos dan el rango: Bronce, Plata, Oro, Platino,
   Diamante, Heroico y Maestro.

   Al llegar la fecha de fin se cierra sola: se guarda el
   rango final de cada uno, se entrega el premio de su rango
   y empieza otra temporada con todos en 0 (Bronce).

   Solo cuentan las partidas que dan premio (las que pasan
   el límite diario no suman), para que no se pueda subir
   repitiendo el nivel más fácil todo el día.
========================================================= */

import { pool, enTransaccion } from "../database/db.js";
import { entregarRecompensa } from "../progreso/progreso.js";

const CLAVE = "temporadas";

export const RANGOS = [
    { id: "bronce", nombre: "Bronce" },
    { id: "plata", nombre: "Plata" },
    { id: "oro", nombre: "Oro" },
    { id: "platino", nombre: "Platino" },
    { id: "diamante", nombre: "Diamante" },
    { id: "heroico", nombre: "Heroico" },
    { id: "maestro", nombre: "Maestro" },
];

export const CONFIG_POR_DEFECTO = {
    duracion_dias: 60,
    puntos: { ganada: 30, empate: 12, perdida: -8 },
    // Puntos desde los que se llega a cada rango.
    umbrales: { bronce: 0, plata: 200, oro: 500, platino: 1000, diamante: 1800, heroico: 3000, maestro: 5000 },
    // Premio al cerrar la temporada, según el rango final.
    premios: {
        bronce: { oro: 50, diamantes: 0 },
        plata: { oro: 100, diamantes: 0 },
        oro: { oro: 200, diamantes: 1 },
        platino: { oro: 300, diamantes: 2 },
        diamante: { oro: 500, diamantes: 3 },
        heroico: { oro: 800, diamantes: 5 },
        maestro: { oro: 1200, diamantes: 8 },
    },
};

const entero = (v, min, max, d) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

function normalizar(v = {}) {
    const d = CONFIG_POR_DEFECTO;
    const r = {
        duracion_dias: entero(v.duracion_dias, 1, 365, d.duracion_dias),
        puntos: {
            ganada: entero(v.puntos?.ganada, 0, 1000, d.puntos.ganada),
            empate: entero(v.puntos?.empate, 0, 1000, d.puntos.empate),
            perdida: entero(v.puntos?.perdida, -1000, 0, d.puntos.perdida),
        },
        umbrales: {},
        premios: {},
    };
    let anterior = -1;
    for (const { id } of RANGOS) {
        // Cada rango pide más puntos que el anterior.
        const u = id === "bronce" ? 0 : entero(v.umbrales?.[id], 0, 1000000, d.umbrales[id]);
        r.umbrales[id] = Math.max(u, anterior + 1);
        anterior = r.umbrales[id];
        r.premios[id] = {
            oro: entero(v.premios?.[id]?.oro, 0, 1000000, d.premios[id].oro),
            diamantes: entero(v.premios?.[id]?.diamantes, 0, 100000, d.premios[id].diamantes),
        };
    }
    return r;
}

let cache = null;

export async function configTemporadas() {
    if (cache) return cache;
    const { rows } = await pool.query("SELECT valor FROM config_juego WHERE clave = $1", [CLAVE]);
    cache = normalizar(rows[0]?.valor);
    return cache;
}

export async function guardarConfigTemporadas(valor) {
    const limpio = normalizar({ ...(await configTemporadas()), ...(valor || {}) });
    await pool.query(
        `
        INSERT INTO config_juego (clave, valor, actualizado_en)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP
        `,
        [CLAVE, JSON.stringify(limpio)]
    );
    cache = limpio;
    return limpio;
}

export function rangoDe(puntos, config) {
    let rango = RANGOS[0];
    for (const r of RANGOS) if (puntos >= config.umbrales[r.id]) rango = r;
    const i = RANGOS.indexOf(rango);
    const siguiente = RANGOS[i + 1] || null;
    return {
        id: rango.id,
        nombre: rango.nombre,
        siguiente: siguiente ? { id: siguiente.id, nombre: siguiente.nombre, desde: config.umbrales[siguiente.id] } : null,
        desde: config.umbrales[rango.id],
    };
}

/* ---------------- Temporada abierta ---------------- */

export async function temporadaAbierta(db = pool) {
    const { rows } = await db.query("SELECT * FROM temporadas WHERE NOT cerrada ORDER BY id DESC LIMIT 1");
    if (rows[0]) return rows[0];

    // No hay ninguna: se crea la primera (o la siguiente).
    const config = await configTemporadas();
    const { rows: n } = await db.query("SELECT COUNT(*)::int AS total FROM temporadas");
    await db.query(
        `
        INSERT INTO temporadas (nombre, inicio, fin)
        SELECT $1, NOW(), NOW() + make_interval(days => $2)
        WHERE NOT EXISTS (SELECT 1 FROM temporadas WHERE NOT cerrada)
        `,
        [`Temporada ${n[0].total + 1}`, config.duracion_dias]
    );
    const { rows: nueva } = await db.query("SELECT * FROM temporadas WHERE NOT cerrada ORDER BY id DESC LIMIT 1");
    return nueva[0];
}

/* Suma (o resta) los puntos de una partida. resultado: ganada | empate | perdida */
export async function sumarPuntosTemporada(client, userId, resultado) {
    const config = await configTemporadas();
    const delta = config.puntos[resultado];
    if (delta === undefined) return null;

    const temporada = await temporadaAbierta(client);
    if (new Date(temporada.fin) <= new Date()) return null; // ya terminó: se está cerrando

    const { rows } = await client.query(
        `
        INSERT INTO temporada_puntos (temporada_id, user_id, puntos, partidas, ganadas)
        VALUES ($1, $2, GREATEST(0, $3), 1, $4)
        ON CONFLICT (temporada_id, user_id) DO UPDATE
        SET puntos = GREATEST(0, temporada_puntos.puntos + $3),
            partidas = temporada_puntos.partidas + 1,
            ganadas = temporada_puntos.ganadas + $4,
            actualizado_en = NOW()
        RETURNING puntos
        `,
        [temporada.id, userId, delta, resultado === "ganada" ? 1 : 0]
    );
    return { delta, puntos: rows[0].puntos };
}

/* ---------------- Cierre ---------------- */

export async function cerrarTemporada(temporadaId) {
    const config = await configTemporadas();

    const resumen = await enTransaccion(async (client) => {
        const { rows: t } = await client.query("SELECT * FROM temporadas WHERE id = $1 FOR UPDATE", [temporadaId]);
        if (!t[0] || t[0].cerrada) return null;

        const { rows: tabla } = await client.query(
            `
            SELECT tp.user_id, tp.puntos, u.bloqueado
            FROM temporada_puntos tp
            JOIN users u ON u.id = tp.user_id
            WHERE tp.temporada_id = $1
            ORDER BY tp.puntos DESC, tp.ganadas DESC, tp.actualizado_en
            `,
            [temporadaId]
        );

        let entregados = 0;
        for (const [i, fila] of tabla.entries()) {
            const rango = rangoDe(fila.puntos, config);
            const premio = fila.bloqueado ? { oro: 0, diamantes: 0 } : config.premios[rango.id];
            if (premio.oro + premio.diamantes > 0) {
                await entregarRecompensa(client, fila.user_id, premio);
                entregados += 1;
            }
            await client.query(
                `
                UPDATE temporada_puntos
                SET rango_final = $3, posicion_final = $4, premio = $5
                WHERE temporada_id = $1 AND user_id = $2
                `,
                [temporadaId, fila.user_id, rango.id, i + 1, JSON.stringify(premio)]
            );
        }

        await client.query("UPDATE temporadas SET cerrada = TRUE, cerrada_en = NOW() WHERE id = $1", [temporadaId]);
        return { temporada: t[0].nombre, jugadores: tabla.length, premiados: entregados };
    });

    if (resumen) {
        console.log(`🏁 ${resumen.temporada} cerrada: ${resumen.jugadores} jugadores, ${resumen.premiados} premios.`);
        await temporadaAbierta(); // empieza la siguiente
    }
    return resumen;
}

/* Se llama cada minuto: cierra la temporada si ya llegó su fecha. */
export async function revisarTemporadas() {
    try {
        const t = await temporadaAbierta();
        if (t && new Date(t.fin) <= new Date()) await cerrarTemporada(t.id);
    } catch (error) {
        console.error("⚠️  Temporadas:", error.message);
    }
}

/* ---------------- Tablas ---------------- */

export async function tablaTemporada(userId, { temporadaId = null, top = 50 } = {}) {
    const config = await configTemporadas();
    const temporada = temporadaId
        ? (await pool.query("SELECT * FROM temporadas WHERE id = $1", [temporadaId])).rows[0]
        : await temporadaAbierta();
    if (!temporada) return null;

    const { rows } = await pool.query(
        `
        WITH tabla AS (
            SELECT u.id, p.display_name AS nombre, p.avatar, p.level AS nivel,
                   m.ruta AS marco, c.name AS personaje, c.model_path AS modelo,
                   (u.verificado OR u.rol = 'admin') AS verificado,
                   tp.puntos, tp.partidas, tp.ganadas, tp.rango_final,
                   ROW_NUMBER() OVER (ORDER BY tp.puntos DESC, tp.ganadas DESC, tp.actualizado_en)::int AS posicion
            FROM temporada_puntos tp
            JOIN users u ON u.id = tp.user_id
            JOIN player_profiles p ON p.user_id = u.id
            LEFT JOIN cosmeticos m ON m.id = p.marco_id
            LEFT JOIN characters c ON c.id = p.character_id
            WHERE tp.temporada_id = $1 AND u.bloqueado = FALSE
        )
        SELECT * FROM tabla WHERE posicion <= $2 OR id = $3 ORDER BY posicion
        `,
        [temporada.id, top, userId]
    );

    const conRango = (r) => ({ ...r, rango: rangoDe(r.puntos, config) });
    const yo = rows.find((r) => r.id === userId);

    return {
        temporada: { id: temporada.id, nombre: temporada.nombre, inicio: temporada.inicio, fin: temporada.fin, cerrada: temporada.cerrada },
        rangos: RANGOS.map((r) => ({ ...r, desde: config.umbrales[r.id], premio: config.premios[r.id] })),
        jugadores: rows.filter((r) => r.posicion <= top).map(conRango),
        yo: yo
            ? conRango(yo)
            : { id: userId, puntos: 0, partidas: 0, ganadas: 0, posicion: null, rango: rangoDe(0, config) },
        ahora: new Date(),
    };
}

/* Rango actual de un jugador (para su perfil). */
export async function rangoJugador(userId) {
    const config = await configTemporadas();
    const temporada = await temporadaAbierta();
    const { rows } = await pool.query(
        "SELECT puntos FROM temporada_puntos WHERE temporada_id = $1 AND user_id = $2",
        [temporada.id, userId]
    );
    const puntos = rows[0]?.puntos || 0;
    return { temporada: temporada.nombre, fin: temporada.fin, puntos, rango: rangoDe(puntos, config) };
}

export async function historialTemporadas() {
    const { rows } = await pool.query(
        `
        SELECT t.*, COUNT(tp.user_id)::int AS jugadores
        FROM temporadas t
        LEFT JOIN temporada_puntos tp ON tp.temporada_id = t.id
        GROUP BY t.id
        ORDER BY t.id DESC
        LIMIT 30
        `
    );
    return rows;
}

/* El administrador cambia el nombre o la fecha de fin de la temporada abierta. */
export async function editarTemporadaAbierta({ nombre, fin }) {
    const t = await temporadaAbierta();
    const fecha = fin ? new Date(fin) : null;
    if (fin && Number.isNaN(fecha?.getTime())) {
        const e = new Error("Fecha de fin no válida.");
        e.status = 400;
        throw e;
    }
    await pool.query("UPDATE temporadas SET nombre = COALESCE($2, nombre), fin = COALESCE($3, fin) WHERE id = $1", [
        t.id,
        nombre ? String(nombre).trim().slice(0, 80) : null,
        fecha,
    ]);
    return temporadaAbierta();
}
