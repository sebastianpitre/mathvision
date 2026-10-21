/* =========================================================
   LUDOGAMIF · DIAGNÓSTICO RÁPIDO
   ---------------------------------------------------------
   Uso:  npm run check

   Revisa que el .env esté bien y que PostgreSQL responda,
   SIN levantar el servidor. Úsalo antes de arrancar.
========================================================= */

import { config } from "../src/config/env.js";
import { pool, closeDatabase } from "../src/database/db.js";

const required = [
    "users",
    "player_profiles",
    "player_stats",
    "player_settings",
    "characters",
    "niveles_juego",
    "preguntas",
    "partidas",
    "personajes_jugador",
];

console.log("");
console.log("🔎 LudoGamif · diagnóstico");
console.log(`   Entorno : ${config.NODE_ENV}`);
console.log(`   Host    : ${config.HOST}`);
console.log(`   Puerto  : ${config.PORT}`);
console.log(
    `   CORS    : ${
        Array.isArray(config.CORS_ORIGINS)
            ? config.CORS_ORIGINS.join(", ")
            : "*"
    }`
);
console.log(`   JWT     : ${config.JWT_SECRET.length} caracteres`);

let ok = true;

try {
    const { rows } = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
    `);

    const existing = new Set(rows.map((r) => r.table_name));
    const missing = required.filter((t) => !existing.has(t));

    console.log("   DB      : ✅ conectada");

    if (missing.length > 0) {
        ok = false;
        console.log(`   Tablas  : ❌ faltan ${missing.join(", ")}`);
        console.log("             Ejecuta: npm run migrar");
    } else {
        console.log("   Tablas  : ✅ completas");
    }
} catch (error) {
    ok = false;
    console.log(`   DB      : ❌ ${error.message}`);
}

await closeDatabase().catch(() => {});

console.log("");
console.log(ok ? "✅ Todo listo para arrancar." : "⚠️  Corrige lo anterior antes de arrancar.");
console.log("");

process.exit(ok ? 0 : 1);
