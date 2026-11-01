/* =========================================================
   MUNDO 3D · VOZ CERCANA
   Cada jugador que habla suena por su propio canal, más
   fuerte mientras más cerca está (a RADIO metros ya no se oye).
   Varios pueden hablar a la vez.
========================================================= */

import { ctx, estaSilenciadoJugador } from "../../services/voz";
import { estaSilenciado } from "../../services/sonido";

export const RADIO_VOZ = 22;
const canales = new Map(); // userId → { ganancia, siguiente }

function canal(userId) {
    const c = ctx();
    let k = canales.get(userId);
    if (!k) {
        const ganancia = c.createGain();
        ganancia.connect(c.destination);
        k = { ganancia, siguiente: 0 };
        canales.set(userId, k);
    }
    return k;
}

/* Volumen según la distancia (1 cerca … 0 lejos). */
export function volumenPorDistancia(d) {
    if (d <= 3) return 1;
    return Math.max(0, 1 - (d - 3) / (RADIO_VOZ - 3)) ** 1.3;
}

export function sonarVoz(userId, pcm, tasa, distancia) {
    const c = ctx();
    if (!c || c.state !== "running" || estaSilenciado() || estaSilenciadoJugador(userId)) return;
    const muestras = new Int16Array(pcm);
    if (!muestras.length) return;

    const buffer = c.createBuffer(1, muestras.length, tasa);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < muestras.length; i += 1) datos[i] = muestras[i] / 32768;

    const k = canal(userId);
    k.ganancia.gain.setTargetAtTime(volumenPorDistancia(distancia), c.currentTime, 0.05);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(k.ganancia);
    const ahora = c.currentTime;
    if (k.siguiente < ahora + 0.03) k.siguiente = ahora + 0.12;
    src.start(k.siguiente);
    k.siguiente += buffer.duration;
}

/* Mientras alguien habla y se mueve, el volumen sigue a la distancia. */
export function ajustarVolumen(userId, distancia) {
    const k = canales.get(userId);
    const c = ctx();
    if (k && c) k.ganancia.gain.setTargetAtTime(volumenPorDistancia(distancia), c.currentTime, 0.1);
}

export function cerrarVoces() {
    for (const k of canales.values()) {
        try {
            k.ganancia.disconnect();
        } catch {
            // ya estaba
        }
    }
    canales.clear();
}
