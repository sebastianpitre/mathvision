/* =========================================================
   RUTAS DEL JUGADOR · NIVELES Y PARTIDAS
   ---------------------------------------------------------
   GET  /api/niveles                     niveles disponibles
   POST /api/partidas                    empezar  { nivel_id }
   POST /api/partidas/:id/responder      { opcion }  (null = se acabó el tiempo)
   POST /api/partidas/:id/comodin        50/50
   POST /api/partidas/:id/retirarse      terminar y cobrar lo ganado
   GET  /api/partidas/mias               mis últimas partidas
   POST /api/partidas/registrar          juegos del navegador (Escape Álgebra)
========================================================= */

import express from "express";

import { requireAuth } from "../auth/authMiddleware.js";
import { ruta, errorConEstado } from "../http/ruta.js";
import { listarNivelesActivos } from "../niveles/nivelesService.js";
import { getUserProfile } from "../users/userService.js";
import {
    iniciarPartida,
    responder,
    usarComodin,
    retirarse,
    partidasRecientes,
    registrarPartidaSimple,
} from "./partidasService.js";

export const nivelesRouter = express.Router();
export const partidasRouter = express.Router();

function idValido(valor) {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) throw errorConEstado("Identificador no válido.");
    return id;
}

/* ---------------- NIVELES ---------------- */

nivelesRouter.get(
    "/",
    requireAuth,
    ruta(async (req, res) => {
        res.json({ success: true, niveles: await listarNivelesActivos(req.user.userId) });
    })
);

/* ---------------- PARTIDAS ---------------- */

partidasRouter.use(requireAuth);

partidasRouter.post(
    "/",
    ruta(async (req, res) => {
        const datos = await iniciarPartida(req.user.userId, idValido(req.body?.nivel_id));
        res.status(201).json({ success: true, ...datos });
    })
);

partidasRouter.post(
    "/:id/responder",
    ruta(async (req, res) => {
        const opcion = req.body?.opcion;
        const resultado = await responder(
            req.user.userId,
            idValido(req.params.id),
            Number.isInteger(opcion) ? opcion : null
        );

        // Al terminar, se devuelve el perfil con el XP y el oro nuevos.
        if (resultado.final) {
            resultado.perfil = await getUserProfile(req.user.userId);
        }

        res.json({ success: true, ...resultado });
    })
);

partidasRouter.post(
    "/:id/comodin",
    ruta(async (req, res) => {
        res.json({ success: true, ...(await usarComodin(req.user.userId, idValido(req.params.id))) });
    })
);

partidasRouter.post(
    "/:id/retirarse",
    ruta(async (req, res) => {
        const resultado = await retirarse(req.user.userId, idValido(req.params.id));
        resultado.perfil = await getUserProfile(req.user.userId);
        res.json({ success: true, ...resultado });
    })
);

partidasRouter.get(
    "/mias",
    ruta(async (req, res) => {
        res.json({ success: true, partidas: await partidasRecientes(req.user.userId) });
    })
);

partidasRouter.post(
    "/registrar",
    ruta(async (req, res) => {
        const resultado = await registrarPartidaSimple(req.user.userId, req.body || {});
        res.json({ success: true, ...resultado, perfil: await getUserProfile(req.user.userId) });
    })
);
