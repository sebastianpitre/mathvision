import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuX } from "react-icons/lu";

import { api } from "../../services/api";

import "./anuncio.css";

/* =========================================================
   ANUNCIO DE EVENTOS AL ENTRAR
   Al llegar al lobby sale la imagen del evento activo. Si la
   toca, va a ese evento; con la X se cierra. Sale una vez por
   evento cada vez que se abre el juego (no en cada vuelta al
   lobby). Si hay varios eventos, salen uno tras otro.
========================================================= */

const CLAVE = "ludogamif:anuncios-vistos";

function vistos() {
    try {
        return new Set(JSON.parse(sessionStorage.getItem(CLAVE) || "[]"));
    } catch {
        return new Set();
    }
}

function marcarVisto(id) {
    try {
        const v = vistos();
        v.add(id);
        sessionStorage.setItem(CLAVE, JSON.stringify([...v]));
    } catch {
        // Sin almacenamiento: puede volver a salir, no pasa nada.
    }
}

export default function AnuncioEventos() {
    const navigate = useNavigate();
    const [cola, setCola] = useState([]);

    useEffect(() => {
        let cancelado = false;
        api("/eventos")
            .then((r) => {
                if (cancelado) return;
                const ya = vistos();
                setCola((r.eventos || []).filter((e) => e.imagen && !ya.has(e.id)));
            })
            .catch(() => {});
        return () => {
            cancelado = true;
        };
    }, []);

    const actual = cola[0];

    useEffect(() => {
        if (!actual) return;
        const tecla = (e) => e.key === "Escape" && cerrar();
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    });

    if (!actual) return null;

    const porReclamar = actual.misiones.filter((m) => m.completa && !m.reclamada).length;

    function cerrar() {
        marcarVisto(actual.id);
        setCola((c) => c.slice(1));
    }

    function ir() {
        marcarVisto(actual.id);
        navigate(`/eventos?evento=${actual.id}`);
    }

    return (
        <div className="an-fondo" onClick={cerrar}>
            <div className="an-caja" role="dialog" aria-modal="true" aria-label={`Evento: ${actual.titulo}`} onClick={(e) => e.stopPropagation()}>
                <button type="button" className="an-imagen" onClick={ir} aria-label={`Ver el evento ${actual.titulo}`}>
                    <img src={actual.imagen} alt="" draggable="false" />
                    <span className="an-texto">
                        <strong>{actual.titulo}</strong>
                        <span className="an-ir">{porReclamar ? `¡Tienes ${porReclamar} para reclamar!` : "Toca para ver las misiones"}</span>
                    </span>
                </button>
                <button type="button" className="an-cerrar" onClick={cerrar} aria-label="Cerrar anuncio">
                    <LuX aria-hidden="true" />
                </button>
                {cola.length > 1 && <span className="an-mas" aria-hidden="true">{`1/${cola.length}`}</span>}
            </div>
        </div>
    );
}
