const API_URL =
    `http://${window.location.hostname}:3000/api`;

const TOKEN_KEY =
    "mathvision_token";


// ============================================================
// REQUEST
// ============================================================

async function request(
    endpoint,
    options = {}
) {

    let response;

    try {

        response =
            await fetch(
                `${API_URL}${endpoint}`,
                {
                    headers: {
                        "Content-Type":
                            "application/json",

                        ...(options.headers || {}),
                    },

                    ...options,
                }
            );

    } catch (error) {

        const networkError =
            new Error(
                "No fue posible conectar con el servidor."
            );

        networkError.code =
            "NETWORK_ERROR";

        throw networkError;

    }


    let data = null;


    try {

        data =
            await response.json();

    } catch {

        data = null;

    }


    if (!response.ok) {

        const error =
            new Error(
                data?.message ||
                "Error en la solicitud"
            );

        error.status =
            response.status;

        throw error;

    }


    return data;
}


// ============================================================
// REGISTRO
// ============================================================

export async function register(
    username,
    email,
    password
) {

    const data =
        await request(
            "/auth/register",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        username,
                        email,
                        password,
                    }),
            }
        );


    if (data.token) {

        saveSession(
            data.token
        );

    }


    return data;
}


// ============================================================
// LOGIN
// ============================================================

export async function login(
    username,
    password
) {

    const data =
        await request(
            "/auth/login",
            {
                method: "POST",

                body:
                    JSON.stringify({
                        username,
                        password,
                    }),
            }
        );


    if (data.token) {

        saveSession(
            data.token
        );

    }


    return data;
}


// ============================================================
// SESIÓN
// ============================================================

export function saveSession(
    token
) {

    if (!token) {
        return;
    }


    localStorage.setItem(
        TOKEN_KEY,
        token
    );

}


export function getToken() {

    return localStorage.getItem(
        TOKEN_KEY
    );

}


export async function getSession() {

    const token =
        getToken();


    if (!token) {

        return null;

    }


    try {

        const data =
            await request(
                "/auth/me",
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );


        return data.user;


    } catch (error) {

        /*
         * SOLO eliminamos el JWT cuando el servidor
         * confirma que la autenticación ya no es válida.
         */

        if (
            error.status === 401 ||
            error.status === 403
        ) {

            console.warn(
                "⚠️ JWT inválido o expirado. Cerrando sesión."
            );

            logout();

            return null;

        }


        /*
         * Error temporal de red/servidor.
         *
         * NO borrar el JWT.
         */

        console.warn(
            "⚠️ No se pudo comprobar la sesión temporalmente:",
            error.message
        );


        /*
         * Conservamos el token.
         *
         * La próxima carga podrá volver a comprobarlo.
         */

        return null;

    }

}


// ============================================================
// LOGOUT
// ============================================================

export function logout() {

    localStorage.removeItem(
        TOKEN_KEY
    );

}