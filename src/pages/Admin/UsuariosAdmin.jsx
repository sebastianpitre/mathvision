import { useState } from "react";
import { LuGift, LuSearch, LuShieldCheck } from "react-icons/lu";

import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useCarga, formato, fecha } from "./useCarga";

/* =========================================================
   JUGADORES: buscar, ver su progreso, dar o quitar el rol
   de administrador y regalar oro o diamantes.
========================================================= */

export default function UsuariosAdmin() {
    const { user } = useAuth();
    const [buscar, setBuscar] = useState("");
    const [consulta, setConsulta] = useState("");
    const { datos, cargando, error, recargar } = useCarga(`/admin/usuarios?buscar=${encodeURIComponent(consulta)}`);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });

    async function cambiarRol(u) {
        const nuevo = u.rol === "admin" ? "jugador" : "admin";
        const pregunta =
            nuevo === "admin"
                ? `¿Dar acceso al panel de administración a "${u.username}"?`
                : `¿Quitarle el acceso al panel a "${u.username}"?`;

        if (!window.confirm(pregunta)) return;

        try {
            await api(`/admin/usuarios/${u.id}/rol`, { metodo: "PUT", body: { rol: nuevo } });
            setAviso({ texto: `"${u.username}" ahora es ${nuevo === "admin" ? "administrador" : "jugador"}.`, tono: "ok" });
            recargar();
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        }
    }

    async function regalar(u) {
        const oro = window.prompt(`¿Cuánto oro regalarle a "${u.username}"?`, "100");
        if (oro === null) return;
        const diamantes = window.prompt("¿Y cuántos diamantes?", "0");
        if (diamantes === null) return;

        try {
            await api(`/admin/usuarios/${u.id}/regalo`, {
                metodo: "POST",
                body: { oro: Number(oro) || 0, diamantes: Number(diamantes) || 0 },
            });
            setAviso({ texto: `Regalo entregado a "${u.username}".`, tono: "ok" });
            recargar();
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <form
                className="lb-card lg-filters"
                role="search"
                onSubmit={(e) => {
                    e.preventDefault();
                    setConsulta(buscar.trim());
                }}
            >
                <label className="lg-field" style={{ flex: "1 1 260px" }}>
                    <span>Buscar por usuario o correo</span>
                    <input className="lg-input" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Ej: maria" />
                </label>
                <button type="submit" className="lb-btn lb-btn-primary">
                    <LuSearch aria-hidden="true" />
                    Buscar
                </button>
            </form>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            {cargando && !datos ? (
                <div className="lb-card lg-empty" role="status">Cargando jugadores…</div>
            ) : error ? (
                <p className="lg-alert" role="alert">{error}</p>
            ) : datos.usuarios.length === 0 ? (
                <div className="lb-card lg-empty">No se encontraron jugadores.</div>
            ) : (
                <div className="lg-table-wrap" style={{ background: "var(--lb-surface)" }}>
                    <table className="lg-table">
                        <thead>
                            <tr>
                                <th scope="col">Jugador</th>
                                <th scope="col" className="lg-num">Nivel</th>
                                <th scope="col" className="lg-num">XP</th>
                                <th scope="col" className="lg-num">Oro</th>
                                <th scope="col" className="lg-num">Diamantes</th>
                                <th scope="col" className="lg-num">Partidas</th>
                                <th scope="col" className="lg-num">Aciertos</th>
                                <th scope="col">Último ingreso</th>
                                <th scope="col"><span className="lb-sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.usuarios.map((u) => (
                                <tr key={u.id}>
                                    <td style={{ minWidth: 190 }}>
                                        <strong>{u.display_name || u.username}</strong>
                                        {u.rol === "admin" && (
                                            <span className="lg-tag lg-tag-on" style={{ marginLeft: 6 }}>Admin</span>
                                        )}
                                        <div className="lb-muted">{u.email}</div>
                                    </td>
                                    <td className="lg-num">{u.level}</td>
                                    <td className="lg-num">{formato(u.xp)}</td>
                                    <td className="lg-num">{formato(u.coins)}</td>
                                    <td className="lg-num">{formato(u.gems)}</td>
                                    <td className="lg-num">{formato(u.games_played)}</td>
                                    <td className="lg-num">
                                        {u.questions_answered ? `${Math.round((100 * u.correct_answers) / u.questions_answered)}%` : "—"}
                                    </td>
                                    <td>{fecha(u.last_login)}</td>
                                    <td>
                                        <div className="lg-row" style={{ flexWrap: "nowrap" }}>
                                            <button type="button" className="lb-icon-btn" title="Regalar oro o diamantes" aria-label={`Regalar a ${u.username}`} onClick={() => regalar(u)}>
                                                <LuGift aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                className="lb-icon-btn"
                                                title={u.rol === "admin" ? "Quitar administrador" : "Hacer administrador"}
                                                aria-label={`${u.rol === "admin" ? "Quitar administrador a" : "Hacer administrador a"} ${u.username}`}
                                                onClick={() => cambiarRol(u)}
                                                disabled={u.id === user?.id}
                                            >
                                                <LuShieldCheck aria-hidden="true" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
