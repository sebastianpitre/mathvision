/* =========================================================
   LÍMITE DE INTENTOS FALLIDOS (login y registro)
   ---------------------------------------------------------
   Frena a quien intente adivinar contraseñas. Solo cuenta
   los intentos que FALLAN y lo hace por IP + usuario, así
   un salón entero conectado desde la misma red del colegio
   puede entrar a la vez sin bloquearse entre ellos.
========================================================= */

export function limitarIntentos({ maximo = 15, minutos = 15 } = {}) {
    const ventana = minutos * 60 * 1000;
    const intentos = new Map();

    // Limpieza periódica para no acumular memoria.
    setInterval(() => {
        const ahora = Date.now();
        for (const [clave, registro] of intentos) {
            if (registro.hasta < ahora) intentos.delete(clave);
        }
    }, ventana).unref();

    return (req, res, next) => {
        const usuario = String(req.body?.username || "").trim().toLowerCase().slice(0, 60);
        const clave = `${req.ip}|${usuario}`;
        const ahora = Date.now();

        const registro = intentos.get(clave);

        if (registro && registro.hasta > ahora && registro.fallos >= maximo) {
            const espera = Math.ceil((registro.hasta - ahora) / 60000);

            return res.status(429).json({
                success: false,
                message: `Demasiados intentos fallidos. Espera ${espera} minuto(s) e intenta de nuevo.`,
            });
        }

        res.on("finish", () => {
            if (res.statusCode < 400 || res.statusCode === 429) return;

            const actual = intentos.get(clave);

            if (!actual || actual.hasta < Date.now()) {
                intentos.set(clave, { fallos: 1, hasta: Date.now() + ventana });
            } else {
                actual.fallos += 1;
            }
        });

        next();
    };
}
