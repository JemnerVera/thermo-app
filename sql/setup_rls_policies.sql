-- 🔐 CONFIGURACIÓN DE RLS POLICIES PARA SCHEMA SENSE
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Habilitar RLS en todas las tablas del schema sense (si no está habilitado)
ALTER TABLE thermo.pais ENABLE ROW LEVEL SECURITY;
ALTER TABLE thermo.empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE thermo.fundo ENABLE ROW LEVEL SECURITY;
ALTER TABLE thermo.ubicacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE thermo.medicion ENABLE ROW LEVEL SECURITY;
ALTER TABLE thermo.nodo ENABLE ROW LEVEL SECURITY;
ALTER TABLE thermo.tipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE thermo.entidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE thermo.metrica ENABLE ROW LEVEL SECURITY;
ALTER TABLE thermo.localizacion ENABLE ROW LEVEL SECURITY;

-- 2. Crear policies para SELECT (lectura) - Dashboard
-- Policy para tabla pais
CREATE POLICY "Usuarios autenticados pueden leer pais" ON thermo.pais
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy para tabla empresa
CREATE POLICY "Usuarios autenticados pueden leer empresa" ON thermo.empresa
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy para tabla fundo
CREATE POLICY "Usuarios autenticados pueden leer fundo" ON thermo.fundo
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy para tabla ubicacion
CREATE POLICY "Usuarios autenticados pueden leer ubicacion" ON thermo.ubicacion
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy para tabla medicion
CREATE POLICY "Usuarios autenticados pueden leer medicion" ON thermo.medicion
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy para tabla nodo
CREATE POLICY "Usuarios autenticados pueden leer nodo" ON thermo.nodo
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy para tabla tipo
CREATE POLICY "Usuarios autenticados pueden leer tipo" ON thermo.tipo
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy para tabla entidad
CREATE POLICY "Usuarios autenticados pueden leer entidad" ON thermo.entidad
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy para tabla metrica
CREATE POLICY "Usuarios autenticados pueden leer metrica" ON thermo.metrica
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy para tabla localizacion
CREATE POLICY "Usuarios autenticados pueden leer localizacion" ON thermo.localizacion
    FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Crear policies para INSERT (inserción) - Nueva funcionalidad
-- Policy para tabla pais
CREATE POLICY "Usuarios autenticados pueden insertar pais" ON thermo.pais
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy para tabla empresa
CREATE POLICY "Usuarios autenticados pueden insertar empresa" ON thermo.empresa
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy para tabla fundo
CREATE POLICY "Usuarios autenticados pueden insertar fundo" ON thermo.fundo
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy para tabla ubicacion
CREATE POLICY "Usuarios autenticados pueden insertar ubicacion" ON thermo.ubicacion
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy para tabla medicion
CREATE POLICY "Usuarios autenticados pueden insertar medicion" ON thermo.medicion
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy para tabla nodo
CREATE POLICY "Usuarios autenticados pueden insertar nodo" ON thermo.nodo
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy para tabla tipo
CREATE POLICY "Usuarios autenticados pueden insertar tipo" ON thermo.tipo
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy para tabla entidad
CREATE POLICY "Usuarios autenticados pueden insertar entidad" ON thermo.entidad
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy para tabla metrica
CREATE POLICY "Usuarios autenticados pueden insertar metrica" ON thermo.metrica
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy para tabla localizacion
CREATE POLICY "Usuarios autenticados pueden insertar localizacion" ON thermo.localizacion
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Verificar que las policies se crearon correctamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'sense'
ORDER BY tablename, cmd;
