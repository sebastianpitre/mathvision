import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import { socket } from "../../services/socket";

// ⚠️ Ajusta la ruta a donde tengas tu archivo de sonidos
import {
    playSound,
    createBackgroundMusic,
} from "./GameAudio";

import "./triqui.css";

/* =========================================================
   EMOJIS
========================================================= */

export const GAME_EMOJIS = [
    "🫏", "😂", "🤣", "⌛", "😎", "😏", "🤔", "😱", "😡", "😭",
    "😈", "🥳", "🔥", "👏", "💪", "👍", "👎", "❤️", "🎉", "🏆",
    "⚡", "🧠", "👀", "🤝", "😮", "🙌", "😅", "😜", "💯", "🚀",
];

/* =========================================================
   TECLADO NUMÉRICO
========================================================= */

const KEYPAD_KEYS = [
    "7", "8", "9",
    "4", "5", "6",
    "1", "2", "3",
    "-", "0", "del",
];

const MAX_DIGITS = 6;

/* =========================================================
   SONIDOS DEL JUEGO
   Evento del juego  ->  nombre en tu archivo de sonidos.
   Cambia aquí qué sonido suena en cada momento.
   "myTurn" y "tick" no existen aún en tu archivo: si los
   agregas (sounds.turn / sounds.tick) empiezan a sonar;
   si no, simplemente no suenan (playSound devuelve null).
========================================================= */

const GAME_SOUNDS = {
    correct: "correct",
    wrong: "incorrect",
    timeout: "incorrect",
    win: "victory",
    lose: "gameOver",
    draw: "retire",
    emoji: "lifeline",
    leave: "retire",
    disconnected: "retire",
    myTurn: "turn",
    tick: "tick",
};

const MUSIC_VOLUME = 0.2;
const SOUND_STORAGE_KEY = "triqui-sound";

const readSoundPreference = () => {
    try {
        return localStorage.getItem(SOUND_STORAGE_KEY) !== "off";
    } catch {
        return true;
    }
};

function TriquiGame() {

    const navigate = useNavigate();

    const [game, setGame] = useState(null);
    const [error, setError] = useState("");

    const [selectedCell, setSelectedCell] = useState(null);
    const selectedCellRef = useRef(null);

    const [answer, setAnswer] = useState("");
    const [answerMessage, setAnswerMessage] = useState("");
    const [answerCorrect, setAnswerCorrect] = useState(null);

    // Evita enviar la respuesta dos veces mientras el servidor contesta
    const [sendingAnswer, setSendingAnswer] = useState(false);
    const sendingAnswerRef = useRef(false);

    const [emojiPanelOpen, setEmojiPanelOpen] = useState(false);
    const [floatingEmoji, setFloatingEmoji] = useState(null);
    const [turnNotice, setTurnNotice] = useState("");
    const [showResult, setShowResult] = useState(false);
    const [sendingEmoji, setSendingEmoji] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(20);

    const answerInputRef = useRef(null);
    const modalOpenRef = useRef(false);

    /* =====================================================
       SONIDO
    ===================================================== */

    const [soundOn, setSoundOn] = useState(readSoundPreference);
    const soundOnRef = useRef(soundOn);
    const musicRef = useRef(null);

    const sfx = useCallback((event, volume = 0.8) => {

        if (!soundOnRef.current) return;

        const name = GAME_SOUNDS[event];

        if (name) {
            playSound(name, volume);
        }
    }, []);

    // Música de fondo: el navegador no deja reproducir audio
    // hasta que el usuario toca la pantalla, así que arranca
    // en la primera interacción.
    useEffect(() => {

        const music = createBackgroundMusic();
        music.volume = MUSIC_VOLUME;
        musicRef.current = music;

        const start = () => {
            if (soundOnRef.current && music.paused) {
                music.play().catch(() => { });
            }
        };

        window.addEventListener("pointerdown", start);
        window.addEventListener("keydown", start);

        start();

        return () => {
            window.removeEventListener("pointerdown", start);
            window.removeEventListener("keydown", start);

            music.pause();
            music.currentTime = 0;
            musicRef.current = null;
        };
    }, []);

    const toggleSound = () => {

        const next = !soundOnRef.current;

        soundOnRef.current = next;
        setSoundOn(next);

        try {
            localStorage.setItem(SOUND_STORAGE_KEY, next ? "on" : "off");
        } catch {
            /* sin almacenamiento: no pasa nada */
        }

        const music = musicRef.current;

        if (!music) return;

        if (next) {
            music.play().catch(() => { });
        } else {
            music.pause();
        }
    };

    /* =====================================================
       TIMERS CONTROLADOS
    ===================================================== */

    const timersRef = useRef(new Set());
    const noticeTimerRef = useRef(null);
    const messageTimerRef = useRef(null);
    const emojiTimerRef = useRef(null);

    const schedule = useCallback((fn, ms) => {

        const id = setTimeout(() => {
            timersRef.current.delete(id);
            fn();
        }, ms);

        timersRef.current.add(id);

        return id;
    }, []);

    const cancel = useCallback((id) => {

        if (id) {
            clearTimeout(id);
            timersRef.current.delete(id);
        }
    }, []);

    const showTurnNotice = useCallback((message, ms = 3000) => {

        cancel(noticeTimerRef.current);

        setTurnNotice(message);

        noticeTimerRef.current = schedule(() => {
            setTurnNotice("");
            noticeTimerRef.current = null;
        }, ms);

    }, [cancel, schedule]);

    /* =====================================================
       FOCO DEL INPUT
    ===================================================== */

    const focusInput = useCallback(() => {

        const input = answerInputRef.current;

        if (!input || !modalOpenRef.current) return;

        if (document.activeElement !== input) {
            input.focus({ preventScroll: true });
        }

        // Cursor siempre al final
        const end = input.value.length;

        try {
            input.setSelectionRange(end, end);
        } catch {
            /* algunos navegadores no lo permiten */
        }
    }, []);

    /* =====================================================
       RESETEAR SELECCIÓN (cierra el modal de pregunta)
    ===================================================== */

    const resetSelection = useCallback(() => {

        setSelectedCell(null);
        selectedCellRef.current = null;

        setAnswer("");
        setAnswerMessage("");
        setAnswerCorrect(null);

        setSendingAnswer(false);
        sendingAnswerRef.current = false;

        cancel(messageTimerRef.current);
        messageTimerRef.current = null;

    }, [cancel]);

    /* =====================================================
       SOCKET
    ===================================================== */

    useEffect(() => {

        console.log("🎮 TRIQUI: componente iniciado");

        const handleGameStarted = ({ game }) => {

            console.log("🟢 NUEVA PARTIDA:", game);

            setGame(game);
            resetSelection();
            setTurnNotice("");
            setShowResult(false);
            setError("");
        };

        const handleGameState = ({ game }) => {

            if (!game) {
                setGame(null);
                resetSelection();
                return;
            }

            console.log("🔄 ESTADO:", game);

            setGame(game);
            setError("");
        };

        const handleGameFinished = ({ game }) => {

            console.log("🏆 PARTIDA TERMINADA", game);

            setGame(game);
            resetSelection();
            setEmojiPanelOpen(false);
            setShowResult(true);

            const winner = game?.winner;

            if (!winner) {
                sfx("draw");
            } else if (winner.id === socket.id) {
                sfx("win", 1);
            } else {
                sfx("lose");
            }
        };

        const handleGameError = ({ message }) => {
            console.error("🔴 GAME ERROR:", message);
            setError(message);
        };

        const handlePlayError = ({ message }) => {
            setError(message);
        };

        const handleAnswerResult = ({ success, correct, message }) => {

            console.log("🧮 RESPUESTA:", { success, correct, message });

            setSendingAnswer(false);
            sendingAnswerRef.current = false;

            if (!success) {
                setAnswerCorrect(false);
                setAnswerMessage(message);
                return;
            }

            /*
             * RESPUESTA CORRECTA
             */

            if (correct) {

                sfx("correct");

                setAnswerCorrect(true);
                setAnswerMessage(message);

                const cell = selectedCellRef.current;

                if (cell === null) return;

                // Bloquea más envíos durante la animación de "correcto"
                sendingAnswerRef.current = true;
                setSendingAnswer(true);

                schedule(() => {

                    // Si se perdió el turno en estos 350 ms,
                    // no enviamos una jugada inválida.
                    if (selectedCellRef.current !== cell) return;

                    socket.emit("game:play", {
                        cellIndex: cell,
                    });

                    resetSelection();

                }, 350);

                return;
            }

            /*
             * RESPUESTA INCORRECTA
             * El servidor ya cambió el turno.
             */

            sfx("wrong");

            resetSelection();

            setAnswerCorrect(false);
            setAnswerMessage(message);

            showTurnNotice(message, 2200);

            messageTimerRef.current = schedule(() => {
                setAnswerMessage("");
                setAnswerCorrect(null);
                messageTimerRef.current = null;
            }, 2200);
        };

        const handleTurnLost = ({ failedPlayerId, failedPlayerName }) => {

            const isMe = failedPlayerId === socket.id;

            if (isMe) {
                resetSelection();
            }

            showTurnNotice(
                isMe
                    ? `❌ Te equivocaste, ${failedPlayerName}. Pierdes el turno.`
                    : `❌ ${failedPlayerName} se equivocó. ¡Ahora es tu turno!`
            );
        };

        const handleTurnTimeout = ({ failedPlayerId, failedPlayerName }) => {

            const isMe = failedPlayerId === socket.id;

            if (isMe) {
                resetSelection();
                sfx("timeout");
            }

            showTurnNotice(
                isMe
                    ? `⏰ ${failedPlayerName}, se acabó el tiempo. ¡Pierdes el turno!`
                    : `⏰ ${failedPlayerName} se quedó sin tiempo. ¡Ahora es tu turno!`
            );
        };

        const handleEmoji = ({ emoji, playerId, playerName }) => {

            const isMe = playerId === socket.id;

            cancel(emojiTimerRef.current);

            setFloatingEmoji({
                id: Date.now(), // fuerza reiniciar la animación
                emoji,
                playerId,
                playerName,
                isMe,
            });

            if (!isMe) {
                sfx("emoji", 0.5);
            }

            emojiTimerRef.current = schedule(() => {
                setFloatingEmoji(null);
                emojiTimerRef.current = null;
            }, 2200);
        };

        const handlePlayerDisconnected = ({ message }) => {
            setError(message);
            setShowResult(false);
            resetSelection();
            sfx("disconnected");
        };

        const requestState = () => {
            console.log("📡 Solicitando estado...");
            socket.emit("game:state");
        };

        socket.on("game:started", handleGameStarted);
        socket.on("game:state", handleGameState);
        socket.on("game:finished", handleGameFinished);
        socket.on("game:error", handleGameError);
        socket.on("game:playError", handlePlayError);
        socket.on("game:answerResult", handleAnswerResult);
        socket.on("game:turnLost", handleTurnLost);
        socket.on("game:turnTimeout", handleTurnTimeout);
        socket.on("game:emoji", handleEmoji);
        socket.on("game:playerDisconnected", handlePlayerDisconnected);

        // Si se reconecta, pedimos el estado de nuevo
        socket.on("connect", requestState);

        if (!socket.connected) {
            socket.connect();
        } else {
            requestState();
        }

        const timers = timersRef.current;

        return () => {

            socket.off("game:started", handleGameStarted);
            socket.off("game:state", handleGameState);
            socket.off("game:finished", handleGameFinished);
            socket.off("game:error", handleGameError);
            socket.off("game:playError", handlePlayError);
            socket.off("game:answerResult", handleAnswerResult);
            socket.off("game:turnLost", handleTurnLost);
            socket.off("game:turnTimeout", handleTurnTimeout);
            socket.off("game:emoji", handleEmoji);
            socket.off("game:playerDisconnected", handlePlayerDisconnected);
            socket.off("connect", requestState);

            timers.forEach(clearTimeout);
            timers.clear();
        };

    }, [cancel, resetSelection, schedule, showTurnNotice, sfx]);

    /* =====================================================
       TEMPORIZADOR
    ===================================================== */

    useEffect(() => {

        if (
            !game ||
            game.status !== "playing" ||
            !game.turnStartedAt
        ) {
            setTimeRemaining(game?.turnTime || 20);
            return;
        }

        const turnTime = game.turnTime || 20;

        const updateTimer = () => {

            const elapsed = Math.floor(
                (Date.now() - game.turnStartedAt) / 1000
            );

            setTimeRemaining(Math.max(0, turnTime - elapsed));
        };

        updateTimer();

        const interval = setInterval(updateTimer, 250);

        return () => clearInterval(interval);

    }, [
        game?.turnStartedAt,
        game?.status,
        game?.turnTime,
    ]);

    /* =====================================================
       DATOS DEL JUGADOR
    ===================================================== */

    const myPlayer = game?.players?.find(
        (player) => player.id === socket.id
    );

    const isMyTurn = Boolean(
        game &&
        myPlayer &&
        game.currentPlayerId === myPlayer.id
    );

    const isPlaying = game?.status === "playing";

    const timeUp = isPlaying && isMyTurn && timeRemaining <= 0;

    const showQuestionModal =
        selectedCell !== null &&
        isMyTurn &&
        isPlaying &&
        !timeUp;

    modalOpenRef.current = showQuestionModal;

    const turnKey = game?.turnStartedAt;

    /* =====================================================
       SONIDOS DE TURNO Y CUENTA REGRESIVA
    ===================================================== */

    const prevTurnKeyRef = useRef(null);

    useEffect(() => {

        if (!turnKey) return;

        const changed =
            prevTurnKeyRef.current !== null &&
            prevTurnKeyRef.current !== turnKey;

        if (changed && isPlaying && isMyTurn) {
            sfx("myTurn", 0.6);
        }

        prevTurnKeyRef.current = turnKey;

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turnKey]);

    useEffect(() => {

        if (!isPlaying || !isMyTurn) return;

        if (timeRemaining > 0 && timeRemaining <= 5) {
            sfx("tick", 0.5);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeRemaining]);

    /* =====================================================
       SEGURIDAD DEL MODAL
    ===================================================== */

    useEffect(() => {

        if (selectedCellRef.current === null) return;

        if (!isPlaying || !isMyTurn) {
            resetSelection();
        }

    }, [isPlaying, isMyTurn, turnKey, game?.round, resetSelection]);

    useEffect(() => {

        const cell = selectedCellRef.current;

        if (cell === null || !game?.board) return;

        if (game.board[cell] !== null) {
            resetSelection();
        }

    }, [game?.board, resetSelection]);

    // Tiempo agotado en pantalla: cerramos el modal de una vez
    useEffect(() => {

        if (timeUp && selectedCellRef.current !== null) {
            resetSelection();
        }

    }, [timeUp, resetSelection]);

    /* =====================================================
       SCORE
    ===================================================== */

    const getScore = (playerId) => game?.score?.[playerId] || 0;

    /* =====================================================
       SELECCIONAR CASILLA
    ===================================================== */

    const seleccionarCasilla = (index) => {

        setError("");

        if (!game || !isPlaying) return;

        if (!isMyTurn) {
            setError("⏳ Espera tu turno.");
            return;
        }

        if (timeUp) return;

        if (game.board[index] !== null) return;

        cancel(messageTimerRef.current);
        messageTimerRef.current = null;

        setSelectedCell(index);
        selectedCellRef.current = index;
        setAnswer("");
        setAnswerMessage("");
        setAnswerCorrect(null);
        setEmojiPanelOpen(false);
    };

    /* =====================================================
       RESPONDER
    ===================================================== */

    const enviarRespuesta = () => {

        if (sendingAnswerRef.current) return;

        if (selectedCellRef.current === null) return;

        if (!answer.trim() || answer === "-") {
            setAnswerMessage("Escribe una respuesta.");
            setAnswerCorrect(false);
            return;
        }

        if (!isMyTurn || !isPlaying) {
            setAnswerMessage("No es tu turno.");
            setAnswerCorrect(false);
            return;
        }

        if (timeUp) return;

        sendingAnswerRef.current = true;
        setSendingAnswer(true);

        socket.emit("game:answer", {
            answer: Number(answer),
        });

        // Seguro: si el servidor nunca responde, desbloquea a los 5 s
        schedule(() => {
            if (sendingAnswerRef.current) {
                sendingAnswerRef.current = false;
                setSendingAnswer(false);
            }
        }, 5000);
    };

    /* =====================================================
       TECLADO NUMÉRICO
    ===================================================== */

    const limpiarMensaje = () => {
        setAnswerMessage("");
        setAnswerCorrect(null);
    };

    const pulsarTecla = (key) => {

        if (sendingAnswerRef.current) return;

        limpiarMensaje();

        if (key === "del") {
            setAnswer((prev) => prev.slice(0, -1));
            return;
        }

        if (key === "clear") {
            setAnswer("");
            return;
        }

        if (key === "-") {
            setAnswer((prev) =>
                prev.startsWith("-")
                    ? prev.slice(1)
                    : `-${prev}`
            );
            return;
        }

        // Dígito
        setAnswer((prev) => {

            const digits = prev.replace("-", "");

            if (digits.length >= MAX_DIGITS) return prev;

            // Evita ceros a la izquierda: "0" -> "5"
            if (digits === "0") {
                return prev.startsWith("-") ? `-${key}` : key;
            }

            return prev + key;
        });
    };

    const manejarInput = (e) => {

        if (sendingAnswerRef.current) return;

        const value = e.target.value;

        // Solo números enteros, con signo negativo opcional
        if (/^-?\d*$/.test(value) && value.replace("-", "").length <= MAX_DIGITS) {
            setAnswer(value);
            limpiarMensaje();
        }
    };

    // Los botones del teclado no le quitan el foco al input
    const mantenerFoco = (e) => e.preventDefault();

    /* =====================================================
       CANCELAR CASILLA
    ===================================================== */

    const cancelarSeleccion = () => {

        if (sendingAnswerRef.current) return;

        resetSelection();
    };

    /* =====================================================
       FOCO PERMANENTE + TECLADO FÍSICO
       - Al abrir el modal, al cambiar la respuesta o al
         aparecer un mensaje, el input vuelve a tener foco.
       - Si algo le quita el foco, se lo devolvemos.
       - Si por alguna razón no tiene foco, las teclas
         físicas igual funcionan (captura global).
    ===================================================== */

    const latestActionsRef = useRef({});

    latestActionsRef.current = {
        pulsarTecla,
        enviarRespuesta,
        cancelarSeleccion,
    };

    useEffect(() => {

        if (!showQuestionModal) return;

        const id = requestAnimationFrame(focusInput);

        return () => cancelAnimationFrame(id);

    }, [showQuestionModal, answer, answerMessage, sendingAnswer, focusInput]);

    useEffect(() => {

        if (!showQuestionModal) return;

        const onKey = (e) => {

            const actions = latestActionsRef.current;

            if (e.key === "Escape") {
                actions.cancelarSeleccion();
                return;
            }

            // Si el input tiene el foco, él mismo maneja la tecla
            if (e.target === answerInputRef.current) return;

            if (/^\d$/.test(e.key)) {
                e.preventDefault();
                actions.pulsarTecla(e.key);
            } else if (e.key === "Backspace") {
                e.preventDefault();
                actions.pulsarTecla("del");
            } else if (e.key === "-") {
                e.preventDefault();
                actions.pulsarTecla("-");
            } else if (e.key === "Enter") {
                e.preventDefault();
                actions.enviarRespuesta();
            }

            focusInput();
        };

        const onVisible = () => {
            if (!document.hidden) focusInput();
        };

        window.addEventListener("keydown", onKey);
        window.addEventListener("focus", focusInput);
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("focus", focusInput);
            document.removeEventListener("visibilitychange", onVisible);
        };

    }, [showQuestionModal, focusInput]);

    /* =====================================================
       BLOQUEAR RECARGA
       - F5, Ctrl+R, Ctrl+Shift+R, Cmd+R: bloqueados siempre
         en esta pantalla.
       - Si igual intentan recargar o cerrar (botón del
         navegador), durante la partida sale la ventana
         de confirmación del navegador.
       - En celular se quita el "jalar hacia abajo para
         recargar".
    ===================================================== */

    useEffect(() => {

        const bloquearTeclasRecarga = (e) => {

            const key = e.key?.toLowerCase();

            const esRecarga =
                key === "f5" ||
                ((e.ctrlKey || e.metaKey) && key === "r");

            if (esRecarga) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        // capture: true -> se ejecuta antes que cualquier otro listener
        window.addEventListener("keydown", bloquearTeclasRecarga, true);

        // Sin "pull to refresh" en celular
        const html = document.documentElement;
        const body = document.body;

        const prevHtml = html.style.overscrollBehaviorY;
        const prevBody = body.style.overscrollBehaviorY;

        html.style.overscrollBehaviorY = "none";
        body.style.overscrollBehaviorY = "none";

        return () => {
            window.removeEventListener("keydown", bloquearTeclasRecarga, true);

            html.style.overscrollBehaviorY = prevHtml;
            body.style.overscrollBehaviorY = prevBody;
        };

    }, []);

    useEffect(() => {

        // Solo pide confirmación mientras se está jugando
        if (!isPlaying) return;

        const confirmarSalida = (e) => {
            e.preventDefault();
            e.returnValue = ""; // necesario para Chrome
            return "";
        };

        window.addEventListener("beforeunload", confirmarSalida);

        return () => {
            window.removeEventListener("beforeunload", confirmarSalida);
        };

    }, [isPlaying]);

    // Cualquier toque dentro del modal (fuera del input)
    // no le quita el foco al input
    const mantenerFocoEnModal = (e) => {
        if (e.target !== answerInputRef.current) {
            e.preventDefault();
        }
    };

    /* =====================================================
       EMOJI
    ===================================================== */

    const sendEmoji = (emoji) => {

        if (sendingEmoji) return;

        setSendingEmoji(true);

        socket.emit("game:emoji", { emoji });

        setEmojiPanelOpen(false);

        schedule(() => setSendingEmoji(false), 250);
    };

    /* =====================================================
       REVANCHA
    ===================================================== */

    const jugarRevancha = () => {
        setShowResult(false);
        resetSelection();
        setError("");
        socket.emit("game:rematch");
    };

    /* =====================================================
       VOLVER
    ===================================================== */

    const salir = () => {
        sfx("leave");
        socket.emit("room:leave");
        resetSelection();
        setGame(null);
        navigate("/world");
    };

    // Evita el menú de "copiar / seleccionar" al mantener presionado
    const bloquearMenu = (e) => {
        if (e.target.tagName !== "INPUT") {
            e.preventDefault();
        }
    };

    /* =====================================================
       BOTÓN DE SONIDO
    ===================================================== */

    const soundButton = (
        <button
            type="button"
            className="triqui-sound-toggle"
            onClick={toggleSound}
            aria-label={soundOn ? "Silenciar" : "Activar sonido"}
        >
            {soundOn ? "🔊" : "🔇"}
        </button>
    );

    /* =====================================================
       LOADING
    ===================================================== */

    if (!game) {

        return (
            <div className="triqui-page notranslate" translate="no" onContextMenu={bloquearMenu}>

                <div className="triqui-loading">

                    <div className="triqui-loading-logo">
                        MATHVISION
                    </div>

                    <h1>TRIQUI MATEMÁTICO</h1>

                    <p>Esperando partida...</p>

                    {error && (
                        <div className="triqui-error">{error}</div>
                    )}

                </div>

            </div>
        );
    }

    /* =====================================================
       RESULTADO
    ===================================================== */

    const players = game.players || [];

    const winner = game.winner;

    const loser = winner
        ? players.find((player) => player.id !== winner.id)
        : null;

    const currentPlayerName =
        players.find((player) => player.id === game.currentPlayerId)?.name ||
        "RIVAL";

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="triqui-page notranslate" translate="no" onContextMenu={bloquearMenu}>

            <div className="triqui-container">

                {/* ================= HEADER ================= */}

                <header className="triqui-header">

                    <div>
                        <span className="triqui-brand">MATHVISION</span>
                        <h1>TRIQUI MATEMÁTICO</h1>
                    </div>

                    <div className="triqui-header-actions">

                        {soundButton}

                        <div className="triqui-round">
                            {`RONDA ${game.round}`}
                        </div>

                    </div>

                </header>

                {/* ================= JUGADORES ================= */}

                <section className="triqui-players">

                    {players.map((player) => {

                        const isMe = player.id === socket.id;
                        const playerTurn = game.currentPlayerId === player.id;
                        const score = getScore(player.id);

                        return (
                            <div
                                key={player.id}
                                className={`triqui-player ${playerTurn ? "active" : ""} ${isMe ? "me" : ""}`}
                            >

                                <div className={`triqui-symbol symbol-${player.symbol?.toLowerCase()}`}>
                                    {player.symbol}
                                </div>

                                <div className="triqui-player-info">

                                    <strong>
                                        {player.name ?? ""}
                                        {isMe && (
                                            <span className="triqui-you">TÚ</span>
                                        )}
                                    </strong>

                                    <span>{`Jugador ${player.symbol ?? ""}`}</span>

                                </div>

                                <div className="triqui-score">
                                    <small>GANADAS</small>
                                    <strong>{score}</strong>
                                </div>

                            </div>
                        );
                    })}

                </section>

                {/* ================= TURNO ================= */}

                <div className={`triqui-turn ${isMyTurn ? "my-turn" : "opponent-turn"}`}>

                    {isPlaying ? (

                        isMyTurn ? (
                            <>
                                <span>🟢</span>
                                <strong>ES TU TURNO</strong>
                                <small>Selecciona una casilla</small>
                                <div className={`triqui-timer ${timeRemaining <= 5 ? "danger" : ""}`}>
                                    {`⏱️ ${timeRemaining}s`}
                                </div>
                            </>
                        ) : (
                            <>
                                <span>⏳</span>
                                <strong>{`TURNO DE ${currentPlayerName}`}</strong>
                                <small>Espera tu turno</small>
                                <div className="triqui-timer">{`⏱️ ${timeRemaining}s`}</div>
                            </>
                        )

                    ) : (
                        <strong>PARTIDA TERMINADA</strong>
                    )}

                </div>

                {/* ================= TABLERO ================= */}

                <div className="triqui-board">

                    {(game.board || []).map((cell, index) => {

                        const isSelected = selectedCell === index;
                        const isWinning = game.winningLine?.includes(index);
                        const canSelect = isPlaying && isMyTurn && !timeUp && cell === null;

                        return (
                            <button
                                key={index}
                                className={`triqui-cell ${cell ? `cell-${cell.toLowerCase()}` : ""} ${isSelected ? "selected" : ""} ${isWinning ? "winning" : ""} ${canSelect ? "available" : ""}`}
                                disabled={!canSelect}
                                onClick={() => seleccionarCasilla(index)}
                            >
                                <span className="triqui-cell-mark">
                                    {cell ?? ""}
                                </span>

                                {isWinning && winner && (
                                    <span className="winning-crown">👑</span>
                                )}
                            </button>
                        );
                    })}

                </div>

                {/* ================= EMOJIS ================= */}

                <div className="triqui-emoji-area">

                    {emojiPanelOpen && (
                        <div className="triqui-emoji-panel">
                            {GAME_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    disabled={sendingEmoji}
                                    onClick={() => sendEmoji(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        className="triqui-emoji-button"
                        onClick={() => setEmojiPanelOpen((open) => !open)}
                    >
                        😊
                        <span>EMOJIS</span>
                    </button>

                </div>

                {/* ================= EMOJI FLOTANTE ================= */}

                {floatingEmoji && (
                    <div
                        key={floatingEmoji.id}
                        className={`triqui-floating-emoji ${floatingEmoji.isMe ? "mine" : "theirs"}`}
                    >
                        <div>{floatingEmoji.emoji}</div>
                        <span>
                            {floatingEmoji.isMe ? "TÚ" : floatingEmoji.playerName}
                        </span>
                    </div>
                )}

                {/* ================= AVISO DE TURNO ================= */}

                {turnNotice && (
                    <div className="triqui-turn-notice">{turnNotice}</div>
                )}

                {/* ================= INSTRUCCIÓN ================= */}

                {isPlaying && selectedCell === null && (
                    <div className="triqui-instruction">
                        {isMyTurn
                            ? "🎯 Selecciona la casilla donde quieres colocar tu ficha."
                            : "⏳ Espera a que termine el turno de tu rival."}
                    </div>
                )}

                {/* ================= ERROR ================= */}

                {error && (
                    <div className="triqui-error">{error}</div>
                )}

                {/* ================= SALIR ================= */}

                <button className="triqui-back" onClick={salir}>
                    SALIR DE LA SALA
                </button>

            </div>

            {/* =====================================================
               MODAL PREGUNTA + TECLADO LATERAL
            ===================================================== */}

            {showQuestionModal && (

                <div
                    className="triqui-modal-overlay"
                    onMouseDown={mantenerFocoEnModal}
                    onClick={focusInput}
                >

                    <div className="triqui-modal-layout">

                        {/* ---------- MODAL ---------- */}

                        <div className="triqui-modal">

                            <div className="triqui-modal-header">

                                <div>
                                    <span>TU FICHA</span>

                                    <strong className={`symbol-${myPlayer?.symbol?.toLowerCase()}`}>
                                        {myPlayer?.symbol}
                                    </strong>

                                    <div className={`triqui-timer ${timeRemaining <= 5 ? "danger" : ""}`}>
                                        {`⏱️ ${timeRemaining}s`}
                                    </div>
                                </div>

                                <button
                                    className="triqui-modal-close"
                                    onClick={cancelarSeleccion}
                                    disabled={sendingAnswer}
                                >
                                    ×
                                </button>

                            </div>

                            <div className="triqui-modal-content">

                                <div className="triqui-modal-icon">🧠</div>

                                <h2>¡RESUELVE PARA JUGAR!</h2>

                                <p>Resuelve la operación para colocar tu ficha.</p>

                                <div className="triqui-selected-cell">
                                    {`CASILLA ${selectedCell + 1}`}
                                </div>

                                <div className="triqui-question-operation">
                                    {`${game.question?.text ?? "..."} = ?`}
                                </div>

                                <div className="triqui-answer">

                                    <input
                                        ref={answerInputRef}
                                        autoFocus
                                        type="text"
                                        inputMode="none"
                                        autoComplete="off"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        value={answer}
                                        readOnly={sendingAnswer}
                                        onChange={manejarInput}
                                        onBlur={() => {
                                            // Si pierde el foco, se lo devolvemos
                                            requestAnimationFrame(focusInput);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                enviarRespuesta();
                                            }
                                        }}
                                        placeholder="Respuesta"
                                    />

                                </div>

                                {answerMessage && (
                                    <div
                                        className={
                                            answerCorrect
                                                ? "triqui-answer-correct"
                                                : "triqui-answer-wrong"
                                        }
                                    >
                                        {`${answerCorrect ? "✅" : "❌"} ${answerMessage}`}
                                    </div>
                                )}

                            </div>

                            <div className="triqui-modal-footer">
                                <button
                                    className="triqui-cancel-button"
                                    onClick={cancelarSeleccion}
                                    disabled={sendingAnswer}
                                >
                                    CAMBIAR CASILLA
                                </button>
                            </div>

                        </div>

                        {/* ---------- TECLADO NUMÉRICO ---------- */}

                        <aside className="triqui-keypad">

                            <div className="triqui-keypad-grid">

                                {KEYPAD_KEYS.map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        tabIndex={-1}
                                        disabled={sendingAnswer}
                                        className={`triqui-key ${key === "del" ? "key-del" : ""} ${key === "-" ? "key-sign" : ""}`}
                                        onMouseDown={mantenerFoco}
                                        onClick={() => pulsarTecla(key)}
                                    >
                                        {key === "del" ? "⌫" : key === "-" ? "±" : key}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    tabIndex={-1}
                                    disabled={sendingAnswer}
                                    className="triqui-key key-clear"
                                    onMouseDown={mantenerFoco}
                                    onClick={() => pulsarTecla("clear")}
                                >
                                    C
                                </button>

                                <button
                                    type="button"
                                    tabIndex={-1}
                                    disabled={sendingAnswer}
                                    className="triqui-key key-submit"
                                    onMouseDown={mantenerFoco}
                                    onClick={enviarRespuesta}
                                >
                                    {sendingAnswer ? "..." : "✓ COMPROBAR"}
                                </button>

                            </div>

                        </aside>

                    </div>

                </div>
            )}

            {/* =====================================================
               MODAL FINAL
            ===================================================== */}

            {showResult && game.status === "finished" && (

                <div className="triqui-result-overlay">

                    <div className="triqui-result-modal">

                        {winner ? (
                            <>
                                <div className="triqui-result-crown">👑</div>

                                <div className="triqui-result-label">
                                    ¡TENEMOS GANADOR!
                                </div>

                                <h2>{winner.name}</h2>

                                <div className="triqui-versus">

                                    <div className="result-player winner">

                                        <div className="result-crown">👑</div>

                                        <div className={`result-symbol symbol-${winner.symbol?.toLowerCase()}`}>
                                            {winner.symbol}
                                        </div>

                                        <strong>{winner.name}</strong>
                                        <span>GANADOR</span>
                                        <b>{`${getScore(winner.id)} 🏆`}</b>

                                    </div>

                                    <div className="result-vs">VS</div>

                                    {loser && (
                                        <div className="result-player loser">

                                            <div className="result-symbol loser-symbol">
                                                {loser.symbol}
                                            </div>

                                            <strong>{loser.name}</strong>
                                            <span>PERDEDOR</span>
                                            <b>{`${getScore(loser.id)} 🏆`}</b>

                                        </div>
                                    )}

                                </div>
                            </>
                        ) : (
                            <>
                                <div className="triqui-result-crown">🤝</div>

                                <div className="triqui-result-label">
                                    PARTIDA EMPATADA
                                </div>

                                <h2>¡EMPATE!</h2>

                                <div className="triqui-versus">
                                    {players.map((player) => (
                                        <div className="result-player" key={player.id}>

                                            <div className={`result-symbol symbol-${player.symbol?.toLowerCase()}`}>
                                                {player.symbol}
                                            </div>

                                            <strong>{player.name}</strong>
                                            <b>{`${getScore(player.id)} 🏆`}</b>

                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* SCORE */}

                        <div className="triqui-final-score">

                            <div>
                                <span>{players[0]?.name}</span>
                                <strong>{getScore(players[0]?.id)}</strong>
                            </div>

                            <div className="final-score-separator">-</div>

                            <div>
                                <span>{players[1]?.name}</span>
                                <strong>{getScore(players[1]?.id)}</strong>
                            </div>

                        </div>

                        <div className="triqui-result-actions">

                            <button
                                className="triqui-rematch-button"
                                onClick={jugarRevancha}
                            >
                                🔄 JUGAR REVANCHA
                            </button>

                            <button
                                className="triqui-exit-button"
                                onClick={salir}
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