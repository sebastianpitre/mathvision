import React, { Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Canvas } from "@react-three/fiber";
import {
    OrbitControls,
    Environment
} from "@react-three/drei";

import "../styles/mathvision.css";

import player from "../data/mock/player.json";
import navigation from "../data/mock/navigation.json";
import assets from "../data/mock/assets.json";

import AssetImage from "../components/common/AssetImage";
import VRMCharacter from "../components/character/VRMCharacter";


/* =========================================================
   CARGANDO PERSONAJE
   ========================================================= */

function CharacterLoading() {
    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none"
            }}
        >
            <div
                style={{
                    textAlign: "center",
                    padding: "20px"
                }}
            >
                <div
                    style={{
                        fontSize: "36px",
                        marginBottom: "10px"
                    }}
                >
                    🧍
                </div>

                <strong>
                    CARGANDO PERSONAJE...
                </strong>
            </div>
        </div>
    );
}


/* =========================================================
   PERSONAJE
   ========================================================= */

export default function Character() {

    const navigate = useNavigate();


    /* =====================================================
       ESTADO DE PERSONALIZACIÓN
       ===================================================== */

    const [hair, setHair] = useState("#25203c");
    const [shirt, setShirt] = useState("#171c35");
    const [shoes, setShoes] = useState("#eeeeff");


    return (
        <div className="mv-app character-page-app">


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
                            className={`mv-nav-item ${item.id === "character"
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


                {/* =================================================
                    USUARIO
                   ================================================= */}

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


                {/* =================================================
                    MONEDAS
                   ================================================= */}

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


            {/* =================================================
                CONTENIDO
               ================================================= */}

            <main className="character-main">


                {/* =================================================
                    TÍTULO
                   ================================================= */}

                <div className="character-title-row">

                    <div>

                        <span className="eyebrow">
                            AVATAR
                        </span>

                        <h1>
                            MI PERSONAJE
                        </h1>

                        <p>
                            Crea tu identidad dentro de MathVision.
                        </p>

                    </div>


                    <button
                        className="mv-btn mv-btn-primary"
                        type="button"
                    >
                        💾 GUARDAR PERSONAJE
                    </button>

                </div>


                {/* =================================================
                    EDITOR
                   ================================================= */}

                <div className="character-editor">


                    {/* =================================================
                        PREVISUALIZACIÓN
                       ================================================= */}

                    <section className="character-preview">


                        {/* NOMBRE */}

                        <div className="character-name">

                            <span>
                                👑
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


                        {/* =================================================
                            CANVAS 3D
                           ================================================= */}

                        <Canvas
                            className="character-canvas"
                            camera={{
                                position: [0, 1.2, 4.5],
                                fov: 40
                            }}
                        >

                            <ambientLight intensity={1.5} />

                            <directionalLight
                                position={[4, 6, 4]}
                                intensity={3}
                            />

                            <Environment preset="city" />


                            <Suspense fallback={<CharacterLoading />}>

                                <VRMCharacter
                                    url="/models/characters/Adan2.vrm"
                                    scale={1.6}
                                    position={[0, -0.6, 0]}
                                    rotation={[0, Math.PI, 0]}
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


                        {/* =================================================
                            INFORMACIÓN
                           ================================================= */}

                        <div className="character-preview-info">

                            <span>
                                PERSONAJE ACTUAL
                            </span>

                            <strong>
                                ADÁN
                            </strong>

                            <small>
                                Personaje 3D VRM
                            </small>

                        </div>

                    </section>


                    {/* =================================================
                        PANEL DE PERSONALIZACIÓN
                       ================================================= */}

                    <section className="customization-panel">


                        <div className="character-panel-heading">

                            <div>

                                <span className="eyebrow">
                                    PERSONALIZACIÓN
                                </span>

                                <h2>
                                    PERSONALIZAR
                                </h2>

                            </div>

                        </div>


                        {/* =================================================
                            CABELLO
                           ================================================= */}

                        <div className="custom-section">

                            <label>
                                💇 CABELLO
                            </label>

                            <div className="color-options">

                                {[
                                    "#25203c",
                                    "#111111",
                                    "#7b4b2a",
                                    "#d99a39",
                                    "#ffffff"
                                ].map((color) => (

                                    <button
                                        key={color}
                                        type="button"
                                        className={`color-option ${hair === color
                                                ? "selected"
                                                : ""
                                            }`}
                                        style={{
                                            background: color
                                        }}
                                        onClick={() =>
                                            setHair(color)
                                        }
                                    />

                                ))}

                            </div>

                        </div>


                        {/* =================================================
                            CAMISA
                           ================================================= */}

                        <div className="custom-section">

                            <label>
                                👕 CAMISA
                            </label>

                            <div className="color-options">

                                {[
                                    "#171c35",
                                    "#1877ff",
                                    "#8e44ff",
                                    "#e52f56",
                                    "#20c997",
                                    "#ffb52e"
                                ].map((color) => (

                                    <button
                                        key={color}
                                        type="button"
                                        className={`color-option ${shirt === color
                                                ? "selected"
                                                : ""
                                            }`}
                                        style={{
                                            background: color
                                        }}
                                        onClick={() =>
                                            setShirt(color)
                                        }
                                    />

                                ))}

                            </div>

                        </div>


                        {/* =================================================
                            ZAPATOS
                           ================================================= */}

                        <div className="custom-section">

                            <label>
                                👟 ZAPATOS
                            </label>

                            <div className="color-options">

                                {[
                                    "#eeeeff",
                                    "#111111",
                                    "#1877ff",
                                    "#e52f56"
                                ].map((color) => (

                                    <button
                                        key={color}
                                        type="button"
                                        className={`color-option ${shoes === color
                                                ? "selected"
                                                : ""
                                            }`}
                                        style={{
                                            background: color
                                        }}
                                        onClick={() =>
                                            setShoes(color)
                                        }
                                    />

                                ))}

                            </div>

                        </div>


                        {/* =================================================
                            FUTURAS PERSONALIZACIONES
                           ================================================= */}

                        <div className="locked-items">

                            <div>
                                🔒
                            </div>

                            <div>

                                <strong>
                                    PRÓXIMAMENTE
                                </strong>

                                <small>
                                    Skins, accesorios, mochilas,
                                    efectos y mucho más.
                                </small>

                            </div>

                        </div>

                    </section>

                </div>

            </main>

        </div>
    );
}