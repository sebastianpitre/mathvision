import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home/Home";
import Dashboard from "../pages/Dashboard/Dashboard";
import Games from "../pages/Games/Games";
import NotFound from "../pages/NotFound/NotFound";
import World from "../pages/World/World";
import EscapeAlgebra from "../games/EscapeAlgebra/EscapeAlgebra";
import MathMillonario from "../games/MathMillonario/MathMillonario";
import AuthTest from "../pages/AuthTest";

function AppRouter() {

    return (

        <Routes>

            <Route
                path="/auth-test"
                element={<AuthTest />}
            />
            <Route path="/" element={<Dashboard />} />

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

            <Route path="*" element={<NotFound />} />

        </Routes>

    );
}

export default AppRouter;