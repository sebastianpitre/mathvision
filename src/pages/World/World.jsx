import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    FaArrowLeft,
    FaLock,
    FaPlay,
    FaStar,
    FaBolt
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import worlds from "./worldData";

export default function World() {

    const navigate = useNavigate();

    const [xp, setXp] = useState(0);

    useEffect(() => {

        const savedXP =
            Number(localStorage.getItem("mathvision_xp")) || 0;

        setXp(savedXP);

    }, []);

    const isWorldCompleted = (worldId) => {

    const completedWorlds =
        JSON.parse(
            localStorage.getItem("mathvision_completed_worlds") || "[]"
        );

    return completedWorlds.includes(worldId);

    };


    const isUnlocked = (world) => {

        if (!world.requiredWorld) {
            return true;
        }

        return isWorldCompleted(world.requiredWorld);

    };

    return (

        <div className="min-h-screen overflow-hidden bg-slate-950 text-white">

            {/* BACKGROUND */}

            <div className="pointer-events-none fixed inset-0">

                <div className="absolute left-1/4 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[140px]" />

                <div className="absolute bottom-20 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[140px]" />

            </div>


            {/* HEADER */}

            <header className="relative z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">

                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">

                    <button
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-3 text-slate-400 transition hover:text-white"
                    >

                        <FaArrowLeft />

                        Dashboard

                    </button>


                    <div className="text-center">

                        <p className="text-xs font-bold uppercase tracking-[0.4em] text-cyan-400">

                            MATHVISION

                        </p>

                        <h1 className="text-xl font-black">

                            WORLD

                        </h1>

                    </div>


                    <div className="flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/5 px-4 py-2 text-yellow-400">

                        <FaBolt />

                        <span className="font-black">

                            {xp} XP

                        </span>

                    </div>

                </div>

            </header>


            {/* HERO */}

            <main className="relative z-10 mx-auto max-w-7xl px-5 py-12">

                <motion.div
                    initial={{
                        opacity: 0,
                        y: 30
                    }}
                    animate={{
                        opacity: 1,
                        y: 0
                    }}
                    className="mb-14 text-center"
                >

                    <p className="text-sm font-bold uppercase tracking-[0.4em] text-cyan-400">

                        Centro de entrenamiento

                    </p>

                    <h2 className="mt-4 text-4xl font-black md:text-6xl">

                        Elige tu mundo

                    </h2>

                    <p className="mx-auto mt-5 max-w-2xl text-slate-400">

                        Completa desafíos matemáticos, gana XP y desbloquea
                        nuevas dimensiones de aprendizaje.

                    </p>

                </motion.div>


                {/* MAPA */}

                <div className="relative">

                    {/* LINEA DEL MAPA */}

                    <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-cyan-500 via-purple-500 to-yellow-500 opacity-20 lg:block" />


                    <div className="space-y-8">

                        {worlds.map((world, index) => {

                            const unlocked =
                                isUnlocked(world);

                            const previousWorld =
                                worlds[index - 1];

                            const previousUnlocked =
                                index === 0 ||
                                isUnlocked(previousWorld);


                            const available =
                                unlocked && previousUnlocked;

                            const completed =
                                isWorldCompleted(world.id);


                            return (

                                <motion.div
                                    key={world.id}
                                    initial={{
                                        opacity: 0,
                                        x: index % 2 === 0
                                            ? -40
                                            : 40
                                    }}
                                    animate={{
                                        opacity: 1,
                                        x: 0
                                    }}
                                    transition={{
                                        delay: index * 0.12
                                    }}
                                    className={`
                                        relative
                                        lg:flex
                                        ${
                                            index % 2 === 0
                                                ? "lg:justify-start"
                                                : "lg:justify-end"
                                        }
                                    `}
                                >

                                    <div className="w-full lg:w-[48%]">

                                        <div
                                            className={`
                                                group
                                                relative
                                                overflow-hidden
                                                rounded-3xl
                                                border
                                                p-6
                                                transition-all
                                                duration-300

                                                ${
                                                    available
                                                        ? "border-slate-700 bg-slate-900/90 hover:-translate-y-2 hover:border-cyan-400/50"
                                                        : "border-slate-800 bg-slate-900/60"
                                                }
                                            `}
                                        >

                                            {/* GLOW */}

                                            {available && (

                                                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

                                            )}


                                            <div className="relative flex items-start gap-5">

                                                {/* ICON */}

                                                <motion.div
                                                    whileHover={
                                                        available
                                                            ? {
                                                                rotate: 8,
                                                                scale: 1.08
                                                            }
                                                            : {}
                                                    }
                                                    className={`
                                                        flex
                                                        h-20
                                                        w-20
                                                        shrink-0
                                                        items-center
                                                        justify-center
                                                        rounded-2xl
                                                        text-4xl

                                                        ${
                                                            available
                                                                ? "bg-cyan-500/10"
                                                                : "bg-slate-800 grayscale"
                                                        }
                                                    `}
                                                >

                                                    {available
                                                        ? world.icon
                                                        : <FaLock className="text-slate-600" size={25} />
                                                    }

                                                </motion.div>


                                                {/* CONTENT */}

                                                <div className="min-w-0 flex-1">

                                                    <div className="flex items-start justify-between gap-3">

                                                        <div>

                                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">

                                                                Mundo {index + 1}

                                                            </p>

                                                            <h3 className="mt-1 text-2xl font-black">

                                                                {world.title}

                                                            </h3>

                                                        </div>

                                                        {completed ? (

                                                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">
                                                                COMPLETADO
                                                            </span>

                                                        ) : available ? (

                                                            <FaStar className="text-yellow-400" />

                                                        ) : null}

                                                    </div>


                                                    <p className="mt-1 text-sm text-cyan-400">

                                                        {world.subtitle}

                                                    </p>


                                                    <p className="mt-4 text-sm leading-6 text-slate-400">

                                                        {world.description}

                                                    </p>


                                                    {/* REQUISITO */}

                                                    {!unlocked && (

                                                        <div className="mt-5 rounded-xl border border-red-400/10 bg-red-400/5 p-3">

                                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                                                REQUISITO
                                                            </p>

                                                            <p className="mt-1 font-bold text-red-400">

                                                                🔒 Completa{" "}

                                                                {
                                                                    worlds.find(
                                                                        (item) =>
                                                                            item.id === world.requiredWorld
                                                                    )?.title
                                                                }

                                                            </p>

                                                        </div>

                                                    )}


                                                    {/* BUTTON */}

                                                    {available && (

                                                        <button
                                                            onClick={() =>
                                                                navigate(world.route)
                                                            }
                                                            className={`
                                                                mt-6
                                                                flex
                                                                w-full
                                                                items-center
                                                                justify-center
                                                                gap-3
                                                                rounded-xl
                                                                py-3
                                                                font-black
                                                                transition
                                                                hover:scale-[1.02]

                                                                ${
                                                                    completed
                                                                        ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                                                                        : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                                                                }
                                                            `}
                                                        >

                                                            {completed ? "✓" : <FaPlay size={12} />}

                                                            {completed
                                                                ? `REJUGAR ${world.game}`
                                                                : `JUGAR ${world.game}`
                                                            }

                                                        </button>

                                                    )}

                                                </div>

                                            </div>

                                        </div>

                                    </div>

                                </motion.div>

                            );

                        })}

                    </div>

                </div>

            </main>

        </div>

    );
}