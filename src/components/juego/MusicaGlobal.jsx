import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { ponerMusica } from "../../services/sonidos";

/* Elige la música según la pantalla: cada juego puede tener la
   suya (desde el panel); si no, suena la del lobby. */
function pantallaDe(ruta) {
    if (ruta.startsWith("/admin")) return "ninguna";
    if (ruta.startsWith("/games/triqui") || ruta.startsWith("/triqui-local")) return "triqui";
    if (ruta.startsWith("/games/siglo")) return "siglo";
    if (ruta.startsWith("/games/invasion")) return "invasion";
    if (/^\/games\/preguntas\/.+/.test(ruta)) return "preguntas";
    if (ruta.startsWith("/games/escape-algebra")) return "escape";
    return "lobby";
}

export default function MusicaGlobal() {
    const { pathname } = useLocation();
    useEffect(() => ponerMusica(pantallaDe(pathname)), [pathname]);
    return null;
}
