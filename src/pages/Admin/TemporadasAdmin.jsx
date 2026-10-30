import { useEffect, useState } from "react";
import { LuFlag, LuSave, LuTable, LuX } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";
import { aEntrada, deEntrada, fechaLarga } from "./fechas";
import InsigniaRango from "../../components/juego/InsigniaRango";

/* =========================================================
   TEMPORADAS: cuándo termina la actual, puntos por partida,
   puntos de cada rango y premio al cerrar.
========================================================= */

export default function TemporadasAdmin() {
    const { datos, cargando, error, recargar } = useCarga("/admin/temporadas");
    const [actual, setActual] = useState(null);
    const [config, setConfig] = useState(null);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [tabla, setTabla] = useState(null); // { id, nombre, jugadores }

    useEffect(() => {
        if (!datos) return;
        setActual({ nombre: datos.actual.nombre, fin: aEntrada(datos.actual.fin) });
        setConfig(datos.config);
    }, [datos]);

    const ok = (texto) => setAviso({ texto, tono: "ok" });
    const mal = (e) => setAviso({ texto: e.message, tono: "error" });

    async function guardarActual(e) {
        e.preventDefault();
        try {
            await api("/admin/temporadas/actual", { metodo: "PUT", body: { nombre: actual.nombre, fin: deEntrada(actual.fin) } });
            ok("Temporada actualizada.");
            recargar();
        } catch (err) {
            mal(err);
        }
    }

    async function cerrar() {
        if (!window.confirm(`¿Cerrar "${datos.actual.nombre}" ahora? Se entregan los premios de cada rango y todos vuelven a Bronce en una temporada nueva.`)) return;
        try {
            const r = await api("/admin/temporadas/cerrar", { metodo: "POST" });
            ok(`Temporada cerrada: ${r.resumen?.jugadores ?? 0} jugadores, ${r.resumen?.premiados ?? 0} premios entregados. Empezó "${r.actual.nombre}".`);
            recargar();
        } catch (err) {
            mal(err);
        }
    }

    async function guardarConfig() {
        try {
            const r = await api("/admin/temporadas/config", { metodo: "PUT", body: { config } });
            setConfig(r.config);
            ok("Reglas guardadas.");
        } catch (err) {
            mal(err);
        }
    }

    async function verTabla(t) {
        try {
            const r = await api(`/admin/temporadas/${t.id}/tabla`);
            setTabla({ id: t.id, nombre: t.nombre, jugadores: r.jugadores });
        } catch (err) {
            mal(err);
        }
    }

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando temporadas…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;
    if (!actual || !config) return null;

    const num = (valor, cambiar, props = {}) => (
        <input className="lg-input" style={{ width: 96 }} type="number" value={valor} onChange={(e) => cambiar(e.target.value)} {...props} />
    );
    const setRango = (campo, id, sub, v) =>
        setConfig((c) => ({
            ...c,
            [campo]: sub ? { ...c[campo], [id]: { ...c[campo][id], [sub]: v } } : { ...c[campo], [id]: v },
        }));

    const fotos = datos.cosmeticos.filter((c) => c.tipo === "foto");
    const marcos = datos.cosmeticos.filter((c) => c.tipo === "marco");
    const lista = (r, campo, nombre, opciones) => (
        <select
            className="lg-select"
            aria-label={`${nombre} para ${r.nombre}`}
            value={config.premios[r.id][campo] ?? ""}
            onChange={(e) => setRango("premios", r.id, campo, e.target.value || null)}
        >
            <option value="">—</option>
            {opciones.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
        </select>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div>
                <h2 className="lg-card-title">Temporadas y rangos</h2>
                <p className="lb-muted">
                    Cada partida suma o resta puntos de temporada y los puntos dan el rango (Bronce → Maestro). Al llegar la
                    fecha de fin, la temporada se cierra sola: se entrega el premio de cada rango y todos empiezan de nuevo en
                    Bronce. Solo cuentan las partidas que dan premio (no las que pasan el límite diario).
                </p>
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            <form className="lb-card" onSubmit={guardarActual} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 className="lg-card-title">{`Temporada actual · S${datos.actual.numero}`}</h3>
                <p className="lb-muted" style={{ margin: 0 }}>{`Empezó el ${fechaLarga(datos.actual.inicio)}.`}</p>
                <div className="lg-row" style={{ alignItems: "flex-end" }}>
                    <label className="lg-field" style={{ flex: "1 1 200px" }}>
                        <span>Nombre</span>
                        <input className="lg-input" maxLength={80} value={actual.nombre} onChange={(e) => setActual({ ...actual, nombre: e.target.value })} />
                    </label>
                    <label className="lg-field">
                        <span>Termina</span>
                        <input className="lg-input" type="datetime-local" value={actual.fin} onChange={(e) => setActual({ ...actual, fin: e.target.value })} />
                    </label>
                    <button type="submit" className="lb-btn lb-btn-primary">
                        <LuSave aria-hidden="true" />
                        Guardar
                    </button>
                    <button type="button" className="lb-btn lb-btn-ghost" onClick={cerrar}>
                        <LuFlag aria-hidden="true" />
                        Cerrar ahora
                    </button>
                </div>
            </form>

            <section className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 className="lg-card-title">Reglas</h3>
                <div className="lg-row" style={{ alignItems: "flex-end" }}>
                    <label className="lg-field">
                        <span>Días de las próximas temporadas</span>
                        {num(config.duracion_dias, (v) => setConfig({ ...config, duracion_dias: v }), { min: 1, max: 365 })}
                    </label>
                    <label className="lg-field">
                        <span>Puntos al ganar</span>
                        {num(config.puntos.ganada, (v) => setConfig({ ...config, puntos: { ...config.puntos, ganada: v } }), { min: 0 })}
                    </label>
                    <label className="lg-field">
                        <span>Al empatar</span>
                        {num(config.puntos.empate, (v) => setConfig({ ...config, puntos: { ...config.puntos, empate: v } }), { min: 0 })}
                    </label>
                    <label className="lg-field">
                        <span>Al perder (negativo)</span>
                        {num(config.puntos.perdida, (v) => setConfig({ ...config, puntos: { ...config.puntos, perdida: v } }), { max: 0 })}
                    </label>
                </div>
                <p className="lb-muted" style={{ margin: 0 }}>
                    Premio de cada rango al cerrar la temporada: puede ser cualquier mezcla. Si alguien ya tiene el personaje,
                    la foto o el marco, no se le repite.
                </p>
                <div className="lg-table-wrap">
                    <table className="lg-table">
                        <thead>
                            <tr>
                                <th scope="col">Rango</th>
                                <th scope="col">Desde (puntos)</th>
                                <th scope="col">Oro</th>
                                <th scope="col">Diamantes</th>
                                <th scope="col">Tiquetes 🎫</th>
                                <th scope="col">Personaje</th>
                                <th scope="col">Foto de perfil</th>
                                <th scope="col">Marco</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.rangos.map((r) => (
                                <tr key={r.id}>
                                    <td><InsigniaRango rango={r} tamano="1.6rem" temporada={datos.actual.numero} conNombre /></td>
                                    <td>{r.id === "bronce" ? "0" : num(config.umbrales[r.id], (v) => setRango("umbrales", r.id, null, v), { min: 1 })}</td>
                                    <td>{num(config.premios[r.id].oro, (v) => setRango("premios", r.id, "oro", v), { min: 0, "aria-label": `Oro para ${r.nombre}` })}</td>
                                    <td>{num(config.premios[r.id].diamantes, (v) => setRango("premios", r.id, "diamantes", v), { min: 0, "aria-label": `Diamantes para ${r.nombre}` })}</td>
                                    <td>{num(config.premios[r.id].tickets ?? 0, (v) => setRango("premios", r.id, "tickets", v), { min: 0, "aria-label": `Tiquetes para ${r.nombre}` })}</td>
                                    <td>{lista(r, "personaje_id", "Personaje", datos.personajes.map((p) => ({ id: p.id, nombre: p.name })))}</td>
                                    <td>{lista(r, "foto_id", "Foto", fotos)}</td>
                                    <td>{lista(r, "marco_id", "Marco", marcos)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div>
                    <button type="button" className="lb-btn lb-btn-primary" onClick={guardarConfig}>
                        <LuSave aria-hidden="true" />
                        Guardar reglas
                    </button>
                </div>
            </section>

            <section className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 className="lg-card-title">Historial</h3>
                <div className="lg-table-wrap">
                    <table className="lg-table">
                        <thead>
                            <tr>
                                <th scope="col">Temporada</th>
                                <th scope="col">Inicio</th>
                                <th scope="col">Fin</th>
                                <th scope="col" className="lg-num">Jugadores</th>
                                <th scope="col">Estado</th>
                                <th scope="col"><span className="lb-sr-only">Tabla</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.historial.map((t) => (
                                <tr key={t.id}>
                                    <td><strong>{t.nombre}</strong></td>
                                    <td>{fechaLarga(t.inicio)}</td>
                                    <td>{fechaLarga(t.fin)}</td>
                                    <td className="lg-num">{t.jugadores}</td>
                                    <td>{t.cerrada ? <span className="lg-tag">Cerrada</span> : <span className="lg-tag lg-tag-on">En curso</span>}</td>
                                    <td>
                                        <button type="button" className="lb-icon-btn" onClick={() => verTabla(t)} aria-label={`Ver tabla de ${t.nombre}`} title="Ver tabla">
                                            <LuTable aria-hidden="true" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {tabla && (
                <section className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className="lg-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <h3 className="lg-card-title">{`Tabla de ${tabla.nombre}`}</h3>
                        <button type="button" className="lb-icon-btn" onClick={() => setTabla(null)} aria-label="Cerrar tabla">
                            <LuX aria-hidden="true" />
                        </button>
                    </div>
                    {tabla.jugadores.length === 0 ? (
                        <p className="lb-muted">Nadie jugó en esta temporada.</p>
                    ) : (
                        <div className="lg-table-wrap">
                            <table className="lg-table">
                                <thead>
                                    <tr>
                                        <th scope="col" className="lg-num">#</th>
                                        <th scope="col">Jugador</th>
                                        <th scope="col">Rango</th>
                                        <th scope="col" className="lg-num">Puntos</th>
                                        <th scope="col" className="lg-num">Partidas</th>
                                        <th scope="col" className="lg-num">Ganadas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tabla.jugadores.map((j) => (
                                        <tr key={j.id}>
                                            <td className="lg-num">{j.posicion}</td>
                                            <td>{j.nombre}</td>
                                            <td><InsigniaRango rango={j.rango} tamano="1.2rem" conNombre /></td>
                                            <td className="lg-num">{j.puntos}</td>
                                            <td className="lg-num">{j.partidas}</td>
                                            <td className="lg-num">{j.ganadas}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
