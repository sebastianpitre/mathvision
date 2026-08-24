const questions = [

    // =====================================================
    // NIVEL 1
    // =====================================================

    {
        id: 1,
        difficulty: "easy",

        question:
            "¿Cuál es el resultado de 8 + 7?",

        options: [
            "13",
            "14",
            "15",
            "16"
        ],

        // 15 → tercera opción
        correctAnswer: 2,

        money: 1000
    },


    {
        id: 2,
        difficulty: "easy",

        question:
            "Si una caja contiene 6 lápices y tienes 4 cajas iguales, ¿cuántos lápices tienes en total?",

        options: [
            "10",
            "20",
            "24",
            "28"
        ],

        // 24 → tercera opción
        correctAnswer: 2,

        money: 2000
    },


    {
        id: 3,
        difficulty: "easy",

        question:
            "¿Cuál es el resultado de 36 ÷ 6?",

        options: [
            "5",
            "6",
            "7",
            "8"
        ],

        // 6 → segunda opción
        correctAnswer: 1,

        money: 5000
    },


    {
        id: 4,
        difficulty: "easy",

        question:
            "¿Cuánto es 9 × 7?",

        options: [
            "54",
            "56",
            "63",
            "72"
        ],

        // 63 → tercera opción
        correctAnswer: 2,

        money: 10000
    },


    {
        id: 5,
        difficulty: "easy",

        question:
            "Un estudiante tiene $20.000 y gasta $7.000. ¿Cuánto dinero le queda?",

        options: [
            "$11.000",
            "$12.000",
            "$13.000",
            "$14.000"
        ],

        // $13.000 → tercera opción
        correctAnswer: 2,

        money: 20000
    },


    // =====================================================
    // NIVEL 2
    // =====================================================

    {
        id: 6,
        difficulty: "medium",

        question:
            "¿Cuál es el resultado de 3 × (8 + 4)?",

        options: [
            "24",
            "32",
            "36",
            "40"
        ],

        // 36 → tercera opción
        correctAnswer: 2,

        money: 40000
    },


    {
        id: 7,
        difficulty: "medium",

        question:
            "Si x + 9 = 21, ¿cuál es el valor de x?",

        options: [
            "10",
            "11",
            "12",
            "13"
        ],

        // 12 → tercera opción
        correctAnswer: 2,

        money: 80000
    },


    {
        id: 8,
        difficulty: "medium",

        question:
            "¿Cuál es el perímetro de un cuadrado cuyos lados miden 6 cm?",

        options: [
            "12 cm",
            "18 cm",
            "24 cm",
            "36 cm"
        ],

        // 24 cm → tercera opción
        correctAnswer: 2,

        money: 160000
    },


    {
        id: 9,
        difficulty: "medium",

        question:
            "¿Cuál es el 25% de 80?",

        options: [
            "15",
            "20",
            "25",
            "30"
        ],

        // 20 → segunda opción
        correctAnswer: 1,

        money: 320000
    },


    {
        id: 10,
        difficulty: "medium",

        question:
            "Una pizza está dividida en 8 partes iguales. Si comes 3 partes, ¿qué fracción representa la cantidad que comiste?",

        options: [
            "3/5",
            "3/8",
            "5/8",
            "1/3"
        ],

        // 3/8 → segunda opción
        correctAnswer: 1,

        money: 1000000
    },


    // =====================================================
    // PREGUNTAS EXTRA
    // =====================================================

    {
        id: 11,
        difficulty: "medium",

        question:
            "Si 4x = 36, ¿cuál es el valor de x?",

        options: [
            "7",
            "8",
            "9",
            "10"
        ],

        // 9 → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 12,
        difficulty: "medium",

        question:
            "¿Cuál es el área de un rectángulo que mide 8 cm de largo y 5 cm de ancho?",

        options: [
            "13 cm²",
            "26 cm²",
            "40 cm²",
            "80 cm²"
        ],

        // 40 cm² → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 13,
        difficulty: "medium",

        question:
            "¿Cuál de los siguientes números es primo?",

        options: [
            "21",
            "27",
            "29",
            "33"
        ],

        // 29 → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 14,
        difficulty: "medium",

        question:
            "Una camisa cuesta $80.000 y tiene un descuento del 10%. ¿Cuál es su precio final?",

        options: [
            "$70.000",
            "$72.000",
            "$74.000",
            "$78.000"
        ],

        // $72.000 → segunda opción
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 15,
        difficulty: "medium",

        question:
            "¿Cuál es el resultado de 2³ + 4?",

        options: [
            "10",
            "12",
            "16",
            "20"
        ],

        // 12 → segunda opción
        correctAnswer: 1,

        money: 1000000
    },


    // =====================================================
    // NIVEL 4
    // =====================================================

    {
        id: 16,
        difficulty: "hard",

        question:
            "Si 2x + 6 = 18, ¿cuál es el valor de x?",

        options: [
            "4",
            "5",
            "6",
            "7"
        ],

        // 6 → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 17,
        difficulty: "hard",

        question:
            "¿Cuál es la media aritmética de 8, 10, 12 y 14?",

        options: [
            "10",
            "11",
            "12",
            "13"
        ],

        // 11 → segunda opción
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 18,
        difficulty: "hard",

        question:
            "Un automóvil recorre 240 km en 4 horas. Manteniendo la misma velocidad, ¿cuántos kilómetros recorrerá en 7 horas?",

        options: [
            "360 km",
            "400 km",
            "420 km",
            "480 km"
        ],

        // 420 km → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 19,
        difficulty: "hard",

        question:
            "¿Cuál es el resultado de 5² - 3²?",

        options: [
            "12",
            "14",
            "16",
            "18"
        ],

        // 16 → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 20,
        difficulty: "hard",

        question:
            "Si una cantidad aumenta de 200 a 250, ¿qué porcentaje aumentó?",

        options: [
            "20%",
            "25%",
            "30%",
            "35%"
        ],

        // 25% → segunda opción
        correctAnswer: 1,

        money: 1000000
    },


    // =====================================================
    // NIVEL 5
    // =====================================================

    {
        id: 21,
        difficulty: "hard",

        question:
            "Si 3x - 5 = 16, ¿cuál es el valor de x?",

        options: [
            "5",
            "6",
            "7",
            "8"
        ],

        // 7 → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 22,
        difficulty: "hard",

        question:
            "¿Cuál es la raíz cuadrada de 144?",

        options: [
            "10",
            "11",
            "12",
            "14"
        ],

        // 12 → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 23,
        difficulty: "hard",

        question:
            "Un triángulo tiene ángulos de 50° y 60°. ¿Cuánto mide el tercer ángulo?",

        options: [
            "60°",
            "70°",
            "80°",
            "90°"
        ],

        // 70° → segunda opción
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 24,
        difficulty: "hard",

        question:
            "Si una tienda aumenta el precio de un producto de $50.000 a $60.000, ¿cuál fue el porcentaje de aumento?",

        options: [
            "10%",
            "15%",
            "20%",
            "25%"
        ],

        // 20% → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 25,
        difficulty: "hard",

        question:
            "¿Cuál es el resultado de (18 ÷ 3) + (4 × 5)?",

        options: [
            "24",
            "26",
            "28",
            "30"
        ],

        // 26 → segunda opción
        correctAnswer: 1,

        money: 1000000
    },


    // =====================================================
    // NIVEL 6
    // =====================================================

    {
        id: 26,
        difficulty: "expert",

        question:
            "Si 5x + 10 = 45, ¿cuál es el valor de x?",

        options: [
            "5",
            "6",
            "7",
            "8"
        ],

        // 7 → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 27,
        difficulty: "expert",

        question:
            "¿Cuál es el área de un círculo de radio 5 cm usando π ≈ 3,14?",

        options: [
            "31,4 cm²",
            "62,8 cm²",
            "78,5 cm²",
            "100 cm²"
        ],

        // 78,5 cm² → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 28,
        difficulty: "expert",

        question:
            "Si una secuencia comienza 3, 6, 12, 24..., ¿cuál es el siguiente número?",

        options: [
            "36",
            "42",
            "48",
            "54"
        ],

        // 48 → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 29,
        difficulty: "expert",

        question:
            "Si x/4 = 9, ¿cuál es el valor de x?",

        options: [
            "27",
            "32",
            "36",
            "40"
        ],

        // 36 → tercera opción
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 30,
        difficulty: "expert",

        question:
            "Un número multiplicado por 3 y luego aumentado en 8 da como resultado 29. ¿Cuál es el número?",

        options: [
            "5",
            "6",
            "7",
            "8"
        ],

        // 7 → tercera opción
        correctAnswer: 2,

        money: 1000000
    }

];

export default questions;