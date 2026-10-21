import AppRouter from "./routes/AppRouter";
import ProtegerError from "./components/common/ProtegerError";

/* Si algo inesperado falla, se ofrece recargar en vez de
   dejar la pantalla en blanco. */
function ErrorGeneral() {
    return (
        <div className="pantalla-carga" role="alert">
            <strong style={{ color: "#f4f6fb", fontSize: 22 }}>Algo salió mal</strong>
            <span>Recarga la página para seguir jugando.</span>
            <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ marginTop: 8, minHeight: 48, padding: "0 22px", border: 0, borderRadius: 12, background: "#5aa9ff", color: "#06101d", fontWeight: 900, cursor: "pointer" }}
            >
                Recargar
            </button>
        </div>
    );
}

function App() {
    return (
        <ProtegerError respaldo={<ErrorGeneral />}>
            <AppRouter />
        </ProtegerError>
    );
}

export default App;
