/* =========================================================
   VOZ EN LA SALA (walkie-talkie) · TIEMPO REAL
   ---------------------------------------------------------
   Navegador → servidor
     voz:info                     ¿puedo hablar? y reglas
     voz:empezar                  aprieta el botón
     voz:audio { pcm, rate }      pedacitos de audio mientras habla
     voz:terminar                 suelta el botón
   Servidor → navegador
     voz:info { puede, motivo, segundos, espera }
     voz:estado { hablando: { userId, nombre, hasta } | null }
     voz:audio { userId, pcm, rate }   (a los demás de la sala)
     voz:error { message, otraVezEn? }

   Reglas: solo habla uno a la vez por sala, máximo
   "segundos" seguidos (se corta solo) y luego "espera"
   segundos antes de poder volver a hablar.
========================================================= */

import { obtenerConfigVoz, permisoVoz } from "./voz.js";

const MAX_BYTES_PEDAZO = 24 * 1024;

export function crearVoz({ io, roomManager }) {
    function estadoDe(room) {
        const h = room.voz?.hablando;
        return h ? { userId: h.userId, nombre: h.nombre, hasta: h.hasta } : null;
    }

    function avisar(room) {
        io.to(room.code).emit("voz:estado", { hablando: estadoDe(room), ahora: Date.now() });
    }

    /* Termina el turno de voz de alguien (soltó, se acabó el tiempo o salió). */
    function cortar(room, userId) {
        const h = room?.voz?.hablando;
        if (!h || h.userId !== String(userId)) return;

        clearTimeout(h.timer);
        room.voz.hablando = null;
        room.voz.ultimaVez.set(String(userId), Date.now());
        avisar(room);
    }

    function registrar(socket) {
        const yo = () => String(socket.userId);
        const miSala = () => roomManager.salaDeUsuario(yo());
        const error = (message, extra = {}) => socket.emit("voz:error", { message, ...extra });

        socket.on("voz:info", async () => {
            const [cfg, permiso] = await Promise.all([obtenerConfigVoz(), permisoVoz(yo())]);
            const room = miSala();
            socket.emit("voz:info", {
                puede: permiso.puede,
                motivo: permiso.motivo,
                segundos: cfg.segundos,
                espera: cfg.espera,
            });
            if (room) socket.emit("voz:estado", { hablando: estadoDe(room), ahora: Date.now() });
        });

        socket.on("voz:empezar", async () => {
            const room = miSala();
            if (!room) return error("Entra a una sala para hablar.");

            const [cfg, permiso] = await Promise.all([obtenerConfigVoz(), permisoVoz(yo())]);
            if (!permiso.puede) return error(permiso.motivo);

            room.voz ||= { hablando: null, ultimaVez: new Map() };
            const v = room.voz;

            if (v.hablando && v.hablando.userId !== yo()) {
                return error(`${v.hablando.nombre} está hablando.`);
            }
            if (v.hablando) return; // ya estaba hablando

            const otraVezEn = (v.ultimaVez.get(yo()) || 0) + cfg.espera * 1000;
            if (Date.now() < otraVezEn) {
                return error(`Espera ${Math.ceil((otraVezEn - Date.now()) / 1000)} s para hablar otra vez.`, { otraVezEn });
            }

            const miembro = room.miembros.get(yo());
            v.hablando = {
                userId: yo(),
                nombre: miembro?.nombre || "Jugador",
                hasta: Date.now() + cfg.segundos * 1000,
                timer: setTimeout(() => cortar(room, yo()), cfg.segundos * 1000),
            };
            avisar(room);
        });

        socket.on("voz:audio", (datos = {}) => {
            const room = miSala();
            const h = room?.voz?.hablando;
            if (!h || h.userId !== yo() || Date.now() > h.hasta + 300) return;

            const pcm = datos.pcm;
            const largo = pcm?.byteLength ?? pcm?.length ?? 0;
            if (!largo || largo > MAX_BYTES_PEDAZO) return;

            const rate = Math.min(48000, Math.max(8000, Number(datos.rate) || 16000));
            // "volatile": si alguien va lento se salta un pedacito en vez de acumular.
            socket.volatile.to(room.code).emit("voz:audio", { userId: yo(), pcm, rate });
        });

        socket.on("voz:terminar", () => cortar(miSala(), yo()));
    }

    return { registrar, cortar };
}
