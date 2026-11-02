/* =========================================================
   MUNDO 3D · CANCHA (minijuego tipo básquet, azul vs rojo)
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
========================================================= */

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

/* Fuerza (0…1) → velocidades de salida. El navegador usa lo mismo para dibujar la mira. */
export function tiroBalon(f) {
    const k = Math.min(1, Math.max(0, Number(f) || 0));
    return { vh: 3 + 10 * k, vy: 5 + 5 * k };
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
        return { x: c.x, y: (c.y || 0) + 4, z: c.z, vx: 0, vy: 0, vz: 0, por: null, ultimo: null, protegido: 0, quieto: false };
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
                forma: JSON.stringify([c.x, c.z, c.y, c.rot, c.ancho, c.largo, c.tamBalon]),
            };
            estados.set(c.id, e);
        }
        return e;
    }

    function publico(c, e) {
        const nombre = (id) => jugadores.get(id)?.nombre || "Jugador";
        const top = [...e.cestas.entries()]
            .filter(([, n]) => n > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, n]) => ({ userId: id, nombre: nombre(id), cestas: n, equipo: e.equipos.get(id) || null }));
        return {
            id: c.id,
            equipos: Object.fromEntries(e.equipos),
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
        if (!e.termina && !e.fin) e.termina = Date.now() + c.minutos * 60_000;
        const destino = { ...lugarEnSuMitad(c, equipo), y: c.y || 0 };
        Object.assign(j, destino);
        const s = socketDe(j);
        s?.emit("mundo:teletransporte", destino);
        if (equipo !== pedido) s?.emit("mundo:error", { mensaje: `Te pasamos al equipo ${equipo} para emparejar.`, leve: true });
        e.cambio = true;
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
        e.cestas = new Map([...e.equipos.keys()].map((id) => [id, 0]));
        e.balon = nuevoBalon(c);
        e.termina = e.equipos.size ? Date.now() + c.minutos * 60_000 : null;
        e.fin = null;
        e.pausa = 0;
        e.cambio = true;
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
            } else if (e.fin && ahora >= e.fin.hasta) {
                reiniciar(c, e);
            }
            // Alguien del equipo ya no está en el mundo.
            for (const id of e.equipos.keys()) if (!jugadores.has(id)) salir(id, { mover: false });
            if (e.cambio) {
                e.cambio = false;
                emitirEstado(c, e);
            }
        }
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
            if (b.por) {
                const j = jugadores.get(b.por);
                if (!j || e.equipos.get(b.por) == null) {
                    b.por = null;
                } else {
                    Object.assign(b, { x: j.x + Math.sin(j.r) * 0.45, y: j.y + 1.15, z: j.z + Math.cos(j.r) * 0.45, vx: 0, vy: 0, vz: 0, quieto: false });
                    continue;
                }
            }
            if (e.pausa && ahora < e.pausa) continue;
            if (e.pausa) {
                // Después de una cesta: cae otra vez en el centro.
                e.pausa = 0;
                Object.assign(b, { x: c.x, y: (c.y || 0) + 4, z: c.z, vx: 0, vy: 0, vz: 0, quieto: false, ultimo: null });
            }
            if (b.quieto) continue;
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
            // ¿Pasó por un aro (bajando)?
            if (e.fin) continue;
            c.cestas.forEach((k, i) => {
                const w = aMundo(c, k.x, k.z);
                const cy = (c.y || 0) + k.y;
                if (!(antes.y > cy && b.y <= cy)) return;
                const t = (antes.y - cy) / (antes.y - b.y || 1);
                const px = antes.x + (b.x - antes.x) * t;
                const pz = antes.z + (b.z - antes.z) * t;
                if (Math.hypot(px - w.x, pz - w.z) > k.radio) return;
                // Cesta en el aro del azul (0) = punto del rojo, y al revés.
                const equipo = i === 0 ? "rojo" : "azul";
                e.puntos[equipo] += 1;
                const autor = b.ultimo && e.equipos.get(b.ultimo) === equipo ? b.ultimo : null;
                if (autor) e.cestas.set(autor, (e.cestas.get(autor) || 0) + 1);
                io.to(sala).emit("cancha:cesta", { id: c.id, equipo, por: autor ? jugadores.get(autor)?.nombre || null : null, x: r2(w.x), y: r2(cy), z: r2(w.z) });
                e.pausa = ahora + PAUSA_CESTA_MS;
                e.cambio = true;
            });
        }
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
            lista.push([c.id, r2(b.x), r2(b.y), r2(b.z), r2(b.vx), r2(b.vy), r2(b.vz), b.por, e.pausa ? 1 : 0]);
        }
        if (lista.length) io.to(sala).emit("cancha:balones", { b: lista });
    }

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
            if (!b.por && Math.hypot(b.x - j.x, b.z - j.z) <= ALCANCE_BALON && b.y >= j.y - 0.6 && b.y <= j.y + 2.8) {
                Object.assign(b, { por: j.userId, ultimo: j.userId, protegido: ahora + PROTEGIDO_MS });
                io.to(sala).emit("cancha:toma", { id: c.id, por: j.userId });
                return true;
            }
            // Alguien cerca lo tiene: se lo quito.
            if (b.por) {
                const otro = jugadores.get(b.por);
                if (otro && Math.hypot(otro.x - j.x, otro.z - j.z) <= ALCANCE_ROBO && Math.abs(otro.y - j.y) < 1.2) {
                    if (ahora < b.protegido) return true; // lo acaba de tomar
                    const robado = b.por;
                    Object.assign(b, { por: j.userId, ultimo: j.userId, protegido: ahora + PROTEGIDO_MS });
                    io.to(sala).emit("cancha:toma", { id: c.id, por: j.userId, a: robado });
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
            const { vh, vy } = tiroBalon(fuerza);
            Object.assign(b, {
                por: null,
                ultimo: j.userId,
                x: j.x + Math.sin(dir) * 0.6,
                y: j.y + 1.9,
                z: j.z + Math.cos(dir) * 0.6,
                vx: Math.sin(dir) * vh,
                vy,
                vz: Math.cos(dir) * vh,
                quieto: false,
            });
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
