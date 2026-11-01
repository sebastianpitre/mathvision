import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
    LuArrowLeft,
    LuBox,
    LuCopy,
    LuCrosshair,
    LuEye,
    LuEyeOff,
    LuHand,
    LuImage,
    LuLayers,
    LuMaximize,
    LuMousePointer2,
    LuPalette,
    LuPencil,
    LuPlus,
    LuRedo2,
    LuRotateCw,
    LuSave,
    LuSettings,
    LuSun,
    LuTrash2,
    LuUndo2,
    LuX,
    LuZoomIn,
    LuZoomOut,
} from "react-icons/lu";

import { api } from "../../../services/api";
import { subirArchivo } from "../subirArchivo";
import { Cielo, Luces, Objetos, Suelo } from "../../Mundo/Escena";
import { partesDe } from "../../Mundo/piezas.js";
import {
    ICONO_TIPO,
    LIMITE,
    NOMBRE_TIPO,
    PIEZAS,
    REDONDOS,
    SIN_INCLINAR,
    SIN_LARGO,
    aLocal,
    aMundo,
    crearPieza,
    idMaterialNuevo,
    idNuevo,
    limitar,
    nombreVisible,
    prefijoDe,
    radioDe,
    redondear,
} from "./datos";

import "./editor.css";

/* =========================================================
   EDITOR DEL MUNDO 3D (pantalla completa, para el admin)
   · Mapa visto desde arriba: clic para elegir y arrastrar;
     clic derecho (o la mano / barra espaciadora) para moverse
     por el mapa; la rueda acerca y aleja.
   · Al elegir un objeto sale encima una barra: girar 90°,
     duplicar, eliminar y ⚙ (todas sus opciones). Las agarraderas
     cambian el tamaño y el círculo de arriba lo gira.
   · Texturas guardadas: se crean una vez (color o foto con su
     tamaño en metros) y se usan en muchos objetos; si se cambia
     la textura, cambian todos.
   · Deshacer / rehacer (Ctrl+Z / Ctrl+Y), Guardar (Ctrl+S).
   · Vista 3D flotante (se puede mover y cambiar de tamaño); el
     clic derecho ahí no mueve el mapa.
========================================================= */

const MAX_HISTORIA = 120;
const ESCALA_INICIAL = 9; // píxeles por metro

/* ---------------- Historia (deshacer / rehacer) ---------------- */
function useHistoria() {
    const [doc, setDoc] = useState(null);
    const pasado = useRef([]);
    const futuro = useRef([]);
    const [, setVer] = useState(0);
    const guardadoRef = useRef(null);

    const iniciar = useCallback((d) => {
        pasado.current = [];
        futuro.current = [];
        guardadoRef.current = JSON.stringify(d);
        setDoc(d);
        setVer((n) => n + 1);
    }, []);

    /* registrar = false: cambio en vivo (arrastrar); se registra al soltar con marcar(). */
    const cambiar = useCallback((fn, registrar = true) => {
        setDoc((d) => {
            const nuevo = fn(structuredClone(d));
            if (registrar) {
                pasado.current.push(d);
                if (pasado.current.length > MAX_HISTORIA) pasado.current.shift();
                futuro.current = [];
            }
            return nuevo;
        });
        if (registrar) setVer((n) => n + 1);
    }, []);

    /* Guarda en la historia un estado anterior (el de antes de arrastrar). */
    const marcar = useCallback((antes) => {
        pasado.current.push(antes);
        if (pasado.current.length > MAX_HISTORIA) pasado.current.shift();
        futuro.current = [];
        setVer((n) => n + 1);
    }, []);

    const deshacer = useCallback(() => {
        setDoc((d) => {
            if (!pasado.current.length) return d;
            futuro.current.push(d);
            return pasado.current.pop();
        });
        setVer((n) => n + 1);
    }, []);

    const rehacer = useCallback(() => {
        setDoc((d) => {
            if (!futuro.current.length) return d;
            pasado.current.push(d);
            return futuro.current.pop();
        });
        setVer((n) => n + 1);
    }, []);

    return {
        doc,
        iniciar,
        cambiar,
        marcar,
        deshacer,
        rehacer,
        puedeDeshacer: pasado.current.length > 0,
        puedeRehacer: futuro.current.length > 0,
        sinGuardar: doc != null && JSON.stringify(doc) !== guardadoRef.current,
        marcarGuardado: (d) => {
            guardadoRef.current = JSON.stringify(d);
            setVer((n) => n + 1);
        },
    };
}

/* ---------------- Subir imagen ---------------- */
function SubirImagen({ texto, alSubir, alError, className = "ed-btn" }) {
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
                        alError(err.message);
                    } finally {
                        setAvance(null);
                    }
                }}
            />
            <button type="button" className={className} onClick={() => entrada.current?.click()} disabled={avance !== null}>
                <LuImage aria-hidden="true" />
                {avance !== null ? `Subiendo ${avance}%` : texto}
            </button>
        </>
    );
}

/* ---------------- Muestra de una textura ---------------- */
function Muestra({ m, grande = false }) {
    const estilo = m?.tipo === "imagen" && m.textura ? { backgroundImage: `url(${m.textura})` } : { background: m?.color || "#ccc" };
    return <span className={`ed-muestra ${grande ? "ed-muestra-grande" : ""}`} style={estilo} aria-hidden="true" />;
}

/* ---------------- Campo numérico ---------------- */
function Numero({ etiqueta, valor, alCambiar, min, max, paso = 0.1, sufijo = "m" }) {
    const [texto, setTexto] = useState(String(valor ?? 0));
    useEffect(() => setTexto(String(Math.round((valor ?? 0) * 100) / 100)), [valor]);
    const confirmar = (t) => {
        const n = Number(String(t).replace(",", "."));
        if (Number.isFinite(n)) alCambiar(limitar(n, min, max));
        else setTexto(String(valor));
    };
    return (
        <label className="ed-num">
            <span>{etiqueta}</span>
            <div>
                <input
                    inputMode="decimal"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onBlur={(e) => confirmar(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") confirmar(e.currentTarget.value);
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                            const n = limitar((Number(texto) || 0) + (e.key === "ArrowUp" ? 1 : -1) * paso * (e.shiftKey ? 10 : 1), min, max);
                            alCambiar(Math.round(n * 100) / 100);
                        }
                    }}
                />
                {sufijo && <em>{sufijo}</em>}
            </div>
        </label>
    );
}

/* ---------------- Opciones del objeto (⚙) ---------------- */
function Propiedades({ o, doc, juegos, alCambiar, alCerrar, alNuevaTextura, estilo }) {
    const materiales = doc.materiales || [];
    const circulos = doc.objetos.filter((x) => x.id !== o.id && x.tipo === "circulo");
    const otros = doc.objetos.filter((x) => x.id !== o.id && x.tipo !== "circulo");
    const c = (k) => (v) => alCambiar({ [k]: v });
    return (
        <section className="ed-props" style={estilo} onPointerDown={(e) => e.stopPropagation()} aria-label="Opciones del objeto">
            <header>
                <span className="ed-props-icono">{ICONO_TIPO[o.tipo]}</span>
                <div>
                    <strong>{NOMBRE_TIPO[o.tipo]}</strong>
                    <small>
                        ID <code>{o.id}</code>
                    </small>
                </div>
                <button type="button" className="ed-icono" onClick={alCerrar} aria-label="Cerrar opciones">
                    <LuX aria-hidden="true" />
                </button>
            </header>

            <div className="ed-props-cuerpo">
                <label className="ed-campo">
                    <span>Nombre (opcional)</span>
                    <input value={o.nombre || ""} maxLength={40} placeholder={`Ej: ${o.tipo === "circulo" ? "Puerta salón 101" : "Salón 101"}`} onChange={(e) => alCambiar({ nombre: e.target.value })} />
                </label>

                <h4>Posición</h4>
                <div className="ed-fila">
                    <Numero etiqueta="X" valor={o.x} min={-LIMITE} max={LIMITE} paso={0.25} alCambiar={c("x")} />
                    <Numero etiqueta="Z" valor={o.z} min={-LIMITE} max={LIMITE} paso={0.25} alCambiar={c("z")} />
                    <Numero etiqueta="Altura" valor={o.y || 0} min={0} max={30} paso={0.1} alCambiar={c("y")} />
                </div>

                <h4>Tamaño</h4>
                <div className="ed-fila">
                    <Numero etiqueta={REDONDOS.includes(o.tipo) ? "Diámetro" : "Ancho"} valor={o.ancho} min={0.1} max={60} alCambiar={c("ancho")} />
                    {!SIN_LARGO.includes(o.tipo) && <Numero etiqueta={["pared", "cuadro"].includes(o.tipo) ? "Grosor" : "Largo"} valor={o.largo} min={0.05} max={60} alCambiar={c("largo")} />}
                    {o.tipo !== "circulo" && <Numero etiqueta="Alto" valor={o.alto} min={0.1} max={30} alCambiar={c("alto")} />}
                </div>
                {o.tipo === "salon" && (
                    <div className="ed-fila">
                        <Numero etiqueta="Grosor paredes" valor={o.grosor ?? 0.25} min={0.05} max={2} paso={0.05} alCambiar={c("grosor")} />
                    </div>
                )}
                {o.tipo === "escalera" && (
                    <div className="ed-fila">
                        <Numero etiqueta="Peldaños" valor={o.peldanos ?? 12} min={2} max={60} paso={1} sufijo="" alCambiar={(v) => alCambiar({ peldanos: Math.round(v) })} />
                        <label className="ed-check">
                            <input type="checkbox" checked={Boolean(o.flotante)} onChange={(e) => alCambiar({ flotante: e.target.checked })} />
                            Flotante (solo peldaños)
                        </label>
                    </div>
                )}

                <h4>Giro</h4>
                <div className="ed-fila ed-fila-giro">
                    <Numero etiqueta="Girar" valor={o.rot || 0} min={-360} max={360} paso={5} sufijo="°" alCambiar={c("rot")} />
                    <input type="range" min={0} max={359} step={1} value={((Math.round(o.rot || 0) % 360) + 360) % 360} onChange={(e) => alCambiar({ rot: Number(e.target.value) })} aria-label="Girar" />
                </div>
                {!SIN_INCLINAR.includes(o.tipo) && (
                    <div className="ed-fila ed-fila-giro">
                        <Numero etiqueta="Inclinar" valor={o.incl || 0} min={-80} max={80} paso={1} sufijo="°" alCambiar={c("incl")} />
                        <input type="range" min={-80} max={80} step={1} value={o.incl || 0} onChange={(e) => alCambiar({ incl: Number(e.target.value) })} aria-label="Inclinar" />
                    </div>
                )}
                {!SIN_INCLINAR.includes(o.tipo) && <p className="ed-ayuda">Positivo: sube hacia la flecha. Hasta 50° se puede caminar por encima (rampa).</p>}

                {o.tipo === "circulo" ? (
                    <>
                        <h4>Función</h4>
                        <div className="ed-segmentos">
                            {[
                                ["juego", "🎮 Juego"],
                                ["teletransporte", "🌀 Teletransporte"],
                            ].map(([id, t]) => (
                                <button key={id} type="button" className={(o.funcion || "juego") === id ? "ed-on" : ""} onClick={() => alCambiar({ funcion: id })}>
                                    {t}
                                </button>
                            ))}
                        </div>
                        {(o.funcion || "juego") === "juego" ? (
                            <div className="ed-fila">
                                <label className="ed-campo">
                                    <span>Juego</span>
                                    <select value={o.juego || "zona"} onChange={(e) => alCambiar({ juego: e.target.value })}>
                                        {juegos.map((j) => (
                                            <option key={j.id} value={j.id}>{`${j.nombre} (${j.min === j.max ? j.max : `${j.min}–${j.max}`})`}</option>
                                        ))}
                                    </select>
                                </label>
                                <Numero etiqueta="Cada" valor={o.segundos ?? 30} min={5} max={300} paso={5} sufijo="s" alCambiar={(v) => alCambiar({ segundos: Math.round(v) })} />
                            </div>
                        ) : (
                            <>
                                <label className="ed-campo">
                                    <span>Lleva a</span>
                                    <select value={o.destino || ""} onChange={(e) => alCambiar({ destino: e.target.value || null })}>
                                        <option value="">— Elige el destino —</option>
                                        {circulos.length > 0 && (
                                            <optgroup label="Círculos">
                                                {circulos.map((x) => (
                                                    <option key={x.id} value={x.id}>
                                                        {nombreVisible(x)}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                        {otros.length > 0 && (
                                            <optgroup label="Otros objetos">
                                                {otros.map((x) => (
                                                    <option key={x.id} value={x.id}>
                                                        {nombreVisible(x)}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </label>
                                <p className="ed-ayuda">En el mundo, al pararse aquí sale el botón USAR y lleva al destino. Ideal como puerta de un salón: pon uno adentro y otro afuera apuntándose entre sí.</p>
                            </>
                        )}
                        <label className="ed-campo ed-campo-color">
                            <span>Color del círculo</span>
                            <input type="color" value={o.color} onChange={(e) => alCambiar({ color: e.target.value })} />
                        </label>
                    </>
                ) : (
                    <>
                        <h4>Textura</h4>
                        <div className="ed-texturas-mini">
                            <button type="button" className={`ed-tex ${!o.material ? "ed-on" : ""}`} onClick={() => alCambiar({ material: null })} title="Color propio">
                                <span className="ed-muestra" style={{ background: o.textura ? `url(${o.textura}) center/cover` : o.color }} />
                                <small>Propio</small>
                            </button>
                            {materiales.map((m) => (
                                <button key={m.id} type="button" className={`ed-tex ${o.material === m.id ? "ed-on" : ""}`} onClick={() => alCambiar({ material: m.id })} title={m.nombre}>
                                    <Muestra m={m} />
                                    <small>{m.nombre}</small>
                                </button>
                            ))}
                        </div>
                        {!o.material && (
                            <div className="ed-fila">
                                <label className="ed-campo ed-campo-color">
                                    <span>{o.tipo === "cuadro" ? "Marco" : "Color"}</span>
                                    <input type="color" value={o.color} onChange={(e) => alCambiar({ color: e.target.value, textura: o.tipo === "cuadro" ? o.textura : null })} />
                                </label>
                                {o.tipo !== "cuadro" && (
                                    <button type="button" className="ed-btn ed-btn-chico" onClick={() => alNuevaTextura({ tipo: "color", color: o.color })}>
                                        <LuPlus aria-hidden="true" /> Guardar como textura
                                    </button>
                                )}
                            </div>
                        )}
                        {o.tipo === "cuadro" && <p className="ed-ayuda">La foto del cuadro es la textura (o súbela abajo).</p>}
                        {o.tipo === "cuadro" && !o.material && (
                            <SubirImagen texto={o.textura ? "Cambiar foto del cuadro" : "Subir foto del cuadro"} alSubir={(ruta) => alCambiar({ textura: ruta })} alError={() => {}} className="ed-btn ed-btn-chico" />
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

/* ---------------- Editor de una textura guardada ---------------- */
function FormTextura({ inicial, alGuardar, alCancelar, alError }) {
    const [m, setM] = useState(inicial);
    return (
        <div className="ed-form-tex" onPointerDown={(e) => e.stopPropagation()}>
            <div className="ed-form-tex-vista">
                <Muestra m={m} grande />
            </div>
            <label className="ed-campo">
                <span>Nombre</span>
                <input value={m.nombre} maxLength={40} autoFocus placeholder="Ej: Ladrillo rojo" onChange={(e) => setM({ ...m, nombre: e.target.value })} />
            </label>
            <div className="ed-segmentos">
                <button type="button" className={m.tipo === "color" ? "ed-on" : ""} onClick={() => setM({ ...m, tipo: "color" })}>
                    Color sólido
                </button>
                <button type="button" className={m.tipo === "imagen" ? "ed-on" : ""} onClick={() => setM({ ...m, tipo: "imagen" })}>
                    Imagen
                </button>
            </div>
            {m.tipo === "color" ? (
                <label className="ed-campo ed-campo-color">
                    <span>Color</span>
                    <input type="color" value={m.color} onChange={(e) => setM({ ...m, color: e.target.value })} />
                </label>
            ) : (
                <>
                    <SubirImagen texto={m.textura ? "Cambiar imagen" : "Subir imagen"} alSubir={(ruta) => setM({ ...m, textura: ruta })} alError={alError} />
                    <Numero etiqueta="Cada foto mide" valor={m.baldosa} min={0.25} max={50} paso={0.25} alCambiar={(v) => setM({ ...m, baldosa: v })} />
                    <p className="ed-ayuda">
                        Foto cuadrada que se repita sin que se note el borde ("seamless"), 1024 o 2048 px. Gratis en ambientcg.com o polyhaven.com/textures
                        (el archivo "Color").
                    </p>
                </>
            )}
            <div className="ed-fila">
                <button type="button" className="ed-btn ed-btn-primario" onClick={() => alGuardar(m)} disabled={!m.nombre.trim() || (m.tipo === "imagen" && !m.textura)}>
                    <LuSave aria-hidden="true" /> Guardar textura
                </button>
                <button type="button" className="ed-btn" onClick={alCancelar}>
                    Cancelar
                </button>
            </div>
        </div>
    );
}

/* ---------------- Panel: texturas ---------------- */
function PanelTexturas({ doc, sel, cambiar, editando, setEditando, alError }) {
    const materiales = doc.materiales || [];
    const usos = (id) => doc.objetos.filter((o) => o.material === id).length + (doc.suelo.material === id ? 1 : 0);
    const elegido = doc.objetos.find((o) => o.id === sel);

    const guardar = (m) => {
        cambiar((d) => {
            d.materiales ||= [];
            const i = d.materiales.findIndex((x) => x.id === m.id);
            const limpio = { ...m, nombre: m.nombre.trim(), textura: m.tipo === "imagen" ? m.textura : null };
            if (i >= 0) d.materiales[i] = limpio;
            else d.materiales.push(limpio);
            return d;
        });
        setEditando(null);
    };

    if (editando) return <FormTextura key={editando.id} inicial={editando} alGuardar={guardar} alCancelar={() => setEditando(null)} alError={alError} />;

    return (
        <div className="ed-panel-cuerpo">
            <p className="ed-ayuda">Crea una textura una vez y úsala en muchos objetos. Si la cambias, cambian todos los que la usan.</p>
            <button type="button" className="ed-btn ed-btn-primario" onClick={() => setEditando({ id: idMaterialNuevo(materiales), nombre: "", tipo: "color", color: "#b0b0b0", textura: null, baldosa: 2 })}>
                <LuPlus aria-hidden="true" /> Nueva textura
            </button>
            {materiales.length === 0 && <p className="ed-vacio">Aún no hay texturas guardadas.</p>}
            <ul className="ed-lista-tex">
                {materiales.map((m) => (
                    <li key={m.id}>
                        <Muestra m={m} />
                        <div>
                            <strong>{m.nombre}</strong>
                            <small>{`${m.tipo === "imagen" ? `Imagen · ${m.baldosa} m` : m.color} · ${usos(m.id)} uso(s)`}</small>
                        </div>
                        {elegido && elegido.tipo !== "circulo" && (
                            <button type="button" className="ed-icono" title={`Ponerla en ${elegido.id}`} aria-label={`Poner en ${elegido.id}`} onClick={() => cambiar((d) => ((d.objetos.find((x) => x.id === sel).material = m.id), d))}>
                                <LuPalette aria-hidden="true" />
                            </button>
                        )}
                        <button type="button" className="ed-icono" title="Editar" aria-label={`Editar ${m.nombre}`} onClick={() => setEditando({ ...m })}>
                            <LuPencil aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className="ed-icono"
                            title="Borrar"
                            aria-label={`Borrar ${m.nombre}`}
                            onClick={() => {
                                const n = usos(m.id);
                                if (n && !window.confirm(`"${m.nombre}" se usa en ${n} objeto(s). Si la borras, vuelven a su color propio. ¿Borrar?`)) return;
                                cambiar((d) => {
                                    d.materiales = d.materiales.filter((x) => x.id !== m.id);
                                    d.objetos.forEach((o) => o.material === m.id && (o.material = null));
                                    if (d.suelo.material === m.id) d.suelo.material = null;
                                    return d;
                                });
                            }}
                        >
                            <LuTrash2 aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ---------------- Panel: cielo, suelo y luz ---------------- */
function PanelAmbiente({ doc, cambiar, alError }) {
    const materiales = doc.materiales || [];
    return (
        <div className="ed-panel-cuerpo">
            <h4>☁️ Cielo</h4>
            <div className="ed-segmentos">
                {[
                    ["color", "Color"],
                    ["degradado", "Degradado"],
                    ["foto", "Foto 360°"],
                ].map(([id, t]) => (
                    <button key={id} type="button" className={doc.cielo.tipo === id ? "ed-on" : ""} onClick={() => cambiar((d) => ((d.cielo.tipo = id), d))}>
                        {t}
                    </button>
                ))}
            </div>
            <div className="ed-fila">
                {doc.cielo.tipo === "color" ? (
                    <label className="ed-campo ed-campo-color">
                        <span>Color</span>
                        <input type="color" value={doc.cielo.color} onChange={(e) => cambiar((d) => ((d.cielo.color = e.target.value), d))} />
                    </label>
                ) : (
                    <>
                        <label className="ed-campo ed-campo-color">
                            <span>Arriba</span>
                            <input type="color" value={doc.cielo.arriba} onChange={(e) => cambiar((d) => ((d.cielo.arriba = e.target.value), d))} />
                        </label>
                        <label className="ed-campo ed-campo-color">
                            <span>Horizonte</span>
                            <input type="color" value={doc.cielo.horizonte} onChange={(e) => cambiar((d) => ((d.cielo.horizonte = e.target.value), d))} />
                        </label>
                    </>
                )}
            </div>
            {doc.cielo.tipo === "foto" && (
                <>
                    {doc.cielo.foto && <img className="ed-cielo-foto" src={doc.cielo.foto} alt="" />}
                    <SubirImagen texto={doc.cielo.foto ? "Cambiar foto 360°" : "Subir foto 360°"} alSubir={(ruta) => cambiar((d) => ((d.cielo.foto = ruta), d))} alError={alError} />
                    <p className="ed-ayuda">Panorámica 360° "equirectangular", el doble de ancha que de alta (ej. 4096×2048), JPG hasta 8 MB. Gratis en polyhaven.com/hdris.</p>
                </>
            )}

            <h4>🟩 Suelo</h4>
            <div className="ed-texturas-mini">
                <button type="button" className={`ed-tex ${!doc.suelo.material ? "ed-on" : ""}`} onClick={() => cambiar((d) => ((d.suelo.material = null), d))}>
                    <span className="ed-muestra" style={{ background: doc.suelo.textura ? `url(${doc.suelo.textura}) center/cover` : doc.suelo.color }} />
                    <small>Propio</small>
                </button>
                {materiales.map((m) => (
                    <button key={m.id} type="button" className={`ed-tex ${doc.suelo.material === m.id ? "ed-on" : ""}`} onClick={() => cambiar((d) => ((d.suelo.material = m.id), d))}>
                        <Muestra m={m} />
                        <small>{m.nombre}</small>
                    </button>
                ))}
            </div>
            {!doc.suelo.material && (
                <div className="ed-fila">
                    <label className="ed-campo ed-campo-color">
                        <span>Color</span>
                        <input type="color" value={doc.suelo.color} onChange={(e) => cambiar((d) => ((d.suelo.color = e.target.value), (d.suelo.textura = null), d))} />
                    </label>
                </div>
            )}

            <h4>💡 Luz</h4>
            <div className="ed-segmentos">
                {[
                    ["dia", "☀️ Día"],
                    ["tarde", "🌇 Tarde"],
                    ["noche", "🌙 Noche"],
                ].map(([id, t]) => (
                    <button key={id} type="button" className={doc.luz === id ? "ed-on" : ""} onClick={() => cambiar((d) => ((d.luz = id), d))}>
                        {t}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ---------------- Panel: capas (lista de objetos) ---------------- */
function PanelCapas({ doc, sel, alElegir }) {
    const [filtro, setFiltro] = useState("");
    const lista = doc.objetos.filter((o) => !filtro || nombreVisible(o).toLowerCase().includes(filtro.toLowerCase()));
    return (
        <div className="ed-panel-cuerpo">
            <input className="ed-buscar" placeholder="Buscar por nombre o ID…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
            <ul className="ed-capas">
                {[...lista].reverse().map((o) => (
                    <li key={o.id}>
                        <button type="button" className={o.id === sel ? "ed-on" : ""} onClick={() => alElegir(o.id)}>
                            <span>{ICONO_TIPO[o.tipo]}</span>
                            <strong>{o.nombre || NOMBRE_TIPO[o.tipo]}</strong>
                            <code>{o.id}</code>
                        </button>
                    </li>
                ))}
            </ul>
            {!lista.length && <p className="ed-vacio">No hay objetos.</p>}
        </div>
    );
}

/* ---------------- Dibujo de un objeto en el mapa ---------------- */
function Figura({ o, materiales, elegido, escala, porId }) {
    const m = o.material ? materiales.find((x) => x.id === o.material) : null;
    const relleno = m ? (m.tipo === "imagen" ? `url(#tex-${m.id})` : m.color) : o.textura && o.tipo !== "cuadro" ? "#9aa4b5" : o.color;
    const borde = elegido ? "#38bdf8" : "rgba(0,0,0,.55)";
    const ancho = (elegido ? 2.2 : 1) / escala;
    const t = `translate(${o.x} ${o.z}) rotate(${-(o.rot || 0)})`;
    const letra = 11 / escala;

    if (o.tipo === "circulo") {
        const tele = o.funcion === "teletransporte";
        const destino = tele && o.destino ? porId.get(o.destino) : null;
        return (
            <g data-id={o.id} className="ed-figura">
                {destino && <line x1={o.x} y1={o.z} x2={destino.x} y2={destino.z} stroke={o.color} strokeWidth={1.5 / escala} strokeDasharray={`${6 / escala} ${4 / escala}`} pointerEvents="none" />}
                <circle data-id={o.id} cx={o.x} cy={o.z} r={o.ancho / 2} fill={o.color} fillOpacity={0.22} stroke={elegido ? "#38bdf8" : o.color} strokeWidth={(elegido ? 3 : 2) / escala} />
                {!tele && (
                    <g transform={t} pointerEvents="none">
                        <rect x={-1.3} y={-o.ancho / 2 - 0.45} width={2.6} height={0.25} fill="#2a2f3a" />
                    </g>
                )}
                <text x={o.x} y={o.z - letra * 0.1} fontSize={letra * 1.15} textAnchor="middle" className="ed-etiqueta-id" pointerEvents="none">
                    {o.id}
                </text>
                <text x={o.x} y={o.z + letra * 1.1} fontSize={letra * 0.9} textAnchor="middle" className="ed-etiqueta" pointerEvents="none">
                    {tele ? (destino ? `→ ${destino.id}` : "sin destino") : o.juego}
                </text>
            </g>
        );
    }

    if (o.tipo === "columna" || o.tipo === "arbol") {
        return (
            <g data-id={o.id} className="ed-figura">
                <circle data-id={o.id} cx={o.x} cy={o.z} r={o.tipo === "arbol" ? o.ancho / 2 : o.ancho / 2} fill={o.tipo === "arbol" && !m ? "#3f8f3a" : relleno} fillOpacity={o.tipo === "arbol" ? 0.75 : 1} stroke={borde} strokeWidth={ancho} />
                {o.tipo === "arbol" && <circle cx={o.x} cy={o.z} r={o.ancho * 0.1} fill="#6b4a2f" pointerEvents="none" />}
            </g>
        );
    }

    const partes = partesDe(o);
    const inclinada = Math.abs(o.incl || 0) > 2;
    const largo = Math.max(o.largo, 0.15);
    return (
        <g data-id={o.id} className="ed-figura" transform={t}>
            {partes ? (
                <>
                    {o.tipo === "salon" && <rect data-id={o.id} x={-o.ancho / 2} y={-o.largo / 2} width={o.ancho} height={o.largo} fill={relleno} fillOpacity={0.12} />}
                    {partes.map((q, i) => (
                        <rect
                            key={i}
                            data-id={o.id}
                            x={q.cx - q.w / 2}
                            y={q.cz - Math.max(q.d, 3 / escala) / 2}
                            width={Math.max(q.w, 3 / escala)}
                            height={Math.max(q.d, 3 / escala)}
                            fill={relleno}
                            fillOpacity={o.tipo === "escalera" ? 0.45 + (0.55 * (i + 1)) / partes.length : 1}
                            stroke="rgba(0,0,0,.35)"
                            strokeWidth={0.6 / escala}
                        />
                    ))}
                    {elegido && <rect x={-o.ancho / 2} y={-o.largo / 2} width={o.ancho} height={o.largo} fill="none" stroke={borde} strokeWidth={ancho} pointerEvents="none" />}
                </>
            ) : (
                <rect data-id={o.id} x={-o.ancho / 2} y={-largo / 2} width={o.ancho} height={largo} fill={relleno} stroke={borde} strokeWidth={ancho} />
            )}
            {(o.tipo === "escalera" || inclinada) && (
                // Flecha: hacia dónde sube.
                <path
                    d={`M 0 ${-largo * 0.3} L 0 ${largo * 0.3} M ${-Math.min(0.5, o.ancho * 0.2)} ${largo * 0.15} L 0 ${largo * 0.3} L ${Math.min(0.5, o.ancho * 0.2)} ${largo * 0.15}`}
                    transform={(o.incl || 0) < 0 && o.tipo !== "escalera" ? "rotate(180)" : undefined}
                    stroke="#0f172a"
                    strokeWidth={2 / escala}
                    fill="none"
                    pointerEvents="none"
                />
            )}
            {(o.nombre || o.tipo === "salon") && escala > 4 && (
                <text x={0} y={0} fontSize={letra} textAnchor="middle" className="ed-etiqueta" pointerEvents="none" transform={`rotate(${o.rot || 0})`}>
                    {o.nombre || o.id}
                </text>
            )}
        </g>
    );
}

/* ---------------- Vista 3D flotante ---------------- */
function Vista3D({ doc, sel, alCerrar }) {
    // Empieza abajo a la izquierda del mapa (no tapa el panel de la derecha).
    const [pos, setPos] = useState(() => ({ x: 90, y: Math.max(60, window.innerHeight - 350) }));
    const arrastre = useRef(null);
    const caja = useRef(null);
    const centro = useRef({ x: 0, z: 0 });
    const objeto = doc.objetos.find((o) => o.id === sel);
    const [objetivo, setObjetivo] = useState([0, 1, 0]);

    return (
        <section
            ref={caja}
            className="ed-vista3d"
            style={{ left: pos.x, top: pos.y }}
            onPointerDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            onWheel={(e) => e.stopPropagation()}
        >
            <header
                onPointerDown={(e) => {
                    const r = caja.current.getBoundingClientRect();
                    arrastre.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
                    e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                    if (!arrastre.current) return;
                    setPos({ x: Math.max(0, e.clientX - arrastre.current.dx), y: Math.max(48, e.clientY - arrastre.current.dy) });
                }}
                onPointerUp={() => (arrastre.current = null)}
            >
                <strong>Vista 3D</strong>
                <span>Arrastra para girar · rueda para acercar</span>
                {objeto && (
                    <button type="button" className="ed-icono" title={`Mirar ${objeto.id}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => setObjetivo([objeto.x, (objeto.y || 0) + 1, objeto.z])}>
                        <LuCrosshair aria-hidden="true" />
                    </button>
                )}
                <button type="button" className="ed-icono" onPointerDown={(e) => e.stopPropagation()} onClick={alCerrar} aria-label="Cerrar vista 3D">
                    <LuX aria-hidden="true" />
                </button>
            </header>
            <div className="ed-vista3d-lienzo">
                <Canvas shadows="percentage" camera={{ position: [objetivo[0] + 22, 18, objetivo[2] + 26], fov: 50, near: 0.1, far: 900 }} dpr={[1, 1.5]}>
                    <Suspense fallback={null}>
                        <Cielo cielo={doc.cielo} />
                        <Luces luz={doc.luz} colorSuelo={doc.suelo.color} siguiendo={centro} />
                        <Suelo suelo={doc.suelo} materiales={doc.materiales} />
                        <Objetos objetos={doc.objetos} materiales={doc.materiales} seleccionado={sel} etiquetas={false} />
                    </Suspense>
                    {/* sin desplazar con clic derecho: eso solo es del mapa */}
                    <OrbitControls target={objetivo} enablePan={false} maxPolarAngle={Math.PI / 2.05} minDistance={3} maxDistance={140} />
                </Canvas>
            </div>
        </section>
    );
}

/* =========================================================
   EDITOR
========================================================= */
export default function EditorMundo() {
    const navigate = useNavigate();
    const h = useHistoria();
    const { doc, cambiar } = h;
    const [extra, setExtra] = useState({ juegos: [] });
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [sel, setSel] = useState(null);
    const [herramienta, setHerramienta] = useState(null); // clave de PIEZAS, "mano" o null
    const [verProps, setVerProps] = useState(false);
    const [panel, setPanel] = useState("texturas");
    const [editandoTex, setEditandoTex] = useState(null);
    const [ver3d, setVer3d] = useState(false);
    const [vista, setVista] = useState({ cx: 0, cz: 0, escala: ESCALA_INICIAL });
    const [tam, setTam] = useState({ w: 800, h: 600 });
    const [espacio, setEspacio] = useState(false);
    const caja = useRef(null);
    const svg = useRef(null);
    const accion = useRef(null); // arrastre en curso
    const [arrastrando, setArrastrando] = useState(false);
    const vistaRef = useRef(vista);
    vistaRef.current = vista;

    const avisar = useCallback((texto, tono = "ok") => {
        setAviso({ texto, tono, n: Date.now() });
    }, []);
    useEffect(() => {
        if (!aviso) return undefined;
        const t = setTimeout(() => setAviso(null), 3200);
        return () => clearTimeout(t);
    }, [aviso]);

    /* Cargar */
    useEffect(() => {
        api("/admin/mundo")
            .then((r) => {
                h.iniciar({ ...r.config, materiales: r.config.materiales || [] });
                setExtra({ juegos: r.juegos || [], personajes: r.personajes || [] });
            })
            .catch((e) => setError(e.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Tamaño del mapa */
    useEffect(() => {
        if (!caja.current) return undefined;
        const ro = new ResizeObserver(([e]) => setTam({ w: e.contentRect.width, h: e.contentRect.height }));
        ro.observe(caja.current);
        return () => ro.disconnect();
    }, [doc != null]); // eslint-disable-line react-hooks/exhaustive-deps

    /* Aviso al salir sin guardar */
    useEffect(() => {
        const antes = (e) => {
            if (!h.sinGuardar) return;
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", antes);
        return () => window.removeEventListener("beforeunload", antes);
    }, [h.sinGuardar]);

    const objeto = doc?.objetos.find((o) => o.id === sel) || null;
    const porId = useMemo(() => new Map((doc?.objetos || []).map((o) => [o.id, o])), [doc?.objetos]);

    /* Pantalla ↔ mundo */
    const aMundoDesde = useCallback(
        (clientX, clientY) => {
            const r = svg.current.getBoundingClientRect();
            const v = vistaRef.current;
            return { x: v.cx + (clientX - r.left - r.width / 2) / v.escala, z: v.cz + (clientY - r.top - r.height / 2) / v.escala };
        },
        []
    );
    const aPantalla = (x, z) => ({ x: (x - vista.cx) * vista.escala + tam.w / 2, y: (z - vista.cz) * vista.escala + tam.h / 2 });

    /* Acciones sobre el elegido */
    const cambiarSel = useCallback((c, registrar = true) => cambiar((d) => (Object.assign(d.objetos.find((o) => o.id === sel) || {}, c), d), registrar), [cambiar, sel]);
    const borrar = useCallback(() => {
        if (!sel) return;
        cambiar((d) => {
            d.objetos = d.objetos.filter((o) => o.id !== sel);
            d.objetos.forEach((o) => o.destino === sel && (o.destino = null));
            return d;
        });
        setSel(null);
        setVerProps(false);
    }, [cambiar, sel]);
    const duplicar = useCallback(() => {
        const o = doc?.objetos.find((x) => x.id === sel);
        if (!o) return;
        const id = idNuevo(doc.objetos, prefijoDe(o));
        cambiar((d) => {
            d.objetos.push({ ...structuredClone(o), id, x: limitar(o.x + 2, -LIMITE, LIMITE), z: limitar(o.z + 2, -LIMITE, LIMITE), destino: o.tipo === "circulo" ? null : o.destino });
            return d;
        });
        setSel(id);
    }, [cambiar, doc, sel]);
    const girar90 = useCallback(() => sel && cambiarSel({ rot: ((((objeto?.rot || 0) + 90) % 360) + 360) % 360 }), [cambiarSel, objeto?.rot, sel]);

    const encajar = useCallback(() => {
        const objs = doc?.objetos || [];
        if (!objs.length) return setVista({ cx: 0, cz: 0, escala: ESCALA_INICIAL });
        let [x0, x1, z0, z1] = [Infinity, -Infinity, Infinity, -Infinity];
        for (const o of objs) {
            const r = radioDe(o);
            x0 = Math.min(x0, o.x - r);
            x1 = Math.max(x1, o.x + r);
            z0 = Math.min(z0, o.z - r);
            z1 = Math.max(z1, o.z + r);
        }
        const escala = limitar(Math.min(tam.w / (x1 - x0 + 8), tam.h / (z1 - z0 + 8)), 2, 60);
        setVista({ cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, escala });
    }, [doc?.objetos, tam]);

    const zoom = useCallback((factor, sx, sy) => {
        setVista((v) => {
            const escala = limitar(v.escala * factor, 2, 80);
            if (sx == null) return { ...v, escala };
            // Acercar hacia el mouse: el punto bajo el cursor se queda quieto.
            const r = svg.current.getBoundingClientRect();
            const px = sx - r.left - r.width / 2;
            const py = sy - r.top - r.height / 2;
            const wx = v.cx + px / v.escala;
            const wz = v.cz + py / v.escala;
            return { escala, cx: wx - px / escala, cz: wz - py / escala };
        });
    }, []);

    /* Rueda: acercar/alejar (necesita passive: false) */
    useEffect(() => {
        const el = svg.current;
        if (!el) return undefined;
        const rueda = (e) => {
            e.preventDefault();
            if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) zoom(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
            else setVista((v) => ({ ...v, cx: v.cx + e.deltaX / v.escala }));
        };
        el.addEventListener("wheel", rueda, { passive: false });
        return () => el.removeEventListener("wheel", rueda);
    }, [zoom, doc != null]); // eslint-disable-line react-hooks/exhaustive-deps

    /* Guardar */
    const guardar = useCallback(async () => {
        if (!doc) return;
        setGuardando(true);
        try {
            const r = await api("/admin/mundo", { metodo: "PUT", body: doc });
            h.marcarGuardado(doc);
            // El servidor pudo ajustar algo (límites, destinos que ya no existen).
            if (JSON.stringify(r.config.objetos) !== JSON.stringify(doc.objetos) || JSON.stringify(r.config.materiales) !== JSON.stringify(doc.materiales)) {
                h.iniciar({ ...r.config });
            }
            avisar("Mundo guardado. Los que están adentro ya lo ven ✨");
        } catch (e) {
            avisar(e.message, "error");
        } finally {
            setGuardando(false);
        }
    }, [avisar, doc, h]);

    /* Teclado */
    useEffect(() => {
        const abajo = (e) => {
            const escribiendo = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement;
            const mod = e.ctrlKey || e.metaKey;
            if (mod && e.key.toLowerCase() === "s") {
                e.preventDefault();
                guardar();
                return;
            }
            if (escribiendo) {
                // Esc también sirve escribiendo: suelta el campo y cierra las opciones.
                if (e.key === "Escape") {
                    e.target.blur();
                    setVerProps(false);
                }
                return;
            }
            if (mod && e.key.toLowerCase() === "z") {
                e.preventDefault();
                if (e.shiftKey) h.rehacer();
                else h.deshacer();
            } else if (mod && e.key.toLowerCase() === "y") {
                e.preventDefault();
                h.rehacer();
            } else if (mod && e.key.toLowerCase() === "d") {
                e.preventDefault();
                duplicar();
            } else if (e.key === "Delete" || e.key === "Backspace") {
                if (sel) {
                    e.preventDefault();
                    borrar();
                }
            } else if (e.key === "Escape") {
                if (herramienta) setHerramienta(null);
                else if (verProps) setVerProps(false);
                else setSel(null);
            } else if (e.key.toLowerCase() === "r" && sel) {
                girar90();
            } else if (e.key.toLowerCase() === "v") {
                setHerramienta(null);
            } else if (e.key.toLowerCase() === "h") {
                setHerramienta("mano");
            } else if (e.key === " ") {
                e.preventDefault();
                setEspacio(true);
            } else if (sel && e.key.startsWith("Arrow")) {
                e.preventDefault();
                const p = e.shiftKey ? 2 : 0.25;
                const o = doc.objetos.find((x) => x.id === sel);
                const dx = e.key === "ArrowLeft" ? -p : e.key === "ArrowRight" ? p : 0;
                const dz = e.key === "ArrowUp" ? -p : e.key === "ArrowDown" ? p : 0;
                cambiarSel({ x: limitar(o.x + dx, -LIMITE, LIMITE), z: limitar(o.z + dz, -LIMITE, LIMITE) });
            } else if (e.key === "+" || e.key === "=") {
                zoom(1.25);
            } else if (e.key === "-") {
                zoom(0.8);
            }
        };
        const arriba = (e) => e.key === " " && setEspacio(false);
        window.addEventListener("keydown", abajo);
        window.addEventListener("keyup", arriba);
        return () => {
            window.removeEventListener("keydown", abajo);
            window.removeEventListener("keyup", arriba);
        };
    }, [borrar, cambiarSel, doc, duplicar, girar90, guardar, h, herramienta, sel, verProps, zoom]);

    /* Ratón en el mapa */
    const alBajar = (e) => {
        const pan = e.button === 2 || e.button === 1 || herramienta === "mano" || espacio;
        svg.current.setPointerCapture(e.pointerId);
        if (pan) {
            accion.current = { tipo: "pan", x: e.clientX, y: e.clientY, v: vistaRef.current };
            return;
        }
        if (e.button !== 0) return;
        const p = aMundoDesde(e.clientX, e.clientY);
        const manija = e.target.dataset?.manija;
        if (manija && objeto) {
            accion.current = { tipo: manija, antes: doc, o: { ...objeto }, x0: p.x, z0: p.z };
            return;
        }
        if (herramienta && herramienta !== "mano") {
            const pieza = PIEZAS.find((x) => x.clave === herramienta);
            const nuevo = crearPieza(pieza, doc.objetos, redondear(p.x, 0.5), redondear(p.z, 0.5));
            cambiar((d) => (d.objetos.push(nuevo), d));
            setSel(nuevo.id);
            if (!e.shiftKey) setHerramienta(null); // con Shift se ponen varias seguidas
            return;
        }
        const id = e.target.closest?.("[data-id]")?.dataset.id;
        if (id) {
            setSel(id);
            if (id !== sel) setVerProps(false);
            const o = doc.objetos.find((x) => x.id === id);
            accion.current = { tipo: "mover", antes: doc, id, dx: p.x - o.x, dz: p.z - o.z, movio: false };
        } else {
            setSel(null);
            setVerProps(false);
            accion.current = { tipo: "pan", x: e.clientX, y: e.clientY, v: vistaRef.current };
        }
    };

    const alMover = (e) => {
        const a = accion.current;
        if (!a) return;
        if (!arrastrando) setArrastrando(true);
        if (a.tipo === "pan") {
            setVista({ ...a.v, cx: a.v.cx - (e.clientX - a.x) / a.v.escala, cz: a.v.cz - (e.clientY - a.y) / a.v.escala });
            return;
        }
        const p = aMundoDesde(e.clientX, e.clientY);
        const paso = e.altKey ? 0.01 : 0.25;
        if (a.tipo === "mover") {
            a.movio = true;
            cambiar((d) => {
                const o = d.objetos.find((x) => x.id === a.id);
                o.x = limitar(redondear(p.x - a.dx, paso), -LIMITE, LIMITE);
                o.z = limitar(redondear(p.z - a.dz, paso), -LIMITE, LIMITE);
                return d;
            }, false);
            return;
        }
        const o = a.o;
        if (a.tipo === "girar") {
            let ang = (Math.atan2(p.x - o.x, -(p.z - o.z)) * 180) / Math.PI; // 0° = arriba
            ang = -ang;
            if (!e.shiftKey) ang = Math.round(ang / 15) * 15;
            a.movio = true;
            cambiarSel({ rot: ((Math.round(ang) % 360) + 360) % 360 }, false);
            return;
        }
        const { lx, lz } = aLocal(o, p.x, p.z);
        a.movio = true;
        if (a.tipo === "radio") {
            cambiarSel({ ancho: limitar(redondear(Math.abs(lx) * 2, paso), 0.2, 60) }, false);
        } else if (a.tipo === "ancho") {
            // El borde de la izquierda queda quieto.
            const nuevo = limitar(redondear(lx + o.ancho / 2, paso), 0.1, 60);
            const c = aMundo(o, (nuevo - o.ancho) / 2, 0);
            cambiarSel({ ancho: nuevo, x: c.x, z: c.z }, false);
        } else if (a.tipo === "largo") {
            const nuevo = limitar(redondear(lz + o.largo / 2, paso), 0.05, 60);
            const c = aMundo(o, 0, (nuevo - o.largo) / 2);
            cambiarSel({ largo: nuevo, x: c.x, z: c.z }, false);
        }
    };

    const alSoltar = () => {
        const a = accion.current;
        accion.current = null;
        setArrastrando(false);
        if (a && a.antes && a.movio) h.marcar(a.antes);
    };

    const nuevaTexturaDesde = (base) => {
        setPanel("texturas");
        setEditandoTex({ id: idMaterialNuevo(doc.materiales || []), nombre: "", tipo: "color", color: "#b0b0b0", textura: null, baldosa: 2, ...base });
    };

    /* ---------------- Pantallas de carga ---------------- */
    if (error) {
        return (
            <div className="ed ed-centro">
                <p>{error}</p>
                <button type="button" className="ed-btn" onClick={() => navigate("/admin?tab=mundo")}>
                    Volver al panel
                </button>
            </div>
        );
    }
    if (!doc) return <div className="ed ed-centro">Cargando el mundo…</div>;

    /* Barra de acciones encima del elegido */
    let barra = null;
    if (objeto) {
        const r = radioDe(objeto);
        const p = aPantalla(objeto.x, objeto.z - r);
        barra = { x: limitar(p.x, 120, tam.w - 120), y: limitar(p.y - 58, 8, tam.h - 60) };
    }
    // Las opciones salen al lado del objeto (a la derecha, o a la izquierda si no cabe), sin taparlo.
    let lugarOpciones = null;
    if (objeto) {
        const c = aPantalla(objeto.x, objeto.z);
        const rpx = radioDe(objeto) * vista.escala;
        let left = c.x + rpx + 18;
        if (left + 300 > tam.w - 8) left = c.x - rpx - 318;
        lugarOpciones = { left: limitar(left, 8, Math.max(8, tam.w - 308)), top: limitar(c.y - 140, 8, Math.max(8, tam.h - 440)) };
    }
    const manijaR = 6 / vista.escala;
    const cursor = espacio || herramienta === "mano" ? "grab" : herramienta ? "crosshair" : "default";
    const piezaActiva = PIEZAS.find((p) => p.clave === herramienta);

    return (
        <div className="ed">
            {/* ---------------- Barra de arriba ---------------- */}
            <header className="ed-arriba">
                <button
                    type="button"
                    className="ed-btn ed-btn-plano"
                    onClick={() => {
                        if (h.sinGuardar && !window.confirm("Hay cambios sin guardar. ¿Salir de todas formas?")) return;
                        navigate("/admin?tab=mundo");
                    }}
                >
                    <LuArrowLeft aria-hidden="true" /> Panel
                </button>
                <h1>
                    Editor del <b>Mundo 3D</b>
                </h1>
                <div className="ed-grupo">
                    <button type="button" className="ed-icono" onClick={h.deshacer} disabled={!h.puedeDeshacer} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
                        <LuUndo2 aria-hidden="true" />
                    </button>
                    <button type="button" className="ed-icono" onClick={h.rehacer} disabled={!h.puedeRehacer} title="Rehacer (Ctrl+Y)" aria-label="Rehacer">
                        <LuRedo2 aria-hidden="true" />
                    </button>
                </div>
                <div className="ed-grupo">
                    <button type="button" className="ed-icono" onClick={() => zoom(0.8)} title="Alejar (-)" aria-label="Alejar">
                        <LuZoomOut aria-hidden="true" />
                    </button>
                    <span className="ed-zoom">{`${Math.round((vista.escala / ESCALA_INICIAL) * 100)}%`}</span>
                    <button type="button" className="ed-icono" onClick={() => zoom(1.25)} title="Acercar (+)" aria-label="Acercar">
                        <LuZoomIn aria-hidden="true" />
                    </button>
                    <button type="button" className="ed-icono" onClick={encajar} title="Ver todo" aria-label="Ver todo">
                        <LuMaximize aria-hidden="true" />
                    </button>
                </div>
                <span className="ed-espacio" />
                <button type="button" className={`ed-btn ${ver3d ? "ed-btn-activo" : ""}`} onClick={() => setVer3d((v) => !v)} aria-pressed={ver3d}>
                    {ver3d ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />} Vista 3D
                </button>
                <button type="button" className="ed-btn ed-btn-primario" onClick={guardar} disabled={guardando || !h.sinGuardar} title="Guardar (Ctrl+S)">
                    <LuSave aria-hidden="true" />
                    {guardando ? "Guardando…" : h.sinGuardar ? "Guardar" : "Guardado"}
                    {h.sinGuardar && <i className="ed-punto" aria-label="Sin guardar" />}
                </button>
            </header>

            <div className="ed-cuerpo">
                {/* ---------------- Herramientas ---------------- */}
                <nav className="ed-herramientas" aria-label="Herramientas">
                    <button type="button" className={!herramienta ? "ed-on" : ""} onClick={() => setHerramienta(null)} title="Seleccionar y mover (V)">
                        <LuMousePointer2 aria-hidden="true" />
                    </button>
                    <button type="button" className={herramienta === "mano" ? "ed-on" : ""} onClick={() => setHerramienta("mano")} title="Moverse por el mapa (H, o clic derecho)">
                        <LuHand aria-hidden="true" />
                    </button>
                    <hr />
                    {PIEZAS.map((p) => (
                        <button key={p.clave} type="button" className={herramienta === p.clave ? "ed-on" : ""} onClick={() => setHerramienta((x) => (x === p.clave ? null : p.clave))} title={`${p.nombre}: toca el mapa para ponerlo (Shift = varios)`}>
                            <span className="ed-emoji">{p.icono}</span>
                            <small>{p.nombre}</small>
                        </button>
                    ))}
                </nav>

                {/* ---------------- Mapa ---------------- */}
                <main className="ed-mapa" ref={caja}>
                    <svg
                        ref={svg}
                        width={tam.w}
                        height={tam.h}
                        style={{ cursor: arrastrando && accion.current?.tipo === "pan" ? "grabbing" : cursor }}
                        onPointerDown={alBajar}
                        onPointerMove={alMover}
                        onPointerUp={alSoltar}
                        onPointerCancel={alSoltar}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <defs>
                            {(doc.materiales || [])
                                .filter((m) => m.tipo === "imagen" && m.textura)
                                .map((m) => (
                                    <pattern key={m.id} id={`tex-${m.id}`} patternUnits="userSpaceOnUse" width={m.baldosa} height={m.baldosa}>
                                        <image href={m.textura} width={m.baldosa} height={m.baldosa} preserveAspectRatio="none" />
                                    </pattern>
                                ))}
                        </defs>
                        <g transform={`translate(${tam.w / 2} ${tam.h / 2}) scale(${vista.escala}) translate(${-vista.cx} ${-vista.cz})`}>
                            {/* suelo y cuadrícula */}
                            <rect x={-LIMITE} y={-LIMITE} width={LIMITE * 2} height={LIMITE * 2} className="ed-suelo" style={{ fill: doc.suelo.color }} />
                            {vista.escala > 6 &&
                                Array.from({ length: LIMITE * 2 + 1 }, (_, i) => i - LIMITE)
                                    .filter((v) => v % 5 !== 0)
                                    .map((v) => (
                                        <g key={`m${v}`} className="ed-rejilla-fina" strokeWidth={0.5 / vista.escala}>
                                            <line x1={v} y1={-LIMITE} x2={v} y2={LIMITE} />
                                            <line x1={-LIMITE} y1={v} x2={LIMITE} y2={v} />
                                        </g>
                                    ))}
                            {Array.from({ length: (LIMITE * 2) / 5 + 1 }, (_, i) => -LIMITE + i * 5).map((v) => (
                                <g key={v} className={v === 0 ? "ed-rejilla-cero" : "ed-rejilla"} strokeWidth={(v === 0 ? 1.4 : 0.8) / vista.escala}>
                                    <line x1={v} y1={-LIMITE} x2={v} y2={LIMITE} />
                                    <line x1={-LIMITE} y1={v} x2={LIMITE} y2={v} />
                                </g>
                            ))}
                            <g pointerEvents="none">
                                <circle cx={0} cy={0} r={0.6} className="ed-inicio" />
                                <text x={0} y={-1} fontSize={11 / vista.escala} textAnchor="middle" className="ed-etiqueta">
                                    Inicio
                                </text>
                            </g>

                            {doc.objetos.map((o) => (
                                <Figura key={o.id} o={o} materiales={doc.materiales || []} elegido={o.id === sel} escala={vista.escala} porId={porId} />
                            ))}

                            {/* agarraderas del elegido */}
                            {objeto && (
                                <g className="ed-manijas">
                                    {(() => {
                                        if (REDONDOS.includes(objeto.tipo)) {
                                            const e = aMundo(objeto, objeto.ancho / 2, 0);
                                            return <circle data-manija="radio" cx={e.x} cy={e.z} r={manijaR} />;
                                        }
                                        const l = Math.max(objeto.largo, 0.15);
                                        const este = aMundo(objeto, objeto.ancho / 2, 0);
                                        const sur = aMundo(objeto, 0, l / 2);
                                        const arriba = aMundo(objeto, 0, -l / 2 - 26 / vista.escala);
                                        const borde = aMundo(objeto, 0, -l / 2);
                                        return (
                                            <>
                                                <line x1={borde.x} y1={borde.z} x2={arriba.x} y2={arriba.z} className="ed-manija-linea" strokeWidth={1.2 / vista.escala} />
                                                <circle data-manija="girar" cx={arriba.x} cy={arriba.z} r={manijaR * 1.1} className="ed-manija-girar" />
                                                <rect data-manija="ancho" x={este.x - manijaR} y={este.z - manijaR} width={manijaR * 2} height={manijaR * 2} />
                                                {!SIN_LARGO.includes(objeto.tipo) && <rect data-manija="largo" x={sur.x - manijaR} y={sur.z - manijaR} width={manijaR * 2} height={manijaR * 2} />}
                                            </>
                                        );
                                    })()}
                                </g>
                            )}
                        </g>
                    </svg>

                    {/* Barra de acciones del elegido */}
                    {objeto && barra && !arrastrando && (
                        <div className="ed-barra" style={{ left: barra.x, top: barra.y }} onPointerDown={(e) => e.stopPropagation()}>
                            <span className="ed-barra-nombre">
                                {ICONO_TIPO[objeto.tipo]} <code>{objeto.id}</code>
                            </span>
                            <button type="button" onClick={girar90} title="Girar 90° (R)">
                                <LuRotateCw aria-hidden="true" />
                            </button>
                            <button type="button" onClick={duplicar} title="Duplicar (Ctrl+D)">
                                <LuCopy aria-hidden="true" />
                            </button>
                            <button type="button" onClick={borrar} title="Eliminar (Supr)" className="ed-peligro">
                                <LuTrash2 aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => setVerProps((v) => !v)} title="Opciones: posición, tamaño, textura…" className={verProps ? "ed-on" : ""}>
                                <LuSettings aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    {objeto && verProps && (
                        <Propiedades
                            o={objeto}
                            doc={doc}
                            juegos={extra.juegos}
                            alCambiar={(c) => cambiarSel(c)}
                            alCerrar={() => setVerProps(false)}
                            alNuevaTextura={nuevaTexturaDesde}
                            estilo={lugarOpciones}
                        />
                    )}

                    {piezaActiva && (
                        <div className="ed-pista">
                            {`${piezaActiva.icono} Toca el mapa para poner: ${piezaActiva.nombre}`} <small>(Shift = varios · Esc = cancelar)</small>
                        </div>
                    )}
                    {!piezaActiva && !objeto && (
                        <div className="ed-pista ed-pista-suave">Clic: elegir · arrastrar: mover · clic derecho o espacio: desplazar · rueda: zoom</div>
                    )}

                    {ver3d && <Vista3D doc={doc} sel={sel} alCerrar={() => setVer3d(false)} />}

                    {aviso && (
                        <div key={aviso.n} className={`ed-aviso ed-aviso-${aviso.tono}`} role="status">
                            {aviso.texto}
                        </div>
                    )}
                </main>

                {/* ---------------- Panel derecho ---------------- */}
                <aside className="ed-panel">
                    <div className="ed-pestanas" role="tablist">
                        {[
                            ["texturas", LuPalette, "Texturas"],
                            ["ambiente", LuSun, "Ambiente"],
                            ["capas", LuLayers, "Objetos"],
                        ].map(([id, Icono, t]) => (
                            <button key={id} type="button" role="tab" aria-selected={panel === id} className={panel === id ? "ed-on" : ""} onClick={() => setPanel(id)}>
                                <Icono aria-hidden="true" /> {t}
                            </button>
                        ))}
                    </div>
                    {panel === "texturas" && <PanelTexturas doc={doc} sel={sel} cambiar={cambiar} editando={editandoTex} setEditando={setEditandoTex} alError={(m) => avisar(m, "error")} />}
                    {panel === "ambiente" && <PanelAmbiente doc={doc} cambiar={cambiar} alError={(m) => avisar(m, "error")} />}
                    {panel === "capas" && (
                        <PanelCapas
                            doc={doc}
                            sel={sel}
                            alElegir={(id) => {
                                const o = doc.objetos.find((x) => x.id === id);
                                setSel(id);
                                if (o) setVista((v) => ({ ...v, cx: o.x, cz: o.z }));
                            }}
                        />
                    )}
                    <footer className="ed-panel-pie">
                        <LuBox aria-hidden="true" /> {`${doc.objetos.length} objetos · ${(doc.materiales || []).length} texturas`}
                    </footer>
                </aside>
            </div>
        </div>
    );
}
