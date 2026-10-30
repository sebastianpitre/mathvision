/* Tiquete 🎫 de GiraGamif: dorado con morado, borde dentado y una estrella. */
import { useId } from "react";

export default function Tiquete({ tamano = "1.15rem", className = "" }) {
    const id = useId().replace(/:/g, "");
    return (
        <svg className={`tq-icono ${className}`} viewBox="0 0 40 26" width={tamano} height={tamano} aria-hidden="true">
            <defs>
                <linearGradient id={`tq-oro-${id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffe68a" />
                    <stop offset="0.55" stopColor="#ffb321" />
                    <stop offset="1" stopColor="#e2780d" />
                </linearGradient>
                <linearGradient id={`tq-mora-${id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#b26bff" />
                    <stop offset="1" stopColor="#6d28d9" />
                </linearGradient>
            </defs>
            <g transform="rotate(-12 20 13)">
                {/* Cuerpo con muescas redondas a los lados */}
                <path
                    d="M4 4 H36 a2 2 0 0 1 2 2 V10 a3 3 0 0 0 0 6 V20 a2 2 0 0 1 -2 2 H4 a2 2 0 0 1 -2 -2 V16 a3 3 0 0 0 0 -6 V6 a2 2 0 0 1 2 -2 Z"
                    fill={`url(#tq-oro-${id})`}
                    stroke="#7a3a00"
                    strokeWidth="1.2"
                />
                {/* Talón morado */}
                <path d="M28 4 H36 a2 2 0 0 1 2 2 V10 a3 3 0 0 0 0 6 V20 a2 2 0 0 1 -2 2 H28 Z" fill={`url(#tq-mora-${id})`} />
                <line x1="28" y1="5" x2="28" y2="21" stroke="#fff6d6" strokeWidth="1" strokeDasharray="1.6 1.4" />
                {/* Estrella */}
                <path d="M15 7.5 L16.6 11 L20.4 11.3 L17.5 13.8 L18.4 17.5 L15 15.5 L11.6 17.5 L12.5 13.8 L9.6 11.3 L13.4 11 Z" fill="#fff8dc" stroke="#b45309" strokeWidth="0.6" />
                <circle cx="33" cy="13" r="1.6" fill="#fde68a" />
            </g>
        </svg>
    );
}
