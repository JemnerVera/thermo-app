-- Verificar todos los países existentes en thermo.pais
SELECT 
    paisid,
    pais,
    paisabrev,
    statusid,
    usercreatedid,
    datecreated
FROM thermo.pais 
ORDER BY paisid;
