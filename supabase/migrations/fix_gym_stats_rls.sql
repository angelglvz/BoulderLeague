-- ============================================================
-- FIX RLS PARA ESTADÍSTICAS DEL GYM
-- El gym necesita leer:
--   1. Todos sus propios bloques (activos e inactivos) → datos históricos
--   2. Intentos realizados en sus bloques              → métricas de uso
-- ============================================================

-- ── 1. BLOCKS: el gym puede leer todos sus propios bloques ──────────────────
--    (sin este política el gym solo ve is_active=true, rompiendo el historial)
DROP POLICY IF EXISTS "blocks_select_gym_own" ON blocks;

CREATE POLICY "blocks_select_gym_own"
  ON blocks FOR SELECT
  USING (
    owner_type = 'gym' AND gym_id = auth.uid()
  );

-- ── 2. ATTEMPTS: el gym puede leer intentos en sus bloques ─────────────────
--    (sin esta política el contador semanal siempre devuelve 0)
DROP POLICY IF EXISTS "attempts_select_gym_owner" ON attempts;

CREATE POLICY "attempts_select_gym_owner"
  ON attempts FOR SELECT
  USING (
    block_id IN (
      SELECT id FROM blocks
      WHERE gym_id    = auth.uid()
        AND owner_type = 'gym'
    )
  );

