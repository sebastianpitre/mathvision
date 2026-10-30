/* =========================================================
   TAMAÑO Y POSICIÓN DE CADA PERSONAJE
   El administrador ajusta en el panel los modelos que vienen
   muy grandes, muy pequeños o corridos. Aquí se guarda
   { "ruta del modelo": { escala, x, y } } para aplicarlo en
   cualquier pantalla donde se vea el personaje.
========================================================= */

import { useEffect, useState } from "react";

const NORMAL = { escala: 1, x: 0, y: 0 };
let ajustes = {};
let pedido = null;
const oyentes = new Set();

export function cargarEscalas({ forzar = false } = {}) {
    if (pedido && !forzar) return pedido;
    pedido = fetch("/api/tienda/escalas")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
            if (d?.escalas) {
                ajustes = d.escalas;
                oyentes.forEach((fn) => fn());
            }
        })
        .catch(() => {
            pedido = null;
        });
    return pedido;
}

// La sala agrega "#jugador-5" a la ruta para cargar copias separadas.
const sinFragmento = (url) => String(url || "").split("#")[0];

export function ajusteDe(url) {
    const a = ajustes[sinFragmento(url)];
    if (a == null) return NORMAL;
    if (typeof a === "number") return { ...NORMAL, escala: a }; // versión anterior del servidor
    return { escala: a.escala ?? 1, x: a.x ?? 0, y: a.y ?? 0 };
}

export function escalaDe(url) {
    return ajusteDe(url).escala;
}

export function useAjuste(url) {
    const [, setVersion] = useState(0);
    useEffect(() => {
        cargarEscalas();
        const fn = () => setVersion((v) => v + 1);
        oyentes.add(fn);
        return () => oyentes.delete(fn);
    }, []);
    return ajusteDe(url);
}

export const useEscala = (url) => useAjuste(url).escala;
