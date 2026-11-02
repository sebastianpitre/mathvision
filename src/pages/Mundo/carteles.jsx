import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* =========================================================
   MUNDO 3D · CARTELES Y ETIQUETAS (sin HTML flotante)
   El texto se pinta UNA vez en un lienzo y se pone como
   textura: en un cartel (plano en el mundo) o en una
   etiqueta que siempre mira a la cámara (sprite). Solo se
   vuelve a pintar si el texto cambia. Así no se recalcula
   HTML en cada cuadro (eso era lo que ponía lento el mundo).
   lineas: [{ t: "texto", c: "#color", s: tamaño relativo, n: false = no negrita }]
========================================================= */

const BASE = 56; // px por línea de tamaño 1

function medir(g, lineas) {
    let w = 0;
    let h = 0;
    for (const l of lineas) {
        g.font = fuente(l, 1);
        w = Math.max(w, g.measureText(l.t).width);
        h += BASE * (l.s || 1) * 1.28;
    }
    return { w, h };
}

const fuente = (l, k) => `${l.n === false ? 600 : 800} ${Math.round(BASE * (l.s || 1) * k)}px system-ui, "Segoe UI Emoji", sans-serif`;

/*
 * Pinta las líneas. Si se da "proporcion" (ancho/alto) el lienzo
 * tiene esa forma y el texto se ajusta adentro; si no, el lienzo
 * mide lo que mide el texto.
 */
function pintar(lineas, { fondo = "rgba(10,14,26,0.82)", borde = null, proporcion = null, redondo = true } = {}) {
    const c = document.createElement("canvas");
    const g = c.getContext("2d");
    const { w, h } = medir(g, lineas);
    const pad = BASE * 0.45;
    let W = Math.ceil(w + pad * 2);
    let H = Math.ceil(h + pad * 1.4);
    let k = 1;
    if (proporcion) {
        const H2 = 512;
        const W2 = Math.round(H2 * proporcion);
        k = Math.min(W2 / W, H2 / H);
        W = W2;
        H = H2;
    }
    c.width = Math.min(2048, W);
    c.height = Math.min(2048, H);
    const r = redondo ? Math.min(c.height * 0.22, 40) : 0;
    g.beginPath();
    if (g.roundRect) g.roundRect(3, 3, c.width - 6, c.height - 6, r);
    else g.rect(3, 3, c.width - 6, c.height - 6);
    if (fondo) {
        g.fillStyle = fondo;
        g.fill();
    }
    if (borde) {
        g.lineWidth = 6;
        g.strokeStyle = borde;
        g.stroke();
    }
    g.textAlign = "center";
    g.textBaseline = "middle";
    let y = (c.height - h * k) / 2;
    for (const l of lineas) {
        const alto = BASE * (l.s || 1) * 1.28 * k;
        g.font = fuente(l, k);
        g.fillStyle = l.c || "#ffffff";
        g.fillText(l.t, c.width / 2, y + alto / 2);
        y += alto;
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return { textura: t, razon: c.width / c.height };
}

function useTexto(lineas, opciones) {
    const clave = JSON.stringify([lineas, opciones]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const hecho = useMemo(() => pintar(lineas, opciones), [clave]);
    useEffect(() => () => hecho.textura.dispose(), [hecho]);
    return hecho;
}

/* Cartel plano en el mundo (de ancho × alto metros). dosCaras: se lee de los dos lados. */
export function Cartel({ lineas, ancho, alto, fondo = "#0f172a", borde = "#fbbf24", dosCaras = false, position, rotation }) {
    const { textura } = useTexto(lineas, { fondo, borde, proporcion: ancho / alto, redondo: false });
    return (
        <group position={position} rotation={rotation}>
            <mesh>
                <planeGeometry args={[ancho, alto]} />
                <meshBasicMaterial map={textura} toneMapped={false} />
            </mesh>
            {dosCaras && (
                <mesh rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[ancho, alto]} />
                    <meshBasicMaterial map={textura} toneMapped={false} />
                </mesh>
            )}
        </group>
    );
}

/*
 * Etiqueta que mira a la cámara (como un letrerito encima de algo).
 * alto: metros. lejos: más lejos que esto no se dibuja. cerca: más
 * cerca tampoco (si está pegada a la cámara se vería gigante).
 */
export function Etiqueta({ lineas, alto = 0.4, fondo, borde, position = [0, 0, 0], lejos = 40, cerca = 0, flotar = 0 }) {
    const { textura, razon } = useTexto(lineas, { fondo, borde });
    const sprite = useRef(null);
    const punto = useMemo(() => new THREE.Vector3(), []);
    useFrame(({ camera, clock }) => {
        const s = sprite.current;
        if (!s) return;
        if (flotar) s.position.y = position[1] + Math.sin(clock.elapsedTime * 2.2) * flotar;
        s.getWorldPosition(punto);
        const d = punto.distanceTo(camera.position);
        s.visible = d < lejos && d > cerca;
    });
    return (
        <sprite ref={sprite} position={position} scale={[alto * razon, alto, 1]}>
            <spriteMaterial map={textura} transparent depthWrite={false} toneMapped={false} />
        </sprite>
    );
}
