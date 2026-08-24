import { useAuth } from "../context/AuthContext";


export default function AuthTest() {

    const {
        user,
        loading,
        isAuthenticated,
        login,
        logout
    } = useAuth();


    if (loading) {

        return (
            <div>
                Cargando sesión...
            </div>
        );

    }


    const handleLogin = () => {

        const result =
            login(
                "estudiante",
                "1234"
            );


        console.log(
            "Resultado login:",
            result
        );

    };


    return (

        <div className="
            flex
            min-h-screen
            items-center
            justify-center
            bg-slate-950
            p-6
            text-white
        ">

            <div className="
                w-full
                max-w-md
                rounded-3xl
                border
                border-slate-800
                bg-slate-900
                p-8
            ">

                <h1 className="
                    text-2xl
                    font-black
                ">

                    MathVision Auth

                </h1>


                {!isAuthenticated ? (

                    <div className="mt-6">

                        <p className="
                            mb-4
                            text-slate-400
                        ">

                            No hay una sesión iniciada.

                        </p>


                        <button
                            onClick={
                                handleLogin
                            }
                            className="
                                w-full
                                rounded-xl
                                bg-cyan-500
                                py-3
                                font-black
                                text-slate-950
                            "
                        >

                            INICIAR SESIÓN DE PRUEBA

                        </button>

                    </div>

                ) : (

                    <div className="mt-6">

                        <p className="
                            text-emerald-400
                            font-bold
                        ">

                            ✓ Sesión iniciada

                        </p>


                        <div className="
                            mt-4
                            rounded-2xl
                            bg-slate-800
                            p-4
                        ">

                            <p>
                                Usuario:{" "}
                                <strong>
                                    {user.username}
                                </strong>
                            </p>

                            <p>
                                Nombre:{" "}
                                <strong>
                                    {user.name}
                                </strong>
                            </p>

                            <p>
                                XP:{" "}
                                <strong>
                                    {user.xp}
                                </strong>
                            </p>

                            <p>
                                Nivel:{" "}
                                <strong>
                                    {user.level}
                                </strong>
                            </p>

                        </div>


                        <button
                            onClick={logout}
                            className="
                                mt-5
                                w-full
                                rounded-xl
                                border
                                border-red-500/30
                                py-3
                                font-black
                                text-red-400
                            "
                        >

                            CERRAR SESIÓN

                        </button>

                    </div>

                )}

            </div>

        </div>

    );

}