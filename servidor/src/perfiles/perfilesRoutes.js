import express from "express";

import { requireAuth } from "../auth/authMiddleware.js";
import { ruta } from "../http/ruta.js";
import { cosmeticosDe, ponerMarco } from "./cosmeticos.js";
import { getUserProfile } from "../users/userService.js";
import { rangoJugador } from "../temporadas/temporadas.js";

/* /api/perfiles
   GET  /cosmeticos           fotos y marcos (cuáles tengo)
   PUT  /marco { marcoId }    poner o quitar el marco (null)
   GET  /rango/:id            rango de temporada de un jugador */
const router = express.Router();
router.use(express.json({ limit: "20kb" }));

router.get(
    "/cosmeticos",
    requireAuth,
    ruta(async (req, res) => res.json({ success: true, ...(await cosmeticosDe(req.user.userId)) }))
);

router.put(
    "/marco",
    requireAuth,
    ruta(async (req, res) => {
        await ponerMarco(req.user.userId, req.body?.marcoId ?? null);
        res.json({ success: true, user: await getUserProfile(req.user.userId) });
    })
);

router.get(
    "/rango/:id",
    ruta(async (req, res) => {
        const id = Number(req.params.id) || 0;
        res.json({ success: true, ...(await rangoJugador(id)) });
    })
);

export default router;
