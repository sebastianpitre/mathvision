import { useEffect, useRef, useState } from "react";
import { LuSmile } from "react-icons/lu";

import { socket } from "../../services/socket";
import { EMOJIS } from "../../data/emojis";

import "./emojis.css";

/* =========================================================
   EMOJIS DE LA SALA
   ---------------------------------------------------------
   · <SelectorEmojis />: botón que abre la lista y envía el
     emoji a todos los de la sala ("sala:emoji").
   · <BurbujaEmoji />: el emoji que flota y se desvanece.
   · useEmojisSala() (useEmojisSala.js): el último emoji de
     cada jugador. Cada pantalla decide dónde mostrarlo.
========================================================= */

const PAUSA_MS = 700;

/* El emoji que flota (la clave reinicia la animación con cada envío). */
export function BurbujaEmoji({ dato, className = "" }) {
    if (!dato) return null;
    return (
        <span key={dato.en} className={`em-burbuja ${className}`} aria-hidden="true">
            {dato.emoji}
        </span>
    );
}

export function SelectorEmojis({ arriba = false, className = "" }) {
    const [abierto, setAbierto] = useState(false);
    const [esperando, setEsperando] = useState(false);
    const caja = useRef(null);

    // Se cierra al tocar fuera o con Escape.
    useEffect(() => {
        if (!abierto) return;
        const fuera = (e) => {
            if (caja.current && !caja.current.contains(e.target)) setAbierto(false);
        };
        const tecla = (e) => e.key === "Escape" && setAbierto(false);
        document.addEventListener("pointerdown", fuera);
        document.addEventListener("keydown", tecla);
        return () => {
            document.removeEventListener("pointerdown", fuera);
            document.removeEventListener("keydown", tecla);
        };
    }, [abierto]);

    const enviar = (emoji) => {
        if (esperando) return;
        socket.emit("sala:emoji", { emoji });
        setAbierto(false);
        setEsperando(true);
        setTimeout(() => setEsperando(false), PAUSA_MS);
    };

    return (
        <div className={`em-selector ${className}`} ref={caja}>
            <button
                type="button"
                className="em-boton"
                onClick={() => setAbierto((a) => !a)}
                aria-expanded={abierto}
                aria-label="Enviar emoji"
                title="Emojis"
            >
                <LuSmile aria-hidden="true" />
            </button>

            {abierto && (
                <div className={`em-panel ${arriba ? "em-panel-arriba" : ""}`} role="menu" aria-label="Emojis">
                    {EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            role="menuitem"
                            className="em-opcion"
                            disabled={esperando}
                            onClick={() => enviar(emoji)}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
