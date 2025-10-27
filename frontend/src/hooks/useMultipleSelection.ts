
interface UseMultipleSelectionProps {
  selectedTable: string;
  searchByCriteria: any;
}

export const useMultipleSelection = (selectedTable: string, searchByCriteria: any) => {
  const findTimestampBySecondsMatches = (row: any, allData: any[]) => {
    if (!row.datecreated) return [];

    const rowDate = new Date(row.datecreated);
    const rowSeconds = Math.floor(rowDate.getTime() / 1000);

    return allData.filter(dataRow => {
      if (!dataRow.datecreated) return false;
      const dataDate = new Date(dataRow.datecreated);
      const dataSeconds = Math.floor(dataDate.getTime() / 1000);
      return dataSeconds === rowSeconds;
    });
  };

  const findNearTimestampMatches = (row: any, allData: any[], toleranceMs: number) => {
    if (!row.datecreated) return [];

    const rowTime = new Date(row.datecreated).getTime();

    return allData.filter(dataRow => {
      if (!dataRow.datecreated) return false;
      const dataTime = new Date(dataRow.datecreated).getTime();
      const timeDiff = Math.abs(rowTime - dataTime);
      return timeDiff <= toleranceMs;
    });
  };

  const findBusinessLogicMatches = (row: any, allData: any[]) => {
    const matches: any[] = [];

    // Para usuarioperfil: buscar por usuarioid y perfilid (tabla agrupada en Thermos)
    if (selectedTable === 'usuarioperfil') {
      const perfilMatches = allData.filter(dataRow => 
        dataRow.usuarioid === row.usuarioid && dataRow.perfilid === row.perfilid
      );
      matches.push(...perfilMatches);
    }

    // NOTA: sensor, metricasensor y umbral son tablas simples en Thermos
    // No se agrupan automáticamente

    return matches;
  };

  const findBusinessCriteriaMatches = (row: any, allData: any[]) => {
    const matches: any[] = [];

    // Para usuarioperfil: buscar perfiles del mismo usuario
    if (selectedTable === 'usuarioperfil') {
      const sameUser = allData.filter(dataRow => 
        dataRow.usuarioid === row.usuarioid
      );
      matches.push(...sameUser);

      // Buscar perfiles del mismo tipo
      const sameProfile = allData.filter(dataRow => 
        dataRow.perfilid === row.perfilid
      );
      matches.push(...sameProfile);
    }

    // NOTA: sensor, metricasensor y umbral son tablas simples en Thermos
    // No se buscan matches por criterios de negocio

    return matches;
  };

  const findEntriesByTimestamp = (row: any, tableData: any[], updateData: any[]) => {
    console.log('🔍 findEntriesByTimestamp called:', {
      selectedTable,
      rowId: row.nodoid || row.usuarioid || 'unknown',
      tableDataLength: tableData.length,
      updateDataLength: updateData.length
    });

    const allData = [...tableData, ...updateData];

    // 1. Buscar por timestamp exacto (mismo segundo)
    const exactMatches = findTimestampBySecondsMatches(row, allData);
    if (exactMatches.length > 0) {
      return exactMatches;
    }

    // 2. Buscar por timestamp cercano (dentro de 5 segundos)
    const nearMatches = findNearTimestampMatches(row, allData, 5000);
    if (nearMatches.length > 0) {
      return nearMatches;
    }

    // 3. Buscar por lógica de negocio
    const businessMatches = findBusinessLogicMatches(row, allData);
    if (businessMatches.length > 0) {
      return businessMatches;
    }

    // 4. Buscar por criterios de negocio
    const criteriaMatches = findBusinessCriteriaMatches(row, allData);
    if (criteriaMatches.length > 0) {
      return criteriaMatches;
    }

    // 5. Si no hay matches, usar searchByCriteria como fallback
    if (searchByCriteria) {
      const searchMatches = allData.filter((dataRow: any) => {
        return searchByCriteria(dataRow, row);
      });
      
      if (searchMatches.length > 0) {
        return searchMatches;
      }
    }

    return [row];
  };

  return { findEntriesByTimestamp };
};
