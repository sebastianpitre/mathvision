/* =========================================================
   MUNDO 3D · JUGADORES EN VIVO
   ---------------------------------------------------------
   Navegador → servidor
     mundo:entrar   { personaje }            entra (o cambia de personaje)
     mundo:mover    { x, y, z, r, andando }  10 veces por segundo
                    andando: 0 quieto · 1 camina · 2 corre
     mundo:gesto    { gesto }                saludar…
     mundo:decir    { texto }                globo encima del jugador
     mundo:hablar / mundo:audio / mundo:callar   micrófono
     mundo:salir
   Servidor → navegador
     mundo:jugadores   lista completa (al entrar/salir/cambiar)
     mundo:posiciones  [userId, x, y, z, r, andando] (10 por segundo)
     mundo:gesto, mundo:dicho, mundo:hablando, mundo:audio
     mundo:diseno      el admin cambió el mundo

   Los mensajes NO se guardan en ningún lado: solo se
   reenvían y desaparecen. La voz se oye solo cerca (RADIO_VOZ).
========================================================= */

import { pool } from "../database/db.js";
import { obtenerConfigVoz, permisoVoz } from "../voz/voz.js";
import { alCambiarMundo, mundoParaJugador, LIMITE } from "./mundo.js";
import { limpiarMensaje } from "./filtro.js";

const SALA = "mundo";
const MAXIMO = 40; // jugadores a la vez (el celular se pone lento con más)
const TICK_MS = 100;
const RADIO_VOZ = 22; // metros: más lejos no se oye
const PAUSA_MENSAJE_MS = 1500;
const PAUSA_GESTO_MS = 1500;
const GESTOS = ["saludar"];
const MAX_BYTES_AUDIO = 24 * 1024;

const num = (v, min, max) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};
const r2 = (n) => Math.round(n * 100) / 100;

export function crearMundo({ io }) {
    const jugadores = new Map(); // userId → { socketId, userId, nombre, personaje, x, y, z, r, andando, habla }
    let cambio = false;

    const publico = (j) => ({ userId: j.userId, nombre: j.nombre, personaje: j.personaje, x: j.x, y: j.y, z: j.z, r: j.r, andando: j.andando });
    const enviarLista = () => io.to(SALA).emit("mundo:jugadores", { jugadores: [...jugadores.values()].map(publico) });
    const hablando = () => io.to(SALA).emit("mundo:hablando", { ids: [...jugadores.values()].filter((j) => j.habla).map((j) => j.userId) });

    setInterval(() => {
        const ahora = Date.now();
        // Se acabó el tiempo de hablar de alguien.
        let corte = false;
        for (const j of jugadores.values()) {
            if (j.habla && ahora > j.habla.hasta) {
                j.habla = null;
                j.ultimaVoz = ahora;
                corte = true;
            }
        }
        if (corte) hablando();

        if (!cambio || !jugadores.size) return;
        cambio = false;
        io.to(SALA).emit("mundo:posiciones", {
            p: [...jugadores.values()].map((j) => [j.userId, r2(j.x), r2(j.y), r2(j.z), r2(j.r), j.andando]),
        });
    }, TICK_MS).unref();

    // El admin guardó el mundo: todos lo ven sin salir.
    alCambiarMundo(async () => {
        if (!jugadores.size) return;
        io.to(SALA).emit("mundo:diseno", { config: await mundoParaJugador() });
    });

    function quitar(socket) {
        const j = jugadores.get(socket.userId);
        if (!j || j.socketId !== socket.id) return;
        jugadores.delete(socket.userId);
        socket.leave(SALA);
        enviarLista();
        if (j.habla) hablando();
    }

    const mio = (socket) => {
        const j = jugadores.get(socket.userId);
        return j && j.socketId === socket.id ? j : null;
    };

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
                y: ya?.y ?? 0,
                z: ya?.z ?? (Math.random() - 0.5) * 6,
                r: ya?.r ?? 0,
                andando: 0,
                habla: null,
                ultimaVoz: ya?.ultimaVoz || 0,
            });
            socket.join(SALA);
            const voz = await obtenerConfigVoz();
            socket.emit("mundo:bienvenida", { yo: socket.userId, config, voz: { segundos: voz.segundos, espera: voz.espera } });
            enviarLista();
        });

        socket.on("mundo:mover", ({ x, y, z, r, andando } = {}) => {
            const j = mio(socket);
            if (!j) return;
            j.x = num(x, -LIMITE, LIMITE);
            j.y = num(y, 0, 40);
            j.z = num(z, -LIMITE, LIMITE);
            j.r = num(r, -100, 100);
            j.andando = Math.round(num(andando, 0, 2));
            cambio = true;
        });

        socket.on("mundo:gesto", ({ gesto } = {}) => {
            const j = mio(socket);
            if (!j || !GESTOS.includes(gesto)) return;
            const ahora = Date.now();
            if (ahora - (j.ultimoGesto || 0) < PAUSA_GESTO_MS) return;
            j.ultimoGesto = ahora;
            io.to(SALA).emit("mundo:gesto", { userId: j.userId, gesto });
        });

        // Globo de texto: no se guarda, solo se reenvía.
        socket.on("mundo:decir", ({ texto } = {}) => {
            const j = mio(socket);
            if (!j) return;
            const ahora = Date.now();
            if (ahora - (j.ultimoMensaje || 0) < PAUSA_MENSAJE_MS) return socket.emit("mundo:error", { mensaje: "Espera un momento para escribir otra vez.", leve: true });
            const limpio = limpiarMensaje(texto);
            if (!limpio) return;
            j.ultimoMensaje = ahora;
            io.to(SALA).emit("mundo:dicho", { userId: j.userId, texto: limpio });
        });

        /* ---------- Micrófono (se oye solo cerca) ---------- */
        socket.on("mundo:hablar", async () => {
            const j = mio(socket);
            if (!j || j.habla) return;
            const [cfg, permiso] = await Promise.all([obtenerConfigVoz(), permisoVoz(String(socket.userId))]);
            if (!permiso.puede) return socket.emit("mundo:error", { mensaje: permiso.motivo, voz: true });
            const otraVez = j.ultimaVoz + cfg.espera * 1000;
            if (Date.now() < otraVez) return socket.emit("mundo:error", { mensaje: `Espera ${Math.ceil((otraVez - Date.now()) / 1000)} s para hablar otra vez.`, voz: true });
            j.habla = { hasta: Date.now() + cfg.segundos * 1000 };
            socket.emit("mundo:puedeHablar", { segundos: cfg.segundos });
            hablando();
        });

        socket.on("mundo:audio", (datos = {}) => {
            const j = mio(socket);
            if (!j?.habla || Date.now() > j.habla.hasta + 300) return;
            const pcm = datos.pcm;
            const largo = pcm?.byteLength ?? pcm?.length ?? 0;
            if (!largo || largo > MAX_BYTES_AUDIO) return;
            const rate = Math.min(48000, Math.max(8000, Number(datos.rate) || 16000));
            for (const otro of jugadores.values()) {
                if (otro === j) continue;
                const d = Math.hypot(otro.x - j.x, otro.z - j.z);
                if (d > RADIO_VOZ) continue;
                io.sockets.sockets.get(otro.socketId)?.volatile.emit("mundo:audio", { userId: j.userId, pcm, rate });
            }
        });

        socket.on("mundo:callar", () => {
            const j = mio(socket);
            if (!j?.habla) return;
            j.habla = null;
            j.ultimaVoz = Date.now();
            hablando();
        });

        socket.on("mundo:salir", () => quitar(socket));
        socket.on("disconnect", () => quitar(socket));
    }

    return { registrar, cuantos: () => jugadores.size };
}
