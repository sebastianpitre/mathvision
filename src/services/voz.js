/* =========================================================
   VOZ (walkie-talkie) · MICRÓFONO Y PARLANTE
   ---------------------------------------------------------
   · Mientras se mantiene el botón, el micrófono se lee en
     pedacitos (~0.25 s), se pasa a 16 kHz y se envía.
   · Lo que llega de otros se pone en fila y suena seguido.
   · Cada jugador puede silenciar a otros (solo para él).
   · El sonido general apagado (menú flotante) también
     silencia las voces.
========================================================= */

import { estaSilenciado } from "./sonido";

export const TASA = 16000;

let contexto = null;
function ctx() {
    if (!contexto) {
        const Clase = window.AudioContext || window.webkitAudioContext;
        if (!Clase) return null;
        contexto = new Clase();
    }
    return contexto;
}

/* iPhone y algunos navegadores solo dejan sonar audio después
   de que la persona toca la pantalla. */
export function desbloquearAudio() {
    const c = ctx();
    if (c && c.state === "suspended") c.resume().catch(() => {});
}

if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", desbloquearAudio, { passive: true });
    document.addEventListener("keydown", desbloquearAudio);
}

/* ---------------- Micrófono ---------------- */

let flujo = null;
let fuente = null;
let nodo = null;

function aPcm16(datos, tasaEntrada) {
    const razon = tasaEntrada / TASA;
    const largo = Math.floor(datos.length / razon);
    const salida = new Int16Array(largo);

    for (let i = 0; i < largo; i += 1) {
        // Promedio de las muestras que caen en cada muestra de salida.
        const desde = Math.floor(i * razon);
        const hasta = Math.min(datos.length, Math.floor((i + 1) * razon));
        let suma = 0;
        for (let j = desde; j < hasta; j += 1) suma += datos[j];
        const v = Math.max(-1, Math.min(1, suma / Math.max(1, hasta - desde)));
        salida[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }

    return salida.buffer;
}

export function micDisponible() {
    return Boolean(navigator.mediaDevices?.getUserMedia && ctx());
}

/* Empieza a escuchar el micrófono; enviar(pcm) recibe cada pedacito. */
export async function empezarCaptura(enviar) {
    pararCaptura();
    const c = ctx();
    if (!c) throw new Error("Este navegador no permite usar el micrófono.");
    await c.resume().catch(() => {});

    try {
        flujo = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
    } catch {
        throw new Error("Permite el micrófono en el navegador para poder hablar.");
    }

    fuente = c.createMediaStreamSource(flujo);
    nodo = c.createScriptProcessor(4096, 1, 1);
    nodo.onaudioprocess = (e) => enviar(aPcm16(e.inputBuffer.getChannelData(0), c.sampleRate));
    fuente.connect(nodo);
    // Hay que conectarlo para que procese; no suena porque no escribe nada.
    nodo.connect(c.destination);
}

export function pararCaptura() {
    try {
        nodo?.disconnect();
        fuente?.disconnect();
    } catch {
        // Ya estaba desconectado.
    }
    flujo?.getTracks().forEach((t) => t.stop());
    flujo = fuente = nodo = null;
}

/* ---------------- Parlante ---------------- */

let siguiente = 0;

export function reproducir(pcm, tasa = TASA) {
    const c = ctx();
    if (!c || c.state !== "running" || estaSilenciado()) return;

    const muestras = new Int16Array(pcm);
    if (!muestras.length) return;

    const buffer = c.createBuffer(1, muestras.length, tasa);
    const canal = buffer.getChannelData(0);
    for (let i = 0; i < muestras.length; i += 1) canal[i] = muestras[i] / 32768;

    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);

    // Un pequeño colchón para que no se corte entre pedacitos.
    const ahora = c.currentTime;
    if (siguiente < ahora + 0.03) siguiente = ahora + 0.12;
    src.start(siguiente);
    siguiente += buffer.duration;
}

/* ---------------- Jugadores silenciados (solo para mí) ---------------- */

const CLAVE = "ludogamif:silenciados";
const oyentes = new Set();
let silenciados = new Set();

try {
    silenciados = new Set(JSON.parse(localStorage.getItem(CLAVE)) || []);
} catch {
    silenciados = new Set();
}

export function estaSilenciadoJugador(userId) {
    return silenciados.has(String(userId));
}

export function alternarSilencioJugador(userId) {
    const id = String(userId);
    if (silenciados.has(id)) silenciados.delete(id);
    else silenciados.add(id);
    try {
        localStorage.setItem(CLAVE, JSON.stringify([...silenciados]));
    } catch {
        // Sin almacenamiento: vale mientras la página esté abierta.
    }
    oyentes.forEach((fn) => fn());
}

export function alCambiarSilenciados(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
}
