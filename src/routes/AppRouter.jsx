import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home/Home";
import Dashboard from "../pages/Dashboard/Dashboard";
import NotFound from "../pages/NotFound/NotFound";
// import World from "../pages/World/World";
import EscapeAlgebra from "../games/EscapeAlgebra/EscapeAlgebra";
import MathMillonario from "../games/MathMillonario/MathMillonario";
import AuthTest from "../pages/AuthTest";
import Rooms from "../pages/Rooms";
import World from "../pages/World";

import TriquiGame from "../games/triqui/TriquiGame";

// Rutas nuevas del sistema
import Lobby from "../pages/Lobby";
import Friends from "../pages/Friends";
import Room from "../pages/Room";
import Games from "../pages/Games"; // reemplaza al Games anterior
import Character from "../pages/Character";
import Profile from "../pages/Profile/Profile";

function AppRouter() {

    return (

        <Routes>

            <Route
                path="/"
                element={<AuthTest />}
            />

            <Route path="/games/rooms" element={<Lobby />} />

            <Route path="/dashboard" element={<Lobby />} />

            <Route path="/games" element={<Lobby />} />
            <Route path="/world" element={<World />} />
            <Route
                path="/games/escape-algebra"
                element={<EscapeAlgebra />}
            />
            <Route
                path="/games/math-millonario"
                element={<MathMillonario />}
            />
            <Route
                path="/games/triqui"
                element={<TriquiGame />}
            />

            {/* Rutas nuevas */}
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/" element={<Lobby />} />
            <Route path="/friends" element={<Lobby />} />
            <Route path="/room" element={<Lobby />} />
            <Route path="/character" element={<Character />} />
            <Route
                path="/profile"
                element={<Profile />}
            />

            <Route
                path="/profile/:id"
                element={<Profile />}
            />

            <Route path="*" element={<Lobby />} />

        </Routes>

    );
}

export default AppRouter;