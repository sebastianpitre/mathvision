/* =========================================================
   USUARIOS · PERFIL, PERSONAJE Y FOTO
   ---------------------------------------------------------
   Antes había funciones para sumar XP y monedas que el
   navegador podía llamar con cualquier cantidad. Se
   quitaron: ahora solo el servidor entrega recompensas
   (ver src/progreso/progreso.js).
========================================================= */

import { pool } from "../database/db.js";
import { conProgreso } from "../progreso/progreso.js";
import { errorConEstado } from "../http/ruta.js";

/* ---------------------------------------------------------
   PERFIL COMPLETO
--------------------------------------------------------- */

export async function getUserProfile(userId) {
    const { rows } = await pool.query(
        `
        SELECT
            u.id,
            u.username,
            u.email,
            u.rol,
            u.created_at,
            u.last_login,

            p.display_name,
            p.level,
            p.xp,
            p.coins,
            p.gems,
            p.character_id,
            p.avatar,

            c.name AS character_name,
            c.model_path AS character_model_path,
            c.thumbnail_path AS character_thumbnail_path,

            s.games_played,
            s.games_won,
            s.games_lost,
            s.questions_answered,
            s.correct_answers,
            s.incorrect_answers

        FROM users u
        JOIN player_profiles p ON p.user_id = u.id
        LEFT JOIN player_stats s ON s.user_id = u.id
        LEFT JOIN characters c ON c.id = p.character_id
        WHERE u.id = $1
        `,
        [userId]
    );

    return conProgreso(rows[0] || null);
}

/* ---------------------------------------------------------
   PERSONAJES (con precio y si el jugador ya lo tiene)
--------------------------------------------------------- */

export async function getCharacters(userId) {
    const { rows } = await pool.query(
        `
        SELECT
            c.id,
            c.name,
            c.model_path,
            c.thumbnail_path,
            c.is_default,
            c.precio_oro,
            c.precio_diamantes,
            c.nivel_minimo,
            c.creditos,
            (pj.user_id IS NOT NULL
                OR (c.precio_oro = 0 AND c.precio_diamantes = 0)) AS comprado
        FROM characters c
        LEFT JOIN personajes_jugador pj
            ON pj.character_id = c.id AND pj.user_id = $1
        WHERE c.activo = TRUE
           OR pj.user_id IS NOT NULL
        ORDER BY c.is_default DESC, c.orden, c.name
        `,
        [userId]
    );

    return rows;
}

/* ---------------------------------------------------------
   CAMBIAR PERSONAJE (solo si lo tiene)
--------------------------------------------------------- */

export async function updateCharacter(userId, characterId) {
    const { rows } = await pool.query(
        `
        SELECT c.id,
               (pj.user_id IS NOT NULL
                   OR (c.precio_oro = 0 AND c.precio_diamantes = 0)) AS comprado
        FROM characters c
        LEFT JOIN personajes_jugador pj
            ON pj.character_id = c.id AND pj.user_id = $2
        WHERE c.id = $1
        `,
        [characterId, userId]
    );

    if (rows.length === 0) {
        throw errorConEstado("El personaje no existe.", 404);
    }

    if (!rows[0].comprado) {
        throw errorConEstado("Primero debes desbloquear este personaje en la tienda.", 403);
    }

    await pool.query(
        `
        UPDATE player_profiles
        SET character_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
        `,
        [characterId, userId]
    );

    return getUserProfile(userId);
}

/* ---------------------------------------------------------
   FOTO DE PERFIL
   Solo imágenes del propio juego (/img/...), para que nadie
   pueda poner enlaces externos o código.
--------------------------------------------------------- */

const AVATAR_VALIDO = /^\/img\/[\w\-./]+\.(png|jpe?g|webp|avif|gif|svg)$/i;

export async function updateAvatar(userId, avatar) {
    if (typeof avatar !== "string" || avatar.length > 255 || !AVATAR_VALIDO.test(avatar) || avatar.includes("..")) {
        throw errorConEstado("Foto de perfil no válida.");
    }

    await pool.query(
        `
        UPDATE player_profiles
        SET avatar = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
        `,
        [avatar, userId]
    );

    return getUserProfile(userId);
}
