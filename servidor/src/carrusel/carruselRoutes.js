import express from "express";

import { requireAuth } from "../auth/authMiddleware.js";
import { ruta } from "../http/ruta.js";
import { carruselPublico } from "./carrusel.js";
import { fondoLobby } from "../config/fondoLobby.js";

/* /api/carrusel
   GET /        anuncios del lobby (solo los eventos en curso)
   GET /fondo   fondo del lobby (público: también lo usa el inicio de sesión) */
const router = express.Router();

router.get(
    "/fondo",
    ruta(async (req, res) => res.json({ success: true, ...(await fondoLobby()) }))
);

router.get(
    "/",
    requireAuth,
    ruta(async (req, res) => res.json({ success: true, ...(await carruselPublico()) }))
);

export default router;
