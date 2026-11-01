/* =========================================================
   MENSAJES DEL MUNDO · FILTRO
   Corto, sin enlaces y con las groserías tapadas (***).
   Los mensajes no se guardan: solo se limpian y se reenvían.
========================================================= */

const MAX = 80;

// Palabras completas que se tapan…
const EXACTAS = ["hp", "hpta", "hdp", "ptm", "puta", "puto", "putas", "putos", "perra", "perras", "culo", "culos", "pene", "verga", "berga",
    "polla", "coño", "zorra", "sapa", "marica", "maricas", "marik", "mk", "porno", "sexo", "chimba", "idiota", "idiotas"];
// …y palabras que EMPIEZAN así (también con letras repetidas o números: "p3rra", "hijueputaaa").
const RAICES = ["hijueput", "hijoeput", "hijodeput", "gonorr", "malparid", "maricon", "mierd", "carechimb", "pendej", "imbecil", "estupid",
    "huevon", "guevon", "culia", "cabron", "pirob", "careverg", "mamaguev", "mamahuev", "follar", "vagin", "violar", "putic", "triplehp", "jueputa"];

const sinTildes = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s" };

function normal(palabra) {
    return sinTildes(palabra.toLowerCase())
        .replace(/[013457@$]/g, (c) => LEET[c] || c)
        .replace(/[^a-zñ]/g, "")
        .replace(/(.)\1{2,}/g, "$1$1") // "perrrraaa" → "perraa"
        .replace(/(.)\1+$/, "$1"); // "perraa" → "perra"
}

const exactas = new Set(EXACTAS.map(normal));
const raices = RAICES.map(normal);

function esGroseria(palabra) {
    const n = normal(palabra);
    if (!n) return false;
    return exactas.has(n) || raices.some((r) => n.startsWith(r));
}

export function limpiarMensaje(texto) {
    let t = String(texto ?? "")
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX);
    if (!t) return "";
    // Nada de enlaces ni teléfonos (para cuidar a los estudiantes).
    t = t.replace(/\b(https?:\/\/|www\.)\S+/gi, "***").replace(/\b\S+\.(com|net|org|co|ly|gg|io|me)\b\S*/gi, "***");
    t = t.replace(/(\+?\d[\d\s-]{6,}\d)/g, "***");
    return t
        .split(/(\s+)/)
        .map((p) => (p.trim() && esGroseria(p) ? "*".repeat(Math.min(6, p.length)) : p))
        .join("");
}
