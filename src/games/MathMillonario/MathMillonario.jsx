import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
    FaArrowLeft,
    FaHeart,
    FaBolt,
    FaPhone,
    FaUsers,
    FaChartBar,
    FaFlagCheckered,
    FaVolumeUp,
    FaVolumeMute
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import questions from "./data/questions";
import {
    playSound,
    createBackgroundMusic
} from "./components/GameAudio";


// =====================================================
// CONFIGURACIÓN
// =====================================================

const TOTAL_QUESTIONS = 10;
const RETIRE_AFTER = 5;

const MONEY_LEVELS = [
    1000,
    2000,
    5000,
    10000,
    20000,
    40000,
    80000,
    160000,
    320000,
    1000000
];


// =====================================================
// UTILIDADES
// =====================================================

const shuffleArray = (array) => {

    return [...array]
        .sort(() => Math.random() - 0.5);

};


// =====================================================
// COMPONENTE
// =====================================================

export default function MathMillonario() {

    const navigate = useNavigate();


    // =================================================
    // ESTADOS
    // =================================================

    const [gameQuestions, setGameQuestions] = useState([]);

    const [currentQuestion, setCurrentQuestion] =
        useState(0);

    const [lives, setLives] = useState(3);

    const [selectedAnswer, setSelectedAnswer] =
        useState(null);

    const [answered, setAnswered] =
        useState(false);

    const [finished, setFinished] =
        useState(false);

    const [retired, setRetired] =
        useState(false);

    const [wonMoney, setWonMoney] =
        useState(0);

    const [feedback, setFeedback] =
        useState(null);

    const [fiftyUsed, setFiftyUsed] =
        useState(false);

    const [hiddenAnswers, setHiddenAnswers] =
        useState([]);

    const [soundEnabled, setSoundEnabled] =
        useState(true);
        
    const [backgroundMusic, setBackgroundMusic] =
        useState(null);


    // =====================================================
    // MÚSICA DE FONDO
    // =====================================================

    useEffect(() => {

        const music = createBackgroundMusic();

        setBackgroundMusic(music);


        const startMusic = () => {

            if (!soundEnabled) {
                return;
            }

            music.play()
                .catch(() => {});

        };


        // Intentar reproducir inmediatamente
        startMusic();


        // Si Chrome bloquea el autoplay,
        // esperamos una interacción del usuario
        window.addEventListener(
            "click",
            startMusic,
            { once: true }
        );

        window.addEventListener(
            "keydown",
            startMusic,
            { once: true }
        );

        window.addEventListener(
            "touchstart",
            startMusic,
            { once: true }
        );


        return () => {

            music.pause();

            music.currentTime = 0;

            window.removeEventListener(
                "click",
                startMusic
            );

            window.removeEventListener(
                "keydown",
                startMusic
            );

            window.removeEventListener(
                "touchstart",
                startMusic
            );

        };

    }, []);

    // =====================================================
    // DETENER MÚSICA AL FINALIZAR
    // =====================================================

    useEffect(() => {

        if (
            finished &&
            backgroundMusic
        ) {

            backgroundMusic.pause();

            backgroundMusic.currentTime = 0;

        }

    }, [
        finished,
        backgroundMusic
    ]);


    // =================================================
    // PREGUNTA ACTUAL
    // =================================================

    const question =
        gameQuestions[currentQuestion];


    // =================================================
    // INICIAR
    // =================================================

    useEffect(() => {

        const selectedQuestions =
            shuffleArray(questions)
                .slice(
                    0,
                    Math.min(
                        TOTAL_QUESTIONS,
                        questions.length
                    )
                );

        setGameQuestions(
            selectedQuestions
        );

    }, []);


    // =================================================
    // DINERO ACTUAL
    // =================================================

    const currentMoney =
        currentQuestion === 0
            ? 0
            : MONEY_LEVELS[
                currentQuestion - 1
            ] || 0;


    const nextMoney =
        MONEY_LEVELS[
            currentQuestion
        ] || 0;


    // =================================================
    // PREGUNTA 5+
    // =================================================

    const canRetire =
        currentQuestion >= RETIRE_AFTER;


    // =================================================
    // SONIDOS
    // =================================================

    const sound = (name, volume = 0.7) => {

        if (!soundEnabled) {
            return;
        }

        playSound(
            name,
            volume
        );

    };


    // =================================================
    // 50 / 50
    // =================================================

    const useFiftyFifty = () => {

        if (
            fiftyUsed ||
            answered ||
            !question
        ) {
            return;
        }


        const wrongAnswers =
            question.options
                .map((_, index) => index)
                .filter(
                    index =>
                        index !==
                        question.correctAnswer
                );


        const twoToHide =
            shuffleArray(
                wrongAnswers
            ).slice(0, 2);


        setHiddenAnswers(
            twoToHide
        );

        setFiftyUsed(true);

        sound(
            "lifeline",
            0.8
        );

    };


    // =================================================
    // RESPONDER
    // =================================================

    const handleAnswer = (index) => {

        if (
            answered ||
            !question
        ) {
            return;
        }


        setSelectedAnswer(index);

        setAnswered(true);


        const correct =
            index ===
            question.correctAnswer;


        if (correct) {

            const earned =
                MONEY_LEVELS[
                    currentQuestion
                ];


            setWonMoney(
                earned
            );


            setFeedback(true);

            sound(
                "correct",
                0.8
            );


            // =========================================
            // ÚLTIMA PREGUNTA
            // =========================================

            if (
                currentQuestion + 1 >=
                TOTAL_QUESTIONS
            ) {

                setTimeout(() => {

                    finishGame(
                        earned,
                        false
                    );

                }, 1800);

                return;

            }


            setTimeout(() => {

                setFeedback(null);

                setSelectedAnswer(null);

                setAnswered(false);

                setHiddenAnswers([]);

                setCurrentQuestion(
                    previous =>
                        previous + 1
                );

            }, 1500);

        }

        else {

            setFeedback(false);

            const remainingLives = lives - 1;
            setLives(
                Math.max(0, remainingLives)
            );

            if (remainingLives <= 0) {
                // GAME OVER
            }


            sound(
                "incorrect",
                0.8
            );


            // =========================================
            // PIERDE
            // =========================================

            if (lives <= 1) {

                setTimeout(() => {

                    finishGame(
                        0,
                        false
                    );

                }, 1800);

                return;

            }


            setTimeout(() => {

                setFeedback(null);

                setSelectedAnswer(null);

                setAnswered(false);

                setHiddenAnswers([]);

            }, 1500);

        }

    };


    // =================================================
    // RETIRARSE
    // =================================================

    const retireGame = () => {

        if (
            !canRetire ||
            finished
        ) {
            return;
        }


        sound(
            "retire",
            0.8
        );


        finishGame(
            wonMoney,
            true
        );

    };


    // =================================================
    // FINALIZAR
    // =================================================

    const finishGame = (
        finalMoney,
        didRetire
    ) => {

        setWonMoney(
            finalMoney
        );

        setRetired(
            didRetire
        );

        setFinished(
            true
        );


        // =============================================
        // EXPERIENCIA
        // =============================================

        const currentXP =
            Number(
                localStorage.getItem(
                    "mathvision_xp"
                )
            ) || 0;


        localStorage.setItem(
            "mathvision_xp",
            currentXP +
            finalMoney
        );


        // =============================================
        // JUEGOS COMPLETADOS
        // =============================================

        const completedGames =
            Number(
                localStorage.getItem(
                    "mathvision_games"
                )
            ) || 0;


        localStorage.setItem(
            "mathvision_games",
            completedGames + 1
        );


        if (finalMoney > 0) {

            sound(
                "victory",
                0.9
            );

        }
        else {

            sound(
                "gameOver",
                0.9
            );

        }

    };


    // =================================================
    // REINICIAR
    // =================================================

    const restartGame = () => {

        const selectedQuestions =
            shuffleArray(questions)
                .slice(
                    0,
                    Math.min(
                        TOTAL_QUESTIONS,
                        questions.length
                    )
                );


        setGameQuestions(
            selectedQuestions
        );

        setCurrentQuestion(0);

        setLives(3);

        setSelectedAnswer(null);

        setAnswered(false);

        setFinished(false);

        setRetired(false);

        setWonMoney(0);

        setFeedback(null);

        setFiftyUsed(false);

        setHiddenAnswers([]);

        if (backgroundMusic) {

            backgroundMusic.currentTime = 0;

            if (soundEnabled) {

                backgroundMusic
                    .play()
                    .catch(() => {});

            }

        }

    };


    // =================================================
    // CARGANDO
    // =================================================

    if (!question && !finished) {

        return (

            <div className="flex h-screen overflow-hidden text-white bg-[url('/img/MathMillonario/fondo.png')] bg-cover bg-center">

                <motion.div
                    animate={{
                        rotate: 360
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="
                        h-12
                        w-12
                        rounded-full
                        border-4
                        border-slate-700
                        border-t-cyan-400
                    "
                />

            </div>

        );

    }


    // =================================================
    // PANTALLA FINAL
    // =================================================

    if (finished) {

        const hasMoney =
            wonMoney > 0;


        return (

            <div className="relative flex h-screen items-center justify-center overflow-hidden px-5 text-white bg-[url('/img/MathMillonario/fondo.png')] bg-cover bg-center">

                <motion.div
                    animate={{
                        scale: [
                            1,
                            1.4,
                            1
                        ],
                        opacity: [
                            0.15,
                            0.3,
                            0.15
                        ]
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity
                    }}
                    className={`
                        absolute
                        h-96
                        w-96
                        rounded-full
                        blur-[120px]

                        ${
                            hasMoney
                                ? "bg-cyan-500/20"
                                : "bg-red-500/20"
                        }
                    `}
                />


                <motion.div
                    initial={{
                        opacity: 0,
                        scale: 0.7,
                        y: 40
                    }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0
                    }}
                    className="
                        relative
                        z-10
                        w-full
                        max-w-xl
                        rounded-[2rem]
                        border
                        border-slate-700
                        bg-slate-900/95
                        p-8
                        text-center
                        shadow-2xl
                        md:p-12
                    "
                >

                    <div className={`
                        mx-auto
                        mb-6
                        flex
                        h-28
                        w-28
                        items-center
                        justify-center
                        rounded-full
                        text-5xl

                        ${
                            hasMoney
                                ? "bg-cyan-400/10 text-cyan-400"
                                : "bg-red-400/10 text-red-400"
                        }
                    `}>

                        {hasMoney
                            ? "💰"
                            : "✕"
                        }

                    </div>


                    <p className={`
                        text-sm
                        font-bold
                        uppercase
                        tracking-[0.3em]

                        ${
                            hasMoney
                                ? "text-cyan-400"
                                : "text-red-400"
                        }
                    `}>

                        {retired
                            ? "Retirada"
                            : hasMoney
                                ? "Millonario"
                                : "Desafío no superado"
                        }

                    </p>


                    <h1 className="
                        mt-3
                        text-4xl
                        font-black
                        md:text-5xl
                    ">

                        Math Millonario

                    </h1>


                    <p className="
                        mt-4
                        text-slate-400
                    ">

                        {retired
                            ? "Te retiraste con tus ganancias."
                            : hasMoney
                                ? "¡Completaste el desafío!"
                                : "Perdiste todas tus vidas y el dinero acumulado."
                        }

                    </p>


                    <div className="
                        my-8
                        rounded-3xl
                        border
                        border-yellow-400/20
                        bg-yellow-400/5
                        p-6
                    ">

                        <p className="
                            text-xs
                            font-bold
                            uppercase
                            tracking-[0.25em]
                            text-slate-500
                        ">

                            Experiencia obtenida

                        </p>


                        <p className="
                            mt-2
                            text-5xl
                            font-black
                            text-yellow-400
                        ">

                            +{wonMoney} XP

                        </p>

                    </div>


                    <div className="
                        grid
                        gap-3
                        md:grid-cols-2
                    ">

                        <button
                            onClick={restartGame}
                            className="
                                rounded-xl
                                bg-cyan-500
                                py-4
                                font-black
                                text-slate-950
                                transition
                                hover:bg-cyan-400
                            "
                        >

                            JUGAR DE NUEVO

                        </button>


                        <button
                            onClick={() =>
                                navigate(
                                    "/dashboard"
                                )
                            }
                            className="
                                rounded-xl
                                border
                                border-slate-700
                                py-4
                                font-black
                                transition
                                hover:bg-slate-800
                            "
                        >

                            DASHBOARD

                        </button>

                    </div>

                </motion.div>

            </div>

        );

    }


    // =================================================
    // JUEGO
    // =================================================

    return (

        <div className="flex h-screen overflow-hidden text-white bg-[url('/img/MathMillonario/fondo.png')] bg-cover bg-center">


            {/* =================================================
                CONTENIDO PRINCIPAL
            ================================================= */}

            <main className="
                flex
                min-w-0
                flex-1
                flex-col
            ">


                {/* HEADER */}

                <header className="
                    flex
                    h-16
                    shrink-0
                    items-center
                    justify-between
                    border-b
                    border-slate-800
                    bg-[#070b1d]
                    px-4
                    md:px-8
                ">


                    <button
                        onClick={() =>
                            navigate(
                                "/dashboard"
                            )
                        }
                        className="
                            flex
                            items-center
                            gap-2
                            text-sm
                            text-slate-400
                            hover:text-white
                        "
                    >

                        <FaArrowLeft />

                        <span className="hidden sm:block">
                            Salir
                        </span>

                    </button>


                    <div className="
                        text-center
                    ">

                        <p className="
                            text-[9px]
                            font-bold
                            uppercase
                            tracking-[0.35em]
                            text-cyan-400
                        ">

                            MathVision

                        </p>

                        <h1 className="
                            text-lg
                            font-black
                        ">

                            MATH MILLONARIO

                        </h1>

                    </div>


                    <div className="
                        flex
                        items-center
                        gap-3
                    ">

                        <button
                            onClick={() => {

                                setSoundEnabled(previous => {
                                    const newValue = !previous;
                                    if (
                                        newValue &&
                                        backgroundMusic
                                    ) {
                                        backgroundMusic
                                            .play()
                                            .catch(() => {});
                                    }
                                    if (
                                        !newValue &&
                                        backgroundMusic
                                    ) {
                                        backgroundMusic.pause();
                                    }
                                    return newValue;
                                });
                            }}
                            className="
                                rounded-lg
                                border
                                border-slate-700
                                p-2
                                text-slate-400
                                hover:text-white
                            "
                        >

                            {soundEnabled
                                ? <FaVolumeUp />
                                : <FaVolumeMute />
                            }

                        </button>


                        <div className="
                            flex
                            items-center
                            gap-1.5
                            text-red-400
                        ">

                            <FaHeart />

                            {lives}

                        </div>

                    </div>

                </header>


                {/* ÁREA DE PREGUNTA */}

                <section className="
                    flex
                    min-h-0
                    flex-1
                    flex-col
                    items-center
                    justify-center
                    px-4
                    py-6
                    md:px-10
                ">


                    {/* INDICADOR */}

                    <div className="
                        mb-5
                        text-center
                    ">

                        <p className="
                            text-xs
                            font-bold
                            uppercase
                            tracking-[0.2em]
                        " style={{backgroundColor:"rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: "4px"}}>

                            Pregunta {currentQuestion + 1} de {TOTAL_QUESTIONS}

                        </p>


                        <p className="
                            mt-2
                            text-
                            font-bold
                            text-yellow-300
                        "
                        style={{backgroundColor:"rgba(0,0,0,0.3)", padding: "4px 8px", borderRadius: "4px"}}>

                            Responde correctamente para acumular un total de{" "}

                            <span className="
                                text-lg
                                font-black
                                text-emerald-400
                            ">

                                ${nextMoney.toLocaleString("es-CO")}

                            </span>

                        </p>

                    </div>


                    {/* PREGUNTA */}

                    <motion.div
                        key={question.id}
                        initial={{
                            opacity: 0,
                            y: 25
                        }}
                        animate={{
                            opacity: 1,
                            y: 0
                        }}
                        className="
                            w-full
                            max-w-4xl
                        "
                    >

                        <div
                            style={{
                                clipPath:
                                    "polygon(40px 0%, calc(100% - 40px) 0%, 100% 50%, calc(100% - 40px) 100%, 40px 100%, 0% 50%)"
                            }}
                            className="
                                relative
                                border
                                border-cyan-500/20
                                bg-slate-900/90
                                p-5
                                px-10
                                text-center
                                shadow-[0_0_60px_rgba(34,211,238,0.06)]
                            "
                        >
                            <h2 className="text-xl font-bold leading-relaxed md:text-3xl">
                                {question.question}
                            </h2>
                        </div>


                        {/* RESPUESTAS */}

                        <div className="
                            mt-5
                            grid
                            gap-3
                            md:grid-cols-2
                        ">

                            {question.options.map(
                                (option, index) => {

                                    const hidden =
                                        hiddenAnswers.includes(
                                            index
                                        );


                                    const isSelected =
                                        selectedAnswer ===
                                        index;


                                    const isCorrect =
                                        index ===
                                        question.correctAnswer;


                                    return (

                                        <motion.button
                                            key={index}
                                            whileHover={!answered && !hidden ? { scale: 1.02 } : {}}
                                            whileTap={!answered && !hidden ? { scale: 0.98 } : {}}
                                            disabled={answered || hidden}
                                            onClick={() => handleAnswer(index)}
                                            style={{
                                                clipPath:
                                                    "polygon(24px 0%, calc(100% - 24px) 0%, 100% 50%, calc(100% - 24px) 100%, 24px 100%, 0% 50%)"
                                            }}
                                            className={`
                                                min-h-16
                                                px-8
                                                py-4
                                                text-left
                                                font-bold
                                                transition

                                                ${
                                                    hidden
                                                        ? "cursor-not-allowed bg-slate-900/30 text-transparent"
                                                        : isSelected && feedback === true
                                                            ? "bg-emerald-400/15 text-emerald-300"
                                                            : isSelected && feedback === false
                                                                ? "bg-red-400/15 text-red-300"
                                                                : "bg-slate-900/90 hover:bg-slate-800/80"
                                                }
                                            `}
                                        >
                                            <span className="mr-3 text-cyan-400">
                                                {String.fromCharCode(65 + index)}.
                                            </span>
                                            {hidden ? "Respuesta eliminada" : option}
                                        </motion.button>

                                    );

                                }
                            )}

                        </div>


                        {/* AYUDAS */}

                        <div className="
                            mt-5
                            flex
                            flex-wrap
                            justify-center
                            gap-3
                        ">


                            <button
                                disabled={
                                    fiftyUsed ||
                                    answered
                                }
                                onClick={
                                    useFiftyFifty
                                }
                                className={`
                                    flex
                                    items-center
                                    gap-2
                                    rounded-xl
                                    border
                                    px-4
                                    py-2
                                    text-xs
                                    font-black

                                    ${
                                        fiftyUsed
                                            ? "cursor-not-allowed border-slate-800 text-slate-600"
                                            : "border-yellow-500/30 text-yellow-400 hover:bg-yellow-400/10"
                                    }
                                `}
                            >

                                <span className="
                                    rounded-full
                                    border
                                    border-current
                                    px-1
                                ">
                                    50
                                </span>

                                50 / 50

                            </button>


                            <button
                                disabled={
                                    !canRetire ||
                                    answered
                                }
                                onClick={
                                    retireGame
                                }
                                className={`
                                    flex
                                    items-center
                                    gap-2
                                    rounded-xl
                                    border
                                    px-4
                                    py-2
                                    text-xs
                                    font-black

                                    ${
                                        canRetire
                                            ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-400/10"
                                            : "cursor-not-allowed border-slate-800 text-slate-600"
                                    }
                                `}
                            >

                                <FaFlagCheckered />

                                RETIRARSE

                            </button>

                        </div>

                    </motion.div>

                </section>

            </main>


            {/* =================================================
                ESCALERA DE DINERO
            ================================================= */}

            <aside className="
                hidden
                w-64
                shrink-0
                border-l
                border-slate-800
                bg-[#070b1d]
                lg:flex
                lg:flex-col
            ">

                <div className="
                    border-b
                    border-slate-800
                    p-5
                ">

                    <p className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-[0.25em]
                        text-slate-500
                    ">

                        Escalera

                    </p>


                    <p className="
                        mt-1
                        text-xl
                        font-black
                        text-yellow-400
                    ">

                        $1.000.000

                    </p>

                </div>


                <div className="
                    flex
                    flex-1
                    flex-col-reverse
                    justify-end
                    gap-1
                    overflow-hidden
                    p-4
                ">

                    {MONEY_LEVELS.map(
                        (money, index) => {

                            const level =
                                index + 1;


                            const active =
                                index ===
                                currentQuestion;


                            const reached =
                                index <
                                currentQuestion;


                            return (

                                <motion.div
                                    key={money}
                                    animate={{
                                        scale:
                                            active
                                                ? 1.03
                                                : 1
                                    }}
                                    className={`
                                        flex
                                        items-center
                                        justify-between
                                        rounded-lg
                                        px-4
                                        py-2
                                        text-sm
                                        font-bold

                                        ${
                                            active
                                                ? "bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-400/30"
                                                : reached
                                                    ? "text-slate-600"
                                                    : level === 5 || level === 10
                                                        ? "text-yellow-400"
                                                        : "text-slate-400"
                                        }
                                    `}
                                >

                                    <span className="
                                        text-[10px]
                                        text-slate-600
                                    ">

                                        {level}

                                    </span>


                                    <span>

                                        ${money.toLocaleString(
                                            "es-CO"
                                        )}

                                    </span>

                                </motion.div>

                            );

                        }
                    )}

                </div>


                <div className="
                    border-t
                    border-slate-800
                    p-5
                ">

                    <div className="
                        flex
                        items-center
                        justify-between
                        text-xs
                    ">

                        <span className="
                            text-slate-500
                        ">

                            Acumulado

                        </span>

                        <span className="
                            font-black
                            text-emerald-400
                        ">

                            ${wonMoney.toLocaleString(
                                "es-CO"
                            )}

                        </span>

                    </div>

                </div>

            </aside>


            {/* FEEDBACK */}

            <AnimatePresence>

                {feedback !== null && (

                    <motion.div
                        initial={{
                            opacity: 0,
                            scale: 0.8,
                            y: 20
                        }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0
                        }}
                        exit={{
                            opacity: 0,
                            scale: 0.8
                        }}
                        className={`
                            fixed
                            bottom-6
                            left-1/2
                            z-50
                            -translate-x-1/2
                            rounded-full
                            border
                            px-6
                            py-3
                            text-sm
                            font-black
                            shadow-2xl

                            ${
                                feedback
                                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                                    : "border-red-400/30 bg-red-400/10 text-red-400"
                            }
                        `}
                    >

                        {feedback
                            ? "✓ RESPUESTA CORRECTA"
                            : "✕ RESPUESTA INCORRECTA"
                        }

                    </motion.div>

                )}

            </AnimatePresence>

        </div>

    );

}