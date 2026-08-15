const sounds = {
    click: "/sounds/click.mp3",
    correct: "/sounds/correct.mp3",
    incorrect: "/sounds/incorrect.mp3",
    unlock: "/sounds/unlock.mp3",
    victory: "/sounds/victory.mp3",
    gameOver: "/sounds/game-over.mp3",
    warning: "/sounds/warning.mp3"

};

export function playSound(name, volume = 0.6) {

    const source = sounds[name];

    if (!source) {
        return;
    }

    const audio = new Audio(source);

    audio.volume = volume;

    audio.currentTime = 0;

    audio.play().catch(() => {
        // El navegador puede bloquear audio hasta que exista interacción.
    });
}