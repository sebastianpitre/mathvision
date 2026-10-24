/* =========================================================
   REGLAS DE SIGLOGAMIF QUE SE CAMBIAN DESDE EL PANEL
   ---------------------------------------------------------
   Poder 🔄: de vez en cuando aparece flotando para todos. El
   primero que lo toca elige a otro jugador y le pone el número
   que quiera (0 a 6, como unidad o decena) en su siguiente
   espacio: ese jugador pierde ese turno o hasta puede pasarse
   de 100.

   Se guarda en config_juego ("reglas_siglo"). Se lee al
   arrancar y queda en memoria (la partida la necesita al
   instante).
========================================================= */

import { pool } from "../database/db.js";

const CLAVE = "reglas_siglo";

export const REGLAS_SIGLO_POR_DEFECTO = {
    poder_activo: true,
    poder_por_partida: 1, // cuántas veces sale en una partida (al azar)
    poder_segundos_visible: 8, // cuánto flota esperando que alguien lo toque
    poder_segundos_elegir: 10, // cuánto tiene quien lo agarró para usarlo
};

let actuales = { ...REGLAS_SIGLO_POR_DEFECTO };

const entero = (v, min, max, porDefecto) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : porDefecto;
};

function normalizar(v = {}) {
    const d = REGLAS_SIGLO_POR_DEFECTO;
    return {
        poder_activo: typeof v.poder_activo === "boolean" ? v.poder_activo : d.poder_activo,
        poder_por_partida: entero(v.poder_por_partida, 0, 5, d.poder_por_partida),
        poder_segundos_visible: entero(v.poder_segundos_visible, 3, 30, d.poder_segundos_visible),
        poder_segundos_elegir: entero(v.poder_segundos_elegir, 5, 30, d.poder_segundos_elegir),
    };
}

export function reglasSiglo() {
    return actuales;
}

export async function cargarReglasSiglo() {
    try {
        const { rows } = await pool.query("SELECT valor FROM config_juego WHERE clave = $1", [CLAVE]);
        actuales = normalizar(rows[0]?.valor);
    } catch (error) {
        console.error("⚠️  No se pudieron leer las reglas de SigloGamif:", error.message);
    }
    return actuales;
}

export async function guardarReglasSiglo(valor) {
    const limpio = normalizar({ ...actuales, ...(valor || {}) });
    await pool.query(
        `
        INSERT INTO config_juego (clave, valor, actualizado_en)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP
        `,
        [CLAVE, JSON.stringify(limpio)]
    );
    actuales = limpio;
    return actuales;
}
