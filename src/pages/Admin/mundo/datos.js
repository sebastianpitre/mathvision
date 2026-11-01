/* =========================================================
   EDITOR DEL MUNDO 3D · PIEZAS Y AYUDAS
========================================================= */

export const LIMITE = 60;

/* Piezas que se pueden poner (herramientas de la izquierda). */
export const PIEZAS = [
    { clave: "pared", tipo: "pared", nombre: "Pared", icono: "🧱", prefijo: "P", ancho: 8, alto: 3, largo: 0.3, color: "#e8e2d6" },
    { clave: "salon", tipo: "salon", nombre: "Salón", icono: "🏫", prefijo: "S", ancho: 10, alto: 3, largo: 8, color: "#efe7d8", grosor: 0.25 },
    { clave: "caja", tipo: "caja", nombre: "Caja", icono: "📦", prefijo: "K", ancho: 2, alto: 2, largo: 2, color: "#c08a5b" },
    { clave: "plataforma", tipo: "plataforma", nombre: "Plataforma", icono: "🟫", prefijo: "PL", ancho: 3, alto: 0.8, largo: 3, color: "#8aa0b8" },
    { clave: "rampa", tipo: "plataforma", nombre: "Rampa", icono: "📐", prefijo: "R", ancho: 3, alto: 0.25, largo: 6, color: "#9aa7b8", incl: 15 },
    { clave: "escalera", tipo: "escalera", nombre: "Escalera", icono: "🪜", prefijo: "E", ancho: 2, alto: 3, largo: 5, color: "#b9a68f", peldanos: 12, flotante: false },
    { clave: "flotante", tipo: "escalera", nombre: "Escalera flotante", icono: "🪜", prefijo: "EF", ancho: 1.6, alto: 3, largo: 6, color: "#a3b6cc", peldanos: 10, flotante: true },
    { clave: "baranda", tipo: "baranda", nombre: "Baranda", icono: "🚧", prefijo: "B", ancho: 4, alto: 1, largo: 0.1, color: "#cbd5e1", separacion: 0.4, grueso: 0.06 },
    { clave: "columna", tipo: "columna", nombre: "Columna", icono: "🏛️", prefijo: "CO", ancho: 0.8, alto: 4, largo: 0.8, color: "#d9d4cc" },
    { clave: "arbol", tipo: "arbol", nombre: "Árbol", icono: "🌳", prefijo: "A", ancho: 3, alto: 5, largo: 3, color: "#3f8f3a" },
    { clave: "cuadro", tipo: "cuadro", nombre: "Cuadro / mural", icono: "🖼️", prefijo: "CU", ancho: 3, alto: 2, largo: 0.1, color: "#ffffff", y: 0.6 },
    { clave: "juego", tipo: "circulo", nombre: "Círculo de juego", icono: "🎮", prefijo: "C", ancho: 5, alto: 0.1, largo: 5, color: "#ffcf3e", funcion: "juego", juego: "zona", segundos: 30 },
    { clave: "tele", tipo: "circulo", nombre: "Teletransporte", icono: "🌀", prefijo: "T", ancho: 2.5, alto: 0.1, largo: 2.5, color: "#a78bfa", funcion: "teletransporte", destino: null },
];

export const NOMBRE_TIPO = {
    pared: "Pared",
    salon: "Salón",
    caja: "Caja",
    plataforma: "Plataforma",
    escalera: "Escalera",
    columna: "Columna",
    arbol: "Árbol",
    cuadro: "Cuadro / mural",
    circulo: "Círculo",
    baranda: "Baranda",
    modelo: "Objeto 3D",
};

export const ICONO_TIPO = { pared: "🧱", salon: "🏫", caja: "📦", plataforma: "🟫", escalera: "🪜", columna: "🏛️", arbol: "🌳", cuadro: "🖼️", circulo: "⭕", baranda: "🚧", modelo: "📦" };

export const REDONDOS = ["columna", "arbol", "circulo"];
export const SIN_INCLINAR = ["columna", "arbol", "circulo", "salon", "escalera", "baranda"];
export const SIN_LARGO = ["columna", "arbol", "circulo", "baranda"];

export const redondear = (n, paso = 0.25) => Math.round(n / paso) * paso;
export const limitar = (n, min, max) => Math.min(max, Math.max(min, n));

/* Id corto y legible: P1, S2, C3… (el siguiente libre de ese prefijo). */
export function idNuevo(objetos, prefijo) {
    const usados = new Set(objetos.map((o) => o.id));
    let n = 1;
    while (usados.has(`${prefijo}${n}`)) n += 1;
    return `${prefijo}${n}`;
}

export function prefijoDe(o) {
    if (o.tipo === "circulo") return o.funcion === "teletransporte" ? "T" : "C";
    if (o.tipo === "escalera") return o.flotante ? "EF" : "E";
    if (o.tipo === "plataforma" && Math.abs(o.incl || 0) > 2) return "R";
    if (o.tipo === "modelo") return "M";
    return PIEZAS.find((p) => p.tipo === o.tipo)?.prefijo || "O";
}

/* Objeto nuevo de una pieza, en (x, z). */
export function crearPieza(pieza, objetos, x, z) {
    const { clave: _c, nombre: _n, icono: _i, prefijo, ...resto } = pieza;
    return {
        id: idNuevo(objetos, prefijo),
        nombre: "",
        y: 0,
        rot: 0,
        incl: 0,
        material: null,
        textura: null,
        baldosa: 2,
        ...resto,
        x,
        z,
    };
}

/* Radio que encierra el objeto (para poner la barra encima). */
export function radioDe(o) {
    if (REDONDOS.includes(o.tipo) || o.tipo === "baranda") return o.ancho / 2;
    return Math.hypot(o.ancho, Math.max(o.largo, 0.1)) / 2;
}

/* Local (del objeto) → mundo, con su giro. */
export function aMundo(o, lx, lz) {
    const a = ((o.rot || 0) * Math.PI) / 180;
    return { x: o.x + lx * Math.cos(a) + lz * Math.sin(a), z: o.z - lx * Math.sin(a) + lz * Math.cos(a) };
}

/* Mundo → local del objeto. */
export function aLocal(o, x, z) {
    const a = ((o.rot || 0) * Math.PI) / 180;
    const dx = x - o.x;
    const dz = z - o.z;
    return { lx: dx * Math.cos(a) - dz * Math.sin(a), lz: dx * Math.sin(a) + dz * Math.cos(a) };
}

export function nombreVisible(o) {
    return o.nombre ? `${o.nombre} (${o.id})` : `${NOMBRE_TIPO[o.tipo] || o.tipo} ${o.id}`;
}

export function idModeloNuevo(modelos) {
    const usados = new Set(modelos.map((m) => m.id));
    let n = 1;
    while (usados.has(`obj${n}`)) n += 1;
    return `obj${n}`;
}

export function idMaterialNuevo(materiales) {
    const usados = new Set(materiales.map((m) => m.id));
    let n = 1;
    while (usados.has(`t${n}`)) n += 1;
    return `t${n}`;
}
