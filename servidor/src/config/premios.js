/* =========================================================
   PREMIOS DE LOS JUEGOS MULTIJUGADOR (Triqui y SigloGamif)
   ---------------------------------------------------------
   El administrador los cambia desde el panel; se guardan en
   la tabla config_juego. Si no hay nada guardado, se usan
   estos valores por defecto.
========================================================= */

import { pool } from "../database/db.js";

const CLAVE = "premios_multijugador";

export const PREMIOS_POR_DEFECTO = {
    triqui: {
        ganada: { xp: 30, oro: 15 },
        empate: { xp: 15, oro: 5 },
        perdida: { xp: 10, oro: 0 },
        max_diarias: 15,
    },
    siglo: {
        ganada: { xp: 40, oro: 20 },
        empate: { xp: 20, oro: 8 },
        perdida: { xp: 10, oro: 0 },
        bono_siglo_diamantes: 1,
        max_diarias: 15,
    },
};

let cache = null;

const entero = (valor, min, max, porDefecto) => {
    const n = Math.round(Number(valor));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : porDefecto;
};

/* Mezcla lo guardado con los valores por defecto y lo deja en rango. */
function normalizar(valor = {}) {
    const resultado = {};

    for (const [juego, base] of Object.entries(PREMIOS_POR_DEFECTO)) {
        const dato = valor[juego] || {};
        resultado[juego] = {};

        for (const caso of ["ganada", "empate", "perdida"]) {
            resultado[juego][caso] = {
                xp: entero(dato[caso]?.xp, 0, 1000, base[caso].xp),
                oro: entero(dato[caso]?.oro, 0, 1000, base[caso].oro),
            };
        }

        resultado[juego].max_diarias = entero(dato.max_diarias, 0, 200, base.max_diarias);

        if ("bono_siglo_diamantes" in base) {
            resultado[juego].bono_siglo_diamantes = entero(dato.bono_siglo_diamantes, 0, 20, base.bono_siglo_diamantes);
        }
    }

    return resultado;
}

export async function obtenerPremios() {
    if (cache) return cache;

    const { rows } = await pool.query("SELECT valor FROM config_juego WHERE clave = $1", [CLAVE]);
    cache = normalizar(rows[0]?.valor);
    return cache;
}

export async function guardarPremios(valor) {
    const limpio = normalizar(valor);

    await pool.query(
        `
        INSERT INTO config_juego (clave, valor, actualizado_en)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP
        `,
        [CLAVE, JSON.stringify(limpio)]
    );

    cache = limpio;
    return limpio;
}
