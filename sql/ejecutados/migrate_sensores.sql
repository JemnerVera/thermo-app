-- ============================================================================
-- MIGRACIÓN: Crear Sensores en thermo.sensor
-- ============================================================================
-- Descripción: Crea los 82 sensores basados en public.zona
-- Prerequisito: Tipos ya creados en thermo.tipo
-- Nomenclatura: Usar {localizacion}_{tipo} (con guion bajo, estilo supervisor)
-- Fecha: 2025-10-27
-- ============================================================================

-- Verificar tipos existentes
SELECT tipoid, tipo FROM thermo.tipo ORDER BY tipoid;
-- Esperado: tipoid=1 → PT1000 (ÚNICO tipo de sensor físico)

-- Verificar sensores existentes creados por el supervisor
SELECT sensorid, sensor, tipoid FROM thermo.sensor ORDER BY sensorid;
-- Existentes: tunel1_ambiente, tunel1_pulpa1-5 (6 sensores, todos tipoid=1)

-- ============================================================================
-- ACLARACIÓN IMPORTANTE:
-- ============================================================================
-- thermo.tipo = Tipo de SENSOR FÍSICO (hardware)
--   - PT1000 = Sensor de resistencia de platino para temperatura
--   - Todos los sensores en la planta usan el mismo hardware (PT1000)
--
-- El NOMBRE del sensor distingue su ubicación/función:
--   - tunel1_ambiental1 = PT1000 midiendo temperatura ambiente en Túnel 1
--   - tunel1_pulpa1 = PT1000 midiendo temperatura de pulpa en Túnel 1
--   - pid1_estado = PT1000 midiendo temperatura del PID 1
--
-- TODOS los sensores tendrán tipoid=1 (PT1000)
-- ============================================================================

-- ============================================================================
-- INSERTAR SENSORES FALTANTES DESDE public.zona
-- ============================================================================
-- NOTA: Se omiten los que ya existen (tunel1_ambiente, tunel1_pulpa1-5)
--       Nomenclatura: {localizacion}_{tipo} (con guion bajo)
--       Todos usan tipoid=1 (PT1000)
-- ============================================================================

-- TÚNEL 1 (solo faltante: setpoint)
-- Ya existen: tunel1_ambiente1, tunel1_pulpa1-5 (todos tipoid=1)
-- NOTA: El supervisor creó "tunel1_ambiente1" (sin la "l"), lo respetamos
INSERT INTO thermo.sensor (sensor, tipoid, statusid, usercreatedid, usermodifiedid)
VALUES 
  ('tunel1_setpoint', 1, 1, 1, 1);    -- PT1000

-- TÚNELES 2-14 (3 sensores cada uno: ambiental, pulpa1, pulpa2)
INSERT INTO thermo.sensor (sensor, tipoid, statusid, usercreatedid, usermodifiedid)
VALUES 
  -- Túnel 2
  ('tunel2_ambiental1', 1, 1, 1, 1),
  ('tunel2_pulpa1', 1, 1, 1, 1),
  ('tunel2_pulpa2', 1, 1, 1, 1),
  -- Túnel 3
  ('tunel3_ambiental1', 1, 1, 1, 1),
  ('tunel3_pulpa1', 1, 1, 1, 1),
  ('tunel3_pulpa2', 1, 1, 1, 1),
  -- Túnel 4
  ('tunel4_ambiental1', 1, 1, 1, 1),
  ('tunel4_pulpa1', 1, 1, 1, 1),
  ('tunel4_pulpa2', 1, 1, 1, 1),
  -- Túnel 5
  ('tunel5_ambiental1', 1, 1, 1, 1),
  ('tunel5_pulpa1', 1, 1, 1, 1),
  ('tunel5_pulpa2', 1, 1, 1, 1),
  -- Túnel 6
  ('tunel6_ambiental1', 1, 1, 1, 1),
  ('tunel6_pulpa1', 1, 1, 1, 1),
  ('tunel6_pulpa2', 1, 1, 1, 1),
  -- Túnel 7
  ('tunel7_ambiental1', 1, 1, 1, 1),
  ('tunel7_pulpa1', 1, 1, 1, 1),
  ('tunel7_pulpa2', 1, 1, 1, 1),
  -- Túnel 8
  ('tunel8_ambiental1', 1, 1, 1, 1),
  ('tunel8_pulpa1', 1, 1, 1, 1),
  ('tunel8_pulpa2', 1, 1, 1, 1),
  -- Túnel 9
  ('tunel9_ambiental1', 1, 1, 1, 1),
  ('tunel9_pulpa1', 1, 1, 1, 1),
  ('tunel9_pulpa2', 1, 1, 1, 1),
  -- Túnel 10
  ('tunel10_ambiental1', 1, 1, 1, 1),
  ('tunel10_pulpa1', 1, 1, 1, 1),
  ('tunel10_pulpa2', 1, 1, 1, 1),
  -- Túnel 11
  ('tunel11_ambiental1', 1, 1, 1, 1),
  ('tunel11_pulpa1', 1, 1, 1, 1),
  ('tunel11_pulpa2', 1, 1, 1, 1),
  -- Túnel 12
  ('tunel12_ambiental1', 1, 1, 1, 1),
  ('tunel12_pulpa1', 1, 1, 1, 1),
  ('tunel12_pulpa2', 1, 1, 1, 1),
  -- Túnel 13
  ('tunel13_ambiental1', 1, 1, 1, 1),
  ('tunel13_pulpa1', 1, 1, 1, 1),
  ('tunel13_pulpa2', 1, 1, 1, 1),
  -- Túnel 14
  ('tunel14_ambiental1', 1, 1, 1, 1),
  ('tunel14_pulpa1', 1, 1, 1, 1),
  ('tunel14_pulpa2', 1, 1, 1, 1);

-- PIDs (14 sensores)
INSERT INTO thermo.sensor (sensor, tipoid, statusid, usercreatedid, usermodifiedid)
VALUES 
  ('pid1_estado', 1, 1, 1, 1),
  ('pid2_estado', 1, 1, 1, 1),
  ('pid3_estado', 1, 1, 1, 1),
  ('pid4_estado', 1, 1, 1, 1),
  ('pid5_estado', 1, 1, 1, 1),
  ('pid6_estado', 1, 1, 1, 1),
  ('pid7_estado', 1, 1, 1, 1),
  ('pid8_estado', 1, 1, 1, 1),
  ('pid9_estado', 1, 1, 1, 1),
  ('pid10_estado', 1, 1, 1, 1),
  ('pid11_estado', 1, 1, 1, 1),
  ('pid12_estado', 1, 1, 1, 1),
  ('pid13_estado', 1, 1, 1, 1),
  ('pid14_estado', 1, 1, 1, 1);

-- VENTILADORES (14 sensores)
INSERT INTO thermo.sensor (sensor, tipoid, statusid, usercreatedid, usermodifiedid)
VALUES 
  ('ventilador1_estado', 1, 1, 1, 1),
  ('ventilador2_estado', 1, 1, 1, 1),
  ('ventilador3_estado', 1, 1, 1, 1),
  ('ventilador4_estado', 1, 1, 1, 1),
  ('ventilador5_estado', 1, 1, 1, 1),
  ('ventilador6_estado', 1, 1, 1, 1),
  ('ventilador7_estado', 1, 1, 1, 1),
  ('ventilador8_estado', 1, 1, 1, 1),
  ('ventilador9_estado', 1, 1, 1, 1),
  ('ventilador10_estado', 1, 1, 1, 1),
  ('ventilador11_estado', 1, 1, 1, 1),
  ('ventilador12_estado', 1, 1, 1, 1),
  ('ventilador13_estado', 1, 1, 1, 1),
  ('ventilador14_estado', 1, 1, 1, 1);

-- PASILLOS (2 sensores)
INSERT INTO thermo.sensor (sensor, tipoid, statusid, usercreatedid, usermodifiedid)
VALUES 
  ('pasillo1_ambiental1', 1, 1, 1, 1),
  ('pasillo2_ambiental1', 1, 1, 1, 1);

-- PROCESO (4 sensores)
INSERT INTO thermo.sensor (sensor, tipoid, statusid, usercreatedid, usermodifiedid)
VALUES 
  ('proceso1_ambiental1', 1, 1, 1, 1),
  ('proceso1_ambiental2', 1, 1, 1, 1),
  ('proceso1_ambiental3', 1, 1, 1, 1),
  ('proceso1_ambiental4', 1, 1, 1, 1);

-- ALMACENAMIENTO (2 sensores)
INSERT INTO thermo.sensor (sensor, tipoid, statusid, usercreatedid, usermodifiedid)
VALUES 
  ('almacenamiento1_ambiental1', 1, 1, 1, 1),
  ('almacenamiento1_ambiental2', 1, 1, 1, 1);

-- EMBARQUE (2 sensores)
INSERT INTO thermo.sensor (sensor, tipoid, statusid, usercreatedid, usermodifiedid)
VALUES 
  ('embarque1_ambiental1', 1, 1, 1, 1),
  ('embarque1_ambiental2', 1, 1, 1, 1);

-- FRUTA (1 sensor)
INSERT INTO thermo.sensor (sensor, tipoid, statusid, usercreatedid, usermodifiedid)
VALUES 
  ('fruta1_setpoint', 1, 1, 1, 1);

-- ============================================================================
-- VERIFICAR RESULTADOS
-- ============================================================================

-- Contar sensores por tipo
SELECT 
  t.tipo,
  COUNT(s.sensorid) AS cantidad_sensores
FROM thermo.tipo t
LEFT JOIN thermo.sensor s ON t.tipoid = s.tipoid
GROUP BY t.tipoid, t.tipo
ORDER BY t.tipoid;

-- Ver todos los sensores creados
SELECT 
  s.sensorid,
  s.sensor,
  t.tipo,
  s.statusid,
  s.datecreated
FROM thermo.sensor s
JOIN thermo.tipo t ON s.tipoid = t.tipoid
ORDER BY t.tipoid, s.sensor;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- tipo    | cantidad_sensores
-- --------|-------------------
-- PT1000  | 85 (6 existentes + 79 nuevos)
--
-- TOTAL: 85 sensores PT1000
-- - Existentes del supervisor: 6 (tunel1_ambiente1, tunel1_pulpa1-5)
-- - Nuevos de migración: 79 (82 de public.zona - 3 ya existentes/equivalentes)
--   * Se omiten: tunel1_ambiente1 (ya existe), tunel1_pulpa1-2 (ya existen)
-- - TODOS miden la métrica "Temperatura" (metricaid=2)
-- ============================================================================

