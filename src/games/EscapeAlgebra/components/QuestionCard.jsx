import { useState } from "react";
import { motion } from "framer-motion";
import {
    FaLock,
    FaKey
} from "react-icons/fa";

import NumberPad from "./NumberPad";

export default function QuestionCard({
    question,
    onAnswer,
    selectedAnswer,
    disabled
}) {

    const [answer, setAnswer] = useState("");

    const correct =
        selectedAnswer &&
        String(selectedAnswer) ===
        String(question.answer);


    const submitAnswer = () => {

        if (!answer || disabled) {
            return;
        }

        onAnswer(answer);

    };


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

            <div className="relative overflow-hidden rounded-[2rem] border border-slate-700 bg-gradient-to-b from-slate-800 to-slate-950 shadow-2xl">

                <div className="absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />


                <div className="relative min-h-[600px] p-6 md:p-10">


                    <div className="text-center">

                        <p className="text-xs font-bold uppercase tracking-[0.4em] text-cyan-400">

                            {question.room}

                        </p>

                        <h1 className="mt-3 text-3xl font-black md:text-4xl">

                            Desbloquea la puerta

                        </h1>

                    </div>


                    {/* PUERTA */}

                    <div className="mx-auto mt-10 w-full max-w-sm">

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

                                ${
                                    correct
                                        ? "border-cyan-400 bg-cyan-950/40"
                                        : "border-slate-600 bg-slate-900"
                                }
                            `}
                        >

                            <div className="absolute inset-3 rounded-t-[3.5rem] border border-slate-700" />

                            <div className="relative z-10 flex flex-col items-center">

                                <motion.div
                                    animate={
                                        correct
                                            ? {
                                                rotate: 360,
                                                scale: 1.15
                                            }
                                            : {}
                                    }
                                    transition={{
                                        duration: 0.8
                                    }}
                                    className={`
                                        flex
                                        h-20
                                        w-20
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
                                        ? <FaKey size={30} />
                                        : <FaLock size={30} />
                                    }

                                </motion.div>


                                <div className="mt-8 h-36 w-60 rounded-t-3xl border-2 border-slate-700 bg-slate-950">

                                    <div className="flex h-full items-center justify-center">

                                        <div className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)]" />

                                    </div>

                                </div>

                            </div>

                        </motion.div>

                    </div>


                    {/* PANEL */}

                    <div className="relative z-20 mx-auto -mt-4 max-w-2xl rounded-3xl border border-slate-700 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-xl md:p-8">

                        <p className="text-center text-xs font-bold uppercase tracking-[0.3em] text-slate-500">

                            Selecciona tu respuesta

                        </p>


                        <h2 className="mt-3 text-center text-3xl font-black md:text-4xl">

                            {question.question}

                        </h2>


                        <NumberPad
                            value={answer}
                            onChange={setAnswer}
                            onSubmit={submitAnswer}
                            disabled={disabled}
                        />


                        {selectedAnswer && (

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