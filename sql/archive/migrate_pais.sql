-- Migración de datos: public -> thermo.pais
-- Insertar país: Perú (PE)

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

-- Verificar inserción
SELECT 
    paisid,
    pais,
    paisabrev,
    statusid,
    usercreatedid,
    datecreated
FROM thermo.pais 
WHERE pais = 'Perú';
