import { useRef, useState } from "react";
import { LuCrown, LuDices, LuGift, LuImage, LuPencil, LuPlus, LuSave, LuTrash2, LuX } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga, formato } from "./useCarga";
import { subirArchivo } from "./subirArchivo";
import { aEntrada, deEntrada, fechaLarga } from "./fechas";

/* =========================================================
   PASE ÉLITE
   · Al crear: datos del pase y los PREMIOS MAYORES (nivel,
     fila gratis/élite y qué se gana). El resto de casillas se
     llena solo al azar (oro, diamantes, tiquetes, fotos, marcos).
   · Después: tocar cualquier casilla para cambiarla, volver a
     sortear las que no son mayores y regalar el Élite.
========================================================= */

const TIPOS = [
    ["oro", "Oro"],
    ["diamantes", "Diamantes"],
    ["tickets", "Tiquetes 🎫"],
    ["personaje_id", "Personaje"],
    ["foto_id", "Foto de perfil"],
    ["marco_id", "Marco"],
];

function tipoDe(r = {}) {
    for (const [k] of TIPOS) if (r[k]) return k;
    for (const [k] of TIPOS) if (k in r) return k; // elegido pero aún sin valor
    return "oro";
}

/* Texto corto de una casilla (con los nombres del catálogo). */
function resumen(r = {}, catalogo) {
    if (r.personaje_id) return `🧍 ${catalogo.personajes.find((p) => p.id === r.personaje_id)?.name || r.personaje_id}`;
    if (r.marco_id) return `🖼️ ${catalogo.cosmeticos.find((c) => c.id === Number(r.marco_id))?.nombre || "Marco"}`;
    if (r.foto_id) return `👤 ${catalogo.cosmeticos.find((c) => c.id === Number(r.foto_id))?.nombre || "Foto"}`;
    if (r.diamantes) return `💎 ${formato(r.diamantes)}`;
    if (r.tickets) return `🎫 ${formato(r.tickets)}`;
    if (r.oro) return `🪙 ${formato(r.oro)}`;
    return "—";
}

/* Elegir UN premio: el tipo y su valor. */
function EditorPremio({ valor, alCambiar, catalogo }) {
    const tipo = tipoDe(valor);
    const cambiarTipo = (t) => alCambiar({ [t]: t === "oro" ? 500 : t === "diamantes" ? 10 : t === "tickets" ? 2 : "" });
    const lista =
        tipo === "personaje_id"
            ? catalogo.personajes.map((p) => [p.id, p.name])
            : tipo === "foto_id" || tipo === "marco_id"
              ? catalogo.cosmeticos.filter((c) => c.tipo === (tipo === "foto_id" ? "foto" : "marco")).map((c) => [c.id, c.nombre])
              : null;
    return (
        <div className="lg-row" style={{ alignItems: "flex-end", flexWrap: "nowrap" }}>
            <label className="lg-field">
                <span>Premio</span>
                <select className="lg-select" value={tipo} onChange={(e) => cambiarTipo(e.target.value)}>
                    {TIPOS.map(([k, t]) => (
                        <option key={k} value={k}>{t}</option>
                    ))}
                </select>
            </label>
            {lista ? (
                <label className="lg-field" style={{ flex: "1 1 160px" }}>
                    <span>Cuál</span>
                    <select className="lg-select" value={valor[tipo] || ""} onChange={(e) => alCambiar({ [tipo]: e.target.value })}>
                        <option value="">Elige…</option>
                        {lista.map(([id, n]) => (
                            <option key={id} value={id}>{n}</option>
                        ))}
                    </select>
                </label>
            ) : (
                <label className="lg-field">
                    <span>Cantidad</span>
                    <input className="lg-input" style={{ width: 110 }} type="number" min={1} value={valor[tipo] || ""} onChange={(e) => alCambiar({ [tipo]: e.target.value })} />
                </label>
            )}
        </div>
    );
}

const limpiar = (r) => {
    const t = tipoDe(r);
    return { [t]: t === "personaje_id" ? r[t] : Number(r[t]) || 0 };
};

function paseVacio() {
    const inicio = new Date();
    inicio.setMinutes(0, 0, 0);
    const fin = new Date(inicio.getTime() + 30 * 86400000);
    return {
        nombre: "",
        descripcion: "",
        imagen: "",
        inicio: aEntrada(inicio),
        fin: aEntrada(fin),
        niveles: 50,
        exp_nivel: 100,
        precio_diamantes: 50,
        exp_ganada: 60,
        exp_perdida: 25,
        activo: true,
        mayores: [
            { nivel: 50, pista: "elite", recompensa: { personaje_id: "" } },
            { nivel: 25, pista: "elite", recompensa: { marco_id: "" } },
        ],
    };
}

function Formulario({ inicial, catalogo, alGuardar, alCancelar, alError }) {
    const [p, setP] = useState(inicial);
    const [avance, setAvance] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const entrada = useRef(null);
    const nuevo = !p.id;
    const campo = (k) => (e) => setP({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
    const cambiarMayor = (i, cambio) => setP((x) => ({ ...x, mayores: x.mayores.map((m, j) => (j === i ? { ...m, ...cambio } : m)) }));

    async function subir(e) {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;
        setAvance(0);
        try {
            const ruta = await subirArchivo(archivo, "foto", setAvance);
            setP((x) => ({ ...x, imagen: ruta }));
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
                ...p,
                inicio: deEntrada(p.inicio),
                fin: deEntrada(p.fin),
                mayores: nuevo ? p.mayores.map((m) => ({ nivel: Number(m.nivel), pista: m.pista, recompensa: limpiar(m.recompensa) })) : undefined,
            };
            await api(nuevo ? "/admin/pases" : `/admin/pases/${p.id}`, { metodo: nuevo ? "POST" : "PUT", body: cuerpo });
            alGuardar(p.nombre);
        } catch (err) {
            alError(err);
        } finally {
            setGuardando(false);
        }
    }

    const numero = (k, ancho, min, max) => (
        <input className="lg-input" style={{ width: ancho }} type="number" min={min} max={max} required value={p[k]} onChange={campo(k)} />
    );

    return (
        <form className="lb-card" onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 className="lg-card-title">{nuevo ? "Nuevo Pase Élite" : "Editar pase"}</h3>

            <div className="lg-row" style={{ alignItems: "flex-end" }}>
                <label className="lg-field" style={{ flex: "2 1 240px" }}>
                    <span>Nombre</span>
                    <input className="lg-input" required maxLength={80} value={p.nombre} onChange={campo("nombre")} placeholder="Ej: Pase Élite Halloween" />
                </label>
                <label className="lg-field">
                    <span>Empieza</span>
                    <input className="lg-input" type="datetime-local" required value={p.inicio} onChange={campo("inicio")} />
                </label>
                <label className="lg-field">
                    <span>Termina</span>
                    <input className="lg-input" type="datetime-local" required value={p.fin} onChange={campo("fin")} />
                </label>
                <label className="lg-row" style={{ alignItems: "center", gap: 6, cursor: "pointer", paddingBottom: 10 }}>
                    <input type="checkbox" checked={p.activo} onChange={campo("activo")} />
                    <span>Visible</span>
                </label>
            </div>

            <div className="lg-row" style={{ alignItems: "flex-end" }}>
                <label className="lg-field">
                    <span>Niveles</span>
                    {numero("niveles", 90, 5, 200)}
                </label>
                <label className="lg-field">
                    <span>EXP por nivel</span>
                    {numero("exp_nivel", 100, 10, 10000)}
                </label>
                <label className="lg-field">
                    <span>EXP al ganar</span>
                    {numero("exp_ganada", 100, 0, 10000)}
                </label>
                <label className="lg-field">
                    <span>EXP al perder</span>
                    {numero("exp_perdida", 100, 0, 10000)}
                </label>
                <label className="lg-field">
                    <span>Precio Élite 💎</span>
                    {numero("precio_diamantes", 110, 0, 100000)}
                </label>
            </div>
            <p className="lb-muted" style={{ margin: 0 }}>
                {`Para llegar al nivel ${p.niveles} se necesitan ${formato(p.niveles * p.exp_nivel)} EXP: unas ${formato(
                    Math.ceil((p.niveles * p.exp_nivel) / Math.max(1, (Number(p.exp_ganada) + Number(p.exp_perdida)) / 2))
                )} partidas. Las partidas que pasan el límite diario de premios no dan EXP.`}
            </p>

            <label className="lg-field">
                <span>Descripción (opcional)</span>
                <input className="lg-input" maxLength={300} value={p.descripcion || ""} onChange={campo("descripcion")} />
            </label>

            <div className="lg-row" style={{ alignItems: "center" }}>
                <input ref={entrada} type="file" hidden accept=".png,.jpg,.jpeg,.webp" onChange={subir} />
                <button type="button" className="lb-btn lb-btn-ghost" onClick={() => entrada.current?.click()} disabled={avance !== null}>
                    <LuImage aria-hidden="true" />
                    {avance !== null ? `Subiendo ${avance}%` : p.imagen ? "Cambiar portada" : "Subir portada (opcional)"}
                </button>
                {p.imagen && <img src={p.imagen} alt="Portada" style={{ width: 160, aspectRatio: "16/9", objectFit: "cover", borderRadius: 8 }} />}
            </div>

            {nuevo && (
                <>
                    <h4 className="lg-card-title" style={{ fontSize: 16 }}>✨ Premios mayores</h4>
                    <p className="lb-muted" style={{ margin: 0 }}>
                        Brillan en el pase. Las demás casillas se llenan solas al azar; después puedes cambiar cualquiera.
                    </p>
                    {p.mayores.map((m, i) => (
                        <fieldset key={i} className="lg-mision">
                            <legend>{`Premio mayor ${i + 1}`}</legend>
                            <div className="lg-row" style={{ alignItems: "flex-end" }}>
                                <label className="lg-field">
                                    <span>Nivel</span>
                                    <input className="lg-input" style={{ width: 80 }} type="number" min={1} max={p.niveles} required value={m.nivel} onChange={(e) => cambiarMayor(i, { nivel: e.target.value })} />
                                </label>
                                <label className="lg-field">
                                    <span>Fila</span>
                                    <select className="lg-select" value={m.pista} onChange={(e) => cambiarMayor(i, { pista: e.target.value })}>
                                        <option value="elite">Élite</option>
                                        <option value="gratis">Gratis</option>
                                    </select>
                                </label>
                                <EditorPremio valor={m.recompensa} catalogo={catalogo} alCambiar={(r) => cambiarMayor(i, { recompensa: r })} />
                                <button
                                    type="button"
                                    className="lb-icon-btn"
                                    onClick={() => setP((x) => ({ ...x, mayores: x.mayores.filter((_, j) => j !== i) }))}
                                    aria-label={`Quitar premio mayor ${i + 1}`}
                                    title="Quitar"
                                >
                                    <LuTrash2 aria-hidden="true" />
                                </button>
                            </div>
                        </fieldset>
                    ))}
                    <div>
                        <button
                            type="button"
                            className="lb-btn lb-btn-ghost lb-btn-sm"
                            onClick={() => setP((x) => ({ ...x, mayores: [...x.mayores, { nivel: 10, pista: "elite", recompensa: { diamantes: 20 } }] }))}
                        >
                            <LuPlus aria-hidden="true" />
                            Agregar premio mayor
                        </button>
                    </div>
                </>
            )}

            <div className="lg-row">
                <button type="submit" className="lb-btn lb-btn-primary" disabled={guardando}>
                    <LuSave aria-hidden="true" />
                    {guardando ? "Guardando…" : nuevo ? "Crear pase (y sortear el resto)" : "Guardar"}
                </button>
                <button type="button" className="lb-btn lb-btn-ghost" onClick={alCancelar}>
                    <LuX aria-hidden="true" />
                    Cancelar
                </button>
            </div>
        </form>
    );
}

/* Las casillas de un pase: tocar una para cambiarla. */
function Casillas({ pase, catalogo, alAvisar, recargar }) {
    const [editando, setEditando] = useState(null); // { nivel, pista, recompensa }
    const [usuario, setUsuario] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const premio = new Map(pase.premios.map((x) => [`${x.nivel}-${x.pista}`, x]));

    async function hacer(fn, ok) {
        setOcupado(true);
        try {
            const r = await fn();
            alAvisar({ texto: r?.message || ok, tono: "ok" });
            await recargar();
            return true;
        } catch (err) {
            alAvisar({ texto: err.message, tono: "error" });
            return false;
        } finally {
            setOcupado(false);
        }
    }

    const guardarCasilla = async () => {
        const listo = await hacer(
            () => api(`/admin/pases/${pase.id}/premio`, { metodo: "PUT", body: { nivel: editando.nivel, pista: editando.pista, recompensa: limpiar(editando.recompensa), mayor: editando.mayor } }),
            `Nivel ${editando.nivel} (${editando.pista}) guardado.`
        );
        if (listo) setEditando(null);
    };

    return (
        <div className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="lg-row" style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
                <h3 className="lg-card-title" style={{ margin: 0 }}>{`Casillas de "${pase.nombre}"`}</h3>
                <div className="lg-row" style={{ alignItems: "flex-end" }}>
                    <button
                        type="button"
                        className="lb-btn lb-btn-ghost lb-btn-sm"
                        disabled={ocupado}
                        onClick={() =>
                            window.confirm("¿Volver a sortear todas las casillas que no son premio mayor?") &&
                            hacer(() => api(`/admin/pases/${pase.id}/rellenar`, { metodo: "POST" }), "Casillas sorteadas de nuevo.")
                        }
                    >
                        <LuDices aria-hidden="true" />
                        Sortear el resto otra vez
                    </button>
                    <form
                        className="lg-row"
                        style={{ alignItems: "flex-end", flexWrap: "nowrap" }}
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (await hacer(() => api(`/admin/pases/${pase.id}/regalar`, { metodo: "POST", body: { usuario } }), "Regalado.")) setUsuario("");
                        }}
                    >
                        <label className="lg-field">
                            <span>Regalar Élite a</span>
                            <input className="lg-input" style={{ width: 150 }} required value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Usuario o ID" />
                        </label>
                        <button type="submit" className="lb-btn lb-btn-primary lb-btn-sm" disabled={ocupado}>
                            <LuGift aria-hidden="true" />
                            Regalar
                        </button>
                    </form>
                </div>
            </div>

            <p className="lb-muted" style={{ margin: 0 }}>
                Las casillas con ✨ son fijas (premios mayores o cambiadas a mano): el sorteo no las toca. Toca una casilla para cambiarla.
            </p>

            {editando && (
                <fieldset className="lg-mision">
                    <legend>{`Nivel ${editando.nivel} · ${editando.pista === "elite" ? "Élite" : "Gratis"}`}</legend>
                    <div className="lg-row" style={{ alignItems: "flex-end" }}>
                        <EditorPremio valor={editando.recompensa} catalogo={catalogo} alCambiar={(r) => setEditando({ ...editando, recompensa: r })} />
                        <label className="lg-row" style={{ alignItems: "center", gap: 6, cursor: "pointer", paddingBottom: 10 }}>
                            <input type="checkbox" checked={editando.mayor} onChange={(e) => setEditando({ ...editando, mayor: e.target.checked })} />
                            <span>Premio mayor ✨</span>
                        </label>
                        <button type="button" className="lb-btn lb-btn-primary lb-btn-sm" onClick={guardarCasilla} disabled={ocupado}>
                            <LuSave aria-hidden="true" />
                            Guardar casilla
                        </button>
                        <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => setEditando(null)}>
                            Cancelar
                        </button>
                    </div>
                </fieldset>
            )}

            <div className="lg-table-wrap">
                <table className="lg-table pa-adm-tabla">
                    <thead>
                        <tr>
                            <th scope="col">Nivel</th>
                            <th scope="col">Gratis</th>
                            <th scope="col">
                                <LuCrown aria-hidden="true" /> Élite
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: pase.niveles }, (_, i) => i + 1).map((n) => (
                            <tr key={n}>
                                <th scope="row">{n}</th>
                                {["gratis", "elite"].map((k) => {
                                    const c = premio.get(`${n}-${k}`);
                                    const elegida = editando?.nivel === n && editando?.pista === k;
                                    return (
                                        <td key={k}>
                                            <button
                                                type="button"
                                                className="lb-btn lb-btn-ghost lb-btn-sm"
                                                style={{ width: "100%", justifyContent: "flex-start", fontWeight: c?.mayor ? 800 : 500, outline: elegida ? "2px solid var(--lb-primary, #6366f1)" : undefined }}
                                                onClick={() => setEditando({ nivel: n, pista: k, recompensa: { ...(c?.recompensa || { oro: 100 }) }, mayor: c ? c.mayor : true })}
                                            >
                                                {c?.mayor && "✨ "}
                                                {c ? resumen(c.recompensa, catalogo) : "—"}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function estadoDe(p) {
    const ahora = Date.now();
    if (!p.activo) return { texto: "Oculto", clase: "" };
    if (new Date(p.inicio) > ahora) return { texto: "Próximo", clase: "lg-tag-on" };
    if (new Date(p.fin) <= ahora) return { texto: "Terminado", clase: "" };
    return { texto: "Activo", clase: "lg-tag-on" };
}

export default function PaseAdmin() {
    const { datos, cargando, error, recargar } = useCarga("/admin/pases");
    const [editando, setEditando] = useState(null);
    const [abierto, setAbierto] = useState(null);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });

    async function borrar(p) {
        if (!window.confirm(`¿Borrar "${p.nombre}"? Se borra el avance de los jugadores en este pase (lo que ya reclamaron se queda con ellos).`)) return;
        try {
            await api(`/admin/pases/${p.id}`, { metodo: "DELETE" });
            setAviso({ texto: `"${p.nombre}" borrado.`, tono: "ok" });
            recargar();
        } catch (err) {
            setAviso({ texto: err.message, tono: "error" });
        }
    }

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando pases…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;

    const abiertoPase = datos.pases.find((p) => p.id === abierto);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div className="lg-row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h2 className="lg-card-title">Pase Élite</h2>
                    <p className="lb-muted">
                        Cada nivel tiene un premio gratis y uno élite. Se sube jugando partidas. El Élite se compra con diamantes o lo regalas tú.
                        Si hay varios pases activos a la vez, se muestra el que empezó de último.
                    </p>
                </div>
                {!editando && (
                    <button type="button" className="lb-btn lb-btn-primary" onClick={() => setEditando(paseVacio())}>
                        <LuPlus aria-hidden="true" />
                        Nuevo pase
                    </button>
                )}
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            {editando && (
                <Formulario
                    key={editando.id ?? "nuevo"}
                    inicial={editando}
                    catalogo={datos}
                    alGuardar={(nombre) => {
                        setAviso({ texto: `"${nombre}" guardado.`, tono: "ok" });
                        setEditando(null);
                        recargar();
                    }}
                    alCancelar={() => setEditando(null)}
                    alError={(err) => setAviso({ texto: err.message, tono: "error" })}
                />
            )}

            {datos.pases.length === 0 ? (
                <div className="lb-card lg-empty">Aún no hay pases.</div>
            ) : (
                <div className="lg-table-wrap" style={{ background: "var(--lb-surface)" }}>
                    <table className="lg-table">
                        <thead>
                            <tr>
                                <th scope="col">Pase</th>
                                <th scope="col">Fechas</th>
                                <th scope="col">Estado</th>
                                <th scope="col">Reglas</th>
                                <th scope="col">Jugadores (élite)</th>
                                <th scope="col"><span className="lb-sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.pases.map((p) => {
                                const estado = estadoDe(p);
                                return (
                                    <tr key={p.id}>
                                        <td style={{ minWidth: 180 }}>
                                            <div className="lg-row" style={{ flexWrap: "nowrap", alignItems: "center" }}>
                                                {p.imagen && <img src={p.imagen} alt="" width={64} height={36} style={{ objectFit: "cover", borderRadius: 6 }} />}
                                                <strong>{p.nombre}</strong>
                                            </div>
                                        </td>
                                        <td className="lb-muted" style={{ minWidth: 200 }}>{`${fechaLarga(p.inicio)} → ${fechaLarga(p.fin)}`}</td>
                                        <td><span className={`lg-tag ${estado.clase}`}>{estado.texto}</span></td>
                                        <td className="lb-muted">{`${p.niveles} niv. × ${p.exp_nivel} EXP · 💎${p.precio_diamantes}`}</td>
                                        <td>{`${formato(p.jugadores)} (${formato(p.elites)})`}</td>
                                        <td>
                                            <div className="lg-row" style={{ flexWrap: "nowrap" }}>
                                                <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => setAbierto(abierto === p.id ? null : p.id)}>
                                                    {abierto === p.id ? "Ocultar casillas" : "Ver casillas"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="lb-icon-btn"
                                                    title="Editar"
                                                    aria-label={`Editar ${p.nombre}`}
                                                    onClick={() => setEditando({ ...p, inicio: aEntrada(p.inicio), fin: aEntrada(p.fin), descripcion: p.descripcion || "", imagen: p.imagen || "" })}
                                                >
                                                    <LuPencil aria-hidden="true" />
                                                </button>
                                                <button type="button" className="lb-icon-btn" title="Borrar" aria-label={`Borrar ${p.nombre}`} onClick={() => borrar(p)}>
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

            {abiertoPase && <Casillas key={abiertoPase.id} pase={abiertoPase} catalogo={datos} alAvisar={setAviso} recargar={recargar} />}
        </div>
    );
}
