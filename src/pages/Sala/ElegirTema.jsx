import { useEffect, useState } from "react";
import { LuBookOpen, LuShuffle, LuX } from "react-icons/lu";

import { api } from "../../services/api";

/* =========================================================
   TEMA DE LAS PREGUNTAS (InvasiónGamif)
   Los temas son los niveles del panel (Niveles y preguntas).
   "Mezcla" saca preguntas de todos los temas activos.
========================================================= */

export default function ElegirTema({ elegidoId, alElegir, alCerrar }) {
    const [temas, setTemas] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api("/niveles")
            .then((r) => setTemas(r.niveles || []))
            .catch((e) => setError(e.message));
        const tecla = (e) => e.key === "Escape" && alCerrar();
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [alCerrar]);

    return (
        <div className="sl-tema-fondo" onClick={alCerrar}>
            <section className="sl-tema-modal" role="dialog" aria-modal="true" aria-labelledby="sl-tema-t" onClick={(e) => e.stopPropagation()}>
                <header>
                    <h2 id="sl-tema-t">Tema de las preguntas</h2>
                    <button type="button" className="sl-tema-cerrar" onClick={alCerrar} aria-label="Cerrar">
                        <LuX aria-hidden="true" />
                    </button>
                </header>
                <ul>
                    <li>
                        <button type="button" className={`sl-tema-opcion ${!elegidoId ? "sl-tema-elegido" : ""}`} onClick={() => alElegir(null)}>
                            <LuShuffle aria-hidden="true" />
                            <span>
                                <strong>Mezcla de temas</strong>
                                <small>Preguntas de todos los niveles</small>
                            </span>
                        </button>
                    </li>
                    {temas === null && !error && <li className="sl-tema-nota">Cargando temas…</li>}
                    {error && <li className="sl-tema-nota">{error}</li>}
                    {temas?.map((t) => (
                        <li key={t.id}>
                            <button type="button" className={`sl-tema-opcion ${elegidoId === t.id ? "sl-tema-elegido" : ""}`} onClick={() => alElegir(t.id)}>
                                <LuBookOpen aria-hidden="true" />
                                <span>
                                    <strong>{t.nombre}</strong>
                                    <small>{`${t.grado} · ${t.asignatura} · ${t.total_preguntas} preguntas`}</small>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
