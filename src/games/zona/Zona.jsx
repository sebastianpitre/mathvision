import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LuArrowLeft, LuClock, LuCrown, LuDices, LuFlag, LuPlay, LuTrophy, LuVolume2, LuVolumeX } from "react-icons/lu";

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
import Profesor from "../invasion/Profesor";

import "./zona.css";

/* =========================================================
   ZONAGAMIF · PANTALLA DEL JUEGO
   La pista baja de la salida (arriba) a la META (abajo). Solo
   se ve la parte cercana a la zona (como un campo de visión)
   y a un lado el mapa completo. En tu turno: tira el dado, mira
   a dónde llegaría cada ficha y toca la que quieras mover.
========================================================= */

const VISIBLES = 10; // filas que se ven a la vez
const OPCION = ["A", "B", "C", "D", "E", "F"];

// Cara del dado → flecha (igual que el dibujo del tablero)
const FLECHA_DADO = { 1: "↘", 2: "↓", 3: "→", 4: "←", 5: "↑", 6: "↙" };

// Dirección [filas, carriles] → flecha en la pantalla
function flecha([df, dc]) {
    const v = df < 0 ? "↑" : df > 0 ? "↓" : "";
    if (!dc) return v || "•";
    if (!df) return dc > 0 ? "→" : "←";
    if (df < 0) return dc > 0 ? "↗" : "↖";
    return dc > 0 ? "↘" : "↙";
}

const PUNTOS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };

function Dado({ valor, girando }) {
    return (
        <motion.span
            className="zn-dado"
            animate={girando ? { rotate: [0, 90, 180, 270, 360] } : { rotate: 0 }}
            transition={girando ? { duration: 0.45, repeat: Infinity, ease: "linear" } : { type: "spring" }}
            role="img"
            aria-label={valor ? `Dado: ${valor}, ${FLECHA_DADO[valor]}` : "Dado sin tirar"}
        >
            {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className={valor && PUNTOS[valor].includes(i + 1) ? "zn-punto" : ""} />
            ))}
        </motion.span>
    );
}

const TITULO_RESULTADO = {
    meta: "¡Llegó a la meta!",
    zona: "¡Solo en la zona!",
    ultimo: "¡Último en pie!",
};

const TEXTO_CELEBRACION = {
    meta: (n) => `🏁 ¡${n} llegó a la meta!`,
    zona: (n) => `👑 ¡${n} quedó solo en la zona!`,
    ultimo: (n) => `👑 ¡${n} es el último en pie!`,
};

const reloj = (s) => (s === null ? "--" : `${s} s`);

export default function Zona() {
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
    const [resultado, setResultado] = useState(null); // al fallar: el profesor
    const [aviso, setAviso] = useState(null); // al acertar: "¡Avanzas 2!"
    const [premio, setPremio] = useState(null);
    const [error, setError] = useState("");
    const [tirando, setTirando] = useState(false);
    const [ahora, setAhora] = useState(() => Date.now());
    // La zona se mueve un momento DESPUÉS de que la ficha llega (para que se entienda).
    const [zonaVista, setZonaVista] = useState(null);
    // Etiquetas que salen sobre las fichas ("🎲2 ↓", "⚠️ ↑2", "🟩 ¡Pared!"…)
    const [etiquetas, setEtiquetas] = useState([]);

    const desfase = useRef(0);
    const errorTimer = useRef(null);
    const avisoTimer = useRef(null);
    const anterior = useRef(null);
    const faseRef = useRef(null);
    const zonaVistaRef = useRef(false);

    const mostrarError = useCallback((message) => {
        clearTimeout(errorTimer.current);
        setError(message);
        errorTimer.current = setTimeout(() => setError(""), 2500);
    }, []);

    /* ---------------- Conexión ---------------- */

    useEffect(() => {
        const pedir = () => {
            socket.emit("sala:estado");
            socket.emit("zona:estado");
        };
        const alEstado = (estado) => {
            if (!estado) return setPartida(null);
            desfase.current = estado.ahora - Date.now();
            setTirando(false);
            if (estado.fase === "terminada") setPregunta(null);
            // Partida nueva: se borra lo de la anterior.
            if (faseRef.current === "terminada" && estado.fase === "jugando") {
                setPremio(null);
                setResultado(null);
            }
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
            if (r.acerto) {
                sonar("correcto");
                clearTimeout(avisoTimer.current);
                setAviso(
                    r.premio?.tipo === "poder"
                        ? `¡Atraviesa paredes ×${r.premio.n}! 🟩`
                        : r.premio?.tipo === "empuje"
                            ? "¡EMPUJÓN! 💥 Toca una ficha rival"
                            : `¡Correcto! Avanzas ${r.premio?.n || 1}`
                );
                avisoTimer.current = setTimeout(() => setAviso(null), 1800);
            } else {
                sonar("incorrecto");
                setResultado(r);
            }
        };
        const alError = ({ message }) => {
            setTirando(false);
            mostrarError(message);
        };
        const alPremio = (p) => {
            setPremio(p.recompensa);
            refreshUser();
        };
        const alSala = ({ sala: nueva }) => setSala(nueva);

        socket.on("connect", pedir);
        socket.on("zona:estado", alEstado);
        socket.on("zona:pregunta", alPregunta);
        socket.on("zona:resultado", alResultado);
        socket.on("zona:error", alError);
        socket.on("game:reward", alPremio);
        socket.on("sala:estado", alSala);

        if (socket.connected) pedir();
        else socket.connect();

        return () => {
            socket.off("connect", pedir);
            socket.off("zona:estado", alEstado);
            socket.off("zona:pregunta", alPregunta);
            socket.off("zona:resultado", alResultado);
            socket.off("zona:error", alError);
            socket.off("game:reward", alPremio);
            socket.off("sala:estado", alSala);
            clearTimeout(errorTimer.current);
            clearTimeout(avisoTimer.current);
        };
    }, [refreshUser, mostrarError]);

    useEffect(() => {
        const t = setInterval(() => setAhora(Date.now()), 250);
        return () => clearInterval(t);
    }, []);

    const zonaDesde = partida?.zona?.desde;
    const zonaHasta = partida?.zona?.hasta;
    useEffect(() => {
        if (zonaDesde === undefined) return;
        const nueva = { desde: zonaDesde, hasta: zonaHasta };
        // La primera vez se pone de una; después espera a que termine de moverse la ficha.
        const t = setTimeout(() => setZonaVista(nueva), zonaVistaRef.current ? 750 : 0);
        zonaVistaRef.current = true;
        return () => clearTimeout(t);
    }, [zonaDesde, zonaHasta]);

    const ultimo = partida?.ultimo;
    useEffect(() => {
        if (!ultimo?.en || !ultimo.etiqueta) return;
        const nuevas = [{ id: `${ultimo.en}`, texto: ultimo.etiqueta, userId: ultimo.userId, ficha: ultimo.ficha, tipo: ultimo.motivo }];
        for (const c of ultimo.cambiados || []) nuevas.push({ id: `${ultimo.en}-${c.userId}-${c.ficha}`, texto: "🔄 ¡Cambio!", userId: c.userId, ficha: c.ficha, tipo: "cambio" });
        setEtiquetas((e) => [...e.filter((x) => !nuevas.some((n) => n.userId === x.userId && n.ficha === x.ficha)), ...nuevas]);
        const ids = new Set(nuevas.map((n) => n.id));
        const t = setTimeout(() => setEtiquetas((e) => e.filter((x) => !ids.has(x.id))), 2200);
        return () => clearTimeout(t);
    }, [ultimo]);

    /* ---------------- Datos ---------------- */

    const porId = useMemo(() => new Map((partida?.jugadores || []).map((j) => [j.userId, j])), [partida]);
    const yo = porId.get(miId) || null;
    const miTurno = Boolean(partida && partida.turno === miId && partida.fase === "jugando" && !partida.empuje);
    const miEmpuje = Boolean(partida?.empuje && partida.empuje.userId === miId && partida.fase === "jugando");
    const servidorAhora = ahora + desfase.current;
    const restante = partida?.finEn ? Math.max(0, Math.ceil((partida.finEn - servidorAhora) / 1000)) : null;
    const restaPregunta = pregunta ? Math.max(0, (pregunta.hasta - servidorAhora) / 1000) : 0;
    const soyCreador = sala?.hostUserId === miId;
    const motivoOtra =
        sala?.motivoNoIniciar || (sala?.miembros.some((m) => !m.conectado) ? "Esperando a que todos se conecten." : null);
    const victoriasDe = (id) => (sala?.juego === "zona" ? sala.miembros.find((m) => String(m.userId) === id)?.victorias || 0 : 0);
    const nombre = (id) => porId.get(id)?.nombre || "";

    /* ---------------- Sonidos ---------------- */

    useEffect(() => {
        if (!partida) return;
        const antes = anterior.current;
        anterior.current = partida;
        if (!antes) return;
        const nuevos = partida.eventos.filter((e) => e.en > (antes.eventos.at(-1)?.en || 0));
        if (nuevos.some((e) => e.tipo === "dado")) sonar("dado");
        if (nuevos.some((e) => e.tipo === "trampa" && e.quien === miId)) sonar("eliminado");
        if (partida.ultimo?.en !== antes.ultimo?.en && partida.ultimo?.cambiados?.some((c) => c.userId === miId)) sonar("invadido");
        if (partida.turno === miId && antes.turno !== miId) sonar("turno");
        if (partida.fase === "celebrando" && antes.fase === "jugando") {
            sonar(partida.celebracion?.ganadores.includes(miId) ? "ganar" : "perder");
        }
        if (partida.ultimo?.en !== antes.ultimo?.en && partida.ultimo?.motivo === "empuje" && partida.ultimo.userId === miId) sonar("invadido");
    }, [partida, miId]);

    const avisoTiempo = (miTurno && partida?.dado === null && restante === 5) || (pregunta && Math.ceil(restaPregunta) === 5);
    useEffect(() => {
        if (avisoTiempo) sonar("tiempo");
    }, [avisoTiempo]);

    /* ---------------- Acciones ---------------- */

    const tirar = () => {
        setTirando(true);
        socket.emit("zona:tirar");
    };
    const mover = (ficha) => socket.emit("zona:mover", { ficha });
    const empujar = (userId, ficha) => socket.emit("zona:empujar", { userId, ficha });
    const responder = (k) => {
        if (elegida !== null) return;
        setElegida(k);
        socket.emit("zona:responder", { opcion: k });
    };
    const salir = () => {
        if (partida && partida.fase !== "terminada" && yo && !yo.salio) {
            if (!window.confirm("Si sales ahora pierdes la partida. ¿Salir?")) return;
            socket.emit("zona:salir");
        }
        navigate("/sala");
    };

    /* =====================================================
       PANTALLAS
    ===================================================== */

    if (partida === undefined) {
        return (
            <div className="ffp zn">
                <p className="zn-centrado" role="status">Cargando partida…</p>
            </div>
        );
    }
    if (partida === null) {
        return (
            <div className="ffp zn">
                <div className="zn-centrado ffp-panel">
                    <h1>No hay partida de ZonaGamif</h1>
                    <button type="button" className="ffp-btn" onClick={() => navigate("/sala")}>Ir a la sala</button>
                </div>
            </div>
        );
    }

    const { meta, carriles } = partida;
    const zona = zonaVista || partida.zona;
    // Ventana que se ve: desde una fila antes de la zona, 10 filas.
    const inicio = Math.max(0, Math.min(zona.desde - 1, partida.filas - VISIBLES));
    const filasVista = Array.from({ length: VISIBLES }, (_, k) => inicio + k);
    const turnoDe = porId.get(partida.turno);
    const opciones = miTurno ? partida.opciones || [] : [];
    const conPoder = (yo?.poder || 0) > 0;
    const celebrada = partida.celebracion?.ficha;
    const esObjetivo = (f) => miEmpuje && f.userId !== miId && f.fila > 0 && f.fila < meta;

    // Fichas que se ven, agrupadas por casilla para repartirlas dentro.
    const fichas = [];
    const fuera = [];
    for (const j of partida.jugadores) {
        if (j.salio) continue;
        j.fichas.forEach((f, i) => {
            const ficha = { ...f, enZona: f.fila >= zona.desde, userId: j.userId, i, color: j.color.hex, nombre: j.nombre };
            if (f.fila < inicio) fuera.push(ficha);
            else fichas.push(ficha);
        });
    }
    const porCasilla = new Map();
    for (const f of fichas) {
        const k = `${f.fila}-${f.carril}`;
        porCasilla.set(k, [...(porCasilla.get(k) || []), f]);
    }

    const mejorFila = (j) => Math.max(...j.fichas.map((f) => f.fila));
    const ranking = [...partida.jugadores].sort((a, b) => Number(a.salio) - Number(b.salio) || mejorFila(b) - mejorFila(a));

    return (
        <div className="ffp zn" style={{ "--mi-color": yo?.color?.hex || "#ffcf3e" }}>
            <main className="zn-main">
                {/* ================= JUGADORES ================= */}
                <aside className="zn-jugadores ffp-panel" aria-label="Jugadores">
                    <p className="zn-titulo">
                        <strong>ZONA<span>GAMIF</span></strong>
                        <small>{partida.tema}</small>
                    </p>
                    <ol>
                        {ranking.map((j) => {
                            const enZona = j.fichas.some((f) => f.fila >= zona.desde);
                            return (
                                <li
                                    key={j.userId}
                                    className={[
                                        "zn-jugador",
                                        j.userId === miId && "zn-jugador-yo",
                                        j.userId === partida.turno && "zn-jugador-turno",
                                        (!enZona || j.salio) && "zn-jugador-fuera",
                                    ].filter(Boolean).join(" ")}
                                    style={{ "--c": j.color.hex }}
                                >
                                    <BurbujaEmoji dato={emojis[j.userId]} className="zn-emoji" />
                                    <span className="zn-foto"><AssetImage src={j.avatar} type="player" alt="" /></span>
                                    <span className="zn-jugador-texto">
                                        <strong>
                                            {j.nombre}
                                            <Verificado activo={j.verificado} />
                                            <HablandoMarca activo={hablando?.userId === j.userId} />
                                        </strong>
                                        <small>
                                            {j.salio
                                                ? "Salió"
                                                : partida.respondiendo === j.userId
                                                    ? "Respondiendo ❓"
                                                    : !enZona
                                                        ? "Fuera de la zona"
                                                        : `Fila ${mejorFila(j) + 1} de ${meta + 1}`}
                                            {j.poder > 0 && <span className="zn-poder-chip" title="Atraviesa paredes">{`🟩×${j.poder}`}</span>}
                                            {victoriasDe(j.userId) > 0 && <span className="zn-victorias"><LuTrophy aria-hidden="true" />{victoriasDe(j.userId)}</span>}
                                        </small>
                                    </span>
                                    {j.userId !== miId && <AccionesJugador userId={j.userId} nombre={j.nombre} contexto="zona" className="zn-acciones" />}
                                </li>
                            );
                        })}
                    </ol>
                </aside>

                {/* ================= PISTA ================= */}
                <section className="zn-pista-zona" aria-label="Pista">
                    {fuera.length > 0 && (
                        <div className="zn-fuera" aria-label="Fichas fuera de la vista">
                            <small>Atrás</small>
                            {fuera.map((f) => (
                                <span key={`${f.userId}-${f.i}`} className="zn-ficha-mini" style={{ "--c": f.color }} title={`${f.nombre} · fila ${f.fila + 1}`}>
                                    {f.i + 1}
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="zn-pista-fila">
                        <div
                            className={`zn-pista ${conPoder ? "zn-pista-poder" : ""}`}
                            style={{ "--filas": VISIBLES, "--carriles": carriles, aspectRatio: `${carriles} / ${VISIBLES}` }}
                            aria-label={conPoder ? `Puedes atravesar las paredes ${yo.poder} veces` : undefined}
                        >
                            {filasVista.map((fila) => {
                                const fueraZona = fila < zona.desde;
                                return partida.casillas[fila].map((c, carril) => (
                                    <div
                                        key={`${fila}-${carril}`}
                                        className={[
                                            "zn-casilla",
                                            fila === meta && "zn-casilla-meta",
                                            fueraZona && "zn-casilla-niebla",
                                            fila >= zona.desde && fila <= zona.hasta && "zn-casilla-zona",
                                            c?.tipo === "pregunta" && "zn-casilla-pregunta",
                                            c?.tipo === "trampa" && (c.d[0] > 0 ? "zn-casilla-atajo" : "zn-casilla-trampa"),
                                        ].filter(Boolean).join(" ")}
                                        style={{ gridRow: fila - inicio + 1, gridColumn: carril + 1 }}
                                    >
                                        {fila === meta ? (
                                            carril === 0 && <LuFlag className="zn-bandera" aria-hidden="true" />
                                        ) : c?.tipo === "pregunta" ? (
                                            <span className="zn-icono-pregunta" aria-label="Pregunta">?</span>
                                        ) : c?.tipo === "trampa" ? (
                                            <span className="zn-icono-trampa" aria-label={`${c.d[0] > 0 ? "Atajo" : "Trampa"} ${flecha(c.d)} ${c.n}`}>
                                                {flecha(c.d)}
                                                <b>{c.n}</b>
                                            </span>
                                        ) : null}
                                    </div>
                                ));
                            })}

                            {/* Marco de la zona */}
                            <div
                                className="zn-marco-zona"
                                style={{
                                    top: `${(100 * (zona.desde - inicio)) / VISIBLES}%`,
                                    height: `${(100 * (Math.min(zona.hasta, inicio + VISIBLES - 1) - zona.desde + 1)) / VISIBLES}%`,
                                }}
                                aria-hidden="true"
                            >
                                <span>ZONA</span>
                            </div>

                            {/* Destinos posibles de mis fichas */}
                            {opciones.map((o) =>
                                o && o.fila >= inicio ? (
                                    <button
                                        key={`d${o.ficha}`}
                                        type="button"
                                        className={`zn-destino ${o.atraviesa ? "zn-destino-poder" : ""}`}
                                        style={{ left: `${(100 * (o.carril + 0.5)) / carriles}%`, top: `${(100 * (o.fila - inicio + 0.5)) / VISIBLES}%` }}
                                        onClick={() => mover(o.ficha)}
                                        aria-label={`Mover ficha ${o.ficha + 1} aquí${o.atraviesa ? " (atraviesa la pared)" : ""}`}
                                    >
                                        {o.ficha + 1}
                                    </button>
                                ) : null
                            )}

                            {/* Fichas */}
                            {fichas.map((f) => {
                                const grupo = porCasilla.get(`${f.fila}-${f.carril}`);
                                const k = grupo.indexOf(f);
                                const muchas = grupo.length > 1;
                                const dx = muchas ? ((k % 2) - 0.5) * 0.42 : 0;
                                const dy = muchas ? (Math.floor(k / 2) - (Math.ceil(grupo.length / 2) - 1) / 2) * 0.42 : 0;
                                const mia = f.userId === miId;
                                const puede = mia && opciones[f.i];
                                const objetivo = esObjetivo(f);
                                const corona = celebrada && celebrada.userId === f.userId && celebrada.i === f.i;
                                return (
                                    <button
                                        key={`${f.userId}-${f.i}`}
                                        type="button"
                                        className={[
                                            "zn-ficha",
                                            muchas && "zn-ficha-chica",
                                            mia && "zn-ficha-mia",
                                            !f.enZona && "zn-ficha-fuera",
                                            puede && "zn-ficha-puede",
                                            objetivo && "zn-ficha-objetivo",
                                            corona && "zn-ficha-corona",
                                        ].filter(Boolean).join(" ")}
                                        style={{
                                            "--c": f.color,
                                            left: `calc(${(100 * (f.carril + 0.5)) / carriles}% + ${dx} * var(--celda))`,
                                            top: `calc(${(100 * (f.fila - inicio + 0.5)) / VISIBLES}% + ${dy} * var(--celda))`,
                                        }}
                                        onClick={() => (objetivo ? empujar(f.userId, f.i) : puede && mover(f.i))}
                                        disabled={!puede && !objetivo}
                                        aria-label={`${mia ? "Tu" : `${f.nombre}:`} ficha ${f.i + 1}, fila ${f.fila + 1}${puede ? ". Mover" : objetivo ? ". Empujar" : ""}`}
                                    >
                                        {f.i + 1}
                                        {corona && <LuCrown className="zn-corona" aria-hidden="true" />}
                                    </button>
                                );
                            })}

                            {/* Lo que acaba de pasar, sobre la ficha */}
                            {etiquetas.map((e) => {
                                const f = porId.get(e.userId)?.fichas[e.ficha];
                                if (!f || f.fila < inicio || f.fila >= inicio + VISIBLES) return null;
                                return (
                                    <span
                                        key={e.id}
                                        className={`zn-etiqueta zn-etiqueta-${e.tipo}`}
                                        style={{ left: `${(100 * (f.carril + 0.5)) / carriles}%`, top: `${(100 * (f.fila - inicio + 0.5)) / VISIBLES}%` }}
                                        role="status"
                                    >
                                        {e.texto}
                                    </span>
                                );
                            })}
                        </div>

                        {/* Mapa completo de la pista */}
                        <div className="zn-mapa" aria-hidden="true">
                            <span className="zn-mapa-zona" style={{ top: `${(100 * zona.desde) / partida.filas}%`, height: `${(100 * (zona.hasta - zona.desde + 1)) / partida.filas}%` }} />
                            <span className="zn-mapa-vista" style={{ top: `${(100 * inicio) / partida.filas}%`, height: `${(100 * VISIBLES) / partida.filas}%` }} />
                            {partida.jugadores.filter((j) => !j.salio).flatMap((j) =>
                                j.fichas.map((f, i) => (
                                    <i key={`${j.userId}-${i}`} style={{ "--c": j.color.hex, top: `${(100 * (f.fila + 0.5)) / partida.filas}%`, left: `${(100 * (f.carril + 0.5)) / carriles}%` }} />
                                ))
                            )}
                            <LuFlag className="zn-mapa-meta" />
                        </div>
                    </div>
                </section>

                {/* ================= LADO: controles y acción ================= */}
                <aside className="zn-lado" aria-label="Partida">
                    <div className="zn-controles">
                        <button type="button" className="ffl-icono" onClick={salir} aria-label={partida.fase === "terminada" ? "Volver a la sala" : "Salir de la partida"} title="Salir">
                            <LuArrowLeft aria-hidden="true" />
                        </button>
                        <span className={`zn-reloj ${restante !== null && restante <= 5 ? "zn-reloj-urgente" : ""}`}>
                            <LuClock aria-hidden="true" />
                            {reloj(restante)}
                        </span>
                        <SelectorEmojis />
                        <BotonHablar className="zn-hablar" />
                        <button type="button" className="ffl-icono" onClick={alternarSonido} aria-label={sonido ? "Silenciar" : "Activar sonido"}>
                            {sonido ? <LuVolume2 aria-hidden="true" /> : <LuVolumeX aria-hidden="true" />}
                        </button>
                    </div>

                    <section className="zn-accion ffp-panel" aria-live="polite">
                        <Dado valor={partida.dado} girando={tirando} />
                        {miEmpuje ? (
                            <>
                                <strong className="zn-accion-titulo zn-empuje-titulo">{`💥 ¡EMPUJÓN! Toca una ficha rival (−${partida.empuje.filas})`}</strong>
                                <div className="zn-empuje-lista">
                                    {partida.jugadores
                                        .filter((j) => j.userId !== miId && !j.salio)
                                        .flatMap((j) =>
                                            j.fichas.map((f, i) =>
                                                f.fila > 0 && f.fila < meta ? (
                                                    <button key={`${j.userId}-${i}`} type="button" className="zn-elegir-btn zn-empuje-btn" onClick={() => empujar(j.userId, i)}>
                                                        <span className="zn-ficha-mini" style={{ "--c": j.color.hex }}>{i + 1}</span>
                                                        {`${j.nombre.slice(0, 8)} · F${f.fila + 1}`}
                                                    </button>
                                                ) : null
                                            )
                                        )}
                                </div>
                            </>
                        ) : partida.fase === "celebrando" && partida.celebracion ? (
                            <strong className="zn-accion-titulo zn-celebra-texto">
                                {(TEXTO_CELEBRACION[partida.celebracion.tipo] || TEXTO_CELEBRACION.zona)(nombre(partida.celebracion.ganadores[0]))}
                            </strong>
                        ) : miTurno && partida.dado === null ? (
                            <>
                                <strong className="zn-accion-titulo">¡Es tu turno!</strong>
                                <button type="button" className="ffp-btn zn-tirar" onClick={tirar} disabled={tirando}>
                                    <LuDices aria-hidden="true" />
                                    Tirar dado
                                </button>
                            </>
                        ) : miTurno && partida.dado !== null && opciones.some(Boolean) ? (
                            <>
                                <strong className="zn-accion-titulo">{`${FLECHA_DADO[partida.dado]} ¿Qué ficha mueves?`}</strong>
                                <div className="zn-elegir">
                                    {[0, 1].map((i) => (
                                        <button key={i} type="button" className="zn-elegir-btn" onClick={() => mover(i)} disabled={!opciones[i]}>
                                            <span className="zn-ficha-mini" style={{ "--c": yo.color.hex }}>{i + 1}</span>
                                            {opciones[i] ? `Fila ${opciones[i].fila + 1}${opciones[i].atraviesa ? " 🟩" : ""}` : "No puede"}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <strong className="zn-accion-titulo zn-suave">
                                {partida.fase === "terminada"
                                    ? "Partida terminada"
                                    : partida.empuje
                                        ? `${nombre(partida.empuje.userId)} va a empujar a alguien 💥`
                                        : partida.respondiendo
                                        ? `${nombre(partida.respondiendo)} responde ❓`
                                        : turnoDe
                                            ? `Turno de ${turnoDe.nombre}`
                                            : "…"}
                            </strong>
                        )}
                    </section>

                    <ul className="zn-leyenda" aria-label="Qué hace cada número del dado">
                        {Object.entries(FLECHA_DADO).map(([n, f]) => (
                            <li key={n} className={Number(n) === partida.dado ? "zn-leyenda-activa" : ""}>
                                <b>{n}</b>
                                {f}
                            </li>
                        ))}
                    </ul>

                    <ol className="zn-eventos">
                        {[...partida.eventos].slice(-4).reverse().map((e) => (
                            <li key={e.en + e.texto} className={`zn-evento zn-evento-${e.tipo}`} style={{ "--c": e.quien ? porId.get(e.quien)?.color.hex : undefined }}>
                                {e.texto}
                            </li>
                        ))}
                    </ol>
                </aside>
            </main>

            {/* ================= PREGUNTA ================= */}
            <AnimatePresence>
                {pregunta && (
                    <motion.div className="zn-capa" key={pregunta.hasta} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.section
                            className="zn-pregunta"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="zn-pregunta-texto"
                            initial={{ scale: 0.8, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 320, damping: 24 }}
                        >
                            <header className="zn-pregunta-cabeza">
                                <span className="zn-pregunta-chip">❓ Acierta y avanza</span>
                                <span className={`zn-pregunta-reloj ${restaPregunta <= 5 ? "zn-urgente" : ""}`}>
                                    <LuClock aria-hidden="true" />
                                    {Math.ceil(restaPregunta)}
                                </span>
                            </header>
                            <div className="zn-pregunta-barra" aria-hidden="true">
                                <span style={{ width: `${Math.min(100, (100 * restaPregunta) / pregunta.segundos)}%` }} />
                            </div>
                            <h2 id="zn-pregunta-texto">{pregunta.texto}</h2>
                            <div className={`zn-opciones ${pregunta.opciones.length > 2 ? "zn-opciones-4" : ""}`}>
                                {pregunta.opciones.map((o, k) => (
                                    <button key={k} type="button" className={`zn-opcion ${elegida === k ? "zn-opcion-elegida" : ""}`} onClick={() => responder(k)} disabled={elegida !== null}>
                                        <b>{OPCION[k]}</b>
                                        <span>{o}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.section>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {aviso && (
                    <motion.p className="zn-aviso" role="status" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, y: -20 }}>
                        {aviso}
                    </motion.p>
                )}
            </AnimatePresence>

            {/* ================= PROFESOR ================= */}
            <AnimatePresence>
                {resultado && partida.fase !== "terminada" && (
                    <motion.div className="zn-profesor-capa" initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}>
                        <Profesor
                            resultado={resultado}
                            pie={`Retrocedes ${resultado.retrocede || 1}. La partida sigue mientras lees.`}
                            alCerrar={() => setResultado(null)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ================= ¡GANÓ! (antes de la ventana final) ================= */}
            <AnimatePresence>
                {partida.fase === "celebrando" && partida.celebracion && (
                    <motion.p
                        className="zn-celebra"
                        role="status"
                        initial={{ scale: 0.3, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 16 }}
                        style={{ "--c": porId.get(partida.celebracion.ganadores[0])?.color.hex || "#ffcf3e" }}
                    >
                        {(TEXTO_CELEBRACION[partida.celebracion.tipo] || TEXTO_CELEBRACION.zona)(nombre(partida.celebracion.ganadores[0]))}
                    </motion.p>
                )}
            </AnimatePresence>

            {/* ================= FINAL ================= */}
            {partida.fase === "terminada" && (
                <div className="zn-capa">
                    <section className="zn-final ffp-panel" aria-label="Resultado">
                        <header>
                            <h1>{TITULO_RESULTADO[partida.resultado?.tipo] || "Partida terminada"}</h1>
                            <p>
                                {partida.resultado?.ganadores.includes(miId)
                                    ? "¡Ganaste!"
                                    : partida.resultado?.ganadores.length
                                        ? `Ganó ${partida.resultado.ganadores.map(nombre).join(" y ")}`
                                        : "Nadie ganó."}
                            </p>
                        </header>
                        <ol className="zn-podio">
                            {ranking.filter((j) => !j.salio).map((j, n) => (
                                <li key={j.userId} style={{ "--c": j.color.hex }} className={partida.resultado?.ganadores.includes(j.userId) ? "zn-podio-gano" : ""}>
                                    <span className="zn-puesto">{n + 1}</span>
                                    <span className="zn-foto"><AssetImage src={j.avatar} type="player" alt="" /></span>
                                    <strong>{j.nombre}{j.userId === miId && " (tú)"}</strong>
                                    <small>{`${j.aciertos} ✓ · ${j.errores} ✗`}</small>
                                    <b>{`Fila ${mejorFila(j) + 1}`}</b>
                                </li>
                            ))}
                        </ol>
                        <div className="zn-final-premio">
                            {premio ? (
                                premio.limite_diario_alcanzado ? (
                                    <span className="zn-suave">Límite de premios de hoy.</span>
                                ) : (
                                    <Recompensas xp={premio.xp} oro={premio.oro} diamantes={premio.diamantes} grande />
                                )
                            ) : (
                                yo && !yo.salio && <span className="zn-suave">Guardando premio…</span>
                            )}
                            {premio?.subio_nivel && <strong className="zn-subio">{`🎉 ¡Nivel ${premio.nivel_nuevo}!`}</strong>}
                        </div>
                        <div className="zn-final-botones">
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
                                <span className="zn-suave">El creador puede iniciar otra.</span>
                            )}
                            <button type="button" className="ffp-btn ffp-btn-2" onClick={() => navigate("/sala")}>
                                Volver a la sala
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {error && <p className="zn-error" role="alert">{error}</p>}
        </div>
    );
}
