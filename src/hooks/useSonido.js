import { useEffect, useState } from "react";

import { alCambiarSilencio, cambiarSilencio, estaSilenciado } from "../services/sonido";

/* Botón de sonido de los juegos: es el mismo ajuste general del
   menú flotante (apaga efectos y música en todo el juego). */
export function useSonido() {
    const [activo, setActivo] = useState(() => !estaSilenciado());
    useEffect(() => alCambiarSilencio((silencio) => setActivo(!silencio)), []);
    return [activo, () => cambiarSilencio()];
}
