const sounds = {

    correct: "/sounds/correct.mp3",
    incorrect: "/sounds/incorrect.mp3",
    victory: "/sounds/victory.mp3",
    gameOver: "/sounds/game-over.mp3",
    lifeline: "/sounds/lifeline.mp3",
    retire: "/sounds/retire.mp3",

    background:
        "/sounds/triqui/retro.mp3"

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

export const createBackgroundMusic = (boost = 2) => {

    const audio = new Audio(sounds.background);

    audio.loop = true;
    audio.volume = 1;
    audio.preload = "auto";

    // Amplificador: 1 = normal, 1.5 = 50% más fuerte, 2 = el doble
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaElementSource(audio);
        const gain = ctx.createGain();

        gain.gain.value = boost;

        source.connect(gain);
        gain.connect(ctx.destination);

        // El navegador pausa el contexto hasta que el usuario toca la pantalla
        audio.addEventListener("play", () => ctx.resume());
    } catch {
        /* si el navegador no soporta Web Audio, suena normal */
    }

    return audio;
};