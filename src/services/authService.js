// ============================================================
// LUDOGAMIF · SESIÓN (registro, login, sesión actual)
// ============================================================

import { api, getToken, TOKEN_KEY } from "./api.js";

export { getToken };

export function saveSession(token) {
    if (!token) return;

    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch {
        // Navegador sin almacenamiento (modo privado estricto).
    }
}

export function logout() {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch {
        // Nada que borrar.
    }
}

export async function register(username, email, password) {
    const data = await api("/auth/register", {
        metodo: "POST",
        auth: false,
        body: { username, email, password },
    });

    saveSession(data.token);
    return data;
}

export async function login(username, password) {
    const data = await api("/auth/login", {
        metodo: "POST",
        auth: false,
        body: { username, password },
    });

    saveSession(data.token);
    return data;
}

/*
 * Perfil del usuario con sesión. Solo se borra el token si el
 * servidor dice que ya no es válido (401/403); si es un
 * problema de red, se conserva para reintentar luego.
 */
export async function getSession() {
    if (!getToken()) return null;

    try {
        const data = await api("/auth/me");
        return data.user;
    } catch (error) {
        if (error.status === 401 || error.status === 403) {
            logout();
        } else {
            console.warn("No se pudo comprobar la sesión:", error.message);
        }

        return null;
    }
}
