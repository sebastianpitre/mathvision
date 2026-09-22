import React, { Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";

import "../styles/mathvision.css";

import player from "../data/mock/player.json";
import friends from "../data/mock/friends.json";
import rooms from "../data/mock/rooms.json";
import invitations from "../data/mock/invitations.json";
import games from "../data/mock/games.json";
import navigation from "../data/mock/navigation.json";
import assets from "../data/mock/assets.json";

import AssetImage from "../components/common/AssetImage";
import VRMCharacter from "../components/character/VRMCharacter";


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
                    👥 {game.minPlayers}
                    {game.maxPlayers !== game.minPlayers &&
                        ` - ${game.maxPlayers}`}
                    {game.maxPlayers === game.minPlayers &&
                        " jugadores"}
                </small>

            </div>

            <div className="lobby-game-arrow">
                →
            </div>

        </button>
    );
}


/* =========================================================
   LOBBY
   ========================================================= */

export default function Lobby() {

    const navigate = useNavigate();

    const invitation = invitations[0];

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
                HEADER
               ================================================= */}

            <header className="mv-header lobby-header">

                <div
                    className="mv-logo"
                    onClick={() => navigate("/")}
                >
                    <div className="mv-logo-main">
                        MATH<span>VISION</span>
                    </div>

                    <div className="mv-logo-sub">
                        JUEGA • APRENDE • CONECTA
                    </div>
                </div>


                <nav className="mv-nav">

                    {navigation.map((item) => (

                        <button
                            key={item.id}
                            className={`mv-nav-item ${
                                item.id === "home" ? "active" : ""
                            }`}
                            onClick={() => navigate(item.route)}
                        >
                            <b>{item.icon}</b>
                            <span>{item.label}</span>
                        </button>

                    ))}

                </nav>


                <div className="lobby-header-player">

                    <div className="mv-avatar-small">

                        <AssetImage
                            src={player.avatar}
                            type="player"
                            alt={player.displayName}
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
                                    width: `${player.experience.percentage}%`
                                }}
                            />
                        </div>

                    </div>

                </div>


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
                CONTENIDO
               ================================================= */}

            <main className="lobby-main">


                {/* =================================================
                    IZQUIERDA
                   ================================================= */}

                <aside className="lobby-sidebar lobby-sidebar-left">

                    <section className="lobby-profile-card">

                        <div className="lobby-card-label">
                            PERFIL DEL JUGADOR
                        </div>

                        <div className="lobby-profile-avatar">

                            <AssetImage
                                src={player.avatar}
                                type="player"
                                alt={player.displayName}
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
                                        width: `${player.experience.percentage}%`
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
                                <span>Victorias</span>
                            </div>

                            <div>
                                <strong>
                                    {player.statistics.matches}
                                </strong>
                                <span>Partidas</span>
                            </div>

                            <div>
                                <strong>
                                    {player.statistics.winStreak}
                                </strong>
                                <span>Racha</span>
                            </div>

                        </div>


                        <button
                            className="mv-btn mv-btn-secondary lobby-profile-button"
                            onClick={() => navigate("/character")}
                        >
                            PERSONALIZAR
                            <span>→</span>
                        </button>

                    </section>


                    <section className="lobby-event-card">

                        <div className="lobby-event-icon">
                            🐲
                        </div>

                        <div>

                            <span>NOVEDAD</span>

                            <strong>
                                Nuevas skins
                            </strong>

                            <small>
                                Personaliza tu personaje
                            </small>

                        </div>

                        <button>
                            →
                        </button>

                    </section>


                    <section className="lobby-quick-card">

                        <button>
                            <span>🛒</span>

                            <div>
                                <strong>Tienda</strong>
                                <small>Objetos y skins</small>
                            </div>

                            <b>→</b>
                        </button>

                        <button>
                            <span>🎯</span>

                            <div>
                                <strong>Misiones</strong>
                                <small>Obtén recompensas</small>
                            </div>

                            <b>→</b>
                        </button>

                        <button>
                            <span>🏆</span>

                            <div>
                                <strong>Clasificación</strong>
                                <small>Tabla de posiciones</small>
                            </div>

                            <b>→</b>
                        </button>

                    </section>

                </aside>


                {/* =================================================
                    CENTRO
                   ================================================= */}

                <section className="lobby-center">


                    {/* PERSONAJE SOBRE EL MUNDO */}

                    <section className="lobby-world">

                        <Canvas
                            className="lobby-canvas"
                            camera={{
                                position: [0, 1.35, 4.5],
                                fov: 42
                            }}
                        >

                            <ambientLight intensity={1.7} />

                            <directionalLight
                                position={[3, 5, 4]}
                                intensity={3}
                            />

                            <Environment preset="sunset" />

                            <Suspense fallback={null}>
                                <VRMCharacter
                                    url="/models/characters/Adan.vrm"
                                    scale={1.9}
                                    position={[0, -1.7, 0]}
                                    rotation={[0, 0, 0]}
                                />
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

                            <span>👑</span>

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
                                onClick={() => navigate("/games")}
                            >
                                Ver todos →
                            </button>

                        </div>


                        <div className="lobby-games-grid">

                            {games.map((game) => (

                                <GameCard
                                    key={game.id}
                                    game={game}
                                    onClick={() => navigate(game.route)}
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


                    {/* ESTADO */}

                    <section className="lobby-status-card">

                        <div>

                            <span className="lobby-status-dot" />

                            <div>

                                <strong>
                                    {player.statusLabel}
                                </strong>

                                <small>
                                    Listo para jugar
                                </small>

                            </div>

                        </div>

                        <button>
                            ⋮
                        </button>

                    </section>


                    {/* INVITACIÓN */}

                    {invitation && (

                        <section className="lobby-invite-card">

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
                                        {invitation.message}
                                    </small>

                                </div>

                            </div>


                            <div className="lobby-invite-actions">

                                <button className="mv-btn mv-btn-primary">
                                    Aceptar
                                </button>

                                <button className="mv-btn mv-btn-secondary">
                                    Rechazar
                                </button>

                            </div>

                        </section>

                    )}


                    {/* AMIGOS */}

                    <section className="lobby-friends-card">

                        <div className="lobby-card-heading">

                            <div>

                                <span className="eyebrow">
                                    COMUNIDAD
                                </span>

                                <h3>
                                    AMIGOS ONLINE
                                </h3>

                            </div>

                            <strong>
                                {friends.length}
                            </strong>

                        </div>


                        <div className="mv-list mv-scroll lobby-friends-list">

                            {friends.map((friend) => (

                                <div
                                    className="lobby-friend-row"
                                    key={friend.id}
                                >

                                    <div className="lobby-friend-avatar">

                                        <AssetImage
                                            src={friend.avatar}
                                            type="player"
                                            alt={friend.name}
                                        />

                                        <span
                                            className={
                                                friend.status === "available"
                                                    ? "friend-online"
                                                    : "friend-busy"
                                            }
                                        />

                                    </div>


                                    <div className="lobby-friend-info">

                                        <strong>
                                            {friend.name}
                                        </strong>

                                        <small>
                                            {friend.statusLabel}
                                        </small>

                                    </div>


                                    <button
                                        onClick={() =>
                                            navigate("/friends")
                                        }
                                    >
                                        →
                                    </button>

                                </div>

                            ))}

                        </div>


                        <button
                            className="lobby-view-all"
                            onClick={() => navigate("/friends")}
                        >
                            Ver todos mis amigos
                            <span>→</span>
                        </button>

                    </section>


                    {/* SALAS */}

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
                                onClick={() => navigate("/room")}
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
                            onClick={() => navigate("/room")}
                        >
                            + CREAR SALA
                        </button>

                    </section>

                </aside>

            </main>

        </div>
    );
}