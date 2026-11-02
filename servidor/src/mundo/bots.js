/* =========================================================
   MUNDO 3D · BOTS DE LA CANCHA
   ---------------------------------------------------------
   Completan los equipos (por defecto 3 contra 3) mientras
   haya al menos una persona jugando. Cuando entra alguien,
   sale un bot de ese equipo. Juegan de verdad:
   · Si tienen el balón, avanzan hacia la meta del rival y
     tiran cuando están a buena distancia (calculan la fuerza
     para que entre, con un poquito de error).
   · Si lo tiene un rival, el más cercano lo persigue y trata
     de quitárselo; los otros se ponen entre el balón y su arco.
   · Si está suelto, el más cercano de cada equipo va por él.
   · Si lo tiene un compañero, se abren para recibir.
   Son más lentos que una persona corriendo, para que se pueda.
========================================================= */

import { G_BALON, tiroBalon } from "./cancha.js";

const VEL_CAMINA = 4.2;
const VEL_CORRE = 6.2;
const CADA_ROBO_MS = 900;
const CADA_TIRO_MS = 1400;

const NOMBRES = ["Robi", "Chispa", "Turbo", "Pixel", "Bolt", "Nova", "Rayo", "Byte", "Zeta", "Kiko"];

export function nombreBot(n) {
    return `🤖 ${NOMBRES[n % NOMBRES.length]}`;
}

/*
 * Busca la fuerza para que el tiro entre (o null si no alcanza).
 * desde: { x, y, z } (los pies), dir: ángulo, meta: lo que dice
 * entra(px, py, pz, antes) en cada paso.
 */
export function buscarFuerza(c, desde, dir, entra) {
    let mejor = null;
    const radio = c.tamBalon / 2;
    const piso = (c.y || 0) + radio;
    for (let f = 0; f <= 1.0001; f += 0.02) {
        const t = tiroBalon(f, c.deporte);
        let x = desde.x + Math.sin(dir) * t.adelante;
        let y = t.alto == null ? desde.y + radio + 0.05 : desde.y + t.alto;
        let z = desde.z + Math.cos(dir) * t.adelante;
        let vy = t.vy;
        const vx = Math.sin(dir) * t.vh;
        const vz = Math.cos(dir) * t.vh;
        for (let i = 0; i < 160; i += 1) {
            const antes = { x, y, z };
            vy -= G_BALON * 0.025;
            x += vx * 0.025;
            y += vy * 0.025;
            z += vz * 0.025;
            const r = entra({ x, y, z }, antes, vy);
            if (r) {
                // En básquet se prefiere el tiro que cae más vertical (entra mejor).
                if (!mejor || r.puntaje > mejor.puntaje) mejor = { f, puntaje: r.puntaje };
                break;
            }
            if (y < piso) break;
        }
    }
    return mejor ? mejor.f : null;
}

/* Mueve al bot hacia un punto (sin salirse de la cancha y sin encimarse). */
function caminar(bot, meta, vel, dt, api, otros) {
    const dx = meta.x - bot.x;
    const dz = meta.z - bot.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.35) {
        bot.andando = 0;
        return;
    }
    const paso = Math.min(d, vel * dt);
    let nx = bot.x + (dx / d) * paso;
    let nz = bot.z + (dz / d) * paso;
    // Separarse un poco de los demás.
    for (const o of otros) {
        if (o === bot) continue;
        const sx = nx - o.x;
        const sz = nz - o.z;
        const sd = Math.hypot(sx, sz);
        if (sd > 0.01 && sd < 0.8) {
            nx += (sx / sd) * (0.8 - sd) * 0.5;
            nz += (sz / sd) * (0.8 - sd) * 0.5;
        }
    }
    const p = api.dentro(nx, nz);
    bot.x = p.x;
    bot.z = p.z;
    bot.r = Math.atan2(dx, dz);
    bot.andando = vel > VEL_CAMINA ? 2 : 1;
}

/* Un paso de "pensar" de todos los bots de una cancha. */
export function pensarBots({ c, e, dt, ahora, api }) {
    const bots = [...e.bots.values()];
    if (!bots.length) return;
    const b = e.balon;
    const todos = api.participantes();
    const pausa = e.fin || e.pausa;

    // El más cercano al balón (o a quien lo tiene) de cada equipo es el que va por él.
    const objetivo = b.por ? api.ent(b.por) || b : b;
    const cazador = {};
    for (const eq of ["azul", "rojo"]) {
        let mejor = null;
        let md = Infinity;
        for (const p of todos) {
            if (p.equipo !== eq) continue;
            const d = Math.hypot(p.x - objetivo.x, p.z - objetivo.z);
            if (d < md) {
                md = d;
                mejor = p;
            }
        }
        cazador[eq] = mejor;
    }

    bots.forEach((bot, n) => {
        if (pausa) {
            bot.andando = 0;
            return;
        }
        const meta = api.metaDe(bot.equipo); // donde anota
        const arco = api.metaDe(bot.equipo === "azul" ? "rojo" : "azul"); // el que defiende
        const lado = n % 2 === 0 ? 1 : -1;
        const equipoBalon = b.por ? api.equipoDe(b.por) : null;

        // 1) Tengo el balón: avanzar y tirar.
        if (b.por === bot.id) {
            const dMeta = Math.hypot(meta.x - bot.x, meta.z - bot.z);
            const buena = c.deporte === "futbol" ? dMeta < 11 : dMeta > 2.2 && dMeta < 6.5;
            if (buena && ahora > (bot.tiroEn || 0)) {
                bot.tiroEn = ahora + CADA_TIRO_MS;
                const dir = Math.atan2(meta.x - bot.x, meta.z - bot.z) + (Math.random() - 0.5) * 0.08;
                const f = buscarFuerza(c, bot, dir, meta.entra);
                if (f != null) {
                    bot.r = dir;
                    if (process.env.DEBUG_BOTS) console.log("🤖 tiro", bot.nombre, f, dMeta.toFixed(1));
                    api.lanzar(bot, Math.min(1, Math.max(0, f + (Math.random() - 0.5) * 0.03)), dir);
                    return;
                }
            }
            // Caminar hacia una buena distancia de la meta.
            const objetivoTiro = c.deporte === "futbol" ? meta.frente(7) : meta.frente(4.2);
            caminar(bot, objetivoTiro, VEL_CAMINA, dt, api, todos);
            return;
        }

        // 2) Balón suelto: el más cercano de mi equipo va por él.
        if (!b.por) {
            if (cazador[bot.equipo] === bot) {
                caminar(bot, b, VEL_CORRE, dt, api, todos);
                const d = Math.hypot(b.x - bot.x, b.z - bot.z);
                if (d < 1.3 && b.y < (c.y || 0) + 2.6) api.tomar(bot);
            } else {
                // Defender: entre el balón y mi arco.
                caminar(bot, api.entre(arco, b, 0.35, lado * 1.6), VEL_CAMINA, dt, api, todos);
            }
            return;
        }

        // 3) Lo tiene un compañero: abrirse hacia adelante para recibir.
        if (equipoBalon === bot.equipo) {
            const lleva = api.ent(b.por) || b;
            caminar(bot, api.entre(lleva, meta, 0.45, lado * 3), VEL_CAMINA, dt, api, todos);
            return;
        }

        // 4) Lo tiene un rival: el más cercano lo marca y trata de quitárselo.
        const rival = api.ent(b.por);
        if (!rival) return;
        if (cazador[bot.equipo] === bot) {
            caminar(bot, rival, VEL_CORRE, dt, api, todos);
            const d = Math.hypot(rival.x - bot.x, rival.z - bot.z);
            if (d < 1.5 && ahora > (bot.roboEn || 0)) {
                bot.roboEn = ahora + CADA_ROBO_MS;
                if (Math.random() < 0.5) api.robar(bot);
            }
        } else {
            caminar(bot, api.entre(arco, rival, 0.4, lado * 1.8), VEL_CAMINA, dt, api, todos);
        }
    });
}
