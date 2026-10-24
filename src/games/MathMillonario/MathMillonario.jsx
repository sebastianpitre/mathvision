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
import { sonar as sonarMomento } from "../../services/sonidos";
import { useSonido } from "../../hooks/useSonido";

// Evento → momento del panel (Panel → Sonidos).
const SONIDOS = {
    correct: "correcto",
    incorrect: "incorrecto",
    victory: "ganar",
    gameOver: "perder",
    lifeline: "comodin",
    retire: "retirarse",
};

import "./juegoPreguntas.css";

/* =========================================================
   LUDO MILLONARIO · JUEGO DE PREGUNTAS
   ---------------------------------------------------------
   Todo lo importante pasa en el servidor: elige las
   preguntas, revisa cada respuesta y calcula el premio.
   Aquí solo se muestra y se envía lo que elige el jugador.
========================================================= */

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

    const [sonido, alternarSonido] = useSonido();
    const iniciadaRef = useRef(false);
    const siguienteRef = useRef(null);

    // La música la pone MusicaGlobal según la pantalla.
    const sonar = useCallback((nombre, volumen = 0.7) => sonarMomento(SONIDOS[nombre], Math.min(1, volumen / 0.7)), []);

    useEffect(() => () => clearTimeout(siguienteRef.current), []);

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

            sonarMomento("iniciar");
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
            <div className="ffp jp" role="status">
                <p className="jp-centro">Preparando las preguntas…</p>
            </div>
        );
    }

    if (estado === "error") {
        return (
            <div className="ffp jp">
                <div className="jp-centro ffp-panel jp-tarjeta">
                    <h1>No se pudo jugar este nivel</h1>
                    <p>{error}</p>
                    <div className="jp-botones">
                        <button type="button" className="ffp-btn" onClick={empezar}>Intentar de nuevo</button>
                        <button type="button" className="ffp-btn ffp-btn-2" onClick={() => navigate("/games/preguntas")}>Otro nivel</button>
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
        <div className="ffp jp">
            {/* Sin encabezado: solo las partes del juego. */}
            <div className="jp-main">
                {/* ================= PREGUNTA ================= */}
                <section className="jp-zona">
                    <div className="jp-indicadores">
                        <span>{`Pregunta ${numero}/${total}`}</span>
                        <span className="jp-puntos">{`${formato(partida.puntos)} pts`}</span>
                    </div>

                    <motion.div key={pregunta?.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="jp-pregunta-zona">
                        <div className="jp-caja-pregunta">
                            <h2 className="jp-pregunta">{pregunta?.texto}</h2>
                        </div>

                        <div className="jp-opciones">
                            {pregunta?.opciones.map((opcion, i) => {
                                const oculta = ocultas.includes(i);
                                let tono = "";
                                if (oculta) tono = "jp-oculta";
                                else if (correcta === i) tono = "jp-bien";
                                else if (seleccion === i && acerto === false) tono = "jp-mal";
                                else if (seleccion === i) tono = "jp-elegida";

                                return (
                                    <motion.button
                                        key={i}
                                        type="button"
                                        whileTap={seleccion === null && !oculta ? { scale: 0.98 } : {}}
                                        disabled={seleccion !== null || oculta || enviando}
                                        onClick={() => responder(i)}
                                        className={`jp-opcion ${tono}`}
                                    >
                                        <span className="jp-letra">{String.fromCharCode(65 + i)}</span>
                                        <span className="jp-opcion-texto">{oculta ? "Eliminada" : opcion}</span>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {explicacion && <p className="jp-explicacion">{explicacion}</p>}
                    </motion.div>
                </section>

                {/* ================= LADO ================= */}
                <aside className="jp-lado">
                    <div className="jp-controles">
                        <button type="button" className="ffl-icono" onClick={() => navigate("/games/preguntas")} aria-label="Salir" title="Salir">
                            <FaArrowLeft aria-hidden="true" />
                        </button>
                        <span className="jp-vidas" aria-label={`${partida.vidas} vidas`}>
                            {Array.from({ length: nivel.vidas }, (_, i) =>
                                i < partida.vidas ? <FaHeart key={i} aria-hidden="true" /> : <FaRegHeart key={i} aria-hidden="true" className="jp-vida-perdida" />
                            )}
                        </span>
                        <button type="button" className="ffl-icono" onClick={alternarSonido} aria-label={sonido ? "Silenciar" : "Activar sonido"}>
                            {sonido ? <FaVolumeUp aria-hidden="true" /> : <FaVolumeMute aria-hidden="true" />}
                        </button>
                    </div>

                    <p className="jp-nivel">
                        <small>{`${nivel.grado} · ${nivel.asignatura}`}</small>
                        <strong>{nivel.nombre}</strong>
                    </p>

                    {nivel.segundos_por_pregunta > 0 && (
                        <span className={`jp-reloj ${urgente ? "jp-reloj-urgente" : ""}`} aria-live={urgente ? "assertive" : "off"}>
                            <FaClock aria-hidden="true" />
                            {`${Math.max(0, segundos)} s`}
                        </span>
                    )}

                    <ol className="jp-escalera ffp-panel" aria-label="Escalera de puntos">
                        {escalera.map((puntos, i) => (
                            <li key={i} className={i === partida.aciertos ? "jp-actual" : i < partida.aciertos ? "jp-logrado" : ""}>
                                <span>{i + 1}</span>
                                <strong>{formato(puntos)}</strong>
                            </li>
                        ))}
                    </ol>

                    <div className="jp-ayudas">
                        <button type="button" className="jp-ayuda jp-ayuda-50" disabled={partida.comodin_usado || seleccion !== null} onClick={usarComodin} title="Quita dos respuestas incorrectas">
                            50/50
                        </button>
                        <button
                            type="button"
                            className="jp-ayuda jp-ayuda-retiro"
                            disabled={partida.aciertos === 0 || seleccion !== null}
                            onClick={retirarse}
                            title={partida.aciertos === 0 ? "Acierta al menos una para poder retirarte" : "Terminar y cobrar lo ganado"}
                        >
                            <FaFlagCheckered aria-hidden="true" />
                            Retirarse
                        </button>
                    </div>
                </aside>
            </div>

            {/* AVISO CORRECTO / INCORRECTO */}
            <AnimatePresence>
                {acerto !== null && (
                    <motion.div
                        role="status"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`jp-resultado ${acerto ? "jp-resultado-bien" : "jp-resultado-mal"}`}
                    >
                        {acerto ? "✓ ¡CORRECTA!" : seleccion === -1 ? "⏰ SE ACABÓ EL TIEMPO" : "✕ INCORRECTA"}
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
    sin_vidas: "Sin vidas",
};

function PantallaFinal({ final, nivel, onOtraVez, navigate }) {
    const { recompensa } = final;
    const gano = recompensa.xp + recompensa.oro + recompensa.diamantes > 0;

    let mensaje = "";
    if (final.limite_diario_alcanzado) mensaje = "Ya ganaste premios en este nivel varias veces hoy.";
    else if (!final.alcanzo_minimo) mensaje = `Necesitabas ${final.porcentaje_minimo}% de aciertos para ganar.`;
    else if (!gano && nivel.tipo_recompensa === "completar") mensaje = "El premio es solo para quien responde todas.";

    return (
        <div className="ffp jp">
            <motion.section
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="jp-centro ffp-panel jp-final"
                aria-labelledby="final-titulo"
            >
                <div className="jp-final-icono" aria-hidden="true">{gano ? "🏆" : final.resultado === "sin_vidas" ? "💔" : "📚"}</div>
                <div className="jp-final-texto">
                    <small>{nivel.nombre}</small>
                    <h1 id="final-titulo">{TITULOS[final.resultado] || "Partida terminada"}</h1>
                    <dl className="jp-final-datos">
                        <div><dt>Aciertos</dt><dd>{`${final.aciertos}/${final.total_preguntas}`}</dd></div>
                        <div><dt>Porcentaje</dt><dd>{`${final.porcentaje}%`}</dd></div>
                        <div><dt>Puntos</dt><dd>{formato(final.puntos)}</dd></div>
                    </dl>
                    <div className="jp-final-premio">
                        {gano ? (
                            <Recompensas xp={recompensa.xp} oro={recompensa.oro} diamantes={recompensa.diamantes} grande />
                        ) : (
                            <span className="jp-sin-premio">Sin premio esta vez</span>
                        )}
                        {recompensa.subio_nivel && <strong className="jp-subio">{`🎉 ¡Nivel ${recompensa.nivel_nuevo}!`}</strong>}
                    </div>
                    {mensaje && <p className="jp-mensaje">{mensaje}</p>}
                    <div className="jp-botones">
                        <button type="button" className="ffp-btn" onClick={onOtraVez}>Jugar de nuevo</button>
                        <button type="button" className="ffp-btn ffp-btn-2" onClick={() => navigate("/games/preguntas")}>Otro nivel</button>
                        <button type="button" className="ffp-btn ffp-btn-2" onClick={() => navigate("/lobby")}>Inicio</button>
                    </div>
                </div>
            </motion.section>
        </div>
    );
}
