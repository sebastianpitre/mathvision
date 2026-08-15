import { useEffect, useState } from "react";
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

import questions from "./data/questions";

import QuestionCard from "./components/QuestionCard";
import AnswerFeedback from "./components/AnswerFeedback";
import GameTimer from "./components/GameTimer";


const MAX_TIME = 20;


export default function EscapeAlgebra() {

    const navigate = useNavigate();


    // =========================
    // ESTADOS
    // =========================

    const [currentQuestion, setCurrentQuestion] = useState(0);

    const [score, setScore] = useState(0);

    const [lives, setLives] = useState(3);

    const [combo, setCombo] = useState(0);

    const [selectedAnswer, setSelectedAnswer] = useState(null);

    const [feedback, setFeedback] = useState(null);

    const [finished, setFinished] = useState(false);

    const [time, setTime] = useState(MAX_TIME);

    const [correctAnswers, setCorrectAnswers] = useState(0);


    const question = questions[currentQuestion];


    // =========================
    // TEMPORIZADOR
    // =========================

    useEffect(() => {

        if (finished || feedback) {
            return;
        }

        if (time <= 0) {

            handleTimeout();

            return;
        }


        const timer = setInterval(() => {

            setTime((previous) => previous - 1);

        }, 1000);


        return () => clearInterval(timer);

    }, [
        time,
        finished,
        feedback
    ]);


    // =========================
    // TIEMPO AGOTADO
    // =========================

    const handleTimeout = () => {

        setSelectedAnswer("TIMEOUT");

        setLives((previous) => previous - 1);

        setCombo(0);

        setFeedback(false);


        setTimeout(() => {

            setFeedback(null);

            nextQuestion(false);

        }, 1200);

    };


    // =========================
    // RESPUESTA
    // =========================

    const handleAnswer = (answer) => {

        if (selectedAnswer) {
            return;
        }
    
        const normalizedAnswer =
            String(answer).trim();
    
        const normalizedCorrectAnswer =
            String(question.answer).trim();
    
        const correct =
            normalizedAnswer === normalizedCorrectAnswer;
    
        setSelectedAnswer(normalizedAnswer);
    
        if (correct) {

            playSound("correct", 0.7);
            playSound("unlock", 0.8);

            const comboBonus = combo * 25;
    
            const points =
                100 + comboBonus;
    
            setScore((previous) =>
                previous + points
            );
    
            const currentXP =
                Number(localStorage.getItem("mathvision_xp")) || 0;

            localStorage.setItem(
                "mathvision_xp",
                currentXP + points
            );

            setCombo((previous) =>
                previous + 1
            );
    
            setCorrectAnswers((previous) =>
                previous + 1
            );
    
            setFeedback(true);
    
        } else {

            playSound("incorrect", 0.7);

            setLives((previous) =>
                previous - 1
            );
    
            setCombo(0);
    
            setFeedback(false);
    
        }
    
        setTimeout(() => {
    
            setFeedback(null);
    
            nextQuestion(correct);
    
        }, 1200);
    
    };

    // =========================
    // SIGUIENTE PREGUNTA
    // =========================

    const nextQuestion = (correct) => {

        if (
            currentQuestion + 1 >= questions.length
        ) {

            // =========================
            // JUEGO COMPLETADO
            // =========================

            const completedGames =
                Number(
                    localStorage.getItem("mathvision_games")
                ) || 0;

            localStorage.setItem(
                "mathvision_games",
                completedGames + 1
            );


            // =========================
            // LOGRO
            // =========================

            const achievements =
                Number(
                    localStorage.getItem("mathvision_achievements")
                ) || 0;

            if (achievements === 0) {

                localStorage.setItem(
                    "mathvision_achievements",
                    1
                );

            }


            // =========================
            // MUNDO COMPLETADO
            // =========================

            const completedWorlds =
                JSON.parse(
                    localStorage.getItem(
                        "mathvision_completed_worlds"
                    ) || "[]"
                );

            if (!completedWorlds.includes("algebra")) {

                completedWorlds.push("algebra");

                localStorage.setItem(
                    "mathvision_completed_worlds",
                    JSON.stringify(completedWorlds)
                );

            }


            setFinished(true);

            return;

        }


        setCurrentQuestion(
            (previous) => previous + 1
        );


        setSelectedAnswer(null);

        setTime(MAX_TIME);

    };


    // =========================
    // REINICIAR
    // =========================

    const restartGame = () => {

        setCurrentQuestion(0);

        setScore(0);

        setLives(3);

        setCombo(0);

        setSelectedAnswer(null);

        setFeedback(null);

        setFinished(false);

        setTime(MAX_TIME);

        setCorrectAnswers(0);

    };


    // =========================
    // PANTALLA FINAL
    // =========================

    useEffect(() => {

        if (!finished) {
            return;
        }

        if (correctAnswers > 0) {
            playSound("victory", 0.8);
        } else {
            playSound("gameOver", 0.8);
        }

    }, [finished]);

    if (finished) {

        const percentage =
            Math.round(
                (correctAnswers / questions.length) * 100
            );

        const passed = percentage >= 60;

        return (

            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-10 text-white">

                {/* BACKGROUND */}

                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.15, 0.3, 0.15]
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


                {/* PARTICULAS */}

                {passed && (

                    <>

                        <motion.div
                            initial={{
                                opacity: 0,
                                scale: 0
                            }}
                            animate={{
                                opacity: [0, 1, 0],
                                scale: [0.5, 1.5, 2]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity
                            }}
                            className="absolute left-[15%] top-[20%] h-3 w-3 rounded-full bg-cyan-400"
                        />

                        <motion.div
                            initial={{
                                opacity: 0,
                                scale: 0
                            }}
                            animate={{
                                opacity: [0, 1, 0],
                                scale: [0.5, 1.5, 2]
                            }}
                            transition={{
                                duration: 2.5,
                                delay: 0.5,
                                repeat: Infinity
                            }}
                            className="absolute right-[15%] top-[30%] h-3 w-3 rounded-full bg-purple-400"
                        />

                        <motion.div
                            initial={{
                                opacity: 0,
                                scale: 0
                            }}
                            animate={{
                                opacity: [0, 1, 0],
                                scale: [0.5, 1.5, 2]
                            }}
                            transition={{
                                duration: 2.2,
                                delay: 1,
                                repeat: Infinity
                            }}
                            className="absolute bottom-[20%] left-[25%] h-3 w-3 rounded-full bg-yellow-400"
                        />

                    </>

                )}


                {/* CARD */}

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

                    {/* ICONO */}

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
                            animate={
                                passed
                                    ? {
                                        rotate: [0, -8, 8, 0],
                                        scale: [1, 1.1, 1]
                                    }
                                    : {
                                        scale: [1, 0.95, 1]
                                    }
                            }
                            transition={{
                                duration: 1.5,
                                repeat: Infinity
                            }}
                        >

                            <FaTrophy size={48} />

                        </motion.div>

                    </motion.div>


                    {/* TITULO */}

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

                        {passed
                            ? "Misión completada"
                            : "Misión finalizada"
                        }

                    </p>


                    <h1 className="mt-3 text-4xl font-black md:text-5xl">

                        Escape Algebra

                    </h1>


                    <p className="mt-3 text-slate-400">

                        {passed
                            ? "Has conseguido escapar del laboratorio matemático."
                            : "El desafío terminó. ¡Puedes intentarlo nuevamente!"
                        }

                    </p>


                    {/* RESULTADO */}

                    <motion.div
                        initial={{
                            opacity: 0,
                            y: 20
                        }}
                        animate={{
                            opacity: 1,
                            y: 0
                        }}
                        transition={{
                            delay: 0.4
                        }}
                        className={`
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

                            ${
                                passed
                                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                                    : "border-red-400/30 bg-red-400/10 text-red-400"
                            }
                        `}
                    >

                        {passed
                            ? "✓ DESAFÍO SUPERADO"
                            : "✕ DESAFÍO NO SUPERADO"
                        }

                    </motion.div>


                    {/* SCORE */}

                    <div className="my-8 grid grid-cols-3 gap-3">

                        {/* XP */}

                        <motion.div
                            whileHover={{
                                y: -5
                            }}
                            className="rounded-2xl border border-slate-800 bg-slate-800/80 p-4"
                        >

                            <p className="text-xs font-bold text-slate-500">

                                XP

                            </p>

                            <p className="mt-1 text-2xl font-black text-cyan-400">

                                {score}

                            </p>

                        </motion.div>


                        {/* ACIERTOS */}

                        <motion.div
                            whileHover={{
                                y: -5
                            }}
                            className="rounded-2xl border border-slate-800 bg-slate-800/80 p-4"
                        >

                            <p className="text-xs font-bold text-slate-500">

                                Aciertos

                            </p>

                            <p className="mt-1 text-2xl font-black text-emerald-400">

                                {correctAnswers}

                                <span className="text-sm text-slate-500">

                                    /{questions.length}

                                </span>

                            </p>

                        </motion.div>


                        {/* PRECISIÓN */}

                        <motion.div
                            whileHover={{
                                y: -5
                            }}
                            className="rounded-2xl border border-slate-800 bg-slate-800/80 p-4"
                        >

                            <p className="text-xs font-bold text-slate-500">

                                Precisión

                            </p>

                            <p className="mt-1 text-2xl font-black text-purple-400">

                                {percentage}%

                            </p>

                        </motion.div>

                    </div>


                    {/* BARRA DE PROGRESO */}

                    <div className="mb-8">

                        <div className="mb-2 flex justify-between text-xs font-bold">

                            <span className="text-slate-500">

                                PROGRESO

                            </span>

                            <span className="text-cyan-400">

                                {percentage}%

                            </span>

                        </div>


                        <div className="h-3 overflow-hidden rounded-full bg-slate-800">

                            <motion.div
                                initial={{
                                    width: 0
                                }}
                                animate={{
                                    width: `${percentage}%`
                                }}
                                transition={{
                                    duration: 1.2,
                                    delay: 0.5
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


                    {/* BOTONES */}

                    <div className="grid gap-3 md:grid-cols-2">

                        <motion.button
                            whileHover={{
                                scale: 1.03
                            }}
                            whileTap={{
                                scale: 0.97
                            }}
                            onClick={restartGame}
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
                                navigate("/dashboard")
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

    // =========================
    // JUEGO
    // =========================

    return (

        <div className="min-h-screen bg-slate-950 text-white">


            {/* HEADER */}

            <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">

                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">


                    {/* SALIR */}

                    <button
                        onClick={() =>
                            navigate("/dashboard")
                        }
                        className="flex items-center gap-3 text-slate-400 transition hover:text-white"
                    >

                        <FaArrowLeft />

                        <span className="hidden sm:block">
                            Salir
                        </span>

                    </button>


                    {/* TITULO */}

                    <div className="text-center">

                        <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400">

                            MathVision

                        </p>

                        <h1 className="font-bold">

                            Escape Algebra

                        </h1>

                    </div>


                    {/* STATS */}

                    <div className="flex items-center gap-3 md:gap-5">


                        {/* TIMER */}

                        <GameTimer
                            time={time}
                            maxTime={MAX_TIME}
                        />


                        {/* VIDAS */}

                        <div className="flex items-center gap-2 text-red-400">

                            <FaHeart />

                            {lives}

                        </div>


                        {/* COMBO */}

                        {combo > 0 && (

                            <motion.div
                                initial={{
                                    scale: 0.5,
                                    opacity: 0
                                }}
                                animate={{
                                    scale: 1,
                                    opacity: 1
                                }}
                                className="hidden items-center gap-2 text-orange-400 md:flex"
                            >

                                🔥 x{combo}

                            </motion.div>

                        )}


                        {/* SCORE */}

                        <div className="flex items-center gap-2 text-yellow-400">

                            <FaBolt />

                            {score}

                        </div>

                    </div>

                </div>

            </header>


            {/* PROGRESO */}

            <div className="mx-auto max-w-3xl px-5 pt-3">


                <div className="mb-2 flex justify-between text-sm">

                    <span className="text-slate-400">

                        Desafío {currentQuestion + 1}

                    </span>

                    <span className="text-cyan-400">

                        {questions.length} niveles

                    </span>

                </div>


                <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                    <motion.div
                        animate={{
                            width:
                                `${((currentQuestion + 1) / questions.length) * 100}%`
                        }}
                        transition={{
                            duration: 0.4
                        }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                    />

                </div>

            </div>


            {/* GAME */}

            <main className="relative px-5 py-5">


                <AnimatePresence mode="wait">

                    <QuestionCard
                        key={question.id}
                        question={question}
                        onAnswer={handleAnswer}
                        selectedAnswer={selectedAnswer}
                        disabled={Boolean(selectedAnswer)}
                    />

                </AnimatePresence>


                {/* FEEDBACK */}

                <AnimatePresence>

                    {feedback !== null && (

                        <AnswerFeedback
                            correct={feedback}
                        />

                    )}

                </AnimatePresence>


            </main>

        </div>

    );

}