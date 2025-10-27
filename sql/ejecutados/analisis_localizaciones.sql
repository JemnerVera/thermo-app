-- ============================================================================
-- ANÁLISIS: Extraer Localizaciones Únicas de public.zona
-- ============================================================================
-- Objetivo: Identificar las localizaciones físicas únicas basadas en el 
--           prefijo de public.zona.nombre (antes del guion)
-- ============================================================================

-- Query 1: Extraer el prefijo (localización) de cada zona
-- Ejemplo: 'tunel1-ambiental1' → 'tunel1'
SELECT 
  DISTINCT 
  SPLIT_PART(nombre, '-', 1) AS localizacion_prefix,
  COUNT(*) AS cantidad_sensores
FROM public.zona
GROUP BY SPLIT_PART(nombre, '-', 1)
ORDER BY localizacion_prefix;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- localizacion_prefix | cantidad_sensores
-- --------------------|-------------------
-- almacenamiento1     | 2
-- embarque1           | 2
-- fruta1              | 1
-- pasillo1            | 1
-- pasillo2            | 1
-- pid1                | 1
-- pid2                | 1
-- ...
-- pid14               | 1
-- proceso1            | 4
-- tunel1              | 4
-- tunel2              | 3
-- ...
-- tunel14             | 3
-- ventilador1         | 1
-- ...
-- ventilador14        | 1
-- ============================================================================

-- Query 2: Listar todos los sensores agrupados por localización
SELECT 
  SPLIT_PART(nombre, '-', 1) AS localizacion_prefix,
  ARRAY_AGG(nombre ORDER BY nombre) AS sensores
FROM public.zona
GROUP BY SPLIT_PART(nombre, '-', 1)
ORDER BY localizacion_prefix;

-- ============================================================================
-- RESULTADO ESPERADO (ejemplo):
-- ============================================================================
-- localizacion_prefix | sensores
-- --------------------|------------------------------------------------
-- tunel1              | {tunel1-ambiental1, tunel1-pulpa1, tunel1-pulpa2, tunel1-setpoint}
-- pid1                | {pid1-estado}
-- ventilador5         | {ventilador5-estado}
-- ============================================================================

