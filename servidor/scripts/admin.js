/* =========================================================
   LUDOGAMIF · CREAR O PROMOVER UN ADMINISTRADOR
   ---------------------------------------------------------
   Lo usa ludogamif.sh (instalar y "admin"). Lee los datos
   de variables de entorno para que la contraseña no quede
   en el historial de la terminal:

     ADMIN_USUARIO=profe ADMIN_CLAVE=... ADMIN_CORREO=... npm run admin

   • Si el usuario ya existe → lo vuelve administrador
     (y si viene ADMIN_CLAVE, le cambia la contraseña).
   • Si no existe → lo crea como administrador.
========================================================= */

import bcrypt from "bcryptjs";

import { pool, closeDatabase } from "../src/database/db.js";
import { registerUser } from "../src/auth/authService.js";

const usuario = String(process.env.ADMIN_USUARIO || process.argv[2] || "").trim().toLowerCase();
const clave = String(process.env.ADMIN_CLAVE || "");
const correo = String(process.env.ADMIN_CORREO || "").trim().toLowerCase();

async function main() {
    if (!usuario) {
        throw new Error("Falta el usuario (ADMIN_USUARIO).");
    }

    const { rows } = await pool.query("SELECT id FROM users WHERE username = $1", [usuario]);

    if (rows.length > 0) {
        await pool.query("UPDATE users SET rol = 'admin' WHERE id = $1", [rows[0].id]);

        if (clave) {
            if (clave.length < 6) throw new Error("La contraseña debe tener mínimo 6 caracteres.");

            await pool.query(
                "UPDATE users SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                [rows[0].id, await bcrypt.hash(clave, 12)]
            );

            console.log(`✅ "${usuario}" ahora es administrador y su contraseña se cambió.`);
        } else {
            console.log(`✅ "${usuario}" ahora es administrador.`);
        }

        return;
    }

    if (!clave) {
        throw new Error(`El usuario "${usuario}" no existe. Para crearlo hace falta ADMIN_CLAVE.`);
    }

    const { user } = await registerUser({
        username: usuario,
        email: correo || `${usuario}@ludogamif.local`,
        password: clave,
    });

    await pool.query("UPDATE users SET rol = 'admin' WHERE id = $1", [user.id]);

    console.log(`✅ Administrador "${usuario}" creado.`);
}

try {
    await main();
    await closeDatabase();
    process.exit(0);
} catch (error) {
    console.error(`❌ ${error.message}`);
    await closeDatabase().catch(() => {});
    process.exit(1);
}
