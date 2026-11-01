import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuX } from "react-icons/lu";

import { api } from "../../services/api";
import { PlanetaLienzo } from "./Planeta";

import "./anuncio.css";

/* =========================================================
   ANUNCIO DE EVENTOS AL ENTRAR
   Al llegar al lobby sale la imagen del evento activo. Si la
   toca, va a ese evento; con la X se cierra. Sale una vez por
   evento cada vez que se abre el juego (no en cada vuelta al
   lobby). Si hay varios eventos, salen uno tras otro.
   Primero sale el del Mundo 3D: un planeta girando y, al
   tocarlo, entra al mundo.
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
    const [verMundo, setVerMundo] = useState(() => !vistos().has("mundo"));

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
        if (!actual && !verMundo) return;
        const tecla = (e) => {
            if (e.key !== "Escape") return;
            if (verMundo) {
                marcarVisto("mundo");
                setVerMundo(false);
            } else cerrar();
        };
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    });

    if (verMundo) {
        const cerrarMundo = () => {
            marcarVisto("mundo");
            setVerMundo(false);
        };
        const entrar = () => {
            marcarVisto("mundo");
            navigate("/mundo");
        };
        return (
            <div className="an-fondo" onClick={cerrarMundo}>
                <div className="an-caja" role="dialog" aria-modal="true" aria-label="Mundo 3D" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="an-mundo" onClick={entrar} aria-label="Entrar al Mundo 3D">
                        <span className="pl-estrellas" aria-hidden="true" />
                        <PlanetaLienzo />
                        <span className="an-mundo-texto">
                            <small>Ya está abierto</small>
                            <strong>Mundo 3D</strong>
                            <p>Camina con tu personaje, habla con tus amigos y entra a los círculos de juego.</p>
                            <span className="an-ir">Entrar al mundo</span>
                        </span>
                    </button>
                    <button type="button" className="an-cerrar" onClick={cerrarMundo} aria-label="Cerrar anuncio">
                        <LuX aria-hidden="true" />
                    </button>
                    {cola.length > 0 && <span className="an-mas" aria-hidden="true">{`1/${cola.length + 1}`}</span>}
                </div>
            </div>
        );
    }

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
