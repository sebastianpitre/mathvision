import { useState } from "react";
import { motion } from "framer-motion";
import {
    FaLock,
    FaKey,
    FaArrowRight
} from "react-icons/fa";

export default function QuestionCard({
    question,
    onAnswer,
    selectedAnswer,
    disabled
}) {

    const [answer, setAnswer] = useState("");

    const handleSubmit = (event) => {

        event.preventDefault();

        if (!answer.trim() || disabled) {
            return;
        }

        onAnswer(answer.trim());

    };

    const answered = Boolean(selectedAnswer);

    const correct =
        selectedAnswer &&
        selectedAnswer === question.answer;

    return (

        <motion.div
            initial={{
                opacity: 0,
                scale: 0.92,
                y: 30
            }}
            animate={{
                opacity: 1,
                scale: 1,
                y: 0
            }}
            exit={{
                opacity: 0,
                scale: 1.05,
                y: -30
            }}
            className="mx-auto max-w-4xl"
        >

            {/* HABITACIÓN */}

            <div className="relative overflow-hidden rounded-[2rem] border border-slate-700 bg-gradient-to-b from-slate-800 to-slate-950 shadow-2xl">

                {/* LUCES */}

                <div className="absolute left-1/2 top-0 h-32 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />

                <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-purple-600/10 blur-3xl" />

                {/* PARED */}

                <div className="relative min-h-[550px] p-6 md:p-12">

                    {/* LUZ SUPERIOR */}

                    <div className="absolute left-1/2 top-6 h-2 w-32 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.8)]" />

                    {/* TEXTO */}

                    <div className="relative z-10 text-center">

                    <p className="text-xs font-bold uppercase tracking-[0.4em] text-cyan-400">
                        {question.room}
                    </p>

                        <h1 className="mt-3 text-3xl font-black md:text-4xl">

                            Desbloquea la puerta

                        </h1>

                    </div>

                    {/* PUERTA */}

                    <div className="relative mx-auto mt-10 w-full max-w-sm">

                        <motion.div
                            animate={
                                correct
                                    ? {
                                        scale: [1, 1.03, 1],
                                        boxShadow: [
                                            "0 0 0 rgba(34,211,238,0)",
                                            "0 0 80px rgba(34,211,238,0.5)",
                                            "0 0 0 rgba(34,211,238,0)"
                                        ]
                                    }
                                    : {}
                            }
                            transition={{
                                duration: 1
                            }}
                            className={`
                                relative
                                overflow-hidden
                                rounded-t-[4rem]
                                border-4
                                p-6
                                pt-10
                                transition-all
                                duration-500

                                ${
                                    correct
                                        ? "border-cyan-400 bg-cyan-950/40"
                                        : "border-slate-600 bg-slate-900"
                                }
                            `}
                        >

                            {/* MARCO */}

                            <div className="absolute inset-3 rounded-t-[3.5rem] border border-slate-700" />

                            {/* PUERTA */}

                            <div className="relative z-10 flex flex-col items-center">

                                <motion.div
                                    animate={
                                        correct
                                            ? {
                                                rotate: 360,
                                                scale: 1.15
                                            }
                                            : {
                                                rotate: 0,
                                                scale: 1
                                            }
                                    }
                                    transition={{
                                        duration: 0.8
                                    }}
                                    className={`
                                        flex
                                        h-24
                                        w-24
                                        items-center
                                        justify-center
                                        rounded-full
                                        border-4

                                        ${
                                            correct
                                                ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                                                : "border-slate-600 bg-slate-800 text-slate-500"
                                        }
                                    `}
                                >

                                    {correct
                                        ? <FaKey size={35} />
                                        : <FaLock size={35} />
                                    }

                                </motion.div>

                                <div className="mt-8 h-40 w-64 rounded-t-3xl border-2 border-slate-700 bg-slate-950">

                                    <div className="flex h-full items-center justify-center">

                                        <div className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)]" />

                                    </div>

                                </div>

                            </div>

                        </motion.div>

                    </div>

                    {/* PANEL */}

                    <div className="relative z-20 mx-auto -mt-5 max-w-2xl rounded-3xl border border-slate-700 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-xl md:p-8">

                        <p className="mb-3 text-center text-sm font-semibold text-slate-500">

                            CÓDIGO DE ACCESO

                        </p>

                        <h2 className="text-center text-3xl font-black md:text-4xl">

                            {question.question}

                        </h2>

                        <form
                            onSubmit={handleSubmit}
                            className="mt-8"
                        >

                            <div className="flex flex-col gap-3 sm:flex-row">

                                <input
                                    type="number"
                                    value={answer}
                                    onChange={(event) =>
                                        setAnswer(event.target.value)
                                    }
                                    disabled={disabled}
                                    autoFocus
                                    placeholder="Escribe tu respuesta"
                                    className={`
                                        min-w-0
                                        flex-1
                                        rounded-2xl
                                        border
                                        bg-slate-900
                                        px-5
                                        py-4
                                        text-center
                                        text-xl
                                        font-bold
                                        outline-none
                                        transition

                                        ${
                                            answered
                                                ? correct
                                                    ? "border-emerald-400 text-emerald-300"
                                                    : "border-red-400 text-red-300"
                                                : "border-slate-700 focus:border-cyan-400"
                                        }
                                    `}
                                />

                                <motion.button
                                    type="submit"
                                    disabled={
                                        disabled ||
                                        !answer.trim()
                                    }
                                    whileHover={{
                                        scale: 1.03
                                    }}
                                    whileTap={{
                                        scale: 0.96
                                    }}
                                    className="flex items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-7 py-4 font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                                >

                                    VERIFICAR

                                    <FaArrowRight />

                                </motion.button>

                            </div>

                        </form>

                        {/* FEEDBACK */}

                        {answered && (

                            <motion.div
                                initial={{
                                    opacity: 0,
                                    y: 10
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0
                                }}
                                className={`
                                    mt-5
                                    rounded-2xl
                                    p-4
                                    text-center
                                    font-bold

                                    ${
                                        correct
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : "bg-red-500/10 text-red-400"
                                    }
                                `}
                            >

                                {correct
                                    ? "🔓 ¡PUERTA DESBLOQUEADA!"
                                    : `❌ La respuesta era ${question.answer}`
                                }

                            </motion.div>

                        )}

                    </div>

                </div>

            </div>

        </motion.div>
    );
}