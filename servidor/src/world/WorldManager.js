export class WorldManager {

    constructor() {

        /*
         * Jugadores registrados en el Mundo.
         *
         * key = worldPlayerId PERMANENTE
         *
         * socket.id solamente representa
         * la conexión actual.
         */

        this.players = new Map();


        /*
         * INVITACIONES
         *
         * key =
         * `${fromPlayerId}:${toPlayerId}`
         *
         * Esto permite que un jugador tenga
         * varias invitaciones pendientes.
         */

        this.invitations = new Map();


        /*
         * ANTISPAM
         *
         * Guardamos timestamps de invitaciones
         * enviadas por cada jugador.
         */

        this.invitationHistory = new Map();


        /*
         * LIMITES
         */

        this.MAX_PENDING_INVITATIONS = 5;

        this.MAX_INVITES_PER_WINDOW = 10;

        this.INVITE_WINDOW_MS = 30 * 1000;


        /*
         * Estado real de cada jugador (lo pone server.js según
         * su sala): "available" | "sala" | "playing".
         * Invitar ya no cambia el estado de nadie.
         */

        this.estadoDe = null;

    }


    /* =========================================================
       AGREGAR / RECUPERAR JUGADOR
    ========================================================= */

    addOrReconnectPlayer(
        worldPlayerId,
        socketId,
        name,
        avatar = null
    ) {

        const cleanName =
            String(name || "Jugador")
                .trim()
                .slice(0, 30);

        let player =
            this.players.get(
                worldPlayerId
            );


        if (player) {

            player.socketId =
                socketId;

            player.name =
                cleanName ||
                player.name;

            player.avatar =
                avatar ||
                player.avatar ||
                null;

            player.status =
                "available";

            player.online =
                true;

            player.lastSeen =
                Date.now();

            /*
             * NO destruimos las invitaciones
             * automáticamente aquí.
             *
             * Las invitaciones pertenecen al
             * estado del Mundo, no al socket.
             */

            return player;

        }


        player = {

            id:
                worldPlayerId,

            socketId,

            name:
                cleanName ||
                "Jugador",

            avatar:
                avatar || null,

            status:
                "available",

            online:
                true,

            roomCode:
                null,

            joinedAt:
                Date.now(),

            lastSeen:
                Date.now(),

        };


        this.players.set(
            worldPlayerId,
            player
        );


        return player;

    }


    /* =========================================================
       OBTENER POR ID
    ========================================================= */

    getPlayer(
        worldPlayerId
    ) {

        return this.players.get(
            String(worldPlayerId)
        ) || null;

    }


    /* =========================================================
       OBTENER POR SOCKET
    ========================================================= */

    getPlayerBySocket(
        socketId
    ) {

        for (
            const player
            of this.players.values()
        ) {

            if (
                player.socketId ===
                socketId
            ) {

                return player;

            }

        }

        return null;

    }


    /* =========================================================
       INVITACIONES
    ========================================================= */

    getInvitationKey(
        fromPlayerId,
        toPlayerId
    ) {

        return `${fromPlayerId}:${toPlayerId}`;

    }


    hasInvitation(
        fromPlayerId,
        toPlayerId
    ) {

        return this.invitations.has(
            this.getInvitationKey(
                fromPlayerId,
                toPlayerId
            )
        );

    }


    createInvitation(
        fromPlayerId,
        toPlayerId
    ) {

        const key =
            this.getInvitationKey(
                fromPlayerId,
                toPlayerId
            );


        if (
            this.invitations.has(
                key
            )
        ) {

            return null;

        }


        const invitation = {

            id:
                key,

            fromPlayerId:
                String(fromPlayerId),

            toPlayerId:
                String(toPlayerId),

            createdAt:
                Date.now(),

        };


        this.invitations.set(
            key,
            invitation
        );


        return invitation;

    }


    removeInvitation(
        fromPlayerId,
        toPlayerId
    ) {

        const key =
            this.getInvitationKey(
                fromPlayerId,
                toPlayerId
            );

        const invitation =
            this.invitations.get(
                key
            );


        if (!invitation) {

            return null;

        }


        this.invitations.delete(
            key
        );


        return invitation;

    }


    getOutgoingInvitations(
        playerId
    ) {

        const id =
            String(playerId);

        return Array.from(
            this.invitations.values()
        )
            .filter(
                (invitation) =>
                    invitation.fromPlayerId === id
            );

    }


    getIncomingInvitations(
        playerId
    ) {

        const id =
            String(playerId);

        return Array.from(
            this.invitations.values()
        )
            .filter(
                (invitation) =>
                    invitation.toPlayerId === id
            );

    }


    getPendingInvitationCount(
        playerId
    ) {

        return this
            .getOutgoingInvitations(
                playerId
            )
            .length;

    }


    removeAllOutgoingInvitations(
        playerId
    ) {

        const removed = [];

        const id =
            String(playerId);


        for (
            const invitation
            of this.invitations.values()
        ) {

            if (
                invitation.fromPlayerId ===
                id
            ) {

                this.invitations.delete(
                    invitation.id
                );

                removed.push(
                    invitation
                );

            }

        }


        return removed;

    }


    removeAllIncomingInvitations(
        playerId
    ) {

        const removed = [];

        const id =
            String(playerId);


        for (
            const invitation
            of this.invitations.values()
        ) {

            if (
                invitation.toPlayerId ===
                id
            ) {

                this.invitations.delete(
                    invitation.id
                );

                removed.push(
                    invitation
                );

            }

        }


        return removed;

    }


    /* =========================================================
       ANTISPAM
    ========================================================= */

    canSendInvitation(
        playerId
    ) {

        const id =
            String(playerId);

        const now =
            Date.now();


        let history =
            this.invitationHistory.get(
                id
            );


        if (!history) {

            history = [];

            this.invitationHistory.set(
                id,
                history
            );

        }


        /*
         * Eliminar registros viejos.
         */

        history =
            history.filter(
                (timestamp) =>
                    now - timestamp <
                    this.INVITE_WINDOW_MS
            );


        this.invitationHistory.set(
            id,
            history
        );


        if (
            history.length >=
            this.MAX_INVITES_PER_WINDOW
        ) {

            return {

                allowed:
                    false,

                reason:
                    "Has enviado demasiadas invitaciones. Espera unos segundos e inténtalo de nuevo.",

            };

        }


        history.push(
            now
        );


        return {

            allowed:
                true,

            reason:
                null,

        };

    }


    /* =========================================================
       DESCONEXIÓN
    ========================================================= */

    disconnectPlayer(
        socketId
    ) {

        const player =
            this.getPlayerBySocket(
                socketId
            );


        if (!player) {

            return null;

        }


        player.socketId =
            null;

        player.online =
            false;

        player.lastSeen =
            Date.now();


        /*
         * Eliminamos invitaciones asociadas
         * al jugador desconectado.
         */

        this.removeAllOutgoingInvitations(
            player.id
        );

        this.removeAllIncomingInvitations(
            player.id
        );


        player.status =
            "available";

        player.roomCode =
            null;


        return player;

    }


    /* =========================================================
       ELIMINAR DEFINITIVAMENTE
    ========================================================= */

    removePlayer(
        worldPlayerId
    ) {

        const id =
            String(worldPlayerId);

        const player =
            this.players.get(
                id
            );


        if (!player) {

            return null;

        }


        this.removeAllOutgoingInvitations(
            id
        );

        this.removeAllIncomingInvitations(
            id
        );

        this.invitationHistory.delete(
            id
        );


        this.players.delete(
            id
        );


        return player;

    }


    /* =========================================================
       ACTUALIZAR
    ========================================================= */

    updatePlayer(
        worldPlayerId,
        changes
    ) {

        const player =
            this.players.get(
                String(worldPlayerId)
            );


        if (!player) {

            return null;

        }


        Object.assign(
            player,
            changes
        );


        player.lastSeen =
            Date.now();


        return player;

    }


    /* =========================================================
       JUGADORES ONLINE
    ========================================================= */

    getPlayers() {

        return Array.from(
            this.players.values()
        )
            .filter(
                (player) =>
                    player.online &&
                    player.socketId
            );

    }


    /* =========================================================
       DISPONIBLES
    ========================================================= */

    getAvailablePlayers() {

        return this
            .getPlayers()
            .filter(
                (player) =>
                    player.status ===
                    "available"
            );

    }


    /* =========================================================
       SERIALIZAR
    ========================================================= */

    serializePlayers() {

        return this
            .getPlayers()
            .map(
                (player) => {

                    const outgoing =
                        this.getOutgoingInvitations(
                            player.id
                        );

                    const incoming =
                        this.getIncomingInvitations(
                            player.id
                        );


                    const status =
                        this.estadoDe?.(player.id) ||
                        (player.status === "playing" ? "playing" : "available");


                    return {

                        id:
                            player.id,

                        name:
                            player.name,

                        avatar:
                            player.avatar || null,

                        marco:
                            player.marco || null,

                        admin:
                            Boolean(player.admin),

                        rango:
                            player.rango || null,

                        status,

                        pendingOutgoing:
                            outgoing.length,

                        pendingIncoming:
                            incoming.length,

                    };

                }
            );

    }

}