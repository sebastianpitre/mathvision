/* =========================================================
   PANEL DE ADMINISTRACIÓN  ·  /api/admin   (solo admins)
   ---------------------------------------------------------
   GET    /resumen                     estadísticas generales
   GET    /niveles                     niveles con sus estadísticas
   GET    /niveles/:id                 un nivel con sus preguntas
   POST   /niveles/validar             revisar un JSON sin guardar
   POST   /niveles                     crear   { nivel, preguntas }
   PUT    /niveles/:id                 editar  { nivel, preguntas? }
   DELETE /niveles/:id                 borrar
   GET    /personajes                  tienda
   PUT    /personajes/:id              precios y disponibilidad
   GET    /usuarios?buscar=            jugadores
   PUT    /usuarios/:id/rol            { rol: "admin" | "jugador" }
   POST   /usuarios/:id/regalo         { oro, diamantes }
========================================================= */

import express from "express";

import { pool, enTransaccion } from "../database/db.js";
import { requireAdmin } from "../auth/authMiddleware.js";
import { ruta, errorConEstado } from "../http/ruta.js";
import { calcularNivel, entregarRecompensa } from "../progreso/progreso.js";
import {
    listarNivelesAdmin,
    obtenerNivel,
    listarPreguntas,
    crearNivel,
    actualizarNivel,
} from "../niveles/nivelesService.js";
import {
    leerArchivoNivel,
    normalizarNivel,
    normalizarPreguntas,
    RECOMPENSAS_SUGERIDAS,
} from "../niveles/validarNivel.js";

const router = express.Router();

// Los JSON de preguntas pueden ser grandes.
router.use(express.json({ limit: "3mb" }));
router.use(requireAdmin);

function idValido(valor) {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) throw errorConEstado("Identificador no válido.");
    return id;
}

function errorDeValidacion(errores) {
    const error = errorConEstado(
        errores.length === 1
            ? errores[0].mensaje
            : `Hay ${errores.length} problemas. Revisa la vista previa.`
    );
    error.errores = errores;
    return error;
}

/* =========================================================
   RESUMEN / ESTADÍSTICAS
========================================================= */

router.get(
    "/resumen",
    ruta(async (req, res) => {
        const hoy = `(NOW() AT TIME ZONE 'America/Bogota')::date`;
        const fecha = `(p.iniciada_en AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date`;
        // Solo partidas terminadas de verdad (no las abandonadas a medias).
        const jugada = `p.estado = 'terminada' AND p.resultado <> 'abandonada'`;

        const [totales, porJuego, porDia, porAsignatura, mejores, recientes] = await Promise.all([
            pool.query(`
                SELECT
                    (SELECT COUNT(*)::int FROM users) AS usuarios,
                    (SELECT COUNT(*)::int FROM partidas p WHERE ${jugada}) AS partidas,
                    (SELECT COUNT(*)::int FROM partidas p WHERE ${jugada} AND ${fecha} = ${hoy}) AS partidas_hoy,
                    (SELECT COUNT(*)::int FROM partidas p WHERE ${jugada} AND ${fecha} > ${hoy} - 7) AS partidas_semana,
                    (SELECT COUNT(DISTINCT user_id)::int FROM partidas p WHERE ${jugada} AND ${fecha} > ${hoy} - 7) AS jugadores_semana,
                    (SELECT COUNT(*)::int FROM niveles_juego WHERE activo) AS niveles_activos,
                    (SELECT COALESCE(SUM(xp_ganada), 0)::int FROM partidas) AS xp_entregada,
                    (SELECT COALESCE(SUM(oro_ganado), 0)::int FROM partidas) AS oro_entregado
            `),
            pool.query(`
                SELECT juego, COUNT(*)::int AS partidas, COUNT(DISTINCT user_id)::int AS jugadores
                FROM partidas p
                WHERE ${jugada}
                GROUP BY juego
                ORDER BY partidas DESC
            `),
            pool.query(`
                SELECT TO_CHAR(dia, 'YYYY-MM-DD') AS dia, COALESCE(t.total, 0)::int AS partidas
                FROM generate_series(${hoy} - 13, ${hoy}, '1 day') dia
                LEFT JOIN (
                    SELECT ${fecha} AS fecha, COUNT(*) AS total
                    FROM partidas p
                    WHERE ${jugada}
                    GROUP BY 1
                ) t ON t.fecha = dia
                ORDER BY dia
            `),
            pool.query(`
                SELECT n.grado, n.asignatura,
                       COUNT(p.id)::int AS partidas,
                       ROUND(AVG(CASE WHEN p.total_preguntas > 0
                                      THEN 100.0 * p.aciertos / p.total_preguntas END))::int AS promedio_aciertos
                FROM partidas p
                JOIN niveles_juego n ON n.id = p.nivel_id
                WHERE p.estado = 'terminada' AND p.resultado <> 'abandonada'
                GROUP BY n.grado, n.asignatura
                ORDER BY partidas DESC
            `),
            pool.query(`
                SELECT u.id, u.username, p.display_name, p.level, p.xp, p.coins, p.gems,
                       s.games_played
                FROM users u
                JOIN player_profiles p ON p.user_id = u.id
                LEFT JOIN player_stats s ON s.user_id = u.id
                ORDER BY p.xp DESC
                LIMIT 10
            `),
            pool.query(`
                SELECT p.id, p.juego, p.resultado, p.aciertos, p.total_preguntas, p.puntos,
                       p.xp_ganada, p.oro_ganado, p.diamantes_ganados, p.terminada_en,
                       u.username, n.nombre AS nivel
                FROM partidas p
                JOIN users u ON u.id = p.user_id
                LEFT JOIN niveles_juego n ON n.id = p.nivel_id
                WHERE p.estado = 'terminada' AND p.resultado <> 'abandonada'
                ORDER BY p.terminada_en DESC
                LIMIT 25
            `),
        ]);

        res.json({
            success: true,
            totales: totales.rows[0],
            por_juego: porJuego.rows,
            por_dia: porDia.rows,
            por_asignatura: porAsignatura.rows,
            mejores_jugadores: mejores.rows,
            partidas_recientes: recientes.rows,
        });
    })
);

/* =========================================================
   NIVELES
========================================================= */

router.get(
    "/niveles",
    ruta(async (req, res) => {
        const niveles = await listarNivelesAdmin();

        const unicos = (campo) =>
            [...new Set(niveles.map((nivel) => nivel[campo]).filter(Boolean))].sort();

        res.json({
            success: true,
            niveles,
            sugerencias: {
                grados: unicos("grado"),
                asignaturas: unicos("asignatura"),
            },
            recompensas_sugeridas: RECOMPENSAS_SUGERIDAS,
        });
    })
);

router.get(
    "/niveles/:id",
    ruta(async (req, res) => {
        const id = idValido(req.params.id);
        const nivel = await obtenerNivel(id, { soloActivo: false });
        if (!nivel) throw errorConEstado("Nivel no encontrado.", 404);

        res.json({ success: true, nivel, preguntas: await listarPreguntas(id) });
    })
);

/*
 * Revisa un JSON (lo que el admin adjuntó) y devuelve cómo
 * quedaría, sin guardar nada. Sirve para la vista previa.
 */
router.post(
    "/niveles/validar",
    ruta(async (req, res) => {
        const { datosNivel, listaPreguntas } = leerArchivoNivel(req.body?.contenido);
        const { preguntas, errores } = normalizarPreguntas(listaPreguntas);

        res.json({
            success: true,
            nivel: datosNivel ? normalizarNivel(datosNivel).nivel : null,
            preguntas,
            errores,
        });
    })
);

function prepararNivel(body, { exigirPreguntas }) {
    const { nivel, errores: erroresNivel } = normalizarNivel(body?.nivel || {});

    let preguntas = null;
    let erroresPreguntas = [];

    if (body?.preguntas !== undefined && body?.preguntas !== null) {
        ({ preguntas, errores: erroresPreguntas } = normalizarPreguntas(body.preguntas));

        if (preguntas.length === 0 && erroresPreguntas.length === 0) {
            erroresPreguntas.push({ fila: 0, mensaje: "El nivel necesita al menos una pregunta." });
        }
    } else if (exigirPreguntas) {
        erroresPreguntas.push({ fila: 0, mensaje: "Adjunta el JSON con las preguntas." });
    }

    const errores = [...erroresNivel, ...erroresPreguntas];
    if (errores.length > 0) throw errorDeValidacion(errores);

    return { nivel, preguntas };
}

router.post(
    "/niveles",
    ruta(async (req, res) => {
        const { nivel, preguntas } = prepararNivel(req.body, { exigirPreguntas: true });

        const id = await enTransaccion((client) =>
            crearNivel(client, nivel, preguntas, req.user.userId)
        );

        res.status(201).json({ success: true, id, preguntas: preguntas.length });
    })
);

router.put(
    "/niveles/:id",
    ruta(async (req, res) => {
        const id = idValido(req.params.id);
        const { nivel, preguntas } = prepararNivel(req.body, { exigirPreguntas: false });

        const existe = await enTransaccion((client) => actualizarNivel(client, id, nivel, preguntas));
        if (!existe) throw errorConEstado("Nivel no encontrado.", 404);

        res.json({ success: true, id });
    })
);

router.delete(
    "/niveles/:id",
    ruta(async (req, res) => {
        const id = idValido(req.params.id);

        // Las partidas jugadas se conservan (quedan sin nivel)
        // para que los totales del panel no cambien.
        const { rowCount } = await pool.query("DELETE FROM niveles_juego WHERE id = $1", [id]);
        if (rowCount === 0) throw errorConEstado("Nivel no encontrado.", 404);

        res.json({ success: true });
    })
);

/* =========================================================
   TIENDA DE PERSONAJES
========================================================= */

router.get(
    "/personajes",
    ruta(async (req, res) => {
        const { rows } = await pool.query(`
            SELECT c.*, COUNT(pj.user_id) FILTER (WHERE pj.moneda IN ('oro', 'diamantes'))::int AS vendidos
            FROM characters c
            LEFT JOIN personajes_jugador pj ON pj.character_id = c.id
            GROUP BY c.id
            ORDER BY c.is_default DESC, c.orden, c.name
        `);

        res.json({ success: true, personajes: rows });
    })
);

router.put(
    "/personajes/:id",
    ruta(async (req, res) => {
        const numero = (valor, min, max) => {
            const n = Math.round(Number(valor));
            if (!Number.isFinite(n) || n < min || n > max) {
                throw errorConEstado(`Valor fuera de rango (${min} a ${max}).`);
            }
            return n;
        };

        const datos = req.body || {};
        const nombre = String(datos.name || "").trim().slice(0, 100);
        if (!nombre) throw errorConEstado("El nombre es obligatorio.");

        const { rowCount } = await pool.query(
            `
            UPDATE characters
            SET name = $2,
                precio_oro = $3,
                precio_diamantes = $4,
                nivel_minimo = $5,
                activo = $6,
                orden = $7
            WHERE id = $1
            `,
            [
                String(req.params.id),
                nombre,
                numero(datos.precio_oro ?? 0, 0, 1000000),
                numero(datos.precio_diamantes ?? 0, 0, 100000),
                numero(datos.nivel_minimo ?? 1, 1, 100),
                datos.activo !== false,
                numero(datos.orden ?? 0, -1000, 1000),
            ]
        );

        if (rowCount === 0) throw errorConEstado("Personaje no encontrado.", 404);

        res.json({ success: true });
    })
);

/* =========================================================
   USUARIOS
========================================================= */

router.get(
    "/usuarios",
    ruta(async (req, res) => {
        const buscar = String(req.query.buscar || "").trim().slice(0, 60);

        const { rows } = await pool.query(
            `
            SELECT u.id, u.username, u.email, u.rol, u.created_at, u.last_login,
                   p.display_name, p.level, p.xp, p.coins, p.gems,
                   s.games_played, s.correct_answers, s.questions_answered
            FROM users u
            JOIN player_profiles p ON p.user_id = u.id
            LEFT JOIN player_stats s ON s.user_id = u.id
            WHERE $1 = '' OR u.username ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%'
            ORDER BY u.created_at DESC
            LIMIT 200
            `,
            [buscar]
        );

        res.json({ success: true, usuarios: rows });
    })
);

router.put(
    "/usuarios/:id/rol",
    ruta(async (req, res) => {
        const id = idValido(req.params.id);
        const rol = req.body?.rol === "admin" ? "admin" : "jugador";

        if (id === req.user.userId && rol !== "admin") {
            throw errorConEstado("No puedes quitarte el rol de administrador a ti mismo.");
        }

        const { rowCount } = await pool.query("UPDATE users SET rol = $2 WHERE id = $1", [id, rol]);
        if (rowCount === 0) throw errorConEstado("Usuario no encontrado.", 404);

        res.json({ success: true });
    })
);

router.post(
    "/usuarios/:id/regalo",
    ruta(async (req, res) => {
        const id = idValido(req.params.id);
        const oro = Math.max(0, Math.min(100000, Math.round(Number(req.body?.oro) || 0)));
        const diamantes = Math.max(0, Math.min(10000, Math.round(Number(req.body?.diamantes) || 0)));

        if (oro + diamantes === 0) throw errorConEstado("Indica cuánto oro o diamantes regalar.");

        await enTransaccion((client) => entregarRecompensa(client, id, { oro, diamantes }));

        res.json({ success: true });
    })
);

/* Utilidad para el panel: tabla de XP por nivel. */
router.get(
    "/curva-niveles",
    ruta(async (req, res) => {
        let xp = 0;
        const tabla = [];

        for (let nivel = 1; nivel <= 20; nivel += 1) {
            tabla.push({ nivel, xp_total: xp, xp_para_subir: calcularNivel(xp).xp_para_subir });
            xp += calcularNivel(xp).xp_para_subir;
        }

        res.json({ success: true, tabla });
    })
);

export default router;
