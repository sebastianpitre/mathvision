-- =====================================================
-- 008 · TEMPORADAS, EVENTOS Y PERFILES EXCLUSIVOS
-- Se puede correr varias veces: no borra datos.
-- =====================================================

-- Si la partida se ganó (para las misiones de "gana N partidas").
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS gano BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE partidas SET gano = TRUE WHERE resultado = 'ganada' AND gano = FALSE;

CREATE INDEX IF NOT EXISTS idx_partidas_usuario_fecha ON partidas (user_id, terminada_en);

-- ---------------- TEMPORADAS ----------------
-- Cada temporada tiene su tabla de puntos. Al terminar se
-- guarda el rango final de cada uno y se entregan premios.
CREATE TABLE IF NOT EXISTS temporadas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fin TIMESTAMPTZ NOT NULL,
    cerrada BOOLEAN NOT NULL DEFAULT FALSE,
    cerrada_en TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS temporada_puntos (
    temporada_id INTEGER NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    puntos INTEGER NOT NULL DEFAULT 0,
    partidas INTEGER NOT NULL DEFAULT 0,
    ganadas INTEGER NOT NULL DEFAULT 0,
    rango_final VARCHAR(20),
    posicion_final INTEGER,
    premio JSONB,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (temporada_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_temporada_puntos_tabla ON temporada_puntos (temporada_id, puntos DESC);

-- ---------------- FOTOS DE PERFIL Y MARCOS ----------------
-- "exclusivo": solo lo tiene quien lo gana (eventos).
CREATE TABLE IF NOT EXISTS cosmeticos (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('foto', 'marco')),
    nombre VARCHAR(80) NOT NULL,
    ruta VARCHAR(255) NOT NULL,
    exclusivo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cosmeticos_jugador (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cosmetico_id INTEGER NOT NULL REFERENCES cosmeticos(id) ON DELETE CASCADE,
    origen VARCHAR(40),
    obtenido_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, cosmetico_id)
);

ALTER TABLE player_profiles
    ADD COLUMN IF NOT EXISTS marco_id INTEGER REFERENCES cosmeticos(id) ON DELETE SET NULL;

-- ---------------- EVENTOS ----------------
CREATE TABLE IF NOT EXISTS eventos (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descripcion VARCHAR(500),
    imagen VARCHAR(255),
    inicio TIMESTAMPTZ NOT NULL,
    fin TIMESTAMPTZ NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    orden INTEGER NOT NULL DEFAULT 0,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tipo: jugar | ganar | responder | correctas | dias
-- juego: NULL = cualquier juego
-- desde/hasta: si vienen, la misión solo cuenta en ese rango
-- recompensa: { oro, diamantes, personaje_id, foto_id, marco_id }
CREATE TABLE IF NOT EXISTS eventos_misiones (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,
    juego VARCHAR(40),
    meta INTEGER NOT NULL CHECK (meta > 0),
    desde TIMESTAMPTZ,
    hasta TIMESTAMPTZ,
    texto VARCHAR(160),
    recompensa JSONB NOT NULL DEFAULT '{}',
    orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS eventos_reclamos (
    mision_id INTEGER NOT NULL REFERENCES eventos_misiones(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reclamado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (mision_id, user_id)
);
