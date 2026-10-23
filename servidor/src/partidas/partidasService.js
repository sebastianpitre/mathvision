/* =========================================================
   PARTIDAS · LÓGICA DEL JUEGO DE PREGUNTAS Y RECOMPENSAS
   ---------------------------------------------------------
   El servidor guarda la partida, elige las preguntas,
   revisa cada respuesta y calcula la recompensa al final.
   El navegador nunca conoce la respuesta correcta antes de
   responder, así que no se puede hacer trampa desde ahí.
========================================================= */

import { pool, enTransaccion } from "../database/db.js";
import { obtenerNivel } from "../niveles/nivelesService.js";
import {
    entregarRecompensa,
    sumarEstadisticas,
} from "../progreso/progreso.js";
import { getUserProfile } from "../users/userService.js";

export class ErrorJuego extends Error {
    constructor(mensaje, status = 400) {
        super(mensaje);
        this.status = status;
    }
}

/* ---------------------------------------------------------
   UTILIDADES
--------------------------------------------------------- */

async function preguntaPublica(client, preguntaId) {
    if (!preguntaId) return null;

    const { rows } = await client.query(
        "SELECT id, texto, opciones FROM preguntas WHERE id = $1",
        [preguntaId]
    );

    return rows[0] || null;
}

function estadoPublico(partida) {
    return {
        id: Number(partida.id),
        indice: partida.indice_actual,
        total_preguntas: partida.total_preguntas,
        aciertos: partida.aciertos,
        errores: partida.errores,
        vidas: partida.vidas_restantes,
        puntos: partida.puntos,
        comodin_usado: partida.comodin_usado,
    };
}

async function bloquearPartida(client, partidaId, userId) {
    const { rows } = await client.query(
        `
        SELECT *
        FROM partidas
        WHERE id = $1 AND user_id = $2 AND juego = 'preguntas'
        FOR UPDATE
        `,
        [partidaId, userId]
    );

    const partida = rows[0];

    if (!partida) throw new ErrorJuego("Partida no encontrada.", 404);
    if (partida.estado !== "en_curso") throw new ErrorJuego("Esta partida ya terminó.", 409);

    return partida;
}

/*
 * ¿Cuántas partidas de este nivel ya le dieron recompensa
 * hoy al jugador? (hora de Colombia)
 */
async function recompensasDeHoy(client, userId, { nivelId = null, juego = null }) {
    const { rows } = await client.query(
        `
        SELECT COUNT(*)::int AS total
        FROM partidas
        WHERE user_id = $1
          AND estado = 'terminada'
          AND (xp_ganada + oro_ganado + diamantes_ganados) > 0
          AND ($2::int IS NULL OR nivel_id = $2)
          AND ($3::text IS NULL OR juego = $3)
          AND (terminada_en AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date
              = (NOW() AT TIME ZONE 'America/Bogota')::date
        `,
        [userId, nivelId, juego]
    );

    return rows[0].total;
}

/* ---------------------------------------------------------
   CÁLCULO DE LA RECOMPENSA
   'completar': todo o nada → debe responder todas las
                preguntas y llegar al mínimo de aciertos.
   'puntos':    proporcional → si llega al mínimo, gana la
                parte que corresponde a sus aciertos.
--------------------------------------------------------- */

export function calcularRecompensa(nivel, { aciertos, total, resultado }) {
    const porcentaje = total > 0 ? Math.round((100 * aciertos) / total) : 0;
    const alcanzoMinimo = porcentaje >= nivel.porcentaje_minimo;

    let factor = 0;

    if (nivel.tipo_recompensa === "completar") {
        factor = resultado === "completada" && alcanzoMinimo ? 1 : 0;
    } else {
        factor = alcanzoMinimo && total > 0 ? aciertos / total : 0;
    }

    return {
        porcentaje,
        alcanzo_minimo: alcanzoMinimo,
        xp: Math.round(nivel.recompensa_xp * factor),
        oro: Math.round(nivel.recompensa_oro * factor),
        // Los diamantes son escasos: solo enteros completos.
        diamantes: Math.floor(nivel.recompensa_diamantes * factor),
    };
}

async function terminarPartida(client, partida, nivel, resultado) {
    const total = partida.total_preguntas;

    const calculo = calcularRecompensa(nivel, {
        aciertos: partida.aciertos,
        total,
        resultado,
    });

    let { xp, oro, diamantes } = calculo;
    let limiteDiario = false;

    const hayPremio = xp + oro + diamantes > 0;

    if (hayPremio && nivel.max_recompensas_diarias > 0) {
        const hoy = await recompensasDeHoy(client, partida.user_id, { nivelId: nivel.id });

        if (hoy >= nivel.max_recompensas_diarias) {
            limiteDiario = true;
            xp = 0;
            oro = 0;
            diamantes = 0;
        }
    }

    const recompensa = await entregarRecompensa(client, partida.user_id, { xp, oro, diamantes });

    const gano = resultado === "completada" && calculo.alcanzo_minimo;

    await sumarEstadisticas(client, partida.user_id, {
        jugadas: 1,
        ganadas: gano ? 1 : 0,
        perdidas: gano ? 0 : 1,
        respondidas: partida.aciertos + partida.errores,
        correctas: partida.aciertos,
        incorrectas: partida.errores,
    });

    await client.query(
        `
        UPDATE partidas
        SET estado = 'terminada',
            resultado = $2,
            xp_ganada = $3,
            oro_ganado = $4,
            diamantes_ganados = $5,
            terminada_en = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [partida.id, resultado, xp, oro, diamantes]
    );

    return {
        resultado,
        aciertos: partida.aciertos,
        errores: partida.errores,
        total_preguntas: total,
        porcentaje: calculo.porcentaje,
        porcentaje_minimo: nivel.porcentaje_minimo,
        alcanzo_minimo: calculo.alcanzo_minimo,
        puntos: partida.puntos,
        limite_diario_alcanzado: limiteDiario,
        recompensa,
    };
}

/* ---------------------------------------------------------
   ACCIONES DEL JUGADOR
--------------------------------------------------------- */

export async function iniciarPartida(userId, nivelId) {
    const nivel = await obtenerNivel(nivelId);

    if (!nivel) throw new ErrorJuego("Ese nivel no existe o no está disponible.", 404);
    if (nivel.total_preguntas === 0) throw new ErrorJuego("Ese nivel todavía no tiene preguntas.");

    return enTransaccion(async (client) => {
        // Si dejó una partida a medias, se cierra sin premio.
        await client.query(
            `
            UPDATE partidas
            SET estado = 'terminada', resultado = 'abandonada', terminada_en = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND juego = 'preguntas' AND estado = 'en_curso'
            `,
            [userId]
        );

        const { rows: elegidas } = await client.query(
            `SELECT id FROM preguntas WHERE nivel_id = $1 ORDER BY random() LIMIT $2`,
            [nivel.id, nivel.preguntas_por_partida]
        );

        const ids = elegidas.map((fila) => fila.id);

        const { rows } = await client.query(
            `
            INSERT INTO partidas (user_id, juego, nivel_id, preguntas_ids, total_preguntas, vidas_restantes)
            VALUES ($1, 'preguntas', $2, $3, $4, $5)
            RETURNING *
            `,
            [userId, nivel.id, ids, ids.length, nivel.vidas]
        );

        const partida = rows[0];

        return {
            partida: estadoPublico(partida),
            nivel: {
                id: nivel.id,
                nombre: nivel.nombre,
                grado: nivel.grado,
                asignatura: nivel.asignatura,
                dificultad: nivel.dificultad,
                segundos_por_pregunta: nivel.segundos_por_pregunta,
                vidas: nivel.vidas,
                puntos_por_acierto: nivel.puntos_por_acierto,
                tipo_recompensa: nivel.tipo_recompensa,
                recompensa_xp: nivel.recompensa_xp,
                recompensa_oro: nivel.recompensa_oro,
                recompensa_diamantes: nivel.recompensa_diamantes,
                porcentaje_minimo: nivel.porcentaje_minimo,
            },
            pregunta: await preguntaPublica(client, ids[0]),
        };
    });
}

/*
 * opcion: posición elegida (desde 0), o null si se acabó
 * el tiempo.
 */
export async function responder(userId, partidaId, opcion) {
    return enTransaccion(async (client) => {
        const partida = await bloquearPartida(client, partidaId, userId);
        const nivel = await obtenerNivel(partida.nivel_id, { soloActivo: false });

        if (!nivel) throw new ErrorJuego("El nivel de esta partida ya no existe.", 410);

        const preguntaId = partida.preguntas_ids[partida.indice_actual];

        const { rows } = await client.query(
            "SELECT respuesta_correcta, explicacion FROM preguntas WHERE id = $1",
            [preguntaId]
        );

        // Si el administrador cambió las preguntas a mitad de
        // partida, se cuenta como acierto para no castigar.
        const pregunta = rows[0];
        const elegida = Number.isInteger(opcion) ? opcion : null;
        const correcta = pregunta ? elegida === pregunta.respuesta_correcta : true;

        partida.indice_actual += 1;

        if (correcta) {
            partida.aciertos += 1;
            partida.puntos += nivel.puntos_por_acierto;
        } else {
            partida.errores += 1;
            partida.vidas_restantes = Math.max(0, partida.vidas_restantes - 1);
        }

        await client.query(
            `
            UPDATE partidas
            SET indice_actual = $2,
                aciertos = $3,
                errores = $4,
                vidas_restantes = $5,
                puntos = $6,
                respuestas = respuestas || $7::jsonb
            WHERE id = $1
            `,
            [
                partida.id,
                partida.indice_actual,
                partida.aciertos,
                partida.errores,
                partida.vidas_restantes,
                partida.puntos,
                JSON.stringify([{ pregunta_id: preguntaId, opcion: elegida, correcta }]),
            ]
        );

        let final = null;
        let siguiente = null;

        if (partida.vidas_restantes <= 0) {
            final = await terminarPartida(client, partida, nivel, "sin_vidas");
        } else if (partida.indice_actual >= partida.total_preguntas) {
            final = await terminarPartida(client, partida, nivel, "completada");
        } else {
            siguiente = await preguntaPublica(client, partida.preguntas_ids[partida.indice_actual]);
        }

        return {
            correcta,
            respuesta_correcta: pregunta?.respuesta_correcta ?? null,
            explicacion: pregunta?.explicacion ?? null,
            partida: estadoPublico(partida),
            siguiente,
            final,
        };
    });
}

/* Comodín 50/50: oculta la mitad de las opciones incorrectas. */
export async function usarComodin(userId, partidaId) {
    return enTransaccion(async (client) => {
        const partida = await bloquearPartida(client, partidaId, userId);

        if (partida.comodin_usado) throw new ErrorJuego("Ya usaste el 50/50 en esta partida.");

        const { rows } = await client.query(
            "SELECT opciones, respuesta_correcta FROM preguntas WHERE id = $1",
            [partida.preguntas_ids[partida.indice_actual]]
        );

        if (!rows[0]) throw new ErrorJuego("No hay pregunta activa.");

        const { opciones, respuesta_correcta } = rows[0];

        const incorrectas = opciones
            .map((_, i) => i)
            .filter((i) => i !== respuesta_correcta)
            .sort(() => Math.random() - 0.5);

        const ocultar = incorrectas.slice(0, Math.floor(opciones.length / 2));

        await client.query("UPDATE partidas SET comodin_usado = TRUE WHERE id = $1", [partida.id]);

        return { ocultar };
    });
}

export async function retirarse(userId, partidaId) {
    return enTransaccion(async (client) => {
        const partida = await bloquearPartida(client, partidaId, userId);
        const nivel = await obtenerNivel(partida.nivel_id, { soloActivo: false });

        if (!nivel) throw new ErrorJuego("El nivel de esta partida ya no existe.", 410);

        return {
            final: await terminarPartida(client, partida, nivel, "retirada"),
        };
    });
}

export async function partidasRecientes(userId, limite = 20) {
    const { rows } = await pool.query(
        `
        SELECT p.id, p.juego, p.resultado, p.aciertos, p.total_preguntas, p.puntos,
               p.xp_ganada, p.oro_ganado, p.diamantes_ganados, p.terminada_en,
               n.nombre AS nivel, n.grado, n.asignatura
        FROM partidas p
        LEFT JOIN niveles_juego n ON n.id = p.nivel_id
        WHERE p.user_id = $1 AND p.estado = 'terminada' AND p.resultado <> 'abandonada'
        ORDER BY p.terminada_en DESC
        LIMIT $2
        `,
        [userId, limite]
    );

    return rows;
}

/* ---------------------------------------------------------
   JUEGOS SIN BANCO DE PREGUNTAS EN EL SERVIDOR
   Escape Álgebra se juega en el navegador. Para que no se
   pueda inflar, la recompensa tiene tope por partida y por
   día.
--------------------------------------------------------- */

const JUEGOS_SIMPLES = {
    "escape-algebra": {
        maxPreguntas: 30,
        xpPorAcierto: 5,
        oroPorAcierto: 2,
        maxXp: 50,
        maxOro: 20,
        maxRecompensasDiarias: 5,
    },
};

export async function registrarPartidaSimple(userId, { juego, aciertos, total }) {
    const reglas = JUEGOS_SIMPLES[juego];

    if (!reglas) throw new ErrorJuego("Juego desconocido.");

    const totalSeguro = Math.min(reglas.maxPreguntas, Math.max(0, Math.round(Number(total) || 0)));
    const aciertosSeguros = Math.min(totalSeguro, Math.max(0, Math.round(Number(aciertos) || 0)));

    return enTransaccion(async (client) => {
        let xp = Math.min(reglas.maxXp, aciertosSeguros * reglas.xpPorAcierto);
        let oro = Math.min(reglas.maxOro, aciertosSeguros * reglas.oroPorAcierto);
        let limiteDiario = false;

        if (xp + oro > 0) {
            const hoy = await recompensasDeHoy(client, userId, { juego });

            if (hoy >= reglas.maxRecompensasDiarias) {
                limiteDiario = true;
                xp = 0;
                oro = 0;
            }
        }

        const recompensa = await entregarRecompensa(client, userId, { xp, oro });

        await sumarEstadisticas(client, userId, {
            jugadas: 1,
            ganadas: totalSeguro > 0 && aciertosSeguros === totalSeguro ? 1 : 0,
            perdidas: totalSeguro > 0 && aciertosSeguros === totalSeguro ? 0 : 1,
            respondidas: totalSeguro,
            correctas: aciertosSeguros,
            incorrectas: totalSeguro - aciertosSeguros,
        });

        await client.query(
            `
            INSERT INTO partidas (user_id, juego, estado, resultado, total_preguntas, aciertos, errores,
                                  xp_ganada, oro_ganado, terminada_en)
            VALUES ($1, $2, 'terminada', $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            `,
            [
                userId,
                juego,
                aciertosSeguros === totalSeguro ? "completada" : "perdida",
                totalSeguro,
                aciertosSeguros,
                totalSeguro - aciertosSeguros,
                xp,
                oro,
            ]
        );

        return { recompensa, limite_diario_alcanzado: limiteDiario };
    });
}

/* ---------------------------------------------------------
   JUEGOS MULTIJUGADOR DE LAS SALAS (Triqui, SigloGamif)
   Se llama desde el servidor de sockets cuando termina una
   partida. resultados = [{ userId, resultado, siglo? }]
--------------------------------------------------------- */

const PREMIOS_MULTIJUGADOR = {
    triqui: {
        ganada: { xp: 30, oro: 15 },
        empate: { xp: 15, oro: 5 },
        perdida: { xp: 10, oro: 0 },
    },
    siglo: {
        ganada: { xp: 40, oro: 20 },
        empate: { xp: 20, oro: 8 },
        perdida: { xp: 10, oro: 0 },
    },
};

// Hacer SIGLO (exactamente 100) da además un diamante.
const BONO_SIGLO_DIAMANTES = 1;

const MAX_MULTIJUGADOR_DIARIAS = 15;

export async function registrarResultadoMultijugador(juego, resultados) {
    const tabla = PREMIOS_MULTIJUGADOR[juego];
    if (!tabla) throw new Error(`Juego multijugador desconocido: ${juego}`);

    const premios = [];

    for (const { userId, resultado, siglo } of resultados) {
        if (!userId || !tabla[resultado]) continue;

        const premio = await enTransaccion(async (client) => {
            let { xp, oro } = tabla[resultado];
            let diamantes = siglo ? BONO_SIGLO_DIAMANTES : 0;
            let limiteDiario = false;

            const hoy = await recompensasDeHoy(client, userId, { juego });

            if (hoy >= MAX_MULTIJUGADOR_DIARIAS) {
                xp = 0;
                oro = 0;
                diamantes = 0;
                limiteDiario = true;
            }

            const recompensa = await entregarRecompensa(client, userId, { xp, oro, diamantes });

            await sumarEstadisticas(client, userId, {
                jugadas: 1,
                ganadas: resultado === "ganada" ? 1 : 0,
                perdidas: resultado === "perdida" ? 1 : 0,
            });

            await client.query(
                `
                INSERT INTO partidas (user_id, juego, estado, resultado, xp_ganada, oro_ganado,
                                      diamantes_ganados, terminada_en)
                VALUES ($1, $2, 'terminada', $3, $4, $5, $6, CURRENT_TIMESTAMP)
                `,
                [userId, juego, resultado, xp, oro, diamantes]
            );

            return { ...recompensa, limite_diario_alcanzado: limiteDiario };
        });

        premios.push({ userId, resultado, recompensa: premio });
    }

    return premios;
}

export function registrarResultadoTriqui(resultados) {
    return registrarResultadoMultijugador("triqui", resultados);
}

export async function perfilActualizado(userId) {
    return getUserProfile(userId);
}
