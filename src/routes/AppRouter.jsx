import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { socket } from "../services/socket";
import Notificaciones from "../components/juego/Notificaciones";
import MenuFlotante from "../components/juego/MenuFlotante";
import VozGlobal from "../components/juego/VozGlobal";
import MusicaGlobal from "../components/juego/MusicaGlobal";
import { sonar } from "../services/sonidos";

/*
 * Cada pantalla se descarga solo cuando se abre. Así el
 * login carga rápido y el 3D (Three.js + personajes) no se
 * baja hasta que hace falta.
 */
const Login = lazy(() => import("../pages/Login"));
const Lobby = lazy(() => import("../pages/Lobby"));
const Character = lazy(() => import("../pages/Character"));
const Profile = lazy(() => import("../pages/Profile/Profile"));
const Niveles = lazy(() => import("../pages/Preguntas/Niveles"));
const JuegoPreguntas = lazy(() => import("../games/MathMillonario/MathMillonario"));
const EscapeAlgebra = lazy(() => import("../games/EscapeAlgebra/EscapeAlgebra"));
const TriquiGame = lazy(() => import("../games/triqui/TriquiGame"));
const Admin = lazy(() => import("../pages/Admin/Admin"));
const Sala = lazy(() => import("../pages/Sala/Sala"));
const Eventos = lazy(() => import("../pages/Eventos/Eventos"));
const Siglo = lazy(() => import("../games/siglo/Siglo"));
const Ranking = lazy(() => import("../pages/Ranking/Ranking"));

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

/*
 * Esté donde esté el jugador, el servidor puede llevarlo:
 *   sala:entrar        → aceptó una invitación (o invitó sin tener sala)
 *   sala:juegoIniciado → el creador de su sala inició un juego
 */
function EscuchaSala() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const alEntrar = () => {
            if (location.pathname !== "/sala") navigate("/sala");
        };

        const alIniciar = ({ ruta }) => {
            sonar("iniciar");
            if (ruta && location.pathname !== ruta) navigate(ruta);
        };

        socket.on("sala:entrar", alEntrar);
        socket.on("sala:juegoIniciado", alIniciar);

        return () => {
            socket.off("sala:entrar", alEntrar);
            socket.off("sala:juegoIniciado", alIniciar);
        };
    }, [navigate, location.pathname]);

    return null;
}

/*
 * Las pantallas ya rediseñadas (RUTAS_JUEGO en index.html)
 * usan el tamaño "juego"; las demás, el modo anterior.
 */
function ModoPantalla() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.ajustarPantalla?.(window.esRutaJuego?.(pathname) ? "juego" : "virtual");
    }, [pathname]);

    return null;
}

function AppRouter() {
    return (
        <>
            {/* Fuera del Suspense: mientras una pantalla se descarga, los
                avisos, las invitaciones y el menú flotante no se reinician. */}
            <ModoPantalla />
            <EscuchaSala />
            <Notificaciones />
            <MenuFlotante />
            <VozGlobal />
            <MusicaGlobal />
            <Suspense fallback={<Cargando />}>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route path="/lobby" element={<Privada><Lobby /></Privada>} />
                {/* El Mundo se quitó: la lista de jugadores e invitaciones está en el lobby. */}
                <Route path="/world" element={<Navigate to="/lobby" replace />} />
                <Route path="/character" element={<Privada><Character /></Privada>} />
                <Route path="/tienda" element={<Privada><Character /></Privada>} />
                <Route path="/profile" element={<Privada><Profile /></Privada>} />
                <Route path="/profile/:id" element={<Privada><Profile /></Privada>} />

                <Route path="/games/preguntas" element={<Privada><Niveles /></Privada>} />
                <Route path="/games/preguntas/:nivelId" element={<Privada><JuegoPreguntas /></Privada>} />
                <Route path="/games/escape-algebra" element={<Privada><EscapeAlgebra /></Privada>} />
                <Route path="/games/triqui" element={<Privada><TriquiGame /></Privada>} />
                <Route path="/games/siglo" element={<Privada><Siglo /></Privada>} />
                <Route path="/sala" element={<Privada><Sala /></Privada>} />
                <Route path="/sala/:codigo" element={<Privada><Sala /></Privada>} />
                <Route path="/ranking" element={<Privada><Ranking /></Privada>} />
                <Route path="/eventos" element={<Privada><Eventos /></Privada>} />
                <Route path="/triqui-local" element={<TriquiGame mode="local" />} />

                <Route path="/admin" element={<SoloAdmin><Admin /></SoloAdmin>} />

                {/* Direcciones viejas que pueden estar guardadas */}
                <Route path="/games/math-millonario" element={<Navigate to="/games/preguntas" replace />} />
                <Route path="/dashboard" element={<Navigate to="/lobby" replace />} />
                <Route path="/games" element={<Navigate to="/lobby" replace />} />
                <Route path="/games/rooms" element={<Navigate to="/sala" replace />} />

                <Route path="*" element={<Navigate to="/lobby" replace />} />
            </Routes>
            </Suspense>
        </>
    );
}

export default AppRouter;
