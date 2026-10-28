-- =====================================================
-- 007 · CRÉDITOS DEL AUTOR DE CADA PERSONAJE
-- Muchos modelos gratis (Sketchfab, VRoid Hub…) piden dar
-- crédito al autor (licencia CC Attribution). Se muestra
-- en la tienda.
-- =====================================================

ALTER TABLE characters
    ADD COLUMN IF NOT EXISTS creditos VARCHAR(300);
