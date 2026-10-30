import { Fragment, useState } from "react";
import { LuBadgeCheck, LuCheck, LuFlag, LuGift, LuLock, LuLockOpen, LuMic, LuMicOff, LuPencil, LuSave, LuSearch, LuShieldCheck, LuX } from "react-icons/lu";

import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useCarga, formato, fecha } from "./useCarga";

/* =========================================================
   JUGADORES: buscar, ver su progreso, cambiar su nivel, oro
   y diamantes, bloquear la cuenta, dar o quitar el rol de
   administrador y regalar oro o diamantes.
========================================================= */

export default function UsuariosAdmin() {
    const { user } = useAuth();
    const [buscar, setBuscar] = useState("");
    const [consulta, setConsulta] = useState("");
    const [porReportes, setPorReportes] = useState(false);
    const { datos, cargando, error, recargar } = useCarga(
        `/admin/usuarios?buscar=${encodeURIComponent(consulta)}${porReportes ? "&orden=reportes" : ""}`
    );
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [editando, setEditando] = useState(null); // { id, nivel, oro, diamantes }
    const [viendoReportes, setViendoReportes] = useState(null); // { id, lista }

    async function cambiarVerificado(u) {
        const verificar = !u.verificado;
        try {
            await api(`/admin/usuarios/${u.id}/verificado`, { metodo: "PUT", body: { verificado: verificar } });
            setAviso({ texto: `"${u.username}" ${verificar ? "ahora está verificado ✔" : "ya no está verificado"}.`, tono: "ok" });
            recargar();
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        }
    }

    async function cambiarVoz(u) {
        const bloquear = !u.voz_bloqueada;
        try {
            await api(`/admin/usuarios/${u.id}/voz`, { metodo: "PUT", body: { bloqueada: bloquear } });
            setAviso({ texto: `"${u.username}" ${bloquear ? "ya no puede hablar" : "puede volver a hablar"}.`, tono: "ok" });
            recargar();
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        }
    }

    async function verReportes(u) {
        if (viendoReportes?.id === u.id) return setViendoReportes(null);
        try {
            const r = await api(`/admin/usuarios/${u.id}/reportes`);
            setViendoReportes({ id: u.id, lista: r.reportes });
            setEditando(null);
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        }
    }

    async function marcarRevisados(u) {
        try {
            await api(`/admin/usuarios/${u.id}/reportes/revisar`, { metodo: "POST" });
            setAviso({ texto: `Reportes de "${u.username}" revisados. Si tenía la voz quitada por reportes, ya puede hablar.`, tono: "ok" });
            setViendoReportes(null);
            recargar();
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        }
    }

    async function guardarProgreso(u) {
        try {
            await api(`/admin/usuarios/${u.id}/progreso`, {
                metodo: "PUT",
                body: { nivel: Number(editando.nivel), oro: Number(editando.oro), diamantes: Number(editando.diamantes) },
            });
            setAviso({ texto: `Progreso de "${u.username}" actualizado.`, tono: "ok" });
            setEditando(null);
            recargar();
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        }
    }

    async function cambiarBloqueo(u) {
        const bloquear = !u.bloqueado;
        const pregunta = bloquear
            ? `¿Bloquear a "${u.username}"? No podrá entrar ni jugar hasta que lo desbloquees.`
            : `¿Desbloquear a "${u.username}"?`;
        if (!window.confirm(pregunta)) return;

        try {
            await api(`/admin/usuarios/${u.id}/bloqueo`, { metodo: "PUT", body: { bloqueado: bloquear } });
            setAviso({ texto: `"${u.username}" ${bloquear ? "quedó bloqueado" : "ya puede jugar"}.`, tono: "ok" });
            recargar();
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        }
    }

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
        const tickets = window.prompt("¿Y cuántos tiquetes 🎫 para GiraGamif?", "0");
        if (tickets === null) return;

        try {
            if ((Number(oro) || 0) + (Number(diamantes) || 0) > 0) {
                await api(`/admin/usuarios/${u.id}/regalo`, {
                    metodo: "POST",
                    body: { oro: Number(oro) || 0, diamantes: Number(diamantes) || 0 },
                });
            }
            if (Number(tickets) > 0) await api(`/admin/usuarios/${u.id}/tickets`, { metodo: "POST", body: { cantidad: Number(tickets) } });
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
                <label className="lg-row" style={{ alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={porReportes} onChange={(e) => setPorReportes(e.target.checked)} />
                    <span>Más reportados primero</span>
                </label>
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
                                <th scope="col" className="lg-num" title="Reportes sin revisar / total">Reportes</th>
                                <th scope="col">Último ingreso</th>
                                <th scope="col"><span className="lb-sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.usuarios.map((u) => (
                                <Fragment key={u.id}>
                                <tr style={u.bloqueado ? { opacity: 0.6 } : undefined}>
                                    <td style={{ minWidth: 190 }}>
                                        <strong>{u.display_name || u.username}</strong>
                                        {u.rol === "admin" && (
                                            <span className="lg-tag lg-tag-on" style={{ marginLeft: 6 }}>Admin</span>
                                        )}
                                        {u.bloqueado && (
                                            <span className="lg-tag lg-tag-off" style={{ marginLeft: 6 }}>Bloqueado</span>
                                        )}
                                        {u.verificado && (
                                            <span className="lg-tag lg-tag-on" style={{ marginLeft: 6 }}>
                                                <LuBadgeCheck aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 3 }} />
                                                Verificado
                                            </span>
                                        )}
                                        {u.voz_bloqueada && (
                                            <span className="lg-tag lg-tag-off" style={{ marginLeft: 6 }}>Sin voz</span>
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
                                    <td className="lg-num">
                                        {Number(u.reportes_total) > 0 ? (
                                            <button
                                                type="button"
                                                className={`lg-tag ${Number(u.reportes_pendientes) > 0 ? "lg-tag-off" : ""}`}
                                                style={{ cursor: "pointer", border: 0 }}
                                                onClick={() => verReportes(u)}
                                                title="Ver motivos"
                                                aria-label={`Ver reportes de ${u.username}`}
                                            >
                                                <LuFlag aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />
                                                {`${u.reportes_pendientes} / ${u.reportes_total}`}
                                            </button>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td>{fecha(u.last_login)}</td>
                                    <td>
                                        <div className="lg-row" style={{ flexWrap: "nowrap" }}>
                                            <button
                                                type="button"
                                                className="lb-icon-btn"
                                                title="Cambiar nivel, oro y diamantes"
                                                aria-label={`Editar progreso de ${u.username}`}
                                                onClick={() => setEditando({ id: u.id, nivel: u.level, oro: u.coins, diamantes: u.gems })}
                                            >
                                                <LuPencil aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                className="lb-icon-btn"
                                                title={u.bloqueado ? "Desbloquear cuenta" : "Bloquear cuenta"}
                                                aria-label={`${u.bloqueado ? "Desbloquear" : "Bloquear"} a ${u.username}`}
                                                onClick={() => cambiarBloqueo(u)}
                                                disabled={u.id === user?.id}
                                            >
                                                {u.bloqueado ? <LuLockOpen aria-hidden="true" /> : <LuLock aria-hidden="true" />}
                                            </button>
                                            <button
                                                type="button"
                                                className="lb-icon-btn"
                                                title={u.verificado ? "Quitar verificado" : "Verificar (chulo azul en todo el juego)"}
                                                aria-label={`${u.verificado ? "Quitar verificado a" : "Verificar a"} ${u.username}`}
                                                onClick={() => cambiarVerificado(u)}
                                                style={u.verificado ? { color: "#1d9bf0", borderColor: "#1d9bf0" } : undefined}
                                            >
                                                <LuBadgeCheck aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                className="lb-icon-btn"
                                                title={u.voz_bloqueada ? "Devolverle la voz" : "Quitarle la voz"}
                                                aria-label={`${u.voz_bloqueada ? "Devolver la voz a" : "Quitar la voz a"} ${u.username}`}
                                                onClick={() => cambiarVoz(u)}
                                                style={u.voz_bloqueada ? { color: "#dc2626" } : undefined}
                                            >
                                                {u.voz_bloqueada ? <LuMicOff aria-hidden="true" /> : <LuMic aria-hidden="true" />}
                                            </button>
                                            <button type="button" className="lb-icon-btn" title="Regalar oro, diamantes o tiquetes" aria-label={`Regalar a ${u.username}`} onClick={() => regalar(u)}>
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
                                {viendoReportes?.id === u.id && (
                                    <tr>
                                        <td colSpan={10}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                                    {viendoReportes.lista.map((rep) => (
                                                        <li key={rep.id} style={rep.revisado ? { opacity: 0.55 } : undefined}>
                                                            <strong>{rep.motivo_texto}</strong>
                                                            {` · por ${rep.reportante} · en ${rep.contexto} · ${fecha(rep.creado_en)}`}
                                                            {rep.revisado && " · revisado"}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="lg-row">
                                                    {Number(u.reportes_pendientes) > 0 && (
                                                        <button type="button" className="lb-btn lb-btn-primary lb-btn-sm" onClick={() => marcarRevisados(u)}>
                                                            <LuCheck aria-hidden="true" />
                                                            Marcar como revisados
                                                        </button>
                                                    )}
                                                    <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => setViendoReportes(null)}>
                                                        <LuX aria-hidden="true" />
                                                        Cerrar
                                                    </button>
                                                    <span className="lb-muted">Los reportes sin revisar cuentan para quitar la voz automáticamente.</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {editando?.id === u.id && (
                                    <tr>
                                        <td colSpan={10}>
                                            <form
                                                className="lg-row"
                                                style={{ alignItems: "flex-end" }}
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    guardarProgreso(u);
                                                }}
                                            >
                                                <label className="lg-field">
                                                    <span>Nivel (1 a 100)</span>
                                                    <input className="lg-input" style={{ width: 100 }} type="number" min={1} max={100} value={editando.nivel} onChange={(e) => setEditando({ ...editando, nivel: e.target.value })} />
                                                </label>
                                                <label className="lg-field">
                                                    <span>Oro</span>
                                                    <input className="lg-input" style={{ width: 120 }} type="number" min={0} value={editando.oro} onChange={(e) => setEditando({ ...editando, oro: e.target.value })} />
                                                </label>
                                                <label className="lg-field">
                                                    <span>Diamantes</span>
                                                    <input className="lg-input" style={{ width: 110 }} type="number" min={0} value={editando.diamantes} onChange={(e) => setEditando({ ...editando, diamantes: e.target.value })} />
                                                </label>
                                                <button type="submit" className="lb-btn lb-btn-primary lb-btn-sm">
                                                    <LuSave aria-hidden="true" />
                                                    Guardar
                                                </button>
                                                <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => setEditando(null)}>
                                                    <LuX aria-hidden="true" />
                                                    Cancelar
                                                </button>
                                                <span className="lb-muted">Si cambias el nivel, su XP queda al comienzo de ese nivel.</span>
                                            </form>
                                        </td>
                                    </tr>
                                )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
