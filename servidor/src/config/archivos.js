/* =========================================================
   ARCHIVOS SUBIDOS DESDE EL PANEL (modelos 3D y fotos)
   ---------------------------------------------------------
   Se guardan en ARCHIVOS_DIR (en Docker es un volumen, así
   sobreviven a las actualizaciones) y se sirven en /archivos.
========================================================= */

import path from "node:path";
import { fileURLToPath } from "node:url";

export const ARCHIVOS_DIR =
    process.env.ARCHIVOS_DIR ||
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../archivos");

export const URL_ARCHIVOS = "/archivos";

// Donde está el juego ya compilado (para leer los sonidos que trae).
export const FRONTEND_DIR =
    process.env.FRONTEND_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../dist");

export const TIPOS_ARCHIVO = {
    modelo: {
        carpeta: "modelos",
        extensiones: [".vrm", ".glb"],
        maxBytes: 60 * 1024 * 1024,
        // Los modelos .vrm y .glb empiezan con "glTF".
        firma: (b) => b.length > 4 && b.toString("ascii", 0, 4) === "glTF",
        texto: "un modelo .vrm o .glb",
    },
    foto: {
        carpeta: "fotos",
        extensiones: [".png", ".jpg", ".jpeg", ".webp"],
        maxBytes: 3 * 1024 * 1024,
        firma: (b) =>
            (b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") ||
            (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
            (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP"),
        texto: "una imagen .png, .jpg o .webp",
    },
    sonido: {
        carpeta: "sonidos",
        extensiones: [".mp3", ".ogg", ".wav", ".m4a"],
        maxBytes: 10 * 1024 * 1024,
        firma: (b) =>
            b.length > 12 &&
            (b.toString("ascii", 0, 3) === "ID3" || // mp3 con etiquetas
                (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) || // mp3 sin etiquetas
                b.toString("ascii", 0, 4) === "OggS" ||
                (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WAVE") ||
                b.toString("ascii", 4, 8) === "ftyp"), // m4a
        texto: "un sonido .mp3, .ogg, .wav o .m4a",
    },
};
