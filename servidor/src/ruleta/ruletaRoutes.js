import express from "express";

import { requireAuth } from "../auth/authMiddleware.js";
import { ruta } from "../http/ruta.js";
import { ruletasDelJugador, girar } from "./ruleta.js";
import { getUserProfile } from "../users/userService.js";

/* /api/ruletas
   GET  /             ruletas activas, premios con su % y mis tiquetes
   POST /:id/girar    gasta tiquetes y da un premio */
const router = express.Router();
router.use(requireAuth);

router.get(
    "/",
    ruta(async (req, res) => res.json({ success: true, ...(await ruletasDelJugador(req.user.userId)) }))
);

router.post(
    "/:id/girar",
    ruta(async (req, res) => {
        const r = await girar(req.user.userId, Number(req.params.id) || 0);
        res.json({ success: true, ...r, user: await getUserProfile(req.user.userId) });
    })
);

export default router;
