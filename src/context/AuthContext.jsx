import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
    login as loginService,
    register as registerService,
    getSession,
    logout as logoutService,
} from "../services/authService";

import { socket } from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    /* Restaurar la sesión al abrir el juego */
    useEffect(() => {
        let cancelado = false;

        getSession().then((session) => {
            if (cancelado) return;
            if (session) setUser(session);
            setLoading(false);
        });

        return () => {
            cancelado = true;
        };
    }, []);

    const login = useCallback(async (username, password) => {
        const result = await loginService(username, password);
        if (result?.success) setUser(result.user);
        return result;
    }, []);

    const register = useCallback(async (username, email, password) => {
        const result = await registerService(username, email, password);
        if (result?.success) setUser(result.user);
        return result;
    }, []);

    /* Volver a pedir el perfil al servidor */
    const refreshUser = useCallback(async () => {
        const session = await getSession();
        if (session) setUser(session);
        return session;
    }, []);

    /*
     * Cuando el servidor ya devolvió el perfil nuevo (al
     * terminar una partida o comprar algo) se usa directo,
     * sin otra petición.
     */
    const actualizarUsuario = useCallback((perfil) => {
        if (perfil) setUser((anterior) => ({ ...anterior, ...perfil }));
    }, []);

    const logout = useCallback(() => {
        logoutService();
        if (socket.connected) socket.disconnect();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({
            user,
            loading,
            isAuthenticated: Boolean(user),
            esAdmin: Boolean(user?.es_admin),
            login,
            register,
            logout,
            refreshUser,
            actualizarUsuario,
        }),
        [user, loading, login, register, logout, refreshUser, actualizarUsuario]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth debe utilizarse dentro de AuthProvider");
    }

    return context;
}
