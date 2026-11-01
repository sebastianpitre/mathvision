import { useEffect, useState } from "react";
import { LuSave } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";

/* =========================================================
   MUNDO 3D: colores del cielo y del suelo, y qué personajes
   se pueden usar al caminar. Solo .glb (pesan menos que los
   .vrm y el celular aguanta más jugadores a la vez).
========================================================= */

export default function MundoAdmin() {
    const { datos, cargando, error, recargar } = useCarga("/admin/mundo");
    const [form, setForm] = useState(null);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (datos?.config) setForm({ ...datos.config, personajes: [...datos.config.personajes] });
    }, [datos]);

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;
    if (!form) return null;

    const marcado = new Set(form.personajes);
    const glb = datos.personajes.filter((p) => p.glb);
    const otros = datos.personajes.filter((p) => !p.glb);

    const alternar = (id) =>
        setForm((f) => ({ ...f, personajes: f.personajes.includes(id) ? f.personajes.filter((x) => x !== id) : [...f.personajes, id] }));

    async function guardar(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            await api("/admin/mundo", { metodo: "PUT", body: form });
            setAviso({ texto: "Mundo guardado. Los que ya están adentro lo verán al volver a entrar.", tono: "ok" });
            recargar();
        } catch (err) {
            setAviso({ texto: err.message, tono: "error" });
        } finally {
            setGuardando(false);
        }
    }

    return (
        <form style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }} onSubmit={guardar}>
            <div>
                <h2 className="lg-card-title">Mundo 3D</h2>
                <p className="lb-muted">
                    Un lobby para caminar donde entran todos (botón "Mundo 3D" abajo en el lobby). Por ahora es un suelo y un cielo;
                    después se irá construyendo el colegio. Caben hasta 40 jugadores a la vez.
                </p>
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            <div className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 className="lg-card-title">Colores</h3>
                <div className="lg-row" style={{ alignItems: "flex-end" }}>
                    <label className="lg-field">
                        <span>Cielo</span>
                        <input type="color" value={form.cielo} onChange={(e) => setForm({ ...form, cielo: e.target.value })} style={{ width: 90, height: 42 }} />
                    </label>
                    <label className="lg-field">
                        <span>Suelo</span>
                        <input type="color" value={form.suelo} onChange={(e) => setForm({ ...form, suelo: e.target.value })} style={{ width: 90, height: 42 }} />
                    </label>
                    <div
                        aria-label="Vista previa"
                        style={{ width: 220, height: 90, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid var(--lb-border, #333)" }}
                    >
                        <div style={{ flex: 1.2, background: form.cielo }} />
                        <div style={{ flex: 1, background: form.suelo }} />
                    </div>
                </div>
            </div>

            <div className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 className="lg-card-title">{`Personajes del mundo (${form.personajes.length})`}</h3>
                <p className="lb-muted" style={{ margin: 0 }}>
                    Marca los que se pueden usar. Solo sirven los modelos <b>.glb</b> (se suben en la pestaña "Personajes"). Cada jugador elige uno al
                    entrar; no necesita haberlo comprado.
                </p>
                {glb.length === 0 ? (
                    <p className="lg-alert" style={{ margin: 0 }}>
                        Aún no hay personajes .glb. Sube uno en "Personajes" (Subir modelo .vrm o .glb) y vuelve aquí.
                    </p>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                        {glb.map((p) => (
                            <label
                                key={p.id}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: 8,
                                    borderRadius: 10,
                                    cursor: "pointer",
                                    border: `2px solid ${marcado.has(p.id) ? "var(--lb-primary, #60a5fa)" : "transparent"}`,
                                    background: "rgba(255,255,255,.05)",
                                }}
                            >
                                {p.thumbnail_path ? <img src={p.thumbnail_path} alt="" style={{ width: 80, height: 80, objectFit: "contain" }} /> : <span style={{ fontSize: 40 }}>🧍</span>}
                                <span style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600 }}>
                                    <input type="checkbox" checked={marcado.has(p.id)} onChange={() => alternar(p.id)} />
                                    {p.name}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
                {otros.length > 0 && (
                    <p className="lb-muted" style={{ margin: 0 }}>
                        {`No sirven en el mundo (son .vrm): ${otros.map((p) => p.name).join(", ")}.`}
                    </p>
                )}
            </div>

            <div>
                <button type="submit" className="lb-btn lb-btn-primary" disabled={guardando}>
                    <LuSave aria-hidden="true" />
                    {guardando ? "Guardando…" : "Guardar mundo"}
                </button>
            </div>
        </form>
    );
}
