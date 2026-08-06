import MainLayout from "../../layouts/MainLayout";
import StatCard from "../../components/dashboard/StatCard";
import GameCard from "../../components/cards/GameCard";

import games from "../../data/games";

export default function Dashboard() {

    return (

        <MainLayout>

            <h1 className="text-4xl font-bold mb-8">

                Continúa Aprendiendo

            </h1>

            <div className="grid grid-cols-12 gap-6 mb-10">

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

            <div className="grid grid-cols-12 gap-6">

                {

                    games.map((game) => (

                        <div
                            key={game.id}
                            className="col-span-12 md:col-span-6 xl:col-span-4"
                        >

                            <GameCard

                                title={game.title}
                                description={game.description}
                                xp={game.xp}
                                difficulty={game.difficulty}
                                image={game.image}

                            />

                        </div>

                    ))

                }

            </div>

        </MainLayout>

    )

}