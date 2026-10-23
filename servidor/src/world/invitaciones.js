/* =========================================================
   INVITACIONES A LA SALA
   ---------------------------------------------------------
   Navegador → servidor
     world:invite { targetPlayerId }
     world:acceptInvitation { fromPlayerId }
     world:rejectInvitation { fromPlayerId }
     world:cancelInvitation

   Servidor → navegador
     world:invitation { fromPlayerId, fromPlayerName, fromPlayerAvatar, salaCode, expiraEn }
     world:inviteSent { targetPlayerId, targetPlayerName, otraVezEn }
     world:inviteAccepted { playerName }
     world:invitationRejected { playerName, targetPlayerId }
     world:error { message, targetPlayerId? }

   Reglas:
   · Invitar NO cambia el estado de nadie: quien recibe sigue
     disponible para otras invitaciones y quien invita puede
     volver a invitar a la misma persona las veces que quiera,
     con una espera corta entre una y otra (ESPERA_MISMO_MS).
   · Una invitación vence sola a los VIGENCIA_MS.
   · No se invita a quien está en plena partida.
========================================================= */

const ESPERA_MISMO_MS = 10_000;
const VIGENCIA_MS = 30_000;

export function registrarInvitaciones(socket, { io, worldManager, roomManager, ayudasSala, MAX_JUGADORES_SALA }) {
    const error = (message, extra = {}) => socket.emit("world:error", { message, ...extra });

    /* ---------------- INVITAR ---------------- */

    socket.on("world:invite", async ({ targetPlayerId } = {}) => {
        const sender = worldManager.getPlayerBySocket(socket.id);
        const target = worldManager.getPlayer(targetPlayerId);

        if (!sender) return error("Vuelve a entrar para poder invitar.");
        if (!target || !target.online) return error("Ese jugador ya no está conectado.", { targetPlayerId });
        if (String(target.id) === String(sender.id)) return error("No puedes invitarte a ti mismo.");

        const salaDestino = roomManager.salaDeUsuario(target.id);
        if (salaDestino?.estado === "jugando") {
            return error(`${target.name} está jugando ahora.`, { targetPlayerId });
        }

        // Espera corta para no llenar de invitaciones a la misma persona.
        const anterior = worldManager.invitations.get(worldManager.getInvitationKey(sender.id, target.id));
        if (anterior && Date.now() - anterior.createdAt < ESPERA_MISMO_MS) {
            const seg = Math.ceil((ESPERA_MISMO_MS - (Date.now() - anterior.createdAt)) / 1000);
            return error(`Espera ${seg} s para invitar otra vez a ${target.name}.`, {
                targetPlayerId,
                otraVezEn: anterior.createdAt + ESPERA_MISMO_MS,
            });
        }

        const limite = worldManager.canSendInvitation(sender.id);
        if (!limite.allowed) return error(limite.reason, { targetPlayerId });

        /* Sala de quien invita: si no tiene, se le crea. */
        let sala = roomManager.salaDeUsuario(sender.id);

        if (!sala) {
            sala = roomManager.crearSala(await ayudasSala.miembroDesde(socket));
            ayudasSala.vincular(socket, sala);
            ayudasSala.emitirSala(sala);
            socket.emit("sala:entrar", { code: sala.code });
        }

        if (sala.estado === "jugando") return error("Termina la partida antes de invitar.", { targetPlayerId });
        if (sala.miembros.has(String(target.id))) return error(`${target.name} ya está en tu sala.`, { targetPlayerId });
        if (sala.miembros.size >= MAX_JUGADORES_SALA) {
            return error(`Tu sala ya está llena (${MAX_JUGADORES_SALA} jugadores).`, { targetPlayerId });
        }

        // Alguien que el creador sacó solo vuelve si el creador lo invita.
        if (sala.bloqueados.has(String(target.id))) {
            if (sala.hostUserId !== String(sender.id)) {
                return error(`El creador sacó a ${target.name} de la sala.`, { targetPlayerId });
            }
            sala.bloqueados.delete(String(target.id));
        }

        // Una invitación nueva reemplaza a la anterior.
        worldManager.removeInvitation(sender.id, target.id);
        const invitacion = worldManager.createInvitation(sender.id, target.id);

        setTimeout(() => {
            const actual = worldManager.invitations.get(invitacion.id);
            if (actual && actual.createdAt === invitacion.createdAt) worldManager.invitations.delete(invitacion.id);
        }, VIGENCIA_MS);

        socket.emit("world:inviteSent", {
            targetPlayerId: target.id,
            targetPlayerName: target.name,
            otraVezEn: Date.now() + ESPERA_MISMO_MS,
        });

        if (target.socketId) {
            io.to(target.socketId).emit("world:invitation", {
                fromPlayerId: sender.id,
                fromPlayerName: sender.name,
                fromPlayerAvatar: sender.avatar || null,
                salaCode: sala.code,
                expiraEn: Date.now() + VIGENCIA_MS,
                message: "Te invitó a su sala",
            });
        }
    });

    /* ---------------- ACEPTAR ---------------- */

    socket.on("world:acceptInvitation", async ({ fromPlayerId } = {}) => {
        const receiver = worldManager.getPlayerBySocket(socket.id);
        const sender = worldManager.getPlayer(fromPlayerId);

        if (!receiver || !sender) return error("La invitación ya no está disponible.");

        const invitacion = worldManager.removeInvitation(sender.id, receiver.id);
        if (!invitacion || invitacion.rechazada) return error("La invitación ya venció.");

        const senderSocket = sender.online ? io.sockets.sockets.get(sender.socketId) : null;
        if (!senderSocket) return error(`${sender.name} ya no está conectado.`);

        const sala = roomManager.salaDeUsuario(sender.id);
        if (!sala) return error(`${sender.name} ya no está en una sala.`);

        const actual = roomManager.salaDeUsuario(receiver.id);
        if (actual && actual.code !== sala.code) {
            if (actual.estado === "jugando") return error("Termina tu partida antes de cambiar de sala.");
            ayudasSala.salirDeSala(receiver.id, { socket });
        }

        const union = roomManager.unirse(sala.code, await ayudasSala.miembroDesde(socket));
        if (!union.success) return error(union.message);

        ayudasSala.vincular(socket, sala);
        ayudasSala.emitirSala(sala);
        socket.emit("sala:entrar", { code: sala.code });
        senderSocket.emit("world:inviteAccepted", { playerName: receiver.name });

        console.log(`🏠 ${receiver.name} entró a la sala ${sala.code} (invitado por ${sender.name})`);
    });

    /* ---------------- RECHAZAR ---------------- */

    socket.on("world:rejectInvitation", ({ fromPlayerId } = {}) => {
        const receiver = worldManager.getPlayerBySocket(socket.id);
        const sender = worldManager.getPlayer(fromPlayerId);
        if (!receiver || !sender) return;

        // Se quita, pero sin borrar la espera: así no lo invitan de nuevo al instante.
        const invitacion = worldManager.invitations.get(worldManager.getInvitationKey(sender.id, receiver.id));
        if (!invitacion || invitacion.rechazada) return;
        invitacion.rechazada = true;

        if (sender.online && sender.socketId) {
            io.to(sender.socketId).emit("world:invitationRejected", {
                playerName: receiver.name,
                targetPlayerId: receiver.id,
            });
        }
    });

    /* ---------------- CANCELAR LAS QUE ENVIÉ ---------------- */

    socket.on("world:cancelInvitation", () => {
        const player = worldManager.getPlayerBySocket(socket.id);
        if (!player) return;

        for (const invitacion of worldManager.removeAllOutgoingInvitations(player.id)) {
            const target = worldManager.getPlayer(invitacion.toPlayerId);
            if (target?.online && target.socketId) {
                io.to(target.socketId).emit("world:invitationCancelled", { playerName: player.name });
            }
        }
    });
}
