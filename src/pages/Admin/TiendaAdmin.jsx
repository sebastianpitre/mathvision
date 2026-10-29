import { Fragment, useEffect, useRef, useState } from "react";
import { LuImage, LuPlus, LuRuler, LuSave, LuTrash2, LuUpload } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";
import { subirArchivo } from "./subirArchivo";
import { cargarEscalas } from "../../services/escalas";
import { analizarModelo, TEXTO_TIPO } from "../../components/character/adaptarModelo";
import Personaje3D from "../../components/juego/Personaje3D";

/* =========================================================
   PERSONAJES: crear nuevos (subiendo su modelo .vrm y su
   foto), cambiar nombre, archivos, precios, nivel mínimo,
   mostrar u ocultar en la tienda, y borrarlos.
   Precio 0 en oro y en diamantes = gratis para todos.
========================================================= */

const VACIO = { name: "", precio_oro: 300, precio_diamantes: 0, nivel_minimo: 1, activo: true, model_path: "", thumbnail_path: "", creditos: "", escala: 1 };

/* Barra para hacer el modelo más pequeño o más grande (1 = normal). */
function BarraTamano({ valor, alCambiar, nombre }) {
    const v = Number(valor) || 1;
    return (
        <div className="lg-tamano">
            <label className="lg-field" style={{ flex: 1 }}>
                <span>{`Tamaño: ${Math.round(v * 100)}%`}</span>
                <input
                    type="range"
                    min={0.2}
                    max={3}
                    step={0.01}
                    value={v}
                    onChange={(e) => alCambiar(Number(e.target.value))}
                    aria-label={`Tamaño de ${nombre || "el personaje"}`}
                />
            </label>
            <div className="lg-row" style={{ flexWrap: "nowrap" }}>
                <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => alCambiar(Math.max(0.2, Math.round((v - 0.05) * 100) / 100))} aria-label="Más pequeño">−</button>
                <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => alCambiar(1)}>Normal</button>
                <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => alCambiar(Math.min(3, Math.round((v + 0.05) * 100) / 100))} aria-label="Más grande">+</button>
            </div>
        </div>
    );
}

/* Vista previa 3D con una línea a la altura normal, para comparar. */
function VistaTamano({ modelo, tamano }) {
    return (
        <div className="lg-vista" aria-label="Vista previa del modelo">
            <Personaje3D modelo={modelo} tamano={tamano} />
            <span className="lg-vista-linea" aria-hidden="true">Altura normal</span>
        </div>
    );
}

/* Al subir un modelo se revisa cómo se va a ver en el juego. */
function EstadoModelo({ ruta }) {
    const [estado, setEstado] = useState(null);
    useEffect(() => {
        if (!ruta) return;
        let cancelado = false;
        setEstado({ tono: "", texto: "Revisando el modelo…" });
        analizarModelo(ruta)
            .then((tipo) => !cancelado && setEstado(TEXTO_TIPO[tipo]))
            .catch(() => !cancelado && setEstado({ tono: "error", texto: "No se pudo abrir el modelo. ¿Es un .vrm o .glb válido?" }));
        return () => {
            cancelado = true;
        };
    }, [ruta]);
    if (!ruta || !estado) return null;
    return (
        <span className={estado.tono === "error" ? "lg-alert" : estado.tono === "ok" ? "lg-ok" : "lb-muted"} style={{ padding: "4px 10px" }} role="status">
            {estado.texto}
        </span>
    );
}

/* Botón que abre el selector de archivos y sube el archivo. */
function BotonSubir({ tipo, texto, alSubir, alError }) {
    const entrada = useRef(null);
    const [avance, setAvance] = useState(null);

    const elegir = async (e) => {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;
        setAvance(0);
        try {
            alSubir(await subirArchivo(archivo, tipo, setAvance), archivo.name);
        } catch (err) {
            alError(err.message);
        } finally {
            setAvance(null);
        }
    };

    return (
        <>
            <input
                ref={entrada}
                type="file"
                hidden
                accept={tipo === "modelo" ? ".vrm,.glb" : ".png,.jpg,.jpeg,.webp"}
                onChange={elegir}
            />
            <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => entrada.current?.click()} disabled={avance !== null}>
                {tipo === "modelo" ? <LuUpload aria-hidden="true" /> : <LuImage aria-hidden="true" />}
                {avance !== null ? `Subiendo ${avance}%` : texto}
            </button>
        </>
    );
}

export default function TiendaAdmin() {
    const { datos, cargando, error, recargar } = useCarga("/admin/personajes");
    const [filas, setFilas] = useState([]);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [guardando, setGuardando] = useState(null);
    const [nuevo, setNuevo] = useState(null); // formulario de personaje nuevo
    const [viendo, setViendo] = useState(null); // id del personaje con la vista de tamaño abierta

    useEffect(() => {
        if (datos) setFilas(datos.personajes);
    }, [datos]);

    const avisar = (texto, tono = "ok") => setAviso({ texto, tono });
    const cambiar = (id, campo, valor) =>
        setFilas((lista) => lista.map((p) => (p.id === id ? { ...p, [campo]: valor, cambiado: true } : p)));

    async function guardar(p) {
        setGuardando(p.id);
        setAviso({ texto: "", tono: "" });
        try {
            await api(`/admin/personajes/${encodeURIComponent(p.id)}`, {
                metodo: "PUT",
                body: {
                    name: p.name,
                    precio_oro: Number(p.precio_oro) || 0,
                    precio_diamantes: Number(p.precio_diamantes) || 0,
                    nivel_minimo: Number(p.nivel_minimo) || 1,
                    activo: p.activo,
                    orden: Number(p.orden) || 0,
                    model_path: p.model_path,
                    thumbnail_path: p.thumbnail_path || undefined,
                    creditos: p.creditos || "",
                    escala: Number(p.escala) || 1,
                },
            });
            setFilas((lista) => lista.map((x) => (x.id === p.id ? { ...x, cambiado: false } : x)));
            avisar(`"${p.name}" guardado.`);
            cargarEscalas({ forzar: true });
        } catch (e) {
            avisar(e.message, "error");
        } finally {
            setGuardando(null);
        }
    }

    async function borrar(p) {
        if (!window.confirm(`¿Borrar a "${p.name}"? Quien lo tenga vuelve al personaje inicial y no se le devuelve lo que pagó.`)) return;
        try {
            await api(`/admin/personajes/${encodeURIComponent(p.id)}`, { metodo: "DELETE" });
            avisar(`"${p.name}" borrado.`);
            recargar();
        } catch (e) {
            avisar(e.message, "error");
        }
    }

    async function crear(e) {
        e.preventDefault();
        setGuardando("nuevo");
        try {
            await api("/admin/personajes", {
                metodo: "POST",
                body: {
                    ...nuevo,
                    precio_oro: Number(nuevo.precio_oro) || 0,
                    precio_diamantes: Number(nuevo.precio_diamantes) || 0,
                    nivel_minimo: Number(nuevo.nivel_minimo) || 1,
                    thumbnail_path: nuevo.thumbnail_path || undefined,
                    escala: Number(nuevo.escala) || 1,
                },
            });
            cargarEscalas({ forzar: true });
            avisar(`"${nuevo.name}" ya está en la tienda.`);
            setNuevo(null);
            recargar();
        } catch (err) {
            avisar(err.message, "error");
        } finally {
            setGuardando(null);
        }
    }

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando personajes…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div className="lg-row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h2 className="lg-card-title">Personajes</h2>
                    <p className="lb-muted">
                        Precio en oro, en diamantes o en ambos (el jugador elige con qué pagar). Con los dos en 0 es gratis.
                    </p>
                </div>
                {!nuevo && (
                    <button type="button" className="lb-btn lb-btn-primary" onClick={() => setNuevo({ ...VACIO })}>
                        <LuPlus aria-hidden="true" />
                        Nuevo personaje
                    </button>
                )}
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            {/* ---------- Personaje nuevo ---------- */}
            {nuevo && (
                <form className="lb-card" onSubmit={crear} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <h3 className="lg-card-title">Nuevo personaje</h3>
                    <div className="lg-row" style={{ alignItems: "flex-end" }}>
                        <label className="lg-field" style={{ flex: "2 1 200px" }}>
                            <span>Nombre</span>
                            <input className="lg-input" required maxLength={100} value={nuevo.name} onChange={(e) => setNuevo({ ...nuevo, name: e.target.value })} />
                        </label>
                        <label className="lg-field" style={{ flex: "1 1 100px" }}>
                            <span>Oro</span>
                            <input className="lg-input" type="number" min={0} value={nuevo.precio_oro} onChange={(e) => setNuevo({ ...nuevo, precio_oro: e.target.value })} />
                        </label>
                        <label className="lg-field" style={{ flex: "1 1 100px" }}>
                            <span>Diamantes</span>
                            <input className="lg-input" type="number" min={0} value={nuevo.precio_diamantes} onChange={(e) => setNuevo({ ...nuevo, precio_diamantes: e.target.value })} />
                        </label>
                        <label className="lg-field" style={{ flex: "1 1 100px" }}>
                            <span>Nivel mínimo</span>
                            <input className="lg-input" type="number" min={1} max={100} value={nuevo.nivel_minimo} onChange={(e) => setNuevo({ ...nuevo, nivel_minimo: e.target.value })} />
                        </label>
                    </div>
                    <div className="lg-row">
                        <BotonSubir tipo="modelo" texto="Subir modelo .vrm o .glb" alSubir={(ruta) => setNuevo((n) => ({ ...n, model_path: ruta }))} alError={(m) => avisar(m, "error")} />
                        {nuevo.model_path ? (
                            <EstadoModelo ruta={nuevo.model_path} />
                        ) : (
                            <span className="lb-muted" style={{ padding: "4px 10px" }}>Falta el modelo (.vrm o .glb, hasta 60 MB)</span>
                        )}
                        <BotonSubir tipo="foto" texto="Subir foto" alSubir={(ruta) => setNuevo((n) => ({ ...n, thumbnail_path: ruta }))} alError={(m) => avisar(m, "error")} />
                        {nuevo.thumbnail_path && <img src={nuevo.thumbnail_path} alt="Foto" width={48} height={48} style={{ borderRadius: 10, objectFit: "cover" }} />}
                    </div>
                    <label className="lg-field">
                        <span>Créditos del autor (si la licencia lo pide). Ej: Zombie por Grim Greg · CC BY · sketchfab.com</span>
                        <input className="lg-input" maxLength={300} value={nuevo.creditos} onChange={(e) => setNuevo({ ...nuevo, creditos: e.target.value })} />
                    </label>
                    {nuevo.model_path && (
                        <>
                            <VistaTamano modelo={nuevo.model_path} tamano={nuevo.escala} />
                            <BarraTamano valor={nuevo.escala} nombre={nuevo.name} alCambiar={(v) => setNuevo((n) => ({ ...n, escala: v }))} />
                        </>
                    )}
                    <div className="lg-row">
                        <button type="submit" className="lb-btn lb-btn-primary" disabled={!nuevo.name.trim() || !nuevo.model_path || guardando === "nuevo"}>
                            <LuSave aria-hidden="true" />
                            {guardando === "nuevo" ? "Guardando…" : "Agregar a la tienda"}
                        </button>
                        <button type="button" className="lb-btn lb-btn-ghost" onClick={() => setNuevo(null)}>
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {/* ---------- Lista ---------- */}
            <div className="lg-table-wrap" style={{ background: "var(--lb-surface)" }}>
                <table className="lg-table">
                    <thead>
                        <tr>
                            <th scope="col">Foto</th>
                            <th scope="col">Nombre</th>
                            <th scope="col">Archivos y créditos</th>
                            <th scope="col">Oro</th>
                            <th scope="col">Diamantes</th>
                            <th scope="col">Nivel mín.</th>
                            <th scope="col">Orden</th>
                            <th scope="col">En tienda</th>
                            <th scope="col" className="lg-num">Vendidos</th>
                            <th scope="col"><span className="lb-sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filas.map((p) => (
                            <Fragment key={p.id}>
                            <tr>
                                <td>
                                    {p.thumbnail_path ? (
                                        <img src={p.thumbnail_path} alt="" width={48} height={48} style={{ borderRadius: 10, objectFit: "cover" }} />
                                    ) : (
                                        <span aria-hidden="true" style={{ fontSize: 28 }}>🧍</span>
                                    )}
                                    {p.is_default && <div className="lb-muted">Inicial</div>}
                                </td>
                                <td>
                                    <input className="lg-input" style={{ minWidth: 120 }} value={p.name} aria-label="Nombre" onChange={(e) => cambiar(p.id, "name", e.target.value)} />
                                </td>
                                <td>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <BotonSubir tipo="modelo" texto="Cambiar modelo" alSubir={(ruta) => cambiar(p.id, "model_path", ruta)} alError={(m) => avisar(m, "error")} />
                                        <BotonSubir tipo="foto" texto="Cambiar foto" alSubir={(ruta) => cambiar(p.id, "thumbnail_path", ruta)} alError={(m) => avisar(m, "error")} />
                                        {p.cambiado && <EstadoModelo ruta={p.model_path} />}
                                        <input
                                            className="lg-input"
                                            style={{ minWidth: 180 }}
                                            maxLength={300}
                                            placeholder="Créditos del autor"
                                            value={p.creditos || ""}
                                            aria-label={`Créditos del autor de ${p.name}`}
                                            onChange={(e) => cambiar(p.id, "creditos", e.target.value)}
                                        />
                                    </div>
                                </td>
                                <td>
                                    <input className="lg-input" style={{ width: 96 }} type="number" min={0} value={p.precio_oro} aria-label={`Precio en oro de ${p.name}`} onChange={(e) => cambiar(p.id, "precio_oro", e.target.value)} />
                                </td>
                                <td>
                                    <input className="lg-input" style={{ width: 86 }} type="number" min={0} value={p.precio_diamantes} aria-label={`Precio en diamantes de ${p.name}`} onChange={(e) => cambiar(p.id, "precio_diamantes", e.target.value)} />
                                </td>
                                <td>
                                    <input className="lg-input" style={{ width: 72 }} type="number" min={1} max={100} value={p.nivel_minimo} aria-label={`Nivel mínimo de ${p.name}`} onChange={(e) => cambiar(p.id, "nivel_minimo", e.target.value)} />
                                </td>
                                <td>
                                    <input className="lg-input" style={{ width: 66 }} type="number" value={p.orden} aria-label={`Orden de ${p.name}`} onChange={(e) => cambiar(p.id, "orden", e.target.value)} />
                                </td>
                                <td>
                                    <input type="checkbox" style={{ width: 20, height: 20 }} checked={p.activo} aria-label={`Mostrar ${p.name} en la tienda`} onChange={(e) => cambiar(p.id, "activo", e.target.checked)} />
                                </td>
                                <td className="lg-num">{p.vendidos}</td>
                                <td>
                                    <div className="lg-row" style={{ flexWrap: "nowrap" }}>
                                        <button
                                            type="button"
                                            className={`lb-btn lb-btn-sm ${p.cambiado ? "lb-btn-primary" : "lb-btn-ghost"}`}
                                            disabled={!p.cambiado || guardando === p.id}
                                            onClick={() => guardar(p)}
                                        >
                                            <LuSave aria-hidden="true" />
                                            {guardando === p.id ? "…" : "Guardar"}
                                        </button>
                                        <button
                                            type="button"
                                            className={`lb-icon-btn ${viendo === p.id ? "lb-icon-btn-activo" : ""}`}
                                            title="Ver y cambiar tamaño"
                                            aria-label={`Ver y cambiar el tamaño de ${p.name}`}
                                            aria-expanded={viendo === p.id}
                                            onClick={() => setViendo(viendo === p.id ? null : p.id)}
                                        >
                                            <LuRuler aria-hidden="true" />
                                        </button>
                                        {!p.is_default && (
                                            <button type="button" className="lb-icon-btn" title="Borrar personaje" aria-label={`Borrar ${p.name}`} onClick={() => borrar(p)}>
                                                <LuTrash2 aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            {viendo === p.id && (
                                <tr>
                                    <td colSpan={10}>
                                        <div className="lg-tamano-fila">
                                            <VistaTamano modelo={p.model_path} tamano={Number(p.escala) || 1} />
                                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                                                <strong>{`Tamaño de ${p.name}`}</strong>
                                                <BarraTamano valor={p.escala} nombre={p.name} alCambiar={(v) => cambiar(p.id, "escala", v)} />
                                                <span className="lb-muted">Mueve la barra hasta que la cabeza quede cerca de la línea. Luego toca Guardar en la fila.</span>
                                                <div>
                                                    <button type="button" className="lb-btn lb-btn-primary lb-btn-sm" disabled={!p.cambiado || guardando === p.id} onClick={() => guardar(p)}>
                                                        <LuSave aria-hidden="true" />
                                                        {guardando === p.id ? "Guardando…" : "Guardar"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
