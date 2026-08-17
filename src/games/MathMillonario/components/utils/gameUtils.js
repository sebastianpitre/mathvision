// =====================================================
// MATH MILLONARIO
// UTILIDADES DEL JUEGO
// =====================================================


// =====================================================
// MEZCLAR ARRAY
// =====================================================

export const shuffleArray = (array) => {

    return [...array].sort(
        () => Math.random() - 0.5
    );

};


// =====================================================
// SELECCIONAR PREGUNTAS PARA UNA PARTIDA
// =====================================================
//
// Recibe las 30 preguntas del banco
// y devuelve solamente 10.
//
// Intentamos mantener variedad de dificultad
// para que no salgan las 10 preguntas fáciles.
//

export const selectGameQuestions = (
    questions,
    amount = 10
) => {

    if (!Array.isArray(questions)) {
        return [];
    }


    if (questions.length <= amount) {
        return shuffleArray(questions);
    }


    // -------------------------------------------------
    // Separar por dificultad
    // -------------------------------------------------

    const easy = questions.filter(
        (question) =>
            question.difficulty === "easy"
    );


    const medium = questions.filter(
        (question) =>
            question.difficulty === "medium"
    );


    const hard = questions.filter(
        (question) =>
            question.difficulty === "hard"
    );


    const expert = questions.filter(
        (question) =>
            question.difficulty === "expert"
    );


    // -------------------------------------------------
    // Mezclar cada grupo
    // -------------------------------------------------

    const shuffledEasy =
        shuffleArray(easy);

    const shuffledMedium =
        shuffleArray(medium);

    const shuffledHard =
        shuffleArray(hard);

    const shuffledExpert =
        shuffleArray(expert);


    // -------------------------------------------------
    // Construir una partida equilibrada
    // -------------------------------------------------
    //
    // 1-2 : fáciles
    // 3-5 : medias
    // 6-8 : difíciles
    // 9-10: expertas
    //

    const selected = [

        ...shuffledEasy.slice(0, 2),

        ...shuffledMedium.slice(0, 3),

        ...shuffledHard.slice(0, 3),

        ...shuffledExpert.slice(0, 2)

    ];


    // -------------------------------------------------
    // Por seguridad
    // -------------------------------------------------

    if (selected.length < amount) {

        const selectedIds =
            new Set(
                selected.map(
                    (question) =>
                        question.id
                )
            );


        const remaining =
            shuffleArray(
                questions.filter(
                    (question) =>
                        !selectedIds.has(
                            question.id
                        )
                )
            );


        selected.push(
            ...remaining.slice(
                0,
                amount - selected.length
            )
        );

    }


    // -------------------------------------------------
    // Ordenar nuevamente
    // -------------------------------------------------
    //
    // La dificultad no queda agrupada.
    //

    return selected.slice(0, amount);

};


// =====================================================
// OBTENER ÍNDICES DE RESPUESTAS INCORRECTAS
// =====================================================
//
// Se utiliza para el 50/50.
//
// Devuelve dos respuestas incorrectas
// que pueden ser eliminadas.
//

export const getFiftyFiftyOptions = (
    question
) => {

    if (
        !question ||
        !Array.isArray(question.options)
    ) {
        return [];
    }


    const incorrectOptions =
        question.options.filter(
            (option) =>
                option !== question.answer
        );


    return shuffleArray(
        incorrectOptions
    ).slice(0, 2);

};


// =====================================================
// APLICAR 50/50
// =====================================================
//
// Devuelve las respuestas que deben quedar
// disponibles después de utilizar la ayuda.
//

export const applyFiftyFifty = (
    question
) => {

    if (
        !question ||
        !Array.isArray(question.options)
    ) {
        return [];
    }


    const incorrectOptions =
        getFiftyFiftyOptions(
            question
        );


    return question.options.filter(
        (option) =>
            option === question.answer ||
            !incorrectOptions.includes(option)
    );

};


// =====================================================
// COMPROBAR RESPUESTA
// =====================================================

export const isCorrectAnswer = (
    question,
    answer
) => {

    if (!question) {
        return false;
    }


    return (
        String(answer).trim() ===
        String(question.answer).trim()
    );

};


// =====================================================
// OBTENER PORCENTAJE
// =====================================================

export const calculatePercentage = (
    correct,
    total
) => {

    if (!total) {
        return 0;
    }


    return Math.round(
        (correct / total) * 100
    );

};


// =====================================================
// FORMATEAR NÚMERO
// =====================================================

export const formatNumber = (
    number
) => {

    return new Intl.NumberFormat(
        "es-CO"
    ).format(number);

};