-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- BLOCKS: select público, insert/update/delete solo owner
CREATE POLICY "blocks_select_active" ON blocks FOR SELECT USING (is_active = true);
CREATE POLICY "blocks_insert_gym_owner" ON blocks FOR INSERT
  WITH CHECK (
    (owner_type = 'gym' AND gym_id = auth.uid()) OR
    (owner_type = 'user' AND user_id = auth.uid())
  );
CREATE POLICY "blocks_update_owner" ON blocks FOR UPDATE
  USING (
    (owner_type = 'gym' AND gym_id = auth.uid()) OR
    (owner_type = 'user' AND user_id = auth.uid())
  );
CREATE POLICY "blocks_delete_owner" ON blocks FOR DELETE
  USING (
    (owner_type = 'gym' AND gym_id = auth.uid()) OR
    (owner_type = 'user' AND user_id = auth.uid())
  );

-- ATTEMPTS
CREATE POLICY "attempts_select_own" ON attempts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "attempts_insert_own" ON attempts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "attempts_update_own" ON attempts FOR UPDATE USING (user_id = auth.uid());

-- LEAGUES
CREATE POLICY "leagues_select_public" ON leagues FOR SELECT USING (
  is_private = false OR creator_id = auth.uid() OR
  id IN (SELECT league_id FROM league_participants WHERE user_id = auth.uid())
);
CREATE POLICY "leagues_insert_own" ON leagues FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "leagues_update_creator" ON leagues FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "leagues_delete_creator" ON leagues FOR DELETE USING (creator_id = auth.uid());

-- LEAGUE_PARTICIPANTS
CREATE POLICY "lp_select" ON league_participants FOR SELECT USING (true);
CREATE POLICY "lp_insert_own" ON league_participants FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "lp_delete_own" ON league_participants FOR DELETE USING (user_id = auth.uid());

-- LEAGUE_BLOCKS
CREATE POLICY "lb_select" ON league_blocks FOR SELECT USING (true);
CREATE POLICY "lb_insert_creator" ON league_blocks FOR INSERT
  WITH CHECK (league_id IN (SELECT id FROM leagues WHERE creator_id = auth.uid()));
CREATE POLICY "lb_delete_creator" ON league_blocks FOR DELETE
  USING (league_id IN (SELECT id FROM leagues WHERE creator_id = auth.uid()));

-- BLOCK_RATINGS
CREATE POLICY "br_select" ON block_ratings FOR SELECT USING (true);
CREATE POLICY "br_insert_own" ON block_ratings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "br_update_own" ON block_ratings FOR UPDATE USING (user_id = auth.uid());

-- BLOCK_COMMENTS
CREATE POLICY "bc_select" ON block_comments FOR SELECT USING (true);
CREATE POLICY "bc_insert_own" ON block_comments FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bc_delete_own" ON block_comments FOR DELETE USING (user_id = auth.uid());

-- ACHIEVEMENTS
CREATE POLICY "ach_select_own" ON achievements FOR SELECT USING (user_id = auth.uid());

-- FRIENDSHIPS
CREATE POLICY "fr_select" ON friendships FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "fr_insert" ON friendships FOR INSERT WITH CHECK (requester_id = auth.uid());
CREATE POLICY "fr_update" ON friendships FOR UPDATE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "fr_delete" ON friendships FOR DELETE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- ACTIVITY_FEED
CREATE POLICY "feed_select_friends" ON activity_feed FOR SELECT USING (
  user_id = auth.uid() OR
  user_id IN (
    SELECT CASE WHEN requester_id = auth.uid() THEN addressee_id ELSE requester_id END
    FROM friendships WHERE status = 'accepted'
    AND (requester_id = auth.uid() OR addressee_id = auth.uid())
  )
);

-- FEED_LIKES
CREATE POLICY "fl_select" ON feed_likes FOR SELECT USING (true);
CREATE POLICY "fl_insert" ON feed_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fl_delete" ON feed_likes FOR DELETE USING (user_id = auth.uid());