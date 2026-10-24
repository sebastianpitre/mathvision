import { useEffect } from "react";

import { socket } from "../../services/socket";
import { reproducir, estaSilenciadoJugador } from "../../services/voz";
import { avisar } from "../../services/avisos";

/* Hace sonar las voces de la sala en cualquier pantalla (sala,
   SigloGamif, Triqui) y muestra los avisos de la voz. */
export default function VozGlobal() {
    useEffect(() => {
        const alAudio = ({ userId, pcm, rate }) => {
            if (!estaSilenciadoJugador(userId)) reproducir(pcm, rate);
        };
        const alError = ({ message }) => avisar(message, "error", 2600);

        socket.on("voz:audio", alAudio);
        socket.on("voz:error", alError);
        return () => {
            socket.off("voz:audio", alAudio);
            socket.off("voz:error", alError);
        };
    }, []);

    return null;
}
