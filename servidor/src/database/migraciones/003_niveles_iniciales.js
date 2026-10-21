/* =========================================================
   003 · NIVELES INICIALES
   ---------------------------------------------------------
   Carga los bancos de preguntas que ya traía el juego
   (segundo, quinto y autoconocimiento) desde
   servidor/datos/niveles/*.json.

   Solo se cargan si todavía no hay ningún nivel, para no
   duplicar ni pisar lo que hayas creado desde el panel.
========================================================= */

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { crearNivel } from "../../niveles/nivelesService.js";
import {
    leerArchivoNivel,
    normalizarNivel,
    normalizarPreguntas,
} from "../../niveles/validarNivel.js";

const carpeta = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../datos/niveles"
);

export default async function (client) {
    const { rows } = await client.query("SELECT COUNT(*)::int AS total FROM niveles_juego");

    if (rows[0].total > 0) {
        console.log("     (ya hay niveles creados, no se cargan los iniciales)");
        return;
    }

    const archivos = (await readdir(carpeta).catch(() => []))
        .filter((nombre) => nombre.endsWith(".json"))
        .sort();

    for (const archivo of archivos) {
        const contenido = JSON.parse(await readFile(path.join(carpeta, archivo), "utf8"));
        const { datosNivel, listaPreguntas } = leerArchivoNivel(contenido);

        const { nivel, errores: erroresNivel } = normalizarNivel(datosNivel || {});
        const { preguntas, errores } = normalizarPreguntas(listaPreguntas);

        if (erroresNivel.length || errores.length || preguntas.length === 0) {
            console.log(`     ⚠️  ${archivo} tiene errores, se omite.`);
            continue;
        }

        await crearNivel(client, nivel, preguntas);
        console.log(`     + ${nivel.nombre} (${preguntas.length} preguntas)`);
    }
}
