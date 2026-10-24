/* =========================================================
   SONIDOS DEL JUEGO
   ---------------------------------------------------------
   La biblioteca (tabla "sonidos") guarda cada archivo una
   sola vez. Cada MOMENTO del juego (música del lobby, clic,
   ganar…) apunta a un sonido de la biblioteca o a ninguno.
   Lo que elige el administrador se guarda en config_juego
   con la clave "sonidos". Si no eligió nada, se usa el
   sonido de fábrica de cada momento.
========================================================= */

import { pool } from "../database/db.js";

const CLAVE = "sonidos";

/* Momentos: clave → nombre, grupo, sonido de fábrica y volumen (0–100). */
export const MOMENTOS = [
    { clave: "musica_lobby", nombre: "Lobby, sala y menús", grupo: "musica", defecto: null, volumen: 30 },
    { clave: "musica_siglo", nombre: "SigloGamif", grupo: "musica", defecto: null, volumen: 30 },
    { clave: "musica_triqui", nombre: "Triqui", grupo: "musica", defecto: "/sounds/triqui/retro.mp3", volumen: 25 },
    { clave: "musica_preguntas", nombre: "Juego de preguntas", grupo: "musica", defecto: "/sounds/MathMillonario/fondo-millonario.mp3", volumen: 35 },
    { clave: "musica_escape", nombre: "Escape del Álgebra", grupo: "musica", defecto: null, volumen: 30 },

    { clave: "clic", nombre: "Clic de los botones", grupo: "general", defecto: "/sounds/click.mp3", volumen: 35 },
    { clave: "iniciar", nombre: "Iniciar partida", grupo: "general", defecto: "/sounds/unlock.mp3", volumen: 80 },
    { clave: "invitacion", nombre: "Llega una invitación", grupo: "general", defecto: "/sounds/lifeline.mp3", volumen: 80 },
    { clave: "emoji", nombre: "Llega un emoji", grupo: "general", defecto: "/sounds/lifeline.mp3", volumen: 50 },

    { clave: "ganar", nombre: "Ganar", grupo: "resultado", defecto: "/sounds/victory.mp3", volumen: 90 },
    { clave: "perder", nombre: "Perder", grupo: "resultado", defecto: "/sounds/game-over.mp3", volumen: 80 },
    { clave: "empate", nombre: "Empate", grupo: "resultado", defecto: "/sounds/game-over.mp3", volumen: 80 },

    { clave: "turno", nombre: "Es tu turno", grupo: "juego", defecto: "/sounds/warning.mp3", volumen: 60 },
    { clave: "tiempo", nombre: "Se acaba el tiempo", grupo: "juego", defecto: "/sounds/warning.mp3", volumen: 50 },
    { clave: "dado", nombre: "Tirar el dado", grupo: "juego", defecto: "/sounds/click.mp3", volumen: 60 },
    { clave: "poner", nombre: "Poner un número o ficha", grupo: "juego", defecto: "/sounds/correct.mp3", volumen: 60 },
    { clave: "correcto", nombre: "Respuesta correcta", grupo: "juego", defecto: "/sounds/correct.mp3", volumen: 80 },
    { clave: "incorrecto", nombre: "Respuesta incorrecta", grupo: "juego", defecto: "/sounds/incorrect.mp3", volumen: 80 },
    { clave: "eliminado", nombre: "Eliminado (se pasó de 100)", grupo: "juego", defecto: "/sounds/incorrect.mp3", volumen: 70 },
    { clave: "joker", nombre: "Joker o premio especial", grupo: "juego", defecto: "/sounds/victory.mp3", volumen: 70 },
    { clave: "comodin", nombre: "Usar un comodín", grupo: "juego", defecto: "/sounds/lifeline.mp3", volumen: 80 },
    { clave: "retirarse", nombre: "Retirarse", grupo: "juego", defecto: "/sounds/retire.mp3", volumen: 80 },
    { clave: "desbloquear", nombre: "Desbloquear (Escape)", grupo: "juego", defecto: "/sounds/unlock.mp3", volumen: 80 },
];

const POR_CLAVE = new Map(MOMENTOS.map((m) => [m.clave, m]));

let cache = null;

const entero = (v, min, max, porDefecto) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : porDefecto;
};

/* Lo guardado: { clave: { sonidoId: number|null, volumen } }.
   Si un momento no está guardado, usa su sonido de fábrica. */
async function leerGuardado() {
    const { rows } = await pool.query("SELECT valor FROM config_juego WHERE clave = $1", [CLAVE]);
    return rows[0]?.valor || {};
}

/* Momentos con el sonido que tiene cada uno (id, ruta y nombre). */
export async function obtenerMomentos() {
    if (cache) return cache;

    const [guardado, { rows: lista }] = await Promise.all([
        leerGuardado(),
        pool.query("SELECT id, nombre, ruta FROM sonidos"),
    ]);
    const porId = new Map(lista.map((s) => [s.id, s]));
    const porRuta = new Map(lista.map((s) => [s.ruta, s]));

    cache = MOMENTOS.map((m) => {
        const dato = guardado[m.clave];
        const sonido =
            dato && "sonidoId" in dato
                ? dato.sonidoId === null
                    ? null
                    : porId.get(Number(dato.sonidoId)) || null
                : m.defecto
                  ? porRuta.get(m.defecto) || { id: null, nombre: "De fábrica", ruta: m.defecto }
                  : null;

        return {
            clave: m.clave,
            nombre: m.nombre,
            grupo: m.grupo,
            sonidoId: sonido?.id ?? null,
            ruta: sonido?.ruta ?? null,
            sonidoNombre: sonido?.nombre ?? null,
            volumen: entero(dato?.volumen, 0, 100, m.volumen),
        };
    });

    return cache;
}

/* Lo que necesita el navegador: { clave: { ruta, volumen } }. */
export async function configPublica() {
    const momentos = await obtenerMomentos();
    return Object.fromEntries(momentos.map((m) => [m.clave, { ruta: m.ruta, volumen: m.volumen }]));
}

/* Cambia uno o varios momentos: { clave: { sonidoId, volumen } }. */
export async function guardarMomentos(cambios = {}) {
    const guardado = await leerGuardado();
    const { rows } = await pool.query("SELECT id FROM sonidos");
    const ids = new Set(rows.map((r) => r.id));

    for (const [clave, dato] of Object.entries(cambios || {})) {
        const momento = POR_CLAVE.get(clave);
        if (!momento || !dato || typeof dato !== "object") continue;

        const anterior = guardado[clave] || {};
        const nuevo = { ...anterior };

        if ("sonidoId" in dato) {
            const id = dato.sonidoId === null || dato.sonidoId === "" ? null : Number(dato.sonidoId);
            if (id !== null && !ids.has(id)) {
                const error = new Error(`El sonido elegido para "${momento.nombre}" ya no existe.`);
                error.status = 400;
                throw error;
            }
            nuevo.sonidoId = id;
        }
        if ("volumen" in dato) nuevo.volumen = entero(dato.volumen, 0, 100, momento.volumen);

        guardado[clave] = nuevo;
    }

    await pool.query(
        `
        INSERT INTO config_juego (clave, valor, actualizado_en)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = CURRENT_TIMESTAMP
        `,
        [CLAVE, JSON.stringify(guardado)]
    );

    cache = null;
    return obtenerMomentos();
}

export function olvidarSonidos() {
    cache = null;
}
