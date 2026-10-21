-- =====================================================
-- 002 · ADMINISTRADORES, NIVELES DE JUEGO, PARTIDAS Y TIENDA
-- Se puede correr varias veces: no borra datos.
-- =====================================================


-- -----------------------------------------------------
-- Rol del usuario: 'jugador' o 'admin'
-- -----------------------------------------------------

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'jugador';


-- -----------------------------------------------------
-- NIVELES DEL JUEGO DE PREGUNTAS
-- Cada nivel es un banco de preguntas de un grado y una
-- asignatura, con sus propias reglas y recompensas.
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS niveles_juego (
    id SERIAL PRIMARY KEY,

    juego VARCHAR(40) NOT NULL DEFAULT 'preguntas',

    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,

    grado VARCHAR(40) NOT NULL,
    asignatura VARCHAR(80) NOT NULL,

    -- 'facil' | 'media' | 'dificil'
    dificultad VARCHAR(20) NOT NULL DEFAULT 'media',

    preguntas_por_partida INTEGER NOT NULL DEFAULT 10,

    -- 0 = sin límite de tiempo
    segundos_por_pregunta INTEGER NOT NULL DEFAULT 30,

    vidas INTEGER NOT NULL DEFAULT 3,

    -- 'completar': recompensa completa solo si termina todas
    --              las preguntas con el mínimo de aciertos.
    -- 'puntos':    recompensa proporcional a los aciertos.
    tipo_recompensa VARCHAR(20) NOT NULL DEFAULT 'puntos',

    recompensa_xp INTEGER NOT NULL DEFAULT 50,
    recompensa_oro INTEGER NOT NULL DEFAULT 20,
    recompensa_diamantes INTEGER NOT NULL DEFAULT 0,

    -- Porcentaje mínimo de aciertos para ganar recompensa.
    porcentaje_minimo INTEGER NOT NULL DEFAULT 50,

    puntos_por_acierto INTEGER NOT NULL DEFAULT 100,

    -- Cuántas partidas al día dan recompensa (evita repetir
    -- el mismo nivel sin parar para subir de nivel).
    max_recompensas_diarias INTEGER NOT NULL DEFAULT 5,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    orden INTEGER NOT NULL DEFAULT 0,

    creado_por INTEGER REFERENCES users(id) ON DELETE SET NULL,

    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_niveles_filtros
    ON niveles_juego (activo, grado, asignatura);


CREATE TABLE IF NOT EXISTS preguntas (
    id SERIAL PRIMARY KEY,

    nivel_id INTEGER NOT NULL
        REFERENCES niveles_juego(id) ON DELETE CASCADE,

    texto TEXT NOT NULL,

    -- ["opción A", "opción B", ...]
    opciones JSONB NOT NULL,

    -- Posición (desde 0) de la opción correcta.
    respuesta_correcta INTEGER NOT NULL,

    explicacion TEXT,

    orden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_preguntas_nivel
    ON preguntas (nivel_id);


-- -----------------------------------------------------
-- PARTIDAS
-- Todas las partidas (preguntas, triqui, escape) quedan
-- registradas aquí: de aquí salen las estadísticas del
-- panel y las recompensas.
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS partidas (
    id BIGSERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    -- 'preguntas' | 'triqui' | 'escape-algebra'
    juego VARCHAR(40) NOT NULL,

    nivel_id INTEGER
        REFERENCES niveles_juego(id) ON DELETE SET NULL,

    -- 'en_curso' | 'terminada'
    estado VARCHAR(20) NOT NULL DEFAULT 'en_curso',

    -- 'ganada' | 'perdida' | 'empate' | 'retirada' | 'completada' | 'sin_vidas'
    resultado VARCHAR(20),

    preguntas_ids INTEGER[] NOT NULL DEFAULT '{}',
    indice_actual INTEGER NOT NULL DEFAULT 0,
    respuestas JSONB NOT NULL DEFAULT '[]',

    total_preguntas INTEGER NOT NULL DEFAULT 0,
    aciertos INTEGER NOT NULL DEFAULT 0,
    errores INTEGER NOT NULL DEFAULT 0,
    vidas_restantes INTEGER NOT NULL DEFAULT 0,
    comodin_usado BOOLEAN NOT NULL DEFAULT FALSE,

    puntos INTEGER NOT NULL DEFAULT 0,
    xp_ganada INTEGER NOT NULL DEFAULT 0,
    oro_ganado INTEGER NOT NULL DEFAULT 0,
    diamantes_ganados INTEGER NOT NULL DEFAULT 0,

    iniciada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    terminada_en TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partidas_usuario
    ON partidas (user_id, iniciada_en DESC);

CREATE INDEX IF NOT EXISTS idx_partidas_nivel
    ON partidas (nivel_id);

CREATE INDEX IF NOT EXISTS idx_partidas_fecha
    ON partidas (iniciada_en DESC);


-- -----------------------------------------------------
-- TIENDA DE PERSONAJES (SKINS)
-- -----------------------------------------------------

ALTER TABLE characters
    ADD COLUMN IF NOT EXISTS precio_oro INTEGER NOT NULL DEFAULT 0;

ALTER TABLE characters
    ADD COLUMN IF NOT EXISTS precio_diamantes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE characters
    ADD COLUMN IF NOT EXISTS nivel_minimo INTEGER NOT NULL DEFAULT 1;

ALTER TABLE characters
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE characters
    ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 0;


CREATE TABLE IF NOT EXISTS personajes_jugador (
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    character_id VARCHAR(100) NOT NULL
        REFERENCES characters(id) ON DELETE CASCADE,

    -- 'gratis' | 'oro' | 'diamantes' | 'regalo'
    moneda VARCHAR(20) NOT NULL DEFAULT 'gratis',
    precio INTEGER NOT NULL DEFAULT 0,

    adquirido_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, character_id)
);


-- Personajes que ya vienen con el juego (los modelos están
-- en public/models/characters). Si ya existen, NO se
-- cambian sus precios: los ajustas desde el panel.

INSERT INTO characters
    (id, name, model_path, thumbnail_path, is_default,
     precio_oro, precio_diamantes, nivel_minimo, orden)
VALUES
    ('green',     'Green',     '/models/characters/green.vrm',     '/models/characters/img/green.png',     FALSE,  300,  0,  2, 1),
    ('casper',    'Casper',    '/models/characters/casper.vrm',    '/models/characters/img/casper.png',    FALSE,  500,  0,  3, 2),
    ('eva',       'Eva',       '/models/characters/eva.vrm',       '/models/characters/img/eva.png',       FALSE,  500,  0,  3, 3),
    ('vila',      'Vila',      '/models/characters/vila.vrm',      '/models/characters/img/vila.png',      FALSE,  800,  0,  5, 4),
    ('nicky',     'Nicky',     '/models/characters/nicky.vrm',     '/models/characters/img/nicky.png',     FALSE, 1200,  0,  6, 5),
    ('lupe',      'Lupe',      '/models/characters/lupe.vrm',      NULL,                                   FALSE, 1500,  0,  8, 6),
    ('exclusive', 'Exclusivo', '/models/characters/exclusive.vrm', '/models/characters/img/exclusive.png', FALSE,    0, 25, 10, 7)
ON CONFLICT (id) DO NOTHING;

-- El personaje inicial: gratis, siempre disponible.
UPDATE characters
SET thumbnail_path = '/models/characters/img/adan.png'
WHERE id = 'adan'
  AND thumbnail_path = '/img/characters/default-avatar.png';


-- Todo jugador tiene los personajes gratis
-- (y el que tenga puesto actualmente).

INSERT INTO personajes_jugador (user_id, character_id, moneda)
SELECT u.id, c.id, 'gratis'
FROM users u
CROSS JOIN characters c
WHERE c.precio_oro = 0
  AND c.precio_diamantes = 0
ON CONFLICT DO NOTHING;

INSERT INTO personajes_jugador (user_id, character_id, moneda)
SELECT p.user_id, p.character_id, 'regalo'
FROM player_profiles p
JOIN characters c ON c.id = p.character_id
ON CONFLICT DO NOTHING;
