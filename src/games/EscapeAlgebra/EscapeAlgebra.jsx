import { useEffect, useState } from "react";

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
    
            const comboBonus = combo * 25;
    
            const points =
                100 + comboBonus;
    
            setScore((previous) =>
                previous + points
            );
    
            setCombo((previous) =>
                previous + 1
            );
    
            setCorrectAnswers((previous) =>
                previous + 1
            );
    
            setFeedback(true);
    
        } else {
    
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

            setFinished(true);

            return;

        }


        if (!correct && lives <= 1) {

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

    if (finished) {

        const percentage =
            Math.round(
                (correctAnswers / questions.length) * 100
            );


        return (

            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 text-white">


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
                    className="absolute h-96 w-96 rounded-full bg-cyan-500/20 blur-[120px]"
                />


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
                    className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl md:p-12"
                >

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
                        className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-yellow-400/10 text-yellow-400"
                    >

                        <FaTrophy size={42} />

                    </motion.div>


                    <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-400">

                        Misión completada

                    </p>


                    <h1 className="mt-3 text-4xl font-black md:text-5xl">

                        Escape Algebra

                    </h1>


                    <p className="mt-3 text-slate-400">

                        Has terminado tu desafío matemático.

                    </p>


                    {/* SCORE */}

                    <div className="my-8 grid grid-cols-3 gap-3">

                        <div className="rounded-2xl bg-slate-800 p-4">

                            <p className="text-xs text-slate-500">
                                XP
                            </p>

                            <p className="mt-1 text-2xl font-black text-cyan-400">

                                {score}

                            </p>

                        </div>


                        <div className="rounded-2xl bg-slate-800 p-4">

                            <p className="text-xs text-slate-500">
                                Aciertos
                            </p>

                            <p className="mt-1 text-2xl font-black text-emerald-400">

                                {correctAnswers}

                            </p>

                        </div>


                        <div className="rounded-2xl bg-slate-800 p-4">

                            <p className="text-xs text-slate-500">
                                Precisión
                            </p>

                            <p className="mt-1 text-2xl font-black text-purple-400">

                                {percentage}%

                            </p>

                        </div>

                    </div>


                    {/* BUTTONS */}

                    <div className="grid gap-3 md:grid-cols-2">

                        <button
                            onClick={restartGame}
                            className="flex items-center justify-center gap-3 rounded-xl bg-cyan-500 py-4 font-bold text-slate-950 transition hover:bg-cyan-400"
                        >

                            <FaRedo />

                            JUGAR DE NUEVO

                        </button>


                        <button
                            onClick={() =>
                                navigate("/dashboard")
                            }
                            className="flex items-center justify-center gap-3 rounded-xl border border-slate-700 py-4 font-bold transition hover:bg-slate-800"
                        >

                            <FaHome />

                            DASHBOARD

                        </button>

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

            <div className="mx-auto max-w-3xl px-5 pt-8">


                <div className="mb-3 flex justify-between text-sm">

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

            <main className="relative px-5 py-12">


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