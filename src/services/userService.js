import {
    getUserById,
    updateUser
} from "./providers/LocalProvider";


// =====================================================
// OBTENER PERFIL
// =====================================================

export const getUserProfile = (
    userId
) => {

    return getUserById(
        userId
    );

};


// =====================================================
// AGREGAR XP
// =====================================================

export const addXP = (
    userId,
    amount
) => {

    const user =
        getUserById(userId);


    if (!user) {
        return null;
    }


    const newXP =
        Math.max(
            0,
            Number(user.xp || 0) +
            Number(amount || 0)
        );


    const newLevel =
        Math.floor(
            newXP / 1000
        ) + 1;


    return updateUser(

        userId,

        {

            xp: newXP,

            level: newLevel

        }

    );

};


// =====================================================
// AGREGAR MONEDAS
// =====================================================

export const addCoins = (
    userId,
    amount
) => {

    const user =
        getUserById(userId);


    if (!user) {
        return null;
    }


    return updateUser(

        userId,

        {

            coins:
                Math.max(
                    0,
                    Number(user.coins || 0) +
                    Number(amount || 0)
                )

        }

    );

};


// =====================================================
// REGISTRAR JUEGO
// =====================================================

export const registerGamePlayed = (
    userId,
    gameId
) => {

    const user =
        getUserById(userId);


    if (!user) {
        return null;
    }


    const gameStats = {
        ...(user.gameStats || {})
    };


    const currentStats =
        gameStats[gameId] || {

            played: 0,

            victories: 0,

            bestScore: 0

        };


    gameStats[gameId] = {

        ...currentStats,

        played:
            currentStats.played + 1

    };


    return updateUser(

        userId,

        {

            gamesPlayed:
                Number(
                    user.gamesPlayed || 0
                ) + 1,

            gameStats

        }

    );

};


// =====================================================
// ACTUALIZAR ESTADÍSTICAS
// =====================================================

export const updateGameStats = (
    userId,
    gameId,
    stats
) => {

    const user =
        getUserById(userId);


    if (!user) {
        return null;
    }


    const gameStats = {

        ...(user.gameStats || {}),

        [gameId]: {

            ...(user.gameStats?.[gameId] || {}),

            ...stats

        }

    };


    return updateUser(

        userId,

        {

            gameStats

        }

    );

};