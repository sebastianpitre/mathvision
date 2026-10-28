/* Fechas para los <input type="datetime-local"> del panel
   (en la hora del computador del administrador). */
export function aEntrada(valor) {
    if (!valor) return "";
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return "";
    const dos = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

export function deEntrada(texto) {
    if (!texto) return null;
    const d = new Date(texto);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const fechaLarga = (v) =>
    v ? new Date(v).toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
