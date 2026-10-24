/* =========================================================
   CUENTAS BLOQUEADAS
   El administrador puede bloquear una cuenta desde el panel:
   no puede iniciar sesión, usar la API ni conectarse a las
   salas. Se consulta la base con una caché corta para no
   preguntar en cada petición.
========================================================= */

import { pool } from "../database/db.js";

const CACHE_MS = 30_000;
const cache = new Map(); // userId → { bloqueado, en }

export const MENSAJE_BLOQUEADO = "Tu cuenta está bloqueada. Habla con tu profesor.";

export async function estaBloqueado(userId) {
    const id = Number(userId);
    const guardado = cache.get(id);
    if (guardado && Date.now() - guardado.en < CACHE_MS) return guardado.bloqueado;

    const { rows } = await pool.query("SELECT bloqueado FROM users WHERE id = $1", [id]);
    const bloqueado = Boolean(rows[0]?.bloqueado);
    cache.set(id, { bloqueado, en: Date.now() });
    return bloqueado;
}

/* Al cambiar el bloqueo desde el panel se aplica enseguida. */
export function olvidarBloqueo(userId) {
    cache.delete(Number(userId));
}
