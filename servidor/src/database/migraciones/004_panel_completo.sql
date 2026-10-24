-- =====================================================
-- 004 · PANEL COMPLETO: bloquear cuentas y premios de los
-- juegos multijugador configurables desde el panel.
-- Se puede correr varias veces: no borra datos.
-- =====================================================

-- Cuenta bloqueada: no puede entrar ni jugar.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT FALSE;

-- Ajustes del juego que se cambian desde el panel
-- (por ahora: premios de Triqui y SigloGamif).
CREATE TABLE IF NOT EXISTS config_juego (
    clave VARCHAR(60) PRIMARY KEY,
    valor JSONB NOT NULL,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- El ranking ordena por nivel/XP y por victorias.
CREATE INDEX IF NOT EXISTS idx_player_profiles_xp ON player_profiles (xp DESC);
