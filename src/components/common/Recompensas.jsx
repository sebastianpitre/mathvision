import { LuCoins, LuGem, LuStar } from "react-icons/lu";

/*
 * Muestra XP, oro y diamantes como fichas de color.
 * Las que valen 0 no se muestran (salvo que todas sean 0).
 */
export default function Recompensas({ xp = 0, oro = 0, diamantes = 0, grande = false, prefijo = "+" }) {
    const clase = grande ? " lg-reward-lg" : "";
    const nada = !xp && !oro && !diamantes;

    return (
        <span className="lg-rewards">
            {(xp > 0 || nada) && (
                <span className={`lg-reward lg-reward-xp${clase}`} title="Experiencia">
                    <LuStar aria-hidden="true" />
                    {`${prefijo}${xp} XP`}
                </span>
            )}
            {oro > 0 && (
                <span className={`lg-reward lg-reward-oro${clase}`} title="Oro">
                    <LuCoins aria-hidden="true" />
                    {`${prefijo}${oro}`}
                    <span className="lb-sr-only"> de oro</span>
                </span>
            )}
            {diamantes > 0 && (
                <span className={`lg-reward lg-reward-gem${clase}`} title="Diamantes">
                    <LuGem aria-hidden="true" />
                    {`${prefijo}${diamantes}`}
                    <span className="lb-sr-only"> diamantes</span>
                </span>
            )}
        </span>
    );
}
