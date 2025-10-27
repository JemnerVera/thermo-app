import { useState, useCallback, useRef } from 'react';
import { ThermosService } from '../services/backend-api';
import { ColumnInfo } from '../types/systemParameters';
import { clearDisplayValueCache } from '../utils/systemParametersUtils';

/**
 * Hook para manejar la carga y gestión de datos de tablas
 * Extraído de SystemParameters.tsx para reducir complejidad
 */
export const useTableDataManagement = () => {
  // Estados para datos de tabla
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [tableColumns, setTableColumns] = useState<ColumnInfo[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para datos relacionados
  const [userData, setUserData] = useState<any[]>([]);
  const [paisesData, setPaisesData] = useState<any[]>([]);
  const [empresasData, setEmpresasData] = useState<any[]>([]);
  const [fundosData, setFundosData] = useState<any[]>([]);
  const [ubicacionesData, setUbicacionesData] = useState<any[]>([]);
  const [localizacionesData, setLocalizacionesData] = useState<any[]>([]);
  const [localizacionsensorData, setLocalizacionsensorData] = useState<any[]>([]);
  const [entidadesData, setEntidadesData] = useState<any[]>([]);
  // nodosData eliminado - obsoleto para Thermos (era para nodos LoRaWAN agrícolas)
  const [tiposData, setTiposData] = useState<any[]>([]);
  const [metricasData, setMetricasData] = useState<any[]>([]);
  const [criticidadesData, setCriticidadesData] = useState<any[]>([]);
  const [perfilesData, setPerfilesData] = useState<any[]>([]);
  const [umbralesData, setUmbralesData] = useState<any[]>([]);
  const [sensorsData, setSensorsData] = useState<any[]>([]);
  const [metricasensorData, setMetricasensorData] = useState<any[]>([]);
  const [perfilumbralData, setPerfilumbralData] = useState<any[]>([]);
  const [contactosData, setContactosData] = useState<any[]>([]);
  const [correosData, setCorreosData] = useState<any[]>([]);

  // Referencias para control de carga
  const loadingTableRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Cargar datos de usuario
   */
  const loadUserData = useCallback(async () => {
    try {
      const response = await ThermosService.getTableData('usuario', 1000);
      const data = Array.isArray(response) ? response : ((response as any)?.data || []);
      
      
      setUserData(data);
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserData([]);
    }
  }, []);

  /**
   * Cargar datos de todas las tablas relacionadas
   */
  const loadRelatedTablesData = useCallback(async () => {
    try {
      // const startTime = performance.now(); // Para debugging de performance

      const [
        paisesResponse,
        empresasResponse,
        fundosResponse,
        ubicacionesResponse,
        localizacionesResponse,
        localizacionsensorResponse,
        entidadesResponse,
        tiposResponse,
        metricasResponse,
        criticidadesResponse,
        perfilesResponse,
        umbralesResponse,
        usuariosResponse,
        sensorsResponse,
        metricasensorResponse,
        perfilumbralResponse,
        contactosResponse,
        correosResponse
      ] = await Promise.all([
        ThermosService.getTableData('pais', 500),
        ThermosService.getTableData('empresa', 500),
        ThermosService.getTableData('fundo', 500),
        ThermosService.getTableData('ubicacion', 500),
        ThermosService.getTableData('localizacion', 500),
        ThermosService.getTableData('localizacionsensor', 500),
        ThermosService.getTableData('entidad', 500),
        // ThermosService.getTableData('nodo', 500), // Eliminado - tabla no existe en Thermos
        ThermosService.getTableData('tipo', 500),
        ThermosService.getTableData('metrica', 500),
        ThermosService.getTableData('criticidad', 500),
        ThermosService.getTableData('perfil', 500),
        ThermosService.getTableData('umbral', 500),
        ThermosService.getTableData('usuario', 500),
        ThermosService.getTableData('sensor', 500),
        ThermosService.getTableData('metricasensor', 500),
        ThermosService.getTableData('perfilumbral', 500),
        ThermosService.getTableData('contacto', 500),
        ThermosService.getTableData('correo', 500)
      ]);

      // Procesar respuestas
      const paises = Array.isArray(paisesResponse) ? paisesResponse : ((paisesResponse as any)?.data || []);
      const empresas = Array.isArray(empresasResponse) ? empresasResponse : ((empresasResponse as any)?.data || []);
      const fundos = Array.isArray(fundosResponse) ? fundosResponse : ((fundosResponse as any)?.data || []);
      
      // Para fundo, extraer paisid de la relación con empresa
      const processedFundos = fundos.map((fundo: any) => ({
        ...fundo,
        paisid: fundo.empresa?.paisid || null
      }));

      const ubicaciones = Array.isArray(ubicacionesResponse) ? ubicacionesResponse : ((ubicacionesResponse as any)?.data || []);
      const localizaciones = Array.isArray(localizacionesResponse) ? localizacionesResponse : ((localizacionesResponse as any)?.data || []);
      const localizacionsensor = Array.isArray(localizacionsensorResponse) ? localizacionsensorResponse : ((localizacionsensorResponse as any)?.data || []);
      const entidades = Array.isArray(entidadesResponse) ? entidadesResponse : ((entidadesResponse as any)?.data || []);
      // const nodos = Array.isArray(nodosResponse) ? nodosResponse : ((nodosResponse as any)?.data || []); // Eliminado - obsoleto para Thermos
      const tipos = Array.isArray(tiposResponse) ? tiposResponse : ((tiposResponse as any)?.data || []);
      const metricas = Array.isArray(metricasResponse) ? metricasResponse : ((metricasResponse as any)?.data || []);
      const criticidades = Array.isArray(criticidadesResponse) ? criticidadesResponse : ((criticidadesResponse as any)?.data || []);
      const perfiles = Array.isArray(perfilesResponse) ? perfilesResponse : ((perfilesResponse as any)?.data || []);
      const umbrales = Array.isArray(umbralesResponse) ? umbralesResponse : ((umbralesResponse as any)?.data || []);
      // const usuarios = Array.isArray(usuariosResponse) ? usuariosResponse : ((usuariosResponse as any)?.data || []); // Para uso futuro
      const sensors = Array.isArray(sensorsResponse) ? sensorsResponse : ((sensorsResponse as any)?.data || []);
      const metricasensor = Array.isArray(metricasensorResponse) ? metricasensorResponse : ((metricasensorResponse as any)?.data || []);
      const perfilumbral = Array.isArray(perfilumbralResponse) ? perfilumbralResponse : ((perfilumbralResponse as any)?.data || []);
      const contactos = Array.isArray(contactosResponse) ? contactosResponse : ((contactosResponse as any)?.data || []);
      const correos = Array.isArray(correosResponse) ? correosResponse : ((correosResponse as any)?.data || []);

      // Limpiar caché de valores de display antes de actualizar datos
      // Esto asegura que los IDs se resuelvan correctamente cuando los datos se recarguen
      clearDisplayValueCache();
      
      // Establecer todos los datos
      setPaisesData(paises);
      setEmpresasData(empresas);
      setFundosData(processedFundos);
      setUbicacionesData(ubicaciones);
      setLocalizacionesData(localizaciones);
      setLocalizacionsensorData(localizacionsensor);
      setEntidadesData(entidades);
      // setNodosData(nodos); // Eliminado - obsoleto para Thermos
      setTiposData(tipos);
      setMetricasData(metricas);
      setCriticidadesData(criticidades);
      setPerfilesData(perfiles);
      setUmbralesData(umbrales);
      setSensorsData(sensors);
      setMetricasensorData(metricasensor);
      setPerfilumbralData(perfilumbral);
      setContactosData(contactos);
      setCorreosData(correos);

      // const endTime = performance.now(); // Para debugging de performance
    } catch (error) {
      console.error('Error loading related tables data:', error);
    }
  }, []);

  /**
   * Cargar datos de una tabla específica
   */
  const loadTableData = useCallback(async (selectedTable: string, initializeFormData?: (cols?: ColumnInfo[]) => Record<string, any>) => {
    if (!selectedTable) return;
    
    // Solo cancelar llamada anterior si es para una tabla diferente
    if (abortControllerRef.current && loadingTableRef.current !== selectedTable) {
      abortControllerRef.current.abort();
    }
    
    // Prevenir múltiples llamadas simultáneas para la misma tabla
    if (loadingTableRef.current === selectedTable) {
      return;
    }
    
    // Crear nuevo AbortController para esta llamada
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    loadingTableRef.current = selectedTable;

    try {
      // Verificar si la llamada fue cancelada antes de continuar
      if (abortController.signal.aborted) {
        return;
      }

      setLoading(true);


      // const startTime = performance.now(); // Para debugging de performance

      // Cargar las columnas para la tabla actual
      
      // Verificar si la llamada fue cancelada antes de hacer la llamada
      if (abortController.signal.aborted) {
        return;
      }
      
      const cols = await ThermosService.getTableColumns(selectedTable);
      
      // Verificar si la llamada fue cancelada después de recibir las columnas
      if (abortController.signal.aborted) {
        return;
      }

      // Establecer columnas base para formularios
      setColumns(cols || []);

      // Agregar columnas virtuales para tablas agrupadas
      if (selectedTable === 'sensor') {
        // Agregar columna virtual 'tipos' para mostrar todos los tipos concatenados
        const tiposColumn = {
          columnName: 'tipos',
          dataType: 'text',
          isNullable: true,
          defaultValue: null,
          isIdentity: false,
          isPrimaryKey: false
        };
        setTableColumns([...cols, tiposColumn]);
      } else if (selectedTable === 'metricasensor') {
        // Agregar columnas virtuales para metricasensor
        const tiposColumn = {
          columnName: 'tipos',
          dataType: 'text',
          isNullable: true,
          defaultValue: null,
          isIdentity: false,
          isPrimaryKey: false
        };
        const metricasColumn = {
          columnName: 'metricas',
          dataType: 'text',
          isNullable: true,
          defaultValue: null,
          isIdentity: false,
          isPrimaryKey: false
        };
        setTableColumns([...cols, tiposColumn, metricasColumn]);
      } else if (selectedTable === 'usuarioperfil') {
        // Agregar columnas virtuales para usuarioperfil
        const usuarioColumn = {
          columnName: 'usuario',
          dataType: 'text',
          isNullable: true,
          defaultValue: null,
          isIdentity: false,
          isPrimaryKey: false
        };
        const perfilesColumn = {
          columnName: 'perfiles',
          dataType: 'text',
          isNullable: true,
          defaultValue: null,
          isIdentity: false,
          isPrimaryKey: false
        };
        setTableColumns([...cols, usuarioColumn, perfilesColumn]);
      } else {
        setTableColumns(cols || []);
      }

      // Inicializar formData con las columnas recién cargadas si se proporciona la función
      const formData = initializeFormData ? initializeFormData(cols) : {};

      // Cargar datos con paginación para tablas grandes
      
      // Verificar si la llamada fue cancelada antes de cargar datos
      if (abortController.signal.aborted) {
        return;
      }
      
      const dataResponse = await ThermosService.getTableData(selectedTable, 1000);
      
      // Verificar si la llamada fue cancelada después de recibir los datos
      if (abortController.signal.aborted) {
        return;
      }

      const data = Array.isArray(dataResponse) ? dataResponse : ((dataResponse as any)?.data || []);

      // Ordenar por fecha de modificación (más recientes primero)
      const sortedData = data.sort((a: any, b: any) => {
        const dateA = new Date(a.datemodified || a.datecreated || 0);
        const dateB = new Date(b.datemodified || b.datecreated || 0);
        return dateB.getTime() - dateA.getTime(); // Orden descendente (más recientes primero)
      });

      // Verificar si la llamada fue cancelada antes de actualizar el estado
      if (abortController.signal.aborted) {
        return;
      }

      // Solo actualizar si los datos han cambiado realmente
      setTableData(prevData => {
        if (JSON.stringify(prevData) === JSON.stringify(sortedData)) {
          return prevData;
        }
        return sortedData;
      });

      // Cargar datos de sensores si estamos en el contexto de tablas que los necesitan
      // IMPORTANTE: No vaciar sensorsData cuando se cambia de tabla, otras tablas lo necesitan para FKs
      if (selectedTable === 'sensor' || selectedTable === 'metricasensor' || selectedTable === 'umbral' || selectedTable === 'localizacionsensor') {
        try {
          const sensorResponse = await ThermosService.getTableData('sensor', 1000);
          const sensorData = Array.isArray(sensorResponse) ? sensorResponse : ((sensorResponse as any)?.data || []);
          setSensorsData(sensorData);
        } catch (error) {
          console.error('Error cargando datos de sensores:', error);
          // No vaciar en caso de error - mantener los datos anteriores
        }
      }
      // NO vaciar sensorsData cuando se cambia a otra tabla - otras tablas pueden necesitarlo para FKs

      // const endTime = performance.now(); // Para debugging de performance

      return { formData, sortedData };

    } catch (error) {
      // Solo mostrar error si no fue cancelado
      if (!abortController.signal.aborted) {
        console.error('Error loading table data:', error);
        throw error;
      } else {
      }
    } finally {
      setLoading(false);
      loadingTableRef.current = null; // Reset loading ref
      abortControllerRef.current = null; // Reset abort controller
    }
  }, []);

  return {
    // Estados de datos
    tableData,
    columns,
    tableColumns,
    loading,
    userData,
    paisesData,
    empresasData,
    fundosData,
    ubicacionesData,
    localizacionesData,
    localizacionsensorData,
    entidadesData,
    // nodosData eliminado - obsoleto para Thermos
    tiposData,
    metricasData,
    criticidadesData,
    perfilesData,
    umbralesData,
    sensorsData,
    metricasensorData,
    perfilumbralData,
    contactosData,
    correosData,
    
    // Funciones de carga
    loadUserData,
    loadRelatedTablesData,
    loadTableData,
    
    // Setters para compatibilidad
    setTableData,
    setColumns,
    setTableColumns,
    setLoading,
    setUserData,
    setPaisesData,
    setEmpresasData,
    setFundosData,
    setUbicacionesData,
    setLocalizacionesData,
    setLocalizacionsensorData,
    setEntidadesData,
    // setNodosData eliminado - obsoleto para Thermos
    setTiposData,
    setMetricasData,
    setCriticidadesData,
    setPerfilesData,
    setUmbralesData,
    setSensorsData,
    setMetricasensorData,
    setPerfilumbralData,
    setContactosData,
    setCorreosData
  };
};
