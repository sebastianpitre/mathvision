/* =========================================================
   MUNDO 3D (lobby para caminar) · DISEÑO
   ---------------------------------------------------------
   Se guarda en config_juego (clave "mundo"):
     cielo   { tipo: color | degradado | foto, color, arriba, horizonte, foto }
     suelo   { color, textura, baldosa (metros que ocupa la foto), material }
     materiales [{ id, nombre, tipo: color | imagen, color, textura, baldosa }]
             texturas guardadas que se reutilizan: si se cambia una,
             cambian todos los objetos que la usan.
     luz     dia | tarde | noche
     personajes  ids de personajes .glb que se pueden usar
     objetos [{ id, nombre, tipo, x, z, y, rot, incl, ancho, alto, largo,
               material | color, textura, baldosa, …propios del tipo }]
   Tipos de objeto: caja, pared, plataforma (para brincar),
   columna, arbol, cuadro (una foto colgada, como un mural) y
   circulo (función "juego": cada "segundos" arma una partida del
   "juego" con los que estén adentro; función "teletransporte": al
   tocar USAR lleva al círculo "destino"), salon (4 paredes que se
   mueven juntas, de "grosor") y escalera ("peldanos"; "flotante"
   = solo los peldaños, sin relleno). "incl" inclina la pieza
   (rampas, paredes inclinadas).
========================================================= */

import { pool } from "../database/db.js";
import { errorConEstado } from "../http/ruta.js";
import { JUEGOS_SALA } from "../salas/juegos.js";

const CLAVE = "mundo";
const COLOR = /^#[0-9a-f]{6}$/i;
export const LIMITE = 60; // el suelo va de -60 a 60 metros
export const MAX_OBJETOS = 300;
export const TIPOS_OBJETO = ["caja", "pared", "plataforma", "columna", "arbol", "cuadro", "circulo", "salon", "escalera"];
export const FUNCIONES_CIRCULO = ["juego", "teletransporte"];
export const MAX_MATERIALES = 60;
export const LUCES = ["dia", "tarde", "noche"];

export const esGlb = (ruta) => /\.glb$/i.test(String(ruta || ""));
const esImagen = (r) => typeof r === "string" && /^\/(archivos|img)\/[\w\-./]+\.(png|jpe?g|webp)$/i.test(r) && !r.includes("..");

const color = (v, d) => (COLOR.test(v) ? String(v).toLowerCase() : d);
const num = (v, min, max, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 100) / 100)) : d;
};

/* Medidas por defecto de cada pieza (ancho × alto × largo, en metros). */
export const PIEZAS = {
    caja: { ancho: 2, alto: 2, largo: 2, color: "#c08a5b" },
    pared: { ancho: 8, alto: 3, largo: 0.3, color: "#e8e2d6" },
    plataforma: { ancho: 3, alto: 0.8, largo: 3, color: "#8aa0b8" },
    columna: { ancho: 0.8, alto: 4, largo: 0.8, color: "#d9d4cc" },
    arbol: { ancho: 3, alto: 5, largo: 3, color: "#3f8f3a" },
    cuadro: { ancho: 3, alto: 2, largo: 0.1, color: "#ffffff" },
    // Círculo de juego: quien se pare adentro entra a una partida (ancho = diámetro).
    circulo: { ancho: 5, alto: 0.1, largo: 5, color: "#ffcf3e" },
    salon: { ancho: 10, alto: 3, largo: 8, color: "#efe7d8" },
    escalera: { ancho: 2, alto: 3, largo: 5, color: "#b9a68f" },
};

const textoCorto = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);

function limpiarMaterial(m = {}, i) {
    const tipo = m.tipo === "imagen" && esImagen(m.textura) ? "imagen" : "color";
    return {
        id: textoCorto(m.id || `m${i}`, 24) || `m${i}`,
        nombre: textoCorto(m.nombre, 40) || `Textura ${i + 1}`,
        tipo,
        color: color(m.color, "#cccccc"),
        textura: tipo === "imagen" ? m.textura : null,
        baldosa: num(m.baldosa, 0.25, 50, 2),
    };
}

function limpiarObjeto(o = {}, i) {
    const tipo = TIPOS_OBJETO.includes(o.tipo) ? o.tipo : "caja";
    const base = PIEZAS[tipo];
    return {
        id: String(o.id || `o${i}`).slice(0, 24),
        nombre: textoCorto(o.nombre, 40),
        tipo,
        x: num(o.x, -LIMITE, LIMITE, 0),
        z: num(o.z, -LIMITE, LIMITE, 0),
        y: num(o.y, 0, 30, 0), // altura desde el suelo (un cuadro colgado, una caja encima de otra)
        rot: num(o.rot, -360, 360, 0),
        incl: num(o.incl, -80, 80, 0), // inclinación (grados): rampas y paredes inclinadas
        material: o.material ? textoCorto(o.material, 24) : null,
        ancho: num(o.ancho, 0.1, 60, base.ancho),
        alto: num(o.alto, 0.1, 30, base.alto),
        largo: num(o.largo, 0.05, 60, base.largo),
        color: color(o.color, base.color),
        textura: esImagen(o.textura) ? o.textura : null,
        baldosa: num(o.baldosa, 0.25, 50, 2),
        ...(tipo === "circulo"
            ? {
                  funcion: FUNCIONES_CIRCULO.includes(o.funcion) ? o.funcion : "juego",
                  juego: JUEGOS_SALA[o.juego] ? o.juego : "zona",
                  segundos: Math.round(num(o.segundos, 5, 300, 30)),
                  destino: o.destino ? textoCorto(o.destino, 24) : null,
              }
            : {}),
        ...(tipo === "salon" ? { grosor: num(o.grosor, 0.05, 2, 0.25) } : {}),
        ...(tipo === "escalera" ? { peldanos: Math.round(num(o.peldanos, 2, 60, 12)), flotante: Boolean(o.flotante) } : {}),
    };
}

export function normalizar(v = {}) {
    // Versión anterior: cielo y suelo eran solo un color.
    const cieloViejo = typeof v.cielo === "string" ? v.cielo : null;
    const sueloViejo = typeof v.suelo === "string" ? v.suelo : null;
    const c = typeof v.cielo === "object" && v.cielo ? v.cielo : {};
    const s = typeof v.suelo === "object" && v.suelo ? v.suelo : {};
    return {
        cielo: {
            tipo: ["color", "degradado", "foto"].includes(c.tipo) ? c.tipo : "degradado",
            color: color(c.color || cieloViejo, "#7cc4ff"),
            arriba: color(c.arriba, "#3d8bfd"),
            horizonte: color(c.horizonte || cieloViejo, "#cfe8ff"),
            foto: esImagen(c.foto) ? c.foto : null,
        },
        suelo: {
            color: color(s.color || sueloViejo, "#5fb35a"),
            textura: esImagen(s.textura) ? s.textura : null,
            baldosa: num(s.baldosa, 0.25, 50, 4),
            material: s.material ? textoCorto(s.material, 24) : null,
        },
        materiales: (Array.isArray(v.materiales) ? v.materiales : []).slice(0, MAX_MATERIALES).map(limpiarMaterial),
        luz: LUCES.includes(v.luz) ? v.luz : "dia",
        personajes: Array.isArray(v.personajes) ? v.personajes.map(String).slice(0, 50) : [],
        objetos: (Array.isArray(v.objetos) ? v.objetos : []).slice(0, MAX_OBJETOS).map(limpiarObjeto),
    };
}

let cache = null;
const oyentes = new Set();

/* Avisa cuando el admin guarda (los que están adentro ven el cambio en vivo). */
export function alCambiarMundo(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
}

export async function configMundo() {
    if (cache) return cache;
    const { rows } = await pool.query("SELECT valor FROM config_juego WHERE clave = $1", [CLAVE]);
    cache = normalizar(rows[0]?.valor || {});
    if (cache.cielo.tipo === "foto" && !cache.cielo.foto) cache.cielo.tipo = "degradado";
    return cache;
}

/* Lo que ve el jugador: el diseño y los personajes permitidos (con su modelo). */
export async function mundoParaJugador() {
    const c = await configMundo();
    const { rows } = await pool.query(
        "SELECT id, name AS nombre, model_path AS modelo, thumbnail_path AS foto FROM characters WHERE id = ANY($1)",
        [c.personajes]
    );
    const orden = new Map(c.personajes.map((id, i) => [id, i]));
    return {
        ...c,
        personajes: rows.filter((p) => esGlb(p.modelo)).sort((a, b) => orden.get(a.id) - orden.get(b.id)),
    };
}

export async function guardarConfigMundo(d = {}) {
    if (Array.isArray(d.objetos) && d.objetos.length > MAX_OBJETOS) throw errorConEstado(`Máximo ${MAX_OBJETOS} objetos.`);
    const valor = normalizar(d);
    // ids únicos de texturas; las referencias que ya no existen se quitan
    const idsMat = new Set();
    valor.materiales.forEach((m, i) => {
        if (idsMat.has(m.id)) m.id = `m${i}-${Math.random().toString(36).slice(2, 6)}`;
        idsMat.add(m.id);
    });
    if (valor.suelo.material && !idsMat.has(valor.suelo.material)) valor.suelo.material = null;
    for (const o of valor.objetos) if (o.material && !idsMat.has(o.material)) o.material = null;
    if (valor.cielo.tipo === "foto" && !valor.cielo.foto) throw errorConEstado("Sube la foto del cielo o elige otro tipo de cielo.");

    const pedidos = [...new Set(valor.personajes)];
    const { rows } = await pool.query("SELECT id, model_path FROM characters WHERE id = ANY($1)", [pedidos]);
    const modelo = new Map(rows.map((r) => [r.id, r.model_path]));
    for (const id of pedidos) {
        if (!modelo.has(id)) throw errorConEstado(`El personaje "${id}" no existe.`);
        if (!esGlb(modelo.get(id))) throw errorConEstado(`"${id}" no es un modelo .glb: en el mundo solo se usan .glb (pesan menos).`);
    }
    valor.personajes = pedidos;

    // ids únicos para el editor
    const vistos = new Set();
    valor.objetos.forEach((o, i) => {
        if (vistos.has(o.id)) o.id = `o${i}-${Math.random().toString(36).slice(2, 6)}`;
        vistos.add(o.id);
    });
    for (const o of valor.objetos) {
        if (o.tipo === "circulo" && o.destino && (!vistos.has(o.destino) || o.destino === o.id)) o.destino = null;
    }

    await pool.query(
        `
        INSERT INTO config_juego (clave, valor, actualizado_en)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP
        `,
        [CLAVE, JSON.stringify(valor)]
    );
    cache = valor;
    for (const fn of oyentes) Promise.resolve().then(fn).catch(() => {});
    return valor;
}
