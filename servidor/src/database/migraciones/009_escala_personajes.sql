-- =====================================================
-- 009 · TAMAÑO DE CADA PERSONAJE
-- Algunos modelos vienen muy grandes o muy pequeños. El
-- administrador lo ajusta con una barra (1 = normal).
-- =====================================================

ALTER TABLE characters
    ADD COLUMN IF NOT EXISTS escala REAL NOT NULL DEFAULT 1;
