import { useNavigate } from "react-router-dom";
import { LuX } from "react-icons/lu";

import { useFondoLobby } from "../../hooks/useFondoLobby";
import BarraJugador from "./BarraJugador";

/* =========================================================
   PANTALLA ESTILO FREE FIRE (inventario, perfil, sala…)
   Arriba: barra del jugador · título y ✕ para volver.
   El contenido ocupa el resto, sin scroll de página.
========================================================= */

export default function PantallaFF({ titulo, alCerrar, volverA = "/lobby", fondo, className = "", extraArriba, children }) {
    const navigate = useNavigate();
    const fondoLobby = useFondoLobby();

    return (
        <div className={`ffp ${className}`}>
            <div className="ffl-fondo ffp-fondo" style={{ backgroundImage: `url(${fondo || fondoLobby})` }} aria-hidden="true" />

            <header className="ffp-arriba">
                <BarraJugador />
                <div className="ffp-titulo">
                    {extraArriba}
                    <h1>{titulo}</h1>
                    <button type="button" className="ffp-cerrar" onClick={alCerrar || (() => navigate(volverA))} aria-label="Volver">
                        <LuX aria-hidden="true" />
                    </button>
                </div>
            </header>

            <main className="ffp-cuerpo">{children}</main>
        </div>
    );
}

/* Pestañas verticales a la izquierda (la elegida en amarillo). */
export function Pestanas({ items, activa, alCambiar, etiqueta = "Secciones" }) {
    return (
        <nav className="ffp-pestanas" aria-label={etiqueta}>
            {items.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    className={`ffp-pestana ${p.id === activa ? "ffp-pestana-activa" : ""}`}
                    onClick={() => alCambiar(p.id)}
                    aria-pressed={p.id === activa}
                >
                    {p.texto}
                    {p.cuenta != null && <span className="ffp-pestana-cuenta">{p.cuenta}</span>}
                </button>
            ))}
        </nav>
    );
}
