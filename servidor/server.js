/* =========================================================
   LUDOGAMIF · GAME SERVER
   ---------------------------------------------------------
   La configuración (.env) se carga y valida PRIMERO.
========================================================= */

import { config } from "./src/config/env.js";

import express from "express";
import http from "http";
import cors from "cors";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { Server } from "socket.io";
import { WorldManager } from "./src/world/WorldManager.js";
import { RoomManager } from "./src/rooms/RoomManager.js";
import { TriquiGame } from "./src/games/triqui/TriquiGame.js";

import {
    getUserProfile
} from "./src/users/userService.js";

import authRoutes
    from "./src/auth/authRoutes.js";

import userRoutes
    from "./src/users/userRoutes.js";

import adminRoutes
    from "./src/admin/adminRoutes.js";

import tiendaRoutes
    from "./src/tienda/tiendaRoutes.js";

import {
    nivelesRouter,
    partidasRouter,
} from "./src/partidas/partidasRoutes.js";

import {
    registrarResultadoTriqui,
} from "./src/partidas/partidasService.js";

import {
    crearAyudasSala,
    registrarEventosSala,
} from "./src/salas/salaSockets.js";

import {
    pool,
    testDatabase,
    closeDatabase,
} from "./src/database/db.js";

import {
    verifyToken
} from "./src/auth/authService.js";

const SERVER_NAME =
    "LudoGamif Game Server";

const SERVER_VERSION =
    "3.0.0";

/*
 * Sala global de Socket.IO donde están
 * todos los jugadores del Mundo.
 * (Es interna: el frontend no la usa por nombre.)
 */
const WORLD_ROOM =
    "ludogamif-world";

const app = express();

/*
 * Detrás de Nginx / Cloudflare:
 * permite leer la IP real del cliente.
 */
if (config.TRUST_PROXY) {
    app.set(
        "trust proxy",
        true
    );
}

app.disable(
    "x-powered-by"
);

app.use(
    cors({
        origin: config.CORS_ORIGINS,
    })
);

/*
 * El panel de administración va primero porque acepta
 * JSON más grandes (bancos de preguntas).
 */
app.use(
    "/api/admin",
    express.json({ limit: "3mb" }),
    adminRoutes
);

app.use(
    express.json({ limit: "100kb" })
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/niveles", nivelesRouter);
app.use("/api/partidas", partidasRouter);
app.use("/api/tienda", tiendaRoutes);

const httpServer =
    http.createServer(app);

const io =
    new Server(httpServer, {
        cors: {
            origin: config.CORS_ORIGINS,
            methods: [
                "GET",
                "POST",
            ],
        },
    });

/* =========================================================
🔐 AUTENTICACIÓN SOCKET.IO
========================================================= */

io.use(
    (socket, next) => {

        try {

            const token =
                socket.handshake.auth?.token;


            if (!token) {

                return next(
                    new Error(
                        "No se proporcionó token de autenticación."
                    )
                );

            }


            const decoded =
                verifyToken(token);


            if (!decoded) {

                return next(
                    new Error(
                        "Token inválido."
                    )
                );

            }


            /*
             * Guardamos la identidad
             * autenticada en el socket.
             */

            socket.userId =
                decoded.userId;


            socket.username =
                decoded.username;


            console.log(
                `🔐 Socket autenticado: ${socket.userId} (${socket.username})`
            );


            next();

        } catch (error) {

            console.error(
                "❌ Error autenticando Socket.IO:",
                error.message
            );

            next(
                new Error(
                    "No autorizado."
                )
            );

        }

    }
);

const roomManager =
    new RoomManager();

const worldManager =
    new WorldManager();

/*
 * Salas multijugador (de 2 a 4): elegir juego, iniciar,
 * reconexiones e invitaciones. Ver src/salas/.
 */
const ayudasSala =
    crearAyudasSala({
        io,
        roomManager,
        worldManager,
        WORLD_ROOM,
    });

const PORT = config.PORT;

const HOST = config.HOST;

/* =========================================================
   HTTP
========================================================= */

app.get("/api", (req, res) => {

    res.json({
        ok: true,
        server:
            SERVER_NAME,
        version: SERVER_VERSION,
    });
});

/*
 * Chequeo de salud: servidor + base de datos.
 * Lo usa ludogamif.sh (estado, actualizar) y Docker.
 */
async function salud(req, res) {

    let database = "ok";

    try {

        await pool.query(
            "SELECT 1"
        );

    } catch {

        database = "error";

    }

    res
        .status(
            database === "ok"
                ? 200
                : 503
        )
        .json({
            ok: database === "ok",
            estado: database === "ok" ? "ok" : "sin base de datos",
            server: SERVER_NAME,
            version: SERVER_VERSION,
            env: config.NODE_ENV,
            database,
            uptime: Math.round(
                process.uptime()
            ),
            sockets:
                io.engine.clientsCount,
            rooms:
                roomManager.rooms.size,
        });
}

app.get("/api/salud", salud);
app.get("/health", salud);

app.get("/api/rooms", (req, res) => {

    res.json({
        rooms:
            Array.from(
                roomManager.rooms.values()
            ).map(
                (room) =>
                    roomManager.serializeRoom(
                        room
                    )
            ),
    });
});

/* Ruta de la API que no existe → JSON, no la página del juego. */
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Ruta no encontrada.",
    });
});

/* JSON mal escrito o demasiado grande → mensaje claro. */
app.use((error, req, res, next) => {

    if (error?.type === "entity.parse.failed") {
        return res.status(400).json({ success: false, message: "El JSON enviado no es válido." });
    }

    if (error?.type === "entity.too.large") {
        return res.status(413).json({ success: false, message: "El archivo es demasiado grande." });
    }

    next(error);
});

/* =========================================================
   JUEGO (frontend compilado)
   ---------------------------------------------------------
   En Docker el frontend compilado queda en ../dist. Aquí
   se sirve con caché: los archivos con huella (assets/)
   un año; modelos 3D, sonidos e imágenes una semana; y
   index.html nunca, para que cada actualización se vea
   de inmediato.
========================================================= */

const FRONTEND_DIR =
    process.env.FRONTEND_DIR ||
    path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../dist"
    );

if (existsSync(path.join(FRONTEND_DIR, "index.html"))) {

    app.use(
        "/assets",
        express.static(path.join(FRONTEND_DIR, "assets"), {
            immutable: true,
            maxAge: "365d",
            fallthrough: false,
        })
    );

    app.use(
        express.static(FRONTEND_DIR, {
            index: false,
            maxAge: "7d",
            setHeaders(res, archivo) {
                if (archivo.endsWith(".html")) {
                    res.setHeader("Cache-Control", "no-cache");
                }
            },
        })
    );

    // Cualquier otra ruta (/lobby, /admin, /profile/3...)
    // la resuelve React en el navegador.
    app.get(/^\/(?!socket\.io\/).*/, (req, res) => {
        res.setHeader("Cache-Control", "no-cache");
        res.sendFile(path.join(FRONTEND_DIR, "index.html"));
    });

    console.log(`🖥️  Sirviendo el juego desde ${FRONTEND_DIR}`);

} else {

    app.get("/", (req, res) => {
        res.json({
            ok: true,
            server: SERVER_NAME,
            version: SERVER_VERSION,
            aviso: "El frontend no está compilado (npm run build en la raíz).",
        });
    });

}

/* =========================================================
   HELPERS
========================================================= */

/*
 * Al terminar una ronda de Triqui en línea: guarda la
 * partida de cada jugador y le entrega su premio. Cada
 * jugador recibe "game:reward" con lo que ganó.
 */
function entregarPremiosTriqui(room, winnerSocketId) {

    const resultados =
        Array.from(room.players.values())
            .map((player) => {
                const jugadorSocket =
                    io.sockets.sockets.get(player.id);

                return {
                    socketId: player.id,
                    userId: jugadorSocket?.userId,
                    resultado:
                        !winnerSocketId
                            ? "empate"
                            : player.id === winnerSocketId
                                ? "ganada"
                                : "perdida",
                };
            })
            .filter((r) => r.userId);

    registrarResultadoTriqui(resultados)
        .then((premios) => {
            for (const premio of premios) {
                const destino =
                    resultados.find((r) => r.userId === premio.userId);

                if (destino) {
                    io.to(destino.socketId).emit(
                        "game:reward",
                        premio
                    );
                }
            }
        })
        .catch((error) => {
            console.error(
                "❌ No se pudo guardar el premio del Triqui:",
                error.message
            );
        });
}

function getRoomFromSocket(socket) {

    if (!socket.roomCode) {
        return null;
    }

    return roomManager.getRoom(
        socket.roomCode
    );
}

function emitRoomState(room) {

    if (!room) {
        return;
    }

    io.to(room.code).emit(
        "room:updated",
        roomManager.serializeRoom(
            room
        )
    );
}

/*
 * Crea e inicia un Triqui nuevo en la sala.
 *
 * Se usa en: invitación del Mundo, game:start
 * y revancha. Así los tres casos se comportan
 * igual (antes la revancha no avisaba cuando
 * a un jugador se le acababa el tiempo).
 */
function startTriquiGame(room) {

    // Apagar el temporizador de la partida
    // anterior para que no siga disparando.
    room.currentGame?.clearTurnTimer?.();

    room.currentGame =
        null;

    room.rematchRequested =
        false;

    room.round += 1;

    room.estado = "jugando";

    const game =
        new TriquiGame(
            room
        );

    game.onTurnTimeout = ({
        failedPlayerId,
        failedPlayerName,
        nextPlayerId,
        nextPlayerName,
        game,
    }) => {

        io.to(
            room.code
        ).emit(
            "game:turnTimeout",
            {
                failedPlayerId,
                failedPlayerName,
                nextPlayerId,
                nextPlayerName,
                message:
                    `⏰ ${failedPlayerName} se quedó sin tiempo. ¡Pierde el turno!`,
            }
        );

        io.to(
            room.code
        ).emit(
            "game:state",
            {
                game,
            }
        );
    };

    game.start();

    room.currentGame =
        game;

    return game;
}

/*
 * Protege TODOS los eventos de un socket.
 *
 * Sin esto, un cliente que envía un evento
 * sin datos (o con datos mal formados) lanza
 * un error que tumba el servidor completo
 * para todos los jugadores.
 */
function protectSocketHandlers(socket) {

    const originalOn =
        socket.on.bind(socket);

    socket.on = (event, handler) =>
        originalOn(
            event,
            (...args) => {

                // Evita "Cannot destructure ... of undefined".
                if (
                    args[0] === undefined ||
                    args[0] === null
                ) {
                    args[0] = {};
                }

                try {

                    const result =
                        handler(...args);

                    if (
                        result &&
                        typeof result.catch ===
                            "function"
                    ) {
                        result.catch((error) => {
                            console.error(
                                `❌ Error en evento "${event}":`,
                                error
                            );
                        });
                    }

                } catch (error) {

                    console.error(
                        `❌ Error en evento "${event}":`,
                        error
                    );

                }
            }
        );

    return socket;
}

/* =========================================================
   SOCKET CONNECTION
========================================================= */

io.on(
    "connection",
    (socket) => {

        protectSocketHandlers(
            socket
        );

        registrarEventosSala(socket, {
            io,
            roomManager,
            ayudas: ayudasSala,
            startTriquiGame,
            emitRoomState,
        });

        console.log(
            "🟢 Socket conectado:",
            socket.id
        );

        console.log(
            `👤 Usuario autenticado: ${socket.userId} (${socket.username})`
        );

        /* =================================================
           🌎 MUNDO
        ================================================= */


        /* =================================================
           ENTRAR AL MUNDO
        ================================================= */

        socket.on(
            "world:join",
            async () => {

                try {

                    /*
                     * La identidad viene del JWT.
                     * Ya fue validada por el middleware de Socket.IO.
                     */

                    if (!socket.userId) {

                        socket.emit(
                            "world:error",
                            {
                                message:
                                    "No se encontró la identidad del usuario.",
                            }
                        );

                        return;
                    }


                    /*
                     * Obtener el perfil real desde PostgreSQL.
                     */

                    const profile =
                        await getUserProfile(
                            socket.userId
                        );


                    if (!profile) {

                        socket.emit(
                            "world:error",
                            {
                                message:
                                    "No se encontró el perfil del jugador.",
                            }
                        );

                        return;
                    }


                    /*
                     * Datos controlados por el servidor.
                     */

                    const id =
                        String(
                            socket.userId
                        );


                    const name =
                        String(
                            profile.display_name ||
                            profile.username ||
                            "Jugador"
                        )
                            .trim()
                            .slice(0, 30);

                    const avatar =
                        profile.avatar ||
                        null;


                    /*
                     * Recuperar o crear jugador.
                     */

                    const player =
                        worldManager.addOrReconnectPlayer(
                            id,
                            socket.id,
                            name,
                            avatar
                        );


                    /*
                     * Compatibilidad con el código actual
                     * del frontend.
                     */

                    socket.worldPlayerId =
                        player.id;

                    socket.worldJoined =
                        true;


                    socket.join(
                        WORLD_ROOM
                    );


                    console.log(
                        `🌎 ${player.name} entró al Mundo (${player.id})`
                    );


                    /*
                     * Información personal.
                     */

                    socket.emit(
                        "world:joined",
                        {
                            player: player,
                            userId: socket.userId,
                        }
                    );


                    /*
                     * Actualizar TODOS los jugadores.
                     */

                    io.to(
                        WORLD_ROOM
                    ).emit(
                        "world:players",
                        {
                            players:
                                worldManager
                                    .serializePlayers(),
                        }
                    );


                } catch (error) {

                    console.error(
                        "❌ Error entrando al Mundo:",
                        error
                    );


                    socket.emit(
                        "world:error",
                        {
                            message:
                                "No fue posible entrar al Mundo.",
                        }
                    );

                }

            }
        );


        /* =================================================
           PEDIR JUGADORES DEL MUNDO
        ================================================= */

        socket.on(
            "world:getPlayers",
            () => {

                socket.emit(
                    "world:players",
                    {
                        players:
                            worldManager
                                .serializePlayers(),
                    }
                );

            }
        );


        /* =================================================
           INVITAR A JUGADOR
        ================================================= */

        socket.on(
            "world:invite",
            async ({ targetPlayerId }) => {

                const sender =
                    worldManager.getPlayerBySocket(
                        socket.id
                    );

                const target =
                    worldManager.getPlayer(
                        targetPlayerId
                    );


                /* =================================================
                   VALIDACIONES
                ================================================= */

                if (!sender) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                "No estás dentro del Mundo.",
                        }
                    );

                    return;

                }


                if (!target || !target.online) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                "Ese jugador ya no está conectado.",
                        }
                    );

                    return;

                }


                if (
                    String(target.id) ===
                    String(sender.id)
                ) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                "No puedes invitarte a ti mismo.",
                        }
                    );

                    return;

                }


                /*
                 * El emisor puede estar "available"
                 * o "inviting".
                 *
                 * "inviting" ya NO significa que esté
                 * bloqueado.
                 */

                if (
                    sender.status !== "available" &&
                    sender.status !== "inviting"
                ) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                "No puedes enviar invitaciones mientras estás ocupado.",
                        }
                    );

                    return;

                }


                /*
                 * El objetivo sí debe estar disponible.
                 */

                if (
                    target.status !==
                    "available"
                ) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                `${target.name} ya está ocupado.`,
                        }
                    );

                    return;

                }


                /* =================================================
                   NO DUPLICAR
                ================================================= */

                if (
                    worldManager.hasInvitation(
                        sender.id,
                        target.id
                    )
                ) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                `Ya tienes una invitación pendiente para ${target.name}.`,
                        }
                    );

                    return;

                }


                /* =================================================
                   LIMITE DE INVITACIONES PENDIENTES
                ================================================= */

                const pending =
                    worldManager.getPendingInvitationCount(
                        sender.id
                    );


                if (
                    pending >=
                    worldManager.MAX_PENDING_INVITATIONS
                ) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                `Puedes tener máximo ${worldManager.MAX_PENDING_INVITATIONS} invitaciones pendientes.`,
                        }
                    );

                    return;

                }


                /* =================================================
                   ANTISPAM
                ================================================= */

                const rateLimit =
                    worldManager.canSendInvitation(
                        sender.id
                    );


                if (
                    !rateLimit.allowed
                ) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                rateLimit.reason,
                        }
                    );

                    return;

                }


                /* =================================================
                   SALA DEL QUE INVITA
                   Se invita a la sala de quien envía. Si no
                   tiene una, se le crea y se le lleva a ella.
                ================================================= */

                let salaEmisor =
                    roomManager.salaDeUsuario(
                        sender.id
                    );

                if (!salaEmisor) {

                    salaEmisor =
                        roomManager.crearSala(
                            await ayudasSala.miembroDesde(socket)
                        );

                    ayudasSala.vincular(socket, salaEmisor);
                    ayudasSala.emitirSala(salaEmisor);

                    socket.emit("sala:entrar", {
                        code: salaEmisor.code,
                    });
                }

                if (salaEmisor.estado === "jugando") {
                    socket.emit("world:error", {
                        message: "Termina la partida antes de invitar a más jugadores.",
                    });
                    return;
                }

                if (salaEmisor.miembros.size >= 4) {
                    socket.emit("world:error", {
                        message: "Tu sala ya está llena (4 jugadores).",
                    });
                    return;
                }

                /* =================================================
                   CREAR INVITACIÓN
                ================================================= */

                const invitation =
                    worldManager.createInvitation(
                        sender.id,
                        target.id
                    );


                if (!invitation) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                "La invitación ya existe.",
                        }
                    );

                    return;

                }


                /*
                 * El emisor permanece disponible
                 * para invitar a más jugadores.
                 */

                worldManager.updatePlayer(
                    sender.id,
                    {
                        status:
                            "inviting",
                    }
                );


                /*
                 * El objetivo queda ocupado para
                 * nuevas invitaciones.
                 */

                worldManager.updatePlayer(
                    target.id,
                    {
                        status:
                            "invited",
                    }
                );


                /* =================================================
                   CONFIRMAR EMISOR
                ================================================= */

                socket.emit(
                    "world:inviteSent",
                    {
                        targetPlayerId:
                            target.id,

                        targetPlayerName:
                            target.name,

                        pendingCount:
                            worldManager
                                .getPendingInvitationCount(
                                    sender.id
                                ),
                    }
                );


                /* =================================================
                   NOTIFICAR OBJETIVO
                ================================================= */

                if (
                    target.socketId
                ) {

                    io.to(
                        target.socketId
                    ).emit(
                        "world:invitation",
                        {
                            fromPlayerId:
                                sender.id,

                            fromPlayerName:
                                sender.name,

                            fromPlayerAvatar:
                                sender.avatar ||
                                null,

                            salaCode:
                                salaEmisor.code,

                            message:
                                "Te invitó a su sala",
                        }
                    );
                }


                /* =================================================
                   ACTUALIZAR MUNDO
                ================================================= */

                io.to(
                    WORLD_ROOM
                ).emit(
                    "world:players",
                    {
                        players:
                            worldManager
                                .serializePlayers(),
                    }
                );

            }
        );


        /* =================================================
           ACEPTAR INVITACIÓN
        ================================================= */

        socket.on(
            "world:acceptInvitation",
            async ({ fromPlayerId }) => {

                const receiver =
                    worldManager.getPlayerBySocket(
                        socket.id
                    );

                const sender =
                    worldManager.getPlayer(
                        fromPlayerId
                    );


                if (
                    !receiver ||
                    !sender
                ) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                "La invitación ya no está disponible.",
                        }
                    );

                    return;

                }


                if (
                    !sender.online ||
                    !receiver.online
                ) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                "Uno de los jugadores ya no está conectado.",
                        }
                    );

                    return;

                }


                /*
                 * Verificar la invitación REAL.
                 */

                const invitation =
                    worldManager.getInvitationKey(
                        sender.id,
                        receiver.id
                    );


                if (
                    !worldManager.invitations.has(
                        invitation
                    )
                ) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                "La invitación ya no es válida.",
                        }
                    );

                    return;

                }


                const senderSocket =
                    io.sockets.sockets.get(
                        sender.socketId
                    );

                const receiverSocket =
                    io.sockets.sockets.get(
                        receiver.socketId
                    );


                if (
                    !senderSocket ||
                    !receiverSocket
                ) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                "Uno de los jugadores ya no está conectado.",
                        }
                    );

                    return;

                }


                /* =================================================
                   ENTRAR A LA SALA DE QUIEN INVITÓ
                ================================================= */

                worldManager.removeInvitation(
                    sender.id,
                    receiver.id
                );

                const restantes =
                    worldManager.getPendingInvitationCount(
                        sender.id
                    );

                worldManager.updatePlayer(sender.id, {
                    status: restantes > 0 ? "inviting" : "available",
                });

                worldManager.updatePlayer(receiver.id, {
                    status: "available",
                });

                const salaDestino =
                    roomManager.salaDeUsuario(
                        sender.id
                    );

                if (!salaDestino) {
                    socket.emit("world:error", {
                        message: `${sender.name} ya no está en una sala.`,
                    });
                    ayudasSala.actualizarMundo();
                    return;
                }

                const actual =
                    roomManager.salaDeUsuario(
                        receiver.id
                    );

                if (actual && actual.code !== salaDestino.code) {
                    ayudasSala.salirDeSala(receiver.id, {
                        socket: receiverSocket,
                    });
                }

                const union =
                    roomManager.unirse(
                        salaDestino.code,
                        await ayudasSala.miembroDesde(receiverSocket)
                    );

                if (!union.success) {
                    socket.emit("world:error", {
                        message: union.message,
                    });
                    ayudasSala.actualizarMundo();
                    return;
                }

                ayudasSala.vincular(receiverSocket, salaDestino);
                ayudasSala.emitirSala(salaDestino);

                receiverSocket.emit("sala:entrar", {
                    code: salaDestino.code,
                });

                senderSocket.emit("world:inviteAccepted", {
                    playerName: receiver.name,
                });

                console.log(
                    `🏠 ${receiver.name} entró a la sala ${salaDestino.code} (invitado por ${sender.name})`
                );

                ayudasSala.actualizarMundo();
            }
        );


        /* =================================================
           RECHAZAR INVITACIÓN
        ================================================= */

        socket.on(
            "world:rejectInvitation",
            ({ fromPlayerId }) => {

                const receiver =
                    worldManager.getPlayerBySocket(
                        socket.id
                    );

                if (!receiver) {
                    return;
                }


                const sender =
                    worldManager.getPlayer(
                        fromPlayerId
                    );


                if (!sender) {

                    return;

                }


                const invitation =
                    worldManager.removeInvitation(
                        sender.id,
                        receiver.id
                    );


                if (!invitation) {

                    socket.emit(
                        "world:error",
                        {
                            message:
                                "La invitación ya no está disponible.",
                        }
                    );

                    return;

                }


                /*
                 * El receptor vuelve a estar disponible.
                 */

                if (
                    receiver.online
                ) {

                    worldManager.updatePlayer(
                        receiver.id,
                        {
                            status:
                                "available",
                        }
                    );

                }


                /*
                 * El emisor solamente vuelve a
                 * "available" si ya no tiene
                 * otras invitaciones pendientes.
                 */

                const remaining =
                    worldManager.getPendingInvitationCount(
                        sender.id
                    );


                worldManager.updatePlayer(
                    sender.id,
                    {
                        status:
                            remaining > 0
                                ? "inviting"
                                : "available",
                    }
                );


                /*
                 * Avisar al emisor.
                 */

                if (
                    sender.socketId
                ) {

                    io.to(
                        sender.socketId
                    ).emit(
                        "world:invitationRejected",
                        {
                            playerName:
                                receiver.name,

                            targetPlayerId:
                                receiver.id,

                            pendingCount:
                                remaining,
                        }
                    );

                }


                io.to(
                    WORLD_ROOM
                ).emit(
                    "world:players",
                    {
                        players:
                            worldManager
                                .serializePlayers(),
                    }
                );

            }
        );


        /* =================================================
           CANCELAR INVITACIÓN
        ================================================= */

        socket.on(
            "world:cancelInvitation",
            () => {

                const player =
                    worldManager.getPlayerBySocket(
                        socket.id
                    );


                if (!player) {
                    return;
                }


                const invitations =
                    worldManager.removeAllOutgoingInvitations(
                        player.id
                    );


                for (
                    const invitation
                    of invitations
                ) {

                    const target =
                        worldManager.getPlayer(
                            invitation.toPlayerId
                        );


                    if (
                        target &&
                        target.online
                    ) {

                        worldManager.updatePlayer(
                            target.id,
                            {
                                status:
                                    "available",
                            }
                        );


                        if (
                            target.socketId
                        ) {

                            io.to(
                                target.socketId
                            ).emit(
                                "world:invitationCancelled",
                                {
                                    playerName:
                                        player.name,
                                }
                            );

                        }

                    }

                }


                worldManager.updatePlayer(
                    player.id,
                    {
                        status:
                            "available",
                    }
                );


                io.to(
                    WORLD_ROOM
                ).emit(
                    "world:players",
                    {
                        players:
                            worldManager
                                .serializePlayers(),
                    }
                );

            }
        );


        /* =================================================
           SALIR DEL MUNDO
        ================================================= */

        socket.on(
            "world:leave",
            () => {

                const player =
                    worldManager.getPlayerBySocket(
                        socket.id
                    );


                if (!player) {
                    return;
                }


                console.log(
                    `🚪 ${player.name} cerró su sesión del Mundo`
                );


                /*
 * Liberar todas las invitaciones
 * de este jugador.
 */

                const outgoing =
                    worldManager.removeAllOutgoingInvitations(
                        player.id
                    );


                for (
                    const invitation
                    of outgoing
                ) {

                    const target =
                        worldManager.getPlayer(
                            invitation.toPlayerId
                        );


                    if (
                        target &&
                        target.online
                    ) {

                        worldManager.updatePlayer(
                            target.id,
                            {
                                status:
                                    "available",
                            }
                        );


                        if (
                            target.socketId
                        ) {

                            io.to(
                                target.socketId
                            ).emit(
                                "world:invitationCancelled",
                                {
                                    playerName:
                                        player.name,
                                }
                            );

                        }

                    }

                }


                /*
                 * El jugador también puede tener
                 * invitaciones entrantes.
                 */

                worldManager.removeAllIncomingInvitations(
                    player.id
                );


                /*
                * Eliminar sesión definitivamente.
                */

                worldManager.removePlayer(
                    player.id
                );


                socket.leave(
                    WORLD_ROOM
                );


                socket.worldJoined =
                    false;

                socket.worldPlayerId =
                    null;


                /*
                * Actualizar Mundo.
                */

                io.to(
                    WORLD_ROOM
                ).emit(
                    "world:players",
                    {
                        players:
                            worldManager
                                .serializePlayers(),
                    }
                );


                socket.emit(
                    "world:left"
                );

            }
        );


        /* =================================================
           ESTADO
        ================================================= */

        socket.on(
            "game:state",
            () => {

                const room =
                    getRoomFromSocket(
                        socket
                    );

                if (!room) {
                    return;
                }

                if (!room.currentGame) {

                    socket.emit(
                        "game:state",
                        {
                            game: null,
                        }
                    );

                    return;
                }

                socket.emit(
                    "game:state",
                    {
                        game:
                            room.currentGame.toJSON(),
                    }
                );
            }
        );

        /* =================================================
           RESPUESTA MATEMÁTICA
        ================================================= */

        socket.on(
            "game:answer",
            ({
                answer,
            }) => {

                const room =
                    getRoomFromSocket(
                        socket
                    );

                if (
                    !room ||
                    !room.currentGame
                ) {

                    socket.emit(
                        "game:error",
                        {
                            message:
                                "No hay una partida activa.",
                        }
                    );

                    return;
                }

                const game =
                    room.currentGame;

                const result =
                    game.answerQuestion(
                        socket.id,
                        answer
                    );

                if (!result.success) {

                    socket.emit(
                        "game:answerResult",
                        result
                    );

                    return;
                }

                /*
                 * RESPUESTA CORRECTA
                 */

                if (result.correct) {

                    socket.emit(
                        "game:answerResult",
                        result
                    );

                    io.to(
                        room.code
                    ).emit(
                        "game:state",
                        {
                            game:
                                game.toJSON(),
                        }
                    );

                    return;
                }

                /*
                 * RESPUESTA INCORRECTA
                 */

                socket.emit(
                    "game:answerResult",
                    result
                );

                io.to(
                    room.code
                ).emit(
                    "game:turnLost",
                    {
                        failedPlayerId:
                            result.failedPlayerId,

                        failedPlayerName:
                            result.failedPlayerName,

                        nextPlayerId:
                            result.nextPlayerId,

                        nextPlayerName:
                            result.nextPlayerName,

                        message:
                            result.message,
                    }
                );

                io.to(
                    room.code
                ).emit(
                    "game:state",
                    {
                        game:
                            game.toJSON(),
                    }
                );
            }
        );

        /* =================================================
           COLOCAR FICHA
        ================================================= */

        socket.on(
            "game:play",
            ({
                cellIndex,
            }) => {

                const room =
                    getRoomFromSocket(
                        socket
                    );

                if (
                    !room ||
                    !room.currentGame
                ) {

                    socket.emit(
                        "game:playError",
                        {
                            message:
                                "No hay una partida activa.",
                        }
                    );

                    return;
                }

                const game =
                    room.currentGame;

                const result =
                    game.playCell(
                        socket.id,
                        cellIndex
                    );

                if (!result.success) {

                    socket.emit(
                        "game:playError",
                        result
                    );

                    return;
                }

                /*
                 * PARTIDA TERMINADA
                 */

                if (result.finished) {

                    if (
                        result.winner
                    ) {

                        const winnerId =
                            result.winner.id;

                        room.score.set(
                            winnerId,
                            (
                                room.score.get(
                                    winnerId
                                ) || 0
                            ) + 1
                        );
                    }

                    const finalGame =
                        game.toJSON();

                    io.to(
                        room.code
                    ).emit(
                        "game:finished",
                        {
                            game:
                                finalGame,
                        }
                    );

                    entregarPremiosTriqui(
                        room,
                        result.winner?.id || null
                    );

                    // La partida terminó: la sala queda lista
                    // para jugar otra (revancha o elegir otro juego).
                    room.estado = "sala";
                    ayudasSala.estadoMundo(room, "available");
                    ayudasSala.emitirSala(room);

                    io.to(
                        room.code
                    ).emit(
                        "game:state",
                        {
                            game:
                                finalGame,
                        }
                    );

                    emitRoomState(
                        room
                    );

                    console.log(
                        `🏁 Terminó ronda ${game.round}`
                    );

                    return;
                }

                /*
                 * PARTIDA CONTINÚA
                 */

                io.to(
                    room.code
                ).emit(
                    "game:state",
                    {
                        game:
                            game.toJSON(),
                    }
                );
            }
        );

        /* =================================================
           EMOJIS
        ================================================= */

        socket.on(
            "game:emoji",
            ({
                emoji,
            }) => {

                const room =
                    getRoomFromSocket(
                        socket
                    );

                if (!room) {
                    return;
                }

                const player =
                    room.players.get(
                        socket.id
                    );

                if (!player) {
                    return;
                }

                io.to(
                    room.code
                ).emit(
                    "game:emoji",
                    {
                        emoji,
                        playerId:
                            socket.id,
                        playerName:
                            player.name,
                        timestamp:
                            Date.now(),
                    }
                );
            }
        );

        /* =================================================
           REVANCHA
        ================================================= */

        socket.on(
            "game:rematch",
            () => {

                const room =
                    getRoomFromSocket(
                        socket
                    );

                if (!room) {

                    socket.emit(
                        "game:error",
                        {
                            message:
                                "No estás en una sala.",
                        }
                    );

                    return;
                }

                if (
                    room.players.size !== 2 ||
                    room.miembros.size !== 2
                ) {

                    socket.emit(
                        "game:error",
                        {
                            message:
                                "Se necesitan 2 jugadores para la revancha.",
                        }
                    );

                    return;
                }

                if (
                    !room.currentGame ||
                    room.currentGame.status !==
                        "finished"
                ) {

                    socket.emit(
                        "game:error",
                        {
                            message:
                                "La partida actual todavía no ha terminado.",
                        }
                    );

                    return;
                }

                if (
                    room.rematchRequested
                ) {

                    return;
                }

                room.rematchRequested =
                    true;

                /*
                 * Destruimos completamente
                 * el juego viejo.
                 */

                const newGame =
                    startTriquiGame(
                        room
                    );

                ayudasSala.estadoMundo(room, "playing");
                ayudasSala.emitirSala(room);

                console.log(
                    `🔄 REVANCHA - ronda ${room.round}`
                );

                io.to(
                    room.code
                ).emit(
                    "game:started",
                    {
                        game:
                            newGame.toJSON(),
                    }
                );

                emitRoomState(
                    room
                );
            }
        );

        /* =================================================
           SALIR DE SALA
        ================================================= */

        socket.on(
            "room:leave",
            () => {

                /*
                 * "Salir" dentro del Triqui: se termina la
                 * partida para todos, pero el jugador sigue
                 * en la sala (para elegir otro juego).
                 */
                const room =
                    roomManager.salaDeUsuario(
                        socket.userId
                    );

                if (!room) {
                    socket.emit("room:left");
                    return;
                }

                if (
                    room.estado === "jugando" &&
                    room.currentGame?.constructor?.name === "TriquiGame"
                ) {
                    const miembro =
                        room.miembros.get(String(socket.userId));

                    room.currentGame.clearTurnTimer?.();
                    room.currentGame = null;
                    room.estado = "sala";

                    socket.to(room.code).emit(
                        "game:playerDisconnected",
                        {
                            message: `${miembro?.nombre || "El otro jugador"} salió de la partida.`,
                        }
                    );

                    ayudasSala.estadoMundo(room, "available");
                }

                ayudasSala.emitirSala(room);
                socket.emit("room:left");
            }
        );

        /* =================================================
           DESCONEXIÓN
        ================================================= */

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "🔴 Socket desconectado:",
                    socket.id
                );


                /* =================================================
                🌎 LIMPIAR MUNDO
                ================================================= */

                const worldPlayer =
                    worldManager.getPlayerBySocket(
                        socket.id
                    );


                if (worldPlayer) {

                    console.log(
                        `🌎 ${worldPlayer.name} salió temporalmente del Mundo`
                    );


                    /*
 * Cancelar todas las invitaciones
 * enviadas por este jugador.
 */

                    const outgoing =
                        worldManager.removeAllOutgoingInvitations(
                            worldPlayer.id
                        );


                    for (
                        const invitation
                        of outgoing
                    ) {

                        const target =
                            worldManager.getPlayer(
                                invitation.toPlayerId
                            );


                        if (
                            target
                        ) {

                            worldManager.updatePlayer(
                                target.id,
                                {
                                    status:
                                        "available",
                                }
                            );


                            if (
                                target.socketId
                            ) {

                                io.to(
                                    target.socketId
                                ).emit(
                                    "world:invitationCancelled",
                                    {
                                        playerName:
                                            worldPlayer.name,
                                    }
                                );

                            }

                        }

                    }


                    /*
                     * Cancelar invitaciones que otros
                     * jugadores le habían enviado.
                     */

                    worldManager.removeAllIncomingInvitations(
                        worldPlayer.id
                    );


                    /*
                    * NO eliminamos al jugador.
                    *
                    * Solo marcamos que está offline.
                    *
                    * Esto permite F5 / reconexión.
                    */

                    worldManager.disconnectPlayer(
                        socket.id
                    );


                    /*
                    * Actualizar Mundo.
                    */

                    io.to(
                        WORLD_ROOM
                    ).emit(
                        "world:players",
                        {
                            players:
                                worldManager
                                    .serializePlayers(),
                        }
                    );

                }


                /* =================================================
                🏠 SALA: se le espera un rato por si recargó
                ================================================= */

                ayudasSala.desconectado(socket);

            }
        );
    }
);

/* =========================================================
   ERRORES GLOBALES
   ---------------------------------------------------------
   Registra cualquier error que se escape para que
   aparezca en los logs (pm2 logs ludogamif).
========================================================= */

process.on(
    "unhandledRejection",
    (reason) => {
        console.error(
            "❌ Promesa rechazada sin manejar:",
            reason
        );
    }
);

process.on(
    "uncaughtException",
    (error) => {
        console.error(
            "💥 Error no controlado. Reiniciando...",
            error
        );

        // PM2 lo vuelve a levantar automáticamente.
        process.exit(1);
    }
);

/* =========================================================
   BASE DE DATOS
========================================================= */

testDatabase()
    .catch((error) => {
        console.error(
            "❌ No se pudo conectar a PostgreSQL:",
            error.message
        );
    });

/* =========================================================
   SERVER
========================================================= */

httpServer.on(
    "error",
    (error) => {

        if (error.code === "EADDRINUSE") {
            console.error(
                `❌ El puerto ${PORT} ya está en uso. ` +
                "Cambia PORT en el .env o cierra el programa que lo ocupa."
            );
        } else if (error.code === "EACCES") {
            console.error(
                `❌ Sin permisos para usar el puerto ${PORT}. ` +
                "En Linux los puertos menores a 1024 requieren root; usa otro PORT."
            );
        } else {
            console.error(
                "❌ Error del servidor HTTP:",
                error
            );
        }

        process.exit(1);
    }
);

httpServer.listen(
    PORT,
    HOST,
    () => {

        console.log("");
        console.log(
            "===================================="
        );
        console.log(
            "   LUDOGAMIF GAME SERVER"
        );
        console.log(
            "===================================="
        );
        console.log(
            `🚀 Puerto: ${PORT}`
        );
        console.log(
            `🌐 Host: ${HOST}`
        );
        console.log(
            `⚙️  Entorno: ${config.NODE_ENV}`
        );
        console.log(
            `🔓 CORS: ${
                Array.isArray(config.CORS_ORIGINS)
                    ? config.CORS_ORIGINS.join(", ")
                    : "*"
            }`
        );
        console.log(
            "🎮 Triqui Matemático activo"
        );
        console.log(
            "===================================="
        );
        console.log("");

        // Avisa a PM2 que el servidor ya está listo.
        if (process.send) {
            process.send("ready");
        }
    }
);

/* =========================================================
   APAGADO LIMPIO
   ---------------------------------------------------------
   Al reiniciar (pm2 restart / CTRL+C) se cierran
   sockets y conexiones a PostgreSQL ordenadamente.
========================================================= */

let shuttingDown = false;

async function shutdown(signal) {

    if (shuttingDown) {
        return;
    }

    shuttingDown = true;

    console.log(
        `\n🛑 ${signal} recibido. Cerrando LudoGamif...`
    );

    // Si algo se queda colgado, forzar salida.
    const forceExit =
        setTimeout(
            () => process.exit(1),
            8000
        );

    forceExit.unref();

    try {

        // Detener temporizadores de partidas activas.
        for (const room of roomManager.rooms.values()) {
            room.currentGame?.clearTurnTimer?.();
        }

        // Cierra Socket.IO y también el servidor HTTP.
        await new Promise((resolve) =>
            io.close(() => resolve())
        );

        await closeDatabase();

        console.log(
            "✅ Servidor detenido correctamente."
        );

        process.exit(0);

    } catch (error) {

        console.error(
            "❌ Error al cerrar:",
            error
        );

        process.exit(1);
    }
}

process.on(
    "SIGINT",
    () => shutdown("SIGINT")
);

process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
);
