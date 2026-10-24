/* =========================================================
   SONIDOS Y MÚSICA DEL JUEGO
   ---------------------------------------------------------
   El administrador elige en el panel qué sonido suena en cada
   momento (clic, ganar, música del lobby…). Aquí se piden esos
   ajustes al servidor y se reproducen.

   sonar("ganar")          efecto de un momento
   ponerMusica("triqui")   música de esa pantalla (o la del lobby)
   bajarMusica(true)       baja la música (alguien habla por voz)
   cambiarMusica()         apagar o prender solo la música
========================================================= */

import { alCambiarSilencio, estaSilenciado } from "./sonido";

const CLAVE_SIN_MUSICA = "ludogamif:sin-musica";

let momentos = null;
let pidiendo = null;
const oyentes = new Set();

const leerSinMusica = () => {
    try {
        return localStorage.getItem(CLAVE_SIN_MUSICA) === "1";
    } catch {
        return false;
    }
};

let sinMusica = leerSinMusica();

/* ---------------- Ajustes del servidor ---------------- */

export function cargarSonidos({ forzar = false } = {}) {
    if (pidiendo && !forzar) return pidiendo;
    pidiendo = fetch("/api/sonidos")
        .then((r) => (r.ok ? r.json() : null))
        .then((datos) => {
            if (datos?.momentos) {
                momentos = datos.momentos;
                actualizarMusica();
                oyentes.forEach((fn) => fn());
            }
        })
        .catch(() => {
            pidiendo = null; // se intenta otra vez la próxima
        });
    return pidiendo;
}

/* ---------------- Efectos ---------------- */

const limitar = (v) => Math.max(0, Math.min(1, v));

export function sonar(clave, factor = 1) {
    if (estaSilenciado()) return null;
    const m = momentos?.[clave];
    if (!m?.ruta) {
        if (!momentos) cargarSonidos();
        return null;
    }
    const audio = new Audio(m.ruta);
    audio.volume = limitar((m.volumen / 100) * factor);
    audio.play().catch(() => {});
    return audio;
}

/* ---------------- Música ---------------- */

let pantalla = null; // "lobby", "triqui", "siglo"…
let musica = null; // <audio> que suena
let bajada = false;

function rutaMusica() {
    if (!momentos || !pantalla) return null;
    const propia = momentos[`musica_${pantalla}`];
    if (propia?.ruta) return propia;
    // Si el juego no tiene música propia, sigue la del lobby.
    return pantalla === "ninguna" ? null : momentos.musica_lobby?.ruta ? momentos.musica_lobby : null;
}

function actualizarMusica() {
    const elegida = rutaMusica();

    if (!elegida || sinMusica || estaSilenciado()) {
        musica?.pause();
        if (!elegida && musica) musica = null;
        return;
    }

    if (!musica || musica.dataset.ruta !== elegida.ruta) {
        musica?.pause();
        musica = new Audio(elegida.ruta);
        musica.dataset.ruta = elegida.ruta;
        musica.loop = true;
        musica.preload = "auto";
    }

    musica.muted = false;
    musica.volume = limitar((elegida.volumen / 100) * (bajada ? 0.25 : 1));
    if (musica.paused) musica.play().catch(() => {});
}

export function ponerMusica(nombre) {
    if (pantalla === nombre) return;
    pantalla = nombre;
    if (!momentos) cargarSonidos();
    actualizarMusica();
}

export function bajarMusica(valor) {
    if (bajada === Boolean(valor)) return;
    bajada = Boolean(valor);
    actualizarMusica();
}

export function hayMusicaApagada() {
    return sinMusica;
}

export function cambiarMusica(valor = !sinMusica) {
    sinMusica = Boolean(valor);
    try {
        localStorage.setItem(CLAVE_SIN_MUSICA, sinMusica ? "1" : "0");
    } catch {
        // Sin almacenamiento: vale mientras la página esté abierta.
    }
    actualizarMusica();
    oyentes.forEach((fn) => fn());
    return sinMusica;
}

export function alCambiarSonidos(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
}

/* ---------------- Arranque ---------------- */

if (typeof window !== "undefined") {
    // El navegador no deja sonar música hasta que se toca la pantalla.
    const reintentar = () => {
        if (musica?.paused) actualizarMusica();
    };
    window.addEventListener("pointerdown", reintentar, true);
    window.addEventListener("keydown", reintentar, true);

    // Clic de todos los botones del juego.
    window.addEventListener(
        "click",
        (e) => {
            const el = e.target instanceof Element ? e.target.closest("button, a[href], [role='button'], summary") : null;
            if (!el || el.disabled || el.closest("[data-sin-clic]")) return;
            sonar("clic");
        },
        true
    );

    alCambiarSilencio(() => actualizarMusica());
    // Al volver a la pestaña se revisan los cambios del panel.
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") cargarSonidos({ forzar: true });
    });

    cargarSonidos();
}
