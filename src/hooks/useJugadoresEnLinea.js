import { useCallback, useEffect, useState } from "react";

import { socket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   JUGADORES CONECTADOS (sin contarme a mí)
   El servidor manda la lista cada vez que alguien entra,
   sale, entra a una sala o empieza a jugar. "actualizar"
   la pide de nuevo a mano.
   Estado de cada uno: "available" | "sala" | "playing".
========================================================= */

export const ESTADOS = {
    available: { texto: "Disponible", tono: "libre" },
    sala: { texto: "En una sala", tono: "sala" },
    playing: { texto: "Jugando", tono: "jugando" },
};

export function useJugadoresEnLinea() {
    const { user } = useAuth();
    const miId = String(user?.id ?? "");
    const [jugadores, setJugadores] = useState([]);
    const [actualizando, setActualizando] = useState(false);

    useEffect(() => {
        const alLista = ({ players = [] } = {}) => {
            setActualizando(false);
            setJugadores(players.filter((p) => String(p.id) !== miId));
        };

        socket.on("world:players", alLista);
        if (socket.connected) socket.emit("world:getPlayers");

        return () => socket.off("world:players", alLista);
    }, [miId]);

    const actualizar = useCallback(() => {
        setActualizando(true);
        socket.emit("world:getPlayers");
        setTimeout(() => setActualizando(false), 1500);
    }, []);

    return { jugadores, actualizar, actualizando };
}
