# 🗺️ Plan de Acción — BoulderLeague MVP

> Stack: React Native + Expo · Supabase (Auth, DB, Storage, Realtime)
> Objetivo: app funcional que permita crear liguillas, registrar bloques y ver ranking en tiempo real.

---

## FASE 0 · Repositorio y entorno base

- [x] 0.1 Inicializar proyecto Expo con TypeScript: `npx create-expo-app boulder-league --template blank-typescript`
- [x] 0.2 Añadir `.gitignore` adecuado para Expo/Node y hacer el primer commit
- [x] 0.3 Instalar dependencias base: `expo-router`, `@supabase/supabase-js`, `expo-image-picker`, `expo-secure-store`
- [x] 0.4 Definir estructura de carpetas: `app/`, `components/`, `hooks/`, `lib/`, `constants/`, `types/`
- [ ] 0.5 Crear `constants/theme.ts` con paleta de colores, tipografías y tamaños base
- [ ] 0.6 Configurar ESLint + Prettier con reglas para React Native

---

## FASE 1 · Supabase: proyecto y base de datos

- [ ] 1.1 Crear proyecto en Supabase y guardar `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `.env.local`
- [ ] 1.2 Crear `lib/supabase.ts` con el cliente configurado usando las variables de entorno
- [ ] 1.3 Ejecutar `schema.sql` en el SQL Editor de Supabase (tablas: `users`, `gyms`, `leagues`, `league_participants`, `blocks`, `attempts`)
- [ ] 1.4 Activar RLS en todas las tablas y añadir política básica: cada usuario solo accede a sus datos
- [ ] 1.5 Activar Supabase Auth con proveedor **email/contraseña**
- [ ] 1.6 Crear trigger `handle_new_user` en Supabase: al registrarse, inserta automáticamente en la tabla `users`
- [ ] 1.7 Crear bucket `block-photos` en Supabase Storage con política de lectura pública
- [ ] 1.8 Exportar `types/database.types.ts` con los tipos generados desde Supabase CLI (`supabase gen types typescript`)

---

## FASE 2 · Autenticación

- [ ] 2.1 Crear pantalla `app/(auth)/welcome.tsx` — splash/bienvenida con botones "Entrar" y "Registrarse"
- [ ] 2.2 Crear pantalla `app/(auth)/login.tsx` — formulario email + contraseña con manejo de errores
- [ ] 2.3 Crear pantalla `app/(auth)/register.tsx` — formulario nombre + email + contraseña
- [ ] 2.4 Crear hook `hooks/useSession.ts` — expone `session`, `user` y función `signOut`
- [ ] 2.5 Configurar navegación protegida en `app/_layout.tsx`: redirige a `/welcome` si no hay sesión activa
- [ ] 2.6 Persistir sesión con `expo-secure-store` para que el usuario no tenga que volver a logarse

---

## FASE 3 · Liguillas

- [ ] 3.1 Crear pantalla `app/(app)/index.tsx` — Home con listado de liguillas en las que participo
- [ ] 3.2 Crear componente `components/LeagueCard.tsx` — tarjeta con nombre, fechas y estado de la liguilla
- [ ] 3.3 Crear pantalla `app/(app)/leagues/create.tsx` — formulario: nombre, fechas, recompensa, máx. participantes, código de acceso
- [ ] 3.4 Añadir lógica de creación: insertar en `leagues` e insertar al creador en `league_participants`
- [ ] 3.5 Crear pantalla `app/(app)/leagues/join.tsx` — input de código + validación de cupo disponible
- [ ] 3.6 Crear pantalla `app/(app)/leagues/[id].tsx` — detalle de liguilla: info + lista de bloques + botón añadir bloque
- [ ] 3.7 Añadir botón "Compartir liguilla" que copia el código de acceso al portapapeles

---

## FASE 4 · Bloques

- [ ] 4.1 Crear pantalla `app/(app)/leagues/[id]/add-block.tsx` — formulario: identificador, dificultad y foto
- [ ] 4.2 Integrar `expo-image-picker` para seleccionar foto de cámara o galería
- [ ] 4.3 Subir foto a Supabase Storage (bucket `block-photos`) y guardar la URL pública en `blocks.photo_url`
- [ ] 4.4 Crear componente `components/BlockCard.tsx` — miniatura de foto, identificador, dificultad y resultado propio
- [ ] 4.5 Crear pantalla `app/(app)/blocks/[id].tsx` — foto grande, datos del bloque y botón "Registrar resultado"

---

## FASE 5 · Registro de resultados y puntuación

- [ ] 5.1 Crear `lib/scoring.ts` con funciones puras: `calcBaseScore(goes)` y `calcBonus(difficulty)`
- [ ] 5.2 Crear pantalla `app/(app)/blocks/[id]/log-attempt.tsx` — selector de pegues (0, 1, 2, 3, 4, 5, +5)
- [ ] 5.3 Calcular `score = calcBaseScore + calcBonus` antes de guardar
- [ ] 5.4 Guardar/actualizar intento con **upsert** en `attempts` (clave única: `user_id + block_id`)
- [ ] 5.5 Mostrar indicador visual en `BlockCard` con el resultado ya registrado por el usuario (flash 🔥, pegues, sin intentar)

---

## FASE 6 · Ranking

- [ ] 6.1 Crear pantalla `app/(app)/leagues/[id]/ranking.tsx` — lista de participantes ordenada por puntuación total
- [ ] 6.2 Crear `lib/tiebreak.ts` con la lógica de desempate en orden: bloques encadenados → flashes → suma dificultades → menos pegues
- [ ] 6.3 Suscribirse a cambios en `attempts` con **Supabase Realtime** para actualizar el ranking sin recargar
- [ ] 6.4 Añadir slot de banner publicitario placeholder en la parte inferior de la pantalla de ranking

---

## FASE 7 · Pulido visual y UX mínima

- [ ] 7.1 Aplicar `theme.ts` de forma consistente en todos los componentes (colores, fuentes, spacing)
- [ ] 7.2 Añadir estados de **carga** (`ActivityIndicator`) en todas las pantallas con llamadas async
- [ ] 7.3 Añadir estados **vacíos** (empty state) cuando no hay liguillas, bloques o participantes
- [ ] 7.4 Añadir manejo de **errores** con mensajes claros al usuario (toast o inline)
- [ ] 7.5 Revisar flujo completo de extremo a extremo: registro → crear liguilla → añadir bloque → registrar resultado → ver ranking

---

## FASE 8 · Build y distribución

- [ ] 8.1 Configurar `app.json`: nombre "BoulderLeague", icono (`Boulder League.png`), splash screen y bundle ID
- [ ] 8.2 Crear cuenta en EAS y configurar `eas.json` con perfil `preview`
- [ ] 8.3 Generar build Android `.apk` con `eas build --platform android --profile preview`
- [ ] 8.4 Distribuir el `.apk` a los primeros testers (WhatsApp / email)
- [ ] 8.5 Recoger feedback de los testers e identificar los bugs críticos del MVP

---

## Notas técnicas

| Decisión | Elección |
|---|---|
| Navegación | Expo Router (basado en ficheros, recomendado) |
| Estado global | React Context + hooks propios (sin Redux/Zustand para el MVP) |
| Roles de rocódromo | Campo `is_gym_admin` en `users` — se activa manualmente en Supabase durante el MVP |
| Tipos TypeScript | Generados con `supabase gen types typescript` para evitar errores en runtime |
