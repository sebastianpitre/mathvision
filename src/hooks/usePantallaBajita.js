import { useEffect, useState } from "react";

/*
 * true cuando la pantalla es un teléfono en horizontal (o
 * cualquier pantalla de poca altura). Es la misma condición
 * que usan los estilos: (orientation: landscape) and (max-height: 560px)
 */
export const CONSULTA_BAJITA = "(orientation: landscape) and (max-height: 560px)";

export function usePantallaBajita() {
    const [bajita, setBajita] = useState(
        () => typeof window !== "undefined" && window.matchMedia(CONSULTA_BAJITA).matches
    );

    useEffect(() => {
        const mq = window.matchMedia(CONSULTA_BAJITA);
        const cambiar = () => setBajita(mq.matches);
        mq.addEventListener("change", cambiar);
        return () => mq.removeEventListener("change", cambiar);
    }, []);

    return bajita;
}
