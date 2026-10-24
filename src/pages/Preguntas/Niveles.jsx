import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuGem, LuHeart, LuListChecks, LuPlay, LuStar, LuTimer, LuTrophy } from "react-icons/lu";

import PantallaFF, { Pestanas } from "../../components/juego/PantallaFF";
import { NOMBRE_DIFICULTAD } from "../../data/textos";
import { api } from "../../services/api";

import "./niveles.css";

/* =========================================================
   JUEGO DE PREGUNTAS · ELEGIR NIVEL (estilo Free Fire)
   Izquierda: grados · centro: asignatura, dificultad y los
   niveles · derecha: el nivel elegido y el botón JUGAR.
   Los niveles los crea el administrador desde el panel.
========================================================= */

const TODOS = "";
const DIFICULTADES = ["facil", "media", "dificil"];

function Premio({ xp, oro, diamantes }) {
    return (
        <span className="nv-premio">
            {xp > 0 && <span><LuStar aria-hidden="true" className="nv-xp" />{xp}<span className="ffl-oculto"> XP</span></span>}
            {oro > 0 && <span><span className="ffl-moneda-oro nv-oro" aria-hidden="true" />{oro}<span className="ffl-oculto"> de oro</span></span>}
            {diamantes > 0 && <span><LuGem aria-hidden="true" className="nv-gema" />{diamantes}<span className="ffl-oculto"> diamantes</span></span>}
        </span>
    );
}

export default function Niveles() {
    const navigate = useNavigate();
    const [niveles, setNiveles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [grado, setGrado] = useState(TODOS);
    const [asignatura, setAsignatura] = useState(TODOS);
    const [dificultad, setDificultad] = useState(TODOS);
    const [elegidoId, setElegidoId] = useState(null);

    useEffect(() => {
        let cancelado = false;
        api("/niveles")
            .then((datos) => !cancelado && setNiveles(datos.niveles || []))
            .catch((e) => !cancelado && setError(e.message))
            .finally(() => !cancelado && setCargando(false));
        return () => {
            cancelado = true;
        };
    }, []);

    const grados = useMemo(() => [...new Set(niveles.map((n) => n.grado))], [niveles]);
    const asignaturas = useMemo(
        () => [...new Set(niveles.filter((n) => !grado || n.grado === grado).map((n) => n.asignatura))].sort(),
        [niveles, grado]
    );

    const visibles = niveles.filter(
        (n) => (!grado || n.grado === grado) && (!asignatura || n.asignatura === asignatura) && (!dificultad || n.dificultad === dificultad)
    );
    const elegido = visibles.find((n) => n.id === elegidoId) || visibles[0] || null;

    const pestanas = [
        { id: TODOS, texto: "Todos", cuenta: niveles.length },
        ...grados.map((g) => ({ id: g, texto: g, cuenta: niveles.filter((n) => n.grado === g).length })),
    ];

    return (
        <PantallaFF titulo="Preguntas" className="nv">
            <Pestanas
                items={pestanas}
                activa={grado}
                alCambiar={(g) => {
                    setGrado(g);
                    setAsignatura(TODOS);
                }}
                etiqueta="Grado"
            />

            <section className="nv-centro ffp-panel" aria-label="Niveles">
                <div className="nv-filtros">
                    <div className="nv-chips" role="group" aria-label="Asignatura">
                        <button type="button" className="nv-chip" aria-pressed={asignatura === TODOS} onClick={() => setAsignatura(TODOS)}>
                            Todas
                        </button>
                        {asignaturas.map((a) => (
                            <button key={a} type="button" className="nv-chip" aria-pressed={asignatura === a} onClick={() => setAsignatura(a)}>
                                {a}
                            </button>
                        ))}
                    </div>
                    <div className="nv-chips nv-chips-dif" role="group" aria-label="Dificultad">
                        {DIFICULTADES.map((d) => (
                            <button
                                key={d}
                                type="button"
                                className={`nv-chip nv-dif-${d}`}
                                aria-pressed={dificultad === d}
                                onClick={() => setDificultad((actual) => (actual === d ? TODOS : d))}
                            >
                                {NOMBRE_DIFICULTAD[d] || d}
                            </button>
                        ))}
                    </div>
                </div>

                {cargando ? (
                    <p className="nv-vacio">Cargando niveles…</p>
                ) : error ? (
                    <p className="nv-vacio ffp-aviso-error">{error}</p>
                ) : visibles.length === 0 ? (
                    <p className="nv-vacio">{niveles.length ? "No hay niveles con esos filtros." : "Aún no hay niveles. Pídele a tu profe que cree uno."}</p>
                ) : (
                    <ul className="nv-lista">
                        {visibles.map((n) => (
                            <li key={n.id}>
                                <button
                                    type="button"
                                    className={`nv-nivel nv-borde-${n.dificultad} ${elegido?.id === n.id ? "nv-nivel-elegido" : ""}`}
                                    onClick={() => setElegidoId(n.id)}
                                    onDoubleClick={() => navigate(`/games/preguntas/${n.id}`)}
                                    aria-pressed={elegido?.id === n.id}
                                >
                                    <small>{`${n.asignatura} · ${n.grado}`}</small>
                                    <strong>{n.nombre}</strong>
                                    <span className="nv-nivel-pie">
                                        <span className={`nv-dif nv-dif-${n.dificultad}`}>{NOMBRE_DIFICULTAD[n.dificultad] || n.dificultad}</span>
                                        {n.mis_partidas > 0 ? (
                                            <span className="nv-mejor"><LuTrophy aria-hidden="true" />{n.mejor_puntaje ?? 0}</span>
                                        ) : (
                                            <span className="nv-nuevo">Nuevo</span>
                                        )}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <aside className="nv-detalle ffp-panel" aria-label="Nivel elegido">
                {elegido ? (
                    <>
                        <div className="nv-detalle-texto">
                            <small>{`${elegido.asignatura} · ${elegido.grado}`}</small>
                            <h2>{elegido.nombre}</h2>
                            {elegido.descripcion && <p>{elegido.descripcion}</p>}
                        </div>
                        <ul className="nv-datos">
                            <li><LuListChecks aria-hidden="true" />{`${Math.min(elegido.preguntas_por_partida, elegido.total_preguntas)} preguntas`}</li>
                            <li><LuTimer aria-hidden="true" />{elegido.segundos_por_pregunta > 0 ? `${elegido.segundos_por_pregunta} s` : "Sin tiempo"}</li>
                            <li><LuHeart aria-hidden="true" />{`${elegido.vidas} vidas`}</li>
                        </ul>
                        <div className="nv-gana">
                            <small>Ganas hasta</small>
                            <Premio xp={elegido.recompensa_xp} oro={elegido.recompensa_oro} diamantes={elegido.recompensa_diamantes} />
                        </div>
                        <button type="button" className="ffl-iniciar nv-jugar" onClick={() => navigate(`/games/preguntas/${elegido.id}`)}>
                            <LuPlay aria-hidden="true" />
                            Jugar
                        </button>
                    </>
                ) : (
                    <p className="nv-vacio">Elige un nivel.</p>
                )}
            </aside>
        </PantallaFF>
    );
}
