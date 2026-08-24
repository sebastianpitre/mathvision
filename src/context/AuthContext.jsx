import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import {
    login as loginService,
    saveSession,
    getSession,
    logout as logoutService
} from "../services/authService";


// =====================================================
// CONTEXTO
// =====================================================

const AuthContext = createContext(null);


// =====================================================
// PROVIDER
// =====================================================

export function AuthProvider({ children }) {

    const [user, setUser] = useState(null);

    const [loading, setLoading] =
        useState(true);


    // =================================================
    // RECUPERAR SESIÓN
    // =================================================

    useEffect(() => {

        const session =
            getSession();


        if (session) {

            setUser(session);

        }


        setLoading(false);

    }, []);


    // =================================================
    // LOGIN
    // =================================================

    const login = (
        username,
        password
    ) => {

        const result =
            loginService(
                username,
                password
            );


        if (!result.success) {

            return result;

        }


        saveSession(
            result.user
        );


        setUser(
            result.user
        );


        return {

            success: true,

            user: result.user

        };

    };


    // =================================================
    // LOGOUT
    // =================================================

    const logout = () => {

        logoutService();

        setUser(null);

    };


    // =================================================
    // VALOR DEL CONTEXTO
    // =================================================

    const value = {

        user,

        loading,

        isAuthenticated:
            Boolean(user),

        login,

        logout

    };


    return (

        <AuthContext.Provider
            value={value}
        >

            {children}

        </AuthContext.Provider>

    );

}


// =====================================================
// HOOK
// =====================================================

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