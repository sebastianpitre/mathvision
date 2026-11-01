/* =========================================================
   MUNDO 3D · PIEZAS (lo comparten el mundo, la física y el editor)
   · materialDe: color o foto de un objeto (su textura guardada
     de la biblioteca, o la suya propia).
   · partesDe: piezas compuestas en cajas simples (un salón son
     4 paredes; una escalera, sus peldaños), en metros y en las
     coordenadas del objeto (antes de girarlo).
========================================================= */

export const TIPOS_SIN_INCLINAR = ["columna", "arbol", "circulo", "salon", "escalera"];

/* Color, foto y tamaño de la foto que lleva un objeto (o el suelo). */
export function materialDe(o, materiales = []) {
    const m = o?.material ? materiales.find((x) => x.id === o.material) : null;
    if (m) return { color: m.tipo === "imagen" ? "#ffffff" : m.color, textura: m.tipo === "imagen" ? m.textura : null, baldosa: m.baldosa || 2, nombre: m.nombre };
    return { color: o?.textura ? "#ffffff" : o?.color || "#cccccc", textura: o?.textura || null, baldosa: o?.baldosa || 2, nombre: null };
}

/* Color para dibujar en el mapa (la foto se ve aparte, como patrón). */
export function colorMapa(o, materiales = []) {
    const m = o?.material ? materiales.find((x) => x.id === o.material) : null;
    if (m) return m.tipo === "color" ? m.color : "#9aa4b5";
    return o?.textura ? "#9aa4b5" : o?.color || "#cccccc";
}

/*
 * Cajas que forman la pieza: { cx, cy, cz, w, h, d } en metros, en
 * coordenadas del objeto (cy = centro sobre su base).
 */
export function partesDe(o) {
    if (o.tipo === "salon") {
        const g = Math.min(o.grosor || 0.25, o.ancho / 2, o.largo / 2);
        const h = o.alto;
        return [
            { cx: 0, cy: h / 2, cz: -o.largo / 2 + g / 2, w: o.ancho, h, d: g }, // fondo
            { cx: 0, cy: h / 2, cz: o.largo / 2 - g / 2, w: o.ancho, h, d: g }, // frente
            { cx: -o.ancho / 2 + g / 2, cy: h / 2, cz: 0, w: g, h, d: o.largo - g * 2 }, // izquierda
            { cx: o.ancho / 2 - g / 2, cy: h / 2, cz: 0, w: g, h, d: o.largo - g * 2 }, // derecha
        ];
    }
    if (o.tipo === "escalera") {
        // Sube hacia el frente del objeto (+z antes de girar).
        const n = Math.max(2, o.peldanos || 12);
        const fondo = o.largo / n;
        const sube = o.alto / n;
        const partes = [];
        for (let i = 0; i < n; i += 1) {
            const techo = sube * (i + 1);
            const cz = -o.largo / 2 + fondo * (i + 0.5);
            if (o.flotante) partes.push({ cx: 0, cy: techo - 0.07, cz, w: o.ancho, h: 0.14, d: fondo * 0.82 });
            else partes.push({ cx: 0, cy: techo / 2, cz, w: o.ancho, h: techo, d: fondo });
        }
        return partes;
    }
    return null;
}
