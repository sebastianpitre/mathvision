-- =====================================================
-- 010 · JUGADORES VERIFICADOS Y POSICIÓN DE PERSONAJES
-- =====================================================

-- El administrador marca jugadores como verificados (chulo azul).
ALTER TABLE users ADD COLUMN IF NOT EXISTS verificado BOOLEAN NOT NULL DEFAULT FALSE;

-- Correr el modelo a los lados y hacia arriba/abajo (en metros).
ALTER TABLE characters ADD COLUMN IF NOT EXISTS desplazar_x REAL NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS desplazar_y REAL NOT NULL DEFAULT 0;
