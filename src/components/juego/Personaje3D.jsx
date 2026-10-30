import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";

import ProtegerError from "../common/ProtegerError";
import VRMCharacter from "../character/VRMCharacter";
import LucesPersonaje from "../character/LucesPersonaje";

/* Un personaje 3D que se puede girar con el dedo. La cámara
   queda a la altura del pecho para verlo de cuerpo entero. */
export default function Personaje3D({ modelo, escala = 2.02, y = -1.72, cargando = true, className = "", tamano, desplazar }) {
    return (
        <div className={`ffp-3d ${className}`} aria-hidden="true">
            <ProtegerError respaldo={null}>
                <Canvas gl={{ alpha: true }} camera={{ position: [0, 0.15, 5.4], fov: 40 }} dpr={[1, 1.75]}>
                    <LucesPersonaje calida />
                    <Suspense
                        fallback={
                            cargando ? (
                                <Html center style={{ pointerEvents: "none" }}>
                                    <span className="ffp-cargando">Cargando…</span>
                                </Html>
                            ) : null
                        }
                    >
                        {modelo && <VRMCharacter key={modelo} url={modelo} scale={escala} tamano={tamano} desplazar={desplazar} position={[0, y, 0]} rotation={[0, 0, 0]} />}
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
