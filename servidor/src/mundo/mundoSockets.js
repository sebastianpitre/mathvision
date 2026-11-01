/* =========================================================
   MUNDO 3D · JUGADORES EN VIVO
   ---------------------------------------------------------
   mundo:entrar   { personaje }       → entra (o cambia de personaje)
   mundo:mover    { x, z, r, andando } → su posición (unas 10 veces por segundo)
   mundo:salir
   El servidor manda a todos "mundo:jugadores" (la lista
   completa al entrar/salir) y "mundo:posiciones" (solo
   posiciones, 10 veces por segundo, si alguien se movió).
   Si un usuario abre dos pestañas, queda la última.
========================================================= */

import { pool } from "../database/db.js";
import { mundoParaJugador } from "./mundo.js";

const SALA = "mundo";
const MAXIMO = 40; // jugadores a la vez (el celular se pone lento con más)
const LIMITE = 60; // el suelo va de -60 a 60 metros
const TICK_MS = 100;

const num = (v, min, max) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};

export function crearMundo({ io }) {
    const jugadores = new Map(); // userId → { socketId, userId, nombre, personaje, x, z, r, andando }
    let cambio = false;

    const publico = (j) => ({ userId: j.userId, nombre: j.nombre, personaje: j.personaje, x: j.x, z: j.z, r: j.r, andando: j.andando });
    const enviarLista = () => io.to(SALA).emit("mundo:jugadores", { jugadores: [...jugadores.values()].map(publico) });

    setInterval(() => {
        if (!cambio || !jugadores.size) return;
        cambio = false;
        io.to(SALA).emit("mundo:posiciones", {
            p: [...jugadores.values()].map((j) => [j.userId, Math.round(j.x * 100) / 100, Math.round(j.z * 100) / 100, Math.round(j.r * 100) / 100, j.andando ? 1 : 0]),
        });
    }, TICK_MS).unref();

    function quitar(socket) {
        const j = jugadores.get(socket.userId);
        if (!j || j.socketId !== socket.id) return;
        jugadores.delete(socket.userId);
        socket.leave(SALA);
        enviarLista();
    }

    function registrar(socket) {
        socket.on("mundo:entrar", async ({ personaje } = {}) => {
            const config = await mundoParaJugador();
            const elegido = config.personajes.find((p) => p.id === String(personaje)) || config.personajes[0];
            if (!elegido) return socket.emit("mundo:error", { mensaje: "El administrador aún no eligió personajes para el mundo." });

            const ya = jugadores.get(socket.userId);
            if (!ya && jugadores.size >= MAXIMO) return socket.emit("mundo:error", { mensaje: "El mundo está lleno. Intenta en un rato." });
            if (ya && ya.socketId !== socket.id) io.sockets.sockets.get(ya.socketId)?.leave(SALA);

            const { rows } = await pool.query("SELECT display_name FROM player_profiles WHERE user_id = $1", [socket.userId]);
            jugadores.set(socket.userId, {
                socketId: socket.id,
                userId: socket.userId,
                nombre: rows[0]?.display_name || socket.username,
                personaje: elegido.id,
                x: ya?.x ?? (Math.random() - 0.5) * 6,
                z: ya?.z ?? (Math.random() - 0.5) * 6,
                r: ya?.r ?? 0,
                andando: false,
            });
            socket.join(SALA);
            socket.emit("mundo:bienvenida", { yo: socket.userId, config });
            enviarLista();
        });

        socket.on("mundo:mover", ({ x, z, r, andando } = {}) => {
            const j = jugadores.get(socket.userId);
            if (!j || j.socketId !== socket.id) return;
            j.x = num(x, -LIMITE, LIMITE);
            j.z = num(z, -LIMITE, LIMITE);
            j.r = num(r, -100, 100);
            j.andando = Boolean(andando);
            cambio = true;
        });

        socket.on("mundo:salir", () => quitar(socket));
        socket.on("disconnect", () => quitar(socket));
    }

    return { registrar, cuantos: () => jugadores.size };
}
