import AssetImage from "../common/AssetImage";

/* Foto de perfil con su marco (si tiene uno puesto).
   El marco es una imagen PNG con el centro transparente que
   se pone encima de la foto, del mismo tamaño. */
export default function FotoPerfil({ foto, marco, alt = "" }) {
    return (
        <>
            <AssetImage src={foto} type="player" alt={alt} />
            {marco && <img className="fp-marco" src={marco} alt="" aria-hidden="true" draggable="false" />}
        </>
    );
}
