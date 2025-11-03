-- ============================================================================
-- RESINCRONIZACIÓN DE SECUENCIAS - Schema thermo
-- ============================================================================
-- Descripción: Resincroniza todas las secuencias después de inserciones manuales
-- con IDs específicos (migraciones). Esto asegura que el próximo INSERT use
-- el ID correcto sin conflictos de primary key.
-- 
-- Uso: Ejecutar después de cualquier migración con INSERT que especifique IDs
-- Fecha: 2025-10-27
-- ============================================================================

-- RESINCRONIZAR SECUENCIAS
-- Establece el next value de cada secuencia al MAX(id) + 1 de la tabla
-- Si la tabla está vacía, usa 1 como valor inicial
-- IMPORTANTE: Usamos MAX(id) + 1 para que nextval() devuelva el siguiente ID disponible
-- 
-- MÉTODO ROBUSTO:
-- 1. Primero llamamos a setval con 'true' para forzar el valor
-- 2. Luego lo ajustamos con 'false' para que el próximo nextval() devuelva el correcto
--
-- Para cada secuencia:
DO $$
DECLARE
  max_id INTEGER;
  next_id INTEGER;
BEGIN
  -- Pais
  SELECT COALESCE(MAX(paisid), 0) INTO max_id FROM thermo.pais;
  next_id := max_id + 1;
  PERFORM setval('thermo.pais_paisid_seq', next_id, true);
  PERFORM setval('thermo.pais_paisid_seq', next_id, false);
  
  -- Empresa
  SELECT COALESCE(MAX(empresaid), 0) INTO max_id FROM thermo.empresa;
  next_id := max_id + 1;
  PERFORM setval('thermo.empresa_empresaid_seq', next_id, true);
  PERFORM setval('thermo.empresa_empresaid_seq', next_id, false);
  
  -- Fundo
  SELECT COALESCE(MAX(fundoid), 0) INTO max_id FROM thermo.fundo;
  next_id := max_id + 1;
  PERFORM setval('thermo.fundo_fundoid_seq', next_id, true);
  PERFORM setval('thermo.fundo_fundoid_seq', next_id, false);
  
  -- Ubicacion
  SELECT COALESCE(MAX(ubicacionid), 0) INTO max_id FROM thermo.ubicacion;
  next_id := max_id + 1;
  PERFORM setval('thermo.ubicacion_ubicacionid_seq', next_id, true);
  PERFORM setval('thermo.ubicacion_ubicacionid_seq', next_id, false);
  
  -- Localizacion
  SELECT COALESCE(MAX(localizacionid), 0) INTO max_id FROM thermo.localizacion;
  next_id := max_id + 1;
  PERFORM setval('thermo.localizacion_localizacionid_seq', next_id, true);
  PERFORM setval('thermo.localizacion_localizacionid_seq', next_id, false);
  
  -- Entidad
  SELECT COALESCE(MAX(entidadid), 0) INTO max_id FROM thermo.entidad;
  next_id := max_id + 1;
  PERFORM setval('thermo.entidad_entidadid_seq', next_id, true);
  PERFORM setval('thermo.entidad_entidadid_seq', next_id, false);
  
  -- Tipo
  SELECT COALESCE(MAX(tipoid), 0) INTO max_id FROM thermo.tipo;
  next_id := max_id + 1;
  PERFORM setval('thermo.tipo_tipoid_seq', next_id, true);
  PERFORM setval('thermo.tipo_tipoid_seq', next_id, false);
  
  -- Sensor
  SELECT COALESCE(MAX(sensorid), 0) INTO max_id FROM thermo.sensor;
  next_id := max_id + 1;
  PERFORM setval('thermo.sensor_sensorid_seq', next_id, true);
  PERFORM setval('thermo.sensor_sensorid_seq', next_id, false);
  
  -- Metrica
  SELECT COALESCE(MAX(metricaid), 0) INTO max_id FROM thermo.metrica;
  next_id := max_id + 1;
  PERFORM setval('thermo.metrica_metricaid_seq', next_id, true);
  PERFORM setval('thermo.metrica_metricaid_seq', next_id, false);
  
  -- LocalizacionSensor
  SELECT COALESCE(MAX(localizacionsensorid), 0) INTO max_id FROM thermo.localizacionsensor;
  next_id := max_id + 1;
  PERFORM setval('thermo.localizacionsensor_localizacionsensorid_seq', next_id, true);
  PERFORM setval('thermo.localizacionsensor_localizacionsensorid_seq', next_id, false);
  
  -- Umbral
  SELECT COALESCE(MAX(umbralid), 0) INTO max_id FROM thermo.umbral;
  next_id := max_id + 1;
  PERFORM setval('thermo.umbral_umbralid_seq', next_id, true);
  PERFORM setval('thermo.umbral_umbralid_seq', next_id, false);
  
  -- Criticidad
  SELECT COALESCE(MAX(criticidadid), 0) INTO max_id FROM thermo.criticidad;
  next_id := max_id + 1;
  PERFORM setval('thermo.criticidad_criticidadid_seq', next_id, true);
  PERFORM setval('thermo.criticidad_criticidadid_seq', next_id, false);
  
  -- Audit Log Umbral
  SELECT COALESCE(MAX(auditid), 0) INTO max_id FROM thermo.audit_log_umbral;
  next_id := max_id + 1;
  PERFORM setval('thermo.audit_log_umbral_auditid_seq', next_id, true);
  PERFORM setval('thermo.audit_log_umbral_auditid_seq', next_id, false);
  
  -- Usuario
  SELECT COALESCE(MAX(usuarioid), 0) INTO max_id FROM thermo.usuario;
  next_id := max_id + 1;
  PERFORM setval('thermo.usuario_usuarioid_seq', next_id, true);
  PERFORM setval('thermo.usuario_usuarioid_seq', next_id, false);
  
  -- Perfil
  SELECT COALESCE(MAX(perfilid), 0) INTO max_id FROM thermo.perfil;
  next_id := max_id + 1;
  PERFORM setval('thermo.perfil_perfilid_seq', next_id, true);
  PERFORM setval('thermo.perfil_perfilid_seq', next_id, false);
  
  -- Contacto
  SELECT COALESCE(MAX(contactoid), 0) INTO max_id FROM thermo.contacto;
  next_id := max_id + 1;
  PERFORM setval('thermo.contacto_contactoid_seq', next_id, true);
  PERFORM setval('thermo.contacto_contactoid_seq', next_id, false);
  
  -- Correo
  SELECT COALESCE(MAX(correoid), 0) INTO max_id FROM thermo.correo;
  next_id := max_id + 1;
  PERFORM setval('thermo.correo_correoid_seq', next_id, true);
  PERFORM setval('thermo.correo_correoid_seq', next_id, false);
  
  -- Medicion
  SELECT COALESCE(MAX(medicionid), 0) INTO max_id FROM thermo.medicion;
  next_id := max_id + 1;
  PERFORM setval('thermo.medicion_medicionid_seq', next_id, true);
  PERFORM setval('thermo.medicion_medicionid_seq', next_id, false);
  
  -- Mensaje Error
  SELECT COALESCE(MAX(mensaje_errorid), 0) INTO max_id FROM thermo.mensaje_error;
  next_id := max_id + 1;
  PERFORM setval('thermo.mensaje_error_mensaje_errorid_seq', next_id, true);
  PERFORM setval('thermo.mensaje_error_mensaje_errorid_seq', next_id, false);
  
  -- Sensor Valor Error
  SELECT COALESCE(MAX(sensorvalorerrorid), 0) INTO max_id FROM thermo.sensor_valor_error;
  next_id := max_id + 1;
  PERFORM setval('thermo.sensor_valor_error_sensorvalorerrorid_seq', next_id, true);
  PERFORM setval('thermo.sensor_valor_error_sensorvalorerrorid_seq', next_id, false);
  
  RAISE NOTICE '✅ Todas las secuencias han sido resincronizadas correctamente';
END $$;

-- ============================================================================
-- NOTA: codigotelefono NO tiene secuencia (no usa GENERATED AS IDENTITY)
-- ============================================================================

SELECT '✅ Secuencias resincronizadas correctamente' AS resultado;
