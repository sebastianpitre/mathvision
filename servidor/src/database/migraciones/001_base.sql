-- =====================================================
-- 001 · TABLAS BASE (usuarios, perfil, estadísticas, personajes)
-- Se puede correr varias veces: no borra datos.

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,

    username VARCHAR(30) NOT NULL UNIQUE,

    email VARCHAR(150) NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    last_login TIMESTAMP
);


-- =====================================================
-- PERFIL DEL JUGADOR
-- =====================================================

CREATE TABLE IF NOT EXISTS player_profiles (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL UNIQUE,

    display_name VARCHAR(30) NOT NULL,

    level INTEGER NOT NULL DEFAULT 1,

    xp INTEGER NOT NULL DEFAULT 0,

    coins INTEGER NOT NULL DEFAULT 0,

    gems INTEGER NOT NULL DEFAULT 0,

    character_id VARCHAR(100) NOT NULL DEFAULT 'default',

    avatar VARCHAR(255),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_player_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =====================================================
-- ESTADÍSTICAS GENERALES
-- =====================================================

CREATE TABLE IF NOT EXISTS player_stats (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL UNIQUE,

    games_played INTEGER NOT NULL DEFAULT 0,

    games_won INTEGER NOT NULL DEFAULT 0,

    games_lost INTEGER NOT NULL DEFAULT 0,

    questions_answered INTEGER NOT NULL DEFAULT 0,

    correct_answers INTEGER NOT NULL DEFAULT 0,

    incorrect_answers INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_stats_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =====================================================
-- PERSONAJES
-- =====================================================

CREATE TABLE IF NOT EXISTS characters (
    id VARCHAR(100) PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    model_path VARCHAR(255) NOT NULL,

    thumbnail_path VARCHAR(255),

    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- INVENTARIO
-- =====================================================

CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(100) PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    type VARCHAR(50) NOT NULL,

    asset_path VARCHAR(255),

    price INTEGER NOT NULL DEFAULT 0,

    rarity VARCHAR(50),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS player_inventory (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL,

    item_id VARCHAR(100) NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 1,

    acquired_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inventory_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_inventory_item
        FOREIGN KEY (item_id)
        REFERENCES items(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_player_item
        UNIQUE (user_id, item_id)
);


-- =====================================================
-- CONFIGURACIÓN
-- =====================================================

CREATE TABLE IF NOT EXISTS player_settings (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL UNIQUE,

    language VARCHAR(10) NOT NULL DEFAULT 'es',

    music_volume INTEGER NOT NULL DEFAULT 100,

    effects_volume INTEGER NOT NULL DEFAULT 100,

    notifications BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_settings_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =====================================================
-- PERSONAJE POR DEFECTO
-- =====================================================

INSERT INTO characters (
    id,
    name,
    model_path,
    thumbnail_path,
    is_default
)
VALUES (
    'adan',
    'Adán',
    '/models/characters/Adan2.vrm',
    '/img/characters/default-avatar.png',
    TRUE
)
ON CONFLICT (id) DO NOTHING;