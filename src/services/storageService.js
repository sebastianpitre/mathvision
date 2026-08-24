const STORAGE_KEY = "mathvision_database";


// =====================================================
// OBTENER BASE DE DATOS
// =====================================================

export const getDatabase = () => {

    try {

        const data =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!data) {
            return null;
        }

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "Error leyendo MathVision:",
            error
        );

        return null;
    }
};


// =====================================================
// GUARDAR BASE DE DATOS
// =====================================================

export const saveDatabase = (database) => {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(database)
        );

        return true;

    } catch (error) {

        console.error(
            "Error guardando MathVision:",
            error
        );

        return false;
    }
};


// =====================================================
// ELIMINAR BASE DE DATOS
// =====================================================

export const clearDatabase = () => {

    localStorage.removeItem(
        STORAGE_KEY
    );

};