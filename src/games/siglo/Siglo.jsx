import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LuArrowLeft, LuClock, LuDices, LuSkull, LuTrophy, LuVolume2, LuVolumeX } from "react-icons/lu";

import { useAuth } from "../../context/AuthContext";
import { socket } from "../../services/socket";
import Recompensas from "../../components/common/Recompensas";

import "../../styles/ludo.css";
import "./siglo.css";

/* =========================================================
   SIGLOGAMIF · PANTALLA DEL JUEGO
   El servidor decide el dado, los turnos y las sumas. Aquí
   solo se muestra el estado y se envía "tirar" / "elegir".
========================================================= */

const SONIDOS = {
    dado: "/sounds/click.mp3",
    poner: "/sounds/correct.mp3",
    eliminado: "/sounds/incorrect.mp3",
    turno: "/sounds/warning.mp3",
    ganar: "/sounds/victory.mp3",
    perder: "/sounds/game-over.mp3",
};

const PUNTOS_DADO = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
};

function Dado({ valor, girando }) {
    return (
        <motion.div
            className="sg-dado"
            animate={girando ? { rotate: [0, 90, 180, 270, 360] } : { rotate: 0 }}
            transition={girando ? { duration: 0.5, repeat: Infinity, ease: "linear" } : { type: "spring" }}
            role="img"
            aria-label={valor ? `Dado: ${valor}` : "Dado sin tirar"}
        >
            {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className={valor && PUNTOS_DADO[valor].includes(i + 1) ? "sg-punto" : ""} />
            ))}
        </motion.div>
    );
}

const TITULO_RESULTADO = {
    siglo: "¡SIGLO!",
    cercano: "¡Fin de la partida!",
    ultimo: "¡Último en pie!",
    desempate: "¡Desempate ganado!",
    nadie: "Nadie llegó",
};

export default function Siglo() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const miId = String(user?.id ?? "");

    const [partida, setPartida] = useState(undefined);
    const [premio, setPremio] = useState(null);
    const [error, setError] = useState("");
    const [restante, setRestante] = useState(null);
    const [sonido, setSonido] = useState(true);
    const [tirando, setTirando] = useState(false);

    const desfase = useRef(0);
    const sonidoRef = useRef(true);
    const errorTimer = useRef(null);
    const anterior = useRef(null);

    const sonar = useCallback((nombre) => {
        if (!sonidoRef.current) return;
        const audio = new Audio(SONIDOS[nombre]);
        audio.volume = 0.6;
        audio.play().catch(() => {});
    }, []);

    /* ---------------- Conexión ---------------- */

    useEffect(() => {
        const pedir = () => {
            socket.emit("sala:estado");
            socket.emit("siglo:estado");
        };

        const alEstado = (estado) => {
            if (!estado) return setPartida(null);
            desfase.current = estado.ahora - Date.now();
            setTirando(false);
            setPartida(estado);
        };

        const alError = ({ message }) => {
            setTirando(false);
            clearTimeout(errorTimer.current);
            setError(message);
            errorTimer.current = setTimeout(() => setError(""), 3000);
        };

        const alPremio = (p) => {
            setPremio(p.recompensa);
            // Refresca el oro y el XP guardados de la sesión.
            refreshUser();
        };

        socket.on("connect", pedir);
        socket.on("siglo:estado", alEstado);
        socket.on("siglo:error", alError);
        socket.on("game:reward", alPremio);

        if (socket.connected) pedir();
        else socket.connect();

        return () => {
            socket.off("connect", pedir);
            socket.off("siglo:estado", alEstado);
            socket.off("siglo:error", alError);
            socket.off("game:reward", alPremio);
            clearTimeout(errorTimer.current);
        };
    }, [refreshUser]);

    /* ---------------- Sonidos según lo que pasó ---------------- */

    useEffect(() => {
        if (!partida) return;
        const antes = anterior.current;
        anterior.current = partida;
        if (!antes) return;

        const ultimo = partida.eventos.at(-1);
        const ultimoAntes = antes.eventos.at(-1);

        if (ultimo && ultimo.en !== ultimoAntes?.en) {
            if (ultimo.tipo === "dado") sonar("dado");
            else if (ultimo.tipo === "eliminado") sonar("eliminado");
            else if (ultimo.tipo === "info") sonar("poner");
        }

        if (partida.turno === miId && antes.turno !== miId) sonar("turno");

        if (partida.fase === "terminada" && antes.fase !== "terminada") {
            sonar(partida.resultado?.ganadores.includes(miId) ? "ganar" : "perder");
        }
    }, [partida, miId, sonar]);

    /* ---------------- Reloj ---------------- */

    useEffect(() => {
        if (!partida?.finEn) {
            setRestante(null);
            return;
        }

        const tic = () =>
            setRestante(Math.max(0, Math.ceil((partida.finEn - (Date.now() + desfase.current)) / 1000)));
        tic();
        const t = setInterval(tic, 250);
        return () => clearInterval(t);
    }, [partida?.finEn]);

    /* ---------------- Datos ---------------- */

    const yo = useMemo(() => partida?.jugadores.find((j) => j.userId === miId) || null, [partida, miId]);
    const turnoDe = partida?.jugadores.find((j) => j.userId === partida.turno) || null;
    const miTurno = Boolean(partida && partida.turno === miId);
    const nombre = (id) => partida?.jugadores.find((j) => j.userId === id)?.nombre || "";

    const opciones = useMemo(() => {
        if (!partida || !yo || !miTurno || partida.fase !== "jugando" || partida.dado === null) return [];

        const restantes = partida.espacios - (partida.ronda + 1);

        return [
            { opcion: "unidad", valor: partida.dado },
            { opcion: "decena", valor: partida.dado * 10 },
        ].map((o) => {
            const total = yo.total + o.valor;
            let aviso = null;
            let tono = "ok";

            if (total > partida.meta) {
                aviso = "Te pasas de 100: quedas eliminado";
                tono = "mal";
            } else if (restantes === 0 && total === partida.meta) {
                aviso = "¡Haces SIGLO y ganas!";
                tono = "siglo";
            } else if (total + restantes > partida.meta) {
                aviso = `Te faltan ${restantes} espacio${restantes === 1 ? "" : "s"}: te pasarás`;
                tono = "riesgo";
            }

            return { ...o, total, aviso, tono };
        });
    }, [partida, yo, miTurno]);

    /* ---------------- Acciones ---------------- */

    const tirar = () => {
        setTirando(true);
        socket.emit("siglo:tirar");
    };

    const elegir = (opcion) => socket.emit("siglo:elegir", { opcion });

    const salir = () => {
        if (partida && partida.fase !== "terminada" && yo && !yo.eliminado) {
            const seguro = window.confirm("Si sales ahora quedas eliminado de esta partida. ¿Salir?");
            if (!seguro) return;
            socket.emit("siglo:salir");
        }
        navigate("/sala");
    };

    const alternarSonido = () => {
        sonidoRef.current = !sonidoRef.current;
        setSonido(sonidoRef.current);
    };

    /* =====================================================
       PANTALLAS
    ===================================================== */

    if (partida === undefined) {
        return (
            <div className="lg sg">
                <main className="lg-main" style={{ alignItems: "center", justifyContent: "center" }}>
                    <span className="lg-spinner" role="status" aria-label="Cargando partida" />
                </main>
            </div>
        );
    }

    if (partida === null) {
        return (
            <div className="lg sg">
                <main className="lg-main" style={{ alignItems: "center", justifyContent: "center" }}>
                    <div className="lb-card" style={{ textAlign: "center", maxWidth: 420 }}>
                        <h1 className="lb-title">No hay una partida de SigloGamif</h1>
                        <p className="lb-muted" style={{ margin: "8px 0 16px" }}>Vuelve a la sala para empezar una.</p>
                        <button type="button" className="lb-btn lb-btn-primary" onClick={() => navigate("/sala")}>Ir a la sala</button>
                    </div>
                </main>
            </div>
        );
    }

    const urgente = restante !== null && restante <= 5;

    return (
        <div className="lg sg">
            {/* ================= ENCABEZADO ================= */}
            <header className="sg-header">
                <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={salir}>
                    <LuArrowLeft aria-hidden="true" />
                    {partida.fase === "terminada" ? "Volver a la sala" : "Salir"}
                </button>

                <div className="sg-titulo">
                    <strong>SIGLO<span>GAMIF</span></strong>
                    <small>
                        {partida.fase === "votacion"
                            ? "Votación del tiempo"
                            : partida.fase === "desempate"
                                ? "Desempate"
                                : partida.fase === "terminada"
                                    ? "Partida terminada"
                                    : `Espacio ${Math.min(partida.ronda + 1, partida.espacios)} de ${partida.espacios}`}
                    </small>
                </div>

                <div className="lg-row" style={{ flexWrap: "nowrap" }}>
                    {restante !== null && (
                        <span className={`sg-reloj ${urgente ? "sg-reloj-urgente" : ""}`} aria-live={urgente ? "assertive" : "off"}>
                            <LuClock aria-hidden="true" />
                            {`${restante} s`}
                        </span>
                    )}
                    <button type="button" className="lb-icon-btn" onClick={alternarSonido} aria-label={sonido ? "Silenciar" : "Activar sonido"}>
                        {sonido ? <LuVolume2 aria-hidden="true" /> : <LuVolumeX aria-hidden="true" />}
                    </button>
                </div>
            </header>

            <main className="sg-main">
                {/* ================= TABLERO ================= */}
                <section className="sg-tablero" aria-label="Tablero de jugadores">
                    {partida.jugadores.map((j) => {
                        const esTurno = j.userId === partida.turno;
                        const gano = partida.resultado?.ganadores.includes(j.userId);
                        const empatado = partida.fase === "desempate" && partida.empatados.includes(j.userId);

                        return (
                            <article
                                key={j.userId}
                                className={[
                                    "sg-fila",
                                    j.userId === miId && "sg-fila-yo",
                                    esTurno && "sg-fila-turno",
                                    j.eliminado && "sg-fila-eliminado",
                                    gano && "sg-fila-gano",
                                ].filter(Boolean).join(" ")}
                                aria-label={`${j.nombre}: suma ${j.total}${j.eliminado ? ", eliminado" : ""}`}
                            >
                                <div className="sg-fila-nombre">
                                    <strong>
                                        {j.nombre}
                                        {j.userId === miId && <span className="sg-tu"> (tú)</span>}
                                    </strong>
                                    <small>
                                        {gano ? (
                                            <><LuTrophy aria-hidden="true" /> Ganador</>
                                        ) : j.eliminado ? (
                                            <><LuSkull aria-hidden="true" /> {j.motivo === "abandono" ? "Salió" : "Se pasó de 100"}</>
                                        ) : esTurno ? (
                                            "Su turno…"
                                        ) : empatado ? (
                                            j.tiroDesempate ? `Desempate: ${j.tiroDesempate}` : "En desempate"
                                        ) : partida.fase === "terminada" ? (
                                            `Terminó con ${j.total}`
                                        ) : (
                                            "En juego"
                                        )}
                                    </small>
                                </div>

                                <ol className="sg-espacios">
                                    {j.espacios.map((v, i) => (
                                        <li
                                            key={i}
                                            className={[
                                                "sg-espacio",
                                                v !== null && "sg-espacio-lleno",
                                                v === null && i === partida.ronda && !j.eliminado && partida.fase === "jugando" && "sg-espacio-actual",
                                            ].filter(Boolean).join(" ")}
                                        >
                                            <AnimatePresence>
                                                {v !== null && (
                                                    <motion.span initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                                                        {v}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </li>
                                    ))}
                                </ol>

                                <div className="sg-total">
                                    <strong className={j.total > partida.meta ? "sg-total-mal" : j.total === partida.meta ? "sg-total-siglo" : ""}>
                                        {j.total}
                                    </strong>
                                    <div className="sg-barra" aria-hidden="true">
                                        <span style={{ width: `${Math.min(100, j.total)}%` }} />
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>

                {/* ================= ACTIVIDAD ================= */}
                <aside className="lb-card sg-actividad" aria-label="Lo que ha pasado">
                    <h2 className="lg-card-title">Jugadas</h2>
                    <ol className="sg-eventos">
                        {[...partida.eventos].reverse().map((e) => (
                            <li key={e.en + e.texto} className={`sg-evento sg-evento-${e.tipo}`}>{e.texto}</li>
                        ))}
                    </ol>
                </aside>

                {/* ================= ACCIÓN ================= */}
                <section className="lb-card sg-accion" aria-live="polite">
                    {partida.fase === "votacion" ? (
                        <div className="sg-votacion">
                            <div>
                                <p className="lb-eyebrow">Antes de empezar</p>
                                <strong className="sg-accion-titulo">¿Cuánto tiempo por turno?</strong>
                            </div>
                            <div className="sg-votos" role="group" aria-label="Votar el tiempo de turno">
                                {partida.opcionesTiempo.map((seg) => {
                                    const quienes = partida.votos[seg] || [];
                                    const mio = quienes.includes(miId);
                                    return (
                                        <button key={seg} type="button" className={`sg-voto ${mio ? "sg-voto-mio" : ""}`} aria-pressed={mio} onClick={() => socket.emit("siglo:votar", { segundos: seg })}>
                                            <strong>{`${seg} s`}</strong>
                                            <small>{quienes.length ? quienes.map(nombre).join(", ") : "Sin votos"}</small>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : partida.fase === "terminada" ? (
                        <div className="sg-final">
                            <div>
                                <strong className={`sg-accion-titulo ${partida.resultado?.tipo === "siglo" ? "sg-siglo" : ""}`}>
                                    {TITULO_RESULTADO[partida.resultado?.tipo] || "Partida terminada"}
                                </strong>
                                <span className="lb-muted">
                                    {partida.resultado?.ganadores.length
                                        ? partida.resultado.ganadores.includes(miId)
                                            ? "¡Ganaste!"
                                            : `Ganó ${partida.resultado.ganadores.map(nombre).join(", ")}`
                                        : "Todos se pasaron de 100."}
                                </span>
                            </div>
                            <div className="sg-final-premio">
                                {premio ? (
                                    premio.limite_diario_alcanzado ? (
                                        <span className="lb-muted">Ya ganaste muchos premios hoy en SigloGamif.</span>
                                    ) : (
                                        <Recompensas xp={premio.xp} oro={premio.oro} diamantes={premio.diamantes} grande />
                                    )
                                ) : (
                                    yo && yo.motivo !== "abandono" && <span className="lb-muted">Guardando premio…</span>
                                )}
                                {premio?.subio_nivel && <strong className="sg-subio">{`🎉 ¡Nivel ${premio.nivel_nuevo}!`}</strong>}
                            </div>
                            <button type="button" className="lb-btn lb-btn-primary" onClick={() => navigate("/sala")}>
                                Volver a la sala
                            </button>
                        </div>
                    ) : miTurno && !yo?.eliminado ? (
                        <div className="sg-mi-turno">
                            <Dado valor={partida.dado} girando={tirando} />

                            {partida.dado === null || partida.fase === "desempate" ? (
                                <div className="sg-mi-turno-texto">
                                    <strong className="sg-accion-titulo">
                                        {partida.fase === "desempate" ? "¡Tira para desempatar!" : "¡Es tu turno!"}
                                    </strong>
                                    <button type="button" className="lb-btn lb-btn-primary sg-btn-tirar" onClick={tirar} disabled={tirando}>
                                        <LuDices aria-hidden="true" />
                                        Tirar dado
                                    </button>
                                </div>
                            ) : (
                                <div className="sg-opciones">
                                    {opciones.map((o) => (
                                        <button key={o.opcion} type="button" className={`sg-opcion sg-opcion-${o.tono}`} onClick={() => elegir(o.opcion)}>
                                            <span className="sg-opcion-valor">{o.valor}</span>
                                            <span className="sg-opcion-texto">
                                                <strong>{`Poner ${o.valor}`}</strong>
                                                <small>{o.aviso || `Tu suma queda en ${o.total}`}</small>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="sg-espera">
                            <Dado valor={partida.dado} girando={false} />
                            <div>
                                <strong className="sg-accion-titulo">
                                    {yo?.eliminado
                                        ? "Quedaste eliminado. Mira cómo termina la partida."
                                        : turnoDe
                                            ? `Turno de ${turnoDe.nombre}`
                                            : "Siguiente turno…"}
                                </strong>
                                {yo && !yo.eliminado && (
                                    <span className="lb-muted">{`Tu suma: ${yo.total} · te faltan ${partida.meta - yo.total} para 100`}</span>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </main>

            {error && <p className="lg-alert sg-error" role="alert">{error}</p>}
        </div>
    );
}
