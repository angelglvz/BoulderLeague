# 🗺️ Plan de Acción — BoulderLeague MVP

> Stack: React Native + Expo · Supabase (Auth, DB, Storage, Realtime)
> Objetivo: app funcional que permita crear liguillas, registrar bloques y ver ranking en tiempo real.

---

## 📍 Punto de partida para el siguiente agente

> **Estado:** Fase 3 completada · **Rama:** `feature/fase-3` · **Siguiente:** Fase 4 (Bloques)

### Lo que ya funciona
- Auth completo (registro, login, sesión persistida, logout)
- Crear liguillas con nombre, fechas (date picker), recompensa, código de acceso y máx. participantes
- Unirse a liguillas por código
- Home con listado de liguillas del usuario
- Detalle de liguilla con info, código para compartir y lista de bloques (vacía)
- Navegación protegida: redirige a `/welcome` si no hay sesión

### Pantallas pendientes con botones ya visibles
- **`+ Añadir`** bloque en `app/(app)/leagues/[id].tsx` → navega a `/(app)/leagues/[id]/add-block` *(no existe aún)*
- **`🏆 Ranking`** en `app/(app)/leagues/[id].tsx` → navega a `/(app)/leagues/[id]/ranking` *(no existe aún)*
- **`/(app)/blocks/[id]`** → detalle de bloque *(no existe aún)*

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

## FASE 4 · Bloques 🔜

- [ ] 4.1 Crear carpeta `app/(app)/leagues/[id]/` y pantalla `add-block.tsx` — formulario: identificador, dificultad y foto
- [ ] 4.2 Integrar `expo-image-picker` para seleccionar foto de cámara o galería
- [ ] 4.3 Subir foto a Supabase Storage (bucket `block-photos`) y guardar URL pública en `blocks.photo_url`
- [ ] 4.4 Crear componente `components/BlockCard.tsx` — miniatura de foto, identificador, dificultad y resultado propio
- [ ] 4.5 Crear pantalla `app/(app)/blocks/[id].tsx` — foto grande, datos del bloque y botón "Registrar resultado"

---

## FASE 5 · Registro de resultados y puntuación

- [ ] 5.1 Crear `lib/scoring.ts` con funciones puras: `calcBaseScore(goes)` y `calcBonus(difficulty)`
- [ ] 5.2 Crear pantalla `app/(app)/blocks/[id]/log-attempt.tsx` — selector de pegues (flash, 2, 3, 4, 5, +5)
- [ ] 5.3 Calcular `score = calcBaseScore + calcBonus` antes de guardar
- [ ] 5.4 Guardar/actualizar intento con **upsert** en `attempts` (clave única: `user_id + block_id`)
- [ ] 5.5 Mostrar indicador visual en `BlockCard` con el resultado del usuario (flash 🔥, pegues, sin intentar)

---

## FASE 6 · Ranking

- [ ] 6.1 Crear pantalla `app/(app)/leagues/[id]/ranking.tsx` — lista de participantes ordenada por puntuación total
- [ ] 6.2 Crear `lib/tiebreak.ts` con la lógica de desempate: bloques encadenados → flashes → suma dificultades → menos pegues
- [ ] 6.3 Suscribirse a cambios en `attempts` con **Supabase Realtime** para actualizar el ranking en tiempo real
- [ ] 6.4 Añadir slot de banner publicitario placeholder en la parte inferior del ranking

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
