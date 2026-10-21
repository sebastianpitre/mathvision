import { useEffect, useState } from "react";
import { LuSave } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";

/* =========================================================
   TIENDA: precio de cada personaje (oro y/o diamantes),
   nivel mínimo y si se muestra en la tienda.
   Precio 0 en oro y en diamantes = gratis para todos.
========================================================= */

export default function TiendaAdmin() {
    const { datos, cargando, error } = useCarga("/admin/personajes");
    const [filas, setFilas] = useState([]);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [guardando, setGuardando] = useState(null);

    useEffect(() => {
        if (datos) setFilas(datos.personajes);
    }, [datos]);

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
                },
            });

            setFilas((lista) => lista.map((x) => (x.id === p.id ? { ...x, cambiado: false } : x)));
            setAviso({ texto: `"${p.name}" guardado.`, tono: "ok" });
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        } finally {
            setGuardando(null);
        }
    }

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando tienda…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div>
                <h2 className="lg-card-title">Personajes de la tienda</h2>
                <p className="lb-muted">
                    Pon precio en oro, en diamantes o en ambos (el jugador elige con qué pagar). Con los dos
                    en 0 el personaje es gratis. Los jugadores ganan oro y diamantes en el juego de preguntas
                    y al subir de nivel (+25 de oro y +1 diamante por nivel).
                </p>
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            <div className="lg-table-wrap" style={{ background: "var(--lb-surface)" }}>
                <table className="lg-table">
                    <thead>
                        <tr>
                            <th scope="col">Personaje</th>
                            <th scope="col">Nombre</th>
                            <th scope="col">Oro</th>
                            <th scope="col">Diamantes</th>
                            <th scope="col">Nivel mínimo</th>
                            <th scope="col">Orden</th>
                            <th scope="col">En tienda</th>
                            <th scope="col" className="lg-num">Vendidos</th>
                            <th scope="col"><span className="lb-sr-only">Guardar</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filas.map((p) => (
                            <tr key={p.id}>
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
                                    <input className="lg-input" style={{ width: 100 }} type="number" min={0} value={p.precio_oro} aria-label={`Precio en oro de ${p.name}`} onChange={(e) => cambiar(p.id, "precio_oro", e.target.value)} />
                                </td>
                                <td>
                                    <input className="lg-input" style={{ width: 90 }} type="number" min={0} value={p.precio_diamantes} aria-label={`Precio en diamantes de ${p.name}`} onChange={(e) => cambiar(p.id, "precio_diamantes", e.target.value)} />
                                </td>
                                <td>
                                    <input className="lg-input" style={{ width: 80 }} type="number" min={1} max={100} value={p.nivel_minimo} aria-label={`Nivel mínimo de ${p.name}`} onChange={(e) => cambiar(p.id, "nivel_minimo", e.target.value)} />
                                </td>
                                <td>
                                    <input className="lg-input" style={{ width: 72 }} type="number" value={p.orden} aria-label={`Orden de ${p.name}`} onChange={(e) => cambiar(p.id, "orden", e.target.value)} />
                                </td>
                                <td>
                                    <input type="checkbox" style={{ width: 20, height: 20 }} checked={p.activo} aria-label={`Mostrar ${p.name} en la tienda`} onChange={(e) => cambiar(p.id, "activo", e.target.checked)} />
                                </td>
                                <td className="lg-num">{p.vendidos}</td>
                                <td>
                                    <button
                                        type="button"
                                        className={`lb-btn lb-btn-sm ${p.cambiado ? "lb-btn-primary" : "lb-btn-ghost"}`}
                                        disabled={!p.cambiado || guardando === p.id}
                                        onClick={() => guardar(p)}
                                    >
                                        <LuSave aria-hidden="true" />
                                        {guardando === p.id ? "…" : "Guardar"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="lb-muted">
                Para agregar un personaje nuevo, copia su modelo <code>.vrm</code> a
                {" "}<code>public/models/characters/</code> y su foto a <code>public/models/characters/img/</code>,
                y agrégalo en una migración (ver README).
            </p>
        </div>
    );
}
