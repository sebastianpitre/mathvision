const sounds = {

    correct: "/sounds/correct.mp3",
    incorrect: "/sounds/incorrect.mp3",
    victory: "/sounds/victory.mp3",
    gameOver: "/sounds/game-over.mp3",
    lifeline: "/sounds/lifeline.mp3",
    retire: "/sounds/retire.mp3",

    background:
        "/sounds/MathMillonario/fondo-millonario.wav"

};


// =====================================================
// SONIDOS NORMALES
// =====================================================

export const playSound = (
    name,
    volume = 3
) => {

    const src = sounds[name];

    if (!src) {
        return null;
    }

    const audio = new Audio(src);

    audio.volume = Math.max(
        0,
        Math.min(1, volume)
    );

    audio.play().catch(() => {});

    return audio;

};


// =====================================================
// MÚSICA DE FONDO
// =====================================================

export const createBackgroundMusic = () => {

    const audio = new Audio(
        sounds.background
    );

    audio.loop = true;

    audio.volume = 0.18;

    // Importante para evitar algunos
    // problemas de reproducción
    audio.preload = "auto";

    return audio;

};