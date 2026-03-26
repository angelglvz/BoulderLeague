# 🚀 Plan V2 — Climbify: Plataforma de Escalada Indoor

> Stack: React Native + Expo 55 · Supabase · TypeScript · expo-router
> Objetivo: transformar la app de liguillas en una plataforma completa de tracking, social y B2B.
> Base de datos: **reset completo** — el schema V2 es incompatible con el V1 (bloques desacoplados de liguillas).

---

## 🎨 Directrices de diseño visual

> Estas reglas aplican a **todas** las pantallas y componentes. Deben respetarse en cada nueva implementación.

### Estilo general
- **Minimalista ante todo.** Menos es más. Si un elemento no aporta información funcional, se elimina.
- **Sin iconos decorativos con color.** Los iconos se usan en tono neutro (`textMuted` o `textSecondary`). Solo se usa color en iconos de acción primaria (ej: botón principal) o en estados de dato relevante (ej: estrella de favorito en amarillo `#F5C518`).
- **Sin emojis como iconos de UI.** Los emojis están permitidos únicamente en contenido generado por el usuario o en ilustraciones de estado vacío. No se usan como iconos de botones ni de secciones.
- **Textos cortos y directos.** Los labels de botones y secciones deben ser concisos (máx. 2-3 palabras). Evitar frases explicativas dentro de botones.
- **Jerarquía por tipografía, no por color.** Diferenciar niveles de importancia usando `fontWeight` y `fontSize`, no colores distintos.

### Componentes
- **Botones de acción rápida** (quick actions): icono + texto corto, sin color de fondo en los secundarios — usar `colors.surface` con borde `colors.border`.
- **Cards**: fondo `colors.surface`, borde `colors.border` de 1px, `borderRadius: radius.lg`. Sin sombras llamativas.
- **Estados vacíos**: icono outline en `colors.textMuted` (tamaño 40-48), texto en `colors.textSecondary`, subtexto en `colors.textMuted`. Sin emojis grandes.
- **Secciones**: título en `colors.textSecondary`, `fontSize.sm`, `uppercase`, `letterSpacing: 0.5`. Sin iconos de sección.
- **Tabs de navegación interna**: texto plano, tab activo con fondo `colors.primary` y texto `colors.textInverse`. Sin iconos en las tabs.

### Lo que NO hacer
- ❌ Botones con degradados o múltiples colores
- ❌ Iconos de colores distintos al tema (rojo, verde, azul brillante) salvo estados de error/éxito
- ❌ Emojis en headers, labels o botones
- ❌ Más de 3 colores distintos visibles simultáneamente en una pantalla
- ❌ Textos largos o explicativos dentro de botones o tabs

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

## 📍 Estado actual (2026-03-26)

| Fase | Estado |
|------|--------|
| Fase 0 — Reset DB y schema V2 | ✅ Completada |
| Fase 1 — Registro con tipo de cuenta | ✅ Completada |
| Fase 2 — Home diferenciado por tipo | ✅ Completada |
| Fase 3 — Bloques de Gym | ✅ Completada |
| Fase 4 — Mejoras registro, scoring, valoraciones y stats | ✅ Completada |
| Fase 5 — Rankings del Gym | ⏭️ Omitida (implementación actual válida) |
| Fase 6 — Achievements | 🔲 Pendiente |
| Fase 7 — Liguillas V2 | ✅ Completada (7.1–7.7) |

> **Notas de implementación real (vs. plan original):**
> - 1.1: Los botones de tipo se movieron al formulario de registro (tabs), no a welcome
> - 1.2: Registro tiene tabs Escalador/Rocódromo + campo `alias` para usuarios + selector de país y ciudad para gyms
> - 2.1: Home USER tiene buscador de rocódromos integrado con estrella de favorito inline (sin navegar a pantalla separada)
> - 2.5/2.6: El buscador vive directamente en el home del usuario, no en pantalla separada
> - RLS: Las políticas no estaban aplicadas en producción — se corrigió con `fix_all_rls_policies.sql`
> - **Fase 3 completada 2026-03-26** — ver notas detalladas al pie de la sección Fase 3
> - **Fase 4 completada 2026-03-26:**
>   - 4.1: "Sin encadenar" eliminado del selector; botón dinámico "Salir sin registrar" / "Registrar"
>   - 4.2: Scoring V2 aplicado — base points actualizados (2→7, +5→2) y 7 niveles de bonus (0/2/3/4/8/9/10)
>   - 4.3: `components/StarRating.tsx` creado; rating UPSERT en `block_ratings`; comentario guardado en `block_comments` desde log-attempt; lectura del comentario propio en detalle de bloque
>   - 4.4: `app/(app)/stats/index.tsx` con estadísticas globales (dificultad/pegues/estilo); tab "Mis stats" en gym/[id].tsx con stats filtradas por gym; acceso rápido desde home de usuario
> - **Fase 7 en progreso — 2026-03-26:**
>   - 7.1–7.5: implementados según el plan (ver notas al pie de la Fase 7)>   - 7.6: implementado — ver notas al pie de la Fase 7
>   - 7.7: implementado — ver notas al pie de la Fase 7
>   - **Fix extra (no planificado):** ordenación de bloques en liguilla — los bloques más recientes aparecen primero tanto en liguillas de GYM (orden por `league_blocks.created_at DESC`) como en liguillas de USER (orden por `blocks.created_at DESC`)
>   - **Fix extra (no planificado):** pantalla de estadísticas mensuales del GYM y corrección de bug RLS en `attempts` — ver notas al pie de la Fase 7

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

## 🗄️ Fase 0 — Reset de base de datos y nuevo schema V2 ✅ COMPLETADA

> ⚠️ ANTES de empezar: hacer backup de datos de desarrollo si los hay, luego reset completo.
> Estimación: 2-3h

### 0.1 — Nuevo schema SQL completo ✅

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

### 0.2 — Políticas RLS V2 ✅

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

### 0.3 — Storage bucket actualizado ✅

En Supabase Storage:
- Renombrar/recrear bucket `block-photos` con acceso público
- Añadir bucket `avatars` con acceso público

### 0.4 — Actualizar `types/database.types.ts` ✅

Regenerar tipos con:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx supabase gen types typescript --project-id <project-id> > types/database.types.ts
```
O actualizar manualmente los tipos para reflejar las nuevas tablas.

### 0.5 — Actualizar `lib/scoring.ts` ✅

Reescribir con la nueva fórmula V2:
```
score = base_points + difficulty_bonus

base_points:  flash=10, 2 intentos=5, 3=4, 4=3, 5=2, >5=1
bonus:        novato=0, medio=1, avanzado=2, experimentado=3, profesional=4
```

**Archivos:** `lib/scoring.ts`

---

## 👤 Fase 1 — Registro con tipo de cuenta (USER / GYM) ✅ COMPLETADA

> Dependencia: Fase 0 completada
> Estimación: 3-4h

### 1.1 — Pantalla de bienvenida con elección de tipo de cuenta ✅

Modificar `app/(auth)/welcome.tsx`:
- Añadir dos botones grandes: **"Soy escalador 🧗"** y **"Soy un rocódromo 🏢"**
- Guardar la elección en estado local antes de navegar a registro

**Archivos:** `app/(auth)/welcome.tsx`

### 1.2 — Formulario de registro adaptado al tipo de cuenta ✅

Modificar `app/(auth)/register.tsx`:
- Si `account_type = 'user'`: formulario actual (nombre, email, contraseña)
- Si `account_type = 'gym'`: formulario extendido (nombre del rocódromo, ubicación, email, contraseña)
- Al crear el usuario en Supabase Auth, insertar en `profiles` con el `account_type` correcto

**Archivos:** `app/(auth)/register.tsx`

### 1.3 — Trigger Supabase: crear perfil automáticamente al registrarse ✅

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

### 1.4 — Hook `useProfile` con tipo de cuenta ✅

Crear `hooks/useProfile.ts`:
- Devuelve el perfil completo del usuario autenticado
- Expone `isGym` y `isUser` como booleanos de conveniencia
- Cachea el resultado en memoria

**Archivos:** `hooks/useProfile.ts`, `hooks/index.ts`

### 1.5 — Proteger rutas según tipo de cuenta ✅

Modificar `app/(app)/_layout.tsx`:
- Leer `account_type` del perfil
- Las rutas de "crear bloque de gym" solo accesibles si `isGym`
- Las rutas de "liguillas personales" solo accesibles si `isUser`

**Archivos:** `app/(app)/_layout.tsx`

---

## 🏢 Fase 2 — Home diferenciado por tipo de cuenta ✅ COMPLETADA

> Dependencia: Fase 1 completada
> Estimación: 5-6h

### 2.1 — Home para USER ✅

Modificar `app/(app)/index.tsx` (vista de usuario):
- **Sección 1 — Mis gyms favoritos**: scroll horizontal de `GymCard` con acceso directo
  - Si no tiene favoritos: botón **"Buscar un rocódromo"**
  - ⚠️ **Solo visible para cuentas USER** — los GYMs no ven esta sección
- **Sección 2 — Liguillas activas**: liguillas en curso en las que participa el usuario
  - Badge de estado: 🟢 En curso / 🏁 Finalizada
  - Liguillas finalizadas: solo las de los **últimos 7 días** (`end_date >= NOW() - INTERVAL '7 days'`)
  - Indicador de visibilidad: 🔓 Pública / 🔒 Privada
  - Al pulsar → detalle de la liguilla
- **Sección 3 — Descubrir**: acceso a gyms favoritos y explorar rocódromos
  - ⚠️ **Solo visible para cuentas USER** — los GYMs no ven esta sección
- Contador de bloques completados esta semana

> 🔒 **Regla de negocio confirmada:** Las cuentas GYM no pueden:
> - Ver ni usar la sección "Mis rocódromos favoritos"
> - Buscar otros rocódromos (`/gyms`)
> - Añadir gyms a favoritos (`gym_favorites`)
> 
> Estas funcionalidades son exclusivas de cuentas USER.

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

### 2.2 — Home para GYM ✅

Crear `app/(app)/gym/index.tsx`:
- Resumen: nº de bloques activos (con indicador visual del límite: X/100), intentos esta semana
- Acceso rápido: **"Añadir bloque"**, **"Ver ranking"**, **"Crear liguilla"**
- Lista de bloques activos del gym con indicadores de popularidad

**Archivos:** `app/(app)/gym/index.tsx`, `app/(app)/gym/_layout.tsx`

### 2.3 — Pantalla de perfil de gym (pública) ✅

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

### 2.4 — Componente `GymCard` ✅

Crear `components/GymCard.tsx`:
- Nombre del gym, ubicación
- Nº de bloques activos (X/100)
- Indicador visual si es favorito (estrella)
- Reutilizable en listado de gyms, búsqueda y sección de favoritos del home

**Archivos:** `components/GymCard.tsx`, `components/index.ts`

### 2.5 — Buscador de rocódromos ✅

> ⚠️ **Solo accesible para cuentas USER**

Crear `app/(app)/gyms/search.tsx`:
- Input de búsqueda por nombre o ubicación (búsqueda en tiempo real con debounce 300ms)
- Resultados como lista de `GymCard`
- Estado vacío con ilustración: "No se han encontrado rocódromos"
- Al pulsar en un gym → navega al perfil público `gym/[id]`
- Accesible desde el home de USER y desde la barra de navegación

**Archivos:** `app/(app)/gyms/search.tsx`, `app/(app)/gyms/_layout.tsx`

### 2.6 — Listado de todos los rocódromos ✅

> ⚠️ **Solo accesible para cuentas USER**

Crear `app/(app)/gyms/index.tsx`:
- Listado completo de gyms registrados en la plataforma
- Ordenados por: más cercanos (si hay permiso de ubicación) o alfabético
- Buscador integrado en la parte superior
- Cada card muestra si ya es favorito del usuario

**Archivos:** `app/(app)/gyms/index.tsx`

### 2.7 — Componente `LeagueCardPublic` con badge de visibilidad ✅

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

### 2.8 — Modal "Unirse con código" reutilizable ✅

Crear `components/JoinLeagueModal.tsx`:
- Input de código de acceso (uppercase automático, mín. 4 chars)
- Botón "Unirse" → verifica código contra `leagues.access_code` y hace INSERT en `league_participants`
- Mensajes de error: código incorrecto / liga llena / ya eres participante
- Reutilizable desde: perfil de gym, sección de amigos, pantalla de unirse

**Archivos:** `components/JoinLeagueModal.tsx`, `components/index.ts`

---

## 🧱 Fase 3 — Bloques de Gym (tracking continuo) ✅ COMPLETADA

> Completada: 2026-03-26
> Dependencia: Fase 2 completada

### 3.1 — Crear bloque (cuenta GYM) ✅

**Implementación real:**
- En móvil abre la cámara directamente; en web abre el selector de archivo
- Si ya hay foto: en móvil aparece Alert "Cámara / Galería"; en web va directo a galería
- Campos: identificador, dificultad (7 niveles con punto de color), estilo (multiselección), sección (opcional)
- **7 niveles de dificultad con color identificativo** (sin emojis):
  - Principiante ● Gris · Novato ● Verde · Medio ● Azul · Avanzado ● Amarillo
  - Experimentado ● Naranja · Élite ● Rojo · Profesional ● Morado
- **Campo "Estilo" multiselección** (chips): Vertical, Placa, Desplome, Regletas, Romos, Talones, Empeines, Dinámicos
  - Se almacena en columna `color` de la BD como lista separada por comas (sin migración adicional)
- **Campo "Sección"** (renombrado desde "Sector" del plan original) — campo `sector` en BD
- Se eliminó el campo "Color" del plan original
- Advertencia si quedan ≤1 slot antes del límite de 100
- **Migración BD requerida:** `ALTER TYPE block_difficulty ADD VALUE IF NOT EXISTS 'principiante'; ALTER TYPE block_difficulty ADD VALUE IF NOT EXISTS 'elite';`
- Al guardar → recarga automática en el home del gym (useFocusEffect)

**Archivos:** `app/(app)/gym/blocks/add.tsx`

### 3.2 — Listado de bloques del gym (vista owner GYM) ✅

**Implementación real:**
- Tabs Activos / Inactivos (en lugar de chips de estado)
- **Filtros via modal bottom-sheet** (icono `options-outline` en header con badge numérico):
  - Dificultad: 7 niveles con punto de color, multiselección
  - Estilo: 8 opciones multiselección
  - Sección: dinámica según los bloques del gym (solo aparece si hay bloques con sección)
- Filtrado en cliente (sin nueva petición a Supabase)
- Botón desactivar (eye-off) / reactivar (refresh) por bloque con Alert de confirmación
- Contador `X/100 activos` con barra de progreso
- Botón `+` en header (deshabilitado si ≥100 activos)

**Archivos:** `app/(app)/gym/blocks/index.tsx`

### 3.3 — Listado de bloques del gym (vista USER / pública) ✅

**Implementación real:**
- Los bloques se muestran **directamente en el tab "Info" del perfil del gym** (no en pantalla separada)
- Mismo sistema de filtros modal que la vista owner, más filtro adicional **"Estado"**:
  - Todos / Sin encadenar (no registrado) / Encadenados (≥1 pegue) / Intentados (registrado sin encadenar)
- Cada `BlockCard` muestra el resultado propio si existe
- La pantalla `app/(app)/gyms/[id]/blocks.tsx` existe pero el flujo principal es desde `gym/[id].tsx`

**Archivos:** `app/(app)/gym/[id].tsx`, `app/(app)/gyms/[id]/blocks.tsx`

### 3.4 — Detalle de bloque (vista pública) ✅

**Implementación real:**
- Foto a ancho completo
- Badges de dificultad, estilo y sección
- Resultado propio del usuario: solo texto en grande sin label ni puntos (ej: "Flash", "2 pegues")
- Si no hay resultado: no se muestra ningún placeholder
- **Botón "Resolver"** fijado al fondo de la pantalla (fuera del ScrollView, `position: absolute`)
  - Solo visible para cuentas USER
  - Deshabilitado si: ya registrado, liguilla inactiva, o no es usuario
- **Regla de negocio implementada:**
  - Bloques de gym (sin `league_id`): resolvibles desde el momento de creación
  - Bloques de liguilla (`league_id != null`): solo cuando la liguilla está `in_progress`
- Botón "Editar" solo para el owner del bloque
- `useFocusEffect` para recargar el intento al volver de log-attempt

**Archivos:** `app/(app)/blocks/[id]/index.tsx`

### 3.5 — Editar bloque (owner) ✅

**Implementación real:**
- Campos editables: foto, dificultad, estilo (campo `color`), sección (campo `sector`)
- Verifica que el usuario es el owner antes de cargar
- Solo disponible si `is_active = true`

**Archivos:** `app/(app)/blocks/[id]/edit.tsx`

### 3.6 — Desactivar bloque (soft delete) con límite de 100 ✅

**Implementación real:**
- Soft delete con Alert de confirmación
- Trigger `trg_gym_block_limit` en BD desactiva automáticamente el más antiguo al llegar a 101
- Botón de reactivar disponible si activos < 100

**Archivos:** `app/(app)/gym/blocks/index.tsx`, `app/(app)/gym/blocks/add.tsx`

### 3.7 — Registro de intentos (bloques de gym) ✅

> Implementado en esta fase como extensión de 3.4

**Implementación real en `log-attempt.tsx`:**
- Inicializa `leagueStatus = null`; si el bloque no tiene `league_id` se setea `'in_progress'` directamente sin consultar BD
- Selector visual de número de pegues: 0 (Sin encadenar) / 1 (Flash) / 2 / 3 / 4 / 5 / +5
- Campo `result` enviado al INSERT (`flash | completed | not_completed`) — obligatorio en el schema V2
- `router.replace` hacia el detalle del bloque al guardar (no `router.back`) para evitar "GO_BACK not handled"
- Todos los botones "Volver" usan `router.replace(`/(app)/blocks/${id}`)` por el mismo motivo
- Añadidos a `lib/scoring.ts`: tipo `Goes`, `GOES_LABELS`, `goesFromDB`

**Archivos:** `app/(app)/blocks/[id]/log-attempt.tsx`, `lib/scoring.ts`

### 3.8 — Favoritos de gym (persistencia y UX) ✅

> Implementado en esta fase como corrección de comportamiento

**Implementación real:**
- Los favoritos se persisten en `gym_favorites` (tabla BD, ya existente en schema V2)
- `toggleFavorite` usa `upsert` con `onConflict: 'user_id,gym_id'` (no `insert`) para evitar 409
- En el perfil del gym: estrella en el header superior derecho (`star` / `star-outline`)
  - Solo visible para cuentas USER
  - `useFocusEffect` independiente para cargar `isFavorite` siempre actualizado
  - Actualización optimista del estado local con reversión si falla
  - **Eliminado:** botón grande "Añadir a favoritos / En favoritos" del tab Info
- En el home del usuario: `GymCard` muestra estrella rellena para favoritos, vacía en resultados de búsqueda

**Archivos:** `app/(app)/gym/[id].tsx`, `app/(app)/index.tsx`, `components/GymCard.tsx`

### Correcciones de navegación y layout ✅

- `_layout.tsx`: guardia de rutas cambiada de `includes('(app)/gym')` a `=== '(app)/gym'` para que usuarios puedan acceder a `/(app)/gym/[id]` (perfil público del gym)
- Home del escalador: `useEffect` → `useFocusEffect` para recargar favoritos y liguillas al volver de cualquier pantalla
- Home del gym: `useEffect` → `useFocusEffect` para recargar bloques al volver de añadir bloque

---


## 🏋️ Fase 4 — Mejoras de registro, puntuación, valoraciones y estadísticas

> Dependencia: Fase 3 completada
> Estado: 🔲 Pendiente

---

### 4.1 — Pantalla de registro de intentos (mejoras UX)

**Cambios sobre la implementación actual de `log-attempt.tsx`:**

- **Eliminar la opción "Sin encadenar" (0 pegues)** del selector. Solo mostrar: Flash / 2 / 3 / 4 / 5 / +5
- **Botón inferior dinámico:**
  - Estado inicial (ninguna opción seleccionada): texto **"Salir sin registrar"** → hace `router.replace` de vuelta al bloque sin guardar nada
  - Cuando el usuario selecciona una opción: texto cambia a **"Registrar"** → guarda el intento y navega de vuelta
- El resto de la pantalla no se modifica

**Archivos:** `app/(app)/blocks/[id]/log-attempt.tsx`, `lib/scoring.ts`

---

### 4.2 — Scoring V2 con bonus de dificultad actualizado

**Actualizar `lib/scoring.ts` con los 7 niveles:**

```typescript
// Puntos base (sin cambios)
flash       → 10 pts
2 pegues    → 7 pts
3 pegues    → 5 pts
4 pegues    → 4 pts
5 pegues    → 3 pts
+5 pegues   → 2 pts

// Bonus por dificultad (7 niveles, actualizado)
principiante → +0
novato       → +2
medio        → +3
avanzado     → +4
experimentado→ +8
elite        → +9  (nuevo nivel)
profesional  → +10
```

**Archivos:** `lib/scoring.ts`

---

### 4.3 — Rating y comentario en detalle de bloque

**Añadir en `app/(app)/blocks/[id]/index.tsx`**, encima del botón "Resolver":

#### Rating (1-5 estrellas)
- Crear `components/StarRating.tsx`:
  - 5 estrellas interactivas (`TouchableOpacity`)
  - Modo lectura (media del bloque) y modo escritura (valoración propia)
  - Versión compacta inline
- En el detalle del bloque:
  - Si el usuario aún no ha valorado: mostrar 5 estrellas vacías interactivas
  - Si ya valoró: mostrar su valoración con opción de cambiarla
  - UPSERT en `block_ratings` al tocar
  - Mostrar la media del bloque en modo lectura junto a la valoración propia

#### Comentario (texto libre)
- Caja de texto (`TextInput`) con placeholder `"Deja un comentario (opcional)"`, máx. 300 caracteres
- Contador de caracteres visible
- El comentario se guarda junto con el intento al pulsar "Registrar" (INSERT en `block_comments`)
- Si el bloque ya tiene intento registrado: mostrar el comentario propio en modo lectura (no editable)

**Archivos:** `app/(app)/blocks/[id]/index.tsx`, `components/StarRating.tsx`

---

### 4.4 — Pantalla de estadísticas del usuario

**Crear `app/(app)/stats/index.tsx`** accesible desde el home del usuario (acceso rápido):

#### Estadísticas globales (todos los rocódromos)
- **Por dificultad:** gráfico de barras horizontales — nº de bloques resueltos por nivel (Principiante → Profesional)
- **Por pegues:** distribución — cuántos Flash / 2 pegues / 3 pegues / etc.
- **Por estilo:** barras — cuántos bloques de cada estilo (Vertical, Placa, Desplome, etc.)
- Número total de bloques resueltos, flashes y puntuación acumulada en cabecera

#### Estadísticas por rocódromo
**En `app/(app)/gym/[id].tsx`**, añadir una cuarta tab **"Mis stats"** (solo visible para usuarios):
- Los mismos 3 grupos de gráficos pero filtrados por bloques de ese gym
- Comparativa opcional: "Tu posición en este gym: #N"

#### Diseño
- Barras simples con `View` y `width: porcentaje%` (sin librerías externas de charts)
- Minimalista: número + barra + label, sin colores excesivos — usar `colors.primary` para las barras
- El valor más alto ocupa el 100% de ancho, el resto escalan proporcionalmente

**Archivos:** `app/(app)/stats/index.tsx`, `app/(app)/stats/_layout.tsx`, `app/(app)/gym/[id].tsx`

---

### Notas de implementación

- **BD:** Las tablas `block_ratings` y `block_comments` ya existen en el schema V2. No requieren migración.
- **Scoring:** Actualizar solo `calcDifficultyBonus` en `lib/scoring.ts`. Los intentos ya guardados mantienen su puntuación original (no retroactivo).
- **Stats:** Calcular en cliente con los datos de `attempts` ya cargados, sin vistas adicionales en BD para el MVP.

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

## 🎖️ Fase 6 — Achievements, Ranking Global y Muro de Logros

> Dependencia: Fase 4 completada
> Estimación: 7-9h

### Principios de diseño del sistema

1. **Solo bloques de rocódromos registrados** — Los achievements **NO** se otorgan por bloques de liguillas privadas de usuario (`owner_type = 'user'`). Solo cuentan bloques con `owner_type = 'gym'`.
2. **Progresión infinita** — Siempre existe una medalla siguiente. Los umbrales crecen según un algoritmo exponencial: nunca se llega al límite.
3. **Puntuación por medalla** — Cada medalla concede puntos que se acumulan en un marcador global del usuario.
4. **Ranking independiente de gyms** — El ranking global es entre usuarios de toda la app, sin relación con ningún rocódromo concreto.
5. **Muro público de logros** — Una tab dedicada en la navegación principal muestra en tiempo real los logros conseguidos por los usuarios.

---

### 6.1 — Algoritmo de umbrales y puntos (progresión infinita)

#### Funciones de umbral por categoría

**Volumen y Flash** — `T_vf(n)`, n ≥ 1:
```
T_vf(1) = 5
T_vf(2) = 15
T_vf(3) = 30
T_vf(4) = 50
T_vf(5) = 100
T_vf(n≥6) = 100 × 2^(n−5)    → 200, 400, 800, 1600 …
```

**Dificultad** — `T_d(n)`, n ≥ 1:
```
T_d(1) = 3
T_d(2) = 10
T_d(3) = 25
T_d(4) = 50
T_d(n≥5) = 50 × 2^(n−4)      → 100, 200, 400 …
```

**Explorador** — `T_e(n)`, n ≥ 1:
```
T_e(1) = 2
T_e(2) = 5
T_e(3) = 10
T_e(4) = 20
T_e(n≥5) = 20 × 2^(n−4)      → 40, 80, 160 …
```

**Constancia** — umbrales fijos (máximo 5 tiers, se pueden ganar cada mes):
```
Tier 1 → 3 días activos/mes
Tier 2 → 7 días activos/mes
Tier 3 → 14 días activos/mes
Tier 4 → 20 días activos/mes
Tier 5 → 28 días activos/mes
```

#### Puntos base por tier — `P(n)`:
```
P(1) = 10      (Bronce)
P(2) = 25      (Plata)
P(3) = 50      (Oro)
P(4) = 100     (Platino)
P(5) = 200     (Diamante)
P(n≥6) = 200 × 2^(n−5)       → 400, 800, 1600 …
```

Cada categoría aplica un **multiplicador sobre `P(n)`**:

| Categoría | Multiplicador |
|-----------|--------------|
| `volume` | × 1.0 |
| `difficulty_principiante` | × 1.0 |
| `difficulty_novato` | × 1.2 |
| `difficulty_medio` | × 1.5 |
| `difficulty_avanzado` | × 1.8 |
| `difficulty_experimentado` | × 2.2 |
| `difficulty_elite` | × 2.6 |
| `difficulty_profesional` | × 3.0 |
| `flash` | × 1.5 |
| `consistency` | × 1.0 (puntos fijos, ver tabla) |
| `explorer` | × 1.5 |

#### Nombres y colores de tier

| Tier | Nombre | Color UI |
|------|--------|----------|
| 1 | Bronce | `#CD7F32` |
| 2 | Plata | `#C0C0C0` |
| 3 | Oro | `#FFD700` |
| 4 | Platino | `#E5E4E2` |
| 5 | Diamante | `#B9F2FF` |
| 6 | Leyenda I | `#FF6B35` |
| 7+ | Leyenda II, III … | `#FF6B35` |

---

### 6.2 — Catálogo de categorías y labels

#### Categoría 1 — Volumen (`volume`)
> Total de bloques de gym encadenados (histórico acumulado).

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 5 | 10 | Primeros pasos |
| 2 | 15 | 25 | En racha |
| 3 | 30 | 50 | Escalador regular |
| 4 | 50 | 100 | Dedicado |
| 5 | 100 | 200 | Centenario |
| 6 | 200 | 400 | Incansable |
| n≥7 | `100×2^(n−5)` | `200×2^(n−5)` | Leyenda del bloque {n−5} |

#### Categoría 2 — Dificultad Principiante (`difficulty_principiante`)
> Bloques de nivel principiante completados en gym.

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 10 | Comenzando |
| 2 | 10 | 25 | Base sólida |
| 3 | 25 | 50 | Confort en el inicio |
| 4 | 50 | 100 | Maestro principiante |
| n≥5 | `50×2^(n−4)` | `100×2^(n−4)` | Principiante Lv.{n−4} |

#### Categoría 3 — Dificultad Novato (`difficulty_novato`)
> Bloques de nivel novato completados en gym.

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 12 | Un paso más |
| 2 | 10 | 30 | Tomando ritmo |
| 3 | 25 | 60 | Fluido en novato |
| 4 | 50 | 120 | Maestro novato |
| n≥5 | `50×2^(n−4)` | `120×2^(n−4)` | Novato Lv.{n−4} |

#### Categoría 4 — Dificultad Medio (`difficulty_medio`)
> Bloques de nivel medio completados en gym.

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 15 | A medio gas |
| 2 | 10 | 38 | Constante |
| 3 | 25 | 75 | Medio maestro |
| 4 | 50 | 150 | Sólido |
| n≥5 | `50×2^(n−4)` | `150×2^(n−4)` | Medio Lv.{n−4} |

#### Categoría 5 — Dificultad Avanzado (`difficulty_avanzado`)
> Bloques de nivel avanzado completados en gym.

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 18 | Subiendo el nivel |
| 2 | 10 | 45 | Perseverante |
| 3 | 25 | 90 | Élite avanzado |
| 4 | 50 | 180 | Obsesionado |
| n≥5 | `50×2^(n−4)` | `180×2^(n−4)` | Avanzado Lv.{n−4} |

#### Categoría 6 — Dificultad Experimentado (`difficulty_experimentado`)
> Bloques de nivel experimentado completados en gym.

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 22 | Curtido |
| 2 | 10 | 55 | Con experiencia |
| 3 | 25 | 110 | Veterano |
| 4 | 50 | 220 | Señor de la roca |
| n≥5 | `50×2^(n−4)` | `220×2^(n−4)` | Experimentado Lv.{n−4} |

#### Categoría 7 — Dificultad Élite (`difficulty_elite`)
> Bloques de nivel élite completados en gym.

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 26 | Mentalidad élite |
| 2 | 10 | 65 | De otro nivel |
| 3 | 25 | 130 | Inalcanzable |
| 4 | 50 | 260 | Élite supremo |
| n≥5 | `50×2^(n−4)` | `260×2^(n−4)` | Élite Lv.{n−4} |

#### Categoría 8 — Dificultad Profesional (`difficulty_profesional`)
> Bloques de nivel profesional completados en gym.

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 30 | Toca el cielo |
| 2 | 10 | 75 | Pro en serio |
| 3 | 25 | 150 | Leyenda pro |
| 4 | 50 | 300 | Más allá del límite |
| n≥5 | `50×2^(n−4)` | `300×2^(n−4)` | Pro Lv.{n−4} |

#### Categoría 9 — Flash (`flash`)
> Bloques de gym completados al primer intento.

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 1 | 15 | Primer flash |
| 2 | 5 | 38 | Flash en racha |
| 3 | 15 | 75 | Ojo de halcón |
| 4 | 30 | 150 | Lector de bloques |
| 5 | 50 | 300 | Señal de flash |
| n≥6 | `50×2^(n−5)` | `300×2^(n−5)` | Flash maestro {n−5} |

#### Categoría 10 — Constancia (`consistency`)
> Días en el mes actual con al menos 1 bloque de gym completado.
> Se puede ganar de nuevo cada mes que se cumpla el umbral.

| Tier | Días/mes | Puntos | Label |
|------|----------|--------|-------|
| 1 | 3 | 20 | Asistencia regular |
| 2 | 7 | 50 | Escalador semanal |
| 3 | 14 | 100 | Quincenal |
| 4 | 20 | 200 | Escalador constante |
| 5 | 28 | 400 | Un mes sin parar |

#### Categoría 11 — Explorador (`explorer`)
> Número de gyms distintos donde el usuario ha completado al menos 1 bloque.

| Tier | Gyms | Puntos | Label |
|------|------|--------|-------|
| 1 | 2 | 15 | Explorador novato |
| 2 | 5 | 38 | Rodante |
| 3 | 10 | 75 | Trotamundos |
| 4 | 20 | 150 | Sin fronteras |
| n≥5 | `20×2^(n−4)` | `150×2^(n−4)` | Explorador mundial {n−4} |

---

### 6.3 — Implementación del algoritmo en código

Crear `lib/achievements.ts`:

```typescript
// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
export type AchievementCategory =
  | 'volume'
  | 'difficulty_principiante'
  | 'difficulty_novato'
  | 'difficulty_medio'
  | 'difficulty_avanzado'
  | 'difficulty_experimentado'
  | 'difficulty_elite'
  | 'difficulty_profesional'
  | 'flash'
  | 'consistency'
  | 'explorer';

export interface MedalDefinition {
  key: string;           // "volume_tier_3"
  category: AchievementCategory;
  tier: number;
  threshold: number;
  points: number;
  label: string;
  tierName: string;      // "Bronce", "Oro"…
  tierColor: string;     // hex
}

export interface UserGymStats {
  gymBlocksCompleted: number;
  gymBlocksByDifficulty: {
    principiante: number;
    novato: number;
    medio: number;
    avanzado: number;
    experimentado: number;
    elite: number;
    profesional: number;
  };
  gymFlashes: number;
  activeDaysThisMonth: number;
  distinctGymsWithCompletion: number;
}

// ─────────────────────────────────────────────
// FUNCIONES DE UMBRAL
// ─────────────────────────────────────────────

export function volumeThreshold(n: number): number {
  if (n === 1) return 5;
  if (n === 2) return 15;
  if (n === 3) return 30;
  if (n === 4) return 50;
  if (n === 5) return 100;
  return Math.round(100 * Math.pow(2, n - 5));
}

export function difficultyThreshold(n: number): number {
  if (n === 1) return 3;
  if (n === 2) return 10;
  if (n === 3) return 25;
  if (n === 4) return 50;
  return Math.round(50 * Math.pow(2, n - 4));
}

export function flashThreshold(n: number): number {
  const fixed = [1, 5, 15, 30, 50];
  if (n <= fixed.length) return fixed[n - 1];
  return Math.round(50 * Math.pow(2, n - fixed.length));
}

export function explorerThreshold(n: number): number {
  if (n === 1) return 2;
  if (n === 2) return 5;
  if (n === 3) return 10;
  if (n === 4) return 20;
  return Math.round(20 * Math.pow(2, n - 4));
}

export function baseTierPoints(n: number): number {
  if (n === 1) return 10;
  if (n === 2) return 25;
  if (n === 3) return 50;
  if (n === 4) return 100;
  if (n === 5) return 200;
  return Math.round(200 * Math.pow(2, n - 5));
}

export function tierMeta(n: number): { name: string; color: string } {
  const tiers = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante'];
  if (n <= tiers.length) return { name: tiers[n - 1], color: ['#CD7F32','#C0C0C0','#FFD700','#E5E4E2','#B9F2FF'][n - 1] };
  return { name: `Leyenda ${n - tiers.length}`, color: '#FF6B35' };
}

// ─────────────────────────────────────────────
// GENERADOR INFINITO DE DEFINICIONES
// Llama con maxTier=30 para cubrir décadas de uso.
// ─────────────────────────────────────────────

export function generateMedalDefinitions(maxTier = 30): MedalDefinition[] {
  const medals: MedalDefinition[] = [];

  // Volumen
  for (let n = 1; n <= maxTier; n++) {
    const { name, color } = tierMeta(n);
    medals.push({ key: `volume_tier_${n}`, category: 'volume', tier: n,
      threshold: volumeThreshold(n), points: baseTierPoints(n),
      label: volumeLabel(n), tierName: name, tierColor: color });
  }

  // Dificultades
  const diffMult: Record<string, number> = {
    difficulty_principiante: 1.0,
    difficulty_novato:       1.2,
    difficulty_medio:        1.5,
    difficulty_avanzado:     1.8,
    difficulty_experimentado: 2.2,
    difficulty_elite:        2.6,
    difficulty_profesional:  3.0,
  };
  for (const [cat, mult] of Object.entries(diffMult)) {
    for (let n = 1; n <= maxTier; n++) {
      const { name, color } = tierMeta(n);
      medals.push({ key: `${cat}_tier_${n}`, category: cat as AchievementCategory, tier: n,
        threshold: difficultyThreshold(n), points: Math.round(baseTierPoints(n) * mult),
        label: difficultyLabel(cat as AchievementCategory, n), tierName: name, tierColor: color });
    }
  }

  // Flash
  for (let n = 1; n <= maxTier; n++) {
    const { name, color } = tierMeta(n);
    medals.push({ key: `flash_tier_${n}`, category: 'flash', tier: n,
      threshold: flashThreshold(n), points: Math.round(baseTierPoints(n) * 1.5),
      label: flashLabel(n), tierName: name, tierColor: color });
  }

  // Constancia — solo 5 tiers fijos
  const consDays = [3, 7, 14, 20, 28];
  const consPts  = [20, 50, 100, 200, 400];
  const consLbls = ['Asistencia regular','Escalador semanal','Quincenal','Escalador constante','Un mes sin parar'];
  for (let n = 1; n <= 5; n++) {
    const { name, color } = tierMeta(n);
    medals.push({ key: `consistency_tier_${n}`, category: 'consistency', tier: n,
      threshold: consDays[n - 1], points: consPts[n - 1],
      label: consLbls[n - 1], tierName: name, tierColor: color });
  }

  // Explorador
  for (let n = 1; n <= maxTier; n++) {
    const { name, color } = tierMeta(n);
    medals.push({ key: `explorer_tier_${n}`, category: 'explorer', tier: n,
      threshold: explorerThreshold(n), points: Math.round(baseTierPoints(n) * 1.5),
      label: explorerLabel(n), tierName: name, tierColor: color });
  }

  return medals;
}

// ─────────────────────────────────────────────
// LABELS
// ─────────────────────────────────────────────
function volumeLabel(n: number): string {
  const f = ['Primeros pasos','En racha','Escalador regular','Dedicado','Centenario','Incansable'];
  return n <= f.length ? f[n-1] : `Leyenda del bloque ${n - f.length}`;
}
function difficultyLabel(cat: AchievementCategory, n: number): string {
  const m: Partial<Record<AchievementCategory, string[]>> = {
    difficulty_principiante:  ['Comenzando','Base sólida','Confort en el inicio','Maestro principiante'],
    difficulty_novato:        ['Un paso más','Tomando ritmo','Fluido en novato','Maestro novato'],
    difficulty_medio:         ['A medio gas','Constante','Medio maestro','Sólido'],
    difficulty_avanzado:      ['Subiendo el nivel','Perseverante','Élite avanzado','Obsesionado'],
    difficulty_experimentado: ['Curtido','Con experiencia','Veterano','Señor de la roca'],
    difficulty_elite:         ['Mentalidad élite','De otro nivel','Inalcanzable','Élite supremo'],
    difficulty_profesional:   ['Toca el cielo','Pro en serio','Leyenda pro','Más allá del límite'],
  };
  const arr = m[cat] ?? [];
  const suffix = cat.replace('difficulty_', '');
  return n <= arr.length ? arr[n-1] : `${suffix.charAt(0).toUpperCase() + suffix.slice(1)} Lv.${n - arr.length}`;
}
function flashLabel(n: number): string {
  const f = ['Primer flash','Flash en racha','Ojo de halcón','Lector de bloques','Señal de flash'];
  return n <= f.length ? f[n-1] : `Flash maestro ${n - f.length}`;
}
function explorerLabel(n: number): string {
  const f = ['Explorador novato','Rodante','Trotamundos','Sin fronteras'];
  return n <= f.length ? f[n-1] : `Explorador mundial ${n - f.length}`;
}

// ─────────────────────────────────────────────
// EVALUACIÓN
// ─────────────────────────────────────────────

/**
 * Compara las stats actuales del usuario con las medallas ya obtenidas
 * y devuelve las medallas nuevas que acaba de conseguir.
 */
export function evaluateNewAchievements(
  stats: UserGymStats,
  earned: Set<string>,
): MedalDefinition[] {
  const allMedals = generateMedalDefinitions(30);
  const newMedals: MedalDefinition[] = [];

  for (const medal of allMedals) {
    if (earned.has(medal.key)) continue;
    let stat = 0;
    switch (medal.category) {
      case 'volume':                   stat = stats.gymBlocksCompleted; break;
      case 'difficulty_principiante':  stat = stats.gymBlocksByDifficulty.principiante; break;
      case 'difficulty_novato':        stat = stats.gymBlocksByDifficulty.novato; break;
      case 'difficulty_medio':         stat = stats.gymBlocksByDifficulty.medio; break;
      case 'difficulty_avanzado':      stat = stats.gymBlocksByDifficulty.avanzado; break;
      case 'difficulty_experimentado': stat = stats.gymBlocksByDifficulty.experimentado; break;
      case 'difficulty_elite':         stat = stats.gymBlocksByDifficulty.elite; break;
      case 'difficulty_profesional':   stat = stats.gymBlocksByDifficulty.profesional; break;
      case 'flash':                    stat = stats.gymFlashes; break;
      case 'consistency':              stat = stats.activeDaysThisMonth; break;
      case 'explorer':                 stat = stats.distinctGymsWithCompletion; break;
    }
    if (stat >= medal.threshold) newMedals.push(medal);
  }
  return newMedals;
}

/**
 * Función principal a llamar desde log-attempt.tsx tras guardar un intento.
 * Devuelve las MedalDefinition nuevas para mostrar el toast.
 */
export async function evaluateAchievements(userId: string): Promise<MedalDefinition[]> {
  const supabase = createClientComponentClient();

  const { data: stats } = await supabase
    .rpc('get_user_gym_stats', { p_user_id: userId });

  const { data: earnedRows } = await supabase
    .from('achievements')
    .select('medal_key')
    .eq('user_id', userId);
  const earned = new Set(earnedRows?.map((r: { medal_key: string }) => r.medal_key) ?? []);

  const newMedals = evaluateNewAchievements(stats as UserGymStats, earned);
  if (newMedals.length === 0) return [];

  // Bulk insert
  await supabase.from('achievements').insert(
    newMedals.map(m => ({
      user_id: userId, medal_key: m.key,
      category: m.category, tier: m.tier, points: m.points,
    }))
  );

  // Insertar en feed de actividad
  await supabase.from('activity_feed').insert(
    newMedals.map(m => ({
      user_id: userId,
      event_type: 'achievement',
      payload: {
        medal_key: m.key, label: m.label,
        tier: m.tier, tier_name: m.tierName,
        tier_color: m.tierColor, points: m.points,
      },
    }))
  );

  return newMedals;
}
```

**Archivos:** `lib/achievements.ts`

---

### 6.4 — Schema de base de datos

```sql
-- ─────────────────────────────────────────────
-- Tabla de achievements obtenidos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medal_key   text        NOT NULL,   -- "volume_tier_3"
  category    text        NOT NULL,   -- "volume", "flash"…
  tier        int         NOT NULL,
  points      int         NOT NULL,
  earned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, medal_key)          -- medallas permanentes no se duplican
);

CREATE INDEX IF NOT EXISTS idx_achievements_user    ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_earned  ON achievements(earned_at DESC);

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
    FROM achievements WHERE user_id = NEW.user_id
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_achievement_points
  AFTER INSERT ON achievements
  FOR EACH ROW EXECUTE FUNCTION sync_achievement_points();

-- ─────────────────────────────────────────────
-- Función de stats (solo bloques de gym)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_gym_stats(p_user_id uuid)
RETURNS json AS $$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'gymBlocksCompleted', (
      SELECT COUNT(DISTINCT a.block_id) FROM attempts a
      JOIN blocks b ON b.id = a.block_id
      WHERE a.user_id = p_user_id AND b.owner_type = 'gym'
        AND a.result != 'not_completed'
    ),
    'gymBlocksByDifficulty', json_build_object(
      'principiante', (
        SELECT COUNT(DISTINCT a.block_id) FROM attempts a JOIN blocks b ON b.id=a.block_id
        WHERE a.user_id=p_user_id AND b.owner_type='gym' AND b.difficulty='principiante' AND a.result!='not_completed'
      ),
      'novato', (
        SELECT COUNT(DISTINCT a.block_id) FROM attempts a JOIN blocks b ON b.id=a.block_id
        WHERE a.user_id=p_user_id AND b.owner_type='gym' AND b.difficulty='novato' AND a.result!='not_completed'
      ),
      'medio', (
        SELECT COUNT(DISTINCT a.block_id) FROM attempts a JOIN blocks b ON b.id=a.block_id
        WHERE a.user_id=p_user_id AND b.owner_type='gym' AND b.difficulty='medio' AND a.result!='not_completed'
      ),
      'avanzado', (
        SELECT COUNT(DISTINCT a.block_id) FROM attempts a JOIN blocks b ON b.id=a.block_id
        WHERE a.user_id=p_user_id AND b.owner_type='gym' AND b.difficulty='avanzado' AND a.result!='not_completed'
      ),
      'experimentado', (
        SELECT COUNT(DISTINCT a.block_id) FROM attempts a JOIN blocks b ON b.id=a.block_id
        WHERE a.user_id=p_user_id AND b.owner_type='gym' AND b.difficulty='experimentado' AND a.result!='not_completed'
      ),
      'elite', (
        SELECT COUNT(DISTINCT a.block_id) FROM attempts a JOIN blocks b ON b.id=a.block_id
        WHERE a.user_id=p_user_id AND b.owner_type='gym' AND b.difficulty='elite' AND a.result!='not_completed'
      ),
      'profesional', (
        SELECT COUNT(DISTINCT a.block_id) FROM attempts a JOIN blocks b ON b.id=a.block_id
        WHERE a.user_id=p_user_id AND b.owner_type='gym' AND b.difficulty='profesional' AND a.result!='not_completed'
      )
    ),
    'gymFlashes', (
      SELECT COUNT(DISTINCT a.block_id) FROM attempts a JOIN blocks b ON b.id=a.block_id
      WHERE a.user_id=p_user_id AND b.owner_type='gym' AND a.result='flash'
    ),
    'activeDaysThisMonth', (
      SELECT COUNT(DISTINCT DATE(a.created_at AT TIME ZONE 'UTC'))
      FROM attempts a JOIN blocks b ON b.id=a.block_id
      WHERE a.user_id=p_user_id AND b.owner_type='gym'
        AND a.result!='not_completed'
        AND date_trunc('month', a.created_at) = date_trunc('month', NOW())
    ),
    'distinctGymsWithCompletion', (
      SELECT COUNT(DISTINCT b.gym_id) FROM attempts a JOIN blocks b ON b.id=a.block_id
      WHERE a.user_id=p_user_id AND b.owner_type='gym' AND a.result!='not_completed'
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- Ranking global (consulta SQL directa)
-- ─────────────────────────────────────────────
-- Query para el ranking completo:
-- SELECT p.id, p.name, p.avatar_url, p.achievement_points,
--   RANK() OVER (ORDER BY p.achievement_points DESC) AS global_rank,
--   (SELECT a.medal_key FROM achievements a WHERE a.user_id=p.id
--    ORDER BY a.earned_at DESC LIMIT 1) AS last_medal_key
-- FROM profiles p
-- WHERE p.account_type = 'user'
-- ORDER BY p.achievement_points DESC;

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
-- Todos pueden ver los achievements (ranking público)
CREATE POLICY "achievements_select_all" ON achievements
  FOR SELECT USING (true);
-- Solo el propio usuario puede insertar
CREATE POLICY "achievements_insert_own" ON achievements
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

**Archivos:** `supabase/migrations/20260326_achievements.sql`

---

### 6.5 — Evaluación automática post-intento

En `app/(app)/blocks/[id]/log-attempt.tsx`, tras INSERT/UPDATE exitoso en `attempts`:
1. Llamar `const newMedals = await evaluateAchievements(userId)`
2. Si `newMedals.length > 0` → pasar al estado local para mostrar `AchievementToast`
3. El toast se encola si hay varias medallas nuevas de golpe

```typescript
// Ejemplo en log-attempt.tsx
const handleSave = async () => {
  // ... INSERT attempt ...
  const newMedals = await evaluateAchievements(session.user.id);
  if (newMedals.length > 0) setNewAchievements(newMedals);
};
```

**Archivos:** `lib/achievements.ts`, `app/(app)/blocks/[id]/log-attempt.tsx`

---

### 6.6 — Toast de medalla conseguida

Crear `components/AchievementToast.tsx`:
- Aparece desde arriba con animación `slide-in` + ligero bounce
- Fondo oscuro semitransparente con **borde del color del tier** (`tierColor`)
- Contenido: icono de medalla (tamaño 32, color tier) + `tierName` en badge + label de la medalla + `+{points} pts` en verde
- Auto-cierre a los 4 segundos o tap para cerrar anticipado
- Si hay varias medallas: se muestran en cola, una tras otra con 500ms de separación
- Vibración suave (`expo-haptics`) al aparecer

```tsx
// components/AchievementToast.tsx — props
interface AchievementToastProps {
  medals: MedalDefinition[];   // cola de medallas nuevas
  onDismiss: () => void;
}
```

**Archivos:** `components/AchievementToast.tsx`

---

### 6.7 — Tab "Logros" en la navegación principal del usuario

#### Añadir tab al layout principal

Modificar `app/(app)/_layout.tsx` — añadir tab **"Logros"** entre "Bloques" y "Perfil":
```
Tabs del usuario:  Inicio  |  Bloques  |  🏆 Logros  |  Perfil
```
- El icono de la tab usa `trophy` (outline/filled según activo)
- Badge numérico sobre el icono si el usuario tiene medallas nuevas sin ver (campo `last_seen_achievements` en profiles)

#### Crear `app/(app)/achievements/index.tsx` con 3 tabs internas

**Tab 1 — Mis Logros**
- **Banner superior:** puntos totales del usuario en tipografía grande, llamativa (`fontSize: 48`, `fontWeight: 900`), subtexto "pts acumulados"
- **Últimas 5 medallas:** scroll horizontal de cards con color de tier, label, fecha obtenida y puntos
- **Grid de todas las medallas (por categoría):**
  - Obtenidas: icono con color de tier + label + puntos
  - No obtenidas: icono en `colors.textMuted` + umbral + barra de progreso `currentValue / threshold`
  - Agrupadas por categoría con header de sección
  - Para cada categoría solo se muestran: las ya obtenidas + la **siguiente pendiente** (para no abrumar)
  - Botón "Ver todas de esta categoría" para expandir

**Tab 2 — Ranking Global**
- Listado de todos los usuarios ordenado por `achievement_points DESC`
- **Podio visual** en el top 3: posición en grande, avatar, nombre, puntos
- **Tu posición** destacada con fondo `colors.primary` si no está visible en el scroll
- Cada fila: `#rank` · avatar · nombre · puntos · última medalla (icon pequeño con color tier)
- Filtros: **Top 10** / **Top 100** / **Alrededor de mí** (±10 posiciones)
- Paginado de 20 en 20 con infinite scroll
- **Solo cuenta `account_type = 'user'`**, los gyms no aparecen

```sql
-- Posición del usuario actual
SELECT global_rank FROM (
  SELECT id, RANK() OVER (ORDER BY achievement_points DESC) AS global_rank
  FROM profiles WHERE account_type = 'user'
) ranked
WHERE id = auth.uid();
```

**Tab 3 — Muro de Actividad (feed público de logros)**
- Feed cronológico en tiempo real de logros conseguidos por **cualquier usuario de la app**
- Suscripción Supabase Realtime a `activity_feed WHERE event_type = 'achievement'`
- Cada entrada:
  - Avatar del usuario (link a su perfil público)
  - Texto llamativo: `"[Nombre] ha conseguido [label]"` en `fontSize.md bold`
  - Badge del tier con color (`tierName` sobre fondo `tierColor` suavizado)
  - `+{points} pts` en verde
  - Tiempo relativo (hace 2m, hace 1h…)
- Visual destacado para medallas de tier ≥ 4 (Platino, Diamante, Leyenda): fondo con shimmer / borde brillante
- Infinite scroll con cursor — los nuevos aparecen al inicio con animación de entrada
- Botón "Volver arriba" flotante cuando hay nuevos eventos sin ver

**Archivos:** `app/(app)/achievements/index.tsx`, `app/(app)/achievements/_layout.tsx`, `app/(app)/_layout.tsx`

---

### 6.8 — Icono de usuario con puntos en el header del home

En `app/(app)/index.tsx`:
- Junto al icono de engranaje (ajustes) se añade un botón con **icono de persona** (`person-outline`)
- Debajo del icono, en texto muy pequeño, los **puntos totales de achievements** del usuario
- El botón está deshabilitado por ahora (`disabled`) — en el futuro gestionará el perfil del usuario
- Los puntos se cargan en `fetchFavorites` consultando `profiles.achievement_points`

> **Nota:** Se omite la creación de `app/(app)/profile/index.tsx` — la pantalla de perfil completa se implementará en una fase posterior.

**Archivos:** `app/(app)/index.tsx`

---

### 6.9 — Resumen de archivos nuevos y modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `lib/achievements.ts` | **NUEVO** | Algoritmo completo: umbrales, puntos, generador, evaluador |
| `supabase/migrations/20260326_achievements.sql` | **NUEVO** | Tablas, trigger, función SQL de stats y RLS |
| `components/AchievementToast.tsx` | **NUEVO** | Toast animado con cola de medallas |
| `app/(app)/achievements/_layout.tsx` | **NUEVO** | Layout de la sección Logros |
| `app/(app)/achievements/index.tsx` | **NUEVO** | Pantalla Logros: Mis Logros + Ranking Global + Muro |
| `app/(app)/_layout.tsx` | **MODIFICA** | Añadir tab "Logros" a la navegación principal del usuario |
| `app/(app)/blocks/[id]/log-attempt.tsx` | **MODIFICA** | Llamar `evaluateAchievements` tras guardar intento |
| `app/(app)/index.tsx` | **MODIFICA** | Icono de usuario + puntos en el header (6.8 simplificado) |

---

## 🔗 Fase 7 — Liguillas V2

> Dependencia: Fases 0, 3 completadas
> Estado: 🔄 En progreso — **7.1 al 7.6 completados** · 7.7 pendiente

---

> ### 📋 Notas de implementación Fase 7 (2026-03-26)
>
> **7.1 ✅** — `leagues/create.tsx` refactorizado. Funciona para ambos tipos de cuenta.
>
> **7.2 ✅** — `leagues/[id].tsx` diferencia correctamente vista GYM (gestión de bloques antes de iniciar, modo lectura después) y vista USER.
>
> **7.2.1 ✅** — Sección "Mis liguillas" en `gym/index.tsx` con `LeagueCard` y botón "Nueva".
>
> **7.3 ✅** — `leagues/[id]/select-blocks.tsx` creado: buscador por texto + filtros de dificultad/estilo/sección + botón Añadir/Añadido.
>
> **7.4 ✅** — `gym/blocks/add.tsx` acepta parámetro `leagueId` opcional; al guardar inserta en `league_blocks`. Banner informativo visible cuando `leagueId` está presente.
>
> **7.5 ✅** — Flujo USER sin cambios respecto a V1. Trigger `trg_deactivate_user_league_blocks` pendiente de aplicar en Supabase (SQL en `docs/PLAN_V2.md § 7.5`).
>
> **7.6 ✅** — Implementado 2026-03-26:
> - `leagues/join.tsx`: cuentas GYM ven pantalla bloqueada "Los rocódromos no pueden participar en liguillas"
> - `components/LeagueCardPublic.tsx`: nueva prop `isGymAccount`; si `true`, no se renderizan botones de unirse
> - `gym/[id].tsx`: pasa `isGymAccount={isGym}` a todos los `LeagueCardPublic`
> - `leagues/[id]/ranking.tsx`: en `buildRanking` se detecta si es liguilla de GYM consultando el perfil del creador; si lo es, se filtra el creador de la lista de participantes con `.neq('user_id', creator_id)`
>
> **Fix extra ✅ — Ordenación de bloques en liguilla:**
> - Liguillas GYM: `league_blocks` se ordena por `created_at DESC` y se preserva ese orden al hidratar los bloques (el último bloque vinculado aparece primero)
> - Liguillas USER: query con `order('created_at', { ascending: false })` (el bloque creado más recientemente aparece primero)
> - Archivo: `leagues/[id].tsx`
>
> **Fix extra ✅ — Bug RLS `attempts` + pantalla de estadísticas del GYM:**
> - **Bug detectado:** la política `attempts_select_own` (`USING (user_id = auth.uid())`) impedía que el GYM leyera cualquier intento ajeno, haciendo que el contador semanal siempre mostrase 0
> - **Migración:** `supabase/migrations/fix_gym_stats_rls.sql` — añade dos nuevas políticas:
>   - `blocks_select_gym_own`: el GYM puede leer todos sus bloques (activos e inactivos) → necesario para datos históricos
>   - `attempts_select_gym_owner`: el GYM puede leer intentos en sus bloques
> - **`gym/index.tsx`:** stat card "Intentos esta semana" → **"Usuarios activos esta semana"** (usuarios únicos con ≥1 bloque resuelto desde el lunes); helper `getLastMonday()`; nuevo botón de acceso rápido "Estadísticas"
> - **`gym/stats.tsx`** (nueva pantalla `/(app)/gym/stats`):
>   - Selector de mes ← Mes Año → (últimos 12 meses, no permite navegar al futuro)
>   - 3 KPIs: Usuarios activos · Bloques resueltos · Intentos totales — cada uno con delta `+X%` / `-X%` vs mes anterior
>   - Gráfico de evolución de los últimos 6 meses (barras interactivas: toca una para ver ese mes)
>   - Desglose por dificultad (barras horizontales proporcionales con punto de color)
>   - Toda la agregación es **client-side** con una sola carga de 12 meses de datos — sin queries adicionales al navegar entre meses
>   - ⚠️ **Requiere ejecutar `fix_gym_stats_rls.sql` en Supabase** antes de que los datos sean visibles

> **7.7 ✅ — QR de liguilla + compartir (2026-03-26):**
> - Dependencias instaladas: `react-native-svg` + `react-native-qrcode-svg`
> - `components/LeagueQRModal.tsx` (nuevo): modal de pantalla completa con QR, nombre de liguilla, código de acceso (si privada), botón "Compartir" (usa `Share` API nativa en móvil o `navigator.share` / portapapeles en web) y botón "Copiar enlace"
> - Deep link codificado: `climbify://join?league=<id>` (pública) / `climbify://join?league=<id>&code=<code>` (privada)
> - `leagues/[id].tsx` actualizado: sección de compartir rediseñada con 3 elementos:
>   1. Código de acceso con "Toca para copiar" (solo si `access_code` existe)
>   2. Botón "Mostrar QR" → abre `LeagueQRModal`
>   3. Botón "Compartir enlace" → `Share.share` (móvil) / Clipboard (web)
> - El botón "Enviarme el PDF" (Edge Function + Resend) queda como mejora futura
> - ⚠️ Exportado en `components/index.ts`

---

#### Liguilla de GYM
- El rocódromo **crea** la liguilla y **gestiona** sus bloques — nunca participa
- Los bloques de una liguilla de gym son **bloques del catálogo general del gym** (`owner_type='gym'`, `gym_id=auth.uid()`)
- Los bloques se pueden crear desde **dos puntos de entrada**:
  1. **Home del gym** (flujo normal) → bloque inmediatamente disponible para resolver
  2. **Desde la liguilla** → el bloque se inserta en el catálogo general (`blocks`) **pero no se puede resolver** hasta que la liguilla comience (`start_date` alcanzado)
- La liguilla referencia bloques mediante `league_blocks` (nunca copia)
- Antes de iniciar la liguilla, el gym puede **buscar bloques de su catálogo** para añadirlos, y también **crear bloques nuevos** directamente desde la liguilla
- También puede **quitar bloques** de la liguilla (se desvincula de `league_blocks`, el bloque sigue en el catálogo)
- Una vez iniciada: no se pueden añadir ni quitar bloques

#### Liguilla de USER
- El usuario **crea bloques nuevos** exclusivos para la liguilla (flujo V1 sin cambios)
- Los bloques son `owner_type='user'`, `user_id=auth.uid()`, vinculados a la liga vía `league_blocks`
- Al **finalizar la liguilla**: todos sus bloques se marcan `is_active = false` automáticamente — no se pueden reutilizar
- El usuario **sí participa** en su propia liguilla (como en V1)

---

### ✅ 7.1 — Creación de liguilla (ambos tipos)

Refactor `app/(app)/leagues/create.tsx`:
- Formulario común: nombre, premio, privada/pública, código (si privada), fechas, máx. participantes
- Validaciones: código obligatorio si `is_private`, mínimo 4 chars
- Al crear con éxito → navegar al detalle de la liguilla `/(app)/leagues/[id]`
- No hay selector de bloques en la creación — los bloques se gestionan desde el detalle

**Archivos:** `app/(app)/leagues/create.tsx`

---

### ✅ 7.2 — Detalle de liguilla (vista creador GYM)

Refactor `app/(app)/leagues/[id].tsx` para el flujo GYM:

#### Sección de bloques (solo antes de iniciar)
- Lista los bloques vinculados (`league_blocks JOIN blocks`)
- Dos acciones disponibles:
  - **"Buscar bloque del catálogo"** → abre buscador inline (ver 7.3)
  - **"Crear nuevo bloque"** → navega a `/(app)/gym/blocks/add` con parámetro `league_id` para que al guardar se vincule automáticamente a la liguilla
- Cada bloque listado tiene botón **"Quitar"** (elimina la fila de `league_blocks`, el bloque permanece en catálogo)

#### Una vez iniciada
- Los bloques aparecen en modo lectura
- Se muestra el ranking parcial si `ranking_visible_during = true`

**Archivos:** `app/(app)/leagues/[id].tsx`

---

### ✅ 7.2.1 — Liguillas del gym visibles desde el home

En `app/(app)/gym/index.tsx`, nueva sección **"Mis liguillas"** entre los accesos rápidos y los bloques activos:
- Carga todas las liguillas donde `creator_id = user.id` (todos los estados: sin iniciar, activa, finalizada)
- Usa el componente `LeagueCard` existente (ya muestra estado, fechas y cuenta atrás)
- Botón **"Nueva"** en el header de la sección (acceso rápido a `leagues/create`)
- Estado vacío si aún no hay liguillas creadas
- Se refresca con `useFocusEffect` junto con el resto de datos del home

**Archivos:** `app/(app)/gym/index.tsx`

---

### ✅ 7.3 — Buscador de bloques del catálogo (GYM)

Crear `app/(app)/leagues/[id]/select-blocks.tsx` o implementar como modal/bottom-sheet dentro del detalle:

- **Buscador por texto** (identifier del bloque, case-insensitive)
- **Filtros aplicables** (mismos que en la home del gym):
  - Dificultad (multiselección con punto de color)
  - Estilo (multiselección)
  - Sección
- Lista los bloques activos del gym que **no están ya vinculados** a esta liguilla
- Cada resultado tiene botón **"Añadir"** → INSERT en `league_blocks`
- El botón cambia a **"Añadido ✓"** (deshabilitado) al vincularlo

**Archivos:** `app/(app)/leagues/[id]/select-blocks.tsx`

---

### ✅ 7.4 — Crear bloque desde una liguilla (GYM)

Adaptar `app/(app)/gym/blocks/add.tsx` para aceptar un parámetro `leagueId` opcional:

```
/(app)/gym/blocks/add?leagueId=<uuid>
```

- Si `leagueId` está presente: tras insertar el bloque en `blocks`, insertar también en `league_blocks`
- El bloque queda en el catálogo general con `is_active = true`, pero **no se puede resolver** hasta que la liguilla comience (la lógica de `log-attempt` ya lo gestiona con `leagueStatus`)
- Banner informativo en el formulario: _"Este bloque se añadirá a tu catálogo y a la liguilla. Solo podrá resolverse una vez iniciada la liguilla."_

**Archivos:** `app/(app)/gym/blocks/add.tsx`

---

### ✅ 7.5 — Detalle de liguilla (vista creador USER)

Flujo sin cambios respecto a V1 salvo:
- Bloques creados con `owner_type='user'`
- Al finalizar la liguilla: trigger o función que marca todos los bloques de esa liga como `is_active = false`

#### Trigger de desactivación automática al finalizar

```sql
-- Función que desactiva bloques de usuario al finalizar su liguilla
CREATE OR REPLACE FUNCTION deactivate_user_league_blocks()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si la liguilla pasa a tener end_date en el pasado
  IF NEW.end_date IS NOT NULL AND NEW.end_date <= NOW() THEN
    UPDATE blocks SET is_active = false, updated_at = NOW()
    WHERE id IN (
      SELECT lb.block_id FROM league_blocks lb
      JOIN blocks b ON b.id = lb.block_id
      WHERE lb.league_id = NEW.id
        AND b.owner_type = 'user'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_deactivate_user_league_blocks
  AFTER UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION deactivate_user_league_blocks();
```

**Archivos:** `app/(app)/leagues/[id].tsx`, `app/(app)/leagues/[id]/add-block.tsx`, migración SQL

---

### ✅ 7.6 — Proteger participación en liguillas

- Solo cuentas `USER` pueden unirse como participantes
- Si es GYM: mostrar mensaje "Los rocódromos no pueden participar en liguillas"
- El creador GYM no aparece en el ranking de su propia liguilla

**Archivos:** `app/(app)/leagues/join.tsx`, `app/(app)/leagues/[id].tsx`

---

### ✅ 7.7 — QR de liguilla + compartir

En el detalle de liguilla:
- Botón **"Mostrar QR"** → modal con QR a pantalla completa
- El QR codifica deep link: `climbify://join?league=<id>` (+ `&code=<code>` si privada)
- Botón **"Compartir enlace"** → `expo-sharing` con el texto del deep link
- Botón **"Enviarme el PDF"** (opcional, Edge Function + Resend):
  - Genera PDF con logo + nombre + QR + instrucciones
  - Envía por email al owner

```bash
npx expo install react-native-qrcode-svg react-native-svg
```

**Archivos:** `components/LeagueQRModal.tsx`, `lib/generateLeaguePDF.ts`, `supabase/functions/send-league-qr/index.ts`, `app/(app)/leagues/[id].tsx`

---

### Resumen de flujos

```
GYM — Crear liguilla
  └── Detalle de liguilla (antes de iniciar)
        ├── "Buscar bloque del catálogo" → buscador con filtros → Añadir/Quitar
        └── "Crear nuevo bloque" → add.tsx con leagueId → se vincula al guardar

GYM — Bloque creado desde home
  └── Disponible para resolver inmediatamente
  └── Se puede añadir a una liguilla vía buscador

GYM — Bloque creado desde liguilla
  └── Entra al catálogo general (is_active=true)
  └── No se puede resolver hasta que la liguilla comience (leagueStatus != in_progress)

USER — Crear liguilla
  └── Añade bloques nuevos exclusivos (como V1)
  └── Al finalizar la liguilla → bloques → is_active=false (trigger automático)
```

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
│  del Gym     │   │  Ranking Global     │
│  ~3-4h       │   │  + Muro de Logros   │
│              │   │  ~7-9h              │
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
| 6 | Achievements + Ranking Global + Muro de Logros | 7-9h |
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

