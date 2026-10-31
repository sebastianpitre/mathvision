import "./profesor.css";

/* =========================================================
   PROFESOR GAMIF: sale flotando cuando fallas y te explica
   en un globo por qué la respuesta correcta es esa.
   Dibujo hecho en SVG (carga al instante en celulares).
========================================================= */

export function DibujoProfesor({ className = "" }) {
    return (
        <svg className={className} viewBox="0 0 120 150" aria-hidden="true">
            <defs>
                <linearGradient id="pf-saco" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#4f46e5" />
                    <stop offset="1" stopColor="#312e81" />
                </linearGradient>
                <radialGradient id="pf-piel" cx="45%" cy="40%" r="60%">
                    <stop offset="0" stopColor="#ffe0c2" />
                    <stop offset="1" stopColor="#f2b88a" />
                </radialGradient>
            </defs>
            {/* sombra */}
            <ellipse cx="60" cy="146" rx="30" ry="4" fill="rgba(0,0,0,.35)" />
            {/* cuerpo / saco */}
            <path d="M24 146 C24 112 36 98 60 98 C84 98 96 112 96 146 Z" fill="url(#pf-saco)" />
            <path d="M60 98 L50 146 H70 Z" fill="#f8fafc" />
            <path d="M55 104 L60 112 L65 104 L60 100 Z" fill="#ef4444" />
            <path d="M60 112 L56 132 L60 138 L64 132 Z" fill="#ef4444" />
            <path d="M44 100 L60 120 L50 146 H40 Z" fill="#3730a3" />
            <path d="M76 100 L60 120 L70 146 H80 Z" fill="#3730a3" />
            {/* brazo con el puntero */}
            <path d="M92 116 C102 108 108 98 110 86" stroke="#3730a3" strokeWidth="10" strokeLinecap="round" fill="none" />
            <circle cx="110" cy="84" r="6" fill="url(#pf-piel)" />
            <line x1="110" y1="82" x2="118" y2="52" stroke="#a16207" strokeWidth="3" strokeLinecap="round" />
            <circle cx="118" cy="51" r="2.6" fill="#ffcf3e" />
            {/* cuello y cabeza */}
            <rect x="53" y="88" width="14" height="12" rx="4" fill="#f2b88a" />
            <circle cx="60" cy="58" r="32" fill="url(#pf-piel)" />
            {/* orejas */}
            <circle cx="28" cy="62" r="6" fill="#f2b88a" />
            <circle cx="92" cy="62" r="6" fill="#f2b88a" />
            {/* pelo canoso */}
            <path d="M28 52 C26 34 40 22 54 24 C58 16 74 16 80 26 C92 28 96 42 92 54 C88 44 82 40 76 42 C70 34 58 34 52 40 C44 36 34 42 28 52 Z" fill="#e5e7eb" />
            <path d="M30 56 C26 50 28 44 32 42" stroke="#cbd5e1" strokeWidth="3" fill="none" />
            {/* cejas */}
            <path d="M40 48 Q47 43 54 47" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M66 47 Q73 43 80 48" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* gafas */}
            <circle cx="47" cy="58" r="9" fill="rgba(255,255,255,.35)" stroke="#1e293b" strokeWidth="2.6" />
            <circle cx="73" cy="58" r="9" fill="rgba(255,255,255,.35)" stroke="#1e293b" strokeWidth="2.6" />
            <path d="M56 58 H64" stroke="#1e293b" strokeWidth="2.6" />
            <circle cx="47" cy="59" r="3" fill="#1e293b" className="pf-ojo" />
            <circle cx="73" cy="59" r="3" fill="#1e293b" className="pf-ojo" />
            {/* nariz, bigote y boca */}
            <path d="M60 62 Q63 70 59 72" stroke="#d97757" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <path d="M46 76 Q53 71 60 75 Q67 71 74 76 Q67 80 60 77 Q53 80 46 76 Z" fill="#cbd5e1" />
            <path d="M53 82 Q60 87 67 82" stroke="#9a3412" strokeWidth="2.4" strokeLinecap="round" fill="none" className="pf-boca" />
            {/* birrete */}
            <path d="M30 30 L60 16 L90 30 L60 42 Z" fill="#111827" />
            <rect x="48" y="30" width="24" height="9" rx="2" fill="#1f2937" />
            <path d="M88 31 V44" stroke="#ffcf3e" strokeWidth="2" />
            <circle cx="88" cy="46" r="2.8" fill="#ffcf3e" />
        </svg>
    );
}

/*
 * resultado: { acerto, agotado, textoCorrecto, explicacion }
 * restante: segundos que faltan para poder tocar otra casilla
 * pie: texto de abajo (si no, el de InvasiónGamif con los segundos)
 */
export default function Profesor({ resultado, restante = 0, pie, alCerrar }) {
    const explicacion =
        resultado.explicacion ||
        `La respuesta correcta era «${resultado.textoCorrecto}». ¡Repásala y la próxima es tuya!`;

    return (
        <div className="pf" role="dialog" aria-modal="false" aria-labelledby="pf-titulo" aria-describedby="pf-texto">
            <div className="pf-globo">
                <strong id="pf-titulo">{resultado.agotado ? "¡Se acabó el tiempo!" : "¡Casi! Mira por qué:"}</strong>
                <p className="pf-correcta">
                    Respuesta correcta: <b>{resultado.textoCorrecto}</b>
                </p>
                <p id="pf-texto" className="pf-texto">{explicacion}</p>
                <div className="pf-pie">
                    <small>{pie || (restante > 0 ? `Puedes volver a invadir en ${restante} s` : "¡Ya puedes volver a invadir!")}</small>
                    <button type="button" className="ffp-btn pf-listo" onClick={alCerrar}>
                        Entendido
                    </button>
                </div>
            </div>
            <DibujoProfesor className="pf-dibujo" />
        </div>
    );
}
