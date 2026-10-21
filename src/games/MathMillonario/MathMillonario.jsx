import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaArrowLeft,
    FaHeart,
    FaRegHeart,
    FaFlagCheckered,
    FaVolumeUp,
    FaVolumeMute,
    FaClock,
} from "react-icons/fa";

import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import Recompensas from "../../components/common/Recompensas";
import { NOMBRE_DIFICULTAD } from "../../data/textos";
import { playSound, createBackgroundMusic } from "./components/GameAudio";

import "../../styles/ludo.css";
import "./juegoPreguntas.css";

/* =========================================================
   LUDO MILLONARIO · JUEGO DE PREGUNTAS
   ---------------------------------------------------------
   Todo lo importante pasa en el servidor: elige las
   preguntas, revisa cada respuesta y calcula el premio.
   Aquí solo se muestra y se envía lo que elige el jugador.
========================================================= */

const FONDO = "bg-[url('/img/MathMillonario/fondo.jpg')] bg-cover bg-center";
const PAUSA_RESPUESTA = 1600;

function formato(n) {
    return (Number(n) || 0).toLocaleString("es-CO");
}

export default function JuegoPreguntas() {
    const navigate = useNavigate();
    const { nivelId } = useParams();
    const { actualizarUsuario } = useAuth();

    const [estado, setEstado] = useState("cargando"); // cargando | jugando | final | error
    const [error, setError] = useState("");

    const [nivel, setNivel] = useState(null);
    const [partida, setPartida] = useState(null);
    const [pregunta, setPregunta] = useState(null);

    const [seleccion, setSeleccion] = useState(null);
    const [correcta, setCorrecta] = useState(null);     // posición de la correcta (tras responder)
    const [acerto, setAcerto] = useState(null);         // true | false | null
    const [explicacion, setExplicacion] = useState(null);
    const [ocultas, setOcultas] = useState([]);
    const [enviando, setEnviando] = useState(false);

    const [segundos, setSegundos] = useState(0);
    const [final, setFinal] = useState(null);

    const [sonido, setSonido] = useState(true);
    const musicaRef = useRef(null);
    const sonidoRef = useRef(true);
    const iniciadaRef = useRef(false);
    const siguienteRef = useRef(null);

    const sonar = useCallback((nombre, volumen = 0.7) => {
        if (sonidoRef.current) playSound(nombre, volumen);
    }, []);

    /* ---------------- Música ---------------- */

    useEffect(() => {
        const musica = createBackgroundMusic();
        musica.volume = 0.35;
        musicaRef.current = musica;

        const arrancar = () => {
            if (sonidoRef.current) musica.play().catch(() => {});
        };

        arrancar();
        window.addEventListener("pointerdown", arrancar, { once: true });
        window.addEventListener("keydown", arrancar, { once: true });

        return () => {
            musica.pause();
            window.removeEventListener("pointerdown", arrancar);
            window.removeEventListener("keydown", arrancar);
            clearTimeout(siguienteRef.current);
        };
    }, []);

    const alternarSonido = () => {
        const nuevo = !sonidoRef.current;
        sonidoRef.current = nuevo;
        setSonido(nuevo);

        if (nuevo && estado === "jugando") musicaRef.current?.play().catch(() => {});
        else musicaRef.current?.pause();
    };

    /* ---------------- Empezar partida ---------------- */

    const empezar = useCallback(async () => {
        clearTimeout(siguienteRef.current);
        setEstado("cargando");
        setError("");
        setFinal(null);
        setSeleccion(null);
        setCorrecta(null);
        setAcerto(null);
        setExplicacion(null);
        setOcultas([]);

        try {
            const datos = await api("/partidas", { metodo: "POST", body: { nivel_id: Number(nivelId) } });

            setNivel(datos.nivel);
            setPartida(datos.partida);
            setPregunta(datos.pregunta);
            setSegundos(datos.nivel.segundos_por_pregunta);
            setEstado("jugando");

            if (musicaRef.current && sonidoRef.current) {
                musicaRef.current.currentTime = 0;
                musicaRef.current.play().catch(() => {});
            }
        } catch (e) {
            setError(e.message);
            setEstado("error");
        }
    }, [nivelId]);

    useEffect(() => {
        // En desarrollo React monta dos veces: así no se crean dos partidas.
        if (iniciadaRef.current) return;
        iniciadaRef.current = true;
        empezar();
    }, [empezar]);

    /* ---------------- Fin de la partida ---------------- */

    const terminar = useCallback(
        (datosFinal, perfil) => {
            musicaRef.current?.pause();
            actualizarUsuario(perfil);
            setFinal(datosFinal);
            setEstado("final");

            const gano = datosFinal.recompensa.xp + datosFinal.recompensa.oro + datosFinal.recompensa.diamantes > 0;
            sonar(gano ? "victory" : "gameOver", 0.9);
        },
        [actualizarUsuario, sonar]
    );

    /* ---------------- Responder ---------------- */

    const responder = useCallback(
        async (opcion) => {
            if (enviando || seleccion !== null || !partida) return;

            setEnviando(true);
            setSeleccion(opcion === null ? -1 : opcion);

            try {
                const r = await api(`/partidas/${partida.id}/responder`, {
                    metodo: "POST",
                    body: { opcion },
                });

                setCorrecta(r.respuesta_correcta);
                setAcerto(r.correcta);
                setExplicacion(r.explicacion);
                setPartida(r.partida);
                sonar(r.correcta ? "correct" : "incorrect", 0.8);

                siguienteRef.current = setTimeout(
                    () => {
                        if (r.final) {
                            terminar(r.final, r.perfil);
                            return;
                        }

                        setPregunta(r.siguiente);
                        setSeleccion(null);
                        setCorrecta(null);
                        setAcerto(null);
                        setExplicacion(null);
                        setOcultas([]);
                        setSegundos(nivel?.segundos_por_pregunta || 0);
                    },
                    r.explicacion ? PAUSA_RESPUESTA + 1400 : PAUSA_RESPUESTA
                );
            } catch (e) {
                setError(e.message);
                setEstado("error");
            } finally {
                setEnviando(false);
            }
        },
        [enviando, seleccion, partida, nivel, sonar, terminar]
    );

    /* ---------------- Tiempo ---------------- */

    const tiempoActivo = estado === "jugando" && seleccion === null && (nivel?.segundos_por_pregunta || 0) > 0;

    useEffect(() => {
        if (!tiempoActivo) return;

        if (segundos <= 0) {
            responder(null);
            return;
        }

        const t = setTimeout(() => setSegundos((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [tiempoActivo, segundos, responder]);

    /* ---------------- Comodín y retirarse ---------------- */

    const usarComodin = async () => {
        if (!partida || partida.comodin_usado || seleccion !== null) return;

        try {
            const r = await api(`/partidas/${partida.id}/comodin`, { metodo: "POST" });
            setOcultas(r.ocultar || []);
            setPartida((p) => ({ ...p, comodin_usado: true }));
            sonar("lifeline", 0.8);
        } catch (e) {
            setError(e.message);
        }
    };

    const retirarse = async () => {
        if (!partida || seleccion !== null || partida.aciertos === 0) return;

        try {
            sonar("retire", 0.8);
            const r = await api(`/partidas/${partida.id}/retirarse`, { metodo: "POST" });
            terminar(r.final, r.perfil);
        } catch (e) {
            setError(e.message);
            setEstado("error");
        }
    };

    /* =====================================================
       PANTALLAS
    ===================================================== */

    if (estado === "cargando") {
        return (
            <div className={`flex h-dvh items-center justify-center text-white ${FONDO}`} role="status">
                <span className="lg-spinner" aria-hidden="true" />
                <span className="lb-sr-only">Preparando las preguntas…</span>
            </div>
        );
    }

    if (estado === "error") {
        return (
            <div className={`lg flex items-center justify-center px-4 ${FONDO}`}>
                <div className="lb-card" style={{ maxWidth: 460, textAlign: "center" }}>
                    <h1 className="lb-title">No se pudo jugar este nivel</h1>
                    <p className="lb-muted" style={{ margin: "10px 0 18px" }}>{error}</p>
                    <div className="lg-row" style={{ justifyContent: "center" }}>
                        <button type="button" className="lb-btn lb-btn-primary" onClick={empezar}>
                            Intentar de nuevo
                        </button>
                        <button type="button" className="lb-btn lb-btn-ghost" onClick={() => navigate("/games/preguntas")}>
                            Elegir otro nivel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (estado === "final" && final) {
        return <PantallaFinal final={final} nivel={nivel} onOtraVez={empezar} navigate={navigate} />;
    }

    /* ---------------- Jugando ---------------- */

    const total = partida.total_preguntas;
    const numero = Math.min(partida.indice + (seleccion === null ? 1 : 0), total);
    const escalera = Array.from({ length: total }, (_, i) => (i + 1) * nivel.puntos_por_acierto);
    const urgente = nivel.segundos_por_pregunta > 0 && segundos <= 5;

    return (
        <div className={`flex h-dvh overflow-hidden text-white ${FONDO}`}>
            <main className="flex min-w-0 flex-1 flex-col">
                {/* ENCABEZADO */}
                <header className="jp-header flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-[#070b1d]/95 px-4 md:px-8">
                    <button
                        type="button"
                        onClick={() => navigate("/games/preguntas")}
                        className="flex min-h-11 items-center gap-2 text-sm text-slate-300 hover:text-white"
                    >
                        <FaArrowLeft aria-hidden="true" />
                        <span className="hidden sm:block">Salir</span>
                    </button>

                    <div className="min-w-0 text-center">
                        <p className="truncate text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400">
                            {`${nivel.grado} · ${nivel.asignatura}`}
                        </p>
                        <h1 className="truncate text-base font-black md:text-lg">{nivel.nombre}</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={alternarSonido}
                            aria-label={sonido ? "Silenciar" : "Activar sonido"}
                            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:text-white"
                        >
                            {sonido ? <FaVolumeUp /> : <FaVolumeMute />}
                        </button>

                        <div className="flex items-center gap-1 text-red-400" aria-label={`${partida.vidas} vidas`}>
                            {Array.from({ length: nivel.vidas }, (_, i) =>
                                i < partida.vidas ? <FaHeart key={i} aria-hidden="true" /> : <FaRegHeart key={i} aria-hidden="true" className="opacity-40" />
                            )}
                        </div>
                    </div>
                </header>

                {/* PREGUNTA */}
                <section className="jp-zona flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-6 md:px-10">
                    <div className="jp-indicadores mb-5 flex flex-wrap items-center justify-center gap-2 text-center">
                        <span className="rounded-md bg-black/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
                            {`Pregunta ${numero} de ${total}`}
                        </span>
                        <span className="rounded-md bg-black/40 px-3 py-1 text-sm font-black text-yellow-300">
                            {`${formato(partida.puntos)} pts`}
                        </span>
                        {nivel.segundos_por_pregunta > 0 && (
                            <span
                                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-black ${urgente ? "bg-red-500/30 text-red-200" : "bg-black/40 text-cyan-300"}`}
                                aria-live={urgente ? "assertive" : "off"}
                            >
                                <FaClock aria-hidden="true" />
                                {`${Math.max(0, segundos)} s`}
                            </span>
                        )}
                    </div>

                    <motion.div
                        key={pregunta?.id}
                        initial={{ opacity: 0, y: 25 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-4xl"
                    >
                        <div
                            style={{ clipPath: "polygon(40px 0%, calc(100% - 40px) 0%, 100% 50%, calc(100% - 40px) 100%, 40px 100%, 0% 50%)" }}
                            className="jp-caja-pregunta border border-cyan-500/20 bg-slate-900/90 p-5 px-10 text-center"
                        >
                            <h2 className="jp-pregunta text-xl font-bold leading-relaxed md:text-3xl">{pregunta?.texto}</h2>
                        </div>

                        <div className="jp-opciones mt-5 grid gap-3 md:grid-cols-2">
                            {pregunta?.opciones.map((opcion, i) => {
                                const oculta = ocultas.includes(i);
                                const esLaCorrecta = correcta === i;
                                const esMiErrada = seleccion === i && acerto === false;

                                let tono = "bg-slate-900/90 hover:bg-slate-800/80";
                                if (oculta) tono = "cursor-not-allowed bg-slate-900/30 text-transparent";
                                else if (esLaCorrecta) tono = "bg-emerald-500/25 text-emerald-200 ring-2 ring-emerald-400";
                                else if (esMiErrada) tono = "bg-red-500/25 text-red-200 ring-2 ring-red-400";
                                else if (seleccion === i) tono = "bg-cyan-500/20";

                                return (
                                    <motion.button
                                        key={i}
                                        type="button"
                                        whileHover={seleccion === null && !oculta ? { scale: 1.02 } : {}}
                                        whileTap={seleccion === null && !oculta ? { scale: 0.98 } : {}}
                                        disabled={seleccion !== null || oculta || enviando}
                                        onClick={() => responder(i)}
                                        style={{ clipPath: "polygon(24px 0%, calc(100% - 24px) 0%, 100% 50%, calc(100% - 24px) 100%, 24px 100%, 0% 50%)" }}
                                        className={`jp-opcion min-h-16 px-8 py-4 text-left font-bold transition ${tono}`}
                                    >
                                        <span className="mr-3 text-cyan-400">{String.fromCharCode(65 + i)}.</span>
                                        {oculta ? "Respuesta eliminada" : opcion}
                                    </motion.button>
                                );
                            })}
                        </div>

                        {explicacion && (
                            <p className="jp-explicacion mx-auto mt-4 max-w-3xl rounded-xl bg-black/50 px-4 py-3 text-center text-sm text-slate-200">
                                {explicacion}
                            </p>
                        )}

                        {/* AYUDAS */}
                        <div className="jp-ayudas mt-5 flex flex-wrap justify-center gap-3">
                            <button
                                type="button"
                                disabled={partida.comodin_usado || seleccion !== null}
                                onClick={usarComodin}
                                className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black ${partida.comodin_usado ? "cursor-not-allowed border-slate-800 text-slate-500" : "border-yellow-500/40 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20"}`}
                            >
                                <span className="rounded-full border border-current px-1">50</span>
                                50 / 50
                            </button>

                            <button
                                type="button"
                                disabled={partida.aciertos === 0 || seleccion !== null}
                                onClick={retirarse}
                                title={partida.aciertos === 0 ? "Acierta al menos una pregunta para poder retirarte" : "Terminar y cobrar lo ganado"}
                                className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black ${partida.aciertos > 0 ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-400/10" : "cursor-not-allowed border-slate-800 text-slate-500"}`}
                            >
                                <FaFlagCheckered aria-hidden="true" />
                                RETIRARSE
                            </button>
                        </div>
                    </motion.div>
                </section>
            </main>

            {/* ESCALERA DE PUNTOS */}
            <aside className="hidden w-64 shrink-0 border-l border-slate-800 bg-[#070b1d]/95 lg:flex lg:flex-col">
                <div className="border-b border-slate-800 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Escalera</p>
                    <p className="mt-1 text-xl font-black text-yellow-400">{`${formato(escalera.at(-1))} pts`}</p>
                    <p className="mt-1 text-xs text-slate-400">
                        {`${NOMBRE_DIFICULTAD[nivel.dificultad]} · mínimo ${nivel.porcentaje_minimo}% para ganar`}
                    </p>
                </div>

                <ol className="flex flex-1 flex-col-reverse justify-end gap-1 overflow-y-auto p-4">
                    {escalera.map((puntos, i) => {
                        const logrado = i < partida.aciertos;
                        const actual = i === partida.aciertos;

                        return (
                            <li
                                key={i}
                                className={`flex items-center justify-between rounded-lg px-4 py-1.5 text-sm font-bold ${actual ? "bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-400/30" : logrado ? "text-emerald-400" : "text-slate-400"}`}
                            >
                                <span className="text-[11px] text-slate-500">{i + 1}</span>
                                <span>{formato(puntos)}</span>
                            </li>
                        );
                    })}
                </ol>

                <div className="border-t border-slate-800 p-5">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Premio del nivel</p>
                    <Recompensas xp={nivel.recompensa_xp} oro={nivel.recompensa_oro} diamantes={nivel.recompensa_diamantes} />
                </div>
            </aside>

            {/* AVISO CORRECTO / INCORRECTO */}
            <AnimatePresence>
                {acerto !== null && (
                    <motion.div
                        role="status"
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-6 py-3 text-sm font-black shadow-2xl ${acerto ? "border-emerald-400/40 bg-emerald-950/90 text-emerald-300" : "border-red-400/40 bg-red-950/90 text-red-300"}`}
                    >
                        {acerto ? "✓ ¡RESPUESTA CORRECTA!" : seleccion === -1 ? "⏰ SE ACABÓ EL TIEMPO" : "✕ RESPUESTA INCORRECTA"}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* =========================================================
   PANTALLA FINAL: puntos, porcentaje y premio
========================================================= */

const TITULOS = {
    completada: "¡Nivel completado!",
    retirada: "Te retiraste",
    sin_vidas: "Te quedaste sin vidas",
};

function PantallaFinal({ final, nivel, onOtraVez, navigate }) {
    const { recompensa } = final;
    const gano = recompensa.xp + recompensa.oro + recompensa.diamantes > 0;

    let mensaje = "";
    if (final.limite_diario_alcanzado) {
        mensaje = "Ya ganaste premios en este nivel varias veces hoy. ¡Prueba otro nivel o vuelve mañana!";
    } else if (!final.alcanzo_minimo) {
        mensaje = `Necesitabas al menos ${final.porcentaje_minimo}% de aciertos para ganar el premio. ¡Tú puedes!`;
    } else if (!gano && nivel.tipo_recompensa === "completar") {
        mensaje = "En este nivel el premio es solo para quien responde todas las preguntas.";
    }

    return (
        <div className={`lg flex items-center justify-center px-4 py-3 ${FONDO}`}>
            <motion.section
                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="lb-card lg-tarjeta-centrada final-tarjeta relative w-full max-w-xl text-center"
                style={{ padding: "clamp(22px, 4vw, 40px)" }}
                aria-labelledby="final-titulo"
            >
                <div
                    className={`mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full text-5xl ${gano ? "bg-yellow-400/10" : "bg-red-400/10"}`}
                    aria-hidden="true"
                >
                    {gano ? "🏆" : final.resultado === "sin_vidas" ? "💔" : "📚"}
                </div>

                <p className="lb-eyebrow" style={{ justifyContent: "center" }}>{nivel.nombre}</p>
                <h1 id="final-titulo" className="lg-h1" style={{ marginTop: 4 }}>
                    {TITULOS[final.resultado] || "Partida terminada"}
                </h1>

                <dl className="lg-stats" style={{ margin: "22px 0", gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                    <div className="lg-stat">
                        <dt>Aciertos</dt>
                        <dd>{`${final.aciertos}/${final.total_preguntas}`}</dd>
                    </div>
                    <div className="lg-stat">
                        <dt>Porcentaje</dt>
                        <dd>{`${final.porcentaje}%`}</dd>
                    </div>
                    <div className="lg-stat">
                        <dt>Puntos</dt>
                        <dd>{formato(final.puntos)}</dd>
                    </div>
                </dl>

                <p className="lb-muted" style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {gano ? "Ganaste" : "Premio"}
                </p>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                    {gano ? (
                        <Recompensas xp={recompensa.xp} oro={recompensa.oro} diamantes={recompensa.diamantes} grande />
                    ) : (
                        <span className="lg-tag" style={{ fontSize: "1rem", padding: "8px 16px" }}>Sin premio esta vez</span>
                    )}
                </div>

                {recompensa.subio_nivel && (
                    <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="lg-ok"
                        style={{ marginTop: 18 }}
                        role="status"
                    >
                        {`🎉 ¡Subiste al nivel ${recompensa.nivel_nuevo}! Bono: `}
                        <Recompensas
                            oro={recompensa.bono_subir_nivel.oro}
                            diamantes={recompensa.bono_subir_nivel.diamantes}
                        />
                    </motion.div>
                )}

                {mensaje && (
                    <p className="lb-muted" style={{ marginTop: 16 }}>{mensaje}</p>
                )}

                <div className="lg-row" style={{ justifyContent: "center", marginTop: 26 }}>
                    <button type="button" className="lb-btn lb-btn-primary" onClick={onOtraVez}>
                        Jugar de nuevo
                    </button>
                    <button type="button" className="lb-btn lb-btn-secondary" onClick={() => navigate("/games/preguntas")}>
                        Otro nivel
                    </button>
                    <button type="button" className="lb-btn lb-btn-ghost" onClick={() => navigate("/lobby")}>
                        Inicio
                    </button>
                </div>
            </motion.section>
        </div>
    );
}
