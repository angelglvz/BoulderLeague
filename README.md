# 🧗 BoulderLeague

Aplicación lúdica y social para escalada indoor que permite crear **liguillas y retos temporales** basados en bloques reales del rocódromo. Fomenta la participación mediante pique sano, reglas simples y recompensas informales.

---

## 🚦 Estado actual del proyecto (Fase 3 completada)

> **Última actualización:** Marzo 2026 · Rama activa: `feature/fase-3`

### ✅ Fases completadas

| Fase | Descripción |
|---|---|
| 0 | Repositorio, estructura de carpetas y entorno base |
| 1 | Proyecto Supabase: BD, RLS, Auth, Storage, triggers y tipos |
| 2 | Autenticación completa: welcome, login, registro, sesión persistida |
| 3 | Liguillas: crear, unirse, listar y ver detalle con código para compartir |

### 🔜 Próxima fase

**Fase 4 · Bloques** — añadir bloques a una liguilla con foto, identificador y dificultad.

Ver detalle completo en [`PLAN_MVP.md`](./PLAN_MVP.md).

---

## 📋 Descripción del MVP

### Objetivo

Validar que:
- Los escaladores participan activamente en liguillas privadas u oficiales.
- El formato funciona tanto para grupos de amigos como para rocódromos.
- El sistema de puntuación es entendible, justo y divertido.

### Usuarios objetivo

**Escaladores**
- Escalan en rocódromo de forma regular, suelen ir con el mismo grupo.
- Les motiva el juego, el pique y los retos cortos.
- No buscan exposición pública ni redes sociales.

**Rocódromos** *(secundario en MVP)*
- Quieren dinamizar la sala con retos de temporada o eventos internos.

---

## 🏆 Tipos de liguilla

| Tipo | Descripción |
|---|---|
| **Privada** | Creada por un usuario, acceso por invitación (link o código). Participantes ilimitados o con límite configurable. |
| **Oficial de rocódromo** | Creada por la gerencia, inscripción abierta hasta alcanzar un máximo. Al llegar al máximo, se cierra automáticamente. |

---

## ⚙️ Configuración de una liguilla

Cada liguilla incluye:

- 📛 Nombre
- 📍 Rocódromo *(opcional)*
- 📅 Fecha de inicio y fin
- 🏆 Recompensa *(texto libre)*
- 👥 Participantes *(ilimitado o número máximo)*
- 🧱 Conjunto de bloques

**Número de bloques permitidos:**

| Contexto | Opciones |
|---|---|
| Grupos privados | 5 / 10 / 15 / 20 |
| Rocódromos / temporada | 20 / 30 / 40 / 50 |

---

## 🧱 Definición de bloques

Cada bloque contiene:
- 📸 Una foto
- 🏷️ Identificador (nombre, color o sector)
- ⚖️ Dificultad *(opcional)*: Novato · Medio · Avanzado · Experimentado · Profesional

> La dificultad no representa un grado, sino una **categoría relativa**.

---

## 📊 Sistema de puntuación

### Puntuación base

| Resultado | Puntos base |
|---|---|
| Flash | 10 |
| 2 pegues | 5 |
| 3 pegues | 4 |
| 4 pegues | 3 |
| 5 pegues | 2 |
| +5 pegues / no encadenado | 1 |
| No probado | 0 |

### Bonus por dificultad

| Dificultad | Bonus |
|---|---|
| Novato | +0 |
| Medio | +1 |
| Avanzado | +2 |
| Experimentado | +3 |
| Profesional | +4 |

> **Puntuación final del bloque = puntos base + bonus por dificultad**

---

## 📏 Reglas del juego

- Cada usuario se **auto-reporta**.
- Solo cuenta el **mejor resultado** por bloque.
- No se acumulan puntos por repetir.
- El resultado queda fijado al finalizar la liguilla.
- El creador actúa como *árbitro implícito*.

### Desempate (en orden)

1. Nº de bloques encadenados
2. Nº de flashes
3. Suma de dificultades encadenadas
4. Menor nº total de pegues
5. Empate

---

## ✅ Funcionalidades del MVP

**Para usuarios:**
- Crear y unirse a liguillas
- Subir bloques (foto + datos)
- Registrar resultado de un bloque
- Ver ranking en tiempo real

**Para rocódromos:**
- Crear liguilla oficial
- Ver ranking general

**Fuera del MVP:** vídeos, comentarios, likes/seguidores, validación de intentos, integraciones externas.

---

## 💰 Monetización inicial

- App **gratuita**
- Publicidad no intrusiva: banner en ranking y pantalla final de resultados
- Publicidad contextual (tiendas, bares, marcas locales)

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend / Mobile | [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) |
| Backend / DB | [Supabase](https://supabase.com/) |

### ¿Por qué Expo?

Expo está construido sobre React Native y es perfecto para un MVP:
- Arranca en minutos sin configurar entornos nativos.
- Prueba la app en tu móvil físico al instante con **Expo Go**.
- Genera builds (`.apk` / `.ipa`) desde la nube, sin tocar Android Studio ni Xcode.

### Esquema de base de datos (Supabase)
```sql
users               (id, email, name, created_at)
leagues             (id, name, creator_id, start_date, end_date, reward, is_private, access_code, max_participants, created_at)
league_participants (id, league_id, user_id, joined_at)
blocks              (id, league_id, identifier, difficulty, photo_url, created_at)
attempts            (id, user_id, block_id, score, number_of_goes, created_at)
```

---

## 🗂️ Estructura del proyecto

```
BoulderLeague/
├── app/
│   ├── _layout.tsx              # Root layout — navegación protegida
│   ├── index.tsx                # Redirección inicial
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx          # Pantalla de bienvenida
│   │   ├── login.tsx            # Inicio de sesión
│   │   └── register.tsx         # Registro de cuenta
│   └── (app)/
│       ├── _layout.tsx
│       ├── index.tsx            # Home — listado de liguillas
│       └── leagues/
│           ├── create.tsx       # Crear liguilla
│           ├── join.tsx         # Unirse con código
│           └── [id].tsx         # Detalle de liguilla
├── components/
│   ├── index.ts
│   └── LeagueCard.tsx           # Tarjeta de liguilla
├── constants/
│   ├── index.ts
│   └── theme.ts                 # Colores, tipografía, spacing
├── hooks/
│   ├── index.ts
│   └── useSession.ts            # Hook de sesión de usuario
├── lib/
│   └── supabase.ts              # Cliente Supabase (web + móvil)
├── types/
│   ├── index.ts
│   └── database.types.ts        # Tipos generados desde Supabase CLI
├── schema.sql                   # Schema de la BD
├── PLAN_MVP.md                  # Plan de tareas del MVP
└── .env.local                   # Variables de entorno (no en Git)
```

---

## 🚀 Puesta en marcha

### Requisitos previos

- Node.js >= 20.19.4 LTS
- Cuenta en [Supabase](https://supabase.com/) con acceso al proyecto
- App **Expo Go** en tu móvil ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Instalación
```bash
# 1. Clonar el repositorio
git clone https://github.com/angelglvz/BoulderLeague.git
cd BoulderLeague

# 2. Instalar dependencias
npm install --legacy-peer-deps

# 3. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local y rellena las variables (ver sección de Variables de entorno)

# 4. Arrancar en web (recomendado para desarrollo)
npx expo start --web --offline --clear

# 5. Arrancar en móvil (escanear QR con Expo Go)
npx expo start --offline
```

> ⚠️ Usa siempre `--legacy-peer-deps` en los `npm install` porque hay conflictos de versiones entre paquetes de Expo y ESLint.

---

## 🔑 Variables de entorno

Crea el fichero `.env.local` en la raíz con estas variables:

```env
EXPO_PUBLIC_SUPABASE_URL=https://bcmlsdxvfgkxefkplosa.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key del proyecto Supabase>
```

La **anon key** se encuentra en: Supabase Dashboard → Project Settings → API → `anon public`.

---

## ☁️ Configuración de Supabase

### Proyecto
- **URL:** `https://bcmlsdxvfgkxefkplosa.supabase.co`
- **Dashboard:** [supabase.com/dashboard](https://supabase.com/dashboard)
- Para acceder al proyecto, solicitar acceso al administrador del proyecto.

### Políticas RLS activas
Las siguientes políticas están configuradas en el proyecto:

| Tabla | Política |
|---|---|
| `users` | `SELECT` solo del propio usuario (`auth.uid() = id`) |
| `leagues` | `SELECT` para cualquier usuario autenticado · `INSERT` solo si `creator_id = auth.uid()` |
| `league_participants` | `SELECT` para cualquier usuario autenticado · `INSERT` solo si `user_id = auth.uid()` |

> **Permisos de schema:** Se han concedido `GRANT USAGE ON SCHEMA public` y `GRANT ALL ON ALL TABLES` a los roles `anon` y `authenticated`. Sin esto las consultas devuelven 403.

### Trigger activo
`handle_new_user` — al registrarse un usuario en Auth, inserta automáticamente una fila en `public.users`.

### Storage
Bucket `block-photos` creado con política de lectura pública (para la Fase 4).

---

## 🧰 Scripts disponibles

| Comando | Descripción |
|---|---|
| `npx expo start --web --offline --clear` | Arranca en web con caché limpia |
| `npx expo start --offline` | Arranca para móvil (escanear QR con Expo Go) |
| `npm run lint` | Analiza el código con ESLint |
| `npm run lint:fix` | Corrige automáticamente los errores de lint |
| `npm run format` | Formatea el código con Prettier |
| `npm run types:gen` | ⚡ Regenera los tipos TypeScript desde la BD de Supabase |

> **`npm run types:gen`** — Ejecútalo cada vez que hagas cambios en el schema de Supabase para mantener los tipos sincronizados. Requiere `npx supabase login` previo.

---

## 🌿 Ramas de trabajo

| Rama | Descripción |
|---|---|
| `main` | Rama principal — código estable |
| `feature/fase-1` | Supabase setup (completada, mergeada) |
| `feature/fase-2` | Autenticación (completada) |
| `feature/fase-3` | Liguillas (completada) |
| `feature/fase-4` | Bloques (próxima) |

---

## 📈 Métricas de éxito

- Nº de liguillas creadas
- Nº medio de participantes por liguilla
- % de bloques registrados
- Repetición de uso (usuarios que crean más de una liguilla)

---

## 💡 Principios del producto

> El juego está por encima de la precisión. Reglas simples > justicia perfecta. Privado y humano antes que social y público.