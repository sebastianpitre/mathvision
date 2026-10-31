/* =========================================================
   PREGUNTAS DE INVASIÓNGAMIF
   ---------------------------------------------------------
   Salen de los bancos del panel (Niveles y preguntas), los
   mismos de Ludo Millonario, con su explicación.
     · nivelId: solo las de ese tema.
     · sin nivelId: mezcla de todos los temas activos.
   Si no hay ninguna, se inventan operaciones de matemáticas
   (para que el juego nunca se quede sin preguntas).
========================================================= */

import { pool } from "../../database/db.js";

const MAXIMO = 600;

function generadas(cantidad = 60) {
    const lista = [];
    for (let i = 0; i < cantidad; i++) {
        const a = 2 + Math.floor(Math.random() * 11);
        const b = 2 + Math.floor(Math.random() * 11);
        const suma = Math.random() < 0.5;
        const correcta = suma ? a + b : a * b;
        const opciones = new Set([correcta]);
        while (opciones.size < 4) {
            const desvio = Math.floor(Math.random() * 9) - 4 || 5;
            opciones.add(Math.max(0, correcta + desvio));
        }
        const textos = [...opciones].map(String);
        lista.push({
            id: `g${i}`,
            texto: suma ? `¿Cuánto es ${a} + ${b}?` : `¿Cuánto es ${a} × ${b}?`,
            opciones: textos,
            correcta: 0, // se mezclan al sacarla
            explicacion: suma
                ? `${a} + ${b}: a ${a} le sumas ${b} y llegas a ${correcta}.`
                : `${a} × ${b} es sumar ${a} veces el ${b}: ${correcta}.`,
        });
    }
    return lista;
}

export async function cargarPreguntas(nivelId = null) {
    const { rows } = await pool.query(
        `
        SELECT p.id, p.texto, p.opciones, p.respuesta_correcta, p.explicacion
        FROM preguntas p
        JOIN niveles_juego n ON n.id = p.nivel_id
        WHERE n.activo = TRUE
          AND n.juego = 'preguntas'
          AND ($1::int IS NULL OR n.id = $1)
        ORDER BY random()
        LIMIT ${MAXIMO}
        `,
        [nivelId || null]
    );

    const lista = rows
        .filter((r) => Array.isArray(r.opciones) && r.opciones.length >= 2 && r.opciones[r.respuesta_correcta] !== undefined)
        .map((r) => ({
            id: r.id,
            texto: r.texto,
            opciones: r.opciones.map(String),
            correcta: r.respuesta_correcta,
            explicacion: r.explicacion || null,
        }));

    return lista.length ? lista : generadas();
}

/* Temas que puede elegir el creador de la sala. */
export async function temasInvasion() {
    const { rows } = await pool.query(
        `
        SELECT n.id, n.nombre, n.grado, n.asignatura, COUNT(p.id)::int AS preguntas
        FROM niveles_juego n
        JOIN preguntas p ON p.nivel_id = n.id
        WHERE n.activo = TRUE AND n.juego = 'preguntas'
        GROUP BY n.id
        ORDER BY n.orden, n.grado, n.asignatura, n.id
        `
    );
    return rows;
}
