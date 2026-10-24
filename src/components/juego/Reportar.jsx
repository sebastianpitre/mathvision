import { useEffect, useState } from "react";
import { LuFlag, LuVolume2, LuVolumeX, LuX } from "react-icons/lu";

import { api } from "../../services/api";
import { alternarSilencioJugador } from "../../services/voz";
import { avisar } from "../../services/avisos";
import { useSilenciados } from "../../hooks/useVoz";

import "./voz.css";

let motivosGuardados = null;

/* Ventana para reportar: la persona elige el motivo. */
export function VentanaReporte({ jugador, contexto, alCerrar }) {
    const [motivos, setMotivos] = useState(motivosGuardados || []);
    const [motivo, setMotivo] = useState("");
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (motivosGuardados) return;
        api("/reportes/motivos")
            .then((r) => {
                motivosGuardados = r.motivos;
                setMotivos(r.motivos);
            })
            .catch((e) => avisar(e.message, "error"));
    }, []);

    useEffect(() => {
        const tecla = (e) => e.key === "Escape" && alCerrar();
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [alCerrar]);

    const enviar = async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
            const r = await api("/reportes", { metodo: "POST", body: { reportadoId: Number(jugador.userId), motivo, contexto } });
            avisar(r.message, "ok");
            alCerrar();
        } catch (err) {
            avisar(err.message, "error", 4000);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="vz-fondo" onClick={alCerrar}>
            <form className="vz-ventana" onClick={(e) => e.stopPropagation()} onSubmit={enviar} role="dialog" aria-modal="true" aria-labelledby="vz-titulo">
                <header>
                    <h2 id="vz-titulo">{`Reportar a ${jugador.nombre}`}</h2>
                    <button type="button" className="vz-cerrar" onClick={alCerrar} aria-label="Cerrar">
                        <LuX aria-hidden="true" />
                    </button>
                </header>
                <p>¿Por qué lo reportas?</p>
                <div className="vz-motivos" role="radiogroup" aria-label="Motivo">
                    {motivos.map((m) => (
                        <label key={m.id} className={`vz-motivo ${motivo === m.id ? "vz-motivo-elegido" : ""}`}>
                            <input type="radio" name="motivo" value={m.id} checked={motivo === m.id} onChange={() => setMotivo(m.id)} />
                            {m.texto}
                        </label>
                    ))}
                </div>
                <button type="submit" className="vz-enviar" disabled={!motivo || enviando}>
                    <LuFlag aria-hidden="true" />
                    {enviando ? "Enviando…" : "Enviar reporte"}
                </button>
            </form>
        </div>
    );
}

/* Silenciar (solo para mí) y reportar a un jugador. */
export function AccionesJugador({ userId, nombre, contexto, className = "" }) {
    const silenciado = useSilenciados();
    const [reportando, setReportando] = useState(false);
    const callado = silenciado(userId);

    return (
        <span className={`vz-acciones ${className}`}>
            <button
                type="button"
                className={`vz-accion ${callado ? "vz-accion-activa" : ""}`}
                onClick={(e) => {
                    e.stopPropagation();
                    alternarSilencioJugador(userId);
                }}
                aria-label={callado ? `Escuchar a ${nombre}` : `Silenciar a ${nombre}`}
                title={callado ? "Silenciado (toca para escuchar)" : "Silenciar su voz"}
            >
                {callado ? <LuVolumeX aria-hidden="true" /> : <LuVolume2 aria-hidden="true" />}
            </button>
            <button
                type="button"
                className="vz-accion"
                onClick={(e) => {
                    e.stopPropagation();
                    setReportando(true);
                }}
                aria-label={`Reportar a ${nombre}`}
                title="Reportar"
            >
                <LuFlag aria-hidden="true" />
            </button>
            {reportando && <VentanaReporte jugador={{ userId, nombre }} contexto={contexto} alCerrar={() => setReportando(false)} />}
        </span>
    );
}
