// ============================================================
// LUDOGAMIF · A QUÉ SERVIDOR SE CONECTA EL JUEGO
// ============================================================

// true  = usa el servidor de tu PC (http://localhost)
// false = usa el servidor de la nube
const USE_LOCAL_SERVER = false;

export const SERVER_URL =
    USE_LOCAL_SERVER
        ? `http://${window.location.hostname}`   // tu PC, puerto 80
        : "https://ludogamif-api.ocloudev.lat";  // VPS Contabo

// Para fetch (login, registro, perfil...)
export const API_URL =
    `${SERVER_URL}/api`;