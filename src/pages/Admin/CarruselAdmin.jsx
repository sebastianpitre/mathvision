import { useEffect, useRef, useState } from "react";
import { LuArrowDown, LuArrowUp, LuImage, LuPlus, LuSave, LuTrash2, LuX } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";
import { subirArchivo } from "./subirArchivo";
import games from "../../data/mock/games.json";
import { Diapositiva } from "../../components/juego/Carrusel";

/* =========================================================
   ANUNCIOS DEL LOBBY (carrusel de arriba a la izquierda)
   Cada anuncio muestra un juego, un evento o una pantalla
   (GiraGamif, tienda…), con foto propia o fondo de color.
========================================================= */

const TIPOS = { juego: "Un juego", evento: "Un evento", pantalla: "Una pantalla del juego" };
const NOMBRE_FONDO = { morado: "Morado", oro: "Dorado", azul: "Azul", rojo: "Rojo", verde: "Verde", noche: "Noche" };

const nuevoAnuncio = () => ({ tipo: "pantalla", pantalla: "suerte", juego_id: "", evento_id: "", titulo: "", subtitulo: "", etiqueta: "", imagen: "", fondo: "morado" });

/* Cómo se verá (mismo dibujo que en el lobby). */
function Vista({ a, eventos }) {
    const ev = a.tipo === "evento" ? eventos.find((e) => e.id === Number(a.evento_id)) : null;
    const imagen = a.imagen || ev?.imagen || "";
    const vista = {
        ...a,
        imagen,
        titulo: a.titulo || ev?.titulo || "",
        solo_imagen: Boolean(imagen) && !a.titulo && !a.subtitulo,
    };
    return (
        <div className="cr" style={{ flex: "0 0 auto", width: 210, height: 90 }}>
            <Diapositiva a={vista} juego={games.find((g) => g.id === a.juego_id)} />
        </div>
    );
}

function FilaAnuncio({ a, n, total, datos, cambiar, mover, quitar, alError }) {
    const entrada = useRef(null);
    const [avance, setAvance] = useState(null);

    async function subir(e) {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;
        setAvance(0);
        try {
            cambiar({ imagen: await subirArchivo(archivo, "foto", setAvance) });
        } catch (err) {
            alError(err);
        } finally {
            setAvance(null);
        }
    }

    return (
        <li className="lb-card" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
            <Vista a={a} eventos={datos.eventos} />

            <div style={{ flex: "1 1 360px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="lg-row" style={{ alignItems: "flex-end" }}>
                    <label className="lg-field">
                        <span>{`Anuncio ${n} muestra`}</span>
                        <select className="lg-select" value={a.tipo} onChange={(e) => cambiar({ tipo: e.target.value })}>
                            {Object.entries(TIPOS).map(([id, t]) => (
                                <option key={id} value={id}>{t}</option>
                            ))}
                        </select>
                    </label>
                    {a.tipo === "juego" && (
                        <label className="lg-field">
                            <span>Juego (al tocarlo queda elegido)</span>
                            <select className="lg-select" value={a.juego_id} onChange={(e) => cambiar({ juego_id: e.target.value })}>
                                <option value="">— Elige —</option>
                                {games.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    {a.tipo === "evento" && (
                        <label className="lg-field">
                            <span>Evento (sale solo mientras dure)</span>
                            <select className="lg-select" value={a.evento_id} onChange={(e) => cambiar({ evento_id: e.target.value })}>
                                <option value="">— Elige —</option>
                                {datos.eventos.map((ev) => (
                                    <option key={ev.id} value={ev.id}>{`${ev.titulo}${new Date(ev.fin) < new Date() ? " (terminó)" : ""}`}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    {a.tipo === "pantalla" && (
                        <label className="lg-field">
                            <span>Lleva a</span>
                            <select className="lg-select" value={a.pantalla} onChange={(e) => cambiar({ pantalla: e.target.value })}>
                                {Object.entries(datos.pantallas).map(([id, p]) => (
                                    <option key={id} value={id}>{p.texto}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    <label className="lg-field">
                        <span>Etiqueta</span>
                        <input className="lg-input" style={{ width: 110 }} maxLength={16} value={a.etiqueta} onChange={(e) => cambiar({ etiqueta: e.target.value })} placeholder="Nuevo" />
                    </label>
                </div>

                <div className="lg-row" style={{ alignItems: "flex-end" }}>
                    <label className="lg-field" style={{ flex: "1 1 180px" }}>
                        <span>Título (opcional)</span>
                        <input className="lg-input" maxLength={60} value={a.titulo} onChange={(e) => cambiar({ titulo: e.target.value })} placeholder={a.tipo === "evento" ? "El del evento" : "Ej: ¡Gira y gana!"} />
                    </label>
                    <label className="lg-field" style={{ flex: "1 1 200px" }}>
                        <span>Texto pequeño (opcional)</span>
                        <input className="lg-input" maxLength={90} value={a.subtitulo} onChange={(e) => cambiar({ subtitulo: e.target.value })} placeholder="Ej: Premios nuevos esta semana" />
                    </label>
                </div>

                <div className="lg-row" style={{ alignItems: "center" }}>
                    <label className="lg-field">
                        <span>Fondo (si no hay foto)</span>
                        <select className="lg-select" value={a.fondo} onChange={(e) => cambiar({ fondo: e.target.value })}>
                            {datos.fondos.map((f) => (
                                <option key={f} value={f}>{NOMBRE_FONDO[f] || f}</option>
                            ))}
                        </select>
                    </label>
                    <input ref={entrada} type="file" hidden accept=".png,.jpg,.jpeg,.webp" onChange={subir} />
                    <button type="button" className="lb-btn lb-btn-ghost" onClick={() => entrada.current?.click()} disabled={avance !== null} style={{ alignSelf: "flex-end" }}>
                        <LuImage aria-hidden="true" />
                        {avance !== null ? `Subiendo ${avance}%` : a.imagen ? "Cambiar foto" : "Subir foto"}
                    </button>
                    {a.imagen && (
                        <button type="button" className="lb-btn lb-btn-ghost" onClick={() => cambiar({ imagen: "" })} style={{ alignSelf: "flex-end" }}>
                            <LuX aria-hidden="true" />
                            Quitar foto
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button type="button" className="lb-icon-btn" onClick={() => mover(-1)} disabled={n === 1} aria-label={`Subir anuncio ${n}`} title="Subir">
                    <LuArrowUp aria-hidden="true" />
                </button>
                <button type="button" className="lb-icon-btn" onClick={() => mover(1)} disabled={n === total} aria-label={`Bajar anuncio ${n}`} title="Bajar">
                    <LuArrowDown aria-hidden="true" />
                </button>
                <button type="button" className="lb-icon-btn" onClick={quitar} aria-label={`Quitar anuncio ${n}`} title="Quitar">
                    <LuTrash2 aria-hidden="true" />
                </button>
            </div>
        </li>
    );
}

export default function CarruselAdmin() {
    const { datos, cargando, error } = useCarga("/admin/carrusel");
    const [config, setConfig] = useState(null);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!datos) return;
        setConfig({
            ...datos.config,
            anuncios: datos.config.anuncios.map((a) => ({ ...nuevoAnuncio(), ...a, evento_id: a.evento_id ?? "", juego_id: a.juego_id ?? "", pantalla: a.pantalla ?? "suerte" })),
        });
    }, [datos]);

    const mal = (e) => setAviso({ texto: e.message, tono: "error" });

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando anuncios…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;
    if (!config) return null;

    const cambiar = (i, cambio) => setConfig((c) => ({ ...c, anuncios: c.anuncios.map((a, j) => (j === i ? { ...a, ...cambio } : a)) }));
    const mover = (i, paso) =>
        setConfig((c) => {
            const lista = [...c.anuncios];
            [lista[i], lista[i + paso]] = [lista[i + paso], lista[i]];
            return { ...c, anuncios: lista };
        });

    async function guardar() {
        setGuardando(true);
        try {
            const r = await api("/admin/carrusel", { metodo: "PUT", body: { config } });
            setConfig((c) => ({ ...c, segundos: r.config.segundos }));
            setAviso({ texto: "Anuncios guardados. Ya salen en el lobby.", tono: "ok" });
        } catch (err) {
            mal(err);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div>
                <h2 className="lg-card-title">Anuncios del lobby</h2>
                <p className="lb-muted">
                    Pasan uno tras otro arriba a la izquierda del lobby, al lado de la ruleta GiraGamif. Al tocar uno, el
                    jugador va al evento o pantalla, o queda elegido el juego. Sin foto se ve el título sobre el fondo de
                    color; con foto, el título solo sale si lo escribes.
                </p>
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            <section className="lb-card lg-row" style={{ alignItems: "flex-end" }}>
                <label className="lg-field">
                    <span>Segundos por anuncio</span>
                    <input className="lg-input" style={{ width: 90 }} type="number" min={3} max={30} value={config.segundos} onChange={(e) => setConfig({ ...config, segundos: e.target.value })} />
                </label>
                <label className="lg-row" style={{ alignItems: "center", gap: 6, cursor: "pointer", paddingBottom: 10 }}>
                    <input type="checkbox" checked={config.auto_eventos} onChange={(e) => setConfig({ ...config, auto_eventos: e.target.checked })} />
                    <span>Agregar automáticamente los eventos activos que no estén en la lista</span>
                </label>
            </section>

            {config.anuncios.length === 0 && (
                <p className="lb-card lb-muted">{config.auto_eventos ? "Sin anuncios: solo saldrán los eventos activos." : "Sin anuncios: en el lobby sale el juego destacado."}</p>
            )}

            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {config.anuncios.map((a, i) => (
                    <FilaAnuncio
                        key={i}
                        a={a}
                        n={i + 1}
                        total={config.anuncios.length}
                        datos={datos}
                        cambiar={(cambio) => cambiar(i, cambio)}
                        mover={(paso) => mover(i, paso)}
                        quitar={() => setConfig((c) => ({ ...c, anuncios: c.anuncios.filter((_, j) => j !== i) }))}
                        alError={mal}
                    />
                ))}
            </ol>

            <div className="lg-row">
                <button
                    type="button"
                    className="lb-btn lb-btn-ghost"
                    onClick={() => setConfig((c) => ({ ...c, anuncios: [...c.anuncios, nuevoAnuncio()] }))}
                    disabled={config.anuncios.length >= 12}
                >
                    <LuPlus aria-hidden="true" />
                    Agregar anuncio
                </button>
                <button type="button" className="lb-btn lb-btn-primary" onClick={guardar} disabled={guardando}>
                    <LuSave aria-hidden="true" />
                    {guardando ? "Guardando…" : "Guardar anuncios"}
                </button>
            </div>
        </div>
    );
}
