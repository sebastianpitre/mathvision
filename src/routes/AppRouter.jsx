import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

/*
 * Cada pantalla se descarga solo cuando se abre. Así el
 * login carga rápido y el 3D (Three.js + personajes) no se
 * baja hasta que hace falta.
 */
const Login = lazy(() => import("../pages/Login"));
const Lobby = lazy(() => import("../pages/Lobby"));
const World = lazy(() => import("../pages/World"));
const Character = lazy(() => import("../pages/Character"));
const Profile = lazy(() => import("../pages/Profile/Profile"));
const Niveles = lazy(() => import("../pages/Preguntas/Niveles"));
const JuegoPreguntas = lazy(() => import("../games/MathMillonario/MathMillonario"));
const EscapeAlgebra = lazy(() => import("../games/EscapeAlgebra/EscapeAlgebra"));
const TriquiGame = lazy(() => import("../games/triqui/TriquiGame"));
const Admin = lazy(() => import("../pages/Admin/Admin"));

function Cargando() {
    return (
        <div className="pantalla-carga" role="status" aria-live="polite">
            <span className="pantalla-carga-spinner" aria-hidden="true" />
            <span>Cargando…</span>
        </div>
    );
}

/* Pantallas que necesitan sesión: sin sesión → al login. */
function Privada({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <Cargando />;
    if (!user) return <Navigate to="/" replace state={{ volverA: location.pathname }} />;

    return children;
}

/* Solo administradores. */
function SoloAdmin({ children }) {
    const { user, loading, esAdmin } = useAuth();

    if (loading) return <Cargando />;
    if (!user) return <Navigate to="/" replace />;
    if (!esAdmin) return <Navigate to="/lobby" replace />;

    return children;
}

function AppRouter() {
    return (
        <Suspense fallback={<Cargando />}>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route path="/lobby" element={<Privada><Lobby /></Privada>} />
                <Route path="/world" element={<Privada><World /></Privada>} />
                <Route path="/character" element={<Privada><Character /></Privada>} />
                <Route path="/tienda" element={<Privada><Character /></Privada>} />
                <Route path="/profile" element={<Privada><Profile /></Privada>} />
                <Route path="/profile/:id" element={<Privada><Profile /></Privada>} />

                <Route path="/games/preguntas" element={<Privada><Niveles /></Privada>} />
                <Route path="/games/preguntas/:nivelId" element={<Privada><JuegoPreguntas /></Privada>} />
                <Route path="/games/escape-algebra" element={<Privada><EscapeAlgebra /></Privada>} />
                <Route path="/games/triqui" element={<Privada><TriquiGame /></Privada>} />
                <Route path="/triqui-local" element={<TriquiGame mode="local" />} />

                <Route path="/admin" element={<SoloAdmin><Admin /></SoloAdmin>} />

                {/* Direcciones viejas que pueden estar guardadas */}
                <Route path="/games/math-millonario" element={<Navigate to="/games/preguntas" replace />} />
                <Route path="/dashboard" element={<Navigate to="/lobby" replace />} />
                <Route path="/games" element={<Navigate to="/lobby" replace />} />
                <Route path="/games/rooms" element={<Navigate to="/world" replace />} />

                <Route path="*" element={<Navigate to="/lobby" replace />} />
            </Routes>
        </Suspense>
    );
}

export default AppRouter;
