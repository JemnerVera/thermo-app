// Tipos para la nueva estructura del schema "sense"

export interface Pais {
  paisid: number;
  pais: string;
  paisabrev: string;
}

export interface Empresa {
  empresaid: number;
  empresa: string;
  empresabrev: string;
  paisid: number;
}

export interface Fundo {
  fundoid: number;
  fundo: string;
  empresaid: number;
  medicionesCount?: number;
}

export interface Ubicacion {
  ubicacionid: number;
  ubicacion: string;
  fundoid: number;
}

export interface Localizacion {
  localizacionid: number;
  localizacion: string;
  ubicacionid: number;
  statusid: number;
  usercreatedid: number;
  datecreated: string;
  usermodifiedid: number;
  datemodified: string;
}

export interface Criticidad {
  criticidadid: number;
  criticidad: string;
  descripcion?: string;
  color?: string;
  statusid: number;
  usercreatedid: number;
  datecreated: string;
  usermodifiedid: number;
  datemodified: string;
}

export interface Metrica {
  metricaid: number;
  metrica: string;
}

// DEPRECATED: Usar Sensor en su lugar
export interface Nodo {
  nodoid: number;
  nodo: string;
}

export interface Sensor {
  sensorid: number;
  sensor: string;
  tipoid: number;
  statusid: number;
  usercreatedid: number;
  datecreated: string;
  usermodifiedid: number;
  datemodified: string;
}

export interface Tipo {
  tipoid: number;
  tipo: string;
}

export interface Medicion {
  medicionid: number;
  localizacionsensorid: number;
  valor: number;
  fecha: string;
  usercreatedid: number;
  datecreated: string;
  // Relaciones opcionales
  localizacionsensor?: LocalizacionSensor;
  metrica?: Metrica;
  sensor?: Sensor;
  tipo?: {
    tipoid: number;
    tipo: string;
  };
  ubicacion?: {
    ubicacionid: number;
    ubicacion: string;
  };
}

export interface MetricaSensor {
  sensorid: number;
  metricaid: number;
  statusid: number;
  usercreatedid: number;
  usermodifiedid: number;
  datecreated: string;
  datemodified: string;
}

// DEPRECATED: Interfaz antigua de Sensor

export interface Entidad {
  entidadid: number;
  entidad: string;
  statusid: number;
}

// Interfaces para el estado de filtros
export interface FilterState {
  paisId?: number;
  empresaId?: number;
  fundoId?: number;
  ubicacionId?: number;
  startDate?: string;
  endDate?: string;
}

// Interfaces para datos de gráficos
export interface ChartData {
  time: string;
  [key: string]: any; // Para diferentes métricas (Temperatura, Humedad, EC)
}

// Interfaces para estadísticas del dashboard
export interface DashboardStats {
  totalMediciones: number;
  promedioMedicion: number;
  ultimaMedicion: string;
  sensoresActivos: number;
}

// Interfaces para respuestas de API
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// Interfaces para autenticación y usuario
export interface UserMetadata {
  full_name?: string;
  rol?: string;
  usuarioid?: number;
  auth_user_id?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: UserMetadata;
}

export interface AuthError {
  message: string;
}

// ===== NUEVAS INTERFACES PARA THERMOS =====

// LocalizacionSensor: Nueva tabla en Thermos que conecta sensores con ubicaciones
export interface LocalizacionSensor {
  localizacionsensorid: number;
  localizacionid: number;
  sensorid: number;
  metricaid: number;
  localizacionsensor: string;
  statusid: number;
  usercreatedid: number;
  datecreated: string;
  usermodifiedid: number;
  datemodified: string;
  // Relaciones opcionales
  localizacion?: Localizacion;
  sensor?: Sensor;
  metrica?: Metrica;
}

// MensajeError: Nueva tabla para errores de mensajes en Thermos
export interface MensajeError {
  mensaje_errorid: number;
  uuid_origen?: string;
  tipo_origen?: string;
  detalle?: string;
  usercreatedid: number;
  datecreated: string;
}

// Umbral: Actualizada para Thermos
export interface Umbral {
  umbralid: number;
  localizacionsensorid: number;
  criticidadid: number;
  umbral: string;
  maximo: number;
  minimo: number;
  estandar?: number;
  statusid: number;
  usercreatedid: number;
  datecreated: string;
  usermodifiedid: number;
  datemodified: string;
  // Relaciones opcionales
  localizacionsensor?: LocalizacionSensor;
  criticidad?: Criticidad;
}

// Alerta: Actualizada para Thermos
export interface Alerta {
  uuid_alerta: string;
  usercreatedid: number;
  medicionid: number;
  umbralid: number;
  fecha: string;
  statusid: number;
  datecreated: string;
  // Relaciones opcionales
  medicion?: Medicion;
  umbral?: Umbral;
}
