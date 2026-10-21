export class TriquiGame {

    constructor(room) {

        this.room = room;

        this.board = Array(9).fill(null);

        this.status = "waiting";

        this.currentPlayerIndex = 0;

        this.winner = null;

        this.winningLine = [];

        this.draw = false;

        this.currentQuestion = null;

        this.questionSolved = false;

        this.round = room.round || 1;

        this.startedAt = Date.now();

        // =====================================================
        // TEMPORIZADOR POR TURNO
        // =====================================================

        this.turnTime = 20;

        this.turnStartedAt = null;

        this.turnTimer = null;

        // Callback que será conectado desde server.js
        this.onTurnTimeout = null;

        // =====================================================

        this.players = Array.from(
            room.players.values()
        );

        this.players.forEach(
            (player, index) => {

                player.symbol =
                    index === 0
                        ? "X"
                        : "O";
            }
        );
    }


    // =========================================================
    // INICIAR PARTIDA
    // =========================================================

    start() {

        if (this.players.length !== 2) {

            throw new Error(
                "Se necesitan exactamente 2 jugadores."
            );
        }

        this.status = "playing";

        this.currentPlayerIndex = 0;

        this.generateQuestion();

        // Iniciar contador del primer turno
        this.startTurnTimer();

        return this.toJSON();
    }


    // =========================================================
    // TEMPORIZADOR
    // =========================================================

    startTurnTimer() {

        // Evitar temporizadores duplicados
        this.clearTurnTimer();

        this.turnStartedAt =
            Date.now();

        this.turnTimer =
            setTimeout(
                () => {

                    // Si la partida ya terminó,
                    // no hacemos nada.
                    if (
                        this.status !==
                        "playing"
                    ) {
                        return;
                    }

                    const failedPlayer =
                        this.currentPlayer;

                    // El jugador perdió
                    // automáticamente el turno.
                    this.changeTurn();

                    // Avisar al servidor.
                    if (
                        this.onTurnTimeout
                    ) {

                        this.onTurnTimeout({

                            failedPlayerId:
                                failedPlayer.id,

                            failedPlayerName:
                                failedPlayer.name,

                            nextPlayerId:
                                this.currentPlayer.id,

                            nextPlayerName:
                                this.currentPlayer.name,

                            game:
                                this.toJSON(),
                        });
                    }

                },
                this.turnTime * 1000
            );
    }


    clearTurnTimer() {

        if (this.turnTimer) {

            clearTimeout(
                this.turnTimer
            );

            this.turnTimer = null;
        }
    }


    // =========================================================
    // GENERAR PREGUNTA
    // =========================================================

    generateQuestion() {

        const operations = [
            "addition",
            "subtraction",
            "multiplication",
        ];

        const type =
            operations[
            Math.floor(
                Math.random() *
                operations.length
            )
            ];

        let a;
        let b;
        let answer;
        let text;

        if (type === "addition") {

            a =
                Math.floor(
                    Math.random() * 20
                ) + 1;

            b =
                Math.floor(
                    Math.random() * 20
                ) + 1;

            answer = a + b;

            text =
                `${a} + ${b}`;
        }

        else if (
            type === "subtraction"
        ) {

            a =
                Math.floor(
                    Math.random() * 20
                ) + 5;

            b =
                Math.floor(
                    Math.random() * a
                );

            answer = a - b;

            text =
                `${a} − ${b}`;
        }

        else {

            a =
                Math.floor(
                    Math.random() * 10
                ) + 2;

            b =
                Math.floor(
                    Math.random() * 10
                ) + 2;

            answer = a * b;

            text =
                `${a} × ${b}`;
        }

        this.currentQuestion = {

            text,

            answer,
        };

        this.questionSolved =
            false;
    }


    // =========================================================
    // JUGADOR ACTUAL
    // =========================================================

    get currentPlayer() {

        return this.players[
            this.currentPlayerIndex
        ];
    }


    // =========================================================
    // RESPONDER PREGUNTA
    // =========================================================

    answerQuestion(
        playerId,
        answer
    ) {

        if (
            this.status !==
            "playing"
        ) {

            return {

                success: false,

                correct: false,

                message:
                    "La partida no está activa.",
            };
        }

        const player =
            this.players.find(
                (p) =>
                    p.id === playerId
            );

        if (!player) {

            return {

                success: false,

                correct: false,

                message:
                    "Jugador no encontrado.",
            };
        }

        if (
            this.currentPlayer.id !==
            playerId
        ) {

            return {

                success: false,

                correct: false,

                message:
                    "No es tu turno.",
            };
        }

        if (
            this.questionSolved
        ) {

            return {

                success: false,

                correct: false,

                message:
                    "Esta pregunta ya fue resuelta.",
            };
        }

        const numericAnswer =
            Number(answer);

        const correct =
            numericAnswer ===
            this.currentQuestion.answer;


        // =====================================================
        // RESPUESTA CORRECTA
        // =====================================================

        if (correct) {

            this.questionSolved =
                true;

            return {

                success: true,

                correct: true,

                message:
                    "¡Respuesta correcta!",

                playerId,
            };
        }


        // =====================================================
        // RESPUESTA INCORRECTA
        // =====================================================

        const failedPlayer =
            this.currentPlayer;

        this.changeTurn();

        return {

            success: true,

            correct: false,

            turnLost: true,

            failedPlayerId:
                failedPlayer.id,

            failedPlayerName:
                failedPlayer.name,

            nextPlayerId:
                this.currentPlayer.id,

            nextPlayerName:
                this.currentPlayer.name,

            message:
                `${failedPlayer.name} se equivocó. ¡Pierde el turno!`,
        };
    }


    // =========================================================
    // COLOCAR FICHA
    // =========================================================

    playCell(
        playerId,
        cellIndex
    ) {

        if (
            this.status !==
            "playing"
        ) {

            return {

                success: false,

                message:
                    "La partida no está activa.",
            };
        }

        if (
            !this.questionSolved
        ) {

            return {

                success: false,

                message:
                    "Debes responder correctamente primero.",
            };
        }

        if (
            this.currentPlayer.id !==
            playerId
        ) {

            return {

                success: false,

                message:
                    "No es tu turno.",
            };
        }

        const index =
            Number(cellIndex);

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index > 8
        ) {

            return {

                success: false,

                message:
                    "Casilla inválida.",
            };
        }

        if (
            this.board[index] !==
            null
        ) {

            return {

                success: false,

                message:
                    "Esa casilla ya está ocupada.",
            };
        }

        const player =
            this.currentPlayer;

        this.board[index] =
            player.symbol;

        this.questionSolved =
            false;


        // =====================================================
        // REVISAR GANADOR
        // =====================================================

        const winningLine =
            this.checkWinner(
                player.symbol
            );

        if (winningLine) {

            this.winningLine =
                winningLine;

            this.winner =
                player;

            this.clearTurnTimer();

            this.status =
                "finished";

            return {

                success: true,

                finished: true,

                winner:
                    player.toJSON(),

                winningLine,

                game:
                    this.toJSON(),
            };
        }


        // =====================================================
        // REVISAR EMPATE
        // =====================================================

        if (
            this.board.every(
                (cell) =>
                    cell !== null
            )
        ) {

            this.draw =
                true;

            this.clearTurnTimer();

            this.status =
                "finished";

            return {

                success: true,

                finished: true,

                draw: true,

                game:
                    this.toJSON(),
            };
        }


        // =====================================================
        // CAMBIAR TURNO
        // =====================================================

        this.changeTurn();

        return {

            success: true,

            finished: false,

            nextPlayer:
                this.currentPlayer.toJSON(),

            game:
                this.toJSON(),
        };
    }


    // =========================================================
    // CAMBIAR TURNO
    // =========================================================

    changeTurn() {

        // Detener contador anterior
        this.clearTurnTimer();

        this.currentPlayerIndex =
            this.currentPlayerIndex === 0
                ? 1
                : 0;

        this.generateQuestion();

        // Iniciar los 20 segundos
        // del nuevo jugador.
        if (
            this.status ===
            "playing"
        ) {

            this.startTurnTimer();
        }
    }


    // =========================================================
    // COMPROBAR GANADOR
    // =========================================================

    checkWinner(symbol) {

        const combinations = [

            [0, 1, 2],

            [3, 4, 5],

            [6, 7, 8],

            [0, 3, 6],

            [1, 4, 7],

            [2, 5, 8],

            [0, 4, 8],

            [2, 4, 6],

        ];

        for (
            const combination
            of combinations
        ) {

            const [
                a,
                b,
                c
            ] = combination;

            if (
                this.board[a] ===
                symbol &&

                this.board[b] ===
                symbol &&

                this.board[c] ===
                symbol
            ) {

                return combination;
            }
        }

        return null;
    }


    // =========================================================
    // SERIALIZAR ESTADO
    // =========================================================

    toJSON() {

        let timeRemaining =
            this.turnTime;

        if (
            this.status ===
            "playing" &&
            this.turnStartedAt
        ) {

            const elapsed =
                Math.floor(
                    (
                        Date.now() -
                        this.turnStartedAt
                    ) / 1000
                );

            timeRemaining =
                Math.max(
                    0,
                    this.turnTime -
                    elapsed
                );
        }

        return {

            round:
                this.round,

            board: [
                ...this.board
            ],

            players:
                this.players.map(
                    (player) =>
                        player.toJSON()
                ),

            currentPlayerId:
                this.currentPlayer.id,

            currentPlayerSymbol:
                this.currentPlayer.symbol,

            status:
                this.status,

            winner:
                this.winner
                    ? this.winner.toJSON()
                    : null,

            winningLine:
                this.winningLine,

            draw:
                this.draw,

            question:
                this.currentQuestion
                    ? {
                        text:
                            this.currentQuestion
                                .text,
                    }
                    : null,

            questionSolved:
                this.questionSolved,

            // =================================================
            // TEMPORIZADOR
            // =================================================

            turnTime:
                this.turnTime,

            turnStartedAt:
                this.turnStartedAt,

            timeRemaining,

            // =================================================

            score:
                Object.fromEntries(
                    this.room.score
                ),
        };
    }
}