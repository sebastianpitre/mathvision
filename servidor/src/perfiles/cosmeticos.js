/* =========================================================
   FOTOS DE PERFIL Y MARCOS
   ---------------------------------------------------------
   El administrador los sube en el panel. Los "exclusivos"
   solo los tiene quien los gana (por ejemplo, en un evento);
   los demás los puede usar cualquiera.
========================================================= */

import { pool } from "../database/db.js";
import { errorConEstado } from "../http/ruta.js";

/* Lo que puede usar un jugador: libres + los que ganó. */
export async function cosmeticosDe(userId) {
    const { rows } = await pool.query(
        `
        SELECT c.id, c.tipo, c.nombre, c.ruta, c.exclusivo,
               (NOT c.exclusivo OR cj.user_id IS NOT NULL) AS tengo
        FROM cosmeticos c
        LEFT JOIN cosmeticos_jugador cj ON cj.cosmetico_id = c.id AND cj.user_id = $1
        ORDER BY c.exclusivo, c.creado_en DESC
        `,
        [userId]
    );
    const { rows: perfil } = await pool.query("SELECT marco_id FROM player_profiles WHERE user_id = $1", [userId]);
    return {
        fotos: rows.filter((c) => c.tipo === "foto"),
        marcos: rows.filter((c) => c.tipo === "marco"),
        marcoId: perfil[0]?.marco_id ?? null,
    };
}

export async function puedeUsar(userId, cosmeticoId, tipo) {
    const { rows } = await pool.query(
        `
        SELECT 1
        FROM cosmeticos c
        LEFT JOIN cosmeticos_jugador cj ON cj.cosmetico_id = c.id AND cj.user_id = $2
        WHERE c.id = $1 AND c.tipo = $3 AND (NOT c.exclusivo OR cj.user_id IS NOT NULL)
        `,
        [cosmeticoId, userId, tipo]
    );
    return rows.length > 0;
}

/* ¿Esa ruta es una foto subida en el panel que el jugador puede usar? */
export async function fotoPermitida(userId, ruta) {
    const { rows } = await pool.query(
        `
        SELECT 1
        FROM cosmeticos c
        LEFT JOIN cosmeticos_jugador cj ON cj.cosmetico_id = c.id AND cj.user_id = $2
        WHERE c.ruta = $1 AND c.tipo = 'foto' AND (NOT c.exclusivo OR cj.user_id IS NOT NULL)
        `,
        [ruta, userId]
    );
    return rows.length > 0;
}

export async function ponerMarco(userId, marcoId) {
    const id = marcoId === null || marcoId === "" || marcoId === undefined ? null : Number(marcoId);
    if (id !== null && !(await puedeUsar(userId, id, "marco"))) throw errorConEstado("Ese marco no lo tienes.", 403);
    await pool.query("UPDATE player_profiles SET marco_id = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2", [id, userId]);
}

/* Lo entrega (dentro de una transacción). Devuelve false si ya lo tenía. */
export async function entregarCosmetico(client, userId, cosmeticoId, origen) {
    const { rowCount } = await client.query(
        "INSERT INTO cosmeticos_jugador (user_id, cosmetico_id, origen) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [userId, cosmeticoId, origen]
    );
    return rowCount > 0;
}
