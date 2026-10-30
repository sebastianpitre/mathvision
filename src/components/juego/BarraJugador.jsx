import { useNavigate } from "react-router-dom";
import { LuGem, LuPlus } from "react-icons/lu";

import { useAuth } from "../../context/AuthContext";
import { jugadorDesdeUsuario } from "../../services/jugador";
import FotoPerfil from "./FotoPerfil";
import Verificado from "./Verificado";
import Tiquete from "./Tiquete";

/* Perfil (foto, nivel, XP), oro y diamantes: arriba a la
   izquierda en todas las pantallas, como en Free Fire. */

const formato = new Intl.NumberFormat("es-CO");

export default function BarraJugador() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const jugador = jugadorDesdeUsuario(user);
    if (!jugador) return null;

    return (
        <>
            <button type="button" className="ffl-perfil" onClick={() => navigate("/profile")} aria-label={`Tu perfil: ${jugador.displayName}, nivel ${jugador.level}`}>
                <span className="ffl-avatar">
                    <FotoPerfil foto={jugador.avatar} marco={user?.marco} />
                    <span className="ffl-nivel">{jugador.level}</span>
                </span>
                <span className="ffl-perfil-datos">
                    <strong>{jugador.displayName}<Verificado activo={user?.verificado} /></strong>
                    <span className="ffl-xp" title={`${jugador.experience.current} / ${jugador.experience.needed} XP`}>
                        <span style={{ width: `${jugador.experience.percentage}%` }} />
                    </span>
                    <small>{`Nv. ${jugador.level}`}</small>
                </span>
            </button>

            <div className="ffl-monedas">
                <span className="ffl-moneda" title="Oro">
                    <span className="ffl-moneda-oro" aria-hidden="true" />
                    {formato.format(jugador.currencies.coins)}
                    <span className="ffl-oculto"> de oro</span>
                </span>
                <button type="button" className="ffl-moneda" onClick={() => navigate("/tienda")} title="Diamantes · ir a la tienda">
                    <LuGem aria-hidden="true" className="ffl-moneda-diamante" />
                    {formato.format(jugador.currencies.gems)}
                    <span className="ffl-oculto"> diamantes</span>
                    <LuPlus aria-hidden="true" className="ffl-moneda-mas" />
                </button>
                <button type="button" className="ffl-moneda ffl-moneda-tiquete" onClick={() => navigate("/suerte")} title="Tiquetes · ir a GiraGamif">
                    <Tiquete />
                    {formato.format(jugador.currencies.tickets || 0)}
                    <span className="ffl-oculto"> tiquetes</span>
                </button>
            </div>
        </>
    );
}
