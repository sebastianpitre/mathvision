import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

import ProtegerError from "../../components/common/ProtegerError";
import VRMCharacter from "../../components/character/VRMCharacter";
import { api } from "../../services/api";

/* =========================================================
   MUNDO 3D · TABLA DE RANKING
   Una pantalla con los mejores de la temporada y, al frente,
   el primero con su skin parado en un círculo de luz y una
   corona 👑 flotando encima. Se actualiza cada minuto (una
   sola consulta aunque haya varias tablas en el mapa).
========================================================= */

const CADA_MS = 60_000;
let cache = { t: 0, datos: null, pidiendo: null };

function pedirRanking() {
    if (cache.datos && Date.now() - cache.t < CADA_MS) return Promise.resolve(cache.datos);
    if (cache.pidiendo) return cache.pidiendo;
    cache.pidiendo = api("/ranking/temporada")
        .then((r) => {
            cache = { t: Date.now(), datos: r, pidiendo: null };
            return r;
        })
        .catch(() => {
            cache.pidiendo = null;
            return cache.datos;
        });
    return cache.pidiendo;
}

function useRanking() {
    const [datos, setDatos] = useState(cache.datos);
    useEffect(() => {
        let vivo = true;
        const traer = () => pedirRanking().then((r) => vivo && r && setDatos(r));
        traer();
        const t = setInterval(traer, CADA_MS);
        return () => {
            vivo = false;
            clearInterval(t);
        };
    }, []);
    return datos;
}

/* La pantalla se pinta en un lienzo (se lee nítida y no pesa). */
function usePantalla(datos, top, ancho, alto, color) {
    const textura = useMemo(() => {
        const c = document.createElement("canvas");
        c.width = 1024;
        c.height = Math.round((1024 * alto) / ancho);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return t;
    }, [ancho, alto]);

    useEffect(() => {
        const c = textura.image;
        const g = c.getContext("2d");
        const W = c.width;
        const H = c.height;
        const fondo = g.createLinearGradient(0, 0, 0, H);
        fondo.addColorStop(0, color);
        fondo.addColorStop(1, "#0b1020");
        g.fillStyle = fondo;
        g.fillRect(0, 0, W, H);
        g.strokeStyle = "#fbbf24";
        g.lineWidth = 10;
        g.strokeRect(5, 5, W - 10, H - 10);

        const filas = (datos?.jugadores || []).slice(0, top);
        const titulo = Math.round(H * 0.11);
        g.textBaseline = "middle";
        g.textAlign = "center";
        g.fillStyle = "#fde68a";
        // El título se achica hasta caber en la pantalla.
        let tam = titulo;
        g.font = `800 ${tam}px system-ui, sans-serif`;
        while (g.measureText("🏆 MEJORES DE LA TEMPORADA").width > W * 0.88 && tam > 12) {
            tam -= 2;
            g.font = `800 ${tam}px system-ui, sans-serif`;
        }
        g.fillText("🏆 MEJORES DE LA TEMPORADA", W / 2, H * 0.11);
        if (datos?.temporada) {
            g.fillStyle = "#cbd5e1";
            g.font = `600 ${Math.round(titulo * 0.5)}px system-ui, sans-serif`;
            g.fillText(datos.temporada.nombre || `Temporada ${datos.temporada.numero}`, W / 2, H * 0.2);
        }
        const y0 = H * 0.28;
        const alto1 = (H * 0.68) / Math.max(top, 3);
        const letra = Math.min(alto1 * 0.55, titulo * 0.8);
        if (!filas.length) {
            g.fillStyle = "#e2e8f0";
            g.font = `600 ${Math.round(letra)}px system-ui, sans-serif`;
            g.fillText("Aún nadie suma puntos. ¡Juega y sal aquí!", W / 2, y0 + alto1);
        }
        filas.forEach((j, i) => {
            const y = y0 + alto1 * (i + 0.5);
            if (i === 0) {
                g.fillStyle = "rgba(251, 191, 36, 0.18)";
                g.fillRect(30, y - alto1 / 2 + 4, W - 60, alto1 - 8);
            }
            g.textAlign = "left";
            g.fillStyle = i === 0 ? "#fbbf24" : i === 1 ? "#e5e7eb" : i === 2 ? "#f59e0b" : "#94a3b8";
            g.font = `800 ${Math.round(letra)}px system-ui, sans-serif`;
            g.fillText(i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`, 50, y);
            g.fillStyle = "#ffffff";
            g.font = `700 ${Math.round(letra)}px system-ui, sans-serif`;
            let nombre = String(j.nombre || "Jugador");
            while (g.measureText(nombre).width > W * 0.55 && nombre.length > 3) nombre = `${nombre.slice(0, -2)}…`;
            g.fillText(nombre, 50 + letra * 1.6, y);
            g.textAlign = "right";
            g.fillStyle = "#fde68a";
            g.font = `800 ${Math.round(letra * 0.9)}px system-ui, sans-serif`;
            g.fillText(`${j.puntos ?? 0} pts`, W - 50, y);
        });
        textura.needsUpdate = true;
    }, [datos, top, color, textura]);

    return textura;
}

function Pedestal({ jugador, etiquetas = true }) {
    const luz = useRef(null);
    useFrame(({ clock }) => {
        if (luz.current) luz.current.material.opacity = 0.35 + Math.sin(clock.elapsedTime * 2.2) * 0.12;
    });
    return (
        <group>
            <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.95, 1.05, 0.24, 40]} />
                <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.6} metalness={0.4} roughness={0.35} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
                <ringGeometry args={[0.7, 0.95, 48]} />
                <meshBasicMaterial color="#fff7cc" toneMapped={false} />
            </mesh>
            {/* columna de luz */}
            <mesh ref={luz} position={[0, 1.6, 0]}>
                <cylinderGeometry args={[0.85, 0.95, 2.8, 32, 1, true]} />
                <meshBasicMaterial color="#fde68a" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
            </mesh>
            <pointLight position={[0, 2.6, 0.6]} color="#ffe9a8" intensity={6} distance={6} />
            {jugador?.modelo && (
                <ProtegerError respaldo={null}>
                    <Suspense fallback={null}>
                        <VRMCharacter key={jugador.modelo} url={`${jugador.modelo}#ranking`} texturaMax={512} position={[0, 0.24, 0]} rotation={[0, 0, 0]} />
                    </Suspense>
                </ProtegerError>
            )}
            {etiquetas ? (
                <Html position={[0, 2.55, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
                    <div className="mu-corona">
                        <span aria-hidden="true">👑</span>
                        {jugador && <strong>{jugador.nombre}</strong>}
                    </div>
                </Html>
            ) : (
                // vista previa del editor: una coronita simple
                <mesh position={[0, 2.5, 0]}>
                    <coneGeometry args={[0.22, 0.3, 5]} />
                    <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
                </mesh>
            )}
        </group>
    );
}

export function TablaRanking({ o, etiquetas = true }) {
    const datos = useRanking();
    const top = o.top || 5;
    const textura = usePantalla(datos, top, o.ancho, o.alto, o.color);
    const rot = ((o.rot || 0) * Math.PI) / 180;
    const primero = datos?.jugadores?.[0] || null;
    const fondo = -o.largo / 2 + 0.1;
    return (
        <group position={[o.x, o.y || 0, o.z]} rotation={[0, rot, 0]}>
            {/* pantalla en dos patas */}
            {[-1, 1].map((s) => (
                <mesh key={s} position={[s * (o.ancho / 2 - 0.15), (o.alto + 0.6) / 2, fondo]} castShadow>
                    <boxGeometry args={[0.12, o.alto + 0.6, 0.12]} />
                    <meshStandardMaterial color="#1f2937" />
                </mesh>
            ))}
            <mesh position={[0, 0.6 + o.alto / 2, fondo]} castShadow receiveShadow>
                <boxGeometry args={[o.ancho, o.alto, 0.14]} />
                <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, 0.6 + o.alto / 2, fondo + 0.075]}>
                <planeGeometry args={[o.ancho - 0.12, o.alto - 0.12]} />
                <meshBasicMaterial map={textura} toneMapped={false} />
            </mesh>
            {/* el primero, adelante */}
            <group position={[0, 0, Math.min(o.largo / 2 - 1, fondo + 2)]}>
                <Pedestal jugador={primero} etiquetas={etiquetas} />
            </group>
        </group>
    );
}
