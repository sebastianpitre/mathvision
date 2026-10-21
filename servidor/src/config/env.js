/* =========================================================
   LUDOGAMIF · CONFIGURACIÓN CENTRAL
   ---------------------------------------------------------
   Este archivo se importa PRIMERO en server.js.
   Carga el .env y valida que no falte nada importante,
   así el servidor falla al arrancar con un mensaje claro
   en vez de fallar después, en medio de una partida.
========================================================= */

import dotenv from "dotenv";

dotenv.config({ quiet: true });

function fail(message) {
    console.error("");
    console.error("❌ CONFIGURACIÓN INVÁLIDA");
    console.error(`   ${message}`);
    console.error("   Revisa tu archivo .env (usa .env.example como guía).");
    console.error("");
    process.exit(1);
}

const NODE_ENV =
    process.env.NODE_ENV || "development";

const isProduction =
    NODE_ENV === "production";

/* ---------- Obligatorias ---------- */

if (!process.env.DATABASE_URL) {
    fail("Falta DATABASE_URL.");
}

if (!process.env.JWT_SECRET) {
    fail("Falta JWT_SECRET.");
}

if (
    isProduction &&
    process.env.JWT_SECRET.length < 32
) {
    fail(
        "En producción JWT_SECRET debe tener mínimo 32 caracteres. " +
        "Genera uno con: openssl rand -hex 32"
    );
}

/* ---------- Puerto ---------- */

const PORT =
    Number(process.env.PORT) || 80;

if (
    !Number.isInteger(PORT) ||
    PORT < 1 ||
    PORT > 65535
) {
    fail(`PORT inválido: "${process.env.PORT}".`);
}

/* ---------- CORS ----------
   Vacío o "*"  → cualquier origen (comportamiento original).
   Lista        → solo esos dominios, separados por coma.
*/

const rawOrigins =
    (process.env.CORS_ORIGINS || "*").trim();

const CORS_ORIGINS =
    rawOrigins === "*" || rawOrigins === ""
        ? "*"
        : rawOrigins
            .split(",")
            .map((origin) => origin.trim().replace(/\/+$/, ""))
            .filter(Boolean);

export const config = Object.freeze({
    NODE_ENV,
    isProduction,

    PORT,
    HOST: process.env.HOST || "0.0.0.0",

    CORS_ORIGINS,

    // Detrás de nginx/Cloudflare: lee la IP real del jugador.
    // Si no se indica, se activa solo en producción.
    TRUST_PROXY:
        process.env.TRUST_PROXY === undefined || process.env.TRUST_PROXY === ""
            ? isProduction
            : process.env.TRUST_PROXY === "true",

    DATABASE_URL: process.env.DATABASE_URL,
    DB_SSL: process.env.DB_SSL === "true",
    DB_POOL_MAX: Number(process.env.DB_POOL_MAX) || 10,

    JWT_SECRET: process.env.JWT_SECRET,
});
