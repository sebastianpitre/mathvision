/* =========================================================
   MUNDO 3D · CÍRCULOS DE JUEGO
   ---------------------------------------------------------
   El admin pone círculos con un letrero del juego. Cuando
   alguien se para adentro empieza la cuenta (los "segundos"
   del círculo, 30 por defecto). Al llegar a cero:
   · Se arma una sala con los que estén adentro, en el orden
     en que entraron, hasta el máximo que admite el juego.
     Los demás se quedan y el círculo vuelve a contar.
   · Si faltan jugadores y el juego admite la máquina 🤖, se
     completa con máquinas; si no, se avisa y se vuelve a contar.
   · Los elegidos salen del mundo a la pantalla previa
     (nombres con ✓) y la partida empieza cuando todos cargan.
   El círculo queda libre de inmediato para los demás.
========================================================= */

import { JUEGOS_SALA, MAX_JUGADORES_SALA, motivoNoIniciar } from "../salas/juegos.js";
import { crearMaquina } from "../games/bots/maquinas.js";

export function crearCirculos({ io, roomManager, ayudas, arranque, jugadores, sacarDelMundo, emitir }) {
    const estados = new Map(); // id del círculo → { hasta, entradas: Map(userId → cuándo entró), dentro }

    const dentroDe = (c, j) => !j.saliendo && !j.cargadoPor && j.y < 1.6 && Math.hypot(j.x - c.x, j.z - c.z) <= c.ancho / 2;

    async function armarPartida(c, elegidos) {
        const juego = JUEGOS_SALA[c.juego];
        const miembros = [];
        for (const j of elegidos) {
            const socket = io.sockets.sockets.get(j.socketId);
            if (!socket) continue;
            ayudas.salirDeSala(String(j.userId), { socket });
            miembros.push({ socket, miembro: await ayudas.miembroDesde(socket) });
        }
        if (!miembros.length) return;

        const room = roomManager.crearSala(miembros[0].miembro);
        room.juego = c.juego;
        room.desdeMundo = true;
        for (const { miembro } of miembros.slice(1)) roomManager.unirse(room.code, miembro);
        while (juego.maquina && room.miembros.size < juego.min) {
            const bot = crearMaquina(room);
            room.miembros.set(bot.userId, bot);
        }
        for (const { socket } of miembros) ayudas.vincular(socket, room);

        // Salen del mundo y van a la pantalla previa.
        for (const { socket } of miembros) {
            sacarDelMundo(socket.userId);
            socket.emit("mundo:aPartida", { juego: c.juego, codigo: room.code });
        }
        arranque.preparar(room);
        console.log(`⭕ Mundo: círculo de ${juego.nombre} armó la sala ${room.code} con ${miembros.length} jugador(es)`);
    }

    /* Se llama cada 500 ms con el diseño actual. */
    function revisar(objetos) {
        const ahora = Date.now();
        const circulos = objetos.filter((o) => o.tipo === "circulo" && (o.funcion || "juego") === "juego");
        let cambio = false;

        for (const c of circulos) {
            const e = estados.get(c.id) || { hasta: null, entradas: new Map(), dentro: 0, aviso: "" };
            estados.set(c.id, e);

            const adentro = [...jugadores.values()].filter((j) => dentroDe(c, j));
            const ids = new Set(adentro.map((j) => j.userId));
            for (const id of e.entradas.keys()) if (!ids.has(id)) e.entradas.delete(id);
            for (const j of adentro) if (!e.entradas.has(j.userId)) e.entradas.set(j.userId, ahora);

            if (adentro.length !== e.dentro) {
                e.dentro = adentro.length;
                cambio = true;
            }

            if (!adentro.length) {
                if (e.hasta) {
                    e.hasta = null;
                    e.aviso = "";
                    cambio = true;
                }
                continue;
            }

            if (!e.hasta) {
                e.hasta = ahora + c.segundos * 1000;
                e.aviso = "";
                cambio = true;
                continue;
            }
            if (ahora < e.hasta) continue;

            // ¡Se acabó la cuenta!
            const juego = JUEGOS_SALA[c.juego];
            const cupo = Math.min(juego.max, MAX_JUGADORES_SALA);
            const elegidos = adentro.sort((a, b) => e.entradas.get(a.userId) - e.entradas.get(b.userId)).slice(0, cupo);
            const faltan = !juego.maquina && motivoNoIniciar(c.juego, elegidos.length);

            if (faltan) {
                e.hasta = ahora + c.segundos * 1000;
                e.aviso = `Faltan jugadores: ${juego.nombre} es de ${juego.min}${juego.max > juego.min ? ` a ${juego.max}` : ""}`;
                cambio = true;
                continue;
            }

            for (const j of elegidos) {
                e.entradas.delete(j.userId);
                j.saliendo = true; // ya no cuenta en ningún círculo
            }
            e.hasta = null; // el círculo queda libre de inmediato
            e.aviso = "";
            e.dentro = Math.max(0, adentro.length - elegidos.length);
            cambio = true;
            armarPartida(c, elegidos).catch((err) => console.error("❌ Círculo del mundo:", err.message));
        }

        for (const id of estados.keys()) if (!circulos.some((c) => c.id === id)) estados.delete(id);
        if (cambio) emitir();
    }

    const estado = () => ({
        ahora: Date.now(),
        c: [...estados.entries()].map(([id, e]) => ({ id, hasta: e.hasta, dentro: e.dentro, aviso: e.aviso })),
    });

    return { revisar, estado };
}
