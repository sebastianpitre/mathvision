import { motion } from "framer-motion";

export default function FadeIn({
    children,
    delay = 0,
    duration = 0.6,
    y = 20,
    className = ""
}) {
    return (
        <motion.div
            className={className}
            initial={{
                opacity: 0,
                y: y
            }}
            animate={{
                opacity: 1,
                y: 0
            }}
            transition={{
                duration,
                delay,
                ease: "easeOut"
            }}
        >
            {children}
        </motion.div>
    );
}