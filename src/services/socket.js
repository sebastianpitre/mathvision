import { io } from "socket.io-client";

import { SERVER_URL } from "./serverConfig.js";
import { getToken } from "./api.js";

/*
 * Conexión en tiempo real (Mundo, invitaciones, Triqui).
 * Sin SERVER_URL se conecta al mismo dominio del juego.
 * No se conecta sola: cada pantalla llama socket.connect()
 * cuando la necesita.
 */
export const socket = io(SERVER_URL || undefined, {
    autoConnect: false,

    // WebSocket primero; si la red lo bloquea, usa polling.
    transports: ["websocket", "polling"],

    // El token se lee en cada conexión, así un cambio de
    // usuario se refleja sin recargar la página.
    auth: (cb) => cb({ token: getToken() }),
});
