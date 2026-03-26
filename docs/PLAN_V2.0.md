# 🚀 Plan V2.0 — Climbify: Próxima Iteración

> Continuación de `PLAN_V2.md` — Fases pendientes de implementación.
> Stack: React Native + Expo 55 · Supabase · TypeScript · expo-router
> **Estado de partida:** Fases 0, 1, 2, 3, 4 y 7 completadas.

---

## 📍 Estado al inicio de esta iteración

| Fase | Estado |
|------|--------|
| Fase 0 — Reset DB y schema V2 | ✅ Completada |
| Fase 1 — Registro con tipo de cuenta | ✅ Completada |
| Fase 2 — Home diferenciado por tipo | ✅ Completada |
| Fase 3 — Bloques de Gym | ✅ Completada |
| Fase 4 — Mejoras registro, scoring, valoraciones y stats | ✅ Completada |
| Fase 5 — Rankings del Gym | ⏭️ Omitida en V2 (implementación actual válida, mejoras aquí) |
| Fase 6 — Achievements + Ranking Global + Muro | 🔲 Pendiente |
| Fase 7 — Liguillas V2 | ✅ Completada (7.1–7.7) |
| Fase 9 — Capa social (amigos + feed) | 🔲 Pendiente |
| Fase 10 — Dashboard B2B | 🔲 Pendiente |
| Fase 11 — Notificaciones push | 🔲 Pendiente (bonus) |

---

## 🏆 Fase 5 — Rankings del Gym

> Dependencia: Fase 4 completada (ya está)
> Estimación: 3-4h
> Nota: La implementación actual en `gym/[id].tsx` (tab Ranking) es funcional. Esta fase añade pantallas dedicadas y mayor granularidad.

### 5.1 — Ranking global del gym

Crear `app/(app)/gym/[id]/ranking.tsx`:
- Usa la view `gym_rankings`
- Top 10 con avatar, nombre, puntuación total y nº de bloques
- Diseño reutilizando componentes del ranking de liguillas

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

> Dependencia: Fase 4 completada (ya está)
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

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 10 | Comenzando |
| 2 | 10 | 25 | Base sólida |
| 3 | 25 | 50 | Confort en el inicio |
| 4 | 50 | 100 | Maestro principiante |
| n≥5 | `50×2^(n−4)` | `100×2^(n−4)` | Principiante Lv.{n−4} |

#### Categoría 3 — Dificultad Novato (`difficulty_novato`)

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 12 | Un paso más |
| 2 | 10 | 30 | Tomando ritmo |
| 3 | 25 | 60 | Fluido en novato |
| 4 | 50 | 120 | Maestro novato |
| n≥5 | `50×2^(n−4)` | `120×2^(n−4)` | Novato Lv.{n−4} |

#### Categoría 4 — Dificultad Medio (`difficulty_medio`)

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 15 | A medio gas |
| 2 | 10 | 38 | Constante |
| 3 | 25 | 75 | Medio maestro |
| 4 | 50 | 150 | Sólido |
| n≥5 | `50×2^(n−4)` | `150×2^(n−4)` | Medio Lv.{n−4} |

#### Categoría 5 — Dificultad Avanzado (`difficulty_avanzado`)

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 18 | Subiendo el nivel |
| 2 | 10 | 45 | Perseverante |
| 3 | 25 | 90 | Élite avanzado |
| 4 | 50 | 180 | Obsesionado |
| n≥5 | `50×2^(n−4)` | `180×2^(n−4)` | Avanzado Lv.{n−4} |

#### Categoría 6 — Dificultad Experimentado (`difficulty_experimentado`)

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 22 | Curtido |
| 2 | 10 | 55 | Con experiencia |
| 3 | 25 | 110 | Veterano |
| 4 | 50 | 220 | Señor de la roca |
| n≥5 | `50×2^(n−4)` | `220×2^(n−4)` | Experimentado Lv.{n−4} |

#### Categoría 7 — Dificultad Élite (`difficulty_elite`)

| Tier | Umbral | Puntos | Label |
|------|--------|--------|-------|
| 1 | 3 | 26 | Mentalidad élite |
| 2 | 10 | 65 | De otro nivel |
| 3 | 25 | 130 | Inalcanzable |
| 4 | 50 | 260 | Élite supremo |
| n≥5 | `50×2^(n−4)` | `260×2^(n−4)` | Élite Lv.{n−4} |

#### Categoría 8 — Dificultad Profesional (`difficulty_profesional`)

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
  if (n <= tiers.length)
    return { name: tiers[n - 1], color: ['#CD7F32','#C0C0C0','#FFD700','#E5E4E2','#B9F2FF'][n - 1] };
  return { name: `Leyenda ${n - tiers.length}`, color: '#FF6B35' };
}

export function generateMedalDefinitions(maxTier = 30): MedalDefinition[] {
  const medals: MedalDefinition[] = [];
  // ... (ver código completo en PLAN_V2.md § 6.3)
  return medals;
}

/**
 * Función principal a llamar desde log-attempt.tsx tras guardar un intento.
 * Devuelve las MedalDefinition nuevas para mostrar el toast.
 */
export async function evaluateAchievements(userId: string): Promise<MedalDefinition[]> {
  // ... (ver implementación completa en PLAN_V2.md § 6.3)
}
```

**Archivos:** `lib/achievements.ts`

> 📎 Ver implementación completa del algoritmo en `PLAN_V2.md § 6.3`

---

### 6.4 — Schema de base de datos

```sql
-- Tabla de achievements obtenidos
CREATE TABLE IF NOT EXISTS achievements (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medal_key   text        NOT NULL,
  category    text        NOT NULL,
  tier        int         NOT NULL,
  points      int         NOT NULL,
  earned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, medal_key)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user   ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_earned ON achievements(earned_at DESC);

-- Puntos totales desnormalizados en profiles (para ORDER BY rápido en ranking global)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS achievement_points int NOT NULL DEFAULT 0;

-- Trigger para mantener achievement_points actualizado
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

-- Función de stats (solo bloques de gym)
CREATE OR REPLACE FUNCTION get_user_gym_stats(p_user_id uuid)
RETURNS json AS $$
-- ... (ver código completo en PLAN_V2.md § 6.4)
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select_all" ON achievements FOR SELECT USING (true);
CREATE POLICY "achievements_insert_own" ON achievements FOR INSERT WITH CHECK (user_id = auth.uid());
```

**Archivos:** `supabase/migrations/20260326_achievements.sql`

> ⚠️ La migración `20260326_achievements.sql` ya existe en el repo con el SQL completo.

---

### 6.5 — Evaluación automática post-intento

En `app/(app)/blocks/[id]/log-attempt.tsx`, tras INSERT/UPDATE exitoso en `attempts`:
1. Llamar `const newMedals = await evaluateAchievements(session.user.id)`
2. Si `newMedals.length > 0` → pasar al estado local para mostrar `AchievementToast`
3. El toast se encola si hay varias medallas nuevas de golpe

```typescript
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
- Badge numérico sobre el icono si el usuario tiene medallas nuevas sin ver

#### Crear `app/(app)/achievements/index.tsx` con 3 tabs internas

**Tab 1 — Mis Logros**
- **Banner superior:** puntos totales del usuario en tipografía grande (`fontSize: 48`, `fontWeight: 900`), subtexto "pts acumulados"
- **Últimas 5 medallas:** scroll horizontal de cards con color de tier, label, fecha y puntos
- **Grid de todas las medallas (por categoría):**
  - Obtenidas: icono con color de tier + label + puntos
  - No obtenidas: icono en `colors.textMuted` + umbral + barra de progreso `currentValue / threshold`
  - Agrupadas por categoría con header de sección
  - Para cada categoría: las ya obtenidas + la **siguiente pendiente** (para no abrumar)
  - Botón "Ver todas de esta categoría" para expandir

**Tab 2 — Ranking Global**
- Listado de todos los usuarios ordenado por `achievement_points DESC`
- **Podio visual** en el top 3: posición en grande, avatar, nombre, puntos
- **Tu posición** destacada con fondo `colors.primary` si no está visible en el scroll
- Cada fila: `#rank` · avatar · nombre · puntos · última medalla (icon pequeño con color tier)
- Filtros: **Top 10** / **Top 100** / **Alrededor de mí** (±10 posiciones)
- Paginado de 20 en 20 con infinite scroll
- **Solo `account_type = 'user'`**, los gyms no aparecen

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
  - Texto: `"[Nombre] ha conseguido [label]"` en `fontSize.md bold`
  - Badge del tier con color
  - `+{points} pts` en verde
  - Tiempo relativo (hace 2m, hace 1h…)
- Tier ≥ 4 (Platino, Diamante, Leyenda): fondo con shimmer / borde brillante
- Infinite scroll con cursor + botón "Volver arriba" flotante cuando hay nuevos eventos

**Archivos:** `app/(app)/achievements/index.tsx`, `app/(app)/achievements/_layout.tsx`, `app/(app)/_layout.tsx`

---

### 6.8 — Icono de usuario con puntos en el header del home

En `app/(app)/index.tsx`:
- Botón con icono de persona (`person-outline`) en el header
- Debajo del icono, en texto muy pequeño, los **puntos totales de achievements** del usuario
- Los puntos se cargan consultando `profiles.achievement_points`

**Archivos:** `app/(app)/index.tsx`

---

### 6.9 — Resumen de archivos para Fase 6

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `lib/achievements.ts` | **NUEVO** | Algoritmo completo: umbrales, puntos, generador, evaluador |
| `supabase/migrations/20260326_achievements.sql` | *(ya existe)* | Tablas, trigger, función SQL de stats y RLS |
| `components/AchievementToast.tsx` | **NUEVO** | Toast animado con cola de medallas |
| `app/(app)/achievements/_layout.tsx` | **NUEVO** | Layout de la sección Logros |
| `app/(app)/achievements/index.tsx` | **NUEVO** | Pantalla Logros: Mis Logros + Ranking Global + Muro |
| `app/(app)/_layout.tsx` | **MODIFICA** | Añadir tab "Logros" a la navegación principal del usuario |
| `app/(app)/blocks/[id]/log-attempt.tsx` | **MODIFICA** | Llamar `evaluateAchievements` tras guardar intento |
| `app/(app)/index.tsx` | **MODIFICA** | Icono de usuario + puntos en el header (6.8) |

---

## 👥 Fase 9 — Capa Social (amigos + feed)

> Dependencia: Fase 6 completada (achievements)
> Estimación: 6-8h

### 9.1 — Búsqueda de usuarios

Crear `app/(app)/social/search.tsx`:
- Input de búsqueda por **nombre o email** (debounce 300ms)
- Resultados: avatar, nombre, nº bloques completados
- Botón "Añadir amigo" → INSERT en `friendships` con `status='pending'`
- Si ya son amigos: badge **"Ya sois amigos ✓"**
- Si solicitud enviada: badge **"Solicitud enviada ⏳"**
- Si solicitud recibida: botones **"Aceptar"** / **"Rechazar"**

```sql
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
- Liguillas **públicas** y **activas** de todos mis amigos
- Cada card usa `LeagueCardPublic` con nombre, creador, badges y acción
- Ordenadas por `start_date ASC`

```sql
-- Liguillas públicas activas de amigos
SELECT DISTINCT l.*, p.name AS creator_name, p.avatar_url AS creator_avatar
FROM leagues l
JOIN profiles p ON p.id = l.creator_id
JOIN league_participants lp ON lp.league_id = l.id
WHERE lp.user_id IN (
  SELECT CASE WHEN requester_id = auth.uid() THEN addressee_id ELSE requester_id END
  FROM friendships
  WHERE status = 'accepted'
    AND (requester_id = auth.uid() OR addressee_id = auth.uid())
)
AND (l.end_date IS NULL OR l.end_date > NOW())
ORDER BY l.start_date ASC NULLS LAST;
```

**Tab 3 — Feed**
- Lista cronológica de eventos de amigos
- Eventos: intentos completados + achievements
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
- Botón "Añadir amigo" / "Solicitud enviada"
- Listado de últimos bloques completados
- Liguillas activas en las que participa (solo las públicas)

**Archivos:** `app/(app)/profile/[id].tsx`

---

## 📊 Fase 10 — Dashboard B2B (cuenta GYM)

> Dependencia: Fases 3, 4 completadas (ya están)
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
- Comparativa: dificultad declarada vs % de encadenes real

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

## 🔔 Fase 11 — Notificaciones Push (bonus)

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

## 🗺️ Roadmap de esta iteración

```
PUNTO DE PARTIDA
(Fases 0–4 y 7 completadas)
  │
  ├──────────────────────┐
  ▼                      ▼
┌──────────────┐   ┌─────────────────────┐
│  FASE 5      │   │  FASE 6             │
│  Rankings    │   │  Achievements       │
│  del Gym     │   │  Ranking Global     │
│  ~3-4h       │   │  + Muro de Logros   │
│  (bajo prio) │   │  ~7-9h              │
└──────────────┘   └─────────────────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │  FASE 9             │
                │  Social             │
                │  (amigos + feed)    │
                │  ~6-8h              │
                └─────────────────────┘
                          │
              ┌───────────┴────────────┐
              ▼                        ▼
    ┌─────────────────┐    ┌─────────────────────┐
    │  FASE 10        │    │  FASE 11 (bonus)    │
    │  Dashboard B2B  │    │  Notificaciones     │
    │  ~5-6h          │    │  push · ~3-4h       │
    └─────────────────┘    └─────────────────────┘
              │
              ▼
           🎉 V2.0
```

---

## ⏱️ Estimación total

| Fase | Descripción | Horas est. |
|------|-------------|-----------|
| 5 | Rankings del Gym (mejoras) | 3-4h |
| 6 | Achievements + Ranking Global + Muro de Logros | 7-9h |
| 9 | Social (amigos + liguillas de amigos + feed) | 6-8h |
| 10 | Dashboard B2B | 5-6h |
| 11 | Notificaciones push (bonus) | 3-4h |
| **TOTAL** | | **~24-31h** |

> A un ritmo de 2-3h por sesión: aproximadamente **10-15 sesiones de trabajo**.

---

## 📋 Notas para el comienzo de esta iteración

- **Prioridad recomendada:** Fase 6 → Fase 9 → Fase 10 → Fase 5 → Fase 11
- **Fase 5 es de baja prioridad:** el tab "Ranking" en `gym/[id].tsx` ya es funcional. Solo implementar si hay tiempo o surge la necesidad.
- **Migración BD de Fase 6:** el archivo `supabase/migrations/20260326_achievements.sql` ya existe en el repo — revisar si ya fue ejecutado en producción antes de empezar.
- El código completo del algoritmo de achievements (funciones de umbral, labels, evaluador) está documentado en `PLAN_V2.md § 6.3` para referencia.

