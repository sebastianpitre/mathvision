import {
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function AuthTest() {

    const navigate =
        useNavigate();

    const {
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout
    } = useAuth();

    const [mode, setMode] = useState("login");

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [processing, setProcessing] = useState(false);


    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h1>MathVision</h1>
                    <p>Verificando sesión...</p>
                </div>
            </div>
        );
    }


    const handleSubmit = async (event) => {

        event.preventDefault();

        setMessage("");
        setError("");
        setProcessing(true);

        try {

            let result;

            if (mode === "register") {

                result = await register(
                    username,
                    email,
                    password
                );

            } else {

                result = await login(
                    username,
                    password
                );

            }


            if (!result?.success) {

                setError(
                    result?.message ||
                    "No fue posible completar la operación."
                );

                return;
            }

            navigate("/lobby");


            setMessage(
                mode === "register"
                    ? "Cuenta creada correctamente."
                    : "Inicio de sesión correcto."
            );

            navigate("/lobby");

        } catch (error) {

            setError(
                error.message ||
                "Ocurrió un error."
            );

        } finally {

            setProcessing(false);

        }
    };


    const handleLogout = () => {

        logout();

        setMessage(
            "Sesión cerrada correctamente."
        );

        setError("");

    };


    if (isAuthenticated) {

        return (
            <div style={styles.container}>

                <div style={styles.card}>

                    <h1>MathVision</h1>

                    <h2>Sesión activa</h2>

                    <div style={styles.profile}>

                        <p>
                            <strong>Usuario:</strong>{" "}
                            {user?.username}
                        </p>

                        <p>
                            <strong>Nombre:</strong>{" "}
                            {user?.display_name}
                        </p>

                        <p>
                            <strong>Nivel:</strong>{" "}
                            {user?.level}
                        </p>

                        <p>
                            <strong>XP:</strong>{" "}
                            {user?.xp}
                        </p>

                        <p>
                            <strong>Monedas:</strong>{" "}
                            {user?.coins}
                        </p>

                        <p>
                            <strong>Gemas:</strong>{" "}
                            {user?.gems}
                        </p>

                        <p>
                            <strong>Personaje:</strong>{" "}
                            {user?.character_id}
                        </p>

                    </div>


                    {message && (
                        <div style={styles.success}>
                            {message}
                        </div>
                    )}


                    <button
                        type="button"
                        onClick={handleLogout}
                        style={styles.button}
                    >
                        Cerrar sesión
                    </button>

                    <button
                        type="button"
                        onClick={// Aquí puedes redirigir al usuario al Lobby
                            () => {
                                window.location.href = "/lobby";
                            }
                        }
                        style={styles.button}
                    >
                        Ir al Lobby
                    </button>

                </div>

            </div>
        );
    }


    return (
        <div style={styles.container}>

            <div style={styles.card}>

                <h1>MathVision</h1>

                <h2>
                    {mode === "login"
                        ? "Iniciar sesión"
                        : "Crear cuenta"}
                </h2>


                <form onSubmit={handleSubmit}>

                    <input
                        type="text"
                        placeholder="Usuario"
                        value={username}
                        onChange={(event) =>
                            setUsername(event.target.value)
                        }
                        required
                        style={styles.input}
                    />


                    {mode === "register" && (
                        <input
                            type="email"
                            placeholder="Correo electrónico"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            required
                            style={styles.input}
                        />
                    )}


                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(event) =>
                            setPassword(event.target.value)
                        }
                        required
                        style={styles.input}
                    />


                    {error && (
                        <div style={styles.error}>
                            {error}
                        </div>
                    )}


                    {message && (
                        <div style={styles.success}>
                            {message}
                        </div>
                    )}


                    <button
                        type="submit"
                        disabled={processing}
                        style={styles.button}
                    >
                        {processing
                            ? "Procesando..."
                            : mode === "login"
                                ? "Entrar"
                                : "Crear cuenta"}
                    </button>

                </form>


                <button
                    type="button"
                    onClick={() => {
                        setMode(
                            mode === "login"
                                ? "register"
                                : "login"
                        );

                        setError("");
                        setMessage("");
                    }}
                    style={styles.secondaryButton}
                >
                    {mode === "login"
                        ? "Crear una cuenta"
                        : "Ya tengo una cuenta"}
                </button>

            </div>

        </div>
    );
}


const styles = {

    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111827",
        padding: "20px"
    },

    card: {
        width: "100%",
        maxWidth: "420px",
        padding: "30px",
        borderRadius: "16px",
        background: "#1f2937",
        color: "#ffffff",
        boxShadow: "0 20px 50px rgba(0,0,0,0.35)"
    },

    profile: {
        marginTop: "20px",
        padding: "15px",
        borderRadius: "10px",
        background: "#111827"
    },

    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "12px",
        marginBottom: "12px",
        borderRadius: "8px",
        border: "1px solid #4b5563",
        background: "#111827",
        color: "#ffffff",
        outline: "none"
    },

    button: {
        width: "100%",
        padding: "12px",
        marginTop: "10px",
        border: "none",
        borderRadius: "8px",
        background: "#2563eb",
        color: "#ffffff",
        fontWeight: "bold",
        cursor: "pointer"
    },

    secondaryButton: {
        width: "100%",
        padding: "10px",
        marginTop: "12px",
        border: "1px solid #4b5563",
        borderRadius: "8px",
        background: "transparent",
        color: "#ffffff",
        cursor: "pointer"
    },

    error: {
        marginBottom: "10px",
        padding: "10px",
        borderRadius: "8px",
        background: "#7f1d1d",
        color: "#fecaca"
    },

    success: {
        marginBottom: "10px",
        padding: "10px",
        borderRadius: "8px",
        background: "#14532d",
        color: "#bbf7d0"
    }
};