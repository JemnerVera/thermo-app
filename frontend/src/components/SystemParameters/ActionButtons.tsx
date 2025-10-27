
interface ActionButtonsProps {
  selectedTable: string;
  updateLoading: boolean;
  onUpdate: () => void;
  onCancelUpdate: () => void;
}

export function ActionButtons({ 
  selectedTable, 
  updateLoading, 
  onUpdate, 
  onCancelUpdate 
}: ActionButtonsProps) {
  // Solo ocultar para usuarioperfil (tabla agrupada con formulario personalizado)
  if (selectedTable === 'usuarioperfil') {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mt-6 sm:mt-8 justify-center">
      <button
        onClick={onUpdate}
        disabled={updateLoading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-mono tracking-wider"
      >
        <span>➕</span>
        <span>{updateLoading ? 'GUARDANDO...' : 'GUARDAR'}</span>
      </button>

      <button
        onClick={onCancelUpdate}
        className="px-6 py-2 bg-gray-200 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors font-medium flex items-center space-x-2 font-mono tracking-wider"
      >
        <span>❌</span>
        <span>CANCELAR</span>
      </button>
    </div>
  );
}
