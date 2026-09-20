import React from "react";
import { useNavigate } from "react-router-dom";

import "../styles/mathvision.css";

import player from "../data/mock/player.json";
import friends from "../data/mock/friends.json";
import navigation from "../data/mock/navigation.json";
import assets from "../data/mock/assets.json";

import AssetImage from "../components/common/AssetImage";


export default function Friends() {

    const navigate = useNavigate();

    const onlineFriends = friends.filter(
        (friend) => friend.status === "available"
    );

    return (
        <div className="mv-app">

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

            <header className="mv-header">

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


                <nav className="mv-nav">

                    {navigation.map((item) => (

                        <button
                            key={item.id}
                            className={`mv-nav-item ${
                                item.id === "friends"
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() => navigate(item.route)}
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


                {/* Usuario */}

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


                {/* Monedas */}

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

            <main className="page-container">

                <div className="page-title">

                    <div>

                        <span className="eyebrow">
                            COMUNIDAD
                        </span>

                        <h1>
                            MIS AMIGOS
                        </h1>

                        <p>
                            Encuentra jugadores y crea tu equipo.
                        </p>

                    </div>


                    <button className="mv-btn mv-btn-primary">
                        ＋ Agregar amigo
                    </button>

                </div>


                {/* =================================================
                    CONTENIDO PRINCIPAL
                   ================================================= */}

                <div className="friends-layout">


                    {/* =================================================
                        LISTA DE AMIGOS
                       ================================================= */}

                    <section className="mv-panel mv-panel-flex">

                        <div className="friends-tabs">

                            <button className="friends-tab active">
                                Todos
                            </button>

                            <button className="friends-tab">
                                🟢 En línea
                            </button>

                            <button className="friends-tab">
                                📨 Solicitudes
                            </button>

                        </div>


                        <div className="mv-scroll fill-space">

                            <div className="mv-list">

                                {friends.map((friend) => {

                                    const isOnline =
                                        friend.status === "available";

                                    return (

                                        <div
                                            className="mv-list-item friend-item"
                                            key={friend.id}
                                        >

                                            {/* Avatar */}

                                            <div className="friend-avatar">
                                                <AssetImage
                                                    src={friend.avatar}
                                                    type="player"
                                                    alt={friend.name}
                                                />

                                                <span
                                                    className={`friend-status-dot ${
                                                        friend.status === "available"
                                                            ? "online"
                                                            : ""
                                                    }`}
                                                />
                                            </div>


                                            {/* Información */}

                                            <div className="mv-list-item-main">

                                                <strong>
                                                    {friend.name}
                                                </strong>

                                                <small>
                                                    NIVEL {friend.level}
                                                </small>

                                                <small
                                                    className={
                                                        isOnline
                                                            ? "online"
                                                            : ""
                                                    }
                                                >
                                                    {friend.statusLabel}
                                                </small>

                                            </div>


                                            {/* Acción */}

                                            <div className="friend-actions">

                                                {isOnline ? (

                                                    <button className="mv-btn mv-btn-primary">
                                                        🎮 Invitar
                                                    </button>

                                                ) : (

                                                    <button className="mv-btn mv-btn-secondary">
                                                        Ver perfil
                                                    </button>

                                                )}

                                            </div>

                                        </div>

                                    );

                                })}

                            </div>

                        </div>

                    </section>


                    {/* =================================================
                        PANEL DERECHO
                       ================================================= */}

                    <aside className="friend-side-panel">


                        {/* Jugadores conectados */}

                        <section className="mv-panel online-counter">

                            <span className="big-number">
                                {onlineFriends.length}
                            </span>

                            <span>
                                amigos<br />
                                disponibles
                            </span>

                        </section>


                        {/* Información */}

                        <section className="mv-panel friend-tip">

                            <span>
                                💡
                            </span>

                            <p>
                                Invita a tus amigos y crea una
                                sala para comenzar una partida.
                            </p>

                        </section>

                    </aside>

                </div>

            </main>

        </div>
    );
}