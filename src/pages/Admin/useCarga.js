import { useCallback, useEffect, useState } from "react";

import { api } from "../../services/api";

/*
 * Pide datos al servidor al montar y permite recargarlos.
 *   const { datos, cargando, error, recargar } = useCarga("/admin/resumen");
 */
export function useCarga(ruta) {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const recargar = useCallback(async () => {
        setCargando(true);
        setError("");

        try {
            setDatos(await api(ruta));
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    }, [ruta]);

    useEffect(() => {
        recargar();
    }, [recargar]);

    return { datos, cargando, error, recargar, setDatos };
}

export const formato = (n) => (Number(n) || 0).toLocaleString("es-CO");

export function fecha(valor) {
    if (!valor) return "—";

    return new Date(valor).toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export const NOMBRE_JUEGO = {
    preguntas: "Preguntas",
    triqui: "Triqui",
    "escape-algebra": "Escape Álgebra",
    siglo: "SigloGamif",
};

export const NOMBRE_RESULTADO = {
    completada: "Completada",
    retirada: "Retirada",
    sin_vidas: "Sin vidas",
    ganada: "Ganada",
    perdida: "Perdida",
    empate: "Empate",
};
