/* =========================================================
   VALIDAR NIVELES Y PREGUNTAS
   ---------------------------------------------------------
   Lo usan el panel de administración (al adjuntar un JSON)
   y la carga inicial de niveles. Acepta varios formatos
   para que sirvan los archivos que ya tienes:

   1) Un arreglo de preguntas:
        [ { "pregunta": "...", "opciones": [...], "respuesta": 1 } ]

   2) Un objeto con el nivel y sus preguntas:
        { "nivel": { "nombre": "...", ... }, "preguntas": [ ... ] }

   En cada pregunta se aceptan estos nombres de campo:
     texto:     pregunta | question | texto
     opciones:  opciones | options
     respuesta: respuesta | correctAnswer | respuesta_correcta
                → número (desde 0), letra ("A", "B"...) o el
                  texto exacto de la opción correcta.
     explicación (opcional): explicacion | explanation
========================================================= */

export const DIFICULTADES = ["facil", "media", "dificil"];
export const TIPOS_RECOMPENSA = ["completar", "puntos"];

// Valores por defecto según la dificultad. El panel los
// propone al crear un nivel; el administrador puede cambiarlos.
export const RECOMPENSAS_SUGERIDAS = {
    facil: { recompensa_xp: 30, recompensa_oro: 10, recompensa_diamantes: 0 },
    media: { recompensa_xp: 50, recompensa_oro: 20, recompensa_diamantes: 0 },
    dificil: { recompensa_xp: 80, recompensa_oro: 35, recompensa_diamantes: 1 },
};

const MAX_PREGUNTAS = 500;

const ALIAS_DIFICULTAD = {
    facil: "facil", fácil: "facil", easy: "facil",
    media: "media", medio: "media", medium: "media", normal: "media",
    dificil: "dificil", difícil: "dificil", hard: "dificil", expert: "dificil", experto: "dificil",
};

function texto(valor, max) {
    return String(valor ?? "").trim().slice(0, max);
}

function entero(valor, porDefecto, min, max) {
    const numero = Number(valor);

    if (valor === undefined || valor === null || valor === "" || !Number.isFinite(numero)) {
        return porDefecto;
    }

    return Math.min(max, Math.max(min, Math.round(numero)));
}

/* ---------------------------------------------------------
   PREGUNTAS
--------------------------------------------------------- */

function resolverRespuesta(respuesta, opciones) {
    if (typeof respuesta === "number" && Number.isInteger(respuesta)) {
        return respuesta;
    }

    const valor = String(respuesta ?? "").trim();

    if (/^\d+$/.test(valor)) {
        return Number(valor);
    }

    // Letra: A, B, C...
    if (/^[a-z]$/i.test(valor)) {
        return valor.toUpperCase().charCodeAt(0) - 65;
    }

    // Texto exacto de la opción.
    return opciones.findIndex(
        (opcion) => opcion.toLowerCase() === valor.toLowerCase()
    );
}

export function normalizarPreguntas(lista) {
    const preguntas = [];
    const errores = [];

    if (!Array.isArray(lista)) {
        return {
            preguntas,
            errores: [{ fila: 0, mensaje: "No se encontró la lista de preguntas." }],
        };
    }

    if (lista.length > MAX_PREGUNTAS) {
        errores.push({ fila: 0, mensaje: `Máximo ${MAX_PREGUNTAS} preguntas por nivel.` });
    }

    lista.slice(0, MAX_PREGUNTAS).forEach((item, posicion) => {
        const fila = posicion + 1;

        if (!item || typeof item !== "object") {
            errores.push({ fila, mensaje: "No es una pregunta válida." });
            return;
        }

        const enunciado = texto(item.pregunta ?? item.question ?? item.texto, 1000);

        const opcionesOriginales = item.opciones ?? item.options;

        const opciones = Array.isArray(opcionesOriginales)
            ? opcionesOriginales.map((opcion) => texto(opcion, 300)).filter(Boolean)
            : [];

        const respuesta = resolverRespuesta(
            item.respuesta ?? item.correctAnswer ?? item.respuesta_correcta,
            opciones
        );

        if (!enunciado) {
            errores.push({ fila, mensaje: "Falta el texto de la pregunta." });
            return;
        }

        if (opciones.length < 2 || opciones.length > 6) {
            errores.push({ fila, mensaje: "Debe tener entre 2 y 6 opciones." });
            return;
        }

        if (!Number.isInteger(respuesta) || respuesta < 0 || respuesta >= opciones.length) {
            errores.push({
                fila,
                mensaje: "La respuesta correcta no coincide con ninguna opción.",
            });
            return;
        }

        preguntas.push({
            texto: enunciado,
            opciones,
            respuesta_correcta: respuesta,
            explicacion: texto(item.explicacion ?? item.explanation, 1000) || null,
            orden: preguntas.length,
        });
    });

    return { preguntas, errores };
}

/* ---------------------------------------------------------
   DATOS DEL NIVEL
--------------------------------------------------------- */

export function normalizarNivel(datos = {}) {
    const errores = [];

    const dificultad =
        ALIAS_DIFICULTAD[texto(datos.dificultad, 20).toLowerCase()] || "media";

    const sugeridas = RECOMPENSAS_SUGERIDAS[dificultad];

    const nivel = {
        nombre: texto(datos.nombre, 120),
        descripcion: texto(datos.descripcion, 500) || null,
        grado: texto(datos.grado, 40),
        asignatura: texto(datos.asignatura, 80),
        dificultad,
        preguntas_por_partida: entero(datos.preguntas_por_partida, 10, 1, 50),
        segundos_por_pregunta: entero(datos.segundos_por_pregunta, 30, 0, 600),
        vidas: entero(datos.vidas, 3, 1, 10),
        tipo_recompensa: TIPOS_RECOMPENSA.includes(datos.tipo_recompensa)
            ? datos.tipo_recompensa
            : "puntos",
        recompensa_xp: entero(datos.recompensa_xp, sugeridas.recompensa_xp, 0, 5000),
        recompensa_oro: entero(datos.recompensa_oro, sugeridas.recompensa_oro, 0, 5000),
        recompensa_diamantes: entero(datos.recompensa_diamantes, sugeridas.recompensa_diamantes, 0, 500),
        porcentaje_minimo: entero(datos.porcentaje_minimo, 50, 0, 100),
        puntos_por_acierto: entero(datos.puntos_por_acierto, 100, 1, 100000),
        max_recompensas_diarias: entero(datos.max_recompensas_diarias, 5, 0, 1000),
        activo: datos.activo === undefined ? true : Boolean(datos.activo),
        orden: entero(datos.orden, 0, -10000, 10000),
    };

    if (!nivel.nombre) errores.push({ fila: 0, mensaje: "El nombre del nivel es obligatorio." });
    if (!nivel.grado) errores.push({ fila: 0, mensaje: "El grado es obligatorio." });
    if (!nivel.asignatura) errores.push({ fila: 0, mensaje: "La asignatura es obligatoria." });

    return { nivel, errores };
}

/* ---------------------------------------------------------
   ARCHIVO COMPLETO (objeto o arreglo)
--------------------------------------------------------- */

export function leerArchivoNivel(contenido) {
    if (Array.isArray(contenido)) {
        return { datosNivel: null, listaPreguntas: contenido };
    }

    if (contenido && typeof contenido === "object") {
        return {
            datosNivel: contenido.nivel ?? null,
            listaPreguntas: contenido.preguntas ?? contenido.questions ?? null,
        };
    }

    return { datosNivel: null, listaPreguntas: null };
}
