-- =====================================================
-- 011 · GIRAGAMIF (ruleta de la suerte) Y TIQUETES 🎫
-- Los tiquetes se ganan en los eventos y se gastan girando.
-- =====================================================

ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS tickets INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS ruletas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(300),
    costo INTEGER NOT NULL DEFAULT 1 CHECK (costo > 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    inicio TIMESTAMPTZ,
    fin TIMESTAMPTZ,
    orden INTEGER NOT NULL DEFAULT 0,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tipo: oro | diamantes | tickets | personaje | foto | marco | nada
-- ref: id del personaje o del cosmético
-- probabilidad: de 0 a 100 (todas suman 100)
-- repetido_oro: oro que recibe si ya tenía el personaje/foto/marco
CREATE TABLE IF NOT EXISTS ruleta_premios (
    id SERIAL PRIMARY KEY,
    ruleta_id INTEGER NOT NULL REFERENCES ruletas(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 0,
    ref VARCHAR(100),
    probabilidad NUMERIC(6, 3) NOT NULL CHECK (probabilidad >= 0 AND probabilidad <= 100),
    repetido_oro INTEGER NOT NULL DEFAULT 0,
    orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ruleta_giros (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ruleta_id INTEGER REFERENCES ruletas(id) ON DELETE SET NULL,
    premio_id INTEGER REFERENCES ruleta_premios(id) ON DELETE SET NULL,
    entregado JSONB NOT NULL DEFAULT '{}',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruleta_giros_usuario ON ruleta_giros (user_id, creado_en DESC);
