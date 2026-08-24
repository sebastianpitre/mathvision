import {
    findUser
} from "./providers/LocalProvider";


// =====================================================
// LOGIN
// =====================================================

export const login = (
    username,
    password
) => {

    const user =
        findUser(username);


    if (!user) {

        return {

            success: false,

            message:
                "El usuario no existe."

        };

    }


    if (
        user.password !==
        password
    ) {

        return {

            success: false,

            message:
                "La contraseña es incorrecta."

        };

    }


    const sessionUser = {

        ...user

    };


    delete sessionUser.password;


    return {

        success: true,

        user: sessionUser

    };

};


// =====================================================
// SESIÓN
// =====================================================

export const saveSession = (
    user
) => {

    localStorage.setItem(

        "mathvision_session",

        JSON.stringify(user)

    );

};


// =====================================================
// OBTENER SESIÓN
// =====================================================

export const getSession = () => {

    try {

        const data =
            localStorage.getItem(
                "mathvision_session"
            );


        if (!data) {
            return null;
        }


        return JSON.parse(data);

    } catch {

        return null;

    }

};


// =====================================================
// CERRAR SESIÓN
// =====================================================

export const logout = () => {

    localStorage.removeItem(
        "mathvision_session"
    );

};