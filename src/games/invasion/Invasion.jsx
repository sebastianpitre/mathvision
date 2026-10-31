import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LuArrowLeft, LuCheck, LuClock, LuCrown, LuLock, LuPlay, LuTrophy, LuVolume2, LuVolumeX, LuX } from "react-icons/lu";

import { useAuth } from "../../context/AuthContext";
import { socket } from "../../services/socket";
import Recompensas from "../../components/common/Recompensas";
import AssetImage from "../../components/common/AssetImage";
import { BurbujaEmoji, SelectorEmojis } from "../../components/common/Emojis";
import { useEmojisSala } from "../../components/common/useEmojisSala";
import { sonar } from "../../services/sonidos";
import { useSonido } from "../../hooks/useSonido";
import BotonHablar, { HablandoMarca } from "../../components/juego/BotonHablar";
import { AccionesJugador } from "../../components/juego/Reportar";
import Verificado from "../../components/juego/Verificado";
import { useVoz } from "../../hooks/useVoz";
import Profesor from "./Profesor";

import "./invasion.css";

/* =========================================================
   INVASIÓNGAMIF · PANTALLA DEL JUEGO
   Sin turnos: toca una casilla vacía o de otro color, responde
   rápido y, si aciertas, queda de tu color. Si fallas, el
   profesor te explica y esperas 3 s para tocar otra.
   El servidor decide todo; aquí solo se muestra y se envía
   "tocar" y "responder".
========================================================= */

const LETRAS = "ABCDEFGHIJ";
const OPCION = ["A", "B", "C", "D", "E", "F"];

const TITULO_RESULTADO = {
    tiempo: "¡Se acabó el tiempo!",
    empate: "¡Empate!",
    ultimo: "¡Último en pie!",
    nadie: "Nadie conquistó",
};

const reloj = (s) => (s === null ? "--" : s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s} s`);

export default function Invasion() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const miId = String(user?.id ?? "");
    const { hablando } = useVoz();
    const emojis = useEmojisSala();
    const [sonido, alternarSonido] = useSonido();

    const [partida, setPartida] = useState(undefined);
    const [sala, setSala] = useState(null);
    const [pregunta, setPregunta] = useState(null);
    const [elegida, setElegida] = useState(null);
    const [resultado, setResultado] = useState(null); // al fallar: lo que dice el profesor
    const [conquista, setConquista] = useState(null); // al acertar: aviso corto
    const [premio, setPremio] = useState(null);
    const [error, setError] = useState("");
    const [pidiendo, setPidiendo] = useState(false);
    const [ahora, setAhora] = useState(() => Date.now());

    const desfase = useRef(0);
    const errorTimer = useRef(null);
    const conquistaTimer = useRef(null);
    const anterior = useRef(null);

    const mostrarError = useCallback((message) => {
        clearTimeout(errorTimer.current);
        setError(message);
        errorTimer.current = setTimeout(() => setError(""), 2500);
    }, []);

    /* ---------------- Conexión ---------------- */

    useEffect(() => {
        const pedir = () => {
            socket.emit("sala:estado");
            socket.emit("invasion:estado");
        };
        const alEstado = (estado) => {
            if (!estado) return setPartida(null);
            desfase.current = estado.ahora - Date.now();
            if (estado.fase === "votacion") {
                setPremio(null);
                setPregunta(null);
                setResultado(null);
            }
            if (estado.fase === "terminada") setPregunta(null);
            setPartida(estado);
        };
        const alPregunta = (p) => {
            setPidiendo(false);
            setElegida(null);
            setResultado(null);
            setPregunta(p);
        };
        const alResultado = (r) => {
            setPregunta(null);
            setElegida(null);
            if (r.acerto) {
                sonar("correcto");
                setConquista(r.celda);
                clearTimeout(conquistaTimer.current);
                conquistaTimer.current = setTimeout(() => setConquista(null), 1300);
            } else {
                sonar("incorrecto");
                setResultado(r);
            }
        };
        const alError = ({ message }) => {
            setPidiendo(false);
            mostrarError(message);
        };
        const alPremio = (p) => {
            setPremio(p.recompensa);
            refreshUser();
        };
        const alSala = ({ sala: nueva }) => setSala(nueva);

        socket.on("connect", pedir);
        socket.on("invasion:estado", alEstado);
        socket.on("invasion:pregunta", alPregunta);
        socket.on("invasion:resultado", alResultado);
        socket.on("invasion:error", alError);
        socket.on("game:reward", alPremio);
        socket.on("sala:estado", alSala);

        if (socket.connected) pedir();
        else socket.connect();

        return () => {
            socket.off("connect", pedir);
            socket.off("invasion:estado", alEstado);
            socket.off("invasion:pregunta", alPregunta);
            socket.off("invasion:resultado", alResultado);
            socket.off("invasion:error", alError);
            socket.off("game:reward", alPremio);
            socket.off("sala:estado", alSala);
            clearTimeout(errorTimer.current);
            clearTimeout(conquistaTimer.current);
        };
    }, [refreshUser, mostrarError]);

    // Reloj de la pantalla (4 veces por segundo).
    useEffect(() => {
        const t = setInterval(() => setAhora(Date.now()), 250);
        return () => clearInterval(t);
    }, []);

    /* ---------------- Datos ---------------- */

    const porId = useMemo(() => new Map((partida?.jugadores || []).map((j) => [j.userId, j])), [partida]);
    const yo = porId.get(miId) || null;
    const servidorAhora = ahora + desfase.current;
    const restante = partida?.finEn ? Math.max(0, Math.ceil((partida.finEn - servidorAhora) / 1000)) : null;
    const espera = yo ? Math.max(0, Math.ceil((yo.esperaHasta - servidorAhora) / 1000)) : 0;
    const restaPregunta = pregunta ? Math.max(0, (pregunta.hasta - servidorAhora) / 1000) : 0;
    const totalCeldas = partida ? partida.tamano * partida.tamano : 1;
    const soyCreador = sala?.hostUserId === miId;
    const motivoOtra =
        sala?.motivoNoIniciar || (sala?.miembros.some((m) => !m.conectado) ? "Esperando a que todos se conecten." : null);
    const victoriasDe = (id) =>
        sala?.juego === "invasion" ? sala.miembros.find((m) => String(m.userId) === id)?.victorias || 0 : 0;
    const nombre = (id) => porId.get(id)?.nombre || "";

    /* ---------------- Sonidos ---------------- */

    useEffect(() => {
        if (!partida) return;
        const antes = anterior.current;
        anterior.current = partida;
        if (!antes) return;

        // Me invadieron una casilla
        const nuevos = partida.eventos.filter((e) => e.en > (antes.eventos.at(-1)?.en || 0));
        if (nuevos.some((e) => e.tipo === "infeccion" && e.victima === miId)) sonar("invadido");
        if (partida.fase === "jugando" && antes.fase === "votacion") sonar("iniciar");
        if (partida.fase === "terminada" && antes.fase !== "terminada") {
            const r = partida.resultado;
            sonar(r?.ganadores.includes(miId) ? (r.tipo === "empate" ? "empate" : "ganar") : "perder");
        }
    }, [partida, miId]);

    const avisoTiempo = pregunta && Math.ceil(restaPregunta) === 3;
    useEffect(() => {
        if (avisoTiempo) sonar("tiempo");
    }, [avisoTiempo]);

    /* ---------------- Acciones ---------------- */

    const tocar = (i) => {
        if (pidiendo || pregunta) return;
        if (espera > 0) return mostrarError(`Espera ${espera} s.`);
        setPidiendo(true);
        setResultado(null);
        socket.emit("invasion:tocar", { celda: i });
    };

    const responder = (k) => {
        if (elegida !== null) return;
        setElegida(k);
        socket.emit("invasion:responder", { opcion: k });
    };

    const votar = (datos) => socket.emit("invasion:votar", datos);

    const salir = () => {
        if (partida && partida.fase !== "terminada" && yo && !yo.salio) {
            if (!window.confirm("Si sales ahora pierdes la partida. ¿Salir?")) return;
            socket.emit("invasion:salir");
        }
        navigate("/sala");
    };

    /* =====================================================
       PANTALLAS
    ===================================================== */

    if (partida === undefined) {
        return (
            <div className="ffp iv">
                <p className="iv-centrado" role="status">Cargando partida…</p>
            </div>
        );
    }

    if (partida === null) {
        return (
            <div className="ffp iv">
                <div className="iv-centrado ffp-panel">
                    <h1>No hay partida de InvasiónGamif</h1>
                    <button type="button" className="ffp-btn" onClick={() => navigate("/sala")}>Ir a la sala</button>
                </div>
            </div>
        );
    }

    const jugando = partida.fase === "jugando";
    const ranking = [...partida.jugadores].sort((a, b) => b.casillas - a.casillas || a.nombre.localeCompare(b.nombre));
    const colorDe = (id) => porId.get(id)?.color?.hex || "#64748b";
    const bloqueado = !jugando || !yo || yo.salio || Boolean(pregunta) || pidiendo || espera > 0;

    return (
        <div className="ffp iv" style={{ "--mi-color": yo?.color?.hex || "#ffcf3e" }}>
            <main className="iv-main">
                {/* ================= TABLERO ================= */}
                <section className="iv-tablero-zona" aria-label="Tablero">
                    <div
                        className={`iv-tablero ${bloqueado ? "iv-tablero-espera" : ""}`}
                        style={{ gridTemplateColumns: `repeat(${partida.tamano}, minmax(0, 1fr))` }}
                        role="grid"
                        aria-label={`Tablero de ${partida.tamano} por ${partida.tamano}`}
                    >
                        {partida.celdas.map(([duenio, apartada], i) => {
                            const fila = Math.floor(i / partida.tamano) + 1;
                            const col = LETRAS[i % partida.tamano];
                            const mia = duenio === miId;
                            const libre = !mia && !apartada;
                            const color = duenio ? colorDe(duenio) : null;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    className={[
                                        "iv-celda",
                                        duenio && "iv-celda-pintada",
                                        mia && "iv-celda-mia",
                                        apartada && "iv-celda-apartada",
                                        conquista === i && "iv-celda-conquista",
                                    ].filter(Boolean).join(" ")}
                                    style={{ "--c": color || "transparent", "--a": apartada ? colorDe(apartada) : "transparent" }}
                                    onClick={() => tocar(i)}
                                    disabled={!libre || bloqueado}
                                    aria-label={`Casilla ${col}${fila}${duenio ? `, de ${mia ? "ti" : nombre(duenio)}` : ", vacía"}${apartada ? `, la responde ${nombre(apartada)}` : ""}`}
                                >
                                    {duenio && <span key={duenio} className="iv-pintura" aria-hidden="true" />}
                                    {apartada && <LuLock className="iv-candado" aria-hidden="true" />}
                                    {mia && !apartada && <LuCheck className="iv-mio" aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                    {espera > 0 && jugando && !resultado && (
                        <span className="iv-espera" role="status">{`Espera ${espera} s`}</span>
                    )}
                </section>

                {/* ================= LADO ================= */}
                <aside className="iv-lado" aria-label="Partida">
                    <div className="iv-controles">
                        <button type="button" className="ffl-icono" onClick={salir} aria-label={partida.fase === "terminada" ? "Volver a la sala" : "Salir de la partida"} title="Salir">
                            <LuArrowLeft aria-hidden="true" />
                        </button>
                        <span className={`iv-reloj ${jugando && restante !== null && restante <= 15 ? "iv-reloj-urgente" : ""}`}>
                            <LuClock aria-hidden="true" />
                            {reloj(restante)}
                        </span>
                        <SelectorEmojis />
                        <BotonHablar className="iv-hablar" />
                        <button type="button" className="ffl-icono" onClick={alternarSonido} aria-label={sonido ? "Silenciar" : "Activar sonido"}>
                            {sonido ? <LuVolume2 aria-hidden="true" /> : <LuVolumeX aria-hidden="true" />}
                        </button>
                    </div>

                    <p className="iv-titulo">
                        <strong>INVASIÓN<span>GAMIF</span></strong>
                        <small>{partida.tema}</small>
                    </p>

                    <ol className="iv-jugadores ffp-panel">
                        {ranking.map((j, n) => (
                            <li
                                key={j.userId}
                                className={`iv-jugador ${j.userId === miId ? "iv-jugador-yo" : ""} ${j.salio ? "iv-jugador-salio" : ""}`}
                                style={{ "--c": j.color.hex }}
                            >
                                <BurbujaEmoji dato={emojis[j.userId]} className="iv-emoji" />
                                <span className="iv-puesto">{n === 0 && j.casillas > 0 ? <LuCrown aria-label="Primero" /> : n + 1}</span>
                                <span className="iv-foto">
                                    <AssetImage src={j.avatar} type="player" alt="" />
                                </span>
                                <span className="iv-jugador-nombre">
                                    <strong>
                                        {j.nombre}
                                        <Verificado activo={j.verificado} />
                                        <HablandoMarca activo={hablando?.userId === j.userId} />
                                    </strong>
                                    <small>
                                        {j.salio
                                            ? "Salió"
                                            : j.respondiendo !== null
                                                ? "Respondiendo…"
                                                : `${j.aciertos} aciertos${j.infectadas ? ` · ${j.infectadas} invadidas` : ""}`}
                                        {victoriasDe(j.userId) > 0 && <span className="iv-victorias"><LuTrophy aria-hidden="true" />{victoriasDe(j.userId)}</span>}
                                    </small>
                                    <span className="iv-barra" aria-hidden="true">
                                        <span style={{ width: `${(100 * j.casillas) / totalCeldas}%` }} />
                                    </span>
                                </span>
                                <b className="iv-cuenta" aria-label={`${j.casillas} casillas`}>{j.casillas}</b>
                                {j.userId !== miId && !j.userId.startsWith("bot:") && <AccionesJugador userId={j.userId} nombre={j.nombre} contexto="invasion" className="iv-acciones" />}
                            </li>
                        ))}
                    </ol>

                    <ol className="iv-eventos" aria-live="polite">
                        {[...partida.eventos].slice(-3).reverse().map((e) => (
                            <li key={e.en + e.texto} className={`iv-evento iv-evento-${e.tipo}`} style={{ "--c": e.quien ? colorDe(e.quien) : undefined }}>
                                {e.texto}
                            </li>
                        ))}
                    </ol>
                </aside>
            </main>

            {/* ================= VOTACIÓN ================= */}
            {partida.fase === "votacion" && (
                <div className="iv-capa">
                    <section className="iv-votacion ffp-panel" aria-label="Votación">
                        <header>
                            <h1>INVASIÓN<span>GAMIF</span></h1>
                            <p>{`Voten entre todos · ${restante ?? 0} s`}</p>
                        </header>
                        {[
                            { titulo: "Tiempo para responder", campo: "respuesta", opciones: partida.opcionesRespuesta, votos: partida.votosRespuesta, texto: (v) => `${v} s` },
                            { titulo: "Duración de la partida", campo: "duracion", opciones: partida.opcionesDuracion, votos: partida.votosDuracion, texto: (v) => `${v} min` },
                        ].map((g) => (
                            <div key={g.campo} className="iv-voto-grupo" role="group" aria-label={g.titulo}>
                                <strong>{g.titulo}</strong>
                                <div className="iv-votos">
                                    {g.opciones.map((v) => {
                                        const quienes = g.votos[v] || [];
                                        const mio = quienes.includes(miId);
                                        return (
                                            <button key={v} type="button" className={`iv-voto ${mio ? "iv-voto-mio" : ""}`} aria-pressed={mio} onClick={() => votar({ [g.campo]: v })}>
                                                <b>{g.texto(v)}</b>
                                                <span className="iv-voto-puntos" aria-label={`${quienes.length} votos`}>
                                                    {quienes.map((id) => (
                                                        <i key={id} style={{ background: colorDe(id) }} title={nombre(id)} />
                                                    ))}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <small className="iv-suave">Si hay empate, decide el voto del creador de la sala.</small>
                    </section>
                </div>
            )}

            {/* ================= PREGUNTA ================= */}
            <AnimatePresence>
                {pregunta && (
                    <motion.div className="iv-capa" key={`${pregunta.celda}-${pregunta.hasta}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.section
                            className="iv-pregunta"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="iv-pregunta-texto"
                            initial={{ scale: 0.8, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 320, damping: 24 }}
                        >
                            <header className="iv-pregunta-cabeza">
                                <span className="iv-pregunta-casilla">{`Casilla ${LETRAS[pregunta.celda % partida.tamano]}${Math.floor(pregunta.celda / partida.tamano) + 1}`}</span>
                                <span className={`iv-pregunta-reloj ${restaPregunta <= 3 ? "iv-urgente" : ""}`}>
                                    <LuClock aria-hidden="true" />
                                    {Math.ceil(restaPregunta)}
                                </span>
                            </header>
                            <div className="iv-pregunta-barra" aria-hidden="true">
                                <span style={{ width: `${Math.min(100, (100 * restaPregunta) / pregunta.segundos)}%` }} />
                            </div>
                            <h2 id="iv-pregunta-texto">{pregunta.texto}</h2>
                            <div className={`iv-opciones ${pregunta.opciones.length > 2 ? "iv-opciones-4" : ""}`}>
                                {pregunta.opciones.map((o, k) => (
                                    <button
                                        key={k}
                                        type="button"
                                        className={`iv-opcion ${elegida === k ? "iv-opcion-elegida" : ""}`}
                                        onClick={() => responder(k)}
                                        disabled={elegida !== null}
                                    >
                                        <b>{OPCION[k]}</b>
                                        <span>{o}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.section>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ¡Casilla conquistada! */}
            <AnimatePresence>
                {conquista !== null && (
                    <motion.p className="iv-conquista" role="status" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, y: -20 }}>
                        ¡Casilla conquistada!
                    </motion.p>
                )}
            </AnimatePresence>

            {/* ================= PROFESOR ================= */}
            <AnimatePresence>
                {resultado && partida.fase !== "terminada" && (
                    <motion.div className="iv-profesor-capa" initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}>
                        <Profesor resultado={resultado} restante={espera} alCerrar={() => setResultado(null)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ================= FINAL ================= */}
            {partida.fase === "terminada" && (
                <div className="iv-capa">
                    <section className="iv-final ffp-panel" aria-label="Resultado">
                        <header>
                            <h1>{TITULO_RESULTADO[partida.resultado?.tipo] || "Partida terminada"}</h1>
                            <p>
                                {partida.resultado?.ganadores.includes(miId)
                                    ? partida.resultado.tipo === "empate" ? "¡Empataste en el primer lugar!" : "¡Ganaste la invasión!"
                                    : partida.resultado?.ganadores.length
                                        ? `Ganó ${partida.resultado.ganadores.map(nombre).join(" y ")}`
                                        : "Nadie pintó el tablero."}
                            </p>
                        </header>
                        <ol className="iv-podio">
                            {ranking.filter((j) => !j.salio).slice(0, 6).map((j, n) => (
                                <li key={j.userId} style={{ "--c": j.color.hex }} className={partida.resultado?.ganadores.includes(j.userId) ? "iv-podio-gano" : ""}>
                                    <span className="iv-puesto">{n + 1}</span>
                                    <span className="iv-foto"><AssetImage src={j.avatar} type="player" alt="" /></span>
                                    <strong>{j.nombre}{j.userId === miId && " (tú)"}</strong>
                                    <small>{`${j.aciertos} ✓ · ${j.errores} ✗`}</small>
                                    <b>{j.casillas}</b>
                                </li>
                            ))}
                        </ol>
                        <div className="iv-final-premio">
                            {premio ? (
                                premio.limite_diario_alcanzado ? (
                                    <span className="iv-suave">Límite de premios de hoy.</span>
                                ) : (
                                    <Recompensas xp={premio.xp} oro={premio.oro} diamantes={premio.diamantes} grande />
                                )
                            ) : (
                                yo && !yo.salio && <span className="iv-suave">Guardando premio…</span>
                            )}
                            {premio?.subio_nivel && <strong className="iv-subio">{`🎉 ¡Nivel ${premio.nivel_nuevo}!`}</strong>}
                        </div>
                        <div className="iv-final-botones">
                            {soyCreador ? (
                                <button
                                    type="button"
                                    className="ffp-btn"
                                    onClick={() => socket.emit("sala:iniciar")}
                                    disabled={Boolean(motivoOtra) || sala?.estado !== "sala"}
                                    title={motivoOtra || "Otra partida con los mismos jugadores"}
                                >
                                    <LuPlay aria-hidden="true" />
                                    Jugar otra vez
                                </button>
                            ) : (
                                <span className="iv-suave">El creador puede iniciar otra.</span>
                            )}
                            <button type="button" className="ffp-btn ffp-btn-2" onClick={() => navigate("/sala")}>
                                Volver a la sala
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {error && (
                <p className="iv-error" role="alert">
                    <LuX aria-hidden="true" />
                    {error}
                </p>
            )}
        </div>
    );
}
