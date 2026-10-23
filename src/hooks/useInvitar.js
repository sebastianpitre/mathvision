import { useCallback, useEffect, useState } from "react";

import { socket } from "../services/socket";

/* =========================================================
   INVITAR A LA SALA
   Se puede invitar a la misma persona las veces que se
   quiera; entre una y otra hay una espera corta (la decide
   el servidor). Mientras tanto el botón muestra los segundos.
========================================================= */

export function useInvitar() {
    // userId → momento (ms) en que se puede volver a invitar
    const [esperas, setEsperas] = useState({});
    const [ahora, setAhora] = useState(Date.now());

    useEffect(() => {
        const alEnviar = ({ targetPlayerId, otraVezEn }) => {
            if (targetPlayerId == null) return;
            setEsperas((e) => ({ ...e, [String(targetPlayerId)]: otraVezEn || Date.now() + 10_000 }));
        };

        // No se pudo: se puede intentar otra vez (o cuando diga el servidor).
        const alError = ({ targetPlayerId, otraVezEn }) => {
            if (targetPlayerId == null) return;
            setEsperas((e) => ({ ...e, [String(targetPlayerId)]: otraVezEn || 0 }));
        };

        socket.on("world:inviteSent", alEnviar);
        socket.on("world:error", alError);

        return () => {
            socket.off("world:inviteSent", alEnviar);
            socket.off("world:error", alError);
        };
    }, []);

    // Reloj para la cuenta regresiva (solo mientras hay esperas).
    const hayEsperas = Object.values(esperas).some((t) => t > ahora);
    useEffect(() => {
        if (!hayEsperas) return;
        const t = setInterval(() => setAhora(Date.now()), 500);
        return () => clearInterval(t);
    }, [hayEsperas]);

    const invitar = useCallback((jugador) => {
        if (!jugador) return;
        // Mientras llega la respuesta, el botón queda en espera.
        setEsperas((e) => ({ ...e, [String(jugador.id)]: Infinity }));
        socket.emit("world:invite", { targetPlayerId: jugador.id });
        setTimeout(() => {
            setEsperas((e) => (e[String(jugador.id)] === Infinity ? { ...e, [String(jugador.id)]: 0 } : e));
        }, 5000);
    }, []);

    /* Segundos que faltan para poder invitar otra vez (0 = ya se puede). */
    const espera = useCallback(
        (id) => {
            const t = esperas[String(id)] || 0;
            if (t === Infinity) return -1; // enviando…
            return Math.max(0, Math.ceil((t - ahora) / 1000));
        },
        [esperas, ahora]
    );

    return { invitar, espera };
}
