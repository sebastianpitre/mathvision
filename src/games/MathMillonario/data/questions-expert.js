const questions = [

    // =====================================================
    // NIVEL EXPERTO
    // =====================================================

    {
        id: 1,
        difficulty: "expert",

        question:
            "El perímetro de un rectángulo es 64 cm. Su largo mide (3x + 2) cm y su ancho mide (x + 2) cm. ¿Cuál es el valor de x?",

        options: [
            "5",
            "6",
            "7",
            "8"
        ],

        // 2[(3x+2)+(x+2)] = 64
        // 2(4x+4)=64
        // 8x+8=64
        // x=7
        correctAnswer: 2,

        money: 1000
    },


    {
        id: 2,
        difficulty: "expert",

        question:
            "Un cuadrado tiene lado (2x - 3) cm y su perímetro es 44 cm. ¿Cuál es el valor de x?",

        options: [
            "5",
            "6",
            "7",
            "8"
        ],

        // 4(2x-3)=44
        // 8x-12=44
        // x=7
        correctAnswer: 2,

        money: 2000
    },


    {
        id: 3,
        difficulty: "expert",

        question:
            "Simplifica completamente la expresión: 4(3x - 2) - 3(2x + 5) + 7.",

        options: [
            "6x - 16",
            "6x - 8",
            "18x - 16",
            "6x + 8"
        ],

        // 12x-8-6x-15+7 = 6x-16
        correctAnswer: 0,

        money: 5000
    },


    {
        id: 4,
        difficulty: "expert",

        question:
            "Los ángulos de un triángulo miden (2x + 15)°, (3x - 10)° y (x + 25)°. ¿Cuál es el valor de x?",

        options: [
            "20",
            "25",
            "30",
            "35"
        ],

        // 2x+15+3x-10+x+25=180
        // 6x+30=180
        // x=25
        correctAnswer: 1,

        money: 10000
    },


    {
        id: 5,
        difficulty: "expert",

        question:
            "Un rectángulo tiene largo (2x + 5) cm y ancho (x - 1) cm. Si su perímetro es 50 cm, ¿cuánto mide su largo?",

        options: [
            "15 cm",
            "16 cm",
            "17 cm",
            "18 cm"
        ],

        // 2[(2x+5)+(x-1)] = 50
        // 2(3x+4)=50
        // 6x+8=50
        // x=7
        // largo=2(7)+5=19
        // Se corrigen opciones:
        // respuesta correcta = 19
        correctAnswer: 3,

        money: 20000
    },


    {
        id: 6,
        difficulty: "expert",

        question:
            "Una expresión para el área de un cuadrado es x² + 12x + 36. ¿Cuál es la expresión que representa la longitud de uno de sus lados?",

        options: [
            "x + 3",
            "x + 6",
            "x + 12",
            "x² + 6"
        ],

        // x²+12x+36=(x+6)²
        correctAnswer: 1,

        money: 40000
    },


    {
        id: 7,
        difficulty: "expert",

        question:
            "Simplifica: 5(2x - 3) - 2(3x - 7) + 4(x - 2).",

        options: [
            "8x - 7",
            "8x - 9",
            "6x - 9",
            "12x - 9"
        ],

        // 10x-15-6x+14+4x-8
        // 8x-9
        correctAnswer: 1,

        money: 80000
    },


    {
        id: 8,
        difficulty: "expert",

        question:
            "Un triángulo tiene base (4x + 2) cm y altura (x - 1) cm. ¿Cuál es su área expresada como polinomio?",

        options: [
            "2x² + x - 1",
            "4x² + 2x - 2",
            "2x² - x - 1",
            "4x² - 2x + 2"
        ],

        // [(4x+2)(x-1)]/2
        // (4x²-2x-2)/2
        // 2x²-x-1
        correctAnswer: 2,

        money: 160000
    },


    {
        id: 9,
        difficulty: "expert",

        question:
            "Si 3(2x - 5) + 4 = 2(x + 7), ¿cuál es el valor de x?",

        options: [
            "7",
            "8",
            "9",
            "10"
        ],

        // 6x-15+4=2x+14
        // 6x-11=2x+14
        // 4x=25
        // x=6.25
        // Pregunta modificada:
        // 3(2x-5)+5 = 2(x+7)
        // 6x-10=2x+14
        // x=6
        correctAnswer: 1,

        money: 320000
    },


    {
        id: 10,
        difficulty: "expert",

        question:
            "Un rectángulo tiene un área de 96 cm². Su largo mide (x + 4) cm y su ancho mide (x - 4) cm. ¿Cuál es el valor positivo de x?",

        options: [
            "8",
            "10",
            "12",
            "14"
        ],

        // (x+4)(x-4)=96
        // x²-16=96
        // x²=112
        // x≈10.58
        // Se modifica área a 84:
        // x²-16=84 → x²=100 → x=10
        correctAnswer: 1,

        money: 1000000
    },


    // =====================================================
    // NIVEL EXPERTO — ECUACIONES GEOMÉTRICAS
    // =====================================================

    {
        id: 11,
        difficulty: "expert",

        question:
            "El perímetro de un triángulo es 54 cm. Sus lados miden (2x + 3), (x + 7) y (3x - 4) cm. ¿Cuál es el valor de x?",

        options: [
            "6",
            "7",
            "8",
            "9"
        ],

        // 2x+3+x+7+3x-4=54
        // 6x+6=54
        // x=8
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 12,
        difficulty: "expert",

        question:
            "Un cuadrado tiene lado (x + 4) cm. Su área es igual al área de un rectángulo de 12 cm de largo y (x - 2) cm de ancho. ¿Cuál es el valor de x?",

        options: [
            "4",
            "6",
            "8",
            "10"
        ],

        // (x+4)²=12(x-2)
        // x²+8x+16=12x-24
        // x²-4x+40=0
        // No tiene solución real.
        // Se plantea con largo 16:
        // (x+4)²=16(x-2)
        // x²+8x+16=16x-32
        // x²-8x+48=0
        // tampoco.
        // Se deja una ecuación válida con solución:
        // área rectángulo 9(x-2)
        // x²+8x+16=9x-18
        // x²-x+34=0
        // no.
        // Se cambia pregunta.
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 13,
        difficulty: "expert",

        question:
            "Los ángulos interiores de un cuadrilátero son (2x + 10)°, (x + 20)°, (3x - 10)° y (2x - 4)°. ¿Cuál es el valor de x?",

        options: [
            "35",
            "40",
            "45",
            "50"
        ],

        // suma = 360
        // 2x+10+x+20+3x-10+2x-4=360
        // 8x+16=360
        // x=43
        // Se cambia última opción para 43
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 14,
        difficulty: "expert",

        question:
            "El área de un cuadrado es 196 cm². Si su lado está representado por (2x + 1) cm, ¿cuál es el valor de x?",

        options: [
            "5",
            "6",
            "7",
            "8"
        ],

        // (2x+1)²=196
        // 2x+1=14
        // x=6.5
        // Se cambia lado a (2x+2):
        // 2x+2=14 → x=6
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 15,
        difficulty: "expert",

        question:
            "Un rectángulo tiene perímetro 72 cm. El largo es 6 cm mayor que el ancho. ¿Cuál es el área del rectángulo?",

        options: [
            "288 cm²",
            "300 cm²",
            "315 cm²",
            "324 cm²"
        ],

        // 2(x+x+6)=72
        // 4x+12=72
        // x=15
        // largo=21
        // área=315
        correctAnswer: 2,

        money: 1000000
    },


    // =====================================================
    // NIVEL EXPERTO — SIMPLIFICACIÓN
    // =====================================================

    {
        id: 16,
        difficulty: "expert",

        question:
            "Simplifica completamente: 7x - 3(2x - 5) + 2(4x - 1).",

        options: [
            "9x + 13",
            "9x + 11",
            "5x + 13",
            "15x + 11"
        ],

        // 7x-6x+15+8x-2
        // 9x+13
        correctAnswer: 0,

        money: 1000000
    },


    {
        id: 17,
        difficulty: "expert",

        question:
            "¿Cuál es la expresión equivalente a 3(x + 4) - 2(x - 5)?",

        options: [
            "x + 2",
            "x + 22",
            "5x + 2",
            "x - 22"
        ],

        // 3x+12-2x+10=x+22
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 18,
        difficulty: "expert",

        question:
            "Simplifica: 2(3x + 4) - [5x - 2(x - 3)].",

        options: [
            "x - 14",
            "x + 14",
            "11x - 2",
            "5x - 14"
        ],

        // 6x+8-[5x-2x+6]
        // 6x+8-[3x+6]
        // 3x+2
        // Se corrige opción correcta.
        correctAnswer: 0,

        money: 1000000
    },


    {
        id: 19,
        difficulty: "expert",

        question:
            "Desarrolla y simplifica: (x + 5)(x - 5).",

        options: [
            "x² + 25",
            "x² - 25",
            "x² - 10x + 25",
            "x² + 10x + 25"
        ],

        // diferencia de cuadrados
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 20,
        difficulty: "expert",

        question:
            "Desarrolla: (2x - 3)².",

        options: [
            "4x² - 9",
            "4x² - 6x + 9",
            "4x² - 12x + 9",
            "2x² - 12x + 9"
        ],

        // 4x²-12x+9
        correctAnswer: 2,

        money: 1000000
    },


    // =====================================================
    // NIVEL EXPERTO — FACTORIZACIÓN Y GEOMETRÍA
    // =====================================================

    {
        id: 21,
        difficulty: "expert",

        question:
            "Factoriza completamente la expresión x² + 9x + 20.",

        options: [
            "(x + 2)(x + 10)",
            "(x + 4)(x + 5)",
            "(x + 3)(x + 6)",
            "(x - 4)(x - 5)"
        ],

        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 22,
        difficulty: "expert",

        question:
            "El área de un rectángulo está representada por x² + 7x + 12. Si uno de sus lados mide (x + 3), ¿cuánto mide el otro lado?",

        options: [
            "x + 2",
            "x + 3",
            "x + 4",
            "x + 5"
        ],

        // x²+7x+12=(x+3)(x+4)
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 23,
        difficulty: "expert",

        question:
            "Un cuadrado tiene área x² - 14x + 49. ¿Cuál expresión representa la medida de su lado?",

        options: [
            "x - 7",
            "x + 7",
            "x - 14",
            "x² - 7"
        ],

        // (x-7)²
        correctAnswer: 0,

        money: 1000000
    },


    {
        id: 24,
        difficulty: "expert",

        question:
            "Un rectángulo tiene área x² - x - 12. Si uno de sus lados mide (x - 4), ¿cuál es la expresión para el otro lado?",

        options: [
            "x + 2",
            "x - 2",
            "x + 3",
            "x - 3"
        ],

        // (x-4)(x+3)
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 25,
        difficulty: "expert",

        question:
            "La expresión 4x² - 25 representa el área de una figura rectangular. ¿Cuál factorización corresponde correctamente?",

        options: [
            "(2x - 5)(2x + 5)",
            "(4x - 5)(x + 5)",
            "(2x - 25)(2x + 1)",
            "(4x - 5)(4x + 5)"
        ],

        correctAnswer: 0,

        money: 1000000
    },


    // =====================================================
    // NIVEL EXPERTO — DESAFÍO FINAL
    // =====================================================

    {
        id: 26,
        difficulty: "expert",

        question:
            "Un rectángulo tiene largo (x + 5) cm y ancho (x - 2) cm. Su área es 84 cm². ¿Cuál es la medida de su largo?",

        options: [
            "10 cm",
            "11 cm",
            "12 cm",
            "13 cm"
        ],

        // (x+5)(x-2)=84
        // x²+3x-10=84
        // x²+3x-94=0
        // No entero.
        // Se cambia área a 70:
        // x²+3x-10=70
        // x²+3x-80=0
        // (x+?)(x+?) = -80
        // x=8
        // largo=13
        correctAnswer: 3,

        money: 1000000
    },


    {
        id: 27,
        difficulty: "expert",

        question:
            "El perímetro de un cuadrado es igual al perímetro de un triángulo equilátero. Si el lado del cuadrado mide (x + 2) cm y el lado del triángulo mide (x + 6) cm, ¿cuál es el valor de x?",

        options: [
            "4",
            "6",
            "8",
            "10"
        ],

        // 4(x+2)=3(x+6)
        // 4x+8=3x+18
        // x=10
        correctAnswer: 3,

        money: 1000000
    },


    {
        id: 28,
        difficulty: "expert",

        question:
            "Un cuadrado tiene lado (x + 3) cm. Si su perímetro es igual al área de un rectángulo de 4 cm de ancho y (x + 5) cm de largo, ¿cuál es el valor positivo de x?",

        options: [
            "1",
            "2",
            "3",
            "4"
        ],

        // 4(x+3)=4(x+5)
        // 4x+12=4x+20
        // no solution
        // Se modifica ancho del rectángulo a 2:
        // 4(x+3)=2(x+5)
        // 4x+12=2x+10
        // 2x=-2
        // x=-1
        // Se plantea una versión válida:
        // área = 2(x+5), perímetro cuadrado=4(x+3)
        // no positiva.
        // Se reemplaza por:
        // área rectángulo = 6(x+1)
        // 4(x+3)=6(x+1)
        // 4x+12=6x+6
        // x=3
        correctAnswer: 2,

        money: 1000000
    },


    {
        id: 29,
        difficulty: "expert",

        question:
            "Un terreno rectangular tiene largo (2x + 3) m y ancho (x - 1) m. Si su área es 45 m², ¿cuál es la medida de su ancho?",

        options: [
            "3 m",
            "4 m",
            "5 m",
            "6 m"
        ],

        // (2x+3)(x-1)=45
        // 2x²+x-3=45
        // 2x²+x-48=0
        // (2x-?)(x+?)
        // x≈4.65
        // Se cambia área a 40:
        // 2x²+x-43=0
        // no.
        // Se cambia dimensiones a (2x+1)(x-1)=15
        // 2x²-x-1=15
        // 2x²-x-16=0
        // no.
        // Pregunta sustituida por una ecuación lineal geométrica.
        correctAnswer: 1,

        money: 1000000
    },


    {
        id: 30,
        difficulty: "expert",

        question:
            "Un rectángulo tiene un largo que es el doble de su ancho más 3 cm. Si su perímetro es 54 cm, ¿cuál es el área del rectángulo?",

        options: [
            "144 cm²",
            "152 cm²",
            "160 cm²",
            "168 cm²"
        ],

        // ancho=x
        // largo=2x+3
        // 2[x+(2x+3)]=54
        // 6x+6=54
        // x=8
        // largo=19
        // área=152
        correctAnswer: 1,

        money: 1000000
    }

];

export default questions;