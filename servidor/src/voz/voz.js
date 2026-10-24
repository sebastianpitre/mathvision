/* =========================================================
   VOZ (walkie-talkie) Y REPORTES · REGLAS
   ---------------------------------------------------------
   Configuración (panel → Voz y reportes), guardada en
   config_juego con la clave "voz":
     activa          la voz está prendida para todos
     segundos        cuánto puede hablar alguien seguido (5)
     espera          segundos antes de volver a hablar (3)
     max_reportes    reportes de personas distintas (sin
                     revisar) para quitarle la voz solo (3)

   Un jugador puede hablar si la voz está activa, el admin no
   se la quitó y no llegó al máximo de reportes.
========================================================= */

import { pool } from "../database/db.js";

const CLAVE = "voz";

export const VOZ_POR_DEFECTO = { activa: true, segundos: 5, espera: 3, max_reportes: 3 };

export const MOTIVOS_REPORTE = {
    insultos: "Insultos o groserías",
    acoso: "Acoso o burlas",
    ruido: "Ruido o spam en la voz",
    inapropiado: "Contenido inapropiado",
    trampa: "Hace trampa",
    otro: "Otro motivo",
};

let config = null;
const permisos = new Map(); // userId → { puede, motivo, en }
const CACHE_MS = 20_000;

const entero = (v, min, max, d) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

function normalizar(v = {}) {
    return {
        activa: v.activa !== false,
        segundos: entero(v.segundos, 1, 15, VOZ_POR_DEFECTO.segundos),
        espera: entero(v.espera, 0, 60, VOZ_POR_DEFECTO.espera),
        max_reportes: entero(v.max_reportes, 1, 100, VOZ_POR_DEFECTO.max_reportes),
    };
}

export async function obtenerConfigVoz() {
    if (config) return config;
    const { rows } = await pool.query("SELECT valor FROM config_juego WHERE clave = $1", [CLAVE]);
    config = normalizar(rows[0]?.valor);
    return config;
}

export async function guardarConfigVoz(valor) {
    const limpio = normalizar(valor);
    await pool.query(
        `
        INSERT INTO config_juego (clave, valor, actualizado_en)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP
        `,
        [CLAVE, JSON.stringify(limpio)]
    );
    config = limpio;
    permisos.clear();
    return limpio;
}

/* Reportes sin revisar, contando una vez a cada persona que reportó. */
export async function reportesPendientes(userId) {
    const { rows } = await pool.query(
        "SELECT COUNT(DISTINCT reportante_id)::int AS n FROM reportes WHERE reportado_id = $1 AND revisado = FALSE",
        [userId]
    );
    return rows[0].n;
}

/* ¿Puede hablar? Devuelve { puede, motivo }. */
export async function permisoVoz(userId) {
    const id = Number(userId);
    const guardado = permisos.get(id);
    if (guardado && Date.now() - guardado.en < CACHE_MS) return guardado;

    const cfg = await obtenerConfigVoz();
    let resultado = { puede: true, motivo: null };

    if (!cfg.activa) {
        resultado = { puede: false, motivo: "La voz está desactivada por ahora." };
    } else {
        const { rows } = await pool.query("SELECT voz_bloqueada FROM users WHERE id = $1", [id]);
        if (rows[0]?.voz_bloqueada) {
            resultado = { puede: false, motivo: "El administrador te quitó la voz." };
        } else if ((await reportesPendientes(id)) >= cfg.max_reportes) {
            resultado = { puede: false, motivo: "Tienes muchos reportes: no puedes hablar por ahora." };
        }
    }

    const final = { ...resultado, en: Date.now() };
    permisos.set(id, final);
    return final;
}

export function olvidarPermisoVoz(userId) {
    if (userId == null) permisos.clear();
    else permisos.delete(Number(userId));
}
