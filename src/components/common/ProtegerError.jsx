import { Component } from "react";

/*
 * Si algo dentro falla (por ejemplo un modelo 3D que no
 * carga), se muestra el "respaldo" en vez de dejar toda la
 * página en blanco.
 *
 *   <ProtegerError respaldo={<p>No se pudo cargar</p>}>
 *       <Canvas>…</Canvas>
 *   </ProtegerError>
 */
export default class ProtegerError extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error) {
        console.error("Error atrapado:", error);
    }

    render() {
        if (this.state.error) {
            return this.props.respaldo ?? null;
        }

        return this.props.children;
    }
}
