import { motion } from "framer-motion";

import {
    FaCheck,
    FaTimes
} from "react-icons/fa";


const LETTERS = [
    "A",
    "B",
    "C",
    "D"
];


export default function QuestionCard({

    question,

    questionNumber,

    prize,

    onAnswer,

    selectedAnswer,

    disabled,

    hiddenOptions = []

}) {

    if (!question) {
        return null;
    }


    return (

        <motion.section
            initial={{
                opacity: 0,
                y: 20
            }}
            animate={{
                opacity: 1,
                y: 0
            }}
            exit={{
                opacity: 0,
                y: -20
            }}
            transition={{
                duration: 0.35
            }}
            className="
                flex
                h-full
                w-full
                flex-col
                justify-center
            "
        >


            {/* =================================================
                CONTENEDOR
            ================================================= */}

            <div className="
                mx-auto
                flex
                w-full
                max-w-4xl
                flex-col
                gap-5
                px-4
                py-4
                sm:gap-6
                sm:px-6
            ">


                {/* =================================================
                    INFORMACIÓN SUPERIOR
                ================================================= */}

                <div className="
                    text-center
                ">

                    <p className="
                        text-[10px]
                        font-black
                        uppercase
                        tracking-[0.3em]
                        text-blue-400
                    ">

                        Pregunta {questionNumber}

                    </p>


                    <p className="
                        mt-2
                        text-sm
                        font-bold
                        text-slate-400
                    ">

                        Responde correctamente por{" "}

                        <span className="
                            font-black
                            text-yellow-400
                        ">

                            ${prize.toLocaleString("es-CO")}

                        </span>

                    </p>

                </div>


                {/* =================================================
                    PREGUNTA
                ================================================= */}

                <motion.div
                    initial={{
                        scale: 0.97
                    }}
                    animate={{
                        scale: 1
                    }}
                    className="
                        relative
                        overflow-hidden
                        rounded-2xl
                        border
                        border-blue-400/20
                        bg-slate-900/80
                        px-5
                        py-7
                        text-center
                        shadow-2xl
                        backdrop-blur-xl
                        sm:px-10
                        sm:py-9
                    "
                >

                    {/* LÍNEA DECORATIVA */}

                    <div className="
                        absolute
                        left-1/2
                        top-0
                        h-1
                        w-32
                        -translate-x-1/2
                        rounded-full
                        bg-gradient-to-r
                        from-blue-500
                        via-purple-400
                        to-blue-500
                    " />


                    <h2 className="
                        text-lg
                        font-black
                        leading-relaxed
                        text-white
                        sm:text-2xl
                        md:text-3xl
                    ">

                        {question.question}

                    </h2>

                </motion.div>


                {/* =================================================
                    RESPUESTAS
                ================================================= */}

                <div className="
                    grid
                    grid-cols-1
                    gap-3
                    sm:grid-cols-2
                    sm:gap-4
                ">


                    {question.options.map(
                        (option, index) => {

                            const isHidden =
                                hiddenOptions.includes(
                                    option
                                );


                            const isSelected =
                                selectedAnswer ===
                                option;


                            const isCorrect =
                                option ===
                                question.answer;


                            const showCorrect =
                                selectedAnswer &&
                                isCorrect;


                            const showWrong =
                                selectedAnswer &&
                                isSelected &&
                                !isCorrect;


                            return (

                                <motion.button
                                    key={option}
                                    whileHover={
                                        !disabled &&
                                        !isHidden
                                            ? {
                                                scale: 1.015,
                                                x: 2
                                            }
                                            : {}
                                    }
                                    whileTap={
                                        !disabled &&
                                        !isHidden
                                            ? {
                                                scale: 0.98
                                            }
                                            : {}
                                    }
                                    onClick={() =>
                                        onAnswer(
                                            option
                                        )
                                    }
                                    disabled={
                                        disabled ||
                                        isHidden
                                    }
                                    className={`
                                        relative
                                        flex
                                        min-h-16
                                        items-center
                                        gap-4
                                        overflow-hidden
                                        rounded-xl
                                        border
                                        px-4
                                        py-3
                                        text-left
                                        transition-all

                                        ${
                                            isHidden
                                                ? `
                                                    cursor-not-allowed
                                                    border-slate-900
                                                    bg-slate-950
                                                    opacity-25
                                                `
                                                : showCorrect
                                                    ? `
                                                        border-emerald-400/60
                                                        bg-emerald-500/15
                                                        text-emerald-200
                                                    `
                                                    : showWrong
                                                        ? `
                                                            border-red-400/60
                                                            bg-red-500/15
                                                            text-red-200
                                                        `
                                                        : `
                                                            border-blue-400/15
                                                            bg-slate-900/70
                                                            text-slate-200
                                                            hover:border-blue-400/50
                                                            hover:bg-blue-500/10
                                                        `
                                        }
                                    `}
                                >


                                    {/* LETRA */}

                                    <span className={`
                                        flex
                                        h-9
                                        w-9
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-lg
                                        text-xs
                                        font-black

                                        ${
                                            showCorrect
                                                ? "bg-emerald-400 text-slate-950"
                                                : showWrong
                                                    ? "bg-red-400 text-slate-950"
                                                    : "bg-blue-500/10 text-blue-300"
                                        }
                                    `}>

                                        {showCorrect
                                            ? <FaCheck size={12} />
                                            : showWrong
                                                ? <FaTimes size={12} />
                                                : LETTERS[index]
                                        }

                                    </span>


                                    {/* TEXTO */}

                                    <span className="
                                        text-sm
                                        font-bold
                                        sm:text-base
                                    ">

                                        {option}

                                    </span>


                                    {/* BRILLO */}

                                    {!disabled &&
                                        !isHidden && (

                                            <div className="
                                                pointer-events-none
                                                absolute
                                                inset-0
                                                bg-gradient-to-r
                                                from-transparent
                                                via-white/[0.03]
                                                to-transparent
                                            " />

                                        )
                                    }

                                </motion.button>

                            );

                        }
                    )}

                </div>

            </div>

        </motion.section>

    );

}