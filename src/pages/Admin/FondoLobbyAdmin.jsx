import { useRef, useState } from "react";
import { LuCheck, LuImage } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";
import { subirArchivo } from "./subirArchivo";
import { ponerFondoLobby } from "../../hooks/useFondoLobby";

/* =========================================================
   FONDO DEL LOBBY: uno de los que trae el juego (Normal,
   Halloween…) o una imagen propia. También se ve detrás de
   la tienda, la sala, el ranking y el inicio de sesión.
========================================================= */

export default function FondoLobbyAdmin() {
    const { datos, cargando, error, recargar } = useCarga("/admin/fondo-lobby");
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [avance, setAvance] = useState(null);
    const entrada = useRef(null);

    async function guardar(ruta) {
        try {
            const r = await api("/admin/fondo-lobby", { metodo: "PUT", body: { ruta } });
            ponerFondoLobby(r.ruta);
            setAviso({ texto: "Fondo cambiado. Los jugadores lo ven al abrir el juego.", tono: "ok" });
            recargar();
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        }
    }

    async function subir(e) {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;
        setAvance(0);
        try {
            await guardar(await subirArchivo(archivo, "foto", setAvance));
        } catch (err) {
            setAviso({ texto: err.message, tono: "error" });
        } finally {
            setAvance(null);
        }
    }

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando fondo…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;
    if (!datos) return null;

    const propio = !datos.listos.some((f) => f.ruta === datos.ruta);
    const opciones = propio ? [...datos.listos, { id: "propio", nombre: "Imagen subida", ruta: datos.ruta }] : datos.listos;

    return (
        <section className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 className="lg-card-title">Fondo del lobby</h3>
            <p className="lb-muted" style={{ margin: 0 }}>
                Se ve en el lobby, la tienda, la sala, el ranking y el inicio de sesión. Imagen horizontal (por ejemplo
                1376×768), hasta 3 MB.
            </p>
            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {opciones.map((f) => {
                    const elegido = f.ruta === datos.ruta;
                    return (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => !elegido && guardar(f.ruta)}
                            aria-pressed={elegido}
                            style={{
                                position: "relative",
                                width: 220,
                                padding: 0,
                                overflow: "hidden",
                                border: `3px solid ${elegido ? "#ffcf3e" : "rgba(255,255,255,.15)"}`,
                                borderRadius: 12,
                                background: "#111",
                                color: "#fff",
                                textAlign: "left",
                                cursor: elegido ? "default" : "pointer",
                            }}
                        >
                            <img src={f.ruta} alt="" style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }} />
                            <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", fontWeight: 700 }}>
                                {elegido && <LuCheck aria-hidden="true" color="#ffcf3e" />}
                                {f.nombre}
                                {elegido && <small style={{ marginLeft: "auto", color: "#ffcf3e" }}>En uso</small>}
                            </span>
                        </button>
                    );
                })}
            </div>
            <div className="lg-row">
                <input ref={entrada} type="file" hidden accept=".png,.jpg,.jpeg,.webp" onChange={subir} />
                <button type="button" className="lb-btn lb-btn-ghost" onClick={() => entrada.current?.click()} disabled={avance !== null}>
                    <LuImage aria-hidden="true" />
                    {avance !== null ? `Subiendo ${avance}%` : "Subir un fondo propio"}
                </button>
            </div>
        </section>
    );
}
