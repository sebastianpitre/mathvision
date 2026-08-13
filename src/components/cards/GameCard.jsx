import { motion } from "framer-motion";
import { FaTrophy, FaPlay } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function GameCard({
    title,
    description,
    xp,
    difficulty,
    image,
    route
}) {

    const navigate = useNavigate();

    return (

        <motion.article
            whileHover={{ y: -8 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 20
            }}
            className="group overflow-hidden rounded-3xl border border-slate-700 bg-slate-900"
        >

            <div className="relative h-52 overflow-hidden">

                <motion.img
                    src={image}
                    alt={title}
                    whileHover={{ scale: 1.08 }}
                    transition={{ duration: 0.5 }}
                    className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

                <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs font-bold backdrop-blur-md">

                    ⭐ {difficulty}

                </div>

            </div>

            <div className="p-6">

                <h3 className="text-2xl font-bold">
                    {title}
                </h3>

                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
                    {description}
                </p>

                <div className="mt-5 flex items-center justify-between">

                    <div className="flex items-center gap-2 text-sm font-semibold text-yellow-400">

                        <FaTrophy />

                        {xp} XP

                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => route && navigate(route)}
                        className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950"
                    >

                        <FaPlay />

                        JUGAR

                    </motion.button>

                </div>

            </div>

        </motion.article>
    );
}