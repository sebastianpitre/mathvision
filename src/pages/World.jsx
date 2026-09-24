import {
    Suspense,
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    Canvas,
} from "@react-three/fiber";

import {
    socket,
} from "../services/socket";

import {
    useAuth,
} from "../context/AuthContext";

import "../styles/mathvision.css";

import navigation from "../data/mock/navigation.json";
import assets from "../data/mock/assets.json";

import AssetImage from "../components/common/AssetImage";
import VRMCharacter from "../components/character/VRMCharacter";
import MainNav from "../components/navigation/MainNav";



export default function World() {

    const navigate =
        useNavigate();

    const {
        user,
    } = useAuth();


    /* =====================================================
       ESTADOS
    ===================================================== */

    const [
        connected,
        setConnected
    ] = useState(
        socket.connected
    );

    const [
        joined,
        setJoined
    ] = useState(false);

    const [
        myPlayerId,
        setMyPlayerId
    ] = useState(null);

    const [
        players,
        setPlayers
    ] = useState([]);

    const [
        invitation,
        setInvitation
    ] = useState(null);

    const [
        pendingInvitations,
        setPendingInvitations
    ] = useState(
        new Set()
    );

    const [
        message,
        setMessage
    ] = useState("");

    const [
        error,
        setError
    ] = useState("");


    /* =====================================================
       ENTRAR AL MUNDO
    ===================================================== */

    const entrarAlMundo = () => {

        setError("");
        setMessage("");


        if (!socket.connected) {

            setError(
                "El servidor no está conectado."
            );

            return;

        }


        socket.emit(
            "world:join"
        );

    };


    /* =====================================================
       SOCKET
    ===================================================== */

    useEffect(() => {

        const onConnect = () => {

            console.log(
                "🟢 World socket conectado:",
                socket.id
            );

            setConnected(true);

            entrarAlMundo();

        };


        const onDisconnect = () => {

            console.log(
                "🔴 World socket desconectado"
            );

            setConnected(false);

            setJoined(false);

        };


        const onConnectError = (
            socketError
        ) => {

            console.error(
                "❌ Error conectando World:",
                socketError.message
            );

            setConnected(false);

            setError(
                "No fue posible autenticar la conexión."
            );

        };


        const onPlayers = ({
            players,
        }) => {

            console.log(
                "🌎 Jugadores:",
                players
            );

            setPlayers(
                players || []
            );

        };


        const onJoined = ({
            player,
            userId,
        }) => {

            console.log(
                "🌎 Entraste al Mundo:",
                player
            );

            setMyPlayerId(
                String(userId)
            );

            setJoined(true);

            setMessage(
                `Estás dentro del Mundo como ${player.name}.`
            );

        };


        const onInvitation = ({
            fromPlayerId,
            fromPlayerName,
        }) => {

            console.log(
                "📨 Invitación:",
                fromPlayerName
            );

            setInvitation({
                fromPlayerId,
                fromPlayerName,
            });

        };


        const onInviteSent = ({
            targetPlayerName,
        }) => {

            setMessage(
                `Invitación enviada a ${targetPlayerName}.`
            );

        };


        const onInvitationRejected = ({
            playerName,
            targetPlayerId,
        }) => {

            if (
                targetPlayerId
            ) {

                setPendingInvitations(
                    (current) => {

                        const next =
                            new Set(current);

                        next.delete(
                            targetPlayerId
                        );

                        return next;

                    }
                );

            }


            setMessage(
                `${playerName} rechazó la invitación.`
            );

        };


        const onWorldError = ({
            message,
            targetPlayerId,
        }) => {

            console.error(
                "🌎 World error:",
                message
            );


            if (
                targetPlayerId
            ) {

                setPendingInvitations(
                    (current) => {

                        const next =
                            new Set(current);

                        next.delete(
                            targetPlayerId
                        );

                        return next;

                    }
                );

            }


            setError(
                message
            );

        };


        const onGameCreated = ({
            room,
        }) => {

            console.log(
                "🎮 Partida creada desde World:",
                room
            );

            navigate(
                "/games/triqui"
            );

        };


        socket.on(
            "connect",
            onConnect
        );

        socket.on(
            "disconnect",
            onDisconnect
        );

        socket.on(
            "connect_error",
            onConnectError
        );

        socket.on(
            "world:players",
            onPlayers
        );

        socket.on(
            "world:joined",
            onJoined
        );

        socket.on(
            "world:invitation",
            onInvitation
        );

        socket.on(
            "world:inviteSent",
            onInviteSent
        );

        socket.on(
            "world:invitationRejected",
            onInvitationRejected
        );

        socket.on(
            "world:error",
            onWorldError
        );

        socket.on(
            "world:gameCreated",
            onGameCreated
        );


        if (socket.connected) {

            entrarAlMundo();

        } else {

            socket.connect();

        }


        return () => {

            socket.off(
                "connect",
                onConnect
            );

            socket.off(
                "disconnect",
                onDisconnect
            );

            socket.off(
                "connect_error",
                onConnectError
            );

            socket.off(
                "world:players",
                onPlayers
            );

            socket.off(
                "world:joined",
                onJoined
            );

            socket.off(
                "world:invitation",
                onInvitation
            );

            socket.off(
                "world:inviteSent",
                onInviteSent
            );

            socket.off(
                "world:invitationRejected",
                onInvitationRejected
            );

            socket.off(
                "world:error",
                onWorldError
            );

            socket.off(
                "world:gameCreated",
                onGameCreated
            );

        };

    }, [navigate]);


    /* =====================================================
       INVITAR
    ===================================================== */

    const invitar = (
        playerId
    ) => {

        setError("");
        setMessage("");


        if (
            pendingInvitations.has(
                playerId
            )
        ) {

            return;

        }


        setPendingInvitations(
            (current) => {

                const next =
                    new Set(current);

                next.add(
                    playerId
                );

                return next;

            }
        );


        socket.emit(
            "world:invite",
            {
                targetPlayerId:
                    playerId,
            }
        );

    };


    /* =====================================================
       ACEPTAR INVITACIÓN
    ===================================================== */

    const aceptarInvitacion = () => {

        if (!invitation) {
            return;
        }

        socket.emit(
            "world:acceptInvitation",
            {
                fromPlayerId:
                    invitation.fromPlayerId,
            }
        );

        setInvitation(
            null
        );

    };


    /* =====================================================
       RECHAZAR INVITACIÓN
    ===================================================== */

    const rechazarInvitacion = () => {

        if (!invitation) {
            return;
        }

        socket.emit(
            "world:rejectInvitation",
            {
                fromPlayerId:
                    invitation.fromPlayerId,
            }
        );

        setInvitation(
            null
        );

    };


    /* =====================================================
       VOLVER
    ===================================================== */

    const volver = () => {

        if (joined) {

            socket.emit(
                "world:leave"
            );

        }

        setJoined(false);

        navigate("/lobby");

    };


    /* =====================================================
       JUGADOR ACTUAL
    ===================================================== */

    const me =
        players.find(
            (player) =>
                String(player.id) ===
                String(myPlayerId)
        );


    const otherPlayers =
        players.filter(
            (player) =>
                String(player.id) !==
                String(myPlayerId)
        );


    /* =====================================================
       MODELO DEL PERSONAJE
    ===================================================== */

    const characterModel =
        user?.character_model_path ||
        "/models/characters/Adan2.vrm";


    /* =====================================================
       DATOS DEL JUGADOR PARA EL HEADER
       (mismo formato que usa Lobby)
    ===================================================== */

    const xp =
        Number(user?.xp) || 0;

    const level =
        Number(user?.level) || 1;

    const xpPercentage =
        Math.min(
            100,
            Math.max(
                0,
                ((xp % 1000) / 1000) * 100
            )
        );

    const displayName =
        user?.display_name ||
        user?.username ||
        "Jugador";

    const avatar =
        user?.avatar ||
        assets.players.defaultAvatar;

    const coins =
        Number(user?.coins) || 0;

    const gems =
        Number(user?.gems) || 0;


    /* =====================================================
       ETIQUETA DE ESTADO DE UN JUGADOR
    ===================================================== */

    function estadoJugador(player) {

        if (player.status === "available") {
            return {
                label: "Disponible",
                dotClass: "friend-online",
            };
        }

        if (player.status === "invited") {
            return {
                label: "Invitación pendiente",
                dotClass: "friend-busy",
            };
        }

        if (player.status === "inviting") {
            return {
                label: "Invitando a alguien",
                dotClass: "friend-busy",
            };
        }

        if (player.status === "playing") {
            return {
                label: "En partida",
                dotClass: "friend-busy",
            };
        }

        return {
            label: "",
            dotClass: "friend-busy",
        };

    }


    /* =====================================================
       PANTALLA DE CONEXIÓN
       (mismo patrón visual que las pantallas de
       carga/sin-sesión de Lobby)
    ===================================================== */

    if (!joined) {

        return (

            <div className="mv-app lobby-page">

                <div
                    className="lobby-background"
                    style={{
                        backgroundImage: `url(${assets.backgrounds.lobby})`
                    }}
                />

                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        gap: "20px",
                        textAlign: "center",
                        padding: "0 20px",
                    }}
                >

                    <div style={{ fontSize: "48px" }}>
                        🌎
                    </div>

                    <h1>
                        {connected
                            ? "ENTRANDO AL MUNDO..."
                            : "CONECTANDO..."
                        }
                    </h1>

                    <p style={{ opacity: 0.8, maxWidth: "360px" }}>
                        {connected
                            ? "Preparando tu personaje y buscando jugadores."
                            : "Conectando con el servidor de MathVision."
                        }
                    </p>

                    {error && (

                        <strong style={{ color: "#ff6b6b" }}>
                            ⚠ {error}
                        </strong>

                    )}

                    <button
                        className="mv-btn mv-btn-secondary"
                        type="button"
                        onClick={() => navigate("/lobby")}
                    >
                        ← VOLVER AL LOBBY
                    </button>

                </div>

            </div>

        );

    }


    /* =====================================================
       WORLD
    ===================================================== */

    return (

        <div className="mv-app lobby-page">


            {/* =================================================
                BACKGROUND
               ================================================= */}

            <div
                className="lobby-background"
                style={{
                    backgroundImage: `url(${assets.backgrounds.lobby})`
                }}
            />


            {/* =================================================
    HEADER / NAVEGACIÓN
   ================================================= */}

            <MainNav
                navigation={navigation}
                player={{
                    avatar,
                    displayName,
                    level,
                    experience: {
                        percentage: xpPercentage,
                    },
                    currencies: {
                        coins,
                        gems,
                    },
                }}
            />


            {/* =================================================
                MENSAJES
               ================================================= */}

            {(message || error) && (

                <div
                    style={{
                        textAlign: "center",
                        padding: "12px 20px",
                        fontWeight: 700,
                        color: error ? "#ff6b6b" : "white",
                    }}
                >
                    {error ? `⚠ ${error}` : message}
                </div>

            )}


            {/* =================================================
                CONTENIDO
               ================================================= */}

            <main className="lobby-main">


                {/* =================================================
                    IZQUIERDA
                   ================================================= */}

                <aside className="lobby-sidebar lobby-sidebar-left">

                    <section className="lobby-status-card">

                        <div>

                            <span className="lobby-status-dot" />

                            <div>

                                <strong>
                                    {me?.name || displayName}
                                </strong>

                                <small>
                                    Estás dentro del Mundo
                                </small>

                            </div>

                        </div>

                    </section>


                    <section className="lobby-profile-card">

                        <div className="lobby-card-label">
                            JUGADORES EN EL MUNDO
                        </div>

                        <div className="lobby-stat-grid">

                            <div>
                                <strong>
                                    {players.length}
                                </strong>
                                <span>Conectados</span>
                            </div>

                            <div>
                                <strong>
                                    {otherPlayers.length}
                                </strong>
                                <span>Disponibles</span>
                            </div>

                        </div>


                        <button
                            className="mv-btn mv-btn-secondary lobby-profile-button"
                            onClick={volver}
                        >
                            VOLVER AL LOBBY
                            <span>←</span>
                        </button>

                    </section>

                </aside>


                {/* =================================================
                    CENTRO
                   ================================================= */}

                <section className="lobby-center">

                    <section
                        className="lobby-world"
                        style={{ flex: 1 }}
                    >

                        <Canvas
                            className="lobby-canvas"
                            camera={{
                                position: [0, 1.2, 6],
                                fov: 35
                            }}
                        >

                            <ambientLight intensity={1.5} />

                            <directionalLight
                                position={[3, 5, 4]}
                                intensity={2}
                            />

                            <directionalLight
                                position={[-3, 3, 2]}
                                intensity={1}
                            />

                            <Suspense fallback={null}>

                                <VRMCharacter
                                    key={characterModel}
                                    url={characterModel}
                                    scale={1.9}
                                    position={[0, -1.7, 0]}
                                    rotation={[0, 0, 0]}
                                />

                            </Suspense>

                        </Canvas>


                        <div className="lobby-character-name">

                            <span>🌎</span>

                            <div>
                                <strong>
                                    {me?.name || displayName}
                                </strong>

                                <small>
                                    LISTO PARA JUGAR
                                </small>
                            </div>

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

                    <section className="lobby-friends-card">

                        <div className="lobby-card-heading">

                            <div>

                                <span className="eyebrow">
                                    MULTIJUGADOR
                                </span>

                                <h3>
                                    JUGADORES ONLINE
                                </h3>

                            </div>

                            <strong>
                                {otherPlayers.length}
                            </strong>

                        </div>


                        <div className="mv-list mv-scroll lobby-friends-list">

                            {otherPlayers.length === 0 ? (

                                <div
                                    style={{
                                        padding: "30px 10px",
                                        textAlign: "center",
                                        opacity: 0.7,
                                    }}
                                >
                                    Aún no hay otros jugadores en el Mundo.
                                </div>

                            ) : (

                                otherPlayers.map((player) => {

                                    const estado =
                                        estadoJugador(player);

                                    const disponible =
                                        player.status === "available";

                                    return (

                                        <div
                                            className="lobby-friend-row"
                                            key={player.id}
                                        >

                                            <div
                                                className="lobby-friend-avatar"
                                                onClick={() =>
                                                    navigate(`/profile/${player.id}`)
                                                }
                                                style={{ cursor: "pointer" }}
                                            >

                                                <AssetImage
                                                    src={player.avatar}
                                                    type="player"
                                                    alt={player.name}
                                                />

                                                <span
                                                    className={estado.dotClass}
                                                />

                                            </div>


                                            <div className="lobby-friend-info">

                                                <strong
                                                    onClick={() =>
                                                        navigate(`/profile/${player.id}`)
                                                    }
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    {player.name}
                                                </strong>

                                                <small>
                                                    {estado.label}
                                                </small>

                                            </div>


                                            {disponible ? (

                                                <button
                                                    onClick={() =>
                                                        invitar(player.id)
                                                    }
                                                    disabled={
                                                        pendingInvitations.has(
                                                            player.id
                                                        )
                                                    }
                                                >

                                                    {pendingInvitations.has(
                                                        player.id
                                                    )
                                                        ? "..."
                                                        : "+"
                                                    }

                                                </button>

                                            ) : (

                                                <button disabled>
                                                    ⏳
                                                </button>

                                            )}

                                        </div>

                                    );

                                })

                            )}

                        </div>

                    </section>

                </aside>

            </main>


            {/* =================================================
                MODAL DE INVITACIÓN
               ================================================= */}

            {invitation && (

                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0, 0, 0, 0.75)",
                        padding: "20px",
                    }}
                >

                    <section
                        className="lobby-invite-card"
                        style={{ maxWidth: "420px", width: "100%" }}
                    >

                        <div className="lobby-card-heading">

                            <div>

                                <span className="eyebrow">
                                    NUEVA ACTIVIDAD
                                </span>

                                <h3>
                                    INVITACIÓN
                                </h3>

                            </div>

                            <span className="lobby-notification">
                                1
                            </span>

                        </div>


                        <div className="lobby-invite-player">

                            <div className="lobby-friend-avatar">

                                <AssetImage
                                    src={invitation.fromPlayerAvatar}
                                    type="player"
                                    alt={invitation.fromPlayerName}
                                />

                            </div>

                            <div>

                                <strong>
                                    {invitation.fromPlayerName}
                                </strong>

                                <small>
                                    quiere jugar contigo una partida
                                </small>

                            </div>

                        </div>


                        <div className="lobby-invite-actions">

                            <button
                                className="mv-btn mv-btn-primary"
                                onClick={aceptarInvitacion}
                            >
                                Aceptar
                            </button>

                            <button
                                className="mv-btn mv-btn-secondary"
                                onClick={rechazarInvitacion}
                            >
                                Rechazar
                            </button>

                        </div>

                    </section>

                </div>

            )}

        </div>

    );

}