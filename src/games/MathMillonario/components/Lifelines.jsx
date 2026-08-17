import { motion } from "framer-motion";
import {
    FaUsers,
    FaExchangeAlt
} from "react-icons/fa";

export default function Lifelines({
    fiftyFiftyUsed,
    publicUsed,
    changeQuestionUsed,
    onFiftyFifty,
    onPublic,
    onChangeQuestion,
    disabled
}) {

    const buttonBase = `
        flex
        h-11
        items-center
        justify-center
        gap-2
        rounded-full
        border
        px-4
        text-xs
        font-black
        transition
    `;


    return (

        <div className="
            flex
            flex-wrap
            justify-center
            gap-3
        ">


            {/* 50 / 50 */}

            <motion.button
                whileHover={!disabled && !fiftyFiftyUsed
                    ? { scale: 1.05 }
                    : {}
                }
                whileTap={!disabled && !fiftyFiftyUsed
                    ? { scale: 0.95 }
                    : {}
                }
                onClick={onFiftyFifty}
                disabled={
                    disabled ||
                    fiftyFiftyUsed
                }
                className={`
                    ${buttonBase}

                    ${
                        fiftyFiftyUsed
                            ? "border-slate-800 bg-slate-900 text-slate-700"
                            : "border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                    }
                `}
            >

                <span className="text-lg">
                    50:50
                </span>

            </motion.button>


            {/* PÚBLICO */}

            <motion.button
                whileHover={!disabled && !publicUsed
                    ? { scale: 1.05 }
                    : {}
                }
                whileTap={!disabled && !publicUsed
                    ? { scale: 0.95 }
                    : {}
                }
                onClick={onPublic}
                disabled={
                    disabled ||
                    publicUsed
                }
                className={`
                    ${buttonBase}

                    ${
                        publicUsed
                            ? "border-slate-800 bg-slate-900 text-slate-700"
                            : "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                    }
                `}
            >

                <FaUsers />

                Público

            </motion.button>


            {/* CAMBIAR */}

            <motion.button
                whileHover={!disabled && !changeQuestionUsed
                    ? { scale: 1.05 }
                    : {}
                }
                whileTap={!disabled && !changeQuestionUsed
                    ? { scale: 0.95 }
                    : {}
                }
                onClick={onChangeQuestion}
                disabled={
                    disabled ||
                    changeQuestionUsed
                }
                className={`
                    ${buttonBase}

                    ${
                        changeQuestionUsed
                            ? "border-slate-800 bg-slate-900 text-slate-700"
                            : "border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                    }
                `}
            >

                <FaExchangeAlt />

                Cambiar

            </motion.button>

        </div>

    );

}