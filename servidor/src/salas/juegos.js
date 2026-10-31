/* =========================================================
   JUEGOS MULTIJUGADOR DISPONIBLES EN LAS SALAS
   ---------------------------------------------------------
   Para agregar un juego nuevo: ponerlo aquí con cuántos
   jugadores admite, y manejar su inicio en salaSockets.js.
========================================================= */

export const JUEGOS_SALA = {
    triqui: {
        id: "triqui",
        nombre: "Triqui Matemático",
        descripcion: "Resuelve y gana el tablero.",
        min: 2,
        max: 2,
        ruta: "/games/triqui",
    },
    siglo: {
        id: "siglo",
        nombre: "SigloGamif",
        descripcion: "Suma 100 en 5 tiros sin pasarte.",
        min: 2,
        max: 8,
        ruta: "/games/siglo",
    },
    invasion: {
        id: "invasion",
        nombre: "InvasiónGamif",
        descripcion: "Responde rápido y pinta el tablero con tu color.",
        min: 2,
        max: 6,
        ruta: "/games/invasion",
    },
    zona: {
        id: "zona",
        nombre: "ZonaGamif",
        descripcion: "Carrera con 2 fichas: llega a la meta sin quedarte fuera de la zona.",
        min: 2,
        max: 6,
        ruta: "/games/zona",
    },
};

export const MAX_JUGADORES_SALA = 8;

/*
 * Emojis que se pueden enviar en la sala y en los juegos
 * (la misma lista que muestra el navegador). Solo se
 * reenvían los que están aquí.
 */
export const EMOJIS = [
    "🫏", "😂", "🤣", "⌛", "😎", "😏", "🤔", "😱", "😡", "😭",
    "😈", "🥳", "🔥", "👏", "💪", "👍", "👎", "❤️", "🎉", "🏆",
    "⚡", "🧠", "👀", "🤝", "😮", "🙌", "😅", "😜", "💯", "🚀",
];

// Tiempo mínimo entre dos emojis de la misma persona.
export const PAUSA_EMOJI_MS = 700;

/*
 * ¿Se puede iniciar este juego con esta cantidad de jugadores?
 * Devuelve null si sí, o el motivo en español si no.
 */
export function motivoNoIniciar(juegoId, cantidad) {
    const juego = JUEGOS_SALA[juegoId];

    if (!juego) return "Elige un juego para la sala.";

    if (cantidad < juego.min) {
        const faltan = juego.min - cantidad;
        return `Falta${faltan === 1 ? "" : "n"} ${faltan} jugador${faltan === 1 ? "" : "es"} para ${juego.nombre}.`;
    }

    if (cantidad > juego.max) {
        return juego.min === juego.max
            ? `${juego.nombre} es solo para ${juego.max} jugadores.`
            : `${juego.nombre} admite máximo ${juego.max} jugadores.`;
    }

    return null;
}
