// =====================================================
// ESCALERA DE PREMIOS
// =====================================================

const moneyLevels = [
    5000,
    8000,
    10000,
    13000,
    20000,
    30000,
    40000,
    50000,
    75000,
    100000
];


// =====================================================
// FORMATEAR DINERO
// =====================================================

export const formatMoney = (amount) => {

    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(amount);

};


// =====================================================
// OBTENER PREMIO DE UNA PREGUNTA
// =====================================================

export const getQuestionMoney = (questionIndex) => {

    return moneyLevels[questionIndex] || 0;

};


// =====================================================
// OBTENER PREMIO ANTERIOR
// =====================================================

export const getPreviousMoney = (questionIndex) => {

    if (questionIndex <= 0) {
        return 0;
    }

    return moneyLevels[questionIndex - 1] || 0;

};


// =====================================================
// OBTENER PREMIO SIGUIENTE
// =====================================================

export const getNextMoney = (questionIndex) => {

    return moneyLevels[questionIndex + 1] || null;

};


// =====================================================
// EXPORTAR ESCALERA
// =====================================================

export default moneyLevels;