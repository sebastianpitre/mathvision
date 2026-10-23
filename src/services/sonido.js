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
