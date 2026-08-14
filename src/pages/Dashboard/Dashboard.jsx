import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import MainLayout from "../../layouts/MainLayout";
import ProgressBar from "../../components/ui/ProgressBar";
import GameCard from "../../components/cards/GameCard";
import StatCard from "../../components/dashboard/StatCard";
import HeroBanner from "../../components/dashboard/HeroBanner";
import FadeIn from "../../components/animations/FadeIn";

import games from "../../data/games";

export default function Dashboard() {

    const navigate = useNavigate();

    const [xp, setXp] = useState(0);
    const [gamesCompleted, setGamesCompleted] = useState(0);
    const [achievements, setAchievements] = useState(0);

    useEffect(() => {

        const savedXP =
            Number(localStorage.getItem("mathvision_xp")) || 0;

        const savedGames =
            Number(localStorage.getItem("mathvision_games")) || 0;

        const savedAchievements =
            Number(localStorage.getItem("mathvision_achievements")) || 0;

        setXp(savedXP);
        setGamesCompleted(savedGames);
        setAchievements(savedAchievements);

    }, []);


    // =========================
    // SISTEMA DE NIVELES
    // =========================

    const level = Math.floor(xp / 250) + 1;

    const currentLevelXP = xp % 250;

    const nextLevelXP = 250;

    const xpForNextLevel =
        (level * 250);


    return (

        <MainLayout>

            {/* =========================
                HERO
            ========================== */}

            <FadeIn>

                <HeroBanner />

                <div className="mb-10 overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/80 p-6 backdrop-blur-xl">

                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                        <div>

                            <p className="text-sm text-slate-400">
                                Tu progreso
                            </p>

                            <h2 className="text-3xl font-black">
                                Nivel {level}
                            </h2>

                        </div>


                        <div className="rounded-xl border border-cyan-400/10 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-400">

                            {xp} XP

                        </div>

                    </div>


                    <ProgressBar
                        value={currentLevelXP}
                        max={nextLevelXP}
                        label={`Experiencia · ${currentLevelXP}/${nextLevelXP} XP`}
                    />


                    <div className="mt-4 flex justify-between text-xs text-slate-500">

                        <span>
                            Nivel {level}
                        </span>

                        <span>
                            Próximo nivel: {xpForNextLevel} XP
                        </span>

                    </div>

                </div>

            </FadeIn>


            {/* =========================
                ESTADÍSTICAS
            ========================== */}

            <FadeIn delay={0.15}>

                <section className="mb-10">

                    <div className="mb-5">

                        <p className="text-sm uppercase tracking-widest text-cyan-400">
                            Tu progreso
                        </p>

                        <h2 className="text-3xl font-bold">
                            Estadísticas
                        </h2>

                    </div>


                    <div className="grid grid-cols-12 gap-5">

                        <div className="col-span-6 lg:col-span-3">

                            <StatCard
                                title="Nivel"
                                value={level}
                            />

                        </div>


                        <div className="col-span-6 lg:col-span-3">

                            <StatCard
                                title="XP"
                                value={xp}
                            />

                        </div>


                        <div className="col-span-6 lg:col-span-3">

                            <StatCard
                                title="Juegos"
                                value={gamesCompleted}
                            />

                        </div>


                        <div className="col-span-6 lg:col-span-3">

                            <StatCard
                                title="Logros"
                                value={achievements}
                            />

                        </div>

                    </div>

                </section>

            </FadeIn>


            {/* =========================
                MATHVISION WORLD
            ========================== */}

            <FadeIn delay={0.22}>

                <section className="mb-10">

                    <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-purple-500/10 p-7">

                        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

                        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

                            <div>

                                <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-400">

                                    🌌 Mundo MathVision

                                </p>

                                <h2 className="mt-2 text-3xl font-black">

                                    Explora nuevos mundos

                                </h2>

                                <p className="mt-2 max-w-xl text-slate-400">

                                    Completa desafíos, gana experiencia y desbloquea
                                    nuevas áreas matemáticas.

                                </p>

                            </div>


                            <button
                                onClick={() => navigate("/world")}
                                className="shrink-0 rounded-2xl bg-cyan-500 px-7 py-4 font-black text-slate-950 transition hover:scale-105 hover:bg-cyan-400"
                            >

                                EXPLORAR WORLD →

                            </button>

                        </div>

                    </div>

                </section>

            </FadeIn>


            {/* =========================
                JUEGOS
            ========================== */}

            <FadeIn delay={0.3}>

                <section>

                    <div className="mb-6">

                        <p className="text-sm uppercase tracking-widest text-cyan-400">
                            Misiones disponibles
                        </p>

                        <h2 className="text-3xl font-bold">
                            Elige tu desafío
                        </h2>

                    </div>


                    <div className="grid grid-cols-12 gap-6">

                        {games.map((game, index) => (

                            <FadeIn
                                key={game.id}
                                delay={0.4 + index * 0.12}
                                y={35}
                                className="col-span-12 md:col-span-6 xl:col-span-4"
                            >

                                <GameCard
                                    {...game}
                                />

                            </FadeIn>

                        ))}

                    </div>

                </section>

            </FadeIn>

        </MainLayout>

    );
}