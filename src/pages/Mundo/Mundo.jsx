import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { LuChevronsUp, LuGrab, LuMessageCircle, LuMic, LuMicOff, LuRocket, LuSend, LuSparkles, LuUserRound, LuUsers, LuX, LuZap } from "react-icons/lu";

import ProtegerError from "../../components/common/ProtegerError";
import VRMCharacter from "../../components/character/VRMCharacter";
import { AccionesJugador } from "../../components/juego/Reportar";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { avisar } from "../../services/avisos";
import { sonar } from "../../services/sonidos";
import { socket } from "../../services/socket";
import { empezarCaptura, micDisponible, pararCaptura, TASA } from "../../services/voz";
import { Cielo, Luces, Objetos, Suelo } from "./Escena";
import { formasDe, paso, SALTO } from "./fisica";
import { ajustarVolumen, cerrarVoces, sonarVoz } from "./vozMundo";

import "./mundo.css";

/* =========================================================
   MUNDO 3D (lobby para caminar)
   · Celular: joystick a la izquierda, botones a la derecha
     (brincar, correr, agarrar/lanzar, hablar, escribir);
     arrastra la pantalla para girar la cámara.
   · Correr: corre solo hacia donde mira la cámara (gira la
     cámara para doblar); se quita al tocar el joystick.
   · Agarrar: alza al jugador que está al lado; Lanzar lo tira.
   · Círculos de juego: párate adentro y al terminar la cuenta
     se arma la partida (pantalla previa en /preparando).
   · PC: W A S D / flechas, Shift corre, R corre solo,
     Espacio brinca, E agarra/lanza, Enter escribe, mantener V habla.
   · Los mensajes salen en un globo encima del jugador unos
     segundos y desaparecen: no quedan guardados en ningún lado.
   · La voz se oye solo cerca (más bajito mientras más lejos).
========================================================= */

const VELOCIDAD = 4.2; // m/s caminando
const VELOCIDAD_CORRER = 8.5;
const ALTURA_CARGADO = 1.9; // el que va alzado, encima de la cabeza
const DISTANCIA_CAMARA = 6.2;
const DURACION_GLOBO = 6000;
const CLAVE_PERSONAJE = "ludogamif:mundo-personaje";
const FRASES = ["¡Hola! 👋", "¿Jugamos?", "¡Sígueme!", "Jajaja 😂", "¡Gracias!", "👍", "😮", "❤️"];

const leer = (k) => {
    try {
        return localStorage.getItem(k);
    } catch {
        return null;
    }
};
const guardar = (k, v) => {
    try {
        localStorage.setItem(k, v);
    } catch {
        // sin almacenamiento: se vuelve a elegir
    }
};

/* Ángulo más corto entre dos direcciones. */
const girarHacia = (a, b, t) => {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
};

/* ---------- Personaje con nombre, globo y "está hablando" ---------- */
function Cuerpo({ modelo, andar, saludo, brazos, cargado, nombre, yo, globo, habla }) {
    const grupo = useRef(null);
    const sombras = useRef(false);
    const cabeza = useRef(null);
    const { camera } = useThree();
    const punto = useRef(new THREE.Vector3());
    // Que el personaje proyecte sombra (se marca una vez cuando carga).
    useFrame(() => {
        // El nombre de alguien pegado a la cámara se vería gigante: se esconde.
        if (cabeza.current && grupo.current) {
            grupo.current.getWorldPosition(punto.current);
            cabeza.current.style.opacity = punto.current.distanceTo(camera.position) < 2.6 ? "0" : "1";
        }
        if (sombras.current || !grupo.current) return;
        let hay = false;
        grupo.current.traverse((o) => {
            if (o.isMesh) {
                o.castShadow = true;
                hay = true;
            }
        });
        sombras.current = hay;
    });

    return (
        <group ref={grupo}>
            <ProtegerError respaldo={null}>
                <Suspense fallback={null}>
                    {/* alzado: acostado encima de la cabeza del que lo carga */}
                    <group rotation={cargado ? [0, 0, Math.PI / 2] : [0, 0, 0]} position={cargado ? [0.85, 0, 0] : [0, 0, 0]}>
                        <VRMCharacter url={modelo} andar={andar} saludo={saludo} brazos={brazos} texturaMax={512} rotation={[0, 0, 0]} />
                    </group>
                </Suspense>
            </ProtegerError>
            {/* sombrita redonda debajo (se ve aunque el sol esté lejos) */}
            {!cargado && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                    <circleGeometry args={[0.42, 24]} />
                    <meshBasicMaterial color="#000" transparent opacity={0.22} depthWrite={false} />
                </mesh>
            )}
            <Html position={[0, cargado ? 1.0 : 2.05, 0]} center distanceFactor={8} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
                <div className="mu-cabeza" ref={cabeza}>
                    {globo && (
                        <p className="mu-globo" key={globo.n}>
                            {globo.texto}
                        </p>
                    )}
                    <span className={`mu-nombre ${yo ? "mu-nombre-yo" : ""}`}>
                        {habla && (
                            <span className="mu-ondas" aria-label="Está hablando">
                                <i />
                                <i />
                                <i />
                            </span>
                        )}
                        {nombre}
                    </span>
                </div>
            </Html>
        </group>
    );
}

/* ---------- Yo: se mueve con el joystick o el teclado ---------- */
function Yo({ modelo, nombre, entrada, camara, inicio, formas, posicion, globo, habla, agarre, vistas, yoId }) {
    const grupo = useRef(null);
    const p = posicion;
    const andar = useRef(0);
    const brazos = useRef(0);
    const ultimoEnvio = useRef({ t: 0, x: NaN, y: NaN, z: NaN, r: NaN, a: -1 });
    const { camera } = useThree();

    useEffect(() => {
        Object.assign(p.current, {
            x: inicio.x,
            y: inicio.y || 0,
            z: inicio.z,
            r: inicio.r,
            vy: 0,
            mx: 0,
            mz: 0,
            enSuelo: true,
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useFrame((_, delta) => {
        const dt = Math.min(delta, 0.05);
        const e = entrada.current;
        const t = e.teclas;
        let ix = e.joy.x + (t.d ? 1 : 0) - (t.a ? 1 : 0);
        let iy = e.joy.y + (t.w ? 1 : 0) - (t.s ? 1 : 0);
        // Correr solo: hacia adelante de la cámara mientras no toque el joystick.
        const auto = e.correr && Math.hypot(ix, iy) < 0.08;
        if (auto) iy = 1;
        const largo = Math.hypot(ix, iy);
        if (largo > 1) {
            ix /= largo;
            iy /= largo;
        }
        const fuerza = Math.min(1, largo);
        const corre = auto || t.shift;
        const a = agarre.current;
        const meCargan = a.cargados.get(yoId);
        const yaw = camara.current.yaw;
        const pos = p.current;

        let dx = 0;
        let dz = 0;
        if (meCargan) {
            // Me tienen alzado: voy encima del que me carga, sin moverme.
            const v = vistas.current.get(meCargan);
            if (v)
                Object.assign(pos, {
                    x: v.x,
                    y: v.y + ALTURA_CARGADO,
                    z: v.z,
                    r: v.r,
                    vy: 0,
                    mx: 0,
                    mz: 0,
                });
            pos.enSuelo = false;
        } else if (fuerza > 0.08) {
            // Adelante = alejándose de la cámara.
            const vx = -Math.sin(yaw) * iy + Math.cos(yaw) * ix;
            const vz = -Math.cos(yaw) * iy - Math.sin(yaw) * ix;
            const v = (corre ? VELOCIDAD_CORRER : VELOCIDAD) * fuerza * dt;
            dx = vx * v;
            dz = vz * v;
            pos.r = girarHacia(pos.r, Math.atan2(vx, vz), Math.min(1, dt * 12));
        }

        // Me lanzaron: salgo volando con el impulso.
        // Teletransporte (botón USAR): aparece en el otro círculo.
        if (a.irA) {
            Object.assign(pos, a.irA, { vy: 0, mx: 0, mz: 0 });
            a.irA = null;
        }
        if (a.lanzarme) {
            const l = a.lanzarme;
            a.lanzarme = null;
            Object.assign(pos, {
                x: l.x,
                y: l.y,
                z: l.z,
                vy: l.vy,
                mx: l.vx,
                mz: l.vz,
                enSuelo: false,
            });
        }

        // Brincar (solo desde el piso).
        if (e.saltar) {
            e.saltar = false;
            if (pos.enSuelo && !meCargan) {
                pos.vy = SALTO;
                pos.enSuelo = false;
            }
        }
        if (!meCargan) {
            paso(pos, dx + (pos.mx || 0) * dt, dz + (pos.mz || 0) * dt, dt, formas);
            // El impulso del lanzamiento se frena al caer.
            if (pos.enSuelo && (pos.mx || pos.mz)) {
                pos.mx *= 0.75;
                pos.mz *= 0.75;
                if (Math.hypot(pos.mx, pos.mz) < 0.3) pos.mx = pos.mz = 0;
            }
        }
        vistas.current.set(yoId, { x: pos.x, y: pos.y, z: pos.z, r: pos.r });

        const meta = fuerza > 0.08 && pos.enSuelo && !meCargan ? (corre ? 2 : 1) : 0;
        andar.current += (meta - andar.current) * Math.min(1, dt * 10);
        brazos.current += ((a.cargando.has(yoId) ? 1 : 0) - brazos.current) * Math.min(1, dt * 10);

        if (grupo.current) {
            grupo.current.position.set(pos.x, pos.y, pos.z);
            grupo.current.rotation.y = pos.r;
        }

        // Cámara detrás, un poco arriba (sigue suave los saltos).
        const c = camara.current;
        c.y += (pos.y - c.y) * Math.min(1, dt * 6);
        const dist = DISTANCIA_CAMARA;
        camera.position.set(pos.x + Math.sin(yaw) * dist * Math.cos(c.pitch), c.y + 1.3 + Math.sin(c.pitch) * dist, pos.z + Math.cos(yaw) * dist * Math.cos(c.pitch));
        camera.lookAt(pos.x, c.y + 1.3, pos.z);

        // Avisa al servidor (10 veces por segundo, solo si cambió).
        const u = ultimoEnvio.current;
        const ahora = performance.now();
        const anda = Math.round(andar.current);
        if (ahora - u.t > 100 && (Math.abs(u.x - pos.x) > 0.01 || Math.abs(u.z - pos.z) > 0.01 || Math.abs(u.y - pos.y) > 0.01 || Math.abs(u.r - pos.r) > 0.02 || u.a !== anda)) {
            socket.emit("mundo:mover", {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                r: pos.r,
                andando: anda,
            });
            Object.assign(u, {
                t: ahora,
                x: pos.x,
                y: pos.y,
                z: pos.z,
                r: pos.r,
                a: anda,
            });
        }
    });

    return (
        <group ref={grupo} position={[inicio.x, inicio.y || 0, inicio.z]}>
            <Cuerpo modelo={modelo} andar={andar} brazos={brazos} cargado={Boolean(agarre.current.cargados.get(yoId))} nombre={nombre} yo globo={globo} habla={habla} />
        </group>
    );
}

/* ---------- Los demás: se acercan suave a su última posición ---------- */
function Otro({ jugador, modelo, destinos, globo, habla, agarre, vistas, cargado }) {
    const grupo = useRef(null);
    const andar = useRef(0);
    const brazos = useRef(0);

    useFrame((_, delta) => {
        const d = destinos.current.get(jugador.userId);
        const g = grupo.current;
        if (!d || !g) return;
        const a = agarre.current;
        const t = Math.min(1, delta * 10);
        const por = a.cargados.get(jugador.userId);
        const v = por ? vistas.current.get(por) : null;
        if (v) {
            // Va alzado encima del que lo carga (pegado, sin retraso).
            g.position.set(v.x, v.y + ALTURA_CARGADO, v.z);
            g.rotation.y = v.r;
        } else {
            g.position.x += (d.x - g.position.x) * t;
            g.position.y += (d.y - g.position.y) * Math.min(1, delta * 14);
            g.position.z += (d.z - g.position.z) * t;
            g.rotation.y = girarHacia(g.rotation.y, d.r, t);
        }
        vistas.current.set(jugador.userId, {
            x: g.position.x,
            y: g.position.y,
            z: g.position.z,
            r: g.rotation.y,
        });
        andar.current += ((v ? 0 : d.andando || 0) - andar.current) * Math.min(1, delta * 8);
        brazos.current += ((a.cargando.has(jugador.userId) ? 1 : 0) - brazos.current) * Math.min(1, delta * 10);
    });

    return (
        <group ref={grupo} position={[jugador.x, jugador.y || 0, jugador.z]} rotation={[0, jugador.r, 0]}>
            <Cuerpo modelo={modelo} andar={andar} brazos={brazos} cargado={cargado} nombre={jugador.nombre} globo={globo} habla={habla} />
        </group>
    );
}

/* ---------- Joystick (celular) ---------- */
function Joystick({ entrada, alTocar }) {
    const base = useRef(null);
    const [punto, setPunto] = useState({ x: 0, y: 0 });
    const dedo = useRef(null);

    const mover = (e) => {
        const r = base.current.getBoundingClientRect();
        const radio = r.width / 2;
        let x = (e.clientX - (r.left + radio)) / radio;
        let y = (e.clientY - (r.top + radio)) / radio;
        const l = Math.hypot(x, y);
        if (l > 1) {
            x /= l;
            y /= l;
        }
        entrada.current.joy = { x, y: -y };
        setPunto({ x, y });
    };
    const soltar = () => {
        dedo.current = null;
        entrada.current.joy = { x: 0, y: 0 };
        setPunto({ x: 0, y: 0 });
    };

    return (
        <div
            ref={base}
            className={`mu-joy ${dedo.current != null ? "mu-joy-activo" : ""}`}
            onPointerDown={(e) => {
                e.stopPropagation();
                dedo.current = e.pointerId;
                e.currentTarget.setPointerCapture(e.pointerId);
                alTocar?.();
                mover(e);
            }}
            onPointerMove={(e) => dedo.current === e.pointerId && mover(e)}
            onPointerUp={soltar}
            onPointerCancel={soltar}
            aria-hidden="true"
        >
            <span
                className="mu-joy-punto"
                style={{
                    transform: `translate(${punto.x * 2.2}rem, ${punto.y * 2.2}rem)`,
                }}
            />
        </div>
    );
}

/* ---------- Minimapa ---------- */
function Minimapa({ objetos, posicion, destinos, yo, camara }) {
    const [, setTic] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTic((n) => n + 1), 250);
        return () => clearInterval(t);
    }, []);
    const p = posicion.current;
    const ESCALA = 1.6; // px por metro
    const R = 52; // radio en px
    const a = (x, z) => [R + (x - p.x) * ESCALA, R + (z - p.z) * ESCALA];
    return (
        <svg className="mu-mapa" viewBox={`0 0 ${R * 2} ${R * 2}`} aria-hidden="true">
            <defs>
                <clipPath id="mu-mapa-c">
                    <circle cx={R} cy={R} r={R - 2} />
                </clipPath>
            </defs>
            <circle cx={R} cy={R} r={R - 1} className="mu-mapa-fondo" />
            <g clipPath="url(#mu-mapa-c)">
                <g transform={`rotate(${(camara.current.yaw * 180) / Math.PI} ${R} ${R})`}>
                    {objetos.map((o) => {
                        const [cx, cy] = a(o.x, o.z);
                        if (Math.abs(cx - R) > R + 40 || Math.abs(cy - R) > R + 40) return null;
                        if (o.tipo === "circulo")
                            return <circle key={o.id} cx={cx} cy={cy} r={Math.max(2.5, (o.ancho / 2) * ESCALA)} className="mu-mapa-circulo" style={{ stroke: o.color }} />;
                        if (o.tipo === "columna" || o.tipo === "arbol")
                            return <circle key={o.id} cx={cx} cy={cy} r={Math.max(1.5, (o.ancho / 2) * ESCALA)} className={o.tipo === "arbol" ? "mu-mapa-arbol" : "mu-mapa-obj"} />;
                        const w = Math.max(1.5, o.ancho * ESCALA);
                        const h = Math.max(1.5, Math.max(0.1, o.largo) * ESCALA);
                        return <rect key={o.id} x={cx - w / 2} y={cy - h / 2} width={w} height={h} transform={`rotate(${-(o.rot || 0)} ${cx} ${cy})`} className="mu-mapa-obj" />;
                    })}
                    {[...destinos.current.entries()].map(([id, d]) => {
                        if (id === yo) return null;
                        const [cx, cy] = a(d.x, d.z);
                        return <circle key={id} cx={cx} cy={cy} r={2.6} className="mu-mapa-otro" />;
                    })}
                </g>
            </g>
            {/* yo: flecha en el centro mirando hacia donde miro */}
            <path
                d={`M ${R} ${R - 6} L ${R + 4.5} ${R + 4.5} L ${R} ${R + 2} L ${R - 4.5} ${R + 4.5} Z`}
                className="mu-mapa-yo"
                transform={`rotate(${((camara.current.yaw - p.r + Math.PI) * 180) / Math.PI} ${R} ${R})`}
            />
        </svg>
    );
}

/* ---------- Elegir personaje ---------- */
function Elegir({ personajes, actual, alElegir, alCerrar }) {
    return (
        <div className="mu-capa" onClick={alCerrar}>
            <section className="mu-elegir" role="dialog" aria-modal="true" aria-labelledby="mu-elegir-t" onClick={(e) => e.stopPropagation()}>
                <header>
                    <h2 id="mu-elegir-t">Elige tu personaje</h2>
                    <button type="button" className="mu-icono" onClick={alCerrar} aria-label="Cerrar">
                        <LuX aria-hidden="true" />
                    </button>
                </header>
                <ul>
                    {personajes.map((p) => (
                        <li key={p.id}>
                            <button type="button" className={`mu-ficha ${p.id === actual ? "mu-ficha-actual" : ""}`} onClick={() => alElegir(p.id)}>
                                {p.foto ? <img src={p.foto} alt="" draggable="false" /> : <LuUserRound aria-hidden="true" />}
                                <span>{p.nombre}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

/* ---------- Escribir un mensaje (globo) ---------- */
function Escribir({ alEnviar, alCerrar }) {
    const [texto, setTexto] = useState("");
    const campo = useRef(null);
    useEffect(() => campo.current?.focus(), []);
    const enviar = (t) => {
        const limpio = t.trim();
        if (!limpio) return;
        alEnviar(limpio);
        alCerrar();
    };
    return (
        <div className="mu-escribir" onPointerDown={(e) => e.stopPropagation()}>
            <div className="mu-frases">
                {FRASES.map((f) => (
                    <button key={f} type="button" onClick={() => enviar(f)}>
                        {f}
                    </button>
                ))}
            </div>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    enviar(texto);
                }}
            >
                <input
                    ref={campo}
                    value={texto}
                    maxLength={80}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Escape") alCerrar();
                    }}
                    placeholder="Escribe algo… (sale encima de ti y se borra)"
                    aria-label="Mensaje"
                />
                <button type="submit" className="mu-enviar" aria-label="Enviar">
                    <LuSend aria-hidden="true" />
                </button>
                <button type="button" className="mu-icono" onClick={alCerrar} aria-label="Cerrar">
                    <LuX aria-hidden="true" />
                </button>
            </form>
        </div>
    );
}

/* ---------- Botón de hablar (mantener) ---------- */
function BotonMic({ hablando, alEmpezar, alTerminar, bloqueado }) {
    return (
        <button
            type="button"
            className={`mu-accion mu-mic ${hablando ? "mu-mic-on" : ""} ${bloqueado ? "mu-mic-no" : ""}`}
            onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                alEmpezar();
            }}
            onPointerUp={alTerminar}
            onPointerCancel={alTerminar}
            onLostPointerCapture={alTerminar}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Mantén para hablar"
            title="Mantén para hablar (PC: mantén V)"
        >
            {bloqueado ? <LuMicOff aria-hidden="true" /> : <LuMic aria-hidden="true" />}
            <small>{hablando ? "Hablando" : "Hablar"}</small>
        </button>
    );
}

export default function Mundo() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [config, setConfig] = useState(null);
    const [error, setError] = useState("");
    const [elegido, setElegido] = useState(null);
    const [eligiendo, setEligiendo] = useState(false);
    const [yo, setYo] = useState(null); // userId
    const [jugadores, setJugadores] = useState([]);
    const [globos, setGlobos] = useState({}); // userId → { texto, n }
    const [hablan, setHablan] = useState(() => new Set());
    const [escribiendo, setEscribiendo] = useState(false);
    const [verLista, setVerLista] = useState(false);
    const [correr, setCorrer] = useState(false);
    const [hablo, setHablo] = useState(false);
    const destinos = useRef(new Map());
    // Agarres: a quién cargan (víctima → el que carga) y quiénes cargan a alguien.
    const agarre = useRef({
        cargados: new Map(),
        cargando: new Set(),
        lanzarme: null,
        irA: null,
    });
    const [, setVerAgarre] = useState(0);
    const vistas = useRef(new Map()); // userId → dónde se ve ahora (para pegar al alzado)
    const [circulos, setCirculos] = useState({});
    const [desfase, setDesfase] = useState(0);
    const [, setTic] = useState(0);
    const entrada = useRef({
        joy: { x: 0, y: 0 },
        teclas: {},
        correr: false,
        saltar: false,
    });
    const camara = useRef({ yaw: 0, pitch: 0.36, y: 0 });
    const posicion = useRef({ x: 0, y: 0, z: 0, r: 0, vy: 0, enSuelo: true });
    const arrastre = useRef(null);
    const hablandoRef = useRef(false);
    const miIdRef = useRef(null);

    // 1) Diseño y personajes permitidos.
    useEffect(() => {
        api("/mundo")
            .then((r) => {
                setConfig(r);
                const guardado = leer(CLAVE_PERSONAJE);
                if (r.personajes.some((p) => p.id === guardado)) setElegido(guardado);
                else setEligiendo(true);
            })
            .catch((e) => setError(e.message));
    }, []);

    // 2) Entrar al mundo en vivo.
    useEffect(() => {
        if (!elegido) return undefined;
        const timers = new Set();
        const entrar = () => socket.emit("mundo:entrar", { personaje: elegido });
        const alBienvenida = ({ yo: id, config: c }) => {
            setYo(id);
            miIdRef.current = id;
            setConfig((x) => ({ ...x, ...c }));
        };
        const alJugadores = ({ jugadores: lista }) => {
            for (const j of lista)
                if (!destinos.current.has(j.userId))
                    destinos.current.set(j.userId, {
                        x: j.x,
                        y: j.y || 0,
                        z: j.z,
                        r: j.r,
                        andando: j.andando,
                    });
            const ids = new Set(lista.map((j) => j.userId));
            for (const id of destinos.current.keys()) if (!ids.has(id)) destinos.current.delete(id);
            setJugadores(lista);
        };
        const alPosiciones = ({ p }) => {
            for (const [id, x, y, z, r, a] of p) destinos.current.set(id, { x, y, z, r, andando: a });
        };
        const verAgarre = () => setVerAgarre((n) => n + 1);
        const alAgarre = ({ por, a }) => {
            agarre.current.cargados.set(a, por);
            agarre.current.cargando.add(por);
            verAgarre();
        };
        const quitarAgarre = (a) => {
            const por = agarre.current.cargados.get(a);
            agarre.current.cargados.delete(a);
            if (por != null) agarre.current.cargando.delete(por);
            verAgarre();
        };
        const alSoltado = ({ a }) => quitarAgarre(a);
        const alLanzado = (l) => {
            quitarAgarre(l.a);
            if (l.a === miIdRef.current) agarre.current.lanzarme = l;
            else
                destinos.current.set(l.a, {
                    ...(destinos.current.get(l.a) || {}),
                    x: l.x,
                    y: l.y,
                    z: l.z,
                    andando: 0,
                });
        };
        const alTele = (d) => {
            agarre.current.irA = d;
            sonar("iniciar");
        };
        const alCirculos = ({ ahora, c }) => {
            setDesfase(ahora - Date.now());
            setCirculos(Object.fromEntries(c.map((x) => [x.id, x])));
        };
        // Salí por un círculo de juego: a la pantalla previa.
        const alPartida = () => navigate("/preparando");
        const alDicho = ({ userId, texto }) => {
            setGlobos((g) => ({
                ...g,
                [userId]: { texto, n: (g[userId]?.n || 0) + 1 },
            }));
            const t = setTimeout(() => {
                timers.delete(t);
                setGlobos((g) => {
                    if (!g[userId] || g[userId].texto !== texto) return g;
                    const { [userId]: _, ...resto } = g;
                    return resto;
                });
            }, DURACION_GLOBO);
            timers.add(t);
        };
        const alHablando = ({ ids }) => setHablan(new Set(ids));
        const alAudio = ({ userId, pcm, rate }) => {
            const d = destinos.current.get(userId);
            const p = posicion.current;
            sonarVoz(userId, pcm, rate, d ? Math.hypot(d.x - p.x, d.z - p.z) : 99);
        };
        const alDiseno = ({ config: c }) => {
            setConfig((x) => ({ ...x, ...c }));
            avisar("El mundo se actualizó ✨", "ok", 2500);
        };
        const alError = ({ mensaje, voz, leve }) => {
            if (voz) {
                hablandoRef.current = false;
                setHablo(false);
                pararCaptura();
                avisar(mensaje, "error", 3000);
            } else if (leve || mensaje.includes("Espera")) avisar(mensaje, "error", 2000);
            else setError(mensaje);
        };
        const alPuedeHablar = async () => {
            if (!hablandoRef.current) return socket.emit("mundo:callar");
            try {
                await empezarCaptura((pcm) => hablandoRef.current && socket.emit("mundo:audio", { pcm, rate: TASA }));
                if (!hablandoRef.current) pararCaptura();
            } catch (e) {
                avisar(e.message, "error", 4000);
                hablandoRef.current = false;
                setHablo(false);
                socket.emit("mundo:callar");
            }
        };

        socket.on("connect", entrar);
        socket.on("mundo:bienvenida", alBienvenida);
        socket.on("mundo:jugadores", alJugadores);
        socket.on("mundo:posiciones", alPosiciones);
        socket.on("mundo:agarre", alAgarre);
        socket.on("mundo:soltado", alSoltado);
        socket.on("mundo:lanzado", alLanzado);
        socket.on("mundo:circulos", alCirculos);
        socket.on("mundo:teletransporte", alTele);
        socket.on("mundo:aPartida", alPartida);
        socket.on("mundo:dicho", alDicho);
        socket.on("mundo:hablando", alHablando);
        socket.on("mundo:audio", alAudio);
        socket.on("mundo:diseno", alDiseno);
        socket.on("mundo:error", alError);
        socket.on("mundo:puedeHablar", alPuedeHablar);
        if (socket.connected) entrar();
        else socket.connect();

        return () => {
            socket.emit("mundo:salir");
            socket.off("connect", entrar);
            socket.off("mundo:bienvenida", alBienvenida);
            socket.off("mundo:jugadores", alJugadores);
            socket.off("mundo:posiciones", alPosiciones);
            socket.off("mundo:agarre", alAgarre);
            socket.off("mundo:soltado", alSoltado);
            socket.off("mundo:lanzado", alLanzado);
            socket.off("mundo:circulos", alCirculos);
            socket.off("mundo:teletransporte", alTele);
            socket.off("mundo:aPartida", alPartida);
            socket.off("mundo:dicho", alDicho);
            socket.off("mundo:hablando", alHablando);
            socket.off("mundo:audio", alAudio);
            socket.off("mundo:diseno", alDiseno);
            socket.off("mundo:error", alError);
            socket.off("mundo:puedeHablar", alPuedeHablar);
            timers.forEach(clearTimeout);
            pararCaptura();
            cerrarVoces();
        };
    }, [elegido]); // eslint-disable-line react-hooks/exhaustive-deps

    // Si el servidor me cortó la voz (se acabó el tiempo), se apaga el micrófono.
    const miId = yo;
    useEffect(() => {
        if (hablo && miId != null && !hablan.has(miId) && hablandoRef.current === "activo") {
            hablandoRef.current = false;
            setHablo(false);
            pararCaptura();
        }
        if (hablandoRef.current && miId != null && hablan.has(miId)) hablandoRef.current = "activo";
    }, [hablan, hablo, miId]);

    // La cuenta de los círculos se ve bajar.
    const hayCuenta = Object.values(circulos).some((c) => c.hasta);
    useEffect(() => {
        if (!hayCuenta) return undefined;
        const t = setInterval(() => setTic((n) => n + 1), 500);
        return () => clearInterval(t);
    }, [hayCuenta]);

    // El volumen de quien habla sigue la distancia.
    useEffect(() => {
        if (!hablan.size) return undefined;
        const t = setInterval(() => {
            const p = posicion.current;
            for (const id of hablan) {
                const d = destinos.current.get(id);
                if (d) ajustarVolumen(id, Math.hypot(d.x - p.x, d.z - p.z));
            }
        }, 200);
        return () => clearInterval(t);
    }, [hablan]);

    const empezarHablar = useCallback(() => {
        if (hablandoRef.current) return;
        if (!micDisponible()) return avisar("Este navegador no permite usar el micrófono.", "error", 3000);
        hablandoRef.current = true;
        setHablo(true);
        socket.emit("mundo:hablar");
    }, []);
    const terminarHablar = useCallback(() => {
        if (!hablandoRef.current) return;
        hablandoRef.current = false;
        setHablo(false);
        pararCaptura();
        socket.emit("mundo:callar");
    }, []);

    // Agarrar o, si ya cargo a alguien, lanzarlo.
    const agarrarOLanzar = useCallback(() => {
        socket.emit(agarre.current.cargando.has(miIdRef.current) ? "mundo:lanzar" : "mundo:agarrar");
    }, []);
    const decir = useCallback((texto) => socket.emit("mundo:decir", { texto }), []);
    // Botón USAR: aparece cuando estoy parado en un círculo con función (teletransporte…).
    const [usable, setUsable] = useState(null);
    useEffect(() => {
        const t = setInterval(() => {
            const p = posicion.current;
            const c = (config?.objetos || []).find(
                (o) => o.tipo === "circulo" && o.funcion === "teletransporte" && o.destino && Math.hypot(p.x - o.x, p.z - o.z) <= o.ancho / 2 && Math.abs(p.y - (o.y || 0)) < 1.2
            );
            setUsable(c ? c.id : null);
        }, 250);
        return () => clearInterval(t);
    }, [config?.objetos]);
    const usar = useCallback(() => {
        if (usable) socket.emit("mundo:usar", { id: usable });
    }, [usable]);
    const usarRef = useRef(null);
    usarRef.current = usar;

    const brincar = useCallback(() => {
        entrada.current.saltar = true;
    }, []);
    const alternarCorrer = useCallback(() => {
        entrada.current.correr = !entrada.current.correr;
        setCorrer(entrada.current.correr);
    }, []);
    // Tocar el joystick (o moverse con el teclado) quita el correr solo.
    const quitarCorrer = useCallback(() => {
        if (!entrada.current.correr) return;
        entrada.current.correr = false;
        setCorrer(false);
    }, []);

    // 3) Teclado (PC).
    useEffect(() => {
        const MAPA = {
            KeyW: "w",
            ArrowUp: "w",
            KeyS: "s",
            ArrowDown: "s",
            KeyA: "a",
            ArrowLeft: "a",
            KeyD: "d",
            ArrowRight: "d",
            ShiftLeft: "shift",
            ShiftRight: "shift",
        };
        const abajo = (e) => {
            if (e.target instanceof HTMLInputElement) return;
            const k = MAPA[e.code];
            if (k) {
                entrada.current.teclas[k] = true;
                e.preventDefault();
            }
            if (e.code === "Space") {
                e.preventDefault();
                if (!e.repeat) brincar();
            }
            if (e.code === "KeyV" && !e.repeat) empezarHablar();
            if (e.code === "KeyE" && !e.repeat) agarrarOLanzar();
            if (e.code === "KeyF" && !e.repeat) usarRef.current?.();
            if (e.code === "KeyR" && !e.repeat) alternarCorrer();
            if (k && k !== "shift" && entrada.current.correr) quitarCorrer();
            if (e.key === "Enter") {
                e.preventDefault();
                setEscribiendo(true);
            }
            if (e.key === "Escape") navigate("/lobby");
        };
        const arriba = (e) => {
            const k = MAPA[e.code];
            if (k) entrada.current.teclas[k] = false;
            if (e.code === "KeyV") terminarHablar();
        };
        const soltarTodo = () => {
            entrada.current.teclas = {};
            terminarHablar();
        };
        window.addEventListener("keydown", abajo);
        window.addEventListener("keyup", arriba);
        window.addEventListener("blur", soltarTodo);
        return () => {
            window.removeEventListener("keydown", abajo);
            window.removeEventListener("keyup", arriba);
            window.removeEventListener("blur", soltarTodo);
        };
    }, [navigate, brincar, empezarHablar, terminarHablar, agarrarOLanzar, alternarCorrer, quitarCorrer]);

    // Arrastrar la pantalla gira la cámara.
    const alBajar = useCallback((e) => {
        arrastre.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }, []);
    const alMover = useCallback((e) => {
        const a = arrastre.current;
        if (!a || a.id !== e.pointerId) return;
        const c = camara.current;
        c.yaw -= (e.clientX - a.x) * 0.006;
        c.pitch = Math.max(0.05, Math.min(1.25, c.pitch + (e.clientY - a.y) * 0.004));
        a.x = e.clientX;
        a.y = e.clientY;
    }, []);
    const alSoltar = useCallback((e) => {
        if (arrastre.current?.id === e.pointerId) arrastre.current = null;
    }, []);

    const formas = useMemo(() => formasDe(config?.objetos || []), [config?.objetos]);

    const elegir = (id) => {
        guardar(CLAVE_PERSONAJE, id);
        setElegido(id);
        setEligiendo(false);
        if (elegido) socket.emit("mundo:entrar", { personaje: id });
    };

    if (error || (config && config.personajes.length === 0)) {
        return (
            <div className="mu mu-aviso">
                <p>{error || "El administrador aún no eligió personajes para el mundo."}</p>
                <button type="button" className="ffp-btn" onClick={() => navigate("/lobby")}>
                    Volver al lobby
                </button>
            </div>
        );
    }
    if (!config) {
        return (
            <div className="mu mu-aviso">
                <span className="mu-cargando" />
                <p>Entrando al mundo…</p>
            </div>
        );
    }

    const modeloDe = (id) => config.personajes.find((p) => p.id === id)?.modelo || config.personajes[0].modelo;
    const mio = jugadores.find((j) => j.userId === yo);
    const cargoAlguien = agarre.current.cargando.has(yo);
    const circuloUsable = usable ? config.objetos.find((o) => o.id === usable) : null;
    const otros = jugadores.filter((j) => j.userId !== yo);

    return (
        <div className={`mu mu-luz-${config.luz}`}>
            <div className="mu-escena" onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}>
                <Canvas shadows="percentage" camera={{ position: [0, 3, 6], fov: 58, near: 0.1, far: 900 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
                    <Cielo cielo={config.cielo} />
                    <Luces luz={config.luz} colorSuelo={config.suelo.color} siguiendo={posicion} />
                    <Suelo suelo={config.suelo} materiales={config.materiales} />
                    <Objetos objetos={config.objetos} materiales={config.materiales} circulos={circulos} desfase={desfase} />

                    {mio && (
                        <Yo
                            key={`yo-${mio.personaje}`}
                            modelo={modeloDe(mio.personaje)}
                            nombre={mio.nombre}
                            entrada={entrada}
                            camara={camara}
                            inicio={destinos.current.get(yo) || mio}
                            formas={formas}
                            posicion={posicion}
                            agarre={agarre}
                            vistas={vistas}
                            yoId={yo}
                            globo={globos[yo]}
                            habla={hablan.has(yo)}
                        />
                    )}
                    {otros.map((j) => (
                        <Otro
                            key={`${j.userId}-${j.personaje}`}
                            jugador={j}
                            modelo={modeloDe(j.personaje)}
                            destinos={destinos}
                            agarre={agarre}
                            vistas={vistas}
                            cargado={agarre.current.cargados.has(j.userId)}
                            globo={globos[j.userId]}
                            habla={hablan.has(j.userId)}
                        />
                    ))}
                </Canvas>
            </div>

            {/* ---------- Arriba ---------- */}
            <header className="mu-arriba">
                <Minimapa objetos={config.objetos} posicion={posicion} destinos={destinos} yo={yo} camara={camara} />
                <button type="button" className="mu-chip mu-chip-btn" onClick={() => setVerLista((v) => !v)} aria-expanded={verLista}>
                    <LuUsers aria-hidden="true" />
                    {jugadores.length}
                    <span className="mu-ocultar-movil"> en el mundo</span>
                </button>
                <span className="mu-espacio" />
                <button type="button" className="mu-chip mu-chip-btn" onClick={() => setEligiendo(true)}>
                    <LuUserRound aria-hidden="true" />
                    <span className="mu-ocultar-movil">Personaje</span>
                </button>
                <button type="button" className="mu-icono" onClick={() => navigate("/lobby")} aria-label="Salir del mundo">
                    <LuX aria-hidden="true" />
                </button>
            </header>

            {verLista && (
                <aside className="mu-lista" aria-label="Jugadores en el mundo">
                    <h3>En el mundo</h3>
                    <ul>
                        {jugadores.map((j) => (
                            <li key={j.userId}>
                                <span>
                                    {hablan.has(j.userId) && <LuMic aria-label="Hablando" className="mu-lista-mic" />}
                                    {j.nombre}
                                    {j.userId === yo && <em> (tú)</em>}
                                </span>
                                {j.userId !== yo && String(j.userId) !== String(user?.id) && <AccionesJugador userId={j.userId} nombre={j.nombre} contexto="mundo" />}
                            </li>
                        ))}
                    </ul>
                    <p>Los mensajes no se guardan. Si alguien molesta, silencia o reporta.</p>
                </aside>
            )}

            {/* ---------- Controles ---------- */}
            <Joystick entrada={entrada} alTocar={quitarCorrer} />

            <div className="mu-acciones" onPointerDown={(e) => e.stopPropagation()}>
                <button type="button" className="mu-accion mu-chica" onClick={() => setEscribiendo(true)} aria-label="Escribir un mensaje" title="Escribir (Enter)">
                    <LuMessageCircle aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={`mu-accion mu-agarrar ${cargoAlguien ? "mu-lanzar" : ""}`}
                    onClick={agarrarOLanzar}
                    aria-label={cargoAlguien ? "Lanzar" : "Agarrar"}
                    title={cargoAlguien ? "Lanzar (E)" : "Agarrar al que está al lado (E)"}
                >
                    {cargoAlguien ? <LuRocket aria-hidden="true" /> : <LuGrab aria-hidden="true" />}
                    <small>{cargoAlguien ? "Lanzar" : "Agarrar"}</small>
                </button>
                <BotonMic hablando={hablo} alEmpezar={empezarHablar} alTerminar={terminarHablar} />
                {circuloUsable && (
                    <button type="button" className="mu-accion mu-usar" onClick={usar} title="Usar (F)">
                        <LuSparkles aria-hidden="true" />
                        <small>Usar</small>
                    </button>
                )}
                <button
                    type="button"
                    className={`mu-accion ${correr ? "mu-correr-on" : ""}`}
                    onClick={alternarCorrer}
                    aria-pressed={correr}
                    title="Correr solo hacia donde mira la cámara (R). Toca el joystick para quitarlo."
                >
                    <LuZap aria-hidden="true" />
                    <small>Correr</small>
                </button>
                <button type="button" className="mu-accion mu-saltar" onPointerDown={brincar} aria-label="Brincar" title="Brincar (Espacio)">
                    <LuChevronsUp aria-hidden="true" />
                    <small>Brincar</small>
                </button>
            </div>

            {escribiendo && <Escribir alEnviar={decir} alCerrar={() => setEscribiendo(false)} />}

            {eligiendo && <Elegir personajes={config.personajes} actual={elegido} alElegir={elegir} alCerrar={elegido ? () => setEligiendo(false) : () => navigate("/lobby")} />}
        </div>
    );
}
