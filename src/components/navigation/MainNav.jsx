import React, {
    useEffect,
    useRef,
    useState
} from "react";

import {
    FaUser,
    FaCog,
    FaSignOutAlt,
    FaChevronDown,
    FaBars,
    FaTimes,
    FaCoins,
    FaGem,
    FaUserCircle
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

import {
    motion,
    AnimatePresence
} from "framer-motion";

import AssetImage from "../common/AssetImage";

import { useAuth } from "../../context/AuthContext";


export default function MainNav({
    navigation = [],
    player
}) {

    const navigate = useNavigate();

    const {
        logout
    } = useAuth();


    const [menuOpen, setMenuOpen] =
        useState(false);

    const [mobileOpen, setMobileOpen] =
        useState(false);


    const menuRef =
        useRef(null);


    /* =====================================================
       CERRAR MENÚ AL HACER CLICK AFUERA
    ===================================================== */

    useEffect(() => {

        function handleClickOutside(event) {

            if (
                menuRef.current &&
                !menuRef.current.contains(
                    event.target
                )
            ) {

                setMenuOpen(false);

            }

        }


        document.addEventListener(
            "mousedown",
            handleClickOutside
        );


        return () => {

            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );

        };

    }, []);


    /* =====================================================
       NAVEGAR
    ===================================================== */

    function goTo(route) {

        setMobileOpen(false);
        setMenuOpen(false);

        navigate(route);

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function handleLogout() {

        setMenuOpen(false);
        setMobileOpen(false);

        await logout();

        navigate("/");

    }


    return (

        <header
            className="
                sticky top-0 z-50
                w-full
                border-b border-white/10
                bg-slate-950/75
                backdrop-blur-xl
                supports-[backdrop-filter]:bg-slate-950/60
            "
        >

            <div
                className="
                    mx-auto
                    flex
                    min-h-[76px]
                    w-full
                    max-w-[1600px]
                    items-center
                    gap-4
                    px-4
                    sm:px-6
                    lg:px-8
                "
            >

                {/* =================================================
                    LOGO
                ================================================= */}

                <button
                    type="button"
                    onClick={() =>
                        goTo("/")
                    }
                    className="
                        group
                        shrink-0
                        text-left
                        outline-none
                    "
                >

                    <div
                        className="
                            text-[21px]
                            font-black
                            leading-none
                            tracking-tight
                            text-white
                            transition-transform
                            duration-200
                            group-hover:scale-[1.03]
                        "
                    >

                        LUDO
                        <span className="text-indigo-400">
                            GAMIF
                        </span>

                    </div>


                    <div
                        className="
                            mt-1
                            hidden
                            text-[8px]
                            font-bold
                            tracking-[0.18em]
                            text-white/40
                            sm:block
                        "
                    >
                        JUEGA • APRENDE • CONECTA
                    </div>

                </button>


                {/* =================================================
                    NAV DESKTOP
                ================================================= */}

                <nav
                    className="
                        ml-3
                        hidden
                        items-center
                        gap-1
                        lg:flex
                    "
                >

                    {navigation.map(
                        (item) => {

                            const isHome =
                                item.id === "home";


                            return (

                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() =>
                                        goTo(
                                            item.route
                                        )
                                    }
                                    className={`
                                        group
                                        relative
                                        flex
                                        items-center
                                        gap-2
                                        rounded-xl
                                        px-4
                                        py-2.5
                                        text-sm
                                        font-bold
                                        transition-all
                                        duration-200
                                        ${isHome
                                            ? `
                                                    bg-white/10
                                                    text-white
                                                  `
                                            : `
                                                    text-white/55
                                                    hover:bg-white/[0.06]
                                                    hover:text-white
                                                  `
                                        }
                                    `}
                                >

                                    <span
                                        className="
                                            text-[15px]
                                            transition-transform
                                            duration-200
                                            group-hover:scale-110
                                        "
                                    >
                                        {item.icon}
                                    </span>

                                    <span>
                                        {item.label}
                                    </span>


                                    {isHome && (

                                        <motion.span
                                            layoutId="main-nav-active"
                                            className="
                                                absolute
                                                bottom-0.5
                                                left-1/2
                                                h-0.5
                                                w-5
                                                -translate-x-1/2
                                                rounded-full
                                                bg-indigo-400
                                            "
                                        />

                                    )}

                                </button>

                            );

                        }
                    )}

                </nav>


                {/* =================================================
                    ESPACIADOR
                ================================================= */}

                <div className="flex-1" />


                {/* =================================================
                    MONEDAS
                ================================================= */}

                <div
                    className="
                        hidden
                        items-center
                        gap-2
                        md:flex
                    "
                >

                    <div
                        className="
                            flex
                            items-center
                            gap-2
                            rounded-xl
                            border
                            border-white/10
                            bg-white/[0.045]
                            px-3
                            py-2
                            text-sm
                            text-white
                            transition
                            hover:bg-white/[0.08]
                        "
                    >

                        <FaCoins
                            className="
                                text-amber-300
                            "
                        />

                        <strong>
                            {(
                                player?.currencies?.coins ||
                                0
                            ).toLocaleString()}
                        </strong>

                    </div>


                    <div
                        className="
                            flex
                            items-center
                            gap-2
                            rounded-xl
                            border
                            border-white/10
                            bg-white/[0.045]
                            px-3
                            py-2
                            text-sm
                            text-white
                            transition
                            hover:bg-white/[0.08]
                        "
                    >

                        <FaGem
                            className="
                                text-cyan-300
                            "
                        />

                        <strong>
                            {
                                player?.currencies?.gems ||
                                0
                            }
                        </strong>

                    </div>

                </div>


                {/* =================================================
                    JUGADOR
                ================================================= */}

                <div
                    ref={menuRef}
                    className="relative"
                >

                    <button
                        type="button"
                        onClick={() =>
                            setMenuOpen(
                                previous =>
                                    !previous
                            )
                        }
                        className="
                            group
                            flex
                            items-center
                            gap-2.5
                            rounded-2xl
                            border
                            border-white/10
                            bg-white/[0.045]
                            p-1.5
                            pr-2.5
                            text-left
                            transition-all
                            duration-200
                            hover:border-white/20
                            hover:bg-white/[0.08]
                            active:scale-[0.98]
                        "
                    >

                        <div
                            className="
                                relative
                                h-10
                                w-10
                                shrink-0
                                overflow-hidden
                                rounded-xl
                                border
                                border-white/15
                                bg-slate-800
                            "
                            onClick={(event) => {

                                event.stopPropagation();

                                goTo("/profile");

                            }}
                        >

                            <AssetImage
                                src={
                                    player?.avatar
                                }
                                type="player"
                                alt={
                                    player?.name ||
                                    player?.displayName ||
                                    "Jugador"
                                }
                                className="
                                    h-full
                                    w-full
                                    object-cover
                                "
                            />

                        </div>


                        <div
                            className="
                                hidden
                                min-w-0
                                sm:block
                            "
                        >

                            <strong
                                className="
                                    block
                                    max-w-[120px]
                                    truncate
                                    text-xs
                                    font-extrabold
                                    text-white
                                "
                            >
                                {
                                    player?.displayName ||
                                    player?.name ||
                                    "Jugador"
                                }
                            </strong>


                            <span
                                className="
                                    block
                                    text-[9px]
                                    font-bold
                                    tracking-wider
                                    text-white/40
                                "
                            >
                                NIVEL {
                                    player?.level ||
                                    1
                                }
                            </span>

                        </div>


                        <FaChevronDown
                            className={`
                                hidden
                                text-[10px]
                                text-white/40
                                transition-transform
                                duration-200
                                sm:block
                                ${menuOpen
                                    ? "rotate-180"
                                    : ""
                                }
                            `}
                        />

                    </button>


                    {/* =================================================
                        DROPDOWN
                    ================================================= */}

                    <AnimatePresence>

                        {menuOpen && (

                            <motion.div
                                initial={{
                                    opacity: 0,
                                    y: -8,
                                    scale: 0.97
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    scale: 1
                                }}
                                exit={{
                                    opacity: 0,
                                    y: -8,
                                    scale: 0.97
                                }}
                                transition={{
                                    duration: 0.16
                                }}
                                className="
                                    absolute
                                    right-0
                                    top-[calc(100%+10px)]
                                    w-64
                                    overflow-hidden
                                    rounded-2xl
                                    border
                                    border-white/10
                                    bg-slate-900/95
                                    shadow-2xl
                                    shadow-black/40
                                    backdrop-blur-2xl
                                "
                            >

                                {/* PERFIL */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        goTo(
                                            "/profile"
                                        )
                                    }
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        px-4
                                        py-3.5
                                        text-left
                                        text-sm
                                        font-bold
                                        text-white/75
                                        transition
                                        hover:bg-white/[0.07]
                                        hover:text-white
                                    "
                                >

                                    <span
                                        className="
                                            flex
                                            h-9
                                            w-9
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-indigo-500/10
                                            text-indigo-300
                                        "
                                    >
                                        <FaUser />
                                    </span>

                                    <span>
                                        Mi perfil
                                    </span>

                                </button>


                                {/* CONFIGURACIÓN */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        goTo(
                                            "/settings"
                                        )
                                    }
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        px-4
                                        py-3.5
                                        text-left
                                        text-sm
                                        font-bold
                                        text-white/75
                                        transition
                                        hover:bg-white/[0.07]
                                        hover:text-white
                                    "
                                >

                                    <span
                                        className="
                                            flex
                                            h-9
                                            w-9
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-white/5
                                            text-white/60
                                        "
                                    >
                                        <FaCog />
                                    </span>

                                    <span>
                                        Configuración
                                    </span>

                                </button>


                                <div
                                    className="
                                        mx-3
                                        border-t
                                        border-white/10
                                    "
                                />


                                {/* CERRAR SESIÓN */}

                                <button
                                    type="button"
                                    onClick={
                                        handleLogout
                                    }
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        px-4
                                        py-3.5
                                        text-left
                                        text-sm
                                        font-bold
                                        text-red-300/80
                                        transition
                                        hover:bg-red-500/10
                                        hover:text-red-300
                                    "
                                >

                                    <span
                                        className="
                                            flex
                                            h-9
                                            w-9
                                            items-center
                                            justify-center
                                            rounded-xl
                                            bg-red-500/10
                                        "
                                    >
                                        <FaSignOutAlt />
                                    </span>

                                    <span>
                                        Cerrar sesión
                                    </span>

                                </button>

                            </motion.div>

                        )}

                    </AnimatePresence>

                </div>


                {/* =================================================
                    MOBILE BUTTON
                ================================================= */}

                <button
                    type="button"
                    onClick={() =>
                        setMobileOpen(
                            previous =>
                                !previous
                        )
                    }
                    className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-white/10
                        bg-white/[0.05]
                        text-white
                        transition
                        hover:bg-white/10
                        lg:hidden
                    "
                >

                    <AnimatePresence
                        mode="wait"
                        initial={false}
                    >

                        {mobileOpen ? (

                            <motion.span
                                key="close"
                                initial={{
                                    rotate: -90,
                                    opacity: 0
                                }}
                                animate={{
                                    rotate: 0,
                                    opacity: 1
                                }}
                                exit={{
                                    rotate: 90,
                                    opacity: 0
                                }}
                            >
                                <FaTimes />
                            </motion.span>

                        ) : (

                            <motion.span
                                key="menu"
                                initial={{
                                    rotate: 90,
                                    opacity: 0
                                }}
                                animate={{
                                    rotate: 0,
                                    opacity: 1
                                }}
                                exit={{
                                    rotate: -90,
                                    opacity: 0
                                }}
                            >
                                <FaBars />
                            </motion.span>

                        )}

                    </AnimatePresence>

                </button>

            </div>


            {/* =====================================================
                MOBILE NAV
            ===================================================== */}

            <AnimatePresence>

                {mobileOpen && (

                    <motion.div
                        initial={{
                            height: 0,
                            opacity: 0
                        }}
                        animate={{
                            height: "auto",
                            opacity: 1
                        }}
                        exit={{
                            height: 0,
                            opacity: 0
                        }}
                        className="
                            overflow-hidden
                            border-t
                            border-white/10
                            bg-slate-950/95
                            lg:hidden
                        "
                    >

                        <nav
                            className="
                                flex
                                flex-col
                                gap-1
                                p-3
                            "
                        >

                            {navigation.map(
                                (item) => (

                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() =>
                                            goTo(
                                                item.route
                                            )
                                        }
                                        className="
                                            flex
                                            items-center
                                            gap-3
                                            rounded-xl
                                            px-4
                                            py-3
                                            text-left
                                            text-sm
                                            font-bold
                                            text-white/65
                                            transition
                                            hover:bg-white/[0.07]
                                            hover:text-white
                                        "
                                    >

                                        <span
                                            className="
                                                text-indigo-300
                                            "
                                        >
                                            {item.icon}
                                        </span>

                                        {item.label}

                                    </button>

                                )
                            )}


                            {/* MOBILE CURRENCIES */}

                            <div
                                className="
                                    mt-2
                                    grid
                                    grid-cols-2
                                    gap-2
                                    border-t
                                    border-white/10
                                    pt-3
                                "
                            >

                                <div
                                    className="
                                        flex
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        bg-white/[0.05]
                                        py-3
                                        text-sm
                                        text-white
                                    "
                                >

                                    <FaCoins
                                        className="
                                            text-amber-300
                                        "
                                    />

                                    <strong>
                                        {(
                                            player?.currencies?.coins ||
                                            0
                                        ).toLocaleString()}
                                    </strong>

                                </div>


                                <div
                                    className="
                                        flex
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        bg-white/[0.05]
                                        py-3
                                        text-sm
                                        text-white
                                    "
                                >

                                    <FaGem
                                        className="
                                            text-cyan-300
                                        "
                                    />

                                    <strong>
                                        {
                                            player?.currencies?.gems ||
                                            0
                                        }
                                    </strong>

                                </div>

                            </div>

                        </nav>

                    </motion.div>

                )}

            </AnimatePresence>

        </header>

    );

}