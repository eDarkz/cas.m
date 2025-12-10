import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Database,
  DollarSign,
  TrendingUp,
  Edit,
  Home,
  Zap
} from 'lucide-react';

interface EnergyNavigationProps {
  title: string;
  description?: string;
  currentSection: 'dashboard' | 'raw-data' | 'pricing' | 'forecast' | 'form' | 'main';
}

const EnergyNavigation: React.FC<EnergyNavigationProps> = ({
  title,
  description,
  currentSection
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const sections = [
    {
      id: 'main',
      label: 'Inicio',
      icon: Home,
      path: '/energy',
      description: 'Página principal de energía'
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      path: '/energy/dashboard',
      description: 'Análisis y visualización de datos'
    },
    {
      id: 'raw-data',
      label: 'Datos',
      icon: Database,
      path: '/energy/raw-data',
      description: 'Gestión de registros'
    },
    {
      id: 'pricing',
      label: 'Precios',
      icon: DollarSign,
      path: '/energy/pricing',
      description: 'Configuración de tarifas'
    },
    {
      id: 'forecast',
      label: 'Pronósticos',
      icon: TrendingUp,
      path: '/energy/forecast',
      description: 'Proyecciones y tendencias'
    },
    {
      id: 'form',
      label: 'Nuevo',
      icon: Edit,
      path: '/energy/form',
      description: 'Agregar registro'
    }
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-xl">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
      <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full"></div>

      <div className="relative px-6 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            {description && (
              <p className="text-blue-100 mt-1">{description}</p>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = currentSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => navigate(section.path)}
                className={`
                  group flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
                  transition-all duration-200 ease-in-out
                  ${isActive
                    ? 'bg-white text-blue-600 shadow-lg transform scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                  }
                `}
                title={section.description}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-white'} transition-transform group-hover:scale-110`} />
                <span>{section.label}</span>
                {isActive && (
                  <span className="inline-flex items-center justify-center w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-blue-100">
          <Home className="w-4 h-4" />
          <span>/</span>
          <span>Energía</span>
          {currentSection !== 'main' && (
            <>
              <span>/</span>
              <span className="text-white font-medium">
                {sections.find(s => s.id === currentSection)?.label}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnergyNavigation;
