import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home/Home";
import Dashboard from "../pages/Dashboard/Dashboard";
import Games from "../pages/Games/Games";
import NotFound from "../pages/NotFound/NotFound";

function AppRouter() {
    return (
        <Routes>

            <Route path="/" element={<Dashboard />} />

            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/games" element={<Games />} />

            <Route path="*" element={<NotFound />} />

        </Routes>
    );
}

export default AppRouter;