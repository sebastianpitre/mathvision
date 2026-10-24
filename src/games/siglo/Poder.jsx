import { useEffect, useRef, useState } from "react";

import AssetImage from "../../components/common/AssetImage";
import { socket } from "../../services/socket";
import { sonar } from "../../services/sonidos";

import "./poder.css";

/* =========================================================
   PODER 🔄 DE SIGLOGAMIF
   1. Aparece flotando para todos: el primero que lo toca se
      lo queda.
   2. Quien lo tiene elige a otro jugador, un número del 0 al
      6 y si va como unidad o decena. Ese número se pone en el
      siguiente espacio vacío del otro (pierde ese turno, o
      hasta se pasa de 100).
========================================================= */

function useSegundos(hasta, desfase) {
    const [, setTic] = useState(0);
    useEffect(() => {
        if (!hasta) return;
        const t = setInterval(() => setTic((n) => n + 1), 250);
        return () => clearInterval(t);
    }, [hasta]);
    return hasta ? Math.max(0, Math.ceil((hasta - (Date.now() + desfase)) / 1000)) : 0;
}

export default function PoderSiglo({ partida, miId, desfase = 0 }) {
    const poder = partida?.poder || null;
    const yo = partida?.jugadores.find((j) => j.userId === miId);
    const segundos = useSegundos(poder?.hasta, desfase);
    const anterior = useRef(null);

    // Suena cuando aparece un poder nuevo.
    useEffect(() => {
        if (poder?.estado === "flotando" && anterior.current !== poder.id) sonar("poder");
        anterior.current = poder?.id ?? null;
    }, [poder?.estado, poder?.id]);

    if (!poder || partida.fase !== "jugando") return null;

    if (poder.estado === "flotando") {
        const puedo = yo && !yo.eliminado;
        return (
            <button
                type="button"
                className="pd-flotante"
                onClick={() => puedo && socket.emit("siglo:poderAgarrar")}
                disabled={!puedo}
                aria-label={`Poder: el primero que lo toque le pone un número a otro jugador. Quedan ${segundos} segundos`}
                title="¡Tócalo primero!"
            >
                <span className="pd-icono" aria-hidden="true">🔄</span>
                <span className="pd-cuenta">{segundos}</span>
            </button>
        );
    }

    const duenio = partida.jugadores.find((j) => j.userId === poder.duenio);
    if (poder.duenio !== miId) {
        return (
            <p className="pd-aviso" role="status">
                {`🔄 ${duenio?.nombre || "Alguien"} está usando el poder… ${segundos} s`}
            </p>
        );
    }

    return <VentanaPoder partida={partida} miId={miId} segundos={segundos} />;
}

function siguienteEspacio(j, ronda) {
    for (let k = ronda; k < j.espacios.length; k += 1) if (j.espacios[k] === null) return k;
    return -1;
}

function VentanaPoder({ partida, miId, segundos }) {
    const objetivos = partida.jugadores.filter((j) => j.userId !== miId && !j.eliminado && siguienteEspacio(j, partida.ronda) !== -1);
    const [objetivo, setObjetivo] = useState(objetivos.length === 1 ? objetivos[0].userId : null);
    const [numero, setNumero] = useState(null);
    const [enviando, setEnviando] = useState(false);

    // Si el servidor no aceptó (por ejemplo, el otro estaba volviendo a tirar), se puede intentar otra vez.
    useEffect(() => {
        const alError = () => setEnviando(false);
        socket.on("siglo:error", alError);
        return () => socket.off("siglo:error", alError);
    }, []);

    const elegido = objetivos.find((j) => j.userId === objetivo);
    const usar = (opcion) => {
        setEnviando(true);
        socket.emit("siglo:poderUsar", { objetivo, opcion, numero });
    };

    return (
        <div className="pd-fondo">
            <section className="pd-ventana" role="dialog" aria-modal="true" aria-labelledby="pd-titulo">
                <header>
                    <h2 id="pd-titulo">🔄 ¡Tienes el poder!</h2>
                    <span className={`pd-reloj ${segundos <= 3 ? "pd-reloj-urgente" : ""}`}>{`${segundos} s`}</span>
                </header>

                <p className="pd-paso">1. ¿A quién?</p>
                <div className="pd-jugadores" role="radiogroup" aria-label="Jugador">
                    {objetivos.map((j) => {
                        const k = siguienteEspacio(j, partida.ronda);
                        return (
                            <button
                                key={j.userId}
                                type="button"
                                role="radio"
                                aria-checked={objetivo === j.userId}
                                className={`pd-jugador ${objetivo === j.userId ? "pd-elegido" : ""}`}
                                onClick={() => setObjetivo(j.userId)}
                            >
                                <span className="pd-foto">
                                    <AssetImage src={j.avatar} type="player" alt="" />
                                </span>
                                <span className="pd-datos">
                                    <strong>{j.nombre}</strong>
                                    <small>{`Tiene ${j.total} · espacio ${k + 1}`}</small>
                                </span>
                            </button>
                        );
                    })}
                </div>

                <p className="pd-paso">2. ¿Qué número?</p>
                <div className="pd-numeros" role="radiogroup" aria-label="Número del 0 al 6">
                    {(partida.numerosJoker || [0, 1, 2, 3, 4, 5, 6]).map((n) => (
                        <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={numero === n}
                            className={`pd-numero ${numero === n ? "pd-elegido" : ""}`}
                            onClick={() => setNumero(n)}
                        >
                            {n}
                        </button>
                    ))}
                </div>

                <p className="pd-paso">3. ¿Unidad o decena?</p>
                <div className="pd-opciones">
                    {[
                        { opcion: "unidad", valor: numero },
                        { opcion: "decena", valor: numero === null ? null : numero * 10 },
                    ].map(({ opcion, valor }) => {
                        const total = elegido && valor !== null ? elegido.total + valor : null;
                        const sePasa = total !== null && total > partida.meta;
                        return (
                            <button
                                key={opcion}
                                type="button"
                                className={`pd-opcion ${sePasa ? "pd-opcion-pasa" : ""}`}
                                disabled={!elegido || numero === null || enviando}
                                onClick={() => usar(opcion)}
                            >
                                <strong>{valor === null ? (opcion === "unidad" ? "N" : "N0") : valor}</strong>
                                <small>
                                    {total === null
                                        ? opcion === "unidad" ? "Unidad" : "Decena"
                                        : sePasa
                                            ? `¡Queda en ${total} y se pasa!`
                                            : `${elegido.nombre} queda en ${total}`}
                                </small>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
