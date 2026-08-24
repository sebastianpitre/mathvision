import mockUsers from "../../data/mockUsers";

import {
    getDatabase,
    saveDatabase
} from "../storageService";


// =====================================================
// INICIALIZAR BASE LOCAL
// =====================================================

const initializeDatabase = () => {

    let database =
        getDatabase();

    if (!database) {

        database = {

            users: mockUsers

        };

        saveDatabase(
            database
        );
    }

    return database;
};


// =====================================================
// OBTENER USUARIOS
// =====================================================

export const getUsers = () => {

    const database =
        initializeDatabase();

    return database.users || [];

};


// =====================================================
// BUSCAR USUARIO
// =====================================================

export const findUser = (
    username
) => {

    const users =
        getUsers();

    return users.find(
        user =>
            user.username
                .toLowerCase() ===
            username
                .toLowerCase()
    ) || null;

};


// =====================================================
// ACTUALIZAR USUARIO
// =====================================================

export const updateUser = (
    userId,
    updates
) => {

    const database =
        initializeDatabase();


    const userIndex =
        database.users.findIndex(
            user =>
                user.id === userId
        );


    if (userIndex === -1) {
        return null;
    }


    database.users[userIndex] = {

        ...database.users[userIndex],

        ...updates

    };


    saveDatabase(
        database
    );


    return database.users[
        userIndex
    ];

};


// =====================================================
// OBTENER USUARIO POR ID
// =====================================================

export const getUserById = (
    userId
) => {

    const users =
        getUsers();

    return users.find(
        user =>
            user.id === userId
    ) || null;

};