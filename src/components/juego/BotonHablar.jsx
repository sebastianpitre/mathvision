import { useEffect, useRef, useState } from "react";
import { LuMic, LuMicOff } from "react-icons/lu";

import { useAuth } from "../../context/AuthContext";
import { socket } from "../../services/socket";
import { empezarCaptura, pararCaptura, TASA } from "../../services/voz";
import { avisar } from "../../services/avisos";
import { useVoz } from "../../hooks/useVoz";

import "./voz.css";

/* =========================================================
   BOTÓN DE HABLAR (walkie-talkie)
   Mantén presionado para hablar (máximo los segundos que
   ponga el administrador). Si otro está hablando, espera.
   Después de hablar hay una espera corta.
========================================================= */

export default function BotonHablar({ className = "" }) {
    const { user } = useAuth();
    const miId = String(user?.id ?? "");
    const { info, hablando, desfase } = useVoz();

    const [presionado, setPresionado] = useState(false);
    const [, setTic] = useState(0);
    const desfaseRef = useRef(0);
    desfaseRef.current = desfase;
    const [esperaHasta, setEsperaHasta] = useState(0);
    const hablandoRef = useRef(null);
    const presionadoRef = useRef(false);

    hablandoRef.current = hablando;
    const yoHablo = hablando?.userId === miId;
    const otroHabla = hablando && !yoHablo;

    // El servidor cortó (se acabaron los segundos): se apaga el micrófono.
    useEffect(() => {
        if (!yoHablo && presionadoRef.current && hablando === null) {
            pararCaptura();
            presionadoRef.current = false;
            setPresionado(false);
            setEsperaHasta(Date.now() + (info?.espera || 0) * 1000);
        }
    }, [yoHablo, hablando, info?.espera]);

    // Reloj para el anillo de tiempo y la cuenta de la espera.
    const ahora = Date.now();
    const activo = yoHablo || esperaHasta > ahora;
    useEffect(() => {
        if (!activo) return;
        const t = setInterval(() => setTic((n) => n + 1), 100);
        return () => clearInterval(t);
    }, [activo]);

    // El servidor dice cuándo se puede volver a hablar.
    useEffect(() => {
        const alError = ({ otraVezEn }) => {
            // otraVezEn viene en la hora del servidor.
            if (otraVezEn) setEsperaHasta(otraVezEn - desfaseRef.current);
            presionadoRef.current = false;
            setPresionado(false);
            pararCaptura();
        };
        socket.on("voz:error", alError);
        return () => socket.off("voz:error", alError);
    }, []);

    useEffect(() => () => pararCaptura(), []);

    const empezar = async (e) => {
        e.preventDefault();
        if (!info?.puede) return avisar(info?.motivo || "No puedes hablar ahora.", "error", 3000);
        if (otroHabla || presionadoRef.current) return;

        if (e.pointerId != null) e.currentTarget.setPointerCapture?.(e.pointerId);
        presionadoRef.current = true;
        setPresionado(true);
        socket.emit("voz:empezar");

        try {
            await empezarCaptura((pcm) => {
                if (hablandoRef.current?.userId === miId) socket.emit("voz:audio", { pcm, rate: TASA });
            });
            // Soltó mientras se pedía el micrófono.
            if (!presionadoRef.current) pararCaptura();
        } catch (err) {
            avisar(err.message, "error", 4000);
            terminar();
        }
    };

    const terminar = () => {
        if (!presionadoRef.current) return;
        presionadoRef.current = false;
        setPresionado(false);
        pararCaptura();
        socket.emit("voz:terminar");
        setEsperaHasta(Date.now() + (info?.espera || 0) * 1000);
    };

    if (!info) return null;

    const segundosEspera = Math.max(0, Math.ceil((esperaHasta - ahora) / 1000));
    const restante = yoHablo ? Math.max(0, hablando.hasta - (ahora + desfase)) : 0;
    const progreso = yoHablo ? restante / ((info.segundos || 5) * 1000) : 0;

    let estado = "libre";
    let texto = "Mantén para hablar";
    if (!info.puede) [estado, texto] = ["bloqueado", info.motivo || "Sin voz"];
    else if (yoHablo) [estado, texto] = ["hablando", `Hablando… ${Math.ceil(restante / 1000)} s`];
    else if (otroHabla) [estado, texto] = ["ocupado", `${hablando.nombre} habla`];
    else if (segundosEspera > 0) [estado, texto] = ["espera", `Espera ${segundosEspera} s`];

    return (
        <button
            type="button"
            data-sin-clic
            className={`vz-boton vz-${estado} ${presionado ? "vz-presionado" : ""} ${className}`}
            onPointerDown={empezar}
            onPointerUp={terminar}
            onPointerCancel={terminar}
            onLostPointerCapture={terminar}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && empezar(e)}
            onKeyUp={(e) => (e.key === " " || e.key === "Enter") && terminar()}
            disabled={estado === "ocupado"}
            aria-label={texto}
            title={texto}
        >
            {estado === "hablando" && (
                <svg className="vz-anillo" viewBox="0 0 36 36" aria-hidden="true">
                    <circle cx="18" cy="18" r="16" pathLength="100" strokeDasharray={`${progreso * 100} 100`} />
                </svg>
            )}
            {estado === "bloqueado" ? <LuMicOff aria-hidden="true" /> : <LuMic aria-hidden="true" />}
            {estado === "espera" && <span className="vz-numero">{segundosEspera}</span>}
            {estado === "ocupado" && <span className="vz-ondas" aria-hidden="true"><i /><i /><i /></span>}
        </button>
    );
}

/* Marca de "está hablando" para poner junto a un nombre. */
export function HablandoMarca({ activo }) {
    if (!activo) return null;
    return (
        <span className="vz-marca" title="Está hablando" aria-label="Está hablando">
            <i /><i /><i />
        </span>
    );
}
