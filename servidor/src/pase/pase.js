/* =========================================================
   PASE ÉLITE (como el Pase Booyah de Free Fire)
   ---------------------------------------------------------
   · Cada nivel tiene un premio GRATIS y uno ÉLITE.
   · Las partidas dan EXP del pase (ganar / perder, en el panel).
     Solo cuentan las que dan premio (no las del límite diario).
   · La fila élite se compra con diamantes o la regala el admin.
   · Los premios se reclaman tocándolos (o "reclamar todo").
   · Al crear el pase, el admin elige los PREMIOS MAYORES y el
     resto se llena solo, al azar (oro, diamantes, tiquetes,
     fotos y marcos). Cualquier casilla se puede cambiar después.
========================================================= */

import { pool, enTransaccion } from "../database/db.js";
import { errorConEstado } from "../http/ruta.js";
import { detallador, entregarPaquete, limpiarRecompensa, recompensaVacia, validarRecompensas } from "../recompensas/recompensas.js";

const PISTAS = ["gratis", "elite"];
const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
const redondo = (n, paso) => Math.max(paso, Math.round(n / paso) * paso);

/* El pase que está corriendo ahora (el más reciente si hay varios). */
export async function paseActivo(db = pool) {
    const { rows } = await db.query(
        "SELECT * FROM pases WHERE activo AND inicio <= NOW() AND fin > NOW() ORDER BY inicio DESC, id DESC LIMIT 1"
    );
    return rows[0] || null;
}

const nivelDe = (exp, pase) => Math.min(pase.niveles, Math.floor(exp / pase.exp_nivel));

/* Lo llaman las partidas al terminar (dentro de su transacción). */
export async function sumarExpPase(client, userId, gano) {
    const pase = await paseActivo(client);
    if (!pase) return null;
    const delta = gano ? pase.exp_ganada : pase.exp_perdida;
    if (delta <= 0) return null;
    const tope = pase.niveles * pase.exp_nivel;
    const { rows } = await client.query(
        `
        INSERT INTO pase_jugador (pase_id, user_id, exp) VALUES ($1, $2, LEAST($3::int, $4::int))
        ON CONFLICT (pase_id, user_id) DO UPDATE
        SET exp = LEAST(pase_jugador.exp + $3::int, $4::int), actualizado_en = NOW()
        RETURNING exp
        `,
        [pase.id, userId, delta, tope]
    );
    const exp = rows[0].exp;
    const nivel = nivelDe(exp, pase);
    return { delta, exp, nivel, subio: nivelDe(exp - delta, pase) < nivel };
}

/* ---------------- Para el jugador ---------------- */

export async function paseDelJugador(userId) {
    const pase = await paseActivo();
    if (!pase) return { pase: null };

    const [{ rows: premios }, { rows: yo }, { rows: reclamos }] = await Promise.all([
        pool.query("SELECT * FROM pase_premios WHERE pase_id = $1 ORDER BY nivel, pista", [pase.id]),
        pool.query("SELECT exp, elite FROM pase_jugador WHERE pase_id = $1 AND user_id = $2", [pase.id, userId]),
        pool.query("SELECT nivel, pista FROM pase_reclamos WHERE pase_id = $1 AND user_id = $2", [pase.id, userId]),
    ]);
    const exp = yo[0]?.exp || 0;
    const elite = Boolean(yo[0]?.elite);
    const nivel = nivelDe(exp, pase);
    const hecho = new Set(reclamos.map((r) => `${r.nivel}-${r.pista}`));
    const detallar = await detallador(premios.map((p) => p.recompensa));

    const porNivel = new Map();
    for (const p of premios) {
        const fila = porNivel.get(p.nivel) || { nivel: p.nivel };
        const alcanzado = nivel >= p.nivel;
        const bloqueado = p.pista === "elite" && !elite;
        fila[p.pista] = {
            premio: detallar(p.recompensa),
            mayor: p.mayor,
            reclamado: hecho.has(`${p.nivel}-${p.pista}`),
            disponible: alcanzado && !bloqueado && !hecho.has(`${p.nivel}-${p.pista}`),
            bloqueado,
        };
        porNivel.set(p.nivel, fila);
    }

    return {
        pase: {
            id: pase.id,
            nombre: pase.nombre,
            descripcion: pase.descripcion,
            imagen: pase.imagen,
            inicio: pase.inicio,
            fin: pase.fin,
            niveles: pase.niveles,
            exp_nivel: pase.exp_nivel,
            precio_diamantes: pase.precio_diamantes,
            exp_ganada: pase.exp_ganada,
            exp_perdida: pase.exp_perdida,
        },
        yo: { exp, nivel, expEnNivel: nivel >= pase.niveles ? pase.exp_nivel : exp % pase.exp_nivel, elite },
        niveles: [...porNivel.values()].sort((a, b) => a.nivel - b.nivel),
        porReclamar: [...porNivel.values()].reduce((n, f) => n + PISTAS.filter((k) => f[k]?.disponible).length, 0),
        ahora: new Date(),
    };
}

export async function reclamarPase(userId, { nivel, pista, todo = false }) {
    return enTransaccion(async (client) => {
        const pase = await paseActivo(client);
        if (!pase) throw errorConEstado("No hay un pase activo.");
        const { rows: yo } = await client.query(
            "SELECT exp, elite FROM pase_jugador WHERE pase_id = $1 AND user_id = $2 FOR UPDATE",
            [pase.id, userId]
        );
        const miNivel = nivelDe(yo[0]?.exp || 0, pase);
        const elite = Boolean(yo[0]?.elite);

        const { rows: premios } = await client.query(
            `
            SELECT p.* FROM pase_premios p
            WHERE p.pase_id = $1 AND p.nivel <= $2
              AND ($3::boolean OR (p.nivel = $4 AND p.pista = $5))
              AND (p.pista = 'gratis' OR $6::boolean)
              AND NOT EXISTS (SELECT 1 FROM pase_reclamos r WHERE r.pase_id = p.pase_id AND r.user_id = $7 AND r.nivel = p.nivel AND r.pista = p.pista)
            ORDER BY p.nivel, p.pista
            `,
            [pase.id, miNivel, todo, Number(nivel) || 0, pista, elite, userId]
        );
        if (!premios.length) {
            if (!todo && pista === "elite" && !elite) throw errorConEstado("Desbloquea el Pase Élite para reclamar este premio.");
            if (!todo && Number(nivel) > miNivel) throw errorConEstado(`Llega al nivel ${nivel} para reclamarlo.`);
            throw errorConEstado(todo ? "No tienes premios por reclamar." : "Ese premio ya lo reclamaste.");
        }

        const entregados = [];
        for (const p of premios) {
            await client.query("INSERT INTO pase_reclamos (pase_id, user_id, nivel, pista) VALUES ($1, $2, $3, $4)", [pase.id, userId, p.nivel, p.pista]);
            const r = await entregarPaquete(client, userId, p.recompensa, { origen: `pase:${pase.id}`, monedaPersonaje: "pase" });
            entregados.push({ nivel: p.nivel, pista: p.pista, ...r });
        }
        return { entregados };
    });
}

export async function comprarElite(userId) {
    return enTransaccion(async (client) => {
        const pase = await paseActivo(client);
        if (!pase) throw errorConEstado("No hay un pase activo.");
        const { rows: yo } = await client.query("SELECT elite FROM pase_jugador WHERE pase_id = $1 AND user_id = $2", [pase.id, userId]);
        if (yo[0]?.elite) throw errorConEstado("Ya tienes el Pase Élite.");
        if (pase.precio_diamantes > 0) {
            const { rows } = await client.query(
                "UPDATE player_profiles SET gems = gems - $2 WHERE user_id = $1 AND gems >= $2 RETURNING gems",
                [userId, pase.precio_diamantes]
            );
            if (!rows.length) throw errorConEstado(`Necesitas ${pase.precio_diamantes} diamantes.`);
        }
        await client.query(
            `
            INSERT INTO pase_jugador (pase_id, user_id, elite, elite_origen) VALUES ($1, $2, TRUE, 'compra')
            ON CONFLICT (pase_id, user_id) DO UPDATE SET elite = TRUE, elite_origen = 'compra', actualizado_en = NOW()
            `,
            [pase.id, userId]
        );
        return { ok: true };
    });
}

/* ---------------- Para el panel ---------------- */

/* Premio al azar para una casilla que no es premio mayor. */
function premioAzar(pista, nivel, total, cosmeticos) {
    const avance = nivel / total; // los niveles altos dan más
    const elite = pista === "elite";
    const r = Math.random();
    if (cosmeticos.length && r < (elite ? 0.18 : 0.06)) {
        const c = cosmeticos.splice(Math.floor(Math.random() * cosmeticos.length), 1)[0];
        return c.tipo === "foto" ? { foto_id: c.id } : { marco_id: c.id };
    }
    if (r < (elite ? 0.38 : 0.16)) return { diamantes: elite ? entre(2, 4) + Math.round(avance * 6) : entre(1, 2) };
    if (r < (elite ? 0.58 : 0.3)) return { tickets: elite ? entre(1, 3) : 1 };
    const base = elite ? 150 + avance * 450 : 50 + avance * 150;
    return { oro: redondo(base * (0.8 + Math.random() * 0.4), 10) };
}

async function rellenar(client, paseId, niveles, soloVacias) {
    const { rows: cos } = await client.query("SELECT id, tipo FROM cosmeticos ORDER BY random()");
    const { rows: hay } = await client.query("SELECT nivel, pista, mayor FROM pase_premios WHERE pase_id = $1", [paseId]);
    const mayores = new Set(hay.filter((h) => h.mayor).map((h) => `${h.nivel}-${h.pista}`));
    const ocupadas = new Set(hay.map((h) => `${h.nivel}-${h.pista}`));
    const libres = [...cos];
    for (let n = 1; n <= niveles; n++) {
        for (const pista of PISTAS) {
            const k = `${n}-${pista}`;
            if (mayores.has(k) || (soloVacias && ocupadas.has(k))) continue;
            await client.query(
                `
                INSERT INTO pase_premios (pase_id, nivel, pista, recompensa, mayor) VALUES ($1, $2, $3, $4, FALSE)
                ON CONFLICT (pase_id, nivel, pista) DO UPDATE SET recompensa = EXCLUDED.recompensa, mayor = FALSE
                `,
                [paseId, n, pista, JSON.stringify(limpiarRecompensa(premioAzar(pista, n, niveles, libres)))]
            );
        }
    }
}

function datosPase(d = {}) {
    const nombre = String(d.nombre || "").trim().slice(0, 80);
    if (!nombre) throw errorConEstado("Ponle nombre al pase.");
    const inicio = new Date(d.inicio);
    const fin = new Date(d.fin);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) throw errorConEstado("Faltan las fechas de inicio y fin.");
    if (fin <= inicio) throw errorConEstado("El fin debe ser después del inicio.");
    const entero = (v, min, max, def) => {
        const n = Math.round(Number(v));
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
    };
    const imagen = String(d.imagen || "").trim();
    if (imagen && !imagen.startsWith("/")) throw errorConEstado("La imagen debe subirse al juego.");
    return {
        nombre,
        descripcion: String(d.descripcion || "").trim().slice(0, 300) || null,
        imagen: imagen || null,
        inicio,
        fin,
        niveles: entero(d.niveles, 5, 200, 50),
        exp_nivel: entero(d.exp_nivel, 10, 10000, 100),
        precio_diamantes: entero(d.precio_diamantes, 0, 100000, 50),
        exp_ganada: entero(d.exp_ganada, 0, 10000, 20),
        exp_perdida: entero(d.exp_perdida, 0, 10000, 10),
        activo: d.activo !== false,
    };
}

async function limpiarMayores(lista, niveles) {
    const vistos = new Set();
    const limpios = [];
    for (const [i, m] of (Array.isArray(lista) ? lista : []).entries()) {
        const nivel = Math.round(Number(m.nivel));
        const pista = PISTAS.includes(m.pista) ? m.pista : null;
        if (!pista || !(nivel >= 1 && nivel <= niveles)) throw errorConEstado(`Premio mayor ${i + 1}: nivel o fila no válidos.`);
        if (vistos.has(`${nivel}-${pista}`)) throw errorConEstado(`Hay dos premios mayores en el nivel ${nivel} (${pista}).`);
        vistos.add(`${nivel}-${pista}`);
        const recompensa = limpiarRecompensa(m.recompensa);
        if (recompensaVacia(recompensa)) throw errorConEstado(`Premio mayor ${i + 1}: elige qué se gana.`);
        limpios.push({ nivel, pista, recompensa });
    }
    await validarRecompensas(limpios.map((m, i) => [`Premio mayor ${i + 1}`, m.recompensa]), (t) => errorConEstado(t));
    return limpios;
}

export async function crearPase(datos) {
    const d = datosPase(datos);
    const mayores = await limpiarMayores(datos.mayores, d.niveles);
    return enTransaccion(async (client) => {
        const { rows } = await client.query(
            `
            INSERT INTO pases (nombre, descripcion, imagen, inicio, fin, niveles, exp_nivel, precio_diamantes, exp_ganada, exp_perdida, activo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *
            `,
            [d.nombre, d.descripcion, d.imagen, d.inicio, d.fin, d.niveles, d.exp_nivel, d.precio_diamantes, d.exp_ganada, d.exp_perdida, d.activo]
        );
        const pase = rows[0];
        for (const m of mayores) {
            await client.query("INSERT INTO pase_premios (pase_id, nivel, pista, recompensa, mayor) VALUES ($1, $2, $3, $4, TRUE)", [
                pase.id,
                m.nivel,
                m.pista,
                JSON.stringify(m.recompensa),
            ]);
        }
        await rellenar(client, pase.id, d.niveles, true);
        return pase;
    });
}

export async function editarPase(id, datos) {
    const d = datosPase(datos);
    return enTransaccion(async (client) => {
        const { rows } = await client.query(
            `
            UPDATE pases SET nombre = $2, descripcion = $3, imagen = $4, inicio = $5, fin = $6, niveles = $7, exp_nivel = $8,
                   precio_diamantes = $9, exp_ganada = $10, exp_perdida = $11, activo = $12
            WHERE id = $1 RETURNING *
            `,
            [id, d.nombre, d.descripcion, d.imagen, d.inicio, d.fin, d.niveles, d.exp_nivel, d.precio_diamantes, d.exp_ganada, d.exp_perdida, d.activo]
        );
        if (!rows[0]) throw errorConEstado("Ese pase no existe.", 404);
        // Si cambió el número de niveles: se quitan los que sobran y se llenan los nuevos.
        await client.query("DELETE FROM pase_premios WHERE pase_id = $1 AND nivel > $2", [id, d.niveles]);
        await rellenar(client, id, d.niveles, true);
        return rows[0];
    });
}

/* Cambia una casilla. mayor = true la protege del "rellenar al azar". */
export async function cambiarPremio(paseId, { nivel, pista, recompensa, mayor = true }) {
    const { rows } = await pool.query("SELECT niveles FROM pases WHERE id = $1", [paseId]);
    if (!rows[0]) throw errorConEstado("Ese pase no existe.", 404);
    const n = Math.round(Number(nivel));
    if (!PISTAS.includes(pista) || !(n >= 1 && n <= rows[0].niveles)) throw errorConEstado("Nivel o fila no válidos.");
    const r = limpiarRecompensa(recompensa);
    if (recompensaVacia(r)) throw errorConEstado("Elige qué se gana.");
    await validarRecompensas([["Premio", r]], (t) => errorConEstado(t));
    await pool.query(
        `
        INSERT INTO pase_premios (pase_id, nivel, pista, recompensa, mayor) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (pase_id, nivel, pista) DO UPDATE SET recompensa = EXCLUDED.recompensa, mayor = EXCLUDED.mayor
        `,
        [paseId, n, pista, JSON.stringify(r), Boolean(mayor)]
    );
    return { ok: true };
}

export async function rellenarPase(paseId) {
    const { rows } = await pool.query("SELECT niveles FROM pases WHERE id = $1", [paseId]);
    if (!rows[0]) throw errorConEstado("Ese pase no existe.", 404);
    await enTransaccion((client) => rellenar(client, paseId, rows[0].niveles, false));
    return { ok: true };
}

export async function listarPasesAdmin() {
    const { rows: pases } = await pool.query(
        `
        SELECT p.*,
               (SELECT COUNT(*)::int FROM pase_jugador j WHERE j.pase_id = p.id) AS jugadores,
               (SELECT COUNT(*)::int FROM pase_jugador j WHERE j.pase_id = p.id AND j.elite) AS elites
        FROM pases p ORDER BY p.inicio DESC, p.id DESC
        `
    );
    const { rows: premios } = await pool.query("SELECT * FROM pase_premios ORDER BY nivel, pista");
    return pases.map((p) => ({ ...p, premios: premios.filter((x) => x.pase_id === p.id) }));
}

export async function borrarPase(id) {
    const { rowCount } = await pool.query("DELETE FROM pases WHERE id = $1", [id]);
    if (!rowCount) throw errorConEstado("Ese pase no existe.", 404);
    return { ok: true };
}

/* El admin regala la fila élite (por nombre de usuario o id). */
export async function regalarElite(paseId, usuario) {
    const texto = String(usuario || "").trim();
    if (!texto) throw errorConEstado("Escribe el usuario.");
    const { rows } = await pool.query("SELECT id, username FROM users WHERE LOWER(username) = LOWER($1) OR id::text = $1 LIMIT 1", [texto]);
    if (!rows[0]) throw errorConEstado("No existe ese usuario.");
    const { rows: p } = await pool.query("SELECT id FROM pases WHERE id = $1", [paseId]);
    if (!p[0]) throw errorConEstado("Ese pase no existe.", 404);
    await pool.query(
        `
        INSERT INTO pase_jugador (pase_id, user_id, elite, elite_origen) VALUES ($1, $2, TRUE, 'regalo')
        ON CONFLICT (pase_id, user_id) DO UPDATE SET elite = TRUE, elite_origen = COALESCE(pase_jugador.elite_origen, 'regalo'), actualizado_en = NOW()
        `,
        [paseId, rows[0].id]
    );
    return { usuario: rows[0].username };
}
