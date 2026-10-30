import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LuCheck, LuGamepad2, LuGem, LuLock, LuPercent, LuSave, LuTrophy } from "react-icons/lu";

import PantallaFF, { Pestanas } from "../../components/juego/PantallaFF";
import Personaje3D from "../../components/juego/Personaje3D";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import assets from "../../data/mock/assets.json";
import icons from "../../data/mock/icons.json";

import "./perfil.css";
import FotoPerfil from "../../components/juego/FotoPerfil";
import InsigniaRango from "../../components/juego/InsigniaRango";
import Verificado from "../../components/juego/Verificado";

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
    const [cosmeticos, setCosmeticos] = useState({ fotos: [], marcos: [], marcoId: null });
    const [marco, setMarco] = useState(null); // id del marco elegido
    const [rango, setRango] = useState(null);

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

    // Fotos exclusivas y marcos (los míos) · rango de temporada (de quien sea).
    useEffect(() => {
        if (!propio) return;
        api("/perfiles/cosmeticos")
            .then((c) => {
                setCosmeticos(c);
                setMarco(c.marcoId);
            })
            .catch(() => {});
    }, [propio]);

    useEffect(() => {
        const quien = perfil?.id;
        if (!quien) return;
        api(`/perfiles/rango/${quien}`, { auth: false })
            .then(setRango)
            .catch(() => setRango(null));
    }, [perfil?.id]);

    async function guardarMarco() {
        setGuardando(true);
        setAviso({ texto: "", tono: "" });
        try {
            await api("/perfiles/marco", { metodo: "PUT", body: { marcoId: marco } });
            const nuevo = await refreshUser();
            setPerfil((p) => ({ ...p, ...(nuevo || {}) }));
            setCosmeticos((c) => ({ ...c, marcoId: marco }));
            setAviso({ texto: "¡Marco actualizado!", tono: "ok" });
        } catch (e) {
            setAviso({ texto: e.message || "No se pudo guardar.", tono: "error" });
        } finally {
            setGuardando(false);
        }
    }

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
        propio && { id: "marco", texto: "Marcos" },
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
                            <FotoPerfil foto={perfil.avatar} marco={perfil.marco} alt={`Foto de ${nombre}`} />
                        </span>
                        <div className="pf-datos">
                            <strong>
                                {nombre}
                                <Verificado activo={perfil.verificado} />
                            </strong>
                            <span className="pf-xp" title={`${perfil.xp_en_nivel || 0} / ${perfil.xp_para_subir || 100} XP`}>
                                <span style={{ width: `${xp}%` }} />
                            </span>
                            <small>{`Nv. ${perfil.level || 1} · ID ${perfil.id ?? id ?? ""}`}</small>
                            {rango && (
                                <span className="pf-rango">
                                    <InsigniaRango rango={rango.rango} tamano="1.3rem" conNombre />
                                    <small>{`${formato(rango.puntos)} pts`}</small>
                                </span>
                            )}
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
                                {cosmeticos.fotos.map((c) => (
                                    <li key={`c${c.id}`}>
                                        <button
                                            type="button"
                                            className={`pf-foto-opcion ${foto === c.ruta ? "pf-foto-elegida" : ""} ${c.tengo ? "" : "pf-bloqueada"}`}
                                            onClick={() => c.tengo && setFoto(c.ruta)}
                                            disabled={!c.tengo}
                                            aria-pressed={foto === c.ruta}
                                            aria-label={c.tengo ? c.nombre : `${c.nombre} (se gana en eventos)`}
                                            title={c.tengo ? c.nombre : "Se gana en eventos"}
                                        >
                                            <img src={c.ruta} alt="" loading="lazy" draggable="false" />
                                            {foto === c.ruta && <LuCheck aria-hidden="true" />}
                                            {!c.tengo && <LuLock aria-hidden="true" className="pf-candado" />}
                                        </button>
                                    </li>
                                ))}
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

                    {pestana === "marco" && propio && (
                        <div className="pf-fotos">
                            {cosmeticos.marcos.length === 0 ? (
                                <p className="pf-vacio">Aún no hay marcos. Se ganan en los eventos.</p>
                            ) : (
                                <ul>
                                    {[{ id: null, nombre: "Sin marco", ruta: null, tengo: true }, ...cosmeticos.marcos].map((c) => (
                                        <li key={c.id ?? "ninguno"}>
                                            <button
                                                type="button"
                                                className={`pf-foto-opcion pf-marco-opcion ${marco === c.id ? "pf-foto-elegida" : ""} ${c.tengo ? "" : "pf-bloqueada"}`}
                                                onClick={() => c.tengo && setMarco(c.id)}
                                                disabled={!c.tengo}
                                                aria-pressed={marco === c.id}
                                                aria-label={c.tengo ? c.nombre : `${c.nombre} (se gana en eventos)`}
                                                title={c.tengo ? c.nombre : "Se gana en eventos"}
                                            >
                                                <FotoPerfil foto={perfil.avatar} marco={c.ruta} />
                                                {marco === c.id && <LuCheck aria-hidden="true" />}
                                                {!c.tengo && <LuLock aria-hidden="true" className="pf-candado" />}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="pf-fotos-pie">
                                {aviso.texto ? <p className={`ffp-aviso ffp-aviso-${aviso.tono}`} role="status">{aviso.texto}</p> : <span />}
                                <button type="button" className="ffp-btn" onClick={guardarMarco} disabled={guardando || marco === cosmeticos.marcoId}>
                                    <LuSave aria-hidden="true" />
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {propio && pestana !== "foto" && pestana !== "marco" && (
                    <div className="pf-monedas">
                        <span><span className="ffl-moneda-oro" aria-hidden="true" />{formato(perfil.coins)}</span>
                        <span><LuGem aria-hidden="true" className="pf-gema" />{formato(perfil.gems)}</span>
                    </div>
                )}
            </aside>
        </PantallaFF>
    );
}
