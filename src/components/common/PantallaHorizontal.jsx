import { useCallback, useEffect, useState } from "react";

import "./pantallaHorizontal.css";

/* =========================================================
   TELÉFONOS Y TABLETS: HORIZONTAL Y PANTALLA COMPLETA
   ---------------------------------------------------------
   En pantallas táctiles el juego solo se usa:
     1. con el teléfono en horizontal, y
     2. en pantalla completa (si el navegador lo permite).

   Mientras no se cumpla, un aviso tapa el juego. El juego
   NO se desmonta debajo: si alguien gira el teléfono a mitad
   de partida, no pierde nada.

   iPhone (Safari) no permite pantalla completa desde una
   página: ahí solo se exige el horizontal y se explica cómo
   agregarlo a la pantalla de inicio (abre como app, sin barras).
   Si se abre como app instalada, ya está en pantalla completa.
========================================================= */

const consulta = (q) => typeof window !== "undefined" && window.matchMedia(q).matches;

function esTactil() {
    return consulta("(pointer: coarse)") && !consulta("(pointer: fine)");
}

function esVertical() {
    return consulta("(orientation: portrait)");
}

function enPantallaCompleta() {
    return Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        consulta("(display-mode: fullscreen)") ||
        consulta("(display-mode: standalone)") ||
        window.navigator.standalone
    );
}

function puedePantallaCompleta() {
    const el = document.documentElement;
    return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

function esIOS() {
    return /iPhone|iPod/.test(navigator.userAgent);
}

async function entrarPantallaCompleta() {
    const el = document.documentElement;

    try {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch {
        // El navegador lo rechazó: el aviso sigue visible.
    }

    // En Android, además, gira el juego solo.
    try {
        await window.screen?.orientation?.lock?.("landscape");
    } catch {
        // No todos los navegadores lo permiten.
    }
}

function leerEstado() {
    const tactil = esTactil();

    return {
        tactil,
        vertical: tactil && esVertical(),
        completa: !tactil || enPantallaCompleta() || !puedePantallaCompleta(),
    };
}

export default function PantallaHorizontal({ children }) {
    const [estado, setEstado] = useState(leerEstado);

    const actualizar = useCallback(() => setEstado(leerEstado()), []);

    useEffect(() => {
        const eventos = ["resize", "orientationchange", "fullscreenchange", "webkitfullscreenchange"];
        eventos.forEach((e) => (e.includes("fullscreen") ? document : window).addEventListener(e, actualizar));
        window.screen?.orientation?.addEventListener?.("change", actualizar);

        return () => {
            eventos.forEach((e) => (e.includes("fullscreen") ? document : window).removeEventListener(e, actualizar));
            window.screen?.orientation?.removeEventListener?.("change", actualizar);
        };
    }, [actualizar]);

    let aviso = null;

    if (estado.vertical) {
        aviso = (
            <>
                <div className="ph-telefono" aria-hidden="true">
                    <span className="ph-telefono-pantalla" />
                </div>
                <h1>Gira tu teléfono</h1>
                <p>LudoGamif se juega con el teléfono en horizontal.</p>
                {puedePantallaCompleta() && (
                    <button type="button" className="ph-boton" onClick={entrarPantallaCompleta}>
                        Pantalla completa y girar
                    </button>
                )}
                {esIOS() && !enPantallaCompleta() && (
                    <p className="ph-nota">
                        Para jugar sin barras: toca <strong>Compartir</strong> → <strong>Agregar a inicio</strong>{" "}
                        y abre LudoGamif desde ahí.
                    </p>
                )}
            </>
        );
    } else if (!estado.completa) {
        aviso = (
            <>
                <div className="ph-icono-completa" aria-hidden="true">⛶</div>
                <h1>Juega en pantalla completa</h1>
                <p>Así ves todo el juego sin las barras del navegador.</p>
                <button type="button" className="ph-boton" onClick={entrarPantallaCompleta} autoFocus>
                    Entrar a pantalla completa
                </button>
            </>
        );
    }

    return (
        <>
            {children}
            {aviso && (
                <div className="ph-aviso" role="dialog" aria-modal="true" aria-live="polite">
                    <div className="ph-caja">{aviso}</div>
                </div>
            )}
        </>
    );
}
