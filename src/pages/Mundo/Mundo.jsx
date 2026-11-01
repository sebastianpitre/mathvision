import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { LuUserRound, LuUsers, LuX } from "react-icons/lu";

import ProtegerError from "../../components/common/ProtegerError";
import VRMCharacter from "../../components/character/VRMCharacter";
import { api } from "../../services/api";
import { socket } from "../../services/socket";

import "./mundo.css";

/* =========================================================
   MUNDO 3D (lobby para caminar)
   Por ahora: un suelo y un cielo de dos colores (los elige el
   admin) y todos los jugadores caminando juntos.
   · Celular: joystick abajo a la izquierda; arrastra la
     pantalla para girar la cámara.
   · PC: W A S D o flechas; arrastra con el mouse para girar.
   Solo se usan los personajes .glb que el admin permite.
========================================================= */

const VELOCIDAD = 4; // metros por segundo
const LIMITE = 58; // borde del suelo
const DISTANCIA_CAMARA = 6;
const CLAVE_PERSONAJE = "ludogamif:mundo-personaje";

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

/* ---------- Personaje con su nombre encima ---------- */
function Cuerpo({ modelo, andar, nombre, yo }) {
    return (
        <>
            <ProtegerError respaldo={null}>
                <Suspense fallback={null}>
                    <VRMCharacter url={modelo} andar={andar} texturaMax={512} rotation={[0, 0, 0]} />
                </Suspense>
            </ProtegerError>
            <Html position={[0, 2.05, 0]} center distanceFactor={9} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
                <span className={`mu-nombre ${yo ? "mu-nombre-yo" : ""}`}>{nombre}</span>
            </Html>
        </>
    );
}

/* ---------- Yo: se mueve con el joystick o el teclado ---------- */
function Yo({ modelo, nombre, entrada, camara, inicio }) {
    const grupo = useRef(null);
    const pos = useRef({ x: inicio.x, z: inicio.z, r: inicio.r });
    const andar = useRef(0);
    const ultimoEnvio = useRef({ t: 0, x: NaN, z: NaN, r: NaN, a: -1 });
    const { camera } = useThree();

    useFrame((_, delta) => {
        const dt = Math.min(delta, 0.05);
        const t = entrada.current.teclas;
        let ix = entrada.current.joy.x + (t.d ? 1 : 0) - (t.a ? 1 : 0);
        let iy = entrada.current.joy.y + (t.w ? 1 : 0) - (t.s ? 1 : 0);
        const largo = Math.hypot(ix, iy);
        if (largo > 1) {
            ix /= largo;
            iy /= largo;
        }
        const fuerza = Math.min(1, largo);
        const yaw = camara.current.yaw;
        const p = pos.current;

        if (fuerza > 0.08) {
            // Adelante = alejándose de la cámara.
            const dx = -Math.sin(yaw) * iy + Math.cos(yaw) * ix;
            const dz = -Math.cos(yaw) * iy - Math.sin(yaw) * ix;
            p.x = Math.max(-LIMITE, Math.min(LIMITE, p.x + dx * VELOCIDAD * fuerza * dt));
            p.z = Math.max(-LIMITE, Math.min(LIMITE, p.z + dz * VELOCIDAD * fuerza * dt));
            p.r = girarHacia(p.r, Math.atan2(dx, dz), Math.min(1, dt * 12));
        }
        andar.current += ((fuerza > 0.08 ? 1 : 0) - andar.current) * Math.min(1, dt * 10);

        if (grupo.current) {
            grupo.current.position.set(p.x, 0, p.z);
            grupo.current.rotation.y = p.r;
        }

        // Cámara detrás, un poco arriba.
        const c = camara.current;
        const dist = DISTANCIA_CAMARA;
        camera.position.set(p.x + Math.sin(yaw) * dist * Math.cos(c.pitch), 1.2 + Math.sin(c.pitch) * dist, p.z + Math.cos(yaw) * dist * Math.cos(c.pitch));
        camera.lookAt(p.x, 1.2, p.z);

        // Avisa al servidor (10 veces por segundo, solo si cambió).
        const u = ultimoEnvio.current;
        const ahora = performance.now();
        const anda = andar.current > 0.5;
        if (ahora - u.t > 100 && (Math.abs(u.x - p.x) > 0.01 || Math.abs(u.z - p.z) > 0.01 || Math.abs(u.r - p.r) > 0.02 || u.a !== anda)) {
            socket.emit("mundo:mover", { x: p.x, z: p.z, r: p.r, andando: anda });
            Object.assign(u, { t: ahora, x: p.x, z: p.z, r: p.r, a: anda });
        }
    });

    return (
        <group ref={grupo} position={[inicio.x, 0, inicio.z]}>
            <Cuerpo modelo={modelo} andar={andar} nombre={nombre} yo />
        </group>
    );
}

/* ---------- Los demás: se acercan suave a su última posición ---------- */
function Otro({ jugador, modelo, destinos }) {
    const grupo = useRef(null);
    const andar = useRef(0);

    useFrame((_, delta) => {
        const d = destinos.current.get(jugador.userId);
        const g = grupo.current;
        if (!d || !g) return;
        const t = Math.min(1, delta * 10);
        g.position.x += (d.x - g.position.x) * t;
        g.position.z += (d.z - g.position.z) * t;
        g.rotation.y = girarHacia(g.rotation.y, d.r, t);
        andar.current += ((d.andando ? 1 : 0) - andar.current) * Math.min(1, delta * 8);
    });

    return (
        <group ref={grupo} position={[jugador.x, 0, jugador.z]} rotation={[0, jugador.r, 0]}>
            <Cuerpo modelo={modelo} andar={andar} nombre={jugador.nombre} />
        </group>
    );
}

/* ---------- Joystick (celular) ---------- */
function Joystick({ entrada }) {
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
            className="mu-joy"
            onPointerDown={(e) => {
                e.stopPropagation();
                dedo.current = e.pointerId;
                e.currentTarget.setPointerCapture(e.pointerId);
                mover(e);
            }}
            onPointerMove={(e) => dedo.current === e.pointerId && mover(e)}
            onPointerUp={soltar}
            onPointerCancel={soltar}
            aria-hidden="true"
        >
            <span className="mu-joy-punto" style={{ transform: `translate(${punto.x * 2.2}rem, ${punto.y * 2.2}rem)` }} />
        </div>
    );
}

/* ---------- Elegir personaje ---------- */
function Elegir({ personajes, actual, alElegir, alCerrar }) {
    return (
        <div className="mu-capa">
            <section className="mu-elegir" role="dialog" aria-modal="true" aria-labelledby="mu-elegir-t">
                <header>
                    <h2 id="mu-elegir-t">Elige tu personaje</h2>
                    {alCerrar && (
                        <button type="button" className="mu-icono" onClick={alCerrar} aria-label="Cerrar">
                            <LuX aria-hidden="true" />
                        </button>
                    )}
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

export default function Mundo() {
    const navigate = useNavigate();
    const [config, setConfig] = useState(null);
    const [error, setError] = useState("");
    const [elegido, setElegido] = useState(null);
    const [eligiendo, setEligiendo] = useState(false);
    const [yo, setYo] = useState(null); // userId
    const [jugadores, setJugadores] = useState([]);
    const destinos = useRef(new Map());
    const entrada = useRef({ joy: { x: 0, y: 0 }, teclas: {} });
    const camara = useRef({ yaw: 0, pitch: 0.38 });
    const arrastre = useRef(null);

    // 1) Colores y personajes permitidos.
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
        const entrar = () => socket.emit("mundo:entrar", { personaje: elegido });
        const alBienvenida = ({ yo: id, config: c }) => {
            setYo(id);
            setConfig((x) => ({ ...x, ...c }));
        };
        const alJugadores = ({ jugadores: lista }) => {
            for (const j of lista) if (!destinos.current.has(j.userId)) destinos.current.set(j.userId, { x: j.x, z: j.z, r: j.r, andando: j.andando });
            const ids = new Set(lista.map((j) => j.userId));
            for (const id of destinos.current.keys()) if (!ids.has(id)) destinos.current.delete(id);
            setJugadores(lista);
        };
        const alPosiciones = ({ p }) => {
            for (const [id, x, z, r, a] of p) destinos.current.set(id, { x, z, r, andando: Boolean(a) });
        };
        const alError = ({ mensaje }) => setError(mensaje);

        socket.on("connect", entrar);
        socket.on("mundo:bienvenida", alBienvenida);
        socket.on("mundo:jugadores", alJugadores);
        socket.on("mundo:posiciones", alPosiciones);
        socket.on("mundo:error", alError);
        if (socket.connected) entrar();
        else socket.connect();

        return () => {
            socket.emit("mundo:salir");
            socket.off("connect", entrar);
            socket.off("mundo:bienvenida", alBienvenida);
            socket.off("mundo:jugadores", alJugadores);
            socket.off("mundo:posiciones", alPosiciones);
            socket.off("mundo:error", alError);
        };
    }, [elegido]);

    // 3) Teclado (PC).
    useEffect(() => {
        const MAPA = { KeyW: "w", ArrowUp: "w", KeyS: "s", ArrowDown: "s", KeyA: "a", ArrowLeft: "a", KeyD: "d", ArrowRight: "d" };
        const abajo = (e) => {
            const k = MAPA[e.code];
            if (k) {
                entrada.current.teclas[k] = true;
                e.preventDefault();
            }
            if (e.key === "Escape") navigate("/lobby");
        };
        const arriba = (e) => {
            const k = MAPA[e.code];
            if (k) entrada.current.teclas[k] = false;
        };
        const soltarTodo = () => (entrada.current.teclas = {});
        window.addEventListener("keydown", abajo);
        window.addEventListener("keyup", arriba);
        window.addEventListener("blur", soltarTodo);
        return () => {
            window.removeEventListener("keydown", abajo);
            window.removeEventListener("keyup", arriba);
            window.removeEventListener("blur", soltarTodo);
        };
    }, [navigate]);

    // Arrastrar la pantalla gira la cámara.
    const alBajar = useCallback((e) => {
        arrastre.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }, []);
    const alMover = useCallback((e) => {
        const a = arrastre.current;
        if (!a || a.id !== e.pointerId) return;
        const c = camara.current;
        c.yaw -= (e.clientX - a.x) * 0.006;
        c.pitch = Math.max(0.08, Math.min(1.2, c.pitch + (e.clientY - a.y) * 0.004));
        a.x = e.clientX;
        a.y = e.clientY;
    }, []);
    const alSoltar = useCallback((e) => {
        if (arrastre.current?.id === e.pointerId) arrastre.current = null;
    }, []);

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
    if (!config) return <div className="mu mu-aviso"><p>Cargando el mundo…</p></div>;

    const modeloDe = (id) => config.personajes.find((p) => p.id === id)?.modelo || config.personajes[0].modelo;
    const mio = jugadores.find((j) => j.userId === yo);

    return (
        <div className="mu" style={{ background: config.cielo }}>
            <div className="mu-escena" onPointerDown={alBajar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}>
                <Canvas camera={{ position: [0, 3, 6], fov: 55, near: 0.1, far: 300 }} dpr={[1, 1.5]}>
                    <color attach="background" args={[config.cielo]} />
                    <fog attach="fog" args={[config.cielo, 35, 110]} />
                    <hemisphereLight args={["#ffffff", config.suelo, 1.4]} />
                    <ambientLight intensity={0.9} />
                    <directionalLight position={[8, 14, 6]} intensity={2.2} />

                    {/* Suelo */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[LIMITE * 2 + 4, LIMITE * 2 + 4]} />
                        <meshLambertMaterial color={config.suelo} />
                    </mesh>
                    {/* Líneas suaves para notar que te mueves */}
                    <gridHelper
                        args={[LIMITE * 2 + 4, 40, "#000000", "#000000"]}
                        position={[0, 0.01, 0]}
                        onUpdate={(g) => {
                            g.material.transparent = true;
                            g.material.opacity = 0.1;
                        }}
                    />

                    {mio && (
                        <Yo key={`yo-${mio.personaje}`} modelo={modeloDe(mio.personaje)} nombre={mio.nombre} entrada={entrada} camara={camara} inicio={destinos.current.get(yo) || mio} />
                    )}
                    {jugadores
                        .filter((j) => j.userId !== yo)
                        .map((j) => (
                            <Otro key={`${j.userId}-${j.personaje}`} jugador={j} modelo={modeloDe(j.personaje)} destinos={destinos} />
                        ))}
                </Canvas>
            </div>

            <header className="mu-arriba">
                <span className="mu-chip">
                    <LuUsers aria-hidden="true" />
                    {`${jugadores.length} en el mundo`}
                </span>
                <button type="button" className="mu-chip mu-chip-btn" onClick={() => setEligiendo(true)}>
                    <LuUserRound aria-hidden="true" />
                    Personaje
                </button>
                <button type="button" className="mu-icono" onClick={() => navigate("/lobby")} aria-label="Salir del mundo">
                    <LuX aria-hidden="true" />
                </button>
            </header>

            <Joystick entrada={entrada} />
            <p className="mu-ayuda">Arrastra la pantalla para girar · PC: W A S D</p>

            {eligiendo && <Elegir personajes={config.personajes} actual={elegido} alElegir={elegir} alCerrar={elegido ? () => setEligiendo(false) : () => navigate("/lobby")} />}
        </div>
    );
}
