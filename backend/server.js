require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Constantes de validación
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sistema de logging configurable
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // debug, info, warn, error
const isDebugMode = LOG_LEVEL === 'debug';
const isInfoMode = ['debug', 'info'].includes(LOG_LEVEL);

const logger = {
  debug: (message, ...args) => isDebugMode && console.log(`🔍 ${message}`, ...args),
  info: (message, ...args) => isInfoMode && console.log(`✅ ${message}`, ...args),
  warn: (message, ...args) => console.log(`⚠️ ${message}`, ...args),
  error: (message, ...args) => console.error(`❌ ${message}`, ...args)
};

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de logging para todas las peticiones (solo en modo debug)
app.use((req, res, next) => {
  if (isDebugMode) {
    logger.debug(`${req.method} ${req.url}`);
  }
  next();
});

// Ruta de prueba simple
app.get('/api/test', (req, res) => {
  console.log('🧪 Ruta de prueba accedida');
  res.json({ 
    message: 'Servidor funcionando correctamente', 
    timestamp: new Date().toISOString(),
    config: {
      url: supabaseUrl,
      schema: dbSchema,
      hasKey: !!supabaseKey
    }
  });
});

// Configuración de Supabase - Service Role Key (SOLO BACKEND)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const dbSchema = process.env.DB_SCHEMA || 'thermo';

// Crear cliente de Supabase con configuración de esquema
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: dbSchema }
});

// Cliente de Supabase para schema public (para tablas como temperatura_zona)
// Sin configuración de schema para acceder a public por defecto
const supabasePublic = createClient(supabaseUrl, supabaseKey);

// Log de configuración inicial
console.log('🔧 Configuración de Supabase:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Schema: ${dbSchema}`);
console.log(`   Key: ${supabaseKey ? '✅ Configurada' : '❌ No configurada'}`);
console.log(`   Key Preview: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NO KEY'}`);

// Test de conexión inicial - VERIFICAR ACCESO A TODAS LAS TABLAS
console.log('🔍 Verificando acceso a todas las tablas del schema thermo...');

// Lista de todas las tablas del schema thermo
const tablasThermo = [
  'pais', 'empresa', 'fundo', 'ubicacion', 'localizacion', 'entidad',
  'sensor', 'metrica', 'tipo', 'criticidad', 'perfil', 'usuario',
  'contacto', 'correo', 'codigotelefono', 'mensaje', 'mensaje_error',
  'localizacionsensor', 'metricasensor', 'medicion', 'umbral', 'alerta',
  'alertaconsolidado', 'usuarioperfil', 'perfilumbral', 'audit_log_umbral',
  'sensor_valor', 'sensor_valor_error'
];

console.log(`🧪 Probando acceso a ${tablasThermo.length} tablas...`);

// Función para probar cada tabla
async function probarTablas() {
  const resultados = [];
  
  for (const tabla of tablasThermo) {
    try {
      const { data, error } = await supabase
        .from(tabla)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${tabla}: ${error.message}`);
        resultados.push({ tabla, estado: 'ERROR', error: error.message });
      } else {
        console.log(`✅ ${tabla}: Acceso OK (${data?.[0]?.count || 0} registros)`);
        resultados.push({ tabla, estado: 'OK', count: data?.[0]?.count || 0 });
      }
    } catch (err) {
      console.log(`❌ ${tabla}: Error crítico - ${err.message}`);
      resultados.push({ tabla, estado: 'CRITICAL', error: err.message });
    }
  }
  
  // Resumen
  const exitosas = resultados.filter(r => r.estado === 'OK').length;
  const errores = resultados.filter(r => r.estado !== 'OK').length;
  
  console.log('\n📊 RESUMEN:');
  console.log(`✅ Tablas accesibles: ${exitosas}/${tablasThermo.length}`);
  console.log(`❌ Tablas con error: ${errores}/${tablasThermo.length}`);
  
  if (errores > 0) {
    console.log('\n❌ Tablas con problemas:');
    resultados.filter(r => r.estado !== 'OK').forEach(r => {
      console.log(`   - ${r.tabla}: ${r.error}`);
    });
  }
  
  if (exitosas === tablasThermo.length) {
    console.log('\n🎉 ¡TODAS LAS TABLAS SON ACCESIBLES!');
  }
}

// Ejecutar las pruebas
probarTablas();


// ============================================================================
// HELPER: PAGINACIÓN, BÚSQUEDA Y FILTROS - PATRÓN ENTERPRISE
// ============================================================================

// Configurar campos donde se puede buscar por texto
const SEARCHABLE_FIELDS = {
  metricasensor: ['sensorid', 'metricaid'],
  sensor: ['sensorid', 'ubicacionid'],
  alerta: ['medicionid', 'alertaid'],
  umbral: ['umbralid', 'sensorid', 'metricaid'],
  medicion: ['medicionid', 'sensorid'],
  localizacion: ['localizacionid', 'ubicacionid'],
  localizacionsensor: ['localizacionid', 'sensorid'],
  usuario: ['login', 'nombre', 'email'],
  mensaje: ['mensajeid'],
  usuarioperfil: ['usuarioid', 'perfilid'],
  // AGREGAR MÁS TABLAS SEGÚN NECESIDAD
};

/**
 * Función helper para paginación, búsqueda y filtros server-side
 * Soporta 2 modos:
 *   - MODO LEGACY (sin 'page'): Carga todos los registros automáticamente
 *   - MODO PAGINADO (con 'page'): Carga solo una página a la vez
 * 
 * @param {string} tableName - Nombre de la tabla
 * @param {object} params - Parámetros de query
 * @returns {Promise<Array|Object>} Array directo (legacy) o { data, pagination } (paginado)
 */
// Mapeo de columnas de ordenamiento por defecto para cada tabla
const DEFAULT_SORT_COLUMNS = {
  'alerta': 'fecha',              // alerta no tiene datemodified, usa fecha
  'alertaconsolidado': 'fechainicio', // alertaconsolidado usa fechainicio
  'mensaje': 'fecha',             // mensaje usa fecha
  'medicion': 'fecha',            // medicion usa fecha
  // Otras tablas usan datemodified por defecto
};

async function paginateAndFilter(tableName, params = {}) {
  const {
    page,                    // Número de página (1, 2, 3...) - OPCIONAL
    pageSize = 100,          // Registros por página - DEFAULT: 100
    search = '',             // Texto de búsqueda - OPCIONAL
    sortBy,                  // Campo para ordenar - puede venir en params
    sortOrder = 'desc',      // asc o desc - DEFAULT: desc
    ...filters               // Filtros adicionales (paisid, empresaid, statusid, etc.)
  } = params;

  // Determinar campo de ordenamiento: usar el que viene en params, o el default según tabla
  const finalSortBy = sortBy || DEFAULT_SORT_COLUMNS[tableName] || 'datemodified';

  // Determinar si usar paginación o modo legacy
  const usePagination = page !== undefined && page !== null;

  try {
    // ========================================================================
    // 1. CONSTRUIR QUERY BASE
    // ========================================================================
    let query = supabase.from(tableName).select('*', { count: 'exact' });

    // ========================================================================
    // 2. APLICAR FILTROS (paisid, empresaid, fundoid, statusid, etc.)
    // ========================================================================
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        query = query.eq(key, filters[key]);
      }
    });

    // ========================================================================
    // 3. APLICAR BÚSQUEDA (OR entre campos definidos en SEARCHABLE_FIELDS)
    // ========================================================================
    if (search && search.trim() !== '') {
      const searchFields = SEARCHABLE_FIELDS[tableName] || [];
      if (searchFields.length > 0) {
        const searchConditions = searchFields.map(field => 
          `${field}.ilike.%${search}%`
        ).join(',');
        query = query.or(searchConditions);
      }
    }

    // ========================================================================
    // 4. OBTENER TOTAL DE REGISTROS (para calcular páginas)
    // ========================================================================
    const { count: totalRecords } = await query;

    // ========================================================================
    // 5. APLICAR ORDENAMIENTO
    // ========================================================================
    if (finalSortBy) {
      query = query.order(finalSortBy, { ascending: sortOrder === 'asc' });
    }

    // ========================================================================
    // 6A. MODO PAGINADO: Cargar solo 1 página
    // ========================================================================
    if (usePagination) {
      const offset = (page - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);
      
      const { data, error } = await query;
      if (error) throw error;

      // Devolver objeto con data + pagination info
      return {
        data: data || [],
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: totalRecords || 0,
          totalPages: Math.ceil((totalRecords || 0) / pageSize)
        }
      };
    }

    // ========================================================================
    // 6B. MODO LEGACY: Cargar TODOS los registros en chunks de 1000
    // ========================================================================
    else {
      console.log(`📚 Modo legacy: Cargando todos los registros de ${tableName}`);
      
      let allData = [];
      let currentOffset = 0;
      const chunkSize = 1000; // Límite de Supabase

      // Loop para obtener todos los registros en chunks
      while (true) {
        // Construir query para este chunk (sin count, solo select)
        let chunkQuery = supabase.from(tableName).select('*');
        
        // Aplicar los mismos filtros
        Object.keys(filters).forEach(key => {
          if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
            chunkQuery = chunkQuery.eq(key, filters[key]);
          }
        });
        
        // Aplicar búsqueda si existe
        if (search && search.trim() !== '') {
          const searchFields = SEARCHABLE_FIELDS[tableName] || [];
          if (searchFields.length > 0) {
            const searchConditions = searchFields.map(field => 
              `${field}.ilike.%${search}%`
            ).join(',');
            chunkQuery = chunkQuery.or(searchConditions);
          }
        }
        
        // Aplicar ordenamiento
        if (finalSortBy) {
          chunkQuery = chunkQuery.order(finalSortBy, { ascending: sortOrder === 'asc' });
        }
        
        // Aplicar range para este chunk
        chunkQuery = chunkQuery.range(currentOffset, currentOffset + chunkSize - 1);
        
        const { data: chunk, error } = await chunkQuery;

        if (error) throw error;
        if (!chunk || chunk.length === 0) break;

        allData = allData.concat(chunk);
        
        // Si recibimos menos de 1000, ya no hay más registros
        if (chunk.length < chunkSize) break;
        
        currentOffset += chunkSize;
      }

      // Devolver array directo (sin pagination object)
      return allData;
    }

  } catch (error) {
    console.error(`❌ Error en paginateAndFilter para ${tableName}:`, error);
    throw error;
  }
}


// Cache de metadatos para evitar consultas repetidas
// Cache para metadatos de tablas (deshabilitado para usar siempre función dinámica)
const metadataCache = new Map();

// Función para obtener metadatos dinámicamente usando Stored Procedure
const getTableMetadata = async (tableName) => {
  // Cache deshabilitado temporalmente para usar siempre función dinámica
  // if (metadataCache.has(tableName)) {
  //   console.log(`📋 Usando metadatos en cache para tabla: ${tableName}`);
  //   return metadataCache.get(tableName);
  // }
  
  try {
    console.log(`🔍 Obteniendo metadatos dinámicos para tabla: ${tableName} usando función Supabase`);
    
    // Usar la función de Supabase para obtener metadatos
    const { data: metadataResult, error: metadataError } = await supabase
      .rpc('fn_get_table_metadata', { tbl_name: tableName });
    
    console.log(`🔍 DEBUG: Resultado de get_table_metadata para ${tableName}:`, {
      hasData: !!metadataResult,
      error: metadataError,
      columnsCount: metadataResult?.columns?.length || 0
    });
    
    if (metadataError) {
      console.log(`⚠️ Error obteniendo metadatos via función para ${tableName}:`, metadataError);
      console.log(`🔄 Usando metadatos hardcodeados como fallback para ${tableName}`);
      const fallbackMetadata = getHardcodedMetadata(tableName);
      metadataCache.set(tableName, fallbackMetadata);
      return fallbackMetadata;
    }
    
    if (!metadataResult || !metadataResult.columns || metadataResult.columns.length === 0) {
      console.log(`⚠️ No se encontraron columnas para ${tableName} via función dinámica`);
      console.log(`🔍 DEBUG: metadataResult es:`, metadataResult);
      console.log(`❌ Tabla ${tableName} no encontrada en el schema thermo`);
      return null;
    }
    
    // Construir el objeto de metadatos desde el resultado de la función
    const metadata = {
      columns: metadataResult.columns.map(col => ({
        column_name: col.column_name,
        data_type: col.data_type,
        is_nullable: col.is_nullable,
        column_default: col.column_default
      })),
      info: metadataResult.info || { table_name: tableName, table_type: 'BASE TABLE' },
      constraints: metadataResult.constraints || []
    };
    
    // Guardar en cache
    metadataCache.set(tableName, metadata);
    console.log(`✅ Metadatos dinámicos obtenidos via función Supabase para: ${tableName}`);
    console.log(`📊 Columnas encontradas: ${metadata.columns.length}`);
    console.log(`🔗 Constraints encontrados: ${metadata.constraints.length}`);
    
    return metadata;
  } catch (error) {
    console.error(`❌ Error obteniendo metadatos dinámicos para ${tableName}:`, error);
    console.log(`❌ No se pueden obtener metadatos para ${tableName}`);
    return null;
  }
};

// Función fallback con metadatos hardcodeados
const getHardcodedMetadata = (tableName) => {
  console.log(`⚠️ Usando metadatos hardcodeados para tabla: ${tableName}`);
  console.log(`🔍 DEBUG: Buscando metadatos hardcodeados para: ${tableName}`);
  
  // Metadatos hardcodeados para las tablas principales
  const hardcodedMetadata = {
    pais: {
      columns: [
        { column_name: 'paisid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'pais', data_type: 'character varying', is_nullable: 'NO', column_default: null },
        { column_name: 'statusid', data_type: 'integer', is_nullable: 'NO', column_default: '1' },
        { column_name: 'usercreatedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datecreated', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
        { column_name: 'usermodifiedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datemodified', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' }
      ],
      info: { table_name: 'pais', table_type: 'BASE TABLE' },
      constraints: [{ constraint_name: 'pk_pais', constraint_type: 'PRIMARY KEY' }]
    },
    empresa: {
      columns: [
        { column_name: 'empresaid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'empresa', data_type: 'character varying', is_nullable: 'NO', column_default: null },
        { column_name: 'paisid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'statusid', data_type: 'integer', is_nullable: 'NO', column_default: '1' },
        { column_name: 'usercreatedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datecreated', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
        { column_name: 'usermodifiedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datemodified', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' }
      ],
      info: { table_name: 'empresa', table_type: 'BASE TABLE' },
      constraints: [{ constraint_name: 'pk_empresa', constraint_type: 'PRIMARY KEY' }]
    },
    fundo: {
      columns: [
        { column_name: 'fundoid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'fundo', data_type: 'character varying', is_nullable: 'NO', column_default: null },
        { column_name: 'empresaid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'statusid', data_type: 'integer', is_nullable: 'NO', column_default: '1' },
        { column_name: 'usercreatedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datecreated', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
        { column_name: 'usermodifiedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datemodified', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' }
      ],
      info: { table_name: 'fundo', table_type: 'BASE TABLE' },
      constraints: [{ constraint_name: 'pk_fundo', constraint_type: 'PRIMARY KEY' }]
    },
    ubicacion: {
      columns: [
        { column_name: 'ubicacionid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'ubicacion', data_type: 'character varying', is_nullable: 'NO', column_default: null },
        { column_name: 'fundoid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'statusid', data_type: 'integer', is_nullable: 'NO', column_default: '1' },
        { column_name: 'usercreatedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datecreated', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
        { column_name: 'usermodifiedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datemodified', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' }
      ],
      info: { table_name: 'ubicacion', table_type: 'BASE TABLE' },
      constraints: [{ constraint_name: 'pk_ubicacion', constraint_type: 'PRIMARY KEY' }]
    },
    entidad: {
      columns: [
        { column_name: 'entidadid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'entidad', data_type: 'character varying', is_nullable: 'NO', column_default: null },
        { column_name: 'ubicacionid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'statusid', data_type: 'integer', is_nullable: 'NO', column_default: '1' },
        { column_name: 'usercreatedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datecreated', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
        { column_name: 'usermodifiedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datemodified', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' }
      ],
      info: { table_name: 'entidad', table_type: 'BASE TABLE' },
      constraints: [{ constraint_name: 'pk_entidad', constraint_type: 'PRIMARY KEY' }]
    },
    metrica: {
      columns: [
        { column_name: 'metricaid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'metrica', data_type: 'character varying', is_nullable: 'NO', column_default: null },
        { column_name: 'unidad', data_type: 'character varying', is_nullable: 'YES', column_default: null },
        { column_name: 'statusid', data_type: 'integer', is_nullable: 'NO', column_default: '1' },
        { column_name: 'usercreatedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datecreated', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
        { column_name: 'usermodifiedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datemodified', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' }
      ],
      info: { table_name: 'metrica', table_type: 'BASE TABLE' },
      constraints: [{ constraint_name: 'pk_metrica', constraint_type: 'PRIMARY KEY' }]
    },
    tipo: {
      columns: [
        { column_name: 'tipoid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'tipo', data_type: 'character varying', is_nullable: 'NO', column_default: null },
        { column_name: 'statusid', data_type: 'integer', is_nullable: 'NO', column_default: '1' },
        { column_name: 'usercreatedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datecreated', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
        { column_name: 'usermodifiedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datemodified', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' }
      ],
      info: { table_name: 'tipo', table_type: 'BASE TABLE' },
      constraints: [{ constraint_name: 'pk_tipo', constraint_type: 'PRIMARY KEY' }]
    },
    // nodo eliminado - no existe en schema Thermos
    usuario: {
      columns: [
        { column_name: 'usuarioid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'usuario', data_type: 'character varying', is_nullable: 'NO', column_default: null },
        { column_name: 'email', data_type: 'character varying', is_nullable: 'NO', column_default: null },
        { column_name: 'password', data_type: 'character varying', is_nullable: 'NO', column_default: null },
        { column_name: 'statusid', data_type: 'integer', is_nullable: 'NO', column_default: '1' },
        { column_name: 'usercreatedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datecreated', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
        { column_name: 'usermodifiedid', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'datemodified', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' }
      ],
      info: { table_name: 'usuario', table_type: 'BASE TABLE' },
      constraints: [{ constraint_name: 'pk_usuario', constraint_type: 'PRIMARY KEY' }]
    }
  };
  
  const metadata = hardcodedMetadata[tableName] || {
    columns: [],
    info: { table_name: tableName, table_type: 'BASE TABLE' },
    constraints: []
  };
  
  console.log(`🔍 DEBUG: getHardcodedMetadata devolviendo ${metadata.columns.length} columnas para ${tableName}`);
  console.log(`🔍 DEBUG: Tablas disponibles en hardcodedMetadata:`, Object.keys(hardcodedMetadata));
  console.log(`🔍 DEBUG: ¿Existe ${tableName} en hardcodedMetadata?`, hardcodedMetadata.hasOwnProperty(tableName));
  return metadata;
};

logger.info('Cliente Supabase configurado');

// Función genérica para rutas de tablas
const createTableRoute = (tableName, orderBy = `${tableName}id`, selectQuery = '*') => {
  return async (req, res) => {
    try {
      const { limit = process.env.DEFAULT_LIMIT || 100 } = req.query;
      logger.debug(`Obteniendo ${tableName} del schema thermo...`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select(selectQuery)
        .order(orderBy)
        .limit(parseInt(limit));
      
      if (error) {
        logger.error(`Error backend en ${tableName}:`, error);
        return res.status(500).json({ error: error.message });
      }
      
      logger.debug(`${tableName} obtenido:`, data?.length || 0);
      res.json(data || []);
    } catch (error) {
      logger.error(`Error in /api/thermo/${tableName}:`, error);
      res.status(500).json({ error: error.message });
    }
  };
};

// Middleware para verificar autenticación (opcional por ahora)
const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización requerido' });
  }

  const token = authHeader.substring(7);
    
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
        return res.status(401).json({ error: 'Token inválido' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error verificando token:', error);
    return res.status(401).json({ error: 'Error verificando token' });
  }
};

// Rutas para tablas en singular - usadas por el frontend de parámetros
app.get('/api/thermo/pais', createTableRoute('pais', 'paisid'));

app.get('/api/thermo/empresa', createTableRoute('empresa', 'empresaid'));

app.get('/api/thermo/fundo', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo fundo del schema thermo...');
    const { data, error } = await supabase
      .from('fundo')
      .select(`
        *,
        empresa:empresaid(
          empresaid,
          empresa,
          empresabrev,
          paisid
        )
      `)
      .order('fundoid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Fundo obtenido: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/fundo:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/ubicacion', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo ubicacion del schema thermo...');
    const { data, error } = await supabase
      .from('ubicacion')
      .select('*')
      .order('ubicacionid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Ubicacion obtenida: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/ubicacion:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/entidad', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo entidad del schema thermo...');
    const { data, error } = await supabase
      .from('entidad')
      .select('*')
      .order('entidadid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Entidad obtenida: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/entidad:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/metrica', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo metrica del schema thermo...');
    const { data, error } = await supabase
      .from('metrica')
      .select('*')
      .order('metricaid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Metrica obtenida: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/metrica:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/tipo', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo tipo del schema thermo...');
    const { data, error } = await supabase
      .from('tipo')
      .select('*')
      .order('tipoid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Tipo obtenido: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/tipo:', error); res.status(500).json({ error: error.message }); }
});

// Tabla 'nodo' no existe en schema Thermos - eliminada

app.get('/api/thermo/criticidad', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo criticidad del schema thermo...');
    const { data, error } = await supabase
      .from('criticidad')
      .select('*')
      .order('criticidadid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Criticidad obtenida: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/criticidad:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/perfil', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo perfil del schema thermo...');
    const { data, error } = await supabase
      .from('perfil')
      .select('*')
      .order('perfilid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Perfil obtenido: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/perfil:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/umbral', async (req, res) => {
  try {
    logger.debug('Obteniendo umbral del schema thermo...');
    const result = await paginateAndFilter('umbral', req.query);
    
    if (result.pagination) {
      // MODO PAGINADO: devolver objeto con data + pagination
      logger.debug(`Umbral obtenidos: ${result.data.length} de ${result.pagination.total}`);
      res.json(result);
    } else {
      // MODO LEGACY: devolver array directo
      logger.debug(`Umbral obtenidos (modo legacy): ${result.length}`);
      res.json(result);
    }
  } catch (error) {
    console.error('❌ Error in /api/thermo/umbral:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tabla 'medio' no existe en schema Thermos - eliminada

// NUEVAS TABLAS EN THERMOS
app.get('/api/thermo/localizacionsensor', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo localizacionsensor del schema thermo...');
    const { data, error } = await supabase
      .from('localizacionsensor')
      .select('*')
      .eq('statusid', 1)
      .order('localizacionsensorid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Localizacionsensor obtenido: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/localizacionsensor:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/mensaje_error', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo mensaje_error del schema thermo...');
    const { data, error } = await supabase
      .from('mensaje_error')
      .select('*')
      .order('mensaje_errorid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Mensaje_error obtenido: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/mensaje_error:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/sensor', async (req, res) => {
  try {
    logger.debug('Obteniendo sensor del schema thermo...');
    const result = await paginateAndFilter('sensor', req.query);
    
    if (result.pagination) {
      // MODO PAGINADO: devolver objeto con data + pagination
      logger.debug(`Sensor obtenidos: ${result.data.length} de ${result.pagination.total}`);
      res.json(result);
    } else {
      // MODO LEGACY: devolver array directo
      logger.debug(`Sensor obtenidos (modo legacy): ${result.length}`);
      res.json(result);
    }
  } catch (error) {
    console.error('❌ Error in /api/thermo/sensor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para metricasensor - usada por el frontend
app.get('/api/thermo/metricasensor', async (req, res) => {
  try {
    logger.debug('Obteniendo metricasensor del schema thermo...');
    const result = await paginateAndFilter('metricasensor', req.query);
    
    if (result.pagination) {
      // MODO PAGINADO: devolver objeto con data + pagination
      logger.debug(`Metricasensor obtenidos: ${result.data.length} de ${result.pagination.total}`);
      res.json(result);
    } else {
      // MODO LEGACY: devolver array directo
      logger.debug(`Metricasensor obtenidos (modo legacy): ${result.length}`);
      res.json(result);
    }
  } catch (error) {
    console.error('❌ Error in /api/thermo/metricasensor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para perfilumbral - usada por el frontend
app.get('/api/thermo/perfilumbral', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo perfilumbral del schema thermo...');
    const { data, error } = await supabase
      .from('perfilumbral')
      .select('*')
      .order('perfilid, umbralid') // Ordenar por clave primaria compuesta
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Perfilumbral obtenido: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/perfilumbral:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para usuarioperfil - usada por el frontend
app.get('/api/thermo/usuarioperfil', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo usuarioperfil del schema thermo...');
    const { data, error } = await supabase
      .from('usuarioperfil')
      .select('*')
      .order('usuarioid, perfilid') // Ordenar por clave primaria compuesta
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Usuarioperfil obtenido: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/usuarioperfil:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para audit_log_umbral - usada por el frontend
app.get('/api/thermo/audit_log_umbral', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo audit_log_umbral del schema thermo...');
    const { data, error } = await supabase
      .from('audit_log_umbral')
      .select('*')
      .order('auditid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Audit_log_umbral obtenido: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/audit_log_umbral:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para contacto - usada por el frontend
app.get('/api/thermo/contacto', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo contacto del schema thermo...');
    const { data, error } = await supabase
      .from('contacto')
      .select(`
        *,
        codigotelefono:codigotelefonoid(codigotelefono, paistelefono),
        usuario:usuarioid(login, firstname, lastname)
      `)
      .order('contactoid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Contacto obtenido: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/contacto:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para codigotelefono - usada por el frontend
app.get('/api/thermo/codigotelefono', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo codigotelefono del schema thermo...');
    const { data, error } = await supabase
      .from('codigotelefono')
      .select('*')
      .eq('statusid', 1)
      .order('codigotelefonoid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Codigotelefono obtenido: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/codigotelefono:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para correo - usada por el frontend
app.get('/api/thermo/correo', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo correo del schema thermo...');
    const { data, error } = await supabase
      .from('correo')
      .select(`
        *,
        usuario:usuarioid(login, firstname, lastname)
      `)
      .eq('statusid', 1)
      .order('correoid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Correo obtenido: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/correo:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para localizacion - usada por el frontend
app.get('/api/thermo/localizacion', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo localizacion del schema thermo...');
    const { data, error } = await supabase
      .from('localizacion')
      .select('*')
      .order('localizacionid') // Ordenar por clave primaria
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Localizacion obtenida: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/localizacion:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para usuario - usada por el frontend
app.get('/api/thermo/usuario', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo usuarios de thermo.usuario...');
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .order('usuarioid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Usuarios encontrados: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/usuario:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para alerta - usada por el frontend
app.get('/api/thermo/alerta', async (req, res) => {
  try {
    logger.debug('Obteniendo alertas de thermo.alerta...');
    const result = await paginateAndFilter('alerta', req.query);
    
    if (result.pagination) {
      // MODO PAGINADO: devolver objeto con data + pagination
      logger.debug(`Alertas obtenidas: ${result.data.length} de ${result.pagination.total}`);
      res.json(result);
    } else {
      // MODO LEGACY: devolver array directo
      logger.debug(`Alertas obtenidas (modo legacy): ${result.length}`);
      res.json(result);
    }
  } catch (error) {
    console.error('❌ Error in /api/thermo/alerta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para mensaje - usada por el frontend
app.get('/api/thermo/mensaje', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo mensajes de thermo.mensaje...');
    const { data, error } = await supabase
      .from('mensaje')
      .select(`
        *,
        contacto:contactoid(
          contactoid,
          celular,
          usuarioid,
          usuario:usuarioid(login, firstname, lastname)
        )
      `)
      .order('fecha', { ascending: false })
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Mensajes encontrados: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/mensaje:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para alertaconsolidado - usada por el frontend
app.get('/api/thermo/alertaconsolidado', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug('Obteniendo alertas consolidadas de thermo.alertaconsolidado...');
    const { data, error } = await supabase
      .from('alertaconsolidado')
      .select('*')
      .order('fecha_inicio', { ascending: false })
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    logger.debug(`Alertas consolidadas encontradas: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/alertaconsolidado:', error); res.status(500).json({ error: error.message }); }
});

// Rutas para obtener información de las tablas (usadas por el frontend de parámetros)
app.get('/api/thermo/:tableName/columns', async (req, res) => {
  try {
    const { tableName } = req.params;
    logger.debug(`Obteniendo columnas de la tabla ${tableName}...`);
    
    // Usar metadatos dinámicos con fallback a hardcodeados
    const metadata = await getTableMetadata(tableName);
    if (!metadata) {
      console.error(`❌ Tabla ${tableName} no encontrada en metadatos`);
      return res.status(404).json({ error: `Tabla ${tableName} no encontrada` });
    }

    logger.debug(`Columnas obtenidas para ${tableName}: ${metadata.columns.length}`);
    res.json(metadata.columns);
  } catch (error) {
    console.error(`❌ Error in /api/thermo/${req.params.tableName}/columns:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/:tableName/info', async (req, res) => {
  try {
    const { tableName } = req.params;
    logger.debug(`Obteniendo información de la tabla ${tableName}...`);
    
    // Usar metadatos dinámicos con fallback a hardcodeados
    const metadata = await getTableMetadata(tableName);
    if (!metadata) {
      console.error(`❌ Tabla ${tableName} no encontrada en metadatos`);
      return res.status(404).json({ error: `Tabla ${tableName} no encontrada` });
    }

    logger.debug(`Información obtenida para ${tableName}`);
    res.json(metadata.info);
  } catch (error) {
    console.error(`❌ Error in /api/thermo/${req.params.tableName}/info:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/:tableName/constraints', async (req, res) => {
  try {
    const { tableName } = req.params;
    logger.debug(`Obteniendo constraints de la tabla ${tableName}...`);
    
    // Usar metadatos dinámicos con fallback a hardcodeados
    const metadata = await getTableMetadata(tableName);
    if (!metadata) {
      console.error(`❌ Tabla ${tableName} no encontrada en metadatos`);
      return res.status(404).json({ error: `Tabla ${tableName} no encontrada` });
    }

    logger.debug(`Constraints obtenidos para ${tableName}: ${metadata.constraints.length}`);
    res.json(metadata.constraints);
  } catch (error) {
    console.error(`❌ Error in /api/thermo/${req.params.tableName}/constraints:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para obtener tablas disponibles dinámicamente
app.get('/api/thermo/tables', async (req, res) => {
  try {
    console.log('🔍 Obteniendo tablas disponibles en schema thermo...');
    
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'thermo')
      .eq('table_type', 'BASE TABLE');
    
    if (error) {
      console.error('❌ Error obteniendo tablas:', error);
      return res.status(500).json({ error: 'Error obteniendo tablas' });
    }
    
    console.log('✅ Tablas encontradas:', tables.length);
    res.json(tables);
  } catch (error) {
    console.error('❌ Error inesperado obteniendo tablas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para login en modo desarrollo
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Backend: Intentando autenticar usuario (modo desarrollo):', email);
    
    // Verificar si el usuario existe en la tabla thermo.usuario
    const { data: userData, error: userError } = await supabase
      .from('usuario')
        .select('*')
      .eq('login', email)
      .single();

    if (userError || !userData) {
      console.error('❌ Usuario no encontrado en thermo.usuario:', userError);
      return res.status(401).json({ 
        success: false,
        error: 'Usuario no encontrado. Verifique el email.' 
      });
    }

    if (userData.statusid !== 1) {
      console.error('❌ Usuario inactivo (statusid != 1)');
      return res.status(401).json({ 
        success: false,
        error: 'Usuario inactivo. Contacte al administrador.' 
      });
    }

    // Verificar contraseña con bcrypt
    if (!userData.password_hash) {
      console.error('❌ Usuario sin password_hash');
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, userData.password_hash);
    if (!isValidPassword) {
      console.error('❌ Contraseña incorrecta');
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas' 
      });
    }

    console.log('✅ Usuario autenticado correctamente:', email);

    // Crear respuesta de usuario autenticado
    const authenticatedUser = {
      id: `dev-${userData.usuarioid}`,
      email: email,
      user_metadata: {
        full_name: `${userData.firstname} ${userData.lastname}`,
        rol: 'admin', // Asumimos admin por ahora
        usuarioid: userData.usuarioid,
        auth_user_id: userData.auth_user_id
      }
    };

    res.json({
      success: true,
      user: authenticatedUser
    });

  } catch (error) {
    console.error('❌ Error inesperado durante autenticación:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// Endpoint para reset de contraseña
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { login } = req.body;
    
    if (!login || login.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'El login es requerido' 
      });
    }

    logger.debug('Solicitando reset de contraseña para:', login);

    // Llamar a la función de PostgreSQL para reset de contraseña
    // La función se llama 'fn_reset_password' en el schema 'thermo'
    // y recibe el parámetro 'p_login'
    const { data, error } = await supabase.rpc('fn_reset_password', {
      p_login: login.trim()
    });

    if (error) {
      logger.error('Error al resetear contraseña:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message || 'Error al resetear la contraseña. Verifique que el usuario existe y tiene un correo activo.' 
      });
    }

    logger.info('Reset de contraseña exitoso para:', login);
    res.json({ 
      success: true,
      message: data || 'Se ha enviado una nueva contraseña al correo registrado'
    });

  } catch (error) {
    logger.error('Error inesperado durante reset de contraseña:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// Endpoint para verificar autenticación
app.get('/api/auth/verify', verifyAuth, (req, res) => {
  if (req.user) {
    res.json({ 
      authenticated: true, 
      user: {
        id: req.user.id,
        email: req.user.email,
        user_metadata: req.user.user_metadata
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Rutas PUT para actualizar registros
app.put('/api/thermo/pais/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando pais con ID ${id}...`);
    
    const { data, error } = await supabase
      .from('pais')
      .update(updateData)
      .eq('paisid', id)
      .select();

      if (error) {
        console.error('❌ Error backend:', error);
        return res.status(500).json({ error: error.message });
      }

    console.log(`✅ Backend: Pais actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/empresa/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando empresa con ID ${id}...`);
    
    const { data, error } = await supabase
      .from('empresa')
      .update(updateData)
      .eq('empresaid', id)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Empresa actualizada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/fundo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando fundo con ID ${id}...`);
    
    const { data, error } = await supabase
      .from('fundo')
      .update(updateData)
      .eq('fundoid', id)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Fundo actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/ubicacion/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando ubicacion con ID ${id}...`);
    console.log(`🔍 Backend: Actualizando ubicacion con ID ${id}`);
    
    const { data, error } = await supabase
      .from('ubicacion')
      .update(updateData)
      .eq('ubicacionid', id)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Ubicacion actualizada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/entidad/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando entidad con ID ${id}...`);
    
    const { data, error } = await supabase
      .from('entidad')
      .update(updateData)
      .eq('entidadid', id)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Entidad actualizada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/metrica/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando metrica con ID ${id}...`);
    console.log(`🔍 Backend: updateData recibido:`, updateData);
    console.log(`🔍 Backend: unidad value:`, updateData.unidad);
    console.log(`🔍 Backend: unidad type:`, typeof updateData.unidad);
    
    const { data, error } = await supabase
      .from('metrica')
      .update(updateData)
      .eq('metricaid', id)
      .select();

    if (error) {
      console.error('❌ Error backend Supabase:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Metrica actualizada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend catch:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/tipo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando tipo con ID ${id}...`);
    
    const { data, error } = await supabase
      .from('tipo')
      .update(updateData)
      .eq('tipoid', id)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Tipo actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/nodo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando nodo con ID ${id}...`);
    
    const { data, error } = await supabase
      .from('nodo')
      .update(updateData)
      .eq('nodoid', id)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Nodo actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/criticidad/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando criticidad con ID ${id}...`);
    
    const { data, error } = await supabase
      .from('criticidad')
      .update(updateData)
      .eq('criticidadid', id)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Criticidad actualizada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/perfil/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando perfil con ID ${id}...`);
    console.log('🔍 Backend: Actualizando perfil');
    
    // Validar que el ID sea un número
    if (isNaN(id)) {
      console.error('❌ Error: ID debe ser un número');
      return res.status(400).json({ error: 'ID debe ser un número' });
    }
    
    // Validar que updateData no esté vacío
    if (!updateData || Object.keys(updateData).length === 0) {
      console.error('❌ Error: No hay datos para actualizar');
      return res.status(400).json({ error: 'No hay datos para actualizar' });
    }
    
    const { data, error } = await supabase
      .from('perfil')
      .update(updateData)
      .eq('perfilid', id)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Perfil actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/umbral/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando umbral con ID ${id}...`);
    console.log(`🔍 Backend: Actualizando ubicacion con ID ${id}`);
    console.log(`🔍 Backend: Tipos de datos:`, Object.keys(updateData).map(key => `${key}: ${typeof updateData[key]}`));
    
    const { data, error } = await supabase
      .from('umbral')
      .update(updateData)
      .eq('umbralid', id)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Umbral actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/medio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando medio con ID ${id}...`);
    
    const { data, error } = await supabase
      .from('medio')
      .update(updateData)
      .eq('medioid', id)
      .select();

      if (error) {
      console.error('❌ Error backend:', error);
        return res.status(500).json({ error: error.message });
      }

    console.log(`✅ Backend: Medio actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Nota: La tabla sensor usa clave compuesta (nodoid, tipoid), no ID simple
// La ruta PUT para sensor se maneja con las rutas de clave compuesta

// Nota: La tabla metricasensor usa clave compuesta (nodoid, metricaid, tipoid), no ID simple
// La ruta PUT para metricasensor se maneja con las rutas de clave compuesta

app.put('/api/thermo/contacto/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando contacto con ID ${id}...`);
    
    const { data, error } = await supabase
      .from('contacto')
      .update(updateData)
      .eq('contactoid', id)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Contacto actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para actualizar correo
app.put('/api/thermo/correo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando correo con ID ${id}...`);
    console.log('🔍 Backend: Actualizando perfil');
    
    // Validar formato de correo si se está actualizando
    if (updateData.correo) {
      if (!EMAIL_REGEX.test(updateData.correo)) {
        return res.status(400).json({ error: 'Formato de correo inválido' });
      }
    }
    
    const { data, error } = await supabase
      .from('correo')
      .update(updateData)
      .eq('correoid', id)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Correo actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/usuario/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando usuario con ID ${id}...`);
    
    // Hash password si se proporciona nueva contraseña
    if (updateData.password) {
      const saltRounds = 10;
      updateData.password_hash = await bcrypt.hash(updateData.password, saltRounds);
      delete updateData.password; // Remover campo plano
      console.log('🔐 Backend: Password actualizada y hasheada con bcrypt');
    }
    
    const { data, error } = await supabase
      .from('usuario')
      .update(updateData)
      .eq('usuarioid', id)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Usuario actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rutas PUT para tablas con claves compuestas
app.put('/api/thermo/localizacion/:localizacionid', async (req, res) => {
  try {
    const { localizacionid } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando localizacion con localizacionid ${localizacionid}...`);
    
    const { data, error } = await supabase
      .from('localizacion')
      .update(updateData)
      .eq('localizacionid', localizacionid)
      .select();
      
      if (error) {
      console.error('❌ Error backend:', error);
        return res.status(500).json({ error: error.message });
      }
      
    console.log(`✅ Backend: Localizacion actualizada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta PUT para localizacion con query parameters (para compatibilidad con frontend)
app.put('/api/thermo/localizacion/composite', async (req, res) => {
  try {
    const { ubicacionid, localizacionid, entidadid } = req.query;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando localizacion con query params - ubicacionid: ${ubicacionid}, localizacionid: ${localizacionid}, entidadid: ${entidadid}...`);
    console.log(`🔍 Backend: Tipos de datos - ubicacionid: ${typeof ubicacionid}, localizacionid: ${typeof localizacionid}, entidadid: ${typeof entidadid}`);
    
    const { data, error } = await supabase
        .from('localizacion')
      .update(updateData)
      .eq('ubicacionid', ubicacionid)
      .eq('localizacionid', localizacionid)
      .eq('entidadid', entidadid)
      .select();
    
    if (error) {
      console.error('❌ Error backend en localizacion:', error);
      console.error('❌ Detalles del error:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Localizacion actualizada: ${data.length} registros`);
    console.log(`✅ Backend: Datos actualizados:`, JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/perfilumbral/:perfilid/:umbralid', async (req, res) => {
  try {
    const { perfilid, umbralid } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando perfilumbral con perfilid ${perfilid} y umbralid ${umbralid}...`);
    
    const { data, error } = await supabase
      .from('perfilumbral')
      .update(updateData)
      .eq('perfilid', perfilid)
      .eq('umbralid', umbralid)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Perfilumbral actualizado: ${data.length} registros`);
    res.json(data);
      } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta PUT para perfilumbral con query parameters (para compatibilidad con frontend)
app.put('/api/thermo/perfilumbral/composite', async (req, res) => {
  try {
    const { perfilid, umbralid } = req.query;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando perfilumbral con query params - perfilid: ${perfilid}, umbralid: ${umbralid}...`);
    console.log(`🔍 Backend: Actualizando ubicacion con ID ${id}`);
    
    const { data, error } = await supabase
      .from('perfilumbral')
      .update(updateData)
      .eq('perfilid', perfilid)
      .eq('umbralid', umbralid)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Perfilumbral actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/thermo/usuarioperfil/:usuarioid/:perfilid', async (req, res) => {
  try {
    const { usuarioid, perfilid } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando usuarioperfil con usuarioid ${usuarioid} y perfilid ${perfilid}...`);
    
    const { data, error } = await supabase
      .from('usuarioperfil')
      .update(updateData)
      .eq('usuarioid', usuarioid)
      .eq('perfilid', perfilid)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Usuarioperfil actualizado: ${data.length} registros`);
    res.json({ success: true, data: data });
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta PUT para usuarioperfil con query parameters (para compatibilidad con frontend)
app.put('/api/thermo/usuarioperfil/composite', async (req, res) => {
  try {
    const { usuarioid, perfilid } = req.query;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando usuarioperfil con query params - usuarioid: ${usuarioid}, perfilid: ${perfilid}...`);
    console.log(`🔍 Backend: Actualizando ubicacion con ID ${id}`);
    
    const { data, error } = await supabase
      .from('usuarioperfil')
      .update(updateData)
      .eq('usuarioid', usuarioid)
      .eq('perfilid', perfilid)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Usuarioperfil actualizado: ${data.length} registros`);
    res.json({ success: true, data: data });
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta PUT para sensor con clave compuesta (path parameters)
app.put('/api/thermo/sensor/:nodoid/:tipoid', async (req, res) => {
  try {
    const { nodoid, tipoid } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando sensor con nodoid ${nodoid} y tipoid ${tipoid}...`);
    
    const { data, error } = await supabase
      .from('sensor')
      .update(updateData)
      .eq('nodoid', nodoid)
      .eq('tipoid', tipoid)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Sensor actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta PUT para metricasensor con query parameters (para clave compuesta)
app.put('/api/thermo/metricasensor/composite', async (req, res) => {
  try {
    const { nodoid, metricaid, tipoid } = req.query;
    const updateData = req.body;
    console.log(`🔍 Backend: Actualizando metricasensor con query params - nodoid: ${nodoid}, metricaid: ${metricaid}, tipoid: ${tipoid}...`);
    console.log(`🔍 Backend: Actualizando ubicacion con ID ${id}`);

    // Para metricasensor, la validación de negocio es diferente
    // No hay restricción de entidad como en sensor, solo validamos que no haya conflictos
    // La tabla metricasensor no tiene columna entidadid

    // Usar upsert para crear o actualizar la entrada
    const { data, error } = await supabase
      .from('metricasensor')
      .upsert({
        nodoid: parseInt(nodoid),
        metricaid: parseInt(metricaid),
        tipoid: parseInt(tipoid),
        ...updateData
      })
      .select();
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    console.log(`✅ Backend: Metricasensor actualizado: ${data.length} registros`);
    res.json({ success: true, data: data });
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta PUT para sensor con query parameters (para compatibilidad con frontend)
app.put('/api/thermo/sensor/composite', async (req, res) => {
  try {
    const { nodoid, tipoid } = req.query;
    const updateData = req.body;
    console.log(`🔍 Backend: Actualizando sensor con query params - nodoid: ${nodoid}, tipoid: ${tipoid}...`);
    console.log(`🔍 Backend: Actualizando ubicacion con ID ${id}`);

    // Validación de negocio
    if (!nodoid || !tipoid) {
      return res.status(400).json({ error: 'nodoid y tipoid son requeridos' });
    }

    // Usar upsert para crear o actualizar la entrada (similar a metricasensor)
    const { data, error } = await supabase
      .from('sensor')
      .upsert({
        nodoid: parseInt(nodoid),
        tipoid: parseInt(tipoid),
        ...updateData
      })
      .select();
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    console.log(`✅ Backend: Sensor actualizado: ${data.length} registros`);
    res.json({ success: true, data: data });
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/thermo/audit_log_umbral/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`🔍 Backend: Actualizando audit_log_umbral con ID ${id}...`);
    
    const { data, error } = await supabase
      .from('audit_log_umbral')
      .update(updateData)
      .eq('auditid', id)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Audit_log_umbral actualizado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para detectar schema disponible
app.get('/api/detect', async (req, res) => {
  try {
    console.log('🔍 Detectando schema disponible...');
    
    // Probar schema 'thermo' usando una tabla conocida
    const { data: thermoData, error: thermoError } = await supabase
      .from('pais')
      .select('paisid')
        .limit(1);

    if (!thermoError && thermoData) {
      console.log('✅ Schema "thermo" detectado y disponible');
      res.json({ available: true, schema: 'thermo' });
      } else {
      console.log('❌ Schema "thermo" no disponible, usando "public"');
      res.json({ available: false, schema: 'public' });
      }
    } catch (error) {
    console.error('❌ Error detectando schema:', error);
    res.json({ available: false, schema: 'public' });
  }
});

// Rutas en plural para filtros globales (usadas por el frontend)
app.get('/api/thermo/paises', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug(`Obteniendo paises del schema thermo...`);
    
    const { data, error } = await supabase
      .from('pais')
      .select('*')
      .eq('statusid', 1)
      .limit(parseInt(limit));

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    logger.debug(`Paises obtenidos: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/empresas', async (req, res) => {
  try {
    const { limit = 100, paisId } = req.query;
    logger.debug(`Obteniendo empresas del schema thermo...`);
    
    let query = supabase
      .from('empresa')
      .select('*')
      .eq('statusid', 1);
    
    if (paisId) {
      query = query.eq('paisid', paisId);
    }
    
    const { data, error } = await query.limit(parseInt(limit));
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Empresas obtenidas: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/fundos', async (req, res) => {
  try {
    const { limit = 100, empresaId } = req.query;
    logger.debug(`Obteniendo fundos del schema thermo...`);

    let query = supabase
      .from('fundo')
      .select('*')
      .eq('statusid', 1);
    
    if (empresaId) {
      query = query.eq('empresaid', empresaId);
    }
    
    const { data, error } = await query.limit(parseInt(limit));
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    logger.debug(`Fundos obtenidos: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/ubicaciones', async (req, res) => {
  try {
    const { limit = 100, fundoId } = req.query;
    logger.debug(`Obteniendo ubicaciones del schema thermo...`);
    
    let query = supabase
      .from('ubicacion')
      .select('*')
      .eq('statusid', 1);
    
    if (fundoId) {
      query = query.eq('fundoid', fundoId);
    }
    
    const { data, error } = await query.limit(parseInt(limit));
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Ubicaciones obtenidas: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/entidades', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug(`Obteniendo entidades del schema thermo...`);
    
    const { data, error } = await supabase
      .from('entidad')
      .select('*')
      .eq('statusid', 1)
      .limit(parseInt(limit));

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Entidades obtenidas: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/metricas', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug(`Obteniendo metricas del schema thermo...`);
    
    const { data, error } = await supabase
      .from('metrica')
      .select('*')
      .eq('statusid', 1)
      .limit(parseInt(limit));
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Metricas obtenidas: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// RUTA ELIMINADA: /api/thermo/nodos
// La tabla 'nodo' no existe en el schema 'thermo'
// En Thermos usamos 'sensor' directamente para sensores industriales

app.get('/api/thermo/tipos', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug(`Obteniendo tipos del schema thermo...`);
    
    const { data, error } = await supabase
      .from('tipo')
      .select('*')
      .eq('statusid', 1)
      .limit(parseInt(limit));

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    logger.debug(`Tipos obtenidos: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/localizaciones', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    logger.debug(`Obteniendo localizaciones del schema thermo...`);
    
    const { data, error } = await supabase
      .from('localizacion')
      .select('*')
      .eq('statusid', 1)
      .limit(parseInt(limit));
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Localizaciones obtenidas: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// RUTA ELIMINADA: /api/thermo/nodos-con-localizacion
// La tabla 'nodo' no existe en el schema 'thermo'
// En Thermos usamos 'sensor' y 'localizacionsensor' para sensores industriales

// Ruta de prueba para la función de metadatos
app.get('/api/thermo/test-metadata-function', async (req, res) => {
  try {
    console.log('🔍 Probando función fn_get_table_metadata...');
    
    // Probar la función directamente
    const { data: metadataResult, error: metadataError } = await supabase
      .rpc('fn_get_table_metadata', { tbl_name: 'localizacion' });
    
    console.log('🔍 Resultado de fn_get_table_metadata:', {
      hasData: !!metadataResult,
      error: metadataError,
      columnsCount: metadataResult?.columns?.length || 0,
      fullResult: metadataResult
    });
    
    res.json({
      metadata: metadataResult,
      error: metadataError,
      message: 'Prueba de función fn_get_table_metadata completada'
    });
  } catch (error) {
    console.error('❌ Error en prueba de función:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para detectar schema disponible (THERMOS)
app.get('/api/thermo/detect', async (req, res) => {
  try {
    logger.debug('Detectando schema disponible via /api/thermo/detect...');
    
    // Probar schema 'thermo' usando una tabla conocida
    const { data: thermoData, error: thermoError } = await supabase
      .from('pais')
      .select('paisid')
      .limit(1);

    if (!thermoError && thermoData) {
      logger.info('Schema "thermo" detectado y disponible');
      res.json({ 
        available: true, 
        schema: 'thermo', 
        data: thermoData
      });
    } else {
      logger.warn('Schema "thermo" no disponible');
      res.json({ 
        available: false, 
        schema: 'public', 
        error: thermoError?.message || 'Unknown error'
      });
    }
  } catch (error) {
    logger.error('Error detectando schema:', error.message);
    res.json({ 
      available: false, 
      schema: 'public', 
      error: error.message 
    });
  }
});

// Ruta para listar todas las tablas del schema thermo
app.get('/api/thermo/tables', async (req, res) => {
  try {
    console.log('🔍 Listando tablas disponibles en schema thermo...');
    
    // Consulta para obtener todas las tablas del schema thermo
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_schema_tables', { schema_name: 'thermo' });

    if (tablesError) {
      console.log('⚠️ No se pudo usar RPC, intentando consulta directa...');
      
      // Fallback: consulta directa a information_schema
      const { data: directData, error: directError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'thermo');

      if (directError) {
        console.log('❌ Error en consulta directa:', directError);
        // Último fallback: probar tablas conocidas
        const knownTables = ['pais', 'empresa', 'fundo', 'ubicacion', 'localizacion', 'sensor', 'metrica', 'medicion', 'umbral', 'alerta'];
        const availableTables = [];
        
        for (const table of knownTables) {
          try {
            const { error } = await supabase.from(table).select('*').limit(1);
            if (!error) {
              availableTables.push(table);
              console.log(`✅ Tabla "${table}" disponible`);
            } else {
              console.log(`❌ Tabla "${table}" no disponible:`, error.message);
            }
          } catch (err) {
            console.log(`❌ Error probando tabla "${table}":`, err.message);
          }
        }
        
        res.json({ 
          available: availableTables.length > 0, 
          schema: 'thermo', 
          tables: availableTables,
          method: 'known_tables_fallback'
        });
    } else {
        console.log('✅ Tablas encontradas via consulta directa:', directData);
        res.json({ 
          available: true, 
          schema: 'thermo', 
          tables: directData.map(t => t.table_name),
          method: 'information_schema'
        });
      }
    } else {
      console.log('✅ Tablas encontradas via RPC:', tablesData);
      res.json({ 
        available: true, 
        schema: 'thermo', 
        tables: tablesData,
        method: 'rpc'
      });
    }
  } catch (error) {
    console.error('❌ Error listando tablas:', error);
    res.json({ available: false, schema: 'thermo', error: error.message });
  }
});

// ===== RUTAS POST PARA INSERCIÓN DE DATOS =====

// Ruta POST para insertar país
app.post('/api/thermo/pais', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando país...');
    console.log('🔍 Backend: Datos recibidos:', JSON.stringify(insertData, null, 2));
    
    // Filtrar paisid si está presente (no debe enviarse, la secuencia lo genera)
    const { paisid, ...filteredInsertData } = insertData;
    if (paisid !== undefined) {
      console.log(`⚠️ Backend: paisid=${paisid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredInsertData, null, 2));

    const { data, error } = await supabase
      .from('pais')
      .insert(filteredInsertData)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: País insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar empresa
app.post('/api/thermo/empresa', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando empresa...');
    
    // Filtrar empresaid si está presente (no debe enviarse, la secuencia lo genera)
    const { empresaid, ...filteredInsertData } = insertData;
    if (empresaid !== undefined) {
      console.log(`⚠️ Backend: empresaid=${empresaid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredInsertData, null, 2));
    
    const { data, error } = await supabase
      .from('empresa')
      .insert(filteredInsertData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Empresa insertada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar fundo
app.post('/api/thermo/fundo', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando fundo...');
    
    // Filtrar fundoid si está presente (no debe enviarse, la secuencia lo genera)
    const { fundoid, ...filteredInsertData } = insertData;
    if (fundoid !== undefined) {
      console.log(`⚠️ Backend: fundoid=${fundoid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredInsertData, null, 2));
    
    const { data, error } = await supabase
      .from('fundo')
      .insert(filteredInsertData)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Fundo insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar ubicación
app.post('/api/thermo/ubicacion', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando ubicación...');
    
    // Filtrar ubicacionid si está presente (no debe enviarse, la secuencia lo genera)
    const { ubicacionid, ...filteredInsertData } = insertData;
    if (ubicacionid !== undefined) {
      console.log(`⚠️ Backend: ubicacionid=${ubicacionid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    // Filtrar solo las columnas que existen en la tabla (omitir ubicacionabrev por problemas de cache)
    const filteredData = {
      ubicacion: filteredInsertData.ubicacion,
      fundoid: filteredInsertData.fundoid,
      statusid: filteredInsertData.statusid,
      usercreatedid: filteredInsertData.usercreatedid,
      usermodifiedid: filteredInsertData.usermodifiedid,
      datecreated: filteredInsertData.datecreated,
      datemodified: filteredInsertData.datemodified
    };
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredData, null, 2));

    const { data, error } = await supabase
      .from('ubicacion')
      .insert(filteredData)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Ubicación insertada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar entidad
app.post('/api/thermo/entidad', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando entidad...');
    
    // Filtrar entidadid si está presente (no debe enviarse, la secuencia lo genera)
    const { entidadid, ...filteredInsertData } = insertData;
    if (entidadid !== undefined) {
      console.log(`⚠️ Backend: entidadid=${entidadid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredInsertData, null, 2));
    
    const { data, error } = await supabase
      .from('entidad')
      .insert(filteredInsertData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Entidad insertada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar tipo
app.post('/api/thermo/tipo', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando tipo...');
    
    // Filtrar tipoid si está presente (no debe enviarse, la secuencia lo genera)
    const { tipoid, ...filteredInsertData } = insertData;
    if (tipoid !== undefined) {
      console.log(`⚠️ Backend: tipoid=${tipoid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredInsertData, null, 2));
    
    const { data, error } = await supabase
      .from('tipo')
      .insert(filteredInsertData)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Tipo insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar nodo
app.post('/api/thermo/nodo', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando nodo...');
    console.log('🔍 Backend: Insertando datos');
    
    const { data, error } = await supabase
      .from('nodo')
      .insert(insertData)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Nodo insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar métrica
app.post('/api/thermo/metrica', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando métrica...');
    
    // Filtrar metricaid si está presente (no debe enviarse, la secuencia lo genera)
    const { metricaid, ...filteredInsertData } = insertData;
    if (metricaid !== undefined) {
      console.log(`⚠️ Backend: metricaid=${metricaid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredInsertData, null, 2));
    
    const { data, error } = await supabase
      .from('metrica')
      .insert(filteredInsertData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Métrica insertada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar umbral
app.post('/api/thermo/umbral', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando umbral...');
    
    // Filtrar umbralid si está presente (no debe enviarse, la secuencia lo genera)
    const { umbralid, ...filteredInsertData } = insertData;
    if (umbralid !== undefined) {
      console.log(`⚠️ Backend: umbralid=${umbralid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    // Filtrar solo las columnas que existen en la tabla
    const filteredData = {
      localizacionsensorid: filteredInsertData.localizacionsensorid,
      criticidadid: filteredInsertData.criticidadid,
      umbral: filteredInsertData.umbral,
      minimo: filteredInsertData.minimo,
      maximo: filteredInsertData.maximo,
      estandar: filteredInsertData.estandar,
      statusid: filteredInsertData.statusid,
      usercreatedid: filteredInsertData.usercreatedid,
      usermodifiedid: filteredInsertData.usermodifiedid,
      datecreated: filteredInsertData.datecreated,
      datemodified: filteredInsertData.datemodified
    };
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredData, null, 2));
    
    const { data, error } = await supabase
      .from('umbral')
      .insert(filteredData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    }
    
    console.log(`✅ Backend: Umbral insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar criticidad
app.post('/api/thermo/criticidad', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando criticidad...');
    
    // Filtrar criticidadid si está presente (no debe enviarse, la secuencia lo genera)
    const { criticidadid, ...filteredInsertData } = insertData;
    if (criticidadid !== undefined) {
      console.log(`⚠️ Backend: criticidadid=${criticidadid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    // Filtrar solo las columnas que existen en la tabla
    const filteredData = {
      criticidad: filteredInsertData.criticidad,
      grado: filteredInsertData.grado,
      statusid: filteredInsertData.statusid,
      usercreatedid: filteredInsertData.usercreatedid,
      usermodifiedid: filteredInsertData.usermodifiedid,
      datecreated: filteredInsertData.datecreated,
      datemodified: filteredInsertData.datemodified,
      frecuencia: filteredInsertData.frecuencia,
      escalamiento: filteredInsertData.escalamiento,
      escalon: filteredInsertData.escalon
    };
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredData, null, 2));
    
    const { data, error } = await supabase
      .from('criticidad')
      .insert(filteredData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Criticidad insertada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar medio
app.post('/api/thermo/medio', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando medio...');
    console.log('🔍 Backend: Insertando datos');
    
    // Filtrar solo las columnas que existen en la tabla
    const filteredData = {
      nombre: insertData.nombre,
      statusid: insertData.statusid,
      usercreatedid: insertData.usercreatedid,
      usermodifiedid: insertData.usermodifiedid,
      datecreated: insertData.datecreated,
      datemodified: insertData.datemodified
    };
    
    const { data, error } = await supabase
      .from('medio')
      .insert(filteredData)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Backend: Medio insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar contacto
app.post('/api/thermo/contacto', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando contacto...');
    
    // Filtrar contactoid si está presente (no debe enviarse, la secuencia lo genera)
    const { contactoid, ...filteredInsertData } = insertData;
    if (contactoid !== undefined) {
      console.log(`⚠️ Backend: contactoid=${contactoid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    // Filtrar solo las columnas que existen en la tabla
    const filteredData = {
      usuarioid: filteredInsertData.usuarioid,
      celular: filteredInsertData.celular,
      codigotelefonoid: filteredInsertData.codigotelefonoid,
      statusid: filteredInsertData.statusid || 1,
      usercreatedid: filteredInsertData.usercreatedid,
      usermodifiedid: filteredInsertData.usermodifiedid,
      datecreated: filteredInsertData.datecreated,
      datemodified: filteredInsertData.datemodified
    };
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredData, null, 2));
    
    const { data, error } = await supabase
      .from('contacto')
      .insert(filteredData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Contacto insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar correo
app.post('/api/thermo/correo', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando correo...');
    
    // Filtrar correoid si está presente (no debe enviarse, la secuencia lo genera)
    const { correoid, ...filteredInsertData } = insertData;
    if (correoid !== undefined) {
      console.log(`⚠️ Backend: correoid=${correoid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    // Validar formato de correo
    if (!EMAIL_REGEX.test(filteredInsertData.correo)) {
      return res.status(400).json({ error: 'Formato de correo inválido' });
    }
    
    const filteredData = {
      usuarioid: filteredInsertData.usuarioid,
      correo: filteredInsertData.correo,
      statusid: filteredInsertData.statusid || 1,
      usercreatedid: filteredInsertData.usercreatedid,
      usermodifiedid: filteredInsertData.usermodifiedid,
      datecreated: filteredInsertData.datecreated,
      datemodified: filteredInsertData.datemodified
    };
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredData, null, 2));
    
    const { data, error } = await supabase
      .from('correo')
      .insert(filteredData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Correo insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar usuario
app.post('/api/thermo/usuario', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando usuario...');
    
    // Filtrar usuarioid si está presente (no debe enviarse, la secuencia lo genera)
    const { usuarioid, ...filteredInsertData } = insertData;
    if (usuarioid !== undefined) {
      console.log(`⚠️ Backend: usuarioid=${usuarioid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    // Hash password si se proporciona
    let passwordHash = null;
    if (filteredInsertData.password) {
      const saltRounds = 10;
      passwordHash = await bcrypt.hash(filteredInsertData.password, saltRounds);
      console.log('🔐 Backend: Password hasheada con bcrypt');
    } else {
      console.error('❌ Backend: Password no proporcionada. password_hash es requerido.');
      return res.status(400).json({ error: 'Password es requerida' });
    }
    
    // Filtrar solo las columnas que existen en la tabla
    const filteredData = {
      login: filteredInsertData.login,
      lastname: filteredInsertData.lastname,
      firstname: filteredInsertData.firstname,
      password_hash: passwordHash,
      statusid: filteredInsertData.statusid,
      usercreatedid: filteredInsertData.usercreatedid,
      usermodifiedid: filteredInsertData.usermodifiedid,
      datecreated: filteredInsertData.datecreated,
      datemodified: filteredInsertData.datemodified
    };
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify({ ...filteredData, password_hash: '***' }, null, 2));
    
    const { data, error } = await supabase
      .from('usuario')
      .insert(filteredData)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Usuario insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar perfil
app.post('/api/thermo/perfil', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando perfil...');
    
    // Filtrar perfilid si está presente (no debe enviarse, la secuencia lo genera)
    const { perfilid, ...filteredInsertData } = insertData;
    if (perfilid !== undefined) {
      console.log(`⚠️ Backend: perfilid=${perfilid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    // Filtrar solo las columnas que existen en la tabla
    const filteredData = {
      perfil: filteredInsertData.perfil,
      statusid: filteredInsertData.statusid,
      usercreatedid: filteredInsertData.usercreatedid,
      datecreated: filteredInsertData.datecreated,
      usermodifiedid: filteredInsertData.usermodifiedid,
      datemodified: filteredInsertData.datemodified,
      nivel: filteredInsertData.nivel,
      jefeid: filteredInsertData.jefeid
    };
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredData, null, 2));
    
    const { data, error } = await supabase
      .from('perfil')
      .insert(filteredData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Perfil insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar localización (clave compuesta)
app.post('/api/thermo/localizacion', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando localización...');
    
    // Filtrar localizacionid si está presente (no debe enviarse, la secuencia lo genera)
    const { localizacionid, ...filteredInsertData } = insertData;
    if (localizacionid !== undefined) {
      console.log(`⚠️ Backend: localizacionid=${localizacionid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredInsertData, null, 2));
    
    const { data, error } = await supabase
      .from('localizacion')
      .insert(filteredInsertData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Localización insertada: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar perfilumbral (clave compuesta)
app.post('/api/thermo/perfilumbral', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando perfilumbral...');
    console.log('🔍 Backend: Insertando datos');
    
    const { data, error } = await supabase
      .from('perfilumbral')
      .insert(insertData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Perfilumbral insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar usuarioperfil (clave compuesta)
app.post('/api/thermo/usuarioperfil', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando usuarioperfil...');
    console.log('🔍 Backend: Insertando datos');
    
    const { data, error } = await supabase
      .from('usuarioperfil')
      .insert(insertData)
      .select();

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Usuarioperfil insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar sensor (clave compuesta)
app.post('/api/thermo/sensor', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando sensor...');
    
    // Filtrar sensorid si está presente (no debe enviarse, la secuencia lo genera)
    const { sensorid, ...filteredInsertData } = insertData;
    if (sensorid !== undefined) {
      console.log(`⚠️ Backend: sensorid=${sensorid} fue enviado pero será ignorado (generado por secuencia)`);
    }
    
    console.log('🔍 Backend: Datos filtrados para INSERT:', JSON.stringify(filteredInsertData, null, 2));
    
    const { data, error } = await supabase
        .from('sensor')
      .insert(filteredInsertData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Sensor insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta POST para insertar metricasensor (clave compuesta)
app.post('/api/thermo/metricasensor', async (req, res) => {
  try {
    const insertData = req.body;
    console.log('🔍 Backend: Insertando metricasensor...');
    console.log('🔍 Backend: Insertando datos');
    
    const { data, error } = await supabase
            .from('metricasensor')
      .insert(insertData)
      .select();
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Metricasensor insertado: ${data.length} registros`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener mediciones con filtros
app.get('/api/thermo/mediciones', async (req, res) => {
  try {
    const { ubicacionId, startDate, endDate, limit, countOnly, getAll } = req.query;
    logger.debug('Obteniendo mediciones del schema thermo...', { ubicacionId, startDate, endDate, limit, countOnly, getAll });
    
    let query = supabase
      .from('medicion')
      .select('*');
    
    // Aplicar filtros
    if (ubicacionId) {
      query = query.eq('ubicacionid', ubicacionId);
    }
    
    if (startDate) {
      query = query.gte('fecha', startDate);
    }
    
    if (endDate) {
      query = query.lte('fecha', endDate);
    }
    
    // Si solo necesitamos el conteo
    if (countOnly === 'true') {
      query = query.select('*', { count: 'exact', head: true });
    } else if (limit) {
      query = query.limit(parseInt(limit));
    } else if (getAll !== 'true') {
      // Límite por defecto si no se especifica
      query = query.limit(1000);
    }
    
    // Ordenar por fecha descendente (más recientes primero)
    query = query.order('fecha', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (countOnly === 'true') {
      console.log(`✅ Backend: Conteo de mediciones: ${count}`);
      res.json({ count: count || 0 });
    } else {
      console.log(`✅ Backend: Mediciones obtenidas: ${data?.length || 0}`);
      res.json(data || []);
    }
  } catch (error) {
    console.error('❌ Error in /api/thermo/mediciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener mediciones con entidad (con JOIN)
app.get('/api/thermo/mediciones-con-entidad', async (req, res) => {
  try {
    const { ubicacionId, startDate, endDate, limit, entidadId, countOnly, getAll } = req.query;
    logger.debug('Obteniendo mediciones con entidad del schema thermo...', { ubicacionId, startDate, endDate, limit, entidadId, countOnly, getAll });
    
    // Query simple primero - solo mediciones
    let query = supabase
      .from('medicion')
      .select('*');
    
    // Aplicar filtros básicos
    if (ubicacionId) {
      query = query.eq('ubicacionid', ubicacionId);
    }
    
    if (startDate) {
      query = query.gte('fecha', startDate);
    }
    
    if (endDate) {
      query = query.lte('fecha', endDate);
    }
    
    // Si solo necesitamos el conteo
    if (countOnly === 'true') {
      query = query.select('*', { count: 'exact', head: true });
    } else if (limit) {
      query = query.limit(parseInt(limit));
    } else if (getAll !== 'true') {
      // Límite por defecto si no se especifica
      query = query.limit(1000);
    }
    
    // Ordenar por fecha descendente (más recientes primero)
    query = query.order('fecha', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Si hay entidadId, filtrar después de obtener los datos
    let filteredData = data || [];
    if (entidadId && data) {
      // Obtener ubicaciones que pertenecen a la entidad - query simple
      const { data: ubicaciones, error: ubicError } = await supabase
        .from('ubicacion')
        .select('ubicacionid');
      
      if (ubicError) {
        console.error('❌ Error obteniendo ubicaciones:', ubicError);
        return res.status(500).json({ error: ubicError.message });
      }
      
      // Filtrar mediciones por entidad usando ubicaciones
      if (ubicaciones && ubicaciones.length > 0) {
        const ubicacionIds = ubicaciones.map(u => u.ubicacionid);
        filteredData = data.filter(medicion => 
          ubicacionIds.includes(medicion.ubicacionid)
        );
      } else {
        filteredData = [];
      }
    }
    
    if (countOnly === 'true') {
      console.log(`✅ Backend: Conteo de mediciones con entidad: ${filteredData.length}`);
      res.json({ count: filteredData.length });
    } else {
      console.log(`✅ Backend: Mediciones con entidad obtenidas: ${filteredData.length}`);
      res.json(filteredData);
    }
  } catch (error) {
    console.error('❌ Error in /api/thermo/mediciones-con-entidad:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== RUTAS PARA TABLAS PUBLIC (DASHBOARDS) =====

// Ruta de prueba para verificar tablas en schema public
app.get('/api/public/test-public-tables', async (req, res) => {
  try {
    console.log('🔍 Probando acceso a tablas del schema public...');
    console.log('🔍 Cliente supabasePublic configurado para schema:', 'public (por defecto)');
    
    // Probar acceso directo a la tabla temperatura - zona
    console.log('🔍 Probando acceso directo a tabla temperatura - zona...');
    const { data: tempData, error: tempError } = await supabasePublic
      .from('temperatura-zona')
      .select('*')
      .limit(1);
    
    console.log('🔍 Datos de temperatura - zona:', tempData);
    console.log('🔍 Error temperatura - zona:', tempError);
    
    // Probar con información del schema
    console.log('🔍 Probando información del schema...');
    const { data: schemaData, error: schemaError } = await supabasePublic
      .rpc('exec_sql', { query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'" });
    
    console.log('🔍 Tablas en schema public (via RPC):', schemaData);
    console.log('🔍 Error RPC:', schemaError);
    
    res.json({
      temperatura_zona_data: tempData,
      temperatura_zona_error: tempError,
      schema_tables: schemaData,
      schema_error: schemaError,
      message: 'Prueba de acceso a schema public completada'
    });
  } catch (error) {
    console.error('❌ Error en prueba de schema public:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para temperatura_zona - datos de sensores de temperatura
app.get('/api/public/temperatura-zona', async (req, res) => {
  try {
    const { limit = 100, fundo_id, zona_id, start_date, end_date } = req.query;
    logger.debug('Obteniendo datos de temperatura_zona...');
    
      // Usar consulta directa a la tabla public.temperatura - zona (como funcionaba antes)
      let query = supabasePublic
        .from('temperatura-zona')
        .select('*')
        .order('fecha', { ascending: false }); // Ordenar por fecha descendente (más reciente primero)
    
    // Aplicar filtros
    if (fundo_id) {
      query = query.eq('fundo_id', fundo_id);
    }
    
    if (zona_id) {
      query = query.eq('zona_id', zona_id);
    }
    
    if (start_date) {
      query = query.gte('fecha', start_date);
    }
    
    if (end_date) {
      query = query.lte('fecha', end_date);
    }
    
    query = query
      .order('fecha', { ascending: false })
      .limit(parseInt(limit));
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    logger.debug(`Datos de temperatura obtenidos: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Error in /api/thermo/temperatura-zona:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para estadísticas de temperatura por zona
app.get('/api/public/temperatura-zona/stats', async (req, res) => {
  try {
    const { fundo_id, zona_id, start_date, end_date } = req.query;
    logger.debug('Obteniendo estadísticas de temperatura_zona...');
    
    let query = supabasePublic
      .from('temperatura-zona')
      .select('valor, fecha, zona_id, fundo_id')
      .order('fecha', { ascending: false }); // Ordenar por fecha descendente (más reciente primero)
    
    // Aplicar filtros
    if (fundo_id) {
      query = query.eq('fundo_id', fundo_id);
    }
    
    if (zona_id) {
      query = query.eq('zona_id', zona_id);
    }
    
    if (start_date) {
      query = query.gte('fecha', start_date);
    }
    
    if (end_date) {
      query = query.lte('fecha', end_date);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.json({
        count: 0,
        avg: 0,
        min: 0,
        max: 0,
        latest: null
      });
    }
    
    // Calcular estadísticas
    const valores = data.map(d => parseFloat(d.valor)).filter(v => !isNaN(v));
    const stats = {
      count: valores.length,
      avg: valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0,
      min: valores.length > 0 ? Math.min(...valores) : 0,
      max: valores.length > 0 ? Math.max(...valores) : 0,
      latest: data[0] // El más reciente por orden de fecha
    };
    
    console.log('✅ Backend: Estadísticas de temperatura calculadas:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Error in /api/thermo/temperatura-zona/stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para datos de temperatura por zona (agrupados)
app.get('/api/public/temperatura-zona/by-zone', async (req, res) => {
  try {
    const { fundo_id, start_date, end_date } = req.query;
    logger.debug('Obteniendo datos de temperatura agrupados por zona...');
    
    let query = supabasePublic
      .from('temperatura-zona')
      .select('zona_id, valor, fecha')
      .order('fecha', { ascending: false }); // Ordenar por fecha descendente (más reciente primero)
    
    // Aplicar filtros
    if (fundo_id) {
      query = query.eq('fundo_id', fundo_id);
    }
    
    if (start_date) {
      query = query.gte('fecha', start_date);
    }
    
    if (end_date) {
      query = query.lte('fecha', end_date);
    }
    
    query = query.order('fecha', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Agrupar por zona_id
    const groupedData = {};
    if (data) {
      data.forEach(item => {
        if (!groupedData[item.zona_id]) {
          groupedData[item.zona_id] = [];
        }
        groupedData[item.zona_id].push(item);
      });
    }
    
    logger.debug(`Datos agrupados por zona obtenidos: ${Object.keys(groupedData).length} zonas`);
    res.json(groupedData);
  } catch (error) {
    console.error('❌ Error in /api/thermo/temperatura-zona/by-zone:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RUTAS PARA FUNDO Y ZONA (PUBLIC SCHEMA)
// ============================================================================

// Obtener todos los fundos
app.get('/api/public/fundo', async (req, res) => {
  try {
    logger.debug('Obteniendo fundos...');
    
    const { data, error } = await supabasePublic
      .from('fundo')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    logger.debug(`Fundos obtenidos: ${data?.length || 0}`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Error in /api/public/fundo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las zonas
app.get('/api/public/zona', async (req, res) => {
  try {
    logger.debug('Obteniendo zonas...');
    
    const { data, error } = await supabasePublic
      .from('zona')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Backend: Zonas obtenidas:', data?.length || 0);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Error in /api/public/zona:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND (PRODUCCIÓN)
// ============================================================================

// Servir archivos estáticos del frontend build
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'build');
const frontendStaticPath = path.join(frontendBuildPath, 'static');

// Servir archivos estáticos (JS, CSS, imágenes, etc.)
app.use('/static', express.static(frontendStaticPath));

// Servir otros archivos estáticos del build (favicon, manifest, etc.)
app.use(express.static(frontendBuildPath, {
  // Solo servir archivos que existen, no directorios
  index: false,
  // No mostrar directorios
  dotfiles: 'ignore'
}));

// Ruta catch-all: servir index.html para todas las rutas que no sean /api/*
// Esto permite que React Router maneje el routing del lado del cliente
app.get('*', (req, res, next) => {
  // Si es una ruta de API, no hacer nada (dejar que las rutas de API manejen)
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // Para todas las demás rutas, servir index.html
  res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      console.error('❌ Error sirviendo index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Thermos Backend API running on port ${PORT}`);
  console.log(`🔑 Using Service Role Key (backend only)`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api`);
  console.log(`📊 Schema configurado: ${dbSchema}`);
  console.log(`📡 Servidor listo para recibir conexiones...`);
  
  // Verificar si existe el directorio del frontend build
  if (fs.existsSync(frontendBuildPath)) {
    console.log(`✅ Frontend build encontrado en: ${frontendBuildPath}`);
  } else {
    console.warn(`⚠️ Frontend build no encontrado en: ${frontendBuildPath}`);
    console.warn(`   La aplicación solo servirá la API.`);
  }
}).on('error', (error) => {
  console.error('❌ Error al iniciar el servidor:', error);
  process.exit(1);
});
