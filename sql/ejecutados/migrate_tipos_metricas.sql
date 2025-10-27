-- ============================================================================
-- MIGRACIÓN: Crear Tipos y Métricas en thermo
-- ============================================================================
-- Descripción: Crea los 5 tipos de sensores y las 3 métricas
-- Prerequisito: Ejecutado después de entidades y localizaciones
-- Fecha: 2025-10-27
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR TIPOS DE SENSORES (5 registros)
-- ============================================================================

INSERT INTO thermo.tipo (tipo, statusid, usercreatedid, usermodifiedid)
VALUES 
  ('Temperatura Ambiental', 1, 1, 1),  -- tipoid generado (ej: 1)
  ('Temperatura Pulpa', 1, 1, 1),      -- tipoid generado (ej: 2)
  ('Estado PID', 1, 1, 1),             -- tipoid generado (ej: 3)
  ('Estado Ventilador', 1, 1, 1),      -- tipoid generado (ej: 4)
  ('Setpoint', 1, 1, 1);               -- tipoid generado (ej: 5)

-- Verificar tipos creados
SELECT tipoid, tipo, statusid, datecreated
FROM thermo.tipo
ORDER BY tipoid;

-- ============================================================================
-- PASO 2: VERIFICAR MÉTRICA EXISTENTE (NO INSERTAR)
-- ============================================================================
-- La métrica "Temperatura" ya fue creada por el supervisor
-- metricaid=2, metrica='Temperatura', unidad='°C'

SELECT metricaid, metrica, unidad, statusid, datecreated
FROM thermo.metrica
WHERE metrica = 'Temperatura';

-- Verificar que existe
-- Esperado: metricaid=2, metrica='Temperatura', unidad='°C'

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Todos los 82 sensores de public.zona miden la métrica "Temperatura"
-- (metricaid=2), ya que public."temperatura-zona" solo almacena temperatura.
--
-- Los "tipos" (tipoid) diferencian:
-- - DÓNDE se mide (ambiental, pulpa)
-- - QUÉ tipo de sensor es (PID, ventilador, setpoint)
--
-- Pero TODOS reportan valores de temperatura.
-- ============================================================================

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- TIPOS:
-- tipoid | tipo                    | statusid | datecreated
-- -------|-------------------------|----------|-------------------
--   1    | Temperatura Ambiental   |    1     | 2025-10-27...
--   2    | Temperatura Pulpa       |    1     | 2025-10-27...
--   3    | Estado PID              |    1     | 2025-10-27...
--   4    | Estado Ventilador       |    1     | 2025-10-27...
--   5    | Setpoint                |    1     | 2025-10-27...
--
-- MÉTRICAS:
-- metricaid | metrica      | unidad | statusid | datecreated
-- ----------|--------------|--------|----------|-------------------
--     2     | Temperatura  | °C     |    1     | 2025-10-23... (existente)
--
-- NOTA: Solo hay 1 métrica porque public."temperatura-zona" solo registra temperatura.
--       Todos los 82 sensores miden esta misma métrica.
-- ============================================================================

-- ============================================================================
-- MAPEO: Sufijo de public.zona → thermo.tipo
-- ============================================================================
-- -ambiental1, -ambiental2, etc. → tipoid=1 (Temperatura Ambiental)
-- -pulpa1, -pulpa2               → tipoid=2 (Temperatura Pulpa)
-- pid{N}-estado                  → tipoid=3 (Estado PID)
-- ventilador{N}-estado           → tipoid=4 (Estado Ventilador)
-- -setpoint                      → tipoid=5 (Setpoint)
-- ============================================================================

-- ============================================================================
-- MAPEO: thermo.tipo → thermo.metrica
-- ============================================================================
-- tipoid=1 (Temperatura Ambiental) → metricaid=2 (Temperatura)
-- tipoid=2 (Temperatura Pulpa)     → metricaid=2 (Temperatura)
-- tipoid=3 (Estado PID)            → metricaid=2 (Temperatura)
-- tipoid=4 (Estado Ventilador)     → metricaid=2 (Temperatura)
-- tipoid=5 (Setpoint)              → metricaid=2 (Temperatura)
--
-- TODOS los tipos → metricaid=2
-- ============================================================================

