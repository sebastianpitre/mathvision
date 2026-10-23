import { useCallback, useEffect, useState } from "react";

import "./pantallaHorizontal.css";

/* =========================================================
   TELÉFONOS Y TABLETS: HORIZONTAL Y PANTALLA COMPLETA
   ---------------------------------------------------------
   En pantallas táctiles:
     1. El horizontal SÍ se exige: mientras el teléfono esté en
        vertical, un aviso tapa el juego.
     2. La pantalla completa solo se RECOMIENDA, una vez por
        visita. Muchos navegadores no la permiten (iPhone,
        algunos iPad, el navegador interno de WhatsApp o
        Instagram...), así que siempre se puede seguir sin ella.
        Si se toca "Entrar a pantalla completa" y el navegador
        no responde, igual deja pasar.

   El juego NO se desmonta debajo del aviso: si alguien gira
   el teléfono a mitad de partida, no pierde nada.

   En iPhone y iPad se explica cómo agregarlo a la pantalla de
   inicio (abre como app, sin barras). Si se abre así, ya está
   en pantalla completa y no se muestra la recomendación.
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
    // El iPad se presenta como Mac, pero tiene pantalla táctil.
    return /iPhone|iPod|iPad/.test(navigator.userAgent) ||
        (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

/* La recomendación se muestra una sola vez por visita
   (sobrevive a recargar la página, no a cerrar la pestaña). */
const CLAVE_VISTA = "ludogamif:pantallaCompletaVista";

function recomendacionVista() {
    try {
        return sessionStorage.getItem(CLAVE_VISTA) === "1";
    } catch {
        return false;
    }
}

function marcarRecomendacionVista() {
    try {
        sessionStorage.setItem(CLAVE_VISTA, "1");
    } catch {
        // Navegación privada sin almacenamiento: vale para esta pantalla.
    }
}

async function entrarPantallaCompleta() {
    const el = document.documentElement;

    try {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch {
        // El navegador lo rechazó: se sigue sin pantalla completa.
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
        completa: !tactil || enPantallaCompleta(),
    };
}

export default function PantallaHorizontal({ children }) {
    const [estado, setEstado] = useState(leerEstado);
    const [vista, setVista] = useState(recomendacionVista);

    const actualizar = useCallback(() => setEstado(leerEstado()), []);

    // Pase lo que pase con la pantalla completa, no se vuelve a pedir.
    const continuar = useCallback(() => {
        marcarRecomendacionVista();
        setVista(true);
    }, []);

    const pedirPantallaCompleta = useCallback(async () => {
        continuar();
        await entrarPantallaCompleta();
    }, [continuar]);

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
                {puedePantallaCompleta() && !vista && (
                    <button type="button" className="ph-boton" onClick={pedirPantallaCompleta}>
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
    } else if (!estado.completa && !vista) {
        const puede = puedePantallaCompleta();

        aviso = (
            <>
                <div className="ph-icono-completa" aria-hidden="true">⛶</div>
                <h1>Te recomendamos pantalla completa</h1>
                <p>Así ves todo el juego sin las barras del navegador.</p>
                {puede && (
                    <button type="button" className="ph-boton" onClick={pedirPantallaCompleta} autoFocus>
                        Entrar a pantalla completa
                    </button>
                )}
                {esIOS() && (
                    <p className="ph-nota">
                        En iPhone y iPad: toca <strong>Compartir</strong> → <strong>Agregar a inicio</strong>{" "}
                        y abre LudoGamif desde ahí.
                    </p>
                )}
                <button
                    type="button"
                    className={puede ? "ph-boton ph-boton-secundario" : "ph-boton"}
                    onClick={continuar}
                    autoFocus={!puede}
                >
                    Continuar así
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
