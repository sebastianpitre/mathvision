import pg from "pg";

import { config } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool({
    connectionString: config.DATABASE_URL,

    // Conexiones simultáneas máximas.
    max: config.DB_POOL_MAX,

    // Cierra conexiones inactivas después de 30 s.
    idleTimeoutMillis: 30_000,

    // Si PostgreSQL no responde en 10 s, falla
    // en vez de dejar la petición colgada.
    connectionTimeoutMillis: 10_000,

    // Solo si tu PostgreSQL es remoto y exige SSL.
    ssl: config.DB_SSL
        ? { rejectUnauthorized: false }
        : undefined,
});

pool.on("error", (error) => {
    console.error(
        "❌ Error inesperado en PostgreSQL:",
        error.message
    );
});

export async function testDatabase() {
    const result = await pool.query(
        "SELECT NOW() AS now"
    );

    console.log(
        "🗄️ PostgreSQL conectado:",
        result.rows[0].now
    );
}

/*
 * Ejecuta varias consultas como un solo bloque: si una
 * falla, se deshacen todas (por ejemplo, cobrar un
 * personaje y entregarlo).
 */
export async function enTransaccion(trabajo) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        const resultado = await trabajo(client);
        await client.query("COMMIT");
        return resultado;
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

export async function closeDatabase() {
    await pool.end();
}
