import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { LuBox, LuCopy, LuImage, LuRotateCw, LuSave, LuTrash2, LuTreePine, LuX, LuZoomIn, LuZoomOut } from "react-icons/lu";

import { api } from "../../services/api";
import { useCarga } from "./useCarga";
import { subirArchivo } from "./subirArchivo";
import { Cielo, Luces, Objetos, Suelo } from "../Mundo/Escena";

/* =========================================================
   MUNDO 3D · DISEÑO
   · Cielo: color, degradado o una foto 360°.
   · Suelo: color o una foto que se repite como baldosa.
   · Luz: día, tarde o noche.
   · Objetos: paredes, cajas, plataformas, columnas, árboles y
     cuadros con foto. Se ponen tocando el mapa, se arrastran
     y se editan a la derecha. Hay vista 3D para revisar.
   · Personajes: solo .glb (pesan menos).
   Al guardar, los que están adentro lo ven al instante.
========================================================= */

const PIEZAS = [
    {
        tipo: "pared",
        nombre: "Pared",
        icono: "🧱",
        ancho: 8,
        alto: 3,
        largo: 0.3,
        color: "#e8e2d6",
    },
    {
        tipo: "caja",
        nombre: "Caja",
        icono: "📦",
        ancho: 2,
        alto: 2,
        largo: 2,
        color: "#c08a5b",
    },
    {
        tipo: "plataforma",
        nombre: "Plataforma",
        icono: "🟫",
        ancho: 3,
        alto: 0.8,
        largo: 3,
        color: "#8aa0b8",
    },
    {
        tipo: "columna",
        nombre: "Columna",
        icono: "🏛️",
        ancho: 0.8,
        alto: 4,
        largo: 0.8,
        color: "#d9d4cc",
    },
    {
        tipo: "arbol",
        nombre: "Árbol",
        icono: "🌳",
        ancho: 3,
        alto: 5,
        largo: 3,
        color: "#3f8f3a",
    },
    {
        tipo: "cuadro",
        nombre: "Cuadro / mural",
        icono: "🖼️",
        ancho: 3,
        alto: 2,
        largo: 0.1,
        color: "#ffffff",
        y: 0.6,
    },
    {
        tipo: "circulo",
        nombre: "Círculo de juego",
        icono: "⭕",
        ancho: 5,
        alto: 0.1,
        largo: 5,
        color: "#ffcf3e",
        juego: "zona",
        segundos: 30,
    },
];
const NOMBRE = Object.fromEntries(PIEZAS.map((p) => [p.tipo, p.nombre]));
const LIMITE = 60;
const nuevoId = () => `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const redondo = (n, paso = 0.5) => Math.round(n / paso) * paso;

/* Botón para subir una imagen (texturas: hasta 8 MB). */
function SubirImagen({ texto, alSubir, alError }) {
    const entrada = useRef(null);
    const [avance, setAvance] = useState(null);
    return (
        <>
            <input
                ref={entrada}
                type="file"
                hidden
                accept=".png,.jpg,.jpeg,.webp"
                onChange={async (e) => {
                    const archivo = e.target.files?.[0];
                    e.target.value = "";
                    if (!archivo) return;
                    setAvance(0);
                    try {
                        alSubir(await subirArchivo(archivo, "textura", setAvance));
                    } catch (err) {
                        alError(err);
                    } finally {
                        setAvance(null);
                    }
                }}
            />
            <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => entrada.current?.click()} disabled={avance !== null}>
                <LuImage aria-hidden="true" />
                {avance !== null ? `Subiendo ${avance}%` : texto}
            </button>
        </>
    );
}

function Ayuda({ children }) {
    return (
        <details className="lb-muted" style={{ fontSize: 13 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>¿Qué foto uso y de dónde la saco?</summary>
            <div style={{ paddingTop: 6, lineHeight: 1.5 }}>{children}</div>
        </details>
    );
}

/* ---------- Mapa visto desde arriba ---------- */
function Mapa({ objetos, elegido, alElegir, alMover, herramienta, alPoner, zoom, colorSuelo }) {
    const svg = useRef(null);
    const arrastre = useRef(null);

    const punto = (e) => {
        const pt = svg.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const p = pt.matrixTransform(svg.current.getScreenCTM().inverse());
        return {
            x: Math.max(-LIMITE, Math.min(LIMITE, p.x)),
            z: Math.max(-LIMITE, Math.min(LIMITE, p.y)),
        };
    };

    return (
        <div
            style={{
                overflow: "auto",
                maxHeight: 560,
                borderRadius: 12,
                border: "1px solid var(--lb-border, #333)",
                background: "#0b1020",
            }}
        >
            <svg
                ref={svg}
                viewBox={`${-LIMITE} ${-LIMITE} ${LIMITE * 2} ${LIMITE * 2}`}
                style={{
                    width: `${100 * zoom}%`,
                    minWidth: 320 * zoom,
                    display: "block",
                    cursor: herramienta ? "crosshair" : "default",
                    touchAction: "none",
                }}
                onPointerDown={(e) => {
                    if (e.target !== svg.current && !e.target.dataset.fondo) return;
                    const p = punto(e);
                    if (herramienta) alPoner(redondo(p.x), redondo(p.z));
                    else alElegir(null);
                }}
                onPointerMove={(e) => {
                    const a = arrastre.current;
                    if (!a) return;
                    const p = punto(e);
                    alMover(a.id, redondo(p.x - a.dx), redondo(p.z - a.dz));
                }}
                onPointerUp={() => (arrastre.current = null)}
                onPointerLeave={() => (arrastre.current = null)}
            >
                <rect data-fondo="1" x={-LIMITE} y={-LIMITE} width={LIMITE * 2} height={LIMITE * 2} fill={colorSuelo} opacity={0.55} />
                {Array.from({ length: 25 }, (_, i) => -LIMITE + i * 5).map((v) => (
                    <g key={v} data-fondo="1" stroke={v === 0 ? "rgba(255,255,255,.45)" : "rgba(255,255,255,.12)"} strokeWidth={v === 0 ? 0.25 : 0.12}>
                        <line data-fondo="1" x1={v} y1={-LIMITE} x2={v} y2={LIMITE} />
                        <line data-fondo="1" x1={-LIMITE} y1={v} x2={LIMITE} y2={v} />
                    </g>
                ))}
                <text x={0.6} y={-0.6} fontSize={1.6} fill="rgba(255,255,255,.6)" data-fondo="1">
                    Inicio
                </text>
                {objetos.map((o) => {
                    const sel = o.id === elegido;
                    const props = {
                        onPointerDown: (e) => {
                            e.stopPropagation();
                            alElegir(o.id);
                            const p = punto(e);
                            arrastre.current = { id: o.id, dx: p.x - o.x, dz: p.z - o.z };
                            e.currentTarget.ownerSVGElement.setPointerCapture?.(e.pointerId);
                        },
                        style: { cursor: "move" },
                        fill: o.tipo === "arbol" ? "#3f8f3a" : o.color,
                        stroke: sel ? "#ffcf3e" : "rgba(0,0,0,.6)",
                        strokeWidth: sel ? 0.5 : 0.15,
                        opacity: o.tipo === "cuadro" ? 0.9 : 0.95,
                    };
                    if (o.tipo === "circulo") {
                        return (
                            <g key={o.id}>
                                <circle
                                    cx={o.x}
                                    cy={o.z}
                                    r={o.ancho / 2}
                                    {...props}
                                    fill={o.color}
                                    fillOpacity={0.25}
                                    stroke={sel ? "#ffffff" : o.color}
                                    strokeWidth={sel ? 0.5 : 0.3}
                                />
                                <text x={o.x} y={o.z + 0.6} fontSize={1.6} textAnchor="middle" fill="#fff" pointerEvents="none">
                                    {o.juego}
                                </text>
                            </g>
                        );
                    }
                    if (o.tipo === "columna" || o.tipo === "arbol") return <circle key={o.id} cx={o.x} cy={o.z} r={o.ancho / 2} {...props} />;
                    const w = o.ancho;
                    const h = Math.max(0.25, o.largo);
                    return <rect key={o.id} x={o.x - w / 2} y={o.z - h / 2} width={w} height={h} transform={`rotate(${-(o.rot || 0)} ${o.x} ${o.z})`} {...props} />;
                })}
            </svg>
        </div>
    );
}

/* ---------- Propiedades del objeto elegido ---------- */
function Propiedades({ o, alCambiar, alBorrar, alDuplicar, alError, juegos = [] }) {
    const campo = (k, etiqueta, min, max, paso = 0.1) => (
        <label className="lg-field">
            <span>{etiqueta}</span>
            <input
                className="lg-input"
                style={{ width: 90 }}
                type="number"
                min={min}
                max={max}
                step="any"
                data-paso={paso}
                value={o[k]}
                onChange={(e) => alCambiar({ [k]: Number(e.target.value) })}
            />
        </label>
    );
    return (
        <div className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="lg-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <h4 className="lg-card-title" style={{ margin: 0, fontSize: 16 }}>
                    {NOMBRE[o.tipo]}
                </h4>
                <div className="lg-row" style={{ flexWrap: "nowrap" }}>
                    <button type="button" className="lb-icon-btn" title="Girar 90°" aria-label="Girar 90 grados" onClick={() => alCambiar({ rot: ((o.rot || 0) + 90) % 360 })}>
                        <LuRotateCw aria-hidden="true" />
                    </button>
                    <button type="button" className="lb-icon-btn" title="Duplicar" aria-label="Duplicar" onClick={alDuplicar}>
                        <LuCopy aria-hidden="true" />
                    </button>
                    <button type="button" className="lb-icon-btn" title="Borrar" aria-label="Borrar" onClick={alBorrar}>
                        <LuTrash2 aria-hidden="true" />
                    </button>
                </div>
            </div>
            <div className="lg-row" style={{ alignItems: "flex-end" }}>
                {campo("x", "X (m)", -LIMITE, LIMITE, 0.5)}
                {campo("z", "Z (m)", -LIMITE, LIMITE, 0.5)}
                {campo("y", "Altura del piso", 0, 30, 0.1)}
            </div>
            {o.tipo === "circulo" ? (
                <>
                    <div className="lg-row" style={{ alignItems: "flex-end" }}>
                        <label className="lg-field">
                            <span>Juego</span>
                            <select className="lg-select" value={o.juego} onChange={(e) => alCambiar({ juego: e.target.value })}>
                                {juegos.map((j) => (
                                    <option
                                        key={j.id}
                                        value={j.id}
                                    >{`${j.nombre} (${j.min === j.max ? j.max : `${j.min}–${j.max}`} jugadores${j.maquina ? ", o con 🤖" : ""})`}</option>
                                ))}
                            </select>
                        </label>
                        {campo("segundos", "Cada cuántos segundos", 5, 300, 1)}
                        {campo("ancho", "Diámetro (m)", 1, 30)}
                    </div>
                    <p className="lb-muted" style={{ margin: 0, fontSize: 13 }}>
                        Cuando alguien se para adentro empieza la cuenta. Al llegar a cero se arma la partida con los que estén adentro (los primeros que entraron, hasta el máximo
                        del juego); van a una pantalla previa con sus nombres y ✓, y el juego empieza cuando a todos les cargó. Si falta gente y el juego admite la máquina, se
                        completa con 🤖; si no, vuelve a contar. El letrero queda al fondo del círculo (gíralo para cambiar hacia dónde mira).
                    </p>
                </>
            ) : (
                <div className="lg-row" style={{ alignItems: "flex-end" }}>
                    {campo("ancho", o.tipo === "arbol" ? "Copa (m)" : "Ancho (m)", 0.1, 60)}
                    {campo("alto", "Alto (m)", 0.1, 30)}
                    {!["columna", "arbol"].includes(o.tipo) && campo("largo", "Grosor/largo (m)", 0.05, 60)}
                </div>
            )}
            <label className="lg-field">
                <span>{`Girar: ${o.rot || 0}°`}</span>
                <input type="range" min={0} max={359} step={5} value={((o.rot || 0) + 360) % 360} onChange={(e) => alCambiar({ rot: Number(e.target.value) })} />
            </label>
            <div className="lg-row" style={{ alignItems: "center" }}>
                <label className="lg-field">
                    <span>{o.tipo === "cuadro" ? "Marco" : "Color"}</span>
                    <input type="color" value={o.color} onChange={(e) => alCambiar({ color: e.target.value })} style={{ width: 70, height: 38 }} />
                </label>
                {o.tipo !== "circulo" && (
                    <div className="lg-field">
                        <span>{o.tipo === "cuadro" ? "Foto del cuadro" : "Foto como textura"}</span>
                        <div className="lg-row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
                            {o.textura && (
                                <img
                                    src={o.textura}
                                    alt=""
                                    style={{
                                        width: 40,
                                        height: 40,
                                        objectFit: "cover",
                                        borderRadius: 6,
                                    }}
                                />
                            )}
                            <SubirImagen texto={o.textura ? "Cambiar" : "Subir foto"} alSubir={(ruta) => alCambiar({ textura: ruta })} alError={alError} />
                            {o.textura && (
                                <button type="button" className="lb-icon-btn" title="Quitar foto" aria-label="Quitar foto" onClick={() => alCambiar({ textura: null })}>
                                    <LuX aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {o.textura && !["cuadro", "circulo"].includes(o.tipo) && campo("baldosa", "Cada foto mide (m)", 0.25, 50, 0.25)}
            </div>
        </div>
    );
}

/* ---------- Vista 3D ---------- */
function Vista3D({ form }) {
    const centro = useRef({ x: 0, z: 0 });
    return (
        <div
            style={{
                height: 420,
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid var(--lb-border, #333)",
            }}
        >
            <Canvas shadows="percentage" camera={{ position: [22, 18, 28], fov: 50, near: 0.1, far: 900 }} dpr={[1, 1.5]}>
                <Suspense fallback={null}>
                    <Cielo cielo={form.cielo} />
                    <Luces luz={form.luz} colorSuelo={form.suelo.color} siguiendo={centro} />
                    <Suelo suelo={form.suelo} />
                    <Objetos objetos={form.objetos} />
                </Suspense>
                <OrbitControls target={[0, 1, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={3} maxDistance={110} />
            </Canvas>
        </div>
    );
}

export default function MundoAdmin() {
    const { datos, cargando, error, recargar } = useCarga("/admin/mundo");
    const [form, setForm] = useState(null);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [guardando, setGuardando] = useState(false);
    const [herramienta, setHerramienta] = useState(null);
    const [elegido, setElegido] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [ver3d, setVer3d] = useState(true);
    const [cambios, setCambios] = useState(false);

    useEffect(() => {
        if (datos?.config) {
            setForm(structuredClone(datos.config));
            setCambios(false);
        }
    }, [datos]);

    if (cargando && !datos)
        return (
            <div className="lb-card lg-empty" role="status">
                Cargando…
            </div>
        );
    if (error)
        return (
            <p className="lg-alert" role="alert">
                {error}
            </p>
        );
    if (!form) return null;

    const cambiar = (fn) => {
        setForm((f) => fn(structuredClone(f)));
        setCambios(true);
    };
    const alError = (err) => setAviso({ texto: err.message, tono: "error" });
    const marcado = new Set(form.personajes);
    const glb = datos.personajes.filter((p) => p.glb);
    const otros = datos.personajes.filter((p) => !p.glb);
    const objeto = form.objetos.find((o) => o.id === elegido);

    const poner = (x, z) => {
        const pieza = PIEZAS.find((p) => p.tipo === herramienta);
        if (!pieza) return;
        const id = nuevoId();
        cambiar((f) => {
            f.objetos.push({
                id,
                tipo: pieza.tipo,
                x,
                z,
                y: pieza.y || 0,
                rot: 0,
                ancho: pieza.ancho,
                alto: pieza.alto,
                largo: pieza.largo,
                color: pieza.color,
                textura: null,
                baldosa: 2,
                ...(pieza.juego ? { juego: pieza.juego, segundos: pieza.segundos } : {}),
            });
            return f;
        });
        setElegido(id);
        setHerramienta(null);
    };

    // Un salón de 10 × 8 m con puerta (4 paredes).
    const ponerSalon = () => {
        const cx = 0;
        const cz = -14;
        const base = {
            tipo: "pared",
            y: 0,
            alto: 3,
            largo: 0.3,
            color: "#efe7d8",
            textura: null,
            baldosa: 2,
        };
        cambiar((f) => {
            f.objetos.push(
                { ...base, id: nuevoId(), x: cx, z: cz - 4, rot: 0, ancho: 10 },
                { ...base, id: nuevoId(), x: cx - 5, z: cz, rot: 90, ancho: 8 },
                { ...base, id: nuevoId(), x: cx + 5, z: cz, rot: 90, ancho: 8 },
                { ...base, id: nuevoId(), x: cx - 3.25, z: cz + 4, rot: 0, ancho: 3.5 },
                { ...base, id: nuevoId(), x: cx + 3.25, z: cz + 4, rot: 0, ancho: 3.5 },
            );
            return f;
        });
        setAviso({
            texto: "Salón agregado (al norte del inicio). Muévelo arrastrando cada pared.",
            tono: "ok",
        });
    };

    const alternar = (id) =>
        cambiar((f) => {
            f.personajes = f.personajes.includes(id) ? f.personajes.filter((x) => x !== id) : [...f.personajes, id];
            return f;
        });

    async function guardar(e) {
        e?.preventDefault();
        setGuardando(true);
        try {
            await api("/admin/mundo", { metodo: "PUT", body: form });
            setAviso({
                texto: "Mundo guardado. Los que están adentro ya lo ven.",
                tono: "ok",
            });
            setCambios(false);
            recargar();
        } catch (err) {
            alError(err);
        } finally {
            setGuardando(false);
        }
    }

    return (
        <form noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }} onSubmit={guardar}>
            <div className="lg-row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h2 className="lg-card-title">Mundo 3D</h2>
                    <p className="lb-muted" style={{ margin: 0 }}>
                        Un lobby para caminar donde entran todos (botón "Mundo 3D" en el lobby). Aquí se diseña el colegio: cielo, suelo, luz y objetos.
                    </p>
                </div>
                <button type="submit" className="lb-btn lb-btn-primary" disabled={guardando} style={{ position: "sticky", top: 8 }}>
                    <LuSave aria-hidden="true" />
                    {guardando ? "Guardando…" : cambios ? "Guardar cambios" : "Guardar mundo"}
                </button>
            </div>

            {aviso.texto && (
                <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">
                    {aviso.texto}
                </p>
            )}

            {/* ---------- Cielo, suelo y luz ---------- */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "var(--lb-gap)",
                }}
            >
                <div className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <h3 className="lg-card-title">☁️ Cielo</h3>
                    <div className="lg-row">
                        {[
                            ["color", "Un color"],
                            ["degradado", "Degradado"],
                            ["foto", "Foto 360°"],
                        ].map(([id, t]) => (
                            <button
                                key={id}
                                type="button"
                                className={`lb-btn lb-btn-sm ${form.cielo.tipo === id ? "lb-btn-primary" : "lb-btn-ghost"}`}
                                onClick={() =>
                                    cambiar((f) => {
                                        f.cielo.tipo = id;
                                        return f;
                                    })
                                }
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="lg-row" style={{ alignItems: "flex-end" }}>
                        {form.cielo.tipo === "color" ? (
                            <label className="lg-field">
                                <span>Color</span>
                                <input
                                    type="color"
                                    value={form.cielo.color}
                                    onChange={(e) => cambiar((f) => ((f.cielo.color = e.target.value), f))}
                                    style={{ width: 70, height: 38 }}
                                />
                            </label>
                        ) : (
                            <>
                                <label className="lg-field">
                                    <span>Arriba</span>
                                    <input
                                        type="color"
                                        value={form.cielo.arriba}
                                        onChange={(e) => cambiar((f) => ((f.cielo.arriba = e.target.value), f))}
                                        style={{ width: 70, height: 38 }}
                                    />
                                </label>
                                <label className="lg-field">
                                    <span>Horizonte (y niebla)</span>
                                    <input
                                        type="color"
                                        value={form.cielo.horizonte}
                                        onChange={(e) => cambiar((f) => ((f.cielo.horizonte = e.target.value), f))}
                                        style={{ width: 70, height: 38 }}
                                    />
                                </label>
                            </>
                        )}
                        {form.cielo.tipo === "foto" && (
                            <div className="lg-field">
                                <span>Foto 360°</span>
                                <div className="lg-row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
                                    {form.cielo.foto && (
                                        <img
                                            src={form.cielo.foto}
                                            alt=""
                                            style={{
                                                width: 80,
                                                height: 40,
                                                objectFit: "cover",
                                                borderRadius: 6,
                                            }}
                                        />
                                    )}
                                    <SubirImagen
                                        texto={form.cielo.foto ? "Cambiar" : "Subir foto 360°"}
                                        alSubir={(ruta) => cambiar((f) => ((f.cielo.foto = ruta), f))}
                                        alError={alError}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <Ayuda>
                        <b>Formato:</b> una foto panorámica <b>360° "equirectangular"</b>: el doble de ancha que de alta (<b>2:1</b>, por ejemplo <b>4096 × 2048</b>), en <b>JPG</b>{" "}
                        y hasta 8 MB. Si no es 2:1 se verá estirada.
                        <br />
                        <b>De dónde:</b> <b>polyhaven.com/hdris</b> (gratis y libres, CC0): elige un cielo, en el formato escoge <b>JPG</b> (tonemapped) 4K. También sirve una foto
                        360° tomada con el celular (modo panorámica/esfera de Google Street View o la cámara 360°) o una generada con IA pidiendo "equirectangular 360 panorama,
                        sky, 2:1".
                    </Ayuda>
                </div>

                <div className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <h3 className="lg-card-title">🟩 Suelo</h3>
                    <div className="lg-row" style={{ alignItems: "flex-end" }}>
                        <label className="lg-field">
                            <span>Color</span>
                            <input
                                type="color"
                                value={form.suelo.color}
                                onChange={(e) => cambiar((f) => ((f.suelo.color = e.target.value), f))}
                                style={{ width: 70, height: 38 }}
                            />
                        </label>
                        <div className="lg-field">
                            <span>Foto como textura</span>
                            <div className="lg-row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
                                {form.suelo.textura && (
                                    <img
                                        src={form.suelo.textura}
                                        alt=""
                                        style={{
                                            width: 40,
                                            height: 40,
                                            objectFit: "cover",
                                            borderRadius: 6,
                                        }}
                                    />
                                )}
                                <SubirImagen
                                    texto={form.suelo.textura ? "Cambiar" : "Subir foto"}
                                    alSubir={(ruta) => cambiar((f) => ((f.suelo.textura = ruta), f))}
                                    alError={alError}
                                />
                                {form.suelo.textura && (
                                    <button
                                        type="button"
                                        className="lb-icon-btn"
                                        title="Quitar foto"
                                        aria-label="Quitar foto del suelo"
                                        onClick={() => cambiar((f) => ((f.suelo.textura = null), f))}
                                    >
                                        <LuX aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <label className="lg-field">
                            <span>Cada foto mide (m)</span>
                            <input
                                className="lg-input"
                                style={{ width: 90 }}
                                type="number"
                                min={0.25}
                                max={50}
                                step={0.25}
                                value={form.suelo.baldosa}
                                onChange={(e) => cambiar((f) => ((f.suelo.baldosa = Number(e.target.value)), f))}
                            />
                        </label>
                    </div>
                    <Ayuda>
                        <b>Formato:</b> una foto <b>cuadrada</b> que se pueda repetir sin que se note el borde (<b>"seamless" / "tileable"</b>), de <b>1024 × 1024</b> o{" "}
                        <b>2048 × 2048</b>, en JPG. "Cada foto mide" es cuántos metros ocupa cada repetición (una baldosa de 60 cm → 0.6; un pedazo de pasto → 4).
                        <br />
                        <b>De dónde:</b> <b>ambientcg.com</b> o <b>polyhaven.com/textures</b> (gratis, CC0): descarga el ZIP 1K o 2K-JPG y sube el archivo que dice <b>Color</b> (o
                        Diffuse). O toma una foto del piso real del colegio <b>de frente, con buena luz y sin sombras</b>, y recórtala cuadrada. Con IA: "seamless tileable texture
                        of school floor tiles, top view".
                        <br />
                        Las mismas fotos sirven para las paredes y objetos (ladrillo, madera, pintura…).
                    </Ayuda>
                </div>

                <div className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <h3 className="lg-card-title">💡 Luz</h3>
                    <div className="lg-row">
                        {[
                            ["dia", "☀️ Día"],
                            ["tarde", "🌇 Tarde"],
                            ["noche", "🌙 Noche"],
                        ].map(([id, t]) => (
                            <button
                                key={id}
                                type="button"
                                className={`lb-btn lb-btn-sm ${form.luz === id ? "lb-btn-primary" : "lb-btn-ghost"}`}
                                onClick={() => cambiar((f) => ((f.luz = id), f))}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <p className="lb-muted" style={{ margin: 0, fontSize: 13 }}>
                        Cambia el color del sol y las sombras. Para la noche, pon un cielo oscuro (degradado azul oscuro).
                    </p>
                </div>
            </div>

            {/* ---------- Objetos ---------- */}
            <div className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="lg-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <h3 className="lg-card-title" style={{ margin: 0 }}>{`🏫 Objetos (${form.objetos.length})`}</h3>
                    <div className="lg-row" style={{ alignItems: "center" }}>
                        <button type="button" className="lb-icon-btn" onClick={() => setZoom((z) => Math.max(1, z / 2))} aria-label="Alejar mapa" title="Alejar">
                            <LuZoomOut aria-hidden="true" />
                        </button>
                        <button type="button" className="lb-icon-btn" onClick={() => setZoom((z) => Math.min(8, z * 2))} aria-label="Acercar mapa" title="Acercar">
                            <LuZoomIn aria-hidden="true" />
                        </button>
                        <label className="lg-row" style={{ alignItems: "center", gap: 6, cursor: "pointer" }}>
                            <input type="checkbox" checked={ver3d} onChange={(e) => setVer3d(e.target.checked)} />
                            Vista 3D
                        </label>
                    </div>
                </div>
                <div className="lg-row" style={{ alignItems: "center" }}>
                    <span className="lb-muted">Elige una pieza y toca el mapa para ponerla:</span>
                    {PIEZAS.map((p) => (
                        <button
                            key={p.tipo}
                            type="button"
                            className={`lb-btn lb-btn-sm ${herramienta === p.tipo ? "lb-btn-primary" : "lb-btn-ghost"}`}
                            onClick={() => setHerramienta((h) => (h === p.tipo ? null : p.tipo))}
                        >
                            {p.icono} {p.nombre}
                        </button>
                    ))}
                    <button type="button" className="lb-btn lb-btn-sm lb-btn-ghost" onClick={ponerSalon}>
                        <LuBox aria-hidden="true" /> Salón 10×8
                    </button>
                </div>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: ver3d ? "repeat(auto-fit, minmax(340px, 1fr))" : "1fr",
                        gap: 12,
                        alignItems: "start",
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <Mapa
                            objetos={form.objetos}
                            elegido={elegido}
                            alElegir={setElegido}
                            herramienta={herramienta}
                            alPoner={poner}
                            zoom={zoom}
                            colorSuelo={form.suelo.color}
                            alMover={(id, x, z) =>
                                cambiar((f) => {
                                    const o = f.objetos.find((y) => y.id === id);
                                    if (o) Object.assign(o, { x, z });
                                    return f;
                                })
                            }
                        />
                        <span className="lb-muted" style={{ fontSize: 12 }}>
                            Vista desde arriba: cada cuadro son 5 m. Arrastra para mover; toca uno para editarlo. Los jugadores aparecen en el centro (Inicio).
                        </span>
                    </div>
                    {ver3d && <Vista3D form={form} />}
                </div>
                {objeto ? (
                    <Propiedades
                        o={objeto}
                        juegos={datos.juegos}
                        alError={alError}
                        alCambiar={(c) =>
                            cambiar((f) => {
                                Object.assign(
                                    f.objetos.find((y) => y.id === objeto.id),
                                    c,
                                );
                                return f;
                            })
                        }
                        alBorrar={() => {
                            cambiar((f) => ((f.objetos = f.objetos.filter((y) => y.id !== objeto.id)), f));
                            setElegido(null);
                        }}
                        alDuplicar={() => {
                            const id = nuevoId();
                            cambiar((f) => {
                                f.objetos.push({
                                    ...objeto,
                                    id,
                                    x: Math.min(LIMITE, objeto.x + 2),
                                    z: Math.min(LIMITE, objeto.z + 2),
                                });
                                return f;
                            });
                            setElegido(id);
                        }}
                    />
                ) : (
                    <p className="lb-muted" style={{ margin: 0 }}>
                        <LuTreePine aria-hidden="true" style={{ verticalAlign: -2 }} /> Toca un objeto del mapa para cambiar su tamaño, color, foto o girarlo. Las plataformas
                        sirven para brincar encima (miden menos de 1.3 m).
                    </p>
                )}
            </div>

            {/* ---------- Personajes ---------- */}
            <div className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <h3 className="lg-card-title">{`🧍 Personajes del mundo (${form.personajes.length})`}</h3>
                <p className="lb-muted" style={{ margin: 0 }}>
                    Marca los que se pueden usar. Solo sirven los modelos <b>.glb</b> (se suben en la pestaña "Personajes"). Cada jugador elige uno al entrar; no necesita haberlo
                    comprado. Caben hasta 40 jugadores a la vez.
                </p>
                {glb.length === 0 ? (
                    <p className="lg-alert" style={{ margin: 0 }}>
                        Aún no hay personajes .glb. Sube uno en "Personajes" (Subir modelo .vrm o .glb) y vuelve aquí.
                    </p>
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                            gap: 10,
                        }}
                    >
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
                                {p.thumbnail_path ? (
                                    <img src={p.thumbnail_path} alt="" style={{ width: 80, height: 80, objectFit: "contain" }} />
                                ) : (
                                    <span style={{ fontSize: 40 }}>🧍</span>
                                )}
                                <span
                                    style={{
                                        display: "flex",
                                        gap: 6,
                                        alignItems: "center",
                                        fontWeight: 600,
                                    }}
                                >
                                    <input type="checkbox" checked={marcado.has(p.id)} onChange={() => alternar(p.id)} />
                                    {p.name}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
                {otros.length > 0 && <p className="lb-muted" style={{ margin: 0 }}>{`No sirven en el mundo (son .vrm): ${otros.map((p) => p.name).join(", ")}.`}</p>}
            </div>
        </form>
    );
}
