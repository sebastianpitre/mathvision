-- =====================================================
-- 013 · PASE ÉLITE
-- Niveles con premio gratis y premio élite. Se sube con
-- EXP que dan las partidas. La fila élite se compra con
-- diamantes o la regala el administrador.
-- =====================================================

CREATE TABLE IF NOT EXISTS pases (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    descripcion VARCHAR(300),
    imagen VARCHAR(255),
    inicio TIMESTAMPTZ NOT NULL,
    fin TIMESTAMPTZ NOT NULL,
    niveles INTEGER NOT NULL DEFAULT 50 CHECK (niveles BETWEEN 5 AND 200),
    exp_nivel INTEGER NOT NULL DEFAULT 100 CHECK (exp_nivel > 0),
    precio_diamantes INTEGER NOT NULL DEFAULT 50 CHECK (precio_diamantes >= 0),
    exp_ganada INTEGER NOT NULL DEFAULT 20,
    exp_perdida INTEGER NOT NULL DEFAULT 10,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pista: 'gratis' | 'elite'. mayor = premio elegido por el admin (no se rellena al azar).
CREATE TABLE IF NOT EXISTS pase_premios (
    pase_id INTEGER NOT NULL REFERENCES pases(id) ON DELETE CASCADE,
    nivel INTEGER NOT NULL,
    pista VARCHAR(10) NOT NULL CHECK (pista IN ('gratis', 'elite')),
    recompensa JSONB NOT NULL,
    mayor BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (pase_id, nivel, pista)
);

CREATE TABLE IF NOT EXISTS pase_jugador (
    pase_id INTEGER NOT NULL REFERENCES pases(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exp INTEGER NOT NULL DEFAULT 0,
    elite BOOLEAN NOT NULL DEFAULT FALSE,
    elite_origen VARCHAR(10), -- 'compra' | 'regalo'
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (pase_id, user_id)
);

CREATE TABLE IF NOT EXISTS pase_reclamos (
    pase_id INTEGER NOT NULL REFERENCES pases(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nivel INTEGER NOT NULL,
    pista VARCHAR(10) NOT NULL,
    reclamado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (pase_id, user_id, nivel, pista)
);
