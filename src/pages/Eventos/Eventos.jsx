import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LuCheck, LuClock, LuGem, LuGift, LuLock } from "react-icons/lu";

import PantallaFF, { Pestanas } from "../../components/juego/PantallaFF";
import FotoPerfil from "../../components/juego/FotoPerfil";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { avisar } from "../../services/avisos";
import { sonar } from "../../services/sonidos";

import "./eventos.css";

/* =========================================================
   EVENTOS (como los de Free Fire)
   Izquierda: los eventos activos · centro: el anuncio con
   su cuenta regresiva · derecha: las misiones, con su barra
   de progreso, la recompensa y el botón de reclamar.
========================================================= */

const formato = (n) => (Number(n) || 0).toLocaleString("es-CO");

function cuenta(fin, desfase) {
    const ms = Math.max(0, new Date(fin) - (Date.now() + desfase));
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const fecha = (v) =>
    new Date(v).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/* Lo que se gana en una misión, con su imagen. */
function Premio({ r, marcoDe }) {
    const partes = [];
    if (r.oro) partes.push(<span key="o" className="ev-premio-moneda"><span className="ffl-moneda-oro" aria-hidden="true" />{formato(r.oro)}</span>);
    if (r.diamantes) partes.push(<span key="d" className="ev-premio-moneda"><LuGem aria-hidden="true" className="ev-gema" />{formato(r.diamantes)}</span>);
    if (r.personaje) partes.push(<span key="p" className="ev-premio-img" title={`Personaje: ${r.personaje.nombre}`}>{r.personaje.foto ? <img src={r.personaje.foto} alt={r.personaje.nombre} /> : "🧍"}</span>);
    if (r.foto) partes.push(<span key="f" className="ev-premio-img" title={`Foto de perfil: ${r.foto.nombre}`}><img src={r.foto.ruta} alt={r.foto.nombre} /></span>);
    if (r.marco) partes.push(<span key="m" className="ev-premio-img ev-premio-marco" title={`Marco: ${r.marco.nombre}`}><FotoPerfil foto={marcoDe} marco={r.marco.ruta} alt={r.marco.nombre} /></span>);
    return <span className="ev-premio">{partes}</span>;
}

export default function Eventos() {
    const { user, refreshUser } = useAuth();
    const [datos, setDatos] = useState(null);
    // /eventos?evento=5 abre ese evento (desde el anuncio del lobby).
    const [params] = useSearchParams();
    const [elegido, setElegido] = useState(() => Number(params.get("evento")) || null);
    const [error, setError] = useState("");
    const [reclamando, setReclamando] = useState(null);
    const [desfase, setDesfase] = useState(0);
    const [, setTic] = useState(0);

    const cargar = useCallback(async () => {
        try {
            const r = await api("/eventos");
            setDatos(r);
            setDesfase(new Date(r.ahora) - Date.now());
            setElegido((e) => (r.eventos.some((x) => x.id === e) ? e : r.eventos[0]?.id ?? null));
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        cargar();
        const t = setInterval(() => setTic((n) => n + 1), 1000);
        // El avance cambia al jugar: se vuelve a pedir al volver a esta pantalla.
        const alVolver = () => document.visibilityState === "visible" && cargar();
        document.addEventListener("visibilitychange", alVolver);
        return () => {
            clearInterval(t);
            document.removeEventListener("visibilitychange", alVolver);
        };
    }, [cargar]);

    async function reclamar(m) {
        setReclamando(m.id);
        try {
            const r = await api(`/eventos/misiones/${m.id}/reclamar`, { metodo: "POST" });
            sonar("ganar");
            const cosas = [
                r.entregado.oro && `${formato(r.entregado.oro)} de oro`,
                r.entregado.diamantes && `${formato(r.entregado.diamantes)} 💎`,
                r.entregado.personaje && "un personaje nuevo",
                r.entregado.foto && "una foto de perfil",
                r.entregado.marco && "un marco",
            ].filter(Boolean);
            avisar(`¡Reclamaste ${cosas.join(", ") || "tu recompensa"}!`, "ok", 4000);
            await refreshUser?.();
            await cargar();
        } catch (e) {
            avisar(e.message, "error", 4000);
            cargar();
        } finally {
            setReclamando(null);
        }
    }

    if (!datos) {
        return (
            <PantallaFF titulo="Eventos">
                <p className="ev-estado">{error || "Cargando eventos…"}</p>
            </PantallaFF>
        );
    }

    if (datos.eventos.length === 0) {
        return (
            <PantallaFF titulo="Eventos">
                <section className="ev-vacio ffp-panel">
                    <LuGift aria-hidden="true" />
                    <h2>No hay eventos ahora</h2>
                    <p>Vuelve pronto: aquí aparecerán misiones con premios especiales.</p>
                </section>
            </PantallaFF>
        );
    }

    const evento = datos.eventos.find((e) => e.id === elegido) || datos.eventos[0];
    const pestanas = datos.eventos.map((e) => ({
        id: e.id,
        texto: e.titulo,
        cuenta: e.misiones.filter((m) => m.completa && !m.reclamada).length || null,
    }));

    return (
        <PantallaFF titulo="Eventos" className="ev">
            <Pestanas items={pestanas} activa={evento.id} alCambiar={setElegido} etiqueta="Eventos" />

            <section className="ev-anuncio" aria-label={evento.titulo}>
                {evento.imagen ? <img src={evento.imagen} alt="" className="ev-imagen" draggable="false" /> : <div className="ev-imagen ev-sin-imagen" />}
                <span className="ev-reloj" title={`Termina el ${fecha(evento.fin)}`}>
                    <LuClock aria-hidden="true" />
                    {cuenta(evento.fin, desfase)}
                </span>
                <div className="ev-texto">
                    <h2>{evento.titulo}</h2>
                    {evento.descripcion && <p>{evento.descripcion}</p>}
                </div>

            <aside className="ev-misiones" aria-label="Misiones">
                <ul>
                    {evento.misiones.map((m) => {
                        const porcentaje = Math.round((100 * m.avance) / m.meta);
                        const propia = m.desde !== evento.inicio || m.hasta !== evento.fin;
                        return (
                            <li key={m.id} className={`ev-mision ${m.reclamada ? "ev-reclamada" : m.completa ? "ev-lista" : ""}`}>
                                <div className="ev-mision-texto">
                                    <strong>{m.texto}</strong>
                                    {propia && <small>{`${fecha(m.desde)} – ${fecha(m.hasta)}`}</small>}
                                    <span className="ev-barra" role="progressbar" aria-valuemin={0} aria-valuemax={m.meta} aria-valuenow={m.avance} aria-label={`${m.avance} de ${m.meta}`}>
                                        <span style={{ width: `${porcentaje}%` }} />
                                        <em>{`${formato(m.avance)}/${formato(m.meta)}`}</em>
                                    </span>
                                </div>
                                <Premio r={m.recompensa} marcoDe={user?.avatar} />
                                {m.reclamada ? (
                                    <span className="ev-estado-mision ev-obtenido">
                                        <LuCheck aria-hidden="true" />
                                        Obtenido
                                    </span>
                                ) : m.completa ? (
                                    <button type="button" className="ffp-btn ev-reclamar" onClick={() => reclamar(m)} disabled={reclamando === m.id}>
                                        {reclamando === m.id ? "…" : "Reclamar"}
                                    </button>
                                ) : (
                                    <span className="ev-estado-mision">
                                        <LuLock aria-hidden="true" />
                                        Incompleto
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </aside>
            </section>
        </PantallaFF>
    );
}
