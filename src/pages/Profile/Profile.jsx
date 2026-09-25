import React, {
    Suspense,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    FaArrowLeft,
    FaCoins,
    FaGem,
    FaGamepad,
    FaTrophy,
    FaQuestionCircle,
    FaCheckCircle,
    FaTimesCircle,
    FaCamera,
    FaSave,
    FaUser,
} from "react-icons/fa";

import {
    Canvas,
} from "@react-three/fiber";

import {
    OrbitControls,
    Environment,
} from "@react-three/drei";

import {
    useAuth,
} from "../../context/AuthContext";

import navigation from "../../data/mock/navigation.json";
import assets from "../../data/mock/assets.json";
import icons from "../../data/mock/icons.json";

import AssetImage from "../../components/common/AssetImage";
import VRMCharacter from "../../components/character/VRMCharacter";
import MainNav from "../../components/navigation/MainNav";



const API_URL =
    `http://${window.location.hostname}:3000/api`;



export default function Profile() {

    const navigate =
        useNavigate();

    const {
        user,
        refreshUser,
    } = useAuth();

    const {
        id,
    } = useParams();


    /* =====================================================
       ESTADOS
    ===================================================== */

    const [
        profile,
        setProfile
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        savingAvatar,
        setSavingAvatar
    ] = useState(false);

    const [
        selectedAvatar,
        setSelectedAvatar
    ] = useState(null);

    const [
        message,
        setMessage
    ] = useState("");


    /* =====================================================
       TOKEN
    ===================================================== */

    const token =
        localStorage.getItem(
            "mathvision_token"
        );


    /* =====================================================
       PERFIL PROPIO
    ===================================================== */

    const isOwnProfile =
        !id ||
        (
            user?.id &&
            String(user.id) === String(id)
        );


    /* =====================================================
       CARGAR PERFIL
    ===================================================== */

    useEffect(() => {

        async function loadProfile() {

            setLoading(true);
            setMessage("");


            try {

                if (isOwnProfile) {

                    const response =
                        await fetch(
                            `${API_URL}/users/profile`,
                            {
                                headers: {
                                    Authorization:
                                        `Bearer ${token}`,
                                },
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            data.message ||
                            "No fue posible cargar tu perfil."
                        );

                    }


                    setProfile(
                        data.user
                    );


                    setSelectedAvatar(
                        data.user.avatar ||
                        assets.players.defaultAvatar
                    );


                    return;
                }


                const response =
                    await fetch(
                        `${API_URL}/users/profile/${id}`
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Jugador no encontrado."
                    );

                }


                setProfile(
                    data.user
                );


                setSelectedAvatar(
                    data.user.avatar ||
                    assets.players.defaultAvatar
                );


            } catch (error) {

                console.error(
                    "❌ Error cargando perfil:",
                    error
                );


                setMessage(
                    error.message ||
                    "No fue posible cargar el perfil."
                );


            } finally {

                setLoading(false);

            }

        }


        loadProfile();

    }, [
        id,
        isOwnProfile,
        user,
        token,
    ]);


    /* =====================================================
       PERSONAJE
    ===================================================== */

    const characterModel =
        profile?.character_model_path ||
        assets.characters.defaultModel;


    /* =====================================================
       XP
    ===================================================== */

    const xpProgress =
        useMemo(() => {

            if (!profile) {
                return 0;
            }


            return (
                Number(
                    profile.xp || 0
                ) % 1000
            ) / 10;

        }, [
            profile
        ]);


    /* =====================================================
       AVATAR
    ===================================================== */

    const profileAvatar =
        profile?.avatar ||
        assets.players.defaultAvatar;


    /* =====================================================
       DATOS PARA MAIN NAV
    ===================================================== */

    const navPlayer = {

        avatar:
            user?.avatar ||
            assets.players.defaultAvatar,

        displayName:
            user?.display_name ||
            user?.username ||
            "Jugador",

        level:
            Number(
                user?.level
            ) || 1,

        experience: {

            percentage:
                Math.min(
                    100,
                    Math.max(
                        0,
                        (
                            (
                                Number(
                                    user?.xp
                                ) || 0
                            ) % 1000
                        ) / 10
                    )
                ),

        },

        currencies: {

            coins:
                Number(
                    user?.coins
                ) || 0,

            gems:
                Number(
                    user?.gems
                ) || 0,

        },

    };


    /* =====================================================
       GUARDAR AVATAR
    ===================================================== */

    async function handleSaveAvatar() {

        if (!isOwnProfile) {
            return;
        }


        if (!selectedAvatar) {
            return;
        }


        setSavingAvatar(true);
        setMessage("");


        try {

            const response =
                await fetch(
                    `${API_URL}/users/avatar`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`,
                        },

                        body: JSON.stringify({
                            avatar:
                                selectedAvatar,
                        }),
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "No fue posible guardar el avatar."
                );

            }


            const updatedUser =
                await refreshUser();


            if (updatedUser) {

                setProfile(
                    updatedUser
                );


                setSelectedAvatar(
                    updatedUser.avatar ||
                    assets.players.defaultAvatar
                );

            } else {

                setProfile(
                    previous => ({
                        ...previous,
                        avatar:
                            selectedAvatar,
                    })
                );

            }


            setMessage(
                "FOTO DE PERFIL ACTUALIZADA"
            );


        } catch (error) {

            console.error(
                "❌ Error guardando avatar:",
                error
            );


            setMessage(
                error.message ||
                "No fue posible guardar el avatar."
            );


        } finally {

            setSavingAvatar(false);

        }

    }


    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {

        return (

            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 text-white">

                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            `url(${assets.backgrounds.lobby})`,
                    }}
                />

                <div className="absolute inset-0 bg-slate-950/70" />


                <div className="relative z-10 text-center">

                    <FaUser
                        className="mx-auto mb-4 animate-pulse text-4xl text-cyan-400"
                    />

                    <p className="text-xs font-black tracking-[0.25em] text-white/60">
                        CARGANDO PERFIL...
                    </p>

                </div>

            </div>

        );

    }


    /* =====================================================
       ERROR
    ===================================================== */

    if (!profile) {

        return (

            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-white">

                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            `url(${assets.backgrounds.lobby})`,
                    }}
                />

                <div className="absolute inset-0 bg-slate-950/75" />


                <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/80 p-7 text-center shadow-2xl backdrop-blur-xl">

                    <FaUser
                        className="mx-auto mb-4 text-4xl text-red-400"
                    />

                    <h2 className="text-xl font-black">
                        PERFIL NO ENCONTRADO
                    </h2>

                    <p className="mt-2 text-sm text-white/50">
                        {message ||
                            "No existe este jugador."}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(-1)
                        }
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-xs font-black transition hover:bg-white/15"
                    >
                        <FaArrowLeft />
                        VOLVER
                    </button>

                </section>

            </div>

        );

    }


    /* =====================================================
       PÁGINA
    ===================================================== */

    return (

        <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">


            {/* =================================================
                BACKGROUND
            ================================================= */}

            <div
                className="fixed inset-0 bg-cover bg-center"
                style={{
                    backgroundImage:
                        `url(${assets.backgrounds.lobby})`,
                }}
            />

            <div className="fixed inset-0 bg-slate-950/55" />


            {/* =================================================
                CONTENIDO
            ================================================= */}

            <main className="relative z-10 mx-auto flex h-[calc(100vh-72px)] w-full max-w-[1500px] flex-col overflow-hidden px-3 py-2 sm:px-4 lg:px-5">


                {/* =================================================
                    CABECERA
                ================================================= */}

                <div className="mb-2 flex shrink-0 items-center justify-between">

                    <div className="min-w-0">

                        <span className="text-[10px] font-black tracking-[0.25em] text-cyan-400">
                            MATHVISION
                        </span>

                        <h1 className="truncate text-xl font-black sm:text-2xl">
                            {profile.display_name ||
                                profile.username}
                        </h1>

                    </div>


                    <button
                        type="button"
                        onClick={() =>
                            navigate(-1)
                        }
                        className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/70 transition hover:bg-white/10 hover:text-white"
                        aria-label="Volver"
                    >

                        <FaArrowLeft />

                        <span className="hidden sm:inline">
                            VOLVER
                        </span>

                    </button>

                </div>


                {/* =================================================
                    MENSAJE
                ================================================= */}

                {message && (

                    <div
                        role="status"
                        className="mb-2 shrink-0 rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-2 text-center text-[10px] font-black tracking-wide text-cyan-300"
                    >
                        {message}
                    </div>

                )}


                {/* =================================================
                    GRID
                ================================================= */}

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(210px,0.8fr)_minmax(360px,1.4fr)_minmax(210px,0.8fr)]">

                    {/* =================================================
                        PERSONAJE
                    ================================================= */}

                    <section className="flex  min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-xl backdrop-blur-xl lg:min-h-0">


                        <div className="shrink-0 border-b border-white/10 px-4 py-3">

                            <span className="text-[10px] font-black tracking-[0.2em] text-cyan-400">
                                PERSONAJE
                            </span>

                            <h2 className="mt-1 truncate text-base font-black">
                                {profile.character_name ||
                                    "Personaje"}
                            </h2>

                        </div>


                        {/* =================================================
                            CANVAS
                        ================================================= */}

                        <div className="relative min-h-0 flex-1">

                            <Canvas
                                className="h-full w-full"
                                camera={{
                                    position: [
                                        0,
                                        1.4,
                                        3.4,
                                    ],
                                    fov: 35,
                                }}
                            >

                                <ambientLight
                                    intensity={1.8}
                                />

                                <directionalLight
                                    position={[
                                        3,
                                        5,
                                        3,
                                    ]}
                                    intensity={3}
                                />

                                <Environment
                                    preset="city"
                                />


                                <Suspense
                                    fallback={null}
                                >

                                    <VRMCharacter
                                        key={
                                            characterModel
                                        }
                                        url={
                                            characterModel
                                        }
                                    />

                                </Suspense>


                                <OrbitControls
                                    enablePan={false}
                                    minDistance={2}
                                    maxDistance={5}
                                    target={[
                                        0,
                                        1.1,
                                        0,
                                    ]}
                                />

                            </Canvas>

                        </div>


                        <div className="shrink-0 border-t border-white/10 bg-black/20 px-4 py-3">

                            <span className="text-[9px] font-black tracking-[0.18em] text-white/35">
                                PERSONAJE ACTUAL
                            </span>

                            <strong className="mt-1 block truncate text-sm">
                                {profile.character_name ||
                                    "Personaje"}
                            </strong>

                        </div>

                    </section>


                    {/* =================================================
                        INFORMACIÓN
                    ================================================= */}

                    <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-xl backdrop-blur-xl sm:p-5">


                        {/* =================================================
                            USUARIO
                        ================================================= */}

                        <div className="flex items-center gap-3">

                            <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">

                                <AssetImage
                                    src={
                                        profileAvatar
                                    }
                                    type="player"
                                    alt={
                                        profile.display_name ||
                                        profile.username
                                    }
                                    className="h-full w-full rounded-full border-2 border-cyan-400/40 object-cover"
                                />

                                <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-950 bg-cyan-500 text-white">

                                    <FaCamera
                                        size={9}
                                    />

                                </div>

                            </div>


                            <div className="min-w-0">

                                <h2 className="truncate text-xl font-black sm:text-2xl">
                                    {profile.display_name ||
                                        profile.username}
                                </h2>

                                <p className="truncate text-xs text-white/40 sm:text-sm">
                                    @{profile.username}
                                </p>

                                <span className="mt-1.5 inline-flex rounded-lg bg-cyan-400/10 px-2 py-1 text-[9px] font-black tracking-wider text-cyan-400">
                                    NIVEL {profile.level}
                                </span>

                            </div>

                        </div>


                        {/* =================================================
                            XP
                        ================================================= */}

                        <div className="mt-5">

                            <div className="mb-2 flex items-center justify-between">

                                <span className="text-[10px] font-black tracking-[0.18em] text-white/40">
                                    EXPERIENCIA
                                </span>

                                <strong className="text-xs text-cyan-400">
                                    {profile.xp || 0} XP
                                </strong>

                            </div>


                            <div
                                className="h-2 overflow-hidden rounded-full bg-white/10"
                                role="progressbar"
                                aria-valuenow={
                                    xpProgress
                                }
                                aria-valuemin="0"
                                aria-valuemax="100"
                                aria-label="Progreso de experiencia"
                            >

                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                                    style={{
                                        width:
                                            `${xpProgress}%`,
                                    }}
                                />

                            </div>

                        </div>


                        {/* =================================================
                            MONEDAS / GEMAS
                        ================================================= */}

                        <div className="mt-4 grid grid-cols-2 gap-2">

                            <div className="rounded-xl border border-yellow-400/10 bg-yellow-400/5 p-3">

                                <FaCoins className="mb-1.5 text-yellow-400" />

                                <strong className="block text-lg font-black">
                                    {profile.coins || 0}
                                </strong>

                                <span className="text-[9px] font-black tracking-wide text-white/35">
                                    MONEDAS
                                </span>

                            </div>


                            <div className="rounded-xl border border-purple-400/10 bg-purple-400/5 p-3">

                                <FaGem className="mb-1.5 text-purple-400" />

                                <strong className="block text-lg font-black">
                                    {profile.gems || 0}
                                </strong>

                                <span className="text-[9px] font-black tracking-wide text-white/35">
                                    GEMAS
                                </span>

                            </div>

                        </div>


                        {/* =================================================
                            ESTADÍSTICAS
                        ================================================= */}

                        <div className="mt-4">

                            <div className="mb-2">

                                <span className="text-[10px] font-black tracking-[0.18em] text-white/40">
                                    ESTADÍSTICAS
                                </span>

                            </div>


                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

                                <Stat
                                    icon={
                                        <FaGamepad />
                                    }
                                    value={
                                        profile.games_played
                                    }
                                    label="PARTIDAS"
                                    color="text-blue-400"
                                />

                                <Stat
                                    icon={
                                        <FaTrophy />
                                    }
                                    value={
                                        profile.games_won
                                    }
                                    label="VICTORIAS"
                                    color="text-yellow-400"
                                />

                                <Stat
                                    icon={
                                        <FaQuestionCircle />
                                    }
                                    value={
                                        profile.questions_answered
                                    }
                                    label="PREGUNTAS"
                                    color="text-cyan-400"
                                />

                                <Stat
                                    icon={
                                        <FaCheckCircle />
                                    }
                                    value={
                                        profile.correct_answers
                                    }
                                    label="CORRECTAS"
                                    color="text-emerald-400"
                                />

                                <Stat
                                    icon={
                                        <FaTimesCircle />
                                    }
                                    value={
                                        profile.incorrect_answers
                                    }
                                    label="INCORRECTAS"
                                    color="text-red-400"
                                />

                                <Stat
                                    icon={
                                        <FaGamepad />
                                    }
                                    value={
                                        profile.games_lost
                                    }
                                    label="DERROTAS"
                                    color="text-orange-400"
                                />

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        AVATAR
                    ================================================= */}

                    {isOwnProfile ? (

                        <section className="flex  min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-xl backdrop-blur-xl lg:min-h-0">


                            <div className="shrink-0 border-b border-white/10 px-4 py-3">

                                <span className="text-[10px] font-black tracking-[0.2em] text-purple-400">
                                    PERSONALIZACIÓN
                                </span>

                                <h2 className="mt-1 text-base font-black">
                                    FOTO DE PERFIL
                                </h2>

                            </div>


                            {/* AVATARES */}

                            <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto p-3 sm:grid-cols-3 lg:grid-cols-2">

                                {icons.map(
                                    (icon) => (

                                        <button
                                            key={
                                                icon.id
                                            }
                                            type="button"
                                            onClick={() =>
                                                setSelectedAvatar(
                                                    icon.src
                                                )
                                            }
                                            aria-label={
                                                `Seleccionar ${icon.name}`
                                            }
                                            aria-pressed={
                                                selectedAvatar ===
                                                icon.src
                                            }
                                            className={`
                                                overflow-hidden rounded-xl border-2 p-1 transition-all duration-200
                                                ${selectedAvatar ===
                                                    icon.src
                                                    ? "border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-400/10"
                                                    : "border-transparent bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]"
                                                }
                                            `}
                                        >

                                            <AssetImage
                                                src={
                                                    icon.src
                                                }
                                                type="player"
                                                alt={
                                                    icon.name
                                                }
                                                className="aspect-square w-full rounded-lg object-cover"
                                            />

                                        </button>

                                    )
                                )}

                            </div>


                            {/* GUARDAR */}

                            <div className="shrink-0 border-t border-white/10 p-3">

                                <button
                                    type="button"
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                                    disabled={
                                        savingAvatar ||
                                        selectedAvatar ===
                                        profile.avatar
                                    }
                                    onClick={
                                        handleSaveAvatar
                                    }
                                >

                                    <FaSave />

                                    {savingAvatar
                                        ? "GUARDANDO..."
                                        : "GUARDAR FOTO"
                                    }

                                </button>

                            </div>

                        </section>

                    ) : (

                        <section className="flex  items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 p-5 text-center shadow-xl backdrop-blur-xl lg:min-h-0">

                            <div>

                                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-purple-400/10 text-purple-400">

                                    <FaUser />

                                </div>

                                <p className="text-xs font-black tracking-widest text-white/40">
                                    PERFIL PÚBLICO
                                </p>

                                <p className="mt-2 text-sm text-white/50">
                                    Esta sección pertenece a la personalización del propietario.
                                </p>

                            </div>

                        </section>

                    )}

                </div>

            </main>

        </div>

    );

}



/* =========================================================
   ESTADÍSTICA
========================================================= */

function Stat({
    icon,
    value,
    label,
    color,
}) {

    return (

        <div
            className="rounded-xl border border-white/5 bg-white/[0.035] p-2.5 transition hover:bg-white/[0.06]"
        >

            <div
                className={`mb-1.5 ${color}`}
                aria-hidden="true"
            >
                {icon}
            </div>

            <strong className="block text-base font-black sm:text-lg">
                {value || 0}
            </strong>

            <span className="text-[8px] font-black tracking-wide text-white/35">
                {label}
            </span>

        </div>

    );

}