/* =========================================================
   LUDOGAMIF · MIGRACIONES DE LA BASE DE DATOS
   ---------------------------------------------------------
   Uso:  npm run migrar        (el script ludogamif.sh lo
                                corre al instalar y actualizar)

   Aplica, en orden, los pasos de src/database/migraciones:
     001_algo.sql   → SQL
     003_algo.js    → JavaScript (export default async (client) => {})

   Cada paso se anota en la tabla schema_migraciones y no se
   vuelve a correr. Además, todos los pasos están escritos
   para poder correrse dos veces sin romper nada.
========================================================= */

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

import { pool, closeDatabase } from "../src/database/db.js";

const carpeta = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../src/database/migraciones"
);

async function main() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migraciones (
            version VARCHAR(200) PRIMARY KEY,
            aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const { rows } = await pool.query("SELECT version FROM schema_migraciones");
    const aplicadas = new Set(rows.map((fila) => fila.version));

    const archivos = (await readdir(carpeta))
        .filter((nombre) => /^\d{3}_.+\.(sql|js)$/.test(nombre))
        .sort();

    let nuevas = 0;

    for (const archivo of archivos) {
        if (aplicadas.has(archivo)) continue;

        console.log(`   → ${archivo}`);

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            if (archivo.endsWith(".sql")) {
                await client.query(await readFile(path.join(carpeta, archivo), "utf8"));
            } else {
                const modulo = await import(pathToFileURL(path.join(carpeta, archivo)).href);
                await modulo.default(client);
            }

            await client.query(
                "INSERT INTO schema_migraciones (version) VALUES ($1)",
                [archivo]
            );

            await client.query("COMMIT");
            nuevas += 1;
        } catch (error) {
            await client.query("ROLLBACK").catch(() => {});
            throw new Error(`Falló ${archivo}: ${error.message}`);
        } finally {
            client.release();
        }
    }

    console.log(
        nuevas === 0
            ? "✅ La base de datos ya estaba al día."
            : `✅ Base de datos al día (${nuevas} paso(s) nuevo(s)).`
    );
}

try {
    console.log("🗄️  Revisando migraciones...");
    await main();
    await closeDatabase();
    process.exit(0);
} catch (error) {
    console.error("❌ No se pudo actualizar la base de datos:");
    console.error(`   ${error.message}`);
    await closeDatabase().catch(() => {});
    process.exit(1);
}
