# 🚀 V2 – Plataforma de Escalada Indoor (Tracking + Social + B2B)

## 1. Visión general

La V2 transforma la aplicación en una **plataforma completa para escalada indoor**, donde:

- Los usuarios registran y siguen su progreso en bloques reales
- Se genera una capa social ligera entre escaladores
- Los rocódromos obtienen métricas y feedback accionable
- Las liguillas (V1) se integran sobre datos existentes

---

## 2. Principios de producto

- ⚡ Interacciones rápidas (≤ 5 segundos)
- 🧱 El bloque es la entidad central
- 🔁 Fuente única de verdad (no duplicar datos)
- 🎮 Gamificación ligera, no intrusiva
- 🏢 Valor B2B como diferenciador clave

---

## 3. Arquitectura conceptual

### Entidades principales

```
Gym (Rocódromo)
 ├── Blocks (globales)
 │    ├── Attempts (usuarios)
 │    ├── Ratings (estrellas)
 │    └── Comments
 │
 ├── Leagues (liguillas)
 │    └── Referencias a Blocks (NO copia)
 │
 └── Dashboard (analytics)

User
 ├── Attempts
 ├── Achievements (medallas)
 ├── Friends
 └── Activity Feed
```

---

## 4. Tracking continuo por rocódromo (core)

### Concepto

Cada rocódromo tiene un listado de:

> **Bloques activos recientes**

Los usuarios pueden interactuar con estos bloques sin necesidad de liguillas.

---

### 4.1 Modelo de Block

Campos:

- id
- gym_id
- name / color / sector
- image_url
- difficulty (enum):
  - NOVATO
  - MEDIO
  - AVANZADO
  - EXPERIMENTADO
  - PROFESIONAL
- created_at
- is_active (boolean)

---

### 4.2 Modelo de Attempt

Campos:

- id
- user_id
- block_id
- attempts_count (int)
- result (enum):
  - FLASH
  - COMPLETED
  - NOT_COMPLETED
- created_at

---

### 4.3 Lógica de resultado

- Solo cuenta el **mejor intento por usuario y bloque**
- No se acumulan intentos históricos

---

## 5. Sistema de puntuación

### 5.1 Puntos base

| Resultado | Puntos |
|----------|--------|
| Flash | 10 |
| 2 pegues | 5 |
| 3 pegues | 4 |
| 4 pegues | 3 |
| 5 pegues | 2 |
| +5 pegues / no encadenado | 1 |
| No intentado | 0 |

---

### 5.2 Bonus por dificultad

| Dificultad | Bonus |
|------------|-------|
| Novato | +0 |
| Medio | +1 |
| Avanzado | +2 |
| Experimentado | +3 |
| Profesional | +4 |

---

### 5.3 Fórmula final

```
score = base_points + difficulty_bonus
```

---

## 6. Rankings

### 6.1 Ranking por bloque

- Usuarios ordenados por:
  - Mejor resultado
  - Menor nº de intentos

---

### 6.2 Ranking por rocódromo

- Score total acumulado
- Rankings:
  - Global
  - Mensual
  - Semanal

---

## 7. Sistema de medallas (Achievements)

### 7.1 Tipos

#### Progreso
- 10 bloques completados
- 50 bloques
- 100 bloques

#### Dificultad
- 10 bloques Avanzado
- 5 bloques Profesional

#### Rendimiento
- Más flashes en un mes
- Mejor ratio de encadenes

#### Actividad
- X días activos al mes

---

### 7.2 Modelo

```
Achievement
- id
- type
- condition
- user_id
- achieved_at
```

---

## 8. Sistema de valoración de bloques

### 8.1 Rating (estrellas)

- Rango: 0–5
- Media calculada por bloque

---

### 8.2 Comentarios

- Texto corto
- Asociado a block_id + user_id

---

## 9. Capa social

### 9.1 Sistema de amigos

```
Friendship
- user_id
- friend_id
- status (pending / accepted)
```

---

### 9.2 Feed de actividad

Eventos:

- Usuario encadena bloque
- Usuario obtiene medalla

Interacciones:

- Like
- Comentario

---

### 9.3 Reglas

- Feed cronológico
- Sin algoritmo complejo
- Sin followers públicos masivos

---

## 10. Liguillas (integración V1)

### 10.1 Concepto clave

> Las liguillas reutilizan bloques existentes del rocódromo

---

### 10.2 Modelo League

```
League
- id
- gym_id
- name
- start_date
- end_date
- max_participants
- reward (string)
```

---

### 10.3 Relación League–Blocks

```
LeagueBlock
- league_id
- block_id
```

✔️ IMPORTANTE:
- No se duplican bloques
- Solo referencias

---

### 10.4 Flujo de creación

1. Crear liguilla
2. Seleccionar bloques existentes:
   - manual
   - por filtro (fecha, dificultad)
3. Invitar usuarios

---

## 11. Dashboard para rocódromos (B2B)

### 11.1 Funcionalidades

#### Análisis por bloque
- Nº intentos
- % encadenes
- Media de estrellas
- Comentarios

#### Distribución de dificultad
- Real vs esperada

#### Popularidad
- Bloques más/menos escalados

#### Insights
- Bloques frustrantes
- Bloques mejor valorados

---

### 11.2 Perfil profesional

- Gestión de bloques
- Visualización de rankings
- Creación de liguillas oficiales

---

## 12. Gestión del ciclo de vida de bloques

### Estados

- Activo
- Inactivo

---

### Reglas

- Bloques eliminados → pasan a inactivos
- Siguen visibles en:
  - historial
  - liguillas pasadas

---

## 13. Monetización

### Usuarios
- Gratis

---

### Rocódromos
- Suscripción mensual:
  - acceso a dashboard
  - herramientas profesionales

---

### Publicidad

- Banners no intrusivos en:
  - ranking
  - resultados
- Contextual (local)

---

## 14. Métricas clave

- Nº de bloques registrados por usuario
- Nº de intentos por bloque
- Retención semanal
- Nº de liguillas creadas
- Participación en liguillas
- Uso del dashboard (B2B)

---

## 15. Riesgos

- Complejidad excesiva
- Derivar en red social genérica
- Falta de adopción inicial

---

## 16. Roadmap sugerido

### Fase 1
- Tracking de bloques
- Registro de intentos
- Ranking básico

### Fase 2
- Medallas
- Valoraciones
- Comentarios

### Fase 3
- Liguillas reutilizando bloques

### Fase 4
- Social (amigos + feed)

### Fase 5
- Dashboard B2B

---

## 🔚 Resumen

La V2 define un sistema donde:

- El **bloque es la unidad central**
- El usuario **registra, compite y progresa**
- El rocódromo **analiza y mejora**
- Las liguillas son **una capa adicional, no el core**
