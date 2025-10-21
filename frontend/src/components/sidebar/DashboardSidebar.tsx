import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import BaseAuxiliarySidebar from './BaseAuxiliarySidebar';

interface DashboardSidebarProps {
  isExpanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  activeDashboard: string;
  onDashboardChange: (dashboard: string) => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  isExpanded,
  onMouseEnter,
  onMouseLeave,
  activeDashboard,
  onDashboardChange
}) => {
  const { t } = useLanguage();
  
  const dashboardIcon = (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );

  const dashboards = [
    {
      id: 'realtime',
      label: 'Monitoreo en Tiempo Real',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 'analytics',
      label: 'Análisis Estadístico',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <BaseAuxiliarySidebar
      isExpanded={isExpanded}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title="Dashboards Térmicos"
      icon={dashboardIcon}
      color="green"
    >
      {/* Dashboards disponibles */}
      <div className="py-4">
        <nav className="space-y-2">
          {dashboards.map((dashboard) => {
            const isActive = activeDashboard === dashboard.id;
            return (
              <button
                key={dashboard.id}
                onClick={() => onDashboardChange(dashboard.id)}
                className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${
                  isActive
                    ? "bg-green-600 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <div className="flex-shrink-0">
                  {dashboard.icon}
                </div>
                {isExpanded && (
                  <span className="text-sm font-medium tracking-wider">{dashboard.label.toUpperCase()}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </BaseAuxiliarySidebar>
  );
};

export default DashboardSidebar;
