/* =========================================================
   RANKING  ·  GET /api/ranking?por=nivel|victorias|aciertos
   Los 50 mejores (sin cuentas bloqueadas) con su personaje,
   para ver su skin en 3D al tocarlos, y tu posición.
========================================================= */

import express from "express";

import { pool } from "../database/db.js";
import { requireAuth } from "../auth/authMiddleware.js";
import { ruta } from "../http/ruta.js";

const router = express.Router();

const ORDEN = {
    nivel: "p.xp DESC, p.level DESC, u.id",
    victorias: "COALESCE(s.games_won, 0) DESC, p.xp DESC, u.id",
    aciertos: "COALESCE(s.correct_answers, 0) DESC, p.xp DESC, u.id",
};

const TOP = 50;

router.get(
    "/",
    requireAuth,
    ruta(async (req, res) => {
        const por = ORDEN[req.query.por] ? req.query.por : "nivel";

        const { rows } = await pool.query(
            `
            WITH tabla AS (
                SELECT
                    u.id,
                    p.display_name AS nombre,
                    p.avatar,
                    p.level AS nivel,
                    p.xp,
                    COALESCE(s.games_played, 0) AS partidas,
                    COALESCE(s.games_won, 0) AS victorias,
                    COALESCE(s.correct_answers, 0) AS aciertos,
                    COALESCE(s.questions_answered, 0) AS respondidas,
                    c.name AS personaje,
                    c.model_path AS modelo,
                    ROW_NUMBER() OVER (ORDER BY ${ORDEN[por]})::int AS posicion
                FROM users u
                JOIN player_profiles p ON p.user_id = u.id
                LEFT JOIN player_stats s ON s.user_id = u.id
                LEFT JOIN characters c ON c.id = p.character_id
                WHERE u.bloqueado = FALSE
            )
            SELECT * FROM tabla
            WHERE posicion <= $1 OR id = $2
            ORDER BY posicion
            `,
            [TOP, req.user.userId]
        );

        res.json({
            success: true,
            por,
            jugadores: rows.filter((r) => r.posicion <= TOP),
            yo: rows.find((r) => r.id === req.user.userId) || null,
        });
    })
);

export default router;
