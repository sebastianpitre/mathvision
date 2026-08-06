export default function GameCard({

    title,
    description,
    xp,
    difficulty,
    image

}) {

    return (

        <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 hover:border-cyan-400 hover:scale-105 duration-300">

            <img
                src={image}
                alt={title}
                className="w-full h-48 object-cover"
            />

            <div className="p-6">

                <h3 className="text-2xl font-bold">

                    {title}

                </h3>

                <p className="text-slate-400 mt-3">

                    {description}

                </p>

                <div className="flex justify-between mt-5">

                    <span>

                        ⭐ {difficulty}

                    </span>

                    <span>

                        🏆 {xp} XP

                    </span>

                </div>

                <button
                    className="mt-6 w-full bg-cyan-500 hover:bg-cyan-400 duration-300 rounded-xl py-3 font-bold"
                >

                    JUGAR

                </button>

            </div>

        </div>

    )

}