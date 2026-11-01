/* =========================================================
   MUNDO 3D · JUGADORES EN VIVO
   ---------------------------------------------------------
   Navegador → servidor
     mundo:entrar   { personaje }            entra (o cambia de personaje)
     mundo:mover    { x, y, z, r, andando }  10 veces por segundo
                    andando: 0 quieto · 1 camina · 2 corre
     mundo:agarrar                           alza al jugador que tiene al frente
     mundo:lanzar                            lo tira hacia donde mira
     mundo:decir    { texto }                globo encima del jugador
     mundo:hablar / mundo:audio / mundo:callar   micrófono
     mundo:salir
   Servidor → navegador
     mundo:jugadores   lista completa (al entrar/salir/cambiar)
     mundo:posiciones  [userId, x, y, z, r, andando] (10 por segundo)
     mundo:dicho, mundo:hablando, mundo:audio
     mundo:agarre { por, a } · mundo:soltado { a } · mundo:lanzado { a, por, x, y, z, vx, vy, vz }
     mundo:circulos    cuenta de cada círculo de juego
     mundo:aPartida    salió por un círculo: va a la pantalla previa
     mundo:diseno      el admin cambió el mundo

   Los mensajes NO se guardan en ningún lado: solo se
   reenvían y desaparecen. La voz se oye solo cerca (RADIO_VOZ).
========================================================= */

import { pool } from "../database/db.js";
import { obtenerConfigVoz, permisoVoz } from "../voz/voz.js";
import { alCambiarMundo, mundoParaJugador, LIMITE } from "./mundo.js";
import { limpiarMensaje } from "./filtro.js";
import { crearCirculos } from "./circulos.js";

const SALA = "mundo";
const MAXIMO = 40; // jugadores a la vez (el celular se pone lento con más)
const TICK_MS = 100;
const RADIO_VOZ = 22; // metros: más lejos no se oye
const PAUSA_MENSAJE_MS = 1500;
const DISTANCIA_AGARRE = 1.9; // metros
const CARGA_MAX_MS = 6000; // si no lo lanza, lo suelta solo
const INMUNE_MS = 3500; // después de caer no lo pueden volver a agarrar enseguida
const LANZAR = { horizontal: 9, vertical: 7.5 };
const MAX_BYTES_AUDIO = 24 * 1024;

const num = (v, min, max) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};
const r2 = (n) => Math.round(n * 100) / 100;

export function crearMundo({ io, roomManager, ayudas, arranque }) {
    const jugadores = new Map(); // userId → { socketId, userId, nombre, personaje, x, y, z, r, andando, habla }
    let cambio = false;

    const publico = (j) => ({ userId: j.userId, nombre: j.nombre, personaje: j.personaje, x: j.x, y: j.y, z: j.z, r: j.r, andando: j.andando });
    const enviarLista = () => io.to(SALA).emit("mundo:jugadores", { jugadores: [...jugadores.values()].map(publico) });
    const hablando = () => io.to(SALA).emit("mundo:hablando", { ids: [...jugadores.values()].filter((j) => j.habla).map((j) => j.userId) });

    /* ---------- Agarrar y lanzar ---------- */
    function soltar(cargador, { avisar = true } = {}) {
        const victima = cargador?.cargando ? jugadores.get(cargador.cargando) : null;
        if (cargador) cargador.cargando = null;
        if (victima) {
            victima.cargadoPor = null;
            victima.inmuneHasta = Date.now() + INMUNE_MS;
            if (avisar) io.to(SALA).emit("mundo:soltado", { a: victima.userId });
        }
        return victima;
    }

    function sacarDelMundo(userId) {
        const j = jugadores.get(userId);
        if (!j) return;
        if (j.cargando) soltar(j);
        if (j.cargadoPor) soltar(jugadores.get(j.cargadoPor));
        jugadores.delete(userId);
        io.sockets.sockets.get(j.socketId)?.leave(SALA);
        enviarLista();
        if (j.habla) hablando();
    }

    // Círculos de juego (src/mundo/circulos.js).
    const circulos = crearCirculos({
        io,
        roomManager,
        ayudas,
        arranque,
        jugadores,
        sacarDelMundo,
        emitir: () => io.to(SALA).emit("mundo:circulos", circulos.estado()),
    });
    let objetosActuales = [];
    mundoParaJugador()
        .then((c) => (objetosActuales = c.objetos))
        .catch(() => {});
    setInterval(() => {
        if (jugadores.size && roomManager && arranque) circulos.revisar(objetosActuales);
    }, 500).unref();

    setInterval(() => {
        const ahora = Date.now();
        // El que carga a otro: lo lleva encima (y lo suelta solo si se demora).
        for (const j of jugadores.values()) {
            if (!j.cargando) continue;
            const v = jugadores.get(j.cargando);
            if (!v) {
                j.cargando = null;
                continue;
            }
            Object.assign(v, { x: j.x, y: j.y + 1.9, z: j.z });
            cambio = true;
            if (ahora > j.cargaHasta) soltar(j);
        }
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
        const config = await mundoParaJugador();
        objetosActuales = config.objetos;
        if (jugadores.size) io.to(SALA).emit("mundo:diseno", { config });
    });

    function quitar(socket) {
        const j = jugadores.get(socket.userId);
        if (!j || j.socketId !== socket.id) return;
        sacarDelMundo(socket.userId);
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
                cargando: ya?.cargando || null,
                cargadoPor: ya?.cargadoPor || null,
                cargaHasta: ya?.cargaHasta || 0,
                inmuneHasta: 0,
            });
            objetosActuales = config.objetos;
            socket.join(SALA);
            socket.emit("mundo:circulos", circulos.estado());
            const voz = await obtenerConfigVoz();
            socket.emit("mundo:bienvenida", { yo: socket.userId, config, voz: { segundos: voz.segundos, espera: voz.espera } });
            enviarLista();
        });

        socket.on("mundo:mover", ({ x, y, z, r, andando } = {}) => {
            const j = mio(socket);
            if (!j || j.cargadoPor) return; // lo llevan cargado: su posición la pone el que lo carga
            j.x = num(x, -LIMITE, LIMITE);
            j.y = num(y, 0, 40);
            j.z = num(z, -LIMITE, LIMITE);
            j.r = num(r, -100, 100);
            j.andando = Math.round(num(andando, 0, 2));
            cambio = true;
        });

        // Agarrar al que está al frente (o al lado) y alzarlo.
        socket.on("mundo:agarrar", () => {
            const j = mio(socket);
            const ahora = Date.now();
            if (!j || j.cargando || j.cargadoPor) return;
            let mejor = null;
            let mejorD = DISTANCIA_AGARRE;
            for (const o of jugadores.values()) {
                if (o === j || o.cargadoPor || o.cargando || o.saliendo || (o.inmuneHasta || 0) > ahora || Math.abs(o.y - j.y) > 1) continue;
                const d = Math.hypot(o.x - j.x, o.z - j.z);
                if (d < mejorD) {
                    mejor = o;
                    mejorD = d;
                }
            }
            if (!mejor) return socket.emit("mundo:error", { mensaje: "Acércate a alguien para agarrarlo.", leve: true });
            j.cargando = mejor.userId;
            j.cargaHasta = ahora + CARGA_MAX_MS;
            mejor.cargadoPor = j.userId;
            mejor.andando = 0;
            io.to(SALA).emit("mundo:agarre", { por: j.userId, a: mejor.userId });
        });

        // Tirarlo hacia donde mira.
        socket.on("mundo:lanzar", () => {
            const j = mio(socket);
            if (!j?.cargando) return;
            const v = soltar(j, { avisar: false });
            if (!v) return;
            const vx = Math.sin(j.r) * LANZAR.horizontal;
            const vz = Math.cos(j.r) * LANZAR.horizontal;
            const salida = { x: r2(j.x + Math.sin(j.r) * 0.6), y: r2(j.y + 1.9), z: r2(j.z + Math.cos(j.r) * 0.6) };
            Object.assign(v, salida);
            io.to(SALA).emit("mundo:lanzado", { a: v.userId, por: j.userId, ...salida, vx: r2(vx), vy: LANZAR.vertical, vz: r2(vz) });
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
