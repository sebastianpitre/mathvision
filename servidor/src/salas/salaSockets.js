/* =========================================================
   SALAS MULTIJUGADOR · EVENTOS EN TIEMPO REAL
   ---------------------------------------------------------
   Navegador → servidor
     sala:crear                 crea una sala (sale de la anterior)
     sala:unirse  { codigo }    entra con el código
     sala:estado                ¿en qué sala estoy? (al abrir o recargar)
     sala:salir                 sale de la sala
     sala:elegirJuego { juego } solo el creador
     sala:iniciar               solo el creador, si alcanzan los jugadores
     sala:expulsar { userId }   solo el creador, antes de iniciar

     siglo:estado | siglo:votar { segundos } | siglo:tirar
     siglo:elegir { opcion: "unidad" | "decena", numero? (joker 0–6) }
     siglo:volverATirar         cuesta 1 diamante, una vez por partida
     siglo:salir

   Servidor → navegador
     sala:estado { sala }       cada cambio de la sala (o sala: null)
     sala:error  { message }
     sala:entrar { code }       te llevan a una sala (invitación aceptada)
     sala:juegoIniciado { juego, ruta }
     sala:expulsado { message } el creador te sacó de la sala
     progreso:actualizar        cambió tu oro o tus diamantes
     siglo:estado { …partida }  cada cambio de SigloGamif
     siglo:error  { message }
     game:reward  { resultado, recompensa }   premio al terminar
========================================================= */

import { getUserProfile } from "../users/userService.js";
import { registrarResultadoMultijugador } from "../partidas/partidasService.js";
import { gastarDiamantes, devolverDiamantes } from "../progreso/progreso.js";
import { SigloGame } from "../games/siglo/SigloGame.js";
import { JUEGOS_SALA, motivoNoIniciar } from "./juegos.js";

// Segundos que se espera a alguien que se desconectó (recargó
// la página, perdió señal) antes de sacarlo de la sala.
const ESPERA_RECONEXION_MS = 20_000;

/*
 * Ayudas compartidas con server.js (que maneja el Triqui y el
 * Mundo). Se crean una vez con el servidor de Socket.IO.
 */
export function crearAyudasSala({ io, roomManager, worldManager, WORLD_ROOM }) {
    const esperas = new Map(); // userId → temporizador de reconexión

    function emitirSala(room) {
        if (!room) return;
        io.to(room.code).emit("sala:estado", { sala: roomManager.serializeRoom(room) });
    }

    function actualizarMundo() {
        io.to(WORLD_ROOM).emit("world:players", { players: worldManager.serializePlayers() });
    }

    function estadoMundo(room, status) {
        for (const m of room.miembros.values()) {
            if (worldManager.getPlayer(m.userId)) {
                worldManager.updatePlayer(m.userId, { status, roomCode: room.code });
            }
        }
        actualizarMundo();
    }

    function socketDe(miembro) {
        return miembro?.socketId ? io.sockets.sockets.get(miembro.socketId) : null;
    }

    async function miembroDesde(socket) {
        const perfil = await getUserProfile(socket.userId);

        return {
            userId: String(socket.userId),
            socketId: socket.id,
            nombre: String(perfil?.display_name || perfil?.username || socket.username || "Jugador").slice(0, 30),
            avatar: perfil?.avatar || null,
            nivel: perfil?.level || 1,
            modelo: perfil?.character_model_path || null,
            personaje: perfil?.character_name || null,
            conectado: true,
            entroEn: Date.now(),
        };
    }

    function vincular(socket, room) {
        if (socket.roomCode && socket.roomCode !== room.code) socket.leave(socket.roomCode);
        socket.join(room.code);
        socket.roomCode = room.code;
    }

    /* Termina el Triqui de la sala si alguien se va a mitad de partida. */
    function cortarTriqui(room, mensaje) {
        if (room.currentGame?.constructor?.name !== "TriquiGame") return;
        if (room.estado !== "jugando") return;

        room.currentGame.clearTurnTimer?.();
        room.currentGame = null;
        room.estado = "sala";
        io.to(room.code).emit("game:playerDisconnected", { message: mensaje });
        estadoMundo(room, "available");
    }

    /* Saca a un usuario de su sala (y de la partida si estaba jugando). */
    function salirDeSala(userId, { socket, motivo = "salió de la sala" } = {}) {
        const room = roomManager.salaDeUsuario(userId);
        if (!room) return;

        const miembro = room.miembros.get(String(userId));
        clearTimeout(esperas.get(String(userId)));
        esperas.delete(String(userId));

        if (room.estado === "jugando") {
            if (room.currentGame?.tipo === "siglo") room.currentGame.abandonar(userId);
            else cortarTriqui(room, `${miembro?.nombre || "Un jugador"} ${motivo}.`);
        }

        const quedan = roomManager.quitarMiembro(room, userId);

        const s = socket || socketDe(miembro);
        if (s) {
            s.leave(room.code);
            if (s.roomCode === room.code) s.roomCode = null;
        }

        if (worldManager.getPlayer(userId)) {
            worldManager.updatePlayer(userId, { status: "available", roomCode: null });
            actualizarMundo();
        }

        if (quedan) emitirSala(quedan);
    }

    /* Alguien perdió la conexión: se le espera un rato. */
    function desconectado(socket) {
        const room = roomManager.salaDeUsuario(socket.userId);
        if (!room) return;

        const miembro = room.miembros.get(String(socket.userId));
        if (!miembro || miembro.socketId !== socket.id) return; // ya está en otra conexión

        miembro.conectado = false;

        cortarTriqui(room, `${miembro.nombre} se desconectó.`);
        emitirSala(room);

        clearTimeout(esperas.get(miembro.userId));
        esperas.set(
            miembro.userId,
            setTimeout(() => {
                esperas.delete(miembro.userId);
                const actual = roomManager.salaDeUsuario(miembro.userId)?.miembros.get(miembro.userId);
                if (actual && !actual.conectado) salirDeSala(miembro.userId, { motivo: "se desconectó" });
            }, ESPERA_RECONEXION_MS)
        );
    }

    /* Volvió (misma cuenta, conexión nueva). */
    function reconectar(socket, room) {
        const miembro = room.miembros.get(String(socket.userId));
        if (!miembro) return;

        clearTimeout(esperas.get(miembro.userId));
        esperas.delete(miembro.userId);

        miembro.socketId = socket.id;
        miembro.conectado = true;
        vincular(socket, room);
    }

    /* ---------------------------------------------------------
       PREMIOS AL TERMINAR UNA PARTIDA DE LA SALA
    --------------------------------------------------------- */

    function entregarPremios(room, juego, resultados) {
        registrarResultadoMultijugador(juego, resultados)
            .then((premios) => {
                for (const premio of premios) {
                    const s = socketDe(room.miembros.get(String(premio.userId)));
                    s?.emit("game:reward", premio);
                }
            })
            .catch((error) => console.error(`❌ Premios de ${juego}:`, error.message));
    }

    /* ---------------------------------------------------------
       INICIAR SIGLOGAMIF
    --------------------------------------------------------- */

    function iniciarSiglo(room) {
        const jugadores = [...room.miembros.values()]
            .sort((a, b) => a.entroEn - b.entroEn)
            .map((m) => ({ userId: m.userId, nombre: m.nombre }));

        const juego = new SigloGame({
            jugadores,
            onCambio: (estado) => io.to(room.code).emit("siglo:estado", estado),
            onFin: (resultado, partida) => {
                room.estado = "sala";

                const resultados = partida.jugadores
                    .filter((j) => j.motivo !== "abandono")
                    .map((j) => ({
                        userId: j.userId,
                        resultado: resultado.ganadores.includes(j.userId) ? "ganada" : "perdida",
                        siglo: resultado.tipo === "siglo" && resultado.ganadores.includes(j.userId),
                    }));

                entregarPremios(room, "siglo", resultados);
                estadoMundo(room, "available");
                emitirSala(room);
            },
        });

        room.currentGame = juego;
        juego.iniciar();
    }

    return {
        esperas,
        emitirSala,
        actualizarMundo,
        estadoMundo,
        miembroDesde,
        vincular,
        salirDeSala,
        desconectado,
        reconectar,
        entregarPremios,
        iniciarSiglo,
        socketDe,
    };
}

/* =========================================================
   EVENTOS DE CADA CONEXIÓN
========================================================= */

export function registrarEventosSala(socket, { io, roomManager, ayudas, startTriquiGame, emitRoomState }) {
    const yo = () => String(socket.userId);
    const error = (message) => socket.emit("sala:error", { message });
    const miSala = () => roomManager.salaDeUsuario(yo());

    socket.on("sala:crear", async () => {
        ayudas.salirDeSala(yo(), { socket });

        const room = roomManager.crearSala(await ayudas.miembroDesde(socket));
        ayudas.vincular(socket, room);
        ayudas.emitirSala(room);
        ayudas.actualizarMundo();

        console.log(`🏠 Sala ${room.code} creada por ${socket.username}`);
    });

    socket.on("sala:unirse", async ({ codigo }) => {
        const destino = roomManager.getRoom(codigo);
        if (!destino) return error("Esa sala no existe. Revisa el código.");

        const actual = miSala();
        if (actual && actual.code !== destino.code) ayudas.salirDeSala(yo(), { socket });

        const resultado = roomManager.unirse(destino.code, await ayudas.miembroDesde(socket));
        if (!resultado.success) return error(resultado.message);

        ayudas.vincular(socket, resultado.room);
        ayudas.emitirSala(resultado.room);
    });

    socket.on("sala:estado", () => {
        const room = miSala();

        if (!room) return socket.emit("sala:estado", { sala: null });

        ayudas.reconectar(socket, room);
        ayudas.emitirSala(room);

        if (room.estado === "jugando" && room.currentGame?.tipo === "siglo") {
            socket.emit("siglo:estado", room.currentGame.toJSON());
        }
    });

    socket.on("sala:salir", () => {
        ayudas.salirDeSala(yo(), { socket });
        socket.emit("sala:estado", { sala: null });
    });

    socket.on("sala:expulsar", ({ userId } = {}) => {
        const room = miSala();
        const id = String(userId ?? "");

        if (!room) return error("No estás en una sala.");
        if (room.hostUserId !== yo()) return error("Solo el creador puede sacar jugadores.");
        if (room.estado !== "sala") return error("Espera a que termine la partida para sacar a alguien.");
        if (id === yo()) return error("No te puedes sacar a ti mismo. Usa «Salir de la sala».");

        const miembro = room.miembros.get(id);
        if (!miembro) return error("Ese jugador ya no está en la sala.");

        const s = ayudas.socketDe(miembro);
        const creador = room.miembros.get(yo())?.nombre || "El creador";

        room.bloqueados.add(id);
        ayudas.salirDeSala(id, { motivo: "fue sacado de la sala" });

        s?.emit("sala:expulsado", { message: `${creador} te sacó de la sala.` });
        s?.emit("sala:estado", { sala: null });

        console.log(`🚪 Sala ${room.code}: ${socket.username} sacó a ${miembro.nombre}`);
    });

    socket.on("sala:elegirJuego", ({ juego }) => {
        const room = miSala();
        if (!room) return error("No estás en una sala.");
        if (room.hostUserId !== yo()) return error("Solo el creador de la sala elige el juego.");
        if (room.estado !== "sala") return error("Espera a que termine la partida.");
        if (!JUEGOS_SALA[juego]) return error("Ese juego no existe.");

        room.juego = juego;
        ayudas.emitirSala(room);
    });

    socket.on("sala:iniciar", () => {
        const room = miSala();
        if (!room) return error("No estás en una sala.");
        if (room.hostUserId !== yo()) return error("Solo el creador de la sala inicia la partida.");
        if (room.estado !== "sala") return error("Ya hay una partida en curso.");

        const motivo = motivoNoIniciar(room.juego, room.miembros.size);
        if (motivo) return error(motivo);

        const ausente = [...room.miembros.values()].find((m) => !m.conectado);
        if (ausente) return error(`Esperando a que ${ausente.nombre} se vuelva a conectar.`);

        room.currentGame?.destruir?.();
        room.currentGame?.clearTurnTimer?.();
        room.estado = "jugando";

        if (room.juego === "triqui") {
            roomManager.prepararTriqui(room);
            const juego = startTriquiGame(room);
            io.to(room.code).emit("game:started", { game: juego.toJSON() });
            emitRoomState(room);
        } else if (room.juego === "siglo") {
            ayudas.iniciarSiglo(room);
        }

        ayudas.estadoMundo(room, "playing");
        io.to(room.code).emit("sala:juegoIniciado", {
            juego: room.juego,
            ruta: JUEGOS_SALA[room.juego].ruta,
        });
        ayudas.emitirSala(room);

        console.log(`🎮 Sala ${room.code}: ${JUEGOS_SALA[room.juego].nombre} con ${room.miembros.size} jugadores`);
    });

    /* ---------------- SIGLOGAMIF ---------------- */

    const partidaSiglo = () => {
        const room = miSala();
        return room?.currentGame?.tipo === "siglo" ? room.currentGame : null;
    };

    const accionSiglo = (accion) => (datos) => {
        const partida = partidaSiglo();
        if (!partida) return socket.emit("siglo:error", { message: "No hay una partida de SigloGamif activa." });

        const resultado = accion(partida, datos || {});
        if (resultado && resultado.success === false) socket.emit("siglo:error", { message: resultado.message });
    };

    socket.on("siglo:estado", () => {
        const partida = partidaSiglo();
        socket.emit("siglo:estado", partida ? partida.toJSON() : null);
    });

    socket.on("siglo:votar", accionSiglo((p, { segundos }) => p.votar(yo(), segundos)));
    socket.on("siglo:tirar", accionSiglo((p) => p.tirar(yo())));
    socket.on("siglo:elegir", accionSiglo((p, { opcion, numero }) => p.elegir(yo(), opcion, numero)));

    socket.on("siglo:volverATirar", async () => {
        const fallo = (message) => socket.emit("siglo:error", { message });
        const partida = partidaSiglo();
        if (!partida) return fallo("No hay una partida de SigloGamif activa.");

        // Se aparta el turno mientras se cobra, para que no se
        // juegue dos veces ni se acabe el tiempo a medias.
        const reserva = partida.reservarRetiro(yo());
        if (!reserva.success) return fallo(reserva.message);

        let quedan;
        try {
            quedan = await gastarDiamantes(yo(), 1);
        } catch (e) {
            partida.cancelarRetiro(yo());
            console.error("❌ Cobrar diamante:", e.message);
            return fallo("No se pudo usar el diamante. Intenta de nuevo.");
        }

        if (quedan === null) {
            partida.cancelarRetiro(yo());
            return fallo("No tienes diamantes para volver a tirar.");
        }

        const resultado = partida.confirmarRetiro(yo());

        if (!resultado.success) {
            await devolverDiamantes(yo(), 1).catch((e) => console.error("❌ Devolver diamante:", e.message));
            socket.emit("progreso:actualizar");
            return fallo(`${resultado.message} Te devolvimos el diamante.`);
        }

        socket.emit("progreso:actualizar", { diamantes: quedan });
    });
    socket.on("siglo:salir", accionSiglo((p) => p.abandonar(yo())));
}
