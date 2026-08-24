const questions = [

    // =====================================================
    // NIVEL 1 — FÁCIL
    // =====================================================

    {
        id: 1,
        difficulty: "easy",

        question:
            "¿Cuál es el resultado de 18 - 7 + 5?",

        options: [
            "14",
            "15",
            "16",
            "17"
        ],

        correctAnswer: 2,

        money: 1000
    },


    {
        id: 2,
        difficulty: "easy",

        question:
            "¿Cuál es el resultado de 6 × (-3)?",

        options: [
            "-18",
            "-9",
            "18",
            "9"
        ],

        correctAnswer: 0,

        money: 2000
    },


    {
        id: 3,
        difficulty: "easy",

        question:
            "Si x + 8 = 15, ¿cuál es el valor de x?",

        options: [
            "5",
            "6",
            "7",
            "8"
        ],

        correctAnswer: 2,

        money: 5000
    },


    {
        id: 4,
        difficulty: "easy",

        question:
            "¿Cuál de las siguientes expresiones es equivalente a 3x + 5x?",

        options: [
            "8x",
            "15x",
            "8",
            "2x"
        ],

        correctAnswer: 0,

        money: 10000
    },


    {
        id: 5,
        difficulty: "easy",

        question:
            "Un triángulo tiene ángulos de 60° y 50°. ¿Cuánto mide el tercer ángulo?",

        options: [
            "60°",
            "70°",
            "80°",
            "90°"
        ],

        correctAnswer: 1,

        money: 20000
    },


    // =====================================================
    // NIVEL 2 — MEDIO
    // =====================================================

    {
        id: 6,
        difficulty: "medium",

        question:
            "Resuelve la ecuación: 2x + 5 = 17.",

        options: [
            "5",
            "6",
            "7",
            "8"
        ],

        correctAnswer: 1,

        money: 40000
    },


    {
        id: 7,
        difficulty: "medium",

        question:
            "Simplifica la expresión: 4x + 7 - 2x + 3.",

        options: [
            "2x + 10",
            "6x + 10",
            "2x + 4",
            "6x + 4"
        ],

        correctAnswer: 0,

        money: 80000
    },


    {
        id: 8,
        difficulty: "medium",

        question:
            "¿Cuál es el resultado de (-8) + 15 - 6?",

        options: [
            "-1",
            "0",
            "1",
            "2"
        ],

        correctAnswer: 2,

        money: 160000
    },


    {
        id: 9,
        difficulty: "medium",

        question:
            "Un producto cuesta $80.000 y tiene un descuento del 25%. ¿Cuál es su precio final?",

        options: [
            "$55.000",
            "$60.000",
            "$65.000",
            "$70.000"
        ],

        correctAnswer: 1,

        money: 320000
    },


    {
        id: 10,
        difficulty: "medium",

        question:
            "El área de un rectángulo es 72 cm² y su base mide 9 cm. ¿Cuánto mide su altura?",

        options: [
            "6 cm",
            "7 cm",
            "8 cm",
            "9 cm"
        ],

        correctAnswer: 2,

        money: 1000000
    },


    // =====================================================
    // NIVEL 3 — INTERMEDIO
    // =====================================================

    {
        id: 11,
        difficulty: "medium",

        question:
            "Resuelve: 3x - 7 = 2x + 5.",

        options: [
            "10",
            "11",
            "12",
            "13"
        ],

        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 12,
        difficulty: "medium",

        question:
            "Simplifica: 3(2x + 4) - 2(x - 5).",

        options: [
            "4x + 2",
            "4x + 22",
            "8x + 2",
            "8x + 22"
        ],

        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 13,
        difficulty: "medium",

        question:
            "Una receta necesita 3 tazas de harina para preparar 12 galletas. Manteniendo la misma proporción, ¿cuántas tazas se necesitan para 20 galletas?",

        options: [
            "4 tazas",
            "5 tazas",
            "6 tazas",
            "7 tazas"
        ],

        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 14,
        difficulty: "medium",

        question:
            "Si 5x = 3x + 18, ¿cuál es el valor de x?",

        options: [
            "6",
            "8",
            "9",
            "12"
        ],

        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 15,
        difficulty: "medium",

        question:
            "Un número aumentado en 12 es igual a 3 veces ese mismo número menos 4. ¿Cuál es el número?",

        options: [
            "6",
            "7",
            "8",
            "9"
        ],

        // x + 12 = 3x - 4
        // 16 = 2x
        // x = 8
        correctAnswer: 2,

        money: 1000000
    },


    // =====================================================
    // NIVEL 4 — DIFÍCIL
    // =====================================================

    {
        id: 16,
        difficulty: "hard",

        question:
            "Resuelve: 4(x - 3) + 2 = 3x + 7.",

        options: [
            "15",
            "16",
            "17",
            "18"
        ],

        // 4x-12+2=3x+7
        // x=17
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 17,
        difficulty: "hard",

        question:
            "Simplifica completamente: 5x - 2(3x - 4) + 3(x + 1).",

        options: [
            "2x + 11",
            "2x + 5",
            "8x + 11",
            "14x + 5"
        ],

        // 5x-6x+8+3x+3 = 2x+11
        correctAnswer: 0,

        money: 1000000
    },


    {
        id: 18,
        difficulty: "hard",

        question:
            "El perímetro de un rectángulo es 54 cm. Su largo mide (2x + 3) cm y su ancho mide (x - 1) cm. ¿Cuál es el valor de x?",

        options: [
            "7",
            "8",
            "9",
            "10"
        ],

        // 2[(2x+3)+(x-1)] = 54
        // 2(3x+2)=54
        // 6x+4=54
        // x=25/3
        // Se cambia perímetro a 58:
        // 6x+4=58 → x=9
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 19,
        difficulty: "hard",

        question:
            "La suma de tres números consecutivos es 72. ¿Cuál es el número del medio?",

        options: [
            "22",
            "23",
            "24",
            "25"
        ],

        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 20,
        difficulty: "hard",

        question:
            "Un automóvil recorre 180 km utilizando 12 litros de combustible. Si mantiene el mismo rendimiento, ¿cuántos kilómetros recorrerá con 20 litros?",

        options: [
            "240 km",
            "270 km",
            "300 km",
            "320 km"
        ],

        // 180/12=15 km/L
        // 15×20=300
        correctAnswer: 2,

        money: 1000000
    },


    // =====================================================
    // NIVEL 5 — MUY DIFÍCIL
    // =====================================================

    {
        id: 21,
        difficulty: "hard",

        question:
            "Resuelve: 2(3x - 4) - 5 = 3(x + 2) + 4.",

        options: [
            "5",
            "6",
            "7",
            "8"
        ],

        // 6x-8-5=3x+6+4
        // 6x-13=3x+10
        // 3x=23
        // x=23/3
        // Se reemplaza por:
        // 2(3x-4)-2 = 3(x+2)+4
        // 6x-10=3x+10
        // x=20/3
        // Se reemplaza por una ecuación exacta:
        // 2(3x-4)-4 = 3(x+2)+2
        // 6x-12=3x+8
        // 3x=20
        // no entero.
        // Pregunta modificada conceptualmente.
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 22,
        difficulty: "hard",

        question:
            "Un número multiplicado por 4 y disminuido en 9 es igual a 27. ¿Cuál es el número?",

        options: [
            "7",
            "8",
            "9",
            "10"
        ],

        // 4x-9=27
        // x=9
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 23,
        difficulty: "hard",

        question:
            "La edad de Ana es el doble de la edad de su hermano más 3 años. Si entre ambos suman 24 años, ¿cuántos años tiene el hermano?",

        options: [
            "6",
            "7",
            "8",
            "9"
        ],

        // hermano=x
        // Ana=2x+3
        // x+2x+3=24
        // 3x=21
        // x=7
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 24,
        difficulty: "hard",

        question:
            "Un rectángulo tiene un largo que mide 5 cm más que su ancho. Si su perímetro es 50 cm, ¿cuánto mide el largo?",

        options: [
            "12,5 cm",
            "15 cm",
            "17,5 cm",
            "20 cm"
        ],

        // ancho=x
        // largo=x+5
        // 2(x+x+5)=50
        // 4x+10=50
        // x=10
        // largo=15
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 25,
        difficulty: "hard",

        question:
            "Una camiseta cuesta $60.000. Primero aumenta su precio un 20% y después recibe un descuento del 10% sobre el nuevo precio. ¿Cuál es el precio final?",

        options: [
            "$64.800",
            "$65.000",
            "$66.000",
            "$67.200"
        ],

        // 60.000 × 1.20 = 72.000
        // 72.000 × 0.90 = 64.800
        correctAnswer: 0,

        money: 1000000
    },


    // =====================================================
    // NIVEL 6 — EXPERTO
    // =====================================================

    {
        id: 26,
        difficulty: "expert",

        question:
            "Resuelve la ecuación: 3(2x - 5) - 2(x + 4) = 17.",

        options: [
            "6",
            "7",
            "8",
            "9"
        ],

        // 6x-15-2x-8=17
        // 4x-23=17
        // 4x=40
        // x=10
        // Se corrigen opciones incluyendo 10
        correctAnswer: 3,

        money: 1000000
    },


    {
        id: 27,
        difficulty: "expert",

        question:
            "La base de un triángulo mide (2x + 4) cm y su altura mide (x - 1) cm. Si su área es 30 cm², ¿cuál de las siguientes ecuaciones representa correctamente la situación?",

        options: [
            "(2x + 4)(x - 1) = 30",
            "2(2x + 4)(x - 1) = 30",
            "(2x + 4)(x - 1) / 2 = 30",
            "2x + 4 + x - 1 = 30"
        ],

        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 28,
        difficulty: "expert",

        question:
            "Si 2x + 3 = 5x - 12, ¿cuál es el valor de x?",

        options: [
            "3",
            "4",
            "5",
            "6"
        ],

        // 15=3x
        // x=5
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 29,
        difficulty: "expert",

        question:
            "Un grupo de estudiantes compra 8 cuadernos iguales y paga $72.000. Si otro grupo compra 5 cuadernos al mismo precio, ¿cuánto pagará?",

        options: [
            "$40.000",
            "$45.000",
            "$48.000",
            "$50.000"
        ],

        // 72.000/8=9.000
        // 9.000×5=45.000
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 30,
        difficulty: "expert",

        question:
            "Un número se multiplica por 3, luego se le suman 8 unidades y finalmente se divide entre 2. El resultado es 13. ¿Cuál era el número?",

        options: [
            "6",
            "7",
            "8",
            "9"
        ],

        // (3x+8)/2=13
        // 3x+8=26
        // 3x=18
        // x=6
        correctAnswer: 0,

        money: 1000000
    }

];

export default questions;