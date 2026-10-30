import { useRef, useState } from "react";
import { LuCalendarClock, LuCopy, LuImage, LuPencil, LuPlus, LuSave, LuTrash2, LuX } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";
import { subirArchivo } from "./subirArchivo";
import { aEntrada, deEntrada, fechaLarga } from "./fechas";

/* =========================================================
   EVENTOS: fechas, imagen del anuncio y misiones. Cada misión
   tiene su meta y su recompensa (oro, diamantes, personaje,
   foto de perfil o marco). El jugador ve su barra de
   progreso y reclama cuando la cumple.
========================================================= */

const MISION_VACIA = { tipo: "jugar", juego: "", meta: 5, texto: "", desde: "", hasta: "", recompensa: { oro: 100, diamantes: 0, tickets: 0, personaje_id: "", foto_id: "", marco_id: "" } };

function eventoVacio() {
    const inicio = new Date();
    inicio.setMinutes(0, 0, 0);
    const fin = new Date(inicio.getTime() + 7 * 86400000);
    return { titulo: "", descripcion: "", imagen: "", inicio: aEntrada(inicio), fin: aEntrada(fin), activo: true, misiones: [{ ...MISION_VACIA }] };
}

function estadoDe(e) {
    const ahora = Date.now();
    if (!e.activo) return { texto: "Oculto", clase: "" };
    if (new Date(e.inicio) > ahora) return { texto: "Próximo", clase: "lg-tag-on" };
    if (new Date(e.fin) <= ahora) return { texto: "Terminado", clase: "" };
    return { texto: "Activo", clase: "lg-tag-on" };
}

/* Un evento guardado → formulario (fechas para datetime-local). */
function aFormulario(e, copia = false) {
    return {
        id: copia ? undefined : e.id,
        titulo: copia ? `${e.titulo} (copia)` : e.titulo,
        descripcion: e.descripcion || "",
        imagen: e.imagen || "",
        inicio: aEntrada(e.inicio),
        fin: aEntrada(e.fin),
        activo: e.activo,
        misiones: e.misiones.map((m) => ({
            id: copia ? undefined : m.id,
            tipo: m.tipo,
            juego: m.juego || "",
            meta: m.meta,
            texto: m.texto || "",
            desde: aEntrada(m.desde),
            hasta: aEntrada(m.hasta),
            recompensa: {
                oro: m.recompensa?.oro || 0,
                diamantes: m.recompensa?.diamantes || 0,
                tickets: m.recompensa?.tickets || 0,
                personaje_id: m.recompensa?.personaje_id || "",
                foto_id: m.recompensa?.foto_id || "",
                marco_id: m.recompensa?.marco_id || "",
            },
        })),
    };
}

function Formulario({ inicial, catalogo, alGuardar, alCancelar, alError }) {
    const [ev, setEv] = useState(inicial);
    const [avance, setAvance] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [fechasPropias, setFechasPropias] = useState(() => new Set(inicial.misiones.map((m, i) => (m.desde || m.hasta ? i : null)).filter((x) => x !== null)));
    const entrada = useRef(null);

    const cambiarMision = (i, cambio) => setEv((e) => ({ ...e, misiones: e.misiones.map((m, j) => (j === i ? { ...m, ...cambio } : m)) }));
    const cambiarPremio = (i, cambio) => setEv((e) => ({ ...e, misiones: e.misiones.map((m, j) => (j === i ? { ...m, recompensa: { ...m.recompensa, ...cambio } } : m)) }));

    async function subir(e) {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;
        setAvance(0);
        try {
            const ruta = await subirArchivo(archivo, "foto", setAvance);
            setEv((x) => ({ ...x, imagen: ruta }));
        } catch (err) {
            alError(err);
        } finally {
            setAvance(null);
        }
    }

    async function guardar(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            const cuerpo = {
                ...ev,
                inicio: deEntrada(ev.inicio),
                fin: deEntrada(ev.fin),
                misiones: ev.misiones.map((m, i) => ({
                    ...m,
                    juego: m.juego || null,
                    meta: Number(m.meta),
                    desde: fechasPropias.has(i) ? deEntrada(m.desde) : null,
                    hasta: fechasPropias.has(i) ? deEntrada(m.hasta) : null,
                    recompensa: {
                        oro: Number(m.recompensa.oro) || 0,
                        diamantes: Number(m.recompensa.diamantes) || 0,
                        tickets: Number(m.recompensa.tickets) || 0,
                        personaje_id: m.recompensa.personaje_id || null,
                        foto_id: m.recompensa.foto_id ? Number(m.recompensa.foto_id) : null,
                        marco_id: m.recompensa.marco_id ? Number(m.recompensa.marco_id) : null,
                    },
                })),
            };
            await api(ev.id ? `/admin/eventos/${ev.id}` : "/admin/eventos", { metodo: ev.id ? "PUT" : "POST", body: cuerpo });
            alGuardar(ev.titulo);
        } catch (err) {
            alError(err);
        } finally {
            setGuardando(false);
        }
    }

    const fotos = catalogo.cosmeticos.filter((c) => c.tipo === "foto");
    const marcos = catalogo.cosmeticos.filter((c) => c.tipo === "marco");

    return (
        <form className="lb-card" onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 className="lg-card-title">{ev.id ? "Editar evento" : "Nuevo evento"}</h3>

            <div className="lg-row" style={{ alignItems: "flex-end" }}>
                <label className="lg-field" style={{ flex: "2 1 240px" }}>
                    <span>Título</span>
                    <input className="lg-input" required maxLength={100} value={ev.titulo} onChange={(e) => setEv({ ...ev, titulo: e.target.value })} placeholder="Ej: Fuga macabra" />
                </label>
                <label className="lg-field">
                    <span>Empieza</span>
                    <input className="lg-input" type="datetime-local" required value={ev.inicio} onChange={(e) => setEv({ ...ev, inicio: e.target.value })} />
                </label>
                <label className="lg-field">
                    <span>Termina</span>
                    <input className="lg-input" type="datetime-local" required value={ev.fin} onChange={(e) => setEv({ ...ev, fin: e.target.value })} />
                </label>
                <label className="lg-row" style={{ alignItems: "center", gap: 6, cursor: "pointer", paddingBottom: 10 }}>
                    <input type="checkbox" checked={ev.activo} onChange={(e) => setEv({ ...ev, activo: e.target.checked })} />
                    <span>Visible</span>
                </label>
            </div>

            <label className="lg-field">
                <span>Descripción (opcional)</span>
                <input className="lg-input" maxLength={500} value={ev.descripcion} onChange={(e) => setEv({ ...ev, descripcion: e.target.value })} placeholder="Ej: ¡Demuestra que eres letal y reclama recompensas macabras!" />
            </label>

            <div className="lg-row" style={{ alignItems: "center" }}>
                <input ref={entrada} type="file" hidden accept=".png,.jpg,.jpeg,.webp" onChange={subir} />
                <button type="button" className="lb-btn lb-btn-ghost" onClick={() => entrada.current?.click()} disabled={avance !== null}>
                    <LuImage aria-hidden="true" />
                    {avance !== null ? `Subiendo ${avance}%` : ev.imagen ? "Cambiar imagen del anuncio" : "Subir imagen del anuncio"}
                </button>
                <span className="lb-muted">Horizontal (por ejemplo 1600×900), hasta 3 MB.</span>
            </div>
            {ev.imagen && <img src={ev.imagen} alt="Anuncio" style={{ width: "100%", maxWidth: 520, aspectRatio: "16/9", objectFit: "cover", borderRadius: 12 }} />}

            <h4 className="lg-card-title" style={{ fontSize: 16 }}>Misiones</h4>
            {ev.misiones.map((m, i) => (
                <fieldset key={m.id ?? `n${i}`} className="lg-mision">
                    <legend>{`Misión ${i + 1}`}</legend>
                    <div className="lg-row" style={{ alignItems: "flex-end" }}>
                        <label className="lg-field">
                            <span>Qué hay que hacer</span>
                            <select className="lg-select" value={m.tipo} onChange={(e) => cambiarMision(i, { tipo: e.target.value })}>
                                {Object.entries(catalogo.tipos).map(([id, t]) => (
                                    <option key={id} value={id}>{t.texto.replace("{n}", "N")}</option>
                                ))}
                            </select>
                        </label>
                        <label className="lg-field">
                            <span>Cantidad (N)</span>
                            <input className="lg-input" style={{ width: 100 }} type="number" min={1} max={100000} value={m.meta} onChange={(e) => cambiarMision(i, { meta: e.target.value })} />
                        </label>
                        <label className="lg-field">
                            <span>En qué juego</span>
                            <select className="lg-select" value={m.juego} onChange={(e) => cambiarMision(i, { juego: e.target.value })}>
                                <option value="">Cualquiera</option>
                                {Object.entries(catalogo.juegos).map(([id, nombre]) => (
                                    <option key={id} value={id}>{nombre}</option>
                                ))}
                            </select>
                        </label>
                        <label className="lg-field" style={{ flex: "1 1 200px" }}>
                            <span>Texto propio (opcional)</span>
                            <input className="lg-input" maxLength={160} value={m.texto} onChange={(e) => cambiarMision(i, { texto: e.target.value })} placeholder="Si lo dejas vacío se arma solo" />
                        </label>
                    </div>

                    <label className="lg-row" style={{ alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input
                            type="checkbox"
                            checked={fechasPropias.has(i)}
                            onChange={(e) =>
                                setFechasPropias((s) => {
                                    const n = new Set(s);
                                    if (e.target.checked) n.add(i);
                                    else n.delete(i);
                                    return n;
                                })
                            }
                        />
                        <LuCalendarClock aria-hidden="true" />
                        <span>Contar solo entre estas fechas (por ejemplo, un día y hora exactos)</span>
                    </label>
                    {fechasPropias.has(i) && (
                        <div className="lg-row">
                            <label className="lg-field">
                                <span>Desde</span>
                                <input className="lg-input" type="datetime-local" value={m.desde} onChange={(e) => cambiarMision(i, { desde: e.target.value })} />
                            </label>
                            <label className="lg-field">
                                <span>Hasta</span>
                                <input className="lg-input" type="datetime-local" value={m.hasta} onChange={(e) => cambiarMision(i, { hasta: e.target.value })} />
                            </label>
                        </div>
                    )}

                    <div className="lg-row" style={{ alignItems: "flex-end" }}>
                        <label className="lg-field">
                            <span>Oro</span>
                            <input className="lg-input" style={{ width: 100 }} type="number" min={0} value={m.recompensa.oro} onChange={(e) => cambiarPremio(i, { oro: e.target.value })} />
                        </label>
                        <label className="lg-field">
                            <span>Diamantes</span>
                            <input className="lg-input" style={{ width: 90 }} type="number" min={0} value={m.recompensa.diamantes} onChange={(e) => cambiarPremio(i, { diamantes: e.target.value })} />
                        </label>
                        <label className="lg-field">
                            <span>Tiquetes 🎫</span>
                            <input className="lg-input" style={{ width: 90 }} type="number" min={0} value={m.recompensa.tickets} onChange={(e) => cambiarPremio(i, { tickets: e.target.value })} />
                        </label>
                        <label className="lg-field">
                            <span>Personaje</span>
                            <select className="lg-select" value={m.recompensa.personaje_id} onChange={(e) => cambiarPremio(i, { personaje_id: e.target.value })}>
                                <option value="">—</option>
                                {catalogo.personajes.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="lg-field">
                            <span>Foto de perfil</span>
                            <select className="lg-select" value={m.recompensa.foto_id} onChange={(e) => cambiarPremio(i, { foto_id: e.target.value })}>
                                <option value="">—</option>
                                {fotos.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </label>
                        <label className="lg-field">
                            <span>Marco</span>
                            <select className="lg-select" value={m.recompensa.marco_id} onChange={(e) => cambiarPremio(i, { marco_id: e.target.value })}>
                                <option value="">—</option>
                                {marcos.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </label>
                        {ev.misiones.length > 1 && (
                            <button
                                type="button"
                                className="lb-icon-btn"
                                onClick={() => setEv((e) => ({ ...e, misiones: e.misiones.filter((_, j) => j !== i) }))}
                                aria-label={`Quitar misión ${i + 1}`}
                                title="Quitar misión"
                            >
                                <LuTrash2 aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </fieldset>
            ))}
            {ev.misiones.length < 12 && (
                <div>
                    <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => setEv((e) => ({ ...e, misiones: [...e.misiones, { ...MISION_VACIA, recompensa: { ...MISION_VACIA.recompensa } }] }))}>
                        <LuPlus aria-hidden="true" />
                        Agregar misión
                    </button>
                </div>
            )}

            <div className="lg-row">
                <button type="submit" className="lb-btn lb-btn-primary" disabled={guardando}>
                    <LuSave aria-hidden="true" />
                    {guardando ? "Guardando…" : "Guardar evento"}
                </button>
                <button type="button" className="lb-btn lb-btn-ghost" onClick={alCancelar}>
                    <LuX aria-hidden="true" />
                    Cancelar
                </button>
            </div>
        </form>
    );
}

export default function EventosAdmin() {
    const { datos, cargando, error, recargar } = useCarga("/admin/eventos");
    const [editando, setEditando] = useState(null);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });

    async function borrar(e) {
        if (!window.confirm(`¿Borrar el evento "${e.titulo}"? Lo que ya reclamaron los jugadores se queda con ellos.`)) return;
        try {
            await api(`/admin/eventos/${e.id}`, { metodo: "DELETE" });
            setAviso({ texto: `"${e.titulo}" borrado.`, tono: "ok" });
            recargar();
        } catch (err) {
            setAviso({ texto: err.message, tono: "error" });
        }
    }

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando eventos…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div className="lg-row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h2 className="lg-card-title">Eventos</h2>
                    <p className="lb-muted">
                        El avance se cuenta con las partidas que el jugador termina entre las fechas del evento (o de la misión).
                        Las fotos y marcos se suben en la pestaña "Fotos y marcos".
                    </p>
                </div>
                {!editando && (
                    <button type="button" className="lb-btn lb-btn-primary" onClick={() => setEditando(eventoVacio())}>
                        <LuPlus aria-hidden="true" />
                        Nuevo evento
                    </button>
                )}
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            {editando && (
                <Formulario
                    key={editando.id ?? "nuevo"}
                    inicial={editando}
                    catalogo={datos}
                    alGuardar={(titulo) => {
                        setAviso({ texto: `"${titulo}" guardado.`, tono: "ok" });
                        setEditando(null);
                        recargar();
                    }}
                    alCancelar={() => setEditando(null)}
                    alError={(err) => setAviso({ texto: err.message, tono: "error" })}
                />
            )}

            {datos.eventos.length === 0 ? (
                <div className="lb-card lg-empty">Aún no hay eventos.</div>
            ) : (
                <div className="lg-table-wrap" style={{ background: "var(--lb-surface)" }}>
                    <table className="lg-table">
                        <thead>
                            <tr>
                                <th scope="col">Evento</th>
                                <th scope="col">Fechas</th>
                                <th scope="col">Estado</th>
                                <th scope="col">Misiones (reclamadas)</th>
                                <th scope="col"><span className="lb-sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.eventos.map((e) => {
                                const estado = estadoDe(e);
                                return (
                                    <tr key={e.id}>
                                        <td style={{ minWidth: 200 }}>
                                            <div className="lg-row" style={{ flexWrap: "nowrap", alignItems: "center" }}>
                                                {e.imagen && <img src={e.imagen} alt="" width={64} height={36} style={{ objectFit: "cover", borderRadius: 6 }} />}
                                                <strong>{e.titulo}</strong>
                                            </div>
                                        </td>
                                        <td className="lb-muted" style={{ minWidth: 200 }}>{`${fechaLarga(e.inicio)} → ${fechaLarga(e.fin)}`}</td>
                                        <td><span className={`lg-tag ${estado.clase}`}>{estado.texto}</span></td>
                                        <td>
                                            <ul style={{ margin: 0, paddingLeft: 16 }}>
                                                {e.misiones.map((m) => (
                                                    <li key={m.id}>{`${m.texto || m.texto_auto} (${m.reclamos})`}</li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td>
                                            <div className="lg-row" style={{ flexWrap: "nowrap" }}>
                                                <button type="button" className="lb-icon-btn" title="Editar" aria-label={`Editar ${e.titulo}`} onClick={() => setEditando(aFormulario(e))}>
                                                    <LuPencil aria-hidden="true" />
                                                </button>
                                                <button type="button" className="lb-icon-btn" title="Duplicar" aria-label={`Duplicar ${e.titulo}`} onClick={() => setEditando(aFormulario(e, true))}>
                                                    <LuCopy aria-hidden="true" />
                                                </button>
                                                <button type="button" className="lb-icon-btn" title="Borrar" aria-label={`Borrar ${e.titulo}`} onClick={() => borrar(e)}>
                                                    <LuTrash2 aria-hidden="true" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
