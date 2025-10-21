import React, { useState, lazy, Suspense } from 'react';
import RealtimeTemperatureDashboard from './RealtimeTemperatureDashboard';

// Import dinámico para AnalyticsTemperatureDashboard
const AnalyticsTemperatureDashboard = lazy(() => import('./AnalyticsTemperatureDashboard'));

interface TemperatureDashboardMainProps {
  activeDashboard?: 'realtime' | 'analytics';
  onDashboardChange?: (dashboard: 'realtime' | 'analytics') => void;
}

const TemperatureDashboardMain: React.FC<TemperatureDashboardMainProps> = ({
  activeDashboard: propActiveDashboard = 'realtime',
  onDashboardChange: propOnDashboardChange
}) => {
  const [internalActiveDashboard, setInternalActiveDashboard] = useState<'realtime' | 'analytics'>('realtime');
  
  // Usar prop si está disponible, sino usar estado interno
  const activeDashboard = propActiveDashboard || internalActiveDashboard;
  const setActiveDashboard = propOnDashboardChange || setInternalActiveDashboard;

  const renderDashboard = () => {
    switch (activeDashboard) {
      case 'realtime':
        return <RealtimeTemperatureDashboard />;
      case 'analytics':
        return (
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-neutral-400">Cargando dashboard analítico...</p>
              </div>
            </div>
          }>
            <AnalyticsTemperatureDashboard />
          </Suspense>
        );
      default:
        return <RealtimeTemperatureDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      {/* Dashboard Content */}
      {renderDashboard()}
    </div>
  );
};

export default TemperatureDashboardMain;
