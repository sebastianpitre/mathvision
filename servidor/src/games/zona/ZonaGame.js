/* =========================================================
   ZONAGAMIF
   ---------------------------------------------------------
   Carrera por turnos de 2 a 6 jugadores, con 2 fichas cada
   uno, en una pista de 15 filas × 6 carriles. Se avanza de la
   fila 0 hasta la META (fila 14).

   DADO: cada cara mueve 1 casilla en su dirección.
       1 ↘ (avanza y carril +1)   2 ↓ avanza
       3 → carril +1              4 ← carril −1
       5 ↑ retrocede              6 ↙ (avanza y carril −1)
   El jugador ve a dónde llegaría cada ficha y elige cuál mover.
   Si una ficha se saldría por un lado (pared), no puede usar ese
   número… salvo que tenga el PODER de atravesar paredes: pasa
   del carril 6 al 1 (o del 1 al 6) y gasta una carga.

   CASILLAS (al azar en cada partida, filas 1 a 13):
     ❓ pregunta: acierta → avanza 1 a 3 filas o gana el poder
        de atravesar paredes (1 o 2 usos). Falla o se acaba el
        tiempo → retrocede 1 a 3 filas (y ve la explicación).
     Trampas: flecha + número, mueven esa cantidad en esa
        dirección (casi todas hacia atrás; algunas ayudan).

   CAER SOBRE OTRO JUGADOR: te quedas tú y sus fichas se van a
   la casilla de donde venías.

   ZONA: las 6 filas desde la ficha más adelantada hacia atrás.
   Las fichas fuera de la zona no se mueven; si las dos están
   fuera, el jugador pierde el turno (hasta que la zona vuelva).

   GANA: el primero que llega a la meta, o el único que queda
   con fichas dentro de la zona.
========================================================= */

export const FILAS = 15;
export const CARRILES = 6;
export const META = FILAS - 1;
export const ALTO_ZONA = 6;
export const SEGUNDOS_TURNO = 20;
export const SEGUNDOS_PREGUNTA = 20;
const PAUSA_MS = 900; // para que se vea el movimiento antes del siguiente turno
const MAX_PODER = 3;
const GRACIA_MS = 800;

// Cara del dado → [filas, carriles]
export const CARAS = {
    1: [1, 1],
    2: [1, 0],
    3: [0, 1],
    4: [0, -1],
    5: [-1, 0],
    6: [1, -1],
};

// Trampas: dirección [filas, carriles] y cuántas casillas.
const TRAMPAS = [
    { d: [-1, 0], peso: 4 },
    { d: [-1, 1], peso: 2 },
    { d: [-1, -1], peso: 2 },
    { d: [1, 0], peso: 1 }, // ayudan, para que valga la pena arriesgar
    { d: [1, 1], peso: 1 },
    { d: [1, -1], peso: 1 },
];

export const COLORES = [
    { id: "rojo", nombre: "Rojo", hex: "#ef4444" },
    { id: "azul", nombre: "Azul", hex: "#3b82f6" },
    { id: "verde", nombre: "Verde", hex: "#22c55e" },
    { id: "naranja", nombre: "Naranja", hex: "#f59e0b" },
    { id: "morado", nombre: "Morado", hex: "#a855f7" },
    { id: "rosado", nombre: "Rosado", hex: "#ec4899" },
];

const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function mezclar(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

function elegirPeso(lista) {
    const total = lista.reduce((n, x) => n + x.peso, 0);
    let r = Math.random() * total;
    for (const x of lista) if ((r -= x.peso) < 0) return x;
    return lista[0];
}

/* Tablero al azar: ~25 % preguntas y ~15 % trampas (filas 1 a 13). */
export function armarTablero() {
    const casillas = Array.from({ length: FILAS }, () => Array(CARRILES).fill(null));
    for (let f = 1; f < META; f++) {
        for (let c = 0; c < CARRILES; c++) {
            const r = Math.random();
            if (r < 0.25) casillas[f][c] = { tipo: "pregunta" };
            else if (r < 0.4) {
                const t = elegirPeso(TRAMPAS);
                casillas[f][c] = { tipo: "trampa", d: t.d, n: entre(1, 2) };
            }
        }
    }
    return casillas;
}

export class ZonaGame {
    /*
     * jugadores: [{ userId, nombre, avatar, marco, verificado }]
     * preguntas: [{ id, texto, opciones, correcta, explicacion }]
     * onCambio(estado) · onFin(resultado, partida)
     * onPregunta(userId, pregunta) · onResultado(userId, resultado)  ← privados
     */
    constructor({ jugadores, preguntas, tema = null, tablero = null, onCambio, onFin, onPregunta, onResultado }) {
        this.tipo = "zona";
        this.onCambio = onCambio || (() => {});
        this.onFin = onFin || (() => {});
        this.onPregunta = onPregunta || (() => {});
        this.onResultado = onResultado || (() => {});
        this.tema = tema;

        this.jugadores = jugadores.slice(0, COLORES.length).map((j, i) => ({
            userId: String(j.userId),
            nombre: j.nombre,
            avatar: j.avatar || null,
            marco: j.marco || null,
            verificado: Boolean(j.verificado),
            color: i,
            // Las dos fichas empiezan en la fila 0, repartidas en los carriles.
            fichas: [0, 1].map((k) => ({ fila: 0, carril: (i * 2 + k) % CARRILES })),
            poder: 0, // usos para atravesar paredes
            aciertos: 0,
            errores: 0,
            salio: false,
            vistas: new Set(),
        }));

        this.casillas = tablero || armarTablero();
        this.mazo = mezclar(preguntas);
        this.posMazo = 0;

        this.orden = mezclar(this.jugadores.map((_, i) => i));
        this.posTurno = -1;
        this.turno = null;
        this.dado = null;
        this.opciones = null; // [{ ficha, fila, carril, atraviesa }] o null por ficha
        this.pregunta = null; // { userId, ficha, pregunta, orden, correcta, hasta, timer }
        this.finEn = null;

        this.fase = "jugando"; // jugando | terminada
        this.status = "playing";
        this.eventos = [];
        this.ultimo = null; // último movimiento, para animar
        this.resultado = null;
        this.timer = null;
    }

    /* ---------------- Utilidades ---------------- */

    jugador(userId) {
        return this.jugadores.find((j) => j.userId === String(userId)) || null;
    }

    activos() {
        return this.jugadores.filter((j) => !j.salio);
    }

    lider() {
        let max = 0;
        for (const j of this.activos()) for (const f of j.fichas) max = Math.max(max, f.fila);
        return max;
    }

    zona() {
        const hasta = this.lider();
        return { desde: Math.max(0, hasta - (ALTO_ZONA - 1)), hasta };
    }

    enZona(ficha) {
        return ficha.fila >= this.zona().desde;
    }

    evento(texto, tipo = "info", extra = {}) {
        this.eventos.push({ texto, tipo, en: Date.now(), ...extra });
        if (this.eventos.length > 10) this.eventos.shift();
    }

    avisar() {
        try {
            this.onCambio(this.toJSON());
        } catch (error) {
            console.error("❌ ZonaGamif (aviso):", error);
        }
    }

    programar(ms, accion) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            try {
                accion();
            } catch (error) {
                console.error("❌ ZonaGamif (temporizador):", error);
            }
        }, ms);
    }

    destruir() {
        clearTimeout(this.timer);
        clearTimeout(this.pregunta?.timer);
        this.timer = null;
    }

    clearTurnTimer() {
        this.destruir();
    }

    sacarPregunta(jugador) {
        const total = this.mazo.length;
        if (!total) return null;
        if (jugador.vistas.size >= total) jugador.vistas.clear();
        for (let k = 0; k < total; k++) {
            const p = this.mazo[(this.posMazo + k) % total];
            if (!jugador.vistas.has(p.id)) {
                this.posMazo = (this.posMazo + k + 1) % total;
                jugador.vistas.add(p.id);
                return p;
            }
        }
        return this.mazo[0];
    }

    /* ---------------- Turnos ---------------- */

    iniciar() {
        this.evento("¡A correr! Llega primero a la meta sin quedarte fuera de la zona.");
        this.siguienteTurno();
    }

    siguienteTurno() {
        if (this.fase !== "jugando") return;
        if (this.revisarGanador()) return;

        // Busca al siguiente que tenga alguna ficha en la zona (los demás pierden el turno).
        for (let k = 0; k < this.orden.length; k++) {
            this.posTurno = (this.posTurno + 1) % this.orden.length;
            const j = this.jugadores[this.orden[this.posTurno]];
            if (j.salio) continue;
            if (!j.fichas.some((f) => this.enZona(f))) {
                this.evento(`${j.nombre} está fuera de la zona: pierde el turno.`, "zona", { quien: j.userId });
                continue;
            }
            this.turno = j.userId;
            this.dado = null;
            this.opciones = null;
            this.finEn = Date.now() + SEGUNDOS_TURNO * 1000;
            this.programar(SEGUNDOS_TURNO * 1000 + GRACIA_MS, () => this.turnoAutomatico());
            this.avisar();
            return;
        }
        // Nadie puede mover (no debería pasar: el líder siempre está en la zona).
        this.revisarGanador(true);
    }

    /* A dónde llegaría cada ficha con esta cara del dado. */
    calcularOpciones(j, cara) {
        const [df, dc] = CARAS[cara];
        return j.fichas.map((f, i) => {
            if (!this.enZona(f) || f.fila === META) return null;
            const fila = f.fila + df;
            let carril = f.carril + dc;
            let atraviesa = false;
            if (fila < 0) return null;
            if (carril < 0 || carril >= CARRILES) {
                if (j.poder <= 0) return null;
                carril = (carril + CARRILES) % CARRILES;
                atraviesa = true;
            }
            const otra = j.fichas[1 - i];
            if (otra.fila === Math.min(fila, META) && otra.carril === carril && fila < META) return null; // no sobre su otra ficha
            return { ficha: i, fila: Math.min(fila, META), carril, atraviesa };
        });
    }

    tirar(userId) {
        if (this.fase !== "jugando") return { success: false, message: "La partida terminó." };
        if (this.turno !== String(userId)) return { success: false, message: "No es tu turno." };
        if (this.dado !== null) return { success: false, message: "Ya tiraste. Elige qué ficha mover." };

        const j = this.jugador(userId);
        this.dado = entre(1, 6);
        this.opciones = this.calcularOpciones(j, this.dado);
        this.evento(`${j.nombre} sacó ${this.dado}.`, "dado", { quien: j.userId });

        if (this.opciones.every((o) => o === null)) {
            this.evento(`${j.nombre} no puede mover ninguna ficha con el ${this.dado}.`, "nada", { quien: j.userId });
            this.avisar();
            this.programar(PAUSA_MS * 1.5, () => this.siguienteTurno());
            return { success: true };
        }
        this.avisar();
        return { success: true };
    }

    mover(userId, fichaIndice) {
        if (this.fase !== "jugando") return { success: false, message: "La partida terminó." };
        if (this.turno !== String(userId)) return { success: false, message: "No es tu turno." };
        if (this.dado === null) return { success: false, message: "Primero tira el dado." };
        if (this.pregunta) return { success: false, message: "Responde la pregunta." };
        const op = this.opciones?.[Number(fichaIndice)];
        if (!op) return { success: false, message: "Esa ficha no se puede mover con este número." };

        const j = this.jugador(userId);
        clearTimeout(this.timer);
        const ficha = j.fichas[op.ficha];
        if (op.atraviesa) {
            j.poder -= 1;
            this.evento(`${j.nombre} atravesó la pared 🟩.`, "poder", { quien: j.userId });
        }
        this.llevar(j, op.ficha, op.fila, op.carril, "dado");
        this.opciones = null;

        if (this.revisarGanador()) return { success: true };

        // ¿Qué hay en la casilla?
        const casilla = this.casillas[ficha.fila][ficha.carril];
        if (casilla?.tipo === "trampa") {
            this.aplicarTrampa(j, op.ficha, casilla);
            if (this.revisarGanador()) return { success: true };
        } else if (casilla?.tipo === "pregunta") {
            if (this.abrirPregunta(j, op.ficha)) {
                this.avisar();
                return { success: true };
            }
        }

        this.avisar();
        this.programar(PAUSA_MS, () => this.siguienteTurno());
        return { success: true };
    }

    /* Mueve la ficha; si cae sobre fichas de otros, ellas se van a donde estaba. */
    llevar(j, i, fila, carril, motivo) {
        const ficha = j.fichas[i];
        const desde = { fila: ficha.fila, carril: ficha.carril };
        ficha.fila = Math.max(0, Math.min(META, fila));
        ficha.carril = carril;

        const cambiados = [];
        if (ficha.fila !== desde.fila || ficha.carril !== desde.carril) {
            for (const otro of this.activos()) {
                if (otro === j) continue;
                otro.fichas.forEach((f, k) => {
                    if (f.fila === ficha.fila && f.carril === ficha.carril && ficha.fila !== 0) {
                        f.fila = desde.fila;
                        f.carril = desde.carril;
                        cambiados.push({ userId: otro.userId, ficha: k });
                    }
                });
            }
        }
        this.ultimo = { userId: j.userId, ficha: i, desde, hasta: { fila: ficha.fila, carril: ficha.carril }, motivo, en: Date.now(), cambiados };
        if (cambiados.length) {
            const nombres = [...new Set(cambiados.map((c) => this.jugador(c.userId).nombre))];
            this.evento(`${j.nombre} cayó sobre ${nombres.join(" y ")}: cambian de lugar.`, "cambio", { quien: j.userId });
        }
    }

    aplicarTrampa(j, i, trampa) {
        const f = j.fichas[i];
        const fila = f.fila + trampa.d[0] * trampa.n;
        const carril = Math.max(0, Math.min(CARRILES - 1, f.carril + trampa.d[1] * trampa.n));
        const buena = trampa.d[0] > 0;
        this.llevar(j, i, fila, carril, "trampa");
        this.evento(
            buena ? `${j.nombre} cayó en un atajo: avanza ${trampa.n}.` : `${j.nombre} cayó en una trampa: retrocede ${trampa.n}.`,
            buena ? "atajo" : "trampa",
            { quien: j.userId }
        );
    }

    /* ---------------- Preguntas ---------------- */

    abrirPregunta(j, i) {
        const base = this.sacarPregunta(j);
        if (!base) return false;
        const orden = mezclar(base.opciones.map((_, k) => k));
        const hasta = Date.now() + SEGUNDOS_PREGUNTA * 1000;
        this.pregunta = {
            userId: j.userId,
            ficha: i,
            pregunta: base,
            orden,
            correcta: orden.indexOf(base.correcta),
            hasta,
            timer: setTimeout(() => {
                try {
                    this.resolverPregunta(null, true);
                } catch (error) {
                    console.error("❌ ZonaGamif (pregunta):", error);
                }
            }, SEGUNDOS_PREGUNTA * 1000 + GRACIA_MS),
        };
        this.finEn = hasta;
        this.evento(`${j.nombre} cayó en ❓ y está respondiendo…`, "pregunta", { quien: j.userId });
        this.onPregunta(j.userId, this.preguntaAbierta(j.userId));
        return true;
    }

    preguntaAbierta(userId) {
        const p = this.pregunta;
        if (!p || p.userId !== String(userId)) return null;
        return {
            texto: p.pregunta.texto,
            opciones: p.orden.map((k) => p.pregunta.opciones[k]),
            hasta: p.hasta,
            segundos: SEGUNDOS_PREGUNTA,
        };
    }

    responder(userId, opcion) {
        if (!this.pregunta || this.pregunta.userId !== String(userId)) return { success: false, message: "No tienes una pregunta abierta." };
        const n = Number(opcion);
        if (!Number.isInteger(n) || n < 0 || n >= this.pregunta.orden.length) return { success: false, message: "Respuesta no válida." };
        this.resolverPregunta(n, false);
        return { success: true };
    }

    resolverPregunta(opcion, agotado) {
        const p = this.pregunta;
        if (!p || this.fase !== "jugando") return;
        clearTimeout(p.timer);
        this.pregunta = null;

        const j = this.jugador(p.userId);
        const acerto = !agotado && opcion === p.correcta;
        const resultado = {
            acerto,
            agotado,
            elegida: opcion,
            correcta: p.correcta,
            textoCorrecto: p.pregunta.opciones[p.pregunta.correcta],
            explicacion: p.pregunta.explicacion,
            premio: null,
        };

        if (j && !j.salio) {
            const f = j.fichas[p.ficha];
            if (acerto) {
                j.aciertos += 1;
                if (Math.random() < 0.6 || j.poder >= MAX_PODER) {
                    const n = entre(1, 3);
                    this.llevar(j, p.ficha, f.fila + n, f.carril, "pregunta");
                    resultado.premio = { tipo: "avanzar", n };
                    this.evento(`${j.nombre} acertó: avanza ${n}.`, "acierto", { quien: j.userId });
                } else {
                    const n = Math.min(MAX_PODER - j.poder, entre(1, 2));
                    j.poder += n;
                    resultado.premio = { tipo: "poder", n };
                    this.evento(`${j.nombre} acertó: puede atravesar paredes ${n === 1 ? "1 vez" : `${n} veces`} 🟩.`, "poder", { quien: j.userId });
                }
            } else {
                j.errores += 1;
                const n = entre(1, 2);
                this.llevar(j, p.ficha, f.fila - n, f.carril, "pregunta");
                resultado.retrocede = n;
                this.evento(`${j.nombre} ${agotado ? "no respondió" : "falló"}: retrocede ${n}.`, "fallo", { quien: j.userId });
            }
            this.onResultado(j.userId, resultado);
        }

        if (this.revisarGanador()) return;
        this.avisar();
        this.programar(PAUSA_MS, () => this.siguienteTurno());
    }

    /* ---------------- Tiempo agotado ---------------- */

    turnoAutomatico() {
        if (this.fase !== "jugando" || !this.turno || this.pregunta) return;
        const j = this.jugador(this.turno);
        this.evento(`Se acabó el tiempo de ${j.nombre}.`, "tiempo", { quien: j.userId });
        if (this.dado === null) {
            this.tirar(j.userId);
            if (this.dado === null || this.opciones?.every((o) => o === null)) return;
        }
        // Mueve la ficha que más avanza (sin usar el poder si puede evitarlo).
        const validas = this.opciones.filter(Boolean).sort((a, b) => b.fila - a.fila || a.atraviesa - b.atraviesa);
        if (validas.length) this.mover(j.userId, validas[0].ficha);
    }

    /* ---------------- Abandono ---------------- */

    abandonar(userId) {
        const j = this.jugador(userId);
        if (!j || j.salio || this.fase === "terminada") return;
        j.salio = true;
        this.evento(`${j.nombre} salió.`, "salio", { quien: j.userId });

        if (this.pregunta?.userId === j.userId) {
            clearTimeout(this.pregunta.timer);
            this.pregunta = null;
        }
        if (this.revisarGanador()) return;
        if (this.turno === j.userId) {
            clearTimeout(this.timer);
            this.siguienteTurno();
        } else {
            this.avisar();
        }
    }

    /* ---------------- Fin ---------------- */

    revisarGanador(forzar = false) {
        if (this.fase !== "jugando") return true;
        const activos = this.activos();

        const enMeta = activos.find((j) => j.fichas.some((f) => f.fila === META));
        if (enMeta) {
            this.evento(`¡${enMeta.nombre} llegó a la meta! 🏁`, "meta", { quien: enMeta.userId });
            this.terminar({ tipo: "meta", ganadores: [enMeta.userId] });
            return true;
        }
        const conZona = activos.filter((j) => j.fichas.some((f) => this.enZona(f)));
        if (activos.length <= 1 || conZona.length === 1 || forzar) {
            const ganador = conZona[0] || activos[0];
            if (ganador) this.evento(`¡${ganador.nombre} quedó solo en la zona!`, "meta", { quien: ganador.userId });
            this.terminar({ tipo: activos.length <= 1 ? "ultimo" : "zona", ganadores: ganador ? [ganador.userId] : [] });
            return true;
        }
        return false;
    }

    terminar({ tipo, ganadores }) {
        this.destruir();
        this.pregunta = null;
        this.fase = "terminada";
        this.status = "finished";
        this.turno = null;
        this.finEn = null;
        this.opciones = null;
        this.resultado = { tipo, ganadores };
        this.avisar();
        try {
            this.onFin(this.resultado, this);
        } catch (error) {
            console.error("❌ ZonaGamif (fin):", error);
        }
    }

    resultadosPremios() {
        const ganadores = this.resultado?.ganadores || [];
        return this.jugadores
            .filter((j) => !j.salio)
            .map((j) => ({
                userId: j.userId,
                resultado: ganadores.includes(j.userId) ? "ganada" : "perdida",
                aciertos: j.aciertos,
                errores: j.errores,
            }));
    }

    /* ---------------- Estado para todos ---------------- */

    toJSON() {
        const zona = this.zona();
        return {
            tipo: "zona",
            fase: this.fase,
            ahora: Date.now(),
            finEn: this.finEn,
            filas: FILAS,
            carriles: CARRILES,
            meta: META,
            altoZona: ALTO_ZONA,
            zona,
            tema: this.tema,
            casillas: this.casillas,
            turno: this.turno,
            dado: this.dado,
            opciones: this.opciones,
            respondiendo: this.pregunta ? this.pregunta.userId : null,
            ultimo: this.ultimo,
            jugadores: this.orden.map((i) => {
                const j = this.jugadores[i];
                return {
                    userId: j.userId,
                    nombre: j.nombre,
                    avatar: j.avatar,
                    marco: j.marco,
                    verificado: j.verificado,
                    color: COLORES[j.color],
                    fichas: j.fichas.map((f) => ({ ...f, enZona: f.fila >= zona.desde })),
                    poder: j.poder,
                    aciertos: j.aciertos,
                    errores: j.errores,
                    salio: j.salio,
                };
            }),
            eventos: this.eventos,
            resultado: this.resultado,
        };
    }
}
