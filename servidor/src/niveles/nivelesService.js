/* =========================================================
   NIVELES DEL JUEGO DE PREGUNTAS · ACCESO A LA BASE
========================================================= */

import { pool } from "../database/db.js";

const CAMPOS_NIVEL = [
    "nombre",
    "descripcion",
    "grado",
    "asignatura",
    "dificultad",
    "preguntas_por_partida",
    "segundos_por_pregunta",
    "vidas",
    "tipo_recompensa",
    "recompensa_xp",
    "recompensa_oro",
    "recompensa_diamantes",
    "porcentaje_minimo",
    "puntos_por_acierto",
    "max_recompensas_diarias",
    "activo",
    "orden",
];

// Lo que ve el jugador en el selector de niveles.
const COLUMNAS_PUBLICAS = `
    n.id, n.nombre, n.descripcion, n.grado, n.asignatura, n.dificultad,
    n.preguntas_por_partida, n.segundos_por_pregunta, n.vidas,
    n.tipo_recompensa, n.recompensa_xp, n.recompensa_oro,
    n.recompensa_diamantes, n.porcentaje_minimo, n.puntos_por_acierto,
    n.orden
`;

/* ---------------------------------------------------------
   JUGADOR
--------------------------------------------------------- */

export async function listarNivelesActivos(userId = null) {
    const { rows } = await pool.query(
        `
        SELECT ${COLUMNAS_PUBLICAS},
               COUNT(DISTINCT pr.id)::int AS total_preguntas,
               mejor.puntos AS mejor_puntaje,
               COALESCE(mejor.jugadas, 0)::int AS mis_partidas
        FROM niveles_juego n
        JOIN preguntas pr ON pr.nivel_id = n.id
        LEFT JOIN LATERAL (
            SELECT MAX(p.puntos) AS puntos, COUNT(*) AS jugadas
            FROM partidas p
            WHERE p.nivel_id = n.id
              AND p.user_id = $1
              AND p.estado = 'terminada'
        ) mejor ON TRUE
        WHERE n.activo = TRUE
          AND n.juego = 'preguntas'
        GROUP BY n.id, mejor.puntos, mejor.jugadas
        ORDER BY n.orden, n.grado, n.asignatura, n.id
        `,
        [userId]
    );

    return rows;
}

export async function obtenerNivel(id, { soloActivo = true } = {}) {
    const { rows } = await pool.query(
        `
        SELECT n.*,
               (SELECT COUNT(*)::int FROM preguntas WHERE nivel_id = n.id) AS total_preguntas
        FROM niveles_juego n
        WHERE n.id = $1
          ${soloActivo ? "AND n.activo = TRUE" : ""}
        `,
        [id]
    );

    return rows[0] || null;
}

/* ---------------------------------------------------------
   ADMINISTRACIÓN
--------------------------------------------------------- */

export async function listarNivelesAdmin() {
    const { rows } = await pool.query(`
        SELECT n.*,
               (SELECT COUNT(*)::int FROM preguntas WHERE nivel_id = n.id) AS total_preguntas,
               COUNT(p.id) FILTER (WHERE p.resultado IS DISTINCT FROM 'abandonada')::int AS partidas,
               COUNT(p.id) FILTER (WHERE p.resultado = 'completada')::int AS completadas,
               COUNT(DISTINCT p.user_id)::int AS jugadores,
               ROUND(AVG(
                   CASE WHEN p.estado = 'terminada' AND p.total_preguntas > 0
                        THEN 100.0 * p.aciertos / p.total_preguntas END
               ))::int AS promedio_aciertos
        FROM niveles_juego n
        LEFT JOIN partidas p ON p.nivel_id = n.id
        GROUP BY n.id
        ORDER BY n.orden, n.grado, n.asignatura, n.id
    `);

    return rows;
}

export async function listarPreguntas(nivelId) {
    const { rows } = await pool.query(
        `
        SELECT id, texto, opciones, respuesta_correcta, explicacion, orden
        FROM preguntas
        WHERE nivel_id = $1
        ORDER BY orden, id
        `,
        [nivelId]
    );

    return rows;
}

async function insertarPreguntas(client, nivelId, preguntas) {
    for (const pregunta of preguntas) {
        await client.query(
            `
            INSERT INTO preguntas (nivel_id, texto, opciones, respuesta_correcta, explicacion, orden)
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
                nivelId,
                pregunta.texto,
                JSON.stringify(pregunta.opciones),
                pregunta.respuesta_correcta,
                pregunta.explicacion,
                pregunta.orden,
            ]
        );
    }
}

export async function crearNivel(client, nivel, preguntas, creadoPor = null) {
    const columnas = [...CAMPOS_NIVEL, "creado_por"];
    const valores = [...CAMPOS_NIVEL.map((campo) => nivel[campo]), creadoPor];

    const { rows } = await client.query(
        `
        INSERT INTO niveles_juego (${columnas.join(", ")})
        VALUES (${columnas.map((_, i) => `$${i + 1}`).join(", ")})
        RETURNING id
        `,
        valores
    );

    const nivelId = rows[0].id;

    await insertarPreguntas(client, nivelId, preguntas);

    return nivelId;
}

/*
 * Actualiza los datos del nivel. Si llegan preguntas, se
 * REEMPLAZAN todas (las partidas viejas no se pierden:
 * guardan sus resultados aparte).
 */
export async function actualizarNivel(client, nivelId, nivel, preguntas = null) {
    const asignaciones = CAMPOS_NIVEL.map((campo, i) => `${campo} = $${i + 2}`);

    const { rowCount } = await client.query(
        `
        UPDATE niveles_juego
        SET ${asignaciones.join(", ")},
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [nivelId, ...CAMPOS_NIVEL.map((campo) => nivel[campo])]
    );

    if (rowCount === 0) return false;

    if (preguntas) {
        await client.query("DELETE FROM preguntas WHERE nivel_id = $1", [nivelId]);
        await insertarPreguntas(client, nivelId, preguntas);
    }

    return true;
}
