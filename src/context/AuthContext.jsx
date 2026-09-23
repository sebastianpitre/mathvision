import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import {
    login as loginService,
    register as registerService,
    getSession,
    logout as logoutService
} from "../services/authService";


const AuthContext =
    createContext(null);


export function AuthProvider({
    children
}) {

    const [
        user,
        setUser
    ] = useState(null);


    const [
        loading,
        setLoading
    ] = useState(true);


    /* =====================================================
       RESTAURAR SESIÓN
       ===================================================== */

    useEffect(() => {

        async function restoreSession() {

            const session =
                await getSession();


            if (session) {

                setUser(
                    session
                );

            }


            setLoading(false);

        }


        restoreSession();

    }, []);


    /* =====================================================
       LOGIN
       ===================================================== */

    const login = async (
        username,
        password
    ) => {

        const result =
            await loginService(
                username,
                password
            );


        if (!result.success) {

            return result;

        }


        setUser(
            result.user
        );


        return result;

    };


    /* =====================================================
       REGISTRO
       ===================================================== */

    const register = async (
        username,
        email,
        password
    ) => {

        const result =
            await registerService(
                username,
                email,
                password
            );


        if (!result.success) {

            return result;

        }


        setUser(
            result.user
        );


        return result;

    };


    /* =====================================================
       ACTUALIZAR PERFIL DESDE EL SERVIDOR
       ===================================================== */

    const refreshUser = async () => {

        const session =
            await getSession();


        if (session) {

            setUser(
                session
            );

        }


        return session;

    };


    /* =====================================================
       LOGOUT
       ===================================================== */

    const logout = () => {

        logoutService();

        setUser(null);

    };


    const value = {

        user,

        loading,

        isAuthenticated:
            Boolean(user),

        login,

        register,

        logout,

        refreshUser,

    };


    return (
        <AuthContext.Provider
            value={value}
        >
            {children}
        </AuthContext.Provider>
    );

}


export function useAuth() {

    const context =
        useContext(
            AuthContext
        );


    if (!context) {

        throw new Error(
            "useAuth debe utilizarse dentro de AuthProvider"
        );

    }


    return context;

}