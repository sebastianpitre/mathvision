// ============================================================
// LUDOGAMIF · PETICIONES A LA API
// ------------------------------------------------------------
// Un solo lugar para hablar con el servidor: agrega el token,
// convierte el cuerpo a JSON y devuelve errores con mensajes
// en español que se pueden mostrar al jugador.
//
//   const datos = await api("/niveles");
//   await api("/partidas", { metodo: "POST", body: { nivel_id: 3 } });
// ============================================================

import { API_URL } from "./serverConfig.js";

export const TOKEN_KEY = "mathvision_token";

export function getToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export async function api(ruta, { metodo = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    const token = auth ? getToken() : null;

    if (token) headers.Authorization = `Bearer ${token}`;

    let respuesta;

    try {
        respuesta = await fetch(`${API_URL}${ruta}`, {
            method: metodo,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        const error = new Error("No hay conexión con el servidor. Revisa tu internet.");
        error.code = "NETWORK_ERROR";
        throw error;
    }

    // Si el servidor no respondió JSON (502 de nginx, etc.)
    const datos = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
        const error = new Error(
            datos?.message ||
            (respuesta.status >= 500
                ? "El servidor tuvo un problema. Intenta de nuevo en un momento."
                : `Error ${respuesta.status}`)
        );
        error.status = respuesta.status;
        error.errores = datos?.errores || [];
        throw error;
    }

    return datos;
}
