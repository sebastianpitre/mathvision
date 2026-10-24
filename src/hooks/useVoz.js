import { useCallback, useEffect, useState } from "react";

import { socket } from "../services/socket";
import { alCambiarSilenciados, estaSilenciadoJugador } from "../services/voz";

/* =========================================================
   ESTADO DE LA VOZ EN MI SALA
   info: { puede, motivo, segundos, espera }
   hablando: { userId, nombre, hasta } | null
========================================================= */

export function useVoz() {
    const [info, setInfo] = useState(null);
    const [hablando, setHablando] = useState(null);
    const [desfase, setDesfase] = useState(0);

    useEffect(() => {
        const pedir = () => socket.emit("voz:info");
        const alInfo = (i) => setInfo(i);
        const alEstado = ({ hablando: h, ahora }) => {
            setHablando(h);
            if (ahora) setDesfase(ahora - Date.now());
        };

        socket.on("connect", pedir);
        socket.on("voz:info", alInfo);
        socket.on("voz:estado", alEstado);
        if (socket.connected) pedir();

        // El permiso puede cambiar (reportes, panel): se revisa cada rato.
        const t = setInterval(pedir, 30_000);

        return () => {
            socket.off("connect", pedir);
            socket.off("voz:info", alInfo);
            socket.off("voz:estado", alEstado);
            clearInterval(t);
        };
    }, []);

    return { info, hablando, desfase };
}

/* Jugadores que silencié (se actualiza al cambiar). */
export function useSilenciados() {
    const [, setVersion] = useState(0);
    useEffect(() => alCambiarSilenciados(() => setVersion((v) => v + 1)), []);
    return useCallback((userId) => estaSilenciadoJugador(userId), []);
}
