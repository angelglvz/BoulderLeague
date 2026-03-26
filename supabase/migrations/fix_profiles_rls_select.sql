-- Asegurar que RLS está habilitado en profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Borrar política anterior si existe (por si hay conflicto de nombre)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Crear política de SELECT pública: cualquier usuario autenticado puede leer cualquier perfil
CREATE POLICY "profiles_select_all"
  ON profiles
  FOR SELECT
  USING (true);

-- Asegurar también insert y update por si faltan
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

