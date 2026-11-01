import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuCheck, LuClock, LuCrown, LuGem, LuGift, LuLock, LuSparkles } from "react-icons/lu";

import PantallaFF from "../../components/juego/PantallaFF";
import FotoPerfil from "../../components/juego/FotoPerfil";
import Personaje3D from "../../components/juego/Personaje3D";
import Tiquete from "../../components/juego/Tiquete";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { avisar } from "../../services/avisos";
import { sonar } from "../../services/sonidos";

import "./pase.css";

/* =========================================================
   PASE ÉLITE (como el Pase Booyah de Free Fire)
   Izquierda: el pase, tu nivel, la EXP y el botón de Élite.
   Centro: la pista de niveles (arriba GRATIS, abajo ÉLITE).
   Derecha: la vista previa de lo que tocaste.
   Tocar un premio lo muestra; si ya lo alcanzaste, lo reclama.
========================================================= */

const formato = (n) => (Number(n) || 0).toLocaleString("es-CO");

/* Cada casilla trae un solo premio; se describe el principal. */
function queEs(p) {
    if (!p) return { tipo: "nada", nombre: "Sin premio" };
    if (p.personaje) return { tipo: "personaje", nombre: p.personaje.nombre, clase: "Personaje" };
    if (p.marco) return { tipo: "marco", nombre: p.marco.nombre, clase: "Marco de perfil" };
    if (p.foto) return { tipo: "foto", nombre: p.foto.nombre, clase: "Foto de perfil" };
    if (p.diamantes) return { tipo: "diamantes", nombre: `${formato(p.diamantes)} diamantes`, clase: "Diamantes", cantidad: p.diamantes };
    if (p.tickets) return { tipo: "tickets", nombre: `${formato(p.tickets)} tiquete${p.tickets === 1 ? "" : "s"}`, clase: "Tiquetes de GiraGamif", cantidad: p.tickets };
    if (p.oro) return { tipo: "oro", nombre: `${formato(p.oro)} de oro`, clase: "Oro", cantidad: p.oro };
    return { tipo: "nada", nombre: "Sin premio" };
}

/* Dibujo pequeño de un premio (en la casilla). */
function Icono({ premio, avatar }) {
    const q = queEs(premio);
    if (q.tipo === "personaje") return premio.personaje.foto ? <img src={premio.personaje.foto} alt="" draggable="false" /> : <span>🧍</span>;
    if (q.tipo === "foto") return <img src={premio.foto.ruta} alt="" draggable="false" />;
    if (q.tipo === "marco") return <span className="pa-marco"><FotoPerfil foto={avatar} marco={premio.marco.ruta} /></span>;
    if (q.tipo === "diamantes") return <LuGem className="pa-gema" aria-hidden="true" />;
    if (q.tipo === "tickets") return <Tiquete tamano="2.7rem" />;
    if (q.tipo === "oro") return <span className="ffl-moneda-oro pa-oro" aria-hidden="true" />;
    return null;
}

function cuenta(fin, desfase) {
    const ms = Math.max(0, new Date(fin) - (Date.now() + desfase));
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return d > 0 ? `${d}d ${String(h).padStart(2, "0")}h` : `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}

/* Vista previa grande de lo que se tocó. */
function Vista({ celda, avatar, alReclamar, reclamando, elite }) {
    if (!celda) return <p className="pa-vista-vacia">Toca un premio para verlo.</p>;
    const { premio, nivel, pista, estado } = celda;
    const q = queEs(premio);
    return (
        <>
            <header className="pa-vista-cabeza">
                <span className={`pa-chip pa-chip-${pista}`}>{pista === "elite" ? "Élite" : "Gratis"}</span>
                <span className="pa-chip">{`Nivel ${nivel}`}</span>
                {celda.mayor && (
                    <span className="pa-chip pa-chip-mayor">
                        <LuSparkles aria-hidden="true" />
                        Premio mayor
                    </span>
                )}
            </header>

            <div className={`pa-vista-dibujo pa-vista-${q.tipo}`}>
                {q.tipo === "personaje" ? (
                    <Personaje3D key={premio.personaje.modelo} modelo={premio.personaje.modelo} />
                ) : q.tipo === "marco" ? (
                    <span className="pa-vista-perfil">
                        <FotoPerfil foto={avatar} marco={premio.marco.ruta} alt="Así se ve en tu perfil" />
                    </span>
                ) : q.tipo === "foto" ? (
                    <span className="pa-vista-perfil">
                        <img src={premio.foto.ruta} alt={premio.foto.nombre} draggable="false" />
                    </span>
                ) : (
                    <Icono premio={premio} avatar={avatar} />
                )}
            </div>

            <div className="pa-vista-texto">
                <small>{q.clase}</small>
                <strong>{q.nombre}</strong>
                {q.tipo === "marco" && <em>Así se vería en tu foto de perfil.</em>}
                {q.tipo === "personaje" && <em>Desliza para girarlo.</em>}
            </div>

            {estado === "reclamado" ? (
                <span className="pa-vista-estado pa-obtenido">
                    <LuCheck aria-hidden="true" />
                    Obtenido
                </span>
            ) : estado === "listo" ? (
                <button type="button" className="ffp-btn pa-vista-btn" onClick={() => alReclamar(celda)} disabled={reclamando}>
                    {reclamando ? "…" : "Reclamar"}
                </button>
            ) : (
                <span className="pa-vista-estado">
                    <LuLock aria-hidden="true" />
                    {pista === "elite" && !elite ? "Necesitas el Pase Élite" : `Llega al nivel ${nivel}`}
                </span>
            )}
        </>
    );
}

export default function Pase() {
    const { user, refreshUser } = useAuth();
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState("");
    const [elegida, setElegida] = useState(null); // "nivel-pista"
    const [reclamando, setReclamando] = useState(false);
    const [comprando, setComprando] = useState(false);
    const [confirmar, setConfirmar] = useState(false);
    const [desfase, setDesfase] = useState(0);
    const [, setTic] = useState(0);
    const pista = useRef(null);
    const centrado = useRef(false);

    const cargar = useCallback(async () => {
        try {
            const r = await api("/pase");
            setDatos(r);
            if (r.ahora) setDesfase(new Date(r.ahora) - Date.now());
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        cargar();
        const t = setInterval(() => setTic((n) => n + 1), 30000);
        const alVolver = () => document.visibilityState === "visible" && cargar();
        document.addEventListener("visibilitychange", alVolver);
        return () => {
            clearInterval(t);
            document.removeEventListener("visibilitychange", alVolver);
        };
    }, [cargar]);

    // Todas las casillas con su estado: reclamado · listo · bloqueado.
    const celdas = useMemo(() => {
        const m = new Map();
        for (const f of datos?.niveles || []) {
            for (const k of ["gratis", "elite"]) {
                const c = f[k];
                if (!c) continue;
                m.set(`${f.nivel}-${k}`, {
                    clave: `${f.nivel}-${k}`,
                    nivel: f.nivel,
                    pista: k,
                    premio: c.premio,
                    mayor: c.mayor,
                    estado: c.reclamado ? "reclamado" : c.disponible ? "listo" : "bloqueado",
                });
            }
        }
        return m;
    }, [datos]);

    // Al abrir: se muestra el premio mayor más alto y la pista va a tu nivel.
    useEffect(() => {
        if (!datos?.pase || centrado.current) return;
        centrado.current = true;
        const mayores = [...celdas.values()].filter((c) => c.mayor && c.pista === "elite");
        const ultimo = mayores.at(-1) || celdas.get(`${datos.pase.niveles}-elite`) || [...celdas.values()].at(-1);
        if (ultimo) setElegida(ultimo.clave);
        requestAnimationFrame(() => {
            const el = pista.current?.querySelector(`[data-nivel="${Math.max(1, datos.yo.nivel)}"]`);
            if (el && pista.current) pista.current.scrollLeft = el.offsetLeft - pista.current.clientWidth / 3;
        });
    }, [datos, celdas]);

    async function reclamar(celda) {
        setReclamando(true);
        try {
            const r = await api("/pase/reclamar", { metodo: "POST", body: { nivel: celda.nivel, pista: celda.pista } });
            sonar("ganar");
            avisar(`¡Obtuviste ${queEs(celda.premio).nombre}!`, "ok", 3500);
            await Promise.all([refreshUser?.(), cargar()]);
            return r;
        } catch (e) {
            avisar(e.message, "error", 4000);
            cargar();
        } finally {
            setReclamando(false);
        }
    }

    async function reclamarTodo() {
        setReclamando(true);
        try {
            const r = await api("/pase/reclamar-todo", { metodo: "POST" });
            sonar("ganar");
            avisar(r.message, "ok", 3500);
            await Promise.all([refreshUser?.(), cargar()]);
        } catch (e) {
            avisar(e.message, "error", 4000);
        } finally {
            setReclamando(false);
        }
    }

    async function comprar() {
        setComprando(true);
        try {
            const r = await api("/pase/comprar", { metodo: "POST" });
            sonar("ganar");
            avisar(r.message, "ok", 4000);
            setConfirmar(false);
            await Promise.all([refreshUser?.(), cargar()]);
        } catch (e) {
            avisar(e.message, "error", 4000);
        } finally {
            setComprando(false);
        }
    }

    // Tocar: muestra el premio y, si ya está listo, lo reclama.
    function tocar(celda) {
        setElegida(celda.clave);
        if (celda.estado === "listo" && !reclamando) reclamar(celda);
    }

    if (!datos) {
        return (
            <PantallaFF titulo="Pase Élite">
                <p className="pa-estado">{error || "Cargando el pase…"}</p>
            </PantallaFF>
        );
    }

    if (!datos.pase) {
        return (
            <PantallaFF titulo="Pase Élite">
                <section className="pa-vacio ffp-panel">
                    <LuCrown aria-hidden="true" />
                    <h2>No hay un pase ahora</h2>
                    <p>Muy pronto llegará un nuevo Pase Élite con premios especiales.</p>
                </section>
            </PantallaFF>
        );
    }

    const { pase, yo, niveles, porReclamar } = datos;
    const maximo = yo.nivel >= pase.niveles;
    const vista = celdas.get(elegida);
    const avatar = user?.avatar;

    return (
        <PantallaFF titulo="Pase Élite" className="pa">
            {/* ---------- Izquierda: el pase y tu avance ---------- */}
            <aside className={`pa-info ${yo.elite ? "pa-info-elite" : ""}`}>
                <div className="pa-portada" style={pase.imagen ? { backgroundImage: `url(${pase.imagen})` } : undefined}>
                    <span className="pa-reloj" title={`Termina el ${new Date(pase.fin).toLocaleString("es-CO")}`}>
                        <LuClock aria-hidden="true" />
                        {cuenta(pase.fin, desfase)}
                    </span>
                    <h2>{pase.nombre}</h2>
                </div>

                <div className="pa-nivel">
                    <span className="pa-nivel-num" aria-label={`Nivel ${yo.nivel}`}>
                        <small>Lv.</small>
                        {yo.nivel}
                    </span>
                    <div className="pa-exp">
                        <span className="pa-barra" role="progressbar" aria-valuemin={0} aria-valuemax={pase.exp_nivel} aria-valuenow={yo.expEnNivel}>
                            <span style={{ width: `${(100 * yo.expEnNivel) / pase.exp_nivel}%` }} />
                        </span>
                        <small>{maximo ? "¡Nivel máximo!" : `${yo.expEnNivel}/${pase.exp_nivel} EXP`}</small>
                    </div>
                </div>
                <p className="pa-como">{`Juega partidas: +${pase.exp_ganada} EXP si ganas, +${pase.exp_perdida} si pierdes.`}</p>

                {yo.elite ? (
                    <span className="pa-tienes">
                        <LuCrown aria-hidden="true" />
                        Pase Élite activo
                    </span>
                ) : confirmar ? (
                    <div className="pa-confirmar">
                        <span>
                            {`¿Gastar ${formato(pase.precio_diamantes)}`} <LuGem aria-hidden="true" className="pa-gema-chica" />?
                        </span>
                        <div>
                            <button type="button" className="ffp-btn" onClick={comprar} disabled={comprando}>
                                {comprando ? "…" : "Sí"}
                            </button>
                            <button type="button" className="pa-no" onClick={() => setConfirmar(false)} disabled={comprando}>
                                No
                            </button>
                        </div>
                    </div>
                ) : (
                    <button type="button" className="ffp-btn pa-comprar" onClick={() => setConfirmar(true)}>
                        <LuCrown aria-hidden="true" />
                        {pase.precio_diamantes > 0 ? (
                            <>
                                Élite <LuGem aria-hidden="true" className="pa-gema-chica" />
                                {formato(pase.precio_diamantes)}
                            </>
                        ) : (
                            "Activar Élite gratis"
                        )}
                    </button>
                )}

                <button type="button" className="pa-todo" onClick={reclamarTodo} disabled={!porReclamar || reclamando}>
                    <LuGift aria-hidden="true" />
                    {porReclamar ? `Reclamar todo (${porReclamar})` : "Nada por reclamar"}
                </button>
            </aside>

            {/* ---------- Centro: la pista de niveles ---------- */}
            <section className="pa-pista-caja" aria-label="Premios por nivel">
                <div className="pa-filas" aria-hidden="true">
                    <span />
                    <span className="pa-fila-gratis">Gratis</span>
                    <span className="pa-fila-elite">
                        <LuCrown />
                        Élite
                    </span>
                </div>
                <div className="pa-pista" ref={pista}>
                    {niveles.map((f) => {
                        const alcanzado = yo.nivel >= f.nivel;
                        return (
                            <div key={f.nivel} className={`pa-col ${alcanzado ? "pa-col-alcanzado" : ""} ${f.nivel === yo.nivel ? "pa-col-actual" : ""}`} data-nivel={f.nivel}>
                                <span className="pa-col-num">{f.nivel}</span>
                                {["gratis", "elite"].map((k) => {
                                    const c = celdas.get(`${f.nivel}-${k}`);
                                    if (!c) return <span key={k} className="pa-celda pa-celda-vacia" />;
                                    const q = queEs(c.premio);
                                    return (
                                        <button
                                            key={k}
                                            type="button"
                                            className={`pa-celda pa-celda-${k} pa-${c.estado} ${c.mayor ? "pa-mayor" : ""} ${elegida === c.clave ? "pa-elegida" : ""}`}
                                            onClick={() => tocar(c)}
                                            aria-label={`Nivel ${f.nivel}, ${k === "elite" ? "élite" : "gratis"}: ${q.nombre}${c.estado === "reclamado" ? " (obtenido)" : c.estado === "listo" ? " (toca para reclamar)" : ""}`}
                                        >
                                            <Icono premio={c.premio} avatar={avatar} />
                                            {q.cantidad && <b className="pa-cantidad">{formato(q.cantidad)}</b>}
                                            {c.estado === "reclamado" && <LuCheck className="pa-marca" aria-hidden="true" />}
                                            {c.estado === "bloqueado" && k === "elite" && !yo.elite && <LuLock className="pa-marca pa-candado" aria-hidden="true" />}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ---------- Derecha: vista previa ---------- */}
            <aside className="pa-vista" aria-live="polite">
                <Vista celda={vista} avatar={avatar} alReclamar={reclamar} reclamando={reclamando} elite={yo.elite} />
            </aside>
        </PantallaFF>
    );
}
