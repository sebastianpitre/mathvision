import { useState } from "react";
import { LuCopy, LuPencil, LuPlus, LuSave, LuTrash2, LuX } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";
import { aEntrada, deEntrada, fechaLarga } from "./fechas";

/* =========================================================
   GIRAGAMIF (ruleta de la suerte)
   Premios y su % de probabilidad (suman 100). Cada giro
   cuesta tiquetes 🎫 que se ganan en las misiones de los
   eventos (en la pestaña Eventos, recompensa "Tiquetes").
========================================================= */

const PREMIO_VACIO = { tipo: "oro", cantidad: 100, ref: "", probabilidad: 0, repetido_oro: 200 };

function ruletaVacia() {
    return {
        nombre: "GiraGamif",
        descripcion: "",
        costo: 1,
        activo: true,
        inicio: "",
        fin: "",
        premios: [
            { ...PREMIO_VACIO, tipo: "oro", cantidad: 100, probabilidad: 45 },
            { ...PREMIO_VACIO, tipo: "oro", cantidad: 300, probabilidad: 20 },
            { ...PREMIO_VACIO, tipo: "diamantes", cantidad: 5, probabilidad: 10 },
            { ...PREMIO_VACIO, tipo: "tickets", cantidad: 2, probabilidad: 10 },
            { ...PREMIO_VACIO, tipo: "nada", cantidad: 0, probabilidad: 15 },
        ],
    };
}

function aFormulario(r, copia = false) {
    return {
        id: copia ? undefined : r.id,
        nombre: copia ? `${r.nombre} (copia)` : r.nombre,
        descripcion: r.descripcion || "",
        costo: r.costo,
        activo: r.activo,
        inicio: aEntrada(r.inicio),
        fin: aEntrada(r.fin),
        premios: r.premios.map((p) => ({
            id: copia ? undefined : p.id,
            tipo: p.tipo,
            cantidad: p.cantidad,
            ref: p.ref || "",
            probabilidad: p.probabilidad,
            repetido_oro: p.repetido_oro,
        })),
    };
}

function Formulario({ inicial, catalogo, alGuardar, alCancelar, alError }) {
    const [r, setR] = useState(inicial);
    const [guardando, setGuardando] = useState(false);

    const suma = Math.round(r.premios.reduce((s, p) => s + (Number(p.probabilidad) || 0), 0) * 1000) / 1000;
    const sumaOk = Math.abs(suma - 100) < 0.01;
    const cambiar = (i, cambio) => setR((x) => ({ ...x, premios: x.premios.map((p, j) => (j === i ? { ...p, ...cambio } : p)) }));

    // Reparte lo que falta (o sobra) en el premio más común.
    const ajustar = () => {
        const i = r.premios.reduce((m, p, j, l) => (Number(p.probabilidad) > Number(l[m].probabilidad) ? j : m), 0);
        cambiar(i, { probabilidad: Math.max(0, Math.round((Number(r.premios[i].probabilidad) + 100 - suma) * 1000) / 1000) });
    };

    async function guardar(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            const cuerpo = {
                ...r,
                costo: Number(r.costo),
                inicio: deEntrada(r.inicio),
                fin: deEntrada(r.fin),
                premios: r.premios.map((p) => ({
                    ...p,
                    cantidad: Number(p.cantidad) || 0,
                    probabilidad: Number(p.probabilidad) || 0,
                    repetido_oro: Number(p.repetido_oro) || 0,
                })),
            };
            await api(r.id ? `/admin/ruletas/${r.id}` : "/admin/ruletas", { metodo: r.id ? "PUT" : "POST", body: cuerpo });
            alGuardar(r.nombre);
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
            <h3 className="lg-card-title">{r.id ? "Editar ruleta" : "Nueva ruleta"}</h3>
            <div className="lg-row" style={{ alignItems: "flex-end" }}>
                <label className="lg-field" style={{ flex: "2 1 200px" }}>
                    <span>Nombre</span>
                    <input className="lg-input" required maxLength={80} value={r.nombre} onChange={(e) => setR({ ...r, nombre: e.target.value })} />
                </label>
                <label className="lg-field">
                    <span>Tiquetes por giro</span>
                    <input className="lg-input" style={{ width: 100 }} type="number" min={1} max={1000} value={r.costo} onChange={(e) => setR({ ...r, costo: e.target.value })} />
                </label>
                <label className="lg-field">
                    <span>Desde (opcional)</span>
                    <input className="lg-input" type="datetime-local" value={r.inicio} onChange={(e) => setR({ ...r, inicio: e.target.value })} />
                </label>
                <label className="lg-field">
                    <span>Hasta (opcional)</span>
                    <input className="lg-input" type="datetime-local" value={r.fin} onChange={(e) => setR({ ...r, fin: e.target.value })} />
                </label>
                <label className="lg-row" style={{ alignItems: "center", gap: 6, cursor: "pointer", paddingBottom: 10 }}>
                    <input type="checkbox" checked={r.activo} onChange={(e) => setR({ ...r, activo: e.target.checked })} />
                    <span>Visible</span>
                </label>
            </div>
            <label className="lg-field">
                <span>Descripción (opcional)</span>
                <input className="lg-input" maxLength={300} value={r.descripcion} onChange={(e) => setR({ ...r, descripcion: e.target.value })} placeholder="Ej: ¡Prueba tu suerte y gana personajes exclusivos!" />
            </label>

            <div className="lg-table-wrap">
                <table className="lg-table">
                    <thead>
                        <tr>
                            <th scope="col">Premio</th>
                            <th scope="col">Cantidad o cuál</th>
                            <th scope="col">% de suerte</th>
                            <th scope="col">Si ya lo tiene (oro)</th>
                            <th scope="col"><span className="lb-sr-only">Quitar</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {r.premios.map((p, i) => (
                            <tr key={p.id ?? `n${i}`}>
                                <td>
                                    <select className="lg-select" value={p.tipo} onChange={(e) => cambiar(i, { tipo: e.target.value, ref: "" })} aria-label={`Tipo del premio ${i + 1}`}>
                                        {Object.entries(catalogo.tipos).map(([id, texto]) => (
                                            <option key={id} value={id}>{texto}</option>
                                        ))}
                                    </select>
                                </td>
                                <td style={{ minWidth: 180 }}>
                                    {["oro", "diamantes", "tickets"].includes(p.tipo) && (
                                        <input className="lg-input" style={{ width: 110 }} type="number" min={1} value={p.cantidad} onChange={(e) => cambiar(i, { cantidad: e.target.value })} aria-label={`Cantidad del premio ${i + 1}`} />
                                    )}
                                    {p.tipo === "personaje" && (
                                        <select className="lg-select" value={p.ref} onChange={(e) => cambiar(i, { ref: e.target.value })} aria-label={`Personaje del premio ${i + 1}`}>
                                            <option value="">— Elige —</option>
                                            {catalogo.personajes.map((x) => (
                                                <option key={x.id} value={x.id}>{x.name}</option>
                                            ))}
                                        </select>
                                    )}
                                    {(p.tipo === "foto" || p.tipo === "marco") && (
                                        <select className="lg-select" value={p.ref} onChange={(e) => cambiar(i, { ref: e.target.value })} aria-label={`${p.tipo} del premio ${i + 1}`}>
                                            <option value="">— Elige —</option>
                                            {(p.tipo === "foto" ? fotos : marcos).map((x) => (
                                                <option key={x.id} value={x.id}>{x.nombre}</option>
                                            ))}
                                        </select>
                                    )}
                                    {p.tipo === "nada" && <span className="lb-muted">“Sigue intentando”</span>}
                                </td>
                                <td>
                                    <span className="lg-row" style={{ flexWrap: "nowrap", alignItems: "center", gap: 6 }}>
                                        <input className="lg-input" style={{ width: 90 }} type="number" min={0} max={100} step="any" value={p.probabilidad} onChange={(e) => cambiar(i, { probabilidad: e.target.value })} aria-label={`Porcentaje del premio ${i + 1}`} />
                                        %
                                    </span>
                                </td>
                                <td>
                                    {["personaje", "foto", "marco"].includes(p.tipo) ? (
                                        <input className="lg-input" style={{ width: 100 }} type="number" min={0} value={p.repetido_oro} onChange={(e) => cambiar(i, { repetido_oro: e.target.value })} aria-label={`Oro si ya tiene el premio ${i + 1}`} />
                                    ) : (
                                        <span className="lb-muted">—</span>
                                    )}
                                </td>
                                <td>
                                    {r.premios.length > 2 && (
                                        <button type="button" className="lb-icon-btn" onClick={() => setR((x) => ({ ...x, premios: x.premios.filter((_, j) => j !== i) }))} aria-label={`Quitar premio ${i + 1}`}>
                                            <LuTrash2 aria-hidden="true" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="lg-row" style={{ alignItems: "center" }}>
                {r.premios.length < 12 && (
                    <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => setR((x) => ({ ...x, premios: [...x.premios, { ...PREMIO_VACIO }] }))}>
                        <LuPlus aria-hidden="true" />
                        Agregar premio
                    </button>
                )}
                <span className={sumaOk ? "lg-ok" : "lg-alert"} style={{ padding: "4px 10px" }} role="status">
                    {sumaOk ? "Los porcentajes suman 100 % ✔" : `Suman ${suma} %: deben sumar 100 %`}
                </span>
                {!sumaOk && (
                    <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={ajustar}>
                        Ajustar al 100 %
                    </button>
                )}
            </div>

            <div className="lg-row">
                <button type="submit" className="lb-btn lb-btn-primary" disabled={guardando || !sumaOk}>
                    <LuSave aria-hidden="true" />
                    {guardando ? "Guardando…" : "Guardar ruleta"}
                </button>
                <button type="button" className="lb-btn lb-btn-ghost" onClick={alCancelar}>
                    <LuX aria-hidden="true" />
                    Cancelar
                </button>
            </div>
        </form>
    );
}

export default function RuletaAdmin() {
    const { datos, cargando, error, recargar } = useCarga("/admin/ruletas");
    const [editando, setEditando] = useState(null);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });

    async function borrar(r) {
        if (!window.confirm(`¿Borrar la ruleta "${r.nombre}"? Lo que ya ganaron los jugadores se queda con ellos.`)) return;
        try {
            await api(`/admin/ruletas/${r.id}`, { metodo: "DELETE" });
            setAviso({ texto: `"${r.nombre}" borrada.`, tono: "ok" });
            recargar();
        } catch (err) {
            setAviso({ texto: err.message, tono: "error" });
        }
    }

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando ruletas…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div className="lg-row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h2 className="lg-card-title">GiraGamif · ruleta de la suerte</h2>
                    <p className="lb-muted">
                        Pon los premios y su % de suerte (deben sumar 100 %). Cada giro gasta tiquetes 🎫, que se ganan en las
                        misiones de los eventos (recompensa "Tiquetes"). Si sale un personaje, foto o marco que el jugador ya
                        tiene, recibe el oro que pongas.
                    </p>
                </div>
                {!editando && (
                    <button type="button" className="lb-btn lb-btn-primary" onClick={() => setEditando(ruletaVacia())}>
                        <LuPlus aria-hidden="true" />
                        Nueva ruleta
                    </button>
                )}
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            {editando && (
                <Formulario
                    key={editando.id ?? "nueva"}
                    inicial={editando}
                    catalogo={datos}
                    alGuardar={(nombre) => {
                        setAviso({ texto: `"${nombre}" guardada.`, tono: "ok" });
                        setEditando(null);
                        recargar();
                    }}
                    alCancelar={() => setEditando(null)}
                    alError={(err) => setAviso({ texto: err.message, tono: "error" })}
                />
            )}

            {datos.ruletas.length === 0 ? (
                <div className="lb-card lg-empty">Aún no hay ruletas.</div>
            ) : (
                datos.ruletas.map((r) => (
                    <section key={r.id} className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div className="lg-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <h3 className="lg-card-title">
                                    {r.nombre}
                                    <span className={`lg-tag ${r.activo ? "lg-tag-on" : ""}`} style={{ marginLeft: 8 }}>{r.activo ? "Visible" : "Oculta"}</span>
                                </h3>
                                <p className="lb-muted" style={{ margin: 0 }}>
                                    {`${r.costo} 🎫 por giro · ${r.giros} giros`}
                                    {r.inicio || r.fin ? ` · ${r.inicio ? fechaLarga(r.inicio) : "ya"} → ${r.fin ? fechaLarga(r.fin) : "sin fin"}` : ""}
                                </p>
                            </div>
                            <div className="lg-row" style={{ flexWrap: "nowrap" }}>
                                <button type="button" className="lb-icon-btn" title="Editar" aria-label={`Editar ${r.nombre}`} onClick={() => setEditando(aFormulario(r))}>
                                    <LuPencil aria-hidden="true" />
                                </button>
                                <button type="button" className="lb-icon-btn" title="Duplicar" aria-label={`Duplicar ${r.nombre}`} onClick={() => setEditando(aFormulario(r, true))}>
                                    <LuCopy aria-hidden="true" />
                                </button>
                                <button type="button" className="lb-icon-btn" title="Borrar" aria-label={`Borrar ${r.nombre}`} onClick={() => borrar(r)}>
                                    <LuTrash2 aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                        <div className="lg-table-wrap">
                            <table className="lg-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Premio</th>
                                        <th scope="col" className="lg-num">% de suerte</th>
                                        <th scope="col" className="lg-num">Salió</th>
                                        <th scope="col" className="lg-num">% real</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {r.premios.map((p) => (
                                        <tr key={p.id}>
                                            <td>
                                                <span className="lg-row" style={{ flexWrap: "nowrap", alignItems: "center" }}>
                                                    {p.imagen && <img src={p.imagen} alt="" width={32} height={32} style={{ borderRadius: 6, objectFit: "cover" }} />}
                                                    {p.nombre}
                                                </span>
                                            </td>
                                            <td className="lg-num">{`${p.probabilidad} %`}</td>
                                            <td className="lg-num">{p.salio}</td>
                                            <td className="lg-num">{r.giros ? `${Math.round((1000 * p.salio) / r.giros) / 10} %` : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}
