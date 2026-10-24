import { pool } from "../database/db.js";
import { estaBloqueado, MENSAJE_BLOQUEADO } from "./bloqueo.js";
import {
    verifyToken
} from "./authService.js";


export function requireAuth(
    req,
    res,
    next
) {

    try {

        const header =
            req.headers.authorization;


        if (!header) {

            return res.status(401).json({
                success: false,
                message:
                    "No estás autenticado.",
            });

        }


        const [
            type,
            token
        ] =
            header.split(" ");


        if (
            type !== "Bearer" ||
            !token
        ) {

            return res.status(401).json({
                success: false,
                message:
                    "Token inválido.",
            });

        }


        const decoded =
            verifyToken(
                token
            );


        req.user =
            decoded;


        // Cuenta bloqueada desde el panel: no puede usar la API.
        estaBloqueado(decoded.userId)
            .then((bloqueado) => {
                if (bloqueado) {
                    return res.status(403).json({ success: false, bloqueado: true, message: MENSAJE_BLOQUEADO });
                }
                next();
            })
            .catch(next);

    } catch {

        return res.status(401).json({
            success: false,
            message:
                "La sesión no es válida o expiró.",
        });

    }

}

/*
 * Solo administradores. El rol se lee de la base en cada
 * petición (no del token), así quitarle el rol a alguien
 * tiene efecto inmediato.
 */
export function requireAdmin(req, res, next) {

    requireAuth(req, res, async () => {

        try {

            const { rows } = await pool.query(
                "SELECT rol FROM users WHERE id = $1",
                [req.user.userId]
            );

            if (rows[0]?.rol !== "admin") {
                return res.status(403).json({
                    success: false,
                    message: "Esta sección es solo para administradores.",
                });
            }

            next();

        } catch (error) {

            console.error("❌ Verificando administrador:", error);

            res.status(500).json({
                success: false,
                message: "No se pudo verificar el permiso.",
            });

        }

    });

}
