import React, {
    Suspense,
    useEffect,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    Canvas
} from "@react-three/fiber";

import {
    OrbitControls,
    Environment,
    Html
} from "@react-three/drei";

import "../styles/mathvision.css";

import navigation from "../data/mock/navigation.json";
import assets from "../data/mock/assets.json";

import AssetImage from "../components/common/AssetImage";
import VRMCharacter from "../components/character/VRMCharacter";

import {
    useAuth
} from "../context/AuthContext";

import {
    getToken
} from "../services/authService";


/* =========================================================
   CARGANDO PERSONAJE
   ========================================================= */

function CharacterLoading() {
    return (
        <Html
            center
            style={{
                pointerEvents: "none"
            }}
        >
            <div
                style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "white",
                    whiteSpace: "nowrap"
                }}
            >
                <div
                    style={{
                        fontSize: "36px",
                        marginBottom: "10px"
                    }}
                >
                    🧍
                </div>

                <strong>
                    CARGANDO PERSONAJE...
                </strong>
            </div>
        </Html>
    );
}

/* =========================================================
   PERSONAJE
   ========================================================= */

export default function Character() {

    const navigate =
        useNavigate();

    const {
        user,
        loading,
        refreshUser
    } = useAuth();


    /* =====================================================
       PERSONAJES DISPONIBLES
       ===================================================== */

    const [
        characters,
        setCharacters
    ] = useState([]);

    const [
        selectedCharacter,
        setSelectedCharacter
    ] = useState(null);

    const [
        loadingCharacters,
        setLoadingCharacters
    ] = useState(true);


    /* =====================================================
       ESTADO DE GUARDADO
       ===================================================== */

    const [
        saving,
        setSaving
    ] = useState(false);

    const [
        saveMessage,
        setSaveMessage
    ] = useState("");


    /* =====================================================
       CARGAR PERSONAJES DESDE EL SERVIDOR
       ===================================================== */

    useEffect(() => {

        if (!user) {
            return;
        }


        async function loadCharacters() {

            try {

                setLoadingCharacters(true);


                const token =
                    getToken();


                if (!token) {

                    setSaveMessage(
                        "Sesión no encontrada."
                    );

                    return;
                }


                const response =
                    await fetch(
                        `http://${window.location.hostname}:3000/api/users/characters`,
{
    method: "GET",

        headers: {
        Authorization:
        `Bearer ${token}`
    }
}
                    );


const data =
    await response.json();


if (!response.ok) {

    throw new Error(
        data?.message ||
        "No fue posible cargar los personajes."
    );

}


const availableCharacters =
    Array.isArray(
        data.characters
    )
        ? data.characters
        : [];


setCharacters(
    availableCharacters
);


/* =========================================
   BUSCAR PERSONAJE ACTUAL DEL USUARIO
   ========================================= */

const currentCharacter =
    availableCharacters.find(
        (character) =>
            character.id ===
            user.character_id
    );


/*
 * Si el usuario ya tiene personaje,
 * lo seleccionamos.
 *
 * Si no existe o no está disponible,
 * usamos el personaje marcado como default.
 */

const defaultCharacter =
    availableCharacters.find(
        (character) =>
            character.is_default
    );


setSelectedCharacter(
    currentCharacter ||
    defaultCharacter ||
    availableCharacters[0] ||
    null
);


            } catch (error) {

    console.error(
        "❌ Error cargando personajes:",
        error
    );


    setSaveMessage(
        error.message ||
        "Error cargando personajes."
    );


} finally {

    setLoadingCharacters(false);

}

        }


loadCharacters();

    }, [user]);


/* =====================================================
   CARGANDO SESIÓN
   ===================================================== */

if (loading) {

    return (

        <div
            className="mv-app"
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}
        >

            <strong>
                CARGANDO PERFIL...
            </strong>

        </div>

    );

}


/* =====================================================
   SIN SESIÓN
   ===================================================== */

if (!user) {

    return (

        <div
            className="mv-app"
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "20px"
            }}
        >

            <strong>
                SESIÓN NO ENCONTRADA
            </strong>


            <button
                className="mv-btn mv-btn-primary"
                type="button"
                onClick={() =>
                    navigate("/auth-test")
                }
            >
                INICIAR SESIÓN
            </button>

        </div>

    );

}


/* =====================================================
   DATOS REALES DEL USUARIO
   ===================================================== */

const displayName =
    user.display_name ||
    user.username ||
    "Jugador";


const level =
    Number(user.level) || 1;


const coins =
    Number(user.coins) || 0;


const gems =
    Number(user.gems) || 0;


const avatar =
    user.avatar ||
    assets.players.defaultAvatar;


const xp =
    Number(user.xp) || 0;


const xpPercentage =
    Math.min(
        100,
        Math.max(
            0,
            (
                (xp % 1000) /
                1000
            ) * 100
        )
    );


/* =====================================================
   GUARDAR PERSONAJE
   ===================================================== */

async function handleSaveCharacter() {

    try {

        if (!selectedCharacter) {

            setSaveMessage(
                "Selecciona un personaje."
            );

            return;
        }


        setSaving(true);
        setSaveMessage("");


        const token =
            getToken();


        if (!token) {

            setSaveMessage(
                "Sesión no encontrada."
            );

            return;
        }


        const response =
            await fetch(
                `http://${window.location.hostname}:3000/api/users/character`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify({
                            characterId:
                                selectedCharacter.id
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data?.message ||
                "No fue posible guardar el personaje."
            );

        }


        console.log(
            "✅ Personaje guardado:",
            data.user
        );


        /*
         * Actualizamos el perfil completo
         * desde PostgreSQL.
         *
         * Esto evita tener que hacer F5.
         */

        const updatedUser =
            await refreshUser();


        console.log(
            "🔄 Perfil actualizado:",
            updatedUser
        );


        setSaveMessage(
            "PERSONAJE GUARDADO"
        );


    } catch (error) {

        console.error(
            "❌ Error guardando personaje:",
            error
        );


        setSaveMessage(
            error.message ||
            "Error guardando el personaje."
        );


    } finally {

        setSaving(false);

    }

}


return (

    <div className="mv-app character-page-app">


        {/* =================================================
                BACKGROUND
               ================================================= */}

        <div
            className="lobby-background"
            style={{
                backgroundImage:
                    `url(${assets.backgrounds.lobby})`
            }}
        />


        {/* =================================================
                HEADER
               ================================================= */}

        <header className="mv-header">


            {/* =================================================
                    LOGO
                   ================================================= */}

            <div
                className="mv-logo"
                onClick={() =>
                    navigate("/lobby")
                }
            >

                <div className="mv-logo-main">
                    MATH<span>VISION</span>
                </div>

                <div className="mv-logo-sub">
                    JUEGA • APRENDE • CONECTA
                </div>

            </div>


            {/* =================================================
                    NAVEGACIÓN
                   ================================================= */}

            <nav className="mv-nav">

                {navigation.map(
                    (item) => (

                        <button
                            key={item.id}
                            className={
                                `mv-nav-item ${item.id === "character"
                                    ? "active"
                                    : ""
                                }`
                            }
                            onClick={() =>
                                navigate(
                                    item.route
                                )
                            }
                        >

                            <b>
                                {item.icon}
                            </b>

                            <span>
                                {item.label}
                            </span>

                        </button>

                    )
                )}

            </nav>


            {/* =================================================
                    USUARIO
                   ================================================= */}

            <div className="lobby-header-player">

                <div className="mv-avatar-small">

                    <AssetImage
                        src={avatar}
                        type="player"
                        alt={displayName}
                    />

                </div>


                <div className="lobby-header-player-info">

                    <strong>
                        {displayName}
                    </strong>


                    <span>
                        NIVEL {level}
                    </span>


                    <div className="mv-xp">

                        <div
                            style={{
                                width:
                                    `${xpPercentage}%`
                            }}
                        />

                    </div>

                </div>

            </div>


            {/* =================================================
                    MONEDAS
                   ================================================= */}

            <div className="lobby-currencies">

                <div>

                    🪙

                    <strong>
                        {coins.toLocaleString()}
                    </strong>

                </div>


                <div>

                    💎

                    <strong>
                        {gems}
                    </strong>

                </div>

            </div>


            {/* =================================================
                    CONFIGURACIÓN
                   ================================================= */}

            <button
                className="mv-settings"
                type="button"
            >
                ⚙
            </button>

        </header>


        {/* =================================================
                CONTENIDO
               ================================================= */}

        <main className="character-main">


            {/* =================================================
                    TÍTULO
                   ================================================= */}

            <div className="character-title-row">

                <div>

                    <span className="eyebrow">
                        AVATAR
                    </span>


                    <h1>
                        MI PERSONAJE
                    </h1>


                    <p>
                        Elige el personaje que representará
                        tu identidad dentro de MathVision.
                    </p>

                </div>


                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px"
                    }}
                >

                    {saveMessage && (

                        <span
                            style={{
                                fontWeight: "700"
                            }}
                        >
                            {saveMessage}
                        </span>

                    )}


                    <button
                        className="mv-btn mv-btn-primary"
                        type="button"
                        onClick={
                            handleSaveCharacter
                        }
                        disabled={
                            saving ||
                            !selectedCharacter
                        }
                    >

                        {saving
                            ? "💾 GUARDANDO..."
                            : "💾 GUARDAR PERSONAJE"
                        }

                    </button>

                </div>

            </div>


            {/* =================================================
                    EDITOR
                   ================================================= */}

            <div className="character-editor">


                {/* =================================================
                        PREVISUALIZACIÓN
                       ================================================= */}

                <section className="character-preview">


                    {/* =================================================
                            NOMBRE
                           ================================================= */}

                    <div className="character-name">

                        <span>
                            👑
                        </span>


                        <div>

                            <strong>
                                {displayName}
                            </strong>


                            <small>
                                NIVEL {level}
                            </small>

                        </div>

                    </div>


                    {/* =================================================
                            CANVAS 3D
                           ================================================= */}

                    <Canvas
                        className="character-canvas"
                        camera={{
                            position: [
                                0,
                                1.2,
                                4.5
                            ],
                            fov: 40
                        }}
                    >

                        <ambientLight
                            intensity={1.5}
                        />


                        <directionalLight
                            position={[
                                4,
                                6,
                                4
                            ]}
                            intensity={3}
                        />


                        <Environment
                            preset="city"
                        />


                        <Suspense
                            fallback={
                                <CharacterLoading />
                            }
                        >

                            {selectedCharacter && (

                                <VRMCharacter
                                    key={
                                        selectedCharacter.model_path
                                    }
                                    url={
                                        selectedCharacter.model_path
                                    }
                                    scale={1.5}
                                    position={[0, -1.3, 0]}
                                    rotation={[0, 0, 0]}
                                />

                            )}

                        </Suspense>


                        <OrbitControls
                            enableZoom={false}
                            enablePan={false}
                            enableRotate={true}
                            enableDamping={true}
                            minPolarAngle={
                                Math.PI / 2
                            }
                            maxPolarAngle={
                                Math.PI / 2
                            }
                            minAzimuthAngle={
                                -Infinity
                            }
                            maxAzimuthAngle={
                                Infinity
                            }
                        />

                    </Canvas>


                    {/* =================================================
                            INFORMACIÓN
                           ================================================= */}

                    <div className="character-preview-info">

                        <span>
                            PERSONAJE ACTUAL
                        </span>


                        <strong>
                            {
                                selectedCharacter?.name ||
                                "SIN PERSONAJE"
                            }
                        </strong>


                        <small>
                            Personaje 3D VRM
                        </small>

                    </div>

                </section>


                {/* =================================================
                        PANEL DE PERSONAJES
                       ================================================= */}

                <section className="customization-panel">


                    <div className="character-panel-heading">

                        <div>

                            <span className="eyebrow">
                                PERSONAJES
                            </span>


                            <h2>
                                ELEGIR PERSONAJE
                            </h2>

                        </div>

                    </div>


                    {/* =================================================
                            LISTA DINÁMICA DE PERSONAJES
                           ================================================= */}

                    <div className="custom-section">

                        <label>
                            🧍 PERSONAJES DISPONIBLES
                        </label>


                        {loadingCharacters ? (

                            <div
                                style={{
                                    padding:
                                        "20px 0"
                                }}
                            >
                                CARGANDO PERSONAJES...
                            </div>

                        ) : characters.length === 0 ? (

                            <div
                                style={{
                                    padding:
                                        "20px 0"
                                }}
                            >
                                NO HAY PERSONAJES DISPONIBLES
                            </div>

                        ) : (

                            <div
                                className="color-options"
                            >

                                {characters.map(
                                    (character) => (

                                        <button
                                            key={
                                                character.id
                                            }
                                            type="button"
                                            className={
                                                `color-option ${selectedCharacter?.id ===
                                                    character.id
                                                    ? "selected"
                                                    : ""
                                                }`
                                            }
                                            onClick={() => {

                                                setSelectedCharacter(
                                                    character
                                                );

                                                setSaveMessage(
                                                    ""
                                                );

                                            }}
                                            title={
                                                character.name
                                            }
                                        >

                                            {character.thumbnail_path ? (

                                                <img
                                                    src={
                                                        character.thumbnail_path
                                                    }
                                                    alt={
                                                        character.name
                                                    }
                                                    style={{
                                                        width:
                                                            "100%",
                                                        height:
                                                            "100%",
                                                        objectFit:
                                                            "cover",
                                                        borderRadius:
                                                            "inherit"
                                                    }}
                                                />

                                            ) : (

                                                <span
                                                    style={{
                                                        fontSize:
                                                            "24px"
                                                    }}
                                                >
                                                    🧍
                                                </span>

                                            )}

                                        </button>

                                    )
                                )}

                            </div>

                        )}

                    </div>


                    {/* =================================================
                            PERSONAJE SELECCIONADO
                           ================================================= */}

                    {selectedCharacter && (

                        <div
                            className="locked-items"
                            style={{
                                marginTop:
                                    "20px"
                            }}
                        >

                            <div>
                                🧍
                            </div>


                            <div>

                                <strong>
                                    {selectedCharacter.name}
                                </strong>


                                <small>
                                    Personaje seleccionado.
                                    Pulsa guardar para
                                    establecerlo como tu
                                    personaje permanente.
                                </small>

                            </div>

                        </div>

                    )}


                </section>

            </div>

        </main>

    </div>
);
}