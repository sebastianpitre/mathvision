import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

import ProtegerError from "../../components/common/ProtegerError";
import { Cartel } from "./carteles.jsx";
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
export const tiroBalon = (f, deporte = "basquet") =>
    deporte === "futbol" ? { vh: 4 + 14 * f, vy: 1.5 + 6.5 * f, adelante: 0.7, alto: null } : { vh: 3 + 10 * f, vy: 5 + 5 * f, adelante: 0.6, alto: 1.9 };
export const tiroPersona = (f) => ({ vh: 4 + 9 * f, vy: 6 + 4 * f, adelante: 0.6, alto: 1.9 });
export const esFutbol = (o) => o?.deporte === "futbol";

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
 * Camino del tiro hacia "dir" con fuerza f. tipo: "basquet" (balón
 * desde encima de la cabeza), "futbol" (patada desde el piso) o
 * "persona" (lanzar a alguien). Devuelve los puntos, dónde cae, la
 * distancia y si entra en la meta: { aro } (bajando por el aro, sin
 * tocar el borde) o { porteria, cancha, k } (cruza la línea entre
 * los palos y debajo del travesaño).
 */
export function trayectoria(p, dir, f, { tipo = "basquet", suelo = 0, meta = null, radio = 0.3 } = {}) {
    const t = tipo === "persona" ? tiroPersona(f) : tiroBalon(f, tipo);
    const g = tipo === "persona" ? G_PERSONA : G_BALON;
    let x = p.x + Math.sin(dir) * t.adelante;
    let y = t.alto == null ? p.y + radio + 0.05 : p.y + t.alto;
    let z = p.z + Math.cos(dir) * t.adelante;
    const x0 = x;
    const z0 = z;
    let vy = t.vy;
    const vx = Math.sin(dir) * t.vh;
    const vz = Math.cos(dir) * t.vh;
    const puntos = [[x, y, z]];
    let encesta = false;
    let choca = false;
    const piso = tipo === "persona" ? suelo : suelo + radio;
    const dt = 0.03;
    for (let i = 0; i < 200 && y > piso; i += 1) {
        const ax = x;
        const ay = y;
        const az = z;
        vy -= g * dt;
        x += vx * dt;
        y += vy * dt;
        z += vz * dt;
        if (meta?.aro && !encesta) {
            const a = meta.aro;
            // ¿Toca el borde del aro? (con el mismo margen que el servidor)
            const hd = Math.hypot(x - a.x, z - a.z);
            if (hd > 1e-3 && Math.hypot(hd - a.radio, y - a.y) < radio * 0.5 + Math.max(0.05, a.radio * 0.07)) choca = true;
            if (ay > a.y && y <= a.y) {
                const k = (ay - a.y) / (ay - y || 1);
                if (Math.hypot(ax + (x - ax) * k - a.x, az + (z - az) * k - a.z) <= a.radio && !choca) encesta = true;
            }
        }
        if (meta?.porteria && !encesta) {
            const { cancha: o, k } = meta;
            const antes = aLocalC(o, ax, az);
            const ahora = aLocalC(o, x, z);
            const lado = Math.sign(k.z) || 1;
            if ((antes.lz - k.z) * lado < 0 && (ahora.lz - k.z) * lado >= 0 && Math.abs(ahora.lx - k.x) < k.radio - radio * 0.3 && y - (o.y || 0) < k.y) encesta = true;
        }
        puntos.push([x, Math.max(y, piso), z]);
    }
    return { puntos, caida: { x, z }, distancia: Math.hypot(x - x0, z - z0), encesta };
}

/* La meta del tiro de mi equipo (el aro o la portería del otro color). */
export function metaDe(o, equipo) {
    const i = equipo === "azul" ? 1 : 0;
    if (esFutbol(o)) return { porteria: true, cancha: o, k: o.cestas[i] };
    return { aro: aroDe(o, i) };
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

/* Portería de fútbol: marco cuadrado del color del equipo, sin fondo, con un difuminado en el medio. */
function useDifuminado(color) {
    return useMemo(() => {
        const c = document.createElement("canvas");
        c.width = 128;
        c.height = 128;
        const g = c.getContext("2d");
        const r = g.createRadialGradient(64, 64, 4, 64, 64, 90);
        r.addColorStop(0, `${color}66`);
        r.addColorStop(1, `${color}08`);
        g.fillStyle = r;
        g.fillRect(0, 0, 128, 128);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    }, [color]);
}

function Porteria({ k, color }) {
    const ancho = k.radio * 2;
    const g = 0.12;
    const fondo = useDifuminado(color);
    const material = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.4} />;
    return (
        <group position={[k.x, 0, k.z]}>
            {[-1, 1].map((s) => (
                <mesh key={s} position={[s * k.radio, k.y / 2, 0]} castShadow>
                    <boxGeometry args={[g, k.y, g]} />
                    {material}
                </mesh>
            ))}
            <mesh position={[0, k.y, 0]} castShadow>
                <boxGeometry args={[ancho + g, g, g]} />
                {material}
            </mesh>
            <mesh position={[0, k.y / 2, 0]}>
                <planeGeometry args={[ancho, k.y]} />
                <meshBasicMaterial map={fondo} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
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
            {/* cartelito en un palo junto a la bola (se lee de los dos lados) */}
            <mesh position={[0.95, 0.85, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 1.7, 8]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            {etiquetas && (
                <Cartel
                    position={[0.95, 1.95, 0]}
                    ancho={1.6}
                    alto={0.55}
                    fondo={equipo === "azul" ? "#0b2a5e" : "#5e0b0b"}
                    borde={color}
                    dosCaras
                    lineas={[
                        { t: `Equipo ${NOMBRE_EQUIPO[equipo]}` },
                        { t: mio ? `Entrando… ${faltan}` : otros ? `${otros} entrando` : "Párate aquí 3 s", s: 0.8, n: false },
                    ]}
                />
            )}
        </group>
    );
}

/* Letrero con las instrucciones, junto a las bolas de entrada (un cartel de verdad). */
const PASOS = {
    basquet: [
        "1. Párate 3 s junto a una bola para entrar a ese equipo.",
        "2. Agarrar: toma el balón o quítaselo al rival.",
        "3. Mantén Lanzar y desliza para apuntar.",
        "4. Encesta en el aro del otro color.",
        "5. Alzar y lanzar a un rival es falta. Salir: arriba.",
    ],
    futbol: [
        "1. Párate 3 s junto a una bola para entrar a ese equipo.",
        "2. Agarrar: lleva el balón o quítaselo al rival.",
        "3. Mantén Patear y desliza para apuntar.",
        "4. Mete gol en la portería del otro color.",
        "5. Alzar y lanzar a un rival es falta. Salir: arriba.",
    ],
};

function useCartel(deporte) {
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
        g.fillText(deporte === "futbol" ? "⚽ Azul vs Rojo" : "🏀 Azul vs Rojo", 50, 95);
        g.fillStyle = "#ffffff";
        g.font = "600 44px system-ui, sans-serif";
        PASOS[deporte === "futbol" ? "futbol" : "basquet"].forEach((t, i) => {
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
    }, [deporte]);
}

function Letrero({ p, rot, deporte }) {
    const textura = useCartel(deporte);
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
export function Marcador({ estado, ahora, compacto = false, futbol = false }) {
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
                            <em>{futbol ? `${t.cestas} ${t.cestas === 1 ? "gol" : "goles"}` : `${t.cestas} ${t.cestas === 1 ? "cesta" : "cestas"}`}</em>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

/* El marcador pintado en un cartel (solo se vuelve a pintar cuando cambia). */
function Tablero({ estado, ahora, futbol }) {
    const p = estado?.puntos || { azul: 0, rojo: 0 };
    const fin = estado?.fin;
    const lineas = [
        { t: `AZUL ${p.azul}  :  ${p.rojo} ROJO`, s: 1.3 },
        {
            t: fin ? (fin.ganador === "empate" ? "¡Empate!" : `¡Ganó el equipo ${NOMBRE_EQUIPO[fin.ganador]}!`) : estado?.termina ? `⏱ ${reloj(estado.termina - ahora)}` : "Esperando jugadores",
            c: "#fde68a",
            s: 0.85,
        },
        ...(estado?.top || []).map((t, i) => ({ t: `${["🥇", "🥈", "🥉"][i]} ${t.nombre} · ${t.cestas} ${futbol ? "⚽" : "🏀"}`, c: COLOR_EQUIPO[t.equipo] ? "#ffffff" : "#cbd5e1", s: 0.7, n: false })),
    ];
    return <Cartel position={[0, 4.6, 0]} ancho={4} alto={2} fondo="#0b1020" borde="#fbbf24" dosCaras lineas={lineas} />;
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
            {o.cestas.map((k, i) =>
                esFutbol(o) ? <Porteria key={i} k={k} color={COLOR_EQUIPO[EQUIPOS[i]]} /> : <Aro key={i} k={k} color={COLOR_EQUIPO[EQUIPOS[i]]} />
            )}
            {o.entradas.map((p, i) => (
                <BolaEntrada key={i} p={p} equipo={EQUIPOS[i]} entrando={estado?.entrando} ahora={ahora} yoId={yoId} etiquetas={etiquetas} />
            ))}
            <Letrero p={letrero} rot={mira} deporte={o.deporte} />
            {/* tablero del marcador en un poste, a un lado de la mitad de la cancha */}
            <group position={[-o.ancho / 2 - 0.8, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh position={[0, 1.9, 0]} castShadow>
                    <cylinderGeometry args={[0.08, 0.08, 3.8, 8]} />
                    <meshStandardMaterial color="#1f2937" />
                </mesh>
                {etiquetas && <Tablero estado={estado} ahora={ahora} futbol={esFutbol(o)} />}
            </group>
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

/* Balón de fútbol: blanco con parches negros (pintados una vez). */
let texturaFutbol = null;
function useTexturaFutbol() {
    return useMemo(() => {
        if (texturaFutbol) return texturaFutbol;
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 256;
        const g = c.getContext("2d");
        g.fillStyle = "#f8fafc";
        g.fillRect(0, 0, 512, 256);
        g.fillStyle = "#111827";
        const parche = (x, y, r) => {
            g.beginPath();
            for (let i = 0; i < 5; i += 1) {
                const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
            }
            g.fill();
        };
        for (let fila = 0; fila < 3; fila += 1) for (let i = 0; i < 6; i += 1) parche(i * 86 + (fila % 2) * 43 + 20, 45 + fila * 83, 22);
        texturaFutbol = new THREE.CanvasTexture(c);
        texturaFutbol.colorSpace = THREE.SRGBColorSpace;
        return texturaFutbol;
    }, []);
}

function BalonFutbol({ r }) {
    const mapa = useTexturaFutbol();
    return (
        <mesh castShadow>
            <sphereGeometry args={[r, 28, 20]} />
            <meshStandardMaterial map={mapa} roughness={0.55} />
        </mesh>
    );
}

/*
 * El balón de una cancha. "datos" (ref) trae lo último del
 * servidor: { x, y, z, vx, vy, vz, por, pausa, t }.
 * · Si alguien lo tiene, va pegado a él (en las manos o, en fútbol,
 *   a los pies), sin retraso: si para, el balón queda quieto.
 * · Suelto, se simula aquí igual que en el servidor (gravedad, bote y
 *   roce del piso) y cada mensaje lo corrige suave. Así no se adelanta
 *   y se devuelve.
 */
export function Balon({ o, modelos = [], datos, vistas }) {
    const grupo = useRef(null);
    const giro = useRef(null);
    const r = o.tamBalon / 2;
    const piso = (o.y || 0) + r;
    const futbol = esFutbol(o);
    const modelo = o.balon ? modelos.find((m) => m.id === o.balon) : null;
    const sim = useRef(null);
    const visto = useRef(0);

    useFrame((_, delta) => {
        const g = grupo.current;
        const d = datos.current.get(o.id);
        if (!g) return;
        if (!d || d.pausa) {
            g.visible = false;
            sim.current = null;
            return;
        }
        g.visible = true;
        const dt = Math.min(delta, 0.05);
        const antes = sim.current ? { x: sim.current.x, z: sim.current.z } : null;
        const v = d.por != null ? vistas.current.get(d.por) : null;
        if (v) {
            // Lo lleva alguien: pegado a él.
            const ad = futbol ? 0.6 : 0.45;
            sim.current = { x: v.x + Math.sin(v.r) * ad, y: futbol ? v.y + r : v.y + 1.15, z: v.z + Math.cos(v.r) * ad, vx: 0, vy: 0, vz: 0 };
        } else {
            let b = sim.current || { ...d };
            if (d.t !== visto.current) {
                visto.current = d.t;
                if (!b || Math.hypot(b.x - d.x, b.y - d.y, b.z - d.z) > 1.2) b = { ...d };
                else {
                    // Corrección suave hacia lo que dice el servidor.
                    b.x += (d.x - b.x) * 0.35;
                    b.y += (d.y - b.y) * 0.35;
                    b.z += (d.z - b.z) * 0.35;
                    b.vx = d.vx;
                    b.vy = d.vy;
                    b.vz = d.vz;
                }
            }
            // Igual que el servidor: gravedad, bote y roce en el piso.
            b.vy -= G_BALON * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;
            if (b.y <= piso) {
                b.y = piso;
                b.vy = Math.abs(b.vy) > 1.2 ? -b.vy * 0.55 : 0;
                const roce = 0.82 ** (dt / 0.05);
                b.vx *= roce;
                b.vz *= roce;
                if (!b.vy && Math.hypot(b.vx, b.vz) < 0.15) b.vx = b.vz = 0;
            }
            sim.current = b;
        }
        const b = sim.current;
        g.position.set(b.x, b.y, b.z);
        // Rueda con el movimiento (y gira un poquito en el aire).
        if (giro.current && antes) {
            const mx = b.x - antes.x;
            const mz = b.z - antes.z;
            const mov = Math.hypot(mx, mz);
            if (mov > 1e-4) {
                giro.current.rotation.y = Math.atan2(mx, mz);
                giro.current.children[0].rotation.x += mov / Math.max(0.05, r);
            }
        }
    });

    const cuerpo = futbol ? <BalonFutbol r={r} /> : <BalonNormal r={r} />;
    return (
        <group ref={grupo} visible={false}>
            <group ref={giro}>
                <group>
                    {modelo ? (
                        <ProtegerError respaldo={cuerpo}>
                            <Suspense fallback={cuerpo}>
                                <group position={[0, -r, 0]}>
                                    <ModeloGlb ruta={modelo.ruta} ancho={o.tamBalon} alto={o.tamBalon} largo={o.tamBalon} />
                                </group>
                            </Suspense>
                        </ProtegerError>
                    ) : (
                        cuerpo
                    )}
                </group>
            </group>
        </group>
    );
}

/* ---------- Mira: el camino del tiro y dónde cae ---------- */

const PUNTOS_MIRA = 36;

export function Mira({ mira, apuntando = false }) {
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
                {/* el texto solo existe mientras se apunta */}
                {apuntando && (
                    <Html position={[0, 0.6, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: "none" }}>
                    <span ref={etiqueta} className="mu-mira-etiqueta" style={{ display: "none" }} />
                    </Html>
                )}
            </group>
        </group>
    );
}
