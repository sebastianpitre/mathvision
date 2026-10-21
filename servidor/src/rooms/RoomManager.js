export class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    generateCode() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let code;

        do {
            code = "";

            for (let i = 0; i < 5; i++) {
                code += chars[
                    Math.floor(Math.random() * chars.length)
                ];
            }

        } while (this.rooms.has(code));

        return code;
    }

    createRoom(player) {
        const code = this.generateCode();

        const room = {
            code,

            players: new Map([
                [player.id, player],
            ]),

            currentGame: null,

            round: 0,

            score: new Map(),

            rematchRequested: false,
        };

        room.score.set(player.id, 0);

        this.rooms.set(code, room);

        return room;
    }

    getRoom(code) {
        return this.rooms.get(
            String(code || "").toUpperCase()
        );
    }

    joinRoom(code, player) {
        const room = this.getRoom(code);

        if (!room) {
            return {
                success: false,
                message: "La sala no existe.",
            };
        }

        if (room.players.size >= 2) {
            return {
                success: false,
                message: "La sala ya está llena.",
            };
        }

        if (room.players.has(player.id)) {
            return {
                success: false,
                message: "Ya estás dentro de esta sala.",
            };
        }

        room.players.set(player.id, player);

        if (!room.score.has(player.id)) {
            room.score.set(player.id, 0);
        }

        return {
            success: true,
            room,
        };
    }

    removePlayer(socketId) {
        for (const [code, room] of this.rooms) {

            if (!room.players.has(socketId)) {
                continue;
            }

            room.players.delete(socketId);

            room.score.delete(socketId);

            // Si había una partida, se destruye
            // (y se apaga su temporizador de turno).
            room.currentGame?.clearTurnTimer?.();
            room.currentGame = null;
            room.rematchRequested = false;

            // Si quedó vacía, eliminamos la sala.
            if (room.players.size === 0) {
                this.rooms.delete(code);

                return {
                    room: null,
                    deleted: true,
                };
            }

            return {
                room,
                deleted: false,
            };
        }

        return {
            room: null,
            deleted: false,
        };
    }

    leaveRoom(code, socketId) {
        const room = this.getRoom(code);

        if (!room) {
            return null;
        }

        room.players.delete(socketId);
        room.score.delete(socketId);

        room.currentGame?.clearTurnTimer?.();
        room.currentGame = null;
        room.rematchRequested = false;

        if (room.players.size === 0) {
            this.rooms.delete(room.code);
            return null;
        }

        return room;
    }

    serializeRoom(room) {
        if (!room) {
            return null;
        }

        return {
            code: room.code,

            players: Array.from(
                room.players.values()
            ).map((player) =>
                player.toJSON()
            ),

            round: room.round,

            score: Object.fromEntries(
                room.score
            ),

            hasGame: Boolean(
                room.currentGame
            ),
        };
    }
}