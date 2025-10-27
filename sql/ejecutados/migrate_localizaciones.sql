-- ============================================================================
-- MIGRACIÓN: Crear Localizaciones en thermo.localizacion
-- ============================================================================
-- Descripción: Crea las 49 localizaciones físicas basadas en public.zona
-- Prerequisito: thermo.entidad ya creado, thermo.ubicacion existe
-- Fecha: 2025-10-27
-- ============================================================================

-- Verificar datos existentes
SELECT ubicacionid, fundoid, ubicacion FROM thermo.ubicacion WHERE ubicacionid = 1;
-- Resultado: ubicacionid=1, fundoid=2, ubicacion='JAYANCA-CHICLAYO'

SELECT entidadid, entidad FROM thermo.entidad ORDER BY entidadid;
-- Resultado esperado:
-- 1 | UVA
-- 2 | Túnel
-- 3 | PID
-- 4 | Ventilador
-- 5 | Pasillo
-- 6 | Proceso
-- 7 | Almacenamiento
-- 8 | Embarque
-- 9 | Fruta

-- Verificar localizaciones existentes (puede haber "PACKING_UVA" creado por supervisor)
SELECT localizacionid, entidadid, localizacion, statusid 
FROM thermo.localizacion
ORDER BY localizacionid;
-- Si existe localizacionid=1 (PACKING_UVA), se mantendrá.
-- Las nuevas localizaciones comenzarán desde el siguiente ID disponible.

-- ============================================================================
-- INSERTAR LOCALIZACIONES (49 registros)
-- ============================================================================

-- Túneles (14 localizaciones) - entidadid=2
INSERT INTO thermo.localizacion (ubicacionid, entidadid, localizacion, statusid, usercreatedid, usermodifiedid)
VALUES 
  (1, 2, 'Túnel 1', 1, 1, 1),
  (1, 2, 'Túnel 2', 1, 1, 1),
  (1, 2, 'Túnel 3', 1, 1, 1),
  (1, 2, 'Túnel 4', 1, 1, 1),
  (1, 2, 'Túnel 5', 1, 1, 1),
  (1, 2, 'Túnel 6', 1, 1, 1),
  (1, 2, 'Túnel 7', 1, 1, 1),
  (1, 2, 'Túnel 8', 1, 1, 1),
  (1, 2, 'Túnel 9', 1, 1, 1),
  (1, 2, 'Túnel 10', 1, 1, 1),
  (1, 2, 'Túnel 11', 1, 1, 1),
  (1, 2, 'Túnel 12', 1, 1, 1),
  (1, 2, 'Túnel 13', 1, 1, 1),
  (1, 2, 'Túnel 14', 1, 1, 1);

-- PIDs (14 localizaciones) - entidadid=3
INSERT INTO thermo.localizacion (ubicacionid, entidadid, localizacion, statusid, usercreatedid, usermodifiedid)
VALUES 
  (1, 3, 'PID 1', 1, 1, 1),
  (1, 3, 'PID 2', 1, 1, 1),
  (1, 3, 'PID 3', 1, 1, 1),
  (1, 3, 'PID 4', 1, 1, 1),
  (1, 3, 'PID 5', 1, 1, 1),
  (1, 3, 'PID 6', 1, 1, 1),
  (1, 3, 'PID 7', 1, 1, 1),
  (1, 3, 'PID 8', 1, 1, 1),
  (1, 3, 'PID 9', 1, 1, 1),
  (1, 3, 'PID 10', 1, 1, 1),
  (1, 3, 'PID 11', 1, 1, 1),
  (1, 3, 'PID 12', 1, 1, 1),
  (1, 3, 'PID 13', 1, 1, 1),
  (1, 3, 'PID 14', 1, 1, 1);

-- Ventiladores (14 localizaciones) - entidadid=4
INSERT INTO thermo.localizacion (ubicacionid, entidadid, localizacion, statusid, usercreatedid, usermodifiedid)
VALUES 
  (1, 4, 'Ventilador 1', 1, 1, 1),
  (1, 4, 'Ventilador 2', 1, 1, 1),
  (1, 4, 'Ventilador 3', 1, 1, 1),
  (1, 4, 'Ventilador 4', 1, 1, 1),
  (1, 4, 'Ventilador 5', 1, 1, 1),
  (1, 4, 'Ventilador 6', 1, 1, 1),
  (1, 4, 'Ventilador 7', 1, 1, 1),
  (1, 4, 'Ventilador 8', 1, 1, 1),
  (1, 4, 'Ventilador 9', 1, 1, 1),
  (1, 4, 'Ventilador 10', 1, 1, 1),
  (1, 4, 'Ventilador 11', 1, 1, 1),
  (1, 4, 'Ventilador 12', 1, 1, 1),
  (1, 4, 'Ventilador 13', 1, 1, 1),
  (1, 4, 'Ventilador 14', 1, 1, 1);

-- Pasillos (2 localizaciones) - entidadid=5
INSERT INTO thermo.localizacion (ubicacionid, entidadid, localizacion, statusid, usercreatedid, usermodifiedid)
VALUES 
  (1, 5, 'Pasillo 1', 1, 1, 1),
  (1, 5, 'Pasillo 2', 1, 1, 1);

-- Proceso (1 localización) - entidadid=6
INSERT INTO thermo.localizacion (ubicacionid, entidadid, localizacion, statusid, usercreatedid, usermodifiedid)
VALUES 
  (1, 6, 'Proceso 1', 1, 1, 1);

-- Almacenamiento (1 localización) - entidadid=7
INSERT INTO thermo.localizacion (ubicacionid, entidadid, localizacion, statusid, usercreatedid, usermodifiedid)
VALUES 
  (1, 7, 'Almacenamiento 1', 1, 1, 1);

-- Embarque (1 localización) - entidadid=8
INSERT INTO thermo.localizacion (ubicacionid, entidadid, localizacion, statusid, usercreatedid, usermodifiedid)
VALUES 
  (1, 8, 'Embarque 1', 1, 1, 1);

-- Fruta (1 localización) - entidadid=9
INSERT INTO thermo.localizacion (ubicacionid, entidadid, localizacion, statusid, usercreatedid, usermodifiedid)
VALUES 
  (1, 9, 'Fruta 1', 1, 1, 1);

-- ============================================================================
-- VERIFICAR RESULTADOS
-- ============================================================================

-- Contar localizaciones por entidad
SELECT 
  e.entidad,
  COUNT(l.localizacionid) AS cantidad_localizaciones
FROM thermo.entidad e
LEFT JOIN thermo.localizacion l ON e.entidadid = l.entidadid
GROUP BY e.entidadid, e.entidad
ORDER BY e.entidadid;

-- Verificar todas las localizaciones creadas
SELECT 
  l.localizacionid,
  e.entidad,
  l.localizacion,
  l.statusid,
  l.datecreated
FROM thermo.localizacion l
JOIN thermo.entidad e ON l.entidadid = e.entidadid
ORDER BY e.entidadid, l.localizacion;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- Si existía "PACKING_UVA" (localizacionid=1), el resultado será:
--
-- entidad        | cantidad_localizaciones
-- ---------------|------------------------
-- UVA            | 1 (PACKING_UVA - existente)
-- Túnel          | 14 (nuevas)
-- PID            | 14 (nuevas)
-- Ventilador     | 14 (nuevas)
-- Pasillo        | 2 (nuevas)
-- Proceso        | 1 (nueva)
-- Almacenamiento | 1 (nueva)
-- Embarque       | 1 (nueva)
-- Fruta          | 1 (nueva)
--
-- TOTAL: 50 localizaciones (1 existente + 49 nuevas)
--
-- NOTA: "PACKING_UVA" se mantiene por decisión del supervisor.
--       Los localizacionid de las nuevas localizaciones comenzarán desde el 2.
-- ============================================================================

