import { motion } from "framer-motion";

const prizes = [
    1000,
    2000,
    3000,
    5000,
    10000,
    20000,
    50000,
    100000,
    250000,
    500000
];

export default function MoneyLadder({
    currentQuestion,
    currentMoney
}) {

    return (

        <aside className="
            flex
            h-full
            w-full
            flex-col
            rounded-2xl
            border
            border-yellow-500/20
            bg-slate-950/80
            p-4
            shadow-2xl
            backdrop-blur-xl
        ">

            <div className="
                mb-4
                text-center
            ">

                <p className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.3em]
                    text-yellow-400
                ">
                    Premios
                </p>

                <p className="
                    mt-1
                    text-xs
                    text-slate-500
                ">
                    Math Millonario
                </p>

            </div>


            <div className="
                flex
                flex-1
                flex-col
                justify-center
                gap-1
            ">

                {[...prizes]
                    .reverse()
                    .map((amount, reverseIndex) => {

                        const index =
                            prizes.length -
                            1 -
                            reverseIndex;

                        const isCurrent =
                            index === currentQuestion;

                        const isCompleted =
                            index < currentQuestion;

                        const isNext =
                            index === currentQuestion + 1;

                        return (

                            <motion.div
                                key={amount}
                                animate={
                                    isCurrent
                                        ? {
                                            scale: [1, 1.03, 1]
                                        }
                                        : {}
                                }
                                transition={{
                                    duration: 1.2,
                                    repeat: isCurrent
                                        ? Infinity
                                        : 0
                                }}
                                className={`
                                    flex
                                    items-center
                                    justify-between
                                    rounded-lg
                                    px-3
                                    py-2
                                    text-xs
                                    font-black
                                    transition

                                    ${
                                        isCurrent
                                            ? "border border-yellow-400/60 bg-yellow-400/15 text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.12)]"
                                            : isCompleted
                                                ? "bg-slate-800/40 text-slate-600"
                                                : isNext
                                                    ? "bg-slate-800/80 text-white"
                                                    : "text-slate-500"
                                    }
                                `}
                            >

                                <span className="
                                    text-[10px]
                                    font-bold
                                ">
                                    {index + 1}
                                </span>

                                <span>
                                    ${amount.toLocaleString("es-CO")}
                                </span>

                            </motion.div>

                        );

                    })}

            </div>


            <div className="
                mt-4
                rounded-xl
                border
                border-emerald-500/20
                bg-emerald-500/5
                p-3
                text-center
            ">

                <p className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-widest
                    text-slate-500
                ">
                    Acumulado
                </p>

                <p className="
                    mt-1
                    text-lg
                    font-black
                    text-emerald-400
                ">
                    ${currentMoney.toLocaleString("es-CO")}
                </p>

            </div>

        </aside>

    );

}