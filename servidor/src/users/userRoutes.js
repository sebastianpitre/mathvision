/* =========================================================
   RUTAS DE USUARIO  ·  /api/users
========================================================= */

import express from "express";

import {
    getUserProfile,
    getCharacters,
    updateCharacter,
    updateAvatar,
} from "./userService.js";

import { requireAuth } from "../auth/authMiddleware.js";
import { ruta, errorConEstado } from "../http/ruta.js";

const router = express.Router();

/* Perfil público: nunca se muestran el correo ni el rol. */
function perfilPublico(user) {
    return {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        level: user.level,
        xp: user.xp,
        xp_en_nivel: user.xp_en_nivel,
        xp_para_subir: user.xp_para_subir,
        coins: user.coins,
        gems: user.gems,
        avatar: user.avatar,
        marco: user.marco,
        character_id: user.character_id,
        character_name: user.character_name,
        character_model_path: user.character_model_path,
        character_thumbnail_path: user.character_thumbnail_path,
        games_played: user.games_played,
        games_won: user.games_won,
        games_lost: user.games_lost,
        questions_answered: user.questions_answered,
        correct_answers: user.correct_answers,
        incorrect_answers: user.incorrect_answers,
        created_at: user.created_at,
    };
}

/* Mi perfil */
router.get(
    "/profile",
    requireAuth,
    ruta(async (req, res) => {
        const user = await getUserProfile(req.user.userId);
        if (!user) throw errorConEstado("Usuario no encontrado.", 404);
        res.json({ success: true, user });
    })
);

/* Perfil de otro jugador */
router.get(
    "/profile/:id",
    ruta(async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) throw errorConEstado("Usuario no encontrado.", 404);

        const user = await getUserProfile(id);
        if (!user) throw errorConEstado("Usuario no encontrado.", 404);

        res.json({ success: true, user: perfilPublico(user) });
    })
);

/* Personajes (con precio y si ya los tengo) */
router.get(
    "/characters",
    requireAuth,
    ruta(async (req, res) => {
        res.json({ success: true, characters: await getCharacters(req.user.userId) });
    })
);

/* Cambiar foto de perfil */
router.put(
    "/avatar",
    requireAuth,
    ruta(async (req, res) => {
        const user = await updateAvatar(req.user.userId, req.body?.avatar);
        res.json({ success: true, user });
    })
);

/* Ponerme un personaje que ya tengo */
router.put(
    "/character",
    requireAuth,
    ruta(async (req, res) => {
        const characterId = String(req.body?.characterId || "").trim();
        if (!characterId) throw errorConEstado("Falta el personaje.");

        const user = await updateCharacter(req.user.userId, characterId);
        res.json({ success: true, user });
    })
);

export default router;
