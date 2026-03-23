# 🚀 V3 – Monetización y Control de Acceso (B2C + B2B)

## 1. Objetivo de la V3

Introducir un sistema de **suscripción (premium)** que:

- Diferencie usuarios gratuitos vs suscritos
- Limite funcionalidades clave para incentivar conversión
- Habilite un modelo SaaS claro para rocódromos (B2B)

---

## 2. Tipos de usuario

### 2.1 Usuario B2C (escalador)

- FREE (no suscrito)
- PREMIUM (suscrito)

---

### 2.2 Usuario B2B (rocódromo)

- Siempre requiere suscripción
- Acceso a dashboard profesional
- Periodo de prueba inicial

---

## 3. Reglas de negocio – B2C

### 3.1 Creación de liguillas

#### FREE
- Máximo: **1 liguilla al mes**

#### PREMIUM
- Ilimitadas

---

### 3.2 Número de bloques por liguilla

#### FREE
- Máximo: **10 bloques**

#### PREMIUM
- Sin límite

---

### 3.3 Edición de liguillas

#### FREE
- ❌ No puede modificar:
  - Datos de la liguilla
  - Bloques
- Restricción aplicada una vez iniciada

#### PREMIUM
- ✅ Puede editar en cualquier momento

---

### 3.4 Persistencia de datos

#### FREE
- Acceso a:
  - Ranking
  - Liguilla
  - Bloques
- Solo durante **10 días tras finalización**

#### PREMIUM
- Acceso ilimitado al histórico

---

### 3.5 Participantes

#### FREE
- Máximo: **10 participantes**
- ❌ No puede crear liguillas públicas

#### PREMIUM
- Participantes ilimitados
- ✅ Puede crear liguillas públicas

---

## 4. Reglas de negocio – B2B

### 4.1 Suscripción obligatoria

- No existe versión gratuita
- Acceso completo solo mediante suscripción

---

### 4.2 Periodo de prueba

- Duración: **10 días**
- Acceso completo a:
  - Dashboard
  - Gestión de bloques
  - Liguillas oficiales

---

### 4.3 Post trial

- Si no se suscribe:
  - ❌ Acceso bloqueado
  - Datos conservados (no eliminados)

---

## 5. Modelo de datos (conceptual)

### 5.1 Subscription

```
Subscription
- id
- user_id / gym_id
- type (B2C / B2B)
- plan (FREE / PREMIUM / TRIAL)
- start_date
- end_date
- status (ACTIVE / EXPIRED / CANCELLED)
```

---

### 5.2 Feature Flags

Sistema para controlar acceso:

```
FeatureAccess
- can_create_league
- max_leagues_per_month
- max_blocks_per_league
- can_edit_league
- max_participants
- can_create_public_league
- data_retention_days
```

---

## 6. Lógica de validación (backend)

### 6.1 Crear liguilla

Checks:
- nº liguillas creadas en el mes
- tipo de suscripción
- límite de bloques
- límite de participantes

---

### 6.2 Editar liguilla

Checks:
- si está iniciada
- si usuario es premium

---

### 6.3 Acceso a datos

Checks:
- fecha de finalización
- días transcurridos
- tipo de suscripción

---

## 7. Casos de uso

### Caso 1 – Usuario FREE

- Crea 1 liguilla
- Añade 10 bloques
- Invita 10 amigos
- No puede editar tras inicio
- Pierde acceso a los 10 días

---

### Caso 2 – Usuario PREMIUM

- Crea múltiples liguillas
- Sin límite de bloques
- Puede editar en cualquier momento
- Historial completo

---

### Caso 3 – Rocódromo (B2B)

- Trial 10 días
- Acceso completo
- Tras trial:
  - requiere suscripción activa

---

## 8. Tareas para implementación

### 8.1 Backend

- Crear modelo Subscription
- Middleware de validación por plan
- Lógica de límites (liguillas, bloques, participantes)
- Sistema de expiración de datos

---

### 8.2 Frontend

- Mostrar límites según plan
- Pantallas de upgrade a premium
- Mensajes de error claros:
  - “Has alcanzado el límite mensual”
  - “Disponible en versión premium”

---

### 8.3 Billing

- Integrar sistema de pagos (Stripe recomendado)
- Gestión de:
  - suscripción activa
  - cancelaciones
  - trial

---

### 8.4 Cron jobs / tareas programadas

- Expirar acceso a liguillas (FREE)
- Control de trial B2B
- Limpieza lógica (no borrado físico)

---

## 9. Métricas clave

- % conversión FREE → PREMIUM
- Nº liguillas creadas (free vs premium)
- Retención tras limitaciones
- Uso del trial B2B → conversión

---

## 🔚 Resumen

La V3 introduce:

- Monetización clara
- Límites estratégicos sin romper la experiencia
- Diferenciación B2C / B2B
- Base para escalabilidad del producto
