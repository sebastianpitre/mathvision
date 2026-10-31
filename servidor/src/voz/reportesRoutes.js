/* =========================================================
   REPORTES  ·  /api/reportes
   GET  /motivos                     lista de motivos
   POST /  { reportadoId, motivo, contexto }
   Cada persona puede reportar a otra una vez por día. Al
   llegar al máximo (panel → Voz y reportes), el reportado
   se queda sin voz hasta que el administrador lo revise.
========================================================= */

import express from "express";

import { pool } from "../database/db.js";
import { requireAuth } from "../auth/authMiddleware.js";
import { ruta, errorConEstado } from "../http/ruta.js";
import { MOTIVOS_REPORTE, olvidarPermisoVoz } from "./voz.js";

const router = express.Router();
const CONTEXTOS = ["sala", "siglo", "triqui", "invasion", "zona", "perfil"];

router.get("/motivos", requireAuth, (req, res) => {
    res.json({ success: true, motivos: Object.entries(MOTIVOS_REPORTE).map(([id, texto]) => ({ id, texto })) });
});

router.post(
    "/",
    requireAuth,
    ruta(async (req, res) => {
        const reportado = Number(req.body?.reportadoId);
        const motivo = String(req.body?.motivo || "");
        const contexto = CONTEXTOS.includes(req.body?.contexto) ? req.body.contexto : null;

        if (!Number.isInteger(reportado) || reportado <= 0) throw errorConEstado("Jugador no válido.");
        if (reportado === req.user.userId) throw errorConEstado("No puedes reportarte a ti mismo.");
        if (!MOTIVOS_REPORTE[motivo]) throw errorConEstado("Elige el motivo del reporte.");

        const existe = await pool.query("SELECT 1 FROM users WHERE id = $1", [reportado]);
        if (existe.rowCount === 0) throw errorConEstado("Ese jugador no existe.", 404);

        const reciente = await pool.query(
            `SELECT 1 FROM reportes
             WHERE reportado_id = $1 AND reportante_id = $2 AND creado_en > NOW() - INTERVAL '1 day'`,
            [reportado, req.user.userId]
        );
        if (reciente.rowCount > 0) throw errorConEstado("Ya reportaste a este jugador hoy. Gracias, lo revisaremos.");

        await pool.query(
            "INSERT INTO reportes (reportado_id, reportante_id, motivo, contexto) VALUES ($1, $2, $3, $4)",
            [reportado, req.user.userId, motivo, contexto]
        );

        olvidarPermisoVoz(reportado);
        res.status(201).json({ success: true, message: "Reporte enviado. Gracias por avisar." });
    })
);

export default router;
