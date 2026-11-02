/* =========================================================
   MUNDO 3D · CONTROLES (los configura el admin para todos)
========================================================= */

export const TECLAS_POR_DEFECTO = {
    adelante: "KeyW",
    atras: "KeyS",
    izquierda: "KeyA",
    derecha: "KeyD",
    correr: "ShiftLeft",
    correrSolo: "KeyR",
    saltar: "Space",
    agarrar: "KeyE",
    usar: "KeyF",
    hablar: "KeyV",
    escribir: "Enter",
    mirar: "KeyZ",
};

/* Dónde va cada botón en el celular: % del ancho y del alto (el centro del botón). */
export const POSICIONES_POR_DEFECTO = {
    joystick: { x: 15, y: 72 },
    escribir: { x: 70, y: 60 },
    agarrar: { x: 80, y: 58 },
    hablar: { x: 91, y: 56 },
    correr: { x: 79, y: 84 },
    saltar: { x: 91, y: 82 },
    usar: { x: 50, y: 24 },
};

export const TAMANOS_POR_DEFECTO = { joystick: 1, saltar: 1, correr: 1, agarrar: 1, hablar: 1, escribir: 1, usar: 1 };

export const NOMBRE_ACCION = {
    adelante: "Adelante",
    atras: "Atrás",
    izquierda: "Izquierda",
    derecha: "Derecha",
    correr: "Correr (mantener)",
    correrSolo: "Correr solo",
    saltar: "Brincar",
    agarrar: "Agarrar / lanzar (mantener para apuntar)",
    usar: "Usar",
    hablar: "Hablar (mantener)",
    escribir: "Escribir",
    mirar: "Mirar con el mouse (sin clic)",
};

export const NOMBRE_BOTON = {
    joystick: "Joystick",
    saltar: "Brincar",
    correr: "Correr",
    agarrar: "Agarrar",
    hablar: "Hablar",
    escribir: "Escribir",
    usar: "Usar",
};

/* "KeyW" → "W", "Space" → "Espacio"… */
export function nombreTecla(codigo) {
    if (!codigo) return "—";
    if (codigo.startsWith("Key")) return codigo.slice(3);
    if (codigo.startsWith("Digit")) return codigo.slice(5);
    const nombres = {
        Space: "Espacio",
        Enter: "Enter",
        ShiftLeft: "Shift",
        ShiftRight: "Shift der.",
        ControlLeft: "Ctrl",
        ControlRight: "Ctrl der.",
        AltLeft: "Alt",
        Tab: "Tab",
        CapsLock: "Bloq Mayús",
        ArrowUp: "↑",
        ArrowDown: "↓",
        ArrowLeft: "←",
        ArrowRight: "→",
        Backspace: "Borrar",
    };
    return nombres[codigo] || codigo;
}
