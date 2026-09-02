import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../services/socket";

import {
    FaArrowLeft,
    FaLock,
    FaPlay,
    FaCopy,
    FaCheck,
    FaUsers,
    FaPlus,
    FaSignInAlt,
    FaWifi,
} from "react-icons/fa";

import FadeIn from "../components/animations/FadeIn";

export default function Rooms() {

    const navigate = useNavigate();

    // =====================================================
    // DIRECCIÓN DEL SERVIDOR
    // =====================================================

    const playerUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;

    // =====================================================
    // ESTADOS
    // =====================================================

    const [connected, setConnected] = useState(false);

    const [mode, setMode] = useState("create");

    const [name, setName] = useState("");
    const [roomCode, setRoomCode] = useState("");
    const [password, setPassword] = useState("");

    const [room, setRoom] = useState(null);
    const [error, setError] = useState("");

    const [copied, setCopied] = useState(false);

    // =====================================================
    // SOCKET
    // =====================================================

    useEffect(() => {

        socket.connect();

        const onConnect = () => {

            console.log("Socket conectado:", socket.id);

            setConnected(true);
            setError("");

        };

        const onDisconnect = () => {

            console.log("Socket desconectado");

            setConnected(false);

        };

        const onRoomCreated = ({ room }) => {

            console.log("Sala creada:", room);

            setRoom(room);
            setError("");

        };

        const onRoomJoined = ({ room }) => {

            console.log("Sala unida:", room);

            setRoom(room);
            setError("");

        };

        const onRoomUpdated = ({ room }) => {

            console.log("Sala actualizada:", room);

            setRoom(room);

        };

        const onRoomError = ({ message }) => {

            console.error(message);

            setError(message);

        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

        socket.on("room:created", onRoomCreated);
        socket.on("room:joined", onRoomJoined);
        socket.on("room:updated", onRoomUpdated);
        socket.on("room:error", onRoomError);

        return () => {

            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);

            socket.off("room:created", onRoomCreated);
            socket.off("room:joined", onRoomJoined);
            socket.off("room:updated", onRoomUpdated);
            socket.off("room:error", onRoomError);

            socket.disconnect();

        };

    }, []);

    // =====================================================
    // COPIAR DIRECCIÓN
    // =====================================================

    const copiarDireccion = async () => {

        try {

            await navigator.clipboard.writeText(playerUrl);

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 2000);

        } catch (error) {

            console.error("No se pudo copiar:", error);

        }

    };

    // =====================================================
    // CAMBIAR MODO
    // =====================================================

    const cambiarModo = (nuevoModo) => {

        setMode(nuevoModo);
        setError("");

    };

    // =====================================================
    // CREAR SALA
    // =====================================================

    const crearSala = () => {

        setError("");

        if (!connected) {

            setError("El servidor todavía no está conectado.");

            return;

        }

        if (!name.trim()) {

            setError("Escribe tu nombre antes de crear la sala.");

            return;

        }

        socket.emit("room:create", {

            game: "triqui-matematico",

            playerName: name.trim(),

            password: password.trim() || null,

        });

    };

    // =====================================================
    // UNIRSE A SALA
    // =====================================================

    const unirseSala = () => {

        setError("");

        if (!connected) {

            setError("El servidor todavía no está conectado.");

            return;

        }

        if (!name.trim()) {

            setError("Escribe tu nombre.");

            return;

        }

        if (!roomCode.trim()) {

            setError("Escribe el código de la sala.");

            return;

        }

        socket.emit("room:join", {

            code: roomCode.trim().toUpperCase(),

            playerName: name.trim(),

            password: password.trim() || null,

        });

    };

    // =====================================================
    // INICIAR PARTIDA
    // =====================================================

    const iniciarPartida = () => {

        if (!room) return;

        console.log("Iniciando partida:", room.code);

        // TODO:
        // Aquí conectaremos posteriormente:
        // socket.emit("game:start", { code: room.code });

    };

    // =====================================================
    // PANTALLA DE SALA
    // =====================================================

    if (room) {

        const players = room.players || [];

        const isReady = players.length >= 2;

        return (

            <div className="min-h-screen overflow-hidden bg-slate-950 text-white">

                {/* ==========================================
                    BACKGROUND
                ========================================== */}

                <div className="pointer-events-none fixed inset-0">

                    <div className="absolute left-1/4 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[140px]" />

                    <div className="absolute bottom-20 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[140px]" />

                </div>

                {/* ==========================================
                    HEADER
                ========================================== */}

                <header className="relative z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">

                    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">

                        <button
                            onClick={() => navigate("/dashboard")}
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

                {/* ==========================================
                    CONTENIDO
                ========================================== */}

                <main className="relative z-10 mx-auto max-w-7xl px-5 py-10">

                    {/* SERVIDOR */}

                    <FadeIn>

                        <div className="mb-8 rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5 backdrop-blur-xl">

                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                                <div>

                                    <div className="mb-2 flex items-center gap-3">

                                        <div
                                            className={`h-3 w-3 rounded-full ${
                                                connected
                                                    ? "animate-pulse bg-emerald-400 shadow-lg shadow-emerald-400/50"
                                                    : "bg-red-400"
                                            }`}
                                        />

                                        <span
                                            className={`font-bold ${
                                                connected
                                                    ? "text-emerald-400"
                                                    : "text-red-400"
                                            }`}
                                        >
                                            {connected
                                                ? "Servidor activo"
                                                : "Servidor desconectado"
                                            }
                                        </span>

                                    </div>

                                    <p className="text-sm text-slate-500">
                                        Dirección para jugadores
                                    </p>

                                </div>

                                <div className="flex w-full gap-2 md:w-auto">

                                    <div className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">

                                        <span className="font-mono text-sm text-cyan-400 md:text-base">
                                            {playerUrl}
                                        </span>

                                    </div>

                                    <button
                                        onClick={copiarDireccion}
                                        className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-400"
                                    >

                                        {copied
                                            ? <FaCheck />
                                            : <FaCopy />
                                        }

                                        <span className="hidden sm:inline">
                                            {copied ? "Copiado" : "Copiar"}
                                        </span>

                                    </button>

                                </div>

                            </div>

                        </div>

                    </FadeIn>

                    {/* TÍTULO */}

                    <FadeIn>

                        <section className="mb-10">

                            <p className="text-sm uppercase tracking-widest text-cyan-400">
                                Sala multijugador
                            </p>

                            <h1 className="mt-2 text-4xl font-black">
                                Esperando jugadores
                            </h1>

                            <p className="mt-2 text-slate-400">
                                Comparte el código con el otro jugador para comenzar.
                            </p>

                        </section>

                    </FadeIn>

                    {/* GRID */}

                    <div className="grid grid-cols-12 gap-6">

                        {/* CÓDIGO */}

                        <FadeIn
                            delay={0.1}
                            className="col-span-12 lg:col-span-5"
                        >

                            <div className="relative h-full overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-900/80 p-8 backdrop-blur-xl">

                                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />

                                <div className="relative z-10 text-center">

                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl text-cyan-400">
                                        <FaUsers />
                                    </div>

                                    <p className="mt-6 text-sm font-bold uppercase tracking-[0.3em] text-cyan-400">
                                        Código de sala
                                    </p>

                                    <div className="my-8 break-all text-5xl font-black tracking-[0.25em] text-white">
                                        {room.code}
                                    </div>

                                    <p className="text-sm text-slate-500">
                                        Juego seleccionado
                                    </p>

                                    <p className="mt-1 font-bold text-slate-200">
                                        Triqui Matemático
                                    </p>

                                </div>

                            </div>

                        </FadeIn>

                        {/* JUGADORES */}

                        <FadeIn
                            delay={0.2}
                            className="col-span-12 lg:col-span-7"
                        >

                            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 backdrop-blur-xl">

                                <div className="mb-6 flex items-center justify-between">

                                    <div>

                                        <p className="text-sm uppercase tracking-widest text-cyan-400">
                                            Jugadores
                                        </p>

                                        <h2 className="mt-1 text-2xl font-black">
                                            {players.length}/2 conectados
                                        </h2>

                                    </div>

                                    <div className="rounded-xl border border-cyan-400/10 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-400">

                                        <FaWifi className="mr-2 inline" />

                                        {connected
                                            ? "ONLINE"
                                            : "OFFLINE"
                                        }

                                    </div>

                                </div>

                                <div className="space-y-3">

                                    {players.map((player, index) => (

                                        <div
                                            key={player.id}
                                            className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/60 p-4"
                                        >

                                            <div className="flex items-center gap-4">

                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-xl">
                                                    🎮
                                                </div>

                                                <div>

                                                    <p className="font-bold">
                                                        {player.name}
                                                    </p>

                                                    <p className="text-xs text-slate-500">
                                                        Jugador {index + 1}
                                                    </p>

                                                </div>

                                            </div>

                                            <span className="text-xs font-bold text-emerald-400">
                                                ● LISTO
                                            </span>

                                        </div>

                                    ))}

                                    {players.length < 2 && (

                                        <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 p-8">

                                            <div className="text-center">

                                                <div className="mb-3 text-3xl">
                                                    ⏳
                                                </div>

                                                <p className="font-bold text-slate-300">
                                                    Esperando al segundo jugador
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    Comparte el código de sala
                                                </p>

                                            </div>

                                        </div>

                                    )}

                                </div>

                                {isReady && (

                                    <button
                                        onClick={iniciarPartida}
                                        className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-6 py-4 font-black text-slate-950 transition hover:scale-[1.02] hover:bg-cyan-400"
                                    >

                                        <FaPlay />

                                        INICIAR PARTIDA

                                    </button>

                                )}

                            </div>

                        </FadeIn>

                    </div>

                </main>

            </div>

        );
    }

    // =====================================================
    // LOBBY
    // =====================================================

    return (

        <div className="min-h-screen overflow-hidden bg-slate-950 text-white">

            {/* ==========================================
                BACKGROUND
            ========================================== */}

            <div className="pointer-events-none fixed inset-0">

                <div className="absolute left-1/4 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[140px]" />

                <div className="absolute bottom-20 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[140px]" />

            </div>

            {/* ==========================================
                HEADER
            ========================================== */}

            <header className="relative z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">

                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">

                    <button
                        onClick={() => navigate("/dashboard")}
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

            {/* ==========================================
                CONTENIDO
            ========================================== */}

            <main className="relative z-10 mx-auto max-w-7xl px-5 py-10">

                {/* ==========================================
                    SERVIDOR
                ========================================== */}

                <FadeIn>

                    <div className="mb-8 rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5 backdrop-blur-xl">

                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                            <div>

                                <div className="mb-2 flex items-center gap-3">

                                    <div
                                        className={`h-3 w-3 rounded-full ${
                                            connected
                                                ? "animate-pulse bg-emerald-400 shadow-lg shadow-emerald-400/50"
                                                : "bg-red-400"
                                        }`}
                                    />

                                    <span
                                        className={`font-bold ${
                                            connected
                                                ? "text-emerald-400"
                                                : "text-red-400"
                                        }`}
                                    >
                                        {connected
                                            ? "Servidor activo"
                                            : "Conectando..."
                                        }
                                    </span>

                                </div>

                                <p className="text-sm text-slate-500">
                                    Dirección para jugadores
                                </p>

                            </div>

                            <div className="flex w-full gap-2 md:w-auto">

                                <div className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">

                                    <span className="font-mono text-sm text-cyan-400 md:text-base">
                                        {playerUrl}
                                    </span>

                                </div>

                                <button
                                    onClick={copiarDireccion}
                                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-400"
                                >

                                    {copied
                                        ? <FaCheck />
                                        : <FaCopy />
                                    }

                                    <span className="hidden sm:inline">
                                        {copied ? "Copiado" : "Copiar"}
                                    </span>

                                </button>

                            </div>

                        </div>

                    </div>

                </FadeIn>

                {/* ==========================================
                    TÍTULO
                ========================================== */}

                <FadeIn>

                    <section className="mb-10">

                        <p className="text-sm uppercase tracking-widest text-cyan-400">
                            MathVision Multiplayer
                        </p>

                        <h1 className="mt-2 text-4xl font-black">
                            Juega con otro jugador
                        </h1>

                        <p className="mt-2 max-w-2xl text-slate-400">
                            Crea una sala o únete a una partida existente.
                            Los jugadores estarán sincronizados en tiempo real.
                        </p>

                    </section>

                </FadeIn>

                {/* ==========================================
                    SELECTOR DE MODO
                ========================================== */}

                <FadeIn delay={0.1}>

                    <div className="mx-auto mb-6 flex max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/80 p-2 backdrop-blur-xl">

                        <button
                            onClick={() => cambiarModo("create")}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-4 font-bold transition ${
                                mode === "create"
                                    ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                        >

                            <FaPlus />

                            Crear sala

                        </button>

                        <button
                            onClick={() => cambiarModo("join")}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-4 font-bold transition ${
                                mode === "join"
                                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                        >

                            <FaSignInAlt />

                            Unirse

                        </button>

                    </div>

                </FadeIn>

                {/* ==========================================
                    FORMULARIO
                ========================================== */}

                <FadeIn
                    key={mode}
                    delay={0.1}
                >

                    <div className="mx-auto max-w-2xl">

                        {mode === "create" ? (

                            <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-slate-900/80 p-8 backdrop-blur-xl">

                                <div className="mb-8">

                                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-xl text-cyan-400">
                                        <FaPlus />
                                    </div>

                                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-400">
                                        Nueva partida
                                    </p>

                                    <h2 className="mt-2 text-3xl font-black">
                                        Crear sala
                                    </h2>

                                    <p className="mt-2 text-sm text-slate-400">
                                        Crea una sala y comparte el código con tu compañero.
                                    </p>

                                </div>

                                <div className="space-y-4">

                                    <input
                                        type="text"
                                        placeholder="Tu nombre"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                                    />

                                    <div className="relative">

                                        <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" />

                                        <input
                                            type="password"
                                            placeholder="Contraseña opcional"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 py-4 pl-12 pr-5 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
                                        />

                                    </div>

                                    <button
                                        onClick={crearSala}
                                        disabled={!connected}
                                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-6 py-4 font-black text-slate-950 transition hover:scale-[1.02] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                                    >

                                        <FaPlus />

                                        CREAR SALA

                                    </button>

                                </div>

                            </div>

                        ) : (

                            <div className="rounded-3xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 to-slate-900/80 p-8 backdrop-blur-xl">

                                <div className="mb-8">

                                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-xl text-purple-400">
                                        <FaSignInAlt />
                                    </div>

                                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-purple-400">
                                        Partida existente
                                    </p>

                                    <h2 className="mt-2 text-3xl font-black">
                                        Unirse a sala
                                    </h2>

                                    <p className="mt-2 text-sm text-slate-400">
                                        Introduce el código que te proporcionó el otro jugador.
                                    </p>

                                </div>

                                <div className="space-y-4">

                                    <input
                                        type="text"
                                        placeholder="Tu nombre"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-5 py-4 text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400"
                                    />

                                    <input
                                        type="text"
                                        placeholder="Código de sala"
                                        value={roomCode}
                                        maxLength={10}
                                        onChange={(e) =>
                                            setRoomCode(
                                                e.target.value
                                                    .toUpperCase()
                                                    .replace(/\s/g, "")
                                            )
                                        }
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-5 py-4 font-mono text-lg uppercase tracking-widest text-white outline-none transition placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-600 focus:border-purple-400"
                                    />

                                    <div className="relative">

                                        <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" />

                                        <input
                                            type="password"
                                            placeholder="Contraseña si la tiene"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 py-4 pl-12 pr-5 text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400"
                                        />

                                    </div>

                                    <button
                                        onClick={unirseSala}
                                        disabled={!connected}
                                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-purple-500 px-6 py-4 font-black text-white transition hover:scale-[1.02] hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
                                    >

                                        <FaSignInAlt />

                                        UNIRSE A LA SALA

                                    </button>

                                </div>

                            </div>

                        )}

                    </div>

                </FadeIn>

                {/* ==========================================
                    ERROR
                ========================================== */}

                {error && (

                    <FadeIn delay={0.1}>

                        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center font-bold text-red-400">

                            ⚠ {error}

                        </div>

                    </FadeIn>

                )}

            </main>

        </div>

    );
}