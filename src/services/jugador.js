// ============================================================
// Datos del jugador listos para mostrar (barra superior,
// lobby, perfil). El XP por nivel lo calcula el servidor.
// ============================================================

import assets from "../data/mock/assets.json";

export function jugadorDesdeUsuario(user) {
    if (!user) return null;

    const level = Number(user.level) || 1;
    const enNivel = Number(user.xp_en_nivel) || 0;
    const paraSubir = Number(user.xp_para_subir) || 100;

    return {
        id: user.id,
        displayName: user.display_name || user.username || "Jugador",
        level,
        avatar: user.avatar || assets.players.defaultAvatar,
        characterModel: user.character_model_path || null,
        characterName: user.character_name || "Personaje",
        experience: {
            current: enNivel,
            needed: paraSubir,
            percentage: Math.round(Math.min(100, Math.max(0, (enNivel / paraSubir) * 100))),
        },
        currencies: {
            coins: Number(user.coins) || 0,
            gems: Number(user.gems) || 0,
            tickets: Number(user.tickets) || 0,
        },
        statistics: {
            wins: Number(user.games_won) || 0,
            matches: Number(user.games_played) || 0,
            accuracy: user.questions_answered
                ? Math.round((100 * Number(user.correct_answers || 0)) / Number(user.questions_answered))
                : 0,
        },
        esAdmin: Boolean(user.es_admin),
    };
}
