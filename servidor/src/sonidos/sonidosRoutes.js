import express from "express";

import { ruta } from "../http/ruta.js";
import { configPublica } from "./sonidos.js";

/* GET /api/sonidos → qué sonido y volumen tiene cada momento.
   Es público: lo pide el juego al abrir (sin datos privados). */
const router = express.Router();

router.get(
    "/",
    ruta(async (req, res) => {
        res.set("Cache-Control", "no-cache");
        res.json({ success: true, momentos: await configPublica() });
    })
);

export default router;
