/* =========================================================
   SONIDO GENERAL (silenciar todo el juego)
   El menú flotante lo activa o lo quita. Afecta a todos los
   sonidos y la música de todos los juegos, sin tocar cada
   juego: al reproducir cualquier audio se revisa este ajuste.
========================================================= */

const CLAVE = "ludogamif:silencio";
const sonando = new Set();
const oyentes = new Set();

function leer() {
    try {
        return localStorage.getItem(CLAVE) === "1";
    } catch {
        return false;
    }
}

let silencio = leer();

if (typeof HTMLMediaElement !== "undefined" && !HTMLMediaElement.prototype.__ludoSonido) {
    const reproducir = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.__ludoSonido = true;

    HTMLMediaElement.prototype.play = function (...args) {
        // En segundo plano (otra app, pestaña oculta, Chrome cerrado) no suena nada.
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return Promise.resolve();
        if (silencio) this.muted = true;
        sonando.add(this);
        this.addEventListener("ended", () => sonando.delete(this), { once: true });
        return reproducir.apply(this, args);
    };
}

export function estaSilenciado() {
    return silencio;
}

export function cambiarSilencio(valor = !silencio) {
    silencio = Boolean(valor);
    try {
        localStorage.setItem(CLAVE, silencio ? "1" : "0");
    } catch {
        // Sin almacenamiento: vale mientras la página esté abierta.
    }
    for (const audio of sonando) audio.muted = silencio;
    oyentes.forEach((fn) => fn(silencio));
    return silencio;
}

export function alCambiarSilencio(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
}

/* ---------------- Segundo plano ----------------
   Al salir de la app (otra app, bloquear el teléfono, cerrar el
   navegador) se pausa todo lo que suena y se suspende el audio de
   las voces. Al volver, la música vuelve sola (sonidos.js). */
const contextos = new Set();
export function registrarContextoAudio(c) {
    if (c) contextos.add(c);
}

if (typeof document !== "undefined") {
    const alCambiar = () => {
        const oculto = document.visibilityState === "hidden";
        if (oculto) {
            for (const audio of sonando) {
                try {
                    audio.pause();
                } catch {
                    // ya no existe
                }
            }
            sonando.clear();
        }
        for (const c of contextos) {
            try {
                if (oculto && c.state === "running") c.suspend();
                else if (!oculto && c.state === "suspended") c.resume();
            } catch {
                // contexto cerrado
            }
        }
    };
    document.addEventListener("visibilitychange", alCambiar);
    window.addEventListener("pagehide", () => {
        for (const audio of sonando) audio.pause?.();
        for (const c of contextos) c.suspend?.().catch?.(() => {});
    });
}
