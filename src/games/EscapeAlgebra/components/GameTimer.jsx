import { motion } from "framer-motion";
import { FaClock } from "react-icons/fa";

export default function GameTimer({
    time,
    maxTime
}) {

    const percentage = (time / maxTime) * 100;

    const danger = time <= 10;

    return (

        <div className="w-32">

            <div className="mb-2 flex items-center justify-between">

                <div
                    className={`
                        flex
                        items-center
                        gap-2
                        text-sm
                        font-bold

                        ${
                            danger
                                ? "text-red-400"
                                : "text-slate-300"
                        }
                    `}
                >

                    <FaClock />

                    {time}s

                </div>

            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                <motion.div
                    animate={{
                        width: `${percentage}%`
                    }}
                    transition={{
                        duration: 0.2
                    }}
                    className={`
                        h-full
                        rounded-full

                        ${
                            danger
                                ? "bg-red-500"
                                : "bg-cyan-400"
                        }
                    `}
                />

            </div>

        </div>

    );
}