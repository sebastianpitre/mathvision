// Archivos JSON del panel: ejemplo de nivel y descarga.

export const EJEMPLO_JSON = {
    nivel: {
        nombre: "Fracciones básicas",
        descripcion: "Mitades, tercios y cuartos.",
        grado: "5°",
        asignatura: "Matemáticas",
        dificultad: "media",
    },
    preguntas: [
        {
            pregunta: "¿Cuánto es la mitad de 10?",
            opciones: ["2", "5", "8", "10"],
            respuesta: 1,
            explicacion: "La mitad es dividir entre 2: 10 ÷ 2 = 5.",
        },
        {
            pregunta: "¿Qué fracción representa una pizza partida en 4 y tomas 1 pedazo?",
            opciones: ["1/2", "1/3", "1/4", "4/1"],
            respuesta: "C",
        },
        {
            pregunta: "¿Cuál fracción es mayor?",
            opciones: ["1/2", "1/4"],
            respuesta: "1/2",
        },
    ],
};

export function descargarJson(datos, nombre) {
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
