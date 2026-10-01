// ============================================================
// LUDOGAMIF · A QUÉ SERVIDOR SE CONECTA EL JUEGO
// ------------------------------------------------------------
// Se configura con la variable VITE_SERVER_URL:
//   • En tu PC  → archivo .env.local
//   • En Vercel → Settings → Environment Variables
// ============================================================

export const SERVER_URL =
    (
        import.meta.env.VITE_SERVER_URL ||
        "https://ludogamif-api.ocloudev.lat"
    ).replace(/\/+$/, "");   // quita "/" final si alguien lo pone

// Para fetch (login, registro, perfil...)
export const API_URL =
    `${SERVER_URL}/api`;

// Para Socket.IO se usa SERVER_URL (sin /api)