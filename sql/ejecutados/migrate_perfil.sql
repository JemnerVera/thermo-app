-- ============================================================================
-- MIGRACIÓN: Perfiles desde JoySense a Thermos
-- ============================================================================
-- Descripción: Migra los perfiles/roles de usuario con su jerarquía
-- Origen: sense.perfil
-- Destino: thermo.perfil
-- Fecha: 2025-10-27
-- ============================================================================

-- Verificar datos existentes en thermo.perfil
SELECT * FROM thermo.perfil WHERE statusid = 1 ORDER BY perfilid;

-- ============================================================================
-- INSERTAR PERFILES
-- ============================================================================
-- Nota: La tabla tiene una FK recursiva (jefeid → perfilid) para jerarquía
-- Estructura jerárquica:
--   1. Administrador (nivel 1, sin jefe)
--      └─ 2. Supervisor (nivel 2, jefe: Administrador)
--         └─ 3. Técnico (nivel 3, jefe: Supervisor)
--            └─ 5. Obrero (nivel 4, jefe: Técnico)
--   4. Operador (nivel 5, sin jefe)
--   6. Limpiador (nivel 6, sin jefe)

INSERT INTO thermo.perfil (
  perfilid,
  perfil,
  nivel,
  jefeid,
  statusid,
  usercreatedid,
  usermodifiedid
)
VALUES 
  (1, 'Administrador', 1, NULL, 1, 1, 1),  -- Sin jefe (nivel más alto)
  (2, 'Supervisor', 2, 1, 1, 1, 1),        -- Jefe: Administrador
  (3, 'Técnico', 3, 2, 1, 1, 1),           -- Jefe: Supervisor
  (5, 'Obrero', 4, 3, 1, 1, 1),            -- Jefe: Técnico
  (4, 'Operador', 5, NULL, 1, 1, 1),       -- Sin jefe (independiente)
  (6, 'Limpiador', 6, NULL, 1, 1, 1);      -- Sin jefe (independiente)

-- ============================================================================
-- VERIFICAR RESULTADOS
-- ============================================================================

-- Contar perfiles creados
SELECT COUNT(*) AS total_perfiles 
FROM thermo.perfil 
WHERE statusid = 1;

-- Ver jerarquía de perfiles
SELECT 
  p.perfilid,
  p.perfil,
  p.nivel,
  p.jefeid,
  j.perfil AS jefe
FROM thermo.perfil p
LEFT JOIN thermo.perfil j ON p.jefeid = j.perfilid
WHERE p.statusid = 1
ORDER BY p.nivel;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- total_perfiles: 6
--
-- perfilid | perfil        | nivel | jefeid | jefe
-- ---------|---------------|-------|--------|---------------
--    1     | Administrador |   1   | NULL   | NULL
--    2     | Supervisor    |   2   |   1    | Administrador
--    3     | Técnico       |   3   |   2    | Supervisor
--    5     | Obrero        |   4   |   3    | Técnico
--    4     | Operador      |   5   | NULL   | NULL
--    6     | Limpiador     |   6   | NULL   | NULL
--
-- JERARQUÍA DE ESCALAMIENTO (para alertas):
-- Administrador (1) ← Supervisor (2) ← Técnico (3) ← Obrero (5)
-- Operador (4) y Limpiador (6) son independientes (sin cadena de mando)
-- ============================================================================

