import { LuBadgeCheck } from "react-icons/lu";

/* Chulo azul de jugador verificado (lo asigna el administrador). */
export default function Verificado({ activo = true, className = "" }) {
    if (!activo) return null;
    return (
        <span className={`vf ${className}`} title="Verificado">
            <LuBadgeCheck aria-hidden="true" />
            <span className="ffl-oculto">verificado</span>
        </span>
    );
}
