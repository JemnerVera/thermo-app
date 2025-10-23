-- Resetear tabla thermo.pais y empezar con contador limpio
-- Paso 1: Eliminar la entrada de Perú
DELETE FROM thermo.pais WHERE pais = 'Perú';

-- Paso 2: Resetear el contador IDENTITY a 1
ALTER SEQUENCE thermo.pais_paisid_seq RESTART WITH 1;

-- Paso 3: Insertar Perú con paisid: 1
INSERT INTO thermo.pais (
    pais,
    paisabrev,
    statusid,
    usercreatedid,
    usermodifiedid
) VALUES (
    'Perú',
    'PE',
    1,
    1,  -- usercreatedid (usuario sistema)
    1   -- usermodifiedid (usuario sistema)
);

-- Verificar que se insertó con paisid: 1
SELECT 
    paisid,
    pais,
    paisabrev,
    statusid,
    usercreatedid,
    datecreated
FROM thermo.pais 
WHERE pais = 'Perú';
