# 🗺️ Plan de Acción — BoulderLeague MVP

> Stack: React Native + Expo · Supabase (Auth, DB, Storage, Realtime)
> Objetivo: app funcional que permita crear liguillas, registrar bloques y ver ranking en tiempo real.

---

## 📍 Punto de partida para el siguiente agente

> **Estado:** Fase 4.1 completada · **Rama:** `feature/fase4` · **Siguiente:** Fase 5 (Registro de resultados)

### Lo que ya funciona
- Auth completo (registro, login, sesión persistida, logout)
- Crear liguillas **sin fechas** — nombre, recompensa, código de acceso y máx. participantes
- Unirse a liguillas por código
- Home con listado de liguillas del usuario
- Detalle de liguilla con info, código para compartir y lista de bloques con `BlockCard`
- Navegación protegida: redirige a `/welcome` si no hay sesión
- Formulario `add-block.tsx` — foto (galería/cámara), identificador y dificultad
- Subida de fotos a Supabase Storage (bucket `block-photos`)
- Pantalla de detalle de bloque `blocks/[id].tsx` con botón "Registrar resultado"
- **Botón "▶ Iniciar liguilla"** (solo creador): habilitado con ≥5 bloques, abre modal con date pickers multiplataforma
- **Reordenación de bloques** con handles ▲/▼
- **Borrado de bloques** con Alert de confirmación (borra foto de Storage + fila en BD)

### Pantallas pendientes con botones ya visibles
- **`✍️ Registrar resultado`** en `app/(app)/blocks/[id].tsx` → navega a `/(app)/blocks/[id]/log-attempt` *(no existe aún)*
- **`🏆 Ranking`** en `app/(app)/leagues/[id].tsx` → navega a `/(app)/leagues/[id]/ranking` *(no existe aún)*

### Advertencias conocidas en web (no bloquean)
- `props.pointerEvents is deprecated` — viene de `react-native-web`, ignorar
- `shadow* props are deprecated` — viene del `theme.ts`, ignorar en web
- `useNativeDriver not supported` — ya está corregido con `Platform.OS !== 'web'`

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

## FASE 5 · Registro de resultados y puntuación

- [ ] 5.1 Crear `lib/scoring.ts` con funciones puras: `calcBaseScore(goes)` y `calcBonus(difficulty)`
- [ ] 5.2 Crear pantalla `app/(app)/blocks/[id]/log-attempt.tsx` — selector de pegues (flash, 2, 3, 4, 5, +5)
- [ ] 5.3 Calcular `score = calcBaseScore + calcBonus` antes de guardar
- [ ] 5.4 Guardar/actualizar intento con **upsert** en `attempts` (clave única: `user_id + block_id`)
- [ ] 5.5 Mostrar indicador visual en `BlockCard` con el resultado del usuario (flash 🔥, pegues, sin intentar)

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

- [ ] 6.1 Añadir toggle **"¿Mostrar ranking durante la liguilla?"** en `create.tsx`
  - UI: switch con label "Visible para todos" / "Solo al terminar"
  - Por defecto: `true` (visible)
  - Guardar en `leagues.ranking_visible_during` al crear la liguilla

- [ ] 6.2 Crear pantalla `app/(app)/leagues/[id]/ranking.tsx`
  - Leer `ranking_visible_during` y `end_date` de la liguilla
  - **Lógica de acceso:**
    - Si `user.id === league.creator_id` → siempre mostrar
    - Si `ranking_visible_during === true` → mostrar
    - Si `new Date() > new Date(league.end_date)` → mostrar (liga terminada)
    - En cualquier otro caso → mostrar pantalla de bloqueo: *"El ranking se revelará cuando finalice la liguilla 🔒"*
  - Lista de participantes ordenada por puntuación total descendente

- [ ] 6.3 Crear `lib/tiebreak.ts` con la lógica de desempate:
  1. Nº de bloques encadenados (mayor primero)
  2. Nº de flashes (mayor primero)
  3. Suma de dificultades encadenadas (mayor primero)
  4. Menor nº total de pegues
  5. Empate técnico

- [ ] 6.4 Suscribirse a cambios en `attempts` con **Supabase Realtime** para actualizar el ranking en tiempo real
  - Solo activar el listener si el usuario tiene permiso para ver el ranking (ver lógica del 6.2)
  - Cancelar la suscripción al desmontar el componente (`useEffect` cleanup)

- [ ] 6.5 Mostrar en el detalle de liguilla `[id].tsx` un indicador del estado de visibilidad del ranking
  - Si `creator_id === user.id`: mostrar badge *"🔒 Solo tú ves el ranking"* o *"👁 Ranking visible para todos"*
  - Si es participante: mostrar *"El ranking se revelará al terminar"* cuando `ranking_visible_during === false`

- [ ] 6.6 Añadir slot de banner publicitario placeholder en la parte inferior del ranking

---

## FASE 7 · Pulido visual y UX mínima

- [ ] 7.1 Aplicar `theme.ts` de forma consistente en todos los componentes
- [ ] 7.2 Añadir estados de **carga** (`ActivityIndicator`) en todas las pantallas con llamadas async
- [ ] 7.3 Añadir estados **vacíos** cuando no hay liguillas, bloques o participantes
- [ ] 7.4 Añadir manejo de **errores** con mensajes claros al usuario (toast o inline)
- [ ] 7.5 Revisar flujo completo de extremo a extremo

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
