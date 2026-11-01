import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuCheck } from "react-icons/lu";

import { useAuth } from "../../context/AuthContext";
import { socket } from "../../services/socket";
import { useFondoLobby } from "../../hooks/useFondoLobby";
import juegosLista from "../../data/mock/games.json";

import "./preparando.css";

/* =========================================================
   PANTALLA PREVIA (partidas que salen de un círculo del Mundo 3D)
   Mientras a cada uno le carga el juego, se ven los nombres;
   al que ya cargó le sale ✓. Cuando todos tienen ✓ el servidor
   inicia la partida (y EscuchaSala lleva a cada uno al juego).
========================================================= */

// Cargar el juego antes de que empiece (el mismo archivo que usa la ruta).
const PRECARGAR = {
    triqui: () => import("../../games/triqui/TriquiGame"),
    siglo: () => import("../../games/siglo/Siglo"),
    invasion: () => import("../../games/invasion/Invasion"),
    zona: () => import("../../games/zona/Zona"),
    penal: () => import("../../games/penal/Penal"),
};
const JUEGO = Object.fromEntries(juegosLista.filter((j) => j.sala).map((j) => [j.sala, j]));

const cargarImagen = (src) =>
    new Promise((ok) => {
        if (!src) return ok();
        const img = new Image();
        img.onload = img.onerror = () => ok();
        img.src = src;
    });

export default function Preparando() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const fondo = useFondoLobby();
    const miId = String(user?.id ?? "");
    const [sala, setSala] = useState(undefined);
    const [desfase, setDesfase] = useState(0);
    const [, setTic] = useState(0);
    const avisado = useRef(false);

    useEffect(() => {
        const pedir = () => socket.emit("sala:estado");
        const alEstado = ({ sala: s }) => {
            if (!s) return navigate("/mundo", { replace: true });
            if (s.estado === "sala") return navigate("/sala", { replace: true }); // se canceló
            if (s.estado === "jugando") {
                const ruta = (s.juegos || []).find((j) => j.id === s.juego)?.ruta;
                return navigate(ruta || "/sala", { replace: true });
            }
            if (s.ahora) setDesfase(s.ahora - Date.now());
            setSala(s);
        };
        socket.on("connect", pedir);
        socket.on("sala:estado", alEstado);
        if (socket.connected) pedir();
        else socket.connect();
        return () => {
            socket.off("connect", pedir);
            socket.off("sala:estado", alEstado);
        };
    }, [navigate]);

    // Cargar el juego y avisar "listo" (una sola vez).
    useEffect(() => {
        if (!sala || sala.estado !== "preparando" || avisado.current) return;
        avisado.current = true;
        const juego = JUEGO[sala.juego];
        Promise.all([(PRECARGAR[sala.juego] || (() => Promise.resolve()))().catch(() => {}), cargarImagen(juego?.image)]).then(() =>
            socket.emit("sala:listo")
        );
    }, [sala]);

    useEffect(() => {
        const t = setInterval(() => setTic((n) => n + 1), 500);
        return () => clearInterval(t);
    }, []);

    if (!sala) {
        return (
            <div className="pr" style={{ backgroundImage: `url(${fondo})` }}>
                <p className="pr-cargando">Preparando la partida…</p>
            </div>
        );
    }

    const juego = JUEGO[sala.juego] || { name: sala.juego };
    const listos = new Set(sala.listos || []);
    const miembros = sala.miembros || [];
    const cuantos = miembros.filter((m) => m.esBot || listos.has(String(m.userId))).length;
    const quedan = sala.preparandoHasta ? Math.max(0, Math.ceil((sala.preparandoHasta - (Date.now() + desfase)) / 1000)) : null;

    return (
        <div className="pr" style={{ backgroundImage: `url(${juego.image || fondo})` }}>
            <div className="pr-velo" />
            <section className="pr-caja" aria-live="polite">
                {juego.image && <img className="pr-portada" src={juego.image} alt="" draggable="false" />}
                <h1>{juego.name}</h1>
                <p className="pr-sub">{cuantos === miembros.length ? "¡Todos listos! Empezando…" : `Cargando… ${cuantos}/${miembros.length} listos`}</p>
                <ul className="pr-lista">
                    {miembros.map((m) => {
                        const listo = m.esBot || listos.has(String(m.userId));
                        return (
                            <li key={m.userId} className={`${listo ? "pr-listo" : ""} ${String(m.userId) === miId ? "pr-yo" : ""}`}>
                                <span className="pr-nombre">{m.nombre}</span>
                                <span className="pr-marca" aria-label={listo ? "Listo" : "Cargando"}>
                                    {listo ? <LuCheck aria-hidden="true" /> : <i className="pr-girando" />}
                                </span>
                            </li>
                        );
                    })}
                </ul>
                {quedan != null && cuantos < miembros.length && <small className="pr-espera">{`Se espera máximo ${quedan} s`}</small>}
            </section>
        </div>
    );
}
