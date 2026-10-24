import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Canvas, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { LuCheck, LuCopy, LuCrown, LuDoorOpen, LuLogIn, LuPlus, LuSettings2, LuTrophy, LuUserPlus, LuUserX, LuWifiOff, LuX } from "react-icons/lu";

import PantallaFF from "../../components/juego/PantallaFF";
import ElegirJuego, { textoJugadores } from "../../components/juego/ElegirJuego";
import ListaJugadores from "../../components/juego/ListaJugadores";
import AssetImage from "../../components/common/AssetImage";
import ProtegerError from "../../components/common/ProtegerError";
import VRMCharacter from "../../components/character/VRMCharacter";
import LucesPersonaje from "../../components/character/LucesPersonaje";
import { BurbujaEmoji, SelectorEmojis } from "../../components/common/Emojis";
import { useEmojisSala } from "../../components/common/useEmojisSala";
import { useAuth } from "../../context/AuthContext";
import { socket } from "../../services/socket";
import { avisar } from "../../services/avisos";
import games from "../../data/mock/games.json";

import "./sala.css";

/* =========================================================
   SALA MULTIJUGADOR (estilo Free Fire)
   ---------------------------------------------------------
   · Izquierda: los jugadores de la sala (el creador puede
     sacar a alguien antes de iniciar).
   · Centro: los personajes 3D de todos, con sus emojis.
     Abajo, el juego elegido y el botón INICIAR (creador).
   · Derecha: jugadores en línea para invitar.
   · Arriba: el código de la sala para compartir.
========================================================= */

const PUESTOS_MINIMOS = 4;
const MAX_POR_DEFECTO = 8;
const MODELO_POR_DEFECTO = "/models/characters/Adan2.vrm";

// Mínimo 4 puestos y siempre uno libre mientras la sala no esté llena.
function cantidadPuestos(miembros, maximo) {
    return Math.min(maximo, Math.max(PUESTOS_MINIMOS, miembros + 1));
}

// Juego de la sala con su foto (la de games.json).
function juegoConFoto(j) {
    const g = games.find((x) => x.sala === j.id);
    return { id: j.id, name: j.nombre, image: g?.image, minPlayers: j.min, maxPlayers: j.max, ruta: j.ruta };
}

/* Los personajes, repartidos a lo ancho del escenario. */
function Escenario({ miembros, puestos }) {
    const { viewport } = useThree();
    const ancho = viewport.width;
    const escala = Math.min(1.7, ancho / puestos / 0.6);

    return (
        <>
            <LucesPersonaje calida />
            {miembros.map((m, i) => {
                const x = -ancho / 2 + (ancho * (i + 0.5)) / puestos;
                // Un modelo 3D solo se muestra una vez: cada jugador carga su copia.
                const url = `${m.modelo || MODELO_POR_DEFECTO}#jugador-${m.userId}`;

                return (
                    <ProtegerError key={m.userId} respaldo={null}>
                        <Suspense
                            fallback={
                                <Html center position={[x, 0, 0]} style={{ pointerEvents: "none" }}>
                                    <span className="ffp-cargando">Cargando…</span>
                                </Html>
                            }
                        >
                            <VRMCharacter url={url} scale={escala} position={[x, -1.6, 0]} rotation={[0, 0, 0]} />
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
    const miId = String(user?.id ?? "");

    const [sala, setSala] = useState(undefined); // undefined = cargando, null = sin sala
    const [codigo, setCodigo] = useState("");
    const [copiado, setCopiado] = useState(false);
    const [porSacar, setPorSacar] = useState(null);
    const [eligiendoJuego, setEligiendoJuego] = useState(false);
    const emojis = useEmojisSala();

    const crearAlEntrar = useRef(Boolean(location.state?.crear));
    // Desde el botón INICIAR del lobby llega el juego que se quiere jugar.
    const juegoPedido = useRef(location.state?.juego || null);

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

            if (nueva && juegoPedido.current && nueva.hostUserId === miId && nueva.estado === "sala") {
                if (nueva.juego !== juegoPedido.current) socket.emit("sala:elegirJuego", { juego: juegoPedido.current });
                juegoPedido.current = null;
            }

            setSala(nueva);
        };

        // Las invitaciones y sus avisos se muestran en cualquier pantalla.
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
        };
    }, [miId]);

    const cerrarJuegos = useCallback(() => setEligiendoJuego(false), []);

    /* ---------------- Sin sala ---------------- */

    if (sala === undefined) {
        return (
            <PantallaFF titulo="Sala">
                <p className="sl-estado">Cargando sala…</p>
            </PantallaFF>
        );
    }

    if (sala === null) {
        return (
            <PantallaFF titulo="Sala">
                <section className="sl-vacia ffp-panel">
                    <h2>Juega con tus amigos</h2>
                    <p>Crea una sala e invita hasta 7 amigos, o entra con un código.</p>
                    <button type="button" className="ffp-btn" onClick={() => socket.emit("sala:crear")}>
                        <LuPlus aria-hidden="true" />
                        Crear sala
                    </button>
                    <form
                        className="sl-unirse"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (codigo.trim()) socket.emit("sala:unirse", { codigo: codigo.trim() });
                        }}
                    >
                        <input
                            value={codigo}
                            maxLength={5}
                            autoCapitalize="characters"
                            placeholder="CÓDIGO"
                            aria-label="Código de la sala"
                            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                        />
                        <button type="submit" className="ffp-btn ffp-btn-2" disabled={codigo.trim().length < 5}>
                            <LuLogIn aria-hidden="true" />
                            Entrar
                        </button>
                    </form>
                </section>
            </PantallaFF>
        );
    }

    /* ---------------- Datos ---------------- */

    const miembros = sala.miembros || [];
    const soyCreador = sala.hostUserId === miId;
    const juegos = (sala.juegos || []).map(juegoConFoto);
    const juego = juegos.find((j) => j.id === sala.juego) || null;
    const enSala = new Set(miembros.map((m) => String(m.userId)));
    const maximo = sala.maxJugadores || MAX_POR_DEFECTO;
    const llena = miembros.length >= maximo;
    const totalPuestos = cantidadPuestos(miembros.length, maximo);
    const puestos = Array.from({ length: totalPuestos }, (_, i) => miembros[i] || null);
    const puedeSacar = soyCreador && sala.estado === "sala";
    const alguienDesconectado = miembros.some((m) => !m.conectado);
    const puedeCambiarJuego = soyCreador && sala.estado === "sala";

    const copiarCodigo = async () => {
        try {
            await navigator.clipboard.writeText(sala.code);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1800);
        } catch {
            avisar(`Código de la sala: ${sala.code}`);
        }
    };

    const salir = () => {
        socket.emit("sala:salir");
        navigate("/lobby");
    };

    const sacar = (userId) => {
        socket.emit("sala:expulsar", { userId });
        setPorSacar(null);
    };

    const codigoArriba = (
        <button type="button" className="sl-codigo" onClick={copiarCodigo} aria-label={`Código ${sala.code.split("").join(" ")}. Copiar`} title="Copiar código">
            <small>Código</small>
            <strong>{sala.code}</strong>
            {copiado ? <LuCheck aria-hidden="true" /> : <LuCopy aria-hidden="true" />}
        </button>
    );

    return (
        <PantallaFF titulo="Sala" alCerrar={() => navigate("/lobby")} extraArriba={codigoArriba} className="sl">
            {/* ================= JUGADORES DE LA SALA ================= */}
            <section className="sl-miembros ffp-panel" aria-labelledby="sl-miembros-titulo">
                <header className="sl-cabeza">
                    <h2 id="sl-miembros-titulo">Jugadores</h2>
                    <span>{`${miembros.length}/${maximo}`}</span>
                </header>
                <ul className="sl-lista">
                    {miembros.map((m) => (
                        <li key={m.userId} className={`sl-jugador ${m.conectado ? "" : "sl-desconectado"}`}>
                            <span className="sl-foto">
                                <AssetImage src={m.avatar} type="player" alt="" />
                            </span>
                            <span className="sl-jugador-datos">
                                <strong>
                                    {m.esCreador && <LuCrown aria-label="Creador" className="sl-corona" />}
                                    {m.nombre}
                                    {String(m.userId) === miId && <span className="sl-tu"> (tú)</span>}
                                </strong>
                                <small>
                                    {m.conectado ? `Nv. ${m.nivel}` : "Reconectando…"}
                                    {m.victorias > 0 && (
                                        <span className="sl-victorias" title="Partidas ganadas en esta sala">
                                            <LuTrophy aria-hidden="true" />
                                            {m.victorias}
                                        </span>
                                    )}
                                </small>
                            </span>
                            {!m.conectado && <LuWifiOff aria-hidden="true" className="sl-off" />}
                            {puedeSacar && String(m.userId) !== miId &&
                                (porSacar === m.userId ? (
                                    <span className="sl-sacar-confirmar">
                                        <button type="button" className="sl-btn-sacar" onClick={() => sacar(m.userId)}>
                                            Sacar
                                        </button>
                                        <button type="button" className="ffl-icono ffl-icono-chico" onClick={() => setPorSacar(null)} aria-label="No sacar">
                                            <LuX aria-hidden="true" />
                                        </button>
                                    </span>
                                ) : (
                                    <button type="button" className="ffl-icono ffl-icono-chico sl-sacar" onClick={() => setPorSacar(m.userId)} aria-label={`Sacar a ${m.nombre}`} title="Sacar de la sala">
                                        <LuUserX aria-hidden="true" />
                                    </button>
                                ))}
                        </li>
                    ))}
                </ul>
                <button type="button" className="ffp-btn ffp-btn-2 sl-salir" onClick={salir}>
                    <LuDoorOpen aria-hidden="true" />
                    Salir de la sala
                </button>
            </section>

            {/* ================= CENTRO ================= */}
            <section className="sl-centro">
                <div className="sl-escenario" role="img" aria-label={`Personajes: ${miembros.map((m) => m.nombre).join(", ")}`}>
                    <span className="ffp-plataforma sl-plataforma" aria-hidden="true" />
                    <ProtegerError respaldo={null}>
                        <Canvas gl={{ alpha: true }} camera={{ position: [0, 0.1, 6.4], fov: 32 }} dpr={[1, 1.5]}>
                            <Escenario miembros={miembros} puestos={totalPuestos} />
                        </Canvas>
                    </ProtegerError>

                    <div className="sl-emojis" style={{ gridTemplateColumns: `repeat(${totalPuestos}, minmax(0, 1fr))` }} aria-hidden="true">
                        {puestos.map((m, i) => (
                            <span key={m?.userId ?? `e-${i}`}>{m && <BurbujaEmoji dato={emojis[String(m.userId)]} />}</span>
                        ))}
                    </div>

                    <SelectorEmojis className="sl-selector-emojis" />

                    <ol className={`sl-puestos ${totalPuestos > 5 ? "sl-puestos-muchos" : ""}`} style={{ gridTemplateColumns: `repeat(${totalPuestos}, minmax(0, 1fr))` }}>
                        {puestos.map((m, i) => (
                            <li key={m?.userId ?? `vacio-${i}`}>
                                {m ? (
                                    <span className="sl-etiqueta">
                                        {m.esCreador && <LuCrown aria-hidden="true" />}
                                        <strong>{m.nombre}</strong>
                                        {m.victorias > 0 && <small>{`🏆${m.victorias}`}</small>}
                                    </span>
                                ) : (
                                    <span className="sl-espera">
                                        <LuUserPlus aria-hidden="true" />
                                        Libre
                                    </span>
                                )}
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="sl-inicio">
                    <button
                        type="button"
                        className="ffl-juego sl-juego"
                        onClick={() => puedeCambiarJuego && setEligiendoJuego(true)}
                        disabled={!puedeCambiarJuego}
                        aria-label={`Juego: ${juego?.name || "sin elegir"}${puedeCambiarJuego ? ". Cambiar" : ""}`}
                    >
                        {juego?.image && <img src={juego.image} alt="" draggable="false" />}
                        <span className="ffl-juego-texto">
                            <strong>{juego?.name || "Elige un juego"}</strong>
                            <small>{sala.estado === "jugando" ? "Partida en curso…" : sala.motivoNoIniciar || (juego ? textoJugadores(juego) : "")}</small>
                        </span>
                        {puedeCambiarJuego && (
                            <span className="ffl-juego-cambiar" aria-hidden="true">
                                <LuSettings2 />
                            </span>
                        )}
                    </button>

                    {sala.estado === "jugando" ? (
                        <button type="button" className="ffl-iniciar sl-iniciar" onClick={() => juego && navigate(juego.ruta)}>
                            Volver
                        </button>
                    ) : soyCreador ? (
                        <button
                            type="button"
                            className="ffl-iniciar sl-iniciar"
                            disabled={Boolean(sala.motivoNoIniciar) || alguienDesconectado}
                            onClick={() => socket.emit("sala:iniciar")}
                        >
                            Iniciar
                        </button>
                    ) : (
                        <span className="sl-esperando">El creador inicia…</span>
                    )}
                </div>
            </section>

            {/* ================= INVITAR ================= */}
            <aside className="sl-invitar" aria-label="Invitar jugadores">
                <ListaJugadores excluir={enSala} bloqueado={llena || sala.estado !== "sala"} titulo="Invitar" />
            </aside>

            {eligiendoJuego && (
                <ElegirJuego
                    juegos={juegos}
                    elegidoId={sala.juego}
                    cabe={(g) => miembros.length >= g.minPlayers && miembros.length <= g.maxPlayers}
                    alElegir={(g) => {
                        socket.emit("sala:elegirJuego", { juego: g.id });
                        setEligiendoJuego(false);
                    }}
                    alCerrar={cerrarJuegos}
                />
            )}
        </PantallaFF>
    );
}
