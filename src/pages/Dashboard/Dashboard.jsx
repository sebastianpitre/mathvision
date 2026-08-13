import MainLayout from "../../layouts/MainLayout";
import ProgressBar from "../../components/ui/ProgressBar";
import GameCard from "../../components/cards/GameCard";
import StatCard from "../../components/dashboard/StatCard";
import HeroBanner from "../../components/dashboard/HeroBanner";
import FadeIn from "../../components/animations/FadeIn";

import games from "../../data/games";

export default function Dashboard() {
    return (
        <MainLayout>

            <FadeIn>

                <HeroBanner />
                
                <div className="mb-10 rounded-3xl border border-slate-700 bg-slate-900/80 p-6 backdrop-blur-xl">

                    <div className="mb-4 flex items-center justify-between">

                        <div>

                            <p className="text-sm text-slate-400">
                                Tu progreso
                            </p>

                            <h2 className="text-2xl font-bold">
                                Nivel 4
                            </h2>

                        </div>

                        <div className="rounded-xl bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-400">
                            Próximo nivel: 1000 XP
                        </div>

                    </div>

                    <ProgressBar
                        value={820}
                        max={1000}
                        label="Experiencia"
                    />

                </div>
            </FadeIn>

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
                                value="4"
                            />
                        </div>

                        <div className="col-span-6 lg:col-span-3">
                            <StatCard
                                title="XP"
                                value="820"
                            />
                        </div>

                        <div className="col-span-6 lg:col-span-3">
                            <StatCard
                                title="Juegos"
                                value="12"
                            />
                        </div>

                        <div className="col-span-6 lg:col-span-3">
                            <StatCard
                                title="Logros"
                                value="8"
                            />
                        </div>

                    </div>

                </section>

            </FadeIn>

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

                                <GameCard {...game} />

                            </FadeIn>

                        ))}

                    </div>

                </section>

            </FadeIn>

        </MainLayout>
    );
}