
import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    FaArrowLeft,
    FaGlobeAmericas,
    FaGamepad,
    FaUserFriends,
    FaCheck,
    FaTimes,
    FaSpinner,
} from "react-icons/fa";

import {
    socket,
} from "../services/socket";


export default function World() {

    const WORLD_SESSION_KEY =
    "mathvision_world_player_id";

    const navigate =
        useNavigate();


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
        name,
        setName
    ] = useState("");

    const [
        joined,
        setJoined
    ] = useState(false);

    const [
        players,
        setPlayers
    ] = useState([]);

    const [
        invitation,
        setInvitation
    ] = useState(null);

    const [
        invitingPlayerId,
        setInvitingPlayerId
    ] = useState(null);

    const [
        message,
        setMessage
    ] = useState("");

    const [
        error,
        setError
    ] = useState("");


    function getWorldPlayerId() {

    let id =
        localStorage.getItem(
            WORLD_SESSION_KEY
        );


    if (!id) {

        id =
            "player-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 10);


        localStorage.setItem(
            WORLD_SESSION_KEY,
            id
        );

    }


    return id;

}


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

        };


        const onDisconnect = () => {

            console.log(
                "🔴 World socket desconectado"
            );

            setConnected(false);

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
        }) => {

            console.log(
                "🌎 Entraste al Mundo:",
                player
            );

            setJoined(true);

            setMessage(
                "Estás dentro del Mundo."
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

            setInvitingPlayerId(
                null
            );

            setMessage(
                `Invitación enviada a ${targetPlayerName}.`
            );

        };


        const onInvitationRejected = ({
            playerName,
        }) => {

            setInvitingPlayerId(
                null
            );

            setMessage(
                `${playerName} rechazó la invitación.`
            );

        };


        const onWorldError = ({
            message,
        }) => {

            console.error(
                "🌎 World error:",
                message
            );

            setInvitingPlayerId(
                null
            );

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


        if (!socket.connected) {

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
       ENTRAR AL MUNDO
    ===================================================== */

    const entrarAlMundo = () => {

        setError("");
        setMessage("");


        const cleanName =
            name.trim();


        if (!cleanName) {

            setError(
                "Escribe tu nombre."
            );

            return;

        }


        if (!socket.connected) {

            setError(
                "El servidor no está conectado."
            );

            return;

        }


        const worldPlayerId =
            getWorldPlayerId();


        socket.emit(
            "world:join",
            {
                playerName:
                    cleanName,

                worldPlayerId:
                    worldPlayerId,
            }
        );

    };


    /* =====================================================
       INVITAR
    ===================================================== */

    const invitar = (
        playerId
    ) => {

        setError("");
        setMessage("");

        setInvitingPlayerId(
            playerId
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
       ACEPTAR
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
       RECHAZAR
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


        localStorage.removeItem(
            WORLD_SESSION_KEY
        );


        navigate(
            "/dashboard"
        );

    };


    /* =====================================================
       PANTALLA NOMBRE
    ===================================================== */

    if (!joined) {

        return (

            <div className="min-h-screen bg-slate-950 text-white">

                <header className="border-b border-slate-800 bg-slate-950/90">

                    <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">

                        <button
                            onClick={() =>
                                navigate(
                                    "/dashboard"
                                )
                            }
                            className="flex items-center gap-3 text-slate-400 transition hover:text-white"
                        >

                            <FaArrowLeft />

                            Dashboard

                        </button>


                        <div className="text-center">

                            <p className="text-xs font-bold uppercase tracking-[0.4em] text-cyan-400">
                                MATHVISION
                            </p>

                            <h1 className="text-xl font-black">
                                WORLD
                            </h1>

                        </div>


                        <div className="w-24" />

                    </div>

                </header>


                <main className="flex min-h-[calc(100vh-81px)] items-center justify-center px-5 py-10">

                    <div className="w-full max-w-lg rounded-3xl border border-cyan-400/20 bg-slate-900/80 p-8 text-center shadow-2xl">

                        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-cyan-500/10 text-5xl text-cyan-400">

                            <FaGlobeAmericas />

                        </div>


                        <p className="mt-8 text-sm font-bold uppercase tracking-[0.3em] text-cyan-400">
                            Mundo multijugador
                        </p>


                        <h1 className="mt-3 text-4xl font-black">
                            Entra al Mundo
                        </h1>


                        <p className="mt-3 text-slate-400">
                            Todos los estudiantes conectados
                            aparecerán aquí para poder
                            encontrarse y jugar.
                        </p>


                        <div className="mt-8">

                            <input
                                type="text"
                                value={name}
                                maxLength={30}
                                onChange={(e) =>
                                    setName(
                                        e.target.value
                                    )
                                }
                                onKeyDown={(e) => {

                                    if (
                                        e.key ===
                                        "Enter"
                                    ) {

                                        entrarAlMundo();

                                    }

                                }}
                                placeholder="Escribe tu nombre"
                                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 text-center text-lg text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                            />

                        </div>


                        {error && (

                            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">

                                ⚠ {error}

                            </div>

                        )}


                        <button
                            onClick={
                                entrarAlMundo
                            }
                            disabled={!connected}
                            className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-6 py-4 font-black text-slate-950 transition hover:scale-[1.02] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >

                            <FaGlobeAmericas />

                            {connected
                                ? "ENTRAR AL MUNDO"
                                : "CONECTANDO..."
                            }

                        </button>

                    </div>

                </main>

            </div>

        );

    }


    /* =====================================================
       LISTA DE JUGADORES
    ===================================================== */

    const worldPlayerId =
        localStorage.getItem(
            WORLD_SESSION_KEY
        );


    const me =
        players.find(
            (player) =>
                player.id ===
                worldPlayerId
        );


    const otherPlayers =
    players.filter(
        (player) =>
            player.id !==
            worldPlayerId
    );


    /* =====================================================
       MUNDO
    ===================================================== */

    return (

        <div className="min-h-screen bg-slate-950 text-white">

            <div className="pointer-events-none fixed inset-0">

                <div className="absolute left-1/4 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[140px]" />

                <div className="absolute bottom-20 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[140px]" />

            </div>


            <header className="relative z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">

                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">

                    <button
                        onClick={volver}
                        className="flex items-center gap-3 text-slate-400 transition hover:text-white"
                    >

                        <FaArrowLeft />

                        Salir

                    </button>


                    <div className="text-center">

                        <p className="text-xs font-bold uppercase tracking-[0.4em] text-cyan-400">
                            MATHVISION
                        </p>

                        <h1 className="text-xl font-black">
                            🌎 WORLD
                        </h1>

                    </div>


                    <div className="text-right">

                        <p className="text-xs text-slate-500">
                            Jugadores
                        </p>

                        <p className="font-black text-cyan-400">
                            {players.length}
                        </p>

                    </div>

                </div>

            </header>


            <main className="relative z-10 mx-auto max-w-6xl px-5 py-10">

                <div className="mb-8 rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6">

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                        <div>

                            <p className="text-sm uppercase tracking-widest text-cyan-400">
                                Mundo conectado
                            </p>

                            <h2 className="mt-1 text-3xl font-black">
                                Hola, {me?.name || name}
                            </h2>

                        </div>


                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3">

                            <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />

                            <span className="font-bold text-emerald-400">
                                CONECTADO
                            </span>

                        </div>

                    </div>

                </div>


                {message && (

                    <div className="mb-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-center font-bold text-cyan-300">

                        {message}

                    </div>

                )}


                {error && (

                    <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center font-bold text-red-400">

                        ⚠ {error}

                    </div>

                )}


                <section>

                    <div className="mb-5 flex items-center gap-3">

                        <FaUserFriends className="text-cyan-400" />

                        <h2 className="text-2xl font-black">
                            Jugadores conectados
                        </h2>

                    </div>


                    {otherPlayers.length === 0 ? (

                        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-12 text-center">

                            <div className="text-5xl">
                                🌎
                            </div>

                            <p className="mt-4 text-lg font-bold text-slate-300">
                                Esperando otros jugadores...
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                Cuando otro estudiante entre,
                                aparecerá aquí.
                            </p>

                        </div>

                    ) : (

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                            {otherPlayers.map(
                                (player) => {

                                    const available =
                                        player.status ===
                                        "available";

                                    const invited =
                                        player.status ===
                                        "invited";

                                    const inviting =
                                        player.status ===
                                        "inviting";


                                    return (

                                        <div
                                            key={
                                                player.id
                                            }
                                            className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5 transition hover:border-cyan-400/30"
                                        >

                                            <div className="flex items-center justify-between">

                                                <div className="flex items-center gap-3">

                                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl">
                                                        🎮
                                                    </div>

                                                    <div>

                                                        <p className="font-black">
                                                            {player.name}
                                                        </p>

                                                        <p className="text-xs text-slate-500">
                                                            {player.status === "available" &&
                                                                "Disponible"
                                                            }

                                                            {player.status === "invited" &&
                                                                "Tiene una invitación"
                                                            }

                                                            {player.status === "inviting" &&
                                                                "Buscando jugador"
                                                            }

                                                            {player.status === "playing" &&
                                                                "En partida"
                                                            }

                                                        </p>

                                                    </div>

                                                </div>

                                            </div>


                                            {available && (

                                                <button
                                                    onClick={() =>
                                                        invitar(
                                                            player.id
                                                        )
                                                    }
                                                    disabled={
                                                        invitingPlayerId !==
                                                        null
                                                    }
                                                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 font-black text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                                                >

                                                    {invitingPlayerId ===
                                                    player.id ? (

                                                        <>

                                                            <FaSpinner className="animate-spin" />

                                                            ENVIANDO...

                                                        </>

                                                    ) : (

                                                        <>

                                                            <FaGamepad />

                                                            INVITAR A JUGAR

                                                        </>

                                                    )}

                                                </button>

                                            )}


                                            {invited && (

                                                <div className="mt-5 rounded-2xl bg-yellow-500/10 p-3 text-center text-sm font-bold text-yellow-400">

                                                    📨 Tiene una invitación pendiente

                                                </div>

                                            )}


                                            {inviting && (

                                                <div className="mt-5 rounded-2xl bg-purple-500/10 p-3 text-center text-sm font-bold text-purple-400">

                                                    🎮 Está invitando a otro jugador

                                                </div>

                                            )}


                                            {player.status ===
                                                "playing" && (

                                                <div className="mt-5 rounded-2xl bg-blue-500/10 p-3 text-center text-sm font-bold text-blue-400">

                                                    🎮 EN PARTIDA

                                                </div>

                                            )}

                                        </div>

                                    );

                                }
                            )}

                        </div>

                    )}

                </section>

            </main>


            {/* =================================================
               MODAL INVITACIÓN
            ================================================= */}

            {invitation && (

                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">

                    <div className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-slate-900 p-8 text-center shadow-2xl">

                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-500/10 text-4xl text-cyan-400">

                            🎮

                        </div>


                        <p className="mt-6 text-sm font-bold uppercase tracking-[0.3em] text-cyan-400">
                            Invitación
                        </p>


                        <h2 className="mt-2 text-3xl font-black">
                            {invitation.fromPlayerName}
                        </h2>


                        <p className="mt-3 text-slate-400">
                            quiere jugar contigo
                            una partida de Triqui Matemático.
                        </p>


                        <div className="mt-7 grid grid-cols-2 gap-3">

                            <button
                                onClick={
                                    rechazarInvitacion
                                }
                                className="flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-5 py-4 font-black text-red-400 transition hover:bg-red-500/20"
                            >

                                <FaTimes />

                                RECHAZAR

                            </button>


                            <button
                                onClick={
                                    aceptarInvitacion
                                }
                                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 font-black text-slate-950 transition hover:bg-emerald-400"
                            >

                                <FaCheck />

                                ACEPTAR

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}
