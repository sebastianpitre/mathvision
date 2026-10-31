import { useEffect, useState } from "react";

import { api } from "../services/api";
import assets from "../data/mock/assets.json";

/* =========================================================
   FONDO DEL LOBBY (lo elige el administrador en el panel)
   Se pide una sola vez y se recuerda en el navegador para
   que al abrir no se vea un instante el fondo anterior.
========================================================= */

const CLAVE = "ludogamif:fondoLobby";
const oyentes = new Set();
let actual = leerGuardado();
let pedido = null;

function leerGuardado() {
    try {
        return localStorage.getItem(CLAVE) || assets.backgrounds.lobby;
    } catch {
        return assets.backgrounds.lobby;
    }
}

/* Cambia el fondo en todas las pantallas abiertas (lo usa el panel al guardar). */
export function ponerFondoLobby(ruta) {
    if (!ruta) return;
    actual = ruta;
    try {
        localStorage.setItem(CLAVE, ruta);
    } catch {
        // Sin almacenamiento: vale mientras la página esté abierta.
    }
    oyentes.forEach((f) => f(ruta));
}

export function useFondoLobby() {
    const [ruta, setRuta] = useState(actual);

    useEffect(() => {
        oyentes.add(setRuta);
        if (!pedido) {
            pedido = api("/carrusel/fondo", { auth: false })
                .then((r) => ponerFondoLobby(r.ruta))
                .catch(() => {
                    pedido = null; // se reintenta en la próxima pantalla
                });
        }
        return () => oyentes.delete(setRuta);
    }, []);

    return ruta;
}
