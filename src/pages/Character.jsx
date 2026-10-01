import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Html } from "@react-three/drei";

import "../styles/mathvision.css";

import navigation from "../data/mock/navigation.json";
import assets from "../data/mock/assets.json";

import MainNav from "../components/navigation/MainNav";
import VRMCharacter from "../components/character/VRMCharacter";

import { useAuth } from "../context/AuthContext";
import { getToken } from "../services/authService";
import { API_URL } from "../services/serverConfig";


/* =========================================================
   PETICIÓN AUTENTICADA AL SERVIDOR
   Usa API_URL (sale de VITE_SERVER_URL) y el token guardado.
========================================================= */

async function apiRequest(endpoint, options = {}) {

    const token = getToken();

    if (!token) {
        throw new Error("Sesión no encontrada.");
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });

    // Si el servidor responde algo que no es JSON (502, 404 de Nginx...)
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data?.message || `Error del servidor (${response.status}).`
        );
    }

    return data;
}


/* =========================================================
   CARGANDO PERSONAJE (dentro del Canvas)
========================================================= */

function CharacterLoading() {
    return (
        <Html center style={{ pointerEvents: "none" }}>
            <div
                style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "white",
                    whiteSpace: "nowrap",
                }}
            >
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>
                    🧍
                </div>
                <strong>CARGANDO PERSONAJE...</strong>
            </div>
        </Html>
    );
}


/* =========================================================
   PÁGINA: MI PERSONAJE
========================================================= */

export default function Character() {

    const navigate = useNavigate();

    const { user, loading, refreshUser } = useAuth();

    const [characters, setCharacters] = useState([]);
    const [selectedCharacter, setSelectedCharacter] = useState(null);
    const [loadingCharacters, setLoadingCharacters] = useState(true);

    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");


    /* =====================================================
       CARGAR PERSONAJES DISPONIBLES
    ===================================================== */

    useEffect(() => {

        if (!user) {
            return;
        }

        let cancelled = false;

        async function loadCharacters() {

            setLoadingCharacters(true);

            try {

                const data = await apiRequest("/users/characters");

                if (cancelled) {
                    return;
                }

                const available = Array.isArray(data.characters)
                    ? data.characters
                    : [];

                setCharacters(available);

                // Personaje actual → el marcado por defecto → el primero.
                const current = available.find(
                    (c) => c.id === user.character_id
                );

                const byDefault = available.find((c) => c.is_default);

                setSelectedCharacter(
                    current || byDefault || available[0] || null
                );

            } catch (error) {

                console.error("❌ Error cargando personajes:", error);

                if (!cancelled) {
                    setSaveMessage(
                        error.message || "Error cargando personajes."
                    );
                }

            } finally {

                if (!cancelled) {
                    setLoadingCharacters(false);
                }

            }
        }

        loadCharacters();

        // Evita actualizar estado si el usuario sale de la página
        return () => {
            cancelled = true;
        };

    }, [user]);


    /* =====================================================
       GUARDAR PERSONAJE
    ===================================================== */

    async function handleSaveCharacter() {

        if (!selectedCharacter) {
            setSaveMessage("Selecciona un personaje.");
            return;
        }

        setSaving(true);
        setSaveMessage("");

        try {

            await apiRequest("/users/character", {
                method: "PUT",
                body: JSON.stringify({
                    characterId: selectedCharacter.id,
                }),
            });

            // Trae el perfil actualizado para no tener que hacer F5.
            await refreshUser();

            setSaveMessage("PERSONAJE GUARDADO");

        } catch (error) {

            console.error("❌ Error guardando personaje:", error);

            setSaveMessage(
                error.message || "Error guardando el personaje."
            );

        } finally {

            setSaving(false);

        }
    }


    /* =====================================================
       CARGANDO SESIÓN
    ===================================================== */

    if (loading) {
        return (
            <div
                className="mv-app"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <strong>CARGANDO PERFIL...</strong>
            </div>
        );
    }


    /* =====================================================
       SIN SESIÓN
    ===================================================== */

    if (!user) {
        return (
            <div
                className="mv-app"
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: "20px",
                }}
            >
                <strong>SESIÓN NO ENCONTRADA</strong>

                <button
                    className="mv-btn mv-btn-primary"
                    type="button"
                    onClick={() => navigate("/auth-test")}
                >
                    INICIAR SESIÓN
                </button>
            </div>
        );
    }


    /* =====================================================
       DATOS DEL USUARIO (para la barra superior)
    ===================================================== */

    const displayName = user.display_name || user.username || "Jugador";
    const level = Number(user.level) || 1;
    const xp = Number(user.xp) || 0;

    const navPlayer = {
        avatar: user.avatar || assets.players.defaultAvatar,
        displayName,
        level,
        experience: {
            percentage: Math.min(100, Math.max(0, (xp % 1000) / 10)),
        },
        currencies: {
            coins: Number(user.coins) || 0,
            gems: Number(user.gems) || 0,
        },
    };


    /* =====================================================
       PÁGINA
    ===================================================== */

    return (
        <div className="mv-app character-page-app">

            {/* FONDO */}
            <div
                className="lobby-background"
                style={{
                    backgroundImage: `url(${assets.backgrounds.lobby})`,
                }}
            />

            {/* NAVEGACIÓN */}
            <MainNav navigation={navigation} player={navPlayer} />

            <main className="character-main">

                {/* TÍTULO */}
                <div className="character-title-row">

                    <div>
                        <span className="eyebrow">AVATAR</span>
                        <h1>MI PERSONAJE</h1>
                        <p>
                            Elige el personaje que representará tu
                            identidad dentro de LudoGamif.
                        </p>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "15px",
                        }}
                    >
                        {saveMessage && (
                            <span style={{ fontWeight: "700" }}>
                                {saveMessage}
                            </span>
                        )}

                        <button
                            className="mv-btn mv-btn-primary"
                            type="button"
                            onClick={handleSaveCharacter}
                            disabled={saving || !selectedCharacter}
                        >
                            {saving
                                ? "💾 GUARDANDO..."
                                : "💾 GUARDAR PERSONAJE"}
                        </button>
                    </div>

                </div>

                {/* EDITOR */}
                <div className="character-editor">

                    {/* PREVISUALIZACIÓN */}
                    <section className="character-preview">

                        <div className="character-name">
                            <span>👑</span>
                            <div>
                                <strong>{displayName}</strong>
                                <small>NIVEL {level}</small>
                            </div>
                        </div>

                        <Canvas
                            className="character-canvas"
                            camera={{ position: [0, 1.2, 4.5], fov: 40 }}
                        >
                            <ambientLight intensity={1.5} />
                            <directionalLight
                                position={[4, 6, 4]}
                                intensity={3}
                            />
                            <Environment preset="city" />

                            <Suspense fallback={<CharacterLoading />}>
                                {selectedCharacter && (
                                    <VRMCharacter
                                        key={selectedCharacter.model_path}
                                        url={selectedCharacter.model_path}
                                        scale={1.5}
                                        position={[0, -1.3, 0]}
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

                        <div className="character-preview-info">
                            <span>PERSONAJE ACTUAL</span>
                            <strong>
                                {selectedCharacter?.name || "SIN PERSONAJE"}
                            </strong>
                            <small>Personaje 3D VRM</small>
                        </div>

                    </section>

                    {/* PANEL DE PERSONAJES */}
                    <section className="customization-panel">

                        <div className="character-panel-heading">
                            <div>
                                <span className="eyebrow">PERSONAJES</span>
                                <h2>ELEGIR PERSONAJE</h2>
                            </div>
                        </div>

                        <div className="custom-section">

                            <label>🧍 PERSONAJES DISPONIBLES</label>

                            {loadingCharacters ? (

                                <div style={{ padding: "20px 0" }}>
                                    CARGANDO PERSONAJES...
                                </div>

                            ) : characters.length === 0 ? (

                                <div style={{ padding: "20px 0" }}>
                                    NO HAY PERSONAJES DISPONIBLES
                                </div>

                            ) : (

                                <div className="color-options">
                                    {characters.map((character) => (
                                        <button
                                            key={character.id}
                                            type="button"
                                            title={character.name}
                                            className={`color-option ${selectedCharacter?.id === character.id
                                                    ? "selected"
                                                    : ""
                                                }`}
                                            onClick={() => {
                                                setSelectedCharacter(character);
                                                setSaveMessage("");
                                            }}
                                        >
                                            {character.thumbnail_path ? (
                                                <img
                                                    src={character.thumbnail_path}
                                                    alt={character.name}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                        borderRadius: "inherit",
                                                    }}
                                                />
                                            ) : (
                                                <span style={{ fontSize: "24px" }}>
                                                    🧍
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                            )}

                        </div>

                        {selectedCharacter && (
                            <div
                                className="locked-items"
                                style={{ marginTop: "20px" }}
                            >
                                <div>🧍</div>
                                <div>
                                    <strong>{selectedCharacter.name}</strong>
                                    <small>
                                        Personaje seleccionado. Pulsa guardar
                                        para establecerlo como tu personaje
                                        permanente.
                                    </small>
                                </div>
                            </div>
                        )}

                    </section>

                </div>

            </main>

        </div>
    );
}