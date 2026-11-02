/* =========================================================
   MUNDO 3D · CANCHA (minijuego azul vs rojo: básquet o fútbol)
   ---------------------------------------------------------
   El admin pone una "cancha" en el editor y elige:
   · su tamaño (ancho × largo), el balón (normal o uno de
     "mis objetos") y su tamaño, los minutos del partido y
     cuántos caben por equipo;
   · dos cestas (aros en el aire): la 0 es del equipo azul y
     la 1 del rojo. Cada equipo encesta en la del contrario;
   · dos bolas para entrar (0 azul, 1 rojo).
   Para jugar: párate junto a una bola 3 segundos y entras a
   ese equipo (si el otro tiene muchos menos, te pasan a ese).
   Adentro no se sale caminando: solo con el botón Salir.
   Agarrar: si el balón está cerca lo tomas; si alguien cerca
   lo tiene se lo quitas; si no, alzas al de al lado.
   Lanzar: apuntas con la fuerza (0…1) hacia donde mira la cámara.
   Todas las posiciones de cestas y entradas van en metros
   relativos al centro de la cancha (y giran con ella).
   Fútbol ("deporte"): las "cestas" son porterías (marco de
   ancho = 2 × radio y alto = y); el balón va a los pies y se
   patea; los palos rebotan (suena "palo").
   El balón no atraviesa a los jugadores: si lo lanzó un
   compañero, lo recibe (pase); si no, rebota.
   Falta: alzar a un rival y lanzarlo. Se cobra desde donde
   lo alzaron: el que la recibió aparece ahí con el balón.
   Cada acción manda "cancha:sonido" y el navegador suena el
   sonido que el admin eligió para esa cancha.
   Básquet: cada aro puede tener su tablero (flotante, detrás
   del aro; se sube/baja y se mide en el editor; suena "tablero").
   Fútbol: arqueros que van de un palo al otro (suena "arquero").
   Bots (bots.js): completan los equipos mientras haya alguien
   jugando; cuando entra una persona, sale un bot.
========================================================= */

import { nombreBot, pensarBots } from "./bots.js";

export const G_BALON = 14; // gravedad del balón (m/s²)
const PASO_MS = 50;
const ENVIO_MS = 100;
const ESPERA_ENTRAR_MS = 3000;
const RADIO_ENTRADA = 1.4; // metros desde el centro de la bola de entrada
const ALCANCE_BALON = 1.9;
const ALCANCE_ROBO = 1.9;
const PROTEGIDO_MS = 700; // recién tomado no se lo pueden quitar
const PAUSA_CESTA_MS = 1500;
const PAUSA_FIN_MS = 6000;
const EQUIPOS = ["azul", "rojo"];

const PAUSA_FALTA_MS = 1200; // la falta se cobra cuando el lanzado ya cayó
const PROTEGIDO_FALTA_MS = 2500;
const RADIO_JUGADOR = 0.4;
const ALTO_JUGADOR = 1.85;
const GRUESO_PALO = 0.22; // un poco más grueso hacia afuera: el balón que roza el palo, suena

/*
 * Arquero i (fútbol): va y viene de un palo al otro, un poco
 * adelante de la línea. t = hora (ms). El navegador usa lo mismo.
 */
export function arqueroEn(c, i, t) {
    const k = c.cestas[i];
    const a = c.arqueros;
    const rango = Math.max(0, k.radio - a.ancho / 2);
    const lado = Math.sign(k.z) || (i === 0 ? -1 : 1);
    return { lx: k.x + Math.sin((t / 1000) * a.velocidad * 1.3 + i * Math.PI) * rango, lz: k.z - lado * 0.5 };
}

/* Tablero del aro i (básquet): centro en coordenadas de la cancha. */
export function tableroDe(c, i) {
    const k = c.cestas[i];
    const t = k.tablero;
    const lado = Math.sign(k.z) || (i === 0 ? -1 : 1);
    return { lx: k.x, lz: k.z + lado * (k.radio + t.atras), y: k.y + t.dy, ancho: t.ancho, alto: t.alto };
}

/*
 * Fuerza (0…1) → velocidades de salida y desde qué altura sale.
 * Básquet: se lanza por encima de la cabeza. Fútbol: se patea desde
 * el piso, más rápido y más bajito. El navegador usa lo mismo para la mira.
 */
export function tiroBalon(f, deporte = "basquet") {
    const k = Math.min(1, Math.max(0, Number(f) || 0));
    if (deporte === "futbol") return { vh: 4 + 14 * k, vy: 1.5 + 6.5 * k, adelante: 0.7, alto: null };
    return { vh: 3 + 10 * k, vy: 5 + 5 * k, adelante: 0.6, alto: 1.9 };
}

const r2 = (n) => Math.round(n * 100) / 100;

function aMundo(o, lx, lz) {
    const a = ((o.rot || 0) * Math.PI) / 180;
    return { x: o.x + lx * Math.cos(a) + lz * Math.sin(a), z: o.z - lx * Math.sin(a) + lz * Math.cos(a) };
}

function aLocal(o, x, z) {
    const a = ((o.rot || 0) * Math.PI) / 180;
    const dx = x - o.x;
    const dz = z - o.z;
    return { lx: dx * Math.cos(a) - dz * Math.sin(a), lz: dx * Math.sin(a) + dz * Math.cos(a) };
}

/* Deja el punto adentro de la cancha (con un margen). */
export function dentroDeCancha(o, x, z, margen = 0.35) {
    const { lx, lz } = aLocal(o, x, z);
    const hx = o.ancho / 2 - margen;
    const hz = o.largo / 2 - margen;
    return aMundo(o, Math.max(-hx, Math.min(hx, lx)), Math.max(-hz, Math.min(hz, lz)));
}

export function crearCanchas({ io, jugadores, sala }) {
    const estados = new Map(); // id → estado del partido
    let objetos = [];

    const canchas = () => objetos.filter((o) => o.tipo === "cancha");
    const socketDe = (j) => io.sockets.sockets.get(j.socketId);

    function nuevoBalon(c) {
        return { x: c.x, y: (c.y || 0) + 4, z: c.z, vx: 0, vy: 0, vz: 0, por: null, ultimo: null, protegido: 0, quieto: false, soltado: 0 };
    }

    /* Avisa a todos que suene el sonido de una acción (lo elige el admin por cancha). */
    const ultimosSonidos = new Map();
    function sonar(c, accion, p = c, espera = 0) {
        const clave = `${c.id}:${accion}`;
        const ahora = Date.now();
        if (espera && ahora - (ultimosSonidos.get(clave) || 0) < espera) return;
        ultimosSonidos.set(clave, ahora);
        io.to(sala).emit("cancha:sonido", { id: c.id, accion, x: r2(p.x), z: r2(p.z) });
    }

    /* Dónde va el balón cuando alguien lo lleva: en las manos (básquet) o a los pies (fútbol). */
    function enManos(c, j) {
        if (c.deporte === "futbol") return { x: j.x + Math.sin(j.r) * 0.6, y: j.y + c.tamBalon / 2, z: j.z + Math.cos(j.r) * 0.6 };
        return { x: j.x + Math.sin(j.r) * 0.45, y: j.y + 1.15, z: j.z + Math.cos(j.r) * 0.45 };
    }

    function estadoDe(c) {
        let e = estados.get(c.id);
        if (!e) {
            e = {
                equipos: new Map(), // userId → "azul" | "rojo"
                puntos: { azul: 0, rojo: 0 },
                cestas: new Map(), // userId → cestas en este partido
                entrando: new Map(), // userId → { equipo, desde }
                balon: nuevoBalon(c),
                termina: null,
                fin: null,
                pausa: 0,
                cambio: true,
                bots: new Map(), // id → { id, nombre, equipo, x, y, z, r, andando }
                forma: JSON.stringify([c.x, c.z, c.y, c.rot, c.ancho, c.largo, c.tamBalon]),
            };
            estados.set(c.id, e);
        }
        return e;
    }

    /* Personas y bots del partido, con su equipo. */
    const ent = (e, id) => jugadores.get(id) || e.bots.get(id) || null;
    const equipoDe = (e, id) => e.equipos.get(id) || e.bots.get(id)?.equipo || null;
    function participantes(e) {
        const lista = [];
        for (const [uid, equipo] of e.equipos) {
            const j = jugadores.get(uid);
            if (j) lista.push({ ...j, id: uid, equipo, real: j });
        }
        for (const b of e.bots.values()) lista.push(Object.assign(b, { real: b }));
        return lista;
    }

    function publico(c, e) {
        const nombre = (id) => ent(e, id)?.nombre || "Jugador";
        const top = [...e.cestas.entries()]
            .filter(([, n]) => n > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, n]) => ({ userId: id, nombre: nombre(id), cestas: n, equipo: equipoDe(e, id) }));
        // Goleadores de cada equipo (para el cartel de la cancha).
        const goles = [...e.cestas.entries()]
            .filter(([, n]) => n > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([id, n]) => ({ nombre: nombre(id), cestas: n, equipo: equipoDe(e, id) }));
        return {
            id: c.id,
            equipos: Object.fromEntries(e.equipos),
            bots: [...e.bots.values()].map((b) => ({ id: b.id, nombre: b.nombre, equipo: b.equipo })),
            goles,
            puntos: e.puntos,
            top,
            termina: e.termina,
            fin: e.fin,
            entrando: Object.fromEntries([...e.entrando].map(([id, x]) => [id, { equipo: x.equipo, hasta: x.desde + ESPERA_ENTRAR_MS }])),
        };
    }

    const emitirEstado = (c, e) => io.to(sala).emit("cancha:estado", { ahora: Date.now(), cancha: publico(c, e) });

    /* Lo que ve cada uno al entrar al mundo. */
    function todos() {
        return { ahora: Date.now(), canchas: canchas().map((c) => publico(c, estadoDe(c))) };
    }

    const cuantos = (e, equipo) => [...e.equipos.values()].filter((x) => x === equipo).length;

    /* Lugar en su mitad de la cancha (cerca de su cesta). */
    function lugarEnSuMitad(c, equipo) {
        const lado = equipo === "azul" ? -1 : 1;
        const lx = (Math.random() - 0.5) * Math.min(c.ancho - 2, 6);
        const lz = lado * (c.largo / 4) + (Math.random() - 0.5) * 2;
        return aMundo(c, lx, lz);
    }

    function soltarBalon(e, j) {
        if (e.balon.por !== j.userId) return;
        Object.assign(e.balon, { por: null, vx: 0, vy: 0, vz: 0, quieto: false });
    }

    function entrar(c, e, j, pedido) {
        const otro = pedido === "azul" ? "rojo" : "azul";
        let equipo = pedido;
        // Si el elegido queda con 2 o más de ventaja, va al que tiene menos.
        if (cuantos(e, pedido) + 1 - cuantos(e, otro) >= 2 || cuantos(e, pedido) >= c.maxEquipo) equipo = otro;
        if (cuantos(e, equipo) >= c.maxEquipo) {
            socketDe(j)?.emit("mundo:error", { mensaje: "La cancha está llena. Espera a que alguien salga.", leve: true });
            return;
        }
        e.equipos.set(j.userId, equipo);
        if (!e.cestas.has(j.userId)) e.cestas.set(j.userId, 0);
        j.cancha = c.id;
        if (!e.termina && !e.fin) {
            e.termina = Date.now() + c.minutos * 60_000;
            sonar(c, "inicio");
        }
        sonar(c, "entrar", j);
        ajustarBots(c, e);
        const destino = { ...lugarEnSuMitad(c, equipo), y: c.y || 0 };
        Object.assign(j, destino);
        const s = socketDe(j);
        s?.emit("mundo:teletransporte", destino);
        if (equipo !== pedido) s?.emit("mundo:error", { mensaje: `Te pasamos al equipo ${equipo} para emparejar.`, leve: true });
        e.cambio = true;
    }

    /* Bots: cada equipo se completa hasta "porEquipo" mientras haya al menos una persona. */
    function ajustarBots(c, e) {
        const quiere = c.bots?.activo && e.equipos.size ? c.bots.porEquipo : 0;
        let cambio = false;
        for (const equipo of EQUIPOS) {
            const personas = cuantos(e, equipo);
            const actuales = [...e.bots.values()].filter((b) => b.equipo === equipo);
            const falta = Math.max(0, quiere - personas);
            // Sobran: sale el último (si tenía el balón, lo suelta).
            while (actuales.length > falta) {
                const b = actuales.pop();
                if (e.balon.por === b.id) Object.assign(e.balon, { por: null, vx: 0, vy: 0, vz: 0, quieto: false });
                e.bots.delete(b.id);
                e.cestas.delete(b.id);
                cambio = true;
            }
            // Faltan: entra uno en su mitad.
            while (actuales.length < falta) {
                e.nBots = (e.nBots || 0) + 1;
                const id = `bot:${c.id}:${e.nBots}`;
                const lugar = lugarEnSuMitad(c, equipo);
                const b = { id, userId: id, nombre: nombreBot(e.nBots + (equipo === "rojo" ? 5 : 0)), equipo, x: lugar.x, y: c.y || 0, z: lugar.z, r: equipo === "azul" ? 0 : Math.PI, andando: 0, esBot: true };
                e.bots.set(id, b);
                e.cestas.set(id, 0);
                actuales.push(b);
                cambio = true;
            }
        }
        if (cambio) e.cambio = true;
    }

    /* Lo que necesitan los bots para "pensar" (bots.js). */
    function apiBots(c, e) {
        const base = c.y || 0;
        const radio = c.tamBalon / 2;
        const metaDe = (equipo) => {
            const i = equipo === "azul" ? 1 : 0;
            const k = c.cestas[i];
            const w = aMundo(c, k.x, k.z);
            const lado = Math.sign(k.z) || (i === 0 ? -1 : 1);
            const futbol = c.deporte === "futbol";
            return {
                x: w.x,
                z: w.z,
                // Un punto a "d" metros de la meta, hacia el centro de la cancha.
                frente: (d) => aMundo(c, k.x, k.z - lado * d),
                entra: (p, antes, vy) => {
                    if (futbol) {
                        const a = aLocal(c, antes.x, antes.z);
                        const l = aLocal(c, p.x, p.z);
                        if ((a.lz - k.z) * lado < 0 && (l.lz - k.z) * lado >= 0 && Math.abs(l.lx - k.x) < k.radio * 0.6 && p.y - base < k.y * 0.8) return { puntaje: 1 };
                        return null;
                    }
                    const cy = base + k.y;
                    if (antes.y > cy && p.y <= cy && Math.hypot(p.x - w.x, p.z - w.z) < k.radio * 0.5 && vy < -2) return { puntaje: -vy };
                    return null;
                },
            };
        };
        return {
            participantes: () => participantes(e),
            ent: (id) => ent(e, id),
            equipoDe: (id) => equipoDe(e, id),
            metaDe,
            dentro: (x, z) => dentroDeCancha(c, x, z),
            entre: (a, b, t, desvio = 0) => {
                const dx = b.x - a.x;
                const dz = b.z - a.z;
                const d = Math.hypot(dx, dz) || 1;
                return dentroDeCancha(c, a.x + dx * t + (-dz / d) * desvio, a.z + dz * t + (dx / d) * desvio);
            },
            tomar: (bot) => {
                const b = e.balon;
                // Un tiro recién lanzado no se agarra en el aire (si no, el mismo bot lo volvía a tomar).
                if (b.por || e.pausa || e.fin || Date.now() - (b.soltado || 0) < 900 || Math.hypot(b.x - bot.x, b.z - bot.z) > ALCANCE_BALON) return;
                Object.assign(b, { por: bot.id, ultimo: bot.id, protegido: Date.now() + PROTEGIDO_MS });
                io.to(sala).emit("cancha:toma", { id: c.id, por: bot.id });
                sonar(c, "tomar", bot);
            },
            robar: (bot) => {
                const b = e.balon;
                const otro = b.por ? ent(e, b.por) : null;
                if (!otro || Date.now() < b.protegido || Math.hypot(otro.x - bot.x, otro.z - bot.z) > ALCANCE_ROBO) return;
                const robado = b.por;
                Object.assign(b, { por: bot.id, ultimo: bot.id, protegido: Date.now() + PROTEGIDO_MS });
                io.to(sala).emit("cancha:toma", { id: c.id, por: bot.id, a: robado });
                sonar(c, "robar", bot);
            },
            lanzar: (bot, f, dir) => soltarTiro(c, e, bot, f, dir),
            radio,
        };
    }

    /* Suelta el balón con la fuerza y dirección del tiro (persona o bot). */
    function soltarTiro(c, e, j, fuerza, dir) {
        const t = tiroBalon(fuerza, c.deporte);
        Object.assign(e.balon, {
            por: null,
            ultimo: j.userId,
            soltado: Date.now(),
            x: j.x + Math.sin(dir) * t.adelante,
            y: t.alto == null ? j.y + c.tamBalon / 2 + 0.05 : j.y + t.alto,
            z: j.z + Math.cos(dir) * t.adelante,
            vx: Math.sin(dir) * t.vh,
            vy: t.vy,
            vz: Math.cos(dir) * t.vh,
            quieto: false,
        });
    }

    /* Sale de la cancha (botón Salir, se desconectó o se quitó la cancha). */
    function salir(userId, { mover = true } = {}) {
        const j = jugadores.get(userId);
        for (const c of canchas()) {
            const e = estados.get(c.id);
            if (!e) continue;
            if (e.entrando.delete(userId)) e.cambio = true;
            if (!e.equipos.has(userId)) continue;
            e.equipos.delete(userId);
            if (e.balon.por === userId) soltarBalon(e, { userId });
            e.cambio = true;
            ajustarBots(c, e);
            if (!e.equipos.size) reiniciar(c, e);
            if (j && mover) {
                // Afuera, al lado de las bolas de entrada.
                const m = c.entradas.reduce((s, p) => ({ x: s.x + p.x / 2, z: s.z + p.z / 2 }), { x: 0, z: 0 });
                const haciaX = Math.abs(m.x) / c.ancho >= Math.abs(m.z) / c.largo;
                // (el letrero está a 1,6 m: se sale un poco más allá, frente a él)
                const lx = haciaX ? m.x + Math.sign(m.x || 1) * 3.4 : m.x;
                const lz = haciaX ? m.z : m.z + Math.sign(m.z || 1) * 3.4;
                const destino = { ...aMundo(c, lx, lz), y: c.y || 0 };
                Object.assign(j, destino);
                socketDe(j)?.emit("mundo:teletransporte", destino);
            }
        }
        if (j) j.cancha = null;
    }

    function reiniciar(c, e) {
        e.puntos = { azul: 0, rojo: 0 };
        e.cestas = new Map([...e.equipos.keys(), ...e.bots.keys()].map((id) => [id, 0]));
        e.balon = nuevoBalon(c);
        e.termina = e.equipos.size ? Date.now() + c.minutos * 60_000 : null;
        e.fin = null;
        e.pausa = 0;
        e.cambio = true;
        if (e.equipos.size) sonar(c, "inicio");
    }

    /* Cada 250 ms: quién está entrando por las bolas y cuándo se acaba el partido. */
    function revisar() {
        const ahora = Date.now();
        for (const c of canchas()) {
            const e = estadoDe(c);
            // Entradas
            const vistos = new Set();
            for (const j of jugadores.values()) {
                if (j.cancha || j.cargadoPor || j.saliendo) continue;
                let cerca = null;
                c.entradas.forEach((p, i) => {
                    const w = aMundo(c, p.x, p.z);
                    if (Math.hypot(j.x - w.x, j.z - w.z) <= RADIO_ENTRADA && j.y - (c.y || 0) < 2) cerca = EQUIPOS[i];
                });
                if (!cerca) continue;
                vistos.add(j.userId);
                const ya = e.entrando.get(j.userId);
                if (!ya || ya.equipo !== cerca) {
                    e.entrando.set(j.userId, { equipo: cerca, desde: ahora });
                    e.cambio = true;
                } else if (ahora - ya.desde >= ESPERA_ENTRAR_MS) {
                    e.entrando.delete(j.userId);
                    entrar(c, e, j, cerca);
                }
            }
            for (const id of e.entrando.keys()) {
                if (!vistos.has(id)) {
                    e.entrando.delete(id);
                    e.cambio = true;
                }
            }
            // Fin del partido
            if (e.termina && !e.fin && ahora >= e.termina) {
                const { azul, rojo } = e.puntos;
                e.fin = { ganador: azul === rojo ? "empate" : azul > rojo ? "azul" : "rojo", puntos: { azul, rojo }, hasta: ahora + PAUSA_FIN_MS };
                e.termina = null;
                if (e.balon.por) e.balon.por = null;
                e.cambio = true;
                sonar(c, "fin");
            } else if (e.fin && ahora >= e.fin.hasta) {
                reiniciar(c, e);
            }
            // Alguien del equipo ya no está en el mundo.
            for (const id of e.equipos.keys()) if (!jugadores.has(id)) salir(id, { mover: false });
            ajustarBots(c, e);
            if (e.cambio) {
                e.cambio = false;
                emitirEstado(c, e);
            }
        }
    }

    /* Choques del balón con los jugadores del partido. Devuelve true si alguien lo recibió. */
    function chocarJugadores(c, e, b, radio, ahora) {
        const rapido = Math.hypot(b.vx, b.vz, b.vy) > 1.5;
        const equipoTiro = b.ultimo ? equipoDe(e, b.ultimo) : null;
        for (const p of participantes(e)) {
            const uid = p.id;
            const equipo = p.equipo;
            if (p.cargadoPor) continue;
            if (uid === b.ultimo && ahora - b.soltado < 400) continue; // recién lanzado: no le pega al que lo tiró
            const dx = b.x - p.x;
            const dz = b.z - p.z;
            const d = Math.hypot(dx, dz);
            const min = RADIO_JUGADOR + radio;
            if (d >= min || b.y < p.y - radio || b.y > p.y + ALTO_JUGADOR + radio) continue;
            // Pase: lo lanzó un compañero y va con fuerza → lo recibe.
            if (rapido && equipoTiro && equipoTiro === equipo && uid !== b.ultimo && !e.pausa && !e.fin) {
                Object.assign(b, { por: uid, ultimo: uid, protegido: ahora + PROTEGIDO_MS, vx: 0, vy: 0, vz: 0 });
                io.to(sala).emit("cancha:toma", { id: c.id, por: uid, pase: true });
                sonar(c, "pase", p);
                return true;
            }
            // Rebota en el cuerpo (hacia afuera, perdiendo fuerza).
            const nx = d > 1e-3 ? dx / d : -Math.sign(b.vx || 1);
            const nz = d > 1e-3 ? dz / d : -Math.sign(b.vz || 1);
            const vn = b.vx * nx + b.vz * nz;
            if (vn < 0) {
                b.vx -= 1.5 * vn * nx;
                b.vz -= 1.5 * vn * nz;
                if (-vn > 2) sonar(c, "rebote", b, 250);
            }
            b.x = p.x + nx * min;
            b.z = p.z + nz * min;
            b.quieto = false;
        }
        return false;
    }

    /* Rebota contra un punto (palo/aro) si lo toca: normal desde el punto al balón. */
    function rebotarEn(b, q, min, c) {
        const dx = b.x - q.x;
        const dy = b.y - q.y;
        const dz = b.z - q.z;
        const d = Math.hypot(dx, dy, dz);
        if (d >= min || d < 1e-4) return false;
        const n = [dx / d, dy / d, dz / d];
        const vn = b.vx * n[0] + b.vy * n[1] + b.vz * n[2];
        if (vn < 0) {
            b.vx -= 1.7 * vn * n[0];
            b.vy -= 1.7 * vn * n[1];
            b.vz -= 1.7 * vn * n[2];
            if (-vn > 1) sonar(c, "palo", b, 200);
        }
        b.x = q.x + n[0] * min;
        b.y = q.y + n[1] * min;
        b.z = q.z + n[2] * min;
        b.quieto = false;
        return true;
    }

    /* Choque contra una caja alineada con la cancha (tablero, arquero): rebota y suena. */
    function chocarCaja(c, b, radio, caja, accion) {
        const L = aLocal(c, b.x, b.z);
        const base = c.y || 0;
        const px = caja.ancho / 2 + radio - Math.abs(L.lx - caja.lx);
        const pz = caja.grueso / 2 + radio - Math.abs(L.lz - caja.lz);
        const py = caja.alto / 2 + radio - Math.abs(b.y - (base + caja.y));
        if (px <= 0 || pz <= 0 || py <= 0) return;
        const a = ((c.rot || 0) * Math.PI) / 180;
        let vlx = b.vx * Math.cos(a) - b.vz * Math.sin(a);
        let vlz = b.vx * Math.sin(a) + b.vz * Math.cos(a);
        let lx = L.lx;
        let lz = L.lz;
        const fuerza = Math.hypot(vlx, vlz, b.vy);
        // Sale por el lado donde menos entró.
        if (pz <= px && pz <= py) {
            const s = Math.sign(L.lz - caja.lz) || 1;
            lz = caja.lz + s * (caja.grueso / 2 + radio);
            if (vlz * s < 0) vlz = -vlz * 0.6;
        } else if (px <= py) {
            const s = Math.sign(L.lx - caja.lx) || 1;
            lx = caja.lx + s * (caja.ancho / 2 + radio);
            if (vlx * s < 0) vlx = -vlx * 0.6;
        } else {
            const s = Math.sign(b.y - (base + caja.y)) || 1;
            b.y = base + caja.y + s * (caja.alto / 2 + radio);
            if (b.vy * s < 0) b.vy = -b.vy * 0.6;
        }
        const w = aMundo(c, lx, lz);
        b.x = w.x;
        b.z = w.z;
        b.vx = vlx * Math.cos(a) + vlz * Math.sin(a);
        b.vz = -vlx * Math.sin(a) + vlz * Math.cos(a);
        b.quieto = false;
        if (fuerza > 1) sonar(c, accion, b, 200);
    }

    function chocarMarcos(c, b, radio) {
        const base = c.y || 0;
        const ahora = Date.now();
        c.cestas.forEach((k, i) => {
            if (c.deporte === "futbol" && c.arqueros?.activo) {
                const q = arqueroEn(c, i, ahora);
                chocarCaja(c, b, radio, { lx: q.lx, lz: q.lz, ancho: c.arqueros.ancho, grueso: 0.5, alto: c.arqueros.alto, y: c.arqueros.alto / 2 }, "arquero");
            }
            if (c.deporte !== "futbol" && k.tablero?.activo) {
                const t = tableroDe(c, i);
                chocarCaja(c, b, radio, { lx: t.lx, lz: t.lz, ancho: t.ancho, grueso: 0.12, alto: t.alto, y: t.y }, "tablero");
            }
        });
        for (const k of c.cestas) {
            if (c.deporte === "futbol") {
                const min = radio + GRUESO_PALO;
                const L = aLocal(c, b.x, b.z);
                // Palos parados (a cada lado): el punto más cercano del palo.
                for (const s of [-1, 1]) {
                    const w = aMundo(c, k.x + s * k.radio, k.z);
                    const y = Math.max(base, Math.min(base + k.y, b.y));
                    rebotarEn(b, { x: w.x, y, z: w.z }, min, c);
                }
                // Travesaño: el punto más cercano a lo ancho.
                const lx = Math.max(k.x - k.radio, Math.min(k.x + k.radio, L.lx));
                const w = aMundo(c, lx, k.z);
                rebotarEn(b, { x: w.x, y: base + k.y, z: w.z }, min, c);
            } else {
                // Aro: el punto del aro más cercano al balón.
                const w = aMundo(c, k.x, k.z);
                const hx = b.x - w.x;
                const hz = b.z - w.z;
                const hd = Math.hypot(hx, hz);
                if (hd < 1e-3) continue;
                const q = { x: w.x + (hx / hd) * k.radio, y: base + k.y, z: w.z + (hz / hd) * k.radio };
                // (medio radio: el aro perdona un poco, si no casi nada entra)
                rebotarEn(b, q, radio * 0.5 + Math.max(0.05, k.radio * 0.07), c);
            }
        }
    }

    /* Falta: se cobra desde donde alzaron al jugador; él aparece ahí con el balón. */
    function cobrarFalta(f, victimaId) {
        const c = canchas().find((x) => x.id === f.cancha);
        const e = c && estados.get(c.id);
        const v = jugadores.get(victimaId);
        if (!c || !e || !v || !e.equipos.has(victimaId) || e.fin) return;
        const lugar = { ...dentroDeCancha(c, f.x, f.z), y: c.y || 0 };
        Object.assign(v, lugar);
        socketDe(v)?.emit("mundo:teletransporte", lugar);
        Object.assign(e.balon, enManos(c, v), { por: victimaId, ultimo: victimaId, protegido: Date.now() + PROTEGIDO_FALTA_MS, vx: 0, vy: 0, vz: 0, quieto: false });
        io.to(sala).emit("cancha:toma", { id: c.id, por: victimaId, falta: true });
    }

    /* Física del balón (cada 50 ms). */
    function mover(dt) {
        const ahora = Date.now();
        for (const c of canchas()) {
            const e = estados.get(c.id);
            if (!e || !e.equipos.size) continue;
            const b = e.balon;
            const radio = c.tamBalon / 2;
            const piso = (c.y || 0) + radio;
            // Los bots piensan y se mueven.
            pensarBots({ c, e, dt, ahora, api: apiBots(c, e) });
            if (b.por) {
                const j = ent(e, b.por);
                if (!j || equipoDe(e, b.por) == null) {
                    b.por = null;
                } else {
                    Object.assign(b, enManos(c, j), { vx: 0, vy: 0, vz: 0, quieto: false });
                    continue;
                }
            }
            if (e.pausa && ahora < e.pausa) continue;
            if (e.pausa) {
                // Después de una cesta: cae otra vez en el centro.
                e.pausa = 0;
                Object.assign(b, { x: c.x, y: (c.y || 0) + 4, z: c.z, vx: 0, vy: 0, vz: 0, quieto: false, ultimo: null });
            }
            if (b.quieto) {
                // Quieto en el piso: si alguien lo pisa, lo empuja un poquito (no lo atraviesa).
                for (const p of participantes(e)) {
                    const dx = b.x - p.x;
                    const dz = b.z - p.z;
                    const d = Math.hypot(dx, dz);
                    if (d < RADIO_JUGADOR + radio && Math.abs(b.y - radio - p.y) < 0.8) {
                        const nx = d > 1e-3 ? dx / d : Math.sin(p.r);
                        const nz = d > 1e-3 ? dz / d : Math.cos(p.r);
                        Object.assign(b, { vx: nx * 2.5, vz: nz * 2.5, vy: 0, quieto: false });
                        break;
                    }
                }
                if (b.quieto) continue;
            }
            const antes = { x: b.x, y: b.y, z: b.z };
            b.vy -= G_BALON * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;
            // Rebota en el piso
            if (b.y <= piso) {
                b.y = piso;
                if (Math.abs(b.vy) > 1.2) b.vy = -b.vy * 0.55;
                else b.vy = 0;
                b.vx *= 0.82;
                b.vz *= 0.82;
                if (!b.vy && Math.hypot(b.vx, b.vz) < 0.15) {
                    b.vx = b.vz = 0;
                    b.quieto = true;
                }
            }
            // El balón no atraviesa a nadie: el compañero del que lo lanzó lo recibe (pase); si no, rebota.
            if (chocarJugadores(c, e, b, radio, ahora)) continue;
            // Palos de la portería (fútbol) o el aro (básquet): rebota y suena.
            chocarMarcos(c, b, radio);
            // Rebota en las orillas de la cancha (paredes invisibles)
            const { lx, lz } = aLocal(c, b.x, b.z);
            const hx = c.ancho / 2 - radio;
            const hz = c.largo / 2 - radio;
            if (Math.abs(lx) > hx || Math.abs(lz) > hz) {
                const a = ((c.rot || 0) * Math.PI) / 180;
                // velocidad en coordenadas de la cancha
                let vlx = b.vx * Math.cos(a) - b.vz * Math.sin(a);
                let vlz = b.vx * Math.sin(a) + b.vz * Math.cos(a);
                if (Math.abs(lx) > hx) vlx = -Math.sign(lx) * Math.abs(vlx) * 0.6;
                if (Math.abs(lz) > hz) vlz = -Math.sign(lz) * Math.abs(vlz) * 0.6;
                const p = aMundo(c, Math.max(-hx, Math.min(hx, lx)), Math.max(-hz, Math.min(hz, lz)));
                b.x = p.x;
                b.z = p.z;
                b.vx = vlx * Math.cos(a) + vlz * Math.sin(a);
                b.vz = -vlx * Math.sin(a) + vlz * Math.cos(a);
            }
            // ¿Pasó por un aro (bajando) o cruzó la línea de una portería?
            if (e.fin) continue;
            const antesL = aLocal(c, antes.x, antes.z);
            const ahoraL = aLocal(c, b.x, b.z);
            c.cestas.forEach((k, i) => {
                const w = aMundo(c, k.x, k.z);
                const cy = (c.y || 0) + k.y;
                if (c.deporte === "futbol") {
                    // Portería: entra si cruza la línea hacia afuera, entre los palos y debajo del travesaño.
                    const lado = Math.sign(k.z) || (i === 0 ? -1 : 1);
                    if (!((antesL.lz - k.z) * lado < 0 && (ahoraL.lz - k.z) * lado >= 0)) return;
                    if (Math.abs(ahoraL.lx - k.x) > k.radio - radio * 0.3 || b.y - (c.y || 0) > k.y) return;
                } else {
                    if (!(antes.y > cy && b.y <= cy)) return;
                    const t = (antes.y - cy) / (antes.y - b.y || 1);
                    const px = antes.x + (b.x - antes.x) * t;
                    const pz = antes.z + (b.z - antes.z) * t;
                    if (Math.hypot(px - w.x, pz - w.z) > k.radio) return;
                }
                // En el aro/portería del azul (0) anota el rojo, y al revés.
                const equipo = i === 0 ? "rojo" : "azul";
                e.puntos[equipo] += 1;
                const autor = b.ultimo && equipoDe(e, b.ultimo) === equipo ? b.ultimo : null;
                if (autor) e.cestas.set(autor, (e.cestas.get(autor) || 0) + 1);
                io.to(sala).emit("cancha:cesta", { id: c.id, equipo, futbol: c.deporte === "futbol", por: autor ? ent(e, autor)?.nombre || null : null, x: r2(w.x), y: r2(cy), z: r2(w.z) });
                sonar(c, "anota", w);
                e.pausa = ahora + PAUSA_CESTA_MS;
                e.cambio = true;
            });
        }
    }

    const filaBalon = (c, e) => {
        const b = e.balon;
        return [c.id, r2(b.x), r2(b.y), r2(b.z), r2(b.vx), r2(b.vy), r2(b.vz), b.por, e.pausa ? 1 : 0];
    };

    /* Todos los balones como están ahora (para el que entra al mundo). */
    function balonesAhora() {
        return canchas()
            .map((c) => [c, estados.get(c.id)])
            .filter(([, e]) => e?.equipos.size)
            .map(([c, e]) => filaBalon(c, e));
    }

    function enviarBalones() {
        const lista = [];
        for (const c of canchas()) {
            const e = estados.get(c.id);
            if (!e || !e.equipos.size) continue;
            const b = e.balon;
            const firma = `${r2(b.x)}|${r2(b.y)}|${r2(b.z)}|${b.por}|${e.pausa ? 1 : 0}`;
            if (firma === e.firma) continue;
            e.firma = firma;
            lista.push(filaBalon(c, e));
        }
        if (lista.length) io.to(sala).emit("cancha:balones", { b: lista });
        // Dónde está cada bot (solo si alguno se movió).
        const bots = [];
        for (const c of canchas()) {
            const e = estados.get(c.id);
            if (!e?.bots.size) continue;
            const fila = [...e.bots.values()].map((b) => [b.id, r2(b.x), r2(b.z), r2(b.r), b.andando]);
            const firma = JSON.stringify(fila);
            if (firma === e.firmaBots) continue;
            e.firmaBots = firma;
            bots.push([c.id, fila]);
        }
        if (bots.length) io.to(sala).emit("cancha:bots", { c: bots });
    }

    /* Cada tanto se vuelve a mandar todo (el que acaba de entrar ve el balón aunque esté quieto). */
    setInterval(() => {
        for (const e of estados.values()) {
            e.firma = null;
            e.firmaBots = null;
        }
    }, 2000).unref();

    let ultimo = Date.now();
    setInterval(() => {
        const ahora = Date.now();
        mover(Math.min(0.1, (ahora - ultimo) / 1000));
        ultimo = ahora;
    }, PASO_MS).unref();
    setInterval(enviarBalones, ENVIO_MS).unref();
    setInterval(revisar, 250).unref();

    return {
        todos,
        balonesAhora,
        salir,
        /* El diseño cambió: las canchas que ya no están sacan a su gente. */
        ponerObjetos(lista) {
            objetos = lista || [];
            // Si el admin movió o cambió una cancha, su balón vuelve a caer en el centro nuevo.
            for (const c of canchas()) {
                const e = estados.get(c.id);
                const firma = JSON.stringify([c.x, c.z, c.y, c.rot, c.ancho, c.largo, c.tamBalon]);
                if (e && e.forma !== firma) {
                    e.balon = nuevoBalon(c);
                    e.cambio = true;
                }
                if (e) e.forma = firma;
            }
            const ids = new Set(canchas().map((c) => c.id));
            for (const [id, e] of estados) {
                if (ids.has(id)) continue;
                for (const uid of e.equipos.keys()) {
                    const j = jugadores.get(uid);
                    if (j) j.cancha = null;
                }
                estados.delete(id);
            }
            if (jugadores.size) io.to(sala).emit("cancha:todas", todos());
        },
        canchaDe(j) {
            return j?.cancha ? canchas().find((c) => c.id === j.cancha) || null : null;
        },
        /*
         * Botón Agarrar adentro de la cancha. Devuelve true si se
         * encargó (tomó o robó el balón); false = alzar a alguien.
         */
        agarrar(j) {
            const c = this.canchaDe(j);
            if (!c) return false;
            const e = estadoDe(c);
            const b = e.balon;
            if (e.fin || e.pausa) return false;
            const ahora = Date.now();
            if (b.por === j.userId) return true;
            // Balón suelto cerca (en el piso o volando)
            if (!b.por && Math.hypot(b.x - j.x, b.z - j.z) <= ALCANCE_BALON && b.y >= j.y - 0.6 && b.y <= j.y + (c.deporte === "futbol" ? 1.2 : 2.8)) {
                Object.assign(b, { por: j.userId, ultimo: j.userId, protegido: ahora + PROTEGIDO_MS });
                io.to(sala).emit("cancha:toma", { id: c.id, por: j.userId });
                sonar(c, "tomar", j);
                return true;
            }
            // Alguien cerca lo tiene: se lo quito.
            if (b.por) {
                const otro = ent(e, b.por);
                if (otro && Math.hypot(otro.x - j.x, otro.z - j.z) <= ALCANCE_ROBO && Math.abs(otro.y - j.y) < 1.2) {
                    if (ahora < b.protegido) return true; // lo acaba de tomar
                    const robado = b.por;
                    Object.assign(b, { por: j.userId, ultimo: j.userId, protegido: ahora + PROTEGIDO_MS });
                    io.to(sala).emit("cancha:toma", { id: c.id, por: j.userId, a: robado });
                    sonar(c, "robar", j);
                    return true;
                }
            }
            return false;
        },
        /* ¿Tiene el balón? (el botón Lanzar lo tira) */
        tieneBalon(j) {
            const c = this.canchaDe(j);
            return Boolean(c && estados.get(c.id)?.balon.por === j.userId);
        },
        lanzar(j, fuerza, dir) {
            const c = this.canchaDe(j);
            if (!c) return false;
            const e = estadoDe(c);
            const b = e.balon;
            if (b.por !== j.userId) return false;
            soltarTiro(c, e, j, fuerza, dir);
            return true;
        },
        /* Alguien alzó a otro: si es un rival en el partido, se anota el lugar (por si lo lanza = falta). */
        alAlzar(j, v) {
            const c = this.canchaDe(j);
            const e = c && estados.get(c.id);
            const rival = e && e.equipos.has(v.userId) && e.equipos.get(v.userId) !== e.equipos.get(j.userId);
            v.falta = rival && !e.fin ? { cancha: c.id, x: v.x, z: v.z, por: j.userId } : null;
        },
        /* Lanzó al que tenía alzado: si era un rival, es falta. */
        alLanzarPersona(j, v) {
            const f = v.falta;
            v.falta = null;
            if (!f || f.por !== j.userId) return false;
            const c = canchas().find((x) => x.id === f.cancha);
            const e = c && estados.get(c.id);
            if (!e || e.fin) return false;
            io.to(sala).emit("cancha:falta", { id: c.id, por: j.nombre, a: v.nombre, equipo: e.equipos.get(v.userId) || null });
            sonar(c, "falta", f);
            setTimeout(() => cobrarFalta(f, v.userId), PAUSA_FALTA_MS);
            return true;
        },
        /* Adentro de la cancha no se sale caminando. */
        limitar(j) {
            const c = this.canchaDe(j);
            if (!c) return;
            const p = dentroDeCancha(c, j.x, j.z);
            j.x = p.x;
            j.z = p.z;
        },
    };
}
