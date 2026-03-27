-- ============================================================
-- FIX: Permisos faltantes en achievements y activity_feed
-- ------------------------------------------------------------
-- CAUSA: fix_all_rls_policies.sql ejecutó
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated
-- en un momento anterior a la creación de estas tablas
-- (20260326_achievements.sql), por lo que el rol `authenticated`
-- no tiene privilegio de INSERT → PostgREST devuelve 403.
-- Las políticas RLS son correctas; solo falta el GRANT base.
-- ============================================================

-- ── Tabla achievements ────────────────────────────────────
GRANT SELECT, INSERT ON TABLE achievements TO authenticated;

-- ── Tabla activity_feed ───────────────────────────────────
GRANT SELECT, INSERT ON TABLE activity_feed TO authenticated;

-- ── Default privileges: nuevas tablas en public accesibles
-- por defecto para authenticated (evita el mismo problema futuro)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

