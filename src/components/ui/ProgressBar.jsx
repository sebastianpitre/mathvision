import { motion } from "framer-motion";

export default function ProgressBar({
    value = 0,
    max = 100,
    label = "Experiencia"
}) {

    const percentage = Math.min((value / max) * 100, 100);

    return (
        <div className="w-full">

            <div className="mb-2 flex items-center justify-between">

                <span className="text-sm font-medium text-slate-300">
                    {label}
                </span>

                <span className="text-sm font-bold text-cyan-400">
                    {value} / {max} XP
                </span>

            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-800">

                <motion.div
                    initial={{ width: 0 }}
                    animate={{
                        width: `${percentage}%`
                    }}
                    transition={{
                        duration: 1.5,
                        delay: 0.3,
                        ease: "easeOut"
                    }}
                    className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                >

                    <motion.div
                        animate={{
                            x: ["-100%", "200%"]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="absolute inset-y-0 w-1/3 bg-white/30 blur-sm"
                    />

                </motion.div>

            </div>

        </div>
    );
}