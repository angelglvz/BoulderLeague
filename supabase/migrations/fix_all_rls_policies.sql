-- ============================================================
-- FIX COMPLETO DE POLÍTICAS RLS
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- ── GRANT básico de schema ────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ── Habilitar RLS en todas las tablas ────────────────────
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues               ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_participants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_blocks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_favorites         ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ─────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_all"   ON profiles;
DROP POLICY IF EXISTS "profiles_select_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ── BLOCKS ───────────────────────────────────────────────
DROP POLICY IF EXISTS "blocks_select_active"      ON blocks;
DROP POLICY IF EXISTS "blocks_insert_gym_owner"   ON blocks;
DROP POLICY IF EXISTS "blocks_update_owner"       ON blocks;
DROP POLICY IF EXISTS "blocks_delete_owner"       ON blocks;

CREATE POLICY "blocks_select_active"
  ON blocks FOR SELECT USING (is_active = true);

CREATE POLICY "blocks_insert_gym_owner"
  ON blocks FOR INSERT WITH CHECK (
    (owner_type = 'gym'  AND gym_id  = auth.uid()) OR
    (owner_type = 'user' AND user_id = auth.uid())
  );

CREATE POLICY "blocks_update_owner"
  ON blocks FOR UPDATE USING (
    (owner_type = 'gym'  AND gym_id  = auth.uid()) OR
    (owner_type = 'user' AND user_id = auth.uid())
  );

CREATE POLICY "blocks_delete_owner"
  ON blocks FOR DELETE USING (
    (owner_type = 'gym'  AND gym_id  = auth.uid()) OR
    (owner_type = 'user' AND user_id = auth.uid())
  );

-- ── ATTEMPTS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "attempts_select_own"  ON attempts;
DROP POLICY IF EXISTS "attempts_insert_own"  ON attempts;
DROP POLICY IF EXISTS "attempts_update_own"  ON attempts;

CREATE POLICY "attempts_select_own"
  ON attempts FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "attempts_insert_own"
  ON attempts FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "attempts_update_own"
  ON attempts FOR UPDATE USING (user_id = auth.uid());

-- ── LEAGUES ──────────────────────────────────────────────
DROP POLICY IF EXISTS "leagues_select_public"   ON leagues;
DROP POLICY IF EXISTS "leagues_insert_own"      ON leagues;
DROP POLICY IF EXISTS "leagues_update_creator"  ON leagues;
DROP POLICY IF EXISTS "leagues_delete_creator"  ON leagues;

CREATE POLICY "leagues_select_public"
  ON leagues FOR SELECT USING (
    is_private = false
    OR creator_id = auth.uid()
    OR id IN (SELECT league_id FROM league_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "leagues_insert_own"
  ON leagues FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "leagues_update_creator"
  ON leagues FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "leagues_delete_creator"
  ON leagues FOR DELETE USING (creator_id = auth.uid());

-- ── LEAGUE_PARTICIPANTS ───────────────────────────────────
DROP POLICY IF EXISTS "lp_select"      ON league_participants;
DROP POLICY IF EXISTS "lp_insert_own"  ON league_participants;
DROP POLICY IF EXISTS "lp_delete_own"  ON league_participants;

CREATE POLICY "lp_select"
  ON league_participants FOR SELECT USING (true);

CREATE POLICY "lp_insert_own"
  ON league_participants FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "lp_delete_own"
  ON league_participants FOR DELETE USING (user_id = auth.uid());

-- ── LEAGUE_BLOCKS ─────────────────────────────────────────
DROP POLICY IF EXISTS "lb_select"          ON league_blocks;
DROP POLICY IF EXISTS "lb_insert_creator"  ON league_blocks;
DROP POLICY IF EXISTS "lb_delete_creator"  ON league_blocks;

CREATE POLICY "lb_select"
  ON league_blocks FOR SELECT USING (true);

CREATE POLICY "lb_insert_creator"
  ON league_blocks FOR INSERT WITH CHECK (
    league_id IN (SELECT id FROM leagues WHERE creator_id = auth.uid())
  );

CREATE POLICY "lb_delete_creator"
  ON league_blocks FOR DELETE USING (
    league_id IN (SELECT id FROM leagues WHERE creator_id = auth.uid())
  );

-- ── GYM_FAVORITES ─────────────────────────────────────────
DROP POLICY IF EXISTS "gf_select_own"  ON gym_favorites;
DROP POLICY IF EXISTS "gf_insert_own"  ON gym_favorites;
DROP POLICY IF EXISTS "gf_delete_own"  ON gym_favorites;

CREATE POLICY "gf_select_own"
  ON gym_favorites FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "gf_insert_own"
  ON gym_favorites FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "gf_delete_own"
  ON gym_favorites FOR DELETE USING (user_id = auth.uid());

