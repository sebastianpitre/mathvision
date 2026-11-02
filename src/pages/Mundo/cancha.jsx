import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

import ProtegerError from "../../components/common/ProtegerError";
import { ModeloGlb } from "./Escena";

/* =========================================================
   MUNDO 3D · CANCHA (minijuego azul vs rojo, tipo básquet)
   Lo que se dibuja: piso con las dos mitades, aros en el aire,
   bolas para entrar, letrero con instrucciones, marcador y el
   balón. Las reglas viven en el servidor (servidor/src/mundo/
   cancha.js); aquí van las mismas cuentas del tiro para dibujar
   la mira (dónde cae).
========================================================= */

export const COLOR_EQUIPO = { azul: "#3b82f6", rojo: "#ef4444" };
export const NOMBRE_EQUIPO = { azul: "Azul", rojo: "Rojo" };
const EQUIPOS = ["azul", "rojo"];
export const G_BALON = 14; // igual que en el servidor
export const G_PERSONA = 24; // la gravedad de los jugadores (fisica.js)
const RADIO_ENTRADA = 1.4;
const ESPERA_ENTRAR_MS = 3000;

/* Fuerza 0…1 → velocidades (las mismas cuentas del servidor). */
export const tiroBalon = (f) => ({ vh: 3 + 10 * f, vy: 5 + 5 * f });
export const tiroPersona = (f) => ({ vh: 4 + 9 * f, vy: 6 + 4 * f });

export function aMundoC(o, lx, lz) {
    const a = ((o.rot || 0) * Math.PI) / 180;
    return { x: o.x + lx * Math.cos(a) + lz * Math.sin(a), z: o.z - lx * Math.sin(a) + lz * Math.cos(a) };
}

function aLocalC(o, x, z) {
    const a = ((o.rot || 0) * Math.PI) / 180;
    const dx = x - o.x;
    const dz = z - o.z;
    return { lx: dx * Math.cos(a) - dz * Math.sin(a), lz: dx * Math.sin(a) + dz * Math.cos(a) };
}

/* Adentro de la cancha (para no salir caminando). */
export function dentroDeCancha(o, x, z, margen = 0.35) {
    const { lx, lz } = aLocalC(o, x, z);
    const hx = o.ancho / 2 - margen;
    const hz = o.largo / 2 - margen;
    return aMundoC(o, Math.max(-hx, Math.min(hx, lx)), Math.max(-hz, Math.min(hz, lz)));
}

/*
 * Camino del tiro: desde encima de la cabeza hacia "dir" con
 * fuerza f. Devuelve los puntos, dónde cae, la distancia y si
 * pasa por el aro "meta" (bajando).
 */
export function trayectoria(p, dir, f, { balon = true, suelo = 0, meta = null } = {}) {
    const { vh, vy: vy0 } = balon ? tiroBalon(f) : tiroPersona(f);
    const g = balon ? G_BALON : G_PERSONA;
    let x = p.x + Math.sin(dir) * 0.6;
    let y = p.y + 1.9;
    let z = p.z + Math.cos(dir) * 0.6;
    const x0 = x;
    const z0 = z;
    let vy = vy0;
    const vx = Math.sin(dir) * vh;
    const vz = Math.cos(dir) * vh;
    const puntos = [[x, y, z]];
    let encesta = false;
    const dt = 0.03;
    for (let i = 0; i < 200 && y > suelo; i += 1) {
        const ay = y;
        vy -= g * dt;
        x += vx * dt;
        y += vy * dt;
        z += vz * dt;
        if (meta && ay > meta.y && y <= meta.y) {
            const t = (ay - meta.y) / (ay - y || 1);
            const px = x - vx * dt * (1 - t);
            const pz = z - vz * dt * (1 - t);
            if (Math.hypot(px - meta.x, pz - meta.z) <= meta.radio) encesta = true;
        }
        puntos.push([x, Math.max(y, suelo), z]);
    }
    return { puntos, caida: { x, z }, distancia: Math.hypot(x - x0, z - z0), encesta };
}

/* Aro de un equipo en coordenadas del mundo. */
export function aroDe(o, i) {
    const k = o.cestas[i];
    const w = aMundoC(o, k.x, k.z);
    return { x: w.x, y: (o.y || 0) + k.y, z: w.z, radio: k.radio };
}

const reloj = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* ---------- Partes de la cancha ---------- */

function Lineas({ o }) {
    const blanco = <meshBasicMaterial color="#ffffff" toneMapped={false} />;
    const g = 0.08;
    return (
        <group position={[0, 0.022, 0]}>
            {/* borde */}
            <mesh position={[0, 0, -o.largo / 2 + g / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[o.ancho, g]} />
                {blanco}
            </mesh>
            <mesh position={[0, 0, o.largo / 2 - g / 2]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[o.ancho, g]} />
                {blanco}
            </mesh>
            <mesh position={[-o.ancho / 2 + g / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[g, o.largo]} />
                {blanco}
            </mesh>
            <mesh position={[o.ancho / 2 - g / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[g, o.largo]} />
                {blanco}
            </mesh>
            {/* mitad y círculo del centro */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[o.ancho, g]} />
                {blanco}
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[Math.min(1.8, o.ancho / 5) - g, Math.min(1.8, o.ancho / 5), 48]} />
                {blanco}
            </mesh>
        </group>
    );
}

/* Aro flotando, con red y un hilo de luz hasta el piso (para ubicarlo). */
function Aro({ k, color }) {
    const anillo = useRef(null);
    useFrame(({ clock }) => {
        if (anillo.current) anillo.current.material.emissiveIntensity = 0.8 + Math.sin(clock.elapsedTime * 3) * 0.3;
    });
    return (
        <group position={[k.x, k.y, k.z]}>
            <mesh ref={anillo} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <torusGeometry args={[k.radio, Math.max(0.05, k.radio * 0.07), 12, 48]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.4} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[k.radio * 0.95, 40]} />
                <meshBasicMaterial color={color} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position={[0, -k.radio * 0.4, 0]}>
                <cylinderGeometry args={[k.radio * 0.95, k.radio * 0.55, k.radio * 0.8, 16, 3, true]} />
                <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.55} />
            </mesh>
            <mesh position={[0, -k.y / 2, 0]}>
                <cylinderGeometry args={[0.03, 0.03, k.y, 6]} />
                <meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} toneMapped={false} />
            </mesh>
        </group>
    );
}

/* Bola para entrar a un equipo (con su cuenta de 3 s). */
function BolaEntrada({ p, equipo, entrando, ahora, yoId, etiquetas = true }) {
    const bola = useRef(null);
    const color = COLOR_EQUIPO[equipo];
    useFrame(({ clock }) => {
        if (bola.current) bola.current.position.y = 0.75 + Math.sin(clock.elapsedTime * 2 + (equipo === "rojo" ? 1 : 0)) * 0.12;
    });
    const mio = entrando?.[yoId]?.equipo === equipo ? entrando[yoId] : null;
    const otros = Object.values(entrando || {}).filter((x) => x.equipo === equipo).length;
    const faltan = mio ? Math.max(0, Math.ceil((mio.hasta - ahora) / 1000)) : null;
    const avance = mio ? Math.min(1, 1 - (mio.hasta - ahora) / ESPERA_ENTRAR_MS) : 0;
    return (
        <group position={[p.x, 0, p.z]}>
            <mesh ref={bola} castShadow>
                <sphereGeometry args={[0.6, 32, 24]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.25} metalness={0.1} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
                <ringGeometry args={[RADIO_ENTRADA - 0.12, RADIO_ENTRADA, 48]} />
                <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
            </mesh>
            {avance > 0 && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
                    <ringGeometry args={[RADIO_ENTRADA - 0.4, RADIO_ENTRADA - 0.14, 48, 1, Math.PI / 2, Math.PI * 2 * avance]} />
                    <meshBasicMaterial color="#ffffff" toneMapped={false} />
                </mesh>
            )}
            {etiquetas && (
                <Html position={[0, 2, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
                    <div className={`mu-circulo mu-entrada mu-entrada-${equipo}`}>
                        <strong>{`Equipo ${NOMBRE_EQUIPO[equipo]}`}</strong>
                        <span>{mio ? `Entrando… ${faltan}` : otros ? `${otros} entrando` : "Párate aquí 3 s"}</span>
                    </div>
                </Html>
            )}
        </group>
    );
}

/* Letrero con las instrucciones, junto a las bolas de entrada (un cartel de verdad). */
const PASOS = [
    "1. Párate 3 s junto a una bola para entrar a ese equipo.",
    "2. Agarrar: toma el balón o quítaselo al rival.",
    "3. Mantén Lanzar y desliza para apuntar.",
    "4. Encesta en el aro del otro color.",
    "5. Para salir, toca Salir arriba.",
];

function useCartel() {
    return useMemo(() => {
        const c = document.createElement("canvas");
        c.width = 1024;
        c.height = 700;
        const g = c.getContext("2d");
        g.fillStyle = "#0f172a";
        g.fillRect(0, 0, c.width, c.height);
        g.strokeStyle = "#fbbf24";
        g.lineWidth = 16;
        g.strokeRect(8, 8, c.width - 16, c.height - 16);
        g.textBaseline = "middle";
        g.fillStyle = "#fde68a";
        g.font = "800 74px system-ui, sans-serif";
        g.fillText("🏀 Azul vs Rojo", 50, 95);
        g.fillStyle = "#ffffff";
        g.font = "600 44px system-ui, sans-serif";
        PASOS.forEach((t, i) => {
            // corta en dos líneas si no cabe
            const palabras = t.split(" ");
            let linea = "";
            const lineas = [];
            for (const w of palabras) {
                const prueba = linea ? `${linea} ${w}` : w;
                if (g.measureText(prueba).width > c.width - 100 && linea) {
                    lineas.push(linea);
                    linea = `   ${w}`;
                } else linea = prueba;
            }
            lineas.push(linea);
            lineas.forEach((l, k) => g.fillText(l, 50, 200 + i * 100 + k * 46 - (lineas.length - 1) * 23));
        });
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return t;
    }, []);
}

function Letrero({ p, rot }) {
    const textura = useCartel();
    return (
        <group position={[p.x, 0, p.z]} rotation={[0, rot, 0]}>
            {[-1, 1].map((k) => (
                <mesh key={k} position={[k * 1.25, 1.1, -0.04]} castShadow>
                    <cylinderGeometry args={[0.05, 0.05, 2.2, 8]} />
                    <meshStandardMaterial color="#334155" />
                </mesh>
            ))}
            <mesh position={[0, 1.95, -0.06]} castShadow>
                <boxGeometry args={[2.75, 1.9, 0.06]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0, 1.95, -0.025]}>
                <planeGeometry args={[2.65, 1.81]} />
                <meshBasicMaterial map={textura} toneMapped={false} />
            </mesh>
        </group>
    );
}

/* Marcador encima de la cancha (para los que miran desde afuera). */
export function Marcador({ estado, ahora, compacto = false }) {
    const p = estado?.puntos || { azul: 0, rojo: 0 };
    const fin = estado?.fin;
    return (
        <div className={`mu-marcador ${compacto ? "mu-marcador-chico" : ""}`}>
            <div className="mu-marcador-fila">
                <span className="mu-marcador-equipo mu-azul">{`Azul ${p.azul}`}</span>
                <span className="mu-marcador-reloj">{fin ? "Final" : estado?.termina ? `⏱ ${reloj(estado.termina - ahora)}` : "Esperando"}</span>
                <span className="mu-marcador-equipo mu-rojo">{`${p.rojo} Rojo`}</span>
            </div>
            {fin && <p className="mu-marcador-fin">{fin.ganador === "empate" ? "¡Empate!" : `¡Ganó el equipo ${NOMBRE_EQUIPO[fin.ganador]}!`}</p>}
            {estado?.top?.length > 0 && (
                <ol className="mu-marcador-top">
                    {estado.top.map((t, i) => (
                        <li key={t.userId}>
                            <span>{["🥇", "🥈", "🥉"][i]}</span>
                            <b style={{ color: COLOR_EQUIPO[t.equipo] || "#fff" }}>{t.nombre}</b>
                            <em>{`${t.cestas} ${t.cestas === 1 ? "cesta" : "cestas"}`}</em>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

/* La cancha completa (sin el balón). */
export function Cancha({ o, estado = null, ahora = Date.now(), yoId = null, etiquetas = true }) {
    const rot = ((o.rot || 0) * Math.PI) / 180;
    const base = o.y || 0;
    const medio = o.entradas.reduce((s, p) => ({ x: s.x + p.x / 2, z: s.z + p.z / 2 }), { x: 0, z: 0 });
    const haciaX = Math.abs(medio.x) / o.ancho >= Math.abs(medio.z) / o.largo;
    const letrero = haciaX ? { x: medio.x + Math.sign(medio.x || 1) * 1.6, z: medio.z } : { x: medio.x, z: medio.z + Math.sign(medio.z || 1) * 1.6 };
    // El letrero mira hacia afuera: lo lee el que llega a las bolas.
    const mira = Math.atan2(letrero.x, letrero.z);
    return (
        <group position={[o.x, base, o.z]} rotation={[0, rot, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
                <planeGeometry args={[o.ancho, o.largo]} />
                <meshStandardMaterial color={o.color} roughness={0.8} />
            </mesh>
            {/* mitades: la del azul (su aro) y la del rojo */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, -o.largo / 4]}>
                <planeGeometry args={[o.ancho, o.largo / 2]} />
                <meshBasicMaterial color={COLOR_EQUIPO.azul} transparent opacity={0.14} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, o.largo / 4]}>
                <planeGeometry args={[o.ancho, o.largo / 2]} />
                <meshBasicMaterial color={COLOR_EQUIPO.rojo} transparent opacity={0.14} depthWrite={false} />
            </mesh>
            <Lineas o={o} />
            {o.cestas.map((k, i) => (
                <Aro key={i} k={k} color={COLOR_EQUIPO[EQUIPOS[i]]} />
            ))}
            {o.entradas.map((p, i) => (
                <BolaEntrada key={i} p={p} equipo={EQUIPOS[i]} entrando={estado?.entrando} ahora={ahora} yoId={yoId} etiquetas={etiquetas} />
            ))}
            <Letrero p={letrero} rot={mira} />
            {etiquetas && (
                <Html position={[0, Math.max(...o.cestas.map((k) => k.y)) + 3, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }} distanceFactor={14}>
                    <Marcador estado={estado} ahora={ahora} />
                </Html>
            )}
        </group>
    );
}

/* ---------- Balón ---------- */

function BalonNormal({ r }) {
    return (
        <group>
            <mesh castShadow>
                <sphereGeometry args={[r, 28, 20]} />
                <meshStandardMaterial color="#ea7a1a" roughness={0.75} />
            </mesh>
            {[0, Math.PI / 2].map((a) => (
                <mesh key={a} rotation={[0, a, 0]}>
                    <torusGeometry args={[r * 1.002, r * 0.035, 6, 40]} />
                    <meshBasicMaterial color="#1f130a" />
                </mesh>
            ))}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[r * 1.002, r * 0.035, 6, 40]} />
                <meshBasicMaterial color="#1f130a" />
            </mesh>
        </group>
    );
}

/*
 * El balón de una cancha. "datos" (ref) trae lo último del
 * servidor: { x, y, z, vx, vy, vz, por, pausa, t }. Entre
 * mensajes se adelanta con su velocidad y la gravedad; si
 * alguien lo tiene, va en sus manos (vistas = dónde se ve cada uno).
 */
export function Balon({ o, modelos = [], datos, vistas }) {
    const grupo = useRef(null);
    const giro = useRef(null);
    const r = o.tamBalon / 2;
    const piso = (o.y || 0) + r;
    const modelo = o.balon ? modelos.find((m) => m.id === o.balon) : null;
    const pos = useRef(null);

    useFrame((_, delta) => {
        const g = grupo.current;
        const d = datos.current.get(o.id);
        if (!g) return;
        if (!d || d.pausa) {
            g.visible = false;
            return;
        }
        g.visible = true;
        let meta;
        const v = d.por != null ? vistas.current.get(d.por) : null;
        if (v) {
            meta = { x: v.x + Math.sin(v.r) * 0.45, y: v.y + 1.15, z: v.z + Math.cos(v.r) * 0.45 };
        } else {
            const t = Math.min(1.5, (performance.now() - d.t) / 1000);
            meta = { x: d.x + d.vx * t, y: Math.max(piso, d.y + d.vy * t - (G_BALON * t * t) / 2), z: d.z + d.vz * t };
        }
        if (!pos.current) pos.current = { ...meta };
        const p = pos.current;
        const k = Math.min(1, delta * (v ? 25 : 14));
        const antes = { x: p.x, z: p.z };
        p.x += (meta.x - p.x) * k;
        p.y += (meta.y - p.y) * k;
        p.z += (meta.z - p.z) * k;
        g.position.set(p.x, p.y, p.z);
        // Rueda/gira con el movimiento.
        if (giro.current) {
            const mov = Math.hypot(p.x - antes.x, p.z - antes.z);
            giro.current.rotation.x += mov / Math.max(0.05, r);
            giro.current.rotation.y += delta * 0.6;
        }
    });

    return (
        <group ref={grupo} visible={false}>
            <group ref={giro}>
                {modelo ? (
                    <ProtegerError respaldo={<BalonNormal r={r} />}>
                        <Suspense fallback={<BalonNormal r={r} />}>
                            <group position={[0, -r, 0]}>
                                <ModeloGlb ruta={modelo.ruta} ancho={o.tamBalon} alto={o.tamBalon} largo={o.tamBalon} />
                            </group>
                        </Suspense>
                    </ProtegerError>
                ) : (
                    <BalonNormal r={r} />
                )}
            </group>
        </group>
    );
}

/* ---------- Mira: el camino del tiro y dónde cae ---------- */

const PUNTOS_MIRA = 36;

export function Mira({ mira }) {
    const puntos = useRef([]);
    const caida = useRef(null);
    const etiqueta = useRef(null);
    const geo = useMemo(() => new THREE.SphereGeometry(0.07, 8, 6), []);
    const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fde047", toneMapped: false, transparent: true, opacity: 0.9 }), []);

    useFrame(() => {
        const m = mira.current;
        const activo = m?.activo && m.camino;
        puntos.current.forEach((p, i) => {
            if (!p) return;
            if (!activo) {
                p.visible = false;
                return;
            }
            const lista = m.camino.puntos;
            const j = Math.floor((i / (PUNTOS_MIRA - 1)) * (lista.length - 1));
            const q = lista[j];
            p.visible = Boolean(q);
            if (q) p.position.set(q[0], q[1], q[2]);
        });
        if (caida.current) {
            caida.current.visible = Boolean(activo);
            if (activo) caida.current.position.set(m.camino.caida.x, m.suelo + 0.04, m.camino.caida.z);
        }
        if (etiqueta.current) {
            etiqueta.current.style.display = activo ? "block" : "none";
            if (activo) {
                etiqueta.current.textContent = m.camino.encesta ? `¡Encesta! · ${m.camino.distancia.toFixed(1)} m` : `${m.camino.distancia.toFixed(1)} m`;
                etiqueta.current.className = `mu-mira-etiqueta ${m.camino.encesta ? "mu-mira-encesta" : ""}`;
            }
        }
        mat.color.set(activo && m.camino.encesta ? "#4ade80" : "#fde047");
    });

    return (
        <group>
            {Array.from({ length: PUNTOS_MIRA }, (_, i) => (
                <mesh key={i} ref={(el) => (puntos.current[i] = el)} geometry={geo} material={mat} visible={false} />
            ))}
            <group ref={caida} visible={false}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.45, 0.62, 32]} />
                    <meshBasicMaterial color="#fde047" toneMapped={false} transparent opacity={0.9} />
                </mesh>
                <Html position={[0, 0.6, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
                    <span ref={etiqueta} className="mu-mira-etiqueta" style={{ display: "none" }} />
                </Html>
            </group>
        </group>
    );
}
