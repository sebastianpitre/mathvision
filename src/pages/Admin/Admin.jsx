import { useState } from "react";
import { LuChartColumn, LuLayers, LuShieldCheck, LuShoppingBag, LuUsers } from "react-icons/lu";

import MainNav from "../../components/navigation/MainNav";
import Resumen from "./Resumen";
import NivelesAdmin from "./NivelesAdmin";
import TiendaAdmin from "./TiendaAdmin";
import UsuariosAdmin from "./UsuariosAdmin";

import "../../styles/ludo.css";

/* =========================================================
   PANEL DE ADMINISTRACIÓN
   Solo entra quien tiene rol "admin" (lo revisa el router
   y, sobre todo, el servidor en cada petición).
========================================================= */

const PESTANAS = [
    { id: "resumen", label: "Resumen", icon: LuChartColumn, Componente: Resumen },
    { id: "niveles", label: "Niveles y preguntas", icon: LuLayers, Componente: NivelesAdmin },
    { id: "tienda", label: "Tienda", icon: LuShoppingBag, Componente: TiendaAdmin },
    { id: "usuarios", label: "Jugadores", icon: LuUsers, Componente: UsuariosAdmin },
];

function pestanaInicial() {
    const desdeUrl = new URLSearchParams(window.location.search).get("tab");
    return PESTANAS.some((p) => p.id === desdeUrl) ? desdeUrl : "resumen";
}

export default function Admin() {
    const [activa, setActiva] = useState(pestanaInicial);

    const cambiar = (id) => {
        setActiva(id);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", id);
        window.history.replaceState(null, "", url);
    };

    const { Componente } = PESTANAS.find((p) => p.id === activa);

    return (
        <div className="lg">
            <MainNav />

            <main className="lg-main">
                <header className="lg-head">
                    <div>
                        <p className="lb-eyebrow">
                            <LuShieldCheck aria-hidden="true" />
                            <span>Administración</span>
                        </p>
                        <h1 className="lg-h1">Panel de LudoGamif</h1>
                        <p className="lg-lead">
                            Crea niveles con tus propias preguntas, define cuánto gana cada jugador y mira
                            cuánto se está jugando.
                        </p>
                    </div>
                </header>

                <div className="lg-tabs" role="tablist" aria-label="Secciones del panel">
                    {PESTANAS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            id={`tab-${id}`}
                            aria-selected={activa === id}
                            aria-controls={`panel-${id}`}
                            className="lg-tab"
                            onClick={() => cambiar(id)}
                        >
                            <Icon aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </div>

                <section role="tabpanel" id={`panel-${activa}`} aria-labelledby={`tab-${activa}`}>
                    <Componente />
                </section>
            </main>
        </div>
    );
}
