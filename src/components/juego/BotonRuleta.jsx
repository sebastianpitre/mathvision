import "./carrusel.css";

/* =========================================================
   BOTÓN DE GIRAGAMIF (lobby): una ruletita que gira sola.
   Con el número rojo de tiquetes que tiene para girar.
========================================================= */

const COLORES = ["#8b5cf6", "#fbbf24", "#38bdf8", "#f472b6", "#34d399", "#f87171", "#fbbf24", "#38bdf8"];

function punto(grados, radio) {
    const a = ((grados - 90) * Math.PI) / 180;
    return [50 + radio * Math.cos(a), 50 + radio * Math.sin(a)];
}

export default function BotonRuleta({ tiquetes = 0, onClick }) {
    const paso = 360 / COLORES.length;
    return (
        <button
            type="button"
            className="rb"
            onClick={onClick}
            aria-label={`GiraGamif, ruleta de premios${tiquetes ? `: tienes ${tiquetes} tiquetes` : ""}`}
            title="GiraGamif"
        >
            <span className="rb-rueda" aria-hidden="true">
                <svg viewBox="0 0 100 100">
                    {COLORES.map((c, i) => {
                        const [x1, y1] = punto(i * paso, 48);
                        const [x2, y2] = punto((i + 1) * paso, 48);
                        return <path key={i} d={`M50 50 L${x1} ${y1} A48 48 0 0 1 ${x2} ${y2} Z`} fill={c} stroke="#fff4cf" strokeWidth="1" />;
                    })}
                    {COLORES.map((_, i) => {
                        const [x, y] = punto(i * paso + paso / 2, 33);
                        return <circle key={`p${i}`} cx={x} cy={y} r="4" fill="rgba(255,255,255,.75)" />;
                    })}
                    <circle cx="50" cy="50" r="48" fill="none" stroke="#ffd36b" strokeWidth="3" />
                    <circle cx="50" cy="50" r="13" fill="#2e1065" stroke="#ffd36b" strokeWidth="3" />
                    <path d="M50 41 L52.6 47 L59 47.3 L54 51.3 L55.7 57.6 L50 54 L44.3 57.6 L46 51.3 L41 47.3 L47.4 47 Z" fill="#ffd36b" />
                </svg>
            </span>
            <span className="rb-puntero" aria-hidden="true" />
            <span className="rb-nombre" aria-hidden="true">
                Gira<b>Gamif</b>
            </span>
            {tiquetes > 0 && (
                <span className="rb-cuenta" aria-hidden="true">
                    {tiquetes > 99 ? "99+" : tiquetes}
                </span>
            )}
        </button>
    );
}
