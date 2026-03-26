-- Asegurar que gym_favorites tiene constraint único en (user_id, gym_id)
-- Si ya existe un UNIQUE o PK, esto no hace nada
ALTER TABLE gym_favorites
  DROP CONSTRAINT IF EXISTS gym_favorites_user_id_gym_id_key;

ALTER TABLE gym_favorites
  ADD CONSTRAINT gym_favorites_user_id_gym_id_key UNIQUE (user_id, gym_id);

