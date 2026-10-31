import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
    LuBookOpen,
    LuChevronLeft,
    LuChevronRight,
    LuExpand,
    LuGamepad2,
    LuGem,
    LuPlus,
    LuRefreshCw,
    LuSettings2,
    LuShieldCheck,
    LuShirt,
    LuShoppingCart,
    LuShrink,
    LuSmartphone,
    LuUserRound,
    LuTrophy,
    LuGift,
    LuBadgeCheck,
    LuUsers,
    LuVolume2,
    LuVolumeX,
    LuX,
} from "react-icons/lu";


import { useAuth } from "../context/AuthContext";
import { jugadorDesdeUsuario } from "../services/jugador";
import { useJugadoresEnLinea, ESTADOS } from "../hooks/useJugadoresEnLinea";
import { useInvitar } from "../hooks/useInvitar";
import { alAvisar, ultimoAviso } from "../services/avisos";
import { enPantallaCompleta, entrarPantallaCompleta, salirPantallaCompleta, puedePantallaCompleta, esIOS } from "../services/pantalla";
import { alCambiarSilencio, cambiarSilencio, estaSilenciado } from "../services/sonido";
import { avisar } from "../services/avisos";

import games from "../data/mock/games.json";
import assets from "../data/mock/assets.json";

import ProtegerError from "../components/common/ProtegerError";
import VRMCharacter from "../components/character/VRMCharacter";
import LucesPersonaje from "../components/character/LucesPersonaje";
import FotoPerfil from "../components/juego/FotoPerfil";
import InsigniaRango from "../components/juego/InsigniaRango";
import NombreDeslizante from "../components/juego/NombreDeslizante";
import AnuncioEventos from "../components/juego/AnuncioEventos";
import { api } from "../services/api";
import Verificado from "../components/juego/Verificado";
import Tiquete from "../components/juego/Tiquete";
import Carrusel from "../components/juego/Carrusel";
import BotonRuleta from "../components/juego/BotonRuleta";

/* =========================================================
   LOBBY (diseño tipo Free Fire)
   ---------------------------------------------------------
   El personaje ocupa el centro de la pantalla y todo lo demás
   va pegado a los bordes:
     · arriba: perfil, oro y diamantes · logo y botones
     · izquierda: carrusel de anuncios + ruleta GiraGamif, y
       debajo el menú (Tienda, Sala…)
     · derecha: jugadores en línea para invitar (se pliega)
     · abajo: atajos · juego elegido y el botón INICIAR
   Todo se mide en rem, que depende del alto de la pantalla
   (ver .escala-juego en globals.css).
========================================================= */

const CLAVE_JUEGO = "ludogamif:juegoElegido";
const formato = new Intl.NumberFormat("es-CO");

function juegoGuardado() {
    try {
        const id = localStorage.getItem(CLAVE_JUEGO);
        return games.find((g) => g.id === id) || games[0];
    } catch {
        return games[0];
    }
}

const textoJugadores = (g) =>
    g.minPlayers === g.maxPlayers
        ? `${g.minPlayers} ${g.minPlayers === 1 ? "jugador" : "jugadores"}`
        : `${g.minPlayers} a ${g.maxPlayers} jugadores`;

/* Personaje 3D a pantalla completa (detrás de todo). */
function Escena({ modelo }) {
    return (
        <div className="ffl-escena" aria-hidden="true">
            <ProtegerError respaldo={null}>
                {/* Cámara a la altura del pecho: se ve el cuerpo entero, con la cabeza bajo la barra de arriba. */}
                <Canvas gl={{ alpha: true }} camera={{ position: [0, 0.15, 5.4], fov: 40 }} dpr={[1, 1.75]}>
                    <LucesPersonaje calida />
                    <Suspense fallback={null}>
                        {modelo && (
                            <VRMCharacter key={modelo} url={modelo} scale={2.02} position={[0, -1.72, 0]} rotation={[0, 0, 0]} />
                        )}
                    </Suspense>
                    <OrbitControls
                        target={[0, 0.15, 0]}
                        enableZoom={false}
                        enablePan={false}
                        enableDamping
                        minPolarAngle={Math.PI / 2}
                        maxPolarAngle={Math.PI / 2}
                    />
                </Canvas>
            </ProtegerError>
        </div>
    );
}

/* Ventana para elegir el juego (como elegir modo en Free Fire). */
function ElegirJuego({ elegido, onElegir, onCerrar }) {
    useEffect(() => {
        const tecla = (e) => e.key === "Escape" && onCerrar();
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [onCerrar]);

    return (
        <div className="ffl-modal-fondo" onClick={onCerrar}>
            <section className="ffl-modal" role="dialog" aria-modal="true" aria-labelledby="ffl-modal-titulo" onClick={(e) => e.stopPropagation()}>
                <header className="ffl-modal-cabeza">
                    <h2 id="ffl-modal-titulo">Elige el juego</h2>
                    <button type="button" className="ffl-icono" onClick={onCerrar} aria-label="Cerrar">
                        <LuX aria-hidden="true" />
                    </button>
                </header>
                <ul className="ffl-modos">
                    {games.map((g) => (
                        <li key={g.id}>
                            <button
                                type="button"
                                className={`ffl-modo ${g.id === elegido.id ? "ffl-modo-elegido" : ""}`}
                                onClick={() => onElegir(g)}
                                aria-pressed={g.id === elegido.id}
                                autoFocus={g.id === elegido.id}
                            >
                                <span className="ffl-modo-foto" style={{ "--foto": `url("${g.image}")` }}>
                                    <img src={g.image} alt="" loading="lazy" draggable="false" />
                                </span>
                                <span className="ffl-modo-texto">
                                    <strong>{g.name}</strong>
                                    <small>
                                        <LuUsers aria-hidden="true" />
                                        {textoJugadores(g)}
                                    </small>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

export default function Lobby() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const jugador = jugadorDesdeUsuario(user);

    const { jugadores, actualizar, actualizando } = useJugadoresEnLinea();
    const { invitar, espera } = useInvitar();

    const [juego, setJuego] = useState(juegoGuardado);
    const [eligiendo, setEligiendo] = useState(false);
    const [plegado, setPlegado] = useState(false);
    const [aviso, setAviso] = useState(() => ultimoAviso());
    const [completa, setCompleta] = useState(() => enPantallaCompleta());
    const [silencio, setSilencio] = useState(() => estaSilenciado());

    useEffect(() => alAvisar(setAviso), []);

    // Recompensas de eventos listas para reclamar (el número rojo en "Eventos").
    const [porReclamar, setPorReclamar] = useState(0);
    useEffect(() => {
        api("/eventos")
            .then((r) => setPorReclamar(r.porReclamar || 0))
            .catch(() => {});
    }, []);
    useEffect(() => alCambiarSilencio(setSilencio), []);
    useEffect(() => {
        const ver = () => setCompleta(enPantallaCompleta());
        document.addEventListener("fullscreenchange", ver);
        document.addEventListener("webkitfullscreenchange", ver);
        return () => {
            document.removeEventListener("fullscreenchange", ver);
            document.removeEventListener("webkitfullscreenchange", ver);
        };
    }, []);

    if (!jugador) return null;

    const elegir = (g) => {
        setJuego(g);
        setEligiendo(false);
        try {
            localStorage.setItem(CLAVE_JUEGO, g.id);
        } catch {
            // Sin almacenamiento: vale mientras la página esté abierta.
        }
    };

    // INICIAR: si es de un jugador entra directo; si es
    // multijugador, va a la sala con ese juego ya elegido.
    const iniciar = () => {
        if (juego.sala) navigate("/sala", { state: { crear: true, juego: juego.sala } });
        else navigate(juego.route);
    };

    const pantallaCompleta = async () => {
        if (completa) return salirPantallaCompleta();
        if (puedePantallaCompleta() && (await entrarPantallaCompleta())) return;
        avisar(
            esIOS()
                ? "En iPhone y iPad: Compartir → Agregar a inicio, y ábrelo desde ahí."
                : "Este navegador no permite pantalla completa.",
            "info",
            5000
        );
    };

    const disponibles = jugadores.filter((p) => p.status !== "playing").length;

    return (
        <div className="ffl">
            <div className="ffl-fondo" style={{ backgroundImage: `url(${assets.backgrounds.lobby})` }} aria-hidden="true" />
            <Escena modelo={jugador.characterModel} />
            <h1 className="ffl-oculto">LudoGamif</h1>

            {/* ================= ARRIBA ================= */}
            <header className="ffl-arriba">
                <button type="button" className="ffl-perfil" onClick={() => navigate("/profile")} aria-label={`Tu perfil: ${jugador.displayName}, nivel ${jugador.level}`}>
                    <span className="ffl-avatar">
                        <FotoPerfil foto={jugador.avatar} marco={user?.marco} />
                        <span className="ffl-nivel">{jugador.level}</span>
                    </span>
                    <span className="ffl-perfil-datos">
                        <strong>{jugador.displayName}<Verificado activo={user?.verificado} /></strong>
                        <span className="ffl-xp" title={`${jugador.experience.current} / ${jugador.experience.needed} XP`}>
                            <span style={{ width: `${jugador.experience.percentage}%` }} />
                        </span>
                        <small>{`Nv. ${jugador.level}`}</small>
                    </span>
                </button>

                <div className="ffl-monedas">
                    <span className="ffl-moneda" title="Oro">
                        <span className="ffl-moneda-oro" aria-hidden="true" />
                        {formato.format(jugador.currencies.coins)}
                        <span className="ffl-oculto"> de oro</span>
                    </span>
                    <button type="button" className="ffl-moneda" onClick={() => navigate("/tienda")} title="Diamantes · ir a la tienda">
                        <LuGem aria-hidden="true" className="ffl-moneda-diamante" />
                        {formato.format(jugador.currencies.gems)}
                        <span className="ffl-oculto"> diamantes</span>
                        <LuPlus aria-hidden="true" className="ffl-moneda-mas" />
                    </button>
                    <button type="button" className="ffl-moneda ffl-moneda-tiquete" onClick={() => navigate("/suerte")} title="Tiquetes · ir a GiraGamif">
                        <Tiquete />
                        {formato.format(jugador.currencies.tickets || 0)}
                        <span className="ffl-oculto"> tiquetes</span>
                    </button>
                </div>

                <div className="ffl-arriba-der">
                    <span className="ffl-logo" aria-hidden="true">
                        LUDO<span>GAMIF</span>
                    </span>
                    <button type="button" className="ffl-icono" onClick={pantallaCompleta} aria-label={completa ? "Salir de pantalla completa" : "Pantalla completa"} title="Pantalla completa">
                        {completa ? <LuShrink aria-hidden="true" /> : <LuExpand aria-hidden="true" />}
                    </button>
                    <button type="button" className="ffl-icono" onClick={() => cambiarSilencio()} aria-label={silencio ? "Activar sonido" : "Silenciar"} title="Sonido">
                        {silencio ? <LuVolumeX aria-hidden="true" /> : <LuVolume2 aria-hidden="true" />}
                    </button>
                    {jugador.esAdmin && (
                        <button type="button" className="ffl-icono" onClick={() => navigate("/admin")} aria-label="Panel de administración" title="Panel">
                            <LuShieldCheck aria-hidden="true" />
                        </button>
                    )}
                </div>
            </header>

            {/* ================= IZQUIERDA ================= */}
            <nav className="ffl-menu" aria-label="Menú">
                {/* Anuncios que elige el administrador · al lado, la ruleta GiraGamif */}
                <div className="ffl-anuncios">
                    <Carrusel alElegirJuego={elegir} />
                    <BotonRuleta tiquetes={jugador.currencies.tickets || 0} onClick={() => navigate("/suerte")} />
                </div>

                {[
                    { texto: "Tienda", icono: LuShoppingCart, ruta: "/tienda" },
                    { texto: "Preguntas", icono: LuBookOpen, ruta: "/games/preguntas" },
                    { texto: "Sala", icono: LuUsers, ruta: "/sala" },
                    { texto: "Ranking", icono: LuTrophy, ruta: "/ranking" },
                    { texto: "Eventos", icono: LuGift, ruta: "/eventos", cuenta: porReclamar },
                ].map(({ texto, icono: Icono, ruta, cuenta }) => (
                    <button key={ruta} type="button" className="ffl-menu-btn" onClick={() => navigate(ruta)} aria-label={cuenta ? `${texto}: ${cuenta} para reclamar` : undefined}>
                        <Icono aria-hidden="true" />
                        <span>{texto}</span>
                        {cuenta > 0 && <span className="ffp-insignia-cuenta" aria-hidden="true">{cuenta}</span>}
                    </button>
                ))}
            </nav>

            {/* ================= DERECHA: JUGADORES ================= */}
            <AnuncioEventos />

            <aside className={`ffl-amigos ${plegado ? "ffl-plegado" : ""}`} aria-label="Jugadores en línea">
                <div className="ffl-amigos-caja">
                    <header className="ffl-amigos-cabeza">
                        <span>
                            <i className="ffl-punto" aria-hidden="true" />
                            {`En línea ${jugadores.length}`}
                        </span>
                        <button type="button" className="ffl-icono ffl-icono-chico" onClick={actualizar} aria-label="Actualizar lista" title="Actualizar">
                            <LuRefreshCw aria-hidden="true" className={actualizando ? "ffl-girando" : ""} />
                        </button>
                    </header>

                    {jugadores.length === 0 ? (
                        <p className="ffl-vacio">Nadie más conectado.</p>
                    ) : (
                        <ul className="ffl-amigos-lista">
                            {jugadores.map((p) => {
                                const estado = ESTADOS[p.status] || ESTADOS.available;
                                const segundos = espera(p.id);
                                const jugando = p.status === "playing";

                                return (
                                    <li key={p.id} className={`ffl-amigo ffl-placa ${p.admin ? "ffl-placa-admin" : `ffl-placa-${p.rango?.id || "bronce"}`}`}>
                                        <button
                                            type="button"
                                            className="ffl-amigo-perfil"
                                            onClick={() => navigate(`/profile/${p.id}`)}
                                            aria-label={`${p.name}${p.admin ? ", administrador verificado" : p.verificado ? ", verificado" : ""}, rango ${p.rango?.nombre || "Bronce"}, ${estado.texto}`}
                                        >
                                            <span className="ffl-amigo-foto">
                                                <FotoPerfil foto={p.avatar} marco={p.marco} />
                                                <i className={`ffl-estado ffl-estado-${estado.tono}`} aria-hidden="true" />
                                                {(p.admin || p.verificado) && <LuBadgeCheck className="ffl-verificado" aria-hidden="true" />}
                                            </span>
                                            <span className="ffl-amigo-datos">
                                                <NombreDeslizante texto={p.name} className="ffl-amigo-nombre" />
                                                <span className="ffl-amigo-rango">
                                                    <InsigniaRango rango={p.rango || { id: "bronce", nombre: "Bronce" }} tamano="0.85rem" />
                                                    {p.admin ? "Admin" : p.rango?.nombre || "Bronce"}
                                                </span>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            className="ffl-invitar"
                                            onClick={() => invitar(p)}
                                            disabled={jugando || segundos !== 0}
                                            aria-label={jugando ? `${p.name} está jugando` : `Invitar a ${p.name}`}
                                            title={jugando ? "Jugando" : segundos > 0 ? `Invitar otra vez en ${segundos} s` : "Invitar"}
                                        >
                                            {jugando ? (
                                                <LuGamepad2 aria-hidden="true" />
                                            ) : segundos > 0 ? (
                                                <span className="ffl-segundos">{segundos}</span>
                                            ) : (
                                                <LuPlus aria-hidden="true" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <button
                    type="button"
                    className="ffl-plegar"
                    onClick={() => setPlegado((v) => !v)}
                    aria-label={plegado ? "Mostrar jugadores" : "Ocultar jugadores"}
                    aria-expanded={!plegado}
                >
                    {plegado ? <LuChevronLeft aria-hidden="true" /> : <LuChevronRight aria-hidden="true" />}
                    {plegado && disponibles > 0 && <span className="ffl-plegar-num">{disponibles}</span>}
                </button>
            </aside>

            {/* ================= ABAJO IZQUIERDA ================= */}
            <p className="ffl-aviso" aria-live="off">
                <span className="ffl-aviso-etiqueta">Aviso</span>
                <span className="ffl-aviso-texto">{aviso?.texto || `¡Hola, ${jugador.displayName}! Elige un juego y toca INICIAR.`}</span>
            </p>

            <nav className="ffl-barra" aria-label="Atajos">
                <span className="ffl-barra-logo" aria-hidden="true">L</span>
                <button type="button" className="ffl-barra-btn" onClick={() => navigate("/character")}>
                    <LuShirt aria-hidden="true" />
                    <span>Personajes</span>
                </button>
                <button type="button" className="ffl-barra-btn" onClick={() => navigate("/profile")}>
                    <LuUserRound aria-hidden="true" />
                    <span>Perfil</span>
                </button>
                <button
                    type="button"
                    className="ffl-barra-btn"
                    onClick={() => navigate("/triqui-local", { state: { playerName: jugador.displayName } })}
                >
                    <LuSmartphone aria-hidden="true" />
                    <span>Triqui local</span>
                </button>
            </nav>

            {/* ================= ABAJO DERECHA: INICIAR ================= */}
            <div className="ffl-inicio">
                <button type="button" className="ffl-juego" onClick={() => setEligiendo(true)} aria-label={`Juego: ${juego.name}. Cambiar juego`}>
                    <img src={juego.image} alt="" draggable="false" />
                    <span className="ffl-juego-texto">
                        <strong>{juego.name}</strong>
                        <small>{textoJugadores(juego)}</small>
                    </span>
                    <span className="ffl-juego-cambiar" aria-hidden="true">
                        <LuSettings2 />
                    </span>
                </button>
                <button type="button" className="ffl-iniciar" onClick={iniciar}>
                    Iniciar
                </button>
            </div>

            {eligiendo && <ElegirJuego elegido={juego} onElegir={elegir} onCerrar={() => setEligiendo(false)} />}
        </div>
    );
}
