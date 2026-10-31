/* =========================================================
   PENALGAMIF ⚽ (1 contra 1)
   ---------------------------------------------------------
   Se turnan: uno patea y el otro ataja, después al revés.
   5 penales cada uno; si quedan iguales, muerte súbita (un
   penal cada uno hasta que uno meta y el otro no). Si uno ya
   no puede alcanzar al otro, se termina antes.

   Cada penal:
     1. APUNTAR  (15 s): el que patea elige izquierda, centro o
        derecha (vistos desde el que patea).
     2. ATAJAR   (10 s): el arquero sabe que ya eligió (no dónde)
        y elige hacia dónde tirarse.
     3. PREGUNTA (20 s): solo el que patea. Si falla o se le
        acaba el tiempo → el balón se va AFUERA.
     4. TIRO: si acertó, patea a donde eligió. Mismo lado que el
        arquero → ATAJADA; si no → ¡GOL!
   Si se acaba el tiempo de elegir, se elige al azar.
   La respuesta correcta nunca llega al navegador antes.
========================================================= */

export const LADOS = ["izquierda", "centro", "derecha"];
export const PENALES = 5;
const SEGUNDOS_APUNTAR = 15;
const SEGUNDOS_ATAJAR = 10;
export const SEGUNDOS_PREGUNTA = 20;
const DURACION_TIRO_MS = 3800; // silbato, el balón vuela y el letrero
const CELEBRACION_MS = 2600;
const GRACIA_MS = 800;

const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];

function mezclar(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

export class PenalGame {
    /*
     * jugadores: [{ userId, nombre, avatar, marco, verificado }] (2)
     * onCambio(estado) · onFin(resultado, partida)
     * onPregunta(userId, pregunta) · onResultado(userId, resultado)  ← privados
     */
    constructor({ jugadores, preguntas, tema = null, onCambio, onFin, onPregunta, onResultado }) {
        this.tipo = "penal";
        this.onCambio = onCambio || (() => {});
        this.onFin = onFin || (() => {});
        this.onPregunta = onPregunta || (() => {});
        this.onResultado = onResultado || (() => {});
        this.tema = tema;

        this.jugadores = mezclar(jugadores.slice(0, 2)).map((j) => ({
            userId: String(j.userId),
            nombre: j.nombre,
            avatar: j.avatar || null,
            marco: j.marco || null,
            verificado: Boolean(j.verificado),
            tiros: [], // "gol" | "atajada" | "afuera"
            aciertos: 0,
            errores: 0,
            salio: false,
            vistas: new Set(),
        }));

        this.mazo = mezclar(preguntas);
        this.posMazo = 0;

        this.numero = 0; // penal en curso (0, 1, 2…)
        this.fase = "apuntar"; // apuntar | atajar | pregunta | tiro | celebrando | terminada
        this.status = "playing";
        this.lado = null; // a dónde patea (secreto hasta el tiro)
        this.salto = null; // a dónde se tira el arquero (secreto hasta el tiro)
        this.pregunta = null; // { pregunta, orden, correcta, hasta }
        this.tiro = null; // { lado, salto, resultado } cuando se ve el tiro
        this.finEn = null;
        this.eventos = [];
        this.resultado = null;
        this.celebracion = null;
        this.timer = null;
    }

    /* ---------------- Utilidades ---------------- */

    jugador(userId) {
        return this.jugadores.find((j) => j.userId === String(userId)) || null;
    }

    get pateador() {
        return this.jugadores[this.numero % 2];
    }

    get arquero() {
        return this.jugadores[(this.numero + 1) % 2];
    }

    goles(j) {
        return j.tiros.filter((t) => t === "gol").length;
    }

    evento(texto, tipo = "info") {
        this.eventos.push({ texto, tipo, en: Date.now() });
        if (this.eventos.length > 8) this.eventos.shift();
    }

    avisar() {
        try {
            this.onCambio(this.toJSON());
        } catch (error) {
            console.error("❌ PenalGamif (aviso):", error);
        }
    }

    programar(ms, accion) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            try {
                accion();
            } catch (error) {
                console.error("❌ PenalGamif (temporizador):", error);
            }
        }, ms);
    }

    destruir() {
        clearTimeout(this.timer);
        this.timer = null;
    }

    clearTurnTimer() {
        this.destruir();
    }

    sacarPregunta(j) {
        const total = this.mazo.length;
        if (!total) return null;
        if (j.vistas.size >= total) j.vistas.clear();
        for (let k = 0; k < total; k++) {
            const p = this.mazo[(this.posMazo + k) % total];
            if (!j.vistas.has(p.id)) {
                this.posMazo = (this.posMazo + k + 1) % total;
                j.vistas.add(p.id);
                return p;
            }
        }
        return this.mazo[0];
    }

    /* ---------------- Penal a penal ---------------- */

    iniciar() {
        this.evento("¡Tanda de penales! 5 cada uno.");
        this.empezarPenal();
    }

    empezarPenal() {
        if (this.revisarFin()) return;
        this.fase = "apuntar";
        this.lado = null;
        this.salto = null;
        this.tiro = null;
        this.pregunta = null;
        this.finEn = Date.now() + SEGUNDOS_APUNTAR * 1000;
        this.programar(SEGUNDOS_APUNTAR * 1000 + GRACIA_MS, () => this.apuntar(this.pateador.userId, azar(LADOS), true));
        this.avisar();
    }

    apuntar(userId, lado, automatico = false) {
        if (this.fase !== "apuntar") return { success: false, message: "Ahora no se puede apuntar." };
        if (this.pateador.userId !== String(userId)) return { success: false, message: "No te toca patear." };
        if (!LADOS.includes(lado)) return { success: false, message: "Elige izquierda, centro o derecha." };

        this.lado = lado;
        this.fase = "atajar";
        this.finEn = Date.now() + SEGUNDOS_ATAJAR * 1000;
        this.evento(`${this.pateador.nombre} ${automatico ? "no eligió a tiempo: se apuntó solo." : "ya eligió a dónde patear."}`);
        this.programar(SEGUNDOS_ATAJAR * 1000 + GRACIA_MS, () => this.atajar(this.arquero.userId, azar(LADOS), true));
        this.avisar();
        return { success: true };
    }

    atajar(userId, lado, automatico = false) {
        if (this.fase !== "atajar") return { success: false, message: "Ahora no se puede elegir el lado." };
        if (this.arquero.userId !== String(userId)) return { success: false, message: "No te toca atajar." };
        if (!LADOS.includes(lado)) return { success: false, message: "Elige izquierda, centro o derecha." };

        this.salto = lado;
        if (automatico) this.evento(`${this.arquero.nombre} no eligió a tiempo: se tira al azar.`);
        this.abrirPregunta();
        return { success: true };
    }

    abrirPregunta() {
        const j = this.pateador;
        const base = this.sacarPregunta(j);
        if (!base) return this.patear(true); // sin preguntas: patea directo
        const orden = mezclar(base.opciones.map((_, k) => k));
        const hasta = Date.now() + SEGUNDOS_PREGUNTA * 1000;
        this.pregunta = { pregunta: base, orden, correcta: orden.indexOf(base.correcta), hasta };
        this.fase = "pregunta";
        this.finEn = hasta;
        this.programar(SEGUNDOS_PREGUNTA * 1000 + GRACIA_MS, () => this.resolverPregunta(null, true));
        this.avisar();
        this.onPregunta(j.userId, this.preguntaAbierta(j.userId));
    }

    preguntaAbierta(userId) {
        const p = this.pregunta;
        if (!p || this.fase !== "pregunta" || this.pateador.userId !== String(userId)) return null;
        return { texto: p.pregunta.texto, opciones: p.orden.map((k) => p.pregunta.opciones[k]), hasta: p.hasta, segundos: SEGUNDOS_PREGUNTA };
    }

    responder(userId, opcion) {
        if (this.fase !== "pregunta" || this.pateador.userId !== String(userId)) return { success: false, message: "No tienes una pregunta abierta." };
        const n = Number(opcion);
        if (!Number.isInteger(n) || n < 0 || n >= this.pregunta.orden.length) return { success: false, message: "Respuesta no válida." };
        this.resolverPregunta(n, false);
        return { success: true };
    }

    resolverPregunta(opcion, agotado) {
        if (this.fase !== "pregunta" || !this.pregunta) return;
        clearTimeout(this.timer);
        const p = this.pregunta;
        const j = this.pateador;
        const acerto = !agotado && opcion === p.correcta;
        if (acerto) j.aciertos += 1;
        else j.errores += 1;
        this.onResultado(j.userId, {
            acerto,
            agotado,
            elegida: opcion,
            correcta: p.correcta,
            textoCorrecto: p.pregunta.opciones[p.pregunta.correcta],
            explicacion: p.pregunta.explicacion,
        });
        this.pregunta = null;
        this.patear(acerto);
    }

    /* El tiro: gol, atajada o afuera. */
    patear(acerto) {
        const j = this.pateador;
        const resultado = !acerto ? "afuera" : this.lado === this.salto ? "atajada" : "gol";
        j.tiros.push(resultado);
        this.tiro = { lado: this.lado, salto: this.salto, resultado, pateador: j.userId, en: Date.now() };
        this.fase = "tiro";
        this.finEn = null;
        this.evento(
            resultado === "gol"
                ? `¡GOOOL de ${j.nombre}! ⚽`
                : resultado === "atajada"
                    ? `¡${this.arquero.nombre} lo atajó! 🧤`
                    : `${j.nombre} falló la pregunta: ¡afuera!`,
            resultado
        );
        this.avisar();
        this.programar(DURACION_TIRO_MS, () => {
            this.numero += 1;
            this.empezarPenal();
        });
    }

    /* ---------------- ¿Se acabó? ---------------- */

    revisarFin() {
        const [a, b] = this.jugadores;
        if (a.salio || b.salio) {
            const queda = a.salio ? b : a;
            this.celebrar({ tipo: "abandono", ganadores: queda.salio ? [] : [queda.userId] });
            return true;
        }
        const ga = this.goles(a);
        const gb = this.goles(b);
        const ta = a.tiros.length;
        const tb = b.tiros.length;

        if (ta <= PENALES && tb <= PENALES) {
            // ¿Alguien ya no puede alcanzar al otro con los que le quedan?
            const quedanA = PENALES - ta;
            const quedanB = PENALES - tb;
            if (ga + quedanA < gb) return this.celebrar({ tipo: "serie", ganadores: [b.userId] }), true;
            if (gb + quedanB < ga) return this.celebrar({ tipo: "serie", ganadores: [a.userId] }), true;
            if (ta === PENALES && tb === PENALES && ga !== gb) {
                return this.celebrar({ tipo: "serie", ganadores: [ga > gb ? a.userId : b.userId] }), true;
            }
            if (ta === PENALES && tb === PENALES) this.evento("¡Empate! Muerte súbita: un penal cada uno.", "info");
            return false;
        }
        // Muerte súbita: se decide cuando los dos patearon el mismo número.
        if (ta === tb && ga !== gb) return this.celebrar({ tipo: "subita", ganadores: [ga > gb ? a.userId : b.userId] }), true;
        return false;
    }

    celebrar(resultado) {
        clearTimeout(this.timer);
        this.fase = "celebrando";
        this.finEn = null;
        this.pregunta = null;
        this.celebracion = resultado;
        const g = this.jugador(resultado.ganadores[0]);
        if (g) this.evento(`🏆 ¡${g.nombre} gana la tanda!`, "fin");
        this.avisar();
        this.programar(CELEBRACION_MS, () => this.terminar(resultado));
    }

    terminar({ tipo, ganadores }) {
        this.destruir();
        this.fase = "terminada";
        this.status = "finished";
        this.resultado = { tipo, ganadores };
        this.avisar();
        try {
            this.onFin(this.resultado, this);
        } catch (error) {
            console.error("❌ PenalGamif (fin):", error);
        }
    }

    abandonar(userId) {
        const j = this.jugador(userId);
        if (!j || j.salio || this.fase === "terminada") return;
        j.salio = true;
        this.evento(`${j.nombre} salió.`, "salio");
        if (this.fase === "celebrando") return this.avisar();
        clearTimeout(this.timer);
        this.revisarFin();
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

    /* ---------------- Estado para los dos ---------------- */

    toJSON() {
        // El lado y el salto solo se muestran cuando ya se patea.
        return {
            tipo: "penal",
            fase: this.fase,
            ahora: Date.now(),
            finEn: this.finEn,
            numero: this.numero,
            penales: PENALES,
            lados: LADOS,
            tema: this.tema,
            pateador: this.pateador.userId,
            arquero: this.arquero.userId,
            apunto: this.lado !== null, // el arquero sabe que ya eligió (no dónde)
            atajo: this.salto !== null,
            tiro: this.tiro,
            subita: this.jugadores.every((j) => j.tiros.length >= PENALES),
            jugadores: this.jugadores.map((j) => ({
                userId: j.userId,
                nombre: j.nombre,
                avatar: j.avatar,
                marco: j.marco,
                verificado: j.verificado,
                tiros: j.tiros,
                goles: this.goles(j),
                aciertos: j.aciertos,
                errores: j.errores,
                salio: j.salio,
            })),
            eventos: this.eventos,
            celebracion: this.celebracion,
            resultado: this.resultado,
        };
    }
}
