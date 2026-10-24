-- =====================================================
-- 005 · VOZ (walkie-talkie) Y REPORTES DE JUGADORES
-- Se puede correr varias veces: no borra datos.
-- =====================================================

-- El administrador puede quitarle la voz a un jugador.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS voz_bloqueada BOOLEAN NOT NULL DEFAULT FALSE;

-- Reportes que hacen los jugadores. "revisado" lo marca el
-- administrador: los reportes revisados ya no cuentan para
-- quitar la voz automáticamente.
CREATE TABLE IF NOT EXISTS reportes (
    id SERIAL PRIMARY KEY,
    reportado_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reportante_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    motivo VARCHAR(40) NOT NULL,
    contexto VARCHAR(40),
    revisado BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reportes_reportado ON reportes (reportado_id, revisado);
