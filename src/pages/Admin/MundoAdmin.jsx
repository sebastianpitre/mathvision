import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { LuPenTool, LuSave } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";
import { Cielo, Luces, Objetos, Suelo } from "../Mundo/Escena";
import { NOMBRE_ACCION, NOMBRE_BOTON, TAMANOS_POR_DEFECTO, TECLAS_POR_DEFECTO, nombreTecla } from "../Mundo/controles";

/* =========================================================
   MUNDO 3D (pestaña del panel)
   · El diseño se hace en el EDITOR (pantalla completa).
   · Aquí: un vistazo en 3D, cuántas cosas tiene y qué
     personajes (.glb) se pueden usar al caminar.
========================================================= */

function Vistazo({ config }) {
    const centro = useRef({ x: 0, z: 0 });
    return (
        <div style={{ height: 300, borderRadius: 12, overflow: "hidden", border: "1px solid var(--lb-border, #333)" }}>
            <Canvas shadows="percentage" camera={{ position: [26, 20, 32], fov: 50, near: 0.1, far: 900 }} dpr={[1, 1.5]}>
                <Suspense fallback={null}>
                    <Cielo cielo={config.cielo} />
                    <Luces luz={config.luz} colorSuelo={config.suelo.color} siguiendo={centro} />
                    <Suelo suelo={config.suelo} materiales={config.materiales} tamano={config.tamano} />
                    <Objetos objetos={config.objetos} materiales={config.materiales} modelos={config.modelos} etiquetas={false} />
                </Suspense>
                <OrbitControls target={[0, 1, 0]} enablePan={false} maxPolarAngle={Math.PI / 2.05} minDistance={4} maxDistance={140} autoRotate autoRotateSpeed={0.6} />
            </Canvas>
        </div>
    );
}

/* Controles del mundo para todos: tamaño de los botones (celular) y teclas (PC). */
function Controles({ config, alGuardado, alAviso }) {
    const inicial = () => ({
        tamanos: { ...TAMANOS_POR_DEFECTO, ...(config.controles?.tamanos || {}) },
        teclas: { ...TECLAS_POR_DEFECTO, ...(config.controles?.teclas || {}) },
    });
    const [c, setC] = useState(inicial);
    const [escuchando, setEscuchando] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const cambio = JSON.stringify(c) !== JSON.stringify(inicial());

    // Esperando una tecla: la siguiente que se presione queda puesta (Esc cancela).
    useEffect(() => {
        if (!escuchando) return undefined;
        const tecla = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.code !== "Escape") {
                setC((x) => {
                    const teclas = { ...x.teclas };
                    // Si otra acción tenía esa tecla, queda sin tecla.
                    for (const k of Object.keys(teclas)) if (teclas[k] === e.code) teclas[k] = "";
                    teclas[escuchando] = e.code;
                    return { ...x, teclas };
                });
            }
            setEscuchando(null);
        };
        window.addEventListener("keydown", tecla, true);
        return () => window.removeEventListener("keydown", tecla, true);
    }, [escuchando]);

    async function guardar() {
        setGuardando(true);
        try {
            await api("/admin/mundo", { metodo: "PUT", body: { ...config, controles: c } });
            alAviso({ texto: "Controles guardados. Los jugadores los ven al entrar al mundo.", tono: "ok" });
            alGuardado();
        } catch (err) {
            alAviso({ texto: err.message, tono: "error" });
        } finally {
            setGuardando(false);
        }
    }

    return (
        <div className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="lg-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="lg-card-title" style={{ margin: 0 }}>🎮 Controles del mundo (para todos)</h3>
                <div className="lg-row">
                    <button type="button" className="lb-btn lb-btn-ghost" onClick={() => setC({ tamanos: { ...TAMANOS_POR_DEFECTO }, teclas: { ...TECLAS_POR_DEFECTO } })}>
                        Volver a los de fábrica
                    </button>
                    <button type="button" className="lb-btn lb-btn-primary" disabled={!cambio || guardando} onClick={guardar}>
                        <LuSave aria-hidden="true" />
                        {guardando ? "Guardando…" : "Guardar controles"}
                    </button>
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
                <div>
                    <h4 style={{ margin: "0 0 8px" }}>📱 Tamaño de los botones (celular)</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {Object.keys(NOMBRE_BOTON).map((b) => (
                            <label key={b} style={{ display: "grid", gridTemplateColumns: "90px 1fr 48px 40px", alignItems: "center", gap: 10 }}>
                                <span>{NOMBRE_BOTON[b]}</span>
                                <input
                                    type="range"
                                    min={0.6}
                                    max={1.8}
                                    step={0.05}
                                    value={c.tamanos[b]}
                                    onChange={(e) => setC((x) => ({ ...x, tamanos: { ...x.tamanos, [b]: Number(e.target.value) } }))}
                                />
                                <span className="lb-muted">{`${Math.round(c.tamanos[b] * 100)}%`}</span>
                                <span
                                    aria-hidden="true"
                                    style={{
                                        width: 32 * Math.min(1.25, c.tamanos[b]),
                                        height: 32 * Math.min(1.25, c.tamanos[b]),
                                        borderRadius: "50%",
                                        background: b === "saltar" ? "#f2a900" : "rgba(255,255,255,.25)",
                                        border: "1px solid rgba(255,255,255,.4)",
                                        justifySelf: "center",
                                    }}
                                />
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 style={{ margin: "0 0 8px" }}>⌨️ Teclas (computador)</h4>
                    <p className="lb-muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
                        Toca una tecla de la lista y luego presiona la que quieras. Las flechas siempre sirven para caminar. "Mirar con el mouse": la cámara gira moviendo el mouse
                        sin hacer clic; con la misma tecla se quita.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 12px", alignItems: "center" }}>
                        {Object.keys(NOMBRE_ACCION).map((a) => (
                            <label key={a} style={{ display: "contents" }}>
                                <span>{NOMBRE_ACCION[a]}</span>
                                <button
                                    type="button"
                                    className={`lb-btn lb-btn-sm ${escuchando === a ? "lb-btn-primary" : "lb-btn-ghost"}`}
                                    style={{ minWidth: 120, justifyContent: "center", fontFamily: "ui-monospace, monospace" }}
                                    onClick={() => setEscuchando((x) => (x === a ? null : a))}
                                >
                                    {escuchando === a ? "Presiona una tecla…" : nombreTecla(c.teclas[a])}
                                </button>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MundoAdmin() {
    const navigate = useNavigate();
    const { datos, cargando, error, recargar } = useCarga("/admin/mundo");
    const [personajes, setPersonajes] = useState([]);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (datos?.config) setPersonajes([...datos.config.personajes]);
    }, [datos]);

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;
    if (!datos) return null;

    const config = datos.config;
    const marcado = new Set(personajes);
    const glb = datos.personajes.filter((p) => p.glb);
    const otros = datos.personajes.filter((p) => !p.glb);
    const cambio = JSON.stringify([...personajes].sort()) !== JSON.stringify([...config.personajes].sort());
    const cuenta = (f) => config.objetos.filter(f).length;

    async function guardarPersonajes() {
        setGuardando(true);
        try {
            // Se guarda el diseño tal cual, solo cambian los personajes.
            await api("/admin/mundo", { metodo: "PUT", body: { ...config, personajes } });
            setAviso({ texto: "Personajes guardados.", tono: "ok" });
            recargar();
        } catch (err) {
            setAviso({ texto: err.message, tono: "error" });
        } finally {
            setGuardando(false);
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div>
                <h2 className="lg-card-title">Mundo 3D</h2>
                <p className="lb-muted" style={{ margin: 0 }}>
                    El lobby para caminar donde entran todos (botón "Mundo 3D" en el lobby). El colegio se diseña en el editor.
                </p>
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            <div className="lb-card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "center" }}>
                <Vistazo config={config} />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <h3 className="lg-card-title" style={{ margin: 0 }}>
                        🏫 Diseño del colegio
                    </h3>
                    <ul className="lb-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                        <li>{`${config.objetos.length} objetos: ${cuenta((o) => o.tipo === "salon")} salones, ${cuenta((o) => o.tipo === "pared")} paredes, ${cuenta((o) => o.tipo === "escalera")} escaleras`}</li>
                        <li>{`${cuenta((o) => o.tipo === "circulo" && o.funcion !== "teletransporte")} círculos de juego y ${cuenta((o) => o.tipo === "circulo" && o.funcion === "teletransporte")} de teletransporte`}</li>
                        <li>{`${(config.materiales || []).length} texturas guardadas y ${(config.modelos || []).length} objetos propios (.glb)`}</li>
                        <li>{`Suelo de ${(config.tamano || 60) * 2} × ${(config.tamano || 60) * 2} m`}</li>
                    </ul>
                    <button type="button" className="lb-btn lb-btn-primary" style={{ alignSelf: "flex-start", fontSize: 16, padding: "12px 20px" }} onClick={() => navigate("/editor-mundo")}>
                        <LuPenTool aria-hidden="true" />
                        Abrir el editor del Mundo 3D
                    </button>
                    <p className="lb-muted" style={{ margin: 0, fontSize: 13 }}>
                        Pantalla completa: mapa para poner y mover piezas, texturas reutilizables, deshacer/rehacer y vista 3D flotante.
                    </p>
                </div>
            </div>

            <Controles key={JSON.stringify(config.controles)} config={config} alGuardado={recargar} alAviso={setAviso} />

            <div className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="lg-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <h3 className="lg-card-title" style={{ margin: 0 }}>{`🧍 Personajes del mundo (${personajes.length})`}</h3>
                    <button type="button" className="lb-btn lb-btn-primary" disabled={!cambio || guardando} onClick={guardarPersonajes}>
                        <LuSave aria-hidden="true" />
                        {guardando ? "Guardando…" : "Guardar personajes"}
                    </button>
                </div>
                <p className="lb-muted" style={{ margin: 0 }}>
                    Marca los que se pueden usar. Solo sirven los modelos <b>.glb</b> (pesan menos; se suben en "Personajes"). Cada jugador solo ve los que
                    <b> tiene</b> (comprados, ganados, gratis o el inicial).
                    Caben hasta 40 jugadores a la vez.
                </p>
                {glb.length === 0 ? (
                    <p className="lg-alert" style={{ margin: 0 }}>
                        Aún no hay personajes .glb. Sube uno en "Personajes" y vuelve aquí.
                    </p>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                        {glb.map((p) => (
                            <label
                                key={p.id}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: 8,
                                    borderRadius: 10,
                                    cursor: "pointer",
                                    border: `2px solid ${marcado.has(p.id) ? "var(--lb-primary, #60a5fa)" : "transparent"}`,
                                    background: "rgba(255,255,255,.05)",
                                }}
                            >
                                {p.thumbnail_path ? <img src={p.thumbnail_path} alt="" style={{ width: 80, height: 80, objectFit: "contain" }} /> : <span style={{ fontSize: 40 }}>🧍</span>}
                                <span style={{ display: "flex", gap: 6, alignItems: "center", fontWeight: 600 }}>
                                    <input
                                        type="checkbox"
                                        checked={marcado.has(p.id)}
                                        onChange={() => setPersonajes((l) => (l.includes(p.id) ? l.filter((x) => x !== p.id) : [...l, p.id]))}
                                    />
                                    {p.name}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
                {otros.length > 0 && <p className="lb-muted" style={{ margin: 0 }}>{`No sirven en el mundo (son .vrm): ${otros.map((p) => p.name).join(", ")}.`}</p>}
            </div>
        </div>
    );
}
