# 🐛 BUG_TEST_DEVICE — Registro de bugs en dispositivo físico

> Bugs encontrados durante pruebas manuales en dispositivo móvil real.  
> Formato: descripción del comportamiento actual → comportamiento esperado → posible causa / archivo afectado.

---

## BUG-001 · Doble "Volver" tras guardar un intento

**Estado:** 🔴 Abierto  
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

**Estado:** 🔴 Abierto  
**Pantalla:** Añadir / editar bloque (`/(app)/gym/blocks/add`)  
**Perfil afectado:** Rocódromo  

### Comportamiento actual
Al pulsar el botón de cámara:
1. Se abre directamente la cámara nativa sin dar opción de elegir entre **cámara** o **galería**.
2. Tras tomar la foto y pulsar "OK", aparece una pantalla adicional de recorte.
3. Solo después de recortar se carga la foto en la app.

### Comportamiento esperado
1. Al pulsar el botón aparece un selector: **"Hacer foto"** o **"Elegir de galería"**.
2. Tras tomar o seleccionar la foto, se muestra una previsualización y se confirma con "OK".
3. Se vuelve directamente a la pantalla del bloque con la foto ya cargada, **sin paso de recorte intermedio obligatorio**.

### Causa probable
- Se está llamando a `launchCamera` directamente en lugar de `launchImageLibrary` con opción combinada o mostrar un `ActionSheet` previo.
- La pantalla de recorte probablemente viene de `cropperOptions` activado en la librería de imágenes. Desactivar `cropping: true` o hacerlo opcional.

### Archivo sospechoso
`app/(app)/gym/blocks/add.tsx` — función que llama a la cámara / image picker.

---

## BUG-003 · Error "Network request failed" al guardar bloque

**Estado:** 🔴 Abierto  
**Pantalla:** Añadir / editar bloque (`/(app)/gym/blocks/add`)  
**Perfil afectado:** Rocódromo  

### Comportamiento actual
Al pulsar **"Guardar bloque"**, la app muestra un popup de error:  
```
Error
Network request failed
```
El bloque **no se guarda**.

### Comportamiento esperado
El bloque se guarda correctamente en Supabase (tabla `blocks` + subida de foto a Storage) y se redirige al listado de bloques del rocódromo.

### Causa probable
- El upload de la foto a Supabase Storage falla por un problema de red, CORS, o porque la URI local de la imagen no se convierte correctamente a `Blob`/`ArrayBuffer` antes de enviarse.
- Posible fallo al intentar subir una URI de archivo local (`file://...`) directamente sin convertirla a `FormData` o `ArrayBuffer`.
- Verificar la política de Storage en Supabase (`block-photos` bucket) y que el token de sesión se adjunta correctamente.

### Pasos para reproducir
1. Abrir perfil rocódromo → Bloques → Añadir bloque.
2. Rellenar todos los campos (identificador, dificultad, foto).
3. Pulsar "Guardar".
4. → Popup: *"Network request failed"*.

### Archivo sospechoso
`app/(app)/gym/blocks/add.tsx` — función de upload a Supabase Storage.

---

## BUG-004 · Botón "Guardar" tapado por botones del sistema en registro de pegue

**Estado:** 🔴 Abierto  
**Pantalla:** Registro de intento / pegue (`/(app)/blocks/[id]/log-attempt`)  
**Perfil afectado:** Usuario  

### Comportamiento actual
El botón **"Guardar"** queda oculto bajo la barra de navegación del dispositivo (botones de sistema: atrás / inicio / recientes), impidiendo pulsarlo sin hacer scroll.

### Comportamiento esperado
El botón "Guardar" es siempre visible y pulsable, respetando el área segura (`SafeAreaView` / `useSafeAreaInsets`) por encima de los botones del sistema.

### Causa probable
- El contenedor usa `View` en lugar de `SafeAreaView`, o falta añadir `paddingBottom` con `insets.bottom` para gestionar la barra de navegación en Android con gesture navigation.
- En dispositivos con navegación por gestos el `insets.bottom` puede ser > 0 y hay que tenerlo en cuenta.

### Solución sugerida
Envolver la pantalla en `<SafeAreaView edges={['bottom']}>` o añadir:
```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context'
const insets = useSafeAreaInsets()
// ...
<View style={{ paddingBottom: insets.bottom + spacing.md }}>
  <TouchableOpacity /* Guardar */ />
</View>
```

### Archivo sospechoso
`app/(app)/blocks/[id]/log-attempt.tsx` — área del botón de guardar / contenedor principal.

---

## BUG-005 · "Invalid Date" en pantalla de ranking bloqueado

**Estado:** 🔴 Abierto  
**Pantalla:** Ranking de liguilla (`/(app)/leagues/[id]/ranking`)  
**Perfil afectado:** Usuario  

### Comportamiento actual
Al intentar ver el ranking de una liguilla que aún no ha terminado y cuyo ranking está configurado para mostrarse solo al finalizar, el mensaje muestra:

```
Disponible a partir del Invalid Date
```

### Comportamiento esperado
```
Disponible a partir del 15 de abril de 2026
```
(o la fecha de fin real de la liguilla)

### Causa
`league.end_date` ya llega de Supabase como timestamp ISO completo (`"2026-04-15T20:00:00+00:00"`). El código le concatena `+ 'T12:00:00'` produciendo una cadena inválida del tipo `"2026-04-15T20:00:00+00:00T12:00:00"` que `new Date()` no puede parsear.

### Archivo
`app/(app)/leagues/[id]/ranking.tsx` — línea con `new Date(league.end_date + 'T12:00:00')`

---

## Resumen

| ID | Pantalla | Perfil | Estado |
|----|----------|--------|--------|
| BUG-001 | `log-attempt` | Usuario | 🔴 Abierto |
| BUG-002 | `gym/blocks/add` (cámara) | Rocódromo | 🔴 Abierto |
| BUG-003 | `gym/blocks/add` (guardar) | Rocódromo | 🔴 Abierto |
| BUG-004 | `log-attempt` (botón guardar) | Usuario | 🔴 Abierto |
| BUG-005 | `leagues/[id]/ranking` (Invalid Date) | Usuario | 🟢 Cerrado |

---

*Última actualización: 2026-03-27*

