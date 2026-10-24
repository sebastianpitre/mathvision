import { sonar } from "../../../services/sonidos";

/* Evento del juego → momento del panel (Panel → Sonidos).
   El clic de los botones ya suena en todo el juego. */
const momentos = {
    click: null,
    correct: "correcto",
    incorrect: "incorrecto",
    unlock: "desbloquear",
    victory: "ganar",
    gameOver: "perder",
    warning: "tiempo",
};

export function playSound(name, volume = 0.6) {
    const momento = momentos[name];
    return momento ? sonar(momento, Math.min(1, volume / 0.7)) : null;
}
