import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    LuUserPlus,
    LuUsers,
    LuWifiOff,
    LuX,
} from "react-icons/lu";

import MainNav from "../../components/navigation/MainNav";
import AssetImage from "../../components/common/AssetImage";
import ProtegerError from "../../components/common/ProtegerError";
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
========================================================= */

const PUESTOS = 4;
const MODELO_POR_DEFECTO = "/models/characters/Adan2.vrm";

/* Los 4 puestos del escenario, repartidos a lo ancho de la vista. */
function Escenario({ miembros }) {
    const { viewport } = useThree();
    const ancho = viewport.width;
    const escala = Math.min(1.45, ancho / PUESTOS / 0.62);

    return (
        <>
            <LucesPersonaje calida />
            {miembros.map((m, i) => {
                const x = -ancho / 2 + (ancho * (i + 0.5)) / PUESTOS;
                // Un modelo 3D solo se puede mostrar una vez: si dos
                // jugadores usan el mismo personaje, cada uno carga su copia.
                const url = `${m.modelo || MODELO_POR_DEFECTO}#jugador-${m.userId}`;

                return (
                    <ProtegerError key={m.userId} respaldo={null}>
                        <Suspense
                            fallback={
                                <Html center position={[x, 0, 0]} style={{ pointerEvents: "none" }}>
                                    <span className="sl-cargando-3d">Cargando personaje…</span>
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
    const [conectados, setConectados] = useState([]);
    const [invitados, setInvitados] = useState(() => new Set());
    const [invitacion, setInvitacion] = useState(null);
    const [copiado, setCopiado] = useState(false);

    const avisoTimer = useRef(null);
    const crearAlEntrar = useRef(Boolean(location.state?.crear));

    const avisar = useCallback((texto, tono = "ok", ms = 3500) => {
        clearTimeout(avisoTimer.current);
        setAviso({ texto, tono });
        avisoTimer.current = setTimeout(() => setAviso({ texto: "", tono: "" }), ms);
    }, []);

    const miId = String(user?.id ?? "");

    /* ---------------- Conexión ---------------- */

    useEffect(() => {
        const alConectar = () => {
            socket.emit("sala:estado");
            socket.emit("world:join");
        };

        const alEstado = ({ sala: nueva }) => {
            if (nueva === null && crearAlEntrar.current) {
                crearAlEntrar.current = false;
                socket.emit("sala:crear");
                return;
            }
            crearAlEntrar.current = false;
            setSala(nueva);
        };

        const alError = ({ message }) => avisar(message, "error", 4500);
        const alJugadores = ({ players = [] } = {}) =>
            setConectados(players.filter((p) => String(p.id) !== miId));
        const alInvitar = ({ targetPlayerName }) => avisar(`Invitación enviada a ${targetPlayerName}.`);
        const alRechazo = ({ playerName, targetPlayerId }) => {
            avisar(`${playerName} rechazó la invitación.`, "error");
            setInvitados((s) => {
                const n = new Set(s);
                n.delete(String(targetPlayerId));
                return n;
            });
        };
        const alAceptar = ({ playerName }) => avisar(`¡${playerName} entró a la sala!`);
        const alInvitacion = (inv) => setInvitacion(inv);

        socket.on("connect", alConectar);
        socket.on("sala:estado", alEstado);
        socket.on("sala:error", alError);
        socket.on("world:error", alError);
        socket.on("world:players", alJugadores);
        socket.on("world:inviteSent", alInvitar);
        socket.on("world:invitationRejected", alRechazo);
        socket.on("world:inviteAccepted", alAceptar);
        socket.on("world:invitation", alInvitacion);

        if (socket.connected) alConectar();
        else socket.connect();

        return () => {
            socket.off("connect", alConectar);
            socket.off("sala:estado", alEstado);
            socket.off("sala:error", alError);
            socket.off("world:error", alError);
            socket.off("world:players", alJugadores);
            socket.off("world:inviteSent", alInvitar);
            socket.off("world:invitationRejected", alRechazo);
            socket.off("world:inviteAccepted", alAceptar);
            socket.off("world:invitation", alInvitacion);
            clearTimeout(avisoTimer.current);
        };
    }, [avisar, miId]);

    /* ---------------- Datos ---------------- */

    const miembros = sala?.miembros || [];
    const soyCreador = sala?.hostUserId === miId;
    const juegoActual = sala?.juegos?.find((j) => j.id === sala.juego) || null;
    const enSala = new Set(miembros.map((m) => String(m.userId)));
    const invitables = conectados.filter((p) => !enSala.has(String(p.id)));
    const llena = miembros.length >= (sala?.maxJugadores || PUESTOS);

    const textoJugadores = (j) => (j.min === j.max ? `${j.min} jugadores` : `${j.min} a ${j.max} jugadores`);

    const puestos = useMemo(
        () => Array.from({ length: PUESTOS }, (_, i) => miembros[i] || null),
        [miembros]
    );

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
        setInvitados((s) => new Set(s).add(String(jugador.id)));
        socket.emit("world:invite", { targetPlayerId: jugador.id });
    };

    const responderInvitacion = (aceptar) => {
        if (!invitacion) return;
        socket.emit(aceptar ? "world:acceptInvitation" : "world:rejectInvitation", {
            fromPlayerId: invitacion.fromPlayerId,
        });
        setInvitacion(null);
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
                            Crea una sala, invita de 1 a 3 amigos y elige el juego. También puedes entrar con el
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
                        <p className="lb-muted">Comparte este código para que entren.</p>
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
                                        </small>
                                    </span>
                                    {m.esCreador && (
                                        <span className="sl-creador" title="Creador de la sala">
                                            <LuCrown aria-hidden="true" />
                                            <span className="lb-sr-only">Creador</span>
                                        </span>
                                    )}
                                    {!m.conectado && <LuWifiOff aria-hidden="true" className="sl-icono-off" />}
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
                                <Escenario miembros={miembros} />
                            </Canvas>
                        </ProtegerError>

                        <ol className="sl-puestos">
                            {puestos.map((m, i) => (
                                <li key={m?.userId ?? `vacio-${i}`} className={m ? "sl-puesto" : "sl-puesto sl-puesto-vacio"}>
                                    {m ? (
                                        <span className="sl-etiqueta">
                                            {m.esCreador && <LuCrown aria-hidden="true" />}
                                            <strong>{m.nombre}</strong>
                                            <small>{`Nv ${m.nivel}`}</small>
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
                            <p className="lb-eyebrow">Juego elegido</p>
                            <strong className="sl-inicio-nombre">{juegoActual?.nombre || "Sin elegir"}</strong>
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
                            <span className="sl-espera-creador">Esperando a que el creador inicie…</span>
                        )}
                    </div>
                </section>

                {/* ================= DERECHA ================= */}
                <aside className="sl-col">
                    <section className="lb-card sl-juegos-card" aria-labelledby="sl-juegos">
                        <div className="sl-card-head">
                            <h2 id="sl-juegos" className="lg-card-title">Juegos</h2>
                            {!soyCreador && <span className="lb-muted">Elige el creador</span>}
                        </div>
                        <ul className="sl-juegos" role="radiogroup" aria-labelledby="sl-juegos">
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
                                            disabled={!soyCreador || sala.estado !== "sala"}
                                            onClick={() => socket.emit("sala:elegirJuego", { juego: j.id })}
                                        >
                                            <strong>{j.nombre}</strong>
                                            <small>{j.descripcion}</small>
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

                    <section className="lb-card sl-lista-card" aria-labelledby="sl-invitar">
                        <div className="sl-card-head">
                            <h2 id="sl-invitar" className="lg-card-title">Invitar</h2>
                            <span className="lb-count">{invitables.length}</span>
                        </div>
                        {invitables.length === 0 ? (
                            <p className="lb-muted sl-vacio">No hay más jugadores conectados. Comparte el código de la sala.</p>
                        ) : (
                            <ul className="sl-lista">
                                {invitables.map((p) => {
                                    const disponible = (p.status || "available") === "available";
                                    const yaInvitado = invitados.has(String(p.id));

                                    return (
                                        <li key={p.id} className="sl-jugador">
                                            <span className="lb-avatar">
                                                <AssetImage src={p.avatar} type="player" alt="" />
                                            </span>
                                            <span className="sl-jugador-datos">
                                                <strong>{p.name}</strong>
                                                <small>{disponible ? "Disponible" : p.status === "playing" ? "En partida" : "Ocupado"}</small>
                                            </span>
                                            <button
                                                type="button"
                                                className="lb-btn lb-btn-primary lb-btn-sm"
                                                disabled={!disponible || yaInvitado || llena || sala.estado !== "sala"}
                                                onClick={() => invitar(p)}
                                            >
                                                {yaInvitado ? "Invitado" : "Invitar"}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </aside>
            </main>

            {/* Avisos */}
            <div className="sl-avisos" aria-live="polite">
                {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"}>{aviso.texto}</p>}

                {invitacion && (
                    <div className="lb-card sl-invitacion" role="dialog" aria-labelledby="sl-inv-titulo">
                        <p id="sl-inv-titulo"><strong>{invitacion.fromPlayerName}</strong> te invitó a su sala</p>
                        <div className="lg-row">
                            <button type="button" className="lb-btn lb-btn-primary lb-btn-sm" onClick={() => responderInvitacion(true)}>
                                <LuCheck aria-hidden="true" />
                                Ir a su sala
                            </button>
                            <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => responderInvitacion(false)}>
                                <LuX aria-hidden="true" />
                                No, gracias
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
