-- 🔐 OTORGAR PERMISOS A TODAS LAS TABLAS DEL SCHEMA SENSE
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Otorgar permisos SELECT a todas las tablas del schema sense
GRANT SELECT ON TABLE thermo.pais TO service_role;
GRANT SELECT ON TABLE thermo.empresa TO service_role;
GRANT SELECT ON TABLE thermo.fundo TO service_role;
GRANT SELECT ON TABLE thermo.medicion TO service_role;
GRANT SELECT ON TABLE thermo.ubicacion TO service_role;
GRANT SELECT ON TABLE thermo.localizacion TO service_role;
GRANT SELECT ON TABLE thermo.entidad TO service_role;
GRANT SELECT ON TABLE thermo.metrica TO service_role;
GRANT SELECT ON TABLE thermo.nodo TO service_role;
GRANT SELECT ON TABLE thermo.tipo TO service_role;

-- 2. Verificar que todos los permisos se otorgaron correctamente
SELECT 
    table_schema,
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_schema = 'sense' 
AND grantee = 'service_role'
ORDER BY table_name;

-- 3. Probar acceso a todas las tablas
SELECT 'pais' as tabla, COUNT(*) as total FROM thermo.pais
UNION ALL
SELECT 'empresa' as tabla, COUNT(*) as total FROM thermo.empresa
UNION ALL
SELECT 'fundo' as tabla, COUNT(*) as total FROM thermo.fundo
UNION ALL
SELECT 'medicion' as tabla, COUNT(*) as total FROM thermo.medicion
UNION ALL
SELECT 'ubicacion' as tabla, COUNT(*) as total FROM thermo.ubicacion
UNION ALL
SELECT 'localizacion' as tabla, COUNT(*) as total FROM thermo.localizacion
UNION ALL
SELECT 'entidad' as tabla, COUNT(*) as total FROM thermo.entidad
UNION ALL
SELECT 'metrica' as tabla, COUNT(*) as total FROM thermo.metrica
UNION ALL
SELECT 'nodo' as tabla, COUNT(*) as total FROM thermo.nodo
UNION ALL
SELECT 'tipo' as tabla, COUNT(*) as total FROM thermo.tipo;
