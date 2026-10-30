/* =========================================================
   CARRUSEL DE ANUNCIOS DEL LOBBY
   ---------------------------------------------------------
   Arriba a la izquierda del lobby pasan, uno tras otro, los
   anuncios que elija el administrador:
     · juego     → al tocarlo queda elegido ese juego
     · evento    → abre ese evento (sale solo mientras dure)
     · pantalla  → abre GiraGamif, la tienda, el ranking…
   Cada anuncio puede llevar foto propia o un fondo de color
   con título. Si "eventos automáticos" está activo, también
   salen los eventos activos que no estén en la lista.
   Se guarda en config_juego (clave "carrusel").
========================================================= */

import { pool } from "../database/db.js";
import { errorConEstado } from "../http/ruta.js";

const CLAVE = "carrusel";

export const PANTALLAS = {
    suerte: { ruta: "/suerte", texto: "GiraGamif" },
    eventos: { ruta: "/eventos", texto: "Eventos" },
    tienda: { ruta: "/tienda", texto: "Tienda" },
    ranking: { ruta: "/ranking", texto: "Ranking" },
    sala: { ruta: "/sala", texto: "Sala" },
    personajes: { ruta: "/character", texto: "Personajes" },
    perfil: { ruta: "/profile", texto: "Perfil" },
};

export const FONDOS = ["morado", "oro", "azul", "rojo", "verde", "noche"];
const TIPOS = ["juego", "evento", "pantalla"];
const MAX_ANUNCIOS = 12;

const POR_DEFECTO = {
    segundos: 5,
    auto_eventos: true,
    anuncios: [{ tipo: "juego", juego_id: "siglo", etiqueta: "Nuevo", titulo: "", subtitulo: "", imagen: "", fondo: "morado" }],
};

const texto = (v, max) => String(v ?? "").trim().slice(0, max);

function limpiarAnuncio(a = {}, n) {
    const tipo = TIPOS.includes(a.tipo) ? a.tipo : null;
    if (!tipo) throw errorConEstado(`Anuncio ${n}: elige qué muestra.`);
    const imagen = texto(a.imagen, 255);
    if (imagen && !imagen.startsWith("/")) throw errorConEstado(`Anuncio ${n}: la imagen debe subirse al juego.`);
    const limpio = {
        tipo,
        titulo: texto(a.titulo, 60),
        subtitulo: texto(a.subtitulo, 90),
        etiqueta: texto(a.etiqueta, 16),
        imagen,
        fondo: FONDOS.includes(a.fondo) ? a.fondo : "morado",
    };
    if (tipo === "juego") {
        limpio.juego_id = texto(a.juego_id, 40);
        if (!limpio.juego_id) throw errorConEstado(`Anuncio ${n}: elige el juego.`);
    }
    if (tipo === "evento") {
        limpio.evento_id = Math.round(Number(a.evento_id)) || null;
        if (!limpio.evento_id) throw errorConEstado(`Anuncio ${n}: elige el evento.`);
    }
    if (tipo === "pantalla") {
        limpio.pantalla = PANTALLAS[a.pantalla] ? a.pantalla : null;
        if (!limpio.pantalla) throw errorConEstado(`Anuncio ${n}: elige a dónde lleva.`);
    }
    return limpio;
}

function normalizar(v) {
    if (!v || typeof v !== "object") return structuredClone(POR_DEFECTO);
    const segundos = Math.round(Number(v.segundos));
    return {
        segundos: Number.isFinite(segundos) ? Math.min(30, Math.max(3, segundos)) : POR_DEFECTO.segundos,
        auto_eventos: v.auto_eventos !== false,
        anuncios: (Array.isArray(v.anuncios) ? v.anuncios : []).slice(0, MAX_ANUNCIOS).map((a, i) => limpiarAnuncio(a, i + 1)),
    };
}

let cache = null;

export async function configCarrusel() {
    if (cache) return cache;
    const { rows } = await pool.query("SELECT valor FROM config_juego WHERE clave = $1", [CLAVE]);
    try {
        cache = normalizar(rows[0]?.valor);
    } catch {
        cache = structuredClone(POR_DEFECTO); // algo raro guardado: se usa lo de fábrica
    }
    return cache;
}

export async function guardarCarrusel(valor) {
    if (Array.isArray(valor?.anuncios) && valor.anuncios.length > MAX_ANUNCIOS) {
        throw errorConEstado(`Máximo ${MAX_ANUNCIOS} anuncios.`);
    }
    const limpio = normalizar(valor || {});
    const ids = limpio.anuncios.filter((a) => a.tipo === "evento").map((a) => a.evento_id);
    if (ids.length) {
        const { rows } = await pool.query("SELECT id FROM eventos WHERE id = ANY($1)", [ids]);
        const hay = new Set(rows.map((r) => r.id));
        const falta = limpio.anuncios.findIndex((a) => a.tipo === "evento" && !hay.has(a.evento_id));
        if (falta >= 0) throw errorConEstado(`Anuncio ${falta + 1}: ese evento no existe.`);
    }
    await pool.query(
        `
        INSERT INTO config_juego (clave, valor, actualizado_en)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP
        `,
        [CLAVE, JSON.stringify(limpio)]
    );
    cache = limpio;
    return limpio;
}

/* Lo que ve el jugador: solo eventos en curso, con título e imagen ya puestos. */
export async function carruselPublico() {
    const config = await configCarrusel();
    const { rows: eventos } = await pool.query(
        "SELECT id, titulo, descripcion, imagen FROM eventos WHERE activo AND inicio <= NOW() AND fin > NOW() ORDER BY orden, fin"
    );
    const enCurso = new Map(eventos.map((e) => [e.id, e]));

    const anuncios = [];
    for (const [i, a] of config.anuncios.entries()) {
        // solo_imagen: la foto ya trae su texto (no se le pone título encima).
        const base = { clave: `a${i}`, tipo: a.tipo, titulo: a.titulo, subtitulo: a.subtitulo, etiqueta: a.etiqueta, imagen: a.imagen, fondo: a.fondo };
        if (a.tipo === "juego") anuncios.push({ ...base, juego_id: a.juego_id, solo_imagen: !a.titulo && !a.subtitulo });
        if (a.tipo === "pantalla") {
            anuncios.push({
                ...base,
                ruta: PANTALLAS[a.pantalla].ruta,
                titulo: a.titulo || PANTALLAS[a.pantalla].texto,
                solo_imagen: Boolean(a.imagen) && !a.titulo && !a.subtitulo,
            });
        }
        if (a.tipo === "evento") {
            const e = enCurso.get(a.evento_id);
            if (!e) continue; // terminó o aún no empieza
            const imagen = a.imagen || e.imagen || "";
            anuncios.push({
                ...base,
                evento_id: e.id,
                ruta: `/eventos?evento=${e.id}`,
                titulo: a.titulo || e.titulo,
                imagen,
                solo_imagen: Boolean(imagen) && !a.titulo && !a.subtitulo,
            });
        }
    }

    if (config.auto_eventos) {
        const puestos = new Set(config.anuncios.filter((a) => a.tipo === "evento").map((a) => a.evento_id));
        for (const e of eventos) {
            if (puestos.has(e.id)) continue;
            anuncios.push({
                clave: `e${e.id}`,
                tipo: "evento",
                evento_id: e.id,
                ruta: `/eventos?evento=${e.id}`,
                titulo: e.titulo,
                subtitulo: e.descripcion ? e.descripcion.slice(0, 90) : "",
                etiqueta: "Evento",
                imagen: e.imagen || "",
                solo_imagen: Boolean(e.imagen),
                fondo: "oro",
            });
        }
    }

    return { segundos: config.segundos, anuncios };
}
