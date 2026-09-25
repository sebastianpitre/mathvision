const questions = [

    // =====================================================
    // NIVEL 1 - FÁCIL (Matemáticas básicas)
    // =====================================================

    { id: 1, difficulty: "easy", question: "¿Cuánto es 8 + 5?", options: ["12", "13", "14", "15"], correctAnswer: 1, money: 1000 },
    { id: 2, difficulty: "easy", question: "¿Cuánto es 15 - 7?", options: ["6", "7", "8", "9"], correctAnswer: 2, money: 2000 },
    { id: 3, difficulty: "easy", question: "¿Cuánto es 20 + 30?", options: ["40", "50", "60", "70"], correctAnswer: 1, money: 5000 },
    { id: 4, difficulty: "easy", question: "¿Cuánto es 2 × 4?", options: ["6", "8", "10", "12"], correctAnswer: 1, money: 10000 },
    { id: 5, difficulty: "easy", question: "¿Cuál es el número mayor?", options: ["45", "54", "39", "48"], correctAnswer: 1, money: 20000 },
    { id: 6, difficulty: "easy", question: "¿Qué número viene después del 99?", options: ["98", "101", "100", "110"], correctAnswer: 2, money: 40000 },
    { id: 7, difficulty: "easy", question: "¿Cuántas decenas hay en el número 30?", options: ["1", "2", "3", "4"], correctAnswer: 2, money: 80000 },
    { id: 8, difficulty: "easy", question: "Ana tiene 6 manzanas y compra 4 más. ¿Cuántas manzanas tiene ahora?", options: ["8", "9", "10", "11"], correctAnswer: 2, money: 160000 },
    { id: 9, difficulty: "easy", question: "¿Cuál es la mitad de 10?", options: ["5", "4", "6", "2"], correctAnswer: 0, money: 320000 },
    { id: 10, difficulty: "easy", question: "Un cuaderno cuesta $2.000. Si compras 3, ¿cuánto pagas?", options: ["$4.000", "$5.000", "$6.000", "$8.000"], correctAnswer: 2, money: 1000000 },


    // =====================================================
    // NIVEL 2 - MEDIO (Geometría, tiempo y lenguaje)
    // =====================================================

    { id: 11, difficulty: "medium", question: "¿Cuántos lados tiene un triángulo?", options: ["2", "3", "4", "5"], correctAnswer: 1, money: 1000000 },
    { id: 12, difficulty: "medium", question: "¿Cuántos lados tiene un cuadrado?", options: ["4", "3", "5", "6"], correctAnswer: 0, money: 1000000 },
    { id: 13, difficulty: "medium", question: "¿Cuál de estas figuras es redonda?", options: ["Cuadrado", "Triángulo", "Círculo", "Rectángulo"], correctAnswer: 2, money: 1000000 },
    { id: 14, difficulty: "medium", question: "¿Cuántos días tiene una semana?", options: ["5", "6", "7", "8"], correctAnswer: 2, money: 1000000 },
    { id: 15, difficulty: "medium", question: "¿Cuántos meses tiene un año?", options: ["12", "10", "11", "13"], correctAnswer: 0, money: 1000000 },
    { id: 16, difficulty: "medium", question: "¿Qué día de la semana viene después del lunes?", options: ["Domingo", "Martes", "Miércoles", "Viernes"], correctAnswer: 1, money: 1000000 },
    { id: 17, difficulty: "medium", question: "¿Cuántos minutos tiene una hora?", options: ["30", "50", "60", "100"], correctAnswer: 2, money: 1000000 },
    { id: 18, difficulty: "medium", question: "¿Cuál de estos números es par?", options: ["11", "14", "9", "7"], correctAnswer: 1, money: 1000000 },
    { id: 19, difficulty: "medium", question: "¿Cuál de estos números es impar?", options: ["8", "10", "13", "20"], correctAnswer: 2, money: 1000000 },
    { id: 20, difficulty: "medium", question: "¿Cuánto es 5 × 2?", options: ["7", "10", "12", "25"], correctAnswer: 1, money: 1000000 },
    { id: 21, difficulty: "medium", question: "¿Cuál palabra es un sustantivo?", options: ["Correr", "Mesa", "Rápido", "Saltar"], correctAnswer: 1, money: 1000000 },
    { id: 22, difficulty: "medium", question: "¿Cuántas sílabas tiene la palabra \"mariposa\"?", options: ["2", "3", "4", "5"], correctAnswer: 2, money: 1000000 },
    { id: 23, difficulty: "medium", question: "¿Con qué tipo de letra empieza una oración?", options: ["Mayúscula", "Minúscula", "Número", "Ninguna"], correctAnswer: 0, money: 1000000 },
    { id: 24, difficulty: "medium", question: "¿Cuál es el antónimo de \"grande\"?", options: ["Enorme", "Pequeño", "Alto", "Gordo"], correctAnswer: 1, money: 1000000 },
    { id: 25, difficulty: "medium", question: "¿Cuál es el plural de \"flor\"?", options: ["Flors", "Flores", "Florez", "Flor es"], correctAnswer: 1, money: 1000000 },
    { id: 26, difficulty: "medium", question: "¿Cuál palabra rima con \"casa\"?", options: ["Masa", "Perro", "Luz", "Sol"], correctAnswer: 0, money: 1000000 },
    { id: 27, difficulty: "medium", question: "¿Cuál palabra es un verbo?", options: ["Jugar", "Mesa", "Rojo", "Sol"], correctAnswer: 0, money: 1000000 },
    { id: 28, difficulty: "medium", question: "¿Cuál oración está correctamente escrita?", options: ["el gato duerme en la cama", "el Gato duerme en la cama.", "El gato duerme en la cama.", "El gato duerme en la cama"], correctAnswer: 2, money: 1000000 },
    { id: 29, difficulty: "medium", question: "¿Cuántas vocales tiene el abecedario?", options: ["3", "4", "5", "6"], correctAnswer: 2, money: 1000000 },
    { id: 30, difficulty: "medium", question: "¿Qué es un cuento?", options: ["Una narración corta con personajes", "Una lista de compras", "Una operación", "Un mapa"], correctAnswer: 0, money: 1000000 },


    // =====================================================
    // NIVEL 3 - DIFÍCIL (Naturales, sociales, valores, inglés y tecnología)
    // =====================================================

    { id: 31, difficulty: "hard", question: "¿Cuál de estos animales es mamífero?", options: ["Gallina", "Vaca", "Pez", "Serpiente"], correctAnswer: 1, money: 1000000 },
    { id: 32, difficulty: "hard", question: "¿Qué necesitan las plantas para crecer?", options: ["Agua y luz solar", "Plástico", "Dulces", "Piedras"], correctAnswer: 0, money: 1000000 },
    { id: 33, difficulty: "hard", question: "¿Con qué sentido percibimos los olores?", options: ["Vista", "Oído", "Olfato", "Tacto"], correctAnswer: 2, money: 1000000 },
    { id: 34, difficulty: "hard", question: "¿Con qué órgano de los sentidos vemos?", options: ["Oídos", "Ojos", "Nariz", "Lengua"], correctAnswer: 1, money: 1000000 },
    { id: 35, difficulty: "hard", question: "¿Con qué sentido percibimos los sabores?", options: ["Vista", "Oído", "Tacto", "Gusto"], correctAnswer: 3, money: 1000000 },
    { id: 36, difficulty: "hard", question: "¿Cómo se llama el planeta donde vivimos?", options: ["Marte", "Tierra", "Venus", "Júpiter"], correctAnswer: 1, money: 1000000 },
    { id: 37, difficulty: "hard", question: "¿Qué astro nos da luz y calor durante el día?", options: ["La Luna", "Las estrellas", "El Sol", "Un planeta"], correctAnswer: 2, money: 1000000 },
    { id: 38, difficulty: "hard", question: "¿En qué estado se encuentra el agua que bebemos?", options: ["Sólido", "Líquido", "Gaseoso", "Polvo"], correctAnswer: 1, money: 1000000 },
    { id: 39, difficulty: "hard", question: "¿Cuál de estos animales vive en el agua?", options: ["Loro", "Gato", "Caballo", "Pez"], correctAnswer: 3, money: 1000000 },
    { id: 40, difficulty: "hard", question: "¿Cuál de estos animales nace de un huevo?", options: ["Gallina", "Perro", "Vaca", "Gato"], correctAnswer: 0, money: 1000000 },
    { id: 41, difficulty: "hard", question: "¿Qué parte de la planta absorbe el agua del suelo?", options: ["Hoja", "Flor", "Raíz", "Fruto"], correctAnswer: 2, money: 1000000 },
    { id: 42, difficulty: "hard", question: "¿Qué color se forma al mezclar amarillo y azul?", options: ["Morado", "Verde", "Naranja", "Gris"], correctAnswer: 1, money: 1000000 },
    { id: 43, difficulty: "hard", question: "¿Cuál es la capital de Colombia?", options: ["Cali", "Medellín", "Bogotá", "Cartagena"], correctAnswer: 2, money: 1000000 },
    { id: 44, difficulty: "hard", question: "¿Cuáles son los colores de la bandera de Colombia?", options: ["Amarillo, azul y rojo", "Verde, blanco y rojo", "Negro, blanco y azul", "Naranja, verde y amarillo"], correctAnswer: 0, money: 1000000 },
    { id: 45, difficulty: "hard", question: "¿Cuál es el departamento cuya capital es Valledupar?", options: ["Magdalena", "Cesar", "Bolívar", "Atlántico"], correctAnswer: 1, money: 1000000 },
    { id: 46, difficulty: "hard", question: "¿Cuál es un símbolo patrio de Colombia?", options: ["El escudo", "Un balón", "Un carro", "Un lápiz"], correctAnswer: 0, money: 1000000 },
    { id: 47, difficulty: "hard", question: "¿Qué es un barrio?", options: ["Un tipo de animal", "Una parte de la ciudad donde viven personas", "Un instrumento", "Una comida"], correctAnswer: 1, money: 1000000 },
    { id: 48, difficulty: "hard", question: "¿Quién nos enseña en la escuela?", options: ["Médico", "Bombero", "Conductor", "Docente"], correctAnswer: 3, money: 1000000 },
    { id: 49, difficulty: "hard", question: "¿Cuál de estos es un medio de transporte aéreo?", options: ["Barco", "Bus", "Avión", "Bicicleta"], correctAnswer: 2, money: 1000000 },
    { id: 50, difficulty: "hard", question: "¿Cuál de estos es un medio de transporte acuático?", options: ["Barco", "Moto", "Tren", "Camión"], correctAnswer: 0, money: 1000000 },
    { id: 51, difficulty: "hard", question: "¿Cuál de estos es un servicio público?", options: ["Un videojuego", "El agua potable", "Un juguete", "Una golosina"], correctAnswer: 1, money: 1000000 },
    { id: 52, difficulty: "hard", question: "¿Qué debemos hacer con la basura?", options: ["Dejarla en el piso", "Tirarla al río", "Depositarla en la caneca", "Esconderla"], correctAnswer: 2, money: 1000000 },
    { id: 53, difficulty: "hard", question: "En Colombia, ¿en qué caneca se depositan los residuos orgánicos (restos de comida)?", options: ["Blanca", "Negra", "Verde", "Roja"], correctAnswer: 2, money: 1000000 },
    { id: 54, difficulty: "hard", question: "Si un compañero te presta un lápiz, ¿qué debes hacer?", options: ["Quedártelo", "Devolverlo y dar las gracias", "Romperlo", "Esconderlo"], correctAnswer: 1, money: 1000000 },
    { id: 55, difficulty: "hard", question: "¿Cuál de estas es una palabra de cortesía?", options: ["Ya", "Nada", "Callado", "Por favor"], correctAnswer: 3, money: 1000000 },
    { id: 56, difficulty: "hard", question: "Si un compañero se cae en el recreo, ¿qué debes hacer?", options: ["Ayudarlo", "Reírte", "Ignorarlo", "Gritarle"], correctAnswer: 0, money: 1000000 },
    { id: 57, difficulty: "hard", question: "¿Cuál es una buena norma para el salón de clases?", options: ["Gritar cuando quieras", "Correr por el salón", "Levantar la mano para hablar", "Quitarle cosas a los demás"], correctAnswer: 2, money: 1000000 },
    { id: 58, difficulty: "hard", question: "¿Qué significa \"book\"?", options: ["Casa", "Libro", "Mesa", "Perro"], correctAnswer: 1, money: 1000000 },
    { id: 59, difficulty: "hard", question: "¿Qué significa \"cat\"?", options: ["Perro", "Pájaro", "Gato", "Pez"], correctAnswer: 2, money: 1000000 },
    { id: 60, difficulty: "hard", question: "¿Qué significa \"red\"?", options: ["Azul", "Verde", "Amarillo", "Rojo"], correctAnswer: 3, money: 1000000 },
    { id: 61, difficulty: "hard", question: "¿Qué significa \"Hello\"?", options: ["Adiós", "Hola", "Gracias", "Por favor"], correctAnswer: 1, money: 1000000 },
    { id: 62, difficulty: "hard", question: "¿Cómo se dice el número \"tres\" en inglés?", options: ["One", "Two", "Three", "Four"], correctAnswer: 2, money: 1000000 },
    { id: 63, difficulty: "hard", question: "¿Cómo se dice \"perro\" en inglés?", options: ["Dog", "Cat", "Bird", "Fish"], correctAnswer: 0, money: 1000000 },
    { id: 64, difficulty: "hard", question: "¿Qué significa \"Good night\"?", options: ["Buenos días", "Buenas tardes", "Buenas noches", "Hasta pronto"], correctAnswer: 2, money: 1000000 },
    { id: 65, difficulty: "hard", question: "¿Qué dispositivo usamos para escribir en el computador?", options: ["Mouse", "Teclado", "Monitor", "Parlante"], correctAnswer: 1, money: 1000000 },
    { id: 66, difficulty: "hard", question: "¿Qué parte del computador nos muestra las imágenes?", options: ["Monitor", "Teclado", "Mouse", "Cable"], correctAnswer: 0, money: 1000000 },
    { id: 67, difficulty: "hard", question: "¿Qué debemos hacer con nuestra contraseña?", options: ["Compartirla con todos", "Mantenerla en secreto", "Escribirla en la pared", "Decírsela a desconocidos"], correctAnswer: 1, money: 1000000 },
    { id: 68, difficulty: "hard", question: "Para cuidar nuestros ojos al usar pantallas, ¿qué debemos hacer?", options: ["Mirar la pantalla sin parar", "Acercarnos mucho", "Usarla en la oscuridad", "Descansar y hacer pausas"], correctAnswer: 3, money: 1000000 },
    { id: 69, difficulty: "hard", question: "¿Qué debemos hacer antes de comer?", options: ["Dormir", "Gritar", "Lavarnos las manos", "Saltar"], correctAnswer: 2, money: 1000000 },
    { id: 70, difficulty: "hard", question: "¿Cuándo debemos cepillarnos los dientes?", options: ["Nunca", "Una vez al mes", "Después de las comidas", "Solo los domingos"], correctAnswer: 2, money: 1000000 },


    // =====================================================
    // NIVEL 4 - EXPERTO (Retos de matemáticas, lenguaje y ciencias)
    // =====================================================

    { id: 71, difficulty: "expert", question: "¿Cuánto es 46 + 27?", options: ["63", "72", "73", "83"], correctAnswer: 2, money: 1000000 },
    { id: 72, difficulty: "expert", question: "¿Cuánto es 82 - 35?", options: ["43", "47", "57", "53"], correctAnswer: 1, money: 1000000 },
    { id: 73, difficulty: "expert", question: "¿Cuánto es 5 × 6?", options: ["25", "30", "35", "40"], correctAnswer: 1, money: 1000000 },
    { id: 74, difficulty: "expert", question: "¿Cuánto es 10 × 7?", options: ["17", "60", "70", "700"], correctAnswer: 2, money: 1000000 },
    { id: 75, difficulty: "expert", question: "En el número 358, ¿cuál es el valor del dígito 5?", options: ["5", "50", "500", "300"], correctAnswer: 1, money: 1000000 },
    { id: 76, difficulty: "expert", question: "¿Qué número se forma con 400 + 30 + 2?", options: ["342", "432", "423", "234"], correctAnswer: 1, money: 1000000 },
    { id: 77, difficulty: "expert", question: "¿Cuál grupo de números está ordenado de menor a mayor?", options: ["47, 31, 25, 12", "31, 12, 25, 47", "12, 25, 31, 47", "25, 12, 47, 31"], correctAnswer: 2, money: 1000000 },
    { id: 78, difficulty: "expert", question: "¿Cuál es el doble de 15?", options: ["20", "25", "30", "35"], correctAnswer: 2, money: 1000000 },
    { id: 79, difficulty: "expert", question: "¿Cuál es la mitad de 24?", options: ["10", "12", "14", "16"], correctAnswer: 1, money: 1000000 },
    { id: 80, difficulty: "expert", question: "Luis tenía 50 canicas y perdió 18. ¿Cuántas canicas le quedan?", options: ["32", "38", "28", "42"], correctAnswer: 0, money: 1000000 },
    { id: 81, difficulty: "expert", question: "Un dulce cuesta $500 y un chocolate $1.500. ¿Cuánto cuestan los dos juntos?", options: ["$1.000", "$2.000", "$2.500", "$1.500"], correctAnswer: 1, money: 1000000 },
    { id: 82, difficulty: "expert", question: "¿Cuántas horas tiene un día?", options: ["12", "20", "24", "60"], correctAnswer: 2, money: 1000000 },
    { id: 83, difficulty: "expert", question: "¿Con qué unidad medimos la longitud de un salón?", options: ["Metro", "Litro", "Kilogramo", "Segundo"], correctAnswer: 0, money: 1000000 },
    { id: 84, difficulty: "expert", question: "¿Con qué unidad medimos el peso de una bolsa de arroz?", options: ["Metro", "Litro", "Minuto", "Kilogramo"], correctAnswer: 3, money: 1000000 },
    { id: 85, difficulty: "expert", question: "¿Qué fracción representa la mitad?", options: ["1/3", "1/2", "1/4", "2/3"], correctAnswer: 1, money: 1000000 },
    { id: 86, difficulty: "expert", question: "¿Qué cuerpo geométrico tiene forma de balón?", options: ["Cubo", "Cilindro", "Esfera", "Cono"], correctAnswer: 2, money: 1000000 },
    { id: 87, difficulty: "expert", question: "¿Cuántas caras tiene un cubo?", options: ["6", "4", "8", "12"], correctAnswer: 0, money: 1000000 },
    { id: 88, difficulty: "expert", question: "¿Qué número continúa la secuencia: 2, 4, 6, 8, ___?", options: ["9", "10", "11", "12"], correctAnswer: 1, money: 1000000 },
    { id: 89, difficulty: "expert", question: "¿Qué número continúa la secuencia: 100, 90, 80, 70, ___?", options: ["60", "50", "65", "75"], correctAnswer: 0, money: 1000000 },
    { id: 90, difficulty: "expert", question: "¿Qué signos usamos para expresar sorpresa o emoción?", options: [".", ",", "¿?", "¡!"], correctAnswer: 3, money: 1000000 },
    { id: 91, difficulty: "expert", question: "Completa: \"___ perro ladra.\"", options: ["El", "La", "Los", "Las"], correctAnswer: 0, money: 1000000 },
    { id: 92, difficulty: "expert", question: "Completa: \"___ niñas juegan en el parque.\"", options: ["El", "La", "Los", "Las"], correctAnswer: 3, money: 1000000 },
    { id: 93, difficulty: "expert", question: "¿Cuál es el femenino de \"gato\"?", options: ["Gato", "Gata", "Gatos", "Gatito"], correctAnswer: 1, money: 1000000 },
    { id: 94, difficulty: "expert", question: "¿Cuál es el diminutivo de \"casa\"?", options: ["Casona", "Casas", "Casita", "Casón"], correctAnswer: 2, money: 1000000 },
    { id: 95, difficulty: "expert", question: "¿Cuál palabra es un adjetivo?", options: ["Correr", "Casa", "Lápiz", "Alegre"], correctAnswer: 3, money: 1000000 },
    { id: 96, difficulty: "expert", question: "¿Cuál palabra va primero en orden alfabético?", options: ["Sol", "Luna", "Casa", "Pato"], correctAnswer: 2, money: 1000000 },
    { id: 97, difficulty: "expert", question: "Ana tiene un perro llamado Toby. Toby juega con la pelota todas las tardes. ¿Cómo se llama el perro de Ana?", options: ["Pelota", "Ana", "Tarde", "Toby"], correctAnswer: 3, money: 1000000 },
    { id: 98, difficulty: "expert", question: "¿Cuáles son las partes principales de una planta?", options: ["Raíz, tallo, hojas y flores", "Cabeza, tronco y patas", "Ruedas y motor", "Pantalla y teclado"], correctAnswer: 0, money: 1000000 },
    { id: 99, difficulty: "expert", question: "¿Qué animal produce la miel?", options: ["Mariposa", "Abeja", "Hormiga", "Mosca"], correctAnswer: 1, money: 1000000 },
    { id: 100, difficulty: "expert", question: "Cuando el agua líquida se calienta mucho, ¿en qué se convierte?", options: ["Hielo", "Arena", "Vapor", "Tierra"], correctAnswer: 2, money: 1000000 }

];

export default questions;
