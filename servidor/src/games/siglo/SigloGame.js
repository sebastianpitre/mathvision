/* =========================================================
   SIGLOGAMIF
   ---------------------------------------------------------
   De 2 a 8 jugadores. Cada uno tiene 5 espacios.

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
      · JOKER: de vez en cuando (1 de cada 20 tiros) el dado
        sale joker y el jugador elige el número que quiera del
        0 al 6, y luego unidad o decena.
      · DIAMANTE: una vez por partida, después de tirar, el
        jugador puede pagar 1 diamante para volver a tirar.
        El cobro lo hace salaSockets.js (base de datos); aquí
        solo se reserva, se confirma o se cancela.
   3. Al final, gana quien quede más cerca de 100 sin
      pasarse. Si hay empate, desempate: cada empatado tira el
      dado una vez y gana el número más alto (se repite si
      vuelven a empatar).

   PODER 🔄: muy de vez en cuando (más o menos en 1 de cada 4
   partidas; puede no salir o salir hasta 3 veces), entre la
   ronda 2 y la 4, aparece flotando para todos. El primero que
   lo toca elige a otro jugador vivo y le pone el número que
   quiera del 0 al 29 en su siguiente espacio vacío. Ese
   jugador pierde ese turno, y si se pasa de 100 queda
   eliminado. En el panel solo se cambian sus tiempos.

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

export const JOKER = "joker";
export const NUMEROS_JOKER = [0, 1, 2, 3, 4, 5, 6];
const PROBABILIDAD_JOKER = 1 / 20;
// Tiempo mínimo que le queda al jugador después de volver a tirar.
const SEGUNDOS_TRAS_RETIRO = 10;

// Poder 🔄: número máximo que se puede poner, cuántas veces como
// máximo sale y en qué parte de las partidas sale (en promedio).
export const MAX_NUMERO_PODER = 29;
const MAX_PODERES = 3;
const PARTIDAS_CON_PODER = 0.25;
const RONDAS_CON_PODER = 3; // de la ronda 2 a la 4

function dadoNormal() {
    return 1 + Math.floor(Math.random() * 6);
}

// En los turnos normales el dado puede salir joker.
function dado() {
    return Math.random() < PROBABILIDAD_JOKER ? JOKER : dadoNormal();
}

function textoDado(valor) {
    return valor === JOKER ? "🃏" : String(valor);
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
    constructor({ jugadores, onCambio, onFin, reglas }) {
        this.tipo = "siglo";
        this.onCambio = onCambio || (() => {});
        this.onFin = onFin || (() => {});

        this.jugadores = jugadores.map((j) => ({
            userId: String(j.userId),
            nombre: j.nombre,
            avatar: j.avatar || null,
            espacios: Array(ESPACIOS).fill(null),
            total: 0,
            eliminado: false,
            motivo: null, // "se_paso" | "abandono"
            tiroDesempate: null,
            retiroUsado: false, // ya usó su diamante para volver a tirar
            retiroPendiente: false, // se está cobrando el diamante
            marcasPoder: [], // espacios que le llenó otro con el poder 🔄
        }));

        // Poder 🔄
        this.reglasPoder = reglas || { poder_activo: false };
        // Probabilidad en cada turno para que, en total, salga en
        // más o menos 1 de cada 4 partidas (sea cual sea el número
        // de jugadores).
        const turnosPosibles = RONDAS_CON_PODER * this.jugadores.length;
        this.probabilidadPoder = 1 - Math.pow(1 - PARTIDAS_CON_PODER, 1 / turnosPosibles);
        this.poder = null; // { id, estado: "flotando" | "eligiendo", hasta, duenio }
        this.poderesSalidos = 0;
        this.timerPoder = null;

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
        clearTimeout(this.timerPoder);
        this.timer = null;
        this.timerPausa = null;
        this.timerPoder = null;
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
        this.evento("¡A jugar! Voten el tiempo por turno.");
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
            this.evento(`Nadie votó: turnos de ${this.segundosTurno} s.`);
        } else {
            const maximo = Math.max(...conteo.values());
            const ganadores = [...conteo.entries()].filter(([, n]) => n === maximo).map(([v]) => v);
            this.segundosTurno = azar(ganadores);
            this.evento(
                ganadores.length > 1
                    ? `Empate en la votación: turnos de ${this.segundosTurno} s (al azar).`
                    : `Turnos de ${this.segundosTurno} s.`
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
        this.intentarPoder();
        this.avisar();
    }

    tirar(userId) {
        if (this.fase === "desempate") return this.tirarDesempate(userId);
        if (this.fase !== "jugando") return { success: false, message: "Ahora no se puede tirar." };
        if (this.turno !== String(userId)) return { success: false, message: "No es tu turno." };
        if (this.dado !== null) return { success: false, message: "Ya tiraste el dado. Elige dónde ponerlo." };

        this.dado = dado();
        this.evento(
            this.dado === JOKER
                ? `${this.jugador(userId).nombre} sacó 🃏 ¡JOKER!`
                : `${this.jugador(userId).nombre} sacó ${this.dado}.`,
            this.dado === JOKER ? "joker" : "dado"
        );
        this.avisar();

        return { success: true, dado: this.dado };
    }

    /*
     * opcion: "unidad" (el número tal cual) o "decena" (número × 10)
     * numero: solo con joker, el número elegido (0 a 6)
     */
    elegir(userId, opcion, numero) {
        if (this.fase !== "jugando") return { success: false, message: "Ahora no se puede elegir." };
        if (this.turno !== String(userId)) return { success: false, message: "No es tu turno." };
        if (this.dado === null) return { success: false, message: "Primero tira el dado." };
        if (opcion !== "unidad" && opcion !== "decena") return { success: false, message: "Opción no válida." };

        const jugador = this.jugador(userId);
        if (jugador.retiroPendiente) return { success: false, message: "Espera, se está volviendo a tirar." };

        let base = this.dado;

        if (this.dado === JOKER) {
            base = Number(numero);
            if (!NUMEROS_JOKER.includes(base)) return { success: false, message: "Con el joker elige un número del 0 al 6." };
        }

        this.colocar(jugador, opcion === "decena" ? base * 10 : base);

        return { success: true };
    }

    /* ---------------------------------------------------------
       VOLVER A TIRAR CON UN DIAMANTE (una vez por partida)
       1. reservarRetiro: valida y aparta el turno mientras se
          cobra el diamante (nadie puede elegir ni se acaba el
          tiempo en ese momento).
       2. confirmarRetiro: ya se cobró → tira de nuevo.
          cancelarRetiro: no se pudo cobrar → todo sigue igual.
    --------------------------------------------------------- */

    puedeVolverATirar(userId) {
        const jugador = this.jugador(userId);

        if (this.fase !== "jugando") return { success: false, message: "Ahora no se puede volver a tirar." };
        if (!jugador || this.turno !== jugador.userId) return { success: false, message: "No es tu turno." };
        if (this.dado === null) return { success: false, message: "Primero tira el dado." };
        if (jugador.retiroUsado) return { success: false, message: "Ya volviste a tirar en esta partida." };
        if (jugador.retiroPendiente) return { success: false, message: "Ya se está volviendo a tirar." };

        return { success: true };
    }

    reservarRetiro(userId) {
        const permiso = this.puedeVolverATirar(userId);
        if (!permiso.success) return permiso;

        this.jugador(userId).retiroPendiente = true;
        return { success: true };
    }

    cancelarRetiro(userId) {
        const jugador = this.jugador(userId);
        if (jugador) jugador.retiroPendiente = false;
    }

    confirmarRetiro(userId) {
        const jugador = this.jugador(userId);
        if (!jugador?.retiroPendiente) return { success: false, message: "No hay nada que volver a tirar." };

        jugador.retiroPendiente = false;

        // Mientras se cobraba pudo terminar la partida o salir del turno.
        if (this.fase !== "jugando" || this.turno !== jugador.userId || this.dado === null) {
            return { success: false, message: "Tu turno terminó antes de volver a tirar." };
        }

        const antes = this.dado;
        jugador.retiroUsado = true;
        this.dado = dado();
        this.evento(
            `${jugador.nombre} usó 💎: ${textoDado(antes)} → ${textoDado(this.dado)}.`,
            this.dado === JOKER ? "joker" : "dado"
        );

        // Que le quede tiempo para pensar la nueva jugada.
        const minimo = Date.now() + SEGUNDOS_TRAS_RETIRO * 1000;
        if (!this.finEn || this.finEn < minimo) {
            this.finEn = minimo;
            this.programar(SEGUNDOS_TRAS_RETIRO * 1000, () => this.tiempoAgotado());
        }

        this.avisar();
        return { success: true, dado: this.dado };
    }

    colocar(jugador, valor) {
        jugador.espacios[this.ronda] = valor;
        jugador.total += valor;

        clearTimeout(this.timer);

        const llenos = jugador.espacios.filter((v) => v !== null).length;

        if (jugador.total > META) {
            jugador.eliminado = true;
            jugador.motivo = "se_paso";
            this.evento(`${jugador.nombre} +${valor} → ${jugador.total}: ¡eliminado!`, "eliminado");
        } else if (llenos === ESPACIOS && jugador.total === META) {
            this.evento(`¡SIGLO! ${jugador.nombre} llegó a 100.`, "siglo");
            return this.terminar({ tipo: "siglo", ganadores: [jugador.userId] });
        } else {
            this.evento(`${jugador.nombre} +${valor} → ${jugador.total}`);
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

        // Se está cobrando su diamante: se espera un momento.
        if (jugador.retiroPendiente) {
            return this.programar(1000, () => this.tiempoAgotado());
        }

        if (this.dado === null) {
            this.dado = dado();
            this.evento(`⏰ ${jugador.nombre}: el juego tiró (${textoDado(this.dado)}).`, "tiempo");
        } else {
            this.evento(`⏰ ${jugador.nombre}: el juego eligió.`, "tiempo");
        }

        const numeros = this.dado === JOKER ? NUMEROS_JOKER : [this.dado];
        this.colocar(jugador, this.opcionPrudente(jugador, numeros));
    }

    /*
     * La opción que menos riesgo tiene: que no lo pase de 100
     * (contando que cada espacio que falta suma mínimo 1) y que
     * lo deje más cerca del ritmo ideal (20 por espacio).
     */
    opcionPrudente(jugador, numeros) {
        const restantes = ESPACIOS - (this.ronda + 1);
        const opciones = [...new Set(numeros.flatMap((n) => [n, n * 10]))];

        const viables = opciones.filter((v) => jugador.total + v + restantes <= META);
        const candidatas = viables.length ? viables : opciones.filter((v) => jugador.total + v <= META);

        if (!candidatas.length) return Math.min(...opciones); // Todas lo pasan: pone la menor.

        const ideal = 20 * (this.ronda + 1);
        return candidatas.sort((a, b) => Math.abs(jugador.total + a - ideal) - Math.abs(jugador.total + b - ideal))[0];
    }

    terminarRonda() {
        if (this.fase !== "jugando") return;

        this.ronda += 1;

        if (this.ronda < ESPACIOS) {
            this.evento(`Ronda ${this.ronda + 1}`, "ronda");
            return this.empezarTurno(this.siguienteEnRonda());
        }

        // Se llenaron los 5 espacios y nadie hizo SIGLO.
        const vivos = this.vivos();

        if (vivos.length === 0) return this.terminar({ tipo: "nadie", ganadores: [] });

        const mejor = Math.max(...vivos.map((j) => j.total));
        const empatados = vivos.filter((j) => j.total === mejor);

        if (empatados.length === 1) {
            this.evento(`🏆 ${empatados[0].nombre} gana con ${mejor}.`, "ganador");
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
            this.evento(`🏆 ${vivos[0].nombre}: último en pie.`, "ganador");
            this.terminar({ tipo: "ultimo", ganadores: [vivos[0].userId] });
            return true;
        }

        return false;
    }

    /* ---------------------------------------------------------
       3. DESEMPATE
    --------------------------------------------------------- */

    empezarDesempate(empatados) {
        this.quitarPoder();
        this.fase = "desempate";
        this.empatados = empatados.map((j) => j.userId);
        for (const j of this.jugadores) j.tiroDesempate = null;

        const nombres = empatados.map((j) => j.nombre).join(" y ");
        this.evento(`¡Empate con ${empatados[0].total}! Desempate: ${nombres}.`, "desempate");

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
            this.evento(`⏰ ${j.nombre}: el juego tiró.`, "tiempo");
            this.tirarDesempate(this.turno);
        });
        this.avisar();
    }

    tirarDesempate(userId) {
        if (this.fase !== "desempate") return { success: false, message: "No hay desempate." };
        if (this.turno !== String(userId)) return { success: false, message: "No es tu turno." };

        clearTimeout(this.timer);

        const jugador = this.jugador(userId);
        jugador.tiroDesempate = dadoNormal(); // en el desempate no hay joker
        this.dado = jugador.tiroDesempate;
        this.evento(`${jugador.nombre} sacó ${jugador.tiroDesempate} (desempate).`, "dado");

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
            this.evento(`🏆 ${ganadores[0].nombre} gana el desempate.`, "ganador");
            return this.terminar({ tipo: "desempate", ganadores: [ganadores[0].userId] });
        }

        this.evento("¡Otro empate! Se repite.", "desempate");
        this.empezarDesempate(ganadores);
    }

    /* ---------------------------------------------------------
       PODER 🔄
    --------------------------------------------------------- */

    /* Primer espacio vacío de un jugador desde la ronda actual. */
    siguienteEspacio(jugador) {
        for (let k = this.ronda; k < ESPACIOS; k += 1) if (jugador.espacios[k] === null) return k;
        return -1;
    }

    objetivosPoder(userId) {
        return this.vivos().filter((j) => j.userId !== String(userId) && this.siguienteEspacio(j) !== -1);
    }

    /* Al empezar cada turno, entre la ronda 2 y la 4, puede salir
       el poder, al azar y muy rara vez (como el joker). */
    intentarPoder() {
        if (!this.reglasPoder?.poder_activo || this.poder || this.fase !== "jugando") return;
        if (this.ronda < 1 || this.ronda > RONDAS_CON_PODER) return;
        if (this.poderesSalidos >= MAX_PODERES || this.vivos().length < 2) return;

        if (Math.random() < this.probabilidadPoder) this.soltarPoder();
    }

    soltarPoder() {
        const segundos = this.reglasPoder.poder_segundos_visible || 8;
        this.poderesSalidos += 1;
        this.poder = { id: this.poderesSalidos, estado: "flotando", hasta: Date.now() + segundos * 1000, duenio: null };
        this.evento("🔄 ¡Apareció un poder! El primero que lo toque lo usa.", "poder");

        clearTimeout(this.timerPoder);
        this.timerPoder = setTimeout(() => this.perderPoder("🔄 Nadie agarró el poder."), segundos * 1000);
    }

    quitarPoder() {
        clearTimeout(this.timerPoder);
        this.timerPoder = null;
        this.poder = null;
    }

    perderPoder(texto) {
        if (!this.poder) return;
        this.quitarPoder();
        if (this.fase !== "jugando") return;
        this.evento(texto, "poder");
        this.avisar();
    }

    agarrarPoder(userId) {
        const jugador = this.jugador(userId);

        if (this.fase !== "jugando" || !this.poder) return { success: false, message: "Ya no hay poder." };
        if (this.poder.estado !== "flotando") {
            const duenio = this.jugador(this.poder.duenio);
            return { success: false, message: duenio?.userId === String(userId) ? "Ya lo tienes." : `${duenio?.nombre || "Alguien"} lo agarró primero.` };
        }
        if (!jugador || jugador.eliminado) return { success: false, message: "Solo los jugadores en juego pueden agarrarlo." };
        if (!this.objetivosPoder(userId).length) return { success: false, message: "No hay a quién ponerle el número." };

        const segundos = this.reglasPoder.poder_segundos_elegir || 10;
        this.poder = { ...this.poder, estado: "eligiendo", duenio: jugador.userId, hasta: Date.now() + segundos * 1000 };
        this.evento(`🔄 ${jugador.nombre} agarró el poder.`, "poder");

        clearTimeout(this.timerPoder);
        this.timerPoder = setTimeout(() => this.perderPoder(`🔄 ${jugador.nombre} no usó el poder a tiempo.`), segundos * 1000);

        this.avisar();
        return { success: true };
    }

    /* numero: el que quiera, de 0 a MAX_NUMERO_PODER */
    usarPoder(userId, objetivoId, numero) {
        const duenio = this.jugador(userId);
        const objetivo = this.jugador(objetivoId);
        const valor = Number(numero);

        if (this.fase !== "jugando" || this.poder?.estado !== "eligiendo") return { success: false, message: "Ya no tienes el poder." };
        if (this.poder.duenio !== String(userId)) return { success: false, message: "El poder lo tiene otro jugador." };
        if (!objetivo || objetivo.eliminado) return { success: false, message: "Elige a un jugador que siga en juego." };
        if (objetivo.userId === duenio.userId) return { success: false, message: "El poder se usa con otro jugador." };
        if (!Number.isInteger(valor) || valor < 0 || valor > MAX_NUMERO_PODER) {
            return { success: false, message: `Elige un número del 0 al ${MAX_NUMERO_PODER}.` };
        }
        if (objetivo.retiroPendiente) return { success: false, message: "Espera un momento: está volviendo a tirar." };

        const k = this.siguienteEspacio(objetivo);
        if (k === -1) return { success: false, message: `${objetivo.nombre} ya llenó sus espacios.` };

        const enSuTurno = this.turno === objetivo.userId && k === this.ronda;

        this.quitarPoder();
        objetivo.espacios[k] = valor;
        objetivo.total += valor;
        objetivo.marcasPoder.push(k);

        const llenos = objetivo.espacios.filter((v) => v !== null).length;

        if (objetivo.total > META) {
            objetivo.eliminado = true;
            objetivo.motivo = "se_paso";
            this.evento(`🔄 ${duenio.nombre} le puso ${valor} a ${objetivo.nombre} → ${objetivo.total}: ¡eliminado!`, "eliminado");
        } else if (llenos === ESPACIOS && objetivo.total === META) {
            this.evento(`🔄 ${duenio.nombre} le puso ${valor} a ${objetivo.nombre}… ¡y le dio el SIGLO!`, "siglo");
            this.terminar({ tipo: "siglo", ganadores: [objetivo.userId] });
            return { success: true };
        } else {
            this.evento(`🔄 ${duenio.nombre} le puso ${valor} a ${objetivo.nombre} → ${objetivo.total}. Pierde ese turno.`, "poder");
        }

        if (this.revisarUltimoEnPie()) return { success: true };

        // Si era su turno, se le acaba y sigue el próximo.
        if (enSuTurno || (this.turno === objetivo.userId && objetivo.eliminado)) {
            clearTimeout(this.timer);
            this.turno = null;
            this.finEn = null;
            this.dado = null;
            clearTimeout(this.timerPausa);
            this.timerPausa = setTimeout(() => {
                if (this.fase === "jugando") this.empezarTurno(this.siguienteEnRonda());
            }, PAUSA_MOSTRAR_DADO_MS);
        }

        this.avisar();
        return { success: true };
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
        if (this.poder?.duenio === jugador.userId) this.quitarPoder();
        this.evento(`${jugador.nombre} salió.`, "eliminado");

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

        this.poder = null;
        this.fase = "terminada";
        this.status = "finished";
        this.turno = null;
        this.finEn = null;
        this.resultado = { tipo, ganadores };

        if (tipo === "nadie") this.evento("Todos se pasaron. ¡Nadie gana!", "nadie");

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
            numerosJoker: NUMEROS_JOKER,
            maxNumeroPoder: MAX_NUMERO_PODER,
            votos: conteoVotos,
            empatados: this.empatados,
            poder: this.poder ? { id: this.poder.id, estado: this.poder.estado, hasta: this.poder.hasta, duenio: this.poder.duenio } : null,
            jugadores: this.orden.map((i) => {
                const j = this.jugadores[i];
                return {
                    userId: j.userId,
                    nombre: j.nombre,
                    avatar: j.avatar,
                    espacios: j.espacios,
                    total: j.total,
                    eliminado: j.eliminado,
                    motivo: j.motivo,
                    tiroDesempate: j.tiroDesempate,
                    retiroUsado: j.retiroUsado,
                    marcasPoder: j.marcasPoder,
                };
            }),
            eventos: this.eventos,
            resultado: this.resultado,
        };
    }
}
