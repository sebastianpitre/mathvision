/* Insignia del rango de temporada (Bronce … Maestro), del color del rango
   y con el número de la temporada abajo: S1, S2, S3… */
const COLORES = {
    bronce: ["#e2a272", "#8a4b23"],
    plata: ["#eef2f7", "#8b97a8"],
    oro: ["#ffe27a", "#c48a09"],
    platino: ["#b6fff1", "#2c9c90"],
    diamante: ["#b9d6ff", "#3d67d6"],
    heroico: ["#f0b0ff", "#8e2cc0"],
    maestro: ["#ff9c8a", "#c21f3a"],
};

export default function InsigniaRango({ rango, tamano = "1.6rem", conNombre = false, temporada }) {
    if (!rango) return null;
    const numero = temporada ?? rango.temporada;
    const [claro, oscuro] = COLORES[rango.id] || COLORES.bronce;
    const idGrad = `rg-${rango.id}`;
    return (
        <span className="rg" title={`Rango ${rango.nombre}${numero ? ` · Temporada ${numero}` : ""}`}>
            <svg viewBox="0 0 32 36" width={tamano} height={tamano} aria-hidden="true">
                <defs>
                    <linearGradient id={idGrad} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={claro} />
                        <stop offset="1" stopColor={oscuro} />
                    </linearGradient>
                </defs>
                <path d="M16 1 L30 7 V18 C30 27 23 33 16 35 C9 33 2 27 2 18 V7 Z" fill={`url(#${idGrad})`} stroke="rgba(0,0,0,.45)" strokeWidth="1.5" />
                <path d="M16 4.2 L29 9.6 V18 C29 25.6 23 30.8 16 32.7 C9 30.8 3 25.6 3 18 V9.6 Z" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="0.9" />
                {numero ? (
                    <>
                        <path
                            d="M16 6.5 L17.9 10.4 L22.2 10.8 L18.9 13.6 L20 17.8 L16 15.5 L12 17.8 L13.1 13.6 L9.8 10.8 L14.1 10.4 Z"
                            fill="rgba(255,255,255,.92)"
                        />
                        <text
                            x="16"
                            y="28.2"
                            textAnchor="middle"
                            fontSize={numero > 9 ? 9 : 10.5}
                            fontWeight="900"
                            fontFamily="system-ui, sans-serif"
                            fill="#fff"
                            stroke={oscuro}
                            strokeWidth="2.4"
                            paintOrder="stroke"
                        >{`S${numero}`}</text>
                    </>
                ) : (
                    <path d="M16 8 L19 14.5 L26 15 L20.6 19.4 L22.4 26.2 L16 22.4 L9.6 26.2 L11.4 19.4 L6 15 L13 14.5 Z" fill="rgba(255,255,255,.85)" />
                )}
            </svg>
            {conNombre && <span className="rg-nombre" style={{ color: claro }}>{rango.nombre}</span>}
            {!conNombre && <span className="ffl-oculto">{rango.nombre}</span>}
        </span>
    );
}
