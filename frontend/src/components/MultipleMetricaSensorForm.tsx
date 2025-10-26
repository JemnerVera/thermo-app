// ============================================================================
// IMPORTS
// ============================================================================

import React, { memo } from 'react';
import ReplicateButton from './ReplicateButton';
import { useLanguage } from '../contexts/LanguageContext';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface MultipleMetricaSensorFormProps {
  selectedNodos: string[];  // Legacy name from JoySense - represents sensors in Thermos
  setSelectedNodos: (value: string[]) => void;
  selectedEntidad: string;
  setSelectedEntidad: (value: string) => void;
  selectedMetricas: string[];
  setSelectedMetricas: (value: string[]) => void;
  selectedStatus: boolean;
  setSelectedStatus: (value: boolean) => void;
  multipleMetricas: any[];
  setMultipleMetricas: (value: any[]) => void;
  nodosData: any[];
  entidadesData: any[];
  metricasData: any[];
  tiposData: any[];
  sensorsData: any[];
  loading: boolean;
  onInitializeMetricas: (nodos: string[], metricas: string[]) => Promise<void>;
  onInsertMetricas: () => void;
  onCancel: () => void;
  getUniqueOptionsForField: (columnName: string, filterParams?: { entidadid?: string; nodoid?: string }) => Array<{value: any, label: string}>;
  // Props para replicación
  onReplicateClick?: () => void;
  // Prop para indicar si estamos en modo replicación (solo un nodo)
  isReplicateMode?: boolean;
  // Filtros globales para contextualizar
  paisSeleccionado?: string;
  empresaSeleccionada?: string;
  fundoSeleccionado?: string;
  // Datos para mostrar nombres en lugar de IDs
  paisesData?: any[];
  empresasData?: any[];
  fundosData?: any[];
}

// ============================================================================
// COMPONENT DECLARATION
// ============================================================================

const MultipleMetricaSensorForm: React.FC<MultipleMetricaSensorFormProps> = memo(({
  selectedNodos,
  setSelectedNodos,
  selectedEntidad,
  setSelectedEntidad,
  selectedMetricas,
  setSelectedMetricas,
  selectedStatus,
  setSelectedStatus,
  multipleMetricas,
  setMultipleMetricas,
  nodosData,
  entidadesData,
  metricasData,
  tiposData,
  sensorsData,
  loading,
  onInitializeMetricas,
  onInsertMetricas,
  onCancel,
  getUniqueOptionsForField,
  // Props para replicación
  onReplicateClick,
  isReplicateMode = false,
  // Filtros globales
  paisSeleccionado,
  empresaSeleccionada,
  fundoSeleccionado,
  paisesData,
  empresasData,
  fundosData
}) => {
  const { t } = useLanguage();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [nodosDropdownOpen, setNodosDropdownOpen] = React.useState(false);
  const [entidadDropdownOpen, setEntidadDropdownOpen] = React.useState(false);
  const [metricasDropdownOpen, setMetricasDropdownOpen] = React.useState(false);
  
  // Estados para términos de búsqueda
  const [nodosSearchTerm, setNodosSearchTerm] = React.useState('');
  const [entidadSearchTerm, setEntidadSearchTerm] = React.useState('');
  const [metricasSearchTerm, setMetricasSearchTerm] = React.useState('');
  
  // Estado para tipos seleccionados
  const [selectedTiposCheckboxes, setSelectedTiposCheckboxes] = React.useState<string[]>([]);
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  // Función para obtener tipos basándose en los sensores seleccionados
  // En Thermos, cada sensor YA tiene un tipo asignado (sensor.tipoid)
  const getTiposFromSelectedSensors = React.useCallback(() => {
    if (selectedNodos.length === 0) return [];

    const tiposUnicos = new Set<string>();
    
    selectedNodos.forEach(sensorId => {
      // En Thermos, sensorsData contiene directamente los sensores con su tipoid
      const sensor = sensorsData.find(s => s.sensorid && s.sensorid.toString() === sensorId);
      
      if (sensor && sensor.tipoid) {
        tiposUnicos.add(sensor.tipoid.toString());
      }
    });
    
    const resultado = Array.from(tiposUnicos).map(tipoId => {
      const tipo = tiposData.find(t => t.tipoid.toString() === tipoId);
      return tipo ? { tipoid: tipo.tipoid, tipo: tipo.tipo } : null;
    }).filter(Boolean);

    return resultado;
  }, [selectedNodos, sensorsData, tiposData]);
  
  const tiposFromSensors = React.useMemo(() => getTiposFromSelectedSensors(), [getTiposFromSelectedSensors]);
  
  // En Thermos, no necesitamos análisis de similitud de nodos
  // porque cada sensor ya tiene su tipo asignado
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Función para manejar la inserción y limpiar métricas después
  const handleInsertMetricas = async () => {
    await onInsertMetricas();
    // Limpiar métricas seleccionadas después de guardar
    setSelectedMetricasCheckboxes([]);
  };
  
  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Actualizar tipos seleccionados cuando cambien los sensores
  React.useEffect(() => {
    if (selectedNodos.length > 0) {
      const tiposIds = tiposFromSensors.filter(t => t !== null).map(t => t!.tipoid.toString());
      setSelectedTiposCheckboxes(tiposIds);
    } else {
      setSelectedTiposCheckboxes([]);
    }
  }, [selectedNodos, selectedEntidad, tiposFromSensors]);
  
  // Estado para métricas seleccionadas con checkboxes
  const [selectedMetricasCheckboxes, setSelectedMetricasCheckboxes] = React.useState<string[]>([]);
  const [combinacionesStatus, setCombinacionesStatus] = React.useState<{[key: string]: boolean}>({});

  // Cerrar dropdowns cuando se hace clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setNodosDropdownOpen(false);
        setEntidadDropdownOpen(false);
        setMetricasDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Limpiar estados locales cuando se desmonta el componente
  React.useEffect(() => {
    return () => {
      // Limpiar estados locales al desmontar
      setNodosDropdownOpen(false);
      setEntidadDropdownOpen(false);
      setMetricasDropdownOpen(false);
      setNodosSearchTerm('');
      setEntidadSearchTerm('');
      setMetricasSearchTerm('');
      setSelectedTiposCheckboxes([]);
      setSelectedMetricasCheckboxes([]);
      setCombinacionesStatus({});
    };
  }, []);

  // Limpiar estados locales cuando cambian las props principales
  React.useEffect(() => {
    // Limpiar estados locales cuando se resetean las props
    if (selectedNodos.length === 0 && selectedEntidad === '') {
      setNodosDropdownOpen(false);
      setEntidadDropdownOpen(false);
      setMetricasDropdownOpen(false);
      setNodosSearchTerm('');
      setEntidadSearchTerm('');
      setMetricasSearchTerm('');
      setSelectedTiposCheckboxes([]);
      setSelectedMetricasCheckboxes([]);
      setCombinacionesStatus({});
    }
  }, [selectedNodos, selectedEntidad]);

  // Sincronizar selectedMetricasCheckboxes con selectedMetricas (props)
  // Sincronizar selectedMetricas con selectedMetricasCheckboxes - REMOVIDO para evitar loop infinito

  // Limpiar tipos y métricas cuando cambia la entidad
  React.useEffect(() => {
    setSelectedTiposCheckboxes([]);
    setSelectedMetricasCheckboxes([]);
    setCombinacionesStatus({});
  }, [selectedEntidad]);

  // Seleccionar automáticamente todos los tipos cuando se selecciona una entidad
  React.useEffect(() => {
    if (selectedEntidad) {
      const tiposDisponibles = getUniqueOptionsForField('tipoid', { entidadid: selectedEntidad });
      const todosLosTipos = tiposDisponibles.map(tipo => tipo.value.toString());
      setSelectedTiposCheckboxes(todosLosTipos);
    }
  }, [selectedEntidad]); // Removido getUniqueOptionsForField de las dependencias

  // Actualizar selectedMetricas y generar combinaciones cuando cambien los checkboxes
  React.useEffect(() => {
    setSelectedMetricas(selectedMetricasCheckboxes);
    
    // Generar las combinaciones para multipleMetricas
    // En THERMOS: solo (sensorid, metricaid) - el tipoid ya está en el sensor
    if (selectedNodos.length > 0 && selectedMetricasCheckboxes.length > 0) {
      const combinaciones: Array<{
        sensorid: number;
        metricaid: number;
        statusid: number;
      }> = [];
      
      selectedMetricasCheckboxes.forEach((metricaId) => {
        selectedNodos.forEach((sensorId) => {
          const key = `${sensorId}-${metricaId}`;
          combinaciones.push({
            sensorid: parseInt(sensorId),
            metricaid: parseInt(metricaId),
            statusid: combinacionesStatus[key] !== false ? 1 : 0 // Por defecto true (activo)
          });
        });
      });
      
      setMultipleMetricas(combinaciones);
    } else {
      setMultipleMetricas([]);
    }
  }, [selectedMetricasCheckboxes, selectedNodos, combinacionesStatus, metricasData]); // Removido selectedTiposCheckboxes

  // Agregar useEffect para generar combinaciones automáticamente
  React.useEffect(() => {
    if (selectedNodos.length > 0 && selectedMetricas.length > 0) {
      // En modo replicación, no regenerar métricas automáticamente
      // Solo generar combinaciones si no estamos en modo replicación
      if (!isReplicateMode) {
        onInitializeMetricas(selectedNodos, selectedMetricas).catch(console.error);
      }
    } else if (!isReplicateMode && multipleMetricas.length > 0) {
      // Solo limpiar métricas si no estamos en modo replicación y hay métricas
      setMultipleMetricas([]);
    }
  }, [selectedNodos, selectedMetricas, isReplicateMode, multipleMetricas.length]); // Removidas funciones para evitar loops infinitos

  // Función para obtener el nombre de un país por ID


  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      
      {/* Selección de Entidad y Nodos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div>
           <label className="block text-lg font-bold text-blue-600 mb-2 font-mono tracking-wider">{t('table_headers.entity')}*</label>
         <div className="relative dropdown-container">
             <div
               onClick={() => setEntidadDropdownOpen(!entidadDropdownOpen)}
               className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-orange-500 focus:border-orange-500 flex justify-between items-center font-mono"
             >
               <span className={selectedEntidad ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-neutral-400'}>
                 {selectedEntidad 
                   ? entidadesData.find(e => e.entidadid.toString() === selectedEntidad)?.entidad || `Entidad ${selectedEntidad}`
                   : t('table_headers.entity')
                 }
               </span>
               <span className="text-gray-500 dark:text-neutral-400">▼</span>
             </div>
             
            {entidadDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-hidden">
                <div className="p-2 border-b border-gray-300 dark:border-neutral-700">
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={entidadSearchTerm}
                    onChange={(e) => setEntidadSearchTerm(e.target.value)}
                    className="w-full px-2 py-1 bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded text-gray-900 dark:text-white text-sm font-mono placeholder-gray-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-32 overflow-y-auto custom-scrollbar">
                  {getUniqueOptionsForField('entidadid')
                    .filter(option => 
                      option.label.toLowerCase().includes(entidadSearchTerm.toLowerCase())
                    )
                    .map((option, index) => (
                     <div
                       key={index}
                       onClick={() => {
                         setSelectedEntidad(option.value.toString());
                         setEntidadDropdownOpen(false);
                         setEntidadSearchTerm('');
                         // Limpiar nodos seleccionados cuando se cambia la entidad
                         setSelectedNodos([]);
                       }}
                       className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                     >
                       <span className="text-gray-900 dark:text-white text-sm font-mono tracking-wider">{option.label.toUpperCase()}</span>
                     </div>
                   ))}
                   {getUniqueOptionsForField('entidadid')
                     .filter(option => 
                       option.label.toLowerCase().includes(entidadSearchTerm.toLowerCase())
                     ).length === 0 && (
                     <div className="px-3 py-2 text-gray-500 dark:text-neutral-400 text-sm font-mono">
                       NO SE ENCONTRARON RESULTADOS
                     </div>
                   )}
                 </div>
               </div>
             )}
           </div>
       </div>

         <div>
           <label className="block text-lg font-bold text-blue-600 mb-2 font-mono tracking-wider">
             {t('metricsensor.type_locked')}
           </label>
           <div className={`w-full px-3 py-2 border rounded-lg font-mono ${
             selectedNodos.length > 0 
               ? 'bg-gray-200 dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-white' 
               : 'bg-gray-100 dark:bg-neutral-800 border-gray-300 dark:border-neutral-700 cursor-not-allowed opacity-50 text-gray-500 dark:text-neutral-400'
           }`}>
            <span className={selectedNodos.length > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-neutral-400'}>
              {selectedNodos.length > 0 
                ? tiposFromSensors.length > 0
                  ? tiposFromSensors.filter(t => t !== null).map(t => t!.tipo).join(', ')
                  : t('metricsensor.no_types_available')
                : t('metricsensor.select_sensors_first')
              }
            </span>
           </div>
         </div>
       </div>

      {/* Mensaje de validación de similitud de nodos (compacto e interactivo) */}
      {/* En Thermos no necesitamos validación de similitud porque cada sensor ya tiene su tipo */}

      {/* Nuevo diseño: 2 containers lado a lado */}
      {selectedEntidad && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Container 1: Sensores disponibles con checkboxes */}
          <div className="bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-lg p-4">
            <h4 className="text-lg font-bold text-blue-600 mb-4 font-mono tracking-wider">
              SENSOR
            </h4>
            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
              {getUniqueOptionsForField('sensorid', { entidadid: selectedEntidad })
                .map((option) => (
                  <label key={option.value} className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors rounded">
                    <input
                      type="checkbox"
                      checked={selectedNodos.includes(option.value.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNodos([...selectedNodos, option.value.toString()]);
                        } else {
                          setSelectedNodos(selectedNodos.filter(id => id !== option.value.toString()));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-neutral-800 border-gray-300 dark:border-neutral-600 rounded focus:ring-blue-600 focus:ring-2 mr-3"
                    />
                    <span className="text-gray-900 dark:text-white text-sm font-mono tracking-wider">{option.label.toUpperCase()}</span>
                  </label>
                ))}
              {getUniqueOptionsForField('sensorid', { entidadid: selectedEntidad }).length === 0 && (
                <div className="px-3 py-2 text-gray-500 dark:text-neutral-400 text-sm font-mono">
                  NO HAY SENSORES DISPONIBLES PARA ESTA ENTIDAD
                </div>
              )}
            </div>
          </div>

          {/* Container 2: Métricas disponibles con checkboxes */}
          <div className="bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-blue-600 font-mono tracking-wider">
                {t('metricsensor.metric')}
              </h4>
              <label className="flex items-center space-x-3 cursor-pointer bg-orange-100 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-500/30 rounded-lg px-3 py-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedMetricasCheckboxes.length === getUniqueOptionsForField('metricaid', { entidadid: selectedEntidad }).length && getUniqueOptionsForField('metricaid', { entidadid: selectedEntidad }).length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Seleccionar todas las métricas
                      const allMetricas = getUniqueOptionsForField('metricaid', { entidadid: selectedEntidad }).map(option => option.value.toString());
                      setSelectedMetricasCheckboxes(allMetricas);
                    } else {
                      // Deseleccionar todas las métricas
                      setSelectedMetricasCheckboxes([]);
                    }
                  }}
                  className="w-5 h-5 text-blue-600 bg-gray-100 dark:bg-neutral-800 border-blue-500 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600 dark:text-blue-400 text-lg">📋</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-sm font-mono tracking-wider">{t('metricsensor.all')}</span>
                </div>
              </label>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {getUniqueOptionsForField('metricaid', { entidadid: selectedEntidad })
                .map((option) => (
                  <label key={option.value} className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors rounded">
                    <input
                      type="checkbox"
                      checked={selectedMetricasCheckboxes.includes(option.value.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMetricasCheckboxes([...selectedMetricasCheckboxes, option.value.toString()]);
                        } else {
                          setSelectedMetricasCheckboxes(selectedMetricasCheckboxes.filter(id => id !== option.value.toString()));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-neutral-800 border-gray-300 dark:border-neutral-600 rounded focus:ring-blue-600 focus:ring-2 mr-3"
                    />
                    <span className="text-gray-900 dark:text-white text-sm font-mono tracking-wider">{option.label.toUpperCase()}</span>
                  </label>
                ))}
              {getUniqueOptionsForField('metricaid', { entidadid: selectedEntidad }).length === 0 && (
                <div className="px-3 py-2 text-gray-500 dark:text-neutral-400 text-sm font-mono">
                  {t('metricsensor.no_metrics_available')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-center gap-4 mt-8">
        <button
          onClick={handleInsertMetricas}
          disabled={loading || multipleMetricas.length === 0 || selectedNodos.length === 0 || selectedMetricasCheckboxes.length === 0}
          className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-mono tracking-wider"
        >
          <span>➕</span>
          <span>{loading ? 'GUARDANDO...' : 'GUARDAR'}</span>
        </button>
        
        {/* Botón de replicar */}
        <ReplicateButton
          onClick={onReplicateClick || (() => {})}
          disabled={selectedNodos.length === 0 || !selectedEntidad}
        />
        
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-200 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors font-medium flex items-center space-x-2 font-mono tracking-wider"
        >
          <span>❌</span>
          <span>CANCELAR</span>
        </button>
      </div>
    </div>
  );
});

MultipleMetricaSensorForm.displayName = 'MultipleMetricaSensorForm';

export default MultipleMetricaSensorForm;

