// ============================================================
// LUDOGAMIF · A QUÉ SERVIDOR SE CONECTA EL JUEGO
// ------------------------------------------------------------
// El juego y la API se sirven desde el MISMO dominio
// (https://ludogamif.ocloudev.lat y .../api), así que por
// defecto no hace falta configurar nada.
//
// Solo si quieres apuntar a otro servidor, define
// VITE_SERVER_URL (por ejemplo en .env.local):
//   VITE_SERVER_URL=https://otro-servidor.com
//
// En desarrollo (npm run dev) Vite reenvía /api y /socket.io
// al servidor local (ver vite.config.js).
// ============================================================

export const SERVER_URL = (import.meta.env.VITE_SERVER_URL || "").replace(/\/+$/, "");

// Para fetch (login, registro, perfil, partidas...)
export const API_URL = `${SERVER_URL}/api`;
