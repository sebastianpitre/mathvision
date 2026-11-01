/* =========================================================
   MUNDO 3D (lobby para caminar)
   ---------------------------------------------------------
   Por ahora: un suelo y un cielo de dos colores. El admin
   elige los colores y QUÉ PERSONAJES se pueden usar ahí
   (los .glb, que pesan menos). Se guarda en config_juego
   (clave "mundo").
========================================================= */

import { pool } from "../database/db.js";
import { errorConEstado } from "../http/ruta.js";

const CLAVE = "mundo";
const COLOR = /^#[0-9a-f]{6}$/i;
const POR_DEFECTO = { cielo: "#7cc4ff", suelo: "#5fb35a", personajes: [] };

let cache = null;

export const esGlb = (ruta) => /\.glb$/i.test(String(ruta || ""));

export async function configMundo() {
    if (cache) return cache;
    const { rows } = await pool.query("SELECT valor FROM config_juego WHERE clave = $1", [CLAVE]);
    const v = rows[0]?.valor || {};
    cache = {
        cielo: COLOR.test(v.cielo) ? v.cielo : POR_DEFECTO.cielo,
        suelo: COLOR.test(v.suelo) ? v.suelo : POR_DEFECTO.suelo,
        personajes: Array.isArray(v.personajes) ? v.personajes.map(String) : [],
    };
    return cache;
}

/* Lo que ve el jugador: colores y los personajes permitidos (con su modelo). */
export async function mundoParaJugador() {
    const c = await configMundo();
    const { rows } = await pool.query(
        "SELECT id, name AS nombre, model_path AS modelo, thumbnail_path AS foto FROM characters WHERE id = ANY($1)",
        [c.personajes]
    );
    const orden = new Map(c.personajes.map((id, i) => [id, i]));
    return {
        cielo: c.cielo,
        suelo: c.suelo,
        personajes: rows.filter((p) => esGlb(p.modelo)).sort((a, b) => orden.get(a.id) - orden.get(b.id)),
    };
}

export async function guardarConfigMundo(d = {}) {
    const cielo = String(d.cielo || "");
    const suelo = String(d.suelo || "");
    if (!COLOR.test(cielo) || !COLOR.test(suelo)) throw errorConEstado("Elige los dos colores.");
    const pedidos = [...new Set((Array.isArray(d.personajes) ? d.personajes : []).map(String))].slice(0, 50);
    const { rows } = await pool.query("SELECT id, model_path FROM characters WHERE id = ANY($1)", [pedidos]);
    const modelo = new Map(rows.map((r) => [r.id, r.model_path]));
    for (const id of pedidos) {
        if (!modelo.has(id)) throw errorConEstado(`El personaje "${id}" no existe.`);
        if (!esGlb(modelo.get(id))) throw errorConEstado(`"${id}" no es un modelo .glb: en el mundo solo se usan .glb (pesan menos).`);
    }
    const valor = { cielo: cielo.toLowerCase(), suelo: suelo.toLowerCase(), personajes: pedidos };
    await pool.query(
        `
        INSERT INTO config_juego (clave, valor, actualizado_en)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP
        `,
        [CLAVE, JSON.stringify(valor)]
    );
    cache = valor;
    return valor;
}
