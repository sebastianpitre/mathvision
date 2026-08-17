import { motion } from "framer-motion";
import { FaClock } from "react-icons/fa";

export default function GameTimer({
    time,
    maxTime = 30
}) {

    const percentage =
        Math.max(
            0,
            Math.min(
                100,
                (time / maxTime) * 100
            )
        );


    const warning =
        time <= 10;


    const critical =
        time <= 5;


    return (

        <div className="
            flex
            items-center
            gap-2
        ">

            <div className={`
                flex
                items-center
                gap-2
                rounded-full
                border
                px-3
                py-1.5

                ${
                    critical
                        ? `
                            border-red-400/40
                            bg-red-500/10
                            text-red-300
                        `
                        : warning
                            ? `
                                border-yellow-400/40
                                bg-yellow-500/10
                                text-yellow-300
                            `
                            : `
                                border-blue-400/20
                                bg-blue-500/5
                                text-blue-300
                            `
                }
            `}>

                <motion.div
                    animate={
                        critical
                            ? {
                                scale: [
                                    1,
                                    1.2,
                                    1
                                ]
                            }
                            : {}
                    }
                    transition={{
                        duration: 0.7,
                        repeat: critical
                            ? Infinity
                            : 0
                    }}
                >

                    <FaClock size={12} />

                </motion.div>


                <span className="
                    min-w-5
                    text-center
                    text-xs
                    font-black
                ">

                    {time}

                </span>

            </div>


            {/* BARRA */}

            <div className="
                hidden
                h-1
                w-20
                overflow-hidden
                rounded-full
                bg-slate-800
                sm:block
            ">

                <motion.div
                    animate={{
                        width: `${percentage}%`
                    }}
                    transition={{
                        duration: 0.3
                    }}
                    className={`
                        h-full
                        rounded-full

                        ${
                            critical
                                ? "bg-red-400"
                                : warning
                                    ? "bg-yellow-400"
                                    : "bg-blue-400"
                        }
                    `}
                />

            </div>

        </div>

    );

}