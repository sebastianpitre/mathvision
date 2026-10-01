import React, {
    Suspense,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";

import MainNav from "../components/navigation/MainNav";

/*
 * Iconos Lucide (vienen dentro de react-icons, no hay que
 * instalar nada nuevo). Son de línea, modernos y uniformes.
 */
import {
    LuArrowRight,
    LuBell,
    LuCheck,
    LuFlame,
    LuGamepad2,
    LuGlobe,
    LuHand,
    LuHourglass,
    LuLock,
    LuLogIn,
    LuPalette,
    LuShoppingBag,
    LuSmartphone,
    LuSparkles,
    LuSwords,
    LuTarget,
    LuTrophy,
    LuUserPlus,
    LuUsers,
    LuX,
} from "react-icons/lu";

import "../styles/mathvision.css";
import "../styles/lobby.css";

import { useAuth } from "../context/AuthContext";

import games from "../data/mock/games.json";
import navigation from "../data/mock/navigation.json";
import assets from "../data/mock/assets.json";

import AssetImage from "../components/common/AssetImage";
import VRMCharacter from "../components/character/VRMCharacter";

import { socket } from "../services/socket";

/* =========================================================
   UTILIDADES
========================================================= */

// "1 jugador", "2 jugadores", "2–4 jugadores"
const playersLabel = (min, max) => {

    const low = Number(min) || 0;
    const high = Number(max) || low;

    if (!low && !high) return null;

    if (!high || low === high) {
        return `${low} ${low === 1 ? "jugador" : "jugadores"}`;
    }

    return `${low}–${high} jugadores`;
};

/*
 * Foto del juego tomada del JSON.
 * Si en tu games.json el campo se llama distinto,
 * agrégalo aquí.
 */
const gameImage = (game) =>
    game?.image ||
    game?.cover ||
    game?.thumbnail ||
    game?.banner ||
    game?.img ||
    game?.photo ||
    null;

const invitationKey = (invitation) =>
    String(
        invitation?.fromPlayerId ||
        invitation?.fromPlayer?.id ||
        invitation?.playerId ||
        invitation?.id ||
        ""
    );

const invitationName = (invitation) =>
    invitation?.fromPlayerName ||
    invitation?.fromPlayer?.name ||
    invitation?.name ||
    "Jugador";

const invitationAvatar = (invitation) =>
    invitation?.fromPlayerAvatar ||
    invitation?.fromPlayer?.avatar;

const STATUS = {
    available: { label: "Disponible", tone: "online" },
    inviting: { label: "Invitando…", tone: "busy" },
    invited: { label: "Con invitación", tone: "busy" },
    playing: { label: "En partida", tone: "playing" },
};

const statusOf = (player) =>
    STATUS[player?.status || "available"] || STATUS.playing;

/* =========================================================
   COMPONENTES PEQUEÑOS
========================================================= */

function SectionHeader({ id, eyebrow, icon: Icon, title, action }) {
    return (
        <header className="lb-section-header">
            <div>
                {eyebrow && (
                    <p className="lb-eyebrow">
                        {Icon && <Icon aria-hidden="true" />}
                        <span>{eyebrow}</span>
                    </p>
                )}
                <h2 id={id} className="lb-title">
                    {title}
                </h2>
            </div>

            {action}
        </header>
    );
}

function EmptyState({ icon: Icon, children }) {
    return (
        <div className="lb-empty">
            <span className="lb-empty-icon" aria-hidden="true">
                <Icon />
            </span>
            <p>{children}</p>
        </div>
    );
}

function ComingSoonTile({ icon: Icon, title }) {
    return (
        <li className="lb-soon" aria-disabled="true">
            <span className="lb-soon-icon" aria-hidden="true">
                <Icon />
            </span>
            <span className="lb-soon-title">{title}</span>
            <span className="lb-badge">
                <LuLock aria-hidden="true" />
                <span>Pronto</span>
            </span>
        </li>
    );
}

// Foto del juego (o un respaldo con color si no tiene foto)
function GamePhoto({ game, className = "" }) {

    const [failed, setFailed] = useState(false);
    const src = gameImage(game);

    if (!src || failed) {
        return (
            <span
                className={`lb-photo lb-photo-fallback ${className}`}
                style={{ "--game-color": game?.color || "#5aa9ff" }}
                aria-hidden="true"
            >
                <span>{game?.name}</span>
            </span>
        );
    }

    return (
        <img
            className={`lb-photo ${className}`}
            src={src}
            alt=""
            loading="lazy"
            draggable="false"
            onError={() => setFailed(true)}
        />
    );
}

/* =========================================================
   TARJETA "ELIGE TU JUEGO" (collage)
========================================================= */

function GamesBanner({ games: list, onOpen }) {

    const photos = list.slice(0, 4);

    return (
        <button
            type="button"
            className="lb-banner"
            onClick={onOpen}
            aria-haspopup="dialog"
        >
            <span className="lb-banner-text">
                <span className="lb-eyebrow">
                    <LuGamepad2 aria-hidden="true" />
                    <span>Multijugador</span>
                </span>

                <span className="lb-banner-title">Elige tu juego</span>

                <span className="lb-banner-sub">
                    {`${list.length} ${list.length === 1 ? "juego disponible" : "juegos disponibles"}`}
                </span>
            </span>

            <span className="lb-collage" aria-hidden="true">
                {photos.map((game, index) => (
                    <span
                        key={game.id ?? index}
                        className="lb-collage-frame"
                        style={{ "--i": index }}
                    >
                        <GamePhoto game={game} />
                    </span>
                ))}
            </span>

            <span className="lb-banner-cta">
                <span>Ver juegos</span>
                <LuArrowRight aria-hidden="true" />
            </span>
        </button>
    );
}

/* =========================================================
   MODAL DE JUEGOS
   Usa <dialog>: el navegador maneja el foco, Escape
   lo cierra y el fondo queda bloqueado.
========================================================= */

function GamesModal({ open, onClose, games: list, onPlay, onPlayLocal, playerName }) {

    const dialogRef = useRef(null);

    useEffect(() => {

        const dialog = dialogRef.current;

        if (!dialog) return;

        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();

    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            className="lb-modal"
            aria-labelledby="lb-modal-title"
            onClose={onClose}
            onCancel={(e) => {
                e.preventDefault();
                onClose();
            }}
            onClick={(e) => {
                // Clic fuera de la caja cierra el modal
                if (e.target === dialogRef.current) onClose();
            }}
        >
            <div className="lb-modal-box">

                <header className="lb-modal-header">
                    <div>
                        <p className="lb-eyebrow">
                            <LuGamepad2 aria-hidden="true" />
                            <span>Multijugador</span>
                        </p>
                        <h2 id="lb-modal-title" className="lb-title">
                            Elige tu juego
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="lb-icon-btn"
                        onClick={onClose}
                        aria-label="Cerrar lista de juegos"
                    >
                        <LuX aria-hidden="true" />
                    </button>
                </header>

                <div className="lb-modal-body">

                    <ul className="lb-game-grid">
                        {list.map((game) => {

                            const label = playersLabel(game.minPlayers, game.maxPlayers);

                            return (
                                <li key={game.id}>
                                    <button
                                        type="button"
                                        className="lb-game-card"
                                        style={{ "--game-color": game.color || "#5aa9ff" }}
                                        onClick={() => onPlay(game)}
                                    >
                                        <span className="lb-game-cover">
                                            <GamePhoto game={game} />
                                        </span>

                                        <span className="lb-game-info">
                                            <span className="lb-game-name">{game.name}</span>

                                            {game.description && (
                                                <span className="lb-game-desc">
                                                    {game.description}
                                                </span>
                                            )}

                                            <span className="lb-game-footer">
                                                {label && (
                                                    <span className="lb-pill">
                                                        <LuUsers aria-hidden="true" />
                                                        <span>{label}</span>
                                                    </span>
                                                )}

                                                <span className="lb-game-play">
                                                    <span>Jugar</span>
                                                    <LuArrowRight aria-hidden="true" />
                                                </span>
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <button
                        type="button"
                        className="lb-local"
                        onClick={onPlayLocal}
                    >
                        <span className="lb-local-icon" aria-hidden="true">
                            <LuSmartphone />
                        </span>
                        <span className="lb-local-body">
                            <span className="lb-local-title">
                                Triqui en este dispositivo
                            </span>
                            <span className="lb-muted">
                                {`Juega contra ${playerName} Clone, turnándose en la misma pantalla`}
                            </span>
                        </span>
                        <LuArrowRight aria-hidden="true" className="lb-local-go" />
                    </button>
                </div>
            </div>
        </dialog>
    );
}

/* =========================================================
   LOBBY
========================================================= */

export default function Lobby() {

    const navigate = useNavigate();

    const { user, loading } = useAuth();

    const [onlinePlayers, setOnlinePlayers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [onlineMessage, setOnlineMessage] = useState("");
    const [invitationAlert, setInvitationAlert] = useState(null);
    const [gamesOpen, setGamesOpen] = useState(false);

    const alertTimerRef = useRef(null);
    const messageTimerRef = useRef(null);

    const showOnlineMessage = useCallback((text, ms = 3000) => {
        clearTimeout(messageTimerRef.current);
        setOnlineMessage(text);
        messageTimerRef.current = setTimeout(() => setOnlineMessage(""), ms);
    }, []);

    const hideAlert = useCallback(() => {
        clearTimeout(alertTimerRef.current);
        setInvitationAlert(null);
    }, []);

    const scheduleAlertHide = useCallback((ms = 8000) => {
        clearTimeout(alertTimerRef.current);
        alertTimerRef.current = setTimeout(() => setInvitationAlert(null), ms);
    }, []);

    useEffect(() => () => {
        clearTimeout(alertTimerRef.current);
        clearTimeout(messageTimerRef.current);
    }, []);

    /* =====================================================
       CONEXIÓN AL MUNDO ONLINE (misma lógica de antes)
    ===================================================== */

    useEffect(() => {

        if (!user) return;

        const handleConnect = () => {
            socket.emit("world:join");
        };

        const handlePlayers = (data = {}) => {

            const players = Array.isArray(data)
                ? data
                : Array.isArray(data.players)
                    ? data.players
                    : [];

            const currentUserId = user?.id || user?.user_id || user?.userId;

            setOnlinePlayers(
                currentUserId
                    ? players.filter(
                        (p) => String(p.id) !== String(currentUserId)
                    )
                    : players
            );
        };

        const handleInvitation = (invitation) => {

            if (!invitation) return;

            const key = invitationKey(invitation);

            setInvitations((current) =>
                current.some((item) => invitationKey(item) === key)
                    ? current
                    : [...current, invitation]
            );

            setInvitationAlert(invitation);
            scheduleAlertHide();
        };

        const handleInviteSent = () => {
            showOnlineMessage("Invitación enviada", 2500);
        };

        const handleInvitationRejected = ({ playerName } = {}) => {
            showOnlineMessage(
                playerName
                    ? `${playerName} rechazó la invitación`
                    : "La invitación fue rechazada"
            );
        };

        const handleGameCreated = () => {
            navigate("/games/triqui");
        };

        socket.on("connect", handleConnect);
        socket.on("world:players", handlePlayers);
        socket.on("world:invitation", handleInvitation);
        socket.on("world:inviteSent", handleInviteSent);
        socket.on("world:invitationRejected", handleInvitationRejected);
        socket.on("world:gameCreated", handleGameCreated);

        if (socket.connected) {
            socket.emit("world:join");
        } else {
            socket.connect();
        }

        return () => {
            socket.off("connect", handleConnect);
            socket.off("world:players", handlePlayers);
            socket.off("world:invitation", handleInvitation);
            socket.off("world:inviteSent", handleInviteSent);
            socket.off("world:invitationRejected", handleInvitationRejected);
            socket.off("world:gameCreated", handleGameCreated);
        };

    }, [user, navigate, scheduleAlertHide, showOnlineMessage]);

    /* =====================================================
       ACCIONES
    ===================================================== */

    const handleInvite = (player) => {

        if (!player || (player.status || "available") !== "available") {
            return;
        }

        socket.emit("world:invite", { targetPlayerId: player.id });
    };

    const removeInvitation = (invitation) => {
        const key = invitationKey(invitation);
        setInvitations((current) =>
            current.filter((item) => invitationKey(item) !== key)
        );
    };

    const handleAcceptInvitation = (invitation) => {

        const fromPlayerId =
            invitation?.fromPlayerId ||
            invitation?.fromPlayer?.id ||
            invitation?.playerId;

        if (!fromPlayerId) return;

        removeInvitation(invitation);
        hideAlert();

        socket.emit("world:acceptInvitation", { fromPlayerId });
    };

    const handleRejectInvitation = (invitation) => {

        const fromPlayerId =
            invitation?.fromPlayerId ||
            invitation?.fromPlayer?.id ||
            invitation?.playerId;

        if (!fromPlayerId) return;

        removeInvitation(invitation);
        hideAlert();

        socket.emit("world:rejectInvitation", { fromPlayerId });
    };

    const goToProfile = (id) => navigate(`/profile/${id}`);

    /* =====================================================
       CARGANDO / SIN SESIÓN
    ===================================================== */

    if (loading) {
        return (
            <div className="mv-app lb">
                <div className="lb-bg" aria-hidden="true" />
                <main className="lb-center-state" aria-busy="true">
                    <span className="lb-spinner" aria-hidden="true" />
                    <p role="status">Cargando tu perfil…</p>
                </main>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="mv-app lb">
                <div className="lb-bg" aria-hidden="true" />
                <main className="lb-center-state">
                    <h1 className="lb-title">Sesión no encontrada</h1>
                    <p>Inicia sesión para entrar al mundo MathVision.</p>
                    <button
                        type="button"
                        className="lb-btn lb-btn-primary"
                        onClick={() => navigate("/")}
                    >
                        <LuLogIn aria-hidden="true" />
                        <span>Iniciar sesión</span>
                    </button>
                </main>
            </div>
        );
    }

    /* =====================================================
       PERFIL
    ===================================================== */

    const xp = Number(user.xp) || 0;
    const level = Number(user.level) || 1;
    const xpInLevel = xp % 1000;
    const xpPercentage = Math.round(
        Math.min(100, Math.max(0, (xpInLevel / 1000) * 100))
    );

    const player = {
        displayName: user.display_name || user.username || "Jugador",
        level,
        avatar: user.avatar || assets.players.defaultAvatar,
        characterModel: user.character_model_path || null,
        characterName: user.character_name || "Personaje",
        experience: {
            current: xpInLevel,
            percentage: xpPercentage,
        },
        currencies: {
            coins: Number(user.coins) || 0,
            gems: Number(user.gems) || 0,
        },
        statistics: {
            wins: Number(user.games_won) || 0,
            matches: Number(user.games_played) || 0,
            winStreak: 0,
        },
        statusLabel: "ONLINE",
    };

    const connectedCount = onlinePlayers.length + 1;

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="mv-app lb">

            <div
                className="lb-bg"
                aria-hidden="true"
                style={{ backgroundImage: `url(${assets.backgrounds.lobby})` }}
            />

            <a className="lb-skip" href="#lb-games-banner">
                Saltar a los juegos
            </a>

            <MainNav navigation={navigation} player={player} />

            {/* ============ ALERTA DE INVITACIÓN ============ */}

            <div className="lb-toast-region" aria-live="polite">
                {invitationAlert && (
                    <div
                        className="lb-toast"
                        role="dialog"
                        aria-labelledby="lb-toast-title"
                        onMouseEnter={() => clearTimeout(alertTimerRef.current)}
                        onMouseLeave={() => scheduleAlertHide(4000)}
                        onFocus={() => clearTimeout(alertTimerRef.current)}
                    >
                        <span className="lb-avatar lb-avatar-md">
                            <AssetImage
                                src={invitationAvatar(invitationAlert)}
                                type="player"
                                alt=""
                            />
                        </span>

                        <div className="lb-toast-body">
                            <p className="lb-eyebrow">
                                <LuBell aria-hidden="true" />
                                <span>Nueva invitación</span>
                            </p>
                            <p id="lb-toast-title" className="lb-toast-title">
                                {`${invitationName(invitationAlert)} quiere jugar contigo`}
                            </p>

                            <div className="lb-toast-actions">
                                <button
                                    type="button"
                                    className="lb-btn lb-btn-primary lb-btn-sm"
                                    onClick={() => handleAcceptInvitation(invitationAlert)}
                                >
                                    <LuCheck aria-hidden="true" />
                                    <span>Aceptar</span>
                                </button>
                                <button
                                    type="button"
                                    className="lb-btn lb-btn-ghost lb-btn-sm"
                                    onClick={() => handleRejectInvitation(invitationAlert)}
                                >
                                    <span>Rechazar</span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="lb-icon-btn"
                            onClick={hideAlert}
                            aria-label="Cerrar aviso"
                        >
                            <LuX aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>

            <h1 className="lb-sr-only">Lobby de MathVision</h1>

            <main className="lb-main">

                {/* ================= IZQUIERDA ================= */}

                <aside className="lb-col lb-col-left" aria-label="Tu perfil">

                    <section className="lb-card lb-profile" aria-labelledby="lb-profile-title">

                        <div className="lb-profile-top">
                            <span className="lb-avatar lb-avatar-xl">
                                <AssetImage
                                    src={player.avatar}
                                    type="player"
                                    alt={`Avatar de ${player.displayName}`}
                                    className="lobby-profile-avatar-img"
                                />
                            </span>

                            <div className="lb-profile-id">
                                <p className="lb-eyebrow">
                                    <span>Perfil</span>
                                </p>
                                <h2 id="lb-profile-title" className="lb-profile-name">
                                    {player.displayName}
                                </h2>
                                <span className="lb-level">
                                    {`Nivel ${player.level}`}
                                </span>
                            </div>
                        </div>

                        <div className="lb-xp">
                            <div className="lb-xp-labels">
                                <span>Experiencia</span>
                                <span>{`${player.experience.current} / 1000 XP`}</span>
                            </div>

                            <div
                                className="lb-xp-bar"
                                role="progressbar"
                                aria-label={`Progreso al nivel ${player.level + 1}`}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={player.experience.percentage}
                                aria-valuetext={`${player.experience.percentage}% para el nivel ${player.level + 1}`}
                            >
                                <span style={{ width: `${player.experience.percentage}%` }} />
                            </div>

                            <p className="lb-muted">
                                {`${player.experience.percentage}% para el nivel ${player.level + 1}`}
                            </p>
                        </div>

                        <dl className="lb-stats">
                            <div>
                                <dt>
                                    <LuTrophy aria-hidden="true" />
                                    <span>Victorias</span>
                                </dt>
                                <dd>{player.statistics.wins}</dd>
                            </div>
                            <div>
                                <dt>
                                    <LuSwords aria-hidden="true" />
                                    <span>Partidas</span>
                                </dt>
                                <dd>{player.statistics.matches}</dd>
                            </div>
                            <div>
                                <dt>
                                    <LuFlame aria-hidden="true" />
                                    <span>Racha</span>
                                </dt>
                                <dd>{player.statistics.winStreak}</dd>
                            </div>
                        </dl>

                        <button
                            type="button"
                            className="lb-btn lb-btn-secondary lb-btn-block"
                            onClick={() => navigate("/character")}
                        >
                            <LuPalette aria-hidden="true" />
                            <span>Personalizar</span>
                            <LuArrowRight aria-hidden="true" className="lb-btn-end" />
                        </button>
                    </section>

                    <section className="lb-card" aria-labelledby="lb-soon-title">
                        <SectionHeader
                            id="lb-soon-title"
                            eyebrow="En camino"
                            icon={LuSparkles}
                            title="Próximamente"
                        />

                        <ul className="lb-soon-grid">
                            <ComingSoonTile icon={LuSparkles} title="Skins" />
                            <ComingSoonTile icon={LuShoppingBag} title="Tienda" />
                            <ComingSoonTile icon={LuTarget} title="Misiones" />
                            <ComingSoonTile icon={LuTrophy} title="Ranking" />
                        </ul>
                    </section>
                </aside>

                {/* ================= CENTRO ================= */}

                <div className="lb-col lb-col-center">

                    {/* Personaje sin fondo: se ve el colegio detrás */}
                    <section className="lb-stage" aria-label="Tu personaje">

                        <div
                            className="lb-stage-canvas"
                            role="img"
                            aria-label={`Personaje 3D de ${player.displayName}. Arrastra para girarlo.`}
                        >
                            <Canvas
                                gl={{ alpha: true }}
                                camera={{ position: [0, 1.35, 4.5], fov: 42 }}
                            >
                                <ambientLight intensity={1.7} />
                                <directionalLight position={[3, 5, 4]} intensity={3} />
                                <Environment preset="sunset" />

                                <Suspense fallback={null}>
                                    {player.characterModel && (
                                        <VRMCharacter
                                            key={player.characterModel}
                                            url={player.characterModel}
                                            scale={1.9}
                                            position={[0, -1.7, 0]}
                                            rotation={[0, 0, 0]}
                                        />
                                    )}
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

                        <div className="lb-stage-tag">
                            <span className="lb-stage-tag-icon" aria-hidden="true">
                                <LuGamepad2 />
                            </span>
                            <div>
                                <p className="lb-stage-name">{player.displayName}</p>
                                <p className="lb-stage-level">{`Nivel ${player.level}`}</p>
                            </div>
                        </div>

                        <p className="lb-stage-hint" aria-hidden="true">
                            <LuHand />
                            <span>Arrastra para girar</span>
                        </p>
                    </section>

                    <div id="lb-games-banner" className="lb-banner-wrap">
                        <GamesBanner
                            games={games}
                            onOpen={() => setGamesOpen(true)}
                        />
                    </div>
                </div>

                {/* ================= DERECHA ================= */}

                <aside className="lb-col lb-col-right" aria-label="Comunidad">

                    <section className="lb-card lb-status" aria-label="Estado de conexión">
                        <span className="lb-status-dot" aria-hidden="true" />
                        <div className="lb-status-body">
                            <p className="lb-status-title">En línea</p>
                            <p className="lb-muted">
                                {`${connectedCount} ${connectedCount === 1 ? "jugador conectado" : "jugadores conectados"}`}
                            </p>
                        </div>
                        <LuGlobe aria-hidden="true" className="lb-status-icon" />
                    </section>

                    {/* INVITACIONES */}

                    <section className="lb-card lb-invitations" aria-labelledby="lb-inv-title">
                        <SectionHeader
                            id="lb-inv-title"
                            eyebrow="Para ti"
                            icon={LuBell}
                            title="Invitaciones"
                            action={
                                invitations.length > 0 && (
                                    <span
                                        className="lb-count lb-count-alert"
                                        aria-label={`${invitations.length} pendientes`}
                                    >
                                        {invitations.length}
                                    </span>
                                )
                            }
                        />

                        {invitations.length === 0 ? (
                            <EmptyState icon={LuBell}>
                                No tienes invitaciones por ahora.
                            </EmptyState>
                        ) : (
                            <ul className="lb-list lb-scroll">
                                {invitations.map((invitation, index) => {

                                    const name = invitationName(invitation);

                                    return (
                                        <li
                                            className="lb-row"
                                            key={invitationKey(invitation) || index}
                                        >
                                            <span className="lb-avatar">
                                                <AssetImage
                                                    src={invitationAvatar(invitation)}
                                                    type="player"
                                                    alt=""
                                                />
                                            </span>

                                            <div className="lb-row-body">
                                                <p className="lb-row-title">{name}</p>
                                                <p className="lb-muted">
                                                    {invitation.message || "Te invitó a jugar"}
                                                </p>
                                            </div>

                                            <div className="lb-row-actions">
                                                <button
                                                    type="button"
                                                    className="lb-icon-btn lb-icon-btn-success"
                                                    onClick={() => handleAcceptInvitation(invitation)}
                                                    aria-label={`Aceptar invitación de ${name}`}
                                                    title="Aceptar"
                                                >
                                                    <LuCheck aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="lb-icon-btn lb-icon-btn-danger"
                                                    onClick={() => handleRejectInvitation(invitation)}
                                                    aria-label={`Rechazar invitación de ${name}`}
                                                    title="Rechazar"
                                                >
                                                    <LuX aria-hidden="true" />
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {/* JUGADORES ONLINE */}

                    <section className="lb-card lb-players" aria-labelledby="lb-players-title">
                        <SectionHeader
                            id="lb-players-title"
                            eyebrow="Comunidad"
                            icon={LuUsers}
                            title="Jugadores en línea"
                            action={
                                <span
                                    className="lb-count"
                                    aria-label={`${onlinePlayers.length} en línea`}
                                >
                                    {onlinePlayers.length}
                                </span>
                            }
                        />

                        {onlinePlayers.length === 0 ? (
                            <EmptyState icon={LuUsers}>
                                No hay otros jugadores en línea. ¡Invita a un amigo!
                            </EmptyState>
                        ) : (
                            <ul
                                className="lb-list lb-scroll"
                                tabIndex={0}
                                aria-label="Lista de jugadores en línea"
                            >
                                {onlinePlayers.map((onlinePlayer) => {

                                    const status = statusOf(onlinePlayer);
                                    const isAvailable =
                                        (onlinePlayer.status || "available") === "available";
                                    const name = onlinePlayer.name || "Jugador";

                                    return (
                                        <li className="lb-row" key={onlinePlayer.id}>

                                            <button
                                                type="button"
                                                className="lb-row-profile"
                                                onClick={() => goToProfile(onlinePlayer.id)}
                                                aria-label={`Ver perfil de ${name}, ${status.label}`}
                                            >
                                                <span className="lb-avatar">
                                                    <AssetImage
                                                        src={onlinePlayer.avatar}
                                                        type="player"
                                                        alt=""
                                                    />
                                                    <span
                                                        className={`lb-presence lb-presence-${status.tone}`}
                                                        aria-hidden="true"
                                                    />
                                                </span>

                                                <span className="lb-row-body">
                                                    <span className="lb-row-title">{name}</span>
                                                    <span className={`lb-status-text lb-status-${status.tone}`}>
                                                        {status.label}
                                                    </span>
                                                </span>
                                            </button>

                                            {isAvailable ? (
                                                <button
                                                    type="button"
                                                    className="lb-btn lb-btn-primary lb-btn-sm"
                                                    onClick={() => handleInvite(onlinePlayer)}
                                                    aria-label={`Invitar a ${name} a jugar`}
                                                >
                                                    <LuUserPlus aria-hidden="true" />
                                                    <span>Invitar</span>
                                                </button>
                                            ) : (
                                                <span className="lb-waiting" title={status.label}>
                                                    <LuHourglass aria-hidden="true" />
                                                    <span className="lb-sr-only">{status.label}</span>
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        <p className="lb-inline-status" role="status" aria-live="polite">
                            {onlineMessage}
                        </p>
                    </section>

                    <p className="lb-credits">Creado por Sebastián Pitre</p>
                </aside>
            </main>

            {/* ================= MODAL DE JUEGOS ================= */}

            <GamesModal
                open={gamesOpen}
                onClose={() => setGamesOpen(false)}
                games={games}
                playerName={player.displayName}
                onPlay={(game) => {
                    setGamesOpen(false);
                    navigate(game.route);
                }}
                onPlayLocal={() => {
                    setGamesOpen(false);
                    navigate("/triqui-local", {
                        state: { playerName: player.displayName },
                    });
                }}
            />
        </div>
    );
}