import { useEffect, useRef, useState } from "react";
import { LuDownload, LuFileJson, LuUpload, LuX } from "react-icons/lu";

import Recompensas from "../../components/common/Recompensas";
import { api } from "../../services/api";
import { EJEMPLO_JSON, descargarJson } from "./archivos";

/* =========================================================
   CREAR / EDITAR UN NIVEL
   ---------------------------------------------------------
   1. Datos del nivel: nombre, grado, asignatura, dificultad,
      tiempo, vidas.
   2. Recompensa: XP, oro y diamantes, y si se gana todo al
      terminar o según los aciertos.
   3. Preguntas: se adjunta un JSON. El servidor lo revisa y
      muestra una vista previa antes de guardar.
========================================================= */

const GRADOS = ["Transición", "1°", "2°", "3°", "4°", "5°", "6°", "7°", "8°", "9°", "10°", "11°", "General"];

const ASIGNATURAS = [
    "Matemáticas",
    "Lenguaje",
    "Ciencias naturales",
    "Ciencias sociales",
    "Inglés",
    "Ética y valores",
    "Tecnología e informática",
    "Educación artística",
    "Educación física",
    "Religión",
];

const VACIO = {
    nombre: "",
    descripcion: "",
    grado: "",
    asignatura: "",
    dificultad: "media",
    preguntas_por_partida: 10,
    segundos_por_pregunta: 30,
    vidas: 3,
    tipo_recompensa: "puntos",
    recompensa_xp: 50,
    recompensa_oro: 20,
    recompensa_diamantes: 0,
    porcentaje_minimo: 50,
    puntos_por_acierto: 100,
    max_recompensas_diarias: 5,
    activo: true,
    orden: 0,
};

function premioCon(form, aciertos, total) {
    const porcentaje = total > 0 ? Math.round((100 * aciertos) / total) : 0;
    const alcanza = porcentaje >= form.porcentaje_minimo;

    let factor = 0;
    if (form.tipo_recompensa === "completar") factor = alcanza ? 1 : 0;
    else factor = alcanza && total > 0 ? aciertos / total : 0;

    return {
        xp: Math.round(form.recompensa_xp * factor),
        oro: Math.round(form.recompensa_oro * factor),
        diamantes: Math.floor(form.recompensa_diamantes * factor),
    };
}

export default function EditorNivel({ nivelId, sugerencias, recompensasSugeridas, onCerrar, onGuardado }) {
    const dialogRef = useRef(null);
    const inputArchivo = useRef(null);

    const esNuevo = !nivelId;

    const [form, setForm] = useState(VACIO);
    const [cargando, setCargando] = useState(!esNuevo);
    const [preguntasActuales, setPreguntasActuales] = useState([]);
    const [recompensasTocadas, setRecompensasTocadas] = useState(!esNuevo);

    const [archivo, setArchivo] = useState(null); // { nombre, preguntas, errores, nivel }
    const [revisando, setRevisando] = useState(false);
    const [arrastrando, setArrastrando] = useState(false);
    const [pegar, setPegar] = useState(false);
    const [textoPegado, setTextoPegado] = useState("");

    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [errores, setErrores] = useState([]);

    /* ---------- Abrir como ventana modal ---------- */

    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);

    /* ---------- Cargar el nivel al editar ---------- */

    useEffect(() => {
        if (esNuevo) return;

        api(`/admin/niveles/${nivelId}`)
            .then((datos) => {
                const n = datos.nivel;
                setForm(Object.fromEntries(Object.keys(VACIO).map((k) => [k, n[k] ?? VACIO[k]])));
                setPreguntasActuales(datos.preguntas);
            })
            .catch((e) => setError(e.message))
            .finally(() => setCargando(false));
    }, [esNuevo, nivelId]);

    const campo = (nombre) => (e) => {
        const valor = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [nombre]: valor }));
        if (nombre.startsWith("recompensa_")) setRecompensasTocadas(true);
    };

    const numero = (nombre) => (e) => {
        setForm((f) => ({ ...f, [nombre]: e.target.value === "" ? "" : Number(e.target.value) }));
        if (nombre.startsWith("recompensa_")) setRecompensasTocadas(true);
    };

    const cambiarDificultad = (e) => {
        const dificultad = e.target.value;
        setForm((f) => ({
            ...f,
            dificultad,
            // Mientras no las haya cambiado a mano, se proponen
            // recompensas según la dificultad.
            ...(!recompensasTocadas && recompensasSugeridas?.[dificultad]),
        }));
    };

    /* ---------- Leer y revisar el JSON ---------- */

    async function revisar(texto, nombre) {
        setError("");
        setErrores([]);

        let contenido;

        try {
            contenido = JSON.parse(texto);
        } catch {
            setArchivo({ nombre, preguntas: [], errores: [{ fila: 0, mensaje: "El archivo no es un JSON válido. Revisa comas, comillas y corchetes." }], nivel: null });
            return;
        }

        setRevisando(true);

        try {
            const r = await api("/admin/niveles/validar", { metodo: "POST", body: { contenido } });
            setArchivo({ nombre, preguntas: r.preguntas, errores: r.errores, nivel: r.nivel });

            // Si el archivo trae datos del nivel y el formulario
            // está vacío, se usan para ahorrar trabajo.
            if (r.nivel && esNuevo) {
                setForm((f) => ({
                    ...f,
                    nombre: f.nombre || r.nivel.nombre,
                    descripcion: f.descripcion || r.nivel.descripcion || "",
                    grado: f.grado || r.nivel.grado,
                    asignatura: f.asignatura || r.nivel.asignatura,
                    ...(f.nombre ? {} : {
                        dificultad: r.nivel.dificultad,
                        ...(!recompensasTocadas && {
                            recompensa_xp: r.nivel.recompensa_xp,
                            recompensa_oro: r.nivel.recompensa_oro,
                            recompensa_diamantes: r.nivel.recompensa_diamantes,
                        }),
                    }),
                }));
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setRevisando(false);
        }
    }

    async function leerArchivo(file) {
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) {
            setError("El archivo pesa más de 3 MB. Divide las preguntas en varios niveles.");
            return;
        }

        revisar(await file.text(), file.name);
    }

    /* ---------- Guardar ---------- */

    async function guardar(e) {
        e.preventDefault();
        setError("");
        setErrores([]);

        if (esNuevo && !archivo) {
            setError("Adjunta el archivo JSON con las preguntas.");
            return;
        }

        if (archivo && archivo.errores.length > 0) {
            setError("Corrige los problemas del archivo o elige usar solo las preguntas correctas.");
            return;
        }

        setGuardando(true);

        const body = {
            nivel: form,
            preguntas: archivo
                ? archivo.preguntas.map((p) => ({
                      pregunta: p.texto,
                      opciones: p.opciones,
                      respuesta: p.respuesta_correcta,
                      explicacion: p.explicacion,
                  }))
                : undefined,
        };

        try {
            if (esNuevo) {
                const r = await api("/admin/niveles", { metodo: "POST", body });
                onGuardado(`Nivel "${form.nombre}" creado con ${r.preguntas} preguntas.`);
            } else {
                await api(`/admin/niveles/${nivelId}`, { metodo: "PUT", body });
                onGuardado(`Nivel "${form.nombre}" actualizado.`);
            }
        } catch (err) {
            setError(err.message);
            setErrores(err.errores || []);
        } finally {
            setGuardando(false);
        }
    }

    const totalPreguntas = archivo ? archivo.preguntas.length : preguntasActuales.length;
    const porPartida = Math.min(Number(form.preguntas_por_partida) || 0, totalPreguntas || Infinity);
    const minimoAciertos = Math.ceil(((Number(form.porcentaje_minimo) || 0) / 100) * porPartida);

    const grados = [...new Set([...GRADOS, ...(sugerencias?.grados || [])])];
    const asignaturas = [...new Set([...ASIGNATURAS, ...(sugerencias?.asignaturas || [])])].sort();

    return (
        <dialog
            ref={dialogRef}
            className="lg-dialog"
            aria-labelledby="editor-titulo"
            onCancel={(e) => {
                e.preventDefault();
                onCerrar();
            }}
        >
            <form onSubmit={guardar}>
                <div className="lg-dialog-head">
                    <h2 id="editor-titulo" className="lb-title">{esNuevo ? "Nuevo nivel" : "Editar nivel"}</h2>
                    <button type="button" className="lb-icon-btn" onClick={onCerrar} aria-label="Cerrar">
                        <LuX aria-hidden="true" />
                    </button>
                </div>

                {cargando ? (
                    <div className="lg-dialog-body"><p role="status">Cargando…</p></div>
                ) : (
                    <div className="lg-dialog-body">
                        {/* ---------------- DATOS ---------------- */}
                        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                            <legend className="lb-eyebrow" style={{ marginBottom: 10 }}>1 · Datos del nivel</legend>

                            <div className="lg-form-grid">
                                <label className="lg-field lg-span-2">
                                    <span>Nombre del nivel *</span>
                                    <input className="lg-input" required maxLength={120} value={form.nombre} onChange={campo("nombre")} placeholder="Ej: Fracciones básicas" />
                                </label>

                                <label className="lg-field">
                                    <span>Grado *</span>
                                    <input className="lg-input" required list="lista-grados" maxLength={40} value={form.grado} onChange={campo("grado")} placeholder="Ej: 5°" />
                                    <datalist id="lista-grados">
                                        {grados.map((g) => <option key={g} value={g} />)}
                                    </datalist>
                                </label>

                                <label className="lg-field">
                                    <span>Asignatura *</span>
                                    <input className="lg-input" required list="lista-asignaturas" maxLength={80} value={form.asignatura} onChange={campo("asignatura")} placeholder="Ej: Matemáticas" />
                                    <datalist id="lista-asignaturas">
                                        {asignaturas.map((a) => <option key={a} value={a} />)}
                                    </datalist>
                                </label>

                                <label className="lg-field lg-span-2">
                                    <span>Descripción (opcional)</span>
                                    <input className="lg-input" maxLength={500} value={form.descripcion || ""} onChange={campo("descripcion")} placeholder="Lo que verá el jugador debajo del nombre" />
                                </label>

                                <label className="lg-field">
                                    <span>Dificultad</span>
                                    <select className="lg-select" value={form.dificultad} onChange={cambiarDificultad}>
                                        <option value="facil">Fácil</option>
                                        <option value="media">Media</option>
                                        <option value="dificil">Difícil</option>
                                    </select>
                                </label>

                                <label className="lg-field">
                                    <span>Preguntas por partida</span>
                                    <input className="lg-input" type="number" min={1} max={50} required value={form.preguntas_por_partida} onChange={numero("preguntas_por_partida")} />
                                </label>

                                <label className="lg-field">
                                    <span>Segundos por pregunta</span>
                                    <input className="lg-input" type="number" min={0} max={600} required value={form.segundos_por_pregunta} onChange={numero("segundos_por_pregunta")} />
                                    <small className="lg-help">0 = sin límite de tiempo</small>
                                </label>

                                <label className="lg-field">
                                    <span>Vidas</span>
                                    <input className="lg-input" type="number" min={1} max={10} required value={form.vidas} onChange={numero("vidas")} />
                                </label>
                            </div>
                        </fieldset>

                        {/* ---------------- RECOMPENSA ---------------- */}
                        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                            <legend className="lb-eyebrow" style={{ marginBottom: 10 }}>2 · Lo que gana el jugador</legend>

                            <div className="lg-chips" role="radiogroup" aria-label="Cómo se gana el premio" style={{ marginBottom: 12 }}>
                                <button type="button" role="radio" className="lg-chip" aria-checked={form.tipo_recompensa === "puntos"} aria-pressed={form.tipo_recompensa === "puntos"} onClick={() => setForm((f) => ({ ...f, tipo_recompensa: "puntos" }))}>
                                    Según sus aciertos
                                </button>
                                <button type="button" role="radio" className="lg-chip" aria-checked={form.tipo_recompensa === "completar"} aria-pressed={form.tipo_recompensa === "completar"} onClick={() => setForm((f) => ({ ...f, tipo_recompensa: "completar" }))}>
                                    Todo al terminar el nivel
                                </button>
                            </div>
                            <p className="lg-help" style={{ marginBottom: 12 }}>
                                {form.tipo_recompensa === "puntos"
                                    ? "Gana una parte del premio según cuántas preguntas acierte (si llega al mínimo)."
                                    : "Gana el premio completo solo si responde todas las preguntas y llega al mínimo. Si se retira o pierde las vidas, no gana."}
                            </p>

                            <div className="lg-form-grid">
                                <label className="lg-field">
                                    <span>XP (experiencia)</span>
                                    <input className="lg-input" type="number" min={0} max={5000} required value={form.recompensa_xp} onChange={numero("recompensa_xp")} />
                                </label>
                                <label className="lg-field">
                                    <span>Oro</span>
                                    <input className="lg-input" type="number" min={0} max={5000} required value={form.recompensa_oro} onChange={numero("recompensa_oro")} />
                                </label>
                                <label className="lg-field">
                                    <span>Diamantes</span>
                                    <input className="lg-input" type="number" min={0} max={500} required value={form.recompensa_diamantes} onChange={numero("recompensa_diamantes")} />
                                </label>
                                <label className="lg-field">
                                    <span>Mínimo de aciertos (%)</span>
                                    <input className="lg-input" type="number" min={0} max={100} required value={form.porcentaje_minimo} onChange={numero("porcentaje_minimo")} />
                                </label>
                                <label className="lg-field">
                                    <span>Puntos por acierto</span>
                                    <input className="lg-input" type="number" min={1} max={100000} required value={form.puntos_por_acierto} onChange={numero("puntos_por_acierto")} />
                                    <small className="lg-help">Solo para el marcador</small>
                                </label>
                                <label className="lg-field">
                                    <span>Premios por día</span>
                                    <input className="lg-input" type="number" min={0} max={1000} required value={form.max_recompensas_diarias} onChange={numero("max_recompensas_diarias")} />
                                    <small className="lg-help">Partidas premiadas por jugador al día (0 = sin límite)</small>
                                </label>
                            </div>

                            {porPartida > 0 && (
                                <div className="lg-q" style={{ marginTop: 12 }}>
                                    <p className="lb-muted" style={{ fontWeight: 800 }}>Así quedaría el premio:</p>
                                    <div className="lg-row" style={{ marginTop: 6 }}>
                                        <span>{`${porPartida}/${porPartida} aciertos →`}</span>
                                        <Recompensas {...premioCon(form, porPartida, porPartida)} />
                                    </div>
                                    {minimoAciertos > 0 && minimoAciertos < porPartida && (
                                        <div className="lg-row" style={{ marginTop: 6 }}>
                                            <span>{`${minimoAciertos}/${porPartida} aciertos (el mínimo) →`}</span>
                                            <Recompensas {...premioCon(form, minimoAciertos, porPartida)} />
                                        </div>
                                    )}
                                    {minimoAciertos > 1 && (
                                        <div className="lg-row" style={{ marginTop: 6 }}>
                                            <span>{`${minimoAciertos - 1}/${porPartida} aciertos →`}</span>
                                            <span className="lb-muted">no gana premio</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </fieldset>

                        {/* ---------------- PREGUNTAS ---------------- */}
                        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                            <legend className="lb-eyebrow" style={{ marginBottom: 10 }}>3 · Preguntas</legend>

                            {!esNuevo && !archivo && (
                                <div className="lg-row" style={{ marginBottom: 10 }}>
                                    <span className="lb-muted">{`Este nivel tiene ${preguntasActuales.length} preguntas. Adjunta un JSON solo si quieres reemplazarlas todas.`}</span>
                                    <button
                                        type="button"
                                        className="lb-btn lb-btn-ghost lb-btn-sm"
                                        onClick={() =>
                                            descargarJson(
                                                {
                                                    nivel: form,
                                                    preguntas: preguntasActuales.map((p) => ({
                                                        pregunta: p.texto,
                                                        opciones: p.opciones,
                                                        respuesta: p.respuesta_correcta,
                                                        ...(p.explicacion ? { explicacion: p.explicacion } : {}),
                                                    })),
                                                },
                                                `${form.nombre || "nivel"}.json`
                                            )
                                        }
                                    >
                                        <LuDownload aria-hidden="true" />
                                        Descargar las actuales
                                    </button>
                                </div>
                            )}

                            <label
                                className={`lg-drop ${arrastrando ? "lg-drop-activo" : ""}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setArrastrando(true);
                                }}
                                onDragLeave={() => setArrastrando(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setArrastrando(false);
                                    leerArchivo(e.dataTransfer.files?.[0]);
                                }}
                            >
                                <LuUpload aria-hidden="true" />
                                <strong>{archivo ? archivo.nombre : "Adjuntar archivo JSON"}</strong>
                                <span className="lb-muted">Haz clic o arrastra el archivo aquí</span>
                                <input
                                    ref={inputArchivo}
                                    type="file"
                                    accept=".json,application/json"
                                    className="lb-sr-only"
                                    onChange={(e) => {
                                        leerArchivo(e.target.files?.[0]);
                                        e.target.value = "";
                                    }}
                                />
                            </label>

                            <div className="lg-row" style={{ marginTop: 8 }}>
                                <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => setPegar((v) => !v)}>
                                    <LuFileJson aria-hidden="true" />
                                    {pegar ? "Ocultar" : "O pegar el JSON"}
                                </button>
                                <button type="button" className="lb-btn lb-btn-ghost lb-btn-sm" onClick={() => descargarJson(EJEMPLO_JSON, "ejemplo-nivel.json")}>
                                    <LuDownload aria-hidden="true" />
                                    Ver ejemplo
                                </button>
                            </div>

                            {pegar && (
                                <div style={{ marginTop: 8 }}>
                                    <textarea
                                        className="lg-textarea"
                                        rows={6}
                                        value={textoPegado}
                                        onChange={(e) => setTextoPegado(e.target.value)}
                                        placeholder='[{"pregunta": "¿2 + 2?", "opciones": ["3", "4"], "respuesta": 1}]'
                                        aria-label="JSON de preguntas"
                                    />
                                    <button type="button" className="lb-btn lb-btn-secondary lb-btn-sm" style={{ marginTop: 6 }} onClick={() => revisar(textoPegado, "JSON pegado")} disabled={!textoPegado.trim()}>
                                        Revisar
                                    </button>
                                </div>
                            )}

                            <p className="lg-help" style={{ marginTop: 8 }}>
                                Cada pregunta necesita <code>pregunta</code>, <code>opciones</code> (2 a 6) y{" "}
                                <code>respuesta</code>: el número de la opción (desde 0), la letra (A, B, C…) o el
                                texto exacto de la correcta. <code>explicacion</code> es opcional y se muestra al
                                responder. También sirve el formato anterior (<code>question</code>,{" "}
                                <code>options</code>, <code>correctAnswer</code>).
                            </p>

                            {revisando && <p role="status" style={{ marginTop: 10 }}>Revisando el archivo…</p>}

                            {archivo && !revisando && (
                                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                                    {archivo.preguntas.length > 0 && (
                                        <p className="lg-ok">{`✔ ${archivo.preguntas.length} preguntas listas.`}</p>
                                    )}

                                    {archivo.errores.length > 0 && (
                                        <div className="lg-alert" role="alert">
                                            <p>{`${archivo.errores.length} problema(s) en el archivo:`}</p>
                                            <ul style={{ marginTop: 6, fontWeight: 600 }}>
                                                {archivo.errores.slice(0, 15).map((er, i) => (
                                                    <li key={i}>{er.fila ? `Pregunta ${er.fila}: ${er.mensaje}` : er.mensaje}</li>
                                                ))}
                                            </ul>
                                            {archivo.preguntas.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="lb-btn lb-btn-ghost lb-btn-sm"
                                                    style={{ marginTop: 10 }}
                                                    onClick={() => setArchivo((a) => ({ ...a, errores: [] }))}
                                                >
                                                    {`Ignorarlas y usar solo las ${archivo.preguntas.length} correctas`}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {archivo.preguntas.slice(0, 3).map((p, i) => (
                                        <div className="lg-q" key={i}>
                                            <strong>{`${i + 1}. ${p.texto}`}</strong>
                                            <ol>
                                                {p.opciones.map((o, j) => (
                                                    <li key={j} className={j === p.respuesta_correcta ? "lg-q-ok" : ""}>
                                                        {o}{j === p.respuesta_correcta ? " ✔" : ""}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    ))}
                                    {archivo.preguntas.length > 3 && (
                                        <p className="lb-muted">{`…y ${archivo.preguntas.length - 3} más.`}</p>
                                    )}
                                </div>
                            )}
                        </fieldset>

                        <label className="lg-row" style={{ cursor: "pointer" }}>
                            <input type="checkbox" checked={form.activo} onChange={campo("activo")} style={{ width: 20, height: 20 }} />
                            <span>Publicado (los jugadores lo ven)</span>
                        </label>

                        {error && (
                            <div className="lg-alert" role="alert">
                                <p>{error}</p>
                                {errores.length > 0 && (
                                    <ul style={{ marginTop: 6, fontWeight: 600 }}>
                                        {errores.slice(0, 10).map((er, i) => (
                                            <li key={i}>{er.fila ? `Pregunta ${er.fila}: ${er.mensaje}` : er.mensaje}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="lg-dialog-foot">
                    <button type="button" className="lb-btn lb-btn-ghost" onClick={onCerrar}>Cancelar</button>
                    <button type="submit" className="lb-btn lb-btn-primary" disabled={guardando || cargando || revisando}>
                        {guardando ? "Guardando…" : esNuevo ? "Crear nivel" : "Guardar cambios"}
                    </button>
                </div>
            </form>
        </dialog>
    );
}
