import { useState } from "react";

import { motion } from "framer-motion";

import {
    FaLock,
    FaKey,
    FaBolt
} from "react-icons/fa";

import { PiKeyholeFill } from "react-icons/pi"; // Phosphor Icons, más simple/estilizado

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

        <div className="
            relative
            flex
            h-[calc(100vh-145px)]
            min-h-[480px]
            w-full
            items-center
            justify-center
            overflow-hidden
            px-3
            sm:px-5
        ">

            {/* ========================================= */}
            {/* FONDO */}
            {/* ========================================= */}

            <div
                className="
                    pointer-events-none
                    absolute
                    inset-0
                    opacity-20
                "
                style={{
                    backgroundImage: `
                        linear-gradient(
                            rgba(34,211,238,0.10) 1px,
                            transparent 1px
                        ),
                        linear-gradient(
                            90deg,
                            rgba(34,211,238,0.10) 1px,
                            transparent 1px
                        )
                    `,
                    backgroundSize: "45px 45px"
                }}
            />


            {/* ========================================= */}
            {/* GLOW */}
            {/* ========================================= */}

            <motion.div
                animate={{
                    opacity: [0.08, 0.18, 0.08],
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity
                }}
                className="
                    pointer-events-none
                    absolute
                    left-1/2
                    top-1/2
                    h-[400px]
                    w-[400px]
                    -translate-x-1/2
                    -translate-y-1/2
                    rounded-full
                    bg-cyan-500/10
                    blur-[100px]
                "
            />


            {/* ========================================= */}
            {/* PUERTA */}
            {/* ========================================= */}

            <motion.div
                initial={{
                    opacity: 0,
                    scale: 0.97,
                    y: 15
                }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0
                }}
                transition={{
                    duration: 0.45
                }}
                className="
                    relative
                    h-[94%]
                    max-h-[610px]
                    w-full
                    max-w-[620px]
                "
            >


                {/* ===================================== */}
                {/* MARCO EXTERIOR */}
                {/* ===================================== */}

                <div className="
                    absolute
                    inset-0
                    rounded-[2rem]
                    border-[5px]
                    border-slate-700
                    bg-gradient-to-b
                    from-slate-500
                    via-slate-800
                    to-slate-950
                    p-[6px]
                    shadow-[0_25px_70px_rgba(0,0,0,0.8)]
                ">


                    {/* ================================= */}
                    {/* HOJA DE PUERTA */}
                    {/* ================================= */}

                    <div className="
                        relative
                        h-full
                        w-full
                        overflow-hidden
                        rounded-[1.6rem]
                        border
                        border-slate-600
                        bg-gradient-to-b
                        from-slate-800
                        via-slate-900
                        to-[#05070a]
                    ">


                        {/* ================================= */}
                        {/* PANEL SUPERIOR — PREGUNTA */}
                        {/* ================================= */}

                        <div className="
                            absolute
                            left-1/2
                            top-5
                            z-20
                            w-[82%]
                            -translate-x-1/2
                        ">

                            <div className="
                                rounded-xl
                                border
                                border-slate-600
                                bg-slate-950
                                px-4
                                py-3
                                text-center
                                shadow-[0_8px_25px_rgba(0,0,0,0.45)]
                            ">


                                {/* LABEL */}

                                <div className="
                                    mb-1.5
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                ">

                                    <FaBolt className="
                                        text-[9px]
                                        text-cyan-400
                                    " />

                                    <span className="
                                        text-[10px]
                                        font-black
                                        uppercase
                                        tracking-[0.3em]
                                        text-cyan-400
                                    ">

                                        CÓDIGO DE ACCESO

                                    </span>

                                </div>


                                {/* PREGUNTA */}

                                <p className="
                                    text-[28px]
                                    font-black
                                    leading-tight
                                    text-white
                                ">

                                    {question.question}

                                </p>

                            </div>

                        </div>



                        {/* ================================= */}
                        {/* PANEL CENTRAL DE LA PUERTA */}
                        {/* ================================= */}

                        <div className="
                            absolute
                            inset-x-8
                            bottom-8
                            top-[27%]
                            rounded-xl
                            border
                            border-slate-700/60
                            bg-black/10
                        ">


                            {/* ================================= */}
                            {/* CANDADO */}
                            {/* ================================= */}

                            <div className="
                                absolute
                                top-2/4
                                z-20
                                -translate-y-1/2
                            " style={{
                                right: "-35px",
                                marginTop: "15px"
                            }}>

                                <motion.div
                                    animate={
                                        correct
                                            ? {
                                                scale: [1, 1.08, 1]
                                            }
                                            : {
                                                scale: 1
                                            }
                                    }
                                    transition={{
                                        duration: 0.5
                                    }}
                                    className="
                                        relative
                                        flex
                                        h-24
                                        w-20
                                        items-center
                                        justify-center
                                    "
                                >

                                    {/* ================================= */}
                                    {/* ARGOLLA DEL CANDADO */}
                                    {/* ================================= */}

                                    <motion.div
                                        animate={
                                            correct
                                                ? {
                                                    rotate: -35,
                                                    x: 7,
                                                    y: -4
                                                }
                                                : {
                                                    rotate: 0,
                                                    x: 0,
                                                    y: 0
                                                }
                                        }
                                        transition={{
                                            duration: 0.55,
                                            type: "spring",
                                            stiffness: 180,
                                            damping: 12
                                        }}
                                        className={`
                                            absolute
                                            -top-1
                                            left-1/2
                                            h-9
                                            w-10
                                            -translate-x-1/2
                                            rounded-t-full
                                            border-[6px]
                                            border-b-0

                                            ${
                                                correct
                                                    ? "border-emerald-400"
                                                    : "border-slate-400"
                                            }
                                        `}
                                    />


                                    {/* ================================= */}
                                    {/* CUERPO DEL CANDADO */}
                                    {/* ================================= */}

                                    <motion.div
                                        animate={
                                            correct
                                                ? {
                                                    scale: [1, 1.05, 1]
                                                }
                                                : {
                                                    scale: 1
                                                }
                                        }
                                        transition={{
                                            duration: 0.5
                                        }}
                                        className={`
                                            relative
                                            z-10
                                            flex
                                            h-14
                                            w-14
                                            items-center
                                            justify-center
                                            rounded-xl
                                            border-2
                                            bg-yellow-700

                                            ${
                                                correct
                                                    ? `
                                                        border-emerald-400
                                                        bg-emerald-400
                                                        shadow-[0_0_30px_rgba(52,211,153,0.45)]
                                                    `
                                                    : `
                                                        border-slate-400
                                                        bg-slate-800
                                                        shadow-[0_5px_20px_rgba(0,0,0,0.5)]
                                                    `
                                            }
                                        `}
                                    >

                                        {/* ================================= */}
                                        {/* CANDADO CERRADO */}
                                        {/* ================================= */}

                                        {!correct && (

                                            <motion.div
                                                initial={{
                                                    scale: 1
                                                }}
                                                animate={{
                                                    scale: [1, 1.08, 1]
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity
                                                }}
                                                className="
                                                    text-slate-300
                                                "
                                            >

                                                <PiKeyholeFill  size={28} />

                                            </motion.div>

                                        )}


                                        {/* ================================= */}
                                        {/* CANDADO ABIERTO + LLAVE */}
                                        {/* ================================= */}

                                        {correct && (

                                            <motion.div
                                                initial={{
                                                    opacity: 0,
                                                    scale: 0.3,
                                                    rotate: -90
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    scale: [0.8, 1.15, 1],
                                                    rotate: [
                                                        -90,
                                                        0,
                                                        20,
                                                        -15,
                                                        10,
                                                        0
                                                    ]
                                                }}
                                                transition={{
                                                    duration: 1.2,
                                                    ease: "easeOut"
                                                }}
                                                className="
                                                    relative
                                                    z-20
                                                "
                                            >

                                                <FaKey size={23} />

                                            </motion.div>

                                        )}

                                    </motion.div>


                                    {/* ================================= */}
                                    {/* PEQUEÑO DESTELLO AL DESBLOQUEAR */}
                                    {/* ================================= */}

                                    {correct && (

                                        <motion.div
                                            initial={{
                                                opacity: 0,
                                                scale: 0.3
                                            }}
                                            animate={{
                                                opacity: [0, 1, 0],
                                                scale: [0.5, 1.5, 2]
                                            }}
                                            transition={{
                                                duration: 0.8
                                            }}
                                            className="
                                                pointer-events-none
                                                absolute
                                                inset-0
                                                rounded-full
                                                bg-emerald-400/20
                                                blur-xl
                                            "
                                        />

                                    )}

                                </motion.div>

                            </div>



                            {/* ================================= */}
                            {/* MANIJA */}
                            {/* ================================= */}

                            <div className="
                                absolute
                                right-[-3px]
                                top-1/3
                                -translate-y-1/2
                            ">

                                <div className="
                                    h-20
                                    w-4
                                    rounded-full
                                    bg-gradient-to-b
                                    from-slate-600
                                    via-slate-300
                                    to-slate-700
                                    shadow-[0_0_15px_rgba(148,163,184,0.15)]
                                " />

                            </div>



                            {/* ================================= */}
                            {/* DISPLAY */}
                            {/* ================================= */}

                            <div className="
                                absolute
                                left-1/2
                                top-[4%]
                                w-[55%]
                                -translate-x-1/2
                            ">

                                <motion.div
                                    animate={
                                        correct
                                            ? {
                                                scale: [1, 1.04, 1]
                                            }
                                            : {}
                                    }
                                    className={`
                                        flex
                                        h-11
                                        items-center
                                        justify-center
                                        rounded-lg
                                        border
                                        bg-black

                                        ${
                                            correct
                                                ? "border-yellow-400/60"
                                                : "border-cyan-500/30"
                                        }
                                    `}
                                >

                                    <span className={`
                                        font-mono
                                        text-xl
                                        font-black
                                        tracking-[0.35em]

                                        ${
                                            correct
                                                ? "text-yellow-400"
                                                : "text-cyan-400"
                                        }
                                    `}>

                                        {answer || "----"}

                                    </span>

                                </motion.div>

                            </div>



                            {/* ================================= */}
                            {/* NUMBER PAD */}
                            {/* ================================= */}

                            <div className="
                                absolute
                                bottom-[9%]
                                left-1/2
                                w-[58%]
                                -translate-x-1/2
                            ">

                                <NumberPad
                                    value={answer}
                                    onChange={setAnswer}
                                    onSubmit={submitAnswer}
                                    disabled={disabled}
                                />

                            </div>



                            {/* ================================= */}
                            {/* DETALLE DE PUERTA */}
                            {/* ================================= */}

                            <div className="
                                absolute
                                bottom-3
                                left-1/2
                                h-px
                                w-[65%]
                                -translate-x-1/2
                                bg-slate-700
                            " />


                        </div>



                        {/* ================================= */}
                        {/* BISAGRAS */}
                        {/* ================================= */}

                        <div className="
                            absolute
                            left-0
                            top-[32%]
                            h-9
                            w-3
                            rounded-r-md
                            bg-slate-600
                        " />

                        <div className="
                            absolute
                            bottom-[32%]
                            left-0
                            h-9
                            w-3
                            rounded-r-md
                            bg-slate-600
                        " />


                        {/* ================================= */}
                        {/* LUZ DE ESTADO */}
                        {/* ================================= */}

                        <motion.div
                            animate={
                                correct
                                    ? {
                                        opacity: [0.3, 1, 0.3]
                                    }
                                    : {
                                        opacity: 0.25
                                    }
                            }
                            transition={{
                                duration: 1,
                                repeat: correct ? Infinity : 0
                            }}
                            className={`
                                absolute
                                bottom-2
                                left-1/2
                                h-1
                                w-[45%]
                                -translate-x-1/2
                                rounded-full

                                ${
                                    correct
                                        ? "bg-green-400 shadow-[0_0_30px_rgba(52,211,153,0.45)]"
                                        : "bg-cyan-400"
                                }
                            `}
                        />


                    </div>

                </div>


                {/* ========================================= */}
                {/* ETIQUETA EXTERIOR */}
                {/* ========================================= */}

                <div className="
                    absolute
                    -bottom-5
                    left-1/2
                    -translate-x-1/2
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[0.3em]
                ">

                    <span className={
                        correct
                            ? "text-green-400"
                            : "text-slate-600"
                    }>

                        {correct
                            ? "LOCK RELEASED"
                            : "LOCKED"
                        }

                    </span>

                </div>


            </motion.div>

        </div>

    );

}