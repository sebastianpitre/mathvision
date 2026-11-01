import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

import ProtegerError from "../common/ProtegerError";

import "./planeta.css";

/* =========================================================
   PLANETA 3D (puerta al Mundo 3D)
   ---------------------------------------------------------
   Un planeta de verdad: océanos, continentes, hielo en los
   polos, nubes que giran más rápido, atmósfera azul que
   brilla en el borde y una luna dando vueltas. Flota suave.
   Las texturas se pintan una sola vez con ruido 3D (sin
   imágenes que descargar) y se reutilizan.
========================================================= */

/* ---------- Ruido 3D (sin costuras sobre la esfera) ---------- */

function azar(x, y, z) {
    const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return s - Math.floor(s);
}

const suave = (t) => t * t * (3 - 2 * t);
const mezcla = (a, b, t) => a + (b - a) * t;

function ruido(x, y, z) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const u = suave(x - xi);
    const v = suave(y - yi);
    const w = suave(z - zi);
    const c = (a, b, d) => azar(xi + a, yi + b, zi + d);
    return mezcla(
        mezcla(mezcla(c(0, 0, 0), c(1, 0, 0), u), mezcla(c(0, 1, 0), c(1, 1, 0), u), v),
        mezcla(mezcla(c(0, 0, 1), c(1, 0, 1), u), mezcla(c(0, 1, 1), c(1, 1, 1), u), v),
        w
    );
}

function capas(x, y, z, n = 5) {
    let total = 0;
    let amp = 0.5;
    let f = 1;
    for (let i = 0; i < n; i += 1) {
        total += ruido(x * f, y * f, z * f) * amp;
        f *= 2.03;
        amp *= 0.5;
    }
    return total / (1 - 0.5 ** n);
}

/* ---------- Texturas (se pintan una vez) ---------- */

const ANCHO = 384;
const ALTO = 192;
let texturas = null;

const color = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const C = {
    hondo: color("#0a2f78"),
    mar: color("#1c6fd1"),
    orilla: color("#3fb6e8"),
    arena: color("#e9d8a0"),
    pasto: color("#4caf3f"),
    bosque: color("#2c7a34"),
    monte: color("#8a6a45"),
    hielo: color("#f4f9ff"),
};
const entre = (a, b, t) => [mezcla(a[0], b[0], t), mezcla(a[1], b[1], t), mezcla(a[2], b[2], t)];

function pintar() {
    const lienzo = (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h });
    const tierra = lienzo(ANCHO, ALTO);
    const nubes = lienzo(ANCHO, ALTO);
    const dt = tierra.getContext("2d").createImageData(ANCHO, ALTO);
    const dn = nubes.getContext("2d").createImageData(ANCHO, ALTO);

    for (let j = 0; j < ALTO; j += 1) {
        const lat = (0.5 - j / ALTO) * Math.PI;
        for (let i = 0; i < ANCHO; i += 1) {
            const lon = (i / ANCHO) * Math.PI * 2;
            const x = Math.cos(lat) * Math.cos(lon);
            const y = Math.sin(lat);
            const z = Math.cos(lat) * Math.sin(lon);
            const k = (j * ANCHO + i) * 4;

            const h = capas(x * 1.9 + 7, y * 1.9 + 3, z * 1.9);
            let c;
            if (h < 0.5) c = entre(C.hondo, C.mar, suave(Math.max(0, (h - 0.3) / 0.2)));
            else if (h < 0.52) c = entre(C.mar, C.orilla, (h - 0.5) / 0.02);
            else if (h < 0.535) c = C.arena;
            else if (h < 0.6) c = entre(C.pasto, C.bosque, (h - 0.535) / 0.065);
            else c = entre(C.bosque, C.monte, Math.min(1, (h - 0.6) / 0.08));

            // Hielo en los polos, con borde irregular.
            const polo = Math.abs(y) + (capas(x * 4, y * 4, z * 4, 3) - 0.5) * 0.25;
            if (polo > 0.86) c = C.hielo;

            dt.data[k] = c[0];
            dt.data[k + 1] = c[1];
            dt.data[k + 2] = c[2];
            dt.data[k + 3] = 255;

            const n = capas(x * 2.6 + 40, y * 3.4, z * 2.6 + 11, 4);
            const a = suave(Math.min(1, Math.max(0, (n - 0.5) / 0.2)));
            dn.data[k] = 255;
            dn.data[k + 1] = 255;
            dn.data[k + 2] = 255;
            dn.data[k + 3] = Math.round(a * 230);
        }
    }

    tierra.getContext("2d").putImageData(dt, 0, 0);
    nubes.getContext("2d").putImageData(dn, 0, 0);
    const tex = (cv) => {
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return t;
    };
    return { tierra: tex(tierra), nubes: tex(nubes) };
}

function useTexturas() {
    return useMemo(() => {
        if (!texturas) texturas = pintar();
        return texturas;
    }, []);
}

/* ---------- Atmósfera: brillo azul en el borde ---------- */

const atmosfera = {
    uniforms: { tono: { value: new THREE.Color("#5ab8ff") } },
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
    fragmentShader: `
        uniform vec3 tono;
        varying vec3 vNormal;
        void main() {
            float i = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
            gl_FragColor = vec4(tono, 1.0) * i;
        }`,
};

function Mundo() {
    const { tierra, nubes } = useTexturas();
    const grupo = useRef();
    const suelo = useRef();
    const cielo = useRef();
    const orbita = useRef();

    useFrame((estado, dt) => {
        const t = estado.clock.elapsedTime;
        if (grupo.current) grupo.current.position.y = Math.sin(t * 1.1) * 0.08;
        if (suelo.current) suelo.current.rotation.y += dt * 0.18;
        if (cielo.current) cielo.current.rotation.y += dt * 0.26;
        if (orbita.current) orbita.current.rotation.y = t * 0.55;
    });

    return (
        <group ref={grupo}>
            <group rotation={[0.18, 0, 0.32]}>
                <mesh ref={suelo}>
                    <sphereGeometry args={[1, 64, 48]} />
                    <meshStandardMaterial map={tierra} roughness={0.85} metalness={0} />
                </mesh>
                <mesh ref={cielo} scale={1.025}>
                    <sphereGeometry args={[1, 48, 36]} />
                    <meshStandardMaterial map={nubes} transparent depthWrite={false} roughness={1} />
                </mesh>
            </group>
            <mesh scale={1.17}>
                <sphereGeometry args={[1, 48, 36]} />
                <shaderMaterial args={[atmosfera]} side={THREE.BackSide} blending={THREE.AdditiveBlending} transparent depthWrite={false} />
            </mesh>
            {/* Luna en órbita inclinada */}
            <group rotation={[0.35, 0, -0.2]}>
                <group ref={orbita}>
                    <mesh position={[1.75, 0, 0]}>
                        <sphereGeometry args={[0.16, 24, 18]} />
                        <meshStandardMaterial color="#d7dbe4" roughness={1} />
                    </mesh>
                </group>
            </group>
        </group>
    );
}

/* El lienzo 3D, listo para meter en cualquier botón o anuncio. */
export function PlanetaLienzo({ className = "" }) {
    return (
        <span className={`pl-lienzo ${className}`} aria-hidden="true">
            <ProtegerError respaldo={<span className="pl-respaldo" />}>
                <Canvas gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, 4.4], fov: 38 }} dpr={[1, 1.6]}>
                    <ambientLight intensity={0.35} />
                    <directionalLight position={[-3, 1.6, 2.4]} intensity={2.4} />
                    <directionalLight position={[3, -1, -2]} intensity={0.35} color="#7aa8ff" />
                    <Mundo />
                </Canvas>
            </ProtegerError>
        </span>
    );
}

/* Botón con el planeta flotando y su letrero. */
export default function Planeta({ titulo = "Mundo 3D", subtitulo = "Entrar", onClick, className = "", deshabilitado = false, etiqueta }) {
    return (
        <button
            type="button"
            className={`pl-boton ${className}`}
            onClick={onClick}
            aria-disabled={deshabilitado || undefined}
            aria-label={etiqueta || `${titulo}. ${subtitulo}`}
        >
            <span className="pl-estrellas" aria-hidden="true" />
            <PlanetaLienzo />
            <span className="pl-letrero">
                <strong>{titulo}</strong>
                <small>{subtitulo}</small>
            </span>
        </button>
    );
}
