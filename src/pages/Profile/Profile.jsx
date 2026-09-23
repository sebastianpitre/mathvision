import React, {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    useNavigate,
    useParams
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
    FaUser
} from "react-icons/fa";

import { Canvas } from "@react-three/fiber";
import {
    OrbitControls,
    Environment
} from "@react-three/drei";

import {
    useAuth
} from "../../context/AuthContext";

import AssetImage from "../../components/common/AssetImage";
import VRMCharacter from "../../components/character/VRMCharacter";

import assets from "../../data/mock/assets.json";
import icons from "../../data/mock/icons.json";

import "./profile.css";


const API_URL =
    `http://${window.location.hostname}:3000/api`;


export default function Profile() {

    const navigate = useNavigate();

    const {
        user,
        refreshUser
    } = useAuth();

    const {
        id
    } = useParams();


    const [profile, setProfile] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [savingAvatar, setSavingAvatar] =
        useState(false);

    const [selectedAvatar, setSelectedAvatar] =
        useState(null);

    const [message, setMessage] =
        useState("");


    const token =
        localStorage.getItem(
            "mathvision_token"
        );


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
                                        `Bearer ${token}`
                                }
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


                    setProfile(data.user);

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


                setProfile(data.user);

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
        user
    ]);


    /* =====================================================
       PERSONAJE
       ===================================================== */

    const characterModel =
        profile?.character_model_path ||
        assets.characters.defaultModel;


    /* =====================================================
       PROGRESO XP
       ===================================================== */

    const xpProgress =
        useMemo(() => {

            if (!profile) {
                return 0;
            }

            return (
                Number(profile.xp || 0) % 1000
            ) / 10;

        }, [profile]);


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
                                `Bearer ${token}`
                        },

                        body: JSON.stringify({
                            avatar:
                                selectedAvatar
                        })
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
                            selectedAvatar
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
            <div className="profile-page">
                <div className="profile-loading">
                    CARGANDO PERFIL...
                </div>
            </div>
        );
    }


    /* =====================================================
       ERROR
       ===================================================== */

    if (!profile) {

        return (
            <div className="profile-page">

                <div className="profile-error">

                    <FaUser size={42} />

                    <h2>
                        PERFIL NO ENCONTRADO
                    </h2>

                    <p>
                        {message ||
                            "No existe este jugador."}
                    </p>

                    <button
                        onClick={() =>
                            navigate(-1)
                        }
                    >
                        VOLVER
                    </button>

                </div>

            </div>
        );
    }


    return (

        <div
            className="profile-page"
            style={{
                backgroundImage:
                    `linear-gradient(
                        rgba(5, 8, 18, .82),
                        rgba(5, 8, 18, .92)
                    ),
                    url(${assets.backgrounds.lobby})`
            }}
        >

            {/* =================================================
                HEADER
            ================================================= */}

            <header className="profile-header">

                <button
                    className="profile-back"
                    onClick={() =>
                        navigate(-1)
                    }
                >
                    <FaArrowLeft />
                    VOLVER
                </button>


                <div className="profile-title">

                    <span>
                        PERFIL
                    </span>

                    <strong>
                        {profile.display_name ||
                            profile.username}
                    </strong>

                </div>

            </header>


            <main className="profile-content">

                {/* =================================================
                    IZQUIERDA — PERSONAJE
                ================================================= */}

                <section className="profile-character-card">

                    <div className="profile-character-title">
                        PERSONAJE
                    </div>


                    <div className="profile-character">

                        <Canvas
                            camera={{
                                position: [
                                    0,
                                    1.4,
                                    3.4
                                ],
                                fov: 35
                            }}
                        >

                            <ambientLight
                                intensity={1.8}
                            />

                            <directionalLight
                                position={[
                                    3,
                                    5,
                                    3
                                ]}
                                intensity={3}
                            />

                            <Environment
                                preset="city"
                            />

                            <React.Suspense
                                fallback={null}
                            >

                                <VRMCharacter
                                    key={characterModel}
                                    url={
                                        characterModel
                                    }
                                />

                            </React.Suspense>


                            <OrbitControls
                                enablePan={false}
                                minDistance={2}
                                maxDistance={5}
                                target={[
                                    0,
                                    1.1,
                                    0
                                ]}
                            />

                        </Canvas>

                    </div>


                    <div className="profile-character-name">

                        <small>
                            PERSONAJE ACTUAL
                        </small>

                        <strong>
                            {profile.character_name ||
                                "Personaje"}
                        </strong>

                    </div>

                </section>


                {/* =================================================
                    CENTRO — INFORMACIÓN
                ================================================= */}

                <section className="profile-info-card">

                    <div className="profile-user-top">

                        <div className="profile-avatar-wrapper">

                            <AssetImage
                                src={
                                    profile.avatar
                                }
                                type="player"
                                alt={
                                    profile.display_name
                                }
                                className="profile-avatar"
                            />

                            {isOwnProfile && (

                                <div className="profile-camera">
                                    <FaCamera />
                                </div>

                            )}

                        </div>


                        <div>

                            <div className="profile-name">
                                {profile.display_name ||
                                    profile.username}
                            </div>

                            <div className="profile-username">
                                @{profile.username}
                            </div>

                            <div className="profile-level">
                                NIVEL {profile.level}
                            </div>

                        </div>

                    </div>


                    {/* XP */}

                    <div className="profile-xp">

                        <div className="profile-xp-header">

                            <span>
                                EXPERIENCIA
                            </span>

                            <strong>
                                {profile.xp || 0} XP
                            </strong>

                        </div>


                        <div className="profile-xp-bar">

                            <div
                                style={{
                                    width:
                                        `${xpProgress}%`
                                }}
                            />

                        </div>

                    </div>


                    {/* CURRENCIES */}

                    <div className="profile-currencies">

                        <div>

                            <FaCoins />

                            <span>
                                {profile.coins || 0}
                            </span>

                            <small>
                                MONEDAS
                            </small>

                        </div>


                        <div>

                            <FaGem />

                            <span>
                                {profile.gems || 0}
                            </span>

                            <small>
                                GEMAS
                            </small>

                        </div>

                    </div>


                    {/* STATS */}

                    <div className="profile-stats">

                        <div>
                            <FaGamepad />
                            <strong>
                                {profile.games_played || 0}
                            </strong>
                            <span>
                                PARTIDAS
                            </span>
                        </div>


                        <div>
                            <FaTrophy />
                            <strong>
                                {profile.games_won || 0}
                            </strong>
                            <span>
                                VICTORIAS
                            </span>
                        </div>


                        <div>
                            <FaQuestionCircle />
                            <strong>
                                {profile.questions_answered || 0}
                            </strong>
                            <span>
                                PREGUNTAS
                            </span>
                        </div>


                        <div>
                            <FaCheckCircle />
                            <strong>
                                {profile.correct_answers || 0}
                            </strong>
                            <span>
                                CORRECTAS
                            </span>
                        </div>


                        <div>
                            <FaTimesCircle />
                            <strong>
                                {profile.incorrect_answers || 0}
                            </strong>
                            <span>
                                INCORRECTAS
                            </span>
                        </div>


                        <div>
                            <FaGamepad />
                            <strong>
                                {profile.games_lost || 0}
                            </strong>
                            <span>
                                DERROTAS
                            </span>
                        </div>

                    </div>

                </section>


                {/* =================================================
                    DERECHA — AVATAR
                ================================================= */}

                {isOwnProfile && (

                    <section className="profile-avatar-card">

                        <div className="profile-avatar-title">
                            FOTO DE PERFIL
                        </div>


                        <div className="profile-avatar-grid">

                            {icons.map(
                                (icon) => (

                                    <button
                                        key={
                                            icon.id
                                        }
                                        className={
                                            selectedAvatar ===
                                                icon.src
                                                ? "selected"
                                                : ""
                                        }
                                        onClick={() =>
                                            setSelectedAvatar(
                                                icon.src
                                            )
                                        }
                                    >

                                        <AssetImage
                                            src={
                                                icon.src
                                            }
                                            type="player"
                                            alt={
                                                icon.name
                                            }
                                        />

                                    </button>

                                )
                            )}

                        </div>


                        <button
                            className="profile-save"
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
                                : "GUARDAR FOTO"}

                        </button>


                        {message && (

                            <div
                                className={
                                    "profile-message"
                                }
                            >
                                {message}
                            </div>

                        )}

                    </section>

                )}

            </main>

        </div>
    );
}