import {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import {
    LuActivity,
    LuArrowLeft,
    LuBell,
    LuCalculator,
    LuCheck,
    LuChevronLeft,
    LuChevronRight,
    LuDoorOpen,
    LuFlame,
    LuGlobe,
    LuHourglass,
    LuLightbulb,
    LuMail,
    LuMapPin,
    LuPartyPopper,
    LuRefreshCw,
    LuSearch,
    LuSend,
    LuShuffle,
    LuSmartphone,
    LuSwords,
    LuUserMinus,
    LuUserPlus,
    LuUsers,
    LuWifiOff,
    LuX,
    LuZap,
} from "react-icons/lu";

import { socket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

import "../styles/mathvision.css";
import "../styles/world.css";

import navigation from "../data/mock/navigation.json";
import assets from "../data/mock/assets.json";

import AssetImage from "../components/common/AssetImage";
import VRMCharacter from "../components/character/VRMCharacter";
import MainNav from "../components/navigation/MainNav";

/* =========================================================
   CONSTANTES
========================================================= */

const STATUS = {
    available: { label: "Disponible", short: "Libre", tone: "online" },
    invited: { label: "Invitación pendiente", short: "Invitado", tone: "busy" },
    inviting: { label: "Invitando a alguien", short: "Ocupado", tone: "busy" },
    playing: { label: "En partida", short: "Jugando", tone: "playing" },
};

const statusOf = (player) =>
    STATUS[player?.status] || { label: "Conectado", short: "Conectado", tone: "busy" };

const FILTERS = [
    { id: "all", label: "Todos" },
    { id: "available", label: "Disponibles" },
    { id: "playing", label: "En partida" },
];

// Lugares alrededor del personaje donde aparecen los demás
// jugadores (porcentaje del escenario: izquierda, arriba)
const PLAZA_SLOTS = [
    [14, 18], [86, 18],
    [10, 46], [90, 46],
    [16, 72], [84, 72],
    [30, 3], [70, 3],
];

const TIPS = [
    "Para multiplicar por 5, multiplica por 10 y divide entre 2: 5 × 48 = 480 ÷ 2 = 240.",
    "Para sumar 9, suma 10 y resta 1: 37 + 9 = 47 − 1 = 46.",
    "Un número es divisible por 3 si la suma de sus cifras también lo es: 471 → 4 + 7 + 1 = 12.",
    "Para multiplicar por 11 un número de dos cifras, suma sus cifras y ponlas en medio: 11 × 32 = 3(5)2 = 352.",
    "El orden de los factores no altera el producto: 4 × 25 es lo mismo que 25 × 4.",
    "Para restar 99, resta 100 y suma 1: 350 − 99 = 250 + 1 = 251.",
    "Dividir entre 4 es partir a la mitad dos veces: 84 ÷ 4 → 42 → 21.",
    "Un número par termina en 0, 2, 4, 6 u 8. Todos los pares son divisibles por 2.",
    "Para elevar al cuadrado un número que termina en 5: 35² → 3 × 4 = 12, y le pones 25 → 1225.",
    "En el triqui, el centro es la casilla más fuerte: participa en 4 líneas ganadoras.",
];

const TIP_INTERVAL = 9000;

/* =========================================================
   RETO DEL DÍA (se genera igual para todos cada día)
========================================================= */

const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const seeded = (seedText) => {
    let seed = [...seedText].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
    return (min, max) => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return min + (seed % (max - min + 1));
    };
};

const dailyChallenge = (key) => {

    const r = seeded(key);
    const type = r(0, 3);

    if (type === 0) {
        const a = r(3, 9), b = r(4, 12), c = r(5, 40);
        return { text: `${a} × ${b} + ${c}`, answer: a * b + c };
    }

    if (type === 1) {
        const a = r(40, 150), b = r(15, 60), c = r(2, 5);
        return { text: `(${a} − ${b}) × ${c}`, answer: (a - b) * c };
    }

    if (type === 2) {
        const b = r(3, 9), q = r(6, 15), c = r(10, 50);
        return { text: `${b * q} ÷ ${b} + ${c}`, answer: q + c };
    }

    const a = r(11, 19);
    return { text: `${a}²`, answer: a * a };
};

const DAILY_STORE = "mv-daily-challenge";

const readDaily = () => {
    try {
        return JSON.parse(localStorage.getItem(DAILY_STORE)) || {};
    } catch {
        return {};
    }
};

const writeDaily = (data) => {
    try {
        localStorage.setItem(DAILY_STORE, JSON.stringify(data));
    } catch {
        /* sin almacenamiento: el reto funciona igual */
    }
};

const yesterdayKey = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* =========================================================
   UTILIDADES
========================================================= */

const timeAgo = (time, now) => {
    const s = Math.max(0, Math.round((now - time) / 1000));
    if (s < 45) return "ahora";
    const m = Math.round(s / 60);
    if (m < 60) return `hace ${m} min`;
    return `hace ${Math.round(m / 60)} h`;
};

const FEED_ICONS = {
    join: LuDoorOpen,
    leave: LuUserMinus,
    sent: LuSend,
    received: LuMail,
    rejected: LuX,
    error: LuWifiOff,
    me: LuMapPin,
};

/* =========================================================
   COMPONENTES PEQUEÑOS
========================================================= */

function SectionHeader({ id, eyebrow, icon: Icon, title, action }) {
    return (
        <header className="wd-section-header">
            <div>
                <p className="wd-eyebrow">
                    {Icon && <Icon aria-hidden="true" />}
                    <span>{eyebrow}</span>
                </p>
                <h2 id={id} className="wd-title">{title}</h2>
            </div>
            {action}
        </header>
    );
}

/* ---------- Reto del día ---------- */

function DailyChallenge() {

    const key = todayKey();
    const challenge = useMemo(() => dailyChallenge(key), [key]);

    const [store, setStore] = useState(readDaily);
    const [value, setValue] = useState("");
    const [feedback, setFeedback] = useState(null);

    const solvedToday = store.lastSolved === key;
    const streak = solvedToday || store.lastSolved === yesterdayKey()
        ? store.streak || 0
        : 0;

    const check = (e) => {

        e.preventDefault();

        if (value.trim() === "" || value === "-") {
            setFeedback({ ok: false, text: "Escribe tu respuesta." });
            return;
        }

        if (Number(value) === challenge.answer) {

            const next = {
                lastSolved: key,
                streak: store.lastSolved === yesterdayKey() ? (store.streak || 0) + 1 : 1,
            };

            writeDaily(next);
            setStore(next);
            setFeedback(null);
            return;
        }

        setFeedback({ ok: false, text: "Casi. Revisa el orden de las operaciones e intenta otra vez." });
    };

    return (
        <section className="wd-card wd-daily" aria-labelledby="wd-daily-title">

            <SectionHeader
                id="wd-daily-title"
                eyebrow="Práctica"
                icon={LuCalculator}
                title="Reto del día"
                action={
                    <span className="wd-streak" title="Días seguidos resolviendo el reto">
                        <LuFlame aria-hidden="true" />
                        <span>{`${streak} ${streak === 1 ? "día" : "días"}`}</span>
                    </span>
                }
            />

            <p className="wd-daily-question" aria-label={`Operación: ${challenge.text}`}>
                {`${challenge.text} = ?`}
            </p>

            {solvedToday ? (
                <p className="wd-daily-done" role="status">
                    <LuPartyPopper aria-hidden="true" />
                    <span>{`¡Resuelto! La respuesta es ${challenge.answer}. Vuelve mañana por uno nuevo.`}</span>
                </p>
            ) : (
                <form className="wd-daily-form" onSubmit={check} noValidate>
                    <label htmlFor="wd-daily-input" className="wd-sr-only">
                        Tu respuesta
                    </label>
                    <input
                        id="wd-daily-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="Respuesta"
                        value={value}
                        aria-invalid={feedback && !feedback.ok ? "true" : undefined}
                        aria-describedby={feedback ? "wd-daily-feedback" : undefined}
                        onChange={(e) => {
                            if (/^-?\d{0,6}$/.test(e.target.value)) {
                                setValue(e.target.value);
                                setFeedback(null);
                            }
                        }}
                    />
                    <button type="submit" className="wd-btn wd-btn-primary">
                        <LuCheck aria-hidden="true" />
                        <span>Comprobar</span>
                    </button>
                </form>
            )}

            <p id="wd-daily-feedback" className="wd-daily-feedback" role="status">
                {feedback?.text || ""}
            </p>
        </section>
    );
}

/* ---------- Tips que rotan ---------- */

function TipsCard() {

    const [index, setIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
    const [paused, setPaused] = useState(false);

    const reducedMotion = useMemo(
        () => typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
        []
    );

    useEffect(() => {

        if (paused || reducedMotion) return;

        const id = setInterval(
            () => setIndex((i) => (i + 1) % TIPS.length),
            TIP_INTERVAL
        );

        return () => clearInterval(id);

    }, [paused, reducedMotion]);

    const go = (step) =>
        setIndex((i) => (i + step + TIPS.length) % TIPS.length);

    return (
        <section
            className="wd-card wd-tips"
            aria-labelledby="wd-tips-title"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <SectionHeader
                id="wd-tips-title"
                eyebrow="Truco mental"
                icon={LuLightbulb}
                title="Tip de mate"
                action={
                    <div className="wd-tips-nav">
                        <button
                            type="button"
                            className="wd-icon-btn"
                            onClick={() => go(-1)}
                            aria-label="Tip anterior"
                        >
                            <LuChevronLeft aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className="wd-icon-btn"
                            onClick={() => go(1)}
                            aria-label="Siguiente tip"
                        >
                            <LuChevronRight aria-hidden="true" />
                        </button>
                    </div>
                }
            />

            <p className="wd-tip" aria-live="polite" key={index}>
                {TIPS[index]}
            </p>

            <p className="wd-muted">{`Tip ${index + 1} de ${TIPS.length}`}</p>
        </section>
    );
}

/* ---------- Diálogo de invitación ---------- */

function InvitationDialog({ invitation, onAccept, onReject }) {

    const ref = useRef(null);

    useEffect(() => {

        const dialog = ref.current;

        if (!dialog) return;

        if (invitation && !dialog.open) {
            dialog.showModal();
            // El foco va directo a "Aceptar reto"
            dialog.querySelector("[data-autofocus]")?.focus();
        }
        if (!invitation && dialog.open) dialog.close();

    }, [invitation]);

    return (
        <dialog
            ref={ref}
            className="wd-dialog"
            aria-labelledby="wd-inv-title"
            aria-describedby="wd-inv-desc"
            onCancel={(e) => e.preventDefault()}
        >
            {invitation && (
                <div className="wd-dialog-box">

                    <span className="wd-dialog-ring" aria-hidden="true">
                        <span className="wd-avatar wd-avatar-xl">
                            <AssetImage
                                src={invitation.fromPlayerAvatar}
                                type="player"
                                alt=""
                            />
                        </span>
                    </span>

                    <p className="wd-eyebrow">
                        <LuBell aria-hidden="true" />
                        <span>Nueva invitación</span>
                    </p>

                    <h2 id="wd-inv-title" className="wd-dialog-title">
                        {`${invitation.fromPlayerName || "Un jugador"} te reta`}
                    </h2>

                    <p id="wd-inv-desc" className="wd-muted">
                        Quiere jugar una partida de Triqui Matemático contigo.
                    </p>

                    <div className="wd-dialog-actions">
                        <button
                            type="button"
                            className="wd-btn wd-btn-ghost"
                            onClick={onReject}
                        >
                            <LuX aria-hidden="true" />
                            <span>Rechazar</span>
                        </button>
                        <button
                            type="button"
                            className="wd-btn wd-btn-primary"
                            onClick={onAccept}
                            data-autofocus
                        >
                            <LuSwords aria-hidden="true" />
                            <span>¡Aceptar reto!</span>
                        </button>
                    </div>
                </div>
            )}
        </dialog>
    );
}

/* =========================================================
   WORLD
========================================================= */

export default function World() {

    const navigate = useNavigate();
    const { user } = useAuth();

    /* ---------- Estados (los mismos de antes) ---------- */

    const [connected, setConnected] = useState(socket.connected);
    const [joined, setJoined] = useState(false);
    const [myPlayerId, setMyPlayerId] = useState(null);
    const [players, setPlayers] = useState([]);
    const [invitation, setInvitation] = useState(null);
    const [pendingInvitations, setPendingInvitations] = useState(() => new Set());
    const [error, setError] = useState("");

    /* ---------- Estados nuevos ---------- */

    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [feed, setFeed] = useState([]);
    const [now, setNow] = useState(() => Date.now());

    const prevPlayersRef = useRef(null);
    const myPlayerIdRef = useRef(null);

    /* ---------- Actividad ---------- */

    const pushFeed = useCallback((type, text) => {
        setFeed((current) => [
            { id: `${Date.now()}-${Math.random()}`, type, text, time: Date.now() },
            ...current,
        ].slice(0, 12));
    }, []);

    // Refresca "hace X min"
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(id);
    }, []);

    const removePending = useCallback((playerId) => {
        setPendingInvitations((current) => {
            if (!current.has(playerId)) return current;
            const next = new Set(current);
            next.delete(playerId);
            return next;
        });
    }, []);

    /* =====================================================
       ENTRAR AL MUNDO
    ===================================================== */

    const entrarAlMundo = useCallback(() => {

        setError("");

        if (!socket.connected) {
            setError("El servidor no está conectado.");
            return;
        }

        socket.emit("world:join");
    }, []);

    const reintentar = () => {
        setError("");
        if (socket.connected) {
            entrarAlMundo();
        } else {
            socket.connect();
        }
    };

    /* =====================================================
       SOCKET (misma lógica de antes + actividad)
    ===================================================== */

    useEffect(() => {

        const onConnect = () => {
            setConnected(true);
            entrarAlMundo();
        };

        const onDisconnect = () => {
            setConnected(false);
            setJoined(false);
        };

        const onConnectError = (socketError) => {
            console.error("❌ Error conectando World:", socketError?.message);
            setConnected(false);
            setError("No fue posible autenticar la conexión.");
        };

        const onPlayers = ({ players: list } = {}) => {

            const next = list || [];
            const prev = prevPlayersRef.current;
            const me = myPlayerIdRef.current;

            // Quién entró y quién salió (para la actividad)
            if (prev) {
                const prevIds = new Set(prev.map((p) => String(p.id)));
                const nextIds = new Set(next.map((p) => String(p.id)));

                next
                    .filter((p) => !prevIds.has(String(p.id)) && String(p.id) !== me)
                    .forEach((p) => pushFeed("join", `${p.name} entró al mundo`));

                prev
                    .filter((p) => !nextIds.has(String(p.id)) && String(p.id) !== me)
                    .forEach((p) => pushFeed("leave", `${p.name} salió del mundo`));
            }

            prevPlayersRef.current = next;
            setPlayers(next);

            // Si alguien volvió a "Disponible", ya no tiene invitación nuestra pendiente
            next
                .filter((p) => p.status === "available")
                .forEach((p) => removePending(p.id));
        };

        const onJoined = ({ player, userId }) => {
            myPlayerIdRef.current = String(userId);
            setMyPlayerId(String(userId));
            setJoined(true);
            pushFeed("me", `Entraste al mundo como ${player?.name || "jugador"}`);
        };

        const onInvitation = ({ fromPlayerId, fromPlayerName, fromPlayerAvatar }) => {
            setInvitation({ fromPlayerId, fromPlayerName, fromPlayerAvatar });
            pushFeed("received", `${fromPlayerName} te invitó a jugar`);
        };

        const onInviteSent = ({ targetPlayerName }) => {
            pushFeed("sent", `Invitación enviada a ${targetPlayerName}`);
        };

        const onInvitationRejected = ({ playerName, targetPlayerId }) => {
            if (targetPlayerId) removePending(targetPlayerId);
            pushFeed("rejected", `${playerName} rechazó la invitación`);
        };

        const onWorldError = ({ message, targetPlayerId }) => {
            console.error("🌎 World error:", message);
            if (targetPlayerId) removePending(targetPlayerId);
            setError(message);
            pushFeed("error", message);
        };

        const onGameCreated = () => {
            navigate("/games/triqui");
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onConnectError);
        socket.on("world:players", onPlayers);
        socket.on("world:joined", onJoined);
        socket.on("world:invitation", onInvitation);
        socket.on("world:inviteSent", onInviteSent);
        socket.on("world:invitationRejected", onInvitationRejected);
        socket.on("world:error", onWorldError);
        socket.on("world:gameCreated", onGameCreated);

        if (socket.connected) {
            entrarAlMundo();
        } else {
            socket.connect();
        }

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("connect_error", onConnectError);
            socket.off("world:players", onPlayers);
            socket.off("world:joined", onJoined);
            socket.off("world:invitation", onInvitation);
            socket.off("world:inviteSent", onInviteSent);
            socket.off("world:invitationRejected", onInvitationRejected);
            socket.off("world:error", onWorldError);
            socket.off("world:gameCreated", onGameCreated);
        };

    }, [navigate, entrarAlMundo, pushFeed, removePending]);

    /* =====================================================
       ACCIONES
    ===================================================== */

    const invitar = (playerId) => {

        setError("");

        if (pendingInvitations.has(playerId)) return;

        setPendingInvitations((current) => new Set(current).add(playerId));

        socket.emit("world:invite", { targetPlayerId: playerId });
    };

    const aceptarInvitacion = () => {
        if (!invitation) return;
        socket.emit("world:acceptInvitation", { fromPlayerId: invitation.fromPlayerId });
        setInvitation(null);
    };

    const rechazarInvitacion = () => {
        if (!invitation) return;
        socket.emit("world:rejectInvitation", { fromPlayerId: invitation.fromPlayerId });
        pushFeed("rejected", `Rechazaste a ${invitation.fromPlayerName}`);
        setInvitation(null);
    };

    const volver = () => {
        if (joined) socket.emit("world:leave");
        setJoined(false);
        navigate("/lobby");
    };

    /* =====================================================
       DATOS
    ===================================================== */

    const otherPlayers = players.filter(
        (p) => String(p.id) !== String(myPlayerId)
    );

    const me = players.find((p) => String(p.id) === String(myPlayerId));

    const availablePlayers = otherPlayers.filter(
        (p) => p.status === "available" && !pendingInvitations.has(p.id)
    );

    const playingCount = otherPlayers.filter((p) => p.status === "playing").length;

    const partidaRapida = () => {

        if (availablePlayers.length === 0) {
            pushFeed("error", "No hay jugadores disponibles ahora mismo");
            return;
        }

        const rival = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];

        pushFeed("sent", `Partida rápida: buscando a ${rival.name}`);
        invitar(rival.id);
    };

    const visiblePlayers = otherPlayers
        .filter((p) => filter === "all" || p.status === filter)
        .filter((p) => (p.name || "").toLowerCase().includes(search.trim().toLowerCase()));

    const characterModel = user?.character_model_path || "/models/characters/Adan2.vrm";

    const xp = Number(user?.xp) || 0;
    const level = Number(user?.level) || 1;
    const xpPercentage = Math.min(100, Math.max(0, ((xp % 1000) / 1000) * 100));
    const displayName = user?.display_name || user?.username || "Jugador";
    const avatar = user?.avatar || assets.players.defaultAvatar;
    const coins = Number(user?.coins) || 0;
    const gems = Number(user?.gems) || 0;

    const background = (
        <div
            className="wd-bg"
            aria-hidden="true"
            style={{ backgroundImage: `url(${assets.backgrounds.lobby})` }}
        />
    );

    /* =====================================================
       PANTALLA DE CONEXIÓN
    ===================================================== */

    if (!joined) {
        return (
            <div className="mv-app wd">
                {background}

                <main className="wd-connect">
                    <div className="wd-card wd-connect-card">

                        <span className={`wd-connect-orb ${error ? "is-error" : ""}`} aria-hidden="true">
                            {error ? <LuWifiOff /> : <LuGlobe />}
                        </span>

                        <h1 className="wd-connect-title">
                            {error
                                ? "No pudimos entrar"
                                : connected
                                    ? "Entrando al mundo…"
                                    : "Conectando…"}
                        </h1>

                        <p className="wd-muted" role="status" aria-live="polite">
                            {error ||
                                (connected
                                    ? "Preparando tu personaje y buscando jugadores."
                                    : "Conectando con el servidor de MathVision.")}
                        </p>

                        {!error && <span className="wd-loader" aria-hidden="true" />}

                        <div className="wd-connect-actions">
                            {error && (
                                <button
                                    type="button"
                                    className="wd-btn wd-btn-primary"
                                    onClick={reintentar}
                                >
                                    <LuRefreshCw aria-hidden="true" />
                                    <span>Reintentar</span>
                                </button>
                            )}

                            <button
                                type="button"
                                className="wd-btn wd-btn-ghost"
                                onClick={() => navigate("/lobby")}
                            >
                                <LuArrowLeft aria-hidden="true" />
                                <span>Volver al lobby</span>
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    /* =====================================================
       WORLD
    ===================================================== */

    const plazaPlayers = otherPlayers.slice(0, PLAZA_SLOTS.length);
    const extraInPlaza = otherPlayers.length - plazaPlayers.length;

    return (
        <div className="mv-app wd">

            {background}

            <MainNav
                navigation={navigation}
                player={{
                    avatar,
                    displayName,
                    level,
                    experience: { percentage: xpPercentage },
                    currencies: { coins, gems },
                }}
            />

            <h1 className="wd-sr-only">Mundo MathVision</h1>

            <main className="wd-main">

                {/* ================= IZQUIERDA ================= */}

                <aside className="wd-col wd-col-left" aria-label="Tu estado y retos">

                    <section className="wd-card wd-me" aria-labelledby="wd-me-title">

                        <div className="wd-me-top">
                            <span className="wd-avatar wd-avatar-lg">
                                <AssetImage src={avatar} type="player" alt="" />
                                <span className="wd-presence wd-presence-online" aria-hidden="true" />
                            </span>

                            <div className="wd-me-id">
                                <p className="wd-eyebrow">
                                    <LuGlobe aria-hidden="true" />
                                    <span>En el mundo</span>
                                </p>
                                <h2 id="wd-me-title" className="wd-me-name">
                                    {me?.name || displayName}
                                </h2>
                                <span className="wd-live">
                                    <span className="wd-live-dot" aria-hidden="true" />
                                    <span>{connected ? "Conectado" : "Sin conexión"}</span>
                                </span>
                            </div>
                        </div>

                        <dl className="wd-stats">
                            <div>
                                <dt>En línea</dt>
                                <dd>{players.length}</dd>
                            </div>
                            <div>
                                <dt>Libres</dt>
                                <dd className="wd-text-online">
                                    {otherPlayers.filter((p) => p.status === "available").length}
                                </dd>
                            </div>
                            <div>
                                <dt>Jugando</dt>
                                <dd className="wd-text-playing">{playingCount}</dd>
                            </div>
                        </dl>

                        <button
                            type="button"
                            className="wd-btn wd-btn-secondary wd-btn-block"
                            onClick={volver}
                        >
                            <LuArrowLeft aria-hidden="true" />
                            <span>Volver al lobby</span>
                        </button>
                    </section>

                    <DailyChallenge />

                    <TipsCard />
                </aside>

                {/* ================= CENTRO: LA PLAZA ================= */}

                <div className="wd-col wd-col-center">

                    <section className="wd-stage" aria-labelledby="wd-plaza-title">

                        <h2 id="wd-plaza-title" className="wd-sr-only">
                            La plaza: tu personaje y los jugadores conectados
                        </h2>

                        <div
                            className="wd-stage-canvas"
                            role="img"
                            aria-label={`Personaje 3D de ${displayName}. Arrastra para girarlo.`}
                        >
                            <Canvas
                                gl={{ alpha: true }}
                                camera={{ position: [0, 1.2, 6], fov: 35 }}
                            >
                                <ambientLight intensity={1.5} />
                                <directionalLight position={[3, 5, 4]} intensity={2} />
                                <directionalLight position={[-3, 3, 2]} intensity={1} />

                                <Suspense fallback={null}>
                                    <VRMCharacter
                                        key={characterModel}
                                        url={characterModel}
                                        scale={1.9}
                                        position={[0, -1.7, 0]}
                                        rotation={[0, 0, 0]}
                                    />
                                </Suspense>

                                <OrbitControls
                                    enableZoom={false}
                                    enablePan={false}
                                    enableRotate
                                    enableDamping
                                    minPolarAngle={Math.PI / 2}
                                    maxPolarAngle={Math.PI / 2}
                                />
                            </Canvas>
                        </div>

                        {/* Jugadores alrededor del personaje */}
                        <ul className="wd-plaza" aria-label="Jugadores en la plaza">
                            {plazaPlayers.map((player, index) => {

                                const status = statusOf(player);
                                const pending = pendingInvitations.has(player.id);
                                const canInvite = player.status === "available" && !pending;
                                const [left, top] = PLAZA_SLOTS[index];

                                return (
                                    <li
                                        key={player.id}
                                        className="wd-plaza-spot"
                                        style={{ "--x": `${left}%`, top: `${top}%`, "--d": `${index * 0.4}s` }}
                                    >
                                        <button
                                            type="button"
                                            className={`wd-bubble wd-bubble-${status.tone}`}
                                            onClick={() => canInvite && invitar(player.id)}
                                            aria-disabled={!canInvite}
                                            aria-label={
                                                canInvite
                                                    ? `Invitar a ${player.name} a jugar`
                                                    : `${player.name}: ${pending ? "invitación enviada" : status.label}`
                                            }
                                        >
                                            <span className="wd-avatar wd-avatar-md">
                                                <AssetImage src={player.avatar} type="player" alt="" />
                                                <span className={`wd-presence wd-presence-${status.tone}`} aria-hidden="true" />
                                            </span>

                                            <span className="wd-bubble-name">{player.name}</span>

                                            <span className="wd-bubble-action" aria-hidden="true">
                                                {canInvite
                                                    ? <><LuUserPlus /><span>Retar</span></>
                                                    : pending
                                                        ? <><LuHourglass /><span>Enviada</span></>
                                                        : <span>{status.short}</span>}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {otherPlayers.length === 0 && (
                            <p className="wd-plaza-empty">
                                <LuUsers aria-hidden="true" />
                                <span>La plaza está tranquila. Espera a que llegue alguien o juega en este dispositivo.</span>
                            </p>
                        )}

                        {extraInPlaza > 0 && (
                            <p className="wd-plaza-more">
                                {`+${extraInPlaza} más en la lista`}
                            </p>
                        )}

                        <div className="wd-stage-tag">
                            <span className="wd-stage-tag-icon" aria-hidden="true">
                                <LuMapPin />
                            </span>
                            <div>
                                <p className="wd-stage-name">{me?.name || displayName}</p>
                                <p className="wd-stage-sub">Listo para jugar</p>
                            </div>
                        </div>
                    </section>

                    {/* Partida rápida */}
                    <section className="wd-quick" aria-labelledby="wd-quick-title">

                        <div className="wd-quick-text">
                            <p className="wd-eyebrow">
                                <LuZap aria-hidden="true" />
                                <span>Partida rápida</span>
                            </p>
                            <h2 id="wd-quick-title" className="wd-quick-title">
                                ¿Listo para un reto?
                            </h2>
                            <p className="wd-quick-sub">
                                {availablePlayers.length > 0
                                    ? `${availablePlayers.length} ${availablePlayers.length === 1 ? "rival disponible" : "rivales disponibles"}`
                                    : "Nadie disponible ahora mismo"}
                            </p>
                        </div>

                        <ul className="wd-quick-faces" aria-hidden="true">
                            {availablePlayers.slice(0, 5).map((p) => (
                                <li key={p.id} className="wd-avatar wd-avatar-md">
                                    <AssetImage src={p.avatar} type="player" alt="" />
                                </li>
                            ))}
                        </ul>

                        <div className="wd-quick-actions">
                            <button
                                type="button"
                                className="wd-btn wd-btn-ghost"
                                onClick={() =>
                                    navigate("/triqui-local", {
                                        state: { playerName: displayName },
                                    })
                                }
                            >
                                <LuSmartphone aria-hidden="true" />
                                <span>2 en este dispositivo</span>
                            </button>

                            <button
                                type="button"
                                className="wd-btn wd-btn-primary wd-btn-lg"
                                onClick={partidaRapida}
                                disabled={availablePlayers.length === 0}
                            >
                                <LuShuffle aria-hidden="true" />
                                <span>Buscar rival</span>
                            </button>
                        </div>
                    </section>
                </div>

                {/* ================= DERECHA ================= */}

                <aside className="wd-col wd-col-right" aria-label="Jugadores y actividad">

                    <section className="wd-card wd-players" aria-labelledby="wd-players-title">

                        <SectionHeader
                            id="wd-players-title"
                            eyebrow="Multijugador"
                            icon={LuUsers}
                            title="Jugadores"
                            action={
                                <span className="wd-count" aria-label={`${otherPlayers.length} jugadores`}>
                                    {otherPlayers.length}
                                </span>
                            }
                        />

                        <div className="wd-search">
                            <LuSearch aria-hidden="true" />
                            <label htmlFor="wd-search-input" className="wd-sr-only">
                                Buscar jugador por nombre
                            </label>
                            <input
                                id="wd-search-input"
                                type="search"
                                placeholder="Buscar jugador"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="wd-filters" role="group" aria-label="Filtrar jugadores">
                            {FILTERS.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    className="wd-chip"
                                    aria-pressed={filter === f.id}
                                    onClick={() => setFilter(f.id)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {visiblePlayers.length === 0 ? (
                            <div className="wd-empty">
                                <span className="wd-empty-icon" aria-hidden="true">
                                    <LuUsers />
                                </span>
                                <p>
                                    {otherPlayers.length === 0
                                        ? "Aún no hay otros jugadores en el mundo."
                                        : "Ningún jugador coincide con tu búsqueda."}
                                </p>
                            </div>
                        ) : (
                            <ul
                                className="wd-list wd-scroll"
                                tabIndex={0}
                                aria-label="Lista de jugadores"
                            >
                                {visiblePlayers.map((player) => {

                                    const status = statusOf(player);
                                    const available = player.status === "available";
                                    const pending = pendingInvitations.has(player.id);
                                    const name = player.name || "Jugador";

                                    return (
                                        <li className="wd-row" key={player.id}>

                                            <button
                                                type="button"
                                                className="wd-row-profile"
                                                onClick={() => navigate(`/profile/${player.id}`)}
                                                aria-label={`Ver perfil de ${name}, ${status.label}`}
                                            >
                                                <span className="wd-avatar">
                                                    <AssetImage src={player.avatar} type="player" alt="" />
                                                    <span className={`wd-presence wd-presence-${status.tone}`} aria-hidden="true" />
                                                </span>
                                                <span className="wd-row-body">
                                                    <span className="wd-row-title">{name}</span>
                                                    <span className={`wd-status-text wd-text-${status.tone}`}>
                                                        {status.label}
                                                    </span>
                                                </span>
                                            </button>

                                            {available ? (
                                                <button
                                                    type="button"
                                                    className="wd-btn wd-btn-primary wd-btn-sm"
                                                    onClick={() => invitar(player.id)}
                                                    disabled={pending}
                                                    aria-label={
                                                        pending
                                                            ? `Invitación enviada a ${name}`
                                                            : `Invitar a ${name} a jugar`
                                                    }
                                                >
                                                    {pending ? <LuHourglass aria-hidden="true" /> : <LuUserPlus aria-hidden="true" />}
                                                    <span>{pending ? "Enviada" : "Invitar"}</span>
                                                </button>
                                            ) : (
                                                <span className="wd-waiting" title={status.label}>
                                                    <LuHourglass aria-hidden="true" />
                                                    <span className="wd-sr-only">{status.label}</span>
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    <section className="wd-card wd-feed" aria-labelledby="wd-feed-title">

                        <SectionHeader
                            id="wd-feed-title"
                            eyebrow="En vivo"
                            icon={LuActivity}
                            title="Actividad"
                        />

                        {feed.length === 0 ? (
                            <p className="wd-muted">Aquí verás quién entra, sale e invita.</p>
                        ) : (
                            <ol className="wd-feed-list wd-scroll" aria-live="polite" aria-relevant="additions">
                                {feed.map((item) => {
                                    const Icon = FEED_ICONS[item.type] || LuActivity;
                                    return (
                                        <li key={item.id} className={`wd-feed-item wd-feed-${item.type}`}>
                                            <span className="wd-feed-icon" aria-hidden="true">
                                                <Icon />
                                            </span>
                                            <span className="wd-feed-text">{item.text}</span>
                                            <time
                                                className="wd-feed-time"
                                                dateTime={new Date(item.time).toISOString()}
                                            >
                                                {timeAgo(item.time, now)}
                                            </time>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </section>
                </aside>
            </main>

            {/* Error visible (además queda en la actividad) */}
            {error && (
                <div className="wd-alert" role="alert">
                    <LuWifiOff aria-hidden="true" />
                    <span>{error}</span>
                    <button
                        type="button"
                        className="wd-icon-btn"
                        onClick={() => setError("")}
                        aria-label="Cerrar aviso"
                    >
                        <LuX aria-hidden="true" />
                    </button>
                </div>
            )}

            <InvitationDialog
                invitation={invitation}
                onAccept={aceptarInvitacion}
                onReject={rechazarInvitacion}
            />
        </div>
    );
}