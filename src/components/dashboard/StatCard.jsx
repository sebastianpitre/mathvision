import { motion } from "framer-motion";

export default function StatCard({
    title,
    value
}) {
    return (
        <motion.div
            whileHover={{
                y: -5,
                scale: 1.02
            }}
            transition={{
                type: "spring",
                stiffness: 300
            }}
            className="group relative overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-6"
        >

            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl transition-all duration-500 group-hover:bg-cyan-500/25" />

            <p className="relative text-sm text-slate-400">
                {title}
            </p>

            <h2 className="relative mt-3 text-4xl font-black">
                {value}
            </h2>

        </motion.div>
    );
}