import { useState } from "react";
import { LuDownload, LuEye, LuEyeOff, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";

import Recompensas from "../../components/common/Recompensas";
import { NOMBRE_DIFICULTAD } from "../../data/textos";
import { api } from "../../services/api";
import { useCarga, formato } from "./useCarga";
import EditorNivel from "./EditorNivel";
import { descargarJson, EJEMPLO_JSON } from "./archivos";

/* =========================================================
   NIVELES DEL JUEGO DE PREGUNTAS
   Lista con estadísticas de cada nivel + crear / editar.
========================================================= */

export default function NivelesAdmin() {
    const { datos, cargando, error, recargar } = useCarga("/admin/niveles");
    const [editando, setEditando] = useState(null); // null | "nuevo" | id
    const [aviso, setAviso] = useState({ texto: "", tono: "" });

    const avisar = (texto, tono = "ok") => setAviso({ texto, tono });

    async function cambiarActivo(nivel) {
        try {
            await api(`/admin/niveles/${nivel.id}`, {
                metodo: "PUT",
                body: { nivel: { ...nivel, activo: !nivel.activo } },
            });
            avisar(nivel.activo ? `"${nivel.nombre}" quedó oculto para los jugadores.` : `"${nivel.nombre}" ya está publicado.`);
            recargar();
        } catch (e) {
            avisar(e.message, "error");
        }
    }

    async function borrar(nivel) {
        const ok = window.confirm(
            `¿Borrar el nivel "${nivel.nombre}" y sus ${nivel.total_preguntas} preguntas?\n\n` +
            "Las partidas ya jugadas se conservan en las estadísticas generales. " +
            "Si solo quieres que no se vea, mejor usa «Ocultar»."
        );
        if (!ok) return;

        try {
            await api(`/admin/niveles/${nivel.id}`, { metodo: "DELETE" });
            avisar(`Nivel "${nivel.nombre}" borrado.`);
            recargar();
        } catch (e) {
            avisar(e.message, "error");
        }
    }

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando niveles…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;

    const niveles = datos.niveles;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div className="lg-row">
                <div>
                    <h2 className="lg-card-title">{`${niveles.length} niveles`}</h2>
                    <p className="lb-muted">
                        Cada nivel es un grupo de preguntas de un grado y una asignatura. Crea uno y adjunta el
                        archivo JSON con las preguntas.
                    </p>
                </div>
                <span className="lg-spacer" />
                <button
                    type="button"
                    className="lb-btn lb-btn-ghost lb-btn-sm"
                    onClick={() => descargarJson(EJEMPLO_JSON, "ejemplo-nivel.json")}
                >
                    <LuDownload aria-hidden="true" />
                    JSON de ejemplo
                </button>
                <button type="button" className="lb-btn lb-btn-primary" onClick={() => setEditando("nuevo")}>
                    <LuPlus aria-hidden="true" />
                    Nuevo nivel
                </button>
            </div>

            {aviso.texto && (
                <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>
            )}

            {niveles.length === 0 ? (
                <div className="lb-card lg-empty">Aún no hay niveles. Crea el primero con «Nuevo nivel».</div>
            ) : (
                <div className="lg-table-wrap" style={{ background: "var(--lb-surface)" }}>
                    <table className="lg-table">
                        <thead>
                            <tr>
                                <th scope="col">Nivel</th>
                                <th scope="col">Grado</th>
                                <th scope="col">Dificultad</th>
                                <th scope="col" className="lg-num">Preguntas</th>
                                <th scope="col" className="lg-num">Partidas</th>
                                <th scope="col" className="lg-num">Jugadores</th>
                                <th scope="col" className="lg-num">Aciertos</th>
                                <th scope="col">Premio</th>
                                <th scope="col">Estado</th>
                                <th scope="col"><span className="lb-sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {niveles.map((n) => (
                                <tr key={n.id}>
                                    <td style={{ minWidth: 190 }}>
                                        <strong>{n.nombre}</strong>
                                        <div className="lb-muted">{n.asignatura}</div>
                                    </td>
                                    <td>{n.grado}</td>
                                    <td>
                                        <span className={`lg-tag lg-tag-${n.dificultad}`}>
                                            {NOMBRE_DIFICULTAD[n.dificultad]}
                                        </span>
                                    </td>
                                    <td className="lg-num">
                                        {`${Math.min(n.preguntas_por_partida, n.total_preguntas)} de ${n.total_preguntas}`}
                                    </td>
                                    <td className="lg-num">{formato(n.partidas)}</td>
                                    <td className="lg-num">{formato(n.jugadores)}</td>
                                    <td className="lg-num">{n.promedio_aciertos == null ? "—" : `${n.promedio_aciertos}%`}</td>
                                    <td>
                                        <Recompensas xp={n.recompensa_xp} oro={n.recompensa_oro} diamantes={n.recompensa_diamantes} />
                                    </td>
                                    <td>
                                        <span className={`lg-tag ${n.activo ? "lg-tag-on" : "lg-tag-off"}`}>
                                            {n.activo ? "Publicado" : "Oculto"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="lg-row" style={{ flexWrap: "nowrap" }}>
                                            <button
                                                type="button"
                                                className="lb-icon-btn"
                                                title="Editar"
                                                aria-label={`Editar ${n.nombre}`}
                                                onClick={() => setEditando(n.id)}
                                            >
                                                <LuPencil aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                className="lb-icon-btn"
                                                title={n.activo ? "Ocultar" : "Publicar"}
                                                aria-label={`${n.activo ? "Ocultar" : "Publicar"} ${n.nombre}`}
                                                onClick={() => cambiarActivo(n)}
                                            >
                                                {n.activo ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />}
                                            </button>
                                            <button
                                                type="button"
                                                className="lb-icon-btn lb-icon-btn-danger"
                                                title="Borrar"
                                                aria-label={`Borrar ${n.nombre}`}
                                                onClick={() => borrar(n)}
                                            >
                                                <LuTrash2 aria-hidden="true" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editando !== null && (
                <EditorNivel
                    nivelId={editando === "nuevo" ? null : editando}
                    sugerencias={datos.sugerencias}
                    recompensasSugeridas={datos.recompensas_sugeridas}
                    onCerrar={() => setEditando(null)}
                    onGuardado={(texto) => {
                        setEditando(null);
                        avisar(texto);
                        recargar();
                    }}
                />
            )}
        </div>
    );
}
