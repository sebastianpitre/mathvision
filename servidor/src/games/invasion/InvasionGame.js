/* =========================================================
   INVASIÓNGAMIF
   ---------------------------------------------------------
   De 2 a 6 jugadores, cada uno con su color. Tablero pequeño
   para que se peleen las casillas: 2 → 4×4 · 3 o 4 → 5×5 ·
   5 o 6 → 6×6.

   1. Votación (15 s): todos votan el tiempo para responder
      (10, 15 o 20 s) y lo que dura la partida (2, 3 o 5 min).
      Gana lo más votado; si hay empate decide el voto del
      creador de la sala. Sin votos: 15 s y 3 min.
   2. Partida, SIN TURNOS: cualquiera toca una casilla vacía o
      de otro color (las suyas no). La casilla queda apartada
      para él mientras responde; nadie más la puede tocar.
      · Acierta → la casilla queda de su color (si era de otro,
        la "infecta").
      · Falla o se le acaba el tiempo → la casilla queda como
        estaba, ve la explicación y espera 3 s para tocar otra.
      Cada jugador responde una pregunta a la vez.
   3. Al acabarse el tiempo gana quien tenga más casillas. Si
      hay empate en el primer lugar, es empate. Si se van
      todos menos uno, gana el que queda.

   La respuesta correcta nunca se manda antes de responder:
   la pregunta llega solo a quien tocó la casilla y el
   servidor decide si acertó.
========================================================= */

export const OPCIONES_RESPUESTA = [10, 15, 20];
export const OPCIONES_DURACION = [2, 3, 5]; // minutos
const RESPUESTA_POR_DEFECTO = 15;
const DURACION_POR_DEFECTO = 3;
const SEGUNDOS_VOTACION = 15;
export const ESPERA_FALLO_MS = 3000;
// Un poco más de tiempo del que ve el jugador (lo que tarda la red).
const GRACIA_MS = 800;

export const COLORES = [
    { id: "rojo", nombre: "Rojo", hex: "#ef4444" },
    { id: "azul", nombre: "Azul", hex: "#3b82f6" },
    { id: "verde", nombre: "Verde", hex: "#22c55e" },
    { id: "naranja", nombre: "Naranja", hex: "#f59e0b" },
    { id: "morado", nombre: "Morado", hex: "#a855f7" },
    { id: "rosado", nombre: "Rosado", hex: "#ec4899" },
];

export function tamanoPara(cantidad) {
    if (cantidad <= 2) return 4;
    if (cantidad <= 4) return 5;
    return 6;
}

function mezclar(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

/* Lo más votado; si hay empate, el voto del creador; si no, el valor por defecto o el primero. */
function ganadorVotacion(votos, opciones, creador, porDefecto) {
    const conteo = new Map();
    for (const v of votos.values()) conteo.set(v, (conteo.get(v) || 0) + 1);
    if (!conteo.size) return { valor: porDefecto, empate: false, nadie: true };
    const maximo = Math.max(...conteo.values());
    const empatados = opciones.filter((o) => conteo.get(o) === maximo);
    if (empatados.length === 1) return { valor: empatados[0], empate: false };
    const delCreador = votos.get(creador);
    if (empatados.includes(delCreador)) return { valor: delCreador, empate: true, creador: true };
    return { valor: empatados.includes(porDefecto) ? porDefecto : empatados[0], empate: true };
}

export class InvasionGame {
    /*
     * jugadores: [{ userId, nombre, avatar, marco, verificado }]
     * preguntas: [{ id, texto, opciones, correcta, explicacion }]
     * creador:   userId de quien creó la sala (desempata votos)
     * onCambio(estado) · onFin(resultado, partida)
     */
    constructor({ jugadores, preguntas, creador, tema = null, onCambio, onFin }) {
        this.tipo = "invasion";
        this.onCambio = onCambio || (() => {});
        this.onFin = onFin || (() => {});
        this.creador = String(creador ?? "");
        this.tema = tema;

        this.jugadores = jugadores.slice(0, COLORES.length).map((j, i) => ({
            userId: String(j.userId),
            nombre: j.nombre,
            avatar: j.avatar || null,
            marco: j.marco || null,
            verificado: Boolean(j.verificado),
            color: i,
            aciertos: 0,
            errores: 0,
            infectadas: 0,
            esperaHasta: 0,
            salio: false,
            activa: null, // { celda, pregunta, correcta, hasta, timer }
            vistas: new Set(),
        }));

        this.tamano = tamanoPara(this.jugadores.length);
        this.celdas = Array.from({ length: this.tamano * this.tamano }, () => ({ duenio: null, apartada: null }));

        this.mazo = mezclar(preguntas);
        this.posMazo = 0;

        this.fase = "votacion"; // votacion | jugando | terminada
        this.status = "playing";
        this.votosRespuesta = new Map();
        this.votosDuracion = new Map();
        this.segundosRespuesta = RESPUESTA_POR_DEFECTO;
        this.duracionMin = DURACION_POR_DEFECTO;
        this.finEn = null;

        this.eventos = [];
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

    casillasDe(userId) {
        return this.celdas.reduce((n, c) => n + (c.duenio === userId ? 1 : 0), 0);
    }

    evento(texto, tipo = "info", extra = {}) {
        this.eventos.push({ texto, tipo, en: Date.now(), ...extra });
        if (this.eventos.length > 10) this.eventos.shift();
    }

    avisar() {
        try {
            this.onCambio(this.toJSON());
        } catch (error) {
            console.error("❌ InvasiónGamif (aviso):", error);
        }
    }

    programar(ms, accion) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            try {
                accion();
            } catch (error) {
                console.error("❌ InvasiónGamif (temporizador):", error);
            }
        }, ms);
    }

    destruir() {
        clearTimeout(this.timer);
        this.timer = null;
        for (const j of this.jugadores) {
            clearTimeout(j.activa?.timer);
            j.activa = null;
        }
    }

    clearTurnTimer() {
        this.destruir();
    }

    /* Siguiente pregunta del mazo que este jugador no haya visto. */
    sacarPregunta(jugador) {
        const total = this.mazo.length;
        if (jugador.vistas.size >= total) jugador.vistas.clear();
        for (let k = 0; k < total; k++) {
            const p = this.mazo[(this.posMazo + k) % total];
            if (!jugador.vistas.has(p.id)) {
                this.posMazo = (this.posMazo + k + 1) % total;
                if (this.posMazo === 0) this.mazo = mezclar(this.mazo);
                jugador.vistas.add(p.id);
                return p;
            }
        }
        return this.mazo[0];
    }

    /* ---------------- 1. Votación ---------------- */

    iniciar() {
        this.fase = "votacion";
        this.finEn = Date.now() + SEGUNDOS_VOTACION * 1000;
        this.evento("¡A invadir! Voten el tiempo para responder y lo que dura la partida.");
        this.programar(SEGUNDOS_VOTACION * 1000, () => this.cerrarVotacion());
        this.avisar();
    }

    votar(userId, { respuesta, duracion } = {}) {
        if (this.fase !== "votacion") return { success: false, message: "La votación ya terminó." };
        const j = this.jugador(userId);
        if (!j || j.salio) return { success: false, message: "No juegas en esta partida." };

        if (respuesta !== undefined) {
            if (!OPCIONES_RESPUESTA.includes(Number(respuesta))) return { success: false, message: "Tiempo no válido." };
            this.votosRespuesta.set(j.userId, Number(respuesta));
        }
        if (duracion !== undefined) {
            if (!OPCIONES_DURACION.includes(Number(duracion))) return { success: false, message: "Duración no válida." };
            this.votosDuracion.set(j.userId, Number(duracion));
        }

        const todos = this.activos().every((a) => this.votosRespuesta.has(a.userId) && this.votosDuracion.has(a.userId));
        if (todos) this.cerrarVotacion();
        else this.avisar();
        return { success: true };
    }

    cerrarVotacion() {
        if (this.fase !== "votacion") return;

        const r = ganadorVotacion(this.votosRespuesta, OPCIONES_RESPUESTA, this.creador, RESPUESTA_POR_DEFECTO);
        const d = ganadorVotacion(this.votosDuracion, OPCIONES_DURACION, this.creador, DURACION_POR_DEFECTO);
        this.segundosRespuesta = r.valor;
        this.duracionMin = d.valor;
        this.evento(
            `${this.duracionMin} min de partida · ${this.segundosRespuesta} s para responder${r.creador || d.creador ? " (empate: decidió el creador)" : ""}.`
        );

        this.fase = "jugando";
        this.finEn = Date.now() + this.duracionMin * 60_000;
        this.programar(this.duracionMin * 60_000, () => this.terminarPorTiempo());
        this.avisar();
    }

    /* ---------------- 2. Tocar y responder ---------------- */

    tocar(userId, indice) {
        if (this.fase !== "jugando") return { success: false, message: "Ahora no se puede tocar el tablero." };
        const j = this.jugador(userId);
        if (!j || j.salio) return { success: false, message: "No juegas en esta partida." };
        if (j.activa) return { success: false, message: "Primero responde tu pregunta." };

        const espera = j.esperaHasta - Date.now();
        if (espera > 0) return { success: false, message: `Espera ${Math.ceil(espera / 1000)} s.`, esperaHasta: j.esperaHasta };

        const i = Number(indice);
        const celda = Number.isInteger(i) ? this.celdas[i] : null;
        if (!celda) return { success: false, message: "Esa casilla no existe." };
        if (celda.duenio === j.userId) return { success: false, message: "Esa casilla ya es tuya." };
        if (celda.apartada) {
            const otro = this.jugador(celda.apartada);
            return { success: false, message: `${otro?.nombre || "Otro jugador"} ya la está respondiendo.` };
        }

        const base = this.sacarPregunta(j);
        const orden = mezclar(base.opciones.map((_, k) => k));
        const hasta = Date.now() + this.segundosRespuesta * 1000;

        celda.apartada = j.userId;
        j.activa = {
            celda: i,
            pregunta: base,
            orden,
            correcta: orden.indexOf(base.correcta),
            hasta,
            timer: setTimeout(() => {
                try {
                    this.resolver(j, null, true);
                } catch (error) {
                    console.error("❌ InvasiónGamif (tiempo de respuesta):", error);
                }
            }, this.segundosRespuesta * 1000 + GRACIA_MS),
        };

        this.avisar();
        return {
            success: true,
            pregunta: {
                celda: i,
                texto: base.texto,
                opciones: orden.map((k) => base.opciones[k]),
                hasta,
                segundos: this.segundosRespuesta,
            },
        };
    }

    /* La pregunta que tiene abierta (si recargó la página en medio). */
    preguntaAbierta(userId) {
        const a = this.jugador(userId)?.activa;
        if (!a) return null;
        return {
            celda: a.celda,
            texto: a.pregunta.texto,
            opciones: a.orden.map((k) => a.pregunta.opciones[k]),
            hasta: a.hasta,
            segundos: this.segundosRespuesta,
        };
    }

    responder(userId, opcion) {
        const j = this.jugador(userId);
        if (!j?.activa) return { success: false, message: "No tienes una pregunta abierta." };
        const n = Number(opcion);
        if (!Number.isInteger(n) || n < 0 || n >= j.activa.orden.length) return { success: false, message: "Respuesta no válida." };
        return { success: true, resultado: this.resolver(j, n, false) };
    }

    /* Cierra la pregunta del jugador (respondió o se le acabó el tiempo). */
    resolver(j, opcion, agotado) {
        const a = j.activa;
        if (!a) return null;
        clearTimeout(a.timer);
        j.activa = null;

        const celda = this.celdas[a.celda];
        if (celda.apartada === j.userId) celda.apartada = null;

        const acerto = !agotado && opcion === a.correcta && this.fase === "jugando";
        const antes = celda.duenio;

        if (acerto) {
            j.aciertos += 1;
            celda.duenio = j.userId;
            if (antes) {
                j.infectadas += 1;
                const victima = this.jugador(antes);
                this.evento(`${j.nombre} invadió una casilla de ${victima?.nombre || "otro"}.`, "infeccion", {
                    celda: a.celda,
                    quien: j.userId,
                    victima: antes,
                });
            } else {
                this.evento(`${j.nombre} conquistó una casilla.`, "conquista", { celda: a.celda, quien: j.userId });
            }
        } else if (this.fase === "jugando") {
            j.errores += 1;
            j.esperaHasta = Date.now() + ESPERA_FALLO_MS;
        }

        const resultado = {
            celda: a.celda,
            acerto,
            agotado,
            elegida: opcion,
            correcta: a.correcta,
            textoCorrecto: a.pregunta.opciones[a.pregunta.correcta],
            explicacion: a.pregunta.explicacion,
            esperaHasta: j.esperaHasta,
        };

        // El aviso privado al jugador lo manda salaSockets (con onResultado).
        if (agotado) this.onResultado?.(j.userId, resultado);
        this.avisar();
        return resultado;
    }

    /* ---------------- Abandono ---------------- */

    abandonar(userId) {
        const j = this.jugador(userId);
        if (!j || j.salio || this.fase === "terminada") return;

        if (j.activa) {
            clearTimeout(j.activa.timer);
            const celda = this.celdas[j.activa.celda];
            if (celda.apartada === j.userId) celda.apartada = null;
            j.activa = null;
        }
        j.salio = true;
        this.votosRespuesta.delete(j.userId);
        this.votosDuracion.delete(j.userId);
        this.evento(`${j.nombre} salió.`, "salio");

        const quedan = this.activos();
        if (quedan.length <= 1) {
            return this.terminar({ tipo: quedan.length ? "ultimo" : "nadie", ganadores: quedan.map((q) => q.userId) });
        }

        if (this.fase === "votacion") {
            const todos = quedan.every((a) => this.votosRespuesta.has(a.userId) && this.votosDuracion.has(a.userId));
            if (todos) return this.cerrarVotacion();
        }
        this.avisar();
    }

    /* ---------------- 3. Fin ---------------- */

    terminarPorTiempo() {
        const enJuego = this.activos();
        const conteo = enJuego.map((j) => ({ userId: j.userId, casillas: this.casillasDe(j.userId) }));
        const maximo = Math.max(0, ...conteo.map((c) => c.casillas));
        if (maximo === 0) return this.terminar({ tipo: "nadie", ganadores: [] });
        const ganadores = conteo.filter((c) => c.casillas === maximo).map((c) => c.userId);
        this.terminar({ tipo: ganadores.length > 1 ? "empate" : "tiempo", ganadores });
    }

    terminar({ tipo, ganadores }) {
        this.destruir();
        for (const c of this.celdas) c.apartada = null;

        this.fase = "terminada";
        this.status = "finished";
        this.finEn = null;
        this.resultado = { tipo, ganadores };

        if (tipo === "nadie") this.evento("Nadie conquistó casillas.", "nadie");
        this.avisar();

        try {
            this.onFin(this.resultado, this);
        } catch (error) {
            console.error("❌ InvasiónGamif (fin):", error);
        }
    }

    /* Resultado de cada jugador para los premios. */
    resultadosPremios() {
        const { tipo, ganadores } = this.resultado || { ganadores: [] };
        return this.jugadores
            .filter((j) => !j.salio)
            .map((j) => ({
                userId: j.userId,
                resultado: !ganadores.includes(j.userId) ? "perdida" : tipo === "empate" ? "empate" : "ganada",
                aciertos: j.aciertos,
                errores: j.errores,
            }));
    }

    /* ---------------- Estado para todos ---------------- */

    toJSON() {
        const votos = (mapa, opciones) => {
            const r = {};
            for (const o of opciones) r[o] = [];
            for (const [userId, v] of mapa) r[v]?.push(userId);
            return r;
        };

        return {
            tipo: "invasion",
            fase: this.fase,
            ahora: Date.now(),
            finEn: this.finEn,
            tamano: this.tamano,
            segundosRespuesta: this.segundosRespuesta,
            duracionMin: this.duracionMin,
            esperaFalloMs: ESPERA_FALLO_MS,
            opcionesRespuesta: OPCIONES_RESPUESTA,
            opcionesDuracion: OPCIONES_DURACION,
            votosRespuesta: votos(this.votosRespuesta, OPCIONES_RESPUESTA),
            votosDuracion: votos(this.votosDuracion, OPCIONES_DURACION),
            creador: this.creador,
            tema: this.tema,
            // [dueño, apartada por] de cada casilla, fila por fila
            celdas: this.celdas.map((c) => [c.duenio, c.apartada]),
            jugadores: this.jugadores.map((j) => ({
                userId: j.userId,
                nombre: j.nombre,
                avatar: j.avatar,
                marco: j.marco,
                verificado: j.verificado,
                color: COLORES[j.color],
                casillas: this.casillasDe(j.userId),
                aciertos: j.aciertos,
                errores: j.errores,
                infectadas: j.infectadas,
                esperaHasta: j.esperaHasta,
                respondiendo: j.activa ? j.activa.celda : null,
                salio: j.salio,
            })),
            eventos: this.eventos,
            resultado: this.resultado,
        };
    }
}
