/* =========================================================
   SIGLOGAMIF
   ---------------------------------------------------------
   De 2 a 4 jugadores. Cada uno tiene 5 espacios.

   1. Votación: al empezar, todos votan el tiempo de turno
      (15, 20, 30 o 45 s). Gana el más votado; si hay empate,
      se elige al azar entre los empatados. Sin votos: 20 s.
   2. Rondas 1 a 5: por turnos, cada jugador tira el dado y
      elige poner el número como unidad (4) o decena (40) en
      el espacio de esa ronda.
      · Si su suma pasa de 100 → eliminado en ese momento.
      · Si llena los 5 espacios con EXACTAMENTE 100 → ¡SIGLO!
        y gana enseguida.
      · Si solo queda un jugador en pie → gana.
   3. Al final, gana quien quede más cerca de 100 sin
      pasarse. Si hay empate, desempate: cada empatado tira el
      dado una vez y gana el número más alto (se repite si
      vuelven a empatar).

   Si se acaba el tiempo del turno, el servidor tira el dado
   por el jugador y elige la opción más prudente. Todo lo
   decide el servidor: el navegador solo envía "tirar" y
   "elegir".
========================================================= */

export const OPCIONES_TIEMPO = [15, 20, 30, 45];
const TIEMPO_POR_DEFECTO = 20;
const SEGUNDOS_VOTACION = 15;
const ESPACIOS = 5;
const META = 100;
const PAUSA_MOSTRAR_DADO_MS = 900;

function dado() {
    return 1 + Math.floor(Math.random() * 6);
}

function azar(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

export class SigloGame {
    /*
     * jugadores: [{ userId, nombre }]
     * onCambio(estado)  → se llama en cada cambio para avisar a la sala
     * onFin(resultado)  → al terminar (para premios y volver a la sala)
     */
    constructor({ jugadores, onCambio, onFin }) {
        this.tipo = "siglo";
        this.onCambio = onCambio || (() => {});
        this.onFin = onFin || (() => {});

        this.jugadores = jugadores.map((j) => ({
            userId: String(j.userId),
            nombre: j.nombre,
            espacios: Array(ESPACIOS).fill(null),
            total: 0,
            eliminado: false,
            motivo: null, // "se_paso" | "abandono"
            tiroDesempate: null,
        }));

        // El orden de turno se sortea al empezar.
        this.orden = this.jugadores.map((_, i) => i).sort(() => Math.random() - 0.5);

        this.fase = "votacion"; // votacion | jugando | desempate | terminada
        this.status = "playing";
        this.votos = new Map();
        this.segundosTurno = TIEMPO_POR_DEFECTO;

        this.ronda = 0;
        this.turno = null; // userId
        this.dado = null;
        this.finEn = null; // fin del turno o de la votación (ms)

        this.empatados = [];
        this.eventos = [];
        this.resultado = null;

        this.timer = null;
        this.timerPausa = null;
    }

    /* ---------------------------------------------------------
       UTILIDADES
    --------------------------------------------------------- */

    jugador(userId) {
        return this.jugadores.find((j) => j.userId === String(userId)) || null;
    }

    vivos() {
        return this.jugadores.filter((j) => !j.eliminado);
    }

    evento(texto, tipo = "info") {
        this.eventos.push({ texto, tipo, en: Date.now() });
        if (this.eventos.length > 12) this.eventos.shift();
    }

    programar(ms, accion) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            try {
                accion();
            } catch (error) {
                console.error("❌ SigloGamif (temporizador):", error);
            }
        }, ms);
    }

    avisar() {
        try {
            this.onCambio(this.toJSON());
        } catch (error) {
            console.error("❌ SigloGamif (aviso):", error);
        }
    }

    destruir() {
        clearTimeout(this.timer);
        clearTimeout(this.timerPausa);
        this.timer = null;
        this.timerPausa = null;
    }

    // El Triqui usa este nombre al limpiar la sala.
    clearTurnTimer() {
        this.destruir();
    }

    /* ---------------------------------------------------------
       1. VOTACIÓN DEL TIEMPO DE TURNO
    --------------------------------------------------------- */

    iniciar() {
        this.fase = "votacion";
        this.finEn = Date.now() + SEGUNDOS_VOTACION * 1000;
        this.evento("¡Empieza SigloGamif! Voten el tiempo de cada turno.");
        this.programar(SEGUNDOS_VOTACION * 1000, () => this.cerrarVotacion());
        this.avisar();
    }

    votar(userId, segundos) {
        if (this.fase !== "votacion") return { success: false, message: "La votación ya terminó." };
        if (!this.jugador(userId)) return { success: false, message: "No juegas en esta partida." };

        const valor = Number(segundos);
        if (!OPCIONES_TIEMPO.includes(valor)) return { success: false, message: "Tiempo no válido." };

        this.votos.set(String(userId), valor);

        // Si ya votaron todos los que siguen conectados, se cierra antes.
        if (this.votos.size >= this.vivos().length) {
            this.cerrarVotacion();
        } else {
            this.avisar();
        }

        return { success: true };
    }

    cerrarVotacion() {
        if (this.fase !== "votacion") return;

        const conteo = new Map();
        for (const v of this.votos.values()) conteo.set(v, (conteo.get(v) || 0) + 1);

        if (conteo.size === 0) {
            this.segundosTurno = TIEMPO_POR_DEFECTO;
            this.evento(`Nadie votó: cada turno tendrá ${this.segundosTurno} segundos.`);
        } else {
            const maximo = Math.max(...conteo.values());
            const ganadores = [...conteo.entries()].filter(([, n]) => n === maximo).map(([v]) => v);
            this.segundosTurno = azar(ganadores);
            this.evento(
                ganadores.length > 1
                    ? `Empate en la votación: el azar eligió ${this.segundosTurno} segundos por turno.`
                    : `Cada turno tendrá ${this.segundosTurno} segundos.`
            );
        }

        this.fase = "jugando";
        this.ronda = 0;
        this.empezarTurno(this.siguienteEnRonda());
    }

    /* ---------------------------------------------------------
       2. TURNOS
    --------------------------------------------------------- */

    /* Siguiente jugador vivo que aún no llena el espacio de la ronda. */
    siguienteEnRonda() {
        for (const i of this.orden) {
            const j = this.jugadores[i];
            if (!j.eliminado && j.espacios[this.ronda] === null) return j;
        }
        return null;
    }

    empezarTurno(jugador) {
        if (!jugador) return this.terminarRonda();

        this.turno = jugador.userId;
        this.dado = null;
        this.finEn = Date.now() + this.segundosTurno * 1000;
        this.programar(this.segundosTurno * 1000, () => this.tiempoAgotado());
        this.avisar();
    }

    tirar(userId) {
        if (this.fase === "desempate") return this.tirarDesempate(userId);
        if (this.fase !== "jugando") return { success: false, message: "Ahora no se puede tirar." };
        if (this.turno !== String(userId)) return { success: false, message: "No es tu turno." };
        if (this.dado !== null) return { success: false, message: "Ya tiraste el dado. Elige dónde ponerlo." };

        this.dado = dado();
        this.evento(`${this.jugador(userId).nombre} sacó un ${this.dado}.`, "dado");
        this.avisar();

        return { success: true, dado: this.dado };
    }

    /* opcion: "unidad" (el número tal cual) o "decena" (número × 10) */
    elegir(userId, opcion) {
        if (this.fase !== "jugando") return { success: false, message: "Ahora no se puede elegir." };
        if (this.turno !== String(userId)) return { success: false, message: "No es tu turno." };
        if (this.dado === null) return { success: false, message: "Primero tira el dado." };
        if (opcion !== "unidad" && opcion !== "decena") return { success: false, message: "Opción no válida." };

        this.colocar(this.jugador(userId), opcion === "decena" ? this.dado * 10 : this.dado);

        return { success: true };
    }

    colocar(jugador, valor) {
        jugador.espacios[this.ronda] = valor;
        jugador.total += valor;

        clearTimeout(this.timer);

        const llenos = jugador.espacios.filter((v) => v !== null).length;

        if (jugador.total > META) {
            jugador.eliminado = true;
            jugador.motivo = "se_paso";
            this.evento(`${jugador.nombre} puso ${valor}, llegó a ${jugador.total} y quedó eliminado.`, "eliminado");
        } else if (llenos === ESPACIOS && jugador.total === META) {
            this.evento(`¡SIGLO! ${jugador.nombre} completó exactamente 100.`, "siglo");
            return this.terminar({ tipo: "siglo", ganadores: [jugador.userId] });
        } else {
            this.evento(`${jugador.nombre} puso ${valor} en el espacio ${this.ronda + 1} (suma ${jugador.total}).`);
        }

        if (this.revisarUltimoEnPie()) return;

        // Pequeña pausa para que todos vean la jugada antes del siguiente turno.
        this.turno = null;
        this.finEn = null;
        this.avisar();

        clearTimeout(this.timerPausa);
        this.timerPausa = setTimeout(() => {
            if (this.fase === "jugando") this.empezarTurno(this.siguienteEnRonda());
        }, PAUSA_MOSTRAR_DADO_MS);
    }

    /* Si se acaba el tiempo: el servidor tira y elige la opción más prudente. */
    tiempoAgotado() {
        if (this.fase !== "jugando" || !this.turno) return;

        const jugador = this.jugador(this.turno);

        if (this.dado === null) {
            this.dado = dado();
            this.evento(`Se acabó el tiempo de ${jugador.nombre}: el juego tiró por él y sacó ${this.dado}.`, "tiempo");
        } else {
            this.evento(`Se acabó el tiempo de ${jugador.nombre}: el juego eligió por él.`, "tiempo");
        }

        this.colocar(jugador, this.opcionPrudente(jugador, this.dado));
    }

    /*
     * La opción que menos riesgo tiene: que no lo pase de 100
     * (contando que cada espacio que falta suma mínimo 1) y que
     * lo deje más cerca del ritmo ideal (20 por espacio).
     */
    opcionPrudente(jugador, numero) {
        const restantes = ESPACIOS - (this.ronda + 1);
        const opciones = [numero, numero * 10];

        const viables = opciones.filter((v) => jugador.total + v + restantes <= META);
        const candidatas = viables.length ? viables : opciones.filter((v) => jugador.total + v <= META);

        if (!candidatas.length) return numero; // Las dos lo pasan: pone la menor.

        const ideal = 20 * (this.ronda + 1);
        return candidatas.sort((a, b) => Math.abs(jugador.total + a - ideal) - Math.abs(jugador.total + b - ideal))[0];
    }

    terminarRonda() {
        if (this.fase !== "jugando") return;

        this.ronda += 1;

        if (this.ronda < ESPACIOS) {
            this.evento(`Ronda ${this.ronda + 1}: espacio ${this.ronda + 1}.`, "ronda");
            return this.empezarTurno(this.siguienteEnRonda());
        }

        // Se llenaron los 5 espacios y nadie hizo SIGLO.
        const vivos = this.vivos();

        if (vivos.length === 0) return this.terminar({ tipo: "nadie", ganadores: [] });

        const mejor = Math.max(...vivos.map((j) => j.total));
        const empatados = vivos.filter((j) => j.total === mejor);

        if (empatados.length === 1) {
            this.evento(`${empatados[0].nombre} quedó más cerca de 100 con ${mejor}.`, "ganador");
            return this.terminar({ tipo: "cercano", ganadores: [empatados[0].userId] });
        }

        this.empezarDesempate(empatados);
    }

    revisarUltimoEnPie() {
        const vivos = this.vivos();

        if (vivos.length === 0) {
            this.terminar({ tipo: "nadie", ganadores: [] });
            return true;
        }

        if (vivos.length === 1 && this.jugadores.length > 1) {
            this.evento(`${vivos[0].nombre} es el último en pie y gana.`, "ganador");
            this.terminar({ tipo: "ultimo", ganadores: [vivos[0].userId] });
            return true;
        }

        return false;
    }

    /* ---------------------------------------------------------
       3. DESEMPATE
    --------------------------------------------------------- */

    empezarDesempate(empatados) {
        this.fase = "desempate";
        this.empatados = empatados.map((j) => j.userId);
        for (const j of this.jugadores) j.tiroDesempate = null;

        const nombres = empatados.map((j) => j.nombre).join(" y ");
        this.evento(`¡Empate con ${empatados[0].total}! Desempate entre ${nombres}: gana el dado más alto.`, "desempate");

        this.siguienteDesempate();
    }

    siguienteDesempate() {
        const pendiente = this.orden
            .map((i) => this.jugadores[i])
            .find((j) => this.empatados.includes(j.userId) && j.tiroDesempate === null);

        if (!pendiente) return this.resolverDesempate();

        this.turno = pendiente.userId;
        this.dado = null;
        this.finEn = Date.now() + this.segundosTurno * 1000;
        this.programar(this.segundosTurno * 1000, () => {
            const j = this.jugador(this.turno);
            this.evento(`Se acabó el tiempo de ${j.nombre}: el juego tiró por él.`, "tiempo");
            this.tirarDesempate(this.turno);
        });
        this.avisar();
    }

    tirarDesempate(userId) {
        if (this.fase !== "desempate") return { success: false, message: "No hay desempate." };
        if (this.turno !== String(userId)) return { success: false, message: "No es tu turno." };

        clearTimeout(this.timer);

        const jugador = this.jugador(userId);
        jugador.tiroDesempate = dado();
        this.dado = jugador.tiroDesempate;
        this.evento(`${jugador.nombre} sacó ${jugador.tiroDesempate} en el desempate.`, "dado");

        this.turno = null;
        this.finEn = null;
        this.avisar();

        clearTimeout(this.timerPausa);
        this.timerPausa = setTimeout(() => {
            if (this.fase === "desempate") this.siguienteDesempate();
        }, PAUSA_MOSTRAR_DADO_MS);

        return { success: true, dado: jugador.tiroDesempate };
    }

    resolverDesempate() {
        const participantes = this.empatados.map((id) => this.jugador(id)).filter((j) => !j.eliminado);

        if (participantes.length === 0) return this.terminar({ tipo: "nadie", ganadores: [] });

        const mejor = Math.max(...participantes.map((j) => j.tiroDesempate));
        const ganadores = participantes.filter((j) => j.tiroDesempate === mejor);

        if (ganadores.length === 1) {
            this.evento(`${ganadores[0].nombre} gana el desempate con un ${mejor}.`, "ganador");
            return this.terminar({ tipo: "desempate", ganadores: [ganadores[0].userId] });
        }

        this.evento("¡Otra vez empate! Se repite el desempate.", "desempate");
        this.empezarDesempate(ganadores);
    }

    /* ---------------------------------------------------------
       ABANDONO (salió de la partida o se desconectó)
    --------------------------------------------------------- */

    abandonar(userId) {
        const jugador = this.jugador(userId);
        if (!jugador || jugador.eliminado || this.fase === "terminada") return;

        jugador.eliminado = true;
        jugador.motivo = "abandono";
        this.votos.delete(jugador.userId);
        this.evento(`${jugador.nombre} salió de la partida.`, "eliminado");

        if (this.revisarUltimoEnPie()) return;

        if (this.fase === "votacion") {
            if (this.votos.size >= this.vivos().length) this.cerrarVotacion();
            else this.avisar();
            return;
        }

        if (this.fase === "desempate") {
            this.empatados = this.empatados.filter((id) => id !== jugador.userId);
            if (this.empatados.length === 1) {
                return this.terminar({ tipo: "desempate", ganadores: [this.empatados[0]] });
            }
            if (this.turno === jugador.userId) this.siguienteDesempate();
            else this.avisar();
            return;
        }

        if (this.turno === jugador.userId) {
            clearTimeout(this.timer);
            this.empezarTurno(this.siguienteEnRonda());
        } else {
            this.avisar();
        }
    }

    /* ---------------------------------------------------------
       FIN
    --------------------------------------------------------- */

    terminar({ tipo, ganadores }) {
        this.destruir();

        this.fase = "terminada";
        this.status = "finished";
        this.turno = null;
        this.finEn = null;
        this.resultado = { tipo, ganadores };

        if (tipo === "nadie") this.evento("Todos se pasaron de 100. ¡Nadie gana esta vez!", "nadie");

        this.avisar();

        try {
            this.onFin(this.resultado, this);
        } catch (error) {
            console.error("❌ SigloGamif (fin):", error);
        }
    }

    /* ---------------------------------------------------------
       ESTADO PARA LOS JUGADORES
    --------------------------------------------------------- */

    toJSON() {
        const conteoVotos = {};
        for (const v of OPCIONES_TIEMPO) conteoVotos[v] = [];
        for (const [userId, v] of this.votos) conteoVotos[v].push(userId);

        return {
            tipo: "siglo",
            fase: this.fase,
            ahora: Date.now(),
            finEn: this.finEn,
            meta: META,
            espacios: ESPACIOS,
            ronda: this.ronda,
            turno: this.turno,
            dado: this.dado,
            segundosTurno: this.segundosTurno,
            opcionesTiempo: OPCIONES_TIEMPO,
            votos: conteoVotos,
            empatados: this.empatados,
            jugadores: this.orden.map((i) => {
                const j = this.jugadores[i];
                return {
                    userId: j.userId,
                    nombre: j.nombre,
                    espacios: j.espacios,
                    total: j.total,
                    eliminado: j.eliminado,
                    motivo: j.motivo,
                    tiroDesempate: j.tiroDesempate,
                };
            }),
            eventos: this.eventos,
            resultado: this.resultado,
        };
    }
}
