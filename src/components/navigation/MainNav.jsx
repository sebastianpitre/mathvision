import React, {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
} from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import {
    LuChevronDown,
    LuCoins,
    LuGem,
    LuLogOut,
    LuMenu,
    LuSettings,
    LuUser,
    LuX,
} from "react-icons/lu";

import AssetImage from "../common/AssetImage";
import { useAuth } from "../../context/AuthContext";

import "./mainnav.css";

/* =========================================================
   MARCA
   ---------------------------------------------------------
   · logoSrc: ruta de tu imagen de logo (ej. "/images/logo.png").
     Déjalo en null para usar el logo de texto.
   · showNameWithLogo: true = imagen + nombre al lado.
   También puedes pasarlo como prop: <MainNav logo={{ ... }} />
========================================================= */

const BRAND = {
    logoSrc: null,
    logoAlt: "LudoGamif",
    showNameWithLogo: true,
    name: "LUDO",
    nameAccent: "GAMIF",
    tagline: "Juega · Aprende · Conecta",
    homeRoute: "/",
};

const PROFILE_MENU = [
    { id: "profile", label: "Mi perfil", icon: LuUser, route: "/profile" },
    { id: "settings", label: "Configuración", icon: LuSettings, route: "/settings" },
];

const formatNumber = (value) =>
    (Number(value) || 0).toLocaleString("es-CO");

/* =========================================================
   LOGO
========================================================= */

function Brand({ brand, onClick }) {

    const [imageFailed, setImageFailed] = useState(false);
    const hasImage = brand.logoSrc && !imageFailed;

    return (
        <button
            type="button"
            className="mn-brand"
            onClick={onClick}
            aria-label={`${brand.logoAlt || `${brand.name}${brand.nameAccent}`}, ir al inicio`}
        >
            {hasImage && (
                <img
                    className="mn-brand-logo"
                    src={brand.logoSrc}
                    alt=""
                    draggable="false"
                    onError={() => setImageFailed(true)}
                />
            )}

            {(!hasImage || brand.showNameWithLogo) && (
                <span className="mn-brand-text" aria-hidden="true">
                    <span className="mn-brand-name">
                        {brand.name}
                        <span className="mn-brand-accent">{brand.nameAccent}</span>
                    </span>
                    {brand.tagline && (
                        <span className="mn-brand-tagline">{brand.tagline}</span>
                    )}
                </span>
            )}
        </button>
    );
}

/* =========================================================
   MONEDAS
========================================================= */

function Currencies({ player, className = "" }) {
    return (
        <ul className={`mn-currencies ${className}`} aria-label="Tus monedas">
            <li className="mn-currency mn-currency-coins">
                <LuCoins aria-hidden="true" />
                <span className="mn-sr-only">Monedas:</span>
                <strong>{formatNumber(player?.currencies?.coins)}</strong>
            </li>
            <li className="mn-currency mn-currency-gems">
                <LuGem aria-hidden="true" />
                <span className="mn-sr-only">Gemas:</span>
                <strong>{formatNumber(player?.currencies?.gems)}</strong>
            </li>
        </ul>
    );
}

/* =========================================================
   MAIN NAV
========================================================= */

export default function MainNav({
    navigation = [],
    player,
    logo,
}) {

    const brand = { ...BRAND, ...(logo || {}) };

    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const reduceMotion = useReducedMotion();

    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const menuRef = useRef(null);
    const menuButtonRef = useRef(null);
    const menuListRef = useRef(null);
    const mobileButtonRef = useRef(null);
    const mobilePanelRef = useRef(null);

    const menuId = useId();
    const mobileId = useId();

    const displayName = player?.displayName || player?.name || "Jugador";
    const level = player?.level || 1;
    const xp = Math.round(Math.min(100, Math.max(0, Number(player?.experience?.percentage) || 0)));

    /* ---------- Ruta activa ---------- */

    const isActive = (route) => {
        if (!route) return false;
        if (route === "/") return location.pathname === "/";
        return location.pathname === route || location.pathname.startsWith(`${route}/`);
    };

    /* ---------- Navegar ---------- */

    const goTo = useCallback((route) => {
        setMenuOpen(false);
        setMobileOpen(false);
        navigate(route);
    }, [navigate]);

    const handleLogout = async () => {
        setMenuOpen(false);
        setMobileOpen(false);
        await logout();
        navigate("/");
    };

    /* ---------- Cerrar al hacer clic afuera ---------- */

    useEffect(() => {

        if (!menuOpen) return;

        const onPointerDown = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);

    }, [menuOpen]);

    /* ---------- Escape cierra y devuelve el foco ---------- */

    useEffect(() => {

        if (!menuOpen && !mobileOpen) return;

        const onKeyDown = (event) => {

            if (event.key !== "Escape") return;

            if (menuOpen) {
                setMenuOpen(false);
                menuButtonRef.current?.focus();
            }

            if (mobileOpen) {
                setMobileOpen(false);
                mobileButtonRef.current?.focus();
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);

    }, [menuOpen, mobileOpen]);

    /* ---------- Al abrir el menú, foco en la primera opción ---------- */

    useEffect(() => {
        if (menuOpen) {
            requestAnimationFrame(() => {
                menuListRef.current?.querySelector('[role="menuitem"]')?.focus();
            });
        }
    }, [menuOpen]);

    useEffect(() => {
        if (mobileOpen) {
            requestAnimationFrame(() => {
                mobilePanelRef.current?.querySelector("button")?.focus();
            });
        }
    }, [mobileOpen]);

    // Si la pantalla crece, se cierra el panel del celular
    useEffect(() => {
        const media = window.matchMedia("(min-width: 1024px)");
        const onChange = (e) => e.matches && setMobileOpen(false);
        media.addEventListener?.("change", onChange);
        return () => media.removeEventListener?.("change", onChange);
    }, []);

    /* ---------- Flechas dentro del menú ---------- */

    const onMenuKeyDown = (event) => {

        const items = [...(menuListRef.current?.querySelectorAll('[role="menuitem"]') || [])];
        const index = items.indexOf(document.activeElement);

        const focusAt = (i) => {
            event.preventDefault();
            items[(i + items.length) % items.length]?.focus();
        };

        if (event.key === "ArrowDown") focusAt(index + 1);
        if (event.key === "ArrowUp") focusAt(index - 1);
        if (event.key === "Home") focusAt(0);
        if (event.key === "End") focusAt(items.length - 1);
        if (event.key === "Tab") setMenuOpen(false);
    };

    const motionProps = reduceMotion
        ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : {
            initial: { opacity: 0, y: -8, scale: 0.97 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: -8, scale: 0.97 },
            transition: { duration: 0.16 },
        };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <header className="mn">

            <div className="mn-bar">

                <Brand brand={brand} onClick={() => goTo(brand.homeRoute)} />

                {/* ---------- Navegación de escritorio ---------- */}

                <nav className="mn-nav" aria-label="Principal">
                    <ul>
                        {navigation.map((item) => {

                            const active = isActive(item.route);

                            return (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        className="mn-link"
                                        aria-current={active ? "page" : undefined}
                                        onClick={() => goTo(item.route)}
                                    >
                                        {item.icon && (
                                            <span className="mn-link-icon" aria-hidden="true">
                                                {item.icon}
                                            </span>
                                        )}
                                        <span>{item.label}</span>

                                        {active && (
                                            <motion.span
                                                layoutId="mn-active"
                                                className="mn-link-bar"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="mn-spacer" />

                <Currencies player={player} className="mn-hide-sm" />

                {/* ---------- Jugador + menú desplegable ---------- */}

                <div className="mn-player" ref={menuRef}>

                    <button
                        ref={menuButtonRef}
                        type="button"
                        className="mn-player-btn"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        aria-controls={menuId}
                        aria-label={`Menú de ${displayName}, nivel ${level}`}
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        <span className="mn-avatar">
                            <AssetImage
                                src={player?.avatar}
                                type="player"
                                alt=""
                            />
                        </span>

                        <span className="mn-player-info" aria-hidden="true">
                            <span className="mn-player-name">{displayName}</span>
                            <span className="mn-player-level">
                                <span>{`Nivel ${level}`}</span>
                                <span className="mn-xp">
                                    <span style={{ width: `${xp}%` }} />
                                </span>
                            </span>
                        </span>

                        <LuChevronDown
                            aria-hidden="true"
                            className={`mn-chevron ${menuOpen ? "is-open" : ""}`}
                        />
                    </button>

                    <AnimatePresence>
                        {menuOpen && (
                            <motion.div
                                {...motionProps}
                                className="mn-menu"
                                id={menuId}
                            >
                                <div className="mn-menu-head">
                                    <span className="mn-avatar mn-avatar-lg">
                                        <AssetImage src={player?.avatar} type="player" alt="" />
                                    </span>
                                    <div className="mn-menu-id">
                                        <p className="mn-menu-name">{displayName}</p>
                                        <p className="mn-menu-level">{`Nivel ${level} · ${xp}% al siguiente`}</p>
                                    </div>
                                </div>

                                <ul
                                    ref={menuListRef}
                                    role="menu"
                                    aria-label={`Opciones de ${displayName}`}
                                    onKeyDown={onMenuKeyDown}
                                >
                                    {PROFILE_MENU.map(({ id, label, icon: Icon, route }) => (
                                        <li key={id} role="none">
                                            <button
                                                type="button"
                                                role="menuitem"
                                                className="mn-menu-item"
                                                onClick={() => goTo(route)}
                                            >
                                                <span className="mn-menu-icon" aria-hidden="true">
                                                    <Icon />
                                                </span>
                                                <span>{label}</span>
                                            </button>
                                        </li>
                                    ))}

                                    <li role="separator" className="mn-menu-sep" />

                                    <li role="none">
                                        <button
                                            type="button"
                                            role="menuitem"
                                            className="mn-menu-item mn-menu-danger"
                                            onClick={handleLogout}
                                        >
                                            <span className="mn-menu-icon" aria-hidden="true">
                                                <LuLogOut />
                                            </span>
                                            <span>Cerrar sesión</span>
                                        </button>
                                    </li>
                                </ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ---------- Botón del menú en celular ---------- */}

                <button
                    ref={mobileButtonRef}
                    type="button"
                    className="mn-burger"
                    aria-expanded={mobileOpen}
                    aria-controls={mobileId}
                    aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
                    onClick={() => setMobileOpen((open) => !open)}
                >
                    {mobileOpen ? <LuX aria-hidden="true" /> : <LuMenu aria-hidden="true" />}
                </button>
            </div>

            {/* ---------- Panel del celular ---------- */}

            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            className="mn-scrim"
                            aria-hidden="true"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                        />

                        <motion.nav
                            ref={mobilePanelRef}
                            id={mobileId}
                            className="mn-mobile"
                            aria-label="Menú principal"
                            initial={reduceMotion ? false : { opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
                            transition={{ duration: 0.18 }}
                        >
                            <ul className="mn-mobile-links">
                                {navigation.map((item) => (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            className="mn-mobile-link"
                                            aria-current={isActive(item.route) ? "page" : undefined}
                                            onClick={() => goTo(item.route)}
                                        >
                                            {item.icon && (
                                                <span className="mn-link-icon" aria-hidden="true">
                                                    {item.icon}
                                                </span>
                                            )}
                                            <span>{item.label}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            <Currencies player={player} className="mn-currencies-mobile" />

                            <ul className="mn-mobile-links mn-mobile-account">
                                {PROFILE_MENU.map(({ id, label, icon: Icon, route }) => (
                                    <li key={id}>
                                        <button
                                            type="button"
                                            className="mn-mobile-link"
                                            onClick={() => goTo(route)}
                                        >
                                            <span className="mn-menu-icon" aria-hidden="true"><Icon /></span>
                                            <span>{label}</span>
                                        </button>
                                    </li>
                                ))}
                                <li>
                                    <button
                                        type="button"
                                        className="mn-mobile-link mn-menu-danger"
                                        onClick={handleLogout}
                                    >
                                        <span className="mn-menu-icon" aria-hidden="true"><LuLogOut /></span>
                                        <span>Cerrar sesión</span>
                                    </button>
                                </li>
                            </ul>
                        </motion.nav>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
}