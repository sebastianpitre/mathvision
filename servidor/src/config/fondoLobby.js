/* =========================================================
   FONDO DEL LOBBY (y de las pantallas del juego)
   ---------------------------------------------------------
   El administrador elige uno de los fondos que trae el juego
   (Normal, Halloween…) o sube su propia imagen. Se guarda en
   config_juego (clave "fondo_lobby"). Sin nada guardado se usa
   el normal.
========================================================= */

import { pool } from "../database/db.js";
import { errorConEstado } from "../http/ruta.js";

const CLAVE = "fondo_lobby";

export const FONDOS_LISTOS = [
    { id: "normal", nombre: "Normal", ruta: "/img/lobby.jpeg" },
    { id: "halloween", nombre: "Halloween 🎃", ruta: "/img/fondos/lobby-halloween.jpg" },
];

let cache = null;

export async function fondoLobby() {
    if (cache) return cache;
    const { rows } = await pool.query("SELECT valor FROM config_juego WHERE clave = $1", [CLAVE]);
    const ruta = typeof rows[0]?.valor?.ruta === "string" ? rows[0].valor.ruta : FONDOS_LISTOS[0].ruta;
    cache = { ruta };
    return cache;
}

export async function guardarFondoLobby(ruta) {
    const limpia = String(ruta || "").trim().slice(0, 255);
    // Solo imágenes del juego o subidas al servidor (nada de afuera).
    if (!limpia.startsWith("/img/") && !limpia.startsWith("/archivos/")) throw errorConEstado("Elige un fondo o sube una imagen.");
    await pool.query(
        `
        INSERT INTO config_juego (clave, valor, actualizado_en)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP
        `,
        [CLAVE, JSON.stringify({ ruta: limpia })]
    );
    cache = { ruta: limpia };
    return cache;
}
