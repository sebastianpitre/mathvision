import { useRef, useState } from "react";
import { LuImage, LuSave, LuTrash2, LuUpload } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";
import { subirArchivo } from "./subirArchivo";
import FotoPerfil from "../../components/juego/FotoPerfil";

/* =========================================================
   FOTOS DE PERFIL Y MARCOS
   Se suben aquí y se usan como recompensa de los eventos.
   "Exclusivo": solo lo tiene quien lo gana. Si no, lo puede
   usar cualquiera desde su perfil.
========================================================= */

const VACIO = { tipo: "foto", nombre: "", ruta: "", exclusivo: true };

export default function PerfilesAdmin() {
    const { datos, cargando, error, recargar } = useCarga("/admin/cosmeticos");
    const [nuevo, setNuevo] = useState(VACIO);
    const [avance, setAvance] = useState(null);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const entrada = useRef(null);

    const mal = (e) => setAviso({ texto: e.message, tono: "error" });

    async function subir(e) {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;
        setAvance(0);
        try {
            const ruta = await subirArchivo(archivo, "foto", setAvance);
            setNuevo((n) => ({ ...n, ruta, nombre: n.nombre || archivo.name.replace(/\.[^.]+$/, "").slice(0, 80) }));
        } catch (err) {
            mal(err);
        } finally {
            setAvance(null);
        }
    }

    async function crear(e) {
        e.preventDefault();
        try {
            await api("/admin/cosmeticos", { metodo: "POST", body: nuevo });
            setAviso({ texto: `"${nuevo.nombre}" agregado.`, tono: "ok" });
            setNuevo({ ...VACIO, tipo: nuevo.tipo });
            recargar();
        } catch (err) {
            mal(err);
        }
    }

    async function cambiar(c, cambios) {
        try {
            await api(`/admin/cosmeticos/${c.id}`, { metodo: "PUT", body: { nombre: c.nombre, exclusivo: c.exclusivo, ...cambios } });
            recargar();
        } catch (err) {
            mal(err);
        }
    }

    async function borrar(c) {
        if (!window.confirm(`¿Borrar "${c.nombre}"? ${c.jugadores ? `Lo tienen ${c.jugadores} jugadores y lo perderán.` : ""}`)) return;
        try {
            await api(`/admin/cosmeticos/${c.id}`, { metodo: "DELETE" });
            recargar();
        } catch (err) {
            mal(err);
        }
    }

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;

    const grupos = [
        { tipo: "foto", titulo: "Fotos de perfil" },
        { tipo: "marco", titulo: "Marcos" },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div>
                <h2 className="lg-card-title">Fotos de perfil y marcos</h2>
                <p className="lb-muted">
                    Sube fotos o marcos para darlos como recompensa en los eventos. Los marcos deben ser PNG cuadrados con el
                    centro transparente (se ponen encima de la foto). Imágenes de hasta 3 MB.
                </p>
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            <form className="lb-card" onSubmit={crear} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h3 className="lg-card-title">Agregar</h3>
                <div className="lg-row" style={{ alignItems: "flex-end" }}>
                    <label className="lg-field">
                        <span>Tipo</span>
                        <select className="lg-select" value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}>
                            <option value="foto">Foto de perfil</option>
                            <option value="marco">Marco</option>
                        </select>
                    </label>
                    <label className="lg-field" style={{ flex: "1 1 200px" }}>
                        <span>Nombre</span>
                        <input className="lg-input" maxLength={80} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
                    </label>
                    <input ref={entrada} type="file" hidden accept=".png,.jpg,.jpeg,.webp" onChange={subir} />
                    <button type="button" className="lb-btn lb-btn-ghost" onClick={() => entrada.current?.click()} disabled={avance !== null}>
                        <LuUpload aria-hidden="true" />
                        {avance !== null ? `Subiendo ${avance}%` : "Subir imagen"}
                    </button>
                    {nuevo.ruta && (
                        <span className="lg-cosmetico" aria-label="Vista previa">
                            {nuevo.tipo === "marco" ? <FotoPerfil foto={null} marco={nuevo.ruta} /> : <img src={nuevo.ruta} alt="" />}
                        </span>
                    )}
                    <label className="lg-row" style={{ alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input type="checkbox" checked={nuevo.exclusivo} onChange={(e) => setNuevo({ ...nuevo, exclusivo: e.target.checked })} />
                        <span>Exclusivo (solo quien lo gane)</span>
                    </label>
                    <button type="submit" className="lb-btn lb-btn-primary" disabled={!nuevo.ruta || !nuevo.nombre.trim()}>
                        <LuSave aria-hidden="true" />
                        Agregar
                    </button>
                </div>
            </form>

            {grupos.map((g) => {
                const lista = datos.cosmeticos.filter((c) => c.tipo === g.tipo);
                return (
                    <section key={g.tipo} className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <h3 className="lg-card-title">{`${g.titulo} (${lista.length})`}</h3>
                        {lista.length === 0 ? (
                            <p className="lb-muted" style={{ margin: 0 }}>Todavía no hay.</p>
                        ) : (
                            <ul className="lg-cosmeticos">
                                {lista.map((c) => (
                                    <li key={c.id}>
                                        <span className="lg-cosmetico">
                                            {c.tipo === "marco" ? <FotoPerfil foto={null} marco={c.ruta} /> : <img src={c.ruta} alt="" />}
                                        </span>
                                        <input
                                            className="lg-input"
                                            defaultValue={c.nombre}
                                            aria-label="Nombre"
                                            onBlur={(e) => e.target.value.trim() && e.target.value !== c.nombre && cambiar(c, { nombre: e.target.value })}
                                        />
                                        <label className="lg-row" style={{ alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                                            <input type="checkbox" checked={c.exclusivo} onChange={(e) => cambiar(c, { exclusivo: e.target.checked })} />
                                            Exclusivo
                                        </label>
                                        <span className="lb-muted" style={{ fontSize: 13 }}>{`Lo tienen ${c.jugadores}`}</span>
                                        <button type="button" className="lb-icon-btn" onClick={() => borrar(c)} aria-label={`Borrar ${c.nombre}`}>
                                            <LuTrash2 aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                );
            })}
            <p className="lb-muted"><LuImage aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Para entregarlos, ponlos como recompensa de una misión en la pestaña Eventos.</p>
        </div>
    );
}
