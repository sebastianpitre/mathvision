/* =========================================================
   PROGRESO DEL JUGADOR: NIVEL, XP, ORO Y DIAMANTES
   ---------------------------------------------------------
   Todo se calcula aquí, en el servidor. El navegador nunca
   decide cuánto gana un jugador.

   Curva de niveles (sube de a poco):
     XP para pasar del nivel N al N+1 = 100 + 50 × (N − 1)
       nivel 1 → 2 : 100 XP
       nivel 2 → 3 : 150 XP
       nivel 5 → 6 : 300 XP
       nivel 10 → 11: 550 XP
   Una partida media da ~50 XP, así que los primeros niveles
   salen en 2–3 partidas y luego cuesta cada vez más.

   Premio por subir de nivel: oro y un diamante.
========================================================= */

export const XP_BASE = 100;
export const XP_INCREMENTO = 50;
export const NIVEL_MAXIMO = 100;

export const PREMIO_SUBIR_NIVEL = {
    oro: 25,
    diamantes: 1,
};

export function xpParaSubir(nivel) {
    return XP_BASE + XP_INCREMENTO * (nivel - 1);
}

/*
 * A partir del XP total devuelve el nivel y cuánto lleva
 * dentro de ese nivel (para la barra de progreso).
 */
export function calcularNivel(xpTotal) {
    let nivel = 1;
    let restante = Math.max(0, Number(xpTotal) || 0);

    while (nivel < NIVEL_MAXIMO && restante >= xpParaSubir(nivel)) {
        restante -= xpParaSubir(nivel);
        nivel += 1;
    }

    return {
        nivel,
        xp_en_nivel: restante,
        xp_para_subir: xpParaSubir(nivel),
    };
}

/*
 * Agrega datos de progreso a un perfil de la base de datos
 * (el frontend los usa para mostrar la barra de XP).
 */
export function conProgreso(perfil) {
    if (!perfil) return perfil;

    const { xp_en_nivel, xp_para_subir } = calcularNivel(perfil.xp);

    return {
        ...perfil,
        xp_en_nivel,
        xp_para_subir,
        es_admin: perfil.rol === "admin",
    };
}

/*
 * Suma XP, oro y diamantes a un jugador dentro de una
 * transacción. Si sube de nivel, entrega el premio.
 *
 * Devuelve lo que ganó y si subió de nivel, para que el
 * juego lo muestre al terminar.
 */
export async function entregarRecompensa(client, userId, { xp = 0, oro = 0, diamantes = 0 }) {
    const { rows } = await client.query(
        `SELECT xp, level FROM player_profiles WHERE user_id = $1 FOR UPDATE`,
        [userId]
    );

    if (rows.length === 0) {
        throw new Error("Perfil de jugador no encontrado.");
    }

    const xpAnterior = Number(rows[0].xp) || 0;
    const nivelAnterior = calcularNivel(xpAnterior).nivel;

    const xpNueva = xpAnterior + Math.max(0, xp);
    const nivelNuevo = calcularNivel(xpNueva).nivel;

    const nivelesSubidos = Math.max(0, nivelNuevo - nivelAnterior);

    const bonoOro = nivelesSubidos * PREMIO_SUBIR_NIVEL.oro;
    const bonoDiamantes = nivelesSubidos * PREMIO_SUBIR_NIVEL.diamantes;

    await client.query(
        `
        UPDATE player_profiles
        SET xp = $2,
            level = $3,
            coins = coins + $4,
            gems = gems + $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        `,
        [
            userId,
            xpNueva,
            nivelNuevo,
            Math.max(0, oro) + bonoOro,
            Math.max(0, diamantes) + bonoDiamantes,
        ]
    );

    return {
        xp: Math.max(0, xp),
        oro: Math.max(0, oro),
        diamantes: Math.max(0, diamantes),
        nivel_anterior: nivelAnterior,
        nivel_nuevo: nivelNuevo,
        subio_nivel: nivelesSubidos > 0,
        bono_subir_nivel: {
            oro: bonoOro,
            diamantes: bonoDiamantes,
        },
    };
}

/*
 * Suma a las estadísticas generales del jugador
 * (las que se ven en el perfil).
 */
export async function sumarEstadisticas(client, userId, {
    jugadas = 0,
    ganadas = 0,
    perdidas = 0,
    respondidas = 0,
    correctas = 0,
    incorrectas = 0,
}) {
    await client.query(
        `
        UPDATE player_stats
        SET games_played = games_played + $2,
            games_won = games_won + $3,
            games_lost = games_lost + $4,
            questions_answered = questions_answered + $5,
            correct_answers = correct_answers + $6,
            incorrect_answers = incorrect_answers + $7
        WHERE user_id = $1
        `,
        [userId, jugadas, ganadas, perdidas, respondidas, correctas, incorrectas]
    );
}
