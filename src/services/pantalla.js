/* =========================================================
   PANTALLA COMPLETA Y DISPOSITIVO
   Lo usan el menú flotante y el aviso de girar el teléfono.
========================================================= */

const consulta = (q) => typeof window !== "undefined" && window.matchMedia(q).matches;

export function esTactil() {
    return consulta("(pointer: coarse)") && !consulta("(pointer: fine)");
}

export function esVertical() {
    return consulta("(orientation: portrait)");
}

export function enPantallaCompleta() {
    return Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        consulta("(display-mode: fullscreen)") ||
        consulta("(display-mode: standalone)") ||
        window.navigator.standalone
    );
}

// Abierto desde la pantalla de inicio (como app): no hay botón para salir.
export function abiertoComoApp() {
    return Boolean(consulta("(display-mode: standalone)") || window.navigator.standalone);
}

export function puedePantallaCompleta() {
    const el = document.documentElement;
    return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function esIOS() {
    // El iPad se presenta como Mac, pero tiene pantalla táctil.
    return /iPhone|iPod|iPad/.test(navigator.userAgent) ||
        (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

/* Devuelve true si quedó en pantalla completa. */
export async function entrarPantallaCompleta() {
    const el = document.documentElement;

    try {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch {
        // El navegador lo rechazó.
    }

    // En Android, además, gira el juego solo.
    try {
        await window.screen?.orientation?.lock?.("landscape");
    } catch {
        // No todos los navegadores lo permiten.
    }

    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

export async function salirPantallaCompleta() {
    try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch {
        // Ya no estaba en pantalla completa.
    }
}
