import { motion } from "framer-motion";

import AnswerOption from "./AnswerOption";

const letters = ["A", "B", "C", "D"];

export default function MillionaireQuestion({
    question,
    questionNumber,
    currentMoney,
    nextMoney,
    selectedAnswer,
    correctAnswer,
    eliminatedAnswers,
    onAnswer
}) {

    return (

        <div className="
            flex
            h-full
            flex-col
        ">


            {/* MENSAJE DE PREMIO */}

            <motion.div
                key={question.id}
                initial={{
                    opacity: 0,
                    y: -10
                }}
                animate={{
                    opacity: 1,
                    y: 0
                }}
                className="
                    mb-5
                    text-center
                "
            >

                <p className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-[0.15em]
                    text-slate-400
                ">

                    Responde correctamente por{" "}

                    <span className="
                        font-black
                        text-yellow-400
                    ">
                        ${nextMoney.toLocaleString("es-CO")}
                    </span>

                    {" "}para acumular un total de{" "}

                    <span className="
                        font-black
                        text-emerald-400
                    ">
                        ${nextMoney.toLocaleString("es-CO")}
                    </span>

                </p>

            </motion.div>


            {/* PREGUNTA */}

            <motion.div
                key={`question-${question.id}`}
                initial={{
                    opacity: 0,
                    scale: 0.97
                }}
                animate={{
                    opacity: 1,
                    scale: 1
                }}
                className="
                    relative
                    mb-6
                    rounded-2xl
                    border
                    border-yellow-500/20
                    bg-slate-900/90
                    px-6
                    py-7
                    text-center
                    shadow-[0_0_40px_rgba(250,204,21,0.06)]
                "
            >

                <div className="
                    absolute
                    left-1/2
                    top-0
                    h-1
                    w-24
                    -translate-x-1/2
                    rounded-full
                    bg-gradient-to-r
                    from-yellow-400
                    to-orange-500
                " />


                <p className="
                    mb-3
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.3em]
                    text-yellow-400
                ">
                    Pregunta {questionNumber}
                </p>


                <h2 className="
                    text-lg
                    font-black
                    leading-relaxed
                    text-white
                    sm:text-xl
                    lg:text-2xl
                ">
                    {question.question}
                </h2>

            </motion.div>


            {/* RESPUESTAS */}

            <div className="
                grid
                gap-3
                md:grid-cols-2
            ">

                {question.options.map(
                    (option, index) => {

                        const letter =
                            letters[index];

                        const hidden =
                            eliminatedAnswers.includes(
                                index
                            );

                        const selected =
                            selectedAnswer === index;

                        const correct =
                            selectedAnswer !== null &&
                            index === correctAnswer;

                        const incorrect =
                            selected &&
                            index !== correctAnswer;

                        return (

                            <AnswerOption
                                key={letter}
                                letter={letter}
                                text={option}
                                onClick={() =>
                                    onAnswer(index)
                                }
                                disabled={
                                    selectedAnswer !== null
                                }
                                selected={selected}
                                correct={correct}
                                incorrect={incorrect}
                                hidden={hidden}
                            />

                        );

                    }
                )}

            </div>


            {/* DINERO ACTUAL */}

            <div className="
                mt-auto
                pt-5
                text-center
            ">

                <p className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.25em]
                    text-slate-600
                ">
                    Dinero acumulado
                </p>

                <p className="
                    mt-1
                    text-lg
                    font-black
                    text-emerald-400
                ">
                    ${currentMoney.toLocaleString("es-CO")}
                </p>

            </div>

        </div>

    );

}