import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

import ProtegerError from "../../components/common/ProtegerError";

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

/* Material con foto (si hay) y si no, solo color. Mientras carga la foto se ve el color. */
function Material({ color, textura, repetirX, repetirY, rugoso = 0.85 }) {
    if (!textura) return <meshStandardMaterial color={color} roughness={rugoso} />;
    return (
        <ProtegerError respaldo={<meshStandardMaterial color={color} roughness={rugoso} />}>
            <Suspense fallback={<meshStandardMaterial color={color} roughness={rugoso} />}>
                <MaterialFoto textura={textura} repetirX={repetirX} repetirY={repetirY} rugoso={rugoso} />
            </Suspense>
        </ProtegerError>
    );
}

function MaterialFoto({ textura, repetirX, repetirY, rugoso }) {
    const mapa = useTextura(textura, repetirX, repetirY);
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
export function Suelo({ suelo }) {
    const veces = TAMANO_SUELO / (suelo.baldosa || 4);
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[TAMANO_SUELO, TAMANO_SUELO]} />
            <Material color={suelo.textura ? "#ffffff" : suelo.color} textura={suelo.textura} repetirX={veces} repetirY={veces} rugoso={0.95} />
        </mesh>
    );
}

/* ---------- Objetos ---------- */
function Objeto({ o }) {
    const rot = ((o.rot || 0) * Math.PI) / 180;
    const base = o.y || 0;
    const color = o.textura ? "#ffffff" : o.color;
    const b = o.baldosa || 2;

    if (o.tipo === "columna") {
        return (
            <mesh position={[o.x, base + o.alto / 2, o.z]} castShadow receiveShadow>
                <cylinderGeometry args={[o.ancho / 2, o.ancho / 2, o.alto, 28]} />
                <Material color={color} textura={o.textura} repetirX={(Math.PI * o.ancho) / b} repetirY={o.alto / b} />
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
                    <Material color={color} textura={o.textura} repetirX={2} repetirY={2} />
                </mesh>
                <mesh position={[copa * 0.45, tronco + copa * 0.2, copa * 0.2]} castShadow>
                    <icosahedronGeometry args={[copa * 0.6, 1]} />
                    <Material color={color} textura={o.textura} repetirX={1} repetirY={1} />
                </mesh>
            </group>
        );
    }

    if (o.tipo === "cuadro") {
        // Una foto colgada (mural, logo del colegio, cartel…), con marco del color elegido.
        return (
            <group position={[o.x, base + o.alto / 2, o.z]} rotation={[0, rot, 0]}>
                <mesh castShadow receiveShadow>
                    <boxGeometry args={[o.ancho + 0.16, o.alto + 0.16, Math.max(0.05, o.largo)]} />
                    <meshStandardMaterial color={o.color} roughness={0.6} />
                </mesh>
                {o.textura && (
                    <>
                        <mesh position={[0, 0, Math.max(0.05, o.largo) / 2 + 0.005]}>
                            <planeGeometry args={[o.ancho, o.alto]} />
                            <Material color="#ffffff" textura={o.textura} repetirX={1} repetirY={1} rugoso={0.7} />
                        </mesh>
                        <mesh position={[0, 0, -Math.max(0.05, o.largo) / 2 - 0.005]} rotation={[0, Math.PI, 0]}>
                            <planeGeometry args={[o.ancho, o.alto]} />
                            <Material color="#ffffff" textura={o.textura} repetirX={1} repetirY={1} rugoso={0.7} />
                        </mesh>
                    </>
                )}
            </group>
        );
    }

    // caja, pared, plataforma
    return (
        <mesh position={[o.x, base + o.alto / 2, o.z]} rotation={[0, rot, 0]} castShadow receiveShadow>
            <boxGeometry args={[o.ancho, o.alto, Math.max(0.05, o.largo)]} />
            <Material color={color} textura={o.textura} repetirX={Math.max(o.ancho, o.largo) / b} repetirY={o.alto / b} />
        </mesh>
    );
}

export function Objetos({ objetos }) {
    return objetos.map((o) => <Objeto key={o.id} o={o} />);
}
