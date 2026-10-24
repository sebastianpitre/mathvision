import { API_URL } from "../../services/serverConfig.js";
import { getToken } from "../../services/api.js";

/*
 * Sube un modelo 3D (.vrm/.glb) o una foto al servidor y
 * devuelve su ruta pública ("/archivos/modelos/…").
 * alAvanzar(porcentaje) se llama mientras sube (los modelos
 * pesan varios MB).
 */
export async function subirArchivo(archivo, tipo, alAvanzar = () => {}) {
    const datos = await subirBinario(`/admin/archivos?tipo=${tipo}&nombre=${encodeURIComponent(archivo.name)}`, archivo, alAvanzar);
    if (!datos?.ruta) throw new Error("El servidor no devolvió la ruta del archivo.");
    return datos.ruta;
}

/* Envía un archivo tal cual (binario) y devuelve la respuesta del servidor. */
export function subirBinario(ruta, archivo, alAvanzar = () => {}) {
    return new Promise((resolver, rechazar) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${API_URL}${ruta}`);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        const token = getToken();
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) alAvanzar(Math.round((100 * e.loaded) / e.total));
        };

        xhr.onload = () => {
            let datos = null;
            try {
                datos = JSON.parse(xhr.responseText);
            } catch {
                // nginx puede responder HTML (por ejemplo 413).
            }
            if (xhr.status >= 200 && xhr.status < 300 && datos) return resolver(datos);
            if (xhr.status === 413) return rechazar(new Error("El archivo es muy grande para el servidor (revisa client_max_body_size en nginx)."));
            rechazar(new Error(datos?.message || `No se pudo subir el archivo (error ${xhr.status}).`));
        };

        xhr.onerror = () => rechazar(new Error("No hay conexión con el servidor."));
        xhr.send(archivo);
    });
}
