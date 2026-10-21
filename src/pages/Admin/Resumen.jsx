import { LuRefreshCw } from "react-icons/lu";

import Recompensas from "../../components/common/Recompensas";
import { useCarga, formato, fecha, NOMBRE_JUEGO, NOMBRE_RESULTADO } from "./useCarga";

/* =========================================================
   RESUMEN: cuánto se juega, qué se juega y quién juega
========================================================= */

export default function Resumen() {
    const { datos, cargando, error, recargar } = useCarga("/admin/resumen");

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando estadísticas…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;

    const t = datos.totales;
    const maxDia = Math.max(1, ...datos.por_dia.map((d) => d.partidas));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div className="lg-row">
                <h2 className="lg-card-title">En números</h2>
                <span className="lg-spacer" />
                <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={recargar} disabled={cargando}>
                    <LuRefreshCw aria-hidden="true" />
                    Actualizar
                </button>
            </div>

            <dl className="lg-stats">
                <div className="lg-stat"><dt>Partidas jugadas</dt><dd>{formato(t.partidas)}</dd></div>
                <div className="lg-stat"><dt>Partidas hoy</dt><dd>{formato(t.partidas_hoy)}</dd></div>
                <div className="lg-stat"><dt>Últimos 7 días</dt><dd>{formato(t.partidas_semana)}</dd></div>
                <div className="lg-stat"><dt>Jugadores activos (7 días)</dt><dd>{formato(t.jugadores_semana)}</dd></div>
                <div className="lg-stat"><dt>Jugadores registrados</dt><dd>{formato(t.usuarios)}</dd></div>
                <div className="lg-stat"><dt>Niveles publicados</dt><dd>{formato(t.niveles_activos)}</dd></div>
            </dl>

            <section className="lb-card">
                <h2 className="lg-card-title">Partidas por día (últimas 2 semanas)</h2>
                <div className="lg-bars" role="img" aria-label="Gráfico de partidas por día">
                    {datos.por_dia.map((d) => (
                        <div className="lg-bar" key={d.dia} title={`${d.dia}: ${d.partidas} partidas`}>
                            <span className="lg-bar-value">{d.partidas || ""}</span>
                            <span className="lg-bar-fill" style={{ height: `${(d.partidas / maxDia) * 100}%` }} />
                            <span className="lg-bar-label">{d.dia.slice(8, 10)}/{d.dia.slice(5, 7)}</span>
                        </div>
                    ))}
                </div>
            </section>

            <div className="lg-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))" }}>
                <section className="lb-card">
                    <h2 className="lg-card-title" style={{ marginBottom: 10 }}>Por juego</h2>
                    <Tabla
                        vacio="Aún no hay partidas."
                        columnas={["Juego", "Partidas", "Jugadores"]}
                        filas={datos.por_juego.map((j) => [
                            NOMBRE_JUEGO[j.juego] || j.juego,
                            formato(j.partidas),
                            formato(j.jugadores),
                        ])}
                        numericas={[1, 2]}
                    />
                </section>

                <section className="lb-card">
                    <h2 className="lg-card-title" style={{ marginBottom: 10 }}>Por grado y asignatura</h2>
                    <Tabla
                        vacio="Aún no hay partidas del juego de preguntas."
                        columnas={["Grado", "Asignatura", "Partidas", "Aciertos"]}
                        filas={datos.por_asignatura.map((a) => [
                            a.grado,
                            a.asignatura,
                            formato(a.partidas),
                            `${a.promedio_aciertos ?? 0}%`,
                        ])}
                        numericas={[2, 3]}
                    />
                </section>
            </div>

            <section className="lb-card">
                <h2 className="lg-card-title" style={{ marginBottom: 10 }}>Mejores jugadores</h2>
                <Tabla
                    vacio="Todavía no hay jugadores."
                    columnas={["#", "Jugador", "Nivel", "XP", "Oro", "Diamantes", "Partidas"]}
                    filas={datos.mejores_jugadores.map((j, i) => [
                        i + 1,
                        j.display_name || j.username,
                        j.level,
                        formato(j.xp),
                        formato(j.coins),
                        formato(j.gems),
                        formato(j.games_played),
                    ])}
                    numericas={[2, 3, 4, 5, 6]}
                />
            </section>

            <section className="lb-card">
                <h2 className="lg-card-title" style={{ marginBottom: 10 }}>Últimas partidas</h2>
                <Tabla
                    vacio="Aún no hay partidas."
                    columnas={["Cuándo", "Jugador", "Juego / nivel", "Resultado", "Aciertos", "Premio"]}
                    filas={datos.partidas_recientes.map((p) => [
                        fecha(p.terminada_en),
                        p.username,
                        p.nivel || NOMBRE_JUEGO[p.juego] || p.juego,
                        NOMBRE_RESULTADO[p.resultado] || p.resultado,
                        p.total_preguntas ? `${p.aciertos}/${p.total_preguntas}` : "—",
                        <Recompensas key="r" xp={p.xp_ganada} oro={p.oro_ganado} diamantes={p.diamantes_ganados} />,
                    ])}
                />
            </section>
        </div>
    );
}

export function Tabla({ columnas, filas, numericas = [], vacio = "Sin datos." }) {
    if (filas.length === 0) return <p className="lb-muted">{vacio}</p>;

    return (
        <div className="lg-table-wrap">
            <table className="lg-table">
                <thead>
                    <tr>
                        {columnas.map((c, i) => (
                            <th key={c} scope="col" className={numericas.includes(i) ? "lg-num" : ""}>{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {filas.map((fila, f) => (
                        <tr key={f}>
                            {fila.map((celda, i) => (
                                <td key={i} className={numericas.includes(i) ? "lg-num" : ""}>{celda}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
