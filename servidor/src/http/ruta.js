/* =========================================================
   AYUDA PARA RUTAS ASÍNCRONAS
   ---------------------------------------------------------
   Envuelve una ruta para que cualquier error termine en una
   respuesta JSON clara en español, en vez de dejar la
   petición colgada o mostrar detalles internos.

   Un error con .status (400, 404, 409...) se muestra tal
   cual al jugador; cualquier otro es un 500 genérico y el
   detalle queda solo en los logs.
========================================================= */

export function ruta(manejador) {
    return async (req, res, next) => {
        try {
            await manejador(req, res, next);
        } catch (error) {
            const status = Number(error.status) || 500;

            if (status >= 500) {
                console.error(`❌ ${req.method} ${req.originalUrl}:`, error);
            }

            res.status(status).json({
                success: false,
                message:
                    status >= 500
                        ? "Ocurrió un error en el servidor. Intenta de nuevo."
                        : error.message,
                ...(status < 500 && error.errores ? { errores: error.errores } : {}),
            });
        }
    };
}

export function errorConEstado(mensaje, status = 400) {
    const error = new Error(mensaje);
    error.status = status;
    return error;
}
