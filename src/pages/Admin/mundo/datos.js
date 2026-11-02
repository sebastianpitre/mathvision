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
    { clave: "cancha", tipo: "cancha", nombre: "Cancha (partido)", icono: "🏀", prefijo: "CA", ancho: 14, alto: 0.05, largo: 24, color: "#c2410c", balon: "", tamBalon: 0.6, minutos: 5, maxEquipo: 5, deporte: "basquet", sonidos: {}, arqueros: { activo: true, velocidad: 1, ancho: 1.2, alto: 1.8 }, bots: { activo: true, porEquipo: 3 } },
    { clave: "ranking", tipo: "ranking", nombre: "Tabla de ranking", icono: "🏆", prefijo: "RK", ancho: 5, alto: 3.2, largo: 3, color: "#1e293b", top: 5 },
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
    cancha: "Cancha (partido)",
    ranking: "Tabla de ranking",
};

export const ICONO_TIPO = { pared: "🧱", salon: "🏫", caja: "📦", plataforma: "🟫", escalera: "🪜", columna: "🏛️", arbol: "🌳", cuadro: "🖼️", circulo: "⭕", baranda: "🚧", modelo: "📦", cancha: "🏀", ranking: "🏆" };

export const REDONDOS = ["columna", "arbol", "circulo"];
export const SIN_INCLINAR = ["columna", "arbol", "circulo", "salon", "escalera", "cancha", "ranking"];
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

/* Cestas (o porterías en fútbol) y bolas de entrada de una cancha nueva (relativas a su centro). */
export function partesCancha(ancho, largo, deporte = "basquet") {
    return {
        cestas:
            deporte === "futbol"
                ? [
                      { x: 0, z: -(largo / 2 - 0.6), y: 2.2, radio: 2.5 },
                      { x: 0, z: largo / 2 - 0.6, y: 2.2, radio: 2.5 },
                  ]
                : [
                      { x: 0, z: -(largo / 2 - 2.5), y: 3.2, radio: 0.8, tablero: { activo: true, ancho: 1.8, alto: 1.1, dy: 0.45, atras: 0.15 } },
                      { x: 0, z: largo / 2 - 2.5, y: 3.2, radio: 0.8, tablero: { activo: true, ancho: 1.8, alto: 1.1, dy: 0.45, atras: 0.15 } },
                  ],
        entradas: [
            { x: ancho / 2 + 3, z: -2.5 },
            { x: ancho / 2 + 3, z: 2.5 },
        ],
    };
}

/* Objeto nuevo de una pieza, en (x, z). */
export function crearPieza(pieza, objetos, x, z) {
    const { clave: _c, nombre: _n, icono: _i, prefijo, ...resto } = pieza;
    if (pieza.tipo === "cancha") Object.assign(resto, partesCancha(pieza.ancho, pieza.largo));
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

/* ---------------- Guías inteligentes (como en Illustrator) ---------------- */

/* Caja recta (sin giro) que ocupa el objeto en el mapa. */
export function cajaDe(o) {
    if (REDONDOS.includes(o.tipo)) {
        const r = o.ancho / 2;
        return { x0: o.x - r, x1: o.x + r, z0: o.z - r, z1: o.z + r, cx: o.x, cz: o.z };
    }
    const w = o.ancho / 2;
    const d = Math.max(o.tipo === "baranda" ? 0.1 : o.largo, 0.1) / 2;
    const a = ((o.rot || 0) * Math.PI) / 180;
    const c = Math.abs(Math.cos(a));
    const s = Math.abs(Math.sin(a));
    const ex = w * c + d * s;
    const ez = w * s + d * c;
    return { x0: o.x - ex, x1: o.x + ex, z0: o.z - ez, z1: o.z + ez, cx: o.x, cz: o.z };
}

/*
 * Busca bordes y centros de otros objetos cerca del que se mueve.
 * Devuelve cuánto correrlo para que encaje (dx, dz, o null si nada
 * está cerca) y las líneas guía para dibujar.
 */
export function guiasPara(mov, otros, umbral) {
    const m = cajaDe(mov);
    const cajas = otros.map(cajaDe).filter((c) => Math.abs(c.cx - m.cx) < 60 && Math.abs(c.cz - m.cz) < 60);
    let mejorX = null;
    let mejorZ = null;
    for (const c of cajas) {
        /* Centro con centro gana si está cerca (es lo que uno suele buscar). */
        const probar = (as, bs, mejor) => {
            for (let i = 0; i < 3; i += 1) {
                for (let j = 0; j < 3; j += 1) {
                    const d = bs[j] - as[i];
                    if (Math.abs(d) > umbral) continue;
                    const puntos = Math.abs(d) - (i === 1 && j === 1 ? umbral * 0.6 : 0);
                    if (!mejor || puntos < mejor.puntos) mejor = { d: d || 1e-9, puntos };
                }
            }
            return mejor;
        };
        mejorX = probar([m.x0, m.cx, m.x1], [c.x0, c.cx, c.x1], mejorX);
        mejorZ = probar([m.z0, m.cz, m.z1], [c.z0, c.cz, c.z1], mejorZ);
    }
    return { dx: mejorX ? mejorX.d : null, dz: mejorZ ? mejorZ.d : null };
}

/* Líneas guía de un objeto ya encajado (las que coinciden exactas). */
export function lineasGuia(mov, otros) {
    const m = cajaDe(mov);
    const lineas = [];
    const ya = new Set();
    for (const o of otros) {
        const c = cajaDe(o);
        if (Math.abs(c.cx - m.cx) > 60 || Math.abs(c.cz - m.cz) > 60) continue;
        for (const a of [m.x0, m.cx, m.x1]) {
            for (const b of [c.x0, c.cx, c.x1]) {
                if (Math.abs(a - b) < 0.011) {
                    const k = `x${b.toFixed(2)}`;
                    lineas.push({ eje: "x", v: b, desde: Math.min(m.z0, c.z0), hasta: Math.max(m.z1, c.z1), centro: a === m.cx || b === c.cx });
                    ya.add(k);
                }
            }
        }
        for (const a of [m.z0, m.cz, m.z1]) {
            for (const b of [c.z0, c.cz, c.z1]) {
                if (Math.abs(a - b) < 0.011) lineas.push({ eje: "z", v: b, desde: Math.min(m.x0, c.x0), hasta: Math.max(m.x1, c.x1), centro: a === m.cz || b === c.cz });
            }
        }
    }
    return lineas.slice(0, 12);
}

/* Paso de la regla según el zoom (que las marcas no queden pegadas). */
export function pasoRegla(escala) {
    for (const p of [0.5, 1, 2, 5, 10, 20, 50]) if (p * escala >= 46) return p;
    return 100;
}
