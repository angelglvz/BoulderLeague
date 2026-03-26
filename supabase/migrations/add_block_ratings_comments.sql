-- ============================================================
-- BLOCK_RATINGS y BLOCK_COMMENTS
-- Ejecutar en Supabase → SQL Editor si las tablas no existen
-- ============================================================

-- ── Crear tablas (si no existen) ─────────────────────────

CREATE TABLE IF NOT EXISTS block_ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id    uuid NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stars       integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (block_id, user_id)
);

CREATE TABLE IF NOT EXISTS block_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id    uuid NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (block_id, user_id)
);

-- ── Añadir UNIQUE si las tablas ya existían sin él ────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'block_ratings_block_id_user_id_key'
  ) THEN
    ALTER TABLE block_ratings ADD CONSTRAINT block_ratings_block_id_user_id_key UNIQUE (block_id, user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'block_comments_block_id_user_id_key'
  ) THEN
    ALTER TABLE block_comments ADD CONSTRAINT block_comments_block_id_user_id_key UNIQUE (block_id, user_id);
  END IF;
END $$;

-- ── Habilitar RLS ─────────────────────────────────────────

ALTER TABLE block_ratings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_comments ENABLE ROW LEVEL SECURITY;

-- ── Políticas RLS — BLOCK_RATINGS ────────────────────────

DROP POLICY IF EXISTS "br_select"     ON block_ratings;
DROP POLICY IF EXISTS "br_insert_own" ON block_ratings;
DROP POLICY IF EXISTS "br_update_own" ON block_ratings;

CREATE POLICY "br_select"     ON block_ratings FOR SELECT USING (true);
CREATE POLICY "br_insert_own" ON block_ratings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "br_update_own" ON block_ratings FOR UPDATE USING (user_id = auth.uid());

-- ── Políticas RLS — BLOCK_COMMENTS ───────────────────────

DROP POLICY IF EXISTS "bc_select"     ON block_comments;
DROP POLICY IF EXISTS "bc_insert_own" ON block_comments;
DROP POLICY IF EXISTS "bc_delete_own" ON block_comments;

CREATE POLICY "bc_select"     ON block_comments FOR SELECT USING (true);
CREATE POLICY "bc_insert_own" ON block_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bc_delete_own" ON block_comments FOR DELETE USING (user_id = auth.uid());

-- ── GRANTs ────────────────────────────────────────────────

GRANT ALL ON block_ratings  TO authenticated;
GRANT ALL ON block_comments TO authenticated;

