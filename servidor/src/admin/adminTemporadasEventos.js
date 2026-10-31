/* =========================================================
   PANEL · TEMPORADAS, EVENTOS Y PERFILES  (/api/admin/…)

   GET  /temporadas                actual, reglas e historial
   PUT  /temporadas/actual         { nombre, fin }
   PUT  /temporadas/config         { config }
   POST /temporadas/cerrar         cerrar ya (entrega premios)
   GET  /temporadas/:id/tabla      tabla de una temporada

   GET    /cosmeticos              fotos y marcos (cuántos los tienen)
   POST   /cosmeticos              { tipo, nombre, ruta, exclusivo }
   PUT    /cosmeticos/:id          { nombre, exclusivo }
   DELETE /cosmeticos/:id

   GET    /eventos                 todos, con misiones y reclamos
   POST   /eventos                 crear (con misiones)
   PUT    /eventos/:id             editar (con misiones)
   DELETE /eventos/:id

   GET    /carrusel                anuncios del lobby, eventos y opciones
   PUT    /carrusel                { config }
   GET    /fondo-lobby             fondo actual y los que trae el juego
   PUT    /fondo-lobby             { ruta }
========================================================= */

import express from "express";

import { pool } from "../database/db.js";
import { ruta, errorConEstado } from "../http/ruta.js";
import {
    configTemporadas,
    guardarConfigTemporadas,
    temporadaAbierta,
    editarTemporadaAbierta,
    cerrarTemporada,
    historialTemporadas,
    tablaTemporada,
    numeroTemporada,
    RANGOS,
} from "../temporadas/temporadas.js";
import { listarEventosAdmin, guardarEvento, borrarEvento, TIPOS_MISION, JUEGOS_MISION } from "../eventos/eventos.js";
import { configCarrusel, guardarCarrusel, PANTALLAS, FONDOS } from "../carrusel/carrusel.js";
import { fondoLobby, guardarFondoLobby, FONDOS_LISTOS } from "../config/fondoLobby.js";
import { listarRuletasAdmin, guardarRuleta, borrarRuleta, regalarTickets, TIPOS_PREMIO } from "../ruleta/ruleta.js";

const router = express.Router();

/* ---------------- Carrusel del lobby ---------------- */

router.get(
    "/carrusel",
    ruta(async (req, res) => {
        const { rows: eventos } = await pool.query(
            "SELECT id, titulo, imagen, inicio, fin, activo FROM eventos WHERE fin > NOW() - INTERVAL '30 days' ORDER BY fin DESC"
        );
        res.json({ success: true, config: await configCarrusel(), eventos, pantallas: PANTALLAS, fondos: FONDOS });
    })
);

router.put(
    "/carrusel",
    ruta(async (req, res) => res.json({ success: true, config: await guardarCarrusel(req.body?.config) }))
);

router.get(
    "/fondo-lobby",
    ruta(async (req, res) => res.json({ success: true, ...(await fondoLobby()), listos: FONDOS_LISTOS }))
);

router.put(
    "/fondo-lobby",
    ruta(async (req, res) => res.json({ success: true, ...(await guardarFondoLobby(req.body?.ruta)) }))
);

/* ---------------- Temporadas ---------------- */

router.get(
    "/temporadas",
    ruta(async (req, res) => {
        const [actual, config, historial, { rows: personajes }, { rows: cosmeticos }] = await Promise.all([
            temporadaAbierta(),
            configTemporadas(),
            historialTemporadas(),
            pool.query("SELECT id, name FROM characters ORDER BY orden, name"),
            pool.query("SELECT id, tipo, nombre FROM cosmeticos ORDER BY tipo, nombre"),
        ]);
        const numero = await numeroTemporada(actual.id);
        res.json({ success: true, actual: { ...actual, numero }, config, rangos: RANGOS, historial, personajes, cosmeticos });
    })
);

router.put(
    "/temporadas/actual",
    ruta(async (req, res) => res.json({ success: true, actual: await editarTemporadaAbierta(req.body || {}) }))
);

router.put(
    "/temporadas/config",
    ruta(async (req, res) => res.json({ success: true, config: await guardarConfigTemporadas(req.body?.config) }))
);

router.post(
    "/temporadas/cerrar",
    ruta(async (req, res) => {
        const t = await temporadaAbierta();
        const resumen = await cerrarTemporada(t.id);
        res.json({ success: true, resumen, actual: await temporadaAbierta() });
    })
);

router.get(
    "/temporadas/:id/tabla",
    ruta(async (req, res) => {
        res.json({ success: true, ...(await tablaTemporada(req.user.userId, { temporadaId: Number(req.params.id) || 0, top: 200 })) });
    })
);

/* ---------------- Fotos de perfil y marcos ---------------- */

const RUTA_IMAGEN = /^\/(archivos|img)\/[\w\-./]+\.(png|jpe?g|webp)$/i;

router.get(
    "/cosmeticos",
    ruta(async (req, res) => {
        const { rows } = await pool.query(
            `
            SELECT c.*, COUNT(cj.user_id)::int AS jugadores
            FROM cosmeticos c
            LEFT JOIN cosmeticos_jugador cj ON cj.cosmetico_id = c.id
            GROUP BY c.id
            ORDER BY c.tipo, c.creado_en DESC
            `
        );
        res.json({ success: true, cosmeticos: rows });
    })
);

router.post(
    "/cosmeticos",
    ruta(async (req, res) => {
        const { tipo, nombre, ruta: archivo, exclusivo } = req.body || {};
        if (tipo !== "foto" && tipo !== "marco") throw errorConEstado("Tipo no válido.");
        const limpio = String(nombre || "").trim().slice(0, 80);
        if (!limpio) throw errorConEstado("Ponle un nombre.");
        if (!RUTA_IMAGEN.test(String(archivo || "")) || String(archivo).includes("..")) throw errorConEstado("Sube la imagen primero.");
        const { rows } = await pool.query(
            "INSERT INTO cosmeticos (tipo, nombre, ruta, exclusivo) VALUES ($1, $2, $3, $4) RETURNING *",
            [tipo, limpio, archivo, exclusivo !== false]
        );
        res.status(201).json({ success: true, cosmetico: rows[0] });
    })
);

router.put(
    "/cosmeticos/:id",
    ruta(async (req, res) => {
        const nombre = String(req.body?.nombre || "").trim().slice(0, 80);
        if (!nombre) throw errorConEstado("Ponle un nombre.");
        const { rowCount } = await pool.query("UPDATE cosmeticos SET nombre = $2, exclusivo = $3 WHERE id = $1", [
            Number(req.params.id) || 0,
            nombre,
            req.body?.exclusivo !== false,
        ]);
        if (!rowCount) throw errorConEstado("No existe.", 404);
        res.json({ success: true });
    })
);

router.delete(
    "/cosmeticos/:id",
    ruta(async (req, res) => {
        const id = Number(req.params.id) || 0;
        const { rows } = await pool.query("DELETE FROM cosmeticos WHERE id = $1 RETURNING ruta, tipo", [id]);
        if (!rows[0]) throw errorConEstado("No existe.", 404);
        // Quien la tenía puesta como foto vuelve a la foto inicial (el marco se quita solo).
        if (rows[0].tipo === "foto") await pool.query("UPDATE player_profiles SET avatar = NULL WHERE avatar = $1", [rows[0].ruta]);
        res.json({ success: true });
    })
);

/* ---------------- Eventos ---------------- */

router.get(
    "/eventos",
    ruta(async (req, res) => {
        const [{ rows: personajes }, { rows: cosmeticos }] = await Promise.all([
            pool.query("SELECT id, name, thumbnail_path FROM characters ORDER BY orden, name"),
            pool.query("SELECT id, tipo, nombre, ruta FROM cosmeticos ORDER BY tipo, nombre"),
        ]);
        res.json({
            success: true,
            eventos: await listarEventosAdmin(),
            tipos: TIPOS_MISION,
            juegos: JUEGOS_MISION,
            personajes,
            cosmeticos,
        });
    })
);

router.post(
    "/eventos",
    ruta(async (req, res) => res.status(201).json({ success: true, id: await guardarEvento(null, req.body) }))
);

router.put(
    "/eventos/:id",
    ruta(async (req, res) => res.json({ success: true, id: await guardarEvento(Number(req.params.id) || 0, req.body) }))
);

router.delete(
    "/eventos/:id",
    ruta(async (req, res) => {
        await borrarEvento(Number(req.params.id) || 0);
        res.json({ success: true });
    })
);

/* ---------------- GiraGamif (ruleta) ---------------- */

router.get(
    "/ruletas",
    ruta(async (req, res) => {
        const [{ rows: personajes }, { rows: cosmeticos }] = await Promise.all([
            pool.query("SELECT id, name, thumbnail_path FROM characters ORDER BY orden, name"),
            pool.query("SELECT id, tipo, nombre, ruta FROM cosmeticos ORDER BY tipo, nombre"),
        ]);
        res.json({ success: true, ruletas: await listarRuletasAdmin(), tipos: TIPOS_PREMIO, personajes, cosmeticos });
    })
);

router.post(
    "/ruletas",
    ruta(async (req, res) => res.status(201).json({ success: true, id: await guardarRuleta(null, req.body) }))
);

router.put(
    "/ruletas/:id",
    ruta(async (req, res) => res.json({ success: true, id: await guardarRuleta(Number(req.params.id) || 0, req.body) }))
);

router.delete(
    "/ruletas/:id",
    ruta(async (req, res) => {
        await borrarRuleta(Number(req.params.id) || 0);
        res.json({ success: true });
    })
);

router.post(
    "/usuarios/:id/tickets",
    ruta(async (req, res) => {
        await regalarTickets(Number(req.params.id) || 0, req.body?.cantidad);
        res.json({ success: true });
    })
);

export default router;
