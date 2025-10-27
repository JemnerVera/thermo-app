-- ============================================================================
-- MIGRACIÓN: Crear relaciones Métrica-Sensor en thermo.metricasensor
-- ============================================================================
-- Descripción: Relaciona los 85 sensores con la métrica "Temperatura"
-- Prerequisito: Sensores y métricas ya creados
-- Fecha: 2025-10-27
-- ============================================================================

-- Verificar métricas existentes
SELECT metricaid, metrica, unidad FROM thermo.metrica ORDER BY metricaid;
-- Esperado: metricaid=2 → Temperatura (°C)

-- Verificar sensores existentes
SELECT COUNT(*) AS total_sensores FROM thermo.sensor WHERE statusid = 1;
-- Esperado: 85 sensores activos

-- Verificar relaciones existentes (el supervisor puede haber creado algunas)
SELECT sensorid, metricaid, datecreated
FROM thermo.metricasensor
WHERE statusid = 1
ORDER BY sensorid;
-- Puede haber 1 registro existente (sensorid=1, metricaid=2)

-- ============================================================================
-- INSERTAR RELACIONES MÉTRICA-SENSOR (hasta 85 registros)
-- ============================================================================
-- TODOS los sensores PT1000 miden la métrica "Temperatura" (metricaid=2)
-- Se omiten los registros que ya existen (para evitar duplicados)
-- ============================================================================

INSERT INTO thermo.metricasensor (sensorid, metricaid, statusid, usercreatedid, usermodifiedid)
SELECT 
  s.sensorid,
  2 AS metricaid,  -- Temperatura
  1 AS statusid,
  1 AS usercreatedid,
  1 AS usermodifiedid
FROM thermo.sensor s
WHERE s.statusid = 1
  AND NOT EXISTS (
    SELECT 1 
    FROM thermo.metricasensor ms 
    WHERE ms.sensorid = s.sensorid 
      AND ms.metricaid = 2 
      AND ms.statusid = 1
  )
ORDER BY s.sensorid;

-- ============================================================================
-- VERIFICAR RESULTADOS
-- ============================================================================

-- Contar relaciones creadas
SELECT COUNT(*) AS total_relaciones
FROM thermo.metricasensor
WHERE statusid = 1;

-- Ver todas las relaciones con nombres
SELECT 
  ms.sensorid,
  s.sensor,
  m.metrica,
  m.unidad,
  ms.statusid,
  ms.datecreated
FROM thermo.metricasensor ms
JOIN thermo.sensor s ON ms.sensorid = s.sensorid
JOIN thermo.metrica m ON ms.metricaid = m.metricaid
ORDER BY s.sensor;

-- Verificar que todos los sensores tienen su métrica
SELECT 
  s.sensorid,
  s.sensor,
  CASE WHEN ms.sensorid IS NULL THEN 'SIN MÉTRICA' ELSE 'OK' END AS estado
FROM thermo.sensor s
LEFT JOIN thermo.metricasensor ms ON s.sensorid = ms.sensorid AND ms.statusid = 1
WHERE s.statusid = 1
ORDER BY s.sensor;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- total_relaciones: 85 (1 existente del supervisor + 84 nuevas)
-- estado: Todos los 85 sensores deben tener estado = 'OK'
--
-- Todas las relaciones:
-- sensorid | sensor                    | metrica      | unidad
-- ---------|---------------------------|--------------|--------
--    1     | tunel1_ambiente1          | Temperatura  | °C  (existente)
--    2     | tunel1_pulpa1             | Temperatura  | °C  (nueva)
--    ...   | ...                       | ...          | ...
--    X     | fruta1_setpoint           | Temperatura  | °C  (nueva)
-- ============================================================================

