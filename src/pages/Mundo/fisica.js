/* =========================================================
   MUNDO 3D · CHOQUES Y SALTOS (muy simple, sin librerías)
   ---------------------------------------------------------
   Cada objeto es una caja (girada) o un cilindro. El jugador
   es un círculo de RADIO metros:
   · Si está más abajo que el techo del objeto, lo empuja
     hacia afuera (no atraviesa paredes).
   · Si está encima (o casi, un escalón), se para sobre él.
   · Gravedad y salto.
========================================================= */

import { alturaBaranda, partesDe } from "./piezas.js";

export const RADIO = 0.35;
export let LIMITE = 58;
/* El admin puede agrandar el mundo: la orilla se mueve con él. */
export function ponerLimite(mitad) {
    LIMITE = Math.max(10, (mitad || 60) - 2);
}
export const GRAVEDAD = 24;
export const SALTO = 8; // velocidad hacia arriba (≈ 1.3 m de alto)
const ESCALON = 0.45; // se sube solo a lo que mida menos que esto

const RAD = Math.PI / 180;

/* Objetos del diseño → formas para chocar. */
export function formasDe(objetos = []) {
    const formas = [];
    for (const o of objetos) {
        if (o.tipo === "circulo" || o.tipo === "cancha") continue; // se pisa, no choca
        if (o.tipo === "ranking") {
            // La pantalla (atrás) y el pedestal del primero (un escalón).
            const a = (o.rot || 0) * RAD;
            const c = Math.cos(a);
            const s = Math.sin(a);
            const lugar = (lz) => ({ x: o.x + lz * s, z: o.z + lz * c });
            const fondo = -o.largo / 2 + 0.1;
            formas.push({ ...lugar(fondo), hx: o.ancho / 2, hz: 0.12, cos: c, sin: s, abajo: o.y || 0, techo: (o.y || 0) + o.alto + 0.6 });
            formas.push({ cil: true, ...lugar(Math.min(o.largo / 2 - 1, fondo + 2)), r: 1, abajo: o.y || 0, techo: (o.y || 0) + 0.24 });
            continue;
        }
        if (o.tipo === "modelo" && o.solido === false) continue; // decorativo: se atraviesa
        const base = o.y || 0;
        if (o.tipo === "arbol") {
            formas.push({ cil: true, x: o.x, z: o.z, r: Math.max(0.2, o.ancho * 0.1), abajo: base, techo: base + o.alto * 0.45 });
            continue;
        }
        if (o.tipo === "columna") {
            formas.push({ cil: true, x: o.x, z: o.z, r: o.ancho / 2, abajo: base, techo: base + o.alto });
            continue;
        }
        const ang = (o.rot || 0) * RAD;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        // Salón y escalera: varias cajas que giran juntas.
        const partes = partesDe(o);
        if (partes) {
            for (const q of partes) {
                formas.push({
                    x: o.x + q.cx * cos + q.cz * sin,
                    z: o.z - q.cx * sin + q.cz * cos,
                    hx: q.w / 2,
                    hz: Math.max(q.d, 0.1) / 2,
                    cos,
                    sin,
                    abajo: base + q.cy - q.h / 2,
                    techo: base + q.cy + q.h / 2,
                });
            }
            continue;
        }
        if (o.tipo === "baranda") {
            // Inclinada o no: una caja delgada desde la punta baja hasta el pasamanos más alto.
            const sube = Math.max(alturaBaranda(o, -o.ancho / 2), alturaBaranda(o, o.ancho / 2));
            formas.push({ x: o.x, z: o.z, hx: o.ancho / 2, hz: Math.max(o.grueso || 0.06, 0.15) / 2, cos, sin, abajo: base, techo: base + sube + o.alto });
            continue;
        }
        const d = Math.max(o.largo, 0.1);
        const a = -(o.incl || 0) * RAD; // positivo: sube hacia el frente (+z del objeto)
        if (Math.abs(o.incl || 0) > 2) {
            const pie = Math.abs((d / 2) * Math.cos(a)) + Math.abs((o.alto / 2) * Math.sin(a));
            const alto = Math.abs((o.alto / 2) * Math.cos(a)) + Math.abs((d / 2) * Math.sin(a));
            if (Math.abs(o.incl) <= 50) {
                // Rampa: se camina por encima.
                formas.push({ rampa: true, x: o.x, z: o.z, hx: o.ancho / 2, hz: pie, cos, sin, base, cy: o.alto / 2, h: o.alto, d, a, abajo: base + o.alto / 2 - alto, techo: base + o.alto / 2 + alto });
                continue;
            }
            formas.push({ x: o.x, z: o.z, hx: o.ancho / 2, hz: pie, cos, sin, abajo: base + o.alto / 2 - alto, techo: base + o.alto / 2 + alto });
            continue;
        }
        formas.push({ x: o.x, z: o.z, hx: o.ancho / 2, hz: d / 2, cos, sin, abajo: base, techo: base + o.alto });
    }
    return formas;
}

/* Altura de la rampa en ese punto (o null si está fuera). */
function alturaRampa(f, x, z) {
    const { lx, lz } = local(f, x, z);
    if (Math.abs(lx) > f.hx + 0.05) return null;
    const z0 = (lz - (f.h / 2) * Math.sin(f.a)) / Math.cos(f.a);
    if (Math.abs(z0) > f.d / 2 + 0.05) return null;
    return f.base + f.cy + (f.h / 2) * Math.cos(f.a) - z0 * Math.sin(f.a);
}

/* Punto en coordenadas de la caja. */
function local(f, x, z) {
    const dx = x - f.x;
    const dz = z - f.z;
    // rotación inversa (three gira en Y: x' = x cos + z sin)
    return { lx: dx * f.cos - dz * f.sin, lz: dx * f.sin + dz * f.cos };
}

/* ¿Los pies están sobre la forma (sin contar el radio)? */
function encima(f, x, z) {
    if (f.cil) return Math.hypot(x - f.x, z - f.z) <= f.r + 0.05;
    const { lx, lz } = local(f, x, z);
    return Math.abs(lx) <= f.hx + 0.05 && Math.abs(lz) <= f.hz + 0.05;
}

/* Empuja el punto fuera de la forma (si choca). */
function empujar(f, p) {
    if (f.cil) {
        const dx = p.x - f.x;
        const dz = p.z - f.z;
        const d = Math.hypot(dx, dz);
        const min = f.r + RADIO;
        if (d >= min) return;
        const k = d > 1e-4 ? min / d : 0;
        p.x = f.x + (d > 1e-4 ? dx * k : min);
        p.z = f.z + (d > 1e-4 ? dz * k : 0);
        return;
    }
    const { lx, lz } = local(f, p.x, p.z);
    const ex = f.hx + RADIO - Math.abs(lx);
    const ez = f.hz + RADIO - Math.abs(lz);
    if (ex <= 0 || ez <= 0) return;
    let nx = lx;
    let nz = lz;
    if (ex < ez) nx = Math.sign(lx || 1) * (f.hx + RADIO);
    else nz = Math.sign(lz || 1) * (f.hz + RADIO);
    // de vuelta al mundo
    p.x = f.x + nx * f.cos + nz * f.sin;
    p.z = f.z - nx * f.sin + nz * f.cos;
}

/*
 * Un paso de física. p = { x, y, z, vy, enSuelo }.
 * dx, dz: cuánto quiere moverse en este cuadro.
 */
export function paso(p, dx, dz, dt, formas) {
    p.x = Math.max(-LIMITE, Math.min(LIMITE, p.x + dx));
    p.z = Math.max(-LIMITE, Math.min(LIMITE, p.z + dz));

    // Choques con lo que está a la altura del cuerpo.
    for (const f of formas) {
        if (f.rampa) {
            // Por un lado de la rampa (muy abajo de su superficie) no se pasa.
            const h = alturaRampa(f, p.x, p.z);
            // Por debajo de la rampa se puede pasar (si la cabeza cabe).
            const debajo = h != null ? h - f.h / Math.max(0.2, Math.cos(f.a)) : null;
            if (h != null && p.y < h - 0.6 && p.y + 1.7 > debajo) empujar(f, p);
            continue;
        }
        if (p.y >= f.techo - ESCALON || p.y + 1.6 <= f.abajo) continue;
        empujar(f, p);
    }

    // ¿Sobre qué está parado?
    let piso = 0;
    for (const f of formas) {
        if (f.rampa) {
            const h = alturaRampa(f, p.x, p.z);
            if (h != null && h > piso && p.y >= h - 0.6) piso = h;
            continue;
        }
        if (f.techo > piso && p.y >= f.techo - ESCALON && encima(f, p.x, p.z)) piso = f.techo;
    }

    p.vy -= GRAVEDAD * dt;
    p.y += p.vy * dt;
    if (p.y <= piso) {
        // Sube escalones suave en vez de saltar de golpe.
        p.y = piso - p.y > 0.05 && piso - p.y < ESCALON ? p.y + Math.min(piso - p.y, dt * 6) : piso;
        if (p.y >= piso - 0.001) p.y = piso;
        p.vy = Math.max(0, p.vy);
        p.enSuelo = true;
    } else {
        p.enSuelo = p.y - piso < 0.02;
    }
}
