import { LuGem } from "react-icons/lu";

import FotoPerfil from "./FotoPerfil";
import Tiquete from "./Tiquete";
import "./premio-chips.css";

/* Lo que se gana (en una misión, en un rango…), con su imagen.
   r = { oro, diamantes, tickets, personaje, foto, marco } ya detallado por el servidor. */

const formato = (n) => (Number(n) || 0).toLocaleString("es-CO");

export default function Premio({ r, marcoDe, className = "" }) {
    if (!r) return null;
    const partes = [];
    if (r.oro) partes.push(<span key="o" className="ev-premio-moneda" title="Oro"><span className="ffl-moneda-oro" aria-hidden="true" />{formato(r.oro)}</span>);
    if (r.diamantes) partes.push(<span key="d" className="ev-premio-moneda" title="Diamantes"><LuGem aria-hidden="true" className="ev-gema" />{formato(r.diamantes)}</span>);
    if (r.tickets) partes.push(<span key="t" className="ev-premio-moneda" title="Tiquetes para GiraGamif"><Tiquete tamano="1.1rem" />{formato(r.tickets)}</span>);
    if (r.personaje) partes.push(<span key="p" className="ev-premio-img" title={`Personaje: ${r.personaje.nombre}`}>{r.personaje.foto ? <img src={r.personaje.foto} alt={r.personaje.nombre} /> : "🧍"}</span>);
    if (r.foto) partes.push(<span key="f" className="ev-premio-img" title={`Foto de perfil: ${r.foto.nombre}`}><img src={r.foto.ruta} alt={r.foto.nombre} /></span>);
    if (r.marco) partes.push(<span key="m" className="ev-premio-img ev-premio-marco" title={`Marco: ${r.marco.nombre}`}><FotoPerfil foto={marcoDe} marco={r.marco.ruta} alt={r.marco.nombre} /></span>);
    if (!partes.length) return <span className={`ev-premio ev-premio-nada ${className}`}>Sin premio</span>;
    return <span className={`ev-premio ${className}`}>{partes}</span>;
}
