import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuGift, LuInfo, LuX } from "react-icons/lu";

import PantallaFF, { Pestanas } from "../../components/juego/PantallaFF";
import Tiquete from "../../components/juego/Tiquete";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { avisar } from "../../services/avisos";
import { sonar } from "../../services/sonidos";
import Ruleta, { IconoPremio } from "./Ruleta";

import "./suerte.css";

/* =========================================================
   GIRAGAMIF · RULETA DE LA SUERTE
   Cada giro gasta tiquetes 🎫 (se ganan en los eventos).
   El servidor elige el premio según su probabilidad y la
   ruleta gira hasta ese espacio.
========================================================= */

const VUELTAS = 6;
const DURACION_MS = 5200;

const pct = (n) => `${Number(n).toLocaleString("es-CO", { maximumFractionDigits: 2 })} %`;

function textoGanado(premio, entregado) {
    if (!premio) return "";
    if (premio.tipo === "nada") return "¡Casi! Esta vez no salió nada.";
    if (entregado?.repetido) return `Ya tenías "${premio.nombre}": recibes ${entregado.oro} de oro.`;
    return `¡Ganaste ${premio.nombre}!`;
}

export default function Suerte() {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [datos, setDatos] = useState(null);
    const [elegida, setElegida] = useState(null);
    const [angulo, setAngulo] = useState(0);
    const [girando, setGirando] = useState(false);
    const [verPremios, setVerPremios] = useState(false);
    const [ganado, setGanado] = useState(null); // { premio, entregado }
    const [error, setError] = useState("");

    const cargar = useCallback(async () => {
        try {
            const r = await api("/ruletas");
            setDatos(r);
            setElegida((e) => (r.ruletas.some((x) => x.id === e) ? e : (r.ruletas[0]?.id ?? null)));
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const ruleta = datos?.ruletas.find((r) => r.id === elegida) || datos?.ruletas[0];

    async function girar() {
        if (!ruleta || girando) return;
        setGirando(true);
        setGanado(null);
        try {
            const r = await api(`/ruletas/${ruleta.id}/girar`, { metodo: "POST" });
            const i = ruleta.premios.findIndex((p) => p.id === r.premioId);
            const paso = 360 / ruleta.premios.length;
            // Un poco al azar dentro del espacio, para que no caiga siempre en el centro.
            const dentro = (Math.random() - 0.5) * paso * 0.6;
            const destino = 360 - (i * paso + paso / 2) + dentro;
            setAngulo((a) => a - (a % 360) + VUELTAS * 360 + destino);
            setDatos((d) => ({ ...d, tickets: r.tickets }));
            sonar("dado");
            setTimeout(() => {
                setGirando(false);
                const premio = ruleta.premios[i];
                setGanado({ premio, entregado: r.entregado });
                sonar(premio?.tipo === "nada" ? "perder" : "ganar");
                refreshUser?.();
            }, DURACION_MS);
        } catch (e) {
            setGirando(false);
            avisar(e.message, "error", 4500);
        }
    }

    if (!datos) {
        return (
            <PantallaFF titulo="GiraGamif">
                <p className="su-estado">{error || "Cargando…"}</p>
            </PantallaFF>
        );
    }

    if (!ruleta) {
        return (
            <PantallaFF titulo="GiraGamif">
                <section className="su-vacio ffp-panel">
                    <Tiquete tamano="3rem" />
                    <h2>La ruleta está cerrada</h2>
                    <p>Pronto habrá premios. Mientras tanto, gana tiquetes en los eventos.</p>
                    <button type="button" className="ffp-btn" onClick={() => navigate("/eventos")}>
                        <LuGift aria-hidden="true" />
                        Ir a eventos
                    </button>
                </section>
            </PantallaFF>
        );
    }

    const alcanza = datos.tickets >= ruleta.costo;
    const pestanas = datos.ruletas.length > 1 ? datos.ruletas.map((r) => ({ id: r.id, texto: r.nombre })) : null;

    return (
        <PantallaFF titulo="GiraGamif" className="su">
            {pestanas && <Pestanas items={pestanas} activa={ruleta.id} alCambiar={(id) => !girando && setElegida(id)} etiqueta="Ruletas" />}

            <section className="su-escenario" aria-label={`Ruleta ${ruleta.nombre}`}>
                <Ruleta premios={ruleta.premios} angulo={angulo} girando={girando} foto={user?.avatar} />
            </section>

            <aside className="su-lado">
                <div className="su-cabeza">
                    <h2>{ruleta.nombre}</h2>
                    {ruleta.descripcion && <p>{ruleta.descripcion}</p>}
                </div>

                <div className="su-tiquetes" aria-label={`Tienes ${datos.tickets} tiquetes`}>
                    <Tiquete tamano="2.6rem" />
                    <span>
                        <strong>{datos.tickets.toLocaleString("es-CO")}</strong>
                        <small>tiquetes</small>
                    </span>
                </div>

                <button type="button" className="ffl-iniciar su-girar" onClick={girar} disabled={girando || !alcanza}>
                    {girando ? (
                        "Girando…"
                    ) : (
                        <>
                            Girar
                            <span className="su-costo">
                                <Tiquete tamano="1.3rem" />
                                {`×${ruleta.costo}`}
                            </span>
                        </>
                    )}
                </button>
                {!alcanza && !girando && (
                    <button type="button" className="su-sin" onClick={() => navigate("/eventos")}>
                        Te faltan tiquetes · gánalos en <u>Eventos</u>
                    </button>
                )}

                <button type="button" className="ffp-btn ffp-btn-2 su-ver" onClick={() => setVerPremios(true)}>
                    <LuInfo aria-hidden="true" />
                    Premios y suerte
                </button>
            </aside>

            {/* ---------- Premios y su probabilidad ---------- */}
            {verPremios && (
                <div className="su-fondo" onClick={() => setVerPremios(false)}>
                    <section className="su-modal" role="dialog" aria-modal="true" aria-labelledby="su-modal-t" onClick={(e) => e.stopPropagation()}>
                        <header>
                            <h2 id="su-modal-t">Premios y suerte</h2>
                            <button type="button" className="su-cerrar" onClick={() => setVerPremios(false)} aria-label="Cerrar">
                                <LuX aria-hidden="true" />
                            </button>
                        </header>
                        <p className="su-nota">{`Cada giro cuesta ${ruleta.costo} tiquete${ruleta.costo > 1 ? "s" : ""}. Si te sale algo que ya tienes, recibes oro.`}</p>
                        <ul>
                            {[...ruleta.premios]
                                .sort((a, b) => a.probabilidad - b.probabilidad)
                                .map((p) => (
                                    <li key={p.id} className={p.probabilidad <= 5 ? "su-raro" : ""}>
                                        <span className="su-modal-img">
                                            <IconoPremio premio={p} foto={user?.avatar} />
                                        </span>
                                        <span className="su-modal-nombre">
                                            <strong>{p.nombre}</strong>
                                            {p.probabilidad <= 5 && <small>¡Muy raro!</small>}
                                        </span>
                                        <span className="su-barra" aria-hidden="true">
                                            <span style={{ width: `${Math.max(2, p.probabilidad)}%` }} />
                                        </span>
                                        <b>{pct(p.probabilidad)}</b>
                                    </li>
                                ))}
                        </ul>
                    </section>
                </div>
            )}

            {/* ---------- Lo que salió ---------- */}
            {ganado && (
                <div className="su-fondo" onClick={() => setGanado(null)}>
                    <section
                        className={`su-modal su-ganado ${ganado.premio.tipo === "nada" ? "su-ganado-nada" : ""}`}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Premio"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="su-ganado-img">
                            <IconoPremio premio={ganado.premio} foto={user?.avatar} />
                        </span>
                        <h2>{textoGanado(ganado.premio, ganado.entregado)}</h2>
                        <div className="su-ganado-botones">
                            <button type="button" className="ffp-btn ffp-btn-2" onClick={() => setGanado(null)}>
                                Listo
                            </button>
                            {datos.tickets >= ruleta.costo && (
                                <button
                                    type="button"
                                    className="ffp-btn"
                                    onClick={() => {
                                        setGanado(null);
                                        girar();
                                    }}
                                >
                                    Girar otra vez
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </PantallaFF>
    );
}
