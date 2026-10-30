import { useNavigate } from "react-router-dom";
import { LuGamepad2, LuPlus, LuRefreshCw } from "react-icons/lu";

import { useJugadoresEnLinea, ESTADOS } from "../../hooks/useJugadoresEnLinea";
import { useInvitar } from "../../hooks/useInvitar";
import FotoPerfil from "./FotoPerfil";
import InsigniaRango from "./InsigniaRango";
import NombreDeslizante from "./NombreDeslizante";
import { LuBadgeCheck } from "react-icons/lu";

/* =========================================================
   JUGADORES EN LÍNEA CON BOTÓN PARA INVITAR
   (lobby y sala). Estado en vivo y botón de actualizar.
   excluir: ids que no se muestran (los que ya están en tu sala)
========================================================= */

export default function ListaJugadores({ excluir, bloqueado = false, titulo = "En línea" }) {
    const navigate = useNavigate();
    const { jugadores, actualizar, actualizando } = useJugadoresEnLinea();
    const { invitar, espera } = useInvitar();

    const lista = excluir ? jugadores.filter((p) => !excluir.has(String(p.id))) : jugadores;

    return (
        <div className="ffl-amigos-caja">
            <header className="ffl-amigos-cabeza">
                <span>
                    <i className="ffl-punto" aria-hidden="true" />
                    {`${titulo} ${lista.length}`}
                </span>
                <button type="button" className="ffl-icono ffl-icono-chico" onClick={actualizar} aria-label="Actualizar lista" title="Actualizar">
                    <LuRefreshCw aria-hidden="true" className={actualizando ? "ffl-girando" : ""} />
                </button>
            </header>

            {lista.length === 0 ? (
                <p className="ffl-vacio">Nadie más conectado.</p>
            ) : (
                <ul className="ffl-amigos-lista">
                    {lista.map((p) => {
                        const estado = ESTADOS[p.status] || ESTADOS.available;
                        const segundos = espera(p.id);
                        const jugando = p.status === "playing";

                        return (
                            <li key={p.id} className={`ffl-amigo ffl-placa ${p.admin ? "ffl-placa-admin" : `ffl-placa-${p.rango?.id || "bronce"}`}`}>
                                <button
                                    type="button"
                                    className="ffl-amigo-perfil"
                                    onClick={() => navigate(`/profile/${p.id}`)}
                                    aria-label={`${p.name}${p.admin || p.verificado ? ", verificado" : ""}, rango ${p.rango?.nombre || "Bronce"}, ${estado.texto}`}
                                >
                                    <span className="ffl-amigo-foto">
                                        <FotoPerfil foto={p.avatar} marco={p.marco} />
                                        <i className={`ffl-estado ffl-estado-${estado.tono}`} aria-hidden="true" />
                                        {(p.admin || p.verificado) && <LuBadgeCheck className="ffl-verificado" aria-hidden="true" />}
                                    </span>
                                    <span className="ffl-amigo-datos">
                                        <NombreDeslizante texto={p.name} className="ffl-amigo-nombre" />
                                        <span className="ffl-amigo-rango">
                                            <InsigniaRango rango={p.rango || { id: "bronce", nombre: "Bronce" }} tamano="0.8rem" />
                                            {p.admin ? "Admin" : p.rango?.nombre || "Bronce"}
                                        </span>
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="ffl-invitar"
                                    onClick={() => invitar(p)}
                                    disabled={bloqueado || jugando || segundos !== 0}
                                    aria-label={jugando ? `${p.name} está jugando` : `Invitar a ${p.name}`}
                                    title={jugando ? "Jugando" : segundos > 0 ? `Invitar otra vez en ${segundos} s` : "Invitar"}
                                >
                                    {jugando ? (
                                        <LuGamepad2 aria-hidden="true" />
                                    ) : segundos > 0 ? (
                                        <span className="ffl-segundos">{segundos}</span>
                                    ) : (
                                        <LuPlus aria-hidden="true" />
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
