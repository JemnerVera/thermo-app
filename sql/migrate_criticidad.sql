-- ============================================================================
-- MIGRACIÓN: Criticidad desde JoySense a Thermos
-- ============================================================================
-- Descripción: Migra los 4 niveles de criticidad para el sistema de alertas
-- Origen: sense.criticidad
-- Destino: thermo.criticidad
-- Fecha: 2025-10-27
-- ============================================================================

-- Verificar datos existentes en thermo.criticidad
SELECT * FROM thermo.criticidad WHERE statusid = 1 ORDER BY criticidadid;

-- ============================================================================
-- INSERTAR NIVELES DE CRITICIDAD
-- ============================================================================
-- Nota: Los IDs se generan automáticamente (IDENTITY)
-- Estructura: criticidad, grado, frecuencia, escalamiento, escalon

INSERT INTO thermo.criticidad (
  criticidad,
  grado,
  frecuencia,
  escalamiento,
  escalon,
  statusid,
  usercreatedid,
  usermodifiedid
)
VALUES 
  ('⚠️Amarilla', 1, 1, 1, 1, 1, 1, 1),  -- Criticidad baja
  ('🚨Roja', 2, 1, 1, 2, 1, 1, 1),      -- Criticidad media
  ('🟣Morada', 3, 1, 1, 3, 1, 1, 1),    -- Criticidad alta
  ('☠️Negra', 4, 1, 1, 4, 1, 1, 1);     -- Criticidad crítica

-- ============================================================================
-- VERIFICAR RESULTADOS
-- ============================================================================

-- Contar criticidades creadas
SELECT COUNT(*) AS total_criticidades 
FROM thermo.criticidad 
WHERE statusid = 1;

-- Ver todas las criticidades
SELECT 
  criticidadid,
  criticidad,
  grado,
  frecuencia,
  escalamiento,
  escalon,
  statusid,
  datecreated
FROM thermo.criticidad
WHERE statusid = 1
ORDER BY grado;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- total_criticidades: 4
--
-- criticidadid | criticidad   | grado | frecuencia | escalamiento | escalon
-- -------------|--------------|-------|------------|--------------|--------
--      1       | ⚠️Amarilla   |   1   |     1      |      1       |   1
--      2       | 🚨Roja       |   2   |     1      |      1       |   2
--      3       | 🟣Morada     |   3   |     1      |      1       |   3
--      4       | ☠️Negra      |   4   |     1      |      1       |   4
--
-- SIGNIFICADO:
-- - grado: Nivel de severidad (1=bajo, 4=crítico)
-- - frecuencia: Frecuencia de notificación (1=inmediata)
-- - escalamiento: Nivel de escalamiento (1=enviar a siguiente nivel)
-- - escalon: Orden de escalamiento
-- ============================================================================

