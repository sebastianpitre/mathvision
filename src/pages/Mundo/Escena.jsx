import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as clonarEsqueleto } from "three/examples/jsm/utils/SkeletonUtils.js";

import ProtegerError from "../../components/common/ProtegerError";
import juegosLista from "../../data/mock/games.json";
import { alturaBaranda, materialDe, materialPared, palitosDe, partesDe } from "./piezas.js";
import { Cancha } from "./cancha.jsx";
import { TablaRanking } from "./Ranking.jsx";
import { Cartel } from "./carteles.jsx";

/* =========================================================
   MUNDO 3D · EL ESCENARIO
   Cielo (color, degradado o foto 360°), suelo (color o foto
   repetida como baldosa), luz (día, tarde, noche) y los
   objetos que pone el administrador.
========================================================= */

export const TAMANO_SUELO = 124;

/* ---------- Texturas ---------- */
function useTextura(ruta, repetirX = 1, repetirY = 1) {
    const base = useLoader(THREE.TextureLoader, ruta);
    const gl = useThree((s) => s.gl);
    return useMemo(() => {
        const t = base.clone();
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(Math.max(0.05, repetirX), Math.max(0.05, repetirY));
        t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        t.needsUpdate = true;
        return t;
    }, [base, repetirX, repetirY, gl]);
}

/* Material con foto (si hay) y si no, solo color. Mientras carga la foto se ve el color.
   transparente: PNG con huecos (rejas, hojas…) que se ven a través. */
function Material({ color, textura, repetirX, repetirY, rugoso = 0.85, transparente = false }) {
    if (!textura) return <meshStandardMaterial color={color} roughness={rugoso} />;
    return (
        <ProtegerError respaldo={<meshStandardMaterial color={color} roughness={rugoso} />}>
            <Suspense fallback={<meshStandardMaterial color={color} roughness={rugoso} transparent={transparente} opacity={transparente ? 0.4 : 1} />}>
                <MaterialFoto textura={textura} repetirX={repetirX} repetirY={repetirY} rugoso={rugoso} transparente={transparente} />
            </Suspense>
        </ProtegerError>
    );
}

function MaterialFoto({ textura, repetirX, repetirY, rugoso, transparente }) {
    const mapa = useTextura(textura, repetirX, repetirY);
    if (transparente) return <meshStandardMaterial map={mapa} roughness={rugoso} transparent alphaTest={0.35} side={THREE.DoubleSide} />;
    return <meshStandardMaterial map={mapa} roughness={rugoso} />;
}

/* ---------- Cielo ---------- */
const VERTICE = `
varying vec3 vPos;
void main() {
    vPos = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAGMENTO = `
uniform vec3 arriba;
uniform vec3 horizonte;
varying vec3 vPos;
void main() {
    float h = normalize(vPos).y;
    float t = pow(clamp(h, 0.0, 1.0), 0.55);
    gl_FragColor = vec4(mix(horizonte, arriba, t), 1.0);
    #include <colorspace_fragment>
}`;

function CieloDegradado({ arriba, horizonte }) {
    const malla = useRef(null);
    const uniforms = useMemo(() => ({ arriba: { value: new THREE.Color(arriba) }, horizonte: { value: new THREE.Color(horizonte) } }), [arriba, horizonte]);
    useFrame(({ camera }) => malla.current?.position.copy(camera.position));
    return (
        <mesh ref={malla} renderOrder={-1}>
            <sphereGeometry args={[400, 32, 16]} />
            <shaderMaterial side={THREE.BackSide} depthWrite={false} fog={false} uniforms={uniforms} vertexShader={VERTICE} fragmentShader={FRAGMENTO} />
        </mesh>
    );
}

function CieloFoto({ foto }) {
    const base = useLoader(THREE.TextureLoader, foto);
    const scene = useThree((s) => s.scene);
    useEffect(() => {
        const t = base.clone();
        t.mapping = THREE.EquirectangularReflectionMapping;
        t.colorSpace = THREE.SRGBColorSpace;
        t.needsUpdate = true;
        const antes = scene.background;
        scene.background = t;
        return () => {
            scene.background = antes;
            t.dispose();
        };
    }, [base, scene]);
    return null;
}

export function Cielo({ cielo }) {
    const fondo = cielo.tipo === "color" ? cielo.color : cielo.horizonte;
    return (
        <>
            <color attach="background" args={[fondo]} />
            <fog attach="fog" args={[fondo, 40, 125]} />
            {cielo.tipo === "degradado" && <CieloDegradado arriba={cielo.arriba} horizonte={cielo.horizonte} />}
            {cielo.tipo === "foto" && cielo.foto && (
                <ProtegerError respaldo={<CieloDegradado arriba={cielo.arriba} horizonte={cielo.horizonte} />}>
                    <Suspense fallback={<CieloDegradado arriba={cielo.arriba} horizonte={cielo.horizonte} />}>
                        <CieloFoto foto={cielo.foto} />
                    </Suspense>
                </ProtegerError>
            )}
        </>
    );
}

/* ---------- Luz ---------- */
const LUCES = {
    dia: { cielo: "#ffffff", suelo: 1.25, ambiente: 0.55, sol: "#fff6e5", fuerza: 2.4, pos: [30, 45, 20] },
    tarde: { cielo: "#ffd6a8", suelo: 0.95, ambiente: 0.35, sol: "#ff9d55", fuerza: 2.3, pos: [45, 14, 12] },
    noche: { cielo: "#7d8fd6", suelo: 0.45, ambiente: 0.22, sol: "#a9bcff", fuerza: 0.9, pos: [-25, 35, -15] },
};

/* El sol sigue al jugador para que las sombras siempre se vean cerca. */
export function Luces({ luz, colorSuelo, siguiendo }) {
    const L = LUCES[luz] || LUCES.dia;
    const sol = useRef(null);
    useFrame(() => {
        const s = sol.current;
        const p = siguiendo?.current;
        if (!s || !p) return;
        s.position.set(p.x + L.pos[0] * 0.5, L.pos[1] * 0.5, p.z + L.pos[2] * 0.5);
        s.target.position.set(p.x, 0, p.z);
        s.target.updateMatrixWorld();
    });
    return (
        <>
            <hemisphereLight args={[L.cielo, colorSuelo, L.suelo]} />
            <ambientLight intensity={L.ambiente} />
            <directionalLight
                ref={sol}
                color={L.sol}
                intensity={L.fuerza}
                position={L.pos}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-bias={-0.0005}
                shadow-normalBias={0.03}
                shadow-camera-left={-22}
                shadow-camera-right={22}
                shadow-camera-top={22}
                shadow-camera-bottom={-22}
                shadow-camera-near={1}
                shadow-camera-far={90}
            />
        </>
    );
}

/* ---------- Suelo ---------- */
export function Suelo({ suelo, materiales = [], tamano = 60 }) {
    const m = materialDe(suelo, materiales);
    const lado = tamano * 2 + 4;
    const veces = lado / (m.baldosa || suelo.baldosa || 4);
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[lado, lado]} />
            <Material color={m.color} textura={m.textura} repetirX={veces} repetirY={veces} rugoso={0.95} />
        </mesh>
    );
}

/* ---------- Objetos ---------- */
const RAD = Math.PI / 180;

/* Una caja con su textura repetida según su tamaño. */
function Caja({ w, h, d, m, posicion, sombra = true }) {
    const b = m.baldosa || 2;
    return (
        <mesh position={posicion} castShadow={sombra && !m.transparente} receiveShadow>
            <boxGeometry args={[w, h, Math.max(0.05, d)]} />
            <Material color={m.color} textura={m.textura} transparente={m.transparente} repetirX={Math.max(w, d) / b} repetirY={Math.max(h, Math.min(w, d)) / b} />
        </mesh>
    );
}

/* Baranda: palitos parados y un pasamanos arriba (inclinada: el pasamanos sube). */
function Baranda({ o, m }) {
    const g = o.grueso || 0.06;
    const xs = palitosDe(o);
    const b = m.baldosa || 2;
    const y0 = alturaBaranda(o, -o.ancho / 2);
    const y1 = alturaBaranda(o, o.ancho / 2);
    const largo = Math.hypot(o.ancho, y1 - y0) + g;
    const angulo = Math.atan2(y1 - y0, o.ancho);
    return (
        <>
            {xs.map((x) => (
                <mesh key={x} position={[x, alturaBaranda(o, x) + (o.alto - g) / 2, 0]} castShadow>
                    <cylinderGeometry args={[g / 2, g / 2, o.alto - g, 8]} />
                    <Material color={m.color} textura={m.textura} transparente={m.transparente} repetirX={1} repetirY={o.alto / b} />
                </mesh>
            ))}
            <mesh position={[0, (y0 + y1) / 2 + o.alto - g * 0.6, 0]} rotation={[0, 0, angulo - Math.PI / 2]} castShadow>
                <cylinderGeometry args={[g * 0.75, g * 0.75, largo, 10]} />
                <Material color={m.color} textura={m.textura} transparente={m.transparente} repetirX={1} repetirY={largo / b} />
            </mesh>
        </>
    );
}

/* "Mis objetos": un modelo .glb que sube el admin, estirado al tamaño elegido. */
export function ModeloGlb({ ruta, ancho, alto, largo }) {
    const gltf = useLoader(GLTFLoader, ruta);
    const { objeto, escala, centro } = useMemo(() => {
        const copia = clonarEsqueleto(gltf.scene);
        copia.traverse((n) => {
            if (n.isMesh) {
                n.castShadow = true;
                n.receiveShadow = true;
            }
        });
        // La medida se toma del original (en un clon con esqueleto las medidas salen mal).
        gltf.scene.updateMatrixWorld(true);
        const caja = new THREE.Box3().setFromObject(gltf.scene);
        const t = caja.getSize(new THREE.Vector3());
        const c = caja.getCenter(new THREE.Vector3());
        return { objeto: copia, escala: [ancho / (t.x || 1), alto / (t.y || 1), largo / (t.z || 1)], centro: [c.x, caja.min.y, c.z] };
    }, [gltf, ancho, alto, largo]);
    return (
        <group scale={escala}>
            <primitive object={objeto} position={[-centro[0], -centro[1], -centro[2]]} />
        </group>
    );
}

function Modelo({ o, modelos }) {
    const m = modelos.find((x) => x.id === o.modelo);
    const rot = (o.rot || 0) * RAD;
    if (!m) return null;
    return (
        <group position={[o.x, o.y || 0, o.z]} rotation={new THREE.Euler(-(o.incl || 0) * RAD, rot, 0, "YXZ")}>
            <ProtegerError
                respaldo={
                    <mesh position={[0, o.alto / 2, 0]}>
                        <boxGeometry args={[o.ancho, o.alto, o.largo]} />
                        <meshStandardMaterial color="#f87171" wireframe />
                    </mesh>
                }
            >
                <Suspense
                    fallback={
                        <mesh position={[0, o.alto / 2, 0]}>
                            <boxGeometry args={[o.ancho, o.alto, o.largo]} />
                            <meshStandardMaterial color="#94a3b8" transparent opacity={0.35} />
                        </mesh>
                    }
                >
                    <ModeloGlb ruta={m.ruta} ancho={o.ancho} alto={o.alto} largo={o.largo} />
                </Suspense>
            </ProtegerError>
        </group>
    );
}

function Objeto({ o, materiales, modelos }) {
    if (o.tipo === "modelo") return <Modelo o={o} modelos={modelos} />;
    const rot = (o.rot || 0) * RAD;
    const base = o.y || 0;
    const m = materialDe(o, materiales);
    const b = m.baldosa || 2;

    if (o.tipo === "columna") {
        return (
            <mesh position={[o.x, base + o.alto / 2, o.z]} castShadow receiveShadow>
                <cylinderGeometry args={[o.ancho / 2, o.ancho / 2, o.alto, 28]} />
                <Material color={m.color} textura={m.textura} repetirX={(Math.PI * o.ancho) / b} repetirY={o.alto / b} />
            </mesh>
        );
    }

    if (o.tipo === "arbol") {
        const tronco = o.alto * 0.45;
        const copa = o.ancho / 2;
        return (
            <group position={[o.x, base, o.z]} rotation={[0, rot, 0]}>
                <mesh position={[0, tronco / 2, 0]} castShadow>
                    <cylinderGeometry args={[o.ancho * 0.07, o.ancho * 0.11, tronco, 10]} />
                    <meshStandardMaterial color="#6b4a2f" roughness={0.95} />
                </mesh>
                <mesh position={[0, tronco + copa * 0.55, 0]} castShadow>
                    <icosahedronGeometry args={[copa, 1]} />
                    <Material color={m.color} textura={m.textura} repetirX={2} repetirY={2} />
                </mesh>
                <mesh position={[copa * 0.45, tronco + copa * 0.2, copa * 0.2]} castShadow>
                    <icosahedronGeometry args={[copa * 0.6, 1]} />
                    <Material color={m.color} textura={m.textura} repetirX={1} repetirY={1} />
                </mesh>
            </group>
        );
    }

    // Salón (4 paredes) y escalera (peldaños): varias cajas que giran juntas.
    const partes = partesDe(o);
    if (partes) {
        return (
            <group position={[o.x, base, o.z]} rotation={[0, rot, 0]}>
                {partes.map((q, i) => (
                    // Cada pared del salón puede tener su propia textura.
                    <Caja key={i} w={q.w} h={q.h} d={q.d} m={q.pared != null ? materialPared(o, q.pared, materiales) : m} posicion={[q.cx, q.cy, q.cz]} />
                ))}
            </group>
        );
    }

    // Inclinada (positivo: sube hacia el frente). Orden: primero gira, luego inclina.
    const giro = new THREE.Euler(-(o.incl || 0) * RAD, rot, 0, "YXZ");

    if (o.tipo === "baranda") {
        return (
            <group position={[o.x, base, o.z]} rotation={[0, rot, 0]}>
                <Baranda o={o} m={m} />
            </group>
        );
    }

    if (o.tipo === "cuadro") {
        // Una foto colgada (mural, logo del colegio, cartel…), con marco del color elegido.
        const foto = m.textura;
        const grueso = Math.max(0.05, o.largo);
        return (
            <group position={[o.x, base + o.alto / 2, o.z]} rotation={giro}>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[o.ancho + 0.16, o.alto + 0.16, grueso]} />
                    <meshStandardMaterial color={o.material ? "#ffffff" : o.color} roughness={0.6} />
                </mesh>
                {foto && (
                    <>
                        <mesh position={[0, 0, grueso / 2 + 0.005]}>
                            <planeGeometry args={[o.ancho, o.alto]} />
                            <Material color="#ffffff" textura={foto} transparente={m.transparente} repetirX={1} repetirY={1} rugoso={0.7} />
                        </mesh>
                        <mesh position={[0, 0, -grueso / 2 - 0.005]} rotation={[0, Math.PI, 0]}>
                            <planeGeometry args={[o.ancho, o.alto]} />
                            <Material color="#ffffff" textura={foto} transparente={m.transparente} repetirX={1} repetirY={1} rugoso={0.7} />
                        </mesh>
                    </>
                )}
            </group>
        );
    }

    // caja, pared, plataforma
    return (
        <group position={[o.x, base + o.alto / 2, o.z]} rotation={giro}>
            <Caja w={o.ancho} h={o.alto} d={o.largo} m={m} posicion={[0, 0, 0]} />
        </group>
    );
}

/* ---------- Círculo de juego con su letrero ---------- */
export const JUEGO_DE = Object.fromEntries(juegosLista.filter((j) => j.sala).map((j) => [j.sala, { nombre: j.name, imagen: j.image }]));

function Letrero({ imagen }) {
    const mapa = useLoader(THREE.TextureLoader, imagen);
    const t = useMemo(() => {
        const c = mapa.clone();
        c.colorSpace = THREE.SRGBColorSpace;
        c.needsUpdate = true;
        return c;
    }, [mapa]);
    return (
        <mesh position={[0, 0, 0.06]}>
            <planeGeometry args={[2.4, 1.35]} />
            <meshBasicMaterial map={t} toneMapped={false} />
        </mesh>
    );
}

/* Piso que brilla y anillo que gira (todos los círculos). */
function Anillo({ o, rapido }) {
    const anillo = useRef(null);
    const luz = useRef(null);
    const r = o.ancho / 2;
    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (anillo.current) anillo.current.rotation.z = t * (rapido ? 1.6 : 0.4);
        if (luz.current) luz.current.material.opacity = (rapido ? 0.32 : 0.16) + Math.sin(t * (rapido ? 6 : 2)) * 0.06;
    });
    return (
        <>
            <mesh ref={luz} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[r, 48]} />
                <meshBasicMaterial color={o.color} transparent opacity={0.18} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh ref={anillo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <ringGeometry args={[r - 0.18, r, 64, 1, 0, Math.PI * 1.7]} />
                <meshBasicMaterial color={o.color} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
        </>
    );
}

/* Círculo de teletransporte: un portal de luz (se usa con el botón USAR). */
function Portal({ o, destino, etiquetas = true }) {
    const haz = useRef(null);
    const r = o.ancho / 2;
    useFrame(({ clock }) => {
        if (haz.current) {
            haz.current.rotation.y = clock.elapsedTime * 0.8;
            haz.current.material.opacity = 0.16 + Math.sin(clock.elapsedTime * 3) * 0.05;
        }
    });
    return (
        <group position={[o.x, (o.y || 0) + 0.02, o.z]}>
            <Anillo o={o} />
            <mesh ref={haz} position={[0, 1.4, 0]}>
                <cylinderGeometry args={[r * 0.92, r, 2.8, 32, 1, true]} />
                <meshBasicMaterial color={o.color} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
            </mesh>
            {/* cartel en un palo al lado del portal (se lee de los dos lados) */}
            <group rotation={[0, (o.rot || 0) * RAD, 0]} position={[0, 0, 0]}>
                <group position={[r + 0.35, 0, 0]}>
                    <mesh position={[0, 1.05, 0]} castShadow>
                        <cylinderGeometry args={[0.05, 0.05, 2.1, 8]} />
                        <meshStandardMaterial color="#2a2f3a" />
                    </mesh>
                    {etiquetas && (
                        <Cartel
                            position={[0, 2.35, 0]}
                            ancho={1.9}
                            alto={0.62}
                            fondo="#1e1b4b"
                            borde="#a78bfa"
                            dosCaras
                            lineas={[
                                { t: o.nombre || "Teletransporte", c: "#c4b5fd" },
                                { t: destino ? `↪ a ${destino}` : "Sin destino", s: 0.8, n: false },
                            ]}
                        />
                    )}
                </group>
            </group>
        </group>
    );
}

function Circulo({ o, estado, desfase, etiquetas = true }) {
    const r = o.ancho / 2;
    const juego = JUEGO_DE[o.juego] || { nombre: o.juego, imagen: null };
    const rot = (o.rot || 0) * RAD;
    const contando = Boolean(estado?.hasta);
    const faltan = contando ? Math.max(0, Math.ceil((estado.hasta - (Date.now() + desfase)) / 1000)) : null;
    return (
        <group position={[o.x, (o.y || 0) + 0.02, o.z]}>
            <Anillo o={o} rapido={contando} />
            {/* letrero con la imagen del juego, al fondo del círculo */}
            <group rotation={[0, rot, 0]}>
                <group position={[0, 0, -r - 0.3]}>
                    <mesh position={[-1.05, 1.1, 0]} castShadow>
                        <cylinderGeometry args={[0.07, 0.07, 2.2, 8]} />
                        <meshStandardMaterial color="#2a2f3a" />
                    </mesh>
                    <mesh position={[1.05, 1.1, 0]} castShadow>
                        <cylinderGeometry args={[0.07, 0.07, 2.2, 8]} />
                        <meshStandardMaterial color="#2a2f3a" />
                    </mesh>
                    <group position={[0, 2.35, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[2.6, 1.55, 0.1]} />
                            <meshStandardMaterial color={o.color} />
                        </mesh>
                        {juego.imagen && (
                            <Suspense fallback={null}>
                                <Letrero imagen={juego.imagen} />
                            </Suspense>
                        )}
                    </group>
                    {/* cartel con el nombre y la cuenta, encima de la imagen (se lee de los dos lados) */}
                    {etiquetas && (
                        <Cartel
                            position={[0, 3.5, 0]}
                            ancho={2.6}
                            alto={0.7}
                            fondo={contando ? "#3b2a00" : "#0f172a"}
                            borde={contando ? "#ffcf3e" : o.color}
                            dosCaras
                            lineas={[
                                { t: juego.nombre, c: "#ffe58a" },
                                { t: estado?.aviso || (contando ? `⏳ ${faltan} s · ${estado.dentro} adentro` : "Párate aquí para jugar"), s: 0.75, n: false },
                            ]}
                        />
                    )}
                </group>
            </group>
        </group>
    );
}

/* Contorno del objeto elegido (vista previa del editor). */
function Marca({ o }) {
    const alto = o.tipo === "circulo" || o.tipo === "cancha" ? 0.3 : o.alto;
    const d = ["columna", "arbol", "circulo"].includes(o.tipo) ? o.ancho : Math.max(o.largo, 0.1);
    return (
        <mesh position={[o.x, (o.y || 0) + alto / 2, o.z]} rotation={[0, (o.rot || 0) * RAD, 0]}>
            <boxGeometry args={[o.ancho + 0.2, alto + 0.2, d + 0.2]} />
            <meshBasicMaterial color="#38bdf8" wireframe toneMapped={false} />
        </mesh>
    );
}

export function nombreDe(o) {
    return o?.nombre || o?.id || "";
}

export function Objetos({ objetos, materiales = [], modelos = [], circulos = {}, desfase = 0, seleccionado = null, etiquetas = true, canchas = {}, yoId = null }) {
    const porId = new Map(objetos.map((o) => [o.id, o]));
    const ahora = Date.now() + desfase;
    return (
        <>
            {objetos.map((o) => {
                if (o.tipo === "cancha") return <Cancha key={o.id} o={o} estado={canchas[o.id]} ahora={ahora} yoId={yoId} etiquetas={etiquetas} desfase={desfase} />;
                if (o.tipo === "ranking") return <TablaRanking key={o.id} o={o} etiquetas={etiquetas} />;
                if (o.tipo !== "circulo") return <Objeto key={o.id} o={o} materiales={materiales} modelos={modelos} />;
                if (o.funcion === "teletransporte") return <Portal key={o.id} o={o} etiquetas={etiquetas} destino={o.destino ? nombreDe(porId.get(o.destino)) : null} />;
                return <Circulo key={o.id} o={o} estado={circulos[o.id]} desfase={desfase} etiquetas={etiquetas} />;
            })}
            {seleccionado && porId.get(seleccionado) && <Marca o={porId.get(seleccionado)} />}
        </>
    );
}
