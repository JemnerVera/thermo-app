-- Migración de empresas: JoySense -> thermo.empresa
-- Resetear contador y migrar empresas

-- Paso 1: Resetear el contador IDENTITY a 1
ALTER SEQUENCE thermo.empresa_empresaid_seq RESTART WITH 1;

-- Paso 2: Insertar empresas de JoySense
-- Empresa 1: Agrícola Andrea S.A.C.
INSERT INTO thermo.empresa (
    paisid,
    empresa,
    empresabrev,
    statusid,
    usercreatedid,
    usermodifiedid
) VALUES (
    1,  -- paisid: 1 (Perú)
    'Agrícola Andrea S.A.C.',
    'AGA',
    1,
    1,  -- usercreatedid (usuario sistema)
    1   -- usermodifiedid (usuario sistema)
);

-- Empresa 2: Larama S.A.C.
INSERT INTO thermo.empresa (
    paisid,
    empresa,
    empresabrev,
    statusid,
    usercreatedid,
    usermodifiedid
) VALUES (
    1,  -- paisid: 1 (Perú)
    'Larama S.A.C.',
    'LR',
    1,
    1,  -- usercreatedid (usuario sistema)
    1   -- usermodifiedid (usuario sistema)
);

-- Verificar inserción
SELECT 
    empresaid,
    paisid,
    empresa,
    empresabrev,
    statusid,
    usercreatedid,
    datecreated
FROM thermo.empresa 
ORDER BY empresaid;
