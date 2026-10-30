import { useEffect, useRef, useState } from "react";
import { playSound } from "./components/GameAudio";

import {
    motion,
    AnimatePresence
} from "framer-motion";

import {
    FaArrowLeft,
    FaHeart,
    FaBolt,
    FaTrophy,
    FaRedo
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Recompensas from "../../components/common/Recompensas";
import "../../styles/ludo.css";
import "./escape.css";

import questions from "./data/questions";

import QuestionCard from "./components/QuestionCard";
import AnswerFeedback from "./components/AnswerFeedback";
import GameTimer from "./components/GameTimer";


const MAX_TIME = 20;
const QUESTIONS_PER_GAME = 5;


export default function EscapeAlgebra() {

    const navigate = useNavigate();

    const { actualizarUsuario } = useAuth();

    // Premio que entrega el servidor al terminar (con tope diario).
    const [premio, setPremio] = useState(null);
    const premioPedidoRef = useRef(false);
    const warningAudioRef = useRef(null);

    const stopWarningSound = () => {

        if (warningAudioRef.current) {

            warningAudioRef.current.pause();
            warningAudioRef.current.currentTime = 0;
            warningAudioRef.current = null;

        }

    };


    // =====================================================
    // ESTADOS
    // =====================================================

    const [currentQuestion, setCurrentQuestion] = useState(0);

    const [gameQuestions, setGameQuestions] = useState([]);

    const [score, setScore] = useState(0);

    const [lives, setLives] = useState(3);

    const [combo, setCombo] = useState(0);

    const [selectedAnswer, setSelectedAnswer] = useState(null);

    const [feedback, setFeedback] = useState(null);

    const [finished, setFinished] = useState(false);

    const [time, setTime] = useState(MAX_TIME);

    const [correctAnswers, setCorrectAnswers] = useState(0);


    // =====================================================
    // PREGUNTA ACTUAL
    // =====================================================

    const question =
        gameQuestions[currentQuestion];

        // =====================================================
        // WARNING DE TIEMPO
        // =====================================================

        useEffect(() => {

            if (
                finished ||
                !question
            ) {
                return;
            }

            if (time === 5) {

                stopWarningSound();

                warningAudioRef.current = playSound("warning", 0.7);

            }

        }, [
            time,
            finished,
            question
        ]);


    // =====================================================
    // SELECCIONAR PREGUNTAS ALEATORIAS
    // =====================================================

    const shuffleQuestions = () => {

        const shuffled =
            [...questions]
                .sort(
                    () =>
                        Math.random() - 0.5
                )
                .slice(
                    0,
                    Math.min(
                        QUESTIONS_PER_GAME,
                        questions.length
                    )
                );


        setGameQuestions(shuffled);

    };


    // =====================================================
    // INICIAR JUEGO
    // =====================================================

    useEffect(() => {

        shuffleQuestions();

    }, []);


    // =====================================================
    // TEMPORIZADOR
    // =====================================================

    useEffect(() => {

        if (
            finished ||
            feedback !== null ||
            !question
        ) {
            return;
        }


        // -------------------------------------------------
        // TIEMPO AGOTADO
        // -------------------------------------------------

        if (time <= 0) {

            handleTimeout();

            return;
        }

        const timer =
            setInterval(() => {

                setTime(
                    (previous) =>
                        previous - 1
                );

            }, 1000);


        return () =>
            clearInterval(timer);


    }, [
        time,
        finished,
        feedback,
        question
    ]);


    // =====================================================
    // TIEMPO AGOTADO
    // =====================================================

    const handleTimeout = () => {

        // DETENER WARNING AL TERMINAR EL TIEMPO
        stopWarningSound();

        if (
            selectedAnswer ||
            finished ||
            !question
        ) {
            return;
        }


        // -------------------------------------------------
        // MARCAR COMO SIN RESPUESTA
        // -------------------------------------------------

        setSelectedAnswer(
            "TIMEOUT"
        );


        // -------------------------------------------------
        // QUITAR VIDA
        // -------------------------------------------------

        setLives(
            (previous) =>
                Math.max(
                    0,
                    previous - 1
                )
        );


        // -------------------------------------------------
        // ROMPER COMBO
        // -------------------------------------------------

        setCombo(0);


        // -------------------------------------------------
        // FEEDBACK
        // -------------------------------------------------

        setFeedback(false);


        // -------------------------------------------------
        // SONIDO
        // -------------------------------------------------

        playSound(
            "incorrect",
            0.7
        );


        // -------------------------------------------------
        // SIGUIENTE PREGUNTA
        // -------------------------------------------------

        setTimeout(() => {

            setFeedback(null);

            nextQuestion();

        }, 1200);

    };


    // =====================================================
    // RESPUESTA
    // =====================================================

    const handleAnswer = (answer) => {

        if (
            selectedAnswer ||
            !question ||
            finished
        ) {
            return;
        }

        // DETENER WARNING AL RESPONDER
        stopWarningSound();

        const normalizedAnswer =
            String(answer).trim();


        const normalizedCorrectAnswer =
            String(
                question.answer
            ).trim();


        const correct =
            normalizedAnswer ===
            normalizedCorrectAnswer;


        // -------------------------------------------------
        // BLOQUEAR RESPUESTA
        // -------------------------------------------------

        setSelectedAnswer(
            normalizedAnswer
        );


        // =================================================
        // RESPUESTA CORRECTA
        // =================================================

        if (correct) {

            // 🔇 DETENER WARNING INMEDIATAMENTE
            stopWarningSound();

            playSound("correct", 0.7);

            playSound("unlock", 0.8);


            const comboBonus =
                combo * 25;


            const points =
                100 + comboBonus;


            setScore(
                (previous) =>
                    previous + points
            );


            // =============================================
            // COMBO
            // =============================================

            setCombo(
                (previous) =>
                    previous + 1
            );


            // =============================================
            // ACIERTOS
            // =============================================

            setCorrectAnswers(
                (previous) =>
                    previous + 1
            );


            // =============================================
            // FEEDBACK CORRECTO
            // =============================================

            setFeedback(true);

        }


        // =================================================
        // RESPUESTA INCORRECTA
        // =================================================

        else {

            // 🔇 DETENER WARNING INMEDIATAMENTE
            stopWarningSound();

            playSound(
                "incorrect",
                0.7
            );


            setLives(
                (previous) =>
                    Math.max(
                        0,
                        previous - 1
                    )
            );


            setCombo(0);


            setFeedback(false);

        }


        // =================================================
        // SIGUIENTE PREGUNTA
        // =================================================

        setTimeout(() => {

            setFeedback(null);

            nextQuestion();

        }, 1200);

    };


    // =====================================================
    // SIGUIENTE PREGUNTA
    // =====================================================

    const nextQuestion = () => {

        // -------------------------------------------------
        // ÚLTIMA PREGUNTA
        // -------------------------------------------------

        // DETENER WARNING ANTES DE CAMBIAR DE PREGUNTA
        stopWarningSound();

        if (
            currentQuestion + 1 >=
            gameQuestions.length
        ) {

            // =============================================
            // JUEGO COMPLETADO
            // =============================================

            // =============================================
            // IMPORTANTE:
            // NO MARCAMOS EL MUNDO COMO COMPLETADO
            // TODAVÍA.
            //
            // La pantalla final determina si realmente
            // superó el desafío.
            // =============================================


            setFinished(true);

            return;

        }


        // -------------------------------------------------
        // AVANZAR
        // -------------------------------------------------

        setCurrentQuestion(
            (previous) =>
                previous + 1
        );


        setSelectedAnswer(null);

        setTime(MAX_TIME);

    };


    // =====================================================
    // REINICIAR JUEGO
    // =====================================================

    const restartGame = () => {

        stopWarningSound();
        const shuffled =
            [...questions]
                .sort(
                    () =>
                        Math.random() - 0.5
                )
                .slice(
                    0,
                    Math.min(
                        QUESTIONS_PER_GAME,
                        questions.length
                    )
                );


        setGameQuestions(
            shuffled
        );


        setCurrentQuestion(0);

        setScore(0);

        setLives(3);

        setCombo(0);

        setSelectedAnswer(null);

        setFeedback(null);

        setFinished(false);

        setPremio(null);

        setTime(MAX_TIME);

        setCorrectAnswers(0);

    };


    // =====================================================
    // SONIDO FINAL
    // =====================================================

    useEffect(() => {

        if (!finished) {
            premioPedidoRef.current = false;
            return;
        }


        // -------------------------------------------------
        // GUARDAR LA PARTIDA Y COBRAR EL PREMIO
        // -------------------------------------------------

        if (!premioPedidoRef.current) {

            premioPedidoRef.current = true;

            api("/partidas/registrar", {
                metodo: "POST",
                body: {
                    juego: "escape-algebra",
                    aciertos: correctAnswers,
                    total: gameQuestions.length,
                },
            })
                .then((r) => {
                    setPremio(r);
                    actualizarUsuario(r.perfil);
                })
                .catch(() => setPremio({ error: true }));
        }


        // -------------------------------------------------
        // CALCULAR RESULTADO REAL
        // -------------------------------------------------

        const percentage =
            gameQuestions.length > 0
                ? Math.round(
                    (
                        correctAnswers /
                        gameQuestions.length
                    ) * 100
                )
                : 0;


        const passed =
            percentage >= 60;


        // -------------------------------------------------
        // VICTORIA
        // -------------------------------------------------

        if (passed) {

            playSound(
                "victory",
                0.8
            );


            // =============================================
            // LOGRO
            // =============================================

            const achievements =
                Number(
                    localStorage.getItem(
                        "mathvision_achievements"
                    )
                ) || 0;


            if (achievements === 0) {

                localStorage.setItem(
                    "mathvision_achievements",
                    1
                );

            }


            // =============================================
            // MUNDO COMPLETADO
            // =============================================

            const completedWorlds =
                JSON.parse(
                    localStorage.getItem(
                        "mathvision_completed_worlds"
                    ) || "[]"
                );


            if (
                !completedWorlds.includes(
                    "algebra"
                )
            ) {

                completedWorlds.push(
                    "algebra"
                );


                localStorage.setItem(
                    "mathvision_completed_worlds",
                    JSON.stringify(
                        completedWorlds
                    )
                );

            }

        }


        // -------------------------------------------------
        // GAME OVER
        // -------------------------------------------------

        else {

            playSound(
                "gameOver",
                0.8
            );

        }


    }, [
        finished,
        correctAnswers,
        gameQuestions,
        actualizarUsuario
    ]);


    // =====================================================
    // PANTALLA FINAL
    //
    // IMPORTANTE:
    // ESTA PARTE VA ANTES DE !question
    //
    // Así evitamos la pantalla blanca cuando el tiempo
    // se acaba en la última pregunta.
    // =====================================================

    if (finished) {

        const percentage =
            gameQuestions.length > 0
                ? Math.round((correctAnswers / gameQuestions.length) * 100)
                : 0;

        const passed = percentage >= 60;

        // Pantalla final compacta: cabe completa en el teléfono acostado
        // (antes era muy alta y se veía cortada).
        return (
            <div className={`ea-fin ${passed ? "ea-fin-gano" : "ea-fin-perdio"}`}>
                <motion.section
                    className="ea-fin-caja"
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 140, damping: 14 }}
                >
                    <div className="ea-fin-izq">
                        <motion.span
                            className="ea-fin-trofeo"
                            animate={passed ? { rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            aria-hidden="true"
                        >
                            <FaTrophy />
                        </motion.span>
                        <p className="ea-fin-estado">{passed ? "Misión completada" : "Misión finalizada"}</p>
                        <h1>Escape Álgebra</h1>
                        <p className="ea-fin-frase">
                            {passed
                                ? "¡Escapaste del laboratorio matemático!"
                                : "El desafío terminó. ¡Inténtalo otra vez!"}
                        </p>
                    </div>

                    <div className="ea-fin-der">
                        <ul className="ea-fin-datos">
                            <li>
                                <small>Puntos</small>
                                <strong className="ea-c-cian">{score}</strong>
                            </li>
                            <li>
                                <small>Aciertos</small>
                                <strong className="ea-c-verde">
                                    {correctAnswers}
                                    <em>{`/${gameQuestions.length}`}</em>
                                </strong>
                            </li>
                            <li>
                                <small>Precisión</small>
                                <strong className="ea-c-morado">{`${percentage}%`}</strong>
                            </li>
                        </ul>

                        <div className="ea-fin-barra" aria-hidden="true">
                            <motion.span initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 1.1 }} />
                        </div>

                        <div className="ea-fin-premio">
                            <small>Premio</small>
                            {premio === null ? (
                                <span className="ea-fin-nota">Guardando tu partida…</span>
                            ) : premio.error ? (
                                <span className="ea-fin-nota ea-c-rojo">No se pudo guardar el premio. Revisa tu conexión.</span>
                            ) : (
                                <>
                                    <Recompensas xp={premio.recompensa.xp} oro={premio.recompensa.oro} />
                                    {premio.recompensa.subio_nivel && (
                                        <span className="ea-fin-nota ea-c-verde">{`🎉 ¡Subiste al nivel ${premio.recompensa.nivel_nuevo}!`}</span>
                                    )}
                                    {premio.limite_diario_alcanzado && (
                                        <span className="ea-fin-nota">Ya ganaste premios aquí varias veces hoy. ¡Vuelve mañana!</span>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="ea-fin-botones">
                            <button type="button" className="ffp-btn" onClick={restartGame}>
                                <FaRedo aria-hidden="true" />
                                Jugar de nuevo
                            </button>
                            <button type="button" className="ffp-btn ffp-btn-2" onClick={() => navigate("/lobby")}>
                                Volver al lobby
                            </button>
                        </div>
                    </div>
                </motion.section>
            </div>
        );
    }


    // =====================================================
    // CARGANDO JUEGO
    //
    // ESTE BLOQUE AHORA ESTÁ DESPUÉS DE finished.
    //
    // Así si la última pregunta termina por timeout,
    // primero se muestra la pantalla final.
    // =====================================================

    if (!question) {

        return (

            <div className="
                flex
                h-screen
                items-center
                justify-center
                bg-slate-950
                text-white
            ">

                <motion.div
                    animate={{
                        rotate: 360
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="
                        h-10
                        w-10
                        rounded-full
                        border-4
                        border-slate-700
                        border-t-cyan-400
                    "
                />

            </div>

        );

    }


    // =====================================================
    // JUEGO
    // =====================================================

    return (

        <div className="
            ffp
            ea
            flex
            flex-col
            overflow-hidden
            bg-slate-950
            text-white
        ">


            {/* Sin encabezado: una barra delgada con lo del juego (salir, progreso, tiempo, vidas, puntos). */}
            <div className="ea-hud">
                <button type="button" className="ffl-icono" onClick={() => navigate("/lobby")} aria-label="Salir" title="Salir">
                    <FaArrowLeft aria-hidden="true" />
                </button>
                <div className="ea-progreso" aria-label={`Desafío ${currentQuestion + 1} de ${gameQuestions.length}`}>
                    <span style={{ width: `${((currentQuestion + 1) / gameQuestions.length) * 100}%` }} />
                </div>
                <span className="ea-chip">{`${currentQuestion + 1}/${gameQuestions.length}`}</span>
                <span className="ea-chip ea-tiempo">
                    <GameTimer time={time} maxTime={MAX_TIME} />
                </span>
                <span className="ea-chip ea-vidas" aria-label={`${lives} vidas`}>
                    <FaHeart aria-hidden="true" />
                    {lives}
                </span>
                {combo > 0 && <span className="ea-chip ea-combo">{`🔥 x${combo}`}</span>}
                <span className="ea-chip ea-puntos" aria-label={`${score} puntos`}>
                    <FaBolt aria-hidden="true" />
                    {score}
                </span>
            </div>

            {/* =================================================
                GAME AREA
            ================================================= */}

            <main className="
                relative
                min-h-0
                flex-1
                overflow-hidden
            ">

                <AnimatePresence
                    mode="wait"
                >

                    <QuestionCard
                        key={question.id}
                        question={question}
                        onAnswer={handleAnswer}
                        selectedAnswer={
                            selectedAnswer
                        }
                        disabled={
                            Boolean(
                                selectedAnswer
                            )
                        }
                    />

                </AnimatePresence>


                {/* FEEDBACK */}

                <AnimatePresence>

                    {feedback !== null && (

                        <AnswerFeedback
                            correct={
                                feedback
                            }
                        />

                    )}

                </AnimatePresence>

            </main>

        </div>

    );

}