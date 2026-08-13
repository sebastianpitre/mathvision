import { motion } from "framer-motion";
import { FaRocket, FaPlay } from "react-icons/fa";

export default function HeroBanner() {
    return (
        <motion.section
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-blue-950 to-purple-950 p-8 md:p-12 mb-10"
        >

            {/* Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.25, 0.45, 0.25]
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-500 blur-3xl"
            />

            <motion.div
                animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.15, 0.3, 0.15]
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-purple-600 blur-3xl"
            />

            <div className="relative z-10 max-w-3xl">

                <div className="flex items-center gap-3 mb-5">

                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
                        <FaRocket />
                    </span>

                    <span className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
                        MathVision
                    </span>

                </div>

                <h1 className="text-4xl md:text-6xl font-black leading-tight">
                    Convierte las
                    <span className="text-cyan-400"> matemáticas </span>
                    en una aventura.
                </h1>

                <p className="mt-5 max-w-2xl text-base md:text-lg text-slate-300">
                    Explora desafíos, supera misiones y desarrolla tus
                    habilidades matemáticas mientras avanzas por el universo
                    de MathVision.
                </p>

                <motion.button
                    whileHover={{
                        scale: 1.05,
                        boxShadow: "0 0 30px rgba(34,211,238,0.35)"
                    }}
                    whileTap={{ scale: 0.96 }}
                    className="mt-8 flex items-center gap-3 rounded-xl bg-cyan-500 px-7 py-4 font-bold text-slate-950"
                >

                    <FaPlay />

                    CONTINUAR AVENTURA

                </motion.button>

            </div>

        </motion.section>
    );
}