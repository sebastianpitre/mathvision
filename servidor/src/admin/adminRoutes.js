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
   POST   /personajes                  crear personaje (con su modelo)
   PUT    /personajes/:id              nombre, archivos, precios y disponibilidad
   DELETE /personajes/:id              borrar (quien lo usaba vuelve al inicial)
   POST   /archivos?tipo=modelo|foto&nombre=x.vrm   subir un archivo (binario)
   GET    /usuarios?buscar=            jugadores
   PUT    /usuarios/:id/rol            { rol: "admin" | "jugador" }
   POST   /usuarios/:id/regalo         { oro, diamantes }
   PUT    /usuarios/:id/progreso       { nivel, oro, diamantes }
   PUT    /usuarios/:id/bloqueo        { bloqueado }
   GET    /premios                     premios de Triqui y SigloGamif
   PUT    /premios                     guardar premios
   PUT    /usuarios/:id/voz            { bloqueada }  quitar o devolver la voz
   GET    /usuarios/:id/reportes       sus reportes con el motivo
   /sonidos/…                          biblioteca de sonidos (ver sonidos/sonidosAdmin.js)
   GET|PUT /reglas-siglo                poder 🔄 de SigloGamif
   POST   /usuarios/:id/reportes/revisar   marcar revisados (ya no cuentan)
   GET    /voz                         reglas de la voz
   PUT    /voz                         guardar reglas
========================================================= */

import express from "express";
import crypto from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

import { pool, enTransaccion } from "../database/db.js";
import { requireAdmin } from "../auth/authMiddleware.js";
import { ruta, errorConEstado } from "../http/ruta.js";
import { calcularNivel, entregarRecompensa, xpParaSubir, NIVEL_MAXIMO } from "../progreso/progreso.js";
import { ARCHIVOS_DIR, URL_ARCHIVOS, TIPOS_ARCHIVO } from "../config/archivos.js";
import { obtenerPremios, guardarPremios } from "../config/premios.js";
import { olvidarBloqueo } from "../auth/bloqueo.js";
import sonidosAdmin from "../sonidos/sonidosAdmin.js";
import { reglasSiglo, guardarReglasSiglo } from "../config/reglasSiglo.js";
import { obtenerConfigVoz, guardarConfigVoz, olvidarPermisoVoz, MOTIVOS_REPORTE } from "../voz/voz.js";
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
router.use("/sonidos", sonidosAdmin);

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
                orden = $7,
                model_path = COALESCE($8, model_path),
                thumbnail_path = COALESCE($9, thumbnail_path)
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
                datos.model_path ? rutaArchivo(datos.model_path, "modelo") : null,
                datos.thumbnail_path ? rutaArchivo(datos.thumbnail_path, "foto") : null,
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
        // "reportes": primero los más reportados.
        const orden = req.query.orden === "reportes" ? "reportes_pendientes DESC, u.created_at DESC" : "u.created_at DESC";

        const { rows } = await pool.query(
            `
            SELECT u.id, u.username, u.email, u.rol, u.created_at, u.last_login,
                   u.bloqueado, u.voz_bloqueada, p.display_name, p.level, p.xp, p.coins, p.gems, p.avatar,
                   (SELECT COUNT(DISTINCT r.reportante_id)::int FROM reportes r
                     WHERE r.reportado_id = u.id AND r.revisado = FALSE) AS reportes_pendientes,
                   (SELECT COUNT(*)::int FROM reportes r WHERE r.reportado_id = u.id) AS reportes_total,
                   s.games_played, s.correct_answers, s.questions_answered
            FROM users u
            JOIN player_profiles p ON p.user_id = u.id
            LEFT JOIN player_stats s ON s.user_id = u.id
            WHERE $1 = '' OR u.username ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%'
            ORDER BY ${orden}
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


/* =========================================================
   ARCHIVOS: modelos 3D y fotos de personajes
   El navegador envía el archivo tal cual (binario). Se
   revisa la extensión, el tamaño y que de verdad sea un
   modelo o una imagen (por sus primeros bytes).
========================================================= */

// Solo se aceptan rutas de archivos del juego o subidos aquí.
function rutaArchivo(valor, tipo) {
    const ruta = String(valor || "").trim();
    const config = TIPOS_ARCHIVO[tipo];
    const permitida =
        /^\/(archivos|models|img)\/[\w\-./]+$/.test(ruta) &&
        !ruta.includes("..") &&
        config.extensiones.includes(path.extname(ruta).toLowerCase());

    if (!permitida) throw errorConEstado(`Ruta de archivo no válida: ${ruta}`);
    return ruta;
}

function slug(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
}

router.post(
    "/archivos",
    express.raw({ type: "application/octet-stream", limit: "61mb" }),
    ruta(async (req, res) => {
        const config = TIPOS_ARCHIVO[req.query.tipo];
        if (!config) throw errorConEstado("Tipo de archivo no válido.");

        const nombre = String(req.query.nombre || "");
        const extension = path.extname(nombre).toLowerCase();
        const datos = req.body;

        if (!config.extensiones.includes(extension)) throw errorConEstado(`El archivo debe ser ${config.texto}.`);
        if (!Buffer.isBuffer(datos) || datos.length === 0) throw errorConEstado("El archivo llegó vacío.");
        if (datos.length > config.maxBytes) {
            throw errorConEstado(`El archivo pesa demasiado (máximo ${Math.round(config.maxBytes / 1048576)} MB).`);
        }
        if (!config.firma(datos)) throw errorConEstado(`Ese archivo no parece ${config.texto}.`);

        const final = `${slug(path.basename(nombre, extension)) || req.query.tipo}-${crypto.randomBytes(4).toString("hex")}${extension}`;
        const carpeta = path.join(ARCHIVOS_DIR, config.carpeta);

        await mkdir(carpeta, { recursive: true });
        await writeFile(path.join(carpeta, final), datos);

        res.json({ success: true, ruta: `${URL_ARCHIVOS}/${config.carpeta}/${final}`, bytes: datos.length });
    })
);

/* ---------------- Crear y borrar personajes ---------------- */

router.post(
    "/personajes",
    ruta(async (req, res) => {
        const datos = req.body || {};
        const nombre = String(datos.name || "").trim().slice(0, 100);
        if (!nombre) throw errorConEstado("El nombre es obligatorio.");
        if (!datos.model_path) throw errorConEstado("Sube el modelo 3D del personaje (.vrm).");

        const modelo = rutaArchivo(datos.model_path, "modelo");
        const foto = datos.thumbnail_path ? rutaArchivo(datos.thumbnail_path, "foto") : null;
        const numero = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

        // El id sale del nombre; si ya existe se le agrega un número.
        const base = slug(nombre) || "personaje";
        let id = base;
        for (let n = 2; ; n += 1) {
            const { rowCount } = await pool.query("SELECT 1 FROM characters WHERE id = $1", [id]);
            if (rowCount === 0) break;
            id = `${base}-${n}`;
        }

        await pool.query(
            `
            INSERT INTO characters (id, name, model_path, thumbnail_path, is_default,
                                    precio_oro, precio_diamantes, nivel_minimo, activo, orden)
            VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7, $8, $9)
            `,
            [
                id,
                nombre,
                modelo,
                foto,
                numero(datos.precio_oro, 0, 1000000),
                numero(datos.precio_diamantes, 0, 100000),
                Math.max(1, numero(datos.nivel_minimo ?? 1, 1, 100)),
                datos.activo !== false,
                numero(datos.orden, -1000, 1000),
            ]
        );

        res.status(201).json({ success: true, id });
    })
);

router.delete(
    "/personajes/:id",
    ruta(async (req, res) => {
        const id = String(req.params.id);

        const borrado = await enTransaccion(async (client) => {
            const { rows } = await client.query("SELECT * FROM characters WHERE id = $1 FOR UPDATE", [id]);
            const personaje = rows[0];
            if (!personaje) throw errorConEstado("Personaje no encontrado.", 404);
            if (personaje.is_default) throw errorConEstado("El personaje inicial no se puede borrar.");

            // Quien lo estaba usando vuelve al personaje inicial.
            await client.query(
                `
                UPDATE player_profiles
                SET character_id = COALESCE((SELECT id FROM characters WHERE is_default LIMIT 1), 'default')
                WHERE character_id = $1
                `,
                [id]
            );
            await client.query("DELETE FROM personajes_jugador WHERE character_id = $1", [id]);
            await client.query("DELETE FROM characters WHERE id = $1", [id]);
            return personaje;
        });

        // Si sus archivos se subieron desde el panel, se borran también.
        for (const ruta of [borrado.model_path, borrado.thumbnail_path]) {
            if (ruta?.startsWith(`${URL_ARCHIVOS}/`) && !ruta.includes("..")) {
                await unlink(path.join(ARCHIVOS_DIR, ruta.slice(URL_ARCHIVOS.length + 1))).catch(() => {});
            }
        }

        res.json({ success: true });
    })
);

/* ---------------- Progreso y bloqueo de cuentas ---------------- */

// XP total con la que se empieza un nivel.
function xpInicioDeNivel(nivel) {
    let xp = 0;
    for (let n = 1; n < nivel; n += 1) xp += xpParaSubir(n);
    return xp;
}

router.put(
    "/usuarios/:id/progreso",
    ruta(async (req, res) => {
        const id = idValido(req.params.id);
        const datos = req.body || {};
        const nivel = Math.round(Number(datos.nivel));
        const oro = Math.round(Number(datos.oro));
        const diamantes = Math.round(Number(datos.diamantes));

        if (!Number.isInteger(nivel) || nivel < 1 || nivel > NIVEL_MAXIMO) {
            throw errorConEstado(`El nivel debe estar entre 1 y ${NIVEL_MAXIMO}.`);
        }
        if (!Number.isInteger(oro) || oro < 0 || oro > 10000000) throw errorConEstado("Oro no válido.");
        if (!Number.isInteger(diamantes) || diamantes < 0 || diamantes > 1000000) throw errorConEstado("Diamantes no válidos.");

        const { rows } = await pool.query("SELECT level, xp FROM player_profiles WHERE user_id = $1", [id]);
        if (!rows[0]) throw errorConEstado("Jugador no encontrado.", 404);

        // Si cambia el nivel, su XP queda al comienzo de ese nivel.
        const xp = nivel === rows[0].level ? rows[0].xp : xpInicioDeNivel(nivel);

        await pool.query(
            `
            UPDATE player_profiles
            SET level = $2, xp = $3, coins = $4, gems = $5, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1
            `,
            [id, nivel, xp, oro, diamantes]
        );

        res.json({ success: true, nivel, xp, oro, diamantes });
    })
);

router.put(
    "/usuarios/:id/bloqueo",
    ruta(async (req, res) => {
        const id = idValido(req.params.id);
        const bloqueado = req.body?.bloqueado === true;

        if (id === req.user.userId && bloqueado) throw errorConEstado("No puedes bloquear tu propia cuenta.");

        const { rowCount } = await pool.query(
            "UPDATE users SET bloqueado = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [id, bloqueado]
        );
        if (rowCount === 0) throw errorConEstado("Usuario no encontrado.", 404);

        olvidarBloqueo(id);
        res.json({ success: true, bloqueado });
    })
);

/* ---------------- Premios de los juegos multijugador ---------------- */

router.get(
    "/premios",
    ruta(async (req, res) => {
        res.json({ success: true, premios: await obtenerPremios() });
    })
);

router.put(
    "/premios",
    ruta(async (req, res) => {
        res.json({ success: true, premios: await guardarPremios(req.body?.premios || {}) });
    })
);

/* =========================================================
   VOZ Y REPORTES
========================================================= */

router.put(
    "/usuarios/:id/voz",
    ruta(async (req, res) => {
        const id = idValido(req.params.id);
        const bloqueada = req.body?.bloqueada === true;
        const { rowCount } = await pool.query("UPDATE users SET voz_bloqueada = $2 WHERE id = $1", [id, bloqueada]);
        if (rowCount === 0) throw errorConEstado("Usuario no encontrado.", 404);
        olvidarPermisoVoz(id);
        res.json({ success: true, bloqueada });
    })
);

router.get(
    "/usuarios/:id/reportes",
    ruta(async (req, res) => {
        const id = idValido(req.params.id);
        const { rows } = await pool.query(
            `
            SELECT r.id, r.motivo, r.contexto, r.revisado, r.creado_en,
                   COALESCE(p.display_name, u.username) AS reportante
            FROM reportes r
            JOIN users u ON u.id = r.reportante_id
            LEFT JOIN player_profiles p ON p.user_id = u.id
            WHERE r.reportado_id = $1
            ORDER BY r.creado_en DESC
            LIMIT 200
            `,
            [id]
        );
        res.json({
            success: true,
            reportes: rows.map((r) => ({ ...r, motivo_texto: MOTIVOS_REPORTE[r.motivo] || r.motivo })),
        });
    })
);

router.post(
    "/usuarios/:id/reportes/revisar",
    ruta(async (req, res) => {
        const id = idValido(req.params.id);
        const { rowCount } = await pool.query(
            "UPDATE reportes SET revisado = TRUE WHERE reportado_id = $1 AND revisado = FALSE",
            [id]
        );
        olvidarPermisoVoz(id);
        res.json({ success: true, revisados: rowCount });
    })
);

/* Reglas de SigloGamif (poder 🔄) */
router.get(
    "/reglas-siglo",
    ruta(async (req, res) => {
        res.json({ success: true, reglas: reglasSiglo() });
    })
);

router.put(
    "/reglas-siglo",
    ruta(async (req, res) => {
        res.json({ success: true, reglas: await guardarReglasSiglo(req.body?.reglas) });
    })
);

router.get(
    "/voz",
    ruta(async (req, res) => {
        res.json({ success: true, voz: await obtenerConfigVoz() });
    })
);

router.put(
    "/voz",
    ruta(async (req, res) => {
        res.json({ success: true, voz: await guardarConfigVoz(req.body?.voz || {}) });
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
