import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LuCheck, LuGamepad2, LuGem, LuPercent, LuSave, LuTrophy } from "react-icons/lu";

import PantallaFF, { Pestanas } from "../../components/juego/PantallaFF";
import Personaje3D from "../../components/juego/Personaje3D";
import AssetImage from "../../components/common/AssetImage";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import assets from "../../data/mock/assets.json";
import icons from "../../data/mock/icons.json";

import "./perfil.css";

/* =========================================================
   PERFIL (como el perfil de Free Fire)
   /profile      → mi perfil (puedo cambiar mi foto)
   /profile/:id  → perfil de otro jugador
   Izquierda: pestañas · centro: su personaje 3D · derecha:
   la tarjeta del jugador y lo de la pestaña elegida.
========================================================= */

const formato = (n) => (Number(n) || 0).toLocaleString("es-CO");

export default function Profile() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const { id } = useParams();
    const propio = !id || String(user?.id) === String(id);

    const [perfil, setPerfil] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [pestana, setPestana] = useState("resumen");
    const [foto, setFoto] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });

    useEffect(() => {
        let cancelado = false;
        setCargando(true);
        setError("");
        setPestana("resumen");

        (propio ? api("/users/profile") : api(`/users/profile/${id}`, { auth: false }))
            .then((data) => {
                if (cancelado) return;
                setPerfil(data.user);
                setFoto(data.user.avatar || assets.players.defaultAvatar);
            })
            .catch((e) => !cancelado && setError(e.message || "No se pudo cargar el perfil."))
            .finally(() => !cancelado && setCargando(false));

        return () => {
            cancelado = true;
        };
    }, [id, propio]);

    async function guardarFoto() {
        setGuardando(true);
        setAviso({ texto: "", tono: "" });
        try {
            await api("/users/avatar", { metodo: "PUT", body: { avatar: foto } });
            const nuevo = await refreshUser();
            setPerfil((p) => ({ ...p, ...(nuevo || {}), avatar: nuevo?.avatar || foto }));
            setAviso({ texto: "¡Foto actualizada!", tono: "ok" });
        } catch (e) {
            setAviso({ texto: e.message || "No se pudo guardar.", tono: "error" });
        } finally {
            setGuardando(false);
        }
    }

    if (cargando || !perfil) {
        return (
            <PantallaFF titulo="Perfil" alCerrar={() => navigate(-1)}>
                <p className="pf-estado">{cargando ? "Cargando perfil…" : error || "No existe este jugador."}</p>
            </PantallaFF>
        );
    }

    const nombre = perfil.display_name || perfil.username;
    const jugadas = Number(perfil.games_played) || 0;
    const ganadas = Number(perfil.games_won) || 0;
    const respondidas = Number(perfil.questions_answered) || 0;
    const correctas = Number(perfil.correct_answers) || 0;
    const aciertos = respondidas ? Math.round((100 * correctas) / respondidas) : 0;
    const xp = Math.min(100, (100 * (Number(perfil.xp_en_nivel) || 0)) / (Number(perfil.xp_para_subir) || 100));

    const pestanas = [
        { id: "resumen", texto: "Resumen" },
        { id: "estadisticas", texto: "Estadísticas" },
        propio && { id: "foto", texto: "Foto de perfil" },
    ].filter(Boolean);

    return (
        <PantallaFF titulo="Perfil" alCerrar={() => navigate(-1)} className="pf">
            <Pestanas items={pestanas} activa={pestana} alCambiar={setPestana} etiqueta="Secciones del perfil" />

            <section className="ffp-escenario" aria-label={`Personaje de ${nombre}`}>
                <span className="ffp-plataforma" aria-hidden="true" />
                <Personaje3D modelo={perfil.character_model_path || assets.characters.defaultModel} />
                <span className="pf-personaje">{perfil.character_name || "Personaje"}</span>
            </section>

            <aside className="pf-lado">
                {/* Tarjeta del jugador */}
                <div className="pf-tarjeta">
                    <div className="pf-tarjeta-cabeza">
                        <span className="pf-logo">
                            LUDO<span>GAMIF</span>
                        </span>
                        <strong className="pf-nombre-cabeza">{nombre}</strong>
                    </div>
                    <div className="pf-tarjeta-cuerpo">
                        <span className="pf-foto">
                            <AssetImage src={perfil.avatar} type="player" alt={`Foto de ${nombre}`} />
                        </span>
                        <div className="pf-datos">
                            <strong>{nombre}</strong>
                            <span className="pf-xp" title={`${perfil.xp_en_nivel || 0} / ${perfil.xp_para_subir || 100} XP`}>
                                <span style={{ width: `${xp}%` }} />
                            </span>
                            <small>{`Nv. ${perfil.level || 1} · ID ${perfil.id ?? id ?? ""}`}</small>
                        </div>
                    </div>
                </div>

                <div className="pf-contenido ffp-panel">
                    {pestana === "resumen" && (
                        <ul className="pf-insignias">
                            <li>
                                <LuGamepad2 aria-hidden="true" />
                                <strong>{formato(jugadas)}</strong>
                                <small>Partidas</small>
                            </li>
                            <li>
                                <LuTrophy aria-hidden="true" />
                                <strong>{formato(ganadas)}</strong>
                                <small>Victorias</small>
                            </li>
                            <li>
                                <LuPercent aria-hidden="true" />
                                <strong>{`${aciertos}%`}</strong>
                                <small>Aciertos</small>
                            </li>
                        </ul>
                    )}

                    {pestana === "estadisticas" && (
                        <dl className="pf-tabla">
                            {[
                                ["Partidas jugadas", jugadas],
                                ["Ganadas", ganadas],
                                ["Perdidas", perfil.games_lost],
                                ["Preguntas respondidas", respondidas],
                                ["Correctas", correctas],
                                ["Incorrectas", perfil.incorrect_answers],
                                ...(propio ? [["Oro", perfil.coins], ["Diamantes", perfil.gems]] : []),
                            ].map(([k, v]) => (
                                <div key={k}>
                                    <dt>{k}</dt>
                                    <dd>{formato(v)}</dd>
                                </div>
                            ))}
                        </dl>
                    )}

                    {pestana === "foto" && propio && (
                        <div className="pf-fotos">
                            <ul>
                                {icons.map((icono) => (
                                    <li key={icono.id}>
                                        <button
                                            type="button"
                                            className={`pf-foto-opcion ${foto === icono.src ? "pf-foto-elegida" : ""}`}
                                            onClick={() => setFoto(icono.src)}
                                            aria-pressed={foto === icono.src}
                                            aria-label={icono.name}
                                        >
                                            <img src={icono.src} alt="" loading="lazy" draggable="false" />
                                            {foto === icono.src && <LuCheck aria-hidden="true" />}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="pf-fotos-pie">
                                {aviso.texto ? <p className={`ffp-aviso ffp-aviso-${aviso.tono}`} role="status">{aviso.texto}</p> : <span />}
                                <button type="button" className="ffp-btn" onClick={guardarFoto} disabled={guardando || foto === perfil.avatar}>
                                    <LuSave aria-hidden="true" />
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {propio && pestana !== "foto" && (
                    <div className="pf-monedas">
                        <span><span className="ffl-moneda-oro" aria-hidden="true" />{formato(perfil.coins)}</span>
                        <span><LuGem aria-hidden="true" className="pf-gema" />{formato(perfil.gems)}</span>
                    </div>
                )}
            </aside>
        </PantallaFF>
    );
}
