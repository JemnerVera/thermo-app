import { useState } from 'react';

/**
 * Hook para manejar paginación server-side
 * Implementa patrón enterprise para tablas grandes (>1000 registros)
 * 
 * @param initialPageSize - Tamaño inicial de página (default: 100)
 * @returns Objeto con estado y funciones de paginación
 * 
 * @example
 * ```tsx
 * const {
 *   currentPage,
 *   pageSize,
 *   totalRecords,
 *   totalPages,
 *   handlePageChange,
 *   updatePaginationInfo,
 *   hasNextPage,
 *   hasPrevPage
 * } = useServerPagination(100);
 * 
 * // Cargar datos con paginación
 * const result = await ThermosService.getTableDataPaginated('sensor', {
 *   page: currentPage,
 *   pageSize: pageSize
 * });
 * 
 * // Actualizar información de paginación
 * if (result.pagination) {
 *   updatePaginationInfo(result.pagination);
 * }
 * ```
 */
export function useServerPagination(initialPageSize = 100) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  /**
   * Cambiar a una página específica
   * Valida que la página esté en el rango válido
   */
  function handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }

  /**
   * Ir a la primera página
   */
  function goToFirstPage() {
    setCurrentPage(1);
  }

  /**
   * Ir a la última página
   */
  function goToLastPage() {
    if (totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }

  /**
   * Ir a la página anterior
   */
  function goToPrevPage() {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }

  /**
   * Ir a la página siguiente
   */
  function goToNextPage() {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }

  /**
   * Cambiar tamaño de página
   * Resetea a la primera página cuando cambia el tamaño
   */
  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1); // Reset a primera página
  }

  /**
   * Actualizar información de paginación desde response del backend
   * Debe llamarse después de cada fetch de datos
   */
  function updatePaginationInfo(pagination: any) {
    if (pagination) {
      setTotalRecords(pagination.total || 0);
      setTotalPages(pagination.totalPages || 0);
    }
  }

  /**
   * Reset a estado inicial
   */
  function resetPagination() {
    setCurrentPage(1);
    setTotalRecords(0);
    setTotalPages(0);
  }

  /**
   * Calcular rango de registros mostrados
   * Útil para mostrar "Mostrando 1-100 de 1500"
   */
  function getDisplayRange() {
    const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalRecords);
    return { start, end };
  }

  return {
    // Estado
    currentPage,
    pageSize,
    totalRecords,
    totalPages,
    
    // Funciones de navegación
    handlePageChange,
    goToFirstPage,
    goToLastPage,
    goToPrevPage,
    goToNextPage,
    handlePageSizeChange,
    updatePaginationInfo,
    resetPagination,
    
    // Helpers
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    getDisplayRange,
    
    // Información adicional
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
    isEmpty: totalRecords === 0
  };
}

