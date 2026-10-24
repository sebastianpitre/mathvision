/* =========================================================
   PANEL · BIBLIOTECA DE SONIDOS  (/api/admin/sonidos)

   GET    /                    sonidos subidos + momentos del juego
   POST   /?nombre=x.mp3       subir (binario). Si ya existe uno
                               idéntico, se reutiliza.
   PATCH  /:id { nombre }      cambiar el nombre
   DELETE /:id                 borrar (si no se está usando)
   PUT    /momentos { momentos: { clave: { sonidoId, volumen } } }
========================================================= */

import express from "express";
import crypto from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

import { pool } from "../database/db.js";
import { ruta, errorConEstado } from "../http/ruta.js";
import { ARCHIVOS_DIR, URL_ARCHIVOS, FRONTEND_DIR, TIPOS_ARCHIVO } from "../config/archivos.js";
import { obtenerMomentos, guardarMomentos, olvidarSonidos } from "./sonidos.js";

const router = express.Router();
const TIPO = TIPOS_ARCHIVO.sonido;

const huellaDe = (datos) => crypto.createHash("sha256").update(datos).digest("hex");

/* Los sonidos de fábrica no tienen huella al crearse: se calcula
   leyendo el archivo del juego, para no subirlos repetidos. */
async function completarHuellas() {
    const { rows } = await pool.query("SELECT id, ruta FROM sonidos WHERE huella IS NULL AND de_fabrica");
    for (const s of rows) {
        try {
            const datos = await readFile(path.join(FRONTEND_DIR, s.ruta));
            await pool.query("UPDATE sonidos SET huella = $1, bytes = $2 WHERE id = $3", [huellaDe(datos), datos.length, s.id]);
        } catch {
            // No está el archivo (juego sin compilar) o es idéntico a otro: se deja sin huella.
        }
    }
}

const nombreLimpio = (texto) =>
    String(texto || "")
        .replace(/[\u0000-\u001f<>]/g, "")
        .trim()
        .slice(0, 80);

router.get(
    "/",
    ruta(async (req, res) => {
        await completarHuellas();
        const [momentos, { rows }] = await Promise.all([
            obtenerMomentos(),
            pool.query("SELECT id, nombre, ruta, bytes, de_fabrica, creado_en FROM sonidos ORDER BY de_fabrica DESC, nombre"),
        ]);

        const sonidos = rows.map((s) => ({
            ...s,
            usos: momentos.filter((m) => m.sonidoId === s.id).map((m) => m.nombre),
        }));

        res.json({ success: true, sonidos, momentos });
    })
);

router.post(
    "/",
    express.raw({ type: "application/octet-stream", limit: "11mb" }),
    ruta(async (req, res) => {
        const original = String(req.query.nombre || "");
        const extension = path.extname(original).toLowerCase();
        const datos = req.body;

        if (!TIPO.extensiones.includes(extension)) throw errorConEstado(`El archivo debe ser ${TIPO.texto}.`);
        if (!Buffer.isBuffer(datos) || datos.length === 0) throw errorConEstado("El archivo llegó vacío.");
        if (datos.length > TIPO.maxBytes) throw errorConEstado("El sonido pesa demasiado (máximo 10 MB).");
        if (!TIPO.firma(datos)) throw errorConEstado(`Ese archivo no parece ${TIPO.texto}.`);

        await completarHuellas();
        const huella = huellaDe(datos);
        const { rows: iguales } = await pool.query(
            "SELECT id, nombre, ruta, bytes, de_fabrica, creado_en FROM sonidos WHERE huella = $1",
            [huella]
        );
        if (iguales[0]) {
            return res.json({
                success: true,
                repetido: true,
                sonido: iguales[0],
                message: `Ese sonido ya estaba en la biblioteca como "${iguales[0].nombre}". Se reutiliza.`,
            });
        }

        const nombre = nombreLimpio(req.query.titulo) || nombreLimpio(path.basename(original, extension)) || "Sonido";
        const archivo = `${huella.slice(0, 16)}${extension}`;
        const carpeta = path.join(ARCHIVOS_DIR, TIPO.carpeta);
        await mkdir(carpeta, { recursive: true });
        await writeFile(path.join(carpeta, archivo), datos);

        const { rows } = await pool.query(
            `
            INSERT INTO sonidos (nombre, ruta, huella, bytes)
            VALUES ($1, $2, $3, $4)
            RETURNING id, nombre, ruta, bytes, de_fabrica, creado_en
            `,
            [nombre, `${URL_ARCHIVOS}/${TIPO.carpeta}/${archivo}`, huella, datos.length]
        );

        olvidarSonidos();
        res.status(201).json({ success: true, repetido: false, sonido: rows[0], message: `"${nombre}" se agregó a la biblioteca.` });
    })
);

router.patch(
    "/:id",
    ruta(async (req, res) => {
        const nombre = nombreLimpio(req.body?.nombre);
        if (!nombre) throw errorConEstado("Escribe un nombre.");

        const { rowCount } = await pool.query("UPDATE sonidos SET nombre = $1 WHERE id = $2", [nombre, Number(req.params.id) || 0]);
        if (!rowCount) throw errorConEstado("Ese sonido no existe.", 404);

        olvidarSonidos();
        res.json({ success: true, nombre });
    })
);

router.delete(
    "/:id",
    ruta(async (req, res) => {
        const id = Number(req.params.id) || 0;
        const { rows } = await pool.query("SELECT id, nombre, ruta, de_fabrica FROM sonidos WHERE id = $1", [id]);
        const sonido = rows[0];
        if (!sonido) throw errorConEstado("Ese sonido no existe.", 404);
        if (sonido.de_fabrica) throw errorConEstado("Los sonidos que vienen con el juego no se pueden borrar.");

        const usos = (await obtenerMomentos()).filter((m) => m.sonidoId === id).map((m) => m.nombre);
        if (usos.length) throw errorConEstado(`Se está usando en: ${usos.join(", ")}. Cámbialo primero.`);

        await pool.query("DELETE FROM sonidos WHERE id = $1", [id]);
        if (sonido.ruta.startsWith(`${URL_ARCHIVOS}/${TIPO.carpeta}/`)) {
            await unlink(path.join(ARCHIVOS_DIR, TIPO.carpeta, path.basename(sonido.ruta))).catch(() => {});
        }

        olvidarSonidos();
        res.json({ success: true });
    })
);

router.put(
    "/momentos",
    ruta(async (req, res) => {
        const momentos = await guardarMomentos(req.body?.momentos);
        res.json({ success: true, momentos });
    })
);

export default router;
