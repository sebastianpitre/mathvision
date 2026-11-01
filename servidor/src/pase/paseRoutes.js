import express from "express";

import { requireAuth } from "../auth/authMiddleware.js";
import { ruta } from "../http/ruta.js";
import { getUserProfile } from "../users/userService.js";
import { comprarElite, paseDelJugador, reclamarPase } from "./pase.js";

/* /api/pase
   GET  /               el pase de ahora con mi avance
   POST /reclamar       { nivel, pista }
   POST /reclamar-todo  todo lo que ya alcancé
   POST /comprar        desbloquear la fila élite con diamantes */
const router = express.Router();
router.use(express.json());

router.get(
    "/",
    requireAuth,
    ruta(async (req, res) => res.json({ success: true, ...(await paseDelJugador(req.user.userId)) }))
);

router.post(
    "/reclamar",
    requireAuth,
    ruta(async (req, res) => {
        const { entregados } = await reclamarPase(req.user.userId, { nivel: req.body?.nivel, pista: req.body?.pista });
        res.json({ success: true, entregados, user: await getUserProfile(req.user.userId), message: "¡Premio reclamado!" });
    })
);

router.post(
    "/reclamar-todo",
    requireAuth,
    ruta(async (req, res) => {
        const { entregados } = await reclamarPase(req.user.userId, { todo: true });
        res.json({
            success: true,
            entregados,
            user: await getUserProfile(req.user.userId),
            message: `¡${entregados.length} premio${entregados.length === 1 ? "" : "s"} reclamado${entregados.length === 1 ? "" : "s"}!`,
        });
    })
);

router.post(
    "/comprar",
    requireAuth,
    ruta(async (req, res) => {
        await comprarElite(req.user.userId);
        res.json({ success: true, user: await getUserProfile(req.user.userId), message: "¡Pase Élite desbloqueado!" });
    })
);

export default router;
