# 🚀 Plan V2 — Climbify: Plataforma de Escalada Indoor

> Stack: React Native + Expo 55 · Supabase · TypeScript · expo-router
> Objetivo: transformar la app de liguillas en una plataforma completa de tracking, social y B2B.
> Base de datos: **reset completo** — el schema V2 es incompatible con el V1 (bloques desacoplados de liguillas).

---

## 📍 Estado de partida (MVP completado)

- ✅ Auth (registro, login, sesión persistida, logout)
- ✅ Liguillas: crear, unirse, iniciar, gestionar bloques
- ✅ Bloques: crear con foto (cámara/galería), editar, eliminar
- ✅ Registro de intentos con scoring
- ✅ Ranking en tiempo real con Realtime
- ✅ Temas claro/oscuro completo
- ✅ EAS Build configurado (bundle ID, keystore, eas.json)

---

## 🧱 Modelo mental V2

```
AccountType: USER | GYM

Gym (cuenta profesional)
 ├── Blocks (propiedad del rocódromo)
 │    ├── is_active (ciclo de vida)
 │    ├── Attempts (de usuarios)
 │    ├── Ratings (estrellas 1-5)
 │    └── Comments
 ├── Leagues (liguillas oficiales)
 │    └── LeagueBlocks (referencias, nunca copias)
 └── Dashboard B2B (analytics)

User (cuenta personal)
 ├── Attempts (en bloques de gym o de liguillas propias)
 ├── Leagues propias (liguillas privadas con bloques propios)
 │    └── Blocks (propiedad del usuario, solo dentro de su liga)
 ├── GymFavorites (acceso rápido a rocódromos favoritos, múltiples)
 ├── Achievements (medallas)
 ├── Friends
 └── Activity Feed
```

### Reglas clave de negocio
- Un **GYM no puede participar** en liguillas, solo crearlas
- Un **USER puede crear liguillas privadas** con sus propios bloques
- Los **bloques de un GYM** pueden usarse en liguillas del GYM (por referencia)
- Los **bloques de USER** solo existen dentro de una liguilla privada suya
- Bloques eliminados → pasan a `is_active = false` (no se borran, preservan historial)
- Un bloque puntuado en una liguilla **mantiene esa puntuación** para el ranking global del gym (no se puede cambiar)
- Un bloque puntuado fuera de liguilla **mantiene esa puntuación** si entra en una liguilla posterior
- Las liguillas tienen visibilidad: **pública** (visible para todos) o **privada** (solo con código)
- El home muestra liguillas activas + finalizadas en los **últimos 7 días**

---

## 🗄️ Fase 0 — Reset de base de datos y nuevo schema V2

> ⚠️ ANTES de empezar: hacer backup de datos de desarrollo si los hay, luego reset completo.
> Estimación: 2-3h

### 0.1 — Nuevo schema SQL completo

Crear `schema_v2.sql` y ejecutarlo en Supabase (SQL Editor → Run):

```sql
-- ======================
-- RESET
-- ======================
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ======================
-- EXTENSIONES
-- ======================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- TIPOS ENUM
-- ======================
CREATE TYPE account_type AS ENUM ('user', 'gym');

CREATE TYPE block_difficulty AS ENUM (
  'novato', 'medio', 'avanzado', 'experimentado', 'profesional'
);

CREATE TYPE block_owner_type AS ENUM ('gym', 'user');

CREATE TYPE attempt_result AS ENUM ('flash', 'completed', 'not_completed');

CREATE TYPE friendship_status AS ENUM ('pending', 'accepted');

CREATE TYPE achievement_type AS ENUM (
  'blocks_10', 'blocks_50', 'blocks_100',
  'advanced_10', 'professional_5',
  'flash_month', 'active_days_month'
);

CREATE TYPE feed_event_type AS ENUM ('attempt_completed', 'achievement_earned');

-- ======================
-- USUARIOS / CUENTAS
-- ======================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type account_type NOT NULL DEFAULT 'user',
  name TEXT NOT NULL,
  avatar_url TEXT,
  -- Solo para cuentas GYM
  gym_location TEXT,
  gym_description TEXT,
  -- Solo para cuentas USER
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- BLOQUES
-- ======================
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type block_owner_type NOT NULL,
  -- Si owner_type = 'gym': gym_id apunta a profiles.id (account_type='gym')
  -- Si owner_type = 'user': user_id apunta a profiles.id (account_type='user')
  gym_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  -- Identificación
  photo_url TEXT NOT NULL,
  identifier TEXT NOT NULL,
  difficulty block_difficulty NOT NULL,
  color TEXT,
  sector TEXT,
  -- Ciclo de vida
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraints
  CHECK (
    (owner_type = 'gym' AND gym_id IS NOT NULL AND user_id IS NULL) OR
    (owner_type = 'user' AND user_id IS NOT NULL AND gym_id IS NULL)
  )
);

-- ======================
-- INTENTOS
-- ======================
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  number_of_goes INTEGER NOT NULL CHECK (number_of_goes >= 1),
  result attempt_result NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, block_id) -- mejor intento por usuario y bloque
);

-- ======================
-- LIGUILLAS
-- ======================
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reward TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  access_code TEXT,
  max_participants INTEGER,
  ranking_visible_during BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- PARTICIPANTES DE LIGUILLA
-- ======================
CREATE TABLE league_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- ======================
-- RELACIÓN LIGUILLA ↔ BLOQUES (por referencia, nunca copia)
-- ======================
CREATE TABLE league_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, block_id)
);

-- ======================
-- RATINGS DE BLOQUES
-- ======================
CREATE TABLE block_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(block_id, user_id)
);

-- ======================
-- COMENTARIOS DE BLOQUES
-- ======================
CREATE TABLE block_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- ACHIEVEMENTS (MEDALLAS)
-- ======================
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type achievement_type NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- ======================
-- AMISTADES
-- ======================
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- ======================
-- FAVORITOS DE GYM (usuario → gym)
-- ======================
CREATE TABLE gym_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, gym_id),
  CHECK (user_id != gym_id)
);

CREATE INDEX idx_gym_favorites_user ON gym_favorites(user_id);
CREATE INDEX idx_gym_favorites_gym ON gym_favorites(gym_id);

-- ======================
-- FEED DE ACTIVIDAD
-- ======================
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type feed_event_type NOT NULL,
  -- Payload flexible
  block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,
  achievement_id UUID REFERENCES achievements(id) ON DELETE SET NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feed_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feed_item_id, user_id)
);

-- ======================
-- ÍNDICES
-- ======================
CREATE INDEX idx_blocks_gym ON blocks(gym_id) WHERE gym_id IS NOT NULL;
CREATE INDEX idx_blocks_user ON blocks(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_blocks_active ON blocks(is_active);
CREATE INDEX idx_attempts_user ON attempts(user_id);
CREATE INDEX idx_attempts_block ON attempts(block_id);
CREATE INDEX idx_league_blocks_league ON league_blocks(league_id);
CREATE INDEX idx_league_blocks_block ON league_blocks(block_id);
CREATE INDEX idx_league_participants_league ON league_participants(league_id);
CREATE INDEX idx_league_participants_user ON league_participants(user_id);
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_feed_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX idx_achievements_user ON achievements(user_id);

-- ======================
-- TRIGGER: límite de 100 bloques activos por gym
-- Al insertar el bloque 101, desactiva automáticamente el más antiguo
-- ======================
CREATE OR REPLACE FUNCTION enforce_gym_block_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
  oldest_block_id UUID;
BEGIN
  -- Solo aplica a bloques de gym
  IF NEW.owner_type != 'gym' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM blocks
  WHERE gym_id = NEW.gym_id AND is_active = true;

  IF active_count >= 100 THEN
    -- Desactivar el bloque activo más antiguo del gym
    SELECT id INTO oldest_block_id
    FROM blocks
    WHERE gym_id = NEW.gym_id AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    UPDATE blocks SET is_active = false, updated_at = NOW()
    WHERE id = oldest_block_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_gym_block_limit
  BEFORE INSERT ON blocks
  FOR EACH ROW EXECUTE FUNCTION enforce_gym_block_limit();

-- ======================
-- VIEWS ÚTILES
-- ======================

-- Score total por usuario en un gym (ranking global del gym)
CREATE VIEW gym_rankings AS
SELECT
  a.user_id,
  b.gym_id,
  SUM(a.score) AS total_score,
  COUNT(*) AS blocks_completed
FROM attempts a
JOIN blocks b ON b.id = a.block_id
WHERE b.gym_id IS NOT NULL AND b.is_active = true
GROUP BY a.user_id, b.gym_id;

-- Score mensual por gym
CREATE VIEW gym_rankings_monthly AS
SELECT
  a.user_id,
  b.gym_id,
  DATE_TRUNC('month', a.updated_at) AS month,
  SUM(a.score) AS total_score
FROM attempts a
JOIN blocks b ON b.id = a.block_id
WHERE b.gym_id IS NOT NULL
GROUP BY a.user_id, b.gym_id, DATE_TRUNC('month', a.updated_at);

-- Media de estrellas por bloque
CREATE VIEW block_avg_rating AS
SELECT
  block_id,
  ROUND(AVG(stars)::numeric, 1) AS avg_stars,
  COUNT(*) AS rating_count
FROM block_ratings
GROUP BY block_id;
```

**Archivos a modificar:**
- Reemplazar `schema.sql` con `schema_v2.sql`
- Actualizar `types/database.types.ts` con los nuevos tipos

### 0.2 — Políticas RLS V2

```sql
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
```

### 0.3 — Storage bucket actualizado

En Supabase Storage:
- Renombrar/recrear bucket `block-photos` con acceso público
- Añadir bucket `avatars` con acceso público

### 0.4 — Actualizar `types/database.types.ts`

Regenerar tipos con:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx supabase gen types typescript --project-id <project-id> > types/database.types.ts
```
O actualizar manualmente los tipos para reflejar las nuevas tablas.

### 0.5 — Actualizar `lib/scoring.ts`

Reescribir con la nueva fórmula V2:
```
score = base_points + difficulty_bonus

base_points:  flash=10, 2 intentos=5, 3=4, 4=3, 5=2, >5=1
bonus:        novato=0, medio=1, avanzado=2, experimentado=3, profesional=4
```

**Archivos:** `lib/scoring.ts`

---

## 👤 Fase 1 — Registro con tipo de cuenta (USER / GYM)

> Dependencia: Fase 0 completada
> Estimación: 3-4h

### 1.1 — Pantalla de bienvenida con elección de tipo de cuenta

Modificar `app/(auth)/welcome.tsx`:
- Añadir dos botones grandes: **"Soy escalador 🧗"** y **"Soy un rocódromo 🏢"**
- Guardar la elección en estado local antes de navegar a registro

**Archivos:** `app/(auth)/welcome.tsx`

### 1.2 — Formulario de registro adaptado al tipo de cuenta

Modificar `app/(auth)/register.tsx`:
- Si `account_type = 'user'`: formulario actual (nombre, email, contraseña)
- Si `account_type = 'gym'`: formulario extendido (nombre del rocódromo, ubicación, email, contraseña)
- Al crear el usuario en Supabase Auth, insertar en `profiles` con el `account_type` correcto

**Archivos:** `app/(auth)/register.tsx`

### 1.3 — Trigger Supabase: crear perfil automáticamente al registrarse

Ejecutar en Supabase SQL Editor:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
    COALESCE((NEW.raw_user_meta_data->>'account_type')::account_type, 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### 1.4 — Hook `useProfile` con tipo de cuenta

Crear `hooks/useProfile.ts`:
- Devuelve el perfil completo del usuario autenticado
- Expone `isGym` y `isUser` como booleanos de conveniencia
- Cachea el resultado en memoria

**Archivos:** `hooks/useProfile.ts`, `hooks/index.ts`

### 1.5 — Proteger rutas según tipo de cuenta

Modificar `app/(app)/_layout.tsx`:
- Leer `account_type` del perfil
- Las rutas de "crear bloque de gym" solo accesibles si `isGym`
- Las rutas de "liguillas personales" solo accesibles si `isUser`

**Archivos:** `app/(app)/_layout.tsx`

---

## 🏢 Fase 2 — Home diferenciado por tipo de cuenta

> Dependencia: Fase 1 completada
> Estimación: 5-6h

### 2.1 — Home para USER

Modificar `app/(app)/index.tsx` (vista de usuario):
- **Sección 1 — Mis gyms favoritos**: scroll horizontal de `GymCard` con acceso directo
  - Si no tiene favoritos: botón **"Buscar un rocódromo"**
- **Sección 2 — Liguillas activas**: liguillas en curso en las que participa el usuario
  - Badge de estado: 🟢 En curso / 🏁 Finalizada
  - Liguillas finalizadas: solo las de los **últimos 7 días** (`end_date >= NOW() - INTERVAL '7 days'`)
  - Indicador de visibilidad: 🔓 Pública / 🔒 Privada
  - Al pulsar → detalle de la liguilla
- **Sección 3 — Descubrir**: acceso a gyms favoritos y explorar rocódromos
- Contador de bloques completados esta semana

**Query home:**
```sql
-- Liguillas activas o finalizadas recientemente del usuario
SELECT l.*, lp.joined_at
FROM leagues l
JOIN league_participants lp ON lp.league_id = l.id
WHERE lp.user_id = auth.uid()
  AND (
    l.end_date IS NULL OR              -- sin iniciar
    l.end_date > NOW() OR              -- en curso
    l.end_date >= NOW() - INTERVAL '7 days'  -- finalizadas recientes
  )
ORDER BY l.end_date DESC NULLS LAST;
```

**Archivos:** `app/(app)/index.tsx`

### 2.2 — Home para GYM

Crear `app/(app)/gym/index.tsx`:
- Resumen: nº de bloques activos (con indicador visual del límite: X/100), intentos esta semana
- Acceso rápido: **"Añadir bloque"**, **"Ver ranking"**, **"Crear liguilla"**
- Lista de bloques activos del gym con indicadores de popularidad

**Archivos:** `app/(app)/gym/index.tsx`, `app/(app)/gym/_layout.tsx`

### 2.3 — Pantalla de perfil de gym (pública)

Crear `app/(app)/gym/[id].tsx` con **3 tabs**:

**Tab 1 — Info**
- Nombre, ubicación, descripción
- Contador de bloques activos (X/100) con barra de progreso
- Botón **"⭐ Favorito"** (toggle): añade/quita de `gym_favorites` — solo cuentas USER
- Botón **"Explorar bloques"** → navega a tab Bloques

**Tab 2 — Liguillas**
- Sub-sección **"Activas / En curso"**: liguillas del gym con `start_date <= NOW() AND end_date > NOW()`
  - Cada card muestra: nombre, fechas, nº participantes, badge de visibilidad 🔓/🔒
  - Si es pública: botón **"Apuntarse"** directo
  - Si es privada: botón **"Unirse con código"** → modal para introducir código
  - Si ya participa: badge **"Ya apuntado ✓"**
- Sub-sección **"Finalizadas"**: liguillas con `end_date < NOW()`
  - Cada card muestra: nombre, fechas, ganador (posición 1 del ranking)
  - Botón **"Ver ranking"** → pantalla de ranking de esa liguilla

**Tab 3 — Ranking global**
- Ranking de usuarios del gym (todos los bloques, no solo liguillas)
- Formato compacto: **Top 5 + tu posición**
  ```
  🥇 1. Fulano    — 342 pts  (28 bloques)
  🥈 2. Mengano   — 298 pts  (24 bloques)
  🥉 3. Otro      — 201 pts  (18 bloques)
     4. Otro      — 187 pts  (16 bloques)
     5. Otro      — 165 pts  (14 bloques)
  ···
  📍 255. Tú      — 12 pts   (3 bloques)
  ```
- Tabs internos: **Global** · **Este mes** · **Esta semana**
- Botón "Ver ranking completo" → pantalla expandida

**Archivos:** `app/(app)/gym/[id].tsx`

### 2.4 — Componente `GymCard`

Crear `components/GymCard.tsx`:
- Nombre del gym, ubicación
- Nº de bloques activos (X/100)
- Indicador visual si es favorito (estrella)
- Reutilizable en listado de gyms, búsqueda y sección de favoritos del home

**Archivos:** `components/GymCard.tsx`, `components/index.ts`

### 2.5 — Buscador de rocódromos

Crear `app/(app)/gyms/search.tsx`:
- Input de búsqueda por nombre o ubicación (búsqueda en tiempo real con debounce 300ms)
- Resultados como lista de `GymCard`
- Estado vacío con ilustración: "No se han encontrado rocódromos"
- Al pulsar en un gym → navega al perfil público `gym/[id]`
- Accesible desde el home de USER y desde la barra de navegación

**Archivos:** `app/(app)/gyms/search.tsx`, `app/(app)/gyms/_layout.tsx`

### 2.6 — Listado de todos los rocódromos

Crear `app/(app)/gyms/index.tsx`:
- Listado completo de gyms registrados en la plataforma
- Ordenados por: más cercanos (si hay permiso de ubicación) o alfabético
- Buscador integrado en la parte superior
- Cada card muestra si ya es favorito del usuario

**Archivos:** `app/(app)/gyms/index.tsx`

### 2.7 — Componente `LeagueCardPublic` con badge de visibilidad

Crear `components/LeagueCardPublic.tsx` (diferente al `LeagueCard` del MVP, orientado a vista de terceros):
- Nombre de la liguilla
- Fechas de inicio y fin
- Nº de participantes actuales (y máximo si lo hay)
- Badge de visibilidad: 🔓 **Pública** (verde) / 🔒 **Privada** (naranja)
- Badge de estado: 🟢 **En curso** / ⏳ **Sin iniciar** / 🏁 **Finalizada**
- Acción principal según estado:
  - En curso + pública → **"Apuntarse"**
  - En curso + privada → **"Unirse con código"** (modal)
  - Finalizada → **"Ver ranking"**
  - Ya participa → **"Ya apuntado ✓"** (deshabilitado)
- Reutilizable en: perfil de gym, sección de amigos y buscador

**Archivos:** `components/LeagueCardPublic.tsx`, `components/index.ts`

### 2.8 — Modal "Unirse con código" reutilizable

Crear `components/JoinLeagueModal.tsx`:
- Input de código de acceso (uppercase automático, mín. 4 chars)
- Botón "Unirse" → verifica código contra `leagues.access_code` y hace INSERT en `league_participants`
- Mensajes de error: código incorrecto / liga llena / ya eres participante
- Reutilizable desde: perfil de gym, sección de amigos, pantalla de unirse

**Archivos:** `components/JoinLeagueModal.tsx`, `components/index.ts`

---

## 🧱 Fase 3 — Bloques de Gym (tracking continuo)

> Dependencia: Fase 2 completada
> Estimación: 5-6h

### 3.1 — Crear bloque (cuenta GYM)

Crear `app/(app)/gym/blocks/add.tsx`:
- Abrir cámara directamente al entrar
- Campos: identificador, dificultad, color (opcional), sector (opcional)
- Subir foto a Storage → insertar en `blocks` con `owner_type='gym'`, `gym_id=auth.uid()`
- Feedback visual al guardar
- Si el gym tiene 99 bloques activos: advertencia **"Añadir este bloque desactivará el más antiguo"**

**Archivos:** `app/(app)/gym/blocks/add.tsx`

### 3.2 — Listado de bloques del gym (vista owner GYM)

Crear `app/(app)/gym/blocks/index.tsx`:
- FlatList con `BlockCard` de los bloques activos del gym
- **Filtros combinables:**
  - Por dificultad: chips horizontales (Todos / Novato / Medio / Avanzado / Experimentado / Profesional)
  - Por estado: Todos / Activos / Inactivos
- Contador visible: **"X/100 bloques activos"** con barra de progreso
- Botón ➕ para añadir nuevo bloque (deshabilitado si ≥100 activos con tooltip)
- Swipe izquierda o botón 🗑️ para desactivar bloque (`is_active = false`)
- Botón para reactivar bloques inactivos (si hay hueco, i.e., activos < 100)

**Archivos:** `app/(app)/gym/blocks/index.tsx`

### 3.3 — Listado de bloques del gym (vista USER / pública)

Crear `app/(app)/gyms/[id]/blocks.tsx`:
- FlatList de bloques activos del gym seleccionado
- **Filtros combinables:**
  - Por dificultad: chips horizontales (Todos / Novato / Medio / Avanzado / Experimentado / Profesional)
  - Por estado personal: **Todos** / **Pendientes** (sin intento) / **Realizados** (con intento)
- Cada `BlockCard` muestra el resultado propio si existe (flash ⚡ / completado ✓ / sin hacer)
- Al pulsar → detalle del bloque con botón "Registrar intento"

**Archivos:** `app/(app)/gyms/[id]/blocks.tsx`

### 3.4 — Detalle de bloque (vista pública)

Refactor `app/(app)/blocks/[id]/index.tsx`:
- Foto del bloque (pantalla completa)
- Dificultad, sector, fecha de creación
- Media de estrellas (cuando existan ratings)
- Nº de intentos totales
- Resultado propio del usuario autenticado (si existe)
- **Botón "Registrar intento"** (solo cuentas USER)
- **Botón "Editar"** (solo owner del bloque y si no hay liguilla activa)

**Archivos:** `app/(app)/blocks/[id]/index.tsx`

### 3.5 — Editar bloque (owner)

Refactor `app/(app)/blocks/[id]/edit.tsx`:
- Editar foto, dificultad, color, sector (nunca el identificador)
- Solo disponible si `is_active = true`
- Al guardar → `updated_at = NOW()`

**Archivos:** `app/(app)/blocks/[id]/edit.tsx`

### 3.6 — Desactivar bloque (soft delete) con límite de 100

Lógica de desactivación:
- En lugar de `DELETE`, actualizar `is_active = false`
- Alerta de confirmación: **"Este bloque se desactivará. Seguirá visible en el historial de los usuarios que lo escalaron."**
- El trigger `trg_gym_block_limit` (definido en schema 0.1) desactiva automáticamente el más antiguo al llegar a 101
- La UI del gym muestra el bloque desactivado automáticamente con una notificación: **"El bloque más antiguo se ha desactivado automáticamente para dar paso al nuevo"**

**Archivos:** `app/(app)/gym/blocks/index.tsx`, `app/(app)/gym/blocks/add.tsx`

---

## 🧗 Fase 4 — Registro de intentos V2 y scoring

> Dependencia: Fase 3 completada
> Estimación: 3-4h

### 4.1 — Pantalla de registro de intento (refactor)

Refactor `app/(app)/blocks/[id]/log-attempt.tsx`:
- Selector visual de resultado: **FLASH** / **COMPLETADO** / **NO COMPLETADO**
- Si resultado ≠ FLASH: slider/picker de número de intentos (2-99)
- Mostrar score calculado en tiempo real antes de guardar
- Si ya existe intento previo: mostrar resultado actual y preguntar si actualizar
- Solo accesible para cuentas USER

**Archivos:** `app/(app)/blocks/[id]/log-attempt.tsx`, `lib/scoring.ts`

### 4.2 — Scoring V2

Actualizar `lib/scoring.ts`:
```typescript
// Puntos base
flash → 10
2 intentos → 5
3 → 4, 4 → 3, 5 → 2, >5 → 1

// Bonus por dificultad
novato → +0, medio → +1, avanzado → +2,
experimentado → +3, profesional → +4
```

**Archivos:** `lib/scoring.ts`

### 4.3 — Historial de intentos del usuario

Crear `app/(app)/profile/attempts.tsx`:
- Lista cronológica de todos los intentos del usuario
- Agrupado por fecha
- Indicador de resultado y puntuación
- Filtro por dificultad

**Archivos:** `app/(app)/profile/attempts.tsx`

---

## 🏆 Fase 5 — Rankings del Gym

> Dependencia: Fase 4 completada
> Estimación: 3-4h

### 5.1 — Ranking global del gym

Crear `app/(app)/gym/[id]/ranking.tsx`:
- Usa la view `gym_rankings`
- Top 10 con avatar, nombre, puntuación total y nº de bloques
- Diseño reutilizando componentes del ranking de liguillas V1

**Archivos:** `app/(app)/gym/[id]/ranking.tsx`

### 5.2 — Ranking mensual y semanal

Añadir tabs a la pantalla de ranking del gym:
- **Global** · **Este mes** · **Esta semana**
- Semanal: query con `WHERE updated_at >= NOW() - INTERVAL '7 days'`
- Mensual: usa `gym_rankings_monthly` view

**Archivos:** `app/(app)/gym/[id]/ranking.tsx`

### 5.3 — Ranking por bloque individual

En el detalle del bloque, sección "Ranking del bloque":
- Top usuarios ordenados por: mejor resultado → menor nº intentos
- Solo top 5 visible, botón "Ver todos"

**Archivos:** `app/(app)/blocks/[id]/index.tsx`

### 5.4 — Mi posición en el ranking

En el ranking del gym:
- Resaltar la fila del usuario autenticado aunque esté fuera del top 10
- Mostrar "Tu posición: #N"

**Archivos:** `app/(app)/gym/[id]/ranking.tsx`

---

## 🎖️ Fase 6 — Achievements (Medallas)

> Dependencia: Fase 4 completada
> Estimación: 4-5h

### 6.1 — Definición de medallas y condiciones

Crear `lib/achievements.ts`:
```typescript
const ACHIEVEMENT_CONDITIONS = {
  blocks_10:        { label: '10 bloques completados',    check: (stats) => stats.completed >= 10 },
  blocks_50:        { label: '50 bloques completados',    check: (stats) => stats.completed >= 50 },
  blocks_100:       { label: '100 bloques completados',   check: (stats) => stats.completed >= 100 },
  advanced_10:      { label: '10 bloques Avanzado',       check: (stats) => stats.advanced >= 10 },
  professional_5:   { label: '5 bloques Profesional',     check: (stats) => stats.professional >= 5 },
  flash_month:      { label: 'Flash del mes',             check: (stats) => stats.flashesThisMonth >= 5 },
  active_days_month:{ label: 'Escalador constante',       check: (stats) => stats.activeDaysThisMonth >= 10 },
}
```

**Archivos:** `lib/achievements.ts`

### 6.2 — Evaluación automática post-intento

En la función de guardar intento (`log-attempt.tsx`):
- Tras INSERT/UPDATE en `attempts`, llamar a `evaluateAchievements(userId)`
- `evaluateAchievements` consulta stats del usuario y compara con condiciones
- Inserta en `achievements` si se cumple la condición y no existe ya
- Devuelve array de nuevas medallas obtenidas

**Archivos:** `lib/achievements.ts`, `app/(app)/blocks/[id]/log-attempt.tsx`

### 6.3 — Toast de medalla conseguida

Crear `components/AchievementToast.tsx`:
- Modal/overlay animado que aparece cuando se consigue una medalla
- Icono de medalla + nombre + descripción
- Auto-cierre a los 3 segundos

**Archivos:** `components/AchievementToast.tsx`

### 6.4 — Pantalla de perfil con medallas

Crear `app/(app)/profile/index.tsx`:
- Avatar, nombre, stats (bloques completados, flashes, días activos)
- Grid de medallas (obtenidas en color, no obtenidas en gris)
- Barra de progreso hacia la siguiente medalla

**Archivos:** `app/(app)/profile/index.tsx`, `app/(app)/profile/_layout.tsx`

---

## ⭐ Fase 7 — Valoraciones y comentarios

> Dependencia: Fase 3 completada
> Estimación: 3-4h

### 7.1 — Componente de rating con estrellas

Crear `components/StarRating.tsx`:
- 5 estrellas interactivas (TouchableOpacity)
- Modo solo-lectura para mostrar media
- Versión compacta (inline) y versión completa

**Archivos:** `components/StarRating.tsx`

### 7.2 — Rating en detalle de bloque

En `app/(app)/blocks/[id]/index.tsx`:
- Mostrar media de estrellas (desde `block_avg_rating` view)
- Si el usuario ya valoró: mostrar su valoración actual editable
- Si no: mostrar prompt "¿Cómo valoras este bloque?"
- UPSERT en `block_ratings`

**Archivos:** `app/(app)/blocks/[id]/index.tsx`

### 7.3 — Sección de comentarios en detalle de bloque

En `app/(app)/blocks/[id]/index.tsx`:
- Lista de últimos 5 comentarios con avatar + nombre + texto
- Input de texto (máx 300 chars) + botón enviar
- Botón "Ver todos" → navega a `app/(app)/blocks/[id]/comments.tsx`

**Archivos:** `app/(app)/blocks/[id]/index.tsx`

### 7.4 — Pantalla completa de comentarios

Crear `app/(app)/blocks/[id]/comments.tsx`:
- Lista completa con FlatList
- Input fijo en la parte inferior
- El autor puede borrar sus propios comentarios (swipe)

**Archivos:** `app/(app)/blocks/[id]/comments.tsx`

---

## 🔗 Fase 8 — Liguillas V2 (reutilizando bloques + QR)

> Dependencia: Fases 0, 3 completadas
> Estimación: 7-9h

### 8.1 — Flujo de creación de liguilla V2

Refactor `app/(app)/leagues/create.tsx`:
- **Cuenta GYM**: al crear, puede añadir bloques de su propio catálogo
- **Cuenta USER**: al crear, crea bloques nuevos (igual que V1)
- Validaciones: código de acceso obligatorio si `is_private`, mínimo 4 chars uppercase

**Archivos:** `app/(app)/leagues/create.tsx`

### 8.2 — Selector de bloques para liguilla GYM

Crear `app/(app)/leagues/[id]/select-blocks.tsx`:
- FlatList con los bloques activos del gym
- Multi-selección con checkbox
- Filtro por dificultad y sector
- Botón "Confirmar selección" → INSERT en `league_blocks`

**Archivos:** `app/(app)/leagues/[id]/select-blocks.tsx`

### 8.3 — Detalle de liguilla V2

Refactor `app/(app)/leagues/[id].tsx`:
- Bloques obtenidos desde `league_blocks JOIN blocks`
- Si creador GYM: puede añadir/quitar bloques (antes de iniciar)
- Si creador USER: puede añadir bloques nuevos (antes de iniciar)
- **Regla**: el creador GYM no puede participar, solo gestionar

**Archivos:** `app/(app)/leagues/[id].tsx`

### 8.4 — Añadir bloque a liguilla de usuario (V2)

Refactor `app/(app)/leagues/[id]/add-block.tsx`:
- Flujo igual que V1 (cámara → datos → guardar)
- Ahora: INSERT en `blocks` con `owner_type='user'` + INSERT en `league_blocks`
- El bloque queda vinculado a la liga pero es propiedad del usuario

**Archivos:** `app/(app)/leagues/[id]/add-block.tsx`

### 8.5 — Proteger participación en liguillas

En el flujo de unirse a liguilla (`app/(app)/leagues/join.tsx`):
- Verificar que `account_type = 'user'` antes de permitir unirse
- Si es GYM: mostrar mensaje "Los rocódromos no pueden participar en liguillas"

**Archivos:** `app/(app)/leagues/join.tsx`

### 8.6 — QR de liguilla + PDF imprimible por email

> Dependencia: liguilla creada (cualquier estado)
> ⚠️ Requiere: librería `react-native-qrcode-svg` + `expo-print` + `expo-sharing` + Edge Function Supabase + cuenta gratuita en **Resend** (resend.com, 3.000 emails/mes gratis)

#### Parte A — QR en pantalla (sin coste, inmediato)

En la pantalla de detalle de liguilla `app/(app)/leagues/[id].tsx`:
- Nuevo botón **"📲 Mostrar QR"** → abre un modal con el QR a pantalla completa
- El QR codifica una **deep link** de la app:
  - Liguilla pública: `climbify://join?league=<id>`
  - Liguilla privada: `climbify://join?league=<id>&code=<access_code>`
- El modal tiene:
  - QR grande y legible
  - Nombre de la liguilla como título
  - Badge 🔓/🔒 con indicación de si es pública o privada
  - Botón **"Compartir enlace"** → `expo-sharing` con el deep link como texto
  - Botón **"Enviarme el PDF"** → dispara la Parte B

```bash
npx expo install react-native-qrcode-svg react-native-svg
```

**Archivos:** `app/(app)/leagues/[id].tsx`, `components/LeagueQRModal.tsx`

#### Parte B — PDF imprimible + envío por email

**En el cliente (generación del PDF):**

Crear `lib/generateLeaguePDF.ts`:
- Genera HTML con: logo Climbify, nombre de la liguilla, QR (como imagen SVG/PNG), fechas, instrucciones de unión
- Usa `expo-print` para convertir el HTML a PDF
- Usa `expo-sharing` para compartir el PDF directamente desde el móvil (sin necesidad de email)

```typescript
// Estructura del PDF
<html>
  <body style="font-family: sans-serif; text-align: center; padding: 40px">
    <img src="logo-climbify.png" height="60" />
    <h1>{{ nombre_liguilla }}</h1>
    <p>{{ fechas }}</p>
    <img src="{{ qr_base64 }}" width="250" height="250" />
    <p>Escanea el QR o usa el código: <strong>{{ access_code }}</strong></p>
    <p style="color: gray; font-size: 12px">Descarga Climbify en tu móvil para participar</p>
  </body>
</html>
```

**Para el envío por email (Edge Function + Resend):**

Crear `supabase/functions/send-league-qr/index.ts`:
```typescript
// Recibe: league_id, user_email, pdf_base64
// Usa Resend API para enviar el email con el PDF adjunto
// Variables de entorno: RESEND_API_KEY
```

Instalar Resend:
```bash
# Solo para la Edge Function, no en el proyecto React Native
```

El email enviado contiene:
- Asunto: "Tu liguilla **{{ nombre }}** está lista 🧗"
- Cuerpo: resumen de la liguilla + instrucciones
- Adjunto: PDF con el QR

**Flujo completo:**
```
Usuario crea liguilla
       ↓
Botón "📲 Mostrar QR" → Modal con QR en pantalla  ← siempre disponible
       ↓ (opcional)
Botón "Enviarme el PDF"
       ↓
Cliente genera PDF con expo-print
       ↓
Llamada a Edge Function con PDF en base64
       ↓
Edge Function → Resend API → Email al owner con PDF adjunto
```

**Configuración necesaria (una sola vez):**
1. Crear cuenta gratuita en [resend.com](https://resend.com) (3.000 emails/mes gratis)
2. Obtener API Key
3. Añadir en Supabase Dashboard → Edge Functions → Secrets: `RESEND_API_KEY=re_xxxx`
4. Verificar dominio o usar el dominio de prueba de Resend (`onboarding@resend.dev`)

**Archivos:**
- `components/LeagueQRModal.tsx` — modal con QR a pantalla completa
- `lib/generateLeaguePDF.ts` — generación del HTML/PDF
- `supabase/functions/send-league-qr/index.ts` — Edge Function
- `app/(app)/leagues/[id].tsx` — integrar botón y modal

---

## 👥 Fase 9 — Capa social (amigos + feed)

> Dependencia: Fase 6 completada (achievements)
> Estimación: 6-8h

### 9.1 — Búsqueda de usuarios

Crear `app/(app)/social/search.tsx`:
- Input de búsqueda por **nombre o email** (búsqueda en tiempo real con debounce 300ms)
- Resultados: avatar, nombre, nº bloques completados
- Botón "Añadir amigo" → INSERT en `friendships` con `status='pending'`
- Si ya son amigos: badge **"Ya sois amigos ✓"**
- Si solicitud pendiente enviada: badge **"Solicitud enviada ⏳"**
- Si solicitud pendiente recibida: botones **"Aceptar"** / **"Rechazar"**

```sql
-- Búsqueda por nombre o email (insensible a mayúsculas)
SELECT id, name, avatar_url, account_type
FROM profiles
WHERE account_type = 'user'
  AND (
    name ILIKE '%' || :query || '%' OR
    id IN (SELECT id FROM auth.users WHERE email ILIKE '%' || :query || '%')
  )
LIMIT 20;
```

**Archivos:** `app/(app)/social/search.tsx`

### 9.2 — Gestión de solicitudes de amistad

Crear `app/(app)/social/requests.tsx`:
- Listado de solicitudes recibidas (`status='pending'`, `addressee_id = auth.uid()`)
- Botones Aceptar / Rechazar → UPDATE `friendships.status = 'accepted'` o DELETE
- Badge con contador en el icono de navegación si hay pendientes

**Archivos:** `app/(app)/social/requests.tsx`

### 9.3 — Pestaña principal de Amigos

Crear `app/(app)/social/index.tsx` con **3 tabs**:

**Tab 1 — Mis amigos**
- Lista de amigos aceptados con avatar y nombre
- Botón de búsqueda (→ navega a `search.tsx`)
- Badge de solicitudes pendientes
- Al pulsar en un amigo → perfil público `profile/[id]`

**Tab 2 — Liguillas de amigos**
- Listado de liguillas **públicas** y **activas** de todos mis amigos (no finalizadas)
- Cada card usa `LeagueCardPublic` con:
  - Nombre de la liguilla
  - Creador (nombre del amigo + avatar)
  - Badge de visibilidad: 🔓 Pública / 🔒 Privada
  - Badge de estado: 🟢 En curso / ⏳ Sin iniciar
  - Nº participantes
  - Acción: **"Apuntarse"** (pública) / **"Unirse con código"** (privada) / **"Ya apuntado ✓"**
- Ordenadas por `start_date ASC` (las que empiezan antes, primero)
- Incluye tanto liguillas de gyms donde el amigo participa, como liguillas privadas propias del amigo

```sql
-- Liguillas públicas activas de amigos
SELECT DISTINCT l.*, p.name AS creator_name, p.avatar_url AS creator_avatar
FROM leagues l
JOIN profiles p ON p.id = l.creator_id
JOIN league_participants lp ON lp.league_id = l.id
WHERE lp.user_id IN (
  -- IDs de mis amigos aceptados
  SELECT CASE WHEN requester_id = auth.uid() THEN addressee_id ELSE requester_id END
  FROM friendships
  WHERE status = 'accepted'
    AND (requester_id = auth.uid() OR addressee_id = auth.uid())
)
AND (l.end_date IS NULL OR l.end_date > NOW())  -- activas o sin iniciar
ORDER BY l.start_date ASC NULLS LAST;
```

**Tab 3 — Feed**
- Lista cronológica de eventos de amigos (mover aquí desde 9.4)
- Eventos: "🧗 Juan ha completado **Bloque Rojo** en GymX" / "🏅 María ha conseguido **10 bloques**"
- Botón like ❤️ por evento
- Infinite scroll con cursor

**Archivos:** `app/(app)/social/index.tsx`, `app/(app)/social/_layout.tsx`

### 9.4 — Generar eventos de feed automáticamente

En `log-attempt.tsx` y `evaluateAchievements`:
- Tras guardar intento con `result != 'not_completed'` → INSERT en `activity_feed`
- Tras conseguir medalla → INSERT en `activity_feed`

**Archivos:** `app/(app)/blocks/[id]/log-attempt.tsx`, `lib/achievements.ts`

### 9.5 — Perfil público de usuario

Crear `app/(app)/profile/[id].tsx`:
- Vista pública: avatar, stats, medallas conseguidas
- Botón "Añadir amigo" si no son amigos / "Solicitud enviada" si pendiente
- Listado de últimos bloques completados
- Liguillas activas en las que participa (solo las públicas visibles para terceros)

**Archivos:** `app/(app)/profile/[id].tsx`

---

## 📊 Fase 10 — Dashboard B2B (cuenta GYM)

> Dependencia: Fases 3, 4 completadas
> Estimación: 5-6h

### 10.1 — Pantalla principal del dashboard

Crear `app/(app)/gym/dashboard/index.tsx`:
- KPIs: intentos esta semana, usuarios activos, bloques más populares
- Gráfico simple de barras (nativo, sin librería) de intentos por día
- Acceso rápido a secciones

**Archivos:** `app/(app)/gym/dashboard/index.tsx`

### 10.2 — Análisis por bloque

Crear `app/(app)/gym/dashboard/blocks.tsx`:
- Tabla: bloque / nº intentos / % encadenes / media estrellas
- Ordenable por cada columna
- Click en fila → detalle del bloque con comentarios

**Archivos:** `app/(app)/gym/dashboard/blocks.tsx`

### 10.3 — Distribución de dificultad

En el dashboard:
- Gráfico de barras horizontal: nº bloques por dificultad
- Comparativa: dificultad declarada vs % de encadenes real (bloques "más difíciles de lo esperado")

**Archivos:** `app/(app)/gym/dashboard/index.tsx`

### 10.4 — Insights automáticos

Sección "Insights" en el dashboard:
- **Bloques frustrantes**: `% encadenes < 20% AND nº_intentos > 10`
- **Bloques favoritos**: media estrellas > 4
- **Bloques ignorados**: `nº_intentos < 3` en los últimos 14 días

**Archivos:** `app/(app)/gym/dashboard/index.tsx`

### 10.5 — Exportar datos (CSV básico)

Botón "Exportar datos":
- Genera CSV con: bloque, intentos, % encadenes, media estrellas
- Compartir via `expo-sharing`

**Archivos:** `app/(app)/gym/dashboard/blocks.tsx`

---

## 🔔 Fase 11 — Notificaciones push (bonus)

> Dependencia: Fase 9 completada
> Estimación: 3-4h

### 11.1 — Configurar expo-notifications

```bash
npx expo install expo-notifications
```
Añadir permisos en `app.json`:
```json
"plugins": [["expo-notifications", { "icon": "./assets/icon.png" }]]
```

### 11.2 — Guardar push token en profiles

Al iniciar sesión: solicitar permiso → guardar `push_token` en `profiles`.

### 11.3 — Notificar nuevas solicitudes de amistad

Edge Function en Supabase:
- Trigger: INSERT en `friendships` → enviar push al `addressee_id`

### 11.4 — Notificar likes en el feed

Trigger: INSERT en `feed_likes` → push al dueño del evento.

---

## 🗺️ Roadmap visual

```
AHORA
  │
  ▼
┌─────────────────────────────────┐
│  FASE 0 — Reset BD + Schema V2  │  ← PREREQUISITO DE TODO
│  ~2-3h                          │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  FASE 1 — Registro USER / GYM   │  ← Diferencia de cuentas
│  ~3-4h                          │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  FASE 2 — Home diferenciado     │  ← UX por tipo de cuenta
│  ~3-4h                          │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  FASE 3 — Bloques de Gym        │  ← Core del tracking
│  ~4-5h                          │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  FASE 4 — Intentos V2 + Scoring │  ← Nueva lógica de puntos
│  ~3-4h                          │
└─────────────────────────────────┘
  │
  ├──────────────────────┐
  ▼                      ▼
┌──────────────┐   ┌─────────────────────┐
│  FASE 5      │   │  FASE 6             │
│  Rankings    │   │  Achievements       │
│  del Gym     │   │  (Medallas)         │
│  ~3-4h       │   │  ~4-5h              │
└──────────────┘   └─────────────────────┘
                          │
              ┌───────────┴────────────┐
              ▼                        ▼
    ┌─────────────────┐    ┌─────────────────────┐
    │  FASE 7         │    │  FASE 8             │
    │  Ratings y      │    │  Liguillas V2       │
    │  Comentarios    │    │  (reusar bloques)   │
    │  ~3-4h          │    │  ~5-6h              │
    └─────────────────┘    └─────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │  FASE 9             │
    │  Social             │
    │  (amigos + feed)    │
    │  ~5-6h              │
    └─────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │  FASE 10            │
    │  Dashboard B2B      │
    │  ~5-6h              │
    └─────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │  FASE 11 (bonus)    │
    │  Notificaciones     │
    │  push               │
    │  ~3-4h              │
    └─────────────────────┘
              │
              ▼
           🎉 V2
```

---

## ⏱️ Estimación total

| Fase | Descripción | Horas est. |
|------|-------------|-----------|
| 0 | Reset BD + Schema V2 | 2-3h |
| 1 | Registro USER / GYM | 3-4h |
| 2 | Home + Buscador gyms + Favoritos + Liguillas gym + Componentes | 7-8h |
| 3 | Bloques de Gym + Filtros + Límite 100 | 5-6h |
| 4 | Intentos V2 + Scoring | 3-4h |
| 5 | Rankings del Gym | 3-4h |
| 6 | Achievements | 4-5h |
| 7 | Ratings y comentarios | 3-4h |
| 8 | Liguillas V2 + QR en pantalla + PDF por email | 7-9h |
| 9 | Social (amigos + liguillas de amigos + feed) | 6-8h |
| 10 | Dashboard B2B | 5-6h |
| 11 | Notificaciones push (bonus) | 3-4h |
| **TOTAL** | | **~55-69h** |

> A un ritmo de 2-3h por sesión: aproximadamente **25-32 sesiones de trabajo**.

---

## 📋 Notas técnicas importantes

### Sobre el reset de BD
- Ejecutar `DROP SCHEMA public CASCADE` en Supabase SQL Editor **borra todo**
- Hacer un backup manual si hay datos que conservar
- Después ejecutar el schema V2 completo de la sección 0.1

### Sobre los tipos de cuenta
- Un usuario **no puede cambiar** de `user` a `gym` una vez registrado
- Si alguien se equivoca: cambio manual en Supabase dashboard
- En el futuro (V3): panel de administración para gestionar esto

### Sobre los bloques
- Los bloques de GYM son globales y reutilizables
- Los bloques de USER solo existen dentro de su liguilla
- Nunca se borran físicamente, solo `is_active = false`
- Las liguillas pasadas siempre pueden ver sus bloques aunque estén inactivos

### Sobre el QR y PDF de liguilla (Fase 8.6)
- El **QR en pantalla** funciona sin coste adicional, solo con `react-native-qrcode-svg`
- El **PDF generado en el móvil** usa `expo-print` (gratuito), sin servidor
- El **envío por email** usa una Edge Function de Supabase (500.000 invocaciones/mes gratis) + **Resend** (3.000 emails/mes gratis en plan hobby)
- **No se necesita Supabase de pago** para esta funcionalidad
- El QR codifica un deep link: `climbify://join?league=<id>` (+ `&code=<code>` si es privada)
- Para que el deep link funcione en producción hay que configurar `scheme` en `app.json` (ya está configurado como `boulder-league`)

### Sobre los gyms favoritos
- Un USER puede tener **múltiples gyms favoritos** sin límite
- El toggle favorito hace UPSERT / DELETE en `gym_favorites`
- Los favoritos aparecen en el home del USER en scroll horizontal, ordenados por `created_at DESC`
- Si el gym se borra (CASCADE), los favoritos se eliminan automáticamente

### Sobre el límite de 100 bloques por gym
- El límite es sobre **bloques activos** (`is_active = true`), no el total histórico
- El trigger `trg_gym_block_limit` actúa **antes del INSERT**: desactiva el más antiguo si ya hay 100
- La UI debe avisar al gym cuando tiene 90+, 95+ y 99 bloques activos
- Un gym puede **reactivar** un bloque inactivo siempre que tenga hueco (activos < 100)
- Los bloques inactivos siguen siendo visibles en el historial de intentos de los usuarios

### Sobre liguillas y tipos de cuenta
- Un GYM **crea** liguillas pero **no participa** en ellas
- Un USER puede **crear** liguillas privadas propias Y **unirse** a liguillas de GYMs
- El ranking de una liguilla de GYM solo muestra cuentas USER

### Rama de git sugerida
- Empezar nueva rama: `feature/v2-core` para Fases 0-4
- Después: `feature/v2-social` para Fases 5-9
- Después: `feature/v2-b2b` para Fase 10-11

