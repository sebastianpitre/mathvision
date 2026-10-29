import { useLayoutEffect, useRef, useState } from "react";

/* Nombre que se desliza de lado a lado si no cabe. */
export default function NombreDeslizante({ texto, className = "" }) {
    const caja = useRef(null);
    const interior = useRef(null);
    const [sobra, setSobra] = useState(0);

    useLayoutEffect(() => {
        const medir = () => {
            if (!caja.current || !interior.current) return;
            setSobra(Math.max(0, interior.current.scrollWidth - caja.current.clientWidth));
        };
        medir();
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
        ro?.observe(caja.current);
        return () => ro?.disconnect();
    }, [texto]);

    return (
        <span ref={caja} className={`nd ${className}`} title={texto}>
            <span
                ref={interior}
                className={sobra > 0 ? "nd-mover" : ""}
                style={sobra > 0 ? { "--nd-sobra": `-${sobra}px`, animationDuration: `${Math.max(3, sobra / 12 + 2)}s` } : undefined}
            >
                {texto}
            </span>
        </span>
    );
}
