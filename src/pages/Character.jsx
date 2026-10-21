import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import ProtegerError from "../components/common/ProtegerError";
import LucesPersonaje from "../components/character/LucesPersonaje";
import { LuCheck, LuCoins, LuGem, LuLock } from "react-icons/lu";

import "../styles/mathvision.css";

import assets from "../data/mock/assets.json";

import MainNav from "../components/navigation/MainNav";
import VRMCharacter from "../components/character/VRMCharacter";

import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

/* =========================================================
   PERSONAJES Y TIENDA
   ---------------------------------------------------------
   · Los personajes que ya tienes se usan con un clic.
   · Los demás se desbloquean con oro o diamantes (y algunos
     piden un nivel mínimo). El precio lo pone el
     administrador desde el panel.
========================================================= */

function CharacterLoading() {
    return (
        <Html center style={{ pointerEvents: "none" }}>
            <div style={{ textAlign: "center", padding: 20, color: "white", whiteSpace: "nowrap" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🧍</div>
                <strong>CARGANDO PERSONAJE...</strong>
            </div>
        </Html>
    );
}

const formato = (n) => (Number(n) || 0).toLocaleString("es-CO");

export default function Character() {
    const { user, actualizarUsuario } = useAuth();

    const [characters, setCharacters] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loadingCharacters, setLoadingCharacters] = useState(true);

    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState({ text: "", tone: "" });

    const avisar = (text, tone = "") => setMessage({ text, tone });

    /* ---------- Cargar personajes ---------- */

    const cargar = useCallback(async () => {
        setLoadingCharacters(true);

        try {
            const data = await api("/tienda");
            const lista = Array.isArray(data.personajes) ? data.personajes : [];
            setCharacters(lista);

            setSelected((actual) =>
                lista.find((c) => c.id === actual?.id) ||
                lista.find((c) => c.id === user?.character_id) ||
                lista.find((c) => c.is_default) ||
                lista[0] ||
                null
            );
        } catch (error) {
            avisar(error.message, "error");
        } finally {
            setLoadingCharacters(false);
        }
        // Solo al entrar a la pantalla.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    if (!user) return null;

    /* ---------- Usar un personaje que ya tengo ---------- */

    async function usar() {
        if (!selected) return;

        setWorking(true);
        avisar("");

        try {
            const data = await api("/users/character", {
                metodo: "PUT",
                body: { characterId: selected.id },
            });

            actualizarUsuario(data.user);
            avisar(`¡Ahora juegas con ${selected.name}!`, "ok");
        } catch (error) {
            avisar(error.message, "error");
        } finally {
            setWorking(false);
        }
    }

    /* ---------- Comprar ---------- */

    async function comprar(moneda) {
        if (!selected) return;

        setWorking(true);
        avisar("");

        try {
            const data = await api("/tienda/comprar", {
                metodo: "POST",
                body: { personaje_id: selected.id, moneda },
            });

            actualizarUsuario(data.perfil);
            setCharacters(data.personajes);
            setSelected(data.personajes.find((c) => c.id === selected.id) || selected);
            avisar(`¡Desbloqueaste a ${selected.name}! Ya puedes usarlo.`, "ok");
        } catch (error) {
            avisar(error.message, "error");
        } finally {
            setWorking(false);
        }
    }

    const level = Number(user.level) || 1;
    const coins = Number(user.coins) || 0;
    const gems = Number(user.gems) || 0;
    const displayName = user.display_name || user.username || "Jugador";

    const enUso = selected?.id === user.character_id;
    const bloqueadoPorNivel = selected && !selected.comprado && level < selected.nivel_minimo;

    return (
        <div className="mv-app character-page-app">
            <div className="lobby-background" style={{ backgroundImage: `url(${assets.backgrounds.lobby})` }} />

            <MainNav />

            <main className="character-main">
                <div className="character-title-row">
                    <div>
                        <span className="eyebrow">AVATAR Y TIENDA</span>
                        <h1>MIS PERSONAJES</h1>
                        <p>
                            Gana oro y diamantes jugando y desbloquea nuevos personajes.
                        </p>
                    </div>

                    <div className="shop-wallet" aria-label="Tu saldo">
                        <span className="shop-coin"><LuCoins aria-hidden="true" />{formato(coins)}</span>
                        <span className="shop-gem"><LuGem aria-hidden="true" />{formato(gems)}</span>
                        <span className="shop-level">{`Nivel ${level}`}</span>
                    </div>
                </div>

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

                        <ProtegerError respaldo={<p className="sin-3d">Tu personaje 3D no se pudo mostrar en este dispositivo.</p>}>

                        <Canvas className="character-canvas" camera={{ position: [0, 1.2, 4.5], fov: 40 }}>
                            <LucesPersonaje />

                            <Suspense fallback={<CharacterLoading />}>
                                {selected && (
                                    <VRMCharacter
                                        key={selected.model_path}
                                        url={selected.model_path}
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
</ProtegerError>

                        <div className="character-preview-info">
                            <span>{enUso ? "PERSONAJE ACTUAL" : selected?.comprado ? "DESBLOQUEADO" : "EN LA TIENDA"}</span>
                            <strong>{selected?.name || "SIN PERSONAJE"}</strong>
                            <small>Personaje 3D</small>
                        </div>
                    </section>

                    {/* PANEL */}
                    <section className="customization-panel">
                        <div className="character-panel-heading">
                            <div>
                                <span className="eyebrow">PERSONAJES</span>
                                <h2>ELIGE O DESBLOQUEA</h2>
                            </div>
                        </div>

                        <div className="custom-section">
                            {loadingCharacters ? (
                                <div style={{ padding: "20px 0" }}>CARGANDO PERSONAJES...</div>
                            ) : characters.length === 0 ? (
                                <div style={{ padding: "20px 0" }}>NO HAY PERSONAJES DISPONIBLES</div>
                            ) : (
                                <div className="color-options shop-grid">
                                    {characters.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            title={c.name}
                                            aria-label={`${c.name}${c.comprado ? "" : " (bloqueado)"}`}
                                            aria-pressed={selected?.id === c.id}
                                            className={`color-option shop-item ${selected?.id === c.id ? "selected" : ""} ${c.comprado ? "" : "is-locked"}`}
                                            onClick={() => {
                                                setSelected(c);
                                                avisar("");
                                            }}
                                        >
                                            {c.thumbnail_path ? (
                                                <img src={c.thumbnail_path} alt="" loading="lazy" />
                                            ) : (
                                                <span className="shop-noimg" aria-hidden="true">🧍</span>
                                            )}

                                            {c.id === user.character_id && (
                                                <span className="shop-badge shop-badge-on" aria-hidden="true"><LuCheck /></span>
                                            )}

                                            {!c.comprado && (
                                                <span className="shop-badge" aria-hidden="true"><LuLock /></span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selected && (
                            <div className="shop-detail">
                                <strong className="shop-detail-name">{selected.name}</strong>

                                {selected.comprado ? (
                                    <>
                                        <small>
                                            {enUso ? "Es tu personaje actual." : "Ya es tuyo. Pulsa para usarlo en el juego."}
                                        </small>
                                        <button
                                            type="button"
                                            className="mv-btn mv-btn-primary"
                                            onClick={usar}
                                            disabled={working || enUso}
                                        >
                                            {enUso ? "✔ EN USO" : working ? "GUARDANDO..." : "USAR ESTE PERSONAJE"}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <small>
                                            {bloqueadoPorNivel
                                                ? `Se desbloquea en el nivel ${selected.nivel_minimo}. ¡Sigue jugando!`
                                                : selected.nivel_minimo > 1
                                                    ? `Disponible desde el nivel ${selected.nivel_minimo}.`
                                                    : "Desbloquéalo con tu oro o tus diamantes."}
                                        </small>

                                        <div className="shop-buy">
                                            {selected.precio_oro > 0 && (
                                                <button
                                                    type="button"
                                                    className="mv-btn mv-btn-primary shop-buy-oro"
                                                    onClick={() => comprar("oro")}
                                                    disabled={working || bloqueadoPorNivel || coins < selected.precio_oro}
                                                >
                                                    <LuCoins aria-hidden="true" />
                                                    {`${formato(selected.precio_oro)} de oro`}
                                                </button>
                                            )}
                                            {selected.precio_diamantes > 0 && (
                                                <button
                                                    type="button"
                                                    className="mv-btn mv-btn-primary shop-buy-gem"
                                                    onClick={() => comprar("diamantes")}
                                                    disabled={working || bloqueadoPorNivel || gems < selected.precio_diamantes}
                                                >
                                                    <LuGem aria-hidden="true" />
                                                    {`${formato(selected.precio_diamantes)} diamantes`}
                                                </button>
                                            )}
                                        </div>

                                        {!bloqueadoPorNivel &&
                                            (selected.precio_oro === 0 || coins < selected.precio_oro) &&
                                            (selected.precio_diamantes === 0 || gems < selected.precio_diamantes) && (
                                                <small>Aún no te alcanza. Gana más jugando al juego de preguntas.</small>
                                            )}
                                    </>
                                )}
                            </div>
                        )}

                        <p
                            className={`shop-message ${message.tone ? `shop-message-${message.tone}` : ""}`}
                            role="status"
                            aria-live="polite"
                        >
                            {message.text}
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
