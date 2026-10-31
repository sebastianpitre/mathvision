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
export function DibujoArquero({ color = "#facc15" }) {
    return (
        <svg viewBox="0 0 120 160" className="pn-figura-svg" aria-hidden="true">
            <ellipse cx="60" cy="156" rx="34" ry="5" fill="rgba(0,0,0,.35)" />
            {/* brazos abiertos */}
            <path d="M30 62 L6 40" stroke={color} strokeWidth="13" strokeLinecap="round" />
            <path d="M90 62 L114 40" stroke={color} strokeWidth="13" strokeLinecap="round" />
            <circle cx="6" cy="38" r="9" fill="#e5e7eb" stroke="#111" strokeWidth="2" />
            <circle cx="114" cy="38" r="9" fill="#e5e7eb" stroke="#111" strokeWidth="2" />
            {/* cuerpo */}
            <rect x="30" y="50" width="60" height="58" rx="14" fill={color} />
            <text x="60" y="88" textAnchor="middle" fontSize="24" fontWeight="900" fill="rgba(0,0,0,.45)" fontFamily="system-ui">1</text>
            <rect x="32" y="104" width="56" height="20" rx="6" fill="#111827" />
            <path d="M42 124 L38 152" stroke="#f1c27d" strokeWidth="11" strokeLinecap="round" />
            <path d="M78 124 L82 152" stroke="#f1c27d" strokeWidth="11" strokeLinecap="round" />
            <circle cx="60" cy="32" r="18" fill="#f1c27d" />
            <path d="M42 28 Q60 6 78 28 Q70 18 60 20 Q50 18 42 28 Z" fill="#3f2a1d" />
        </svg>
    );
}

export function DibujoPateador({ color = "#ef4444" }) {
    return (
        <svg viewBox="0 0 120 200" className="pn-figura-svg" aria-hidden="true">
            <ellipse cx="60" cy="196" rx="32" ry="5" fill="rgba(0,0,0,.35)" />
            <path d="M34 78 L18 120" stroke={color} strokeWidth="12" strokeLinecap="round" />
            <path d="M86 78 L102 120" stroke={color} strokeWidth="12" strokeLinecap="round" />
            <rect x="32" y="62" width="56" height="70" rx="14" fill={color} />
            <text x="60" y="108" textAnchor="middle" fontSize="26" fontWeight="900" fill="rgba(255,255,255,.75)" fontFamily="system-ui">10</text>
            <rect x="34" y="128" width="52" height="24" rx="6" fill="#f8fafc" />
            <path d="M46 150 L42 190" stroke="#f1c27d" strokeWidth="12" strokeLinecap="round" />
            <path d="M74 150 L80 190" stroke="#f1c27d" strokeWidth="12" strokeLinecap="round" />
            <circle cx="60" cy="40" r="20" fill="#f1c27d" />
            <path d="M40 36 Q60 10 80 36 Q72 24 60 26 Q48 24 40 36 Z" fill="#111827" />
        </svg>
    );
}

export function Balon() {
    return (
        <svg viewBox="0 0 100 100" className="pn-balon-svg" aria-hidden="true">
            <circle cx="50" cy="50" r="47" fill="#f8fafc" stroke="#111827" strokeWidth="3" />
            <polygon points="50,30 66,42 60,61 40,61 34,42" fill="#111827" />
            <path d="M50 30 L50 4 M66 42 L90 32 M60 61 L76 84 M40 61 L24 84 M34 42 L10 32" stroke="#111827" strokeWidth="3" />
            <ellipse cx="34" cy="28" rx="12" ry="7" fill="rgba(255,255,255,.7)" />
        </svg>
    );
}

/* ---------- Primera persona ---------- */
/* Brazos del que patea (de ejemplo: se cambian por la imagen que llegue). */
export function BrazosPateador({ color = "#ef4444", imagen }) {
    if (imagen) return <img className="pn-brazos-img" src={imagen} alt="" draggable="false" />;
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
export function GuantesArquero({ color = "#22c55e" }) {
    const guante = (lado) => (
        <svg viewBox="0 0 260 320" className={`pn-guante pn-guante-${lado}`} aria-hidden="true">
            <path d="M70 320 C80 260 90 220 100 200" stroke={color} strokeWidth="70" strokeLinecap="round" fill="none" />
            <rect x="52" y="60" width="150" height="160" rx="50" fill="#f8fafc" stroke="#0f172a" strokeWidth="6" />
            {[0, 1, 2, 3].map((d) => (
                <rect key={d} x={58 + d * 36} y={8 + Math.abs(1.5 - d) * 10} width="32" height="90" rx="16" fill="#f8fafc" stroke="#0f172a" strokeWidth="6" />
            ))}
            <rect x="52" y="150" width="150" height="40" rx="12" fill={color} />
            <text x="127" y="178" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff" fontFamily="system-ui">GAMIF</text>
        </svg>
    );
    return (
        <div className="pn-guantes" aria-hidden="true">
            {guante("izq")}
            {guante("der")}
        </div>
    );
}
