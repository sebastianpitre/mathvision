import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import {
    AuthProvider
} from "./context/AuthContext";

import App from "./App";
// Letra del juego incluida en el proyecto (no depende de
// Google Fonts, que algunas redes de colegio bloquean).
import "@fontsource/nunito/500.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "@fontsource/nunito/900.css";
// Letra de los títulos y botones del juego (estilo Free Fire).
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";

import "./styles/globals.css";
import "./styles/components.css";
import "./components/juego/juego.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
        
            <AuthProvider>
                <App />
            </AuthProvider>
            
        </BrowserRouter>
    </React.StrictMode>
);