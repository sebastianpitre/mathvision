import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import { socket } from "../../services/socket";

import "./triqui.css";

/* =========================================================
   EMOJIS
========================================================= */

export const GAME_EMOJIS = [
    "🫏",
    "😂",
    "🤣",
    "⌛",
    "😎",
    "😏",
    "🤔",
    "😱",
    "😡",
    "😭",
    "😈",
    "🥳",
    "🔥",
    "👏",
    "💪",
    "👍",
    "👎",
    "❤️",
    "🎉",
    "🏆",
    "⚡",
    "🧠",
    "👀",
    "🤝",
    "😮",
    "🙌",
    "😅",
    "😜",
    "💯",
    "🚀",
];

function TriquiGame() {

    const navigate =
        useNavigate();

    const [game, setGame] =
        useState(null);

    const [error, setError] =
        useState("");

    const [selectedCell, setSelectedCell] =
        useState(null);

    const selectedCellRef =
        useRef(null);

    const [answer, setAnswer] =
        useState("");

    const [answerMessage, setAnswerMessage] =
        useState("");

    const [answerCorrect, setAnswerCorrect] =
        useState(null);

    const [emojiPanelOpen, setEmojiPanelOpen] =
        useState(false);

    const [floatingEmoji, setFloatingEmoji] =
        useState(null);

    const [turnNotice, setTurnNotice] =
        useState("");

    const [showResult, setShowResult] =
        useState(false);

    const [sendingEmoji, setSendingEmoji] =
        useState(false);

    const [timeRemaining, setTimeRemaining] =
        useState(20);

    /* =====================================================
       SOCKET
    ===================================================== */

    useEffect(() => {

        console.log(
            "🎮 TRIQUI: componente iniciado"
        );

        const handleGameStarted =
            ({ game }) => {

                console.log(
                    "🟢 NUEVA PARTIDA:",
                    game
                );

                setGame(game);

                setSelectedCell(null);

                selectedCellRef.current =
                    null;

                setAnswer("");

                setAnswerMessage("");

                setAnswerCorrect(null);

                setTurnNotice("");

                setShowResult(false);

                setError("");
            };

        const handleGameState =
            ({ game }) => {

                if (!game) {

                    setGame(null);

                    return;
                }

                console.log(
                    "🔄 ESTADO:",
                    game
                );

                setGame(game);

                setError("");
            };

        const handleGameFinished =
            ({ game }) => {

                console.log(
                    "🏆 PARTIDA TERMINADA",
                    game
                );

                setGame(game);

                setSelectedCell(null);

                selectedCellRef.current =
                    null;

                setAnswer("");

                setShowResult(true);
            };

        const handleGameError =
            ({ message }) => {

                console.error(
                    "🔴 GAME ERROR:",
                    message
                );

                setError(message);
            };

        const handlePlayError =
            ({ message }) => {

                setError(message);
            };

        const handleAnswerResult =
            ({
                success,
                correct,
                message,
            }) => {

                console.log(
                    "🧮 RESPUESTA:",
                    {
                        success,
                        correct,
                        message,
                    }
                );

                if (!success) {

                    setAnswerCorrect(
                        false
                    );

                    setAnswerMessage(
                        message
                    );

                    return;
                }

                /*
                 * RESPUESTA CORRECTA
                 */

                if (correct) {

                    setAnswerCorrect(
                        true
                    );

                    setAnswerMessage(
                        message
                    );

                    const cell =
                        selectedCellRef.current;

                    if (
                        cell !== null
                    ) {

                        /*
                         * Esperamos un pequeño
                         * momento para mostrar
                         * "correcto".
                         */

                        setTimeout(
                            () => {

                                socket.emit(
                                    "game:play",
                                    {
                                        cellIndex:
                                            cell,
                                    }
                                );

                                setSelectedCell(
                                    null
                                );

                                selectedCellRef.current =
                                    null;

                                setAnswer("");

                                setAnswerMessage("");

                                setAnswerCorrect(
                                    null
                                );
                            },
                            350
                        );
                    }

                    return;
                }

                /*
                 * RESPUESTA INCORRECTA
                 *
                 * El servidor ya cambió
                 * el turno.
                 */

                if (
                    !correct
                ) {

                    setSelectedCell(
                        null
                    );

                    selectedCellRef.current =
                        null;

                    setAnswer("");

                    setAnswerCorrect(
                        false
                    );

                    setAnswerMessage(
                        message
                    );

                    setTurnNotice(
                        message
                    );

                    setTimeout(
                        () => {
                            setTurnNotice("");
                            setAnswerMessage("");
                            setAnswerCorrect(null);
                        },
                        2200
                    );
                }
            };

        const handleTurnLost =
            ({
                failedPlayerId,
                failedPlayerName,
                nextPlayerName,
            }) => {

                const isMe =
                    failedPlayerId ===
                    socket.id;

                if (isMe) {

                    setTurnNotice(
                        `❌ Te equivocaste, ${failedPlayerName}. Pierdes el turno.`
                    );

                } else {

                    setTurnNotice(
                        `❌ ${failedPlayerName} se equivocó. ¡Ahora es tu turno!`
                    );
                }

                setTimeout(
                    () => {
                        setTurnNotice("");
                    },
                    3000
                );
            };

        const handleTurnTimeout =
            ({
                failedPlayerId,
                failedPlayerName,
                nextPlayerName,
            }) => {

                const isMe =
                    failedPlayerId ===
                    socket.id;

                if (isMe) {

                    setTurnNotice(
                        `⏰ ${failedPlayerName}, se acabó el tiempo. ¡Pierdes el turno!`
                    );

                } else {

                    setTurnNotice(
                        `⏰ ${failedPlayerName} se quedó sin tiempo. ¡Ahora es tu turno!`
                    );
                }

                setTimeout(
                    () => {

                        setTurnNotice("");

                    },
                    3000
                );
            };

        const handleEmoji =
            ({
                emoji,
                playerId,
                playerName,
            }) => {

                setFloatingEmoji({
                    emoji,
                    playerId,
                    playerName,
                    isMe:
                        playerId ===
                        socket.id,
                });

                setTimeout(
                    () => {
                        setFloatingEmoji(
                            null
                        );
                    },
                    2200
                );
            };

        const handlePlayerDisconnected =
            ({ message }) => {

                setError(
                    message
                );

                setShowResult(
                    false
                );
            };

        const requestState = () => {

            console.log(
                "📡 Solicitando estado..."
            );

            socket.emit(
                "game:state"
            );
        };

        socket.on(
            "game:started",
            handleGameStarted
        );

        socket.on(
            "game:state",
            handleGameState
        );

        socket.on(
            "game:finished",
            handleGameFinished
        );

        socket.on(
            "game:error",
            handleGameError
        );

        socket.on(
            "game:playError",
            handlePlayError
        );

        socket.on(
            "game:answerResult",
            handleAnswerResult
        );

        socket.on(
            "game:turnLost",
            handleTurnLost
        );

        socket.on(
            "game:turnTimeout",
            handleTurnTimeout
        );

        socket.on(
            "game:emoji",
            handleEmoji
        );

        socket.on(
            "game:playerDisconnected",
            handlePlayerDisconnected
        );

        if (
            !socket.connected
        ) {

            socket.connect();

            socket.once(
                "connect",
                requestState
            );

        } else {

            requestState();
        }

        return () => {

            socket.off(
                "game:started",
                handleGameStarted
            );

            socket.off(
                "game:state",
                handleGameState
            );

            socket.off(
                "game:finished",
                handleGameFinished
            );

            socket.off(
                "game:error",
                handleGameError
            );

            socket.off(
                "game:playError",
                handlePlayError
            );

            socket.off(
                "game:answerResult",
                handleAnswerResult
            );

            socket.off(
                "game:turnLost",
                handleTurnLost
            );

            socket.off(
                "game:turnTimeout",
                handleTurnTimeout
            );

            socket.off(
                "game:emoji",
                handleEmoji
            );

            socket.off(
                "game:playerDisconnected",
                handlePlayerDisconnected
            );

            socket.off(
                "connect",
                requestState
            );
        };

    }, []);

    /* =====================================================
   TEMPORIZADOR
===================================================== */

    useEffect(() => {

        if (
            !game ||
            game.status !== "playing" ||
            !game.turnStartedAt
        ) {

            setTimeRemaining(
                game?.turnTime || 20
            );

            return;
        }

        const turnTime =
            game.turnTime || 20;

        const updateTimer = () => {

            const elapsed =
                Math.floor(
                    (
                        Date.now() -
                        game.turnStartedAt
                    ) / 1000
                );

            const remaining =
                Math.max(
                    0,
                    turnTime - elapsed
                );

            setTimeRemaining(
                remaining
            );
        };

        updateTimer();

        const interval =
            setInterval(
                updateTimer,
                250
            );

        return () => {

            clearInterval(
                interval
            );
        };

    }, [
        game?.turnStartedAt,
        game?.status,
        game?.turnTime,
    ]);

    /* =====================================================
       DATOS DEL JUGADOR
    ===================================================== */

    const myPlayer =
        game?.players?.find(
            (player) =>
                player.id ===
                socket.id
        );

    const opponent =
        game?.players?.find(
            (player) =>
                player.id !==
                socket.id
        );

    const isMyTurn =
        Boolean(
            game &&
            myPlayer &&
            game.currentPlayerId ===
                myPlayer.id
        );

    const isPlaying =
        game?.status ===
        "playing";

    /* =====================================================
       SCORE
    ===================================================== */

    const getScore =
        (playerId) => {

            return (
                game?.score?.[playerId] ||
                0
            );
        };

    const myScore =
        myPlayer
            ? getScore(
                myPlayer.id
            )
            : 0;

    const opponentScore =
        opponent
            ? getScore(
                opponent.id
            )
            : 0;

    /* =====================================================
       SELECCIONAR CASILLA
    ===================================================== */

    const seleccionarCasilla =
        (index) => {

            setError("");

            if (!game) {
                return;
            }

            if (!isPlaying) {
                return;
            }

            if (!isMyTurn) {

                setError(
                    "⏳ Espera tu turno."
                );

                return;
            }

            if (
                game.board[index] !==
                null
            ) {

                return;
            }

            setSelectedCell(
                index
            );

            selectedCellRef.current =
                index;

            setAnswer("");

            setAnswerMessage("");

            setAnswerCorrect(null);
        };

    /* =====================================================
       RESPONDER
    ===================================================== */

    const enviarRespuesta =
        () => {

            if (
                !answer.trim()
            ) {

                setAnswerMessage(
                    "Escribe una respuesta."
                );

                setAnswerCorrect(
                    false
                );

                return;
            }

            if (!isMyTurn) {

                setAnswerMessage(
                    "No es tu turno."
                );

                setAnswerCorrect(
                    false
                );

                return;
            }

            socket.emit(
                "game:answer",
                {
                    answer:
                        Number(answer),
                }
            );
        };

    /* =====================================================
       CANCELAR CASILLA
    ===================================================== */

    const cancelarSeleccion =
        () => {

            setSelectedCell(
                null
            );

            selectedCellRef.current =
                null;

            setAnswer("");

            setAnswerMessage("");

            setAnswerCorrect(null);
        };

    /* =====================================================
       EMOJI
    ===================================================== */

    const sendEmoji =
        (emoji) => {

            if (
                sendingEmoji
            ) {
                return;
            }

            setSendingEmoji(
                true
            );

            socket.emit(
                "game:emoji",
                {
                    emoji,
                }
            );

            setEmojiPanelOpen(
                false
            );

            setTimeout(
                () => {
                    setSendingEmoji(
                        false
                    );
                },
                250
            );
        };

    /* =====================================================
       REVANCHA
    ===================================================== */

    const jugarRevancha =
        () => {

            setShowResult(
                false
            );

            setSelectedCell(
                null
            );

            selectedCellRef.current =
                null;

            setError("");

            socket.emit(
                "game:rematch"
            );
        };

    /* =====================================================
       VOLVER
    ===================================================== */

    const salir =
        () => {

            socket.emit(
                "room:leave"
            );

            setGame(null);

            navigate(
                "/world"
            );
        };

    /* =====================================================
       LOADING
    ===================================================== */

    if (!game) {

        return (
            <div className="triqui-page">

                <div className="triqui-loading">

                    <div className="triqui-loading-logo">
                        MATHVISION
                    </div>

                    <h1>
                        TRIQUI MATEMÁTICO
                    </h1>

                    <p>
                        Esperando partida...
                    </p>

                    {error && (
                        <div className="triqui-error">
                            {error}
                        </div>
                    )}

                </div>

            </div>
        );
    }

    /* =====================================================
       RESULTADO
    ===================================================== */

    const winner =
        game.winner;

    const loser =
        winner
            ? game.players.find(
                (player) =>
                    player.id !==
                    winner.id
            )
            : null;

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="triqui-page">

            <div className="triqui-container">

                {/* =================================================
                   HEADER
                ================================================= */}

                <header className="triqui-header">

                    <div>

                        <span className="triqui-brand">
                            MATHVISION
                        </span>

                        <h1>
                            TRIQUI MATEMÁTICO
                        </h1>

                    </div>

                    <div className="triqui-round">
                        RONDA{" "}
                        {game.round}
                    </div>

                </header>

                {/* =================================================
                   JUGADORES
                ================================================= */}

                <section className="triqui-players">

                    {game.players.map(
                        (player) => {

                            const isMe =
                                player.id ===
                                socket.id;

                            const playerTurn =
                                game.currentPlayerId ===
                                player.id;

                            const score =
                                getScore(
                                    player.id
                                );

                            return (

                                <div
                                    key={player.id}
                                    className={`
                                        triqui-player
                                        ${
                                            playerTurn
                                                ? "active"
                                                : ""
                                        }
                                        ${
                                            isMe
                                                ? "me"
                                                : ""
                                        }
                                    `}
                                >

                                    <div
                                        className={`
                                            triqui-symbol
                                            symbol-${
                                                player.symbol.toLowerCase()
                                            }
                                        `}
                                    >
                                        {
                                            player.symbol
                                        }
                                    </div>

                                    <div className="triqui-player-info">

                                        <strong>
                                            {
                                                player.name
                                            }

                                            {isMe && (
                                                <span className="triqui-you">
                                                    TÚ
                                                </span>
                                            )}
                                        </strong>

                                        <span>
                                            Jugador{" "}
                                            {
                                                player.symbol
                                            }
                                        </span>

                                    </div>

                                    <div className="triqui-score">

                                        <small>
                                            GANADAS
                                        </small>

                                        <strong>
                                            {score}
                                        </strong>

                                    </div>

                                </div>
                            );
                        }
                    )}

                </section>

                {/* =================================================
                   TURNO
                ================================================= */}

                <div
                    className={`
                        triqui-turn
                        ${
                            isMyTurn
                                ? "my-turn"
                                : "opponent-turn"
                        }
                    `}
                >

                    {isPlaying ? (

                        isMyTurn ? (

                            <>
                                <span>
                                    🟢
                                </span>

                                <strong>
                                    ES TU TURNO
                                </strong>

                                <small>
                                    Selecciona una casilla
                                </small>

                                <div className="triqui-timer">
                                    ⏱️ {timeRemaining}s
                                </div>
                            </>

                        ) : (

                            <>
                                <span>
                                    ⏳
                                </span>

                                <strong>
                                    TURNO DE{" "}
                                    {
                                        game.players.find(
                                            (player) =>
                                                player.id ===
                                                game.currentPlayerId
                                        )?.name ||
                                        "RIVAL"
                                    }
                                </strong>

                                <small>
                                    Espera tu turno
                                </small>
                                
                                <div className="triqui-timer">
                                    ⏱️ {timeRemaining}s
                                </div>
                            </>

                        )

                    ) : (

                        <strong>
                            PARTIDA TERMINADA
                        </strong>

                    )}

                </div>

                {/* =================================================
                   IDENTIDAD
                ================================================= */}

                {/* {myPlayer &&
                    isPlaying && (

                        <div className="triqui-my-player">

                            <div
                                className={`
                                    triqui-my-symbol
                                    symbol-${
                                        myPlayer.symbol.toLowerCase()
                                    }
                                `}
                            >
                                {
                                    myPlayer.symbol
                                }
                            </div>

                            <div>

                                <span>
                                    ESTÁS JUGANDO COMO
                                </span>

                                <strong>
                                    {
                                        myPlayer.name
                                    }{" "}
                                    (
                                    {
                                        myPlayer.symbol
                                    }
                                    )
                                </strong>

                            </div>

                            <div className="triqui-score-mini">
                                {myScore} 🏆
                            </div>

                        </div>
                    )} */}

                {/* =================================================
                   TABLERO
                ================================================= */}

                <div className="triqui-board">

                    {game.board.map(
                        (
                            cell,
                            index
                        ) => {

                            const isSelected =
                                selectedCell ===
                                index;

                            const isWinning =
                                game.winningLine?.includes(
                                    index
                                );

                            const canSelect =
                                isPlaying &&
                                isMyTurn &&
                                cell ===
                                    null;

                            return (

                                <button
                                    key={index}
                                    className={`
                                        triqui-cell

                                        ${
                                            cell
                                                ? `cell-${cell.toLowerCase()}`
                                                : ""
                                        }

                                        ${
                                            isSelected
                                                ? "selected"
                                                : ""
                                        }

                                        ${
                                            isWinning
                                                ? "winning"
                                                : ""
                                        }

                                        ${
                                            canSelect
                                                ? "available"
                                                : ""
                                        }
                                    `}
                                    disabled={
                                        !canSelect
                                    }
                                    onClick={() =>
                                        seleccionarCasilla(
                                            index
                                        )
                                    }
                                >

                                    {cell}

                                    {isWinning &&
                                        winner && (
                                            <span className="winning-crown">
                                                👑
                                            </span>
                                        )}

                                </button>
                            );
                        }
                    )}

                </div>

                {/* =================================================
                   EMOJIS
                ================================================= */}

                <div className="triqui-emoji-area">

                    {emojiPanelOpen && (

                        <div className="triqui-emoji-panel">

                            {GAME_EMOJIS.map(
                                (emoji) => (

                                    <button
                                        key={emoji}
                                        onClick={() =>
                                            sendEmoji(
                                                emoji
                                            )
                                        }
                                    >
                                        {emoji}
                                    </button>

                                )
                            )}

                        </div>
                    )}

                    <button
                        className="triqui-emoji-button"
                        onClick={() =>
                            setEmojiPanelOpen(
                                !emojiPanelOpen
                            )
                        }
                    >
                        😊
                        <span>
                            EMOJIS
                        </span>
                    </button>

                </div>

                {/* =================================================
                   EMOJI FLOTANTE
                ================================================= */}

                {floatingEmoji && (

                    <div
                        className={`
                            triqui-floating-emoji
                            ${
                                floatingEmoji.isMe
                                    ? "mine"
                                    : "theirs"
                            }
                        `}
                    >

                        <div>
                            {
                                floatingEmoji.emoji
                            }
                        </div>

                        <span>
                            {
                                floatingEmoji.isMe
                                    ? "TÚ"
                                    : floatingEmoji.playerName
                            }
                        </span>

                    </div>
                )}

                {/* =================================================
                   AVISO DE TURNO
                ================================================= */}

                {turnNotice && (

                    <div className="triqui-turn-notice">
                        {turnNotice}
                    </div>

                )}

                {/* =================================================
                   INSTRUCCIÓN
                ================================================= */}

                {isPlaying &&
                    !selectedCell && (

                        <div className="triqui-instruction">

                            {isMyTurn
                                ? "🎯 Selecciona la casilla donde quieres colocar tu ficha."
                                : "⏳ Espera a que termine el turno de tu rival."
                            }

                        </div>
                    )}

                {/* =================================================
                   ERROR
                ================================================= */}

                {error && (

                    <div className="triqui-error">
                        {error}
                    </div>

                )}

                {/* =================================================
                   BOTÓN SALIR
                ================================================= */}

                <button
                    className="triqui-back"
                    onClick={salir}
                >
                    SALIR DE LA SALA
                </button>

            </div>

            {/* =====================================================
               MODAL PREGUNTA
            ===================================================== */}

            {selectedCell !== null &&
                isMyTurn &&
                isPlaying && (

                    <div className="triqui-modal-overlay">

                        <div className="triqui-modal">

                            <div className="triqui-modal-header">

                                <div>

                                    <span>
                                        TU FICHA
                                    </span>

                                    <strong
                                        className={`
                                            symbol-${
                                                myPlayer?.symbol?.toLowerCase()
                                            }
                                        `}
                                    >
                                        {
                                            myPlayer?.symbol
                                        }
                                    </strong>

                                <div className="triqui-timer">
                                    ⏱️ {timeRemaining}s
                                </div>

                                </div>

                                <button
                                    className="triqui-modal-close"
                                    onClick={
                                        cancelarSeleccion
                                    }
                                >
                                    ×
                                </button>

                            </div>

                            <div className="triqui-modal-content">

                                <div className="triqui-modal-icon">
                                    🧠
                                </div>

                                <h2>
                                    ¡RESUELVE PARA JUGAR!
                                </h2>

                                <p>
                                    Resuelve la operación
                                    para colocar tu ficha.
                                </p>

                                <div className="triqui-selected-cell">
                                    CASILLA{" "}
                                    {selectedCell + 1}
                                </div>

                                <div className="triqui-question-operation">
                                    {
                                        game.question?.text
                                    }
                                    {" = ?"}
                                </div>

                                <div className="triqui-answer">

                                    <input
                                        autoFocus
                                        type="number"
                                        inputMode="numeric"
                                        value={answer}
                                        onChange={(e) => {

                                            setAnswer(
                                                e.target.value
                                            );

                                            setAnswerMessage(
                                                ""
                                            );

                                            setAnswerCorrect(
                                                null
                                            );
                                        }}
                                        onKeyDown={(e) => {

                                            if (
                                                e.key ===
                                                "Enter"
                                            ) {
                                                enviarRespuesta();
                                            }
                                        }}
                                        placeholder="Respuesta"
                                    />

                                    <button
                                        onClick={
                                            enviarRespuesta
                                        }
                                    >
                                        COMPROBAR
                                    </button>

                                </div>

                                {answerMessage && (

                                    <div
                                        className={
                                            answerCorrect
                                                ? "triqui-answer-correct"
                                                : "triqui-answer-wrong"
                                        }
                                    >
                                        {
                                            answerCorrect
                                                ? "✅ "
                                                : "❌ "
                                        }

                                        {
                                            answerMessage
                                        }
                                    </div>

                                )}

                            </div>

                            <div className="triqui-modal-footer">

                                <button
                                    className="triqui-cancel-button"
                                    onClick={
                                        cancelarSeleccion
                                    }
                                >
                                    CAMBIAR CASILLA
                                </button>

                            </div>

                        </div>

                    </div>
                )}

            {/* =====================================================
               MODAL FINAL
            ===================================================== */}

            {showResult &&
                game.status ===
                    "finished" && (

                    <div className="triqui-result-overlay">

                        <div className="triqui-result-modal">

                            {winner ? (

                                <>
                                    <div className="triqui-result-crown">
                                        👑
                                    </div>

                                    <div className="triqui-result-label">
                                        ¡TENEMOS GANADOR!
                                    </div>

                                    <h2>
                                        {
                                            winner.name
                                        }
                                    </h2>

                                    <div className="triqui-versus">

                                        <div className="result-player winner">

                                            <div className="result-crown">
                                                👑
                                            </div>

                                            <div
                                                className={`
                                                    result-symbol
                                                    symbol-${
                                                        winner.symbol.toLowerCase()
                                                    }
                                                `}
                                            >
                                                {
                                                    winner.symbol
                                                }
                                            </div>

                                            <strong>
                                                {
                                                    winner.name
                                                }
                                            </strong>

                                            <span>
                                                GANADOR
                                            </span>

                                            <b>
                                                {
                                                    getScore(
                                                        winner.id
                                                    )
                                                }
                                                🏆
                                            </b>

                                        </div>

                                        <div className="result-vs">
                                            VS
                                        </div>

                                        {loser && (

                                            <div className="result-player loser">

                                                <div className="result-symbol loser-symbol">
                                                    {
                                                        loser.symbol
                                                    }
                                                </div>

                                                <strong>
                                                    {
                                                        loser.name
                                                    }
                                                </strong>

                                                <span>
                                                    PERDEDOR
                                                </span>

                                                <b>
                                                    {
                                                        getScore(
                                                            loser.id
                                                        )
                                                    }
                                                    🏆
                                                </b>

                                            </div>
                                        )}

                                    </div>

                                </>

                            ) : (

                                <>

                                    <div className="triqui-result-crown">
                                        🤝
                                    </div>

                                    <div className="triqui-result-label">
                                        PARTIDA EMPATADA
                                    </div>

                                    <h2>
                                        ¡EMPATE!
                                    </h2>

                                    <div className="triqui-versus">

                                        {game.players.map(
                                            (player) => (

                                                <div
                                                    className="result-player"
                                                    key={
                                                        player.id
                                                    }
                                                >

                                                    <div
                                                        className={`
                                                            result-symbol
                                                            symbol-${
                                                                player.symbol.toLowerCase()
                                                            }
                                                        `}
                                                    >
                                                        {
                                                            player.symbol
                                                        }
                                                    </div>

                                                    <strong>
                                                        {
                                                            player.name
                                                        }
                                                    </strong>

                                                    <b>
                                                        {
                                                            getScore(
                                                                player.id
                                                            )
                                                        }
                                                        🏆
                                                    </b>

                                                </div>
                                            )
                                        )}

                                    </div>

                                </>
                            )}

                            {/* SCORE */}

                            <div className="triqui-final-score">

                                <div>

                                    <span>
                                        {
                                            game.players[0]?.name
                                        }
                                    </span>

                                    <strong>
                                        {
                                            getScore(
                                                game.players[0]?.id
                                            )
                                        }
                                    </strong>

                                </div>

                                <div className="final-score-separator">
                                    -
                                </div>

                                <div>

                                    <span>
                                        {
                                            game.players[1]?.name
                                        }
                                    </span>

                                    <strong>
                                        {
                                            getScore(
                                                game.players[1]?.id
                                            )
                                        }
                                    </strong>

                                </div>

                            </div>

                            <div className="triqui-result-actions">

                                <button
                                    className="triqui-rematch-button"
                                    onClick={
                                        jugarRevancha
                                    }
                                >
                                    🔄 JUGAR REVANCHA
                                </button>

                                <button
                                    className="triqui-exit-button"
                                    onClick={
                                        salir
                                    }
                                >
                                    SALIR DE LA SALA
                                </button>

                            </div>

                        </div>

                    </div>
                )}

        </div>
    );
}

export default TriquiGame;