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

    const timeRef = useRef(0);

    const bonesRef = useRef({
        chest: null,
        spine: null,
        head: null,

        leftUpperArm: null,
        rightUpperArm: null,
        leftLowerArm: null,
        rightLowerArm: null,

        leftUpperLeg: null,
        rightUpperLeg: null,
        leftLowerLeg: null,
        rightLowerLeg: null,

        leftFoot: null,
        rightFoot: null,
        leftToes: null,
        rightToes: null
    });

    const baseRotationRef = useRef({});

    const blinkTimerRef = useRef(0);
    const blinkProgressRef = useRef(0);
    const nextBlinkRef = useRef(3.5);

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

        if (!humanoid) {
            console.error("❌ El VRM no tiene humanoid.");
            return;
        }

        const getBone = (name) =>
            humanoid.getNormalizedBoneNode(name);

        bonesRef.current = {
            chest: getBone("chest"),
            spine: getBone("spine"),
            head: getBone("head"),

            leftUpperArm: getBone("leftUpperArm"),
            rightUpperArm: getBone("rightUpperArm"),

            leftLowerArm: getBone("leftLowerArm"),
            rightLowerArm: getBone("rightLowerArm"),

            leftUpperLeg: getBone("leftUpperLeg"),
            rightUpperLeg: getBone("rightUpperLeg"),

            leftLowerLeg: getBone("leftLowerLeg"),
            rightLowerLeg: getBone("rightLowerLeg"),

            leftFoot: getBone("leftFoot"),
            rightFoot: getBone("rightFoot"),

            leftToes: getBone("leftToes"),
            rightToes: getBone("rightToes")
        };

        /*
         * =====================================================
         * GUARDAR ROTACIONES BASE
         * =====================================================
         */

        Object.entries(bonesRef.current).forEach(
            ([name, bone]) => {
                if (!bone) return;

                baseRotationRef.current[name] = {
                    x: bone.rotation.x,
                    y: bone.rotation.y,
                    z: bone.rotation.z
                };
            }
        );

        /*
         * =====================================================
         * POSE INICIAL
         * =====================================================
         */

        const bones = bonesRef.current;

        if (bones.leftUpperArm) {
            bones.leftUpperArm.rotation.z =
                -1.30;
        }

        if (bones.rightUpperArm) {
            bones.rightUpperArm.rotation.z =
                1.30;
        }

        if (bones.leftLowerArm) {
            bones.leftLowerArm.rotation.z =
                -0.08;
        }

        if (bones.rightLowerArm) {
            bones.rightLowerArm.rotation.z =
                0.08;
        }

        return () => {
            vrmRef.current = null;
        };
    }, [vrm, url]);

    useFrame((_, delta) => {
        const currentVrm = vrmRef.current;

        if (!currentVrm) return;

        timeRef.current += delta;

        const time = timeRef.current;
        const bones = bonesRef.current;
        const base = baseRotationRef.current;

        /*
         * =====================================================
         * VELOCIDAD DE CAMINATA
         * =====================================================
         */

        const walkSpeed = 1.8;
        const walk = time * walkSpeed;

        /*
         * Movimiento principal de piernas.
         *
         * Una pierna adelante mientras la otra va atrás.
         */

        const leftStep = Math.sin(walk);
        const rightStep = Math.sin(walk + Math.PI);

        /*
         * =====================================================
         * PIERNAS
         * =====================================================
         */

        if (bones.leftUpperLeg) {
            bones.leftUpperLeg.rotation.x =
                base.leftUpperLeg.x +
                leftStep * 0.48;
        }

        if (bones.rightUpperLeg) {
            bones.rightUpperLeg.rotation.x =
                base.rightUpperLeg.x +
                rightStep * 0.48;
        }

        /*
         * =====================================================
         * RODILLAS
         *
         * La rodilla se flexiona principalmente cuando
         * la pierna va hacia atrás.
         * =====================================================
         */

        const leftKnee =
            Math.max(0, -leftStep) * 0.65;

        const rightKnee =
            Math.max(0, -rightStep) * 0.65;

        if (bones.leftLowerLeg) {
            bones.leftLowerLeg.rotation.x =
                base.leftLowerLeg.x +
                leftKnee;
        }

        if (bones.rightLowerLeg) {
            bones.rightLowerLeg.rotation.x =
                base.rightLowerLeg.x +
                rightKnee;
        }

        /*
         * =====================================================
         * PIES
         * =====================================================
         *
         * Cuando la pierna avanza, levantamos ligeramente
         * la punta del pie.
         */

        if (bones.leftFoot) {
            bones.leftFoot.rotation.x =
                base.leftFoot.x -
                leftStep * 0.28;
        }

        if (bones.rightFoot) {
            bones.rightFoot.rotation.x =
                base.rightFoot.x -
                rightStep * 0.28;
        }

        /*
         * =====================================================
         * DEDOS DE LOS PIES
         * =====================================================
         */

        if (bones.leftToes) {
            bones.leftToes.rotation.x =
                base.leftToes.x +
                Math.max(0, leftStep) * 0.18;
        }

        if (bones.rightToes) {
            bones.rightToes.rotation.x =
                base.rightToes.x +
                Math.max(0, rightStep) * 0.18;
        }

        /*
         * =====================================================
         * BRAZOS
         * =====================================================
         *
         * Los brazos hacen el movimiento contrario a las
         * piernas.
         */

        if (bones.leftUpperArm) {
            bones.leftUpperArm.rotation.x =
                base.leftUpperArm.x -
                leftStep * 0.38;
        }

        if (bones.rightUpperArm) {
            bones.rightUpperArm.rotation.x =
                base.rightUpperArm.x -
                rightStep * 0.38;
        }

        /*
         * =====================================================
         * ANTEBRAZOS
         * =====================================================
         */

        if (bones.leftLowerArm) {
            bones.leftLowerArm.rotation.x =
                base.leftLowerArm.x +
                Math.abs(leftStep) * 0.08;
        }

        if (bones.rightLowerArm) {
            bones.rightLowerArm.rotation.x =
                base.rightLowerArm.x +
                Math.abs(rightStep) * 0.08;
        }

        /*
         * =====================================================
         * CUERPO
         * =====================================================
         */

        const bodyBounce =
            Math.abs(Math.sin(walk * 2)) * 0.035;

        if (bones.spine) {
            bones.spine.rotation.x =
                base.spine.x +
                bodyBounce;

            bones.spine.rotation.z =
                base.spine.z +
                Math.sin(walk) * 0.025;
        }

        if (bones.chest) {
            bones.chest.rotation.x =
                base.chest.x -
                bodyBounce * 0.35;

            bones.chest.rotation.z =
                base.chest.z -
                Math.sin(walk) * 0.025;
        }

        /*
         * =====================================================
         * CABEZA
         * =====================================================
         */

        if (bones.head) {
            bones.head.rotation.y =
                base.head.y +
                Math.sin(time * 0.7) * 0.035;

            bones.head.rotation.x =
                base.head.x +
                Math.sin(time * 1.2) * 0.012;
        }

        /*
         * =====================================================
         * PARPADEO
         * =====================================================
         */

        const expressionManager =
            currentVrm.expressionManager;

        if (expressionManager) {
            blinkTimerRef.current += delta;

            if (
                blinkProgressRef.current === 0 &&
                blinkTimerRef.current >=
                nextBlinkRef.current
            ) {
                blinkProgressRef.current = 0.0001;
                blinkTimerRef.current = 0;
            }

            if (blinkProgressRef.current > 0) {
                blinkProgressRef.current += delta;

                const blinkDuration = 0.18;

                let blinkValue = 0;

                if (
                    blinkProgressRef.current < 0.09
                ) {
                    blinkValue =
                        blinkProgressRef.current /
                        0.09;
                } else {
                    blinkValue =
                        1 -
                        (blinkProgressRef.current -
                            0.09) /
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

                    nextBlinkRef.current =
                        2.5 +
                        Math.random() * 3;
                }
            }
        }

        /*
         * =====================================================
         * ACTUALIZAR VRM
         * =====================================================
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