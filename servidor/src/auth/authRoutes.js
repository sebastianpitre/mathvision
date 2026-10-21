import express from "express";

import {
    registerUser,
    loginUser,
} from "./authService.js";

import { getUserProfile } from "../users/userService.js";
import { limitarIntentos } from "../http/limitarIntentos.js";

import {
    requireAuth,
} from "./authMiddleware.js";


const router =
    express.Router();


// =====================================================
// REGISTRO
// =====================================================

router.post(
    "/register",
    limitarIntentos({ maximo: 10, minutos: 60 }),
    async (req, res) => {

        try {

            const {
                username,
                email,
                password,
            } = req.body;


            const result =
                await registerUser({
                    username,
                    email,
                    password,
                });


            res.status(201).json({
                success: true,
                ...result,
            });

        } catch (error) {

            console.error(
                "❌ Registro:",
                error
            );


            res.status(400).json({
                success: false,
                message:
                    error.message ||
                    "No se pudo crear la cuenta.",
            });

        }

    }
);


// =====================================================
// LOGIN
// =====================================================

router.post(
    "/login",
    limitarIntentos({ maximo: 15, minutos: 15 }),
    async (req, res) => {

        try {

            const {
                username,
                password,
            } = req.body;


            const result =
                await loginUser(
                    username,
                    password
                );


            res.json({
                success: true,
                ...result,
            });

        } catch (error) {

            console.error(
                "❌ Login:",
                error
            );


            res.status(401).json({
                success: false,
                message:
                    error.message ||
                    "No se pudo iniciar sesión.",
            });

        }

    }
);


// =====================================================
// SESIÓN ACTUAL
// =====================================================

router.get(
    "/me",
    requireAuth,
    async (req, res) => {

        try {

            const user =
                await getUserProfile(
                    req.user.userId
                );


            if (!user) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Usuario no encontrado.",
                });

            }


            res.json({
                success: true,
                user,
            });

        } catch (error) {

            console.error(
                "❌ /auth/me:",
                error
            );


            res.status(500).json({
                success: false,
                message:
                    "Error obteniendo el usuario.",
            });

        }

    }
);


export default router;