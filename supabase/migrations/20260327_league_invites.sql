-- ─────────────────────────────────────────────────────────────
-- Tabla league_invites
-- Permite a los gyms invitar a sus fans a unirse a una liguilla.
-- Los usuarios ven las invitaciones pendientes en su panel de
-- notificaciones y pueden aceptar (→ join) o rechazar.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS league_invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id   uuid        NOT NULL REFERENCES leagues(id)   ON DELETE CASCADE,
  inviter_id  uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  invitee_id  uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_league_invites_invitee ON league_invites (invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_league_invites_league  ON league_invites (league_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE league_invites ENABLE ROW LEVEL SECURITY;

-- El gym (inviter) puede insertar invitaciones
DROP POLICY IF EXISTS "li_insert_inviter" ON league_invites;
CREATE POLICY "li_insert_inviter" ON league_invites
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

-- Ambas partes pueden ver sus invitaciones
DROP POLICY IF EXISTS "li_select_own" ON league_invites;
CREATE POLICY "li_select_own" ON league_invites
  FOR SELECT USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- El invitado puede actualizar el estado (aceptar / rechazar)
DROP POLICY IF EXISTS "li_update_invitee" ON league_invites;
CREATE POLICY "li_update_invitee" ON league_invites
  FOR UPDATE USING (invitee_id = auth.uid());

-- Cualquiera de los dos puede borrar
DROP POLICY IF EXISTS "li_delete_own" ON league_invites;
CREATE POLICY "li_delete_own" ON league_invites
  FOR DELETE USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

