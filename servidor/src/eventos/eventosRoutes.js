import express from "express";

import { requireAuth } from "../auth/authMiddleware.js";
import { ruta } from "../http/ruta.js";
import { eventosDelJugador, reclamarMision } from "./eventos.js";
import { getUserProfile } from "../users/userService.js";

/* /api/eventos
   GET  /                         eventos de ahora con mi avance
   POST /misiones/:id/reclamar    reclamar la recompensa de una misión */
const router = express.Router();

router.get(
    "/",
    requireAuth,
    ruta(async (req, res) => res.json({ success: true, ...(await eventosDelJugador(req.user.userId)) }))
);

router.post(
    "/misiones/:id/reclamar",
    requireAuth,
    ruta(async (req, res) => {
        const entregado = await reclamarMision(req.user.userId, Number(req.params.id) || 0);
        res.json({ success: true, entregado, user: await getUserProfile(req.user.userId), message: "¡Recompensa reclamada!" });
    })
);

export default router;
