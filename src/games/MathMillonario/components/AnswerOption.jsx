import { motion } from "framer-motion";

export default function AnswerOption({
    letter,
    text,
    onClick,
    disabled,
    selected,
    correct,
    incorrect,
    hidden
}) {

    if (hidden) {
        return (
            <div className="
                h-16
                rounded-xl
                border
                border-slate-800
                bg-slate-900/30
                opacity-20
            " />
        );
    }


    return (

        <motion.button
            whileHover={
                !disabled
                    ? {
                        scale: 1.02,
                        x: 4
                    }
                    : {}
            }
            whileTap={
                !disabled
                    ? {
                        scale: 0.98
                    }
                    : {}
            }
            onClick={onClick}
            disabled={disabled}
            className={`
                group
                relative
                flex
                min-h-16
                w-full
                items-center
                gap-4
                rounded-xl
                border
                px-5
                text-left
                transition-all

                ${
                    correct
                        ? "border-emerald-400 bg-emerald-500/15 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.15)]"

                        : incorrect
                            ? "border-red-400 bg-red-500/15 text-red-300"

                            : selected
                                ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"

                                : "border-slate-700 bg-slate-900/80 text-slate-200 hover:border-yellow-500/50 hover:bg-slate-800"
                }

                ${
                    disabled
                        ? "cursor-default"
                        : "cursor-pointer"
                }
            `}
        >

            <span className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-full
                border
                border-slate-600
                bg-slate-800
                text-sm
                font-black
                text-yellow-400
            ">
                {letter}
            </span>


            <span className="
                flex-1
                text-sm
                font-bold
                sm:text-base
            ">
                {text}
            </span>

        </motion.button>

    );

}