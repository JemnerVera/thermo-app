-- ============================================================================
-- MIGRACIÓN: Crear Entidades en thermo.entidad
-- ============================================================================
-- Descripción: Crea los 8 tipos de zonas funcionales basadas en public.zona
-- Nota: Se mantiene "UVA" existente (creado por usuario de mayor rango)
-- Fecha: 2025-10-27
-- ============================================================================

-- 1. Verificar entidades existentes
SELECT entidadid, entidad, statusid, datecreated
FROM thermo.entidad 
ORDER BY entidadid;

-- 2. Crear las 8 nuevas entidades para Thermos (se agregarán después de las existentes)
INSERT INTO thermo.entidad (entidad, statusid, usercreatedid, usermodifiedid)
VALUES 
  ('Túnel', 1, 1, 1),           -- entidadid generado automáticamente (ej: 1 o 2)
  ('PID', 1, 1, 1),              
  ('Ventilador', 1, 1, 1),       
  ('Pasillo', 1, 1, 1),          
  ('Proceso', 1, 1, 1),          
  ('Almacenamiento', 1, 1, 1),   
  ('Embarque', 1, 1, 1),         
  ('Fruta', 1, 1, 1);

-- 3. Verificar que se crearon correctamente
SELECT entidadid, entidad, statusid, datecreated
FROM thermo.entidad
ORDER BY entidadid;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- Si "UVA" existía con entidadid=1, el resultado será:
--
-- entidadid | entidad        | statusid | datecreated
-- ----------|----------------|----------|---------------------------
--     1     | UVA            |    1     | 2025-10-23 ... (existente)
--     2     | Túnel          |    1     | 2025-10-27 ... (nueva)
--     3     | PID            |    1     | 2025-10-27 ... (nueva)
--     4     | Ventilador     |    1     | 2025-10-27 ... (nueva)
--     5     | Pasillo        |    1     | 2025-10-27 ... (nueva)
--     6     | Proceso        |    1     | 2025-10-27 ... (nueva)
--     7     | Almacenamiento |    1     | 2025-10-27 ... (nueva)
--     8     | Embarque       |    1     | 2025-10-27 ... (nueva)
--     9     | Fruta          |    1     | 2025-10-27 ... (nueva)
-- ============================================================================

-- NOTA: "UVA" se mantiene por decisión de usuario de mayor rango.
--       Las 8 nuevas entidades se usarán para la migración de public.zona
-- ============================================================================

