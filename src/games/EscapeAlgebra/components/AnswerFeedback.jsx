import { motion } from "framer-motion";
import { FaCheck, FaTimes } from "react-icons/fa";

export default function AnswerFeedback({ correct }) {

    return (

        <motion.div
            initial={{
                opacity: 0,
                scale: 0.7,
                y: 20
            }}
            animate={{
                opacity: 1,
                scale: 1,
                y: 0
            }}
            exit={{
                opacity: 0,
                scale: 0.8
            }}
            className={`
                fixed
                left-1/2
                top-1/2
                z-50
                -translate-x-1/2
                -translate-y-1/2
                rounded-3xl
                border
                px-10
                py-8
                text-center
                shadow-2xl
                backdrop-blur-xl

                ${
                    correct
                        ? "border-emerald-400/40 bg-emerald-950/90"
                        : "border-red-400/40 bg-red-950/90"
                }
            `}
        >

            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                    delay: 0.1,
                    type: "spring"
                }}
                className={`
                    mx-auto
                    mb-4
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-full

                    ${
                        correct
                            ? "bg-emerald-400 text-emerald-950"
                            : "bg-red-400 text-red-950"
                    }
                `}
            >

                {correct
                    ? <FaCheck size={28} />
                    : <FaTimes size={28} />
                }

            </motion.div>

            <h2 className="text-2xl font-black">

                {correct
                    ? "¡Respuesta correcta!"
                    : "Respuesta incorrecta"
                }

            </h2>

            <p className="mt-2 text-sm text-slate-300">

                {correct
                    ? "+100 XP"
                    : "Has perdido una vida"
                }

            </p>

        </motion.div>

    );
}