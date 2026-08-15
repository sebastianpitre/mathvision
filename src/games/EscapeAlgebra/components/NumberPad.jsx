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

        if (disabled || value.length >= 4) {
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

        if (disabled || value.length >= 4) {
            return;
        }

        playSound("click", 0.25);

        onChange(value + "0");
    };


    const buttonClass = `
        flex
        h-9
        items-center
        justify-center
        rounded-lg
        border
        border-slate-700
        bg-slate-900
        font-mono
        text-sm
        font-black
        text-slate-200
        transition-all
        duration-150

        hover:border-cyan-400
        hover:bg-cyan-500/10
        hover:text-cyan-400

        active:scale-90

        sm:h-10
        sm:text-base
    `;


    return (

        <div className="
            mx-auto
            w-full
        ">

            {/* KEYPAD */}

            <div className="
                rounded-2xl
                border
                border-slate-700
                bg-black/50
                p-2
                shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]
                sm:p-3
            ">

                {/* LABEL */}

                <div className="
                    mb-2
                    flex
                    items-center
                    justify-between
                ">

                    <span className="
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.3em]
                        text-slate-600
                    ">

                        Numeric keypad

                    </span>

                    <span className="
                        h-1.5
                        w-1.5
                        rounded-full
                        bg-cyan-400
                        shadow-[0_0_10px_#22d3ee]
                    " />

                </div>


                {/* BUTTONS */}

                <div className="
                    grid
                    grid-cols-3
                    gap-1.5
                    sm:gap-2
                ">

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


                    {/* DELETE */}

                    <motion.button
                        type="button"
                        whileTap={{
                            scale: 0.9
                        }}
                        disabled={disabled}
                        onClick={removeNumber}
                        className={`
                            ${buttonClass}
                            text-red-400
                            hover:border-red-400
                            hover:bg-red-500/10
                        `}
                    >

                        <FaBackspace />

                    </motion.button>


                    {/* ZERO */}

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


                    {/* ENTER */}

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
                            h-9
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-cyan-400
                            bg-cyan-500
                            text-slate-950
                            transition-all

                            hover:bg-cyan-400

                            active:scale-90

                            disabled:cursor-not-allowed
                            disabled:opacity-30

                            sm:h-10
                        "
                    >

                        <FaCheck size={14} />

                    </motion.button>

                </div>

            </div>

        </div>

    );
}