/* =========================================================
   MUNDO 3D · SONIDOS DE LA CANCHA
   El admin elige en el editor (por cancha) qué sonido suena en
   cada acción, de la biblioteca de sonidos (reutilizables). Si
   no eligió, suena el de fábrica. Más lejos, más bajito.
========================================================= */

import { estaSilenciado } from "../../services/sonido";

export const ACCIONES_CANCHA = [
    { clave: "anota", nombre: "Cesta / gol" },
    { clave: "palo", nombre: "Pega en el palo o el aro" },
    { clave: "tomar", nombre: "Toma el balón" },
    { clave: "robar", nombre: "Quita el balón" },
    { clave: "pase", nombre: "Pase a un compañero" },
    { clave: "rebote", nombre: "Rebota en un jugador" },
    { clave: "falta", nombre: "Falta" },
    { clave: "entrar", nombre: "Entra un jugador" },
    { clave: "inicio", nombre: "Empieza el partido" },
    { clave: "fin", nombre: "Termina el partido" },
];

/* De fábrica (los que trae el juego). */
export function sonidoDeFabrica(accion, deporte) {
    const d = {
        anota: deporte === "futbol" ? "/sounds/penal/gol.mp3" : "/sounds/victory.mp3",
        palo: "/sounds/penal/atajada.mp3",
        tomar: "/sounds/click.mp3",
        robar: "/sounds/warning.mp3",
        pase: "/sounds/correct.mp3",
        rebote: "/sounds/click.mp3",
        falta: "/sounds/penal/silbato.mp3",
        entrar: "/sounds/unlock.mp3",
        inicio: "/sounds/penal/silbato.mp3",
        fin: "/sounds/victory.mp3",
    };
    return { ruta: d[accion] || null, volumen: accion === "rebote" || accion === "tomar" ? 45 : 75 };
}

/* El sonido elegido para esa acción en esa cancha (o el de fábrica). */
export function sonidoDe(o, accion) {
    const elegido = o?.sonidos?.[accion];
    return elegido ? elegido : sonidoDeFabrica(accion, o?.deporte);
}

const ALCANCE = 45; // metros: más lejos no se oye

export function sonarCancha(o, accion, distancia = 0) {
    if (estaSilenciado() || distancia > ALCANCE) return;
    const s = sonidoDe(o, accion);
    if (!s?.ruta) return;
    const cerca = distancia <= 6 ? 1 : Math.max(0, 1 - (distancia - 6) / (ALCANCE - 6));
    const audio = new Audio(s.ruta);
    audio.volume = Math.max(0, Math.min(1, (s.volumen / 100) * cerca));
    audio.play().catch(() => {});
}
