import React, {
    useEffect,
    useRef
} from "react";

import {
    useFrame,
    useLoader
} from "@react-three/fiber";

import {
    GLTFLoader
} from "three/examples/jsm/loaders/GLTFLoader.js";

import {
    VRMLoaderPlugin
} from "@pixiv/three-vrm";

import {
    useAuth
} from "../../context/AuthContext";


/*
 * =========================================================
 * AJUSTE DE ORIENTACIÓN DE LA CAMINATA
 * =========================================================
 *
 * Si el personaje sigue caminando "al revés" (el pie que
 * debería ir adelante va atrás), cambia este valor entre
 * 1 y -1. Ahora el signo se aplica ANTES de la forma del
 * paso, así que invertirlo sí invierte adelante/atrás
 * correctamente, sin romper la asimetría del paso.
 */
const FORWARD_SIGN = 1;

/*
 * Pose de "brazos abajo" en reposo. Mismos valores que ya
 * usabas, solo que ahora se re-aplican cada frame en vez
 * de una sola vez, para que nada los pueda sobrescribir.
 */
const REST_ARM_Z = {
    left: -1.30,
    right: 1.30
};


export default function VRMCharacter({

    url,
    scale = 1,
    position = [0, 0, 0],
    rotation = [0, Math.PI, 0]

}) {

    const { user } = useAuth();

    const characterUrl =
        url || user?.character_model_path || null;


    /*
     * =====================================================
     * REFERENCIAS
     * =====================================================
     */

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
        rightHand: null,
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

    const GESTURE_DURATION = 2.4;
    const GESTURE_BLEND = 0.35;

    const gestureRef = useRef({
        active: false,
        t: 0,
        timer: 0,
        nextAt: 4 + Math.random() * 4
    });


    /*
     * =====================================================
     * CARGAR VRM
     * =====================================================
     */

    const loaderUrl =
        characterUrl || "/models/characters/Adan2.vrm";

    const gltf = useLoader(
        GLTFLoader,
        loaderUrl,
        (loader) => {
            loader.register(
                (parser) => new VRMLoaderPlugin(parser)
            );
        }
    );

    const vrm = gltf?.userData?.vrm;


    /*
     * =====================================================
     * CONFIGURAR VRM
     * =====================================================
     */

    useEffect(() => {

        if (!characterUrl) {
            vrmRef.current = null;
            return;
        }

        if (!vrm) {
            console.error("❌ No se encontró un modelo VRM válido:", characterUrl);
            return;
        }

        timeRef.current = 0;
        blinkTimerRef.current = 0;
        blinkProgressRef.current = 0;
        nextBlinkRef.current = 3.5;

        gestureRef.current = {
            active: false,
            t: 0,
            timer: 0,
            nextAt: 4 + Math.random() * 4
        };

        vrmRef.current = vrm;

        const humanoid = vrm.humanoid;

        if (!humanoid) {
            console.error("❌ El VRM no tiene humanoid.");
            return;
        }

        const getBone = (name) => humanoid.getNormalizedBoneNode(name);

        bonesRef.current = {
            chest: getBone("chest"),
            spine: getBone("spine"),
            head: getBone("head"),
            leftUpperArm: getBone("leftUpperArm"),
            rightUpperArm: getBone("rightUpperArm"),
            leftLowerArm: getBone("leftLowerArm"),
            rightLowerArm: getBone("rightLowerArm"),
            rightHand: getBone("rightHand"),
            leftUpperLeg: getBone("leftUpperLeg"),
            rightUpperLeg: getBone("rightUpperLeg"),
            leftLowerLeg: getBone("leftLowerLeg"),
            rightLowerLeg: getBone("rightLowerLeg"),
            leftFoot: getBone("leftFoot"),
            rightFoot: getBone("rightFoot"),
            leftToes: getBone("leftToes"),
            rightToes: getBone("rightToes")
        };

        // Pose base tomada del archivo recién cargado
        const freshPose = {};

        Object.entries(bonesRef.current).forEach(([name, bone]) => {
            if (!bone) return;
            freshPose[name] = {
                x: bone.rotation.x,
                y: bone.rotation.y,
                z: bone.rotation.z
            };
        });

        baseRotationRef.current = freshPose;

        if (vrm.expressionManager) {
            vrm.expressionManager.setValue("blink", 0);
        }

        const bones = bonesRef.current;

        // Pose inicial: brazos abajo (se reafirma cada frame más abajo,
        // esto solo evita un "flash" del T-pose en el primer frame)
        if (bones.leftUpperArm) bones.leftUpperArm.rotation.z = REST_ARM_Z.left;
        if (bones.rightUpperArm) bones.rightUpperArm.rotation.z = REST_ARM_Z.right;
        if (bones.leftLowerArm) bones.leftLowerArm.rotation.z = -0.08;
        if (bones.rightLowerArm) bones.rightLowerArm.rotation.z = 0.08;

        return () => {
            if (vrmRef.current === vrm) {
                vrmRef.current = null;
            }
        };

    }, [vrm, characterUrl]);


    useEffect(() => {
        return () => {
            useLoader.clear(GLTFLoader, loaderUrl);
        };
    }, [loaderUrl]);


    /*
     * =====================================================
     * ANIMACIÓN
     * =====================================================
     */

    useFrame((_, delta) => {

        const currentVrm = vrmRef.current;
        if (!currentVrm) return;

        timeRef.current += delta;

        const time = timeRef.current;
        const bones = bonesRef.current;
        const base = baseRotationRef.current;


        /*
         * =============================================
         * TEMPORIZADOR DEL SALUDO
         * =============================================
         */

        const gesture = gestureRef.current;

        if (!gesture.active) {

            gesture.timer += delta;

            if (gesture.timer >= gesture.nextAt) {
                gesture.active = true;
                gesture.t = 0;
                gesture.timer = 0;
            }

        } else {

            gesture.t += delta;

            if (gesture.t >= GESTURE_DURATION) {
                gesture.active = false;
                gesture.t = 0;
                gesture.nextAt = 6 + Math.random() * 6;
            }

        }

        // walkBlend: 1 = caminando normal, 0 = detenido saludando
        // raise: 0 = brazo abajo, 1 = brazo saludando
        let walkBlend = 1;
        let raise = 0;

        if (gesture.active) {

            const t = gesture.t;

            if (t < GESTURE_BLEND) {
                raise = t / GESTURE_BLEND;
            } else if (t > GESTURE_DURATION - GESTURE_BLEND) {
                raise = (GESTURE_DURATION - t) / GESTURE_BLEND;
            } else {
                raise = 1;
            }

            raise = Math.max(0, Math.min(1, raise));
            walkBlend = 1 - raise;

        }


        /*
         * =============================================
         * CICLO DE CAMINATA (corregido)
         * =============================================
         */

        const walkSpeed = 1.8;
        const walk = time * walkSpeed;

        // El signo se aplica ANTES de la forma asimétrica.
        // Así "forwardPhase" positivo SIEMPRE significa
        // "la pierna va hacia adelante", sin importar el
        // valor de FORWARD_SIGN.
        const leftForwardPhase = Math.sin(walk) * FORWARD_SIGN;
        const rightForwardPhase = Math.sin(walk + Math.PI) * FORWARD_SIGN;

        // Paso asimétrico: adelante recorre más que atrás.
        const shape = (s) => (s > 0 ? s * 0 : s * 0.65);

        const leftStep = shape(leftForwardPhase) * walkBlend;
        const rightStep = shape(rightForwardPhase) * walkBlend;

        // La rodilla se dobla solo mientras la pierna avanza
        // (forwardPhase positivo), nunca al empujar hacia atrás.
        const leftKnee = Math.max(0, leftForwardPhase) * 0.75 * walkBlend;
        const rightKnee = Math.max(0, rightForwardPhase) * 0.75 * walkBlend;

        if (bones.leftUpperLeg && base.leftUpperLeg) {
            bones.leftUpperLeg.rotation.x = base.leftUpperLeg.x + leftStep * 0.5;
        }

        if (bones.rightUpperLeg && base.rightUpperLeg) {
            bones.rightUpperLeg.rotation.x = base.rightUpperLeg.x + rightStep * 0.5;
        }

        if (bones.leftLowerLeg && base.leftLowerLeg) {
            bones.leftLowerLeg.rotation.x = base.leftLowerLeg.x + leftKnee;
        }

        if (bones.rightLowerLeg && base.rightLowerLeg) {
            bones.rightLowerLeg.rotation.x = base.rightLowerLeg.x + rightKnee;
        }

        if (bones.leftFoot && base.leftFoot) {
            bones.leftFoot.rotation.x = base.leftFoot.x - leftStep * 0.3 + leftKnee * 0.4;
        }

        if (bones.rightFoot && base.rightFoot) {
            bones.rightFoot.rotation.x = base.rightFoot.x - rightStep * 0.3 + rightKnee * 0.4;
        }

        if (bones.leftToes && base.leftToes) {
            bones.leftToes.rotation.x = base.leftToes.x + Math.max(0, leftForwardPhase) * 0.18 * walkBlend;
        }

        if (bones.rightToes && base.rightToes) {
            bones.rightToes.rotation.x = base.rightToes.x + Math.max(0, rightForwardPhase) * 0.18 * walkBlend;
        }

        // Brazo izquierdo: balanceo normal al caminar (X),
        // manteniendo siempre el .z en la pose "abajo".
        if (bones.leftUpperArm && base.leftUpperArm) {
            bones.leftUpperArm.rotation.x = base.leftUpperArm.x - leftStep * 0.4;
            bones.leftUpperArm.rotation.z = REST_ARM_Z.left;
        }

        if (bones.leftLowerArm && base.leftLowerArm) {
            bones.leftLowerArm.rotation.x = base.leftLowerArm.x + Math.abs(leftStep) * 0.08;
        }

        // Cuerpo
        const bodyBounce = Math.abs(Math.sin(walk * 2)) * 0.035 * walkBlend;

        if (bones.spine && base.spine) {
            bones.spine.rotation.x = base.spine.x + bodyBounce;
            bones.spine.rotation.z = base.spine.z + Math.sin(walk) * 0.025 * walkBlend;
        }

        if (bones.chest && base.chest) {
            bones.chest.rotation.x = base.chest.x - bodyBounce * 0.35;
            bones.chest.rotation.z = base.chest.z - Math.sin(walk) * 0.025 * walkBlend;
        }

        // Cabeza
        if (bones.head && base.head) {
            bones.head.rotation.y = base.head.y + Math.sin(time * 0.7) * 0.035;
            bones.head.rotation.x = base.head.x + Math.sin(time * 1.2) * 0.012;
        }


        /*
         * =============================================
         * BRAZO DERECHO: reposo abajo <-> saludo al frente
         * =============================================
         *
         * En reposo (raise = 0): igual que el izquierdo,
         * .z fijo en REST_ARM_Z.right, balanceo normal en .x.
         *
         * Saludando (raise = 1): el brazo sube HACIA ADELANTE
         * (rotación en X), el codo se mantiene recto, y solo
         * la mano se mueve para simular el saludo.
         */

        if (bones.rightUpperArm && base.rightUpperArm) {

            // Balanceo de caminata normal (se apaga solo cuando raise > 0
            // porque walkBlend ya baja rightStep a 0)
            const walkSwingX = -rightStep * 0.4;

            // Levantar el brazo hacia adelante (no al lado)
            const raiseForwardX = -1.95 * raise;

            bones.rightUpperArm.rotation.x =
                base.rightUpperArm.x + walkSwingX + raiseForwardX;

            // .z se queda en la pose "abajo" siempre; solo se abre
            // un poco al saludar para separarlo levemente del cuerpo
            bones.rightUpperArm.rotation.z =
                REST_ARM_Z.right + (1.05 - REST_ARM_Z.right) * raise;

        }

        if (bones.rightLowerArm && base.rightLowerArm) {

            // Codo recto: se mantiene igual en reposo y en el saludo,
            // solo el leve movimiento natural de la caminata.
            bones.rightLowerArm.rotation.x =
                base.rightLowerArm.x + Math.abs(rightStep) * 0.08;

            bones.rightLowerArm.rotation.z = 0.08;

            // Acompaña sutilmente el balanceo del saludo (mismo eje
            // que la mano, pero con menor amplitud para que sea la
            // mano la que lleve el movimiento principal)
            const waveSpeed = 9;

            bones.rightLowerArm.rotation.y =
                base.rightLowerArm.y + Math.sin(time * waveSpeed) * 0.12 * raise;

        }

        if (bones.rightHand && base.rightHand) {

            // Mano saludando de lado a lado (balanceo real),
            // solo mientras raise > 0
            const waveSpeed = 9;

            bones.rightHand.rotation.y =
                base.rightHand.y + Math.sin(time * waveSpeed) * 0.35 * raise;

            // Aseguramos que los otros ejes no queden con residuos
            bones.rightHand.rotation.x = base.rightHand.x;
            bones.rightHand.rotation.z = base.rightHand.z;

        }


        /*
         * =============================================
         * PARPADEO
         * =============================================
         */

        const expressionManager = currentVrm.expressionManager;

        if (expressionManager) {

            blinkTimerRef.current += delta;

            if (blinkProgressRef.current === 0 && blinkTimerRef.current >= nextBlinkRef.current) {
                blinkProgressRef.current = 0.0001;
                blinkTimerRef.current = 0;
            }

            if (blinkProgressRef.current > 0) {

                blinkProgressRef.current += delta;

                let blinkValue = 0;

                if (blinkProgressRef.current < 0.09) {
                    blinkValue = blinkProgressRef.current / 0.09;
                } else {
                    blinkValue = 1 - (blinkProgressRef.current - 0.09) / 0.09;
                }

                blinkValue = Math.max(0, Math.min(1, blinkValue));

                expressionManager.setValue("blink", blinkValue);

                if (blinkProgressRef.current >= 0.18) {
                    expressionManager.setValue("blink", 0);
                    blinkProgressRef.current = 0;
                    nextBlinkRef.current = 2.5 + Math.random() * 3;
                }
            }
        }

        currentVrm.update(delta);

    });


    if (!characterUrl) return null;
    if (!vrm) return null;

    return (
        <primitive
            object={vrm.scene}
            scale={scale}
            position={position}
            rotation={rotation}
            dispose={null}
        />
    );

}