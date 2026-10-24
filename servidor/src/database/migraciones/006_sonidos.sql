-- =====================================================
-- 006 · BIBLIOTECA DE SONIDOS
-- Música y efectos que el administrador sube y reutiliza.
-- Qué sonido suena en cada momento del juego se guarda en
-- config_juego (clave "sonidos").
-- Se puede correr varias veces: no borra datos.
-- =====================================================

CREATE TABLE IF NOT EXISTS sonidos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    ruta VARCHAR(255) NOT NULL UNIQUE,
    -- Huella (SHA-256) del archivo: si se sube uno idéntico,
    -- se reutiliza el que ya existe.
    huella CHAR(64) UNIQUE,
    bytes INTEGER NOT NULL DEFAULT 0,
    -- Los que vienen con el juego no se pueden borrar.
    de_fabrica BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sonidos (nombre, ruta, de_fabrica) VALUES
    ('Clic', '/sounds/click.mp3', TRUE),
    ('Correcto', '/sounds/correct.mp3', TRUE),
    ('Incorrecto', '/sounds/incorrect.mp3', TRUE),
    ('Victoria', '/sounds/victory.mp3', TRUE),
    ('Fin del juego', '/sounds/game-over.mp3', TRUE),
    ('Comodín', '/sounds/lifeline.mp3', TRUE),
    ('Retirarse', '/sounds/retire.mp3', TRUE),
    ('Desbloquear', '/sounds/unlock.mp3', TRUE),
    ('Alerta', '/sounds/warning.mp3', TRUE),
    ('Música retro (Triqui)', '/sounds/triqui/retro.mp3', TRUE),
    ('Música Millonario', '/sounds/MathMillonario/fondo-millonario.mp3', TRUE)
ON CONFLICT (ruta) DO NOTHING;
