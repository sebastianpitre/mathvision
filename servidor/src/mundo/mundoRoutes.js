import express from "express";

import { requireAuth } from "../auth/authMiddleware.js";
import { ruta } from "../http/ruta.js";
import { mundoParaJugador } from "./mundo.js";

/* /api/mundo  GET → colores y personajes permitidos */
const router = express.Router();

router.get(
    "/",
    requireAuth,
    ruta(async (req, res) => res.json({ success: true, ...(await mundoParaJugador()) }))
);

export default router;
