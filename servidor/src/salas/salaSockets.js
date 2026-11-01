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
     sala:expulsar { userId }   solo el creador, antes de iniciar (también saca máquinas)
     sala:agregarMaquina        solo el creador: una máquina 🤖 en un puesto libre
     sala:irAlMundo             solo el creador: todos van juntos al Mundo 3D

     siglo:estado | siglo:votar { segundos } | siglo:tirar
     siglo:elegir { opcion: "unidad" | "decena", numero? (joker 0–6) }
     siglo:volverATirar         cuesta 1 diamante, una vez por partida
     sala:emoji { emoji }       reacción (en la sala y en SigloGamif)
     siglo:poderAgarrar         el primero que toca el poder 🔄
     siglo:poderUsar { objetivo, numero }  ponerle un número (0 a 29) a otro
     siglo:salir

     sala:tema { nivelId|null }   InvasiónGamif: tema de las preguntas (creador)
     invasion:estado | invasion:votar { respuesta?, duracion? }
     invasion:tocar { celda }     aparta la casilla y pide su pregunta
     invasion:responder { opcion }
     invasion:salir

     zona:estado | zona:tirar | zona:mover { ficha: 0|1 } | zona:responder { opcion } | zona:salir
     zona:empujar { userId, ficha }  usar el empujón sobre una ficha rival
     penal:estado | penal:apuntar { lado } | penal:atajar { lado } | penal:responder { opcion } | penal:salir

   Servidor → navegador
     sala:estado { sala }       cada cambio de la sala (o sala: null)
     sala:error  { message }
     sala:entrar { code }       te llevan a una sala (invitación aceptada)
     sala:juegoIniciado { juego, ruta }
     sala:alMundo { por }       el creador los llevó al Mundo 3D (la sala sigue)
     sala:expulsado { message } el creador te sacó de la sala
     progreso:actualizar        cambió tu oro o tus diamantes
     sala:emoji { userId, nombre, emoji, en }
     siglo:estado { …partida }  cada cambio de SigloGamif
     siglo:error  { message }
     invasion:estado { …partida } · invasion:error { message }
     invasion:pregunta { celda, texto, opciones, hasta, segundos }  solo a quien tocó
     invasion:resultado { acerto, correcta, explicacion, … }        solo a quien respondió
     zona:estado · zona:error · zona:pregunta · zona:resultado (como en InvasiónGamif)
     game:reward  { resultado, recompensa }   premio al terminar
========================================================= */

import { getUserProfile } from "../users/userService.js";
import { registrarResultadoMultijugador } from "../partidas/partidasService.js";
import { gastarDiamantes, devolverDiamantes } from "../progreso/progreso.js";
import { SigloGame } from "../games/siglo/SigloGame.js";
import { reglasSiglo } from "../config/reglasSiglo.js";
import { InvasionGame } from "../games/invasion/InvasionGame.js";
import { cargarPreguntas, temasInvasion } from "../games/invasion/preguntasInvasion.js";
import { ZonaGame } from "../games/zona/ZonaGame.js";
import { crearMaquina, esBot, MaquinasZona, MaquinasInvasion, MaquinasPenal } from "../games/bots/maquinas.js";
import { PenalGame } from "../games/penal/PenalGame.js";
import { JUEGOS_SALA, MAX_JUGADORES_SALA, motivoNoIniciar, EMOJIS, PAUSA_EMOJI_MS } from "./juegos.js";

/*
 * ¿Puede este socket mandar este emoji ahora? (de la lista y
 * sin llenar la pantalla de emojis). También lo usa el Triqui.
 */
export function emojiPermitido(socket, emoji) {
    if (!EMOJIS.includes(emoji)) return false;
    const ahora = Date.now();
    if (ahora - (socket.ultimoEmoji || 0) < PAUSA_EMOJI_MS) return false;
    socket.ultimoEmoji = ahora;
    return true;
}

// Segundos que se espera a alguien que se desconectó (recargó
// la página, perdió señal) antes de sacarlo de la sala.
const ESPERA_RECONEXION_MS = 20_000;

/*
 * Ayudas compartidas con server.js (que maneja el Triqui y el
 * Mundo). Se crean una vez con el servidor de Socket.IO.
 */
export function crearAyudasSala({ io, roomManager, worldManager, WORLD_ROOM }) {
    const esperas = new Map(); // userId → temporizador de reconexión

    // La lista de conectados se envía a todos, agrupando los
    // cambios que llegan juntos (alguien entra, sale, inicia…).
    let mundoPendiente = null;
    function actualizarMundo() {
        if (mundoPendiente) return;
        mundoPendiente = setTimeout(() => {
            mundoPendiente = null;
            io.to(WORLD_ROOM).emit("world:players", { players: worldManager.serializePlayers() });
        }, 150);
    }

    function emitirSala(room) {
        if (!room) return;
        io.to(room.code).emit("sala:estado", { sala: roomManager.serializeRoom(room) });
        // Cambia quién está en sala o jugando: que la lista lo muestre.
        actualizarMundo();
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
            marco: perfil?.marco || null,
            verificado: Boolean(perfil?.verificado),
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
        ayudas.alSalirDeVoz?.(room, userId);
        clearTimeout(esperas.get(String(userId)));
        esperas.delete(String(userId));

        if (room.estado === "jugando") {
            if (["siglo", "invasion", "zona", "penal"].includes(room.currentGame?.tipo)) room.currentGame.abandonar(userId);
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

        if (quedan) {
            emitirSala(quedan);
            ayudas.arranque?.alSalir(quedan);
        }
    }

    /* Alguien perdió la conexión: se le espera un rato. */
    function desconectado(socket) {
        const room = roomManager.salaDeUsuario(socket.userId);
        if (!room) return;

        const miembro = room.miembros.get(String(socket.userId));
        if (!miembro || miembro.socketId !== socket.id) return; // ya está en otra conexión

        miembro.conectado = false;
        ayudas.alSalirDeVoz?.(room, miembro.userId);

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
        // Las máquinas no reciben premios; si hubo máquinas, no cuenta para el ranking.
        const conMaquinas = [...room.miembros.values()].some((m) => m.esBot) || resultados.some((r) => esBot(r.userId));
        registrarResultadoMultijugador(juego, resultados.filter((r) => !esBot(r.userId)), { sinTemporada: conMaquinas })
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
            .map((m) => ({ userId: m.userId, nombre: m.nombre, avatar: m.avatar, marco: m.marco, verificado: m.verificado }));

        const juego = new SigloGame({
            jugadores,
            reglas: reglasSiglo(),
            onCambio: (estado) => io.to(room.code).emit("siglo:estado", estado),
            onFin: (resultado, partida) => {
                room.estado = "sala";

                roomManager.sumarVictoria(room, "siglo", resultado.ganadores);

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

    /* ---------------------------------------------------------
       INICIAR INVASIÓNGAMIF (carga las preguntas primero)
    --------------------------------------------------------- */

    const jugadoresDeSala = (room) =>
        [...room.miembros.values()]
            .sort((a, b) => a.entroEn - b.entroEn)
            .map((m) => ({ userId: m.userId, nombre: m.nombre, avatar: m.avatar, marco: m.marco, verificado: m.verificado, modelo: m.modelo || null }));

    /* Preguntas del tema elegido en la sala (InvasiónGamif y ZonaGamif). */
    async function preguntasDeSala(room) {
        try {
            return await cargarPreguntas(room.temaInvasion?.id || null);
        } catch (error) {
            console.error("❌ Preguntas de la sala:", error.message);
            return cargarPreguntas(null).catch(() => []);
        }
    }

    async function iniciarInvasion(room) {
        const jugadores = jugadoresDeSala(room);
        const preguntas = await preguntasDeSala(room);
        let maquinas = null;

        const juego = new InvasionGame({
            jugadores,
            preguntas,
            creador: room.hostUserId,
            tema: room.temaInvasion?.nombre || "Mezcla de temas",
            onCambio: (estado) => {
                io.to(room.code).emit("invasion:estado", estado);
                maquinas?.alCambiar();
            },
            onFin: (resultado, partida) => {
                room.estado = "sala";
                maquinas?.parar();
                roomManager.sumarVictoria(room, "invasion", resultado.tipo === "empate" ? [] : resultado.ganadores);
                entregarPremios(room, "invasion", partida.resultadosPremios());
                estadoMundo(room, "available");
                emitirSala(room);
            },
        });
        // Se acabó el tiempo de una pregunta: solo lo sabe quien la tenía.
        juego.onResultado = (userId, resultado) => socketDe(room.miembros.get(String(userId)))?.emit("invasion:resultado", resultado);

        const bots = jugadores.filter((j) => esBot(j.userId)).map((j) => j.userId);
        if (bots.length) maquinas = new MaquinasInvasion(juego, bots, () => room.currentGame === juego);

        room.currentGame = juego;
        juego.iniciar();
    }

    /* ---------------------------------------------------------
       INICIAR ZONAGAMIF
    --------------------------------------------------------- */

    async function iniciarZona(room) {
        const preguntas = await preguntasDeSala(room);
        const privado = (evento) => (userId, datos) => socketDe(room.miembros.get(String(userId)))?.emit(evento, datos);
        let maquinas = null;

        const juego = new ZonaGame({
            jugadores: jugadoresDeSala(room),
            preguntas,
            tema: room.temaInvasion?.nombre || "Mezcla de temas",
            onCambio: (estado) => {
                io.to(room.code).emit("zona:estado", estado);
                maquinas?.alCambiar();
            },
            onPregunta: (userId, datos) => (esBot(userId) ? maquinas?.alPregunta(String(userId)) : privado("zona:pregunta")(userId, datos)),
            onResultado: privado("zona:resultado"),
            onFin: (resultado, partida) => {
                room.estado = "sala";
                maquinas?.parar();
                roomManager.sumarVictoria(room, "zona", resultado.ganadores);
                entregarPremios(room, "zona", partida.resultadosPremios());
                estadoMundo(room, "available");
                emitirSala(room);
            },
        });

        const bots = [...room.miembros.values()].filter((m) => m.esBot).map((m) => m.userId);
        if (bots.length) maquinas = new MaquinasZona(juego, bots, () => room.currentGame === juego);

        room.currentGame = juego;
        juego.iniciar();
    }

    /* ---------------------------------------------------------
       INICIAR PENALGAMIF ⚽
    --------------------------------------------------------- */

    async function iniciarPenal(room) {
        const preguntas = await preguntasDeSala(room);
        const privado = (evento) => (userId, datos) => socketDe(room.miembros.get(String(userId)))?.emit(evento, datos);
        let maquinas = null;

        const juego = new PenalGame({
            jugadores: jugadoresDeSala(room),
            preguntas,
            tema: room.temaInvasion?.nombre || "Mezcla de temas",
            onCambio: (estado) => {
                io.to(room.code).emit("penal:estado", estado);
                maquinas?.alCambiar();
            },
            onPregunta: (userId, datos) => (esBot(userId) ? maquinas?.alPregunta(String(userId)) : privado("penal:pregunta")(userId, datos)),
            onResultado: privado("penal:resultado"),
            onFin: (resultado, partida) => {
                room.estado = "sala";
                maquinas?.parar();
                roomManager.sumarVictoria(room, "penal", resultado.ganadores);
                entregarPremios(room, "penal", partida.resultadosPremios());
                estadoMundo(room, "available");
                emitirSala(room);
            },
        });

        const bots = [...room.miembros.values()].filter((m) => m.esBot).map((m) => m.userId);
        if (bots.length) maquinas = new MaquinasPenal(juego, bots, () => room.currentGame === juego);

        room.currentGame = juego;
        juego.iniciar();
    }

    const ayudas = {
        iniciarPenal,
        iniciarZona,
        iniciarInvasion,
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
        // Lo pone server.js: corta la voz de quien sale de la sala.
        alSalirDeVoz: null,
    };

    return ayudas;
}

/* =========================================================
   ARRANCAR UNA PARTIDA
   · iniciar(room): empieza el juego elegido (botón Iniciar).
   · preparar(room): pantalla previa (partidas del Mundo 3D):
     se espera a que a todos les cargue el juego (✓) y ahí se
     inicia. Al que no cargue en ESPERA_PREPARAR se le saca.
========================================================= */

const ESPERA_PREPARAR_MS = 25_000;

export function crearArranque({ io, roomManager, ayudas, startTriquiGame, emitRoomState }) {
    async function iniciar(room) {
        clearTimeout(room.timerPreparar);
        room.timerPreparar = null;
        room.listos = null;
        room.preparandoHasta = null;
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
        } else if (room.juego === "invasion") {
            await ayudas.iniciarInvasion(room);
        } else if (room.juego === "zona") {
            await ayudas.iniciarZona(room);
        } else if (room.juego === "penal") {
            await ayudas.iniciarPenal(room);
        }

        ayudas.estadoMundo(room, "playing");
        io.to(room.code).emit("sala:juegoIniciado", {
            juego: room.juego,
            ruta: JUEGOS_SALA[room.juego].ruta,
        });
        ayudas.emitirSala(room);

        console.log(`🎮 Sala ${room.code}: ${JUEGOS_SALA[room.juego].nombre} con ${room.miembros.size} jugadores`);
    }

    const personas = (room) => [...room.miembros.values()].filter((m) => !m.esBot);

    function preparar(room) {
        room.estado = "preparando";
        room.listos = new Set();
        room.preparandoHasta = Date.now() + ESPERA_PREPARAR_MS;
        clearTimeout(room.timerPreparar);
        room.timerPreparar = setTimeout(() => vencer(room.code), ESPERA_PREPARAR_MS);
        ayudas.emitirSala(room);
    }

    /* ¿Ya cargaron todos? Entonces empieza. */
    function revisar(room) {
        if (room?.estado !== "preparando") return;
        const gente = personas(room);
        if (gente.length && gente.every((m) => room.listos.has(m.userId))) {
            iniciar(room).catch((e) => console.error("❌ Iniciar partida preparada:", e.message));
        }
    }

    function listo(room, userId) {
        room.listos.add(String(userId));
        ayudas.emitirSala(room);
        // Una pausa corta para que todos vean los ✓ antes de arrancar.
        setTimeout(() => revisar(roomManager.getRoom(room.code)), 900);
    }

    /* Se acabó la espera: se saca a los que no cargaron y se juega con los demás. */
    function vencer(code) {
        const room = roomManager.getRoom(code);
        if (room?.estado !== "preparando") return;
        for (const m of personas(room)) {
            if (room.listos.has(m.userId)) continue;
            const s = ayudas.socketDe(m);
            ayudas.salirDeSala(m.userId, { motivo: "no alcanzó a cargar" });
            s?.emit("sala:expulsado", { message: "No alcanzó a cargar la partida. Intenta otra vez." });
            s?.emit("sala:estado", { sala: null });
        }
        const sigue = roomManager.getRoom(code);
        if (!sigue) return;
        const juego = JUEGOS_SALA[sigue.juego];
        while (juego?.maquina && sigue.miembros.size < juego.min) {
            const bot = crearMaquina(sigue);
            sigue.miembros.set(bot.userId, bot);
        }
        if (motivoNoIniciar(sigue.juego, sigue.miembros.size)) {
            // No alcanzan: vuelven a la sala normal.
            clearTimeout(sigue.timerPreparar);
            sigue.estado = "sala";
            sigue.listos = null;
            sigue.preparandoHasta = null;
            io.to(sigue.code).emit("sala:error", { message: "No alcanzaron los jugadores para empezar." });
            ayudas.emitirSala(sigue);
            return;
        }
        iniciar(sigue).catch((e) => console.error("❌ Iniciar partida preparada:", e.message));
    }

    /* Alguien se fue mientras se preparaba: quizá ya están todos. */
    function alSalir(room) {
        if (room?.estado === "preparando") revisar(room);
    }

    return { iniciar, preparar, listo, alSalir };
}

/* =========================================================
   EVENTOS DE CADA CONEXIÓN
========================================================= */

export function registrarEventosSala(socket, { io, roomManager, ayudas, arranque }) {
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
        if (room.estado === "jugando" && room.currentGame?.tipo === "invasion") {
            socket.emit("invasion:estado", room.currentGame.toJSON());
            const abierta = room.currentGame.preguntaAbierta(yo());
            if (abierta) socket.emit("invasion:pregunta", abierta);
        }
        if (room.estado === "jugando" && room.currentGame?.tipo === "penal") {
            socket.emit("penal:estado", room.currentGame.toJSON());
            const abierta = room.currentGame.preguntaAbierta(yo());
            if (abierta) socket.emit("penal:pregunta", abierta);
        }
        if (room.estado === "jugando" && room.currentGame?.tipo === "zona") {
            socket.emit("zona:estado", room.currentGame.toJSON());
            const abierta = room.currentGame.preguntaAbierta(yo());
            if (abierta) socket.emit("zona:pregunta", abierta);
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

    socket.on("sala:agregarMaquina", () => {
        const room = miSala();
        if (!room) return error("No estás en una sala.");
        if (room.hostUserId !== yo()) return error("Solo el creador agrega máquinas.");
        if (room.estado !== "sala") return error("Espera a que termine la partida.");
        const juego = JUEGOS_SALA[room.juego];
        if (!juego?.maquina) return error("La máquina 🤖 juega ZonaGamif e InvasiónGamif. Elige uno de esos.");
        if (room.miembros.size >= Math.min(juego.max, MAX_JUGADORES_SALA)) return error(`${juego.nombre} admite máximo ${juego.max} jugadores.`);

        const maquina = crearMaquina(room);
        room.miembros.set(maquina.userId, maquina);
        ayudas.emitirSala(room);
    });

    socket.on("sala:tema", async ({ nivelId } = {}) => {
        const room = miSala();
        if (!room) return error("No estás en una sala.");
        if (room.hostUserId !== yo()) return error("Solo el creador de la sala elige el tema.");
        if (room.estado !== "sala") return error("Espera a que termine la partida.");

        if (!nivelId) {
            room.temaInvasion = null;
        } else {
            const tema = (await temasInvasion()).find((t) => t.id === Number(nivelId));
            if (!tema) return error("Ese tema no existe o no tiene preguntas.");
            room.temaInvasion = { id: tema.id, nombre: tema.nombre };
        }
        ayudas.emitirSala(room);
    });

    socket.on("sala:iniciar", async () => {
        const room = miSala();
        if (!room) return error("No estás en una sala.");
        if (room.hostUserId !== yo()) return error("Solo el creador de la sala inicia la partida.");
        if (room.estado !== "sala") return error("Ya hay una partida en curso.");

        const motivo = motivoNoIniciar(room.juego, room.miembros.size);
        if (motivo) return error(motivo);

        if ([...room.miembros.values()].some((m) => m.esBot) && !JUEGOS_SALA[room.juego]?.maquina) {
            return error("La máquina 🤖 solo juega ZonaGamif e InvasiónGamif. Sácala de la sala o elige uno de esos.");
        }

        const ausente = [...room.miembros.values()].find((m) => !m.conectado);
        if (ausente) return error(`Esperando a que ${ausente.nombre} se vuelva a conectar.`);

        await arranque.iniciar(room);
    });

    // El creador lleva a toda la sala al Mundo 3D. La sala no se
    // deshace: al salir del mundo vuelven a ella.
    socket.on("sala:irAlMundo", () => {
        const room = miSala();
        if (!room) return error("No estás en una sala.");
        if (room.hostUserId !== yo()) return error("Solo el creador lleva a la sala al Mundo 3D.");
        if (room.estado !== "sala") return error("Espera a que termine la partida.");

        const por = room.miembros.get(yo())?.nombre || "El creador";
        io.to(room.code).emit("sala:alMundo", { por });
        console.log(`🌍 Sala ${room.code}: ${socket.username} llevó a todos al Mundo 3D`);
    });

    // Pantalla previa (partidas que salen del Mundo 3D): ya cargó el juego.
    socket.on("sala:listo", () => {
        const room = miSala();
        if (room?.estado === "preparando") arranque.listo(room, yo());
    });

    socket.on("sala:emoji", ({ emoji } = {}) => {
        const room = miSala();
        if (!room || !emojiPermitido(socket, emoji)) return;

        const miembro = room.miembros.get(yo());
        io.to(room.code).emit("sala:emoji", {
            userId: yo(),
            nombre: miembro?.nombre || "Jugador",
            emoji,
            en: Date.now(),
        });
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
    socket.on("siglo:poderAgarrar", accionSiglo((p) => p.agarrarPoder(yo())));
    socket.on("siglo:poderUsar", accionSiglo((p, { objetivo, numero }) => p.usarPoder(yo(), objetivo, numero)));

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

    /* ---------------- INVASIÓNGAMIF ---------------- */

    const partidaInvasion = () => {
        const room = miSala();
        return room?.currentGame?.tipo === "invasion" ? room.currentGame : null;
    };

    const accionInvasion = (accion) => (datos) => {
        const partida = partidaInvasion();
        if (!partida) return socket.emit("invasion:error", { message: "No hay una partida de InvasiónGamif activa." });
        const r = accion(partida, datos || {});
        if (r && r.success === false) socket.emit("invasion:error", { message: r.message, esperaHasta: r.esperaHasta });
        return r;
    };

    socket.on("invasion:estado", () => {
        const partida = partidaInvasion();
        socket.emit("invasion:estado", partida ? partida.toJSON() : null);
        const abierta = partida?.preguntaAbierta(yo());
        if (abierta) socket.emit("invasion:pregunta", abierta);
    });
    socket.on("invasion:votar", accionInvasion((p, d) => p.votar(yo(), { respuesta: d.respuesta, duracion: d.duracion })));
    socket.on(
        "invasion:tocar",
        accionInvasion((p, { celda }) => {
            const r = p.tocar(yo(), celda);
            if (r.success) socket.emit("invasion:pregunta", r.pregunta);
            return r;
        })
    );
    socket.on(
        "invasion:responder",
        accionInvasion((p, { opcion }) => {
            const r = p.responder(yo(), opcion);
            if (r.success) socket.emit("invasion:resultado", r.resultado);
            return r;
        })
    );
    socket.on("invasion:salir", accionInvasion((p) => p.abandonar(yo())));

    /* ---------------- ZONAGAMIF ---------------- */

    const partidaZona = () => {
        const room = miSala();
        return room?.currentGame?.tipo === "zona" ? room.currentGame : null;
    };

    const accionZona = (accion) => (datos) => {
        const partida = partidaZona();
        if (!partida) return socket.emit("zona:error", { message: "No hay una partida de ZonaGamif activa." });
        const r = accion(partida, datos || {});
        if (r && r.success === false) socket.emit("zona:error", { message: r.message });
    };

    socket.on("zona:estado", () => {
        const partida = partidaZona();
        socket.emit("zona:estado", partida ? partida.toJSON() : null);
        const abierta = partida?.preguntaAbierta(yo());
        if (abierta) socket.emit("zona:pregunta", abierta);
    });
    socket.on("zona:tirar", accionZona((p) => p.tirar(yo())));
    socket.on("zona:mover", accionZona((p, { ficha }) => p.mover(yo(), ficha)));
    socket.on("zona:responder", accionZona((p, { opcion }) => p.responder(yo(), opcion)));
    socket.on("zona:empujar", accionZona((p, { userId, ficha }) => p.empujar(yo(), userId, ficha)));
    socket.on("zona:salir", accionZona((p) => p.abandonar(yo())));

    /* ---------------- PENALGAMIF ⚽ ---------------- */

    const partidaPenal = () => {
        const room = miSala();
        return room?.currentGame?.tipo === "penal" ? room.currentGame : null;
    };

    const accionPenal = (accion) => (datos) => {
        const partida = partidaPenal();
        if (!partida) return socket.emit("penal:error", { message: "No hay una tanda de penales activa." });
        const r = accion(partida, datos || {});
        if (r && r.success === false) socket.emit("penal:error", { message: r.message });
    };

    socket.on("penal:estado", () => {
        const partida = partidaPenal();
        socket.emit("penal:estado", partida ? partida.toJSON() : null);
        const abierta = partida?.preguntaAbierta(yo());
        if (abierta) socket.emit("penal:pregunta", abierta);
    });
    socket.on("penal:apuntar", accionPenal((p, { lado }) => p.apuntar(yo(), lado)));
    socket.on("penal:atajar", accionPenal((p, { lado }) => p.atajar(yo(), lado)));
    socket.on("penal:responder", accionPenal((p, { opcion }) => p.responder(yo(), opcion)));
    socket.on("penal:salir", accionPenal((p) => p.abandonar(yo())));
}
