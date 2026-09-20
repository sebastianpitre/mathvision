import React from "react";
import { useNavigate } from "react-router-dom";

import "../styles/mathvision.css";

import player from "../data/mock/player.json";
import navigation from "../data/mock/navigation.json";
import assets from "../data/mock/assets.json";

import AssetImage from "../components/common/AssetImage";

const games = [
    {
        id: "triqui",
        icon: "⭕❌",
        title: "Triqui Matemático",
        description:
            "Responde correctamente para conquistar el tablero.",
        players: "2 jugadores",
        difficulty: "Fácil",
        category: "Estrategia"
    },
    {
        id: "bingo",
        icon: "🎱",
        title: "Bingo Matemático",
        description:
            "Resuelve operaciones y completa tu cartón.",
        players: "3 - 30 jugadores",
        difficulty: "Fácil",
        category: "Multijugador"
    },
    {
        id: "quiz",
        icon: "💡",
        title: "Quiz Matemático",
        description:
            "Compite contra tus amigos respondiendo preguntas.",
        players: "2 - 8 jugadores",
        difficulty: "Medio",
        category: "Preguntas"
    },
    {
        id: "batalla",
        icon: "⚔️",
        title: "Batalla Matemática",
        description:
            "Una batalla de velocidad y conocimiento.",
        players: "2 - 8 jugadores",
        difficulty: "Medio",
        category: "Competitivo"
    },
    {
        id: "carrera",
        icon: "🏁",
        title: "Carrera Matemática",
        description:
            "Resuelve problemas y llega primero a la meta.",
        players: "2 - 6 jugadores",
        difficulty: "Medio",
        category: "Carrera"
    },
    {
        id: "logico",
        icon: "🧩",
        title: "Desafío Lógico",
        description:
            "Pon a prueba tu razonamiento.",
        players: "2 - 4 jugadores",
        difficulty: "Difícil",
        category: "Lógica"
    }
];

export default function Games() {
    const navigate = useNavigate();

    return (
        <div className="mv-app games-page">

            {/* =====================================================
                BACKGROUND
            ===================================================== */}

            <div
                className="lobby-background"
                style={{
                    backgroundImage: `url(${assets.backgrounds.games || assets.backgrounds.lobby})`
                }}
            />


            {/* =====================================================
                HEADER
            ===================================================== */}

            <header className="mv-header games-header">

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

                    {navigation.map((item) => (

                        <button
                            key={item.id}
                            className={`mv-nav-item ${item.id === "games"
                                    ? "active"
                                    : ""
                                }`}
                            onClick={() => navigate(item.route)}
                        >
                            <b>{item.icon}</b>
                            <span>{item.label}</span>
                        </button>

                    ))}

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

            <main className="games-main">

                {/* =================================================
                    TÍTULO
                ================================================= */}

                <div className="games-title-row">

                    <div className="games-title-content">

                        <span className="eyebrow">
                            MATHVISION ARCADE
                        </span>

                        <h1>
                            ELIGE TU JUEGO
                        </h1>

                        <p>
                            Reúne a tus amigos, entra a una sala y
                            demuestra lo que sabes.
                        </p>

                    </div>


                    <div className="games-counter">

                        <strong>
                            {games.length}
                        </strong>

                        <div>
                            <span>JUEGOS</span>
                            <small>disponibles</small>
                        </div>

                    </div>

                </div>


                {/* =================================================
                    CATÁLOGO
                ================================================= */}

                <section className="games-panel">

                    {/* FILTROS */}

                    <div className="games-panel-header">

                        <div className="games-tabs">

                            <button className="games-tab active">
                                <span>🕹️</span>
                                Todos
                            </button>

                            <button className="games-tab">
                                <span>👥</span>
                                Multijugador
                            </button>

                            <button className="games-tab">
                                <span>🧠</span>
                                Matemáticas
                            </button>

                        </div>


                        <span className="games-panel-count">
                            {games.length} experiencias
                        </span>

                    </div>


                    {/* LISTADO */}

                    <div className="games-scroll">

                        <div className="games-grid">

                            {games.map((game) => (

                                <article
                                    className="game-catalog-card"
                                    key={game.id}
                                >

                                    {/* ARTE */}

                                    <div className="game-card-art">

                                        <div className="game-card-art-glow" />

                                        <span className="game-card-icon">
                                            {game.icon}
                                        </span>

                                        <span className="game-card-category">
                                            {game.category}
                                        </span>

                                    </div>


                                    {/* CONTENIDO */}

                                    <div className="game-card-body">

                                        <div className="game-card-heading">

                                            <h2>
                                                {game.title}
                                            </h2>

                                            <span className="game-card-arrow">
                                                →
                                            </span>

                                        </div>


                                        <p>
                                            {game.description}
                                        </p>


                                        <div className="game-card-meta">

                                            <span>
                                                👥 {game.players}
                                            </span>

                                            <span>
                                                🧠 {game.difficulty}
                                            </span>

                                        </div>


                                        <button
                                            className="mv-btn mv-btn-primary game-card-button"
                                            onClick={() =>
                                                navigate("/room")
                                            }
                                        >
                                            CREAR SALA

                                            <span>
                                                →
                                            </span>

                                        </button>

                                    </div>

                                </article>

                            ))}

                        </div>

                    </div>

                </section>


                <div className="games-slogan">
                    LA MATEMÁTICA TAMBIÉN SE JUEGA
                </div>

            </main>

        </div>
    );
}