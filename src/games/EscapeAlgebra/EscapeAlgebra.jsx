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
    FaRedo,
    FaHome
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

                const audio = new Audio(
                    "/sounds/warning.mp3"
                );

                audio.volume = 0.7;

                warningAudioRef.current = audio;

                audio.play().catch(() => {});

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
                ? Math.round(
                    (
                        correctAnswers /
                        gameQuestions.length
                    ) * 100
                )
                : 0;


        const passed =
            percentage >= 60;


        return (

            <div className="
                relative
                flex
                min-h-screen
                items-center
                justify-center
                overflow-hidden
                bg-slate-950
                px-5
                py-10
                text-white
            ">


                {/* =========================================
                    BACKGROUND
                ========================================= */}

                <motion.div
                    animate={{
                        scale: [
                            1,
                            1.3,
                            1
                        ],
                        opacity: [
                            0.15,
                            0.3,
                            0.15
                        ]
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity
                    }}
                    className={`
                        absolute
                        h-96
                        w-96
                        rounded-full
                        blur-[120px]

                        ${
                            passed
                                ? "bg-cyan-500/20"
                                : "bg-red-500/20"
                        }
                    `}
                />


                {/* =========================================
                    PARTICULAS
                ========================================= */}

                {passed && (

                    <>

                        <motion.div
                            animate={{
                                opacity: [
                                    0,
                                    1,
                                    0
                                ],
                                scale: [
                                    0.5,
                                    1.5,
                                    2
                                ]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity
                            }}
                            className="
                                absolute
                                left-[15%]
                                top-[20%]
                                h-3
                                w-3
                                rounded-full
                                bg-cyan-400
                            "
                        />


                        <motion.div
                            animate={{
                                opacity: [
                                    0,
                                    1,
                                    0
                                ],
                                scale: [
                                    0.5,
                                    1.5,
                                    2
                                ]
                            }}
                            transition={{
                                duration: 2.5,
                                delay: 0.5,
                                repeat: Infinity
                            }}
                            className="
                                absolute
                                right-[15%]
                                top-[30%]
                                h-3
                                w-3
                                rounded-full
                                bg-purple-400
                            "
                        />


                        <motion.div
                            animate={{
                                opacity: [
                                    0,
                                    1,
                                    0
                                ],
                                scale: [
                                    0.5,
                                    1.5,
                                    2
                                ]
                            }}
                            transition={{
                                duration: 2.2,
                                delay: 1,
                                repeat: Infinity
                            }}
                            className="
                                absolute
                                bottom-[20%]
                                left-[25%]
                                h-3
                                w-3
                                rounded-full
                                bg-yellow-400
                            "
                        />

                    </>

                )}


                {/* =========================================
                    CARD
                ========================================= */}

                <motion.div
                    initial={{
                        opacity: 0,
                        scale: 0.7,
                        y: 40
                    }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 120,
                        damping: 12
                    }}
                    className="
                        relative
                        z-10
                        w-full
                        max-w-xl
                        rounded-[2rem]
                        border
                        border-slate-700
                        bg-slate-900/90
                        p-8
                        text-center
                        shadow-2xl
                        backdrop-blur-xl
                        md:p-12
                    "
                >


                    {/* =====================================
                        ICONO
                    ===================================== */}

                    <motion.div
                        initial={{
                            rotate: -20,
                            scale: 0
                        }}
                        animate={{
                            rotate: 0,
                            scale: 1
                        }}
                        transition={{
                            type: "spring",
                            delay: 0.2
                        }}
                        className={`
                            mx-auto
                            mb-6
                            flex
                            h-28
                            w-28
                            items-center
                            justify-center
                            rounded-full

                            ${
                                passed
                                    ? "bg-yellow-400/10 text-yellow-400"
                                    : "bg-red-400/10 text-red-400"
                            }
                        `}
                    >

                        <motion.div
                            animate={{
                                rotate: passed
                                    ? [
                                        0,
                                        -8,
                                        8,
                                        0
                                    ]
                                    : 0,

                                scale: passed
                                    ? [
                                        1,
                                        1.1,
                                        1
                                    ]
                                    : 1
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity
                            }}
                        >

                            <FaTrophy size={48} />

                        </motion.div>

                    </motion.div>


                    {/* =====================================
                        TITULO
                    ===================================== */}

                    <p className={`
                        text-sm
                        font-bold
                        uppercase
                        tracking-[0.3em]

                        ${
                            passed
                                ? "text-cyan-400"
                                : "text-red-400"
                        }
                    `}>

                        {
                            passed
                                ? "Misión completada"
                                : "Misión finalizada"
                        }

                    </p>


                    <h1 className="
                        mt-3
                        text-4xl
                        font-black
                        md:text-5xl
                    ">

                        Escape Algebra

                    </h1>


                    <p className="
                        mt-3
                        text-slate-400
                    ">

                        {
                            passed
                                ? "Has conseguido escapar del laboratorio matemático."
                                : "El desafío terminó. ¡Puedes intentarlo nuevamente!"
                        }

                    </p>


                    {/* =====================================
                        RESULTADO
                    ===================================== */}

                    <div
                        className="
                            mx-auto
                            mt-6
                            inline-flex
                            items-center
                            rounded-full
                            border
                            px-5
                            py-2
                            text-sm
                            font-black
                        "
                        style={{
                            borderColor:
                                passed
                                    ? "rgba(52,211,153,0.3)"
                                    : "rgba(248,113,113,0.3)"
                        }}
                    >

                        <span
                            className={
                                passed
                                    ? "text-emerald-400"
                                    : "text-red-400"
                            }
                        >

                            {
                                passed
                                    ? "✓ DESAFÍO SUPERADO"
                                    : "✕ DESAFÍO NO SUPERADO"
                            }

                        </span>

                    </div>


                    {/* =====================================
                        PREMIO (lo calcula el servidor)
                    ===================================== */}

                    <div className="mt-6 flex flex-col items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            Premio
                        </p>
                        {premio === null ? (
                            <p className="text-sm text-slate-400">Guardando tu partida…</p>
                        ) : premio.error ? (
                            <p className="text-sm text-red-300">No se pudo guardar el premio. Revisa tu conexión.</p>
                        ) : (
                            <>
                                <Recompensas
                                    xp={premio.recompensa.xp}
                                    oro={premio.recompensa.oro}
                                    grande
                                />
                                {premio.recompensa.subio_nivel && (
                                    <p className="font-black text-emerald-300">
                                        {`🎉 ¡Subiste al nivel ${premio.recompensa.nivel_nuevo}!`}
                                    </p>
                                )}
                                {premio.limite_diario_alcanzado && (
                                    <p className="text-sm text-slate-400">
                                        Ya ganaste premios en Escape Álgebra varias veces hoy. ¡Vuelve mañana!
                                    </p>
                                )}
                            </>
                        )}
                    </div>


                    {/* =====================================
                        ESTADISTICAS
                    ===================================== */}

                    <div className="
                        my-8
                        grid
                        grid-cols-3
                        gap-3
                    ">


                        {/* XP */}

                        <motion.div
                            whileHover={{
                                y: -5
                            }}
                            className="
                                rounded-2xl
                                border
                                border-slate-800
                                bg-slate-800/80
                                p-4
                            "
                        >

                            <p className="
                                text-xs
                                font-bold
                                text-slate-500
                            ">
                                PUNTOS
                            </p>

                            <p className="
                                mt-1
                                text-2xl
                                font-black
                                text-cyan-400
                            ">
                                {score}
                            </p>

                        </motion.div>


                        {/* ACIERTOS */}

                        <motion.div
                            whileHover={{
                                y: -5
                            }}
                            className="
                                rounded-2xl
                                border
                                border-slate-800
                                bg-slate-800/80
                                p-4
                            "
                        >

                            <p className="
                                text-xs
                                font-bold
                                text-slate-500
                            ">
                                Aciertos
                            </p>

                            <p className="
                                mt-1
                                text-2xl
                                font-black
                                text-emerald-400
                            ">

                                {correctAnswers}

                                <span className="
                                    text-sm
                                    text-slate-500
                                ">
                                    /{gameQuestions.length}
                                </span>

                            </p>

                        </motion.div>


                        {/* PRECISION */}

                        <motion.div
                            whileHover={{
                                y: -5
                            }}
                            className="
                                rounded-2xl
                                border
                                border-slate-800
                                bg-slate-800/80
                                p-4
                            "
                        >

                            <p className="
                                text-xs
                                font-bold
                                text-slate-500
                            ">
                                Precisión
                            </p>

                            <p className="
                                mt-1
                                text-2xl
                                font-black
                                text-purple-400
                            ">
                                {percentage}%
                            </p>

                        </motion.div>

                    </div>


                    {/* =====================================
                        PROGRESO
                    ===================================== */}

                    <div className="
                        mb-8
                    ">

                        <div className="
                            mb-2
                            flex
                            justify-between
                            text-xs
                            font-bold
                        ">

                            <span className="
                                text-slate-500
                            ">
                                PROGRESO
                            </span>

                            <span className="
                                text-cyan-400
                            ">
                                {percentage}%
                            </span>

                        </div>


                        <div className="
                            h-3
                            overflow-hidden
                            rounded-full
                            bg-slate-800
                        ">

                            <motion.div
                                initial={{
                                    width: 0
                                }}
                                animate={{
                                    width:
                                        `${percentage}%`
                                }}
                                transition={{
                                    duration: 1.2
                                }}
                                className={`
                                    h-full
                                    rounded-full

                                    ${
                                        passed
                                            ? "bg-gradient-to-r from-cyan-500 to-emerald-400"
                                            : "bg-gradient-to-r from-red-500 to-orange-400"
                                    }
                                `}
                            />

                        </div>

                    </div>


                    {/* =====================================
                        BOTONES
                    ===================================== */}

                    <div className="
                        grid
                        gap-3
                        md:grid-cols-2
                    ">

                        <motion.button
                            whileHover={{
                                scale: 1.03
                            }}
                            whileTap={{
                                scale: 0.97
                            }}
                            onClick={
                                restartGame
                            }
                            className="
                                flex
                                items-center
                                justify-center
                                gap-3
                                rounded-xl
                                bg-cyan-500
                                py-4
                                font-black
                                text-slate-950
                                transition
                                hover:bg-cyan-400
                            "
                        >

                            <FaRedo />

                            JUGAR DE NUEVO

                        </motion.button>


                        <motion.button
                            whileHover={{
                                scale: 1.03
                            }}
                            whileTap={{
                                scale: 0.97
                            }}
                            onClick={() =>
                                navigate(
                                    "/lobby"
                                )
                            }
                            className="
                                flex
                                items-center
                                justify-center
                                gap-3
                                rounded-xl
                                border
                                border-slate-700
                                py-4
                                font-black
                                transition
                                hover:bg-slate-800
                            "
                        >

                            <FaHome />

                            DASHBOARD

                        </motion.button>

                    </div>

                </motion.div>

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