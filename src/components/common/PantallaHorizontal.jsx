import { useCallback, useEffect, useState } from "react";

import { esTactil, esVertical, entrarPantallaCompleta, puedePantallaCompleta, esIOS, enPantallaCompleta } from "../../services/pantalla";

import "./pantallaHorizontal.css";

/* =========================================================
   TELÉFONOS Y TABLETS: EN HORIZONTAL
   ---------------------------------------------------------
   En pantallas táctiles el juego se usa con el teléfono en
   horizontal: mientras esté en vertical, un aviso tapa el
   juego. El juego NO se desmonta debajo: si alguien gira el
   teléfono a mitad de partida, no pierde nada.

   La pantalla completa ya no se pide aquí: está siempre a
   mano en el menú flotante (y se ve igual con o sin ella).
========================================================= */

function leerEstado() {
    return esTactil() && esVertical();
}

export default function PantallaHorizontal({ children }) {
    const [vertical, setVertical] = useState(leerEstado);

    const actualizar = useCallback(() => setVertical(leerEstado()), []);

    useEffect(() => {
        window.addEventListener("resize", actualizar);
        window.addEventListener("orientationchange", actualizar);
        window.screen?.orientation?.addEventListener?.("change", actualizar);

        return () => {
            window.removeEventListener("resize", actualizar);
            window.removeEventListener("orientationchange", actualizar);
            window.screen?.orientation?.removeEventListener?.("change", actualizar);
        };
    }, [actualizar]);

    return (
        <>
            {children}
            {vertical && (
                <div className="ph-aviso" role="dialog" aria-modal="true" aria-live="polite">
                    <div className="ph-caja">
                        <div className="ph-telefono" aria-hidden="true">
                            <span className="ph-telefono-pantalla" />
                        </div>
                        <h1>Gira tu teléfono</h1>
                        <p>LudoGamif se juega con el teléfono en horizontal.</p>
                        {puedePantallaCompleta() && (
                            <button type="button" className="ph-boton" onClick={entrarPantallaCompleta}>
                                Pantalla completa y girar
                            </button>
                        )}
                        {esIOS() && !enPantallaCompleta() && (
                            <p className="ph-nota">
                                Para jugar sin barras: toca <strong>Compartir</strong> → <strong>Agregar a inicio</strong>{" "}
                                y abre LudoGamif desde ahí.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
