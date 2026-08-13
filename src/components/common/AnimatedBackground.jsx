import { motion } from "framer-motion";

export default function AnimatedBackground() {
    return (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-950">

            <motion.div
                animate={{
                    x: [0, 80, -40, 0],
                    y: [0, -50, 60, 0],
                    scale: [1, 1.2, 0.9, 1]
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute left-[10%] top-[10%] h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]"
            />

            <motion.div
                animate={{
                    x: [0, -100, 50, 0],
                    y: [0, 80, -60, 0],
                    scale: [1, 0.8, 1.2, 1]
                }}
                transition={{
                    duration: 22,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute right-[5%] top-[30%] h-[30rem] w-[30rem] rounded-full bg-purple-600/10 blur-[140px]"
            />

            <motion.div
                animate={{
                    x: [0, 60, -80, 0],
                    y: [0, -80, 40, 0]
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute bottom-[-10%] left-[30%] h-[25rem] w-[25rem] rounded-full bg-blue-600/10 blur-[120px]"
            />

            <div
                className="absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage: `
                        linear-gradient(#ffffff 1px, transparent 1px),
                        linear-gradient(90deg, #ffffff 1px, transparent 1px)
                    `,
                    backgroundSize: "60px 60px"
                }}
            />

        </div>
    );
}