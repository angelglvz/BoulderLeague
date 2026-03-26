-- ─────────────────────────────────────────────
-- Eliminar tabla V1 si existe (schema incompatible)
-- CASCADE elimina índices, policies y triggers dependientes
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS achievements CASCADE;

-- ─────────────────────────────────────────────
-- Tabla de achievements obtenidos (V2)
-- ─────────────────────────────────────────────
CREATE TABLE achievements (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medal_key   text        NOT NULL,
  category    text        NOT NULL,
  tier        int         NOT NULL,
  points      int         NOT NULL,
  earned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, medal_key)
);

CREATE INDEX idx_achievements_user   ON achievements(user_id);
CREATE INDEX idx_achievements_earned ON achievements(earned_at DESC);

-- ─────────────────────────────────────────────
-- Puntos totales desnormalizados en profiles
-- (para ORDER BY rápido en ranking global)
-- ─────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS achievement_points int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION sync_achievement_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET achievement_points = (
    SELECT COALESCE(SUM(points), 0)
    FROM achievements
    WHERE user_id = NEW.user_id
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_achievement_points ON achievements;
CREATE TRIGGER trg_sync_achievement_points
  AFTER INSERT ON achievements
  FOR EACH ROW EXECUTE FUNCTION sync_achievement_points();

-- ─────────────────────────────────────────────
-- Función de stats de usuario (solo bloques de gym)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_gym_stats(p_user_id uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'gymBlocksCompleted', (
      SELECT COUNT(DISTINCT a.block_id)
      FROM attempts a
      JOIN blocks b ON b.id = a.block_id
      WHERE a.user_id = p_user_id
        AND b.owner_type = 'gym'
        AND a.result != 'not_completed'
    ),
    'gymBlocksByDifficulty', json_build_object(
      'principiante', (
        SELECT COUNT(DISTINCT a.block_id)
        FROM attempts a JOIN blocks b ON b.id = a.block_id
        WHERE a.user_id = p_user_id AND b.owner_type = 'gym'
          AND b.difficulty = 'principiante' AND a.result != 'not_completed'
      ),
      'novato', (
        SELECT COUNT(DISTINCT a.block_id)
        FROM attempts a JOIN blocks b ON b.id = a.block_id
        WHERE a.user_id = p_user_id AND b.owner_type = 'gym'
          AND b.difficulty = 'novato' AND a.result != 'not_completed'
      ),
      'medio', (
        SELECT COUNT(DISTINCT a.block_id)
        FROM attempts a JOIN blocks b ON b.id = a.block_id
        WHERE a.user_id = p_user_id AND b.owner_type = 'gym'
          AND b.difficulty = 'medio' AND a.result != 'not_completed'
      ),
      'avanzado', (
        SELECT COUNT(DISTINCT a.block_id)
        FROM attempts a JOIN blocks b ON b.id = a.block_id
        WHERE a.user_id = p_user_id AND b.owner_type = 'gym'
          AND b.difficulty = 'avanzado' AND a.result != 'not_completed'
      ),
      'experimentado', (
        SELECT COUNT(DISTINCT a.block_id)
        FROM attempts a JOIN blocks b ON b.id = a.block_id
        WHERE a.user_id = p_user_id AND b.owner_type = 'gym'
          AND b.difficulty = 'experimentado' AND a.result != 'not_completed'
      ),
      'elite', (
        SELECT COUNT(DISTINCT a.block_id)
        FROM attempts a JOIN blocks b ON b.id = a.block_id
        WHERE a.user_id = p_user_id AND b.owner_type = 'gym'
          AND b.difficulty = 'elite' AND a.result != 'not_completed'
      ),
      'profesional', (
        SELECT COUNT(DISTINCT a.block_id)
        FROM attempts a JOIN blocks b ON b.id = a.block_id
        WHERE a.user_id = p_user_id AND b.owner_type = 'gym'
          AND b.difficulty = 'profesional' AND a.result != 'not_completed'
      )
    ),
    'gymFlashes', (
      SELECT COUNT(DISTINCT a.block_id)
      FROM attempts a JOIN blocks b ON b.id = a.block_id
      WHERE a.user_id = p_user_id
        AND b.owner_type = 'gym'
        AND a.result = 'flash'
    ),
    'activeDaysThisMonth', (
      SELECT COUNT(DISTINCT DATE(a.created_at AT TIME ZONE 'UTC'))
      FROM attempts a JOIN blocks b ON b.id = a.block_id
      WHERE a.user_id = p_user_id
        AND b.owner_type = 'gym'
        AND a.result != 'not_completed'
        AND date_trunc('month', a.created_at) = date_trunc('month', NOW())
    ),
    'distinctGymsWithCompletion', (
      SELECT COUNT(DISTINCT b.gym_id)
      FROM attempts a JOIN blocks b ON b.id = a.block_id
      WHERE a.user_id = p_user_id
        AND b.owner_type = 'gym'
        AND a.result != 'not_completed'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "achievements_select_all" ON achievements;
CREATE POLICY "achievements_select_all" ON achievements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "achievements_insert_own" ON achievements;
CREATE POLICY "achievements_insert_own" ON achievements
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- RLS activity_feed (muro de logros público)
-- ─────────────────────────────────────────────
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed_select_achievements" ON activity_feed;
CREATE POLICY "feed_select_achievements" ON activity_feed
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "feed_insert_own" ON activity_feed;
CREATE POLICY "feed_insert_own" ON activity_feed
  FOR INSERT WITH CHECK (user_id = auth.uid());

