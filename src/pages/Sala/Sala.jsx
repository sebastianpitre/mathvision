import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Canvas, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
    LuCheck,
    LuCopy,
    LuCrown,
    LuDoorOpen,
    LuGamepad2,
    LuLogIn,
    LuPlay,
    LuPlus,
    LuRepeat,
    LuTrophy,
    LuUserPlus,
    LuUserX,
    LuUsers,
    LuWifiOff,
    LuX,
} from "react-icons/lu";

import MainNav from "../../components/navigation/MainNav";
import AssetImage from "../../components/common/AssetImage";
import ProtegerError from "../../components/common/ProtegerError";
import { BurbujaEmoji, SelectorEmojis } from "../../components/common/Emojis";
import { useEmojisSala } from "../../components/common/useEmojisSala";
import { useJugadoresEnLinea, ESTADOS } from "../../hooks/useJugadoresEnLinea";
import { useInvitar } from "../../hooks/useInvitar";
import VRMCharacter from "../../components/character/VRMCharacter";
import LucesPersonaje from "../../components/character/LucesPersonaje";
import { useAuth } from "../../context/AuthContext";
import { socket } from "../../services/socket";
import assets from "../../data/mock/assets.json";

import "../../styles/ludo.css";
import "./sala.css";

/* =========================================================
   SALA MULTIJUGADOR
   ---------------------------------------------------------
   · Se ven los personajes 3D de todos los que están.
   · El creador elige el juego y lo inicia cuando la cantidad
     de jugadores sirve para ese juego.
   · Cualquiera puede invitar a jugadores conectados o
     compartir el código de la sala.
   · El creador puede sacar a alguien antes de iniciar.
   · El juego se elige en una ventana (solo el creador), así
     la lista para invitar ocupa toda la columna derecha.
   · Emojis: aparecen sobre el personaje de quien los envía.
========================================================= */

const PUESTOS_MINIMOS = 4;
const MAX_POR_DEFECTO = 8;
const MODELO_POR_DEFECTO = "/models/characters/Adan2.vrm";

/*
 * Cuántos puestos se muestran: mínimo 4, y siempre uno libre
 * ("Esperando jugador") mientras la sala no esté llena.
 */
function cantidadPuestos(miembros, maximo) {
    return Math.min(maximo, Math.max(PUESTOS_MINIMOS, miembros + 1));
}

/* Los puestos del escenario, repartidos a lo ancho de la vista. */
function Escenario({ miembros, puestos }) {
    const { viewport } = useThree();
    const ancho = viewport.width;
    const escala = Math.min(1.45, ancho / puestos / 0.62);

    return (
        <>
            <LucesPersonaje calida />
            {miembros.map((m, i) => {
                const x = -ancho / 2 + (ancho * (i + 0.5)) / puestos;
                // Un modelo 3D solo se puede mostrar una vez: si dos
                // jugadores usan el mismo personaje, cada uno carga su copia.
                const url = `${m.modelo || MODELO_POR_DEFECTO}#jugador-${m.userId}`;

                return (
                    <ProtegerError key={m.userId} respaldo={null}>
                        <Suspense
                            fallback={
                                <Html center position={[x, 0, 0]} style={{ pointerEvents: "none" }}>
                                    <span className="sl-cargando-3d">Cargando…</span>
                                </Html>
                            }
                        >
                            <VRMCharacter url={url} scale={escala} position={[x, -1.55, 0]} rotation={[0, 0, 0]} />
                        </Suspense>
                    </ProtegerError>
                );
            })}
        </>
    );
}

export default function Sala() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [sala, setSala] = useState(undefined); // undefined = cargando, null = sin sala
    const [codigo, setCodigo] = useState("");
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const { jugadores: conectados } = useJugadoresEnLinea();
    const { invitar: enviarInvitacion, espera } = useInvitar();
    const [copiado, setCopiado] = useState(false);
    const [porSacar, setPorSacar] = useState(null); // userId que el creador está por sacar
    const [eligiendoJuego, setEligiendoJuego] = useState(false);
    const emojis = useEmojisSala();

    const avisoTimer = useRef(null);
    const crearAlEntrar = useRef(Boolean(location.state?.crear));
    // Desde el botón INICIAR del lobby llega el juego que se quiere jugar.
    const juegoPedido = useRef(location.state?.juego || null);

    const avisar = useCallback((texto, tono = "ok", ms = 3500) => {
        clearTimeout(avisoTimer.current);
        setAviso({ texto, tono });
        avisoTimer.current = setTimeout(() => setAviso({ texto: "", tono: "" }), ms);
    }, []);

    const miId = String(user?.id ?? "");

    /* ---------------- Conexión ---------------- */

    useEffect(() => {
        const alConectar = () => socket.emit("sala:estado");

        const alEstado = ({ sala: nueva }) => {
            if (nueva === null && crearAlEntrar.current) {
                crearAlEntrar.current = false;
                socket.emit("sala:crear");
                return;
            }
            crearAlEntrar.current = false;

            // Si soy el creador, se pone el juego que elegí en el lobby.
            if (nueva && juegoPedido.current && nueva.hostUserId === miId && nueva.estado === "sala") {
                if (nueva.juego !== juegoPedido.current) socket.emit("sala:elegirJuego", { juego: juegoPedido.current });
                juegoPedido.current = null;
            }

            setSala(nueva);
        };

        // Las invitaciones y sus avisos se muestran en cualquier
        // pantalla (Notificaciones); aquí solo lo de la sala.
        const alError = ({ message }) => avisar(message, "error", 4500);
        const alExpulsado = ({ message }) => avisar(message, "error", 6000);

        socket.on("connect", alConectar);
        socket.on("sala:estado", alEstado);
        socket.on("sala:error", alError);
        socket.on("sala:expulsado", alExpulsado);

        if (socket.connected) alConectar();
        else socket.connect();

        return () => {
            socket.off("connect", alConectar);
            socket.off("sala:estado", alEstado);
            socket.off("sala:error", alError);
            socket.off("sala:expulsado", alExpulsado);
            clearTimeout(avisoTimer.current);
        };
    }, [avisar, miId]);

    /* ---------------- Datos ---------------- */

    const miembros = sala?.miembros || [];
    const soyCreador = sala?.hostUserId === miId;
    const juegoActual = sala?.juegos?.find((j) => j.id === sala.juego) || null;
    const enSala = new Set(miembros.map((m) => String(m.userId)));
    const invitables = conectados.filter((p) => !enSala.has(String(p.id)));
    const maximo = sala?.maxJugadores || MAX_POR_DEFECTO;
    const llena = miembros.length >= maximo;

    const textoJugadores = (j) => (j.min === j.max ? `${j.min} jugadores` : `${j.min} a ${j.max} jugadores`);

    const totalPuestos = cantidadPuestos(miembros.length, maximo);
    const puestos = Array.from({ length: totalPuestos }, (_, i) => miembros[i] || null);
    const puedeSacar = soyCreador && sala?.estado === "sala";

    /* ---------------- Acciones ---------------- */

    const copiarCodigo = async () => {
        try {
            await navigator.clipboard.writeText(sala.code);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1800);
        } catch {
            avisar(`Código de la sala: ${sala.code}`);
        }
    };

    const invitar = (jugador) => {
        if (llena) return avisar("La sala ya está llena.", "error");
        enviarInvitacion(jugador);
    };

    const elegirJuego = (juego) => {
        socket.emit("sala:elegirJuego", { juego });
        setEligiendoJuego(false);
    };

    // La ventana de juegos se cierra con Escape.
    useEffect(() => {
        if (!eligiendoJuego) return;
        const tecla = (e) => e.key === "Escape" && setEligiendoJuego(false);
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [eligiendoJuego]);

    const sacar = (userId) => {
        socket.emit("sala:expulsar", { userId });
        setPorSacar(null);
    };

    const salir = () => {
        socket.emit("sala:salir");
        navigate("/lobby");
    };

    /* =====================================================
       PANTALLAS
    ===================================================== */

    const fondo = (
        <div className="lb-bg" aria-hidden="true" style={{ backgroundImage: `url(${assets.backgrounds.lobby})` }} />
    );

    if (sala === undefined) {
        return (
            <div className="lg">
                {fondo}
                <MainNav />
                <main className="lg-main" style={{ justifyContent: "center", alignItems: "center" }}>
                    <span className="lg-spinner" role="status" aria-label="Cargando sala" />
                </main>
            </div>
        );
    }

    if (sala === null) {
        return (
            <div className="lg">
                {fondo}
                <MainNav />
                <main className="lg-main sl-vacia">
                    <section className="lb-card sl-vacia-caja">
                        <p className="lb-eyebrow">
                            <LuUsers aria-hidden="true" />
                            <span>Multijugador</span>
                        </p>
                        <h1 className="lg-h1">Juega con tus amigos</h1>
                        <p className="lb-muted">
                            Crea una sala, invita de 1 a 7 amigos y elige el juego. También puedes entrar con el
                            código que te compartan.
                        </p>

                        <button type="button" className="lb-btn lb-btn-primary lb-btn-block" onClick={() => socket.emit("sala:crear")}>
                            <LuPlus aria-hidden="true" />
                            Crear una sala
                        </button>

                        <form
                            className="sl-unirse"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (codigo.trim()) socket.emit("sala:unirse", { codigo: codigo.trim() });
                            }}
                        >
                            <label className="lg-field" style={{ flex: 1 }}>
                                <span>Código de la sala</span>
                                <input
                                    className="lg-input sl-codigo-input"
                                    value={codigo}
                                    maxLength={5}
                                    autoCapitalize="characters"
                                    placeholder="Ej: K7Q2M"
                                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                                />
                            </label>
                            <button type="submit" className="lb-btn lb-btn-secondary" disabled={codigo.trim().length < 5}>
                                <LuLogIn aria-hidden="true" />
                                Entrar
                            </button>
                        </form>

                        {aviso.texto && (
                            <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>
                        )}
                    </section>
                </main>
            </div>
        );
    }

    return (
        <div className="lg">
            {fondo}
            <MainNav />

            <main className="sl-main">
                {/* ================= IZQUIERDA ================= */}
                <aside className="sl-col">
                    <section className="lb-card sl-codigo">
                        <p className="lb-eyebrow">
                            <LuGamepad2 aria-hidden="true" />
                            <span>Sala</span>
                        </p>
                        <div className="sl-codigo-fila">
                            <strong className="sl-codigo-valor" aria-label={`Código ${sala.code.split("").join(" ")}`}>
                                {sala.code}
                            </strong>
                            <button type="button" className="lb-icon-btn" onClick={copiarCodigo} aria-label="Copiar código" title="Copiar código">
                                {copiado ? <LuCheck aria-hidden="true" /> : <LuCopy aria-hidden="true" />}
                            </button>
                        </div>
                        <p className="lb-muted">Compártelo para que entren.</p>
                        <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm lb-btn-block" onClick={salir}>
                            <LuDoorOpen aria-hidden="true" />
                            Salir de la sala
                        </button>
                    </section>

                    <section className="lb-card sl-lista-card" aria-labelledby="sl-jugadores">
                        <div className="sl-card-head">
                            <h2 id="sl-jugadores" className="lg-card-title">Jugadores</h2>
                            <span className="lb-count">{`${miembros.length}/${sala.maxJugadores}`}</span>
                        </div>
                        <ul className="sl-lista">
                            {miembros.map((m) => (
                                <li key={m.userId} className={`sl-jugador ${m.conectado ? "" : "sl-desconectado"}`}>
                                    <span className="lb-avatar">
                                        <AssetImage src={m.avatar} type="player" alt="" />
                                    </span>
                                    <span className="sl-jugador-datos">
                                        <strong>
                                            {m.nombre}
                                            {String(m.userId) === miId && <span className="sl-tu"> (tú)</span>}
                                        </strong>
                                        <small>
                                            {m.conectado ? `Nivel ${m.nivel}` : "Reconectando…"}
                                            {m.victorias > 0 && (
                                                <span className="sl-victorias" title={`Partidas ganadas en esta sala (${juegoActual?.nombre || ""})`}>
                                                    <LuTrophy aria-hidden="true" />
                                                    {m.victorias}
                                                    <span className="lb-sr-only"> ganadas</span>
                                                </span>
                                            )}
                                        </small>
                                    </span>
                                    {m.esCreador && (
                                        <span className="sl-creador" title="Creador de la sala">
                                            <LuCrown aria-hidden="true" />
                                            <span className="lb-sr-only">Creador</span>
                                        </span>
                                    )}
                                    {!m.conectado && <LuWifiOff aria-hidden="true" className="sl-icono-off" />}
                                    {puedeSacar && String(m.userId) !== miId && (
                                        porSacar === m.userId ? (
                                            <span className="sl-sacar-confirmar">
                                                <button type="button" className="lb-btn lb-btn-sm sl-btn-sacar" onClick={() => sacar(m.userId)}>
                                                    Sacar
                                                </button>
                                                <button type="button" className="lb-icon-btn sl-sacar-no" onClick={() => setPorSacar(null)} aria-label="No sacar">
                                                    <LuX aria-hidden="true" />
                                                </button>
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                className="lb-icon-btn sl-sacar"
                                                onClick={() => setPorSacar(m.userId)}
                                                aria-label={`Sacar a ${m.nombre} de la sala`}
                                                title="Sacar de la sala"
                                            >
                                                <LuUserX aria-hidden="true" />
                                            </button>
                                        )
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                </aside>

                {/* ================= CENTRO ================= */}
                <section className="sl-centro">
                    <div className="sl-escenario" role="img" aria-label={`Personajes de la sala: ${miembros.map((m) => m.nombre).join(", ")}`}>
                        <ProtegerError respaldo={<p className="sin-3d">Los personajes 3D no se pudieron mostrar en este dispositivo.</p>}>
                            <Canvas gl={{ alpha: true }} camera={{ position: [0, 1.15, 6.2], fov: 32 }}>
                                <Escenario miembros={miembros} puestos={totalPuestos} />
                            </Canvas>
                        </ProtegerError>

                        {/* Emojis sobre la cabeza de cada personaje */}
                        <div className="sl-emojis" style={{ gridTemplateColumns: `repeat(${totalPuestos}, minmax(0, 1fr))` }} aria-hidden="true">
                            {puestos.map((m, i) => (
                                <span key={m?.userId ?? `e-${i}`} className="sl-emoji-puesto">
                                    {m && <BurbujaEmoji dato={emojis[String(m.userId)]} />}
                                </span>
                            ))}
                        </div>

                        <SelectorEmojis className="sl-selector-emojis" />

                        <ol
                            className={`sl-puestos ${totalPuestos > 5 ? "sl-puestos-muchos" : ""}`}
                            style={{ gridTemplateColumns: `repeat(${totalPuestos}, minmax(0, 1fr))` }}
                        >
                            {puestos.map((m, i) => (
                                <li key={m?.userId ?? `vacio-${i}`} className={m ? "sl-puesto" : "sl-puesto sl-puesto-vacio"}>
                                    {m ? (
                                        <span className="sl-etiqueta">
                                            {m.esCreador && <LuCrown aria-hidden="true" />}
                                            <strong>{m.nombre}</strong>
                                            {m.victorias > 0 ? (
                                                <small className="sl-etiqueta-victorias">{`🏆 ${m.victorias}`}</small>
                                            ) : (
                                                <small>{`Nv ${m.nivel}`}</small>
                                            )}
                                        </span>
                                    ) : (
                                        <span className="sl-espera">
                                            <LuUserPlus aria-hidden="true" />
                                            Esperando jugador
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="lb-card sl-inicio">
                        <div className="sl-inicio-juego">
                            <p className="lb-eyebrow">Juego</p>
                            <div className="sl-inicio-fila">
                                <strong className="sl-inicio-nombre">{juegoActual?.nombre || "Sin elegir"}</strong>
                                {juegoActual && <span className="lg-tag">{textoJugadores(juegoActual)}</span>}
                                {soyCreador && sala.estado === "sala" && (
                                    <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => setEligiendoJuego(true)}>
                                        <LuRepeat aria-hidden="true" />
                                        Cambiar
                                    </button>
                                )}
                            </div>
                            <span className="lb-muted">
                                {sala.estado === "jugando"
                                    ? "Partida en curso…"
                                    : sala.motivoNoIniciar || "¡Todo listo para jugar!"}
                            </span>
                        </div>

                        {sala.estado === "jugando" ? (
                            <button type="button" className="lb-btn lb-btn-primary" onClick={() => juegoActual && navigate(juegoActual.ruta)}>
                                <LuPlay aria-hidden="true" />
                                Volver a la partida
                            </button>
                        ) : soyCreador ? (
                            <button
                                type="button"
                                className="lb-btn lb-btn-primary sl-btn-iniciar"
                                disabled={Boolean(sala.motivoNoIniciar) || miembros.some((m) => !m.conectado)}
                                onClick={() => socket.emit("sala:iniciar")}
                            >
                                <LuPlay aria-hidden="true" />
                                Iniciar partida
                            </button>
                        ) : (
                            <span className="sl-espera-creador">El creador inicia…</span>
                        )}
                    </div>
                </section>

                {/* ================= DERECHA ================= */}
                <aside className="sl-col">
                    <section className="lb-card sl-lista-card sl-invitar" aria-labelledby="sl-invitar">
                        <div className="sl-card-head">
                            <h2 id="sl-invitar" className="lg-card-title">Invitar</h2>
                            <span className="lb-count">{invitables.length}</span>
                        </div>
                        {invitables.length === 0 ? (
                            <p className="lb-muted sl-vacio">Nadie más conectado. Comparte el código.</p>
                        ) : (
                            <ul className="sl-lista">
                                {invitables.map((p) => {
                                    const jugando = p.status === "playing";
                                    const segundos = espera(p.id);

                                    return (
                                        <li key={p.id} className="sl-jugador">
                                            <span className="lb-avatar">
                                                <AssetImage src={p.avatar} type="player" alt="" />
                                            </span>
                                            <span className="sl-jugador-datos">
                                                <strong>{p.name}</strong>
                                                <small>{(ESTADOS[p.status] || ESTADOS.available).texto}</small>
                                            </span>
                                            <button
                                                type="button"
                                                className="lb-btn lb-btn-primary lb-btn-sm"
                                                disabled={jugando || segundos !== 0 || llena || sala.estado !== "sala"}
                                                onClick={() => invitar(p)}
                                                title={segundos > 0 ? `Puedes invitar otra vez en ${segundos} s` : undefined}
                                            >
                                                {segundos > 0 ? `${segundos} s` : segundos < 0 ? "…" : "Invitar"}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </aside>
            </main>

            {/* Ventana para elegir el juego (solo el creador) */}
            {eligiendoJuego && (
                <div className="sl-modal-fondo" onClick={() => setEligiendoJuego(false)}>
                    <section
                        className="lb-card sl-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="sl-modal-titulo"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sl-card-head">
                            <h2 id="sl-modal-titulo" className="lg-card-title">Elige el juego</h2>
                            <button type="button" className="lb-icon-btn" onClick={() => setEligiendoJuego(false)} aria-label="Cerrar">
                                <LuX aria-hidden="true" />
                            </button>
                        </div>
                        <ul className="sl-juegos" role="radiogroup" aria-labelledby="sl-modal-titulo">
                            {(sala.juegos || []).map((j) => {
                                const elegido = j.id === sala.juego;
                                const cabe = miembros.length >= j.min && miembros.length <= j.max;

                                return (
                                    <li key={j.id}>
                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked={elegido}
                                            className={`sl-juego ${elegido ? "sl-juego-elegido" : ""}`}
                                            onClick={() => elegirJuego(j.id)}
                                            autoFocus={elegido}
                                        >
                                            <span className="sl-juego-texto">
                                                <strong>{j.nombre}</strong>
                                                <small>{j.descripcion}</small>
                                            </span>
                                            <span className={`lg-tag ${cabe ? "lg-tag-on" : "lg-tag-off"}`}>
                                                <LuUsers aria-hidden="true" />
                                                {textoJugadores(j)}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                </div>
            )}

            {/* Avisos */}
            <div className="sl-avisos" aria-live="polite">
                {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"}>{aviso.texto}</p>}

            </div>
        </div>
    );
}
