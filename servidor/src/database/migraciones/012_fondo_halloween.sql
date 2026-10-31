-- =====================================================
-- 012 · FONDO DEL LOBBY
-- El lobby empieza con el fondo de Halloween 🎃. Se cambia
-- en Panel → Lobby (fondo y anuncios). Si ya hay uno
-- guardado, no se toca.
-- =====================================================

INSERT INTO config_juego (clave, valor, actualizado_en)
VALUES ('fondo_lobby', '{"ruta": "/img/fondos/lobby-halloween.jpg"}', CURRENT_TIMESTAMP)
ON CONFLICT (clave) DO NOTHING;
