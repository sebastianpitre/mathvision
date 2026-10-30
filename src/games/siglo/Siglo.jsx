import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LuArrowLeft, LuClock, LuDices, LuGem, LuPlay, LuRotateCcw, LuSkull, LuTrophy, LuVolume2, LuVolumeX } from "react-icons/lu";

import { useAuth } from "../../context/AuthContext";
import { socket } from "../../services/socket";
import Recompensas from "../../components/common/Recompensas";
import AssetImage from "../../components/common/AssetImage";
import { BurbujaEmoji, SelectorEmojis } from "../../components/common/Emojis";
import { useEmojisSala } from "../../components/common/useEmojisSala";
import { sonar as sonarMomento } from "../../services/sonidos";
import { useSonido } from "../../hooks/useSonido";
import PoderSiglo from "./Poder";
import BotonHablar, { HablandoMarca } from "../../components/juego/BotonHablar";
import { AccionesJugador } from "../../components/juego/Reportar";
import { useVoz } from "../../hooks/useVoz";

import "./siglo.css";
import Verificado from "../../components/juego/Verificado";

/* =========================================================
   SIGLOGAMIF · PANTALLA DEL JUEGO
   El servidor decide el dado, los turnos y las sumas. Aquí
   solo se muestra el estado y se envía "tirar" / "elegir".

   · JOKER: si el dado sale joker, el jugador elige un número
     del 0 al 6 y luego unidad o decena.
   · DIAMANTE: una vez por partida, después de tirar, puede
     pagar 1 diamante para volver a tirar.
   · Al terminar, el creador puede "Jugar otra vez" sin volver
     a la sala. Junto a cada nombre se ven las partidas que ha
     ganado en esta sala.
========================================================= */

// Evento → momento del panel (Panel → Sonidos).
const SONIDOS = {
    dado: "dado",
    poner: "poner",
    eliminado: "eliminado",
    turno: "turno",
    joker: "joker",
    ganar: "ganar",
    perder: "perder",
    tiempo: "tiempo",
};

const JOKER = "joker";

const PUNTOS_DADO = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
};

function Dado({ valor, girando }) {
    const joker = valor === JOKER;

    return (
        <motion.div
            className={`sg-dado ${joker ? "sg-dado-joker" : ""}`}
            animate={girando ? { rotate: [0, 90, 180, 270, 360] } : { rotate: 0 }}
            transition={girando ? { duration: 0.5, repeat: Infinity, ease: "linear" } : { type: "spring" }}
            role="img"
            aria-label={joker ? "Dado: joker" : valor ? `Dado: ${valor}` : "Dado sin tirar"}
        >
            {joker ? (
                <span className="sg-joker-cara" aria-hidden="true">
                    <span>🃏</span>
                    <small>JOKER</small>
                </span>
            ) : (
                Array.from({ length: 9 }, (_, i) => (
                    <span key={i} className={valor && PUNTOS_DADO[valor]?.includes(i + 1) ? "sg-punto" : ""} />
                ))
            )}
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
    const { hablando } = useVoz();

    const [partida, setPartida] = useState(undefined);
    const [sala, setSala] = useState(null);
    const emojis = useEmojisSala();
    const [premio, setPremio] = useState(null);
    const [error, setError] = useState("");
    const [restante, setRestante] = useState(null);
    const [sonido, alternarSonido] = useSonido();
    const [tirando, setTirando] = useState(false);
    // Número elegido con el joker, atado al tiro en que se eligió.
    const [eleccionJoker, setEleccionJoker] = useState({ tiro: "", numero: null });
    const [retirando, setRetirando] = useState(false);

    const desfase = useRef(0);
    const errorTimer = useRef(null);
    const anterior = useRef(null);

    const sonar = useCallback((nombre) => sonarMomento(SONIDOS[nombre]), []);

    /* ---------------- Conexión ---------------- */

    useEffect(() => {
        const pedir = () => {
            socket.emit("sala:estado");
            socket.emit("siglo:estado");
        };

        const alEstado = (estado) => {
            if (!estado) return setPartida(null);
            desfase.current = estado.ahora - Date.now();
            // Empezó otra partida: se borra el premio de la anterior.
            if (estado.fase === "votacion") setPremio(null);
            setTirando(false);
            setRetirando(false);
            setPartida(estado);
        };

        const alError = ({ message }) => {
            setTirando(false);
            setRetirando(false);
            clearTimeout(errorTimer.current);
            setError(message);
            errorTimer.current = setTimeout(() => setError(""), 3000);
        };

        const alPremio = (p) => {
            setPremio(p.recompensa);
            // Refresca el oro y el XP guardados de la sesión.
            refreshUser();
        };

        // Gastó (o le devolvieron) un diamante.
        const alProgreso = () => refreshUser();
        const alSala = ({ sala: nueva }) => setSala(nueva);

        socket.on("connect", pedir);
        socket.on("siglo:estado", alEstado);
        socket.on("siglo:error", alError);
        socket.on("game:reward", alPremio);
        socket.on("progreso:actualizar", alProgreso);
        socket.on("sala:estado", alSala);

        if (socket.connected) pedir();
        else socket.connect();

        return () => {
            socket.off("connect", pedir);
            socket.off("siglo:estado", alEstado);
            socket.off("siglo:error", alError);
            socket.off("game:reward", alPremio);
            socket.off("progreso:actualizar", alProgreso);
            socket.off("sala:estado", alSala);
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
            else if (ultimo.tipo === "joker") sonar("joker");
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

    // Aviso cuando a mi turno le quedan 5 segundos.
    const avisoTiempo = miTurno && restante === 5;
    useEffect(() => {
        if (avisoTiempo) sonar("tiempo");
    }, [avisoTiempo, sonar]);
    const nombre = (id) => partida?.jugadores.find((j) => j.userId === id)?.nombre || "";
    const victoriasDe = (id) =>
        sala?.juego === "siglo" ? sala.miembros.find((m) => String(m.userId) === id)?.victorias || 0 : 0;
    const soyCreador = sala?.hostUserId === miId;
    const motivoOtra =
        sala?.motivoNoIniciar ||
        (sala?.miembros.some((m) => !m.conectado) ? "Esperando a que todos se conecten." : null);
    const esJoker = partida?.dado === JOKER;
    const misDiamantes = Number(user?.gems) || 0;

    // Cada tiro nuevo (o volver a tirar) borra el número elegido antes.
    const claveTiro = partida ? `${partida.turno}-${partida.ronda}-${partida.eventos.at(-1)?.en}` : "";
    const numeroJoker = esJoker && eleccionJoker.tiro === claveTiro ? eleccionJoker.numero : null;
    const setNumeroJoker = (numero) => setEleccionJoker({ tiro: claveTiro, numero });

    // El número que se pone: el del dado, o el elegido con el joker.
    const base = esJoker ? numeroJoker : partida?.dado;

    const opciones = useMemo(() => {
        if (!partida || !yo || !miTurno || partida.fase !== "jugando" || base === null || base === undefined) return [];

        const restantes = partida.espacios - (partida.ronda + 1);
        const lista = [
            { opcion: "unidad", valor: base },
            { opcion: "decena", valor: base * 10 },
        ];

        // Con 0 las dos opciones dan lo mismo.
        return (base === 0 ? lista.slice(0, 1) : lista).map((o) => {
            const total = yo.total + o.valor;
            let aviso = null;
            let tono = "ok";

            if (total > partida.meta) {
                aviso = "Te pasas: eliminado";
                tono = "mal";
            } else if (restantes === 0 && total === partida.meta) {
                aviso = "¡SIGLO! Ganas";
                tono = "siglo";
            } else if (total + restantes > partida.meta) {
                aviso = "Riesgo: te pasarás";
                tono = "riesgo";
            }

            return { ...o, total, aviso, tono };
        });
    }, [partida, yo, miTurno, base]);

    const puedeVolverATirar =
        miTurno && partida?.fase === "jugando" && partida.dado !== null && yo && !yo.retiroUsado && !yo.eliminado;

    /* ---------------- Acciones ---------------- */

    const tirar = () => {
        setTirando(true);
        socket.emit("siglo:tirar");
    };

    const elegir = (opcion) =>
        socket.emit("siglo:elegir", esJoker ? { opcion, numero: numeroJoker } : { opcion });

    const volverATirar = () => {
        if (misDiamantes < 1) {
            setError("No tienes diamantes para volver a tirar.");
            clearTimeout(errorTimer.current);
            errorTimer.current = setTimeout(() => setError(""), 3000);
            return;
        }
        setRetirando(true);
        socket.emit("siglo:volverATirar");
    };

    const salir = () => {
        if (partida && partida.fase !== "terminada" && yo && !yo.eliminado) {
            const seguro = window.confirm("Si sales ahora quedas eliminado de esta partida. ¿Salir?");
            if (!seguro) return;
            socket.emit("siglo:salir");
        }
        navigate("/sala");
    };


    /* =====================================================
       PANTALLAS
    ===================================================== */

    if (partida === undefined) {
        return (
            <div className="ffp sg">
                <p className="sg-centrado" role="status">Cargando partida…</p>
            </div>
        );
    }

    if (partida === null) {
        return (
            <div className="ffp sg">
                <div className="sg-centrado ffp-panel">
                    <h1>No hay partida de SigloGamif</h1>
                    <button type="button" className="ffp-btn" onClick={() => navigate("/sala")}>Ir a la sala</button>
                </div>
            </div>
        );
    }

    const urgente = restante !== null && restante <= 5;

    return (
        <div className="ffp sg">
            <main className="sg-main">
                {/* ================= TABLERO =================
                    Tarjetas en dos columnas: foto, nombre, el total
                    bien grande y los 5 espacios con números claros. */}
                <section
                    className={`sg-tablero ${partida.jugadores.length > 4 ? "sg-tablero-muchos" : ""}`}
                    style={{ gridTemplateRows: `repeat(${Math.max(2, Math.ceil(partida.jugadores.length / 2))}, minmax(0, 1fr))` }}
                    aria-label="Tablero de jugadores"
                >
                    {partida.jugadores.map((j) => {
                        const esTurno = j.userId === partida.turno;
                        const gano = partida.resultado?.ganadores.includes(j.userId);
                        const empatado = partida.fase === "desempate" && partida.empatados.includes(j.userId);
                        const tonoTotal = j.total > partida.meta ? "sg-total-mal" : j.total === partida.meta ? "sg-total-siglo" : "";

                        return (
                            <article
                                key={j.userId}
                                className={[
                                    "sg-carta",
                                    j.userId === miId && "sg-carta-yo",
                                    esTurno && "sg-carta-turno",
                                    j.eliminado && "sg-carta-eliminado",
                                    gano && "sg-carta-gano",
                                ].filter(Boolean).join(" ")}
                                aria-label={`${j.nombre}: total ${j.total}${j.eliminado ? ", eliminado" : ""}`}
                            >
                                <BurbujaEmoji dato={emojis[j.userId]} className="sg-carta-emoji" />

                                <header className="sg-carta-cabeza">
                                    <span className="sg-foto">
                                        <AssetImage src={j.avatar} type="player" alt="" />
                                    </span>
                                    <div className="sg-carta-nombre">
                                        <strong>
                                            {j.nombre}
                                            <Verificado activo={j.verificado} />
                                            {j.userId === miId && <span className="sg-tu"> (tú)</span>}
                                            <HablandoMarca activo={hablando?.userId === j.userId} />
                                        </strong>
                                        <small>
                                            {gano ? (
                                                <><LuTrophy aria-hidden="true" /> Ganador</>
                                            ) : j.eliminado ? (
                                                <><LuSkull aria-hidden="true" /> {j.motivo === "abandono" ? "Salió" : "Se pasó"}</>
                                            ) : esTurno ? (
                                                "Su turno…"
                                            ) : empatado ? (
                                                j.tiroDesempate ? `Desempate: ${j.tiroDesempate}` : "En desempate"
                                            ) : (
                                                `Faltan ${Math.max(0, partida.meta - j.total)}`
                                            )}
                                            {victoriasDe(j.userId) > 0 && (
                                                <span className="sg-victorias" title="Partidas ganadas en esta sala">
                                                    <LuTrophy aria-hidden="true" />
                                                    {victoriasDe(j.userId)}
                                                </span>
                                            )}
                                            {j.retiroUsado && (
                                                <span className="sg-uso-diamante" title="Ya volvió a tirar con un diamante">
                                                    <LuGem aria-hidden="true" />
                                                    <span className="ffl-oculto">usó su diamante</span>
                                                </span>
                                            )}
                                        </small>
                                    </div>
                                    {j.userId !== miId && <AccionesJugador userId={j.userId} nombre={j.nombre} contexto="siglo" className="sg-acciones" />}
                                    <div className={`sg-total ${tonoTotal}`}>
                                        <small>Total</small>
                                        <strong>{j.total}</strong>
                                    </div>
                                </header>

                                <ol className="sg-espacios">
                                    {j.espacios.map((v, i) => (
                                        <li
                                            key={i}
                                            className={[
                                                "sg-espacio",
                                                v !== null && "sg-espacio-lleno",
                                                v === null && i === partida.ronda && !j.eliminado && partida.fase === "jugando" && "sg-espacio-actual",
                                                j.marcasPoder?.includes(i) && "sg-espacio-poder",
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

                                <div className="sg-barra" aria-hidden="true">
                                    <span style={{ width: `${Math.min(100, j.total)}%` }} />
                                </div>
                            </article>
                        );
                    })}
                </section>

                {/* ================= ACTIVIDAD ================= */}
                <aside className="sg-lado" aria-label="Partida">
                    {/* Controles del juego (sin encabezado) */}
                    <div className="sg-controles">
                        <button type="button" className="ffl-icono" onClick={salir} aria-label={partida.fase === "terminada" ? "Volver a la sala" : "Salir de la partida"} title="Salir">
                            <LuArrowLeft aria-hidden="true" />
                        </button>
                        <span className={`sg-reloj ${urgente ? "sg-reloj-urgente" : ""}`} aria-live={urgente ? "assertive" : "off"}>
                            <LuClock aria-hidden="true" />
                            {restante !== null ? `${restante} s` : "--"}
                        </span>
                        <SelectorEmojis />
                        <BotonHablar className="sg-hablar" />
                        <button type="button" className="ffl-icono" onClick={alternarSonido} aria-label={sonido ? "Silenciar" : "Activar sonido"}>
                            {sonido ? <LuVolume2 aria-hidden="true" /> : <LuVolumeX aria-hidden="true" />}
                        </button>
                    </div>
                    <p className="sg-fase">
                        <strong>SIGLO<span>GAMIF</span></strong>
                        {partida.fase === "votacion"
                            ? "Votación"
                            : partida.fase === "desempate"
                                ? "Desempate"
                                : partida.fase === "terminada"
                                    ? "Terminada"
                                    : `Espacio ${Math.min(partida.ronda + 1, partida.espacios)}/${partida.espacios}`}
                    </p>
                    <div className="sg-actividad ffp-panel">
                    <ol className="sg-eventos">
                        {[...partida.eventos].reverse().map((e) => (
                            <li key={e.en + e.texto} className={`sg-evento sg-evento-${e.tipo}`}>{e.texto}</li>
                        ))}
                    </ol>
                    </div>
                </aside>

                {/* ================= ACCIÓN ================= */}
                <section className="ffp-panel sg-accion" aria-live="polite">
                    {partida.fase === "votacion" ? (
                        <div className="sg-votacion">
                            <div>
                                <strong className="sg-accion-titulo">¿Tiempo por turno?</strong>
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
                                <span className="sg-suave">
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
                                        <span className="sg-suave">Límite de premios de hoy.</span>
                                    ) : (
                                        <Recompensas xp={premio.xp} oro={premio.oro} diamantes={premio.diamantes} grande />
                                    )
                                ) : (
                                    yo && yo.motivo !== "abandono" && <span className="sg-suave">Guardando premio…</span>
                                )}
                                {premio?.subio_nivel && <strong className="sg-subio">{`🎉 ¡Nivel ${premio.nivel_nuevo}!`}</strong>}
                            </div>
                            <div className="sg-final-botones">
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
                                    <span className="sg-suave">El creador puede iniciar otra.</span>
                                )}
                                <button type="button" className="ffp-btn ffp-btn-2" onClick={() => navigate("/sala")}>
                                    Volver a la sala
                                </button>
                            </div>
                            {soyCreador && motivoOtra && <small className="sg-suave sg-motivo">{motivoOtra}</small>}
                        </div>
                    ) : miTurno && !yo?.eliminado ? (
                        <div className="sg-mi-turno">
                            <div className="sg-dado-zona">
                                <Dado valor={partida.dado} girando={tirando || retirando} />
                                {puedeVolverATirar && (
                                    <button
                                        type="button"
                                        className="ffp-btn ffp-btn-2 sg-btn-retiro"
                                        onClick={volverATirar}
                                        disabled={retirando}
                                        title={misDiamantes < 1 ? "Necesitas 1 diamante" : "Solo una vez por partida"}
                                    >
                                        <LuRotateCcw aria-hidden="true" />
                                        Volver a tirar
                                        <span className="sg-costo">
                                            1 <LuGem aria-hidden="true" />
                                            <span className="ffl-oculto">diamante</span>
                                        </span>
                                    </button>
                                )}
                            </div>

                            {partida.dado === null || partida.fase === "desempate" ? (
                                <div className="sg-mi-turno-texto">
                                    <strong className="sg-accion-titulo">
                                        {partida.fase === "desempate" ? "¡Tira para desempatar!" : "¡Es tu turno!"}
                                    </strong>
                                    <button type="button" className="ffp-btn sg-btn-tirar" onClick={tirar} disabled={tirando}>
                                        <LuDices aria-hidden="true" />
                                        Tirar dado
                                    </button>
                                </div>
                            ) : esJoker && numeroJoker === null ? (
                                <div className="sg-joker">
                                    <strong className="sg-accion-titulo">¡JOKER! Elige tu número</strong>
                                    <div className="sg-joker-numeros" role="group" aria-label="Elige un número del 0 al 6">
                                        {(partida.numerosJoker || [0, 1, 2, 3, 4, 5, 6]).map((n) => (
                                            <button key={n} type="button" className="sg-joker-numero" onClick={() => setNumeroJoker(n)}>
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="sg-opciones">
                                    {esJoker && (
                                        <button type="button" className="sg-joker-cambiar" onClick={() => setNumeroJoker(null)}>
                                            {`🃏 Elegiste ${numeroJoker} · cambiar`}
                                        </button>
                                    )}
                                    {opciones.map((o) => (
                                        <button key={o.opcion} type="button" className={`sg-opcion sg-opcion-${o.tono}`} onClick={() => elegir(o.opcion)} disabled={retirando}>
                                            <span className="sg-opcion-valor">{o.valor}</span>
                                            <span className="sg-opcion-texto">
                                                <strong>{`Poner ${o.valor}`}</strong>
                                                <small>{o.aviso || `Quedas en ${o.total}`}</small>
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
                                        ? "Quedaste eliminado."
                                        : turnoDe
                                            ? `Turno de ${turnoDe.nombre}`
                                            : "Siguiente turno…"}
                                </strong>
                                {yo && !yo.eliminado && (
                                    <span className="sg-suave">{`Tienes ${yo.total} · faltan ${partida.meta - yo.total}`}</span>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </main>

            <PoderSiglo partida={partida} miId={miId} desfase={desfase.current} />

            {error && <p className="sg-error" role="alert">{error}</p>}
        </div>
    );
}
