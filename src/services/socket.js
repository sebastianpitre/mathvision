import { io } from "socket.io-client";

const SOCKET_URL =
    `http://${window.location.hostname}:3000`;

export const socket = io(
    SOCKET_URL,
    {
        autoConnect: false,
    }
);