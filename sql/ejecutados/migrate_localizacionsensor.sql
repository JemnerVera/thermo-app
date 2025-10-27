-- ============================================================================
-- MIGRACIÓN: Crear relaciones Localización-Sensor en thermo.localizacionsensor
-- ============================================================================
-- Descripción: Relaciona los 88 sensores con sus localizaciones y métricas
-- Prerequisito: Localizaciones, sensores, métricas y metricasensor ya creados
-- Nota: Existe 1 registro incorrecto del supervisor que será eliminado y recreado
-- Fecha: 2025-10-27
-- ============================================================================

-- Verificar datos existentes
SELECT COUNT(*) AS total_localizaciones FROM thermo.localizacion WHERE statusid = 1;
-- Esperado: 50 localizaciones (1 del supervisor + 49 de migración)

SELECT COUNT(*) AS total_sensores FROM thermo.sensor WHERE statusid = 1;
-- Esperado: 88 sensores activos

SELECT COUNT(*) AS total_metricasensor FROM thermo.metricasensor WHERE statusid = 1;
-- Esperado: 88 relaciones

-- Verificar registros existentes en localizacionsensor (puede haber 1 incorrecto)
SELECT * FROM thermo.localizacionsensor WHERE statusid = 1;
-- Si existe: localizacionsensorid=1, sensorid=1, localizacionid=1 (INCORRECTO)

-- Verificar si hay mediciones referenciando localizacionsensorid=1
SELECT * FROM thermo.medicion WHERE localizacionsensorid = 1;
-- Si existen mediciones, NO podemos eliminar el registro, debemos corregirlo

-- ============================================================================
-- PASO 0: Corregir el registro incorrecto del supervisor
-- ============================================================================
-- El supervisor relacionó tunel1_ambiente1 con PACKING_UVA (localizacionid=1)
-- Esto es incorrecto. Debe estar en "Túnel 1" (localizacionid=2)
-- No podemos eliminarlo porque hay mediciones que lo referencian (FK constraint)
-- Solución: ACTUALIZAR el registro existente

UPDATE thermo.localizacionsensor
SET 
  localizacionid = 2,  -- Cambiar de PACKING_UVA (1) a Túnel 1 (2)
  localizacionsensor = 'Túnel 1 - tunel1_ambiente1',  -- Nombre descriptivo correcto
  usermodifiedid = 1,
  datemodified = NOW()
WHERE localizacionsensorid = 1 
  AND sensorid = 1 
  AND localizacionid = 1;

-- Verificar que se corrigió
SELECT * FROM thermo.localizacionsensor WHERE localizacionsensorid = 1;
-- Esperado: localizacionid=2 (Túnel 1), localizacionsensor='Túnel 1 - tunel1_ambiente1'

-- ============================================================================
-- MAPEO: public.zona → thermo.localizacion
-- ============================================================================
-- El nombre del sensor indica su localización:
--   tunel1_ambiental1    → localizacionid de "Túnel 1"
--   tunel2_pulpa1        → localizacionid de "Túnel 2"
--   pid5_estado          → localizacionid de "PID 5"
--   ventilador3_estado   → localizacionid de "Ventilador 3"
--   pasillo1_ambiental1  → localizacionid de "Pasillo 1"
--   proceso1_ambiental2  → localizacionid de "Proceso 1"
--   almacenamiento1_ambiental1 → localizacionid de "Almacenamiento 1"
--   embarque1_ambiental1 → localizacionid de "Embarque 1"
--   fruta1_setpoint      → localizacionid de "Fruta 1"
--
-- El patrón es extraer el prefijo antes del "_" y mapearlo a la localización
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear función helper para extraer la localización del nombre del sensor
-- ============================================================================

CREATE OR REPLACE FUNCTION get_localizacion_from_sensor_name(sensor_name TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  numero TEXT;
  entidad_name TEXT;
BEGIN
  -- Extraer el prefijo antes del primer "_"
  -- Ejemplos: 
  --   tunel1 → Túnel 1
  --   pid5 → PID 5
  --   ventilador12 → Ventilador 12
  --   pasillo1 → Pasillo 1
  --   proceso1 → Proceso 1
  --   almacenamiento1 → Almacenamiento 1
  --   embarque1 → Embarque 1
  --   fruta1 → Fruta 1
  
  prefix := SPLIT_PART(sensor_name, '_', 1);
  
  -- Casos especiales
  IF prefix LIKE 'tunel%' THEN
    numero := SUBSTRING(prefix FROM 'tunel(.*)');
    RETURN 'Túnel ' || numero;
  ELSIF prefix LIKE 'pid%' THEN
    numero := SUBSTRING(prefix FROM 'pid(.*)');
    RETURN 'PID ' || numero;
  ELSIF prefix LIKE 'ventilador%' THEN
    numero := SUBSTRING(prefix FROM 'ventilador(.*)');
    RETURN 'Ventilador ' || numero;
  ELSIF prefix LIKE 'pasillo%' THEN
    numero := SUBSTRING(prefix FROM 'pasillo(.*)');
    RETURN 'Pasillo ' || numero;
  ELSIF prefix LIKE 'proceso%' THEN
    numero := SUBSTRING(prefix FROM 'proceso(.*)');
    RETURN 'Proceso ' || numero;
  ELSIF prefix LIKE 'almacenamiento%' THEN
    numero := SUBSTRING(prefix FROM 'almacenamiento(.*)');
    RETURN 'Almacenamiento ' || numero;
  ELSIF prefix LIKE 'embarque%' THEN
    numero := SUBSTRING(prefix FROM 'embarque(.*)');
    RETURN 'Embarque ' || numero;
  ELSIF prefix LIKE 'fruta%' THEN
    numero := SUBSTRING(prefix FROM 'fruta(.*)');
    RETURN 'Fruta ' || numero;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PASO 2: Insertar relaciones Localización-Sensor-Métrica
-- ============================================================================
-- Nota: Usamos NOT EXISTS para evitar duplicar sensorid=1 (ya corregido en PASO 0)

INSERT INTO thermo.localizacionsensor (
  localizacionid,
  sensorid,
  metricaid,
  localizacionsensor,
  statusid,
  usercreatedid,
  usermodifiedid
)
SELECT 
  l.localizacionid,
  s.sensorid,
  2 AS metricaid,  -- Temperatura
  l.localizacion || ' - ' || s.sensor AS localizacionsensor,
  1 AS statusid,
  1 AS usercreatedid,
  1 AS usermodifiedid
FROM thermo.sensor s
JOIN thermo.localizacion l ON l.localizacion = get_localizacion_from_sensor_name(s.sensor)
WHERE s.statusid = 1
  AND l.statusid = 1
  AND NOT EXISTS (
    SELECT 1 
    FROM thermo.localizacionsensor ls 
    WHERE ls.sensorid = s.sensorid 
      AND ls.statusid = 1
  )
ORDER BY l.localizacionid, s.sensorid;

-- ============================================================================
-- PASO 3: Eliminar función helper (limpieza)
-- ============================================================================

DROP FUNCTION IF EXISTS get_localizacion_from_sensor_name(TEXT);

-- ============================================================================
-- VERIFICAR RESULTADOS
-- ============================================================================

-- Contar relaciones creadas
SELECT COUNT(*) AS total_localizacionsensor
FROM thermo.localizacionsensor
WHERE statusid = 1;

-- Ver todas las relaciones
SELECT 
  ls.localizacionsensorid,
  l.localizacion,
  s.sensor,
  m.metrica,
  ls.localizacionsensor,
  ls.statusid,
  ls.datecreated
FROM thermo.localizacionsensor ls
JOIN thermo.localizacion l ON ls.localizacionid = l.localizacionid
JOIN thermo.sensor s ON ls.sensorid = s.sensorid
JOIN thermo.metrica m ON ls.metricaid = m.metricaid
ORDER BY l.localizacion, s.sensor;

-- Verificar que todos los sensores tienen su localización
SELECT 
  s.sensorid,
  s.sensor,
  CASE WHEN ls.localizacionsensorid IS NULL THEN 'SIN LOCALIZACIÓN' ELSE 'OK' END AS estado
FROM thermo.sensor s
LEFT JOIN thermo.localizacionsensor ls ON s.sensorid = ls.sensorid AND ls.statusid = 1
WHERE s.statusid = 1
ORDER BY s.sensor;

-- Contar sensores por localización
SELECT 
  l.localizacion,
  COUNT(ls.localizacionsensorid) AS cantidad_sensores
FROM thermo.localizacion l
LEFT JOIN thermo.localizacionsensor ls ON l.localizacionid = ls.localizacionid AND ls.statusid = 1
WHERE l.statusid = 1
GROUP BY l.localizacionid, l.localizacion
ORDER BY l.localizacion;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- total_localizacionsensor: 88
-- estado: Todos los 88 sensores deben tener estado = 'OK'
--
-- Distribución por localización:
-- - Túnel 1: 7 sensores (ambiente1, pulpa1-5, setpoint)
-- - Túneles 2-14: 3 sensores cada uno (ambiental1, pulpa1, pulpa2)
-- - PIDs 1-14: 1 sensor cada uno (estado)
-- - Ventiladores 1-14: 1 sensor cada uno (estado)
-- - Pasillos 1-2: 1 sensor cada uno (ambiental1)
-- - Proceso 1: 4 sensores (ambiental1-4)
-- - Almacenamiento 1: 2 sensores (ambiental1-2)
-- - Embarque 1: 2 sensores (ambiental1-2)
-- - Fruta 1: 1 sensor (setpoint)
-- - PACKING_UVA: 0 sensores (del supervisor, sin datos en public)
--
-- TOTAL: 88 sensores correctamente relacionados con sus localizaciones
-- ============================================================================

