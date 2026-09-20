import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/mathvision.css";

import AssetImage from "../components/common/AssetImage";

import player from "../data/mock/player.json";
import navigation from "../data/mock/navigation.json";
import assets from "../data/mock/assets.json";

const games = [
    {
        id: "triqui",
        icon: "⭕❌",
        name: "Triqui Matemático",
        min: 2,
        max: 2
    },
    {
        id: "bingo",
        icon: "🎱",
        name: "Bingo Matemático",
        min: 3,
        max: 30
    },
    {
        id: "quiz",
        icon: "💡",
        name: "Quiz Matemático",
        min: 2,
        max: 8
    },
    {
        id: "batalla",
        icon: "⚔️",
        name: "Batalla Matemática",
        min: 2,
        max: 8
    }
];

const players = [
    {
        id: 1,
        name: "Sebastián",
        avatar: null,
        host: true
    },
    {
        id: 2,
        name: "Jorge",
        avatar: null
    },
    {
        id: 3,
        name: "María",
        avatar: null
    }
];

export default function Room() {
    const navigate = useNavigate();

    const [selectedGame, setSelectedGame] = useState(games[2]);

    const enoughPlayers =
        players.length >= selectedGame.min &&
        players.length <= selectedGame.max;

    const emptySlots = Math.min(
        Math.max(0, selectedGame.max - players.length),
        6
    );

    return (
        <div className="mv-app room-page">

            {/* =====================================================
                BACKGROUND
            ===================================================== */}

            <div
                className="room-background"
                style={{
                    backgroundImage: `url(${assets.backgrounds.lobby})`
                }}
            />


            {/* =====================================================
                HEADER
            ===================================================== */}

            <header className="mv-header room-header">

                {/* LOGO */}

                <div
                    className="mv-logo"
                    onClick={() => navigate("/lobby")}
                >
                    <div className="mv-logo-main">
                        MATH<span>VISION</span>
                    </div>

                    <div className="mv-logo-sub">
                        JUEGA • APRENDE • CONECTA
                    </div>
                </div>


                {/* NAVEGACIÓN */}

                <nav className="mv-nav">

                    {navigation.map((item) => {

                        const isActive =
                            item.route === "/room" ||
                            item.route === "/games/rooms";

                        return (
                            <button
                                key={item.id}
                                className={`mv-nav-item ${isActive ? "active" : ""
                                    }`}
                                onClick={() => navigate(item.route)}
                            >
                                <b>{item.icon}</b>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}

                </nav>


                {/* JUGADOR */}

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


                {/* CONFIGURACIÓN */}

                <button
                    className="mv-settings"
                    type="button"
                >
                    ⚙
                </button>

            </header>


            {/* =====================================================
                CONTENIDO
            ===================================================== */}

            <main className="room-main">

                {/* =================================================
                    TÍTULO
                ================================================= */}

                <div className="room-title-row">

                    <div className="room-title-content">

                        <span className="eyebrow">
                            SALA PRIVADA
                        </span>

                        <h1>
                            SALA #ARKZM
                        </h1>

                        <p>
                            Invita jugadores y selecciona el juego.
                        </p>

                    </div>


                    {/* CÓDIGO */}

                    <div className="room-code">

                        <div className="room-code-info">

                            <small>
                                CÓDIGO DE SALA
                            </small>

                            <strong>
                                ARKZM
                            </strong>

                        </div>

                        <button
                            className="mv-btn mv-btn-secondary"
                            type="button"
                        >
                            📋 COPIAR
                        </button>

                    </div>

                </div>


                {/* =================================================
                    LAYOUT
                ================================================= */}

                <div className="room-layout">


                    {/* =================================================
                        PANEL PRINCIPAL
                    ================================================= */}

                    <section className="room-main-panel">

                        <div className="room-panel-header">

                            <div>

                                <span className="eyebrow">
                                    MULTIJUGADOR
                                </span>

                                <h2>
                                    JUGADORES EN LA SALA
                                </h2>

                            </div>


                            <span className="room-player-count">

                                {players.length}

                                <small>
                                    / {selectedGame.max}
                                </small>

                            </span>

                        </div>


                        {/* JUGADORES */}

                        <div className="room-players-scroll">

                            <div className="room-player-grid">

                                {players.map((playerItem) => (

                                    <div
                                        className="room-player-card"
                                        key={playerItem.id}
                                    >

                                        {playerItem.host && (
                                            <span className="room-host-badge">
                                                👑 ANFITRIÓN
                                            </span>
                                        )}


                                        <div className="room-player-avatar">

                                            <AssetImage
                                                src={playerItem.avatar}
                                                type="player"
                                                alt={playerItem.name}
                                            />

                                        </div>


                                        <div className="room-player-info">

                                            <strong>
                                                {playerItem.name}
                                            </strong>

                                            <span>
                                                <i />
                                                Listo
                                            </span>

                                        </div>

                                    </div>

                                ))}


                                {/* ESPACIOS VACÍOS */}

                                {Array.from({
                                    length: emptySlots
                                }).map((_, index) => (

                                    <div
                                        className="room-empty-player"
                                        key={`empty-${index}`}
                                    >

                                        <div className="room-empty-icon">
                                            +
                                        </div>

                                        <strong>
                                            ESPERANDO
                                        </strong>

                                        <small>
                                            Jugador
                                        </small>

                                    </div>

                                ))}

                            </div>

                        </div>


                        {/* FOOTER */}

                        <div className="room-main-footer">

                            <div className="room-ready-info">

                                <span className="room-ready-dot" />

                                <div>

                                    <strong>
                                        {enoughPlayers
                                            ? "Sala lista"
                                            : "Esperando jugadores"}
                                    </strong>

                                    <small>
                                        {enoughPlayers
                                            ? "Se puede iniciar la partida."
                                            : `Mínimo ${selectedGame.min} jugadores.`}
                                    </small>

                                </div>

                            </div>


                            <button
                                className="mv-btn mv-btn-primary"
                                onClick={() => navigate("/friends")}
                            >
                                👥 INVITAR AMIGOS
                            </button>

                        </div>

                    </section>


                    {/* =================================================
                        PANEL DERECHO
                    ================================================= */}

                    <aside className="room-side-panel">


                        {/* =================================================
                            ESTADO
                        ================================================= */}

                        <div className="room-side-status">

                            <div className="room-status-icon">
                                🎮
                            </div>

                            <div>

                                <span className="eyebrow">
                                    ESTADO
                                </span>

                                <strong>
                                    Sala activa
                                </strong>

                                <small>
                                    Esperando para comenzar
                                </small>

                            </div>

                        </div>


                        {/* =================================================
                            JUEGO SELECCIONADO
                        ================================================= */}

                        <div className="room-selected-game">

                            <span className="eyebrow">
                                JUEGO SELECCIONADO
                            </span>


                            <div className="room-selected-game-content">

                                <div className="room-selected-game-icon">
                                    {selectedGame.icon}
                                </div>

                                <div>

                                    <strong>
                                        {selectedGame.name}
                                    </strong>

                                    <small>
                                        👥 {selectedGame.min} -{" "}
                                        {selectedGame.max} jugadores
                                    </small>

                                </div>

                            </div>


                            <div
                                className={
                                    enoughPlayers
                                        ? "room-game-status ready"
                                        : "room-game-status"
                                }
                            >

                                <span />

                                {enoughPlayers
                                    ? "Jugadores suficientes"
                                    : `Se necesitan ${selectedGame.min} jugadores`}

                            </div>

                        </div>


                        {/* =================================================
                            SELECCIÓN DE JUEGO
                        ================================================= */}

                        <div className="room-games-section">

                            <div className="room-section-heading">

                                <div>

                                    <span className="eyebrow">
                                        DISPONIBLES
                                    </span>

                                    <h3>
                                        SELECCIONAR JUEGO
                                    </h3>

                                </div>

                            </div>


                            <div className="room-games-list">

                                {games.map((game) => {

                                    const valid =
                                        players.length >= game.min &&
                                        players.length <= game.max;

                                    const selected =
                                        selectedGame.id === game.id;

                                    return (
                                        <button
                                            key={game.id}
                                            type="button"
                                            className={
                                                selected
                                                    ? "room-game-option selected"
                                                    : "room-game-option"
                                            }
                                            onClick={() =>
                                                setSelectedGame(game)
                                            }
                                        >

                                            <span className="room-game-option-icon">
                                                {game.icon}
                                            </span>


                                            <div className="room-game-option-info">

                                                <strong>
                                                    {game.name}
                                                </strong>

                                                <small>

                                                    👥 {game.min} -{" "}
                                                    {game.max}

                                                    {!valid && (
                                                        <em>
                                                            {" "}· No disponible
                                                        </em>
                                                    )}

                                                </small>

                                            </div>


                                            {selected && (
                                                <span className="room-game-check">
                                                    ✓
                                                </span>
                                            )}

                                        </button>
                                    );
                                })}

                            </div>

                        </div>


                        {/* =================================================
                            INICIAR
                        ================================================= */}

                        <div className="room-start-section">

                            <button
                                className={
                                    enoughPlayers
                                        ? "mv-btn mv-btn-primary room-start-button"
                                        : "mv-btn mv-btn-secondary room-start-button"
                                }
                                disabled={!enoughPlayers}
                            >
                                ▶ INICIAR PARTIDA
                            </button>

                            <small>

                                {enoughPlayers
                                    ? "Todos los requisitos están cumplidos."
                                    : "Espera a que entren suficientes jugadores."}

                            </small>

                        </div>

                    </aside>

                </div>

            </main>

        </div>
    );
}