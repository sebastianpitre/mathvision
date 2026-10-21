/*
 * Iluminación de los personajes 3D.
 *
 * Antes se usaba <Environment preset="..."> de drei, que
 * descarga una imagen HDR desde un servidor externo cada vez:
 * si ese servidor no respondía (o la red del colegio lo
 * bloqueaba) la pantalla quedaba en blanco. Estas luces dan un
 * resultado parecido sin depender de nada externo.
 */
export default function LucesPersonaje({ calida = false }) {
    return (
        <>
            <hemisphereLight
                args={[calida ? "#ffe8d0" : "#e8f0ff", calida ? "#3a2a40" : "#1c2638", 1.6]}
            />
            <ambientLight intensity={1.2} />
            <directionalLight position={[3, 5, 4]} intensity={2.6} />
            <directionalLight position={[-4, 3, -3]} intensity={1.1} color={calida ? "#ffd2a8" : "#b8d4ff"} />
        </>
    );
}
