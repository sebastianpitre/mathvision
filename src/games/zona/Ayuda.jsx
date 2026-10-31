import { useEffect, useState } from "react";
import { LuLightbulb, LuX } from "react-icons/lu";

/* =========================================================
   ZONAGAMIF · INSTRUCCIONES Y CONSEJOS
   · Instrucciones: ventana con las reglas (botón "Cómo jugar";
     sale sola la primera vez).
   · Consejos: en el espacio libre de la izquierda, un comentario
     sobre lo que te pasa ahora y un tip que va cambiando.
========================================================= */

const CLAVE_VISTO = "ludogamif:zona-instrucciones";

const TIPS = [
    "Tienes 2 fichas: antes de mover, mira a dónde llega cada una (círculo punteado).",
    "Las casillas rojas con flecha son trampas: te devuelven. Las azules te ayudan.",
    "Las ❓ casi siempre convienen: si aciertas avanzas, ganas paredes 🟩 o un empujón 💥.",
    "No dejes una ficha muy atrás: si sale de la zona verde, no la podrás mover.",
    "Si caes donde está un rival, te quedas tú y él se va a donde venías.",
    "Con 🟩 puedes salir por un lado de la pista y entrar por el otro.",
    "El 5 (↑) retrocede: a veces es mejor usarlo con la ficha de atrás.",
    "Si te quedas solo dentro de la zona, ganas aunque no llegues a la meta.",
    "Lee la explicación del profesor: la misma pregunta puede volver a salir.",
];

const FLECHAS = [
    ["1", "↘"],
    ["2", "↓"],
    ["3", "→"],
    ["4", "←"],
    ["5", "↑"],
    ["6", "↙"],
];

export function Instrucciones({ alCerrar }) {
    useEffect(() => {
        const tecla = (e) => e.key === "Escape" && alCerrar();
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [alCerrar]);

    return (
        <div className="zn-capa" onClick={alCerrar}>
            <section className="zn-ayuda" role="dialog" aria-modal="true" aria-labelledby="zn-ayuda-t" onClick={(e) => e.stopPropagation()}>
                <header>
                    <h2 id="zn-ayuda-t">
                        Cómo jugar <span>ZONA<b>GAMIF</b></span>
                    </h2>
                    <button type="button" className="zn-ayuda-cerrar" onClick={alCerrar} aria-label="Cerrar">
                        <LuX aria-hidden="true" />
                    </button>
                </header>

                <div className="zn-ayuda-cuerpo">
                    <article>
                        <h3>🏁 La meta</h3>
                        <p>Baja con tus fichas hasta la meta (abajo). Gana el primero que llegue… o el que quede solo dentro de la zona.</p>
                    </article>
                    <article>
                        <h3>🎲 El dado</h3>
                        <p>Cada número mueve 1 casilla en su dirección. Tienes 2 fichas: tú eliges cuál mover.</p>
                        <ul className="zn-ayuda-dado">
                            {FLECHAS.map(([n, f]) => (
                                <li key={n}>
                                    <b>{n}</b>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </article>
                    <article>
                        <h3>🟩 La zona</h3>
                        <p>Son las 6 filas desde la ficha más adelantada hacia atrás (marco verde). Las fichas que quedan atrás no se mueven; si las dos están fuera, pierdes el turno.</p>
                    </article>
                    <article>
                        <h3>❓ Preguntas</h3>
                        <p>Acierta y avanza 1 a 3, gana el poder de <b>paredes 🟩</b> (sales por un lado y entras por el otro) o un <b>empujón 💥</b> (haces retroceder 3 a un rival). Si fallas, retrocedes y el profesor te explica.</p>
                    </article>
                    <article>
                        <h3>⚠️ Trampas y atajos</h3>
                        <p>Las casillas <span className="zn-ayuda-roja">rojas</span> te mueven hacia atrás según su flecha y número; las <span className="zn-ayuda-azul">azules</span> te adelantan.</p>
                    </article>
                    <article>
                        <h3>🔄 Caer sobre otro</h3>
                        <p>Si llegas donde está un rival, te quedas tú y su ficha se va a la casilla de donde venías.</p>
                    </article>
                </div>

                <button type="button" className="ffp-btn zn-ayuda-listo" onClick={alCerrar}>
                    ¡A jugar!
                </button>
            </section>
        </div>
    );
}

/* La primera vez que se juega, las instrucciones salen solas. */
export function useInstrucciones() {
    const [abierta, setAbierta] = useState(() => {
        try {
            return !localStorage.getItem(CLAVE_VISTO);
        } catch {
            return false;
        }
    });
    const cerrar = () => {
        setAbierta(false);
        try {
            localStorage.setItem(CLAVE_VISTO, "1");
        } catch {
            // sin almacenamiento: puede volver a salir
        }
    };
    return { abierta, abrir: () => setAbierta(true), cerrar };
}

/* Comentario según cómo va tu partida (el más importante primero). */
function comentario(partida, yo, zona) {
    if (!partida || !yo || yo.salio || partida.fase !== "jugando") return null;
    const fuera = yo.fichas.map((f, i) => ({ ...f, i })).filter((f) => f.fila < zona.desde);
    if (fuera.length === 2) return { tono: "mal", texto: "Tus dos fichas quedaron fuera de la zona: esperas a que alguien se atrase." };
    if (fuera.length === 1) return { tono: "mal", texto: `Tu ficha ${fuera[0].i + 1} quedó fuera de la zona. Juega con la otra.` };
    const borde = yo.fichas.findIndex((f) => f.fila === zona.desde && zona.hasta - zona.desde >= 5);
    if (borde >= 0 && !yo.fichas.some((f, i) => i !== borde && f.fila === zona.hasta)) {
        return { tono: "aviso", texto: `Tu ficha ${borde + 1} está en el borde de la zona: si nadie retrocede, se queda atrás.` };
    }
    for (const j of partida.jugadores) {
        if (j.userId === yo.userId || j.salio) continue;
        const cerca = Math.max(...j.fichas.map((f) => f.fila));
        if (partida.meta - cerca <= 3) return { tono: "aviso", texto: `¡Cuidado! ${j.nombre} está a ${partida.meta - cerca} fila${partida.meta - cerca === 1 ? "" : "s"} de la meta.` };
    }
    if (yo.poder > 0) return { tono: "bien", texto: `Tienes 🟩×${yo.poder}: puedes salir por un lado y entrar por el otro.` };
    const trampa = yo.fichas.findIndex((f) => {
        const c = partida.casillas[f.fila + 1]?.[f.carril];
        return c?.tipo === "trampa" && c.d[0] < 0;
    });
    if (trampa >= 0) return { tono: "aviso", texto: `Justo debajo de tu ficha ${trampa + 1} hay una trampa: si sacas 2, piénsalo.` };
    return null;
}

export function Consejos({ partida, yo, zona }) {
    const [n, setN] = useState(() => Math.floor(Math.random() * TIPS.length));
    useEffect(() => {
        const t = setInterval(() => setN((x) => (x + 1) % TIPS.length), 8000);
        return () => clearInterval(t);
    }, []);
    const c = comentario(partida, yo, zona);

    return (
        <section className="zn-consejos" aria-label="Consejos" aria-live="polite">
            {c && <p className={`zn-comentario zn-comentario-${c.tono}`}>{c.texto}</p>}
            <p className="zn-tip" key={n}>
                <LuLightbulb aria-hidden="true" />
                <span>{TIPS[n]}</span>
            </p>
        </section>
    );
}
