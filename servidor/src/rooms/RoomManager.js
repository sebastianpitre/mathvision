/* =========================================================
   SALAS MULTIJUGADOR
   ---------------------------------------------------------
   Una sala reúne de 2 a 8 jugadores antes de jugar. El
   creador (anfitrión) elige el juego y lo inicia cuando la
   cantidad de jugadores sirve para ese juego. Al terminar la
   partida todos vuelven a la sala.

   El creador puede sacar a alguien de la sala; esa persona
   ya no puede volver a entrar con el código (solo si el
   creador la vuelve a invitar).

   Los miembros se identifican por su usuario (userId), no por
   la conexión: si alguien recarga la página, vuelve a la misma
   sala con su conexión nueva.

   Campos que usa el Triqui (heredados del sistema anterior):
     players (Map socketId → Player), score, round,
     currentGame, rematchRequested.
========================================================= */

import { Player } from "../players/Player.js";
import { MAX_JUGADORES_SALA, motivoNoIniciar, JUEGOS_SALA } from "../salas/juegos.js";

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
                code += chars[Math.floor(Math.random() * chars.length)];
            }
        } while (this.rooms.has(code));

        return code;
    }

    getRoom(code) {
        return this.rooms.get(String(code || "").trim().toUpperCase());
    }

    /* La sala donde está un usuario (o null). */
    salaDeUsuario(userId) {
        const id = String(userId);

        for (const room of this.rooms.values()) {
            if (room.miembros.has(id)) return room;
        }

        return null;
    }

    crearSala(miembro) {
        const code = this.generateCode();

        const room = {
            code,
            hostUserId: miembro.userId,
            juego: "siglo",
            estado: "sala", // "sala" | "jugando"
            miembros: new Map([[miembro.userId, miembro]]),
            bloqueados: new Set(), // userId de los que el creador sacó
            victorias: {}, // juego → Map(userId → partidas ganadas en esta sala)
            creadaEn: Date.now(),

            // Compatibilidad con el Triqui
            players: new Map(),
            score: new Map(),
            round: 0,
            currentGame: null,
            rematchRequested: false,
        };

        this.rooms.set(code, room);

        return room;
    }

    unirse(code, miembro) {
        const room = this.getRoom(code);

        if (!room) return { success: false, message: "Esa sala no existe. Revisa el código." };

        if (room.miembros.has(miembro.userId)) {
            // Ya estaba (por ejemplo, recargó la página).
            Object.assign(room.miembros.get(miembro.userId), miembro, { conectado: true });
            return { success: true, room };
        }

        if (room.bloqueados.has(miembro.userId)) {
            return { success: false, message: "El creador te sacó de esa sala. Solo puedes volver si te invita." };
        }

        if (room.estado === "jugando") {
            return { success: false, message: "Esa sala está en plena partida. Espera a que termine." };
        }

        if (room.miembros.size >= MAX_JUGADORES_SALA) {
            return { success: false, message: `La sala ya tiene ${MAX_JUGADORES_SALA} jugadores.` };
        }

        room.miembros.set(miembro.userId, miembro);

        return { success: true, room };
    }

    /*
     * Saca a un usuario de su sala. Si era el creador, el
     * siguiente jugador (el que lleva más tiempo) pasa a serlo.
     * Devuelve la sala que queda, o null si se borró.
     */
    quitarMiembro(room, userId) {
        if (!room) return null;

        room.miembros.delete(String(userId));

        if (room.miembros.size === 0) {
            room.currentGame?.clearTurnTimer?.();
            room.currentGame?.destruir?.();
            this.rooms.delete(room.code);
            return null;
        }

        if (room.hostUserId === String(userId)) {
            const siguiente = [...room.miembros.values()].sort((a, b) => a.entroEn - b.entroEn)[0];
            room.hostUserId = siguiente.userId;
        }

        return room;
    }

    /* Suma una partida ganada en esta sala (se ve en la sala y en el juego). */
    sumarVictoria(room, juego, userIds = []) {
        if (!room) return;
        room.victorias[juego] ||= new Map();
        for (const id of userIds) {
            if (!id) continue;
            const clave = String(id);
            room.victorias[juego].set(clave, (room.victorias[juego].get(clave) || 0) + 1);
        }
    }

    /* Prepara los datos que necesita el Triqui (por conexión). */
    prepararTriqui(room) {
        room.players = new Map();
        room.score = new Map();
        room.round = 0;

        for (const miembro of room.miembros.values()) {
            room.players.set(miembro.socketId, new Player(miembro.socketId, miembro.nombre, miembro.userId));
            room.score.set(miembro.socketId, 0);
        }
    }

    serializeRoom(room) {
        if (!room) return null;

        const miembros = [...room.miembros.values()]
            .sort((a, b) => a.entroEn - b.entroEn)
            .map((m) => ({
                userId: m.userId,
                nombre: m.nombre,
                avatar: m.avatar,
                marco: m.marco || null,
                nivel: m.nivel,
                modelo: m.modelo,
                personaje: m.personaje,
                conectado: m.conectado,
                esCreador: m.userId === room.hostUserId,
                victorias: room.victorias?.[room.juego]?.get(m.userId) || 0,
            }));

        return {
            code: room.code,
            hostUserId: room.hostUserId,
            juego: room.juego,
            estado: room.estado,
            maxJugadores: MAX_JUGADORES_SALA,
            miembros,
            motivoNoIniciar: motivoNoIniciar(room.juego, miembros.length),
            juegos: Object.values(JUEGOS_SALA),

            // Compatibilidad con el Triqui
            players: [...room.players.values()].map((p) => p.toJSON()),
            round: room.round,
            score: Object.fromEntries(room.score),
            hasGame: Boolean(room.currentGame),
        };
    }
}
