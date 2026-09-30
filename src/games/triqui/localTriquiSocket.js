/* =========================================================
   TRIQUI LOCAL (2 jugadores en el mismo dispositivo)
   ---------------------------------------------------------
   Imita al socket del servidor: tiene on / off / once /
   emit / connect / id / connected. TriquiGame lo usa igual
   que el socket real, pero toda la partida (tablero,
   turnos, tiempo, preguntas y ganador) corre aquí, en el
   navegador. No toca el servidor.

   socket.id siempre es el jugador que tiene el turno, así
   la pantalla trata al que está jugando como "yo".
========================================================= */

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
];

const TURN_TIME = 20;

const rand = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

/* ---------------------------------------------------------
   PREGUNTAS
   Cambia los rangos si quieres más fácil o más difícil.
--------------------------------------------------------- */

export const generateQuestion = () => {

    const type = rand(0, 3);

    if (type === 0) {
        const a = rand(2, 60);
        const b = rand(2, 60);
        return { text: `${a} + ${b}`, answer: a + b };
    }

    if (type === 1) {
        const a = rand(10, 80);
        const b = rand(1, a); // sin resultados negativos
        return { text: `${a} − ${b}`, answer: a - b };
    }

    if (type === 2) {
        const a = rand(2, 12);
        const b = rand(2, 10);
        return { text: `${a} × ${b}`, answer: a * b };
    }

    // División exacta
    const b = rand(2, 10);
    const result = rand(2, 10);
    return { text: `${b * result} ÷ ${b}`, answer: result };
};

const findWinningLine = (board) =>
    WIN_LINES.find(
        ([a, b, c]) =>
            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]
    ) || null;

/* ---------------------------------------------------------
   SOCKET LOCAL
--------------------------------------------------------- */

export function createLocalTriquiSocket({
    playerName = "Jugador",
    cloneName,
    turnTime = TURN_TIME,
} = {}) {

    const name = String(playerName).trim() || "Jugador";

    const players = [
        { id: "local-p1", name, symbol: "X" },
        { id: "local-p2", name: cloneName || `${name} Clone`, symbol: "O" },
    ];

    const listeners = new Map();

    let game = null;
    let answer = null;          // respuesta correcta de la pregunta actual
    let answeredCorrectly = false;
    let turnTimer = null;
    const pending = new Set();

    /* ---------- eventos ---------- */

    const dispatch = (event, payload) => {
        const set = listeners.get(event);
        if (!set) return;
        [...set].forEach((fn) => fn(payload));
    };

    // Asíncrono, como si viniera del servidor
    const send = (event, payload) => {
        const id = setTimeout(() => {
            pending.delete(id);
            dispatch(event, payload);
        }, 0);
        pending.add(id);
    };

    const snapshot = () => ({
        ...game,
        players: game.players.map((p) => ({ ...p })),
        board: [...game.board],
        score: { ...game.score },
        question: game.question ? { ...game.question } : null,
        winningLine: game.winningLine ? [...game.winningLine] : null,
        winner: game.winner ? { ...game.winner } : null,
    });

    const playerById = (id) => players.find((p) => p.id === id);

    const otherPlayer = (id) => players.find((p) => p.id !== id);

    /* ---------- turnos ---------- */

    const clearTurnTimer = () => {
        if (turnTimer) {
            clearTimeout(turnTimer);
            turnTimer = null;
        }
    };

    const startTurn = (playerId) => {

        clearTurnTimer();

        const q = generateQuestion();

        answer = q.answer;
        answeredCorrectly = false;

        game.currentPlayerId = playerId;
        game.question = { text: q.text };
        game.turnStartedAt = Date.now();

        turnTimer = setTimeout(handleTimeout, turnTime * 1000);
    };

    /*
     * Si el reloj del turno se detuvo (dispose), lo vuelve
     * a programar con el tiempo que le queda al turno.
     */
    const ensureTurnTimer = () => {

        if (turnTimer || !game || game.status !== "playing") return;

        const remaining = Math.max(
            0,
            game.turnStartedAt + turnTime * 1000 - Date.now()
        );

        turnTimer = setTimeout(handleTimeout, remaining);
    };

    const handleTimeout = () => {

        turnTimer = null;

        if (!game || game.status !== "playing") return;

        const failed = playerById(game.currentPlayerId);

        send("game:turnTimeout", {
            failedPlayerId: failed.id,
            failedPlayerName: failed.name,
            nextPlayerName: otherPlayer(failed.id).name,
        });

        // Cambia el turno después del aviso
        const id = setTimeout(() => {
            pending.delete(id);
            if (!game || game.status !== "playing") return;
            startTurn(otherPlayer(failed.id).id);
            send("game:state", { game: snapshot() });
        }, 0);
        pending.add(id);
    };

    /* ---------- partida ---------- */

    const newGame = (startingPlayerId, keepScore) => {

        const round = game ? game.round + 1 : 1;
        const score = keepScore && game
            ? game.score
            : { [players[0].id]: 0, [players[1].id]: 0 };

        game = {
            id: "local-game",
            mode: "local",
            status: "playing",
            round,
            players,
            board: Array(9).fill(null),
            currentPlayerId: startingPlayerId,
            winningLine: null,
            winner: null,
            score,
            question: null,
            turnStartedAt: null,
            turnTime,
        };

        startTurn(startingPlayerId);
    };

    const finish = (winnerPlayer, line) => {

        clearTurnTimer();

        game.status = "finished";
        game.winner = winnerPlayer || null;
        game.winningLine = line || null;
        game.question = null;

        if (winnerPlayer) {
            game.score[winnerPlayer.id] =
                (game.score[winnerPlayer.id] || 0) + 1;
            // el ganador queda como "yo" para el sonido de victoria
            game.currentPlayerId = winnerPlayer.id;
        }

        send("game:finished", { game: snapshot() });
    };

    /* ---------- acciones que llegan de la pantalla ---------- */

    const handlers = {

        "game:state": () => {
            if (!game) newGame(players[0].id, false);
            send("game:state", { game: snapshot() });
        },

        "game:answer": ({ answer: value } = {}) => {

            if (!game || game.status !== "playing") {
                send("game:answerResult", {
                    success: false,
                    correct: false,
                    message: "La partida no está en juego.",
                });
                return;
            }

            if (answeredCorrectly) return;

            if (Number(value) === answer) {

                answeredCorrectly = true;

                send("game:answerResult", {
                    success: true,
                    correct: true,
                    message: "¡Correcto! Colocando tu ficha...",
                });

                return;
            }

            // Incorrecta: pierde el turno
            const failed = playerById(game.currentPlayerId);
            const next = otherPlayer(failed.id);

            send("game:answerResult", {
                success: true,
                correct: false,
                message: `Incorrecto, era ${answer}. Turno de ${next.name}.`,
            });

            const id = setTimeout(() => {
                pending.delete(id);
                if (!game || game.status !== "playing") return;
                startTurn(next.id);
                send("game:state", { game: snapshot() });
            }, 0);
            pending.add(id);
        },

        "game:play": ({ cellIndex } = {}) => {

            if (!game || game.status !== "playing") return;

            if (!answeredCorrectly) {
                send("game:playError", {
                    message: "Primero responde la operación.",
                });
                return;
            }

            if (
                !Number.isInteger(cellIndex) ||
                cellIndex < 0 ||
                cellIndex > 8 ||
                game.board[cellIndex] !== null
            ) {
                send("game:playError", {
                    message: "Esa casilla no está disponible.",
                });
                return;
            }

            const player = playerById(game.currentPlayerId);

            game.board = [...game.board];
            game.board[cellIndex] = player.symbol;

            const line = findWinningLine(game.board);

            if (line) {
                finish(player, line);
                return;
            }

            if (game.board.every((cell) => cell !== null)) {
                finish(null, null);
                return;
            }

            startTurn(otherPlayer(player.id).id);
            send("game:state", { game: snapshot() });
        },

        "game:emoji": ({ emoji } = {}) => {
            const player = playerById(game?.currentPlayerId) || players[0];
            send("game:emoji", {
                emoji,
                playerId: player.id,
                playerName: player.name,
            });
        },

        "game:rematch": () => {

            // Empieza el que no empezó la ronda anterior
            const starter =
                game && game.round % 2 === 1
                    ? players[1].id
                    : players[0].id;

            newGame(starter, true);
            send("game:started", { game: snapshot() });
        },

        "room:leave": () => {
            clearTurnTimer();
        },
    };

    /* ---------- API tipo socket.io ---------- */

    const localSocket = {

        connected: true,
        isLocal: true,

        get id() {
            return game?.currentPlayerId || players[0].id;
        },

        on(event, fn) {
            if (!listeners.has(event)) listeners.set(event, new Set());
            listeners.get(event).add(fn);
            ensureTurnTimer();
            return localSocket;
        },

        once(event, fn) {
            const wrapper = (payload) => {
                localSocket.off(event, wrapper);
                fn(payload);
            };
            return localSocket.on(event, wrapper);
        },

        off(event, fn) {
            if (!fn) listeners.delete(event);
            else listeners.get(event)?.delete(fn);
            return localSocket;
        },

        emit(event, payload) {
            ensureTurnTimer();
            handlers[event]?.(payload);
            return localSocket;
        },

        connect() {
            return localSocket;
        },

        disconnect() {
            return localSocket;
        },

        /*
         * Detiene los relojes. NO apaga el socket para siempre:
         * en desarrollo (StrictMode) React desmonta y vuelve a
         * montar el componente, y la partida debe seguir.
         * Los listeners los quita el propio componente con off().
         */
        dispose() {
            clearTurnTimer();
            pending.forEach(clearTimeout);
            pending.clear();
        },
    };

    return localSocket;
}