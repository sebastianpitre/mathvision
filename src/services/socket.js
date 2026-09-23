import { io } from "socket.io-client";

const SOCKET_URL =
    `http://${window.location.hostname}:3000`;

const TOKEN_KEY =
    "mathvision_token";


export const socket = io(
    SOCKET_URL,
    {
        autoConnect: false,

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