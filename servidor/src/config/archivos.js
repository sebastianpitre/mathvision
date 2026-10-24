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
};
