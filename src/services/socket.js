import { io } from "socket.io-client";
import { SERVER_URL } from "./serverConfig.js";

const TOKEN_KEY =
    "mathvision_token";


export const socket = io(
    SERVER_URL,
    {
        autoConnect: false,

        // WebSocket primero; si falla, usa polling.
        transports: [
            "websocket",
            "polling",
        ],

        auth: (cb) => {

            const token =
                localStorage.getItem(
                    TOKEN_KEY
                );

            cb({
                token,
            });
        },
    }
);