/* =========================================================
   TAMAÑO DE CADA PERSONAJE
   El administrador ajusta en el panel el tamaño de los
   modelos que vienen muy grandes o muy pequeños. Aquí se
   guarda { "ruta del modelo": tamaño } para aplicarlo en
   cualquier pantalla donde se vea el personaje.
========================================================= */

import { useEffect, useState } from "react";

let escalas = {};
let pedido = null;
const oyentes = new Set();

export function cargarEscalas({ forzar = false } = {}) {
    if (pedido && !forzar) return pedido;
    pedido = fetch("/api/tienda/escalas")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
            if (d?.escalas) {
                escalas = d.escalas;
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

export function escalaDe(url) {
    return escalas[sinFragmento(url)] ?? 1;
}

export function useEscala(url) {
    const [, setVersion] = useState(0);
    useEffect(() => {
        cargarEscalas();
        const fn = () => setVersion((v) => v + 1);
        oyentes.add(fn);
        return () => oyentes.delete(fn);
    }, []);
    return escalaDe(url);
}
