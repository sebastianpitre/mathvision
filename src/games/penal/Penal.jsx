import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LuArrowLeft, LuClock, LuPlay, LuVolume2, LuVolumeX } from "react-icons/lu";

import { useAuth } from "../../context/AuthContext";
import { socket } from "../../services/socket";
import Recompensas from "../../components/common/Recompensas";
import AssetImage from "../../components/common/AssetImage";
import { BurbujaEmoji, SelectorEmojis } from "../../components/common/Emojis";
import { useEmojisSala } from "../../components/common/useEmojisSala";
import { sonar } from "../../services/sonidos";
import { useSonido } from "../../hooks/useSonido";
import BotonHablar from "../../components/juego/BotonHablar";
import { useVoz } from "../../hooks/useVoz";
import Profesor from "../invasion/Profesor";
import { Balon, BrazosPateador, DibujoArquero, DibujoPateador, FondoArquero, FondoPateador, GuantesArquero } from "./Escena";

import "./penal.css";

/* =========================================================
   PENALGAMIF ⚽ · PANTALLA DEL JUEGO
   Si patea: elige a dónde (izquierda, centro, derecha),
   responde la pregunta y patea. Si ataja: sabe que el otro
   ya eligió y elige hacia dónde tirarse.
   El tiro tiene 3 momentos: silbato → el balón vuela → letrero.
========================================================= */

const OPCION = ["A", "B", "C", "D", "E", "F"];
const MS_SILBATO = 900;
const MS_VUELO = 700;

// Dónde termina el balón (en % del escenario) según la vista.
const DESTINO_PATEADOR = {
    gol: { izquierda: [40.5, 34], centro: [50, 31], derecha: [59.5, 34] },
    afuera: { izquierda: [27, 18], centro: [50, 10], derecha: [73, 18] },
};
const DESTINO_ARQUERO = {
    gol: { izquierda: [76, 40], centro: [50, 30], derecha: [24, 40] },
    afuera: { izquierda: [96, 2], centro: [50, -12], derecha: [4, 2] },
};

const TEXTO_LADO = { izquierda: "Izquierda", centro: "Centro", derecha: "Derecha" };
// Para el arquero los lados se ven al revés (está de frente al que patea).
const ESPEJO = { izquierda: "derecha", centro: "centro", derecha: "izquierda" };

const COLORES = ["#ef4444", "#3b82f6"];
const EQUIPOS = ["rojo", "azul"]; // el primero de la tanda es rojo y el segundo azul

function Marcador({ partida, miId, emojis }) {
    return (
        <div className="pn-marcador" aria-label="Marcador">
            {partida.jugadores.map((j, n) => {
                const total = Math.max(partida.penales, ...partida.jugadores.map((x) => x.tiros.length));
                return (
                    <div key={j.userId} className={`pn-equipo pn-equipo-${n} ${j.userId === partida.pateador ? "pn-equipo-patea" : ""}`} style={{ "--c": COLORES[n] }}>
                        <BurbujaEmoji dato={emojis[j.userId]} className="pn-emoji" />
                        <span className="pn-foto"><AssetImage src={j.avatar} type="player" alt="" /></span>
                        <span className="pn-equipo-texto">
                            <strong>{j.nombre}{j.userId === miId && " (tú)"}</strong>
                            <span className="pn-tiros" aria-label={`Penales: ${j.tiros.join(", ") || "ninguno"}`}>
                                {Array.from({ length: total }, (_, k) => (
                                    <i key={k} className={`pn-tiro pn-tiro-${j.tiros[k] || "nada"}`} />
                                ))}
                            </span>
                        </span>
                        <b className="pn-goles">{j.goles}</b>
                    </div>
                );
            })}
        </div>
    );
}

export default function Penal() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const miId = String(user?.id ?? "");
    useVoz();
    const emojis = useEmojisSala();
    const [sonido, alternarSonido] = useSonido();

    const [partida, setPartida] = useState(undefined);
    const [sala, setSala] = useState(null);
    const [pregunta, setPregunta] = useState(null);
    const [elegida, setElegida] = useState(null);
    const [resultado, setResultado] = useState(null); // al fallar: el profesor
    const [premio, setPremio] = useState(null);
    const [error, setError] = useState("");
    const [miEleccion, setMiEleccion] = useState({ numero: -1, lado: null });
    const [momento, setMomento] = useState(null); // null | silbato | vuela | final
    const [ahora, setAhora] = useState(() => Date.now());

    const desfase = useRef(0);
    const errorTimer = useRef(null);
    const faseRef = useRef(null);

    const mostrarError = useCallback((message) => {
        clearTimeout(errorTimer.current);
        setError(message);
        errorTimer.current = setTimeout(() => setError(""), 2500);
    }, []);

    /* ---------------- Conexión ---------------- */

    useEffect(() => {
        const pedir = () => {
            socket.emit("sala:estado");
            socket.emit("penal:estado");
        };
        const alEstado = (estado) => {
            if (!estado) return setPartida(null);
            desfase.current = estado.ahora - Date.now();
            if (faseRef.current === "terminada" && estado.fase !== "terminada") {
                setPremio(null);
                setResultado(null);
            }
            if (estado.fase !== "pregunta") setPregunta(null);
            faseRef.current = estado.fase;
            setPartida(estado);
        };
        const alPregunta = (p) => {
            setElegida(null);
            setResultado(null);
            setPregunta(p);
        };
        const alResultado = (r) => {
            setPregunta(null);
            setElegida(null);
            // El profesor sale cuando ya se vio el balón irse afuera.
            if (!r.acerto) setTimeout(() => setResultado(r), MS_SILBATO + MS_VUELO + 600);
        };
        const alPremio = (p) => {
            setPremio(p.recompensa);
            refreshUser();
        };
        const alSala = ({ sala: nueva }) => setSala(nueva);
        const alError = ({ message }) => mostrarError(message);

        socket.on("connect", pedir);
        socket.on("penal:estado", alEstado);
        socket.on("penal:pregunta", alPregunta);
        socket.on("penal:resultado", alResultado);
        socket.on("penal:error", alError);
        socket.on("game:reward", alPremio);
        socket.on("sala:estado", alSala);
        if (socket.connected) pedir();
        else socket.connect();
        return () => {
            socket.off("connect", pedir);
            socket.off("penal:estado", alEstado);
            socket.off("penal:pregunta", alPregunta);
            socket.off("penal:resultado", alResultado);
            socket.off("penal:error", alError);
            socket.off("game:reward", alPremio);
            socket.off("sala:estado", alSala);
            clearTimeout(errorTimer.current);
        };
    }, [refreshUser, mostrarError]);

    useEffect(() => {
        const t = setInterval(() => setAhora(Date.now()), 250);
        return () => clearInterval(t);
    }, []);

    /* ---------------- El tiro: silbato → vuela → letrero ---------------- */

    const tiroEn = partida?.fase === "tiro" ? partida.tiro?.en : null;
    const tiroResultado = partida?.tiro?.resultado;
    const tiroPateador = partida?.tiro?.pateador;
    useEffect(() => {
        if (!tiroEn) return setMomento(null);
        setMomento("silbato");
        if (tiroPateador === miId) sonar("preparar_tiro");
        const t1 = setTimeout(() => setMomento("vuela"), MS_SILBATO);
        const t2 = setTimeout(() => {
            setMomento("final");
            sonar(tiroResultado === "gol" ? "gol" : tiroResultado === "atajada" ? "atajada" : "abucheo");
        }, MS_SILBATO + MS_VUELO);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [tiroEn, tiroResultado, tiroPateador, miId]);

    const finFase = partida?.fase;
    useEffect(() => {
        if (finFase === "celebrando") sonar(partida?.celebracion?.ganadores.includes(miId) ? "ganar" : "perder");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finFase]);

    /* ---------------- Datos ---------------- */

    const porId = useMemo(() => new Map((partida?.jugadores || []).map((j, n) => [j.userId, { ...j, color: COLORES[n], equipo: EQUIPOS[n] }])), [partida]);
    const servidorAhora = ahora + desfase.current;
    const restante = partida?.finEn ? Math.max(0, Math.ceil((partida.finEn - servidorAhora) / 1000)) : null;
    const restaPregunta = pregunta ? Math.max(0, (pregunta.hasta - servidorAhora) / 1000) : 0;
    const soyPateador = partida?.pateador === miId;
    const soyArquero = partida?.arquero === miId;
    const yo = porId.get(miId);
    const nombre = (id) => porId.get(id)?.nombre || "";
    const soyCreador = sala?.hostUserId === miId;
    const motivoOtra = sala?.motivoNoIniciar || (sala?.miembros.some((m) => !m.conectado) ? "Esperando a que todos se conecten." : null);
    const elegidoAhora = miEleccion.numero === partida?.numero ? miEleccion.lado : null;

    const elegir = (lado) => {
        if (!partida) return;
        if (soyPateador && partida.fase === "apuntar") socket.emit("penal:apuntar", { lado });
        else if (soyArquero && partida.fase === "atajar") socket.emit("penal:atajar", { lado });
        else return;
        setMiEleccion({ numero: partida.numero, lado });
    };
    const responder = (k) => {
        if (elegida !== null) return;
        setElegida(k);
        socket.emit("penal:responder", { opcion: k });
    };
    const salir = () => {
        if (partida && !["terminada", "celebrando"].includes(partida.fase) && yo && !yo.salio) {
            if (!window.confirm("Si sales ahora pierdes la tanda. ¿Salir?")) return;
            socket.emit("penal:salir");
        }
        navigate("/sala");
    };

    /* =====================================================
       PANTALLAS
    ===================================================== */

    if (partida === undefined) return <div className="ffp pn"><p className="pn-centrado" role="status">Cargando…</p></div>;
    if (partida === null) {
        return (
            <div className="ffp pn">
                <div className="pn-centrado ffp-panel">
                    <h1>No hay tanda de penales</h1>
                    <button type="button" className="ffp-btn" onClick={() => navigate("/sala")}>Ir a la sala</button>
                </div>
            </div>
        );
    }

    const pateador = porId.get(partida.pateador);
    const arquero = porId.get(partida.arquero);
    const tiro = partida.fase === "tiro" ? partida.tiro : null;
    // Vista: el que patea ve el arco; el arquero ve al que patea. (Si nadie, vista del arco.)
    const vistaArquero = soyArquero;
    const tablaDestino = vistaArquero ? DESTINO_ARQUERO : DESTINO_PATEADOR;

    // Balón
    let balon = vistaArquero ? { x: 50, y: 63.5, w: 2.2 } : { x: 50, y: 86, w: 5.5 };
    if (tiro && momento !== "silbato") {
        const [x, y] = (tiro.resultado === "afuera" ? tablaDestino.afuera : tablaDestino.gol)[tiro.lado];
        balon = { x, y, w: vistaArquero ? 11 : 2.2 };
    }
    // El arquero (o los guantes) se tira cuando sale el balón.
    const salto = tiro && momento !== "silbato" ? tiro.salto : null;

    const puedoElegir = (soyPateador && partida.fase === "apuntar" && !elegidoAhora) || (soyArquero && partida.fase === "atajar" && !elegidoAhora);

    // Texto de lo que pasa ahora
    let aviso;
    if (partida.fase === "apuntar") aviso = soyPateador ? (elegidoAhora ? "¡Listo!" : "⚽ ¡Elige a dónde patear!") : `${nombre(partida.pateador)} está eligiendo a dónde patear…`;
    else if (partida.fase === "atajar") aviso = soyArquero ? (elegidoAhora ? "¡Listo!" : "🧤 ¡Ya eligió! ¿Hacia dónde te tiras?") : `Esperando a que ${nombre(partida.arquero)} elija hacia dónde tirarse…`;
    else if (partida.fase === "pregunta") aviso = soyPateador ? "Responde para patear" : `${nombre(partida.pateador)} responde para patear…`;
    else if (partida.fase === "tiro") aviso = momento === "silbato" ? "🎵 ¡Se prepara para patear!" : null;

    const letrero = tiro && momento === "final" ? { gol: "¡GOOOL!", atajada: "¡ATAJADA!", afuera: "¡AFUERA!" }[tiro.resultado] : null;

    return (
        <div className={`ffp pn ${vistaArquero ? "pn-vista-arquero" : "pn-vista-pateador"}`}>
            <div className="pn-escenario-caja">
                <div className={`pn-escenario ${momento === "final" && tiro?.resultado === "gol" ? "pn-temblor" : ""}`}>
                    {vistaArquero ? <FondoArquero /> : <FondoPateador />}

                    {/* Rival: el arquero en el arco, o el que patea frente a ti */}
                    {vistaArquero ? (
                        <div className={`pn-figura pn-pateador ${momento === "silbato" ? "pn-pateador-corre" : ""} ${momento && momento !== "silbato" ? "pn-pateador-patea" : ""}`}>
                            <DibujoPateador equipo={pateador?.equipo} />
                        </div>
                    ) : (
                        <div className={`pn-figura pn-arquero ${salto ? `pn-salto-${salto}` : ""}`}>
                            <DibujoArquero equipo={arquero?.equipo} />
                        </div>
                    )}

                    {/* Balón */}
                    <div
                        className={`pn-balon ${tiro && momento !== "silbato" ? "pn-balon-vuela" : ""} ${tiro?.resultado === "atajada" && momento === "final" ? "pn-balon-atajado" : ""}`}
                        style={{ left: `${balon.x}%`, top: `${balon.y}%`, width: `${balon.w}%` }}
                    >
                        <Balon />
                    </div>

                    {/* Zonas para elegir */}
                    {puedoElegir && (
                        <div className={`pn-zonas ${vistaArquero ? "pn-zonas-arquero" : ""}`} role="group" aria-label={soyPateador ? "¿A dónde pateas?" : "¿Hacia dónde te tiras?"}>
                            {(vistaArquero ? ["derecha", "centro", "izquierda"] : ["izquierda", "centro", "derecha"]).map((lado) => (
                                <button key={lado} type="button" className="pn-zona" onClick={() => elegir(lado)}>
                                    <span>{TEXTO_LADO[vistaArquero ? ESPEJO[lado] : lado]}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {elegidoAhora && ["apuntar", "atajar"].includes(partida.fase) && (
                        <span className="pn-mi-eleccion">{`Elegiste: ${TEXTO_LADO[vistaArquero ? ESPEJO[elegidoAhora] : elegidoAhora]}`}</span>
                    )}

                    {/* Primera persona */}
                    {vistaArquero ? (
                        <div className={`pn-primera ${salto ? `pn-guantes-${ESPEJO[salto]}` : ""}`}>
                            <GuantesArquero equipo={arquero?.equipo} />
                        </div>
                    ) : (
                        <div className={`pn-primera ${tiro && soyPateador ? "pn-brazos-patea" : ""}`}>
                            <BrazosPateador color={(soyPateador ? pateador : porId.get(miId) || pateador)?.color} />
                        </div>
                    )}

                    <AnimatePresence>
                        {letrero && (
                            <motion.p
                                key={tiro.en}
                                className={`pn-letrero pn-letrero-${tiro.resultado}`}
                                initial={{ scale: 0.3, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ type: "spring", stiffness: 260, damping: 14 }}
                                role="status"
                            >
                                {letrero}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ================= ARRIBA ================= */}
            <header className="pn-arriba">
                <button type="button" className="ffl-icono" onClick={salir} aria-label="Salir" title="Salir">
                    <LuArrowLeft aria-hidden="true" />
                </button>
                <Marcador partida={partida} miId={miId} emojis={emojis} />
                <div className="pn-controles">
                    <span className={`pn-reloj ${restante !== null && restante <= 5 ? "pn-reloj-urgente" : ""}`}>
                        <LuClock aria-hidden="true" />
                        {restante !== null ? `${restante} s` : "--"}
                    </span>
                    <SelectorEmojis />
                    <BotonHablar className="pn-hablar" />
                    <button type="button" className="ffl-icono" onClick={alternarSonido} aria-label={sonido ? "Silenciar" : "Activar sonido"}>
                        {sonido ? <LuVolume2 aria-hidden="true" /> : <LuVolumeX aria-hidden="true" />}
                    </button>
                </div>
            </header>

            {/* Qué pasa ahora */}
            {aviso && partida.fase !== "celebrando" && partida.fase !== "terminada" && (
                <p className={`pn-aviso ${puedoElegir ? "pn-aviso-tuyo" : ""}`} role="status">
                    {partida.subita && <b>MUERTE SÚBITA · </b>}
                    {aviso}
                </p>
            )}
            <p className="pn-rol">{soyPateador ? "⚽ Pateas tú" : soyArquero ? "🧤 Atajas tú" : ""}</p>

            {/* ================= PREGUNTA ================= */}
            <AnimatePresence>
                {pregunta && (
                    <motion.div className="pn-capa" key={pregunta.hasta} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.section className="pn-pregunta" role="dialog" aria-modal="true" aria-labelledby="pn-pregunta-texto" initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }}>
                            <header className="pn-pregunta-cabeza">
                                <span className="pn-pregunta-chip">⚽ Acierta y patea</span>
                                <span className={`pn-pregunta-reloj ${restaPregunta <= 5 ? "pn-urgente" : ""}`}>
                                    <LuClock aria-hidden="true" />
                                    {Math.ceil(restaPregunta)}
                                </span>
                            </header>
                            <div className="pn-pregunta-barra" aria-hidden="true">
                                <span style={{ width: `${Math.min(100, (100 * restaPregunta) / pregunta.segundos)}%` }} />
                            </div>
                            <h2 id="pn-pregunta-texto">{pregunta.texto}</h2>
                            <div className={`pn-opciones ${pregunta.opciones.length > 2 ? "pn-opciones-4" : ""}`}>
                                {pregunta.opciones.map((o, k) => (
                                    <button key={k} type="button" className={`pn-opcion ${elegida === k ? "pn-opcion-elegida" : ""}`} onClick={() => responder(k)} disabled={elegida !== null}>
                                        <b>{OPCION[k]}</b>
                                        <span>{o}</span>
                                    </button>
                                ))}
                            </div>
                            <small className="pn-suave">Si fallas, el balón se va afuera.</small>
                        </motion.section>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {resultado && partida.fase !== "terminada" && (
                    <motion.div className="pn-profesor-capa" initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}>
                        <Profesor resultado={resultado} pie="El balón se fue afuera. ¡En el próximo lo metes!" alCerrar={() => setResultado(null)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ================= GANÓ / FINAL ================= */}
            {partida.fase === "celebrando" && partida.celebracion?.ganadores[0] && (
                <motion.p className="pn-celebra" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} role="status">
                    {`🏆 ¡${nombre(partida.celebracion.ganadores[0])} gana la tanda!`}
                </motion.p>
            )}

            {partida.fase === "terminada" && (
                <div className="pn-capa">
                    <section className="pn-final ffp-panel" aria-label="Resultado">
                        <h1>{partida.resultado?.ganadores.includes(miId) ? "¡Ganaste la tanda! 🏆" : partida.resultado?.ganadores.length ? `Ganó ${nombre(partida.resultado.ganadores[0])}` : "Tanda terminada"}</h1>
                        <Marcador partida={partida} miId={miId} emojis={{}} />
                        <div className="pn-final-premio">
                            {premio ? (
                                premio.limite_diario_alcanzado ? (
                                    <span className="pn-suave">Límite de premios de hoy.</span>
                                ) : (
                                    <Recompensas xp={premio.xp} oro={premio.oro} diamantes={premio.diamantes} grande />
                                )
                            ) : (
                                yo && !yo.salio && <span className="pn-suave">Guardando premio…</span>
                            )}
                        </div>
                        <div className="pn-final-botones">
                            {soyCreador ? (
                                <button type="button" className="ffp-btn" onClick={() => socket.emit("sala:iniciar")} disabled={Boolean(motivoOtra) || sala?.estado !== "sala"} title={motivoOtra || "Otra tanda"}>
                                    <LuPlay aria-hidden="true" />
                                    Otra tanda
                                </button>
                            ) : (
                                <span className="pn-suave">El creador puede iniciar otra.</span>
                            )}
                            <button type="button" className="ffp-btn ffp-btn-2" onClick={() => navigate("/sala")}>
                                Volver a la sala
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {error && <p className="pn-error" role="alert">{error}</p>}
        </div>
    );
}
