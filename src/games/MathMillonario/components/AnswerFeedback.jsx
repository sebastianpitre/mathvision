import { motion } from "framer-motion";
import {
    FaCheck,
    FaTimes
} from "react-icons/fa";

export default function AnswerFeedback({
    correct,
    message
}) {

    return (

        <motion.div
            initial={{
                opacity: 0,
                y: 15,
                scale: 0.9
            }}
            animate={{
                opacity: 1,
                y: 0,
                scale: 1
            }}
            exit={{
                opacity: 0,
                y: -10,
                scale: 0.95
            }}
            transition={{
                duration: 0.25
            }}
            className="
                pointer-events-none
                absolute
                bottom-5
                left-1/2
                z-50
                -translate-x-1/2
            "
        >

            <div className={`
                flex
                items-center
                gap-3
                rounded-full
                border
                px-5
                py-3
                shadow-2xl
                backdrop-blur-xl

                ${
                    correct
                        ? `
                            border-emerald-400/30
                            bg-emerald-500/15
                            text-emerald-300
                        `
                        : `
                            border-red-400/30
                            bg-red-500/15
                            text-red-300
                        `
                }
            `}>

                <div className={`
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    rounded-full

                    ${
                        correct
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-red-400 text-slate-950"
                    }
                `}>

                    {correct
                        ? <FaCheck size={12} />
                        : <FaTimes size={12} />
                    }

                </div>


                <span className="
                    whitespace-nowrap
                    text-xs
                    font-black
                    uppercase
                    tracking-wider
                ">

                    {message ||
                        (
                            correct
                                ? "Respuesta correcta"
                                : "Respuesta incorrecta"
                        )
                    }

                </span>

            </div>

        </motion.div>

    );

}