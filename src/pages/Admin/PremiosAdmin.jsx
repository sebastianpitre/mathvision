import { useEffect, useState } from "react";
import { LuSave } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";

/* =========================================================
   PREMIOS DE LOS JUEGOS MULTIJUGADOR
   Lo que gana cada jugador en Triqui y SigloGamif según el
   resultado, y cuántas partidas al día dan premio.
   (Los premios del juego de preguntas se ponen en cada nivel.)
========================================================= */

const JUEGOS = [
    { id: "triqui", nombre: "Triqui Matemático" },
    { id: "siglo", nombre: "SigloGamif" },
];

const CASOS = [
    { id: "ganada", texto: "Gana" },
    { id: "empate", texto: "Empata" },
    { id: "perdida", texto: "Pierde" },
];

export default function PremiosAdmin() {
    const { datos, cargando, error } = useCarga("/admin/premios");
    const [premios, setPremios] = useState(null);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (datos) setPremios(datos.premios);
    }, [datos]);

    const cambiar = (juego, ruta, valor) =>
        setPremios((p) => {
            const copia = structuredClone(p);
            if (ruta.length === 2) copia[juego][ruta[0]][ruta[1]] = valor;
            else copia[juego][ruta[0]] = valor;
            return copia;
        });

    async function guardar() {
        setGuardando(true);
        try {
            const r = await api("/admin/premios", { metodo: "PUT", body: { premios } });
            setPremios(r.premios);
            setAviso({ texto: "Premios guardados. Se aplican desde la próxima partida.", tono: "ok" });
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        } finally {
            setGuardando(false);
        }
    }

    if (cargando && !premios) return <div className="lb-card lg-empty" role="status">Cargando premios…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;
    if (!premios) return null;

    const numero = (juego, ruta, valor, max = 1000) => (
        <input
            className="lg-input"
            style={{ width: 90 }}
            type="number"
            min={0}
            max={max}
            value={valor}
            onChange={(e) => cambiar(juego, ruta, e.target.value)}
        />
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div>
                <h2 className="lg-card-title">Premios de los juegos multijugador</h2>
                <p className="lb-muted">
                    XP y oro que gana cada jugador al terminar una partida de la sala. Los del juego de preguntas
                    se ponen en cada nivel (pestaña Niveles).
                </p>
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            {JUEGOS.map((juego) => (
                <section key={juego.id} className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <h3 className="lg-card-title">{juego.nombre}</h3>
                    <div className="lg-table-wrap">
                        <table className="lg-table">
                            <thead>
                                <tr>
                                    <th scope="col">Resultado</th>
                                    <th scope="col">XP</th>
                                    <th scope="col">Oro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {CASOS.map((caso) => (
                                    <tr key={caso.id}>
                                        <td>{caso.texto}</td>
                                        <td>{numero(juego.id, [caso.id, "xp"], premios[juego.id][caso.id].xp)}</td>
                                        <td>{numero(juego.id, [caso.id, "oro"], premios[juego.id][caso.id].oro)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="lg-row" style={{ alignItems: "flex-end" }}>
                        <label className="lg-field">
                            <span>Partidas premiadas al día (0 = sin límite)</span>
                            {numero(juego.id, ["max_diarias"], premios[juego.id].max_diarias, 200)}
                        </label>
                        {juego.id === "siglo" && (
                            <label className="lg-field">
                                <span>Diamantes extra por ¡SIGLO! (100 exacto)</span>
                                {numero(juego.id, ["bono_siglo_diamantes"], premios[juego.id].bono_siglo_diamantes, 20)}
                            </label>
                        )}
                    </div>
                </section>
            ))}

            <div>
                <button type="button" className="lb-btn lb-btn-primary" onClick={guardar} disabled={guardando}>
                    <LuSave aria-hidden="true" />
                    {guardando ? "Guardando…" : "Guardar premios"}
                </button>
            </div>
        </div>
    );
}
