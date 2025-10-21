require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// Middleware de logging para todas las peticiones
app.use((req, res, next) => {
  console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log(`📋 Headers:`, req.headers);
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
    console.log('🔍 Backend: Obteniendo fundo del schema thermo...');
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
    console.log('✅ Backend: Fundo obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/fundo:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/ubicacion', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo ubicacion del schema thermo...');
    const { data, error } = await supabase
      .from('ubicacion')
      .select('*')
      .order('ubicacionid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Ubicacion obtenida:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/ubicacion:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/entidad', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo entidad del schema thermo...');
    const { data, error } = await supabase
      .from('entidad')
      .select('*')
      .order('entidadid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Entidad obtenida:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/entidad:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/metrica', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo metrica del schema thermo...');
    const { data, error } = await supabase
      .from('metrica')
      .select('*')
      .order('metricaid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Metrica obtenida:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/metrica:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/tipo', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo tipo del schema thermo...');
    const { data, error } = await supabase
      .from('tipo')
      .select('*')
      .order('tipoid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Tipo obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/tipo:', error); res.status(500).json({ error: error.message }); }
});

// Tabla 'nodo' no existe en schema Thermos - eliminada

app.get('/api/thermo/criticidad', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo criticidad del schema thermo...');
    const { data, error } = await supabase
      .from('criticidad')
      .select('*')
      .order('criticidadid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Criticidad obtenida:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/criticidad:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/perfil', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo perfil del schema thermo...');
    const { data, error } = await supabase
      .from('perfil')
      .select('*')
      .order('perfilid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Perfil obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/perfil:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/umbral', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo umbral del schema thermo...');
    const { data, error } = await supabase
      .from('umbral')
      .select('*')
      .order('umbralid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Umbral obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/umbral:', error); res.status(500).json({ error: error.message }); }
});

// Tabla 'medio' no existe en schema Thermos - eliminada

// NUEVAS TABLAS EN THERMOS
app.get('/api/thermo/localizacionsensor', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo localizacionsensor del schema thermo...');
    const { data, error } = await supabase
      .from('localizacionsensor')
      .select('*')
      .eq('statusid', 1)
      .order('localizacionsensorid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Localizacionsensor obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/localizacionsensor:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/mensaje_error', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo mensaje_error del schema thermo...');
    const { data, error } = await supabase
      .from('mensaje_error')
      .select('*')
      .order('mensaje_errorid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Mensaje_error obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/mensaje_error:', error); res.status(500).json({ error: error.message }); }
});

app.get('/api/thermo/sensor', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo sensor del schema thermo...');
    const { data, error } = await supabase
      .from('sensor')
      .select('*')
      .order('sensorid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Sensor obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/sensor:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para metricasensor - usada por el frontend
app.get('/api/thermo/metricasensor', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo metricasensor del schema thermo...');
    const { data, error } = await supabase
      .from('metricasensor')
      .select('*')
      .order('sensorid, metricaid') // Ordenar por clave primaria compuesta
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Metricasensor obtenidos:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/metricasensor:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para perfilumbral - usada por el frontend
app.get('/api/thermo/perfilumbral', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo perfilumbral del schema thermo...');
    const { data, error } = await supabase
      .from('perfilumbral')
      .select('*')
      .order('perfilid, umbralid') // Ordenar por clave primaria compuesta
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Perfilumbral obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/perfilumbral:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para usuarioperfil - usada por el frontend
app.get('/api/thermo/usuarioperfil', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo usuarioperfil del schema thermo...');
    const { data, error } = await supabase
      .from('usuarioperfil')
      .select('*')
      .order('usuarioid, perfilid') // Ordenar por clave primaria compuesta
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Usuarioperfil obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/usuarioperfil:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para audit_log_umbral - usada por el frontend
app.get('/api/thermo/audit_log_umbral', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo audit_log_umbral del schema thermo...');
    const { data, error } = await supabase
      .from('audit_log_umbral')
      .select('*')
      .order('auditid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Audit_log_umbral obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/audit_log_umbral:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para contacto - usada por el frontend
app.get('/api/thermo/contacto', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo contacto del schema thermo...');
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
    console.log('✅ Backend: Contacto obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/contacto:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para codigotelefono - usada por el frontend
app.get('/api/thermo/codigotelefono', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo codigotelefono del schema thermo...');
    const { data, error } = await supabase
      .from('codigotelefono')
      .select('*')
      .eq('statusid', 1)
      .order('codigotelefonoid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Codigotelefono obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/codigotelefono:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para correo - usada por el frontend
app.get('/api/thermo/correo', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo correo del schema thermo...');
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
    console.log('✅ Backend: Correo obtenido:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/correo:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para localizacion - usada por el frontend
app.get('/api/thermo/localizacion', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Backend: Obteniendo localizacion del schema thermo...');
    const { data, error } = await supabase
      .from('localizacion')
      .select('*')
      .order('localizacionid') // Ordenar por clave primaria
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Backend: Localizacion obtenida:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/localizacion:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para usuario - usada por el frontend
app.get('/api/thermo/usuario', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Obteniendo usuarios de thermo.usuario...');
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .order('usuarioid')
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Usuarios encontrados:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/usuario:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para alerta - usada por el frontend
app.get('/api/thermo/alerta', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Obteniendo alertas de thermo.alerta...');
    const { data, error } = await supabase
      .from('alerta')
      .select('*')
      .order('medicionid', { ascending: false })
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Alertas encontradas:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('🔍 Primera alerta:', JSON.stringify(data[0], null, 2));
    }
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/alerta:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para mensaje - usada por el frontend
app.get('/api/thermo/mensaje', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Obteniendo mensajes de thermo.mensaje...');
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
    console.log('✅ Mensajes encontrados:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('🔍 Primer mensaje:', JSON.stringify(data[0], null, 2));
    }
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/mensaje:', error); res.status(500).json({ error: error.message }); }
});

// Ruta para alertaconsolidado - usada por el frontend
app.get('/api/thermo/alertaconsolidado', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log('🔍 Obteniendo alertas consolidadas de thermo.alertaconsolidado...');
    const { data, error } = await supabase
      .from('alertaconsolidado')
      .select('*')
      .order('fecha_inicio', { ascending: false })
      .limit(parseInt(limit));
    if (error) { console.error('❌ Error backend:', error); return res.status(500).json({ error: error.message }); }
    console.log('✅ Alertas consolidadas encontradas:', data?.length || 0);
    res.json(data || []);
  } catch (error) { console.error('❌ Error in /api/thermo/alertaconsolidado:', error); res.status(500).json({ error: error.message }); }
});

// Rutas para obtener información de las tablas (usadas por el frontend de parámetros)
app.get('/api/thermo/:tableName/columns', async (req, res) => {
  try {
    const { tableName } = req.params;
    console.log(`🔍 Backend: Obteniendo columnas de la tabla ${tableName}...`);
    
    // Usar metadatos dinámicos con fallback a hardcodeados
    const metadata = await getTableMetadata(tableName);
    if (!metadata) {
      console.error(`❌ Tabla ${tableName} no encontrada en metadatos`);
      return res.status(404).json({ error: `Tabla ${tableName} no encontrada` });
    }

    console.log(`✅ Backend: Columnas obtenidas para ${tableName}:`, metadata.columns.length);
    res.json(metadata.columns);
  } catch (error) {
    console.error(`❌ Error in /api/thermo/${req.params.tableName}/columns:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/:tableName/info', async (req, res) => {
  try {
    const { tableName } = req.params;
    console.log(`🔍 Backend: Obteniendo información de la tabla ${tableName}...`);
    
    // Usar metadatos dinámicos con fallback a hardcodeados
    const metadata = await getTableMetadata(tableName);
    if (!metadata) {
      console.error(`❌ Tabla ${tableName} no encontrada en metadatos`);
      return res.status(404).json({ error: `Tabla ${tableName} no encontrada` });
    }

    console.log(`✅ Backend: Información obtenida para ${tableName}`);
    res.json(metadata.info);
  } catch (error) {
    console.error(`❌ Error in /api/thermo/${req.params.tableName}/info:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/:tableName/constraints', async (req, res) => {
  try {
    const { tableName } = req.params;
    console.log(`🔍 Backend: Obteniendo constraints de la tabla ${tableName}...`);
    
    // Usar metadatos dinámicos con fallback a hardcodeados
    const metadata = await getTableMetadata(tableName);
    if (!metadata) {
      console.error(`❌ Tabla ${tableName} no encontrada en metadatos`);
      return res.status(404).json({ error: `Tabla ${tableName} no encontrada` });
    }

    console.log(`✅ Backend: Constraints obtenidos para ${tableName}:`, metadata.constraints.length);
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

    console.log('✅ Usuario autenticado en modo desarrollo:', email);

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
    console.log(`🔍 Backend: Obteniendo paises del schema thermo...`);
    
    const { data, error } = await supabase
      .from('pais')
      .select('*')
      .eq('statusid', 1)
      .limit(parseInt(limit));

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Paises obtenidos: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/empresas', async (req, res) => {
  try {
    const { limit = 100, paisId } = req.query;
    console.log(`🔍 Backend: Obteniendo empresas del schema thermo...`);
    
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
    console.log(`🔍 Backend: Obteniendo fundos del schema thermo...`);

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
    
    console.log(`✅ Backend: Fundos obtenidos: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/ubicaciones', async (req, res) => {
  try {
    const { limit = 100, fundoId } = req.query;
    console.log(`🔍 Backend: Obteniendo ubicaciones del schema thermo...`);
    
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
    console.log(`🔍 Backend: Obteniendo entidades del schema thermo...`);
    
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
    console.log(`🔍 Backend: Obteniendo metricas del schema thermo...`);
    
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
    console.log(`🔍 Backend: Obteniendo tipos del schema thermo...`);
    
    const { data, error } = await supabase
      .from('tipo')
      .select('*')
      .eq('statusid', 1)
      .limit(parseInt(limit));

    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Backend: Tipos obtenidos: ${data.length}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error backend:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/thermo/localizaciones', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    console.log(`🔍 Backend: Obteniendo localizaciones del schema thermo...`);
    
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
    console.log('🔍 Detectando schema disponible via /api/thermo/detect...');
    console.log(`📊 Configuración actual: URL=${supabaseUrl}, Schema=${dbSchema}`);
    console.log(`🔑 Service Role Key (primeros 30 chars): ${supabaseKey ? supabaseKey.substring(0, 30) + '...' : 'NO KEY'}`);
    
    // Probar schema 'thermo' usando una tabla conocida
    console.log('🔍 Probando conexión al schema thermo con tabla "pais"...');
    
    // Test 1: Verificar si la tabla existe
    console.log('📋 Test 1: Verificando existencia de tabla "pais"...');
    const { data: thermoData, error: thermoError } = await supabase
      .from('pais')
      .select('paisid')
      .limit(1);

    console.log('📋 Resultado Test 1:', { 
      data: thermoData, 
      error: thermoError,
      errorMessage: thermoError?.message,
      errorCode: thermoError?.code,
      errorDetails: thermoError?.details,
      errorHint: thermoError?.hint
    });

    // Test 2: Probar con schema explícito
    console.log('📋 Test 2: Probando con schema explícito...');
    const { data: explicitData, error: explicitError } = await supabase
      .from('thermo.pais')
      .select('paisid')
      .limit(1);

    console.log('📋 Resultado Test 2:', { 
      data: explicitData, 
      error: explicitError,
      errorMessage: explicitError?.message,
      errorCode: explicitError?.code
    });

    // Test 3: Probar información del schema
    console.log('📋 Test 3: Verificando información del schema...');
    let schemaInfo, schemaError;
    try {
      const result = await supabase.rpc('get_schema_info', { schema_name: 'thermo' });
      schemaInfo = result.data;
      schemaError = result.error;
    } catch (err) {
      schemaInfo = null;
      schemaError = { message: 'RPC no disponible', details: err.message };
    }

    console.log('📋 Resultado Test 3:', { 
      data: schemaInfo, 
      error: schemaError
    });

    if (!thermoError && thermoData) {
      console.log('✅ Schema "thermo" detectado y disponible');
      console.log(`📊 Datos de prueba: ${JSON.stringify(thermoData)}`);
      res.json({ 
        available: true, 
        schema: 'thermo', 
        data: thermoData,
        tests: {
          test1: { success: true, data: thermoData },
          test2: { success: !explicitError, data: explicitData },
          test3: { success: !schemaError, data: schemaInfo }
        }
      });
    } else {
      console.log('❌ Schema "thermo" no disponible');
      console.log(`❌ Error principal: ${JSON.stringify(thermoError)}`);
      console.log(`❌ Error explícito: ${JSON.stringify(explicitError)}`);
      res.json({ 
        available: false, 
        schema: 'public', 
        error: thermoError,
        tests: {
          test1: { success: false, error: thermoError },
          test2: { success: !explicitError, error: explicitError },
          test3: { success: !schemaError, error: schemaError }
        }
      });
    }
  } catch (error) {
    console.error('❌ Error detectando schema:', error);
    console.error('❌ Stack trace:', error.stack);
    res.json({ available: false, schema: 'public', error: error.message, stack: error.stack });
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
    console.log('🔍 Backend: Insertando datos');

    const { data, error } = await supabase
      .from('pais')
      .insert(insertData)
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
    console.log('🔍 Backend: Insertando datos');
    
    const { data, error } = await supabase
      .from('empresa')
      .insert(insertData)
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
    console.log('🔍 Backend: Insertando datos');
    
    const { data, error } = await supabase
      .from('fundo')
      .insert(insertData)
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
    console.log('🔍 Backend: Insertando datos');
    
    // Filtrar solo las columnas que existen en la tabla (omitir ubicacionabrev por problemas de cache)
    const filteredData = {
      ubicacion: insertData.ubicacion,
      fundoid: insertData.fundoid,
      statusid: insertData.statusid,
      usercreatedid: insertData.usercreatedid,
      usermodifiedid: insertData.usermodifiedid,
      datecreated: insertData.datecreated,
      datemodified: insertData.datemodified
    };

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
    console.log('🔍 Backend: Insertando datos');
    
    const { data, error } = await supabase
      .from('entidad')
      .insert(insertData)
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
    console.log('🔍 Backend: Insertando datos');
    
    const { data, error } = await supabase
      .from('tipo')
      .insert(insertData)
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
    console.log('🔍 Backend: Insertando datos');
    
    const { data, error } = await supabase
      .from('metrica')
      .insert(insertData)
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
    console.log('🔍 Backend: Insertando datos');
    
    // Filtrar solo las columnas que existen en la tabla
    const filteredData = {
      ubicacionid: insertData.ubicacionid,
      nodoid: insertData.nodoid,
      tipoid: insertData.tipoid,
      metricaid: insertData.metricaid,
      criticidadid: insertData.criticidadid,
      umbral: insertData.umbral,
      minimo: insertData.minimo,
      maximo: insertData.maximo,
      statusid: insertData.statusid,
      usercreatedid: insertData.usercreatedid,
      usermodifiedid: insertData.usermodifiedid,
      datecreated: insertData.datecreated,
      datemodified: insertData.datemodified
    };
    
    console.log('🔍 Backend: Datos filtrados:', JSON.stringify(filteredData, null, 2));
    
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
    console.log('🔍 Backend: Insertando datos');
    
    // Filtrar solo las columnas que existen en la tabla
    const filteredData = {
      criticidad: insertData.criticidad,
      grado: insertData.grado,
      statusid: insertData.statusid,
      usercreatedid: insertData.usercreatedid,
      usermodifiedid: insertData.usermodifiedid,
      datecreated: insertData.datecreated,
      datemodified: insertData.datemodified,
      frecuencia: insertData.frecuencia,
      escalamiento: insertData.escalamiento,
      escalon: insertData.escalon
    };
    
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
    console.log('🔍 Backend: Insertando datos');
    
    // Filtrar solo las columnas que existen en la tabla
    const filteredData = {
      usuarioid: insertData.usuarioid,
      celular: insertData.celular,
      codigotelefonoid: insertData.codigotelefonoid,
      statusid: insertData.statusid || 1,
      usercreatedid: insertData.usercreatedid,
      usermodifiedid: insertData.usermodifiedid,
      datecreated: insertData.datecreated,
      datemodified: insertData.datemodified
    };
    
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
    console.log('🔍 Backend: Insertando datos');
    
    // Validar formato de correo
    if (!EMAIL_REGEX.test(insertData.correo)) {
      return res.status(400).json({ error: 'Formato de correo inválido' });
    }
    
    const filteredData = {
      usuarioid: insertData.usuarioid,
      correo: insertData.correo,
      statusid: insertData.statusid || 1,
      usercreatedid: insertData.usercreatedid,
      usermodifiedid: insertData.usermodifiedid,
      datecreated: insertData.datecreated,
      datemodified: insertData.datemodified
    };
    
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
    console.log('🔍 Backend: Insertando datos');
    
    // Filtrar solo las columnas que existen en la tabla
    const filteredData = {
      login: insertData.login,
      lastname: insertData.lastname,
      firstname: insertData.firstname,
      statusid: insertData.statusid,
      usercreatedid: insertData.usercreatedid,
      usermodifiedid: insertData.usermodifiedid,
      datecreated: insertData.datecreated,
      datemodified: insertData.datemodified
    };
    
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
    console.log('🔍 Backend: Insertando datos');
    
    // Filtrar solo las columnas que existen en la tabla
    const filteredData = {
      perfil: insertData.perfil,
      statusid: insertData.statusid,
      usercreatedid: insertData.usercreatedid,
      datecreated: insertData.datecreated,
      usermodifiedid: insertData.usermodifiedid,
      datemodified: insertData.datemodified,
      nivel: insertData.nivel,
      jefeid: insertData.jefeid
    };
    
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
    console.log('🔍 Backend: Insertando datos');
    
    const { data, error } = await supabase
      .from('localizacion')
      .insert(insertData)
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
    console.log('🔍 Backend: Insertando datos');
    
    const { data, error } = await supabase
        .from('sensor')
      .insert(insertData)
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
    console.log('🔍 Backend: Obteniendo mediciones del schema thermo...', { ubicacionId, startDate, endDate, limit, countOnly, getAll });
    
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
    console.log('🔍 Backend: Obteniendo mediciones con entidad del schema thermo...', { ubicacionId, startDate, endDate, limit, entidadId, countOnly, getAll });
    
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
    console.log('🔍 Backend: Obteniendo datos de temperatura_zona...');
    
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
    
    console.log('✅ Backend: Datos de temperatura obtenidos:', data?.length || 0);
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
    console.log('🔍 Backend: Obteniendo estadísticas de temperatura_zona...');
    
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
    console.log('🔍 Backend: Obteniendo datos de temperatura agrupados por zona...');
    
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
    
    console.log('✅ Backend: Datos agrupados por zona obtenidos:', Object.keys(groupedData).length, 'zonas');
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
    console.log('🔍 Backend: Obteniendo fundos...');
    
    const { data, error } = await supabasePublic
      .from('fundo')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) {
      console.error('❌ Error backend:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Backend: Fundos obtenidos:', data?.length || 0);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Error in /api/public/fundo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las zonas
app.get('/api/public/zona', async (req, res) => {
  try {
    console.log('🔍 Backend: Obteniendo zonas...');
    
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Thermos Backend API running on port ${PORT}`);
  console.log(`🔑 Using Service Role Key (backend only)`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api`);
  console.log(`📊 Schema configurado: ${dbSchema}`);
  console.log(`📡 Servidor listo para recibir conexiones...`);
}).on('error', (error) => {
  console.error('❌ Error al iniciar el servidor:', error);
  process.exit(1);
});
