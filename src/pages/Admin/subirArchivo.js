import { API_URL } from "../../services/serverConfig.js";
import { getToken } from "../../services/api.js";

/*
 * Sube un modelo 3D (.vrm/.glb) o una foto al servidor y
 * devuelve su ruta pública ("/archivos/modelos/…").
 * alAvanzar(porcentaje) se llama mientras sube (los modelos
 * pesan varios MB).
 */
export function subirArchivo(archivo, tipo, alAvanzar = () => {}) {
    return new Promise((resolver, rechazar) => {
        const xhr = new XMLHttpRequest();
        const url = `${API_URL}/admin/archivos?tipo=${tipo}&nombre=${encodeURIComponent(archivo.name)}`;

        xhr.open("POST", url);
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
            if (xhr.status >= 200 && xhr.status < 300 && datos?.ruta) return resolver(datos.ruta);
            if (xhr.status === 413) return rechazar(new Error("El archivo es muy grande para el servidor (revisa client_max_body_size en nginx)."));
            rechazar(new Error(datos?.message || `No se pudo subir el archivo (error ${xhr.status}).`));
        };

        xhr.onerror = () => rechazar(new Error("No hay conexión con el servidor."));
        xhr.send(archivo);
    });
}
