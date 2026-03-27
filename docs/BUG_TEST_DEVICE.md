# 🐛 BUG_TEST_DEVICE — Registro de bugs en dispositivo físico

> Bugs encontrados durante pruebas manuales en dispositivo móvil real.  
> Formato: descripción del comportamiento actual → comportamiento esperado → posible causa / archivo afectado.

---

## BUG-001 · Doble "Volver" tras guardar un intento

**Estado:** 🟢 Cerrado  
**Pantalla:** Registro de intento en bloque (`/(app)/blocks/[id]/log-attempt`)  
**Perfil afectado:** Usuario  

### Comportamiento actual
Al guardar un intento en un bloque (desde el perfil de un rocódromo), hay que pulsar **"Volver" dos veces** para regresar al listado de bloques del rocódromo.

### Comportamiento esperado
Con **un solo "Volver"** se regresa directamente al listado de bloques.

### Causa probable
Tras guardar, el código navega con `router.push(...)` en lugar de `router.back()`, añadiendo una entrada extra al stack de navegación. Revisar si hay un `push` redundante o un `replace` que debería usarse en vez de `push` en `log-attempt.tsx`.

### Archivo sospechoso
`app/(app)/blocks/[id]/log-attempt.tsx`

---

## BUG-002 · Cámara sin opción de galería al añadir foto de bloque

**Estado:** 🟢 Cerrado  
**Pantalla:** Añadir / editar bloque (`/(app)/gym/blocks/add`)  
**Perfil afectado:** Rocódromo  

### Solución aplicada
- `handlePhotoPress()` ahora muestra el diálogo "Añadir foto" (Cámara / Galería) en móvil, igual que `handleChangePhoto()`.
- Eliminado `allowsEditing: true` y `aspect: [3,4]` de `launchCameraAsync` y `launchImageLibraryAsync` → la foto se acepta directamente sin paso de recorte.

### Archivo afectado
`app/(app)/gym/blocks/add.tsx`

---

## BUG-003 · Error "Network request failed" al guardar bloque

**Estado:** 🟢 Cerrado  
**Pantalla:** Añadir / editar bloque (`/(app)/gym/blocks/add`)  
**Perfil afectado:** Rocódromo  

### Comportamiento actual
Al pulsar **"Guardar bloque"**, la app muestra un popup de error:  
```
Error
Network request failed
```
El bloque **no se guarda**.

### Causa
En React Native / Hermes, `fetch()` **no puede leer URIs locales** (`file://` o `content://`) que devuelve `expo-image-picker`. La llamada `fetch(uri)` era la que lanzaba el "Network request failed". El upload a Supabase en sí era correcto.

### Solución aplicada
Reemplazada la lectura `fetch(uri) → blob() → arrayBuffer()` por `XMLHttpRequest` con `responseType = 'arraybuffer'`, que sí tiene soporte nativo en React Native para leer archivos locales. La ruta web mantiene `fetch()` (que allí sí funciona con blob/data URIs).

```typescript
const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
  const xhr = new XMLHttpRequest()
  xhr.onload = () => resolve(xhr.response as ArrayBuffer)
  xhr.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada'))
  xhr.responseType = 'arraybuffer'
  xhr.open('GET', uri)
  xhr.send()
})
await supabase.storage.from('block-photos').upload(path, arrayBuffer, { contentType })
```

### Archivo afectado
`app/(app)/gym/blocks/add.tsx` — función `uploadPhoto`

---

## BUG-004 · Botón "Guardar" tapado por botones del sistema en registro de pegue

**Estado:** 🟢 Cerrado  
**Pantalla:** Registro de intento / pegue (`/(app)/blocks/[id]/log-attempt`)  
**Perfil afectado:** Usuario  

### Causa
`SafeAreaView` de `react-native` no reporta el inset inferior de la barra de gestos de Android. El `ScrollView` tenía `padding: spacing.lg` fijo, sin sumar `insets.bottom`, por lo que el botón quedaba oculto bajo la barra de sistema en dispositivos con navegación por gestos.

### Solución aplicada
- Añadido `useSafeAreaInsets` de `react-native-safe-area-context` (ya instalado).
- El `contentContainerStyle` del `ScrollView` ahora usa `paddingBottom: insets.bottom + spacing.lg`, garantizando que el botón siempre quede por encima de la barra de gestos/navegación.

```tsx
const insets = useSafeAreaInsets()
// ...
<ScrollView
  contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.lg }]}
  ...
>
```

### Archivo afectado
`app/(app)/blocks/[id]/log-attempt.tsx`

---

## BUG-005 · "Invalid Date" en pantalla de ranking bloqueado

**Estado:** 🟢 Cerrado  
**Pantalla:** Ranking de liguilla (`/(app)/leagues/[id]/ranking`)  
**Perfil afectado:** Usuario  

### Causa
`league.end_date` ya llega de Supabase como ISO timestamp completo (`"2026-04-15T20:00:00+00:00"`). El código concatenaba `+ 'T12:00:00'` (y `+ 'T23:59:59'` en `canViewRanking`), produciendo cadenas inválidas que `new Date()` no puede parsear → `Invalid Date`.

### Solución aplicada
Eliminadas las concatenaciones en los dos puntos afectados:

```tsx
// canViewRanking — antes
new Date(l.end_date + 'T23:59:59')
// canViewRanking — después
new Date(l.end_date)

// Mensaje "Disponible a partir del…" — antes
new Date(league.end_date + 'T12:00:00').toLocaleDateString(...)
// Mensaje — después
new Date(league.end_date).toLocaleDateString(...)
```

### Archivo afectado
`app/(app)/leagues/[id]/ranking.tsx`

---

## BUG-006 · 403 Forbidden al insertar achievements

**Estado:** 🟢 Cerrado  
**Pantalla:** Sistema de logros — `evaluateAchievements()` en `lib/achievements.ts`  
**Perfil afectado:** Usuario  

### Comportamiento actual
Al completar un bloque de gym, la llamada POST a `/rest/v1/achievements` devuelve **403 Forbidden** y no se guardan los logros.

### Causa
`fix_all_rls_policies.sql` ejecutó `GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated` **antes** de que se creara la tabla `achievements` (migración `20260326_achievements.sql`). Por tanto, el rol `authenticated` nunca recibió privilegio de `INSERT` sobre dicha tabla. Las políticas RLS eran correctas, pero sin el `GRANT` base PostgREST rechaza la petición con 403.

Lo mismo afectaba a la tabla `activity_feed`.

### Solución aplicada
Nueva migración `supabase/migrations/fix_achievements_grants.sql`:
```sql
GRANT SELECT, INSERT ON TABLE achievements TO authenticated;
GRANT SELECT, INSERT ON TABLE activity_feed TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
```

### Archivos afectados
- `supabase/migrations/fix_achievements_grants.sql` ← **nuevo**
- `lib/achievements.ts` (código sin cambios, el error era solo de BD)

---

## Resumen

| ID | Pantalla | Perfil | Estado |
|----|----------|--------|--------|
| BUG-001 | `log-attempt` | Usuario | 🟢 Cerrado |
| BUG-002 | `gym/blocks/add` (cámara) | Rocódromo | 🟢 Cerrado |
| BUG-003 | `gym/blocks/add` (guardar) | Rocódromo | 🟢 Cerrado |
| BUG-004 | `log-attempt` (botón guardar) | Usuario | 🟢 Cerrado |
| BUG-005 | `leagues/[id]/ranking` (Invalid Date) | Usuario | 🟢 Cerrado |
| BUG-006 | `achievements` (403 Forbidden) | Usuario | 🟢 Cerrado |
---

*Última actualización: 2026-03-27*

