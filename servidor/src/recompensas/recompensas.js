/* =========================================================
   RECOMPENSAS (las usan eventos y temporadas)
   ---------------------------------------------------------
   Un paquete de recompensa puede traer cualquier mezcla de:
     oro, diamantes, tickets 🎫, un personaje, una foto de
     perfil y un marco.
   Aquí se limpia lo que manda el panel, se busca el nombre
   y la imagen de cada cosa y se entrega al jugador.
========================================================= */

import { pool } from "../database/db.js";
import { entregarRecompensa } from "../progreso/progreso.js";
import { entregarCosmetico } from "../perfiles/cosmeticos.js";

const tope = (v, max) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));

/* Deja solo campos válidos (no revisa si existen en la base). */
export function limpiarRecompensa(r = {}) {
    return {
        oro: tope(r.oro, 1000000),
        diamantes: tope(r.diamantes, 100000),
        tickets: tope(r.tickets, 10000),
        personaje_id: r.personaje_id ? String(r.personaje_id) : null,
        foto_id: r.foto_id ? Number(r.foto_id) || null : null,
        marco_id: r.marco_id ? Number(r.marco_id) || null : null,
    };
}

export const recompensaVacia = (r) =>
    !(r.oro || r.diamantes || r.tickets || r.personaje_id || r.foto_id || r.marco_id);

/* Revisa que el personaje, la foto y el marco existan. Lanza un error con el texto que se le pasa. */
export async function validarRecompensas(lista, error) {
    const { rows: personajes } = await pool.query("SELECT id FROM characters");
    const { rows: cosmeticos } = await pool.query("SELECT id, tipo FROM cosmeticos");
    const hayPersonaje = new Set(personajes.map((p) => p.id));
    const tipo = new Map(cosmeticos.map((c) => [c.id, c.tipo]));
    for (const [nombre, r] of lista) {
        if (r.personaje_id && !hayPersonaje.has(r.personaje_id)) throw error(`${nombre}: ese personaje no existe.`);
        if (r.foto_id && tipo.get(r.foto_id) !== "foto") throw error(`${nombre}: esa foto no existe.`);
        if (r.marco_id && tipo.get(r.marco_id) !== "marco") throw error(`${nombre}: ese marco no existe.`);
    }
}

/* Devuelve una función que, a cada recompensa, le agrega nombre e imagen de lo que trae. */
export async function detallador(recompensas) {
    const personajes = new Set();
    const cosmeticos = new Set();
    for (const r of recompensas) {
        if (r?.personaje_id) personajes.add(r.personaje_id);
        if (r?.foto_id) cosmeticos.add(Number(r.foto_id));
        if (r?.marco_id) cosmeticos.add(Number(r.marco_id));
    }
    const [{ rows: ps }, { rows: cs }] = await Promise.all([
        pool.query("SELECT id, name, thumbnail_path FROM characters WHERE id = ANY($1)", [[...personajes]]),
        pool.query("SELECT id, nombre, ruta, tipo FROM cosmeticos WHERE id = ANY($1)", [[...cosmeticos]]),
    ]);
    const p = new Map(ps.map((x) => [x.id, x]));
    const c = new Map(cs.map((x) => [x.id, x]));
    const cosmetico = (id) => {
        const x = id && c.get(Number(id));
        return x ? { id: Number(id), nombre: x.nombre, ruta: x.ruta } : null;
    };
    return (r = {}) => {
        const per = r.personaje_id && p.get(r.personaje_id);
        return {
            oro: Number(r.oro) || 0,
            diamantes: Number(r.diamantes) || 0,
            tickets: Number(r.tickets) || 0,
            personaje: per ? { id: r.personaje_id, nombre: per.name, foto: per.thumbnail_path } : null,
            foto: cosmetico(r.foto_id),
            marco: cosmetico(r.marco_id),
        };
    };
}

/*
 * Entrega un paquete dentro de una transacción.
 * origen: texto que queda guardado (ej. "evento:4", "temporada:2").
 * Si ya tenía el personaje, la foto o el marco, no se repite.
 */
export async function entregarPaquete(client, userId, r = {}, { origen, monedaPersonaje }) {
    const entregado = { oro: 0, diamantes: 0, tickets: 0, personaje: null, foto: false, marco: false };
    if (Number(r.tickets) > 0) {
        await client.query("UPDATE player_profiles SET tickets = tickets + $2 WHERE user_id = $1", [userId, Number(r.tickets)]);
        entregado.tickets = Number(r.tickets);
    }
    if (Number(r.oro) > 0 || Number(r.diamantes) > 0) {
        await entregarRecompensa(client, userId, { oro: Number(r.oro) || 0, diamantes: Number(r.diamantes) || 0 });
        entregado.oro = Number(r.oro) || 0;
        entregado.diamantes = Number(r.diamantes) || 0;
    }
    if (r.personaje_id) {
        const { rowCount } = await client.query(
            `
            INSERT INTO personajes_jugador (user_id, character_id, moneda)
            SELECT $1, id, $3 FROM characters WHERE id = $2
            ON CONFLICT DO NOTHING
            `,
            [userId, r.personaje_id, monedaPersonaje]
        );
        entregado.personaje = rowCount > 0 ? r.personaje_id : null;
    }
    if (r.foto_id) entregado.foto = await entregarCosmetico(client, userId, Number(r.foto_id), origen);
    if (r.marco_id) entregado.marco = await entregarCosmetico(client, userId, Number(r.marco_id), origen);
    return entregado;
}
