# 🧗 BoulderLeague

Aplicación lúdica y social para escalada indoor que permite crear **liguillas y retos temporales** basados en bloques reales del rocódromo. Fomenta la participación mediante pique sano, reglas simples y recompensas informales.

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
users      (id, email, nombre, ...)
leagues    (id, name, gym_id, start_date, end_date, reward, is_private, creator_id, ...)
blocks     (id, league_id, photo_url, identifier, difficulty, ...)
attempts   (id, user_id, block_id, score, number_of_goes, timestamp, ...)
```

---

## 🚀 Puesta en marcha

### Requisitos previos

- Node.js LTS
- Cuenta en [Supabase](https://supabase.com/)
- App **Expo Go** en tu móvil ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Instalación
```bash
# 1. Instalar Expo CLI
npm install -g expo-cli

# 2. Crear el proyecto
npx create-expo-app boulder-league --template

# 3. Arrancar el servidor de desarrollo
cd boulder-league
npx expo start
```

Escanea el QR con **Expo Go** y la app se ejecutará en tu móvil al instante.

---

## 📈 Métricas de éxito

- Nº de liguillas creadas
- Nº medio de participantes por liguilla
- % de bloques registrados
- Repetición de uso (usuarios que crean más de una liguilla)

---

## 💡 Principios del producto

> El juego está por encima de la precisión. Reglas simples > justicia perfecta. Privado y humano antes que social y público.