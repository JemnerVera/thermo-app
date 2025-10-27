-- ============================================================================
-- FIX: Corregir restricciones UNIQUE en thermo.codigotelefono
-- ============================================================================
-- Problema: Las restricciones unq_codigotelefono_0 y unq_codigotelefono_1
--           impiden que múltiples países compartan el mismo código (+61, +1, etc.)
-- Solución: Eliminar restricciones incorrectas, mantener solo (codigo+pais) único
-- Fecha: 2025-10-27
-- ============================================================================

-- Ver restricciones actuales
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'thermo.codigotelefono'::regclass;

-- ============================================================================
-- ELIMINAR RESTRICCIONES INCORRECTAS
-- ============================================================================

-- Eliminar: UNIQUE (codigotelefono) - Incorrecta, varios países usan +1, +61, etc.
ALTER TABLE thermo.codigotelefono 
DROP CONSTRAINT IF EXISTS unq_codigotelefono_0;

-- Eliminar: UNIQUE (paistelefono) - Incorrecta, un país puede tener un solo código
ALTER TABLE thermo.codigotelefono 
DROP CONSTRAINT IF EXISTS unq_codigotelefono_1;

-- ============================================================================
-- MANTENER: UNIQUE (codigotelefono, paistelefono)
-- ============================================================================
-- Esta restricción es correcta: la combinación código+país debe ser única
-- Ejemplo: (+51, 'Perú') ✅ | (+1, 'USA') ✅ | (+1, 'Canadá') ✅

-- Verificar que solo queda la restricción correcta
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'thermo.codigotelefono'::regclass
  AND contype = 'u';  -- Solo UNIQUE constraints

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- Solo debe quedar:
-- conname              | pg_get_constraintdef
-- ---------------------|-----------------------------------------------
-- unq_codigotelefono   | UNIQUE (codigotelefono, paistelefono)
-- pk_codigotelefono    | PRIMARY KEY (codigotelefonoid)
--
-- Ahora se pueden insertar:
-- - (+1, 'USA')
-- - (+1, 'Canadá')
-- - (+61, 'Australia')
-- - (+61, 'Christmas Island')
-- ============================================================================

