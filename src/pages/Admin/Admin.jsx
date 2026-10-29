import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuChartColumn, LuGift, LuCalendarDays, LuLayers, LuMedal, LuMic, LuMusic, LuSquareUser, LuShieldCheck, LuShirt, LuUsers, LuArrowLeft } from "react-icons/lu";

import { useAuth } from "../../context/AuthContext";
import Resumen from "./Resumen";
import NivelesAdmin from "./NivelesAdmin";
import TiendaAdmin from "./TiendaAdmin";
import UsuariosAdmin from "./UsuariosAdmin";
import PremiosAdmin from "./PremiosAdmin";
import VozAdmin from "./VozAdmin";
import SonidosAdmin from "./SonidosAdmin";
import TemporadasAdmin from "./TemporadasAdmin";
import EventosAdmin from "./EventosAdmin";
import PerfilesAdmin from "./PerfilesAdmin";

import "../../styles/ludo.css";
import "./admin.css";

/* =========================================================
   PANEL DE ADMINISTRACIÓN
   Solo entra quien tiene rol "admin" (lo revisa el router
   y, sobre todo, el servidor en cada petición).
========================================================= */

const PESTANAS = [
    { id: "resumen", label: "Resumen", icon: LuChartColumn, Componente: Resumen },
    { id: "niveles", label: "Niveles y preguntas", icon: LuLayers, Componente: NivelesAdmin },
    { id: "tienda", label: "Personajes", icon: LuShirt, Componente: TiendaAdmin },
    { id: "usuarios", label: "Jugadores", icon: LuUsers, Componente: UsuariosAdmin },
    { id: "premios", label: "Premios y reglas", icon: LuGift, Componente: PremiosAdmin },
    { id: "voz", label: "Voz y reportes", icon: LuMic, Componente: VozAdmin },
    { id: "sonidos", label: "Sonidos", icon: LuMusic, Componente: SonidosAdmin },
    { id: "temporadas", label: "Temporadas", icon: LuMedal, Componente: TemporadasAdmin },
    { id: "eventos", label: "Eventos", icon: LuCalendarDays, Componente: EventosAdmin },
    { id: "perfiles", label: "Fotos y marcos", icon: LuSquareUser, Componente: PerfilesAdmin },
];

function pestanaInicial() {
    const desdeUrl = new URLSearchParams(window.location.search).get("tab");
    return PESTANAS.some((p) => p.id === desdeUrl) ? desdeUrl : "resumen";
}

export default function Admin() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activa, setActiva] = useState(pestanaInicial);

    const cambiar = (id) => {
        setActiva(id);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", id);
        window.history.replaceState(null, "", url);
        document.querySelector(".adm-contenido")?.scrollTo({ top: 0 });
    };

    const { Componente } = PESTANAS.find((p) => p.id === activa);

    return (
        <div className="lg adm">
            {/* Menú del panel: a la izquierda en PC; arriba (en una fila que se desliza) en el teléfono */}
            <aside className="adm-lado">
                <div className="adm-marca">
                    <LuShieldCheck aria-hidden="true" />
                    <span>
                        LUDO<b>GAMIF</b>
                        <small>Panel</small>
                    </span>
                </div>

                <nav className="adm-nav" role="tablist" aria-label="Secciones del panel">
                    {PESTANAS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            id={`tab-${id}`}
                            aria-selected={activa === id}
                            aria-controls={`panel-${id}`}
                            className="adm-tab"
                            onClick={() => cambiar(id)}
                        >
                            <Icon aria-hidden="true" />
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>

                <div className="adm-pie">
                    {user && <span className="adm-usuario" title={user.username}>{user.display_name || user.username}</span>}
                    <button type="button" className="adm-volver" onClick={() => navigate("/lobby")}>
                        <LuArrowLeft aria-hidden="true" />
                        <span>Volver al juego</span>
                    </button>
                </div>
            </aside>

            <main className="adm-contenido" role="tabpanel" id={`panel-${activa}`} aria-labelledby={`tab-${activa}`}>
                <Componente />
            </main>
        </div>
    );
}
