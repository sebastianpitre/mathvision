import express from "express";

import { requireAuth } from "../auth/authMiddleware.js";
import { ruta } from "../http/ruta.js";
import { carruselPublico } from "./carrusel.js";

/* /api/carrusel
   GET /   anuncios del lobby (solo los eventos en curso) */
const router = express.Router();
router.use(requireAuth);

router.get(
    "/",
    ruta(async (req, res) => res.json({ success: true, ...(await carruselPublico()) }))
);

export default router;
