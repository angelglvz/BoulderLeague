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
| Fase 6 — Achievements + Ranking Global + Muro | ✅ Completada |
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

