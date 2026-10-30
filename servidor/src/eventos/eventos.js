/* =========================================================
   EVENTOS
   ---------------------------------------------------------
   El administrador crea eventos con fechas, una imagen de
   anuncio y misiones. Cada misión tiene su meta y su premio
   (oro, diamantes, tiquetes 🎫, personaje, foto de perfil o marco).

   El avance se calcula con las partidas que el jugador
   terminó dentro de las fechas (tabla "partidas"), así no
   hay que tocar cada juego:
     jugar      partidas terminadas
     ganar      partidas ganadas
     responder  preguntas respondidas (preguntas y Escape)
     correctas  preguntas acertadas
     dias       días distintos en que jugó
   juego: null = cualquiera, o "preguntas", "triqui",
   "siglo", "escape-algebra".
========================================================= */

import { pool, enTransaccion } from "../database/db.js";
import { entregarRecompensa } from "../progreso/progreso.js";
import { entregarCosmetico } from "../perfiles/cosmeticos.js";
import { errorConEstado } from "../http/ruta.js";

export const TIPOS_MISION = {
    jugar: { texto: "Juega {n} partidas", uno: "Juega 1 partida" },
    ganar: { texto: "Gana {n} partidas", uno: "Gana 1 partida" },
    responder: { texto: "Responde {n} preguntas", uno: "Responde 1 pregunta" },
    correctas: { texto: "Acierta {n} preguntas", uno: "Acierta 1 pregunta" },
    dias: { texto: "Juega {n} días distintos", uno: "Juega 1 día" },
};

export const JUEGOS_MISION = {
    preguntas: "Ludo Millonario",
    triqui: "Triqui",
    siglo: "SigloGamif",
    "escape-algebra": "Escape del Álgebra",
};

export function textoMision(m) {
    if (m.texto) return m.texto;
    const t = TIPOS_MISION[m.tipo];
    const base = m.meta === 1 ? t.uno : t.texto.replace("{n}", m.meta);
    return m.juego ? `${base} de ${JUEGOS_MISION[m.juego] || m.juego}` : base;
}

/* Ventana en la que cuenta la misión (la del evento, o más corta). */
function ventana(evento, mision) {
    const desde = mision.desde && new Date(mision.desde) > new Date(evento.inicio) ? mision.desde : evento.inicio;
    const hasta = mision.hasta && new Date(mision.hasta) < new Date(evento.fin) ? mision.hasta : evento.fin;
    return { desde, hasta };
}

const SQL_AVANCE = {
    jugar: "COUNT(*) FILTER (WHERE resultado <> 'abandonada')",
    ganar: "COUNT(*) FILTER (WHERE gano)",
    responder: "COALESCE(SUM(aciertos + errores), 0)",
    correctas: "COALESCE(SUM(aciertos), 0)",
    dias: "COUNT(DISTINCT (terminada_en::timestamptz AT TIME ZONE 'America/Bogota')::date)",
};

export async function avanceMision(db, userId, evento, mision) {
    const { desde, hasta } = ventana(evento, mision);
    const { rows } = await db.query(
        `
        SELECT ${SQL_AVANCE[mision.tipo]}::int AS avance
        FROM partidas
        WHERE user_id = $1
          AND estado = 'terminada'
          AND ($2::text IS NULL OR juego = $2)
          -- terminada_en se guarda en la hora del servidor de base de datos
          AND terminada_en::timestamptz >= $3
          AND terminada_en::timestamptz <= $4
        `,
        [userId, mision.juego || null, desde, hasta]
    );
    return Math.min(mision.meta, rows[0]?.avance || 0);
}

/* Nombres e imágenes de lo que se gana (personaje, foto, marco). */
async function detallarRecompensas(misiones) {
    const personajes = new Set();
    const cosmeticos = new Set();
    for (const m of misiones) {
        if (m.recompensa?.personaje_id) personajes.add(m.recompensa.personaje_id);
        if (m.recompensa?.foto_id) cosmeticos.add(Number(m.recompensa.foto_id));
        if (m.recompensa?.marco_id) cosmeticos.add(Number(m.recompensa.marco_id));
    }
    const [{ rows: ps }, { rows: cs }] = await Promise.all([
        pool.query("SELECT id, name, thumbnail_path FROM characters WHERE id = ANY($1)", [[...personajes]]),
        pool.query("SELECT id, nombre, ruta, tipo FROM cosmeticos WHERE id = ANY($1)", [[...cosmeticos]]),
    ]);
    const p = new Map(ps.map((x) => [x.id, x]));
    const c = new Map(cs.map((x) => [x.id, x]));
    return (r = {}) => ({
        oro: Number(r.oro) || 0,
        diamantes: Number(r.diamantes) || 0,
        tickets: Number(r.tickets) || 0,
        personaje: r.personaje_id && p.get(r.personaje_id) ? { id: r.personaje_id, nombre: p.get(r.personaje_id).name, foto: p.get(r.personaje_id).thumbnail_path } : null,
        foto: r.foto_id && c.get(Number(r.foto_id)) ? { id: Number(r.foto_id), nombre: c.get(Number(r.foto_id)).nombre, ruta: c.get(Number(r.foto_id)).ruta } : null,
        marco: r.marco_id && c.get(Number(r.marco_id)) ? { id: Number(r.marco_id), nombre: c.get(Number(r.marco_id)).nombre, ruta: c.get(Number(r.marco_id)).ruta } : null,
    });
}

/* ---------------- Para el jugador ---------------- */

export async function eventosDelJugador(userId) {
    const { rows: eventos } = await pool.query(
        `SELECT * FROM eventos WHERE activo AND inicio <= NOW() AND fin > NOW() ORDER BY orden, fin`
    );
    if (!eventos.length) return { eventos: [], porReclamar: 0, ahora: new Date() };

    const { rows: misiones } = await pool.query(
        "SELECT * FROM eventos_misiones WHERE evento_id = ANY($1) ORDER BY orden, id",
        [eventos.map((e) => e.id)]
    );
    const { rows: reclamos } = await pool.query(
        "SELECT mision_id FROM eventos_reclamos WHERE user_id = $1 AND mision_id = ANY($2)",
        [userId, misiones.map((m) => m.id)]
    );
    const reclamadas = new Set(reclamos.map((r) => r.mision_id));
    const detalle = await detallarRecompensas(misiones);

    let porReclamar = 0;
    const lista = [];
    for (const e of eventos) {
        const propias = [];
        for (const m of misiones.filter((x) => x.evento_id === e.id)) {
            const avance = await avanceMision(pool, userId, e, m);
            const { desde, hasta } = ventana(e, m);
            const reclamada = reclamadas.has(m.id);
            const completa = avance >= m.meta;
            if (completa && !reclamada) porReclamar += 1;
            propias.push({
                id: m.id,
                texto: textoMision(m),
                tipo: m.tipo,
                juego: m.juego,
                meta: m.meta,
                avance,
                completa,
                reclamada,
                desde,
                hasta,
                recompensa: detalle(m.recompensa),
            });
        }
        lista.push({
            id: e.id,
            titulo: e.titulo,
            descripcion: e.descripcion,
            imagen: e.imagen,
            inicio: e.inicio,
            fin: e.fin,
            misiones: propias,
        });
    }
    return { eventos: lista, porReclamar, ahora: new Date() };
}

export async function reclamarMision(userId, misionId) {
    return enTransaccion(async (client) => {
        const { rows } = await client.query(
            `
            SELECT m.*, e.inicio, e.fin, e.activo, e.titulo
            FROM eventos_misiones m
            JOIN eventos e ON e.id = m.evento_id
            WHERE m.id = $1
            `,
            [misionId]
        );
        const m = rows[0];
        if (!m) throw errorConEstado("Esa misión no existe.", 404);
        const ahora = new Date();
        if (!m.activo || new Date(m.inicio) > ahora || new Date(m.fin) <= ahora) {
            throw errorConEstado("El evento ya terminó.");
        }

        const avance = await avanceMision(client, userId, m, m);
        if (avance < m.meta) throw errorConEstado(`Aún te falta: llevas ${avance} de ${m.meta}.`);

        const { rowCount } = await client.query(
            "INSERT INTO eventos_reclamos (mision_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [m.id, userId]
        );
        if (!rowCount) throw errorConEstado("Ya reclamaste esta recompensa.");

        const r = m.recompensa || {};
        const entregado = { oro: 0, diamantes: 0, tickets: 0, personaje: null, foto: false, marco: false };
        if (Number(r.tickets) > 0) {
            await client.query("UPDATE player_profiles SET tickets = tickets + $2 WHERE user_id = $1", [userId, Number(r.tickets)]);
            entregado.tickets = Number(r.tickets);
        }
        if (Number(r.oro) > 0 || Number(r.diamantes) > 0) {
            await entregarRecompensa(client, userId, { oro: Number(r.oro) || 0, diamantes: Number(r.diamantes) || 0 });
            entregado.oro = Number(r.oro) || 0;
            entregado.diamantes = Number(r.diamantes) || 0;
        }
        if (r.personaje_id) {
            const { rowCount: nuevo } = await client.query(
                `
                INSERT INTO personajes_jugador (user_id, character_id, moneda)
                SELECT $1, id, 'evento' FROM characters WHERE id = $2
                ON CONFLICT DO NOTHING
                `,
                [userId, r.personaje_id]
            );
            entregado.personaje = nuevo > 0 ? r.personaje_id : null;
        }
        if (r.foto_id) entregado.foto = await entregarCosmetico(client, userId, Number(r.foto_id), `evento:${m.evento_id}`);
        if (r.marco_id) entregado.marco = await entregarCosmetico(client, userId, Number(r.marco_id), `evento:${m.evento_id}`);

        return entregado;
    });
}

/* ---------------- Para el panel ---------------- */

const fechaValida = (v, nombre) => {
    const d = new Date(v);
    if (!v || Number.isNaN(d.getTime())) throw errorConEstado(`Falta la fecha de ${nombre}.`);
    return d;
};

async function limpiarEvento(datos = {}) {
    const titulo = String(datos.titulo || "").trim().slice(0, 100);
    if (!titulo) throw errorConEstado("Ponle un título al evento.");
    const inicio = fechaValida(datos.inicio, "inicio");
    const fin = fechaValida(datos.fin, "fin");
    if (fin <= inicio) throw errorConEstado("La fecha de fin debe ser después del inicio.");

    const imagen = datos.imagen ? String(datos.imagen) : null;
    if (imagen && (!/^\/(archivos|img)\/[\w\-./]+$/.test(imagen) || imagen.includes(".."))) {
        throw errorConEstado("Imagen no válida.");
    }

    const misiones = Array.isArray(datos.misiones) ? datos.misiones : [];
    if (!misiones.length) throw errorConEstado("Agrega al menos una misión.");
    if (misiones.length > 12) throw errorConEstado("Máximo 12 misiones por evento.");

    const { rows: personajes } = await pool.query("SELECT id FROM characters");
    const { rows: cosmeticos } = await pool.query("SELECT id, tipo FROM cosmeticos");
    const hayPersonaje = new Set(personajes.map((p) => p.id));
    const tipoCosmetico = new Map(cosmeticos.map((c) => [c.id, c.tipo]));

    const limpias = misiones.map((m, i) => {
        const n = i + 1;
        if (!TIPOS_MISION[m.tipo]) throw errorConEstado(`Misión ${n}: elige qué hay que hacer.`);
        const juego = m.juego || null;
        if (juego && !JUEGOS_MISION[juego]) throw errorConEstado(`Misión ${n}: juego no válido.`);
        const meta = Math.round(Number(m.meta));
        if (!Number.isFinite(meta) || meta < 1 || meta > 100000) throw errorConEstado(`Misión ${n}: la cantidad va de 1 a 100.000.`);
        const desde = m.desde ? fechaValida(m.desde, `inicio de la misión ${n}`) : null;
        const hasta = m.hasta ? fechaValida(m.hasta, `fin de la misión ${n}`) : null;
        if (desde && hasta && hasta <= desde) throw errorConEstado(`Misión ${n}: el fin debe ser después del inicio.`);

        const r = m.recompensa || {};
        const recompensa = {
            oro: Math.min(1000000, Math.max(0, Math.round(Number(r.oro) || 0))),
            diamantes: Math.min(100000, Math.max(0, Math.round(Number(r.diamantes) || 0))),
            tickets: Math.min(10000, Math.max(0, Math.round(Number(r.tickets) || 0))),
            personaje_id: r.personaje_id ? String(r.personaje_id) : null,
            foto_id: r.foto_id ? Number(r.foto_id) : null,
            marco_id: r.marco_id ? Number(r.marco_id) : null,
        };
        if (recompensa.personaje_id && !hayPersonaje.has(recompensa.personaje_id)) throw errorConEstado(`Misión ${n}: ese personaje no existe.`);
        if (recompensa.foto_id && tipoCosmetico.get(recompensa.foto_id) !== "foto") throw errorConEstado(`Misión ${n}: esa foto no existe.`);
        if (recompensa.marco_id && tipoCosmetico.get(recompensa.marco_id) !== "marco") throw errorConEstado(`Misión ${n}: ese marco no existe.`);
        const algo = recompensa.oro || recompensa.diamantes || recompensa.tickets || recompensa.personaje_id || recompensa.foto_id || recompensa.marco_id;
        if (!algo) throw errorConEstado(`Misión ${n}: ponle una recompensa.`);

        return {
            id: m.id ? Number(m.id) : null,
            tipo: m.tipo,
            juego,
            meta,
            desde,
            hasta,
            texto: m.texto ? String(m.texto).trim().slice(0, 160) || null : null,
            recompensa,
            orden: i,
        };
    });

    return {
        titulo,
        descripcion: datos.descripcion ? String(datos.descripcion).trim().slice(0, 500) : null,
        imagen,
        inicio,
        fin,
        activo: datos.activo !== false,
        orden: Math.round(Number(datos.orden) || 0),
        misiones: limpias,
    };
}

export async function listarEventosAdmin() {
    const { rows: eventos } = await pool.query("SELECT * FROM eventos ORDER BY fin DESC, id DESC");
    const { rows: misiones } = await pool.query(
        `
        SELECT m.*, COUNT(r.user_id)::int AS reclamos
        FROM eventos_misiones m
        LEFT JOIN eventos_reclamos r ON r.mision_id = m.id
        GROUP BY m.id
        ORDER BY m.orden, m.id
        `
    );
    return eventos.map((e) => ({
        ...e,
        misiones: misiones.filter((m) => m.evento_id === e.id).map((m) => ({ ...m, texto_auto: textoMision({ ...m, texto: null }) })),
    }));
}

export async function guardarEvento(id, datos) {
    const e = await limpiarEvento(datos);
    return enTransaccion(async (client) => {
        let eventoId = id;
        if (id) {
            const { rowCount } = await client.query(
                `UPDATE eventos SET titulo=$2, descripcion=$3, imagen=$4, inicio=$5, fin=$6, activo=$7, orden=$8 WHERE id=$1`,
                [id, e.titulo, e.descripcion, e.imagen, e.inicio, e.fin, e.activo, e.orden]
            );
            if (!rowCount) throw errorConEstado("Ese evento no existe.", 404);
            // Se borran las misiones quitadas (las que siguen conservan sus reclamos).
            const quedan = e.misiones.filter((m) => m.id).map((m) => m.id);
            await client.query("DELETE FROM eventos_misiones WHERE evento_id = $1 AND NOT (id = ANY($2))", [id, quedan]);
        } else {
            const { rows } = await client.query(
                `INSERT INTO eventos (titulo, descripcion, imagen, inicio, fin, activo, orden) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
                [e.titulo, e.descripcion, e.imagen, e.inicio, e.fin, e.activo, e.orden]
            );
            eventoId = rows[0].id;
        }

        for (const m of e.misiones) {
            const valores = [eventoId, m.tipo, m.juego, m.meta, m.desde, m.hasta, m.texto, JSON.stringify(m.recompensa), m.orden];
            if (m.id) {
                await client.query(
                    `UPDATE eventos_misiones SET tipo=$2, juego=$3, meta=$4, desde=$5, hasta=$6, texto=$7, recompensa=$8, orden=$9
                     WHERE evento_id=$1 AND id=$10`,
                    [...valores, m.id]
                );
            } else {
                await client.query(
                    `INSERT INTO eventos_misiones (evento_id, tipo, juego, meta, desde, hasta, texto, recompensa, orden)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    valores
                );
            }
        }
        return eventoId;
    });
}

export async function borrarEvento(id) {
    const { rowCount } = await pool.query("DELETE FROM eventos WHERE id = $1", [id]);
    if (!rowCount) throw errorConEstado("Ese evento no existe.", 404);
}
