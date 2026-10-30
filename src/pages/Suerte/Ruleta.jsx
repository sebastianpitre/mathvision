import { LuGem, LuRotateCw } from "react-icons/lu";

import Tiquete from "../../components/juego/Tiquete";
import FotoPerfil from "../../components/juego/FotoPerfil";

/* =========================================================
   RULETA REDONDA: un espacio por premio, con su foto.
   El ángulo final lo calcula la pantalla con el premio que
   eligió el servidor (todos los espacios miden lo mismo; la
   probabilidad real se ve en "Premios y suerte").
========================================================= */

const COLORES = [
    ["#8b5cf6", "#4c1d95"],
    ["#fbbf24", "#b45309"],
    ["#38bdf8", "#075985"],
    ["#f472b6", "#9d174d"],
    ["#34d399", "#065f46"],
    ["#f87171", "#991b1b"],
];

export function IconoPremio({ premio, foto }) {
    if (premio.tipo === "oro") return <span className="rl-icono-oro" aria-hidden="true" />;
    if (premio.tipo === "diamantes") return <LuGem className="rl-icono-gema" aria-hidden="true" />;
    if (premio.tipo === "tickets") return <Tiquete tamano="100%" />;
    if (premio.tipo === "nada") return <LuRotateCw className="rl-icono-nada" aria-hidden="true" />;
    if (premio.tipo === "marco") {
        return (
            <span className="rl-icono-marco">
                <FotoPerfil foto={foto} marco={premio.imagen} />
            </span>
        );
    }
    return premio.imagen ? <img src={premio.imagen} alt="" draggable="false" /> : <span aria-hidden="true">🎁</span>;
}

export function textoCorto(p) {
    if (p.tipo === "oro" || p.tipo === "diamantes" || p.tipo === "tickets") return `×${p.cantidad}`;
    if (p.tipo === "nada") return "Otra vez";
    return p.nombre;
}

/* Color de cada espacio (sin dos iguales seguidos, ni el último igual al primero). */
function colorDe(i, n) {
    let c = i % COLORES.length;
    if (i === n - 1 && n > 1 && c === 0) c = (c + 2) % COLORES.length;
    return c;
}

export default function Ruleta({ premios, angulo, girando, foto }) {
    const n = premios.length;
    const paso = 360 / n;
    const punto = (grados, radio) => {
        const a = ((grados - 90) * Math.PI) / 180;
        return [100 + radio * Math.cos(a), 100 + radio * Math.sin(a)];
    };

    return (
        <div className="rl-ruleta">
            <div className={`rl-disco ${girando ? "rl-girando" : ""}`} style={{ transform: `rotate(${angulo}deg)` }}>
                <svg viewBox="0 0 200 200" className="rl-fondo" aria-hidden="true">
                    <defs>
                        {COLORES.map(([a, b], i) => (
                            <radialGradient key={i} id={`rl-c${i}`} cx="50%" cy="50%" r="55%">
                                <stop offset="0.3" stopColor={b} />
                                <stop offset="1" stopColor={a} />
                            </radialGradient>
                        ))}
                    </defs>
                    {premios.map((p, i) => {
                        const [x1, y1] = punto(i * paso, 96);
                        const [x2, y2] = punto((i + 1) * paso, 96);
                        return (
                            <path
                                key={p.id}
                                d={`M100 100 L${x1} ${y1} A96 96 0 ${paso > 180 ? 1 : 0} 1 ${x2} ${y2} Z`}
                                fill={`url(#rl-c${colorDe(i, n)})`}
                                stroke="rgba(255,240,200,.85)"
                                strokeWidth="1.2"
                            />
                        );
                    })}
                    <circle cx="100" cy="100" r="97" fill="none" stroke="#ffd36b" strokeWidth="4" />
                    {Array.from({ length: n * 2 }, (_, i) => {
                        const [x, y] = punto((i * paso) / 2, 97);
                        return <circle key={i} cx={x} cy={y} r="2.2" fill={i % 2 ? "#fff7d6" : "#ffb321"} />;
                    })}
                </svg>

                {premios.map((p, i) => (
                    <div key={p.id} className="rl-espacio" style={{ transform: `rotate(${i * paso + paso / 2}deg)` }}>
                        <div className="rl-premio">
                            <span className="rl-premio-img">
                                <IconoPremio premio={p} foto={foto} />
                            </span>
                            <span className="rl-premio-texto">{textoCorto(p)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <span className="rl-centro" aria-hidden="true">
                <span>GIRA</span>
                <b>GAMIF</b>
            </span>
            <span className="rl-puntero" aria-hidden="true" />
        </div>
    );
}
