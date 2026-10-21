import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    LuArrowRight,
    LuBookOpen,
    LuGraduationCap,
    LuHeart,
    LuListChecks,
    LuTimer,
    LuTrophy,
} from "react-icons/lu";

import MainNav from "../../components/navigation/MainNav";
import Recompensas from "../../components/common/Recompensas";
import { NOMBRE_DIFICULTAD } from "../../data/textos";
import { api } from "../../services/api";
import assets from "../../data/mock/assets.json";

import "../../styles/ludo.css";

/* =========================================================
   JUEGO DE PREGUNTAS · ELEGIR NIVEL
   Los niveles los crea el administrador desde el panel.
========================================================= */

const TODOS = "";

export default function Niveles() {
    const navigate = useNavigate();

    const [niveles, setNiveles] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const [grado, setGrado] = useState(TODOS);
    const [asignatura, setAsignatura] = useState(TODOS);
    const [dificultad, setDificultad] = useState(TODOS);

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
        () =>
            [...new Set(niveles.filter((n) => !grado || n.grado === grado).map((n) => n.asignatura))].sort(),
        [niveles, grado]
    );

    const visibles = niveles.filter(
        (n) =>
            (!grado || n.grado === grado) &&
            (!asignatura || n.asignatura === asignatura) &&
            (!dificultad || n.dificultad === dificultad)
    );

    return (
        <div className="lg">
            <div
                className="lb-bg"
                aria-hidden="true"
                style={{ backgroundImage: `url(${assets.backgrounds.lobby})` }}
            />

            <MainNav />

            <main className="lg-main">
                <header className="lg-head">
                    <div>
                        <p className="lb-eyebrow">
                            <LuBookOpen aria-hidden="true" />
                            <span>Ludo Millonario</span>
                        </p>
                        <h1 className="lg-h1">Juego de preguntas</h1>
                        <p className="lg-lead">
                            Elige tu grado y una asignatura. Cada respuesta correcta suma puntos y al
                            terminar ganas experiencia, oro y, en los niveles difíciles, diamantes.
                        </p>
                    </div>
                </header>

                {/* ---------- Filtros ---------- */}
                <section className="lb-card lg-filters" aria-label="Filtrar niveles">
                    <div className="lg-field" style={{ flex: "2 1 320px" }}>
                        <span>Grado</span>
                        <div className="lg-chips" role="group" aria-label="Grado">
                            <button
                                type="button"
                                className="lg-chip"
                                aria-pressed={grado === TODOS}
                                onClick={() => {
                                    setGrado(TODOS);
                                    setAsignatura(TODOS);
                                }}
                            >
                                Todos los grados
                            </button>
                            {grados.map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    className="lg-chip"
                                    aria-pressed={grado === g}
                                    onClick={() => {
                                        setGrado(g);
                                        setAsignatura(TODOS);
                                    }}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    <label className="lg-field" style={{ flex: "1 1 200px" }}>
                        <span>Asignatura</span>
                        <select
                            className="lg-select"
                            value={asignatura}
                            onChange={(e) => setAsignatura(e.target.value)}
                        >
                            <option value={TODOS}>Todas las asignaturas</option>
                            {asignaturas.map((a) => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="lg-field" style={{ flex: "1 1 160px" }}>
                        <span>Dificultad</span>
                        <select
                            className="lg-select"
                            value={dificultad}
                            onChange={(e) => setDificultad(e.target.value)}
                        >
                            <option value={TODOS}>Toda dificultad</option>
                            <option value="facil">Fácil</option>
                            <option value="media">Media</option>
                            <option value="dificil">Difícil</option>
                        </select>
                    </label>
                </section>

                {/* ---------- Niveles ---------- */}
                {/* Solo la lista hace scroll; encabezado y filtros quedan fijos */}
                <div className="lg-scroll">
                {cargando ? (
                    <div className="lb-card lg-empty" role="status">
                        <span className="lg-spinner" style={{ margin: "0 auto 10px", display: "block" }} />
                        Cargando niveles…
                    </div>
                ) : error ? (
                    <p className="lg-alert" role="alert">{error}</p>
                ) : visibles.length === 0 ? (
                    <div className="lb-card lg-empty">
                        {niveles.length === 0
                            ? "Todavía no hay niveles. Pídele a tu profesor que cree uno."
                            : "No hay niveles con esos filtros."}
                    </div>
                ) : (
                    <ul className="lg-grid">
                        {visibles.map((nivel) => (
                            <li key={nivel.id} style={{ display: "flex" }}>
                                <button
                                    type="button"
                                    className="lg-level"
                                    style={{ flex: 1 }}
                                    onClick={() => navigate(`/games/preguntas/${nivel.id}`)}
                                >
                                    <span className="lg-level-top">
                                        <span className="lg-tag">
                                            <LuGraduationCap aria-hidden="true" />
                                            {nivel.grado}
                                        </span>
                                        <span className={`lg-tag lg-tag-${nivel.dificultad}`}>
                                            {NOMBRE_DIFICULTAD[nivel.dificultad] || nivel.dificultad}
                                        </span>
                                    </span>

                                    <span>
                                        <span className="lb-eyebrow">{nivel.asignatura}</span>
                                        <span className="lg-level-name" style={{ display: "block" }}>
                                            {nivel.nombre}
                                        </span>
                                        {nivel.descripcion && (
                                            <span className="lg-level-desc" style={{ display: "block" }}>
                                                {nivel.descripcion}
                                            </span>
                                        )}
                                    </span>

                                    <span className="lg-meta">
                                        <span>
                                            <LuListChecks aria-hidden="true" />
                                            {`${Math.min(nivel.preguntas_por_partida, nivel.total_preguntas)} preguntas`}
                                        </span>
                                        <span>
                                            <LuTimer aria-hidden="true" />
                                            {nivel.segundos_por_pregunta > 0
                                                ? `${nivel.segundos_por_pregunta} s`
                                                : "Sin tiempo"}
                                        </span>
                                        <span>
                                            <LuHeart aria-hidden="true" />
                                            {`${nivel.vidas} vidas`}
                                        </span>
                                    </span>

                                    <Recompensas
                                        xp={nivel.recompensa_xp}
                                        oro={nivel.recompensa_oro}
                                        diamantes={nivel.recompensa_diamantes}
                                    />

                                    <span className="lg-level-foot">
                                        <span className="lb-muted">
                                            {nivel.mis_partidas > 0 ? (
                                                <>
                                                    <LuTrophy aria-hidden="true" style={{ verticalAlign: "-2px" }} />
                                                    {` Mejor: ${nivel.mejor_puntaje ?? 0} pts`}
                                                </>
                                            ) : (
                                                "¡Nuevo para ti!"
                                            )}
                                        </span>
                                        <span className="lb-btn lb-btn-primary lb-btn-sm" aria-hidden="true">
                                            Jugar
                                            <LuArrowRight />
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                </div>
            </main>
        </div>
    );
}
