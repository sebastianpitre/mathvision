import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { LuCheck, LuGem, LuLock, LuSearch } from "react-icons/lu";

import PantallaFF, { Pestanas } from "../components/juego/PantallaFF";
import Personaje3D from "../components/juego/Personaje3D";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

import "./personajes.css";

/* =========================================================
   PERSONAJES Y TIENDA (como el inventario de Free Fire)
   ---------------------------------------------------------
   Izquierda: pestañas (Todos, Míos, Tienda). En medio: las
   tarjetas de los personajes. Derecha: el personaje elegido
   en 3D con su nombre y el botón para usarlo o comprarlo.
   El precio y el nivel mínimo los pone el administrador.
========================================================= */

const formato = (n) => (Number(n) || 0).toLocaleString("es-CO");

// Color de la tarjeta según lo que cuesta (como la rareza).
function rareza(p) {
    if (p.precio_diamantes > 0) return { fondo: "radial-gradient(circle at 50% 35%, #5b2a8c, #1e0b33 75%)", color: "#c084fc" };
    if (p.precio_oro >= 1000) return { fondo: "radial-gradient(circle at 50% 35%, #8a1c3a, #2a0712 75%)", color: "#fb7185" };
    if (p.precio_oro > 0) return { fondo: "radial-gradient(circle at 50% 35%, #6b4c12, #2a1c08 75%)", color: "#ffcf3e" };
    return { fondo: "radial-gradient(circle at 50% 35%, #1f4f6b, #0a1c28 75%)", color: "#5aa9ff" };
}

function OroIcono() {
    return <span className="ffl-moneda-oro pj-oro" aria-hidden="true" />;
}

export default function Character() {
    const { user, actualizarUsuario } = useAuth();
    const { pathname } = useLocation();
    const esTienda = pathname === "/tienda";

    const [personajes, setPersonajes] = useState([]);
    const [elegido, setElegido] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [pestana, setPestana] = useState(esTienda ? "tienda" : "todos");
    const [busqueda, setBusqueda] = useState("");
    const [trabajando, setTrabajando] = useState(false);
    const [aviso, setAviso] = useState({ texto: "", tono: "" });

    const avisar = (texto, tono = "") => setAviso({ texto, tono });

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const data = await api("/tienda");
            const lista = Array.isArray(data.personajes) ? data.personajes : [];
            setPersonajes(lista);
            setElegido(
                (actual) =>
                    lista.find((c) => c.id === actual?.id) ||
                    lista.find((c) => c.id === user?.character_id) ||
                    lista[0] ||
                    null
            );
        } catch (error) {
            avisar(error.message, "error");
        } finally {
            setCargando(false);
        }
        // Solo al entrar a la pantalla.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const filtrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return personajes.filter((p) => {
            if (pestana === "mios" && !p.comprado) return false;
            if (pestana === "tienda" && p.comprado) return false;
            return !texto || p.name.toLowerCase().includes(texto);
        });
    }, [personajes, pestana, busqueda]);

    if (!user) return null;

    const nivel = Number(user.level) || 1;
    const oro = Number(user.coins) || 0;
    const diamantes = Number(user.gems) || 0;
    const enUso = elegido?.id === user.character_id;
    const porNivel = elegido && !elegido.comprado && nivel < elegido.nivel_minimo;

    async function usar() {
        setTrabajando(true);
        avisar("");
        try {
            const data = await api("/users/character", { metodo: "PUT", body: { characterId: elegido.id } });
            actualizarUsuario(data.user);
            avisar(`¡Ahora juegas con ${elegido.name}!`, "ok");
        } catch (error) {
            avisar(error.message, "error");
        } finally {
            setTrabajando(false);
        }
    }

    async function comprar(moneda) {
        setTrabajando(true);
        avisar("");
        try {
            const data = await api("/tienda/comprar", { metodo: "POST", body: { personaje_id: elegido.id, moneda } });
            actualizarUsuario(data.perfil);
            setPersonajes(data.personajes);
            setElegido(data.personajes.find((c) => c.id === elegido.id) || elegido);
            avisar(`¡Desbloqueaste a ${elegido.name}!`, "ok");
        } catch (error) {
            avisar(error.message, "error");
        } finally {
            setTrabajando(false);
        }
    }

    const cuentas = {
        todos: personajes.length,
        mios: personajes.filter((p) => p.comprado).length,
        tienda: personajes.filter((p) => !p.comprado).length,
    };

    return (
        <PantallaFF titulo={esTienda ? "Tienda" : "Personajes"} className="pj">
            <Pestanas
                etiqueta="Filtrar personajes"
                activa={pestana}
                alCambiar={setPestana}
                items={[
                    { id: "todos", texto: "Todos", cuenta: cuentas.todos },
                    { id: "mios", texto: "Míos", cuenta: cuentas.mios },
                    { id: "tienda", texto: "Tienda", cuenta: cuentas.tienda },
                ]}
            />

            <section className="pj-lista ffp-panel" aria-label="Personajes">
                <label className="pj-buscar">
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar personaje"
                        aria-label="Buscar personaje"
                    />
                    <LuSearch aria-hidden="true" />
                </label>

                {cargando ? (
                    <p className="pj-vacio">Cargando…</p>
                ) : filtrados.length === 0 ? (
                    <p className="pj-vacio">{pestana === "mios" ? "Aún no tienes personajes." : "No hay personajes aquí."}</p>
                ) : (
                    <ul className="ffp-tarjetas pj-tarjetas">
                        {filtrados.map((p) => {
                            const r = rareza(p);
                            const usandolo = p.id === user.character_id;
                            return (
                                <li key={p.id}>
                                    <button
                                        type="button"
                                        className={`ffp-tarjeta ${elegido?.id === p.id ? "ffp-tarjeta-elegida" : ""} ${p.comprado ? "" : "ffp-tarjeta-bloqueada"}`}
                                        style={{ background: r.fondo, "--color-rareza": r.color }}
                                        onClick={() => {
                                            setElegido(p);
                                            avisar("");
                                        }}
                                        aria-pressed={elegido?.id === p.id}
                                        aria-label={`${p.name}${usandolo ? ", en uso" : p.comprado ? "" : ", bloqueado"}`}
                                    >
                                        {p.thumbnail_path ? <img src={p.thumbnail_path} alt="" loading="lazy" draggable="false" /> : <span className="pj-sin-foto">🧍</span>}
                                        <span className="ffp-tarjeta-marca" aria-hidden="true">★</span>
                                        {usandolo ? (
                                            <span className="ffp-tarjeta-estado ffp-tarjeta-estado-uso" aria-hidden="true"><LuCheck /></span>
                                        ) : !p.comprado ? (
                                            <span className="ffp-tarjeta-estado" aria-hidden="true"><LuLock /></span>
                                        ) : null}
                                        {!p.comprado && (p.precio_oro > 0 || p.precio_diamantes > 0) && (
                                            <span className="ffp-tarjeta-precio" aria-hidden="true">
                                                {p.precio_diamantes > 0 ? <><LuGem className="pj-gema" />{formato(p.precio_diamantes)}</> : <><OroIcono />{formato(p.precio_oro)}</>}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="ffp-escenario pj-escenario" aria-label="Personaje elegido">
                <span className="ffp-plataforma" aria-hidden="true" />
                <Personaje3D modelo={elegido?.model_path} />

                {elegido && (
                    <div className="pj-detalle">
                        <div className="pj-detalle-texto">
                            <small>{enUso ? "En uso" : elegido.comprado ? "Tuyo" : porNivel ? `Nivel ${elegido.nivel_minimo}` : "En la tienda"}</small>
                            <strong>{elegido.name}</strong>
                            {aviso.texto && <p className={`ffp-aviso ffp-aviso-${aviso.tono}`} role="status">{aviso.texto}</p>}
                        </div>

                        <div className="pj-detalle-botones">
                            {elegido.comprado ? (
                                <button type="button" className="ffp-btn" onClick={usar} disabled={trabajando || enUso}>
                                    {enUso ? <><LuCheck aria-hidden="true" />En uso</> : "Usar"}
                                </button>
                            ) : porNivel ? (
                                <button type="button" className="ffp-btn" disabled>
                                    <LuLock aria-hidden="true" />
                                    {`Nivel ${elegido.nivel_minimo}`}
                                </button>
                            ) : (
                                <>
                                    {elegido.precio_oro > 0 && (
                                        <button type="button" className="ffp-btn" onClick={() => comprar("oro")} disabled={trabajando || oro < elegido.precio_oro} title={oro < elegido.precio_oro ? `Te faltan ${formato(elegido.precio_oro - oro)} de oro` : undefined}>
                                            <OroIcono />
                                            {formato(elegido.precio_oro)}
                                        </button>
                                    )}
                                    {elegido.precio_diamantes > 0 && (
                                        <button type="button" className="ffp-btn ffp-btn-diamante" onClick={() => comprar("diamantes")} disabled={trabajando || diamantes < elegido.precio_diamantes} title={diamantes < elegido.precio_diamantes ? `Te faltan ${formato(elegido.precio_diamantes - diamantes)} diamantes` : undefined}>
                                            <LuGem aria-hidden="true" />
                                            {formato(elegido.precio_diamantes)}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </section>
        </PantallaFF>
    );
}
