/* =========================================================
   ADAPTAR MODELOS 3D AL JUEGO
   ---------------------------------------------------------
   El juego anima a los personajes moviendo sus huesos
   (caminar, saludar, parpadear). Para eso necesita saber
   cuál hueso es el brazo, la pierna, la cabeza…

   · VRM 1.0  → ya lo dice el archivo. Se usa tal cual.
   · VRM 0.x  → (el de muchas apps de teléfono) mira hacia
                atrás y tiene los ejes volteados: se gira y
                se corrigen los movimientos.
   · GLB/glTF → se buscan los huesos por su nombre (Mixamo,
                Unreal, VRoid, Blender…). Si se encuentran,
                se anima igual que un VRM. Si no tiene
                esqueleto, se muestra quieto (o con su propia
                animación si la trae).

   Además los GLB se ajustan de tamaño (como los personajes del juego)
   y se paran en el piso, porque cada programa exporta en
   escalas distintas.
========================================================= */

import * as THREE from "three";
import { VRMHumanoid, VRMUtils } from "@pixiv/three-vrm";

const ALTURA = 1.75; // altura de los personajes que trae el juego (m)

// Parte del cuerpo (sin lado) → hueso humanoide.
const PARTES = {
    hips: "hips", hip: "hips", pelvis: "hips",
    spine: "spine", spine0: "spine", spine01: "spine",
    spine1: "chest", spine02: "chest", chest: "chest",
    spine2: "upperChest", spine03: "upperChest", upperchest: "upperChest",
    neck: "neck", neck01: "neck",
    head: "head",
    shoulder: "Shoulder", clavicle: "Shoulder",
    arm: "UpperArm", upperarm: "UpperArm",
    forearm: "LowerArm", lowerarm: "LowerArm", elbow: "LowerArm",
    hand: "Hand", wrist: "Hand",
    upleg: "UpperLeg", upperleg: "UpperLeg", thigh: "UpperLeg",
    leg: "LowerLeg", lowerleg: "LowerLeg", calf: "LowerLeg", shin: "LowerLeg", knee: "LowerLeg",
    foot: "Foot", ankle: "Foot",
    toebase: "Toes", toe: "Toes", toes: "Toes", ball: "Toes",
};

// Sin estos huesos no se puede animar: se muestra quieto.
const NECESARIOS = ["hips", "spine", "head", "leftUpperArm", "rightUpperArm", "leftUpperLeg", "rightUpperLeg", "leftLowerLeg", "rightLowerLeg"];

/* "mixamorig:LeftForeArm" → "leftLowerArm", "upperarm_l" → "leftUpperArm"… */
export function huesoDeNombre(nombre) {
    let n = String(nombre || "")
        .replace(/mixamorig\d*/gi, " ")
        .replace(/^(armature|def|cc_base|bip0*1|j_bip|character\d*)/i, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2") // LeftArm → Left Arm
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    let lado = "";
    const palabras = n.split(" ").filter(Boolean);
    const resto = [];
    for (const p of palabras) {
        if (p === "left" || p === "l") lado = "left";
        else if (p === "right" || p === "r") lado = "right";
        else if (p === "c" || p === "bip") continue;
        else resto.push(p);
    }
    n = resto.join("");

    const parte = PARTES[n];
    if (!parte) return null;

    const conLado = parte[0] === parte[0].toUpperCase();
    if (conLado !== Boolean(lado)) return null; // "LeftHips" o "Arm" sin lado: no sirve
    return conLado ? lado + parte : parte;
}

/* Busca los huesos humanoides de un modelo glTF cualquiera. */
function buscarHuesos(escena) {
    const huesos = {};
    escena.traverse((o) => {
        if (!o.isBone) return;
        const hueso = huesoDeNombre(o.name);
        if (hueso && !huesos[hueso]) huesos[hueso] = { node: o };
    });
    // Mixamo y otros no tienen "chest" separado del "spine" a veces.
    return NECESARIOS.every((h) => huesos[h]) ? huesos : null;
}

/* Rotación de un hueso con los ejes X y Z volteados (VRM 0.x). */
function espejar(hueso) {
    if (!hueso) return null;
    const r = hueso.rotation;
    return {
        rotation: {
            get x() { return -r.x; },
            set x(v) { r.x = -v; },
            get y() { return r.y; },
            set y(v) { r.y = v; },
            get z() { return -r.z; },
            set z(v) { r.z = -v; },
        },
    };
}

/*
 * Devuelve { objeto, humanoid, hueso(nombre), expressionManager,
 *            update(delta), tipo }
 * tipo: "vrm1" | "vrm0" | "glb-animado" | "glb-quieto"
 * Se guarda en el gltf para no adaptarlo dos veces.
 */
export function adaptarModelo(gltf) {
    if (gltf.userData.personaje) return gltf.userData.personaje;

    const vrm = gltf.userData.vrm;
    let personaje;

    if (vrm) {
        const viejo = vrm.meta?.metaVersion === "0";
        let objeto = vrm.scene;
        if (viejo) {
            // Se gira dentro de un grupo: el juego le pone su propia
            // rotación al objeto de afuera y borraría el giro.
            VRMUtils.rotateVRM0(vrm);
            objeto = new THREE.Group();
            objeto.add(vrm.scene);
        }
        personaje = {
            tipo: viejo ? "vrm0" : "vrm1",
            objeto,
            humanoid: vrm.humanoid,
            hueso: (nombre) => {
                const h = vrm.humanoid?.getNormalizedBoneNode(nombre) || null;
                return viejo ? espejar(h) : h;
            },
            expressionManager: vrm.expressionManager || null,
            update: (delta) => vrm.update(delta),
        };
    } else {
        const escena = gltf.scene;

        // Tamaño y posición: alto como los personajes del juego, pies en el piso, centrado.
        escena.updateMatrixWorld(true);
        const caja = new THREE.Box3().setFromObject(escena);
        const alto = caja.max.y - caja.min.y;
        const envoltura = new THREE.Group();
        if (alto > 0 && Number.isFinite(alto)) {
            const s = ALTURA / alto;
            const centro = caja.getCenter(new THREE.Vector3());
            escena.position.set(-centro.x, -caja.min.y, -centro.z);
            envoltura.scale.setScalar(s);
        }
        envoltura.add(escena);

        const huesos = buscarHuesos(escena);
        let humanoid = null;
        if (huesos) {
            humanoid = new VRMHumanoid(huesos, { autoUpdateHumanBones: true });
            escena.add(humanoid.normalizedHumanBonesRoot);
        }

        // Sin esqueleto conocido: si trae animaciones, se reproduce la primera
        // (o una que se llame "idle").
        let mixer = null;
        if (!humanoid && gltf.animations?.length) {
            const clip = gltf.animations.find((a) => /idle|reposo|stand/i.test(a.name)) || gltf.animations[0];
            mixer = new THREE.AnimationMixer(escena);
            mixer.clipAction(clip).play();
        }

        personaje = {
            tipo: humanoid ? "glb-animado" : mixer ? "glb-propia" : "glb-quieto",
            objeto: envoltura,
            humanoid,
            hueso: (nombre) => humanoid?.getNormalizedBoneNode(nombre) || null,
            expressionManager: null,
            update: (delta) => {
                humanoid?.update();
                mixer?.update(delta);
            },
        };
    }

    gltf.userData.personaje = personaje;
    return personaje;
}

/* Texto para el panel: cómo se va a ver el modelo en el juego. */
export const TEXTO_TIPO = {
    vrm1: { tono: "ok", texto: "VRM 1.0: se anima completo (camina, saluda y parpadea)." },
    vrm0: { tono: "ok", texto: "VRM 0.x: se gira y se corrige solo. Se anima completo." },
    "glb-animado": { tono: "ok", texto: "GLB con esqueleto: se anima (camina y saluda). No parpadea." },
    "glb-propia": { tono: "aviso", texto: "GLB sin esqueleto conocido: se mostrará con su propia animación." },
    "glb-quieto": {
        tono: "aviso",
        texto: "GLB sin esqueleto: se mostrará quieto. Para que camine, pásalo por Mixamo (gratis) y súbelo de nuevo.",
    },
};

/* Carga un modelo (para el panel) y dice cómo se va a ver. */
export async function analizarModelo(url) {
    const [{ GLTFLoader }, { VRMLoaderPlugin }] = await Promise.all([
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("@pixiv/three-vrm"),
    ]);
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(url);
    const personaje = adaptarModelo(gltf);
    // Alto real del modelo, para calcular el tamaño automático.
    personaje.objeto.updateMatrixWorld(true);
    const caja = new THREE.Box3().setFromObject(personaje.objeto);
    const alto = caja.max.y - caja.min.y;
    return { tipo: personaje.tipo, alto: Number.isFinite(alto) && alto > 0 ? alto : null };
}

/* Tamaño que deja el modelo con la altura de un personaje normal. */
export function tamanoAutomatico(alto) {
    if (!alto) return 1;
    const t = ALTURA / alto;
    // Si ya está casi igual, se deja en 100 %.
    if (Math.abs(t - 1) < 0.06) return 1;
    return Math.min(100, Math.max(0.01, Math.round(t * 1000) / 1000));
}
