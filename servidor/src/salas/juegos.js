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
        descripcion: "Resuelve la operación y conquista el tablero.",
        min: 2,
        max: 2,
        ruta: "/games/triqui",
    },
    siglo: {
        id: "siglo",
        nombre: "SigloGamif",
        descripcion: "Tira el dado y llena 5 espacios hasta sumar 100. ¡Sin pasarte!",
        min: 2,
        max: 8,
        ruta: "/games/siglo",
    },
};

export const MAX_JUGADORES_SALA = 8;

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
