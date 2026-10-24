import { useEffect } from "react";
import { LuUsers, LuX } from "react-icons/lu";

/* Ventana para elegir el juego (como elegir modo en Free Fire).
   juegos: [{ id, name, image, minPlayers, maxPlayers }] */

export const textoJugadores = (g) =>
    g.minPlayers === g.maxPlayers
        ? `${g.minPlayers} ${g.minPlayers === 1 ? "jugador" : "jugadores"}`
        : `${g.minPlayers} a ${g.maxPlayers} jugadores`;

export default function ElegirJuego({ juegos, elegidoId, alElegir, alCerrar, cabe }) {
    useEffect(() => {
        const tecla = (e) => e.key === "Escape" && alCerrar();
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [alCerrar]);

    return (
        <div className="ffl-modal-fondo" onClick={alCerrar}>
            <section className="ffl-modal" role="dialog" aria-modal="true" aria-labelledby="ffl-modal-titulo" onClick={(e) => e.stopPropagation()}>
                <header className="ffl-modal-cabeza">
                    <h2 id="ffl-modal-titulo">Elige el juego</h2>
                    <button type="button" className="ffl-icono" onClick={alCerrar} aria-label="Cerrar">
                        <LuX aria-hidden="true" />
                    </button>
                </header>
                <ul className="ffl-modos" style={{ gridTemplateColumns: `repeat(${Math.min(4, juegos.length)}, 10rem)` }}>
                    {juegos.map((g) => {
                        const sirve = cabe ? cabe(g) : true;
                        return (
                            <li key={g.id}>
                                <button
                                    type="button"
                                    className={`ffl-modo ${g.id === elegidoId ? "ffl-modo-elegido" : ""}`}
                                    onClick={() => alElegir(g)}
                                    aria-pressed={g.id === elegidoId}
                                    autoFocus={g.id === elegidoId}
                                >
                                    <img src={g.image} alt="" loading="lazy" draggable="false" />
                                    <span className="ffl-modo-texto">
                                        <strong>{g.name}</strong>
                                        <small className={sirve ? "" : "ffl-modo-no"}>
                                            <LuUsers aria-hidden="true" />
                                            {textoJugadores(g)}
                                        </small>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>
        </div>
    );
}
