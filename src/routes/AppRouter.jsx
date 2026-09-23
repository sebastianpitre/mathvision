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

function AppRouter() {

    return (

        <Routes>

            <Route
                path="/"
                element={<AuthTest />}
            />

            <Route path="/games/rooms" element={<Rooms />} />

            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/games" element={<Games />} />
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
            <Route path="/friends" element={<Friends />} />
            <Route path="/room" element={<Room />} />
            <Route path="/character" element={<Character />} />

            <Route path="*" element={<NotFound />} />

        </Routes>

    );
}

export default AppRouter;