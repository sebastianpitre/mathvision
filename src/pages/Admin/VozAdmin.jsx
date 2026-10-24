import { useEffect, useState } from "react";
import { LuSave } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";

/* =========================================================
   VOZ Y REPORTES
   Reglas del botón de hablar (walkie-talkie) y cuántos
   reportes quitan la voz a un jugador.
========================================================= */

export default function VozAdmin() {
    const { datos, cargando, error } = useCarga("/admin/voz");
    const [voz, setVoz] = useState(null);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (datos) setVoz(datos.voz);
    }, [datos]);

    async function guardar(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            const r = await api("/admin/voz", {
                metodo: "PUT",
                body: { voz: { ...voz, segundos: Number(voz.segundos), espera: Number(voz.espera), max_reportes: Number(voz.max_reportes) } },
            });
            setVoz(r.voz);
            setAviso({ texto: "Guardado. Se aplica de inmediato.", tono: "ok" });
        } catch (err) {
            setAviso({ texto: err.message, tono: "error" });
        } finally {
            setGuardando(false);
        }
    }

    if (cargando && !voz) return <div className="lb-card lg-empty" role="status">Cargando…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;
    if (!voz) return null;

    const numero = (clave, min, max) => (
        <input
            className="lg-input"
            style={{ width: 100 }}
            type="number"
            min={min}
            max={max}
            value={voz[clave]}
            onChange={(e) => setVoz({ ...voz, [clave]: e.target.value })}
        />
    );

    return (
        <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div>
                <h2 className="lg-card-title">Voz y reportes</h2>
                <p className="lb-muted">
                    En la sala y en las partidas hay un botón para hablar tipo walkie-talkie: se mantiene presionado,
                    habla una sola persona a la vez y después hay una espera corta. Para quitarle la voz a un jugador
                    o ver sus reportes, ve a la pestaña Jugadores.
                </p>
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            <section className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label className="lg-row" style={{ alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={voz.activa} onChange={(e) => setVoz({ ...voz, activa: e.target.checked })} />
                    <strong>Voz activada para todos</strong>
                </label>
                <div className="lg-row" style={{ alignItems: "flex-end" }}>
                    <label className="lg-field">
                        <span>Segundos máximos por turno (1 a 15)</span>
                        {numero("segundos", 1, 15)}
                    </label>
                    <label className="lg-field">
                        <span>Espera para volver a hablar, en segundos (0 a 60)</span>
                        {numero("espera", 0, 60)}
                    </label>
                    <label className="lg-field">
                        <span>Reportes que quitan la voz (1 a 100)</span>
                        {numero("max_reportes", 1, 100)}
                    </label>
                </div>
                <p className="lb-muted" style={{ margin: 0 }}>
                    Cuenta los jugadores distintos que lo reportaron y que aún no revisas. Al marcarlos como revisados,
                    vuelve a poder hablar (salvo que le hayas quitado la voz a mano).
                </p>
            </section>

            <div>
                <button type="submit" className="lb-btn lb-btn-primary" disabled={guardando}>
                    <LuSave aria-hidden="true" />
                    {guardando ? "Guardando…" : "Guardar"}
                </button>
            </div>
        </form>
    );
}
