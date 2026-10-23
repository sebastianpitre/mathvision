import { useEffect, useState } from "react";
import { LuCheck, LuX } from "react-icons/lu";

import { useAuth } from "../../context/AuthContext";
import { socket } from "../../services/socket";
import { alAvisar, avisar } from "../../services/avisos";
import AssetImage from "../common/AssetImage";

import "./notificaciones.css";

/* =========================================================
   NOTIFICACIONES EN CUALQUIER PANTALLA
   ---------------------------------------------------------
   · Mantiene al jugador "en línea" desde cualquier pantalla
     (así lo pueden invitar esté donde esté).
   · Invitaciones: aparecen arriba unos segundos con Aceptar
     y No. Al aceptar, el servidor lo lleva a la sala.
   · Avisos cortos (invitación enviada, rechazada, errores).
========================================================= */

const SEGUNDOS_INVITACION = 12;

export default function Notificaciones() {
    const { user } = useAuth();
    const [invitaciones, setInvitaciones] = useState([]);
    const [avisos, setAvisos] = useState([]);

    /* ---------- Conexión y presencia ---------- */
    useEffect(() => {
        if (!user) return;

        // Al conectar (o reconectar tras recargar) se avisa que sigue aquí:
        // en línea para invitaciones y de vuelta en su sala, si tenía.
        const alConectar = () => {
            socket.emit("world:join");
            socket.emit("sala:estado");
        };

        const alInvitacion = (inv) => {
            if (!inv?.fromPlayerId) return;
            const id = String(inv.fromPlayerId);
            const hasta = Math.min(inv.expiraEn || Infinity, Date.now() + SEGUNDOS_INVITACION * 1000);
            setInvitaciones((lista) => [{ ...inv, id, hasta, en: Date.now() }, ...lista.filter((i) => i.id !== id)].slice(0, 3));
        };

        const alEnviada = ({ targetPlayerName }) => avisar(`Invitación enviada a ${targetPlayerName}`, "ok", 2200);
        const alRechazo = ({ playerName }) => avisar(`${playerName} no aceptó`, "info");
        const alAceptada = ({ playerName }) => avisar(`¡${playerName} entró a tu sala!`, "ok");
        const alError = ({ message }) => avisar(message, "error", 3800);

        socket.on("connect", alConectar);
        socket.on("world:invitation", alInvitacion);
        socket.on("world:inviteSent", alEnviada);
        socket.on("world:invitationRejected", alRechazo);
        socket.on("world:inviteAccepted", alAceptada);
        socket.on("world:error", alError);

        if (socket.connected) alConectar();
        else socket.connect();

        return () => {
            socket.off("connect", alConectar);
            socket.off("world:invitation", alInvitacion);
            socket.off("world:inviteSent", alEnviada);
            socket.off("world:invitationRejected", alRechazo);
            socket.off("world:inviteAccepted", alAceptada);
            socket.off("world:error", alError);
        };
    }, [user]);

    /* ---------- Avisos ---------- */
    useEffect(
        () =>
            alAvisar((aviso) => {
                setAvisos((lista) => [aviso, ...lista.filter((a) => a.texto !== aviso.texto)].slice(0, 3));
                setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== aviso.id)), aviso.ms);
            }),
        []
    );

    /* ---------- Las invitaciones se van solas ---------- */
    useEffect(() => {
        if (!invitaciones.length) return;
        const proxima = Math.min(...invitaciones.map((i) => i.hasta));
        const t = setTimeout(
            () => setInvitaciones((lista) => lista.filter((i) => i.hasta > Date.now() + 50)),
            Math.max(0, proxima - Date.now())
        );
        return () => clearTimeout(t);
    }, [invitaciones]);

    const responder = (inv, aceptar) => {
        socket.emit(aceptar ? "world:acceptInvitation" : "world:rejectInvitation", { fromPlayerId: inv.fromPlayerId });
        setInvitaciones((lista) => lista.filter((i) => i.id !== inv.id));
    };

    if (!user || (!invitaciones.length && !avisos.length)) return null;

    return (
        <div className="nt" aria-live="polite">
            {invitaciones.map((inv) => (
                <div key={inv.id + inv.en} className="nt-invitacion" role="alertdialog" aria-label={`${inv.fromPlayerName} te invita a su sala`}>
                    <span className="nt-avatar">
                        <AssetImage src={inv.fromPlayerAvatar} type="player" alt="" />
                    </span>
                    <span className="nt-texto">
                        <strong>{inv.fromPlayerName}</strong>
                        <small>te invita a su sala</small>
                    </span>
                    <button type="button" className="nt-btn nt-btn-si" onClick={() => responder(inv, true)}>
                        <LuCheck aria-hidden="true" />
                        Ir
                    </button>
                    <button type="button" className="nt-btn nt-btn-no" onClick={() => responder(inv, false)} aria-label="No, gracias">
                        <LuX aria-hidden="true" />
                    </button>
                    <span
                        className="nt-tiempo"
                        style={{ animationDuration: `${Math.max(1, inv.hasta - inv.en)}ms` }}
                        aria-hidden="true"
                    />
                </div>
            ))}

            {avisos.map((a) => (
                <p key={a.id} className={`nt-aviso nt-aviso-${a.tono}`} role={a.tono === "error" ? "alert" : "status"}>
                    {a.texto}
                </p>
            ))}
        </div>
    );
}
