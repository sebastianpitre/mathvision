import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuCalendarDays, LuGamepad2, LuSparkles } from "react-icons/lu";

import games from "../../data/mock/games.json";
import { api } from "../../services/api";

import "./carrusel.css";

/* =========================================================
   CARRUSEL DE ANUNCIOS (arriba a la izquierda del lobby)
   Pasa solo cada pocos segundos; también se puede deslizar
   o tocar los puntitos. Al tocar un anuncio:
     juego → queda elegido · evento/pantalla → va para allá.
   Lo arma el administrador en el panel (Anuncios).
========================================================= */

// Mientras carga (o si el servidor no responde) sale el juego destacado de siempre.
const RESPALDO = { segundos: 5, anuncios: [{ clave: "r", tipo: "juego", juego_id: "siglo", etiqueta: "Nuevo", solo_imagen: true }] };

const ICONOS = { juego: LuGamepad2, evento: LuCalendarDays, pantalla: LuSparkles };

/* Un anuncio (también lo usa el panel para la vista previa). */
export function Diapositiva({ a, juego }) {
    const imagen = a.imagen || (a.tipo === "juego" ? juego?.image : "");
    const Icono = ICONOS[a.tipo] || LuSparkles;
    const titulo = a.titulo || (a.tipo === "juego" ? juego?.name : "");
    return (
        <span className={`cr-diapo cr-fondo-${a.fondo || "morado"} ${imagen ? "cr-con-imagen" : ""}`}>
            {imagen ? (
                <img src={imagen} alt="" draggable="false" />
            ) : (
                <Icono className="cr-diapo-icono" aria-hidden="true" />
            )}
            {(!imagen || !a.solo_imagen) && (titulo || a.subtitulo) && (
                <span className="cr-diapo-texto">
                    {titulo && <strong>{titulo}</strong>}
                    {a.subtitulo && <small>{a.subtitulo}</small>}
                </span>
            )}
            {a.etiqueta && <span className="cr-etiqueta">{a.etiqueta}</span>}
        </span>
    );
}

export default function Carrusel({ alElegirJuego }) {
    const navigate = useNavigate();
    const [datos, setDatos] = useState(RESPALDO);
    const [i, setI] = useState(0);
    const [pausa, setPausa] = useState(false);
    const toque = useRef(null);
    const arrastro = useRef(false);

    useEffect(() => {
        let cancelado = false;
        api("/carrusel")
            .then((r) => {
                if (cancelado) return;
                // Los juegos que no existen en esta versión no se muestran.
                const anuncios = (r.anuncios || []).filter((a) => a.tipo !== "juego" || games.some((g) => g.id === a.juego_id));
                if (anuncios.length) setDatos({ segundos: r.segundos || 5, anuncios });
            })
            .catch(() => {});
        return () => {
            cancelado = true;
        };
    }, []);

    const total = datos.anuncios.length;
    const actual = Math.min(i, total - 1);

    useEffect(() => {
        if (total < 2 || pausa) return;
        const t = setTimeout(() => setI((n) => (n + 1) % total), datos.segundos * 1000);
        return () => clearTimeout(t);
    }, [actual, total, pausa, datos.segundos]);

    function abrir(a) {
        if (arrastro.current) return; // fue un deslizamiento, no un toque
        if (a.tipo === "juego") {
            const g = games.find((x) => x.id === a.juego_id);
            if (g) alElegirJuego?.(g);
        } else if (a.ruta) {
            navigate(a.ruta);
        }
    }

    const mover = (paso) => setI((n) => (Math.min(n, total - 1) + paso + total) % total);

    return (
        <div
            className="cr"
            role="region"
            aria-roledescription="carrusel"
            aria-label="Anuncios"
            // Con el mouse encima se detiene (en el celular sigue pasando).
            onPointerEnter={(e) => e.pointerType === "mouse" && setPausa(true)}
            onPointerLeave={() => setPausa(false)}
            onPointerDown={(e) => {
                toque.current = e.clientX;
                arrastro.current = false;
            }}
            onPointerUp={(e) => {
                if (toque.current === null) return;
                const dx = e.clientX - toque.current;
                toque.current = null;
                if (Math.abs(dx) > 30 && total > 1) {
                    arrastro.current = true;
                    mover(dx < 0 ? 1 : -1);
                }
            }}
        >
            <div className="cr-pista" style={{ transform: `translateX(-${actual * 100}%)` }}>
                {datos.anuncios.map((a, n) => {
                    const juego = a.tipo === "juego" ? games.find((g) => g.id === a.juego_id) : null;
                    const nombre = a.titulo || juego?.name || "Anuncio";
                    return (
                        <button
                            key={a.clave}
                            type="button"
                            className="cr-boton"
                            onClick={() => abrir(a)}
                            tabIndex={n === actual ? 0 : -1}
                            aria-hidden={n !== actual}
                            aria-label={a.tipo === "juego" ? `${a.etiqueta ? `${a.etiqueta}: ` : ""}${nombre}. Elegir este juego` : `${nombre}. Abrir`}
                        >
                            <Diapositiva a={a} juego={juego} />
                        </button>
                    );
                })}
            </div>

            {total > 1 && (
                <span className="cr-puntos">
                    {datos.anuncios.map((a, n) => (
                        <button
                            key={a.clave}
                            type="button"
                            className={`cr-punto ${n === actual ? "cr-punto-activo" : ""}`}
                            onClick={() => setI(n)}
                            aria-label={`Anuncio ${n + 1} de ${total}`}
                            aria-current={n === actual}
                        />
                    ))}
                </span>
            )}
        </div>
    );
}
