/* =========================================================
   PENALGAMIF · DIBUJOS DE LA CANCHA (2D con profundidad)
   Todo se dibuja en un "escenario" 16:9 (1600 × 900) y lo que
   se mueve (balón, arquero, pateador) va en % encima, para
   animarlo con CSS.

   · VistaPateador: ves el arco, el arquero y tus brazos abajo.
   · VistaArquero:  desde el arco ves al que patea y el balón;
                    tus guantes abajo.
========================================================= */

/* ---------- Fondo: estadio con público ---------- */
function Publico({ y, alto, filas = 6 }) {
    const puntos = [];
    const colores = ["#ef4444", "#3b82f6", "#facc15", "#f8fafc", "#22c55e", "#f97316", "#a855f7", "#0ea5e9"];
    let semilla = 7;
    const azar = () => {
        semilla = (semilla * 9301 + 49297) % 233280;
        return semilla / 233280;
    };
    for (let f = 0; f < filas; f++) {
        const yy = y + (alto / filas) * (f + 0.5);
        for (let x = 10; x < 1600; x += 22) {
            puntos.push(<circle key={`${f}-${x}`} cx={x + azar() * 12} cy={yy + azar() * 6} r={5 + f * 0.6} fill={colores[Math.floor(azar() * colores.length)]} opacity={0.55 + azar() * 0.4} />);
        }
    }
    return <g>{puntos}</g>;
}

function Estadio() {
    return (
        <>
            <defs>
                <linearGradient id="pn-cielo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#0b1026" />
                    <stop offset="1" stopColor="#1e2a5a" />
                </linearGradient>
                <linearGradient id="pn-gradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#141b3d" />
                    <stop offset="1" stopColor="#24305f" />
                </linearGradient>
                <radialGradient id="pn-luz" cx="50%" cy="0%" r="70%">
                    <stop offset="0" stopColor="rgba(255,255,255,.35)" />
                    <stop offset="1" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
            </defs>
            <rect width="1600" height="900" fill="url(#pn-cielo)" />
            {[200, 800, 1400].map((x) => (
                <g key={x}>
                    <rect x={x - 40} y="20" width="80" height="26" rx="6" fill="#e2e8f0" />
                    <ellipse cx={x} cy="60" rx="420" ry="260" fill="url(#pn-luz)" />
                </g>
            ))}
            <rect y="90" width="1600" height="230" fill="url(#pn-gradas)" />
            <Publico y={100} alto={210} />
            <rect y="310" width="1600" height="22" fill="#0f172a" />
            {/* Vallas de publicidad */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <g key={i}>
                    <rect x={i * 200} y="312" width="200" height="18" fill={i % 2 ? "#7c3aed" : "#16a34a"} />
                    <text x={i * 200 + 100} y="326" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" fontFamily="system-ui">
                        {i % 2 ? "LUDOGAMIF" : "PENALGAMIF"}
                    </text>
                </g>
            ))}
        </>
    );
}

/* Pasto con franjas en perspectiva (horizonte en y = 330). */
function Pasto({ horizonte = 330 }) {
    const franjas = [];
    for (let i = 0; i < 14; i++) {
        const x1 = -900 + i * 260;
        const x2 = x1 + 260;
        const arriba = (x) => 800 + (x - 800) * 0.32;
        franjas.push(
            <polygon key={i} points={`${arriba(x1)},${horizonte} ${arriba(x2)},${horizonte} ${x2},900 ${x1},900`} fill={i % 2 ? "#2f8f3a" : "#3aa645"} />
        );
    }
    return (
        <>
            <rect y={horizonte} width="1600" height={900 - horizonte} fill="#358f3f" />
            {franjas}
            <rect y={horizonte} width="1600" height={900 - horizonte} fill="url(#pn-sombra-pasto)" />
            <defs>
                <linearGradient id="pn-sombra-pasto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="rgba(0,0,0,.35)" />
                    <stop offset="1" stopColor="rgba(0,0,0,0)" />
                </linearGradient>
            </defs>
        </>
    );
}

/* ---------- Vista del que patea ---------- */
export function FondoPateador() {
    return (
        <svg className="pn-fondo" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
            <Estadio />
            <Pasto />
            <defs>
                <pattern id="pn-red" width="16" height="16" patternUnits="userSpaceOnUse">
                    <path d="M0 0 L16 16 M16 0 L0 16" stroke="rgba(255,255,255,.35)" strokeWidth="1.4" />
                </pattern>
            </defs>
            {/* Red del arco (fondo) */}
            <polygon points="560,230 1040,230 1010,410 590,410" fill="rgba(15,23,42,.55)" />
            <polygon points="560,230 1040,230 1010,410 590,410" fill="url(#pn-red)" />
            {/* Área chica y grande */}
            <polygon points="470,440 1130,440 1240,560 360,560" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="4" />
            <polygon points="300,440 1300,440 1560,760 40,760" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="5" />
            <line x1="0" y1="440" x2="1600" y2="440" stroke="rgba(255,255,255,.8)" strokeWidth="4" />
            {/* Punto penal */}
            <ellipse cx="800" cy="790" rx="16" ry="6" fill="#fff" />
            {/* Palos y travesaño */}
            <rect x="548" y="222" width="16" height="222" rx="4" fill="#f8fafc" />
            <rect x="1036" y="222" width="16" height="222" rx="4" fill="#f8fafc" />
            <rect x="548" y="218" width="504" height="16" rx="4" fill="#f8fafc" />
        </svg>
    );
}

/* ---------- Vista del arquero (desde el arco) ---------- */
export function FondoArquero() {
    return (
        <svg className="pn-fondo" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
            <Estadio />
            <Pasto horizonte={330} />
            {/* Línea del área y punto penal */}
            <line x1="0" y1="700" x2="1600" y2="700" stroke="rgba(255,255,255,.8)" strokeWidth="6" />
            <polygon points="250,700 1350,700 1160,470 440,470" fill="none" stroke="rgba(255,255,255,.65)" strokeWidth="5" />
            <ellipse cx="800" cy="575" rx="11" ry="4" fill="#fff" />
            {/* Palos del arco a los lados de la pantalla */}
            <rect x="40" y="20" width="34" height="880" fill="#f8fafc" />
            <rect x="1526" y="20" width="34" height="880" fill="#f8fafc" />
            <rect x="40" y="10" width="1520" height="30" fill="#f8fafc" />
            <defs>
                <pattern id="pn-red2" width="26" height="26" patternUnits="userSpaceOnUse">
                    <path d="M0 0 L26 26 M26 0 L0 26" stroke="rgba(255,255,255,.28)" strokeWidth="2" />
                </pattern>
            </defs>
            <rect x="0" y="0" width="40" height="900" fill="url(#pn-red2)" />
            <rect x="1560" y="0" width="40" height="900" fill="url(#pn-red2)" />
        </svg>
    );
}

/* ---------- Jugadores ---------- */
/* Imágenes del juego (rojo = primero de la tanda, azul = segundo).
   Los brazos vienen del tamaño del escenario (16:9): cada brazo ya
   está en su lugar. Si se cambia una imagen, se cambia también su
   nombre (-v2, -v3…): el navegador guarda las imágenes 7 días. */
export const ARTE = {
    arquero: { rojo: "/img/penal/arquero-rojo-v2.webp", azul: "/img/penal/arquero-azul-v2.webp" },
    jugador: { rojo: "/img/penal/jugador-rojo.webp", azul: "/img/penal/jugador-azul.webp" },
    guantes: { rojo: "/img/penal/guantes-rojo.webp", azul: "/img/penal/guantes-azul.webp" },
    brazos: { rojo: "/img/penal/brazos-rojo-v2.webp", azul: "/img/penal/brazos-azul-v2.webp" },
};

export function DibujoArquero({ equipo = "rojo" }) {
    return <img className="pn-figura-img" src={ARTE.arquero[equipo]} alt="" draggable="false" />;
}

export function DibujoPateador({ equipo = "rojo" }) {
    return <img className="pn-figura-img" src={ARTE.jugador[equipo]} alt="" draggable="false" />;
}

export function Balon() {
    return <img className="pn-balon-svg" src="/img/penal/balon.webp" alt="" draggable="false" />;
}

/* ---------- Primera persona ---------- */
/* Brazos del que patea en primera persona (del color de su equipo). */
export function BrazosPateador({ equipo = "rojo", color = "#ef4444" }) {
    if (ARTE.brazos[equipo]) return <img className="pn-brazos-img" src={ARTE.brazos[equipo]} alt="" draggable="false" />;
    const brazo = (lado) => (
        <svg viewBox="0 0 300 300" className={`pn-brazo pn-brazo-${lado}`} aria-hidden="true">
            <path d="M40 300 C60 230 110 170 170 130" stroke={color} strokeWidth="78" strokeLinecap="round" fill="none" />
            <path d="M40 300 C60 230 110 170 170 130" stroke="rgba(255,255,255,.15)" strokeWidth="18" strokeLinecap="round" fill="none" transform="translate(-14 6)" />
            <path d="M150 140 C175 120 200 110 222 112" stroke="#e0a875" strokeWidth="52" strokeLinecap="round" fill="none" />
            <ellipse cx="238" cy="110" rx="34" ry="30" fill="#e0a875" />
            <path d="M232 86 C248 80 266 86 268 98" stroke="#c58b5c" strokeWidth="6" fill="none" strokeLinecap="round" />
            <rect x="108" y="150" width="72" height="16" rx="8" fill="#f8fafc" transform="rotate(-38 144 158)" />
        </svg>
    );
    return (
        <div className="pn-brazos" aria-hidden="true">
            {brazo("izq")}
            {brazo("der")}
        </div>
    );
}

/* Guantes del arquero en primera persona. */
export function GuantesArquero({ equipo = "azul" }) {
    return (
        <div className="pn-guantes" aria-hidden="true">
            <img className="pn-guantes-img" src={ARTE.guantes[equipo]} alt="" draggable="false" />
        </div>
    );
}
