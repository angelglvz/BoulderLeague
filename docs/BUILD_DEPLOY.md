# 🚀 Guía de Compilación y Despliegue — Climbify

> Stack: Expo SDK 55 · React Native 0.83 · EAS Build (cloud)  
> Actualizado: 2026-03-26

---

## 📋 Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Configuración inicial (solo una vez)](#2-configuración-inicial-solo-una-vez)
3. [Proceso de build APK (preview)](#3-proceso-de-build-apk-preview)
4. [Instalar el APK en el teléfono](#4-instalar-el-apk-en-el-teléfono)
5. [Build de producción (Play Store)](#5-build-de-producción-play-store)
6. [Incrementar versión antes de publicar](#6-incrementar-versión-antes-de-publicar)
7. [Solución de problemas frecuentes](#7-solución-de-problemas-frecuentes)
8. [Referencia rápida de comandos](#8-referencia-rápida-de-comandos)

---

## 1. Requisitos previos

| Herramienta | Versión mínima | Instalación |
|---|---|---|
| Node.js | ≥ 22 | https://nodejs.org |
| npm | ≥ 10 | Incluido con Node |
| Git | cualquiera | https://git-scm.com |
| Cuenta Expo | — | https://expo.dev (free) |

> ⚠️ **No necesitas Android Studio ni Java instalados localmente.** EAS compila en la nube.

---

## 2. Configuración inicial (solo una vez)

### 2.1 Instalar EAS CLI globalmente

```bash
npm install -g eas-cli
```

Verifica que está instalado:
```bash
eas --version
# eas-cli/18.x.x
```

> Si el comando `eas` no se encuentra, usa siempre `npx eas-cli` como alternativa.

### 2.2 Login en Expo

```bash
eas login
# Introduce: jasongamero / contraseña de expo.dev
```

Verifica el login:
```bash
eas whoami
# jasongamero
```

### 2.3 Clonar el repositorio e instalar dependencias

```bash
git clone <URL-del-repo>
cd BoulderLeague
npm install --legacy-peer-deps
```

> 🔑 **Importante:** siempre usa `--legacy-peer-deps`. Algunos paquetes tienen peer deps en conflicto que npm 10+ trata como errores fatales.

### 2.4 Crear el fichero de variables de entorno

Crea un fichero `.env.local` en la raíz del proyecto con:

```env
EXPO_PUBLIC_SUPABASE_URL=https://bcmlsdxvfgkxefkplosa.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key-de-supabase>
```

> Las variables `EXPO_PUBLIC_*` se incrustan en el bundle en tiempo de compilación — no contienen secretos de servidor.

---

## 3. Proceso de build APK (preview)

Este perfil genera un APK instalable directamente en cualquier Android. **No requiere Play Store.**

### 3.1 Verificar que las dependencias son compatibles

```bash
# En red con certificado corporativo (VPN/proxy):
NODE_TLS_REJECT_UNAUTHORIZED=0 npx expo install --check

# En red normal:
npx expo install --check
```

Si aparecen paquetes con versiones incorrectas, el propio comando ofrece corregirlos automáticamente (responde `y`).

### 3.2 Lanzar el build en la nube

```bash
eas build --platform android --profile preview
```

O con npx si `eas` no está en el PATH:
```bash
npx eas-cli build --platform android --profile preview
```

**Flujo esperado:**

```
✔ Detected Expo SDK: 55.0.0
✔ Using remote Android credentials (Expo manages keystore)
✔ Build queued...
Build URL: https://expo.dev/accounts/jasongamero/projects/boulder-league/builds/<id>
```

El build tarda entre **5 y 15 minutos** en la cola de EAS.

### 3.3 Descargar el APK

Una vez finalizado el build:

**Opción A — Desde el navegador:**
1. Ve a https://expo.dev/accounts/jasongamero/projects/boulder-league/builds
2. Abre el último build
3. Pulsa **"Download"**

**Opción B — Desde terminal (el comando imprime la URL al terminar):**
```bash
# EAS imprime la URL de descarga al finalizar el build
# También puedes listar los últimos builds:
eas build:list --platform android --limit 1
```

---

## 4. Instalar el APK en el teléfono

### 4.1 Transferir el APK al teléfono

**Método más rápido — QR del dashboard de Expo:**
1. Abre la URL del build en expo.dev
2. Escanea el **código QR** con el móvil
3. El teléfono descargará el APK directamente

**Método alternativo — cable USB:**
1. Conecta el teléfono al PC por USB
2. Elige "Transferencia de archivos" en el teléfono
3. Copia el APK a `Descargas/` del teléfono

### 4.2 Habilitar "Fuentes desconocidas" en Android

La primera vez que instalas un APK fuera de la Play Store:

1. **Android 8+:** Ajustes → Apps → Chrome (o el gestor de archivos) → Instalar apps desconocidas → Permitir
2. **Android 7 o menor:** Ajustes → Seguridad → Fuentes desconocidas → Activar

### 4.3 Instalar

Abre el fichero `.apk` desde el gestor de ficheros y pulsa **"Instalar"**.

---

## 5. Build de producción (Play Store)

> Solo necesario si vas a publicar en Google Play.

```bash
eas build --platform android --profile production
```

Esto genera un **AAB** (Android App Bundle) optimizado para la Play Store. Requiere tener una cuenta de desarrollador en Google Play (25 USD pago único).

---

## 6. Incrementar versión antes de publicar

Edita el `app.json` antes de cada build de producción:

```json
{
  "expo": {
    "version": "1.1.0",
    "android": {
      "versionCode": 2
    }
  }
}
```

| Campo | Para qué sirve |
|---|---|
| `version` | Versión visible para el usuario ("1.0.0") |
| `versionCode` | Número interno de Android, debe incrementarse en cada build subido a Play Store |

---

## 7. Solución de problemas frecuentes

### ❌ `npm install` falla con errores de peer deps

```bash
# Siempre usar:
npm install --legacy-peer-deps
```

### ❌ `expo install --check` falla con "self-signed certificate"

Red corporativa con proxy/VPN que intercepta TLS. Usa:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx expo install --check
```

> Solo para el check local — el build en la nube no se ve afectado por esto.

### ❌ EAS Build falla con "Gradle build failed"

Causas más comunes y soluciones:

1. **Paquete nativo incompatible** — asegúrate de que `expo install --check` no da errores antes de lanzar el build.
2. **Variable de entorno faltante** — comprueba que el fichero `.env.local` está presente y correcto.
3. **Caché de EAS** — limpia la caché y reintenta:
   ```bash
   eas build --platform android --profile preview --clear-cache
   ```

### ❌ El APK instala pero la app se cierra al abrir

1. Abre los logs de EAS:
   ```bash
   eas build:view
   ```
2. Revisa si hay errores de carga de módulos JS (generalmente son imports rotos o variables de entorno no definidas).
3. En desarrollo, prueba primero con el servidor local antes del build:
   ```bash
   npx expo start --android
   ```

### ❌ `eas: command not found`

EAS CLI no está en el PATH global. Usa siempre:
```bash
npx eas-cli <comando>
```

O instala globalmente de nuevo:
```bash
npm install -g eas-cli
```

### ❌ "Your project needs to be linked" al hacer el build

```bash
eas project:init
# o
eas init
```

Esto enlaza el proyecto local con el proyecto en expo.dev. El `projectId` se guarda en `app.json → extra.eas.projectId`.

---

## 8. Referencia rápida de comandos

```bash
# ─── Setup inicial ───────────────────────────────────────────────────────────
npm install --legacy-peer-deps          # Instalar dependencias
NODE_TLS_REJECT_UNAUTHORIZED=0 \
  npx expo install --check             # Verificar compatibilidad (red con proxy)
npx expo install --check               # Verificar compatibilidad (red normal)

# ─── Login ───────────────────────────────────────────────────────────────────
eas login                              # Iniciar sesión en Expo
eas whoami                             # Verificar usuario actual

# ─── Build Android ───────────────────────────────────────────────────────────
eas build --platform android --profile preview        # APK para testers
eas build --platform android --profile production     # AAB para Play Store
eas build --platform android --profile preview \
  --clear-cache                                       # Build limpio (si hay problemas)

# ─── Gestión de builds ───────────────────────────────────────────────────────
eas build:list --platform android --limit 5          # Últimos 5 builds
eas build:view                                       # Ver detalle del último build

# ─── Desarrollo local ────────────────────────────────────────────────────────
npx expo start                         # Dev server (web + QR para móvil con Expo Go)
npx expo start --android               # Lanzar en emulador Android (requiere Android Studio)
npx expo start --web                   # Lanzar en navegador

# ─── Versiones y tipos ───────────────────────────────────────────────────────
npm run types:gen                      # Regenerar tipos TypeScript desde Supabase
```

---

## Estructura de perfiles EAS (`eas.json`)

| Perfil | Tipo | Uso |
|---|---|---|
| `preview` | APK (installable) | Testers internos, validación manual |
| `production` | AAB (Play Store bundle) | Publicación en Google Play |
| `development` | APK con dev client | Desarrollo con hot-reload en dispositivo físico |

---

## Notas de arquitectura

| Decisión | Detalle |
|---|---|
| **Keystore** | Gestionado por EAS (recomendado). Expo almacena el keystore en su infraestructura segura. |
| **Variables de entorno** | Solo `EXPO_PUBLIC_*` se incrustan en el bundle. Nunca incluir claves de servidor. |
| **Nueva Arquitectura RN** | React Native 0.83 usa la nueva arquitectura por defecto. `react-native-reanimated 4.x` es compatible. |
| **Permisos Android** | Declarados en `app.json → android.permissions` + plugin `expo-image-picker` para cámara/galería. |

