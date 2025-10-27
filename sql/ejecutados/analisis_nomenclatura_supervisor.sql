-- ============================================================================
-- ANÁLISIS: Nomenclatura del Supervisor vs public.zona
-- ============================================================================
-- El supervisor usa nomenclatura: {localizacion}_{tipo}
-- public.zona usa nomenclatura: {localizacion}-{tipo}
--
-- DECISIÓN: Adaptar public.zona a la nomenclatura del supervisor
-- ============================================================================

-- Sensores existentes creados por el supervisor:
-- sensorid | sensor           | tipoid | Observación
-- ---------|------------------|--------|----------------------------------
--    1     | tunel1_ambiente  |   1    | ✅ Correcto
--    2     | tunel1_pulpa1    |   1    | ❌ Debe ser tipoid=2
--    6     | tunel1_pulpa2    |   1    | ❌ Debe ser tipoid=2
--    7     | tunel1_pulpa3    |   1    | ❌ Debe ser tipoid=2 (no existe en public)
--    8     | tunel1_pulpa4    |   1    | ❌ Debe ser tipoid=2 (no existe en public)
--    9     | tunel1_pulpa5    |   1    | ❌ Debe ser tipoid=2 (no existe en public)

-- ============================================================================
-- PASO 1: Corregir tipoid de sensores existentes
-- ============================================================================

UPDATE thermo.sensor
SET 
  tipoid = 2,  -- Temperatura Pulpa
  usermodifiedid = 1,
  datemodified = NOW()
WHERE sensor IN ('tunel1_pulpa1', 'tunel1_pulpa2', 'tunel1_pulpa3', 'tunel1_pulpa4', 'tunel1_pulpa5')
  AND tipoid = 1;

-- Verificar corrección
SELECT sensorid, sensor, tipoid, datemodified
FROM thermo.sensor
ORDER BY sensorid;

-- ============================================================================
-- MAPEO: public.zona → thermo.sensor (nomenclatura del supervisor)
-- ============================================================================
-- public.zona              → thermo.sensor (supervisor)
-- ------------------------ → ---------------------------
-- tunel1-ambiental1        → tunel1_ambiental1  (o ambiente?)
-- tunel1-pulpa1            → tunel1_pulpa1      ✅ Ya existe
-- tunel1-pulpa2            → tunel1_pulpa2      ✅ Ya existe
-- tunel2-ambiental1        → tunel2_ambiental1
-- pid1-estado              → pid1_estado
-- ventilador1-estado       → ventilador1_estado
-- pasillo1-ambiental1      → pasillo1_ambiental1
-- proceso1-ambiental1      → proceso1_ambiental1
-- almacenamiento1-ambiental1 → almacenamiento1_ambiental1
-- embarque1-ambiental1     → embarque1_ambiental1
-- fruta1-setpoint          → fruta1_setpoint
-- tunel1-setpoint          → tunel1_setpoint (no existe en supervisor)
--
-- NOTA CRÍTICA: El supervisor usa "ambiente" (sin "1"), no "ambiental1"
-- ============================================================================

-- ============================================================================
-- PREGUNTA: ¿Qué hacer con los sensores extra del supervisor?
-- ============================================================================
-- El supervisor creó:
-- - tunel1_pulpa3, tunel1_pulpa4, tunel1_pulpa5
--
-- Estos NO existen en public.zona, pero:
-- 1. Se respetan (no se eliminan)
-- 2. NO se migrarán datos para ellos (no hay en public."temperatura-zona")
-- 3. Quedan disponibles para uso futuro
-- ============================================================================

-- ============================================================================
-- PREGUNTA: ¿Nomenclatura exacta del supervisor?
-- ============================================================================
-- Opciones:
-- A) "ambiente" (sin "1") → tunel1_ambiente
-- B) "ambiental1" (con "1") → tunel1_ambiental1
--
-- El supervisor usa: "ambiente" (sin número)
-- public.zona usa: "ambiental1" (con número)
--
-- DECISIÓN: Usar la nomenclatura del supervisor cuando coincida,
--           adaptar el resto manteniendo su estilo.
-- ============================================================================

