/* =========================================================
   TIENDA DE PERSONAJES  ·  /api/tienda
   ---------------------------------------------------------
   GET  /api/tienda                lista con precios y lo que ya tengo
   POST /api/tienda/comprar        { personaje_id, moneda: "oro" | "diamantes" }
   GET  /api/tienda/escalas        { "ruta del modelo": tamaño } (público)

   Un personaje puede tener precio en oro, en diamantes o en
   ambos (el jugador elige con qué pagar). Además puede pedir
   un nivel mínimo.
========================================================= */

import express from "express";

import { pool, enTransaccion } from "../database/db.js";
import { requireAuth } from "../auth/authMiddleware.js";
import { ruta, errorConEstado } from "../http/ruta.js";
import { getCharacters, getUserProfile } from "../users/userService.js";

const router = express.Router();

/* Tamaño de cada modelo (el juego lo aplica donde se vea el personaje). */
router.get(
    "/escalas",
    ruta(async (req, res) => {
        const { rows } = await pool.query("SELECT model_path, escala FROM characters WHERE escala <> 1");
        res.set("Cache-Control", "no-cache");
        res.json({ success: true, escalas: Object.fromEntries(rows.map((r) => [r.model_path, Number(r.escala)])) });
    })
);

router.use(requireAuth);

router.get(
    "/",
    ruta(async (req, res) => {
        res.json({ success: true, personajes: await getCharacters(req.user.userId) });
    })
);

router.post(
    "/comprar",
    ruta(async (req, res) => {
        const userId = req.user.userId;
        const personajeId = String(req.body?.personaje_id || "").trim();
        const moneda = req.body?.moneda === "diamantes" ? "diamantes" : "oro";

        if (!personajeId) throw errorConEstado("Falta el personaje.");

        const compra = await enTransaccion(async (client) => {
            const { rows: personajes } = await client.query(
                `SELECT * FROM characters WHERE id = $1 AND activo = TRUE`,
                [personajeId]
            );

            const personaje = personajes[0];
            if (!personaje) throw errorConEstado("Ese personaje no está en la tienda.", 404);

            const { rows: yaLoTiene } = await client.query(
                `SELECT 1 FROM personajes_jugador WHERE user_id = $1 AND character_id = $2`,
                [userId, personajeId]
            );

            const esGratis = personaje.precio_oro === 0 && personaje.precio_diamantes === 0;

            if (yaLoTiene.length > 0 || esGratis) {
                throw errorConEstado("Ya tienes este personaje.", 409);
            }

            const precio = moneda === "oro" ? personaje.precio_oro : personaje.precio_diamantes;

            if (precio <= 0) {
                throw errorConEstado(
                    moneda === "oro"
                        ? "Este personaje solo se compra con diamantes."
                        : "Este personaje solo se compra con oro."
                );
            }

            // Bloquea el perfil para que dos compras al mismo
            // tiempo no gasten el mismo oro.
            const { rows: perfiles } = await client.query(
                `SELECT level, coins, gems FROM player_profiles WHERE user_id = $1 FOR UPDATE`,
                [userId]
            );

            const perfil = perfiles[0];

            if (perfil.level < personaje.nivel_minimo) {
                throw errorConEstado(`Necesitas llegar al nivel ${personaje.nivel_minimo}.`, 403);
            }

            const saldo = moneda === "oro" ? perfil.coins : perfil.gems;

            if (saldo < precio) {
                throw errorConEstado(
                    `Te faltan ${precio - saldo} ${moneda === "oro" ? "de oro" : "diamantes"}.`,
                    402
                );
            }

            await client.query(
                `
                UPDATE player_profiles
                SET ${moneda === "oro" ? "coins = coins" : "gems = gems"} - $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1
                `,
                [userId, precio]
            );

            await client.query(
                `
                INSERT INTO personajes_jugador (user_id, character_id, moneda, precio)
                VALUES ($1, $2, $3, $4)
                `,
                [userId, personajeId, moneda, precio]
            );

            return { personaje: personaje.name, moneda, precio };
        });

        res.json({
            success: true,
            compra,
            perfil: await getUserProfile(userId),
            personajes: await getCharacters(userId),
        });
    })
);

export default router;
