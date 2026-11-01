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

export const RADIO = 0.35;
export const LIMITE = 58;
const GRAVEDAD = 24;
export const SALTO = 8; // velocidad hacia arriba (≈ 1.3 m de alto)
const ESCALON = 0.45; // se sube solo a lo que mida menos que esto

/* Objetos del diseño → formas para chocar. */
export function formasDe(objetos = []) {
    const formas = [];
    for (const o of objetos) {
        if (o.tipo === "circulo") continue; // se pisa, no choca
        const base = o.y || 0;
        if (o.tipo === "arbol") {
            formas.push({ cil: true, x: o.x, z: o.z, r: Math.max(0.2, o.ancho * 0.1), abajo: base, techo: base + o.alto * 0.45 });
            continue;
        }
        if (o.tipo === "columna") {
            formas.push({ cil: true, x: o.x, z: o.z, r: o.ancho / 2, abajo: base, techo: base + o.alto });
            continue;
        }
        const a = ((o.rot || 0) * Math.PI) / 180;
        formas.push({ x: o.x, z: o.z, hx: o.ancho / 2, hz: Math.max(o.largo, 0.1) / 2, cos: Math.cos(a), sin: Math.sin(a), abajo: base, techo: base + o.alto });
    }
    return formas;
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
        if (p.y >= f.techo - ESCALON || p.y + 1.6 <= f.abajo) continue;
        empujar(f, p);
    }

    // ¿Sobre qué está parado?
    let piso = 0;
    for (const f of formas) {
        if (f.techo > piso && p.y >= f.techo - ESCALON && encima(f, p.x, p.z)) piso = f.techo;
    }

    p.vy -= GRAVEDAD * dt;
    p.y += p.vy * dt;
    if (p.y <= piso) {
        // Sube escalones suave en vez de saltar de golpe.
        p.y = piso - p.y > 0.05 ? p.y + Math.min(piso - p.y, dt * 6) : piso;
        if (p.y >= piso - 0.001) p.y = piso;
        p.vy = Math.max(0, p.vy);
        p.enSuelo = true;
    } else {
        p.enSuelo = p.y - piso < 0.02;
    }
}
