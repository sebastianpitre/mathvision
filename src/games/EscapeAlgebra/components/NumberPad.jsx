import { motion } from "framer-motion";
import {
    FaBackspace,
    FaCheck
} from "react-icons/fa";

import { playSound } from "./GameAudio";

const numbers = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9"
];

export default function NumberPad({
    value,
    onChange,
    onSubmit,
    disabled
}) {

    const addNumber = (number) => {

        if (disabled) {
            return;
        }

        if (value.length >= 4) {
            return;
        }

        playSound("click", 0.25);

        onChange(value + number);
    };


    const removeNumber = () => {

        if (disabled) {
            return;
        }

        playSound("click", 0.25);

        onChange(value.slice(0, -1));
    };


    const addZero = () => {

        if (disabled) {
            return;
        }

        if (value.length >= 4) {
            return;
        }

        playSound("click", 0.25);

        onChange(value + "0");
    };


    const buttonClass = `
        flex
        h-16
        items-center
        justify-center
        rounded-2xl
        border
        border-slate-700
        bg-slate-800
        text-xl
        font-black
        transition
        hover:border-cyan-400
        hover:bg-slate-700
        active:scale-95
        md:h-20
    `;


    return (

        <div className="mx-auto mt-6 w-full max-w-sm">

            {/* DISPLAY */}

            <div className="mb-4 flex h-20 items-center justify-center rounded-2xl border border-cyan-500/30 bg-slate-950">

                <motion.span
                    key={value}
                    initial={{
                        scale: 0.8,
                        opacity: 0
                    }}
                    animate={{
                        scale: 1,
                        opacity: 1
                    }}
                    className={`
                        text-4xl
                        font-black

                        ${
                            value
                                ? "text-cyan-400"
                                : "text-slate-700"
                        }
                    `}
                >

                    {value || "?"}

                </motion.span>

            </div>


            {/* TECLADO */}

            <div className="grid grid-cols-3 gap-3">

                {numbers.map((number) => (

                    <motion.button
                        key={number}
                        type="button"
                        whileTap={{
                            scale: 0.9
                        }}
                        disabled={disabled}
                        onClick={() =>
                            addNumber(number)
                        }
                        className={buttonClass}
                    >

                        {number}

                    </motion.button>

                ))}


                {/* BORRAR */}

                <motion.button
                    type="button"
                    whileTap={{
                        scale: 0.9
                    }}
                    disabled={disabled}
                    onClick={removeNumber}
                    className={`${buttonClass} text-red-400`}
                >

                    <FaBackspace />

                </motion.button>


                {/* CERO */}

                <motion.button
                    type="button"
                    whileTap={{
                        scale: 0.9
                    }}
                    disabled={disabled}
                    onClick={addZero}
                    className={buttonClass}
                >

                    0

                </motion.button>


                {/* CONFIRMAR */}

                <motion.button
                    type="button"
                    whileTap={{
                        scale: 0.9
                    }}
                    disabled={
                        disabled ||
                        !value
                    }
                    onClick={onSubmit}
                    className="
                        flex
                        h-16
                        items-center
                        justify-center
                        rounded-2xl
                        bg-cyan-500
                        text-slate-950
                        transition
                        hover:bg-cyan-400
                        disabled:cursor-not-allowed
                        disabled:opacity-30
                        md:h-20
                    "
                >

                    <FaCheck size={22} />

                </motion.button>

            </div>

        </div>

    );
}