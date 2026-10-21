import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { pool } from "../database/db.js";
import { config } from "../config/env.js";
import { getUserProfile } from "../users/userService.js";

const JWT_SECRET =
    config.JWT_SECRET;


function createToken(user) {

    return jwt.sign(
        {
            userId: user.id,
            username: user.username,
        },
        JWT_SECRET,
        {
            expiresIn: "30d",
        }
    );
}


// =====================================================
// REGISTRAR USUARIO
// =====================================================

export async function registerUser({
    username,
    email,
    password,
}) {

    const cleanUsername =
        String(username || "")
            .trim()
            .toLowerCase();

    const cleanEmail =
        String(email || "")
            .trim()
            .toLowerCase();

    const cleanPassword =
        String(password || "");


    if (
        !cleanUsername ||
        !cleanEmail ||
        !cleanPassword
    ) {

        throw new Error(
            "Todos los campos son obligatorios."
        );

    }


    if (
        cleanUsername.length < 3 ||
        cleanUsername.length > 30
    ) {

        throw new Error(
            "El usuario debe tener entre 3 y 30 caracteres."
        );

    }


    if (cleanPassword.length < 6) {

        throw new Error(
            "La contraseña debe tener mínimo 6 caracteres."
        );

    }


    const existing =
        await pool.query(
            `
            SELECT id
            FROM users
            WHERE username = $1
               OR email = $2
            LIMIT 1
            `,
            [
                cleanUsername,
                cleanEmail,
            ]
        );


    if (existing.rows.length > 0) {

        throw new Error(
            "El usuario o correo ya está registrado."
        );

    }


    const passwordHash =
        await bcrypt.hash(
            cleanPassword,
            12
        );


    const client =
        await pool.connect();


    try {

        await client.query(
            "BEGIN"
        );


        const userResult =
            await client.query(
                `
                INSERT INTO users (
                    username,
                    email,
                    password_hash
                )
                VALUES ($1, $2, $3)
                RETURNING id, username, email
                `,
                [
                    cleanUsername,
                    cleanEmail,
                    passwordHash,
                ]
            );


        const user =
            userResult.rows[0];


        await client.query(
            `
            INSERT INTO player_profiles (
                user_id,
                display_name,
                character_id
            )
            VALUES ($1, $2, 'adan')
            `,
            [
                user.id,
                cleanUsername,
            ]
        );


        await client.query(
            `
            INSERT INTO player_stats (
                user_id
            )
            VALUES ($1)
            `,
            [
                user.id,
            ]
        );


        await client.query(
            `
            INSERT INTO player_settings (
                user_id
            )
            VALUES ($1)
            `,
            [
                user.id,
            ]
        );


        await client.query(
            "COMMIT"
        );


        const profile =
            await getUserProfile(
                user.id
            );


        const token =
            createToken(user);


        return {
            token,
            user: profile,
        };

    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        throw error;

    } finally {

        client.release();

    }

}


// =====================================================
// LOGIN
// =====================================================

export async function loginUser(
    username,
    password
) {

    const cleanUsername =
        String(username || "")
            .trim()
            .toLowerCase();


    const result =
        await pool.query(
            `
            SELECT
                id,
                username,
                email,
                password_hash
            FROM users
            WHERE username = $1
               OR email = $1
            LIMIT 1
            `,
            [
                cleanUsername,
            ]
        );


    if (
        result.rows.length === 0
    ) {

        throw new Error(
            "Usuario o contraseña incorrectos."
        );

    }


    const user =
        result.rows[0];


    const passwordCorrect =
        await bcrypt.compare(
            String(password || ""),
            user.password_hash
        );


    if (!passwordCorrect) {

        throw new Error(
            "Usuario o contraseña incorrectos."
        );

    }


    await pool.query(
        `
        UPDATE users
        SET last_login = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [
            user.id,
        ]
    );


    const profile =
        await getUserProfile(
            user.id
        );


    const token =
        createToken(user);


    return {
        token,
        user: profile,
    };

}


// =====================================================
// TOKEN
// =====================================================

export function verifyToken(
    token
) {

    return jwt.verify(
        token,
        JWT_SECRET
    );

}