/* =========================================================
   LA MÁQUINA 🤖 (jugadores de la computadora)
   ---------------------------------------------------------
   Para jugar solo: el creador de la sala agrega máquinas en
   los puestos libres. Juegan ZonaGamif e InvasiónGamif.
     · Mueven con cabeza: avanzan, esquivan trampas, buscan las
       ❓ y caen sobre rivales para mandarlos atrás.
     · Responden bien casi siempre (PRECISION), pero a veces se
       equivocan, como una persona.
   Todo pasa en el servidor: la máquina usa las mismas
   funciones que un jugador (tirar, mover, responder…).
   No reciben premios ni cuentan en el ranking.
========================================================= */

import { META } from "../zona/ZonaGame.js";

export const PREFIJO_BOT = "bot:";
export const JUEGOS_CON_MAQUINA = ["zona", "invasion"];
export const PRECISION = 0.8; // 8 de cada 10 preguntas bien

const NOMBRES = ["Robi", "Byte", "Chispa", "Tuerca", "Pixel", "Lógica", "Volti", "Cifra"];

export const esBot = (userId) => String(userId ?? "").startsWith(PREFIJO_BOT);

const entre = (a, b) => a + Math.random() * (b - a);

/* Miembro de sala para una máquina nueva (nombre que no esté en uso). */
export function crearMaquina(room) {
    const usados = new Set([...room.miembros.values()].map((m) => m.nombre));
    const nombre = NOMBRES.find((n) => !usados.has(`🤖 ${n}`)) || `Máquina ${room.miembros.size + 1}`;
    room.contadorBots = (room.contadorBots || 0) + 1;
    return {
        userId: `${PREFIJO_BOT}${room.code}-${room.contadorBots}`,
        socketId: null,
        nombre: `🤖 ${nombre}`,
        avatar: null,
        marco: null,
        verificado: false,
        nivel: 1,
        modelo: null,
        personaje: "Máquina",
        conectado: true,
        esBot: true,
        entroEn: Date.now(),
    };
}

/* Elige la respuesta: casi siempre la correcta. */
function respuestaDe(correcta, cantidad) {
    if (Math.random() < PRECISION || cantidad < 2) return correcta;
    const malas = Array.from({ length: cantidad }, (_, i) => i).filter((i) => i !== correcta);
    return malas[Math.floor(Math.random() * malas.length)];
}

/* Base: un temporizador por máquina y se apaga si la partida ya no es la de la sala. */
class Maquinas {
    constructor(juego, ids, sigueViva) {
        this.juego = juego;
        this.ids = ids.map(String);
        this.sigueViva = sigueViva || (() => true);
        this.timers = new Map();
    }

    activa() {
        return this.juego.fase !== "terminada" && this.sigueViva();
    }

    programar(id, ms, accion) {
        clearTimeout(this.timers.get(id));
        this.timers.set(
            id,
            setTimeout(() => {
                this.timers.delete(id);
                if (!this.activa()) return;
                try {
                    accion();
                } catch (error) {
                    console.error("❌ Máquina:", error);
                }
            }, ms)
        );
    }

    parar() {
        for (const t of this.timers.values()) clearTimeout(t);
        this.timers.clear();
    }
}

/* ---------------------------------------------------------
   ZONAGAMIF
--------------------------------------------------------- */

export class MaquinasZona extends Maquinas {
    /* Se llama en cada cambio de la partida. */
    alCambiar() {
        const g = this.juego;
        if (g.fase !== "jugando") return;

        if (g.empuje && this.ids.includes(g.empuje.userId)) {
            const id = g.empuje.userId;
            return this.programar(id, entre(1200, 2200), () => {
                // Empuja la ficha rival más adelantada.
                const r = g.fichasRivales(id).sort((a, b) => b.fila - a.fila)[0];
                if (r && g.empuje?.userId === id) g.empujar(id, r.userId, r.ficha);
            });
        }

        const id = g.turno;
        if (!id || !this.ids.includes(id) || g.pregunta || g.empuje) return;

        if (g.dado === null) {
            this.programar(id, entre(900, 1600), () => g.turno === id && g.dado === null && g.tirar(id));
        } else if (g.opciones?.some(Boolean)) {
            this.programar(id, entre(900, 1500), () => {
                if (g.turno !== id || !g.opciones) return;
                const mejor = this.mejorOpcion(id);
                if (mejor) g.mover(id, mejor.ficha);
            });
        }
    }

    /* Puntaje de cada destino: avanzar, esquivar trampas, buscar ❓ y rivales. */
    mejorOpcion(id) {
        const g = this.juego;
        const yo = g.jugador(id);
        let mejor = null;
        let puntos = -Infinity;
        for (const o of g.opciones.filter(Boolean)) {
            const desde = yo.fichas[o.ficha];
            let p = (o.fila - desde.fila) * 10 + o.fila; // avanzar, y un poco más con la de adelante
            const casilla = g.casillas[o.fila]?.[o.carril];
            if (casilla?.tipo === "trampa") p += casilla.d[0] * casilla.n * 12 + (casilla.d[0] < 0 ? -6 : 0);
            if (casilla?.tipo === "pregunta") p += 8 * PRECISION;
            if (o.fila === META) p += 1000;
            if (o.atraviesa) p -= 3; // guarda el poder si puede
            const rival = g.activos().some((j) => j.userId !== id && j.fichas.some((f) => f.fila === o.fila && f.carril === o.carril));
            if (rival && o.fila > 0) p += 7;
            // Si la otra ficha se está quedando fuera de la zona, conviene moverla.
            const zona = g.zona();
            if (desde.fila <= zona.desde + 1 && o.fila > desde.fila) p += 5;
            p += Math.random() * 2; // que no sea siempre igual
            if (p > puntos) {
                puntos = p;
                mejor = o;
            }
        }
        return mejor;
    }

    /* Le tocó una ❓: piensa un poco y responde. */
    alPregunta(id) {
        const g = this.juego;
        this.programar(`p${id}`, entre(2500, 6000), () => {
            if (g.pregunta?.userId !== id) return;
            g.responder(id, respuestaDe(g.pregunta.correcta, g.pregunta.orden.length));
        });
    }
}

/* ---------------------------------------------------------
   INVASIÓNGAMIF
--------------------------------------------------------- */

export class MaquinasInvasion extends Maquinas {
    alCambiar() {
        const g = this.juego;
        if (g.fase === "votacion") {
            for (const id of this.ids) {
                if (g.votosRespuesta.has(id) || this.timers.has(`v${id}`)) continue;
                this.programar(`v${id}`, entre(1500, 4000), () => {
                    if (g.fase !== "votacion") return;
                    g.votar(id, {
                        respuesta: g.votosRespuesta.size ? [...g.votosRespuesta.values()][0] : 15,
                        duracion: g.votosDuracion.size ? [...g.votosDuracion.values()][0] : 3,
                    });
                });
            }
            return;
        }
        if (g.fase !== "jugando") return;
        for (const id of this.ids) if (!this.timers.has(id)) this.siguiente(id);
    }

    /* Cada máquina toca una casilla cada pocos segundos. */
    siguiente(id) {
        this.programar(id, entre(1800, 4200), () => this.jugar(id));
    }

    jugar(id) {
        const g = this.juego;
        if (g.fase !== "jugando") return;
        const yo = g.jugador(id);
        if (!yo || yo.salio) return;
        if (yo.activa || yo.esperaHasta > Date.now()) return this.siguiente(id);

        // Prefiere quitarle casillas al que va ganando; si no, las vacías.
        const conteo = new Map();
        g.celdas.forEach((c) => c.duenio && conteo.set(c.duenio, (conteo.get(c.duenio) || 0) + 1));
        const lider = [...conteo.entries()].filter(([u]) => u !== id).sort((a, b) => b[1] - a[1])[0]?.[0];
        const libres = g.celdas.map((c, i) => ({ c, i })).filter(({ c }) => c.duenio !== id && !c.apartada);
        if (!libres.length) return this.siguiente(id);
        const delLider = libres.filter(({ c }) => c.duenio === lider);
        const vacias = libres.filter(({ c }) => !c.duenio);
        const lista = delLider.length && Math.random() < 0.6 ? delLider : vacias.length ? vacias : libres;
        const elegida = lista[Math.floor(Math.random() * lista.length)];

        const r = g.tocar(id, elegida.i);
        if (!r.success) return this.siguiente(id);
        this.programar(`r${id}`, entre(2200, Math.max(2600, g.segundosRespuesta * 1000 * 0.6)), () => {
            const a = g.jugador(id)?.activa;
            if (a) g.responder(id, respuestaDe(a.correcta, a.orden.length));
            this.siguiente(id);
        });
    }
}
