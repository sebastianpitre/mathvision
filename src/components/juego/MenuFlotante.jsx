import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    LuExpand,
    LuHouse,
    LuLogOut,
    LuMusic,
    LuShieldCheck,
    LuShirt,
    LuShoppingCart,
    LuShrink,
    LuTrophy,
    LuUserRound,
    LuUsers,
    LuVolume2,
    LuVolumeX,
} from "react-icons/lu";

import { useAuth } from "../../context/AuthContext";
import {
    abiertoComoApp,
    enPantallaCompleta,
    entrarPantallaCompleta,
    esIOS,
    puedePantallaCompleta,
    salirPantallaCompleta,
} from "../../services/pantalla";
import { alCambiarSilencio, cambiarSilencio, estaSilenciado } from "../../services/sonido";
import { avisar } from "../../services/avisos";
import { alCambiarSonidos, cambiarMusica, hayMusicaApagada } from "../../services/sonidos";

import "./menuFlotante.css";

/* =========================================================
   MENÚ FLOTANTE (como el botón de iPhone)
   ---------------------------------------------------------
   Un botón redondo que se puede arrastrar a cualquier lado
   de la pantalla (recuerda dónde lo dejaste). Al tocarlo se
   abren las opciones importantes: pantalla completa, sonido
   e ir rápido a otras pantallas.
========================================================= */

const CLAVE_POSICION = "ludogamif:menuFlotante";
const UMBRAL_ARRASTRE = 6;

function leerPosicion() {
    try {
        const p = JSON.parse(localStorage.getItem(CLAVE_POSICION));
        if (p && (p.lado === "izq" || p.lado === "der") && p.y >= 0 && p.y <= 1) return p;
    } catch {
        // Sin dato guardado.
    }
    // Por defecto: a la izquierda, entre el menú y la línea de avisos del lobby.
    return { lado: "izq", y: 0.77 };
}

function guardarPosicion(p) {
    try {
        localStorage.setItem(CLAVE_POSICION, JSON.stringify(p));
    } catch {
        // Sin almacenamiento: vale mientras la página esté abierta.
    }
}

export default function MenuFlotante() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, esAdmin, logout } = useAuth();

    const [posicion, setPosicion] = useState(leerPosicion);
    const [arrastre, setArrastre] = useState(null); // { x, y } mientras se arrastra
    const [abierto, setAbierto] = useState(false);
    const [completa, setCompleta] = useState(() => enPantallaCompleta());
    const [silencio, setSilencio] = useState(() => estaSilenciado());

    const inicio = useRef(null);
    const boton = useRef(null);

    const [sinMusica, setSinMusica] = useState(() => hayMusicaApagada());

    useEffect(() => alCambiarSilencio(setSilencio), []);
    useEffect(() => alCambiarSonidos(() => setSinMusica(hayMusicaApagada())), []);

    useEffect(() => {
        const actualizar = () => setCompleta(enPantallaCompleta());
        document.addEventListener("fullscreenchange", actualizar);
        document.addEventListener("webkitfullscreenchange", actualizar);
        return () => {
            document.removeEventListener("fullscreenchange", actualizar);
            document.removeEventListener("webkitfullscreenchange", actualizar);
        };
    }, []);

    // Se cierra con Escape o al cambiar de pantalla.
    useEffect(() => setAbierto(false), [location.pathname]);
    useEffect(() => {
        if (!abierto) return;
        const tecla = (e) => e.key === "Escape" && setAbierto(false);
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [abierto]);

    /* ---------- Arrastrar ---------- */

    const alBajar = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        const r = boton.current.getBoundingClientRect();
        inicio.current = { px: e.clientX, py: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, movio: false };
        boton.current.setPointerCapture?.(e.pointerId);
    };

    const alMover = (e) => {
        const i = inicio.current;
        if (!i) return;
        if (!i.movio && Math.hypot(e.clientX - i.px, e.clientY - i.py) < UMBRAL_ARRASTRE) return;
        i.movio = true;
        setArrastre({ x: e.clientX - i.dx, y: e.clientY - i.dy });
    };

    const alSoltar = (e) => {
        const i = inicio.current;
        inicio.current = null;
        if (!i) return;

        if (!i.movio) {
            setAbierto((a) => !a);
            return;
        }

        // Se pega al borde más cercano, como en iPhone.
        const tam = boton.current.offsetWidth;
        const alto = window.innerHeight;
        const centroX = e.clientX - i.dx + tam / 2;
        const y = Math.min(1, Math.max(0, (e.clientY - i.dy) / Math.max(1, alto - tam)));
        const nueva = { lado: centroX < window.innerWidth / 2 ? "izq" : "der", y };

        setArrastre(null);
        setPosicion(nueva);
        guardarPosicion(nueva);
    };

    /* ---------- Opciones ---------- */

    const ir = useCallback(
        (ruta) => {
            setAbierto(false);
            if (location.pathname !== ruta) navigate(ruta);
        },
        [location.pathname, navigate]
    );

    const alternarPantalla = async () => {
        if (completa) {
            if (abiertoComoApp()) return avisar("Abriste LudoGamif como app: ya está en pantalla completa.");
            await salirPantallaCompleta();
            return;
        }

        if (puedePantallaCompleta()) {
            const ok = await entrarPantallaCompleta();
            if (ok) return setAbierto(false);
        }

        avisar(
            esIOS()
                ? "En iPhone y iPad: toca Compartir → Agregar a inicio y abre LudoGamif desde ahí."
                : "Este navegador no permite pantalla completa. Igual puedes jugar así.",
            "info",
            6000
        );
    };

    if (!user) return null;

    const opciones = [
        {
            id: "pantalla",
            texto: completa ? "Salir de completa" : "Pantalla completa",
            icono: completa ? LuShrink : LuExpand,
            accion: alternarPantalla,
            destacada: !completa,
        },
        {
            id: "sonido",
            texto: silencio ? "Sonido apagado" : "Sonido",
            icono: silencio ? LuVolumeX : LuVolume2,
            accion: () => cambiarSilencio(),
            apagada: silencio,
        },
        {
            id: "musica",
            texto: sinMusica ? "Música apagada" : "Música",
            icono: LuMusic,
            accion: () => cambiarMusica(),
            apagada: sinMusica || silencio,
        },
        { id: "inicio", texto: "Inicio", icono: LuHouse, accion: () => ir("/lobby") },
        { id: "sala", texto: "Mi sala", icono: LuUsers, accion: () => ir("/sala") },
        { id: "tienda", texto: "Tienda", icono: LuShoppingCart, accion: () => ir("/tienda") },
        { id: "personajes", texto: "Personajes", icono: LuShirt, accion: () => ir("/character") },
        { id: "perfil", texto: "Perfil", icono: LuUserRound, accion: () => ir("/profile") },
        { id: "ranking", texto: "Ranking", icono: LuTrophy, accion: () => ir("/ranking") },
        esAdmin && { id: "panel", texto: "Panel", icono: LuShieldCheck, accion: () => ir("/admin") },
        {
            id: "salir",
            texto: "Cerrar sesión",
            icono: LuLogOut,
            accion: () => {
                setAbierto(false);
                logout();
                navigate("/");
            },
        },
    ].filter(Boolean);

    const estilo = arrastre
        ? { left: arrastre.x, top: arrastre.y, transition: "none" }
        : {
              [posicion.lado === "izq" ? "left" : "right"]:
                  `calc(env(safe-area-inset-${posicion.lado === "izq" ? "left" : "right"}) + var(--u) * 0.35)`,
              top: `calc((100% - var(--u) * 3) * ${posicion.y})`,
          };

    return (
        <>
            <button
                ref={boton}
                type="button"
                className={`mf-boton ${abierto ? "mf-boton-abierto" : ""} ${arrastre ? "mf-arrastrando" : ""}`}
                style={estilo}
                aria-label="Menú rápido"
                aria-expanded={abierto}
                onPointerDown={alBajar}
                onPointerMove={alMover}
                onPointerUp={alSoltar}
                onPointerCancel={() => {
                    inicio.current = null;
                    setArrastre(null);
                }}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setAbierto((a) => !a))}
            >
                <span className="mf-anillo" aria-hidden="true">
                    <span />
                </span>
            </button>

            {abierto && (
                <div className="mf-fondo" onClick={() => setAbierto(false)}>
                    <nav className="mf-panel" aria-label="Menú rápido" onClick={(e) => e.stopPropagation()}>
                        {opciones.map(({ id, texto, icono: Icono, accion, destacada, apagada }) => (
                            <button
                                key={id}
                                type="button"
                                className={`mf-opcion ${destacada ? "mf-destacada" : ""} ${apagada ? "mf-apagada" : ""}`}
                                onClick={accion}
                                autoFocus={id === "pantalla"}
                            >
                                <Icono aria-hidden="true" />
                                <span>{texto}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            )}
        </>
    );
}
