import React, { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";

import {
    FaArrowRight,
    FaBell,
    FaCheck,
    FaCircle,
    FaGamepad,
    FaGlobeAmericas,
    FaLock,
    FaPaperPlane,
    FaTimes,
    FaTrophy,
    FaUserPlus,
    FaUsers,
} from "react-icons/fa";

import "../styles/mathvision.css";

import {
    useAuth
} from "../context/AuthContext";

import rooms from "../data/mock/rooms.json";
import games from "../data/mock/games.json";
import navigation from "../data/mock/navigation.json";
import assets from "../data/mock/assets.json";

import AssetImage from "../components/common/AssetImage";
import VRMCharacter from "../components/character/VRMCharacter";

import { socket } from "../services/socket";


/* =========================================================
   TARJETA DE JUEGO
   ========================================================= */

function GameCard({ game, onClick }) {
    return (
        <button
            className="lobby-game-card"
            style={{ "--game-color": game.color }}
            onClick={onClick}
        >
            <div className="lobby-game-glow" />

            <div className="lobby-game-icon">
                {game.icon}
            </div>

            <div className="lobby-game-content">
                <strong>
                    {game.name}
                </strong>

                <span>
                    {game.description}
                </span>

                <small>
                    <FaUsers />
                    {" "}
                    {game.minPlayers}
                    {game.maxPlayers !== game.minPlayers &&
                        ` - ${game.maxPlayers}`}
                    {game.maxPlayers === game.minPlayers &&
                        " jugadores"}
                </small>
            </div>

            <div className="lobby-game-arrow">
                <FaArrowRight />
            </div>
        </button>
    );
}


/* =========================================================
   LOBBY
   ========================================================= */

export default function Lobby() {

    const navigate = useNavigate();

    const {
        user,
        loading,
    } = useAuth();

    /* =====================================================
       ONLINE
       ===================================================== */

    const [onlinePlayers, setOnlinePlayers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [onlineMessage, setOnlineMessage] = useState("");


    /* =====================================================
       CONEXIÓN AL MUNDO ONLINE
       ===================================================== */

    useEffect(() => {

        if (!user) {
            return;
        }


        /*
         * Cuando Socket.IO conecta,
         * entramos al mundo online.
         */

        const handleConnect = () => {

            socket.emit("world:join");

        };


        /*
         * Lista actualizada de jugadores.
         */

        const handlePlayers = (data = {}) => {
            console.log("🌎 Jugadores recibidos en Lobby:", data);
            console.log("👤 Usuario actual:", user);

            const players = Array.isArray(data)
                ? data
                : Array.isArray(data.players)
                    ? data.players
                    : [];

            const currentUserId =
                user?.id ||
                user?.user_id ||
                user?.userId;

            const otherPlayers = currentUserId
                ? players.filter(
                    (player) =>
                        String(player.id) !== String(currentUserId)
                )
                : players;

            console.log("👥 Otros jugadores online:", otherPlayers);

            setOnlinePlayers(otherPlayers);
        };

        /*
         * Invitación recibida.
         */

        const handleInvitation = (invitation) => {

            if (!invitation) {
                return;
            }

            setInvitations((current) => {

                const invitationId =
                    invitation.fromPlayerId ||
                    invitation.fromPlayer?.id ||
                    invitation.playerId ||
                    invitation.id;

                const exists =
                    current.some(
                        (item) =>
                            (
                                item.fromPlayerId ||
                                item.fromPlayer?.id ||
                                item.playerId ||
                                item.id
                            ) === invitationId
                    );

                if (exists) {
                    return current;
                }

                return [
                    ...current,
                    invitation,
                ];

            });

        };


        /*
         * Confirmación de invitación enviada.
         */

        const handleInviteSent = () => {

            setOnlineMessage(
                "Invitación enviada"
            );

            setTimeout(() => {
                setOnlineMessage("");
            }, 2500);

        };


        /*
         * Una invitación que nosotros enviamos
         * fue rechazada.
         */

        const handleInvitationRejected = ({
            playerName,
        } = {}) => {

            setOnlineMessage(
                playerName
                    ? `${playerName} rechazó la invitación`
                    : "La invitación fue rechazada"
            );

            setTimeout(() => {
                setOnlineMessage("");
            }, 3000);

        };


        /*
         * La partida fue creada al aceptar
         * una invitación.
         *
         * Conservamos el comportamiento actual
         * del proyecto: Triqui inicia directamente.
         */

        const handleGameCreated = () => {

            navigate("/games/triqui");

        };


        /*
         * Registramos listeners antes de conectar.
         */

        socket.on("connect", handleConnect);

        socket.on(
            "world:players",
            handlePlayers
        );

        socket.on(
            "world:invitation",
            handleInvitation
        );

        socket.on(
            "world:inviteSent",
            handleInviteSent
        );

        socket.on(
            "world:invitationRejected",
            handleInvitationRejected
        );

        socket.on(
            "world:gameCreated",
            handleGameCreated
        );


        /*
         * Si ya estaba conectado porque venimos
         * desde /world, simplemente entramos otra vez.
         */

        if (socket.connected) {

            socket.emit("world:join");

        } else {

            socket.connect();

        }


        return () => {

            socket.off(
                "connect",
                handleConnect
            );

            socket.off(
                "world:players",
                handlePlayers
            );

            socket.off(
                "world:invitation",
                handleInvitation
            );

            socket.off(
                "world:inviteSent",
                handleInviteSent
            );

            socket.off(
                "world:invitationRejected",
                handleInvitationRejected
            );

            socket.off(
                "world:gameCreated",
                handleGameCreated
            );

        };

    }, [user, navigate]);


    /* =====================================================
       INVITAR JUGADOR
       ===================================================== */

    const handleInvite = (player) => {

        if (!player) {
            return;
        }

        if (player.status !== "available") {
            return;
        }

        socket.emit(
            "world:invite",
            {
                targetPlayerId: player.id,
            }
        );

    };


    /* =====================================================
       ACEPTAR INVITACIÓN
       ===================================================== */

    const handleAcceptInvitation = (invitation) => {

        const fromPlayerId =
            invitation?.fromPlayerId ||
            invitation?.fromPlayer?.id ||
            invitation?.playerId;

        if (!fromPlayerId) {
            return;
        }

        setInvitations((current) =>
            current.filter(
                (item) =>
                    (
                        item.fromPlayerId ||
                        item.fromPlayer?.id ||
                        item.playerId
                    ) !== fromPlayerId
            )
        );

        socket.emit(
            "world:acceptInvitation",
            {
                fromPlayerId,
            }
        );

    };


    /* =====================================================
       RECHAZAR INVITACIÓN
       ===================================================== */

    const handleRejectInvitation = (invitation) => {

        const fromPlayerId =
            invitation?.fromPlayerId ||
            invitation?.fromPlayer?.id ||
            invitation?.playerId;

        if (!fromPlayerId) {
            return;
        }

        setInvitations((current) =>
            current.filter(
                (item) =>
                    (
                        item.fromPlayerId ||
                        item.fromPlayer?.id ||
                        item.playerId
                    ) !== fromPlayerId
            )
        );

        socket.emit(
            "world:rejectInvitation",
            {
                fromPlayerId,
            }
        );

    };


    /* =====================================================
       CARGANDO
       ===================================================== */

    if (loading) {

        return (
            <div className="mv-app lobby-page">

                <div className="lobby-background" />

                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "20px",
                        fontWeight: "bold",
                    }}
                >
                    Cargando perfil...
                </div>

            </div>
        );

    }


    /* =====================================================
       SIN SESIÓN
       ===================================================== */

    if (!user) {

        return (
            <div className="mv-app lobby-page">

                <div className="lobby-background" />

                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        gap: "20px",
                    }}
                >

                    <h1>
                        Sesión no encontrada
                    </h1>

                    <button
                        className="mv-btn mv-btn-primary"
                        onClick={() => navigate("/")}
                    >
                        INICIAR SESIÓN
                    </button>

                </div>

            </div>
        );

    }


    /* =====================================================
       PERFIL
       ===================================================== */

    const xp =
        Number(user.xp) || 0;

    const level =
        Number(user.level) || 1;

    const xpPercentage =
        Math.min(
            100,
            Math.max(
                0,
                ((xp % 1000) / 1000) * 100
            )
        );


    const player = {

        displayName:
            user.display_name ||
            user.username ||
            "Jugador",

        level,

        avatar:
            user.avatar ||
            assets.players.defaultAvatar,

        characterModel:
            user.character_model_path || null,

        characterName:
            user.character_name ||
            "Personaje",

        experience: {

            current:
                xp % 1000,

            percentage:
                xpPercentage,

        },

        currencies: {

            coins:
                Number(user.coins) || 0,

            gems:
                Number(user.gems) || 0,

        },

        statistics: {

            wins:
                Number(user.games_won) || 0,

            matches:
                Number(user.games_played) || 0,

            winStreak:
                0,

        },

        statusLabel:
            "ONLINE",

    };


    /* =====================================================
       RENDER
       ===================================================== */

    return (
        <div className="mv-app lobby-page">

            {/* =================================================
                BACKGROUND
               ================================================= */}

            <div
                className="lobby-background"
                style={{
                    backgroundImage:
                        `url(${assets.backgrounds.lobby})`
                }}
            />


            {/* =================================================
                HEADER
               ================================================= */}

            <header className="mv-header lobby-header">

                <div
                    className="mv-logo"
                    onClick={() => navigate("/")}
                >

                    <div className="mv-logo-main">
                        LUDO<span>RA</span>
                    </div>

                    <div className="mv-logo-sub">
                        JUEGA • APRENDE • CONECTA
                    </div>

                </div>


                <nav className="mv-nav">

                    {navigation.map((item) => (

                        <button
                            key={item.id}
                            className={`mv-nav-item ${item.id === "home"
                                    ? "active"
                                    : ""
                                }`}
                            onClick={() =>
                                navigate(item.route)
                            }
                        >

                            <b>
                                {item.icon}
                            </b>

                            <span>
                                {item.label}
                            </span>

                        </button>

                    ))}

                </nav>


                {/* JUGADOR */}

                <div className="lobby-header-player">

                    <div
                        className="mv-avatar-small"
                        onClick={() => navigate("/profile")}
                        title="Ver mi perfil"
                        style={{ cursor: "pointer" }}
                    >

                        <AssetImage
                            src={player.avatar}
                            type="player"
                            alt={player.name}
                        />

                    </div>

                    <div className="lobby-header-player-info">

                        <strong>
                            {player.displayName}
                        </strong>

                        <span>
                            NIVEL {player.level}
                        </span>

                        <div className="mv-xp">

                            <div
                                style={{
                                    width:
                                        `${player.experience.percentage}%`
                                }}
                            />

                        </div>

                    </div>

                </div>


                {/* MONEDAS */}

                <div className="lobby-currencies">

                    <div>
                        🪙
                        <strong>
                            {player.currencies.coins.toLocaleString()}
                        </strong>
                    </div>

                    <div>
                        💎
                        <strong>
                            {player.currencies.gems}
                        </strong>
                    </div>

                </div>


                <button className="mv-settings">
                    ⚙
                </button>

            </header>


            {/* =================================================
                CONTENIDO PRINCIPAL
               ================================================= */}

            <main className="lobby-main">


                {/* =================================================
                    IZQUIERDA
                   ================================================= */}

                <aside className="lobby-sidebar lobby-sidebar-left">


                    {/* PERFIL */}

                    <section className="lobby-profile-card">

                        <div className="lobby-card-label">
                            PERFIL DEL JUGADOR
                        </div>

                        <div className="lobby-profile-avatar">

                            <AssetImage
                                src={player.avatar}
                                type="player"
                                alt={player.name}
                            />

                        </div>

                        <h2>
                            {player.displayName}
                        </h2>

                        <div className="lobby-level">
                            NIVEL {player.level}
                        </div>


                        <div className="lobby-profile-xp">

                            <div className="lobby-profile-xp-bar">

                                <span
                                    style={{
                                        width:
                                            `${player.experience.percentage}%`
                                    }}
                                />

                            </div>

                            <small>
                                {player.experience.percentage}% para nivel{" "}
                                {player.level + 1}
                            </small>

                        </div>


                        <div className="lobby-stat-grid">

                            <div>
                                <strong>
                                    {player.statistics.wins}
                                </strong>

                                <span>
                                    Victorias
                                </span>
                            </div>

                            <div>
                                <strong>
                                    {player.statistics.matches}
                                </strong>

                                <span>
                                    Partidas
                                </span>
                            </div>

                            <div>
                                <strong>
                                    {player.statistics.winStreak}
                                </strong>

                                <span>
                                    Racha
                                </span>
                            </div>

                        </div>


                        <button
                            className="mv-btn mv-btn-secondary lobby-profile-button"
                            onClick={() =>
                                navigate("/character")
                            }
                        >

                            PERSONALIZAR

                            <span>
                                <FaArrowRight />
                            </span>

                        </button>

                    </section>


                    {/* FUTURO: SKINS */}

                    <section className="lobby-event-card">

                        <div className="lobby-event-icon">
                            🐲
                        </div>

                        <div>

                            <span>
                                PRÓXIMAMENTE
                            </span>

                            <strong>
                                Nuevas skins
                            </strong>

                            <small>
                                Personaliza tu personaje
                            </small>

                        </div>

                        <button disabled>
                            <FaArrowRight />
                        </button>

                    </section>


                    {/* FUNCIONES FUTURAS */}

                    <section className="lobby-quick-card">

                        <button disabled>

                            <span>
                                🛒
                            </span>

                            <div>
                                <strong>
                                    Tienda
                                </strong>

                                <small>
                                    PRÓXIMAMENTE
                                </small>
                            </div>

                            <b>
                                <FaLock />
                            </b>

                        </button>


                        <button disabled>

                            <span>
                                🎯
                            </span>

                            <div>
                                <strong>
                                    Misiones
                                </strong>

                                <small>
                                    PRÓXIMAMENTE
                                </small>
                            </div>

                            <b>
                                <FaLock />
                            </b>

                        </button>


                        <button disabled>

                            <span>
                                <FaTrophy />
                            </span>

                            <div>
                                <strong>
                                    Clasificación
                                </strong>

                                <small>
                                    PRÓXIMAMENTE
                                </small>
                            </div>

                            <b>
                                <FaLock />
                            </b>

                        </button>

                    </section>

                </aside>


                {/* =================================================
                    CENTRO
                   ================================================= */}

                <section className="lobby-center">


                    {/* PERSONAJE */}

                    <section className="lobby-world">

                        <Canvas
                            className="lobby-canvas"
                            camera={{
                                position: [0, 1.35, 4.5],
                                fov: 42
                            }}
                        >

                            <ambientLight
                                intensity={1.7}
                            />

                            <directionalLight
                                position={[3, 5, 4]}
                                intensity={3}
                            />

                            <Environment
                                preset="sunset"
                            />

                            <Suspense fallback={null}>

                                {player.characterModel && (

                                    <VRMCharacter
                                        key={player.characterModel}
                                        url={player.characterModel}
                                        scale={1.9}
                                        position={[
                                            0,
                                            -1.7,
                                            0
                                        ]}
                                        rotation={[
                                            0,
                                            0,
                                            0
                                        ]}
                                    />

                                )}

                            </Suspense>


                            <OrbitControls
                                enableZoom={false}
                                enablePan={false}
                                enableRotate={true}
                                enableDamping={true}
                                minPolarAngle={Math.PI / 2}
                                maxPolarAngle={Math.PI / 2}
                                minAzimuthAngle={-Infinity}
                                maxAzimuthAngle={Infinity}
                            />

                        </Canvas>


                        <div className="lobby-character-name">

                            <span>
                                <FaGamepad />
                            </span>

                            <div>

                                <strong>
                                    {player.displayName}
                                </strong>

                                <small>
                                    NIVEL {player.level}
                                </small>

                            </div>

                        </div>

                    </section>


                    {/* JUEGOS */}

                    <section className="lobby-games-section">

                        <div className="lobby-section-heading">

                            <div>

                                <span className="eyebrow">
                                    MULTIJUGADOR
                                </span>

                                <h2>
                                    ELIGE TU JUEGO
                                </h2>

                            </div>

                            <button
                                onClick={() =>
                                    navigate("/games")
                                }
                            >
                                Ver todos{" "}
                                <FaArrowRight />
                            </button>

                        </div>


                        <div className="lobby-games-grid">

                            {games.map((game) => (

                                <GameCard
                                    key={game.id}
                                    game={game}
                                    onClick={() =>
                                        navigate(game.route)
                                    }
                                />

                            ))}

                        </div>

                    </section>


                    <div className="lobby-slogan">
                        Create by - Sebastian Pitre
                    </div>

                </section>


                {/* =================================================
                    DERECHA
                   ================================================= */}

                <aside className="lobby-sidebar lobby-sidebar-right">


                    {/* ESTADO ONLINE */}

                    <section className="lobby-status-card">

                        <div>

                            <span className="lobby-status-dot" />

                            <div>

                                <strong>
                                    ONLINE
                                </strong>

                                <small>
                                    {onlinePlayers.length + 1} jugadores conectados
                                </small>

                            </div>

                        </div>

                        <FaGlobeAmericas />

                    </section>


                    {/* =================================================
                        INVITACIONES
                       ================================================= */}

                    <section className="lobby-invite-card">

                        <div className="lobby-card-heading">

                            <div>

                                <span className="eyebrow">
                                    <FaBell /> ONLINE
                                </span>

                                <h3>
                                    INVITACIONES
                                </h3>

                            </div>

                            {invitations.length > 0 && (

                                <span className="lobby-notification">
                                    {invitations.length}
                                </span>

                            )}

                        </div>


                        {invitations.length === 0 ? (

                            <div
                                style={{
                                    padding: "18px 5px",
                                    textAlign: "center",
                                    opacity: 0.7,
                                }}
                            >

                                <FaBell
                                    size={22}
                                    style={{
                                        marginBottom: "8px"
                                    }}
                                />

                                <small
                                    style={{
                                        display: "block"
                                    }}
                                >
                                    No tienes invitaciones
                                </small>

                            </div>

                        ) : (

                            <div
                                className="mv-list mv-scroll"
                                style={{
                                    maxHeight: "230px"
                                }}
                            >

                                {invitations.map(
                                    (invitation, index) => {

                                        const playerName =
                                            invitation.fromPlayerName ||
                                            invitation.fromPlayer?.name ||
                                            invitation.name ||
                                            "Jugador";

                                        const invitationMessage =
                                            invitation.message ||
                                            "Te invitó a jugar";

                                        const invitationId =
                                            invitation.fromPlayerId ||
                                            invitation.fromPlayer?.id ||
                                            invitation.playerId ||
                                            index;

                                        return (

                                            <div
                                                className="lobby-friend-row"
                                                key={invitationId}
                                            >

                                                <div className="lobby-friend-avatar">

                                                    <div
                                                        style={{
                                                            width: "100%",
                                                            height: "100%",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: "18px"
                                                        }}
                                                    >
                                                        <AssetImage
                                                            src={invitation.fromPlayerAvatar}
                                                            type="player"
                                                            alt={invitation.fromPlayerName}
                                                        />
                                                    </div>

                                                </div>


                                                <div className="lobby-friend-info">

                                                    <strong>
                                                        {playerName}
                                                    </strong>

                                                    <small>
                                                        {invitationMessage}
                                                    </small>

                                                </div>


                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: "5px"
                                                    }}
                                                >

                                                    <button
                                                        onClick={() =>
                                                            handleAcceptInvitation(
                                                                invitation
                                                            )
                                                        }
                                                        title="Aceptar"
                                                    >
                                                        <FaCheck />
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            handleRejectInvitation(
                                                                invitation
                                                            )
                                                        }
                                                        title="Rechazar"
                                                    >
                                                        <FaTimes />
                                                    </button>

                                                </div>

                                            </div>

                                        );

                                    }
                                )}

                            </div>

                        )}

                    </section>


                    {/* =================================================
                        JUGADORES ONLINE
                       ================================================= */}

                    <section className="lobby-friends-card">

                        <div className="lobby-card-heading">

                            <div>

                                <span className="eyebrow">
                                    <FaUsers /> COMUNIDAD
                                </span>

                                <h3>
                                    JUGADORES ONLINE
                                </h3>

                            </div>

                            <strong>
                                {onlinePlayers.length}
                            </strong>

                        </div>


                        <div className="mv-list mv-scroll lobby-friends-list">

                            {onlinePlayers.length === 0 ? (

                                <div
                                    style={{
                                        padding: "20px 5px",
                                        textAlign: "center",
                                        opacity: 0.7,
                                    }}
                                >

                                    <FaUsers
                                        size={22}
                                        style={{
                                            marginBottom: "8px"
                                        }}
                                    />

                                    <small
                                        style={{
                                            display: "block"
                                        }}
                                    >
                                        No hay otros jugadores online
                                    </small>

                                </div>

                            ) : (

                                onlinePlayers.map((onlinePlayer) => {

                                    const status =
                                        onlinePlayer.status ||
                                        "available";

                                    const isAvailable =
                                        status === "available";

                                    const statusLabel =
                                        isAvailable
                                            ? "Disponible"
                                            : status === "inviting"
                                                ? "Invitando..."
                                                : status === "invited"
                                                    ? "Con invitación"
                                                    : "En partida";

                                    return (

                                        <div
                                            className="lobby-friend-row"
                                            key={onlinePlayer.id}
                                        >

                                            {/* AVATAR → PERFIL */}

                                            <div
                                                className="lobby-friend-avatar"
                                                onClick={() =>
                                                    navigate(
                                                        `/profile/${onlinePlayer.id}`
                                                    )
                                                }
                                                style={{
                                                    cursor: "pointer"
                                                }}
                                                title="Ver perfil"
                                            >

                                                <AssetImage
                                                    src={
                                                        onlinePlayer.avatar
                                                    }
                                                    type="player"
                                                    alt={
                                                        onlinePlayer.name
                                                    }
                                                />

                                                <span
                                                    className={
                                                        isAvailable
                                                            ? "friend-online"
                                                            : "friend-busy"
                                                    }
                                                />

                                            </div>


                                            {/* NOMBRE → PERFIL */}

                                            <div className="lobby-friend-info">

                                                <strong
                                                    onClick={() =>
                                                        navigate(
                                                            `/profile/${onlinePlayer.id}`
                                                        )
                                                    }
                                                    style={{
                                                        cursor: "pointer"
                                                    }}
                                                    title="Ver perfil"
                                                >
                                                    {onlinePlayer.name}
                                                </strong>

                                                <small>
                                                    {statusLabel}
                                                </small>

                                            </div>


                                            {/* INVITAR */}

                                            <button
                                                disabled={!isAvailable}
                                                onClick={() =>
                                                    handleInvite(
                                                        onlinePlayer
                                                    )
                                                }
                                                title={
                                                    isAvailable
                                                        ? "Invitar a jugar"
                                                        : statusLabel
                                                }
                                            >

                                                {isAvailable
                                                    ? <FaUserPlus />
                                                    : <FaCircle />
                                                }

                                            </button>

                                        </div>

                                    );

                                })

                            )}

                        </div>


                        {onlineMessage && (

                            <div
                                style={{
                                    padding: "8px 10px",
                                    fontSize: "12px",
                                    textAlign: "center",
                                    fontWeight: "bold",
                                }}
                            >
                                {onlineMessage}
                            </div>

                        )}

                    </section>


                    {/* =================================================
                        SALAS
                       ================================================= */}

                    <section className="lobby-rooms-card">

                        <div className="lobby-card-heading">

                            <div>

                                <span className="eyebrow">
                                    MULTIJUGADOR
                                </span>

                                <h3>
                                    SALAS
                                </h3>

                            </div>

                            <button
                                onClick={() =>
                                    navigate("/room")
                                }
                            >
                                +
                            </button>

                        </div>


                        <div className="mv-list mv-scroll lobby-rooms-list">

                            {rooms.map((room) => (

                                <div
                                    className="lobby-room-row"
                                    key={room.id}
                                >

                                    <div className="lobby-room-icon">
                                        {room.gameIcon}
                                    </div>

                                    <div>

                                        <strong>
                                            {room.name}
                                        </strong>

                                        <small>
                                            {room.gameName}
                                        </small>

                                    </div>

                                    <span>
                                        {room.players}/{room.maxPlayers}
                                    </span>

                                </div>

                            ))}

                        </div>


                        <button
                            className="mv-btn mv-btn-primary lobby-create-room"
                            onClick={() =>
                                navigate("/room")
                            }
                        >
                            + CREAR SALA
                        </button>

                    </section>

                </aside>

            </main>

        </div>
    );
}