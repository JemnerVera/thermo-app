import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ZoneData {
  [zoneId: string]: {
    zona_id: number;
    valor: number;
    fecha: string;
  }[];
}

interface ZoneStats {
  zona_id: number;
  zona_nombre?: string;
  count: number;
  avg: number;
  min: number;
  max: number;
  latest: {
    valor: number;
    fecha: string;
  };
}

const AnalyticsTemperatureDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [zoneData, setZoneData] = useState<ZoneData>({});
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    fundo_id: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [fundos, setFundos] = useState<any[]>([]);
  const [zonas, setZonas] = useState<any[]>([]);

  // Calcular datos paginados
  const totalPages = Math.ceil(zoneStats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStats = zoneStats.slice(startIndex, endIndex);

  const fetchFilterOptions = async () => {
    try {
      const [fundosResponse, zonasResponse] = await Promise.all([
        fetch('http://localhost:3001/api/public/fundo'),
        fetch('http://localhost:3001/api/public/zona')
      ]);
      
      if (fundosResponse.ok && zonasResponse.ok) {
        const [fundosData, zonasData] = await Promise.all([
          fundosResponse.json(),
          zonasResponse.json()
        ]);
        setFundos(fundosData);
        setZonas(zonasData);
      }
    } catch (err) {
      console.error('Error cargando opciones de filtro:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir query parameters
      const params = new URLSearchParams();
      if (filters.fundo_id) params.append('fundo_id', filters.fundo_id);
      params.append('limit', '1000'); // Obtener más datos para paginación

      const response = await fetch(`http://localhost:3001/api/public/temperatura-zona/by-zone?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }

      const data = await response.json();
      
      // Mapear nombres de zona en los datos agrupados
      const dataWithNames: { [key: string]: any[] } = {};
      Object.entries(data).forEach(([zoneId, records]) => {
        const zonaNombre = zonas.find(z => z.id === parseInt(zoneId))?.nombre || zoneId;
        const recordsArray = records as any[];
        dataWithNames[zoneId] = recordsArray.map((record: any) => ({
          ...record,
          zona_nombre: zonaNombre
        }));
      });
      
      setZoneData(dataWithNames);

      // Calcular estadísticas por zona
      const stats: ZoneStats[] = Object.entries(data).map(([zoneId, records]) => {
        const recordsArray = records as { zona_id: number; valor: number; fecha: string; }[];
        const values = recordsArray.map((r: { valor: number }) => r.valor);
        const count = values.length;
        const avg = values.reduce((sum: number, val: number) => sum + val, 0) / count;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const latest = recordsArray[0]; // El más reciente
        
        // Buscar el nombre de la zona
        const zonaNombre = zonas.find(z => z.id === parseInt(zoneId))?.nombre || zoneId;

        return {
          zona_id: parseInt(zoneId),
          zona_nombre: zonaNombre,
          count,
          avg: Number(avg.toFixed(2)),
          min,
          max,
          latest,
        };
      });

      // Ordenar por zona_id
      stats.sort((a, b) => a.zona_id - b.zona_id);
      setZoneStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchData();
    setCurrentPage(1); // Resetear a la primera página cuando cambien los filtros
  }, [filters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-400">Cargando análisis estadístico...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-500 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600 dark:text-neutral-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-500 font-mono tracking-wider mb-2">
            Análisis Estadístico por Zona
          </h1>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 mb-8 border border-gray-300 dark:border-neutral-700">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                Fundo
              </label>
              <select
                value={filters.fundo_id}
                onChange={(e) => setFilters({...filters, fundo_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-neutral-700 dark:text-white"
              >
                <option value="">Todos los fundos</option>
                {fundos.map((fundo) => (
                  <option key={fundo.id} value={fundo.id}>
                    {fundo.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resumen general */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-gray-300 dark:border-neutral-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-400">Total Zonas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{zoneStats.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-gray-300 dark:border-neutral-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-400">Promedio General</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {zoneStats.length > 0 ? (zoneStats.reduce((sum, s) => sum + s.avg, 0) / zoneStats.length).toFixed(1) : '0.0'}°C
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-gray-300 dark:border-neutral-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-400">Temperatura Mínima</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {zoneStats.length > 0 ? Math.min(...zoneStats.map(s => s.min)).toFixed(1) : '0.0'}°C
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border border-gray-300 dark:border-neutral-700">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-400">Temperatura Máxima</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {zoneStats.length > 0 ? Math.max(...zoneStats.map(s => s.max)).toFixed(1) : '0.0'}°C
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de estadísticas por zona */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-300 dark:border-neutral-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-neutral-300">Estadísticas por Zona</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Zona</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Registros</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Promedio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Mínima</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Máxima</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Última Lectura</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                {paginatedStats.map((stat) => (
                  <tr key={stat.zona_id} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {stat.zona_nombre || stat.zona_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-300">{stat.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">{stat.avg}°C</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{stat.min}°C</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{stat.max}°C</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{stat.latest.valor}°C</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-300">
                      {new Date(stat.latest.fecha).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Barra de navegación */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-neutral-400">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, zoneStats.length)} de {zoneStats.length} registros
                </div>
                <div className="flex items-center space-x-2">
                  {/* Primera página */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-neutral-700"
                    title="Primera página"
                  >
                    ««
                  </button>
                  
                  {/* Página anterior */}
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-neutral-700"
                    title="Página anterior"
                  >
                    «
                  </button>
                  
                  {/* Números de página */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm border rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-green-500 text-white border-green-500'
                              : 'border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700'
                          }`}
                          title={`Página ${pageNum}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Página siguiente */}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-neutral-700"
                    title="Página siguiente"
                  >
                    »
                  </button>
                  
                  {/* Última página */}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-neutral-700"
                    title="Última página"
                  >
                    »»
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTemperatureDashboard;

// Force module recognition
export {};
