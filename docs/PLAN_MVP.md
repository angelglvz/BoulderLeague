# 🗺️ Plan de Acción — BoulderLeague MVP

> Stack: React Native + Expo · Supabase (Auth, DB, Storage, Realtime)
> Objetivo: app funcional que permita crear liguillas, registrar bloques y ver ranking en tiempo real.

---

## 📍 Punto de partida para el siguiente agente

> **Estado:** Fase 7 en progreso · **Rama:** `feature/fase-7` · **Siguiente:** Continuar Fase 7 (7.1.3 en adelante)

---

### ⚠️ PROBLEMA ABIERTO — resolver primero mañana

**El bundle web falla al cargar** por dependencias de `react-native-draggable-flatlist` que requiere `react-native-reanimated` (v3.x) y `react-native-gesture-handler`:

```
Unable to resolve "react-native-gesture-handler" from "app/(app)/leagues/[id].tsx"
```

**Lo que ya se hizo:**
- `npm install react-native-reanimated@~3.17.4 react-native-gesture-handler react-native-draggable-flatlist@^4.0.1 --legacy-peer-deps`
- Creado `babel.config.js` con el plugin `react-native-reanimated/plugin`
- Añadido `import 'react-native-reanimated'` en `app/_layout.tsx`

**Pendiente de verificar:** que el bundle web compile correctamente tras limpiar caché (`npx expo start --web --clear`). Si sigue fallando, considerar **alternativa sin drag & drop** (reemplazar `DraggableFlatList` por `FlatList` normal con botones ▲/▼) para no bloquear el avance.

---

### También pendiente de la sesión de hoy

- **Márgenes incorrectos** en varias pantallas que usaban `SafeAreaView` de `react-native` en lugar de `react-native-safe-area-context` con padding en contenedor interno:
  - ✅ `leagues/create.tsx` — corregido
  - ✅ `leagues/join.tsx` — corregido
  - ❌ `(auth)/login.tsx` — **pendiente** (importa `SafeAreaView` de `react-native` + padding en container)
  - ❌ `(auth)/register.tsx` — **pendiente**
  - ❌ `(auth)/welcome.tsx` — **pendiente**
  - ❌ `blocks/[id]/log-attempt.tsx` — **pendiente**
  - ✅ `leagues/[id].tsx` — ya usaba `react-native-safe-area-context`
  - ✅ `leagues/[id]/add-block.tsx` — ya usaba `react-native-safe-area-context`
  - ✅ `leagues/[id]/ranking.tsx` — ya usaba `react-native-safe-area-context`

**Patrón correcto a aplicar en las que faltan:**
```tsx
// ❌ Incorrecto
import { SafeAreaView } from 'react-native'
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
})

// ✅ Correcto
import { SafeAreaView } from 'react-native-safe-area-context'
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner:     { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
})
// Y en el JSX: <SafeAreaView style={styles.container}><View style={styles.inner}>...</View></SafeAreaView>
// O con ScrollView: <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.scroll}>...</ScrollView></SafeAreaView>
```

---

### Lo que ya funciona (completo hasta Fase 6)
- Auth completo (registro, login, sesión persistida, logout)
- Crear liguillas **sin fechas** — nombre, recompensa, código de acceso y máx. participantes
- Unirse a liguillas por código
- Home con listado de liguillas del usuario
- Detalle de liguilla con info, código para compartir y lista de bloques con `BlockCard`
- Navegación protegida: redirige a `/welcome` si no hay sesión
- Formulario `add-block.tsx` — foto (galería/cámara), identificador y dificultad
- Subida de fotos a Supabase Storage (bucket `block-photos`)
- Pantalla de detalle de bloque `blocks/[id]/index.tsx` con foto, datos e indicador de resultado propio
- **Botón "▶ Iniciar liguilla"** (solo creador): habilitado con ≥5 bloques, oculto una vez iniciada
- **Reordenación y borrado de bloques** (solo disponibles antes de iniciar la liguilla)
- **Registro de resultados** `blocks/[id]/log-attempt.tsx` — selector de pegues, guardado único por bloque
- **`BlockCard`** con indicador visual de resultado: ✓ pegues / ⚡ Flash / sin resultado / ✅ completados marcados con tick
- **Ranking** `leagues/[id]/ranking.tsx` — tabla de participantes ordenada por puntuación con desempate
- **`lib/scoring.ts`** — lógica pura de puntuación con multiplicadores por dificultad y 7 niveles
- **Bloqueo de edición** al iniciar: una vez `start_date` ha llegado, se ocultan handles ▲/▼, botón 🗑️ y botón "+ Añadir"
- **`LeagueCard`** corregida: muestra "⏳ Sin iniciar" cuando `start_date = null` (antes mostraba "Finalizada")
- **Dificultades ampliadas** a 7 niveles: principiante, novato, medio, avanzado, experimentado, élite, profesional

### Pantalla de ranking (botón ya funcional)
- **`🏆 Ranking`** en `app/(app)/leagues/[id].tsx` → navega a `/(app)/leagues/[id]/ranking` ✅ implementado en Fase 5
- Pendiente para Fase 6: lógica de visibilidad controlada por `ranking_visible_during`

### Advertencias conocidas en web (no bloquean)
- `props.pointerEvents is deprecated` — viene de `react-native-web`, ignorar
- `shadow* props are deprecated` — viene del `theme.ts`, ignorar en web
- `useNativeDriver not supported` — ya está corregido con `Platform.OS !== 'web'`
- `Unexpected text node: // @ts-ignore` — viene del `DateField` en `create.tsx` y `leagues/[id].tsx`, ignorar en web

### Patrones establecidos en el proyecto
- **Date picker multiplataforma:** en web usar `<input type="date">` nativo; en móvil usar `DateTimePickerModal`
- **Toast de confirmación:** hook `useToast` con `Animated` (ver `create.tsx`)
- **Navegación:** usar `router.replace()` en lugar de `router.back()` en web (no hay historial)
- **Supabase queries:** siempre verificar que las políticas RLS tienen `GRANT USAGE ON SCHEMA public`
- **`npm install`:** usar siempre `--legacy-peer-deps`
- **Subida de imágenes:** en web usar `fetch + blob`; en móvil usar `fetch + arrayBuffer`

### Decisión de diseño: visibilidad del ranking
El creador de una liguilla (`creator_id`) puede decidir si el ranking es visible para los participantes **durante** la liguilla o **solo al terminar**. El creador siempre lo ve. Esto requiere:
1. Nueva columna `ranking_visible_during boolean DEFAULT true` en la tabla `leagues` (migración Supabase)
2. Toggle en `create.tsx` al crear la liguilla
3. Lógica de acceso en `ranking.tsx`: mostrar ranking si `ranking_visible_during = true` O si la liga ha terminado (`end_date < now()`) O si el usuario es el `creator_id`

---

## FASE 0 · Repositorio y entorno base ✅

- [x] 0.1 Inicializar proyecto Expo con TypeScript
- [x] 0.2 Añadir `.gitignore` y primer commit
- [x] 0.3 Instalar dependencias base
- [x] 0.4 Definir estructura de carpetas
- [x] 0.5 Crear `constants/theme.ts`
- [x] 0.6 Configurar ESLint + Prettier

---

## FASE 1 · Supabase: proyecto y base de datos ✅

- [x] 1.1 Crear proyecto en Supabase y guardar credenciales en `.env.local`
- [x] 1.2 Crear `lib/supabase.ts` con cliente configurado
- [x] 1.3 Ejecutar `schema.sql` en el SQL Editor de Supabase
- [x] 1.4 Activar RLS y añadir políticas básicas
- [x] 1.5 Activar Supabase Auth con email/contraseña
- [x] 1.6 Crear trigger `handle_new_user`
- [x] 1.7 Crear bucket `block-photos` en Supabase Storage
- [x] 1.8 Exportar `types/database.types.ts` con Supabase CLI

---

## FASE 2 · Autenticación ✅

- [x] 2.1 Crear pantalla `app/(auth)/welcome.tsx`
- [x] 2.2 Crear pantalla `app/(auth)/login.tsx`
- [x] 2.3 Crear pantalla `app/(auth)/register.tsx`
- [x] 2.4 Crear hook `hooks/useSession.ts`
- [x] 2.5 Configurar navegación protegida en `app/_layout.tsx`
- [x] 2.6 Persistir sesión con `expo-secure-store` (web: localStorage)

---

## FASE 3 · Liguillas ✅

- [x] 3.1 Crear pantalla `app/(app)/index.tsx` — Home con listado de liguillas
- [x] 3.2 Crear componente `components/LeagueCard.tsx`
- [x] 3.3 Crear pantalla `app/(app)/leagues/create.tsx` con date picker multiplataforma
- [x] 3.4 Lógica de creación: insertar en `leagues` y en `league_participants`
- [x] 3.5 Crear pantalla `app/(app)/leagues/join.tsx`
- [x] 3.6 Crear pantalla `app/(app)/leagues/[id].tsx` — detalle de liguilla
- [x] 3.7 Botón "Compartir liguilla" que copia el código al portapapeles

---

## FASE 4 · Bloques ✅

- [x] 4.1 Crear carpeta `app/(app)/leagues/[id]/` y pantalla `add-block.tsx` — formulario: identificador, dificultad y foto
- [x] 4.2 Integrar `expo-image-picker` para seleccionar foto de cámara o galería
- [x] 4.3 Subir foto a Supabase Storage (bucket `block-photos`) y guardar URL pública en `blocks.photo_url`
- [x] 4.4 Crear componente `components/BlockCard.tsx` — miniatura de foto, identificador, dificultad y resultado propio
- [x] 4.5 Crear pantalla `app/(app)/blocks/[id].tsx` — foto grande, datos del bloque y botón "Registrar resultado"

---

## FASE 4.1 · Correcciones de flujo y gestión de bloques

> **Motivación:** Las fechas de inicio/fin no tienen sentido al crear la liguilla porque aún no hay bloques. Se mueven al detalle de liguilla. Además, los bloques necesitan poder reordenarse y borrarse.

- [x] 4.1.1 **Eliminar fecha de inicio y fin de `create.tsx`**
  - Quitar campos `startDate`, `endDate`, validaciones y date picker asociado
  - La liguilla se crea sin fechas (`start_date = null`, `end_date = null`)
  - Actualizar `database.types.ts`: `start_date` y `end_date` pasan a ser `string | null` en `Insert` y `Row`
  - Adaptar `schema.sql` con `start_date DATE NULL` y `end_date DATE NULL`

- [x] 4.1.2 **Botón "▶ Iniciar liguilla" en `leagues/[id].tsx`**
  - Solo visible para el `creator_id` de la liguilla
  - Mínimo **5 bloques** para poder iniciar — mensaje de cuenta atrás *"Faltan X bloques para poder iniciar"* y botón deshabilitado hasta cumplirse
  - Al pulsar, abre un **modal/popup** con date picker de inicio y fin
  - Botón **"Iniciar"** que guarda las fechas vía `UPDATE` en Supabase y cierra el modal
  - Una vez iniciada, el botón cambia a *"✏️ Editar fechas"* y aparece badge de estado: ⏳ Pendiente / 🟢 En curso / 🏁 Finalizada

- [x] 4.1.3 **Reordenar bloques en `leagues/[id].tsx`**
  - Handles ▲ / ▼ a la izquierda de cada `BlockCard`
  - Los extremos se deshabilitan (no puedes subir el primero ni bajar el último)
  - Reordenación en estado local (persistencia en BD pendiente para cuando se añada columna `position`)

- [x] 4.1.4 **Borrar bloque con confirmación**
  - Botón 🗑️ a la derecha de cada card
  - `Alert` con mensaje de advertencia: *"Se eliminarán la foto y todos los resultados registrados"*
  - Borra foto de Storage + fila de `blocks` (attempts en cascada) + actualiza lista local

### SQL necesario para 4.1 (ejecutar en Supabase SQL Editor antes de implementar)

```sql
-- 4.1.1 Hacer start_date y end_date opcionales
ALTER TABLE leagues
  ALTER COLUMN start_date DROP NOT NULL,
  ALTER COLUMN end_date DROP NOT NULL;

-- 4.1.3 Añadir posición a bloques
ALTER TABLE blocks
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

-- Inicializar posiciones existentes por orden de creación
UPDATE blocks b
SET position = sub.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY league_id ORDER BY created_at) AS row_num
  FROM blocks
) sub
WHERE b.id = sub.id;
```

Después regenerar tipos: `npm run types:gen`

---

## FASE 5 · Registro de resultados y puntuación ✅

- [x] 5.1 Crear `lib/scoring.ts` con funciones puras: `calcBaseScore(goes)` y `calcBonus(difficulty)`
  - 7 niveles de dificultad: principiante (×0.8), novato (×1.0), medio (×1.2), avanzado (×1.5), experimentado (×1.8), élite (×2.2), profesional (×2.5)
  - Puntuación base: Flash=100, 2p=80, 3p=65, 4p=55, 5p=45, +5p=35, sin encadenar=0
  - Exporta: `GOES_LABELS`, `calcScore()`, `calcBaseScore()`, `calcBonus()`, `goesFromDB()`, `goesToDB()`, `resultEmoji()`
- [x] 5.2 Crear pantalla `app/(app)/blocks/[id]/log-attempt.tsx`
  - Selector visual de pegues con 7 opciones: Sin encadenar / Flash / 2-5 pegues / +5 pegues
  - **Solo se puede registrar un resultado por bloque** — una vez guardado queda bloqueado (`🔒 Resultado ya registrado`)
  - No muestra puntuación al usuario (se calcula internamente, se revela solo en ranking)
  - Al guardar navega de vuelta a la pantalla anterior con `router.back()`
- [x] 5.3 Mostrar indicador visual de resultado en `BlockCard`
  - ✅ Franja lateral de color + badge con pegues para bloques completados
  - ⏳ Franja gris para bloques intentados sin encadenar
  - Sin franja para bloques sin resultado
  - Tick ✓ visible en la card cuando el bloque ya tiene resultado registrado
- [x] 5.4 Guardar intento en `attempts` (INSERT único, no upsert — política RLS de 1 por usuario/bloque)
- [x] 5.5 Crear pantalla `app/(app)/leagues/[id]/ranking.tsx`
  - Tabla de participantes ordenada por puntuación total descendente
  - Desempate por: nº bloques encadenados → nº flashes → suma dificultades → menor nº pegues
  - Actualización en tiempo real con Supabase Realtime (`attempts` channel)
  - Podio visual con medallas 🥇🥈🥉

### Correcciones y mejoras incluidas en Fase 5

- [x] **Bugfix `LeagueCard`:** mostraba "Finalizada" en liguillas sin fechas — corregido a "⏳ Sin iniciar"
- [x] **Bloqueo de edición al iniciar liguilla:** `isStarted` oculta botón "+ Añadir", handles ▲/▼ y botón 🗑️ una vez `start_date ≤ today`
- [x] **`resultEmoji()` corregido:** eliminado el `Nx` (ej: `4×`) que se mostraba junto al label de pegues → ahora devuelve `✓` para cualquier número de pegues
- [x] **7 dificultades en `add-block.tsx`** en lugar de 5: se añaden `principiante` y `élite`
- [x] **`DIFFICULTY_LABEL`** actualizado en `blocks/[id]/index.tsx` para los 7 niveles
- [x] **RLS `attempts`:** políticas de INSERT/SELECT correctamente configuradas en Supabase
- [x] **Ruta duplicada resuelta:** eliminado conflicto entre `blocks/[id].tsx` (vacío) y `blocks/[id]/index.tsx`

### SQL ejecutado en Supabase para Fase 5

```sql
-- Tabla attempts
CREATE TABLE IF NOT EXISTS public.attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id    UUID NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
  number_of_goes INTEGER NOT NULL DEFAULT 0,
  score       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, block_id)
);

-- RLS attempts
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view attempts in their leagues"
  ON public.attempts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.blocks b
      JOIN public.league_participants lp ON lp.league_id = b.league_id
      WHERE b.id = attempts.block_id AND lp.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert their own attempt"
  ON public.attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.attempts TO authenticated;
```

Después regenerar tipos: `npm run types:gen`

---

## FASE 6 · Ranking

### 6.0 · Migración de base de datos (hacer primero en Supabase SQL Editor)

Antes de implementar el ranking hay que añadir la columna de visibilidad a la tabla `leagues`.
Ejecutar en **Supabase → SQL Editor**:

```sql
-- Añadir columna de visibilidad del ranking
ALTER TABLE leagues
  ADD COLUMN IF NOT EXISTS ranking_visible_during BOOLEAN NOT NULL DEFAULT TRUE;

-- Comentario descriptivo
COMMENT ON COLUMN leagues.ranking_visible_during IS
  'Si es TRUE, todos los participantes pueden ver el ranking durante la liguilla. Si es FALSE, solo el creador lo ve hasta que finalice end_date.';
```

Después regenerar los tipos:
```bash
npm run types:gen
```

> ⚠️ Sin esta migración los puntos 6.1 y 6.5 no compilarán porque `ranking_visible_during` no existe en los tipos.

---

- [x] 6.1 Añadir toggle **"¿Mostrar ranking durante la liguilla?"** en `create.tsx`
  - UI: switch con label "Visible para todos" / "Solo al terminar"
  - Por defecto: `true` (visible)
  - Guardar en `leagues.ranking_visible_during` al crear la liguilla

- [x] 6.2 Crear pantalla `app/(app)/leagues/[id]/ranking.tsx`
  - Leer `ranking_visible_during` y `end_date` de la liguilla
  - **Lógica de acceso:**
    - Si `user.id === league.creator_id` → siempre mostrar
    - Si `ranking_visible_during === true` → mostrar
    - Si `new Date() > new Date(league.end_date)` → mostrar (liga terminada)
    - En cualquier otro caso → mostrar pantalla de bloqueo: *"El ranking se revelará cuando finalice la liguilla 🔒"*
  - Lista de participantes ordenada por puntuación total descendente

- [x] 6.3 Crear `lib/tiebreak.ts` con la lógica de desempate:
  1. Nº de bloques encadenados (mayor primero)
  2. Nº de flashes (mayor primero)
  3. Suma de dificultades encadenadas (mayor primero)
  4. Menor nº total de pegues
  5. Empate técnico

- [x] 6.4 Suscribirse a cambios en `attempts` con **Supabase Realtime** para actualizar el ranking en tiempo real
  - Solo activar el listener si el usuario tiene permiso para ver el ranking (ver lógica del 6.2)
  - Cancelar la suscripción al desmontar el componente (`useEffect` cleanup)

- [x] 6.5 Mostrar en el detalle de liguilla `[id].tsx` un indicador del estado de visibilidad del ranking
  - Si `creator_id === user.id`: mostrar badge *"🔒 Solo tú ves el ranking"* o *"👁 Ranking visible para todos"*
  - Si es participante: mostrar *"El ranking se revelará al terminar"* cuando `ranking_visible_during === false`

- [x] ~~6.6 Añadir slot de banner publicitario placeholder en la parte inferior del ranking~~ *(descartado)*

### Correcciones y mejoras incluidas en Fase 6

- [x] **Migración BD `start_date`/`end_date` a `TIMESTAMPTZ` nullable** — columnas cambiadas de `DATE NOT NULL` a `TIMESTAMPTZ` via `supabase db push` (`20260324_league_dates_to_timestamptz.sql`)
- [x] **Policy RLS UPDATE en `leagues`** — faltaba la política `League creator can update` que permitía al creador hacer UPDATE de su liguilla; sin ella el guardado de fechas fallaba silenciosamente
- [x] **Selector de fechas web mejorado** — reemplazado `<input type="datetime-local">` (no permite filtrar opciones de minutos) por `<input type="date">` + `<select>` con exactamente 96 opciones (00:00, 00:15, 00:30... 23:45)
- [x] **Snap automático de minutos** — función `snapToQuarter()` que redondea cualquier valor al cuarto de hora más cercano antes de guardar
- [x] **Lógica `hasDates`/`isInProgress` separada** — antes usaba `isStarted` para todo; ahora:
  - `hasDates`: liga con fechas asignadas → oculta botón "Iniciar", muestra "Editar fechas"
  - `isInProgress`: liga ya comenzada (`now >= start_date`) → bloquea añadir/borrar/reordenar bloques
- [x] **Botón "Editar fechas"** visible para el creador cuando la liga tiene fechas pero aún no ha comenzado
- [x] **Error de guardado visible** — `handleSaveDates` muestra el mensaje de error real de Supabase en un Alert en lugar de fallar silenciosamente

---

## FASE 7 · Pulido visual y UX mínima

- [ ] 7.1 Aplicar `theme.ts` de forma consistente + sustituir emojis por iconos vectoriales (`@expo/vector-icons` · Ionicons)

  **Librería elegida: `@expo/vector-icons` — set Ionicons** (ya instalada con Expo, funciona en web y móvil sin configuración extra)

  **Inventario de iconos necesarios** (nombre Ionicons → reemplaza a):

  | Uso | Ionicons | Reemplaza |
  |---|---|---|
  | Borrar bloque | `trash-outline` | 🗑️ |
  | Mover arriba | *(eliminado — drag & drop)* | ▲ |
  | Mover abajo | *(eliminado — drag & drop)* | ▼ |
  | Drag handle | `reorder-three-outline` | ▲▼ |
  | Añadir bloque | `add-circle-outline` | + Añadir |
  | Ranking / trofeo | `trophy-outline` | 🏆 |
  | Calendario / fecha | `calendar-outline` | 📅 |
  | Hora | `time-outline` | 🕐 |
  | Compartir / copiar | `copy-outline` | 📋 |
  | Bloqueo ranking | `lock-closed-outline` | 🔒 |
  | Ranking visible | `eye-outline` | 👁 |
  | Iniciar liguilla | `play-circle-outline` | ▶ |
  | Editar fechas | `create-outline` | ✏️ |
  | Foto / cámara | `camera-outline` | 📸 |
  | Galería | `image-outline` | — |
  | Flash (resultado) | `flash-outline` | ⚡ |
  | Encadenado (check) | `checkmark-circle-outline` | ✓ |
  | Sin resultado | `ellipse-outline` | — |
  | Participantes | `people-outline` | — |
  | Código de acceso | `key-outline` | 🔑 |
  | Volver / back | `arrow-back-outline` | ← |
  | Logout | `log-out-outline` | — |
  | Liguilla vacía | `grid-outline` | 🧱 |
  | Home vacío | `albums-outline` | — |
  | Unirse a liga | `enter-outline` | — |
  | Crear liga | `add-outline` | — |
  | Oro / 1er puesto | `medal-outline` + color #FFD700 | 🥇 |
  | Plata / 2º puesto | `medal-outline` + color #C0C0C0 | 🥈 |
  | Bronce / 3er puesto | `medal-outline` + color #CD7F32 | 🥉 |

  **Crear componente `components/Icon.tsx`** — wrapper de Ionicons con tamaño y color del theme por defecto.

- [x] 7.1.1 Crear `components/Icon.tsx` — wrapper de Ionicons
- [x] 7.1.2 Sustituir emojis por `<Icon>` en `leagues/[id].tsx` (trash, drag, add, share, ranking, dates, back, play, edit)
- [ ] **7.1.3 ← EMPEZAR AQUÍ MAÑANA** — Sustituir emojis por `<Icon>` en `blocks/[id]/index.tsx` y `log-attempt.tsx`
- [ ] 7.1.4 Sustituir emojis por `<Icon>` en `leagues/[id]/ranking.tsx` (trofeo, medallas, lock)
- [ ] 7.1.5 Sustituir emojis por `<Icon>` en `(app)/index.tsx` (home) y `leagues/create.tsx`
- [x] 7.1.6 **Corregir contraste date picker en web** — `colorScheme: 'dark'` + `color: '#FFFFFF'` explícito + `select` con borde y fondo `surfaceAlt`

- [x] 7.2 **Drag & drop para reordenar bloques** (`react-native-draggable-flatlist` + `react-native-gesture-handler`)
  - Reemplazados los handles ▲/▼ por handle de arrastre con icono `reorder-three-outline`
  - `onLongPress={drag}` con `delayLongPress={100}` para activar el drag
  - `ScaleDecorator` para el efecto visual de escala al arrastrar
  - Envuelto en `GestureHandlerRootView` (requerido por la librería)
  - Persistir nuevo orden en BD: `UPDATE blocks SET position = $i WHERE id = $id`
  - Solo disponible antes de que la liga comience (`!isInProgress`)

- [ ] 7.3 Añadir estados de **carga** (`ActivityIndicator`) en todas las pantallas con llamadas async
- [ ] 7.4 Añadir estados **vacíos** cuando no hay liguillas, bloques o participantes
- [ ] 7.5 Añadir manejo de **errores** con mensajes claros al usuario (toast o inline)
- [ ] 7.6 Revisar flujo completo de extremo a extremo

---

## FASE 8 · Build y distribución

- [ ] 8.1 Configurar `app.json`: nombre "BoulderLeague", icono, splash screen y bundle ID
- [ ] 8.2 Crear cuenta en EAS y configurar `eas.json` con perfil `preview`
- [ ] 8.3 Generar build Android `.apk` con `eas build --platform android --profile preview`
- [ ] 8.4 Distribuir el `.apk` a los primeros testers
- [ ] 8.5 Recoger feedback e identificar bugs críticos del MVP

---

## Notas técnicas

| Decisión | Elección |
|---|---|
| Navegación | Expo Router (basado en ficheros) |
| Estado global | React Context + hooks propios (sin Redux/Zustand) |
| Roles de rocódromo | Campo `is_gym_admin` en `users` — se activa manualmente en Supabase durante el MVP |
| Tipos TypeScript | Generados con `supabase gen types typescript` (`npm run types:gen`) |
| Date picker | `react-native-modal-datetime-picker` en móvil · `<input type="date">` nativo en web |
| Animaciones | `useNativeDriver: Platform.OS !== 'web'` para evitar warnings en web |
| npm install | Usar siempre `--legacy-peer-deps` por conflictos de versiones |
| Visibilidad del ranking | Columna `ranking_visible_during boolean DEFAULT true` en `leagues`. El creador (`creator_id`) siempre ve el ranking. Los participantes solo lo ven si `ranking_visible_during = true` o si `end_date < now()`. Migración SQL requerida antes de implementar la Fase 6. |
| Propiedad de liguilla | `leagues.creator_id` referencia a `auth.uid()` del creador. Se usa para determinar permisos de edición, visibilidad del ranking y badge de "propietario" en la UI. |
