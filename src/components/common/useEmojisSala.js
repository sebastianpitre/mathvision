import { useEffect, useRef, useState } from "react";

import { socket } from "../../services/socket";

/* El último emoji de cada jugador de la sala ({ userId: { emoji, en } }).
   Se borra solo a los pocos segundos. */
const DURACION_MS = 3000;

export function useEmojisSala() {
    const [emojis, setEmojis] = useState({});
    const timers = useRef({});

    useEffect(() => {
        const lista = timers.current;

        const alEmoji = ({ userId, emoji, en }) => {
            const id = String(userId);
            clearTimeout(lista[id]);
            setEmojis((e) => ({ ...e, [id]: { emoji, en } }));
            lista[id] = setTimeout(() => {
                setEmojis((e) => {
                    const copia = { ...e };
                    delete copia[id];
                    return copia;
                });
            }, DURACION_MS);
        };

        socket.on("sala:emoji", alEmoji);

        return () => {
            socket.off("sala:emoji", alEmoji);
            Object.values(lista).forEach(clearTimeout);
        };
    }, []);

    return emojis;
}
