import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LuLogIn, LuUserPlus } from "react-icons/lu";

import { useAuth } from "../context/AuthContext";
import assets from "../data/mock/assets.json";

import "../styles/ludo.css";

/* =========================================================
   ENTRAR / CREAR CUENTA
   Si ya hay sesión, va directo al lobby (o a la página que
   intentaba abrir).
========================================================= */

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { loading, isAuthenticated, login, register } = useAuth();

    const destino = location.state?.volverA || "/lobby";

    const [modo, setModo] = useState("login");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);

    if (loading) {
        return (
            <div className="pantalla-carga" role="status">
                <span className="pantalla-carga-spinner" aria-hidden="true" />
                <span>Verificando sesión…</span>
            </div>
        );
    }

    if (isAuthenticated) return <Navigate to={destino} replace />;

    async function enviar(e) {
        e.preventDefault();
        setError("");
        setEnviando(true);

        try {
            if (modo === "registro") await register(username, email, password);
            else await login(username, password);

            navigate(destino, { replace: true });
        } catch (err) {
            setError(err.message || "No fue posible completar la operación.");
        } finally {
            setEnviando(false);
        }
    }

    const esRegistro = modo === "registro";

    return (
        <div className="lg" style={{ display: "grid", placeItems: "center", padding: 16 }}>
            <div className="lb-bg" aria-hidden="true" style={{ backgroundImage: `url(${assets.backgrounds.lobby})` }} />

            <main className="lb-card" style={{ position: "relative", zIndex: 1, width: "min(420px, 100%)", padding: "clamp(22px, 4vw, 34px)" }}>
                <p className="lb-eyebrow">Juega · Aprende · Conecta</p>
                <h1 className="lg-h1" style={{ marginBottom: 18 }}>
                    LUDO<span style={{ color: "var(--lb-accent)" }}>GAMIF</span>
                </h1>

                <div className="lg-tabs" role="tablist" aria-label="Elige una opción" style={{ marginBottom: 18 }}>
                    <button type="button" role="tab" className="lg-tab" style={{ flex: 1, justifyContent: "center" }} aria-selected={!esRegistro} onClick={() => { setModo("login"); setError(""); }}>
                        Entrar
                    </button>
                    <button type="button" role="tab" className="lg-tab" style={{ flex: 1, justifyContent: "center" }} aria-selected={esRegistro} onClick={() => { setModo("registro"); setError(""); }}>
                        Crear cuenta
                    </button>
                </div>

                <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <label className="lg-field">
                        <span>{esRegistro ? "Usuario" : "Usuario o correo"}</span>
                        <input
                            className="lg-input"
                            required
                            autoComplete="username"
                            minLength={esRegistro ? 3 : undefined}
                            maxLength={esRegistro ? 30 : 150}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </label>

                    {esRegistro && (
                        <label className="lg-field">
                            <span>Correo</span>
                            <input
                                className="lg-input"
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </label>
                    )}

                    <label className="lg-field">
                        <span>Contraseña</span>
                        <input
                            className="lg-input"
                            type="password"
                            required
                            minLength={esRegistro ? 6 : undefined}
                            autoComplete={esRegistro ? "new-password" : "current-password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {esRegistro && <small className="lg-help">Mínimo 6 caracteres.</small>}
                    </label>

                    {error && <p className="lg-alert" role="alert">{error}</p>}

                    <button type="submit" className="lb-btn lb-btn-primary lb-btn-block" disabled={enviando}>
                        {esRegistro ? <LuUserPlus aria-hidden="true" /> : <LuLogIn aria-hidden="true" />}
                        {enviando ? "Un momento…" : esRegistro ? "Crear mi cuenta" : "Entrar a jugar"}
                    </button>
                </form>
            </main>
        </div>
    );
}
