import Swal from "sweetalert2";

/* =========================================================
   ALERTAS DEL TRIQUI (SweetAlert2)
   Todas usan los colores oscuros del juego.
========================================================= */

const base = {
    background: "#101722",
    color: "#ffffff",
    customClass: {
        container: "triqui-swal",
        popup: "triqui-swal-popup",
    },
};

/* ---------- Avisos pequeños (no bloquean el juego) ---------- */

const Toast = Swal.mixin({
    ...base,
    toast: true,
    position: "top",
    showConfirmButton: false,
    timerProgressBar: true,
    returnFocus: false, // no le quita el foco al input de la respuesta
});

// Deduce el icono por el emoji del mensaje
const iconFor = (message = "") => {
    if (message.startsWith("❌")) return "error";
    if (message.startsWith("⏰")) return "warning";
    if (message.startsWith("⏳")) return "info";
    if (message.startsWith("✅")) return "success";
    return "info";
};

// Quita el emoji inicial (SweetAlert ya pone el icono)
const clean = (message = "") =>
    String(message).replace(/^(❌|⏰|⏳|✅|🎯)\s*/u, "");

export const showToast = (message, { icon, timer = 3000 } = {}) => {

    if (!message) return;

    Toast.fire({
        icon: icon || iconFor(message),
        title: clean(message),
        timer,
    });
};

export const showErrorToast = (message, timer = 3500) =>
    showToast(message, { icon: "error", timer });

/* ---------- Ventanas que piden decisión ---------- */

export const confirmLeaveGame = async ({ isLocal } = {}) => {

    const result = await Swal.fire({
        ...base,
        icon: "warning",
        title: "¿Salir de la partida?",
        text: isLocal
            ? "Se perderá la partida en curso."
            : "Tu rival ganará la partida si sales ahora.",
        showCancelButton: true,
        confirmButtonText: "Sí, salir",
        cancelButtonText: "Seguir jugando",
        confirmButtonColor: "#ff5d68",
        cancelButtonColor: "#2a3446",
        reverseButtons: true,
        focusCancel: true,
    });

    return result.isConfirmed;
};

export const alertOpponentLeft = async (message) => {

    const result = await Swal.fire({
        ...base,
        icon: "info",
        title: "Tu rival salió",
        text: clean(message) || "El otro jugador se desconectó.",
        showCancelButton: true,
        confirmButtonText: "Volver al mundo",
        cancelButtonText: "Quedarme",
        confirmButtonColor: "#55a8ff",
        cancelButtonColor: "#2a3446",
        allowOutsideClick: false,
    });

    return result.isConfirmed;
};

export const closeAlerts = () => {
    if (Swal.isVisible()) Swal.close();
};
