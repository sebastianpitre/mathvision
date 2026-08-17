import {
    FaArrowLeft,
    FaHeart,
    FaBolt
} from "react-icons/fa";

export default function GameHeader({
    lives,
    score,
    onExit
}) {

    return (

        <header className="
            flex
            h-14
            shrink-0
            items-center
            border-b
            border-yellow-500/10
            bg-slate-950/95
            px-4
            backdrop-blur-xl
        ">

            <div className="
                mx-auto
                flex
                w-full
                items-center
                justify-between
                gap-4
            ">


                {/* SALIR */}

                <button
                    onClick={onExit}
                    className="
                        flex
                        items-center
                        gap-2
                        text-sm
                        text-slate-400
                        transition
                        hover:text-white
                    "
                >

                    <FaArrowLeft />

                    <span className="
                        hidden
                        sm:block
                    ">
                        Salir
                    </span>

                </button>


                {/* TITULO */}

                <div className="
                    text-center
                    leading-none
                ">

                    <p className="
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.35em]
                        text-yellow-400
                    ">
                        MathVision
                    </p>

                    <h1 className="
                        mt-1
                        text-sm
                        font-black
                        sm:text-base
                    ">
                        MATH MILLONARIO
                    </h1>

                </div>


                {/* ESTADISTICAS */}

                <div className="
                    flex
                    items-center
                    gap-4
                    text-sm
                ">

                    <div className="
                        flex
                        items-center
                        gap-1.5
                        text-red-400
                    ">

                        <FaHeart />

                        {lives}

                    </div>


                    <div className="
                        hidden
                        items-center
                        gap-1.5
                        text-yellow-400
                        sm:flex
                    ">

                        <FaBolt />

                        {score}

                    </div>

                </div>

            </div>

        </header>

    );

}