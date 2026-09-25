
const questions = [

    // =====================================================
    // NIVEL 1 - FÁCIL
    // =====================================================

    {
        id: 1,
        difficulty: "easy",
        question: "¿Cuánto es 125 + 378?",
        options: [
            "493",
            "503",
            "513",
            "523"
        ],
        correctAnswer: 1,
        money: 1000
    },

    {
        id: 2,
        difficulty: "easy",
        question: "¿Cuánto es 900 - 457?",
        options: [
            "433",
            "443",
            "453",
            "463"
        ],
        correctAnswer: 1,
        money: 2000
    },

    {
        id: 3,
        difficulty: "easy",
        question: "¿Cuánto es 24 × 6?",
        options: [
            "124",
            "134",
            "144",
            "154"
        ],
        correctAnswer: 2,
        money: 5000
    },

    {
        id: 4,
        difficulty: "easy",
        question: "¿Cuánto es 144 ÷ 12?",
        options: [
            "10",
            "11",
            "12",
            "14"
        ],
        correctAnswer: 2,
        money: 10000
    },

    {
        id: 5,
        difficulty: "easy",
        question: "¿Cuál es el número mayor?",
        options: [
            "4.509",
            "4.590",
            "4.059",
            "4.095"
        ],
        correctAnswer: 1,
        money: 20000
    },

    {
        id: 6,
        difficulty: "easy",
        question: "¿Qué fracción representa 3 partes de un total de 8?",
        options: [
            "3/5",
            "3/6",
            "3/8",
            "5/8"
        ],
        correctAnswer: 2,
        money: 40000
    },

    {
        id: 7,
        difficulty: "easy",
        question: "¿Cuál fracción es equivalente a 1/2?",
        options: [
            "2/4",
            "2/3",
            "3/5",
            "4/6"
        ],
        correctAnswer: 0,
        money: 80000
    },

    {
        id: 8,
        difficulty: "easy",
        question: "¿Cuál es el resultado de 2/5 + 1/5?",
        options: [
            "2/10",
            "3/5",
            "3/10",
            "1/5"
        ],
        correctAnswer: 1,
        money: 160000
    },

    {
        id: 9,
        difficulty: "easy",
        question: "¿Cuál es el 50% de 200?",
        options: [
            "50",
            "75",
            "100",
            "150"
        ],
        correctAnswer: 2,
        money: 320000
    },

    {
        id: 10,
        difficulty: "easy",
        question: "Un cuaderno cuesta $8.000. Si compras 3, ¿cuánto pagas?",
        options: [
            "$16.000",
            "$20.000",
            "$24.000",
            "$28.000"
        ],
        correctAnswer: 2,
        money: 1000000
    },


    // =====================================================
    // NIVEL 2 - MEDIO
    // =====================================================

    {
        id: 11,
        difficulty: "medium",
        question: "¿Cuántos lados tiene un hexágono?",
        options: [
            "5",
            "6",
            "7",
            "8"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 12,
        difficulty: "medium",
        question: "¿Cuánto mide el perímetro de un cuadrado de lado 9 cm?",
        options: [
            "18 cm",
            "27 cm",
            "36 cm",
            "81 cm"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 13,
        difficulty: "medium",
        question: "¿Cuál es el área de un rectángulo de 7 cm × 4 cm?",
        options: [
            "11 cm²",
            "22 cm²",
            "28 cm²",
            "32 cm²"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 14,
        difficulty: "medium",
        question: "¿Cuántos minutos hay en 2 horas?",
        options: [
            "60",
            "90",
            "120",
            "180"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 15,
        difficulty: "medium",
        question: "¿Cuál es una fuente de energía renovable?",
        options: [
            "Carbón",
            "Petróleo",
            "Energía solar",
            "Gas natural"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 16,
        difficulty: "medium",
        question: "¿Cuál es el sinónimo de \"feliz\"?",
        options: [
            "Triste",
            "Alegre",
            "Enojado",
            "Cansado"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 17,
        difficulty: "medium",
        question: "¿Cuál es el antónimo de \"rápido\"?",
        options: [
            "Veloz",
            "Ligero",
            "Lento",
            "Ágil"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 18,
        difficulty: "medium",
        question: "¿Cuál palabra es un sustantivo?",
        options: [
            "Correr",
            "Azul",
            "Perro",
            "Rápidamente"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 19,
        difficulty: "medium",
        question: "¿Cuál palabra es un verbo?",
        options: [
            "Casa",
            "Saltar",
            "Bonito",
            "Grande"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 20,
        difficulty: "medium",
        question: "¿Cuál oración está correctamente escrita?",
        options: [
            "el niño juega en el parque.",
            "El niño juega en el parque.",
            "El niño juega en el Parque",
            "el Niño juega en el parque."
        ],
        correctAnswer: 1,
        money: 1000000
    },


    // =====================================================
    // NIVEL 3 - MEDIO
    // =====================================================

    {
        id: 21,
        difficulty: "medium",
        question: "¿Qué signo se utiliza al final de una pregunta?",
        options: [
            "!",
            ".",
            "¿?",
            ":"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 22,
        difficulty: "medium",
        question: "¿Cuál palabra es aguda?",
        options: [
            "Árbol",
            "Lápiz",
            "Canción",
            "Mesa"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 23,
        difficulty: "medium",
        question: "¿Cuál palabra es esdrújula?",
        options: [
            "Camión",
            "Árbol",
            "Música",
            "Papel"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 24,
        difficulty: "medium",
        question: "¿Cuál es el sujeto en \"María prepara la comida\"?",
        options: [
            "Prepara",
            "La comida",
            "María",
            "Comida"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 25,
        difficulty: "medium",
        question: "¿Cuál oración está en pasado?",
        options: [
            "Juan juega fútbol.",
            "Juan jugará fútbol.",
            "Juan jugó fútbol.",
            "Juan está jugando fútbol."
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 26,
        difficulty: "medium",
        question: "¿Qué es una fábula?",
        options: [
            "Una noticia",
            "Una narración que suele dejar una enseñanza",
            "Una receta",
            "Una lista"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 27,
        difficulty: "medium",
        question: "¿Qué elemento suele aparecer al final de una fábula?",
        options: [
            "Una moraleja",
            "Una operación",
            "Una dirección",
            "Un mapa"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 28,
        difficulty: "medium",
        question: "¿Cuál es el plural de \"lápiz\"?",
        options: [
            "Lápizes",
            "Lápizs",
            "Lápices",
            "Lápicess"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 29,
        difficulty: "medium",
        question: "¿Cuál palabra está escrita correctamente?",
        options: [
            "Avión",
            "Abión",
            "Havión",
            "Habión"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 30,
        difficulty: "medium",
        question: "¿Cuál oración expresa una pregunta?",
        options: [
            "¡Qué bonito día!",
            "Hoy hace calor.",
            "¿Dónde está mi cuaderno?",
            "Guarda el libro."
        ],
        correctAnswer: 2,
        money: 1000000
    },


    // =====================================================
    // NIVEL 4 - DIFÍCIL
    // =====================================================

    {
        id: 31,
        difficulty: "hard",
        question: "¿Cuál órgano bombea la sangre por el cuerpo?",
        options: [
            "Pulmón",
            "Cerebro",
            "Corazón",
            "Estómago"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 32,
        difficulty: "hard",
        question: "¿Qué necesitan principalmente las plantas para realizar la fotosíntesis?",
        options: [
            "Luz solar",
            "Arena",
            "Plástico",
            "Sal"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 33,
        difficulty: "hard",
        question: "¿Cuál es el estado sólido del agua?",
        options: [
            "Vapor",
            "Hielo",
            "Lluvia",
            "Niebla"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 34,
        difficulty: "hard",
        question: "¿Qué planeta es conocido como el planeta rojo?",
        options: [
            "Venus",
            "Marte",
            "Júpiter",
            "Saturno"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 35,
        difficulty: "hard",
        question: "¿Cuál es la estrella más cercana a la Tierra?",
        options: [
            "La Luna",
            "Marte",
            "El Sol",
            "Venus"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 36,
        difficulty: "hard",
        question: "¿Qué órgano utilizamos principalmente para respirar?",
        options: [
            "Corazón",
            "Pulmón",
            "Riñón",
            "Hígado"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 37,
        difficulty: "hard",
        question: "¿Cuál de estos animales es mamífero?",
        options: [
            "Gallina",
            "Rana",
            "Delfín",
            "Tortuga"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 38,
        difficulty: "hard",
        question: "¿Qué gas necesitan los seres humanos para respirar?",
        options: [
            "Oxígeno",
            "Helio",
            "Hidrógeno",
            "Dióxido de carbono"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 39,
        difficulty: "hard",
        question: "¿Qué fuerza hace que los objetos caigan hacia el suelo?",
        options: [
            "Electricidad",
            "Gravedad",
            "Magnetismo",
            "Fricción"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 40,
        difficulty: "hard",
        question: "¿Qué órgano controla gran parte de las funciones del cuerpo?",
        options: [
            "Cerebro",
            "Estómago",
            "Pulmón",
            "Intestino"
        ],
        correctAnswer: 0,
        money: 1000000
    },


    // =====================================================
    // NIVEL 5 - DIFÍCIL
    // =====================================================

    {
        id: 41,
        difficulty: "hard",
        question: "¿Cuál es el proceso mediante el cual las plantas producen su alimento?",
        options: [
            "Digestión",
            "Respiración",
            "Fotosíntesis",
            "Evaporación"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 42,
        difficulty: "hard",
        question: "¿Qué sucede con el agua cuando se congela?",
        options: [
            "Se convierte en gas",
            "Se convierte en sólido",
            "Desaparece",
            "Se convierte en fuego"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 43,
        difficulty: "hard",
        question: "¿Cuál de estos es un ecosistema?",
        options: [
            "Un lápiz",
            "Una selva",
            "Una mesa",
            "Una mochila"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 44,
        difficulty: "hard",
        question: "¿Qué debemos hacer para cuidar los recursos naturales?",
        options: [
            "Desperdiciar agua",
            "Tirar basura al río",
            "Reducir y reciclar residuos",
            "Dejar las luces encendidas"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 45,
        difficulty: "hard",
        question: "¿Cuál es la capital de Colombia?",
        options: [
            "Medellín",
            "Cali",
            "Bogotá",
            "Cartagena"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 46,
        difficulty: "hard",
        question: "¿Cuál es la moneda de Colombia?",
        options: [
            "Dólar",
            "Peso colombiano",
            "Euro",
            "Sol"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 47,
        difficulty: "hard",
        question: "¿En qué continente está Colombia?",
        options: [
            "Europa",
            "Asia",
            "América",
            "África"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 48,
        difficulty: "hard",
        question: "¿Cuál océano se encuentra al occidente de Colombia?",
        options: [
            "Atlántico",
            "Pacífico",
            "Índico",
            "Ártico"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 49,
        difficulty: "hard",
        question: "¿Cuál océano se encuentra al norte de Colombia?",
        options: [
            "Pacífico",
            "Índico",
            "Atlántico",
            "Antártico"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 50,
        difficulty: "hard",
        question: "¿Qué representa un mapa?",
        options: [
            "Una representación de un territorio",
            "Una receta",
            "Una historia",
            "Una canción"
        ],
        correctAnswer: 0,
        money: 1000000
    },


    // =====================================================
    // NIVEL 6 - EXPERTO
    // =====================================================

    {
        id: 51,
        difficulty: "expert",
        question: "¿Cuál es el río más largo de Colombia?",
        options: [
            "Magdalena",
            "Amazonas",
            "Cauca",
            "Bogotá"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 52,
        difficulty: "expert",
        question: "¿Cuál es uno de los principales ríos de Colombia y atraviesa gran parte del país?",
        options: [
            "Magdalena",
            "Nilo",
            "Amazonas",
            "Sena"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 53,
        difficulty: "expert",
        question: "¿Qué es una comunidad?",
        options: [
            "Un grupo de personas que comparten un espacio o características comunes",
            "Un objeto",
            "Una montaña",
            "Un animal"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 54,
        difficulty: "expert",
        question: "¿Cuál es una función importante de un alcalde?",
        options: [
            "Administrar el municipio o distrito",
            "Dirigir otro país",
            "Crear planetas",
            "Controlar el clima"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 55,
        difficulty: "expert",
        question: "¿Qué símbolo representa a Colombia?",
        options: [
            "La bandera",
            "Un semáforo",
            "Un computador",
            "Un avión"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 56,
        difficulty: "expert",
        question: "¿Qué línea imaginaria divide la Tierra en hemisferio norte y sur?",
        options: [
            "Trópico de Cáncer",
            "Ecuador",
            "Meridiano de Greenwich",
            "Trópico de Capricornio"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 57,
        difficulty: "expert",
        question: "¿Qué instrumento sirve para orientarnos mediante los puntos cardinales?",
        options: [
            "Microscopio",
            "Brújula",
            "Termómetro",
            "Regla"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 58,
        difficulty: "expert",
        question: "¿Cuáles son los cuatro puntos cardinales?",
        options: [
            "Arriba, abajo, izquierda y derecha",
            "Norte, sur, este y oeste",
            "Cerca, lejos, arriba y abajo",
            "Centro, esquina, lado y frente"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 59,
        difficulty: "expert",
        question: "¿Cuál de estos es un departamento de Colombia?",
        options: [
            "Valledupar",
            "Cesar",
            "Cartagena",
            "Medellín"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 60,
        difficulty: "expert",
        question: "¿Qué dispositivo permite escribir letras y números en un computador?",
        options: [
            "Monitor",
            "Teclado",
            "Parlante",
            "Impresora"
        ],
        correctAnswer: 1,
        money: 1000000
    },


    // =====================================================
    // NIVEL 7 - EXPERTO
    // =====================================================

    {
        id: 61,
        difficulty: "expert",
        question: "¿Cuál dispositivo permite mover el puntero en la pantalla?",
        options: [
            "Mouse",
            "Monitor",
            "CPU",
            "Memoria USB"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 62,
        difficulty: "expert",
        question: "¿Para qué sirve un monitor?",
        options: [
            "Para mostrar información visual",
            "Para imprimir documentos",
            "Para grabar sonidos",
            "Para almacenar agua"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 63,
        difficulty: "expert",
        question: "¿Qué programa se utiliza principalmente para escribir documentos?",
        options: [
            "Word",
            "Paint",
            "Calculadora",
            "Cámara"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 64,
        difficulty: "expert",
        question: "¿Qué programa se utiliza principalmente para crear presentaciones?",
        options: [
            "PowerPoint",
            "Bloc de notas",
            "Calculadora",
            "Explorador"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 65,
        difficulty: "expert",
        question: "¿Qué es Internet?",
        options: [
            "Una red mundial de dispositivos conectados",
            "Un tipo de teclado",
            "Una impresora",
            "Un videojuego"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 66,
        difficulty: "expert",
        question: "¿Cuál contraseña es más segura?",
        options: [
            "123456",
            "contraseña",
            "Sebastian123",
            "T9#kL7!pQ2"
        ],
        correctAnswer: 3,
        money: 1000000
    },

    {
        id: 67,
        difficulty: "expert",
        question: "¿Qué debemos hacer si recibimos un mensaje extraño de un desconocido en Internet?",
        options: [
            "Darle nuestra contraseña",
            "Enviarle información personal",
            "Ignorarlo y pedir ayuda a un adulto de confianza",
            "Enviarle fotografías personales"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 68,
        difficulty: "expert",
        question: "¿Qué dispositivo almacena información y puede conectarse mediante USB?",
        options: [
            "Memoria USB",
            "Monitor",
            "Parlante",
            "Mouse"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 69,
        difficulty: "expert",
        question: "¿Qué significa \"guardar\" un archivo?",
        options: [
            "Eliminarlo",
            "Conservar la información para utilizarla después",
            "Apagar el computador",
            "Imprimirlo siempre"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 70,
        difficulty: "expert",
        question: "¿Qué es un navegador web?",
        options: [
            "Un programa para acceder a páginas de Internet",
            "Un dispositivo de sonido",
            "Una impresora",
            "Un cable"
        ],
        correctAnswer: 0,
        money: 1000000
    },


    // =====================================================
    // NIVEL 8 - EXPERTO
    // =====================================================

    {
        id: 71,
        difficulty: "expert",
        question: "¿Cuál de estos es un navegador?",
        options: [
            "Chrome",
            "Word",
            "Excel",
            "Paint"
        ],
        correctAnswer: 0,
        money: 1000000
    },

    {
        id: 72,
        difficulty: "expert",
        question: "¿Qué tecla permite normalmente borrar el carácter situado antes del cursor?",
        options: [
            "Enter",
            "Shift",
            "Backspace",
            "Ctrl"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 73,
        difficulty: "expert",
        question: "¿Qué combinación se utiliza normalmente para copiar información?",
        options: [
            "Ctrl + V",
            "Ctrl + C",
            "Ctrl + X",
            "Ctrl + Z"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 74,
        difficulty: "expert",
        question: "¿Qué combinación se utiliza normalmente para pegar información?",
        options: [
            "Ctrl + P",
            "Ctrl + C",
            "Ctrl + V",
            "Ctrl + A"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 75,
        difficulty: "expert",
        question: "¿Qué significa \"book\"?",
        options: [
            "Casa",
            "Libro",
            "Escuela",
            "Mesa"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 76,
        difficulty: "expert",
        question: "¿Qué significa \"apple\"?",
        options: [
            "Naranja",
            "Manzana",
            "Pera",
            "Uva"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 77,
        difficulty: "expert",
        question: "¿Cuál es el significado de \"Good morning\"?",
        options: [
            "Buenas noches",
            "Buenas tardes",
            "Buenos días",
            "Hasta luego"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 78,
        difficulty: "expert",
        question: "¿Cuál es el número \"ten\" en español?",
        options: [
            "Ocho",
            "Nueve",
            "Diez",
            "Once"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 79,
        difficulty: "expert",
        question: "¿Qué significa \"blue\"?",
        options: [
            "Rojo",
            "Verde",
            "Azul",
            "Amarillo"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 80,
        difficulty: "expert",
        question: "Completa: \"I ___ a student.\"",
        options: [
            "am",
            "is",
            "are",
            "be"
        ],
        correctAnswer: 0,
        money: 1000000
    },


    // =====================================================
    // NIVEL 9 - EXPERTO
    // =====================================================

    {
        id: 81,
        difficulty: "expert",
        question: "Completa: \"She ___ my friend.\"",
        options: [
            "am",
            "are",
            "is",
            "be"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 82,
        difficulty: "expert",
        question: "Si encuentras dinero en el salón y no sabes de quién es, ¿qué deberías hacer?",
        options: [
            "Guardarlo",
            "Compartirlo con amigos",
            "Entregarlo a un docente",
            "Gastarlo"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 83,
        difficulty: "expert",
        question: "Un compañero está hablando mientras otro participa. ¿Qué sería una buena actitud?",
        options: [
            "Gritarle",
            "Escucharlo y respetar su turno",
            "Burlarse",
            "Ignorarlo siempre"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 84,
        difficulty: "expert",
        question: "¿Qué significa trabajar en equipo?",
        options: [
            "Hacer todo individualmente",
            "Colaborar para alcanzar un objetivo común",
            "Dejar que otra persona haga todo",
            "Competir constantemente"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 85,
        difficulty: "expert",
        question: "Si encuentras una noticia en Internet, ¿qué deberías hacer antes de compartirla?",
        options: [
            "Compartirla inmediatamente",
            "Revisar si la información proviene de una fuente confiable",
            "Cambiarle el título",
            "Enviarla a todos"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 86,
        difficulty: "expert",
        question: "Si dos compañeros tienen opiniones diferentes, ¿qué pueden hacer?",
        options: [
            "Insultarse",
            "Escucharse y argumentar respetuosamente",
            "Dejar de hablarse",
            "Gritar más fuerte"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 87,
        difficulty: "expert",
        question: "¿Cuál es un ejemplo de responsabilidad?",
        options: [
            "Culpar a otro por nuestros errores",
            "Cumplir con nuestras tareas",
            "Romper materiales",
            "Ignorar las reglas"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 88,
        difficulty: "expert",
        question: "¿Qué significa cuidar la información personal en Internet?",
        options: [
            "Publicar todas nuestras contraseñas",
            "Compartir nuestra dirección con desconocidos",
            "Proteger datos como contraseñas y dirección",
            "Dar nuestros datos a cualquier página"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 89,
        difficulty: "expert",
        question: "Si una información parece demasiado sorprendente para ser cierta, ¿qué conviene hacer?",
        options: [
            "Compartirla inmediatamente",
            "Verificarla en fuentes confiables",
            "Inventar más información",
            "Cambiar la información"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 90,
        difficulty: "expert",
        question: "¿Cuál de estas acciones demuestra respeto hacia los demás?",
        options: [
            "Interrumpir constantemente",
            "Escuchar cuando otra persona habla",
            "Burlarse de los errores",
            "Ignorar las opiniones"
        ],
        correctAnswer: 1,
        money: 1000000
    },


    // =====================================================
    // PREGUNTAS ADICIONALES - NIVEL MIXTO
    // =====================================================

    {
        id: 91,
        difficulty: "hard",
        question: "¿Cuál es el promedio de 6, 8 y 10?",
        options: [
            "6",
            "7",
            "8",
            "9"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 92,
        difficulty: "hard",
        question: "¿Cuál es la tercera parte de 90?",
        options: [
            "20",
            "30",
            "40",
            "45"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 93,
        difficulty: "hard",
        question: "Si 4 lápices cuestan $6.000, ¿cuánto cuesta cada uno?",
        options: [
            "$1.000",
            "$1.500",
            "$2.000",
            "$2.500"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 94,
        difficulty: "hard",
        question: "¿Qué decimal representa 1/4?",
        options: [
            "0,15",
            "0,20",
            "0,25",
            "0,50"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 95,
        difficulty: "hard",
        question: "Un ángulo de 90° se llama:",
        options: [
            "Agudo",
            "Obtuso",
            "Recto",
            "Llano"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 96,
        difficulty: "hard",
        question: "¿Cuál es el 25% de 80?",
        options: [
            "15",
            "20",
            "25",
            "30"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 97,
        difficulty: "hard",
        question: "Una camisa cuesta $80.000 y tiene un descuento del 10%. ¿Cuál es su precio final?",
        options: [
            "$70.000",
            "$72.000",
            "$74.000",
            "$78.000"
        ],
        correctAnswer: 1,
        money: 1000000
    },

    {
        id: 98,
        difficulty: "hard",
        question: "¿Cuál de los siguientes números es primo?",
        options: [
            "21",
            "27",
            "29",
            "33"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 99,
        difficulty: "hard",
        question: "¿Qué número continúa la secuencia: 5, 10, 15, 20, ___?",
        options: [
            "22",
            "24",
            "25",
            "30"
        ],
        correctAnswer: 2,
        money: 1000000
    },

    {
        id: 100,
        difficulty: "expert",
        question: "Si una secuencia comienza 3, 6, 12, 24..., ¿cuál es el siguiente número?",
        options: [
            "36",
            "42",
            "48",
            "54"
        ],
        correctAnswer: 2,
        money: 1000000
    }

];

export default questions;
