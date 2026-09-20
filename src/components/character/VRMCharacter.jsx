import React, { useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin } from "@pixiv/three-vrm";

export default function VRMCharacter({
    url = "/models/characters/Adan2.vrm",
    scale = 1,
    position = [0, 0, 0],
    rotation = [0, Math.PI, 0]
}) {
    const vrmRef = useRef(null);

    const poseAppliedRef = useRef(false);

    const idleTimeRef = useRef(0);

    const blinkTimerRef = useRef(0);
    const blinkProgressRef = useRef(0);
    const nextBlinkRef = useRef(3.5);

    const bonesRef = useRef({
        chest: null,
        spine: null,
        head: null,
        leftUpperArm: null,
        rightUpperArm: null
    });

    const baseRotationRef = useRef({});

    const gltf = useLoader(
        GLTFLoader,
        url,
        (loader) => {
            loader.register(
                (parser) => new VRMLoaderPlugin(parser)
            );
        }
    );

    const vrm = gltf.userData.vrm;

    useEffect(() => {
        if (!vrm) {
            console.error(
                "❌ No se encontró un modelo VRM válido:",
                url
            );
            return;
        }

        console.log("✅ Personaje VRM cargado:", url);
        console.log("🧍 VRM:", vrm);

        vrmRef.current = vrm;

        const humanoid = vrm.humanoid;

        if (humanoid) {
            const chest =
                humanoid.getNormalizedBoneNode("chest");

            const spine =
                humanoid.getNormalizedBoneNode("spine");

            const head =
                humanoid.getNormalizedBoneNode("head");

            const leftUpperArm =
                humanoid.getNormalizedBoneNode("leftUpperArm");

            const rightUpperArm =
                humanoid.getNormalizedBoneNode("rightUpperArm");

            bonesRef.current = {
                chest,
                spine,
                head,
                leftUpperArm,
                rightUpperArm
            };

            /*
             * =================================================
             * POSE DE REPOSO
             * =================================================
             */

            if (!poseAppliedRef.current) {
                if (leftUpperArm) {
                    leftUpperArm.rotation.z = -1.30;
                    leftUpperArm.rotation.x = 0.05;
                }

                if (rightUpperArm) {
                    rightUpperArm.rotation.z = 1.30;
                    rightUpperArm.rotation.x = 0.05;
                }

                const leftLowerArm =
                    humanoid.getNormalizedBoneNode("leftLowerArm");

                const rightLowerArm =
                    humanoid.getNormalizedBoneNode("rightLowerArm");

                if (leftLowerArm) {
                    leftLowerArm.rotation.z = -0.08;
                }

                if (rightLowerArm) {
                    rightLowerArm.rotation.z = 0.08;
                }

                poseAppliedRef.current = true;
            }

            /*
             * Guardamos la rotación base para que el Idle
             * nunca vaya acumulando rotación infinitamente.
             */

            [
                "chest",
                "spine",
                "head"
            ].forEach((boneName) => {
                const bone = bonesRef.current[boneName];

                if (!bone) return;

                baseRotationRef.current[boneName] = {
                    x: bone.rotation.x,
                    y: bone.rotation.y,
                    z: bone.rotation.z
                };
            });
        }

        return () => {
            vrmRef.current = null;
            poseAppliedRef.current = false;
        };
    }, [vrm, url]);

    useFrame((_, delta) => {
        const currentVrm = vrmRef.current;

        if (!currentVrm) return;

        idleTimeRef.current += delta;

        const time = idleTimeRef.current;

        const bones = bonesRef.current;

        /*
         * =================================================
         * IDLE
         * =================================================
         */

        /*
         * Respiración.
         *
         * Movimiento muy pequeño del pecho y espalda.
         */
        const breathing =
            Math.sin(time * 1.6) * 0.018;

        if (bones.chest) {
            const base = baseRotationRef.current.chest;

            bones.chest.rotation.x =
                base.x + breathing;

            bones.chest.rotation.z =
                base.z +
                Math.sin(time * 0.8) * 0.006;
        }

        if (bones.spine) {
            const base = baseRotationRef.current.spine;

            bones.spine.rotation.x =
                base.x +
                Math.sin(time * 1.6) * 0.008;

            bones.spine.rotation.z =
                base.z +
                Math.sin(time * 0.7) * 0.004;
        }

        /*
         * =================================================
         * MOVIMIENTO SUAVE DE CABEZA
         * =================================================
         */

        if (bones.head) {
            const base = baseRotationRef.current.head;

            bones.head.rotation.y =
                base.y +
                Math.sin(time * 0.45) * 0.035;

            bones.head.rotation.x =
                base.x +
                Math.sin(time * 0.7) * 0.012;
        }

        /*
         * =================================================
         * PEQUEÑO MOVIMIENTO DE BRAZOS
         * =================================================
         */

        if (bones.leftUpperArm) {
            bones.leftUpperArm.rotation.x =
                0.05 +
                Math.sin(time * 1.2) * 0.22;
        }

        if (bones.rightUpperArm) {
            bones.rightUpperArm.rotation.x =
                0.05 +
                Math.sin(time * 1.2 + Math.PI) * 0.22;
        }

        /*
         * =================================================
         * PARPADEO
         * =================================================
         */

        const expressionManager =
            currentVrm.expressionManager;

        if (expressionManager) {
            blinkTimerRef.current += delta;

            /*
             * Cuando llega el momento de parpadear,
             * iniciamos el ciclo.
             */
            if (
                blinkProgressRef.current === 0 &&
                blinkTimerRef.current >= nextBlinkRef.current
            ) {
                blinkProgressRef.current = 0.0001;
                blinkTimerRef.current = 0;
            }

            if (blinkProgressRef.current > 0) {
                blinkProgressRef.current += delta;

                const blinkDuration = 0.18;

                let blinkValue = 0;

                if (blinkProgressRef.current < 0.09) {
                    /*
                     * Cerrando
                     */
                    blinkValue =
                        blinkProgressRef.current / 0.09;
                } else {
                    /*
                     * Abriendo
                     */
                    blinkValue =
                        1 -
                        (blinkProgressRef.current - 0.09) /
                        0.09;
                }

                blinkValue = Math.max(
                    0,
                    Math.min(1, blinkValue)
                );

                expressionManager.setValue(
                    "blink",
                    blinkValue
                );

                if (
                    blinkProgressRef.current >=
                    blinkDuration
                ) {
                    expressionManager.setValue(
                        "blink",
                        0
                    );

                    blinkProgressRef.current = 0;

                    /*
                     * Próximo parpadeo entre
                     * aproximadamente 2.5 y 5.5 segundos.
                     */
                    nextBlinkRef.current =
                        2.5 + Math.random() * 3;
                }
            }
        }

        /*
         * IMPORTANTE:
         *
         * VRM.update() actualiza expresiones,
         * LookAt, Spring Bones, materiales, etc.
         */
        currentVrm.update(delta);
    });

    if (!vrm) {
        return null;
    }

    return (
        <primitive
            object={vrm.scene}
            scale={scale}
            position={position}
            rotation={rotation}
        />
    );
}