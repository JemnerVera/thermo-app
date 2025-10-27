# 🔄 Migración de Data: `public` → `thermo`

## 📊 Análisis de Datos de `public.zona`

### Patrones Identificados en los 82 registros:

```
tunel{N}-{tipo}          → 56 registros (túneles 1-14, cada uno con ambiental1, pulpa1, pulpa2)
pasillo{N}-ambiental1    → 2 registros (pasillo1, pasillo2)
proceso1-ambiental{N}    → 4 registros (proceso1 con ambiental1/2/3/4)
almacenamiento1-ambiental{N} → 2 registros (almacenamiento1 con ambiental1/2)
embarque1-ambiental{N}   → 2 registros (embarque1 con ambiental1/2)
{lugar}{N}-setpoint      → 2 registros (tunel1-setpoint, fruta1-setpoint)
pid{N}-estado            → 14 registros (pid1 a pid14)
ventilador{N}-estado     → 14 registros (ventilador1 a ventilador14)
```

---

## 🏗️ Mapeo: `public` → `thermo.entidad`

Analizando los prefijos, las **entidades** (zonas funcionales) que necesitamos crear son:

| Entidad (zona funcional) | Cantidad de sensores | Ejemplos de `public.zona` |
|--------------------------|---------------------|---------------------------|
| **Túnel**                | 56                  | `tunel1-ambiental1`, `tunel2-pulpa1`, `tunel14-pulpa2` |
| **Pasillo**              | 2                   | `pasillo1-ambiental1`, `pasillo2-ambiental1` |
| **Proceso**              | 4                   | `proceso1-ambiental1/2/3/4` |
| **Almacenamiento**       | 2                   | `almacenamiento1-ambiental1/2` |
| **Embarque**             | 2                   | `embarque1-ambiental1/2` |
| **Setpoint**             | 2                   | `tunel1-setpoint`, `fruta1-setpoint` |
| **PID**                  | 14                  | `pid1-estado` a `pid14-estado` |
| **Ventilador**           | 14                  | `ventilador1-estado` a `ventilador14-estado` |

**Total: 8 entidades diferentes**

---

## ✅ SQL para `thermo.entidad`

```sql
-- Paso 1: Crear las entidades (zonas funcionales)
INSERT INTO thermo.entidad (entidad, statusid, usercreatedid, usermodifiedid)
VALUES 
  ('Túnel', 1, 1, 1),           -- entidadid = 1 (o 2 si ya existe UVA)
  ('Pasillo', 1, 1, 1),          -- entidadid = 2 (o 3)
  ('Proceso', 1, 1, 1),          -- entidadid = 3 (o 4)
  ('Almacenamiento', 1, 1, 1),   -- entidadid = 4 (o 5)
  ('Embarque', 1, 1, 1),         -- entidadid = 5 (o 6)
  ('Setpoint', 1, 1, 1),         -- entidadid = 6 (o 7)
  ('PID', 1, 1, 1),              -- entidadid = 7 (o 8)
  ('Ventilador', 1, 1, 1);       -- entidadid = 8 (o 9)
```

---

## 🔄 Plan de Migración Completo

### Orden de ejecución:

1. ✅ **País** → `INSERT INTO thermo.pais` (Perú)
2. ✅ **Empresa** → `INSERT INTO thermo.empresa` (Agrícola Andrea S.A.C.)
3. ✅ **Fundo** → `INSERT INTO thermo.fundo` (ZOE, Valerie - basado en `public.fundo`)
4. ✅ **Ubicación** → `INSERT INTO thermo.ubicacion` (Arándanos Planta 1, Uvas, etc.)
5. ✅ **Entidad** → `INSERT INTO thermo.entidad` (Túnel, PID, Ventilador, etc.)
6. 🔄 **Localización** → `INSERT INTO thermo.localizacion` (Túnel 1, Túnel 2, etc.)
7. 🔄 **Tipo** → `INSERT INTO thermo.tipo` (Sensor Temperatura, Sensor PID, etc.)
8. 🔄 **Métrica** → `INSERT INTO thermo.metrica` (Temperatura Ambiental, Temperatura Pulpa, Estado)
9. 🔄 **Sensor** → `INSERT INTO thermo.sensor` (mapeo directo desde `public.zona.nombre`)
10. 🔄 **Métrica-Sensor** → `INSERT INTO thermo.metricasensor` (relación sensor-métrica)
11. 🔄 **Localización-Sensor** → `INSERT INTO thermo.localizacionsensor` (sensor en localización con métrica)
12. 🔄 **Mediciones** → `INSERT INTO thermo.medicion` (migración de `public."temperatura-zona"` - a cargo del DBA)

---

## 📋 Tabla de Mapeo: `public.zona` → `thermo.entidad`

| Patrón en `public.zona.nombre` | `thermo.entidad` | `thermo.localizacion` | Ejemplo |
|--------------------------------|------------------|-----------------------|---------|
| `tunel1-*`, `tunel2-*`, ... | Túnel | Túnel 1, Túnel 2, ... | `tunel1-ambiental1` |
| `pasillo1-*`, `pasillo2-*` | Pasillo | Pasillo 1, Pasillo 2 | `pasillo1-ambiental1` |
| `proceso1-ambiental{N}` | Proceso | Proceso 1 | `proceso1-ambiental1` |
| `almacenamiento1-*` | Almacenamiento | Almacenamiento 1 | `almacenamiento1-ambiental1` |
| `embarque1-*` | Embarque | Embarque 1 | `embarque1-ambiental1` |
| `*-setpoint` | Setpoint | Túnel 1, Fruta 1 | `tunel1-setpoint` |
| `pid{N}-estado` | PID | PID 1, PID 2, ... | `pid1-estado` |
| `ventilador{N}-estado` | Ventilador | Ventilador 1, Ventilador 2, ... | `ventilador1-estado` |

---

## 🎯 Decisión: ¿Qué hacer con "UVA"?

Actualmente en `thermo.entidad`:
```json
{"entidadid":1,"entidad":"UVA","statusid":1}
```

### Opciones:

**A) Eliminar "UVA"** (más limpio):
```sql
DELETE FROM thermo.entidad WHERE entidadid = 1 AND entidad = 'UVA';
-- Luego ejecutar el INSERT de las 8 entidades
```

**B) Mantener "UVA"** y agregar las demás:
```sql
-- Simplemente ejecutar el INSERT, las nuevas entidades tendrán IDs 2-9
```

**C) Renombrar "UVA"** a "Túnel":
```sql
UPDATE thermo.entidad 
SET entidad = 'Túnel', usermodifiedid = 1, datemodified = NOW()
WHERE entidadid = 1 AND entidad = 'UVA';
-- Luego insertar las otras 7 entidades
```

---

## 📌 Recomendación

**Opción A (eliminar "UVA")** es la más limpia, ya que:
- No es un concepto usado en Thermos
- Las entidades en Thermos son zonas funcionales, no cultivos
- Evita confusión futura

---

## 🚀 Script SQL Creado

✅ **Archivo:** `sql/migrate_entidades.sql`

**Instrucciones:**
1. Abrir el archivo `sql/migrate_entidades.sql`
2. Ejecutar el paso 1 (verificar entidades existentes - debe mostrar "UVA")
3. Ejecutar el paso 2 (INSERT de las 8 nuevas entidades)
4. Ejecutar el paso 3 (verificar resultados - debe mostrar 9 entidades total)

**Resultado esperado:** 
- **UVA** (entidadid=1) - se mantiene
- **Túnel** hasta **Fruta** (entidadid=2 a 9) - nuevas

**Nota:** "UVA" se mantiene por decisión de usuario de mayor rango. Las 8 nuevas entidades se usarán para la migración de `public.zona`.

---

## 📊 Análisis de Localizaciones desde `public.zona`

### Resultados del Query 1: Conteo por Localización

**Total de localizaciones únicas: 49**

| Tipo | Cantidad | Sensores por ubicación |
|------|----------|------------------------|
| Túneles | 14 | tunel1 (4), tunel2-14 (3 cada uno) |
| PIDs | 14 | 1 sensor por cada PID |
| Ventiladores | 14 | 1 sensor por cada ventilador |
| Pasillos | 2 | 1 sensor por pasillo |
| Proceso | 1 | 4 sensores |
| Almacenamiento | 1 | 2 sensores |
| Embarque | 1 | 2 sensores |
| Fruta | 1 | 1 sensor |

**Total: 49 localizaciones físicas → 82 sensores**

### Desglose Detallado:

#### 🔵 Túneles (14 localizaciones, 45 sensores)
- **Túnel 1:** 4 sensores (ambiental1, pulpa1, pulpa2, setpoint)
- **Túneles 2-14:** 3 sensores cada uno (ambiental1, pulpa1, pulpa2)

#### 🔴 PIDs (14 localizaciones, 14 sensores)
- pid1-estado, pid2-estado, ... pid14-estado

#### 🟢 Ventiladores (14 localizaciones, 14 sensores)
- ventilador1-estado, ventilador2-estado, ... ventilador14-estado

#### 🟡 Otras Zonas (7 localizaciones, 13 sensores)
- **Pasillo 1:** pasillo1-ambiental1
- **Pasillo 2:** pasillo2-ambiental1
- **Proceso 1:** proceso1-ambiental1/2/3/4
- **Almacenamiento 1:** almacenamiento1-ambiental1/2
- **Embarque 1:** embarque1-ambiental1/2
- **Fruta 1:** fruta1-setpoint

---

## 🎯 Plan de Migración Detallado

### Paso 1: ✅ Ubicación Verificada

**Resultado:**
- `ubicacionid` = 1
- `fundoid` = 2 (ZOE)
- `ubicacion` = "JAYANCA-CHICLAYO"

Se usará `ubicacionid=1` para todas las localizaciones.

### Paso 2: ✅ Crear Localizaciones (49 registros)

**Script:** `sql/migrate_localizaciones.sql`

**⚠️ Nota:** Existe una localización previa creada por el supervisor:
- `localizacionid=1` → "PACKING_UVA" (entidad: UVA)
- **Se mantendrá** por respeto a la jerarquía
- Las 49 nuevas localizaciones comenzarán desde `localizacionid=2`

**Instrucciones:**
1. Abrir el archivo `sql/migrate_localizaciones.sql`
2. Ejecutar el query de verificación de localizaciones existentes
3. Ejecutar los INSERTs en orden (Túneles, PIDs, Ventiladores, etc.)
4. Ejecutar los queries de verificación al final

**Resultado esperado:** 50 localizaciones totales (1 existente + 49 nuevas)

**Mapeo Entidad → Localización:**

| `public.zona` prefix | `thermo.entidad` | `thermo.localizacion` |
|---------------------|------------------|-----------------------|
| tunel1, tunel2, ... tunel14 | Túnel (entidadid=2) | Túnel 1, Túnel 2, ... Túnel 14 |
| pid1, pid2, ... pid14 | PID (entidadid=3) | PID 1, PID 2, ... PID 14 |
| ventilador1, ... ventilador14 | Ventilador (entidadid=4) | Ventilador 1, ... Ventilador 14 |
| pasillo1, pasillo2 | Pasillo (entidadid=5) | Pasillo 1, Pasillo 2 |
| proceso1 | Proceso (entidadid=6) | Proceso 1 |
| almacenamiento1 | Almacenamiento (entidadid=7) | Almacenamiento 1 |
| embarque1 | Embarque (entidadid=8) | Embarque 1 |
| fruta1 | Fruta (entidadid=9) | Fruta 1 |

### Paso 3: ✅ Crear Tipos de Sensores (5 registros)

**Script:** `sql/migrate_tipos_metricas.sql`

**Instrucciones:**
1. Abrir el archivo `sql/migrate_tipos_metricas.sql`
2. Ejecutar el PASO 1 (INSERT de tipos)
3. Ejecutar el query de verificación de tipos

**Resultado esperado:** 5 tipos creados

| tipoid | tipo |
|--------|------|
| 1 | Temperatura Ambiental |
| 2 | Temperatura Pulpa |
| 3 | Estado PID |
| 4 | Estado Ventilador |
| 5 | Setpoint |

---

### Paso 4: ✅ Verificar Métrica Existente

**Script:** `sql/migrate_tipos_metricas.sql` (mismo archivo, PASO 2)

**⚠️ Importante:** La métrica "Temperatura" (metricaid=2) **ya existe** (creada por el supervisor).

**Instrucciones:**
1. Continuar en el mismo archivo
2. Ejecutar el PASO 2 (SELECT de verificación)
3. Confirmar que existe `metricaid=2` → "Temperatura" (°C)

**Resultado esperado:** 1 métrica existente

| metricaid | metrica | unidad |
|-----------|---------|--------|
| 2 | Temperatura | °C |

**⚠️ Aclaración Crítica:**
- **TODOS los 82 sensores** de `public.zona` miden **temperatura**
- `public."temperatura-zona"` solo almacena valores de temperatura
- Los **tipos** (tipoid) diferencian **dónde** o **qué tipo de sensor**, pero **todos reportan temperatura**

---

### Paso 5: ✅ Crear Sensores (82 registros)

**Script:** `sql/migrate_sensores.sql`

**Instrucciones:**
1. Abrir el archivo `sql/migrate_sensores.sql`
2. Ejecutar todos los INSERTs en orden
3. Ejecutar los queries de verificación al final

**Resultado esperado:** 82 sensores creados

**Distribución:**
- Temperatura Ambiental: 26 sensores
- Temperatura Pulpa: 28 sensores
- Estado PID: 14 sensores
- Estado Ventilador: 14 sensores
- Setpoint: 2 sensores (tunel1-setpoint, fruta1-setpoint)

**⚠️ Nota:** Todos estos sensores miden la **misma métrica** (Temperatura, metricaid=2)

---

### Paso 6: 🔄 Crear Métrica-Sensor (82 registros) - PENDIENTE

Relación `thermo.metricasensor (sensorid, metricaid)`:
- Sensores de temperatura → metricaid=1
- Sensores de PID → metricaid=2
- Sensores de ventilador → metricaid=3

### Paso 7: Crear Localización-Sensor (82 registros)

`thermo.localizacionsensor` relaciona:
- Localización física (ej: Túnel 1)
- Sensor específico (ej: tunel1-ambiental1)
- Métrica medida (ej: Temperatura)

**Ejemplo:**
```
localizacionid=1 (Túnel 1) + sensorid=1 (tunel1-ambiental1) + metricaid=1 (Temperatura)
→ localizacionsensor = "Túnel 1 - Temperatura Ambiental"
```

---

## 🔍 Observación Crítica: Túnel 1 tiene Setpoint

**Túnel 1 es especial:**
- Tiene **4 sensores** (el único túnel con setpoint)
- Túneles 2-14 solo tienen **3 sensores** cada uno

**Decisión:** El setpoint es un parámetro de configuración, no un sensor de medición continua. 

¿Debe estar en `thermo.sensor` o en `thermo.umbral` como valor objetivo?

---

## 📋 Resumen de Conteos

| Tabla | Cantidad |
|-------|----------|
| `thermo.entidad` | 9 (1 existente + 8 nuevas) |
| `thermo.ubicacion` | 1 (Planta 1 - Arándanos) |
| `thermo.localizacion` | 49 |
| `thermo.tipo` | 5 |
| `thermo.metrica` | 3 |
| `thermo.sensor` | 82 |
| `thermo.metricasensor` | 82 |
| `thermo.localizacionsensor` | 82 |

**Total de registros a insertar: ~313**
