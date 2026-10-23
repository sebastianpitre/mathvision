/* =========================================================
   AVISOS DEL JUEGO
   Mensajes cortos que aparecen arriba unos segundos, en
   cualquier pantalla (invitación enviada, alguien entró a tu
   sala…). La línea de avisos del lobby muestra el último.
========================================================= */

const oyentes = new Set();
let ultimo = null;
let contador = 0;

/* tono: "info" | "ok" | "error" */
export function avisar(texto, tono = "info", ms = 3200) {
    if (!texto) return;
    ultimo = { id: ++contador, texto, tono, ms, en: Date.now() };
    oyentes.forEach((fn) => fn(ultimo));
}

export function ultimoAviso() {
    return ultimo;
}

export function alAvisar(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
}
