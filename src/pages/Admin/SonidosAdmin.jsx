import { useEffect, useRef, useState } from "react";
import { LuPause, LuPencil, LuPlay, LuSave, LuTrash2, LuUpload } from "react-icons/lu";

import { api } from "../../services/api";
import { cargarSonidos } from "../../services/sonidos";
import { useCarga } from "./useCarga";
import { subirBinario } from "./subirArchivo";

/* =========================================================
   SONIDOS: biblioteca (subir una vez y reutilizar) y qué
   sonido suena en cada momento del juego.
========================================================= */

const GRUPOS = [
    { id: "musica", titulo: "Música de fondo", ayuda: "Suena en bucle. Si un juego no tiene música propia, sigue la del lobby." },
    { id: "general", titulo: "Generales" },
    { id: "resultado", titulo: "Resultado de la partida" },
    { id: "juego", titulo: "Dentro de los juegos" },
];

const pesoTexto = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/* Un solo reproductor para escuchar sonidos en el panel. */
function useEscuchar() {
    const audio = useRef(null);
    const [sonando, setSonando] = useState(null);

    const parar = () => {
        audio.current?.pause();
        audio.current = null;
        setSonando(null);
    };

    const escuchar = (ruta, volumen = 100, id = ruta) => {
        if (sonando === id) return parar();
        audio.current?.pause();
        const a = new Audio(ruta);
        a.volume = Math.max(0, Math.min(1, volumen / 100));
        a.onended = () => setSonando((s) => (s === id ? null : s));
        a.play().catch(() => setSonando(null));
        audio.current = a;
        setSonando(id);
    };

    useEffect(() => () => audio.current?.pause(), []);
    return { sonando, escuchar };
}

export default function SonidosAdmin() {
    const { datos, cargando, error, recargar } = useCarga("/admin/sonidos");
    const [momentos, setMomentos] = useState(null);
    const [cambiados, setCambiados] = useState(false);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });
    const [subiendo, setSubiendo] = useState(null); // { nombre, avance }
    const [guardando, setGuardando] = useState(false);
    const entrada = useRef(null);
    const { sonando, escuchar } = useEscuchar();

    useEffect(() => {
        if (datos && !cambiados) setMomentos(datos.momentos);
    }, [datos, cambiados]);

    const sonidos = datos?.sonidos || [];
    const porId = new Map(sonidos.map((s) => [s.id, s]));

    async function subir(archivos) {
        const mensajes = [];
        for (const archivo of archivos) {
            try {
                setSubiendo({ nombre: archivo.name, avance: 0 });
                const r = await subirBinario(`/admin/sonidos?nombre=${encodeURIComponent(archivo.name)}`, archivo, (avance) =>
                    setSubiendo({ nombre: archivo.name, avance })
                );
                mensajes.push(r.message);
            } catch (e) {
                mensajes.push(`${archivo.name}: ${e.message}`);
                setAviso({ texto: mensajes.join(" · "), tono: "error" });
            }
        }
        setSubiendo(null);
        if (entrada.current) entrada.current.value = "";
        setAviso((a) => (a.tono === "error" ? a : { texto: mensajes.join(" · "), tono: "ok" }));
        recargar();
    }

    async function renombrar(s) {
        const nombre = window.prompt("Nombre del sonido:", s.nombre);
        if (!nombre || nombre === s.nombre) return;
        try {
            await api(`/admin/sonidos/${s.id}`, { metodo: "PATCH", body: { nombre } });
            recargar();
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        }
    }

    async function borrar(s) {
        if (!window.confirm(`¿Borrar "${s.nombre}" de la biblioteca?`)) return;
        try {
            await api(`/admin/sonidos/${s.id}`, { metodo: "DELETE" });
            setAviso({ texto: `"${s.nombre}" se borró.`, tono: "ok" });
            recargar();
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        }
    }

    const cambiar = (clave, cambio) => {
        setCambiados(true);
        setMomentos((lista) => lista.map((m) => (m.clave === clave ? { ...m, ...cambio } : m)));
    };

    async function guardar() {
        setGuardando(true);
        try {
            const cuerpo = Object.fromEntries(momentos.map((m) => [m.clave, { sonidoId: m.sonidoId, volumen: m.volumen }]));
            const r = await api("/admin/sonidos/momentos", { metodo: "PUT", body: { momentos: cuerpo } });
            setMomentos(r.momentos);
            setCambiados(false);
            setAviso({ texto: "Sonidos guardados. Los jugadores los oyen al volver a abrir el juego o cambiar de pestaña.", tono: "ok" });
            cargarSonidos({ forzar: true });
            recargar();
        } catch (e) {
            setAviso({ texto: e.message, tono: "error" });
        } finally {
            setGuardando(false);
        }
    }

    if (cargando && !datos) return <div className="lb-card lg-empty" role="status">Cargando sonidos…</div>;
    if (error) return <p className="lg-alert" role="alert">{error}</p>;
    if (!momentos) return null;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--lb-gap)" }}>
            <div>
                <h2 className="lg-card-title">Música y sonidos</h2>
                <p className="lb-muted">
                    Sube cada sonido una sola vez y elígelo en los momentos que quieras. Si subes un archivo que ya está,
                    se reutiliza el que existe.
                </p>
            </div>

            {aviso.texto && <p className={aviso.tono === "error" ? "lg-alert" : "lg-ok"} role="status">{aviso.texto}</p>}

            {/* ---------------- Momentos ---------------- */}
            {GRUPOS.map((g) => (
                <section key={g.id} className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                        <h3 className="lg-card-title">{g.titulo}</h3>
                        {g.ayuda && <p className="lb-muted" style={{ margin: 0 }}>{g.ayuda}</p>}
                    </div>
                    <div className="lg-table-wrap">
                        <table className="lg-table">
                            <thead>
                                <tr>
                                    <th scope="col">Momento</th>
                                    <th scope="col">Sonido</th>
                                    <th scope="col">Volumen</th>
                                    <th scope="col"><span className="lb-sr-only">Escuchar</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {momentos
                                    .filter((m) => m.grupo === g.id)
                                    .map((m) => {
                                        const elegido = porId.get(m.sonidoId);
                                        const ruta = elegido?.ruta || m.ruta;
                                        return (
                                            <tr key={m.clave}>
                                                <td style={{ minWidth: 170 }}>{m.nombre}</td>
                                                <td style={{ minWidth: 220 }}>
                                                    <select
                                                        className="lg-select"
                                                        aria-label={`Sonido para ${m.nombre}`}
                                                        value={m.sonidoId ?? ""}
                                                        onChange={(e) => cambiar(m.clave, { sonidoId: e.target.value ? Number(e.target.value) : null, ruta: null })}
                                                    >
                                                        <option value="">{g.id === "musica" && m.clave !== "musica_lobby" ? "— La del lobby —" : "— Ninguno —"}</option>
                                                        {sonidos.map((s) => (
                                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td style={{ minWidth: 170 }}>
                                                    <label className="lg-row" style={{ alignItems: "center", gap: 8, flexWrap: "nowrap" }}>
                                                        <input
                                                            type="range"
                                                            min={0}
                                                            max={100}
                                                            step={5}
                                                            value={m.volumen}
                                                            onChange={(e) => cambiar(m.clave, { volumen: Number(e.target.value) })}
                                                            aria-label={`Volumen de ${m.nombre}`}
                                                        />
                                                        <span style={{ minWidth: 36, textAlign: "right" }}>{`${m.volumen}%`}</span>
                                                    </label>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="lb-icon-btn"
                                                        disabled={!ruta}
                                                        onClick={() => escuchar(ruta, m.volumen, m.clave)}
                                                        aria-label={sonando === m.clave ? "Parar" : `Escuchar ${m.nombre}`}
                                                        title={sonando === m.clave ? "Parar" : "Escuchar con este volumen"}
                                                    >
                                                        {sonando === m.clave ? <LuPause aria-hidden="true" /> : <LuPlay aria-hidden="true" />}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}

            <div className="lg-row" style={{ alignItems: "center" }}>
                <button type="button" className="lb-btn lb-btn-primary" onClick={guardar} disabled={guardando || !cambiados}>
                    <LuSave aria-hidden="true" />
                    {guardando ? "Guardando…" : "Guardar sonidos"}
                </button>
                {cambiados && <span className="lb-muted">Tienes cambios sin guardar.</span>}
            </div>

            {/* ---------------- Biblioteca ---------------- */}
            <section className="lb-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="lg-row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h3 className="lg-card-title">{`Biblioteca (${sonidos.length})`}</h3>
                        <p className="lb-muted" style={{ margin: 0 }}>mp3, ogg, wav o m4a · máximo 10 MB cada uno.</p>
                    </div>
                    <input
                        ref={entrada}
                        type="file"
                        accept=".mp3,.ogg,.wav,.m4a,audio/*"
                        multiple
                        hidden
                        onChange={(e) => e.target.files?.length && subir([...e.target.files])}
                    />
                    <button type="button" className="lb-btn lb-btn-primary" onClick={() => entrada.current?.click()} disabled={Boolean(subiendo)}>
                        <LuUpload aria-hidden="true" />
                        {subiendo ? `Subiendo ${subiendo.nombre}… ${subiendo.avance}%` : "Subir sonidos"}
                    </button>
                </div>
                <div className="lg-table-wrap">
                    <table className="lg-table">
                        <thead>
                            <tr>
                                <th scope="col"><span className="lb-sr-only">Escuchar</span></th>
                                <th scope="col">Nombre</th>
                                <th scope="col">Se usa en</th>
                                <th scope="col" className="lg-num">Peso</th>
                                <th scope="col"><span className="lb-sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sonidos.map((s) => (
                                <tr key={s.id}>
                                    <td>
                                        <button
                                            type="button"
                                            className="lb-icon-btn"
                                            onClick={() => escuchar(s.ruta, 100, `b${s.id}`)}
                                            aria-label={sonando === `b${s.id}` ? "Parar" : `Escuchar ${s.nombre}`}
                                        >
                                            {sonando === `b${s.id}` ? <LuPause aria-hidden="true" /> : <LuPlay aria-hidden="true" />}
                                        </button>
                                    </td>
                                    <td style={{ minWidth: 180 }}>
                                        <strong>{s.nombre}</strong>
                                        {s.de_fabrica && <span className="lg-tag" style={{ marginLeft: 6 }}>De fábrica</span>}
                                    </td>
                                    <td className="lb-muted">{s.usos.length ? s.usos.join(", ") : "—"}</td>
                                    <td className="lg-num">{s.bytes ? pesoTexto(s.bytes) : "—"}</td>
                                    <td>
                                        <div className="lg-row" style={{ flexWrap: "nowrap" }}>
                                            <button type="button" className="lb-icon-btn" onClick={() => renombrar(s)} aria-label={`Cambiar nombre de ${s.nombre}`} title="Cambiar nombre">
                                                <LuPencil aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                className="lb-icon-btn"
                                                onClick={() => borrar(s)}
                                                disabled={s.de_fabrica || s.usos.length > 0}
                                                aria-label={`Borrar ${s.nombre}`}
                                                title={s.de_fabrica ? "Viene con el juego" : s.usos.length ? "Está en uso" : "Borrar"}
                                            >
                                                <LuTrash2 aria-hidden="true" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
