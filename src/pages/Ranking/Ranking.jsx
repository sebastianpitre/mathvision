import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuCrown, LuGamepad2, LuGift, LuPercent, LuTrophy, LuUserRound } from "react-icons/lu";

import PantallaFF, { Pestanas } from "../../components/juego/PantallaFF";
import Personaje3D from "../../components/juego/Personaje3D";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import assets from "../../data/mock/assets.json";

import "./ranking.css";
import FotoPerfil from "../../components/juego/FotoPerfil";
import InsigniaRango from "../../components/juego/InsigniaRango";
import Verificado from "../../components/juego/Verificado";
import Premio from "../../components/juego/Premio";

/* =========================================================
   RANKING DE LOS MEJORES
   Izquierda: por qué se ordena · centro: la tabla · derecha:
   el personaje 3D del jugador que toques, para ver su skin.
========================================================= */

const formato = (n) => (Number(n) || 0).toLocaleString("es-CO");

const CRITERIOS = [
    { id: "temporada", texto: "Temporada" },
    { id: "nivel", texto: "Nivel" },
    { id: "victorias", texto: "Victorias" },
    { id: "aciertos", texto: "Aciertos" },
    { id: "recompensas", texto: "Recompensas" },
];

const deTemporada = (por) => por === "temporada" || por === "recompensas";

/* Lo que se gana al cerrar la temporada según el rango (de Maestro a Bronce). */
function Recompensas({ rangos, numero, miRango, marcoDe }) {
    return (
        <div className="rk-premios-caja">
            <p className="rk-premios-nota">Al terminar la temporada recibes el premio del rango en el que quedes.</p>
            <ol className="rk-premios">
                {[...rangos].reverse().map((r) => {
                    const mio = r.id === miRango;
                    return (
                        <li key={r.id} className={`rk-premio rk-premio-${r.id} ${mio ? "rk-premio-yo" : ""}`}>
                            <InsigniaRango rango={r} temporada={numero} tamano="2.3rem" />
                            <span className="rk-premio-rango">
                                <strong>
                                    {r.nombre}
                                    {mio && <span className="rk-premio-tu">Tu rango</span>}
                                </strong>
                                <small>{r.desde ? `Desde ${formato(r.desde)} pts` : "Desde 0 pts"}</small>
                            </span>
                            <Premio r={r.premio} marcoDe={marcoDe} className="rk-premio-cosas" />
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

// Lo que se muestra en la columna de la derecha de cada fila.
function valor(j, por) {
    if (por === "temporada")
        return (
            <span className="rk-rango">
                <InsigniaRango rango={j.rango} tamano="1.4rem" />
                {`${formato(j.puntos)} pts`}
            </span>
        );
    if (por === "victorias") return `${formato(j.victorias)} 🏆`;
    if (por === "aciertos") return formato(j.aciertos);
    return `Nv. ${j.nivel}`;
}

function Fila({ j, por, elegido, alElegir, soyYo }) {
    return (
        <li>
            <button
                type="button"
                className={`rk-fila ${elegido ? "rk-fila-elegida" : ""} ${soyYo ? "rk-fila-yo" : ""} rk-puesto-${j.posicion <= 3 ? j.posicion : "x"}`}
                onClick={() => alElegir(j)}
                aria-pressed={elegido}
            >
                <span className="rk-posicion">{j.posicion <= 3 ? <LuCrown aria-label={`Puesto ${j.posicion}`} /> : j.posicion}</span>
                <span className="rk-foto">
                    <FotoPerfil foto={j.avatar} marco={j.marco} />
                </span>
                <span className="rk-nombre">
                    <strong>
                        {j.nombre}
                        <Verificado activo={j.verificado} />
                        {soyYo && <span className="rk-tu"> (tú)</span>}
                    </strong>
                    <small>{por === "temporada" ? `${j.rango?.nombre || "Bronce"} · ${formato(j.ganadas)} ganadas` : `Nv. ${j.nivel} · ${j.personaje || "Personaje"}`}</small>
                </span>
                <span className="rk-valor">{valor(j, por)}</span>
            </button>
        </li>
    );
}

/* "Termina en 12 d 5 h" */
function faltaPara(fin) {
    const ms = new Date(fin) - Date.now();
    if (ms <= 0) return "terminando…";
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return d > 0 ? `${d} d ${h} h` : `${h} h ${m} min`;
}

export default function Ranking() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [por, setPor] = useState("temporada");
    const [datos, setDatos] = useState({ jugadores: [], yo: null, temporada: null, rangos: [] });
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [elegido, setElegido] = useState(null);

    useEffect(() => {
        let cancelado = false;
        setCargando(true);
        setError("");
        api(deTemporada(por) ? "/ranking/temporada" : `/ranking?por=${por}`)
            .then((r) => {
                if (cancelado) return;
                setDatos({ jugadores: r.jugadores || [], yo: r.yo, temporada: r.temporada || null, rangos: r.rangos || [] });
                // Se muestra primero el número 1 (en Recompensas, tu personaje).
                const tuyo = r.jugadores?.find((j) => j.id === r.yo?.id) || r.yo;
                setElegido(por === "recompensas" ? tuyo : r.jugadores?.[0] || r.yo || null);
            })
            .catch((e) => !cancelado && setError(e.message))
            .finally(() => !cancelado && setCargando(false));
        return () => {
            cancelado = true;
        };
    }, [por]);

    const miId = user?.id;
    const yoFuera = datos.yo && datos.yo.posicion && !datos.jugadores.some((j) => j.id === datos.yo.id);
    const aciertos = elegido?.respondidas ? Math.round((100 * elegido.aciertos) / elegido.respondidas) : 0;

    return (
        <PantallaFF titulo="Ranking" className="rk">
            <Pestanas items={CRITERIOS} activa={por} alCambiar={setPor} etiqueta="Ordenar por" />

            <section className="rk-tabla ffp-panel" aria-label="Los mejores">
                {deTemporada(por) && datos.temporada && !cargando && (
                    <header className="rk-temporada">
                        <span>
                            <strong>{`${datos.temporada.nombre} · S${datos.temporada.numero}`}</strong>
                            <small>{`Termina en ${faltaPara(datos.temporada.fin)}`}</small>
                        </span>
                        {por === "temporada" && (
                            <button type="button" className="ffp-btn ffp-btn-2 rk-ver-premios" onClick={() => setPor("recompensas")}>
                                <LuGift aria-hidden="true" />
                                Recompensas
                            </button>
                        )}
                        {datos.yo && (
                            <span className="rk-temporada-yo" title="Tu rango">
                                <InsigniaRango rango={datos.yo.rango} tamano="1.6rem" conNombre />
                                <small>
                                    {datos.yo.rango?.siguiente
                                        ? `${formato(datos.yo.puntos)} / ${formato(datos.yo.rango.siguiente.desde)} para ${datos.yo.rango.siguiente.nombre}`
                                        : `${formato(datos.yo.puntos)} pts`}
                                </small>
                            </span>
                        )}
                    </header>
                )}
                {cargando ? (
                    <p className="rk-vacio">Cargando…</p>
                ) : error ? (
                    <p className="rk-vacio ffp-aviso-error">{error}</p>
                ) : por === "recompensas" ? (
                    <Recompensas rangos={datos.rangos} numero={datos.temporada?.numero} miRango={datos.yo?.rango?.id} marcoDe={user?.avatar} />
                ) : datos.jugadores.length === 0 ? (
                    <p className="rk-vacio">{por === "temporada" ? "Nadie ha jugado en esta temporada. ¡Sé el primero!" : "Aún no hay jugadores."}</p>
                ) : (
                    <ol className="rk-lista">
                        {datos.jugadores.map((j) => (
                            <Fila key={j.id} j={j} por={por} elegido={elegido?.id === j.id} alElegir={setElegido} soyYo={j.id === miId} />
                        ))}
                    </ol>
                )}

                {/* Tu puesto, si no estás entre los mejores */}
                {yoFuera && por !== "recompensas" && (
                    <ol className="rk-lista rk-mia">
                        <Fila j={datos.yo} por={por} elegido={elegido?.id === datos.yo.id} alElegir={setElegido} soyYo />
                    </ol>
                )}
            </section>

            <section className="ffp-escenario rk-escenario" aria-label="Personaje del jugador elegido">
                <span className="ffp-plataforma" aria-hidden="true" />
                {elegido && <Personaje3D modelo={elegido.modelo || assets.characters.defaultModel} />}

                {elegido && (
                    <div className="rk-detalle">
                        <div className="rk-detalle-texto">
                            <small>{`${elegido.posicion ? `#${elegido.posicion} · ` : ""}${elegido.personaje || "Personaje"}`}</small>
                            {deTemporada(por) && elegido.rango && <InsigniaRango rango={elegido.rango} tamano="1.3rem" conNombre />}
                            <strong>{elegido.nombre || user?.displayName || user?.username}<Verificado activo={elegido.verificado} /></strong>
                            <span className="rk-datos">
                                <span title="Nivel">{`Nv. ${elegido.nivel}`}</span>
                                <span title="Victorias"><LuTrophy aria-hidden="true" />{formato(elegido.victorias ?? elegido.ganadas)}</span>
                                <span title="Partidas"><LuGamepad2 aria-hidden="true" />{formato(elegido.partidas)}</span>
                                {!deTemporada(por) && <span title="Aciertos"><LuPercent aria-hidden="true" />{aciertos}</span>}
                            </span>
                        </div>
                        <button type="button" className="ffp-btn ffp-btn-2" onClick={() => navigate(`/profile/${elegido.id}`)}>
                            <LuUserRound aria-hidden="true" />
                            Perfil
                        </button>
                    </div>
                )}
            </section>
        </PantallaFF>
    );
}
