/* =========================================================
   MUNDO 3D (lobby para caminar) · DISEÑO
   ---------------------------------------------------------
   Se guarda en config_juego (clave "mundo"):
     cielo   { tipo: color | degradado | foto, color, arriba, horizonte, foto }
     suelo   { color, textura, baldosa (metros que ocupa la foto), material }
     materiales [{ id, nombre, tipo: color | imagen, color, textura, baldosa, transparente }]
             texturas guardadas que se reutilizan: si se cambia una,
             cambian todos los objetos que la usan.
     luz     dia | tarde | noche
     personajes  ids de personajes .glb que se pueden usar (cada jugador
             solo ve los que tiene)
     modelos [{ id, nombre, ruta (.glb), ancho, alto, largo }]  "mis objetos":
             modelos 3D que sube el admin y se reutilizan
     tamano  mitad del lado del suelo en metros (60 → de -60 a 60)
     controles { tamanos: { joystick, saltar, … }, teclas: { adelante: "KeyW", … },
               posiciones: { boton: { x, y } } (% de la pantalla, el centro del botón),
               joystick: "flotante" (sale donde toques) | "fijo" }
     objetos [{ id, nombre, tipo, x, z, y, rot, incl, ancho, alto, largo,
               material | color, textura, baldosa, …propios del tipo }]
   Tipos de objeto: caja, pared, plataforma (para brincar),
   columna, arbol, cuadro (una foto colgada, como un mural) y
   circulo (función "juego": cada "segundos" arma una partida del
   "juego" con los que estén adentro; función "teletransporte": al
   tocar USAR lleva al círculo "destino"), salon (4 paredes que se
   mueven juntas, de "grosor") y escalera ("peldanos"; "flotante"
   = solo los peldaños, sin relleno). "incl" inclina la pieza
   (rampas, paredes inclinadas). Además: baranda (palitos cada
   "separacion" metros y un pasamanos), modelo (un objeto de "mis
   objetos"; "solido" = no se atraviesa). "fijo" = no se mueve en el
   editor por accidente. El salón puede tener "paredes": una
   textura distinta por pared (fondo, frente, izquierda, derecha).
   cancha: minijuego azul vs rojo (ver cancha.js): "deporte" (basquet |
   futbol), "sonidos" { acción: { ruta, volumen } }, "balon" (id de
   "mis objetos" o "" = balón normal), "tamBalon", "minutos",
   "maxEquipo", "cestas" [{ x, z, y, radio }] y "entradas" [{ x, z }]
   relativas al centro de la cancha. ranking: tabla con los "top"
   mejores de la temporada y la skin del primero con su corona.
========================================================= */

import { pool } from "../database/db.js";
import { errorConEstado } from "../http/ruta.js";
import { JUEGOS_SALA } from "../salas/juegos.js";

const CLAVE = "mundo";
const COLOR = /^#[0-9a-f]{6}$/i;
export const LIMITE = 60; // el suelo va de -60 a 60 metros (se puede agrandar: "tamano")
export const LIMITE_MAX = 150;
export const MAX_MODELOS = 100;
export const MAX_OBJETOS = 300;
export const TIPOS_OBJETO = ["caja", "pared", "plataforma", "columna", "arbol", "cuadro", "circulo", "salon", "escalera", "baranda", "modelo", "cancha", "ranking"];
export const FUNCIONES_CIRCULO = ["juego", "teletransporte"];
export const MAX_MATERIALES = 60;
export const LUCES = ["dia", "tarde", "noche"];

export const esGlb = (ruta) => /\.glb$/i.test(String(ruta || ""));
const esModelo = (r) => typeof r === "string" && /^\/archivos\/modelos\/[\w\-.]+\.glb$/i.test(r) && !r.includes("..");
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
    baranda: { ancho: 4, alto: 1, largo: 0.1, color: "#cbd5e1" },
    modelo: { ancho: 1, alto: 1, largo: 1, color: "#ffffff" },
    cancha: { ancho: 14, alto: 0.05, largo: 24, color: "#c2410c" },
    ranking: { ancho: 5, alto: 3.2, largo: 3, color: "#1e293b" },
};

/* Controles del mundo (los pone el admin para todos). */
export const ACCIONES = ["adelante", "atras", "izquierda", "derecha", "correr", "correrSolo", "saltar", "agarrar", "usar", "hablar", "escribir", "mirar"];
export const BOTONES = ["joystick", "saltar", "correr", "agarrar", "hablar", "escribir", "usar"];
/* Dónde va cada botón en el celular: % del ancho y del alto (centro del botón). */
export const POSICIONES_POR_DEFECTO = {
    joystick: { x: 15, y: 72 },
    escribir: { x: 70, y: 60 },
    agarrar: { x: 80, y: 58 },
    hablar: { x: 91, y: 56 },
    correr: { x: 79, y: 84 },
    saltar: { x: 91, y: 82 },
    usar: { x: 50, y: 24 },
};

export const CONTROLES_POR_DEFECTO = {
    tamanos: { joystick: 1, saltar: 1, correr: 1, agarrar: 1, hablar: 1, escribir: 1, usar: 1 },
    teclas: {
        adelante: "KeyW",
        atras: "KeyS",
        izquierda: "KeyA",
        derecha: "KeyD",
        correr: "ShiftLeft",
        correrSolo: "KeyR",
        saltar: "Space",
        agarrar: "KeyE",
        usar: "KeyF",
        hablar: "KeyV",
        escribir: "Enter",
        mirar: "KeyZ",
    },
};

function limpiarControles(c = {}) {
    const tamanos = {};
    for (const b of BOTONES) tamanos[b] = num(c.tamanos?.[b], 0.6, 1.8, 1);
    const teclas = {};
    const usadas = new Set();
    for (const a of ACCIONES) {
        const t = String(c.teclas?.[a] || "");
        const valida = /^[A-Za-z0-9]{1,20}$/.test(t) && !usadas.has(t) ? t : CONTROLES_POR_DEFECTO.teclas[a];
        teclas[a] = usadas.has(valida) ? "" : valida;
        if (teclas[a]) usadas.add(teclas[a]);
    }
    const posiciones = {};
    for (const b of BOTONES) {
        const p = c.posiciones?.[b] || {};
        const d = POSICIONES_POR_DEFECTO[b];
        posiciones[b] = { x: num(p.x, 3, 97, d.x), y: num(p.y, 8, 96, d.y) };
    }
    return { tamanos, teclas, posiciones, joystick: c.joystick === "fijo" ? "fijo" : "flotante" };
}

function limpiarModelo(m = {}, i) {
    return {
        id: textoCorto(m.id || `mo${i}`, 24) || `mo${i}`,
        nombre: textoCorto(m.nombre, 40) || `Objeto ${i + 1}`,
        ruta: m.ruta,
        ancho: num(m.ancho, 0.01, 200, 1),
        alto: num(m.alto, 0.01, 200, 1),
        largo: num(m.largo, 0.01, 200, 1),
    };
}

/* Textura propia de una pared del salón (o null = la del salón). */
function limpiarPared(p) {
    if (!p || typeof p !== "object") return null;
    return { material: p.material ? textoCorto(p.material, 24) : null, color: color(p.color, "#ffffff") };
}

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
        // PNG con partes transparentes (rejas, hojas…): se ve a través.
        transparente: Boolean(m.transparente),
    };
}

function limpiarObjeto(o = {}, i, limite = LIMITE) {
    const tipo = TIPOS_OBJETO.includes(o.tipo) ? o.tipo : "caja";
    const base = PIEZAS[tipo];
    const LIMITE = limite;
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
        fijo: Boolean(o.fijo),
        ...(tipo === "salon"
            ? { grosor: num(o.grosor, 0.05, 2, 0.25), paredes: [0, 1, 2, 3].map((k) => limpiarPared(Array.isArray(o.paredes) ? o.paredes[k] : null)) }
            : {}),
        ...(tipo === "baranda" ? { separacion: num(o.separacion, 0.08, 3, 0.4), grueso: num(o.grueso, 0.02, 0.4, 0.06) } : {}),
        ...(tipo === "modelo" ? { modelo: textoCorto(o.modelo, 24), solido: o.solido !== false } : {}),
        ...(tipo === "escalera" ? { peldanos: Math.round(num(o.peldanos, 2, 60, 12)), flotante: Boolean(o.flotante) } : {}),
        ...(tipo === "cancha" ? limpiarCancha(o, num(o.ancho, 0.1, 60, base.ancho), num(o.largo, 0.05, 60, base.largo)) : {}),
        ...(tipo === "ranking" ? { top: Math.round(num(o.top, 3, 10, 5)) } : {}),
    };
}

/* Sonidos de la cancha: acción → sonido de fábrica. El admin los cambia por cancha. */
export const ACCIONES_CANCHA = ["anota", "palo", "tomar", "robar", "pase", "rebote", "falta", "entrar", "inicio", "fin"];
const esSonido = (r) => typeof r === "string" && /^\/(archivos\/sonidos|sounds)\/[\w\-./]+\.(mp3|ogg|wav|m4a)$/i.test(r) && !r.includes("..");

function limpiarSonidos(v = {}) {
    const fuera = {};
    for (const a of ACCIONES_CANCHA) {
        const x = v?.[a];
        if (!x || typeof x !== "object") continue; // sin elegir: el de fábrica
        fuera[a] = { ruta: esSonido(x.ruta) ? x.ruta : null, volumen: Math.round(num(x.volumen, 0, 100, 80)) };
    }
    return fuera;
}

/* Cestas (o porterías en fútbol) y bolas de entrada por defecto (relativas al centro de la cancha). */
export function partesCancha(ancho, largo, deporte = "basquet") {
    const cestas =
        deporte === "futbol"
            ? [
                  { x: 0, z: -(largo / 2 - 0.6), y: 2.2, radio: 2.5 },
                  { x: 0, z: largo / 2 - 0.6, y: 2.2, radio: 2.5 },
              ]
            : [
                  { x: 0, z: -(largo / 2 - 2.5), y: 3.2, radio: 0.8 },
                  { x: 0, z: largo / 2 - 2.5, y: 3.2, radio: 0.8 },
              ];
    return {
        cestas,
        entradas: [
            { x: ancho / 2 + 3, z: -2.5 },
            { x: ancho / 2 + 3, z: 2.5 },
        ],
    };
}

function limpiarCancha(o, ancho, largo) {
    const deporte = o.deporte === "futbol" ? "futbol" : "basquet";
    const d = partesCancha(ancho, largo, deporte);
    const cestas = [0, 1].map((i) => {
        const k = (Array.isArray(o.cestas) && o.cestas[i]) || d.cestas[i];
        return {
            x: num(k.x, -ancho / 2, ancho / 2, d.cestas[i].x),
            z: num(k.z, -largo / 2, largo / 2, d.cestas[i].z),
            y: num(k.y, 1, 12, d.cestas[i].y),
            radio: num(k.radio, 0.3, 6, d.cestas[i].radio),
        };
    });
    const entradas = [0, 1].map((i) => {
        const k = (Array.isArray(o.entradas) && o.entradas[i]) || d.entradas[i];
        return { x: num(k.x, -ancho / 2 - 20, ancho / 2 + 20, d.entradas[i].x), z: num(k.z, -largo / 2 - 20, largo / 2 + 20, d.entradas[i].z) };
    });
    return {
        deporte,
        sonidos: limpiarSonidos(o.sonidos),
        balon: o.balon ? textoCorto(o.balon, 24) : "",
        tamBalon: num(o.tamBalon, 0.2, 2, 0.6),
        minutos: Math.round(num(o.minutos, 1, 30, 5)),
        maxEquipo: Math.round(num(o.maxEquipo, 1, 10, 5)),
        cestas,
        entradas,
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
        modelos: (Array.isArray(v.modelos) ? v.modelos : []).filter((m) => esModelo(m?.ruta)).slice(0, MAX_MODELOS).map(limpiarModelo),
        tamano: [60, 80, 100, 150].includes(Number(v.tamano)) ? Number(v.tamano) : LIMITE,
        controles: limpiarControles(v.controles),
        luz: LUCES.includes(v.luz) ? v.luz : "dia",
        personajes: Array.isArray(v.personajes) ? v.personajes.map(String).slice(0, 50) : [],
        objetos: (Array.isArray(v.objetos) ? v.objetos : [])
            .slice(0, MAX_OBJETOS)
            .map((o, i) => limpiarObjeto(o, i, [60, 80, 100, 150].includes(Number(v.tamano)) ? Number(v.tamano) : LIMITE)),
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

/*
 * Lo que ve el jugador: el diseño y los personajes que puede usar:
 * los permitidos en el mundo que ese jugador TIENE (comprados,
 * ganados, gratis o el inicial). Sin userId: todos los permitidos.
 */
export async function mundoParaJugador(userId = null) {
    const c = await configMundo();
    const { rows } = await pool.query(
        `
        SELECT c.id, c.name AS nombre, c.model_path AS modelo, c.thumbnail_path AS foto,
               ($2::int IS NULL OR c.is_default OR (c.precio_oro = 0 AND c.precio_diamantes = 0)
                OR EXISTS (SELECT 1 FROM personajes_jugador pj WHERE pj.user_id = $2 AND pj.character_id = c.id)) AS lo_tiene
        FROM characters c
        WHERE c.id = ANY($1)
        `,
        [c.personajes, userId]
    );
    const orden = new Map(c.personajes.map((id, i) => [id, i]));
    const todos = rows.filter((p) => esGlb(p.modelo)).sort((a, b) => orden.get(a.id) - orden.get(b.id));
    const limpio = ({ lo_tiene: _t, ...p }) => p;
    return {
        ...c,
        // Para elegir: solo los que tiene. Para dibujar a los demás: todos los del mundo.
        personajes: todos.filter((p) => p.lo_tiene).map(limpio),
        personajesMundo: todos.map(limpio),
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
    for (const o of valor.objetos) {
        if (o.material && !idsMat.has(o.material)) o.material = null;
        for (const p of o.paredes || []) if (p?.material && !idsMat.has(p.material)) p.material = null;
    }
    // "Mis objetos": ids únicos; los objetos que usan uno que ya no existe se quitan.
    const idsMod = new Set();
    valor.modelos.forEach((m, i) => {
        if (idsMod.has(m.id)) m.id = `mo${i}-${Math.random().toString(36).slice(2, 6)}`;
        idsMod.add(m.id);
    });
    valor.objetos = valor.objetos.filter((o) => o.tipo !== "modelo" || idsMod.has(o.modelo));
    for (const o of valor.objetos) if (o.tipo === "cancha" && o.balon && !idsMod.has(o.balon)) o.balon = "";
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
