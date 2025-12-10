import { useSearchParams } from 'react-router-dom';
import {
  Bug,
  LayoutDashboard,
  MapPin,
  Calendar,
  PieChart,
  Home,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import FumigationStations from '../components/fumigation/FumigationStations';
import FumigationStationLogs from '../components/fumigation/FumigationStationLogs';
import FumigationRoomLogs from '../components/fumigation/FumigationRoomLogs';
import FumigationMonthlyPlan from '../components/fumigation/FumigationMonthlyPlan';
import FumigationOperativeDashboard from '../components/fumigation/FumigationOperativeDashboard';
import FumigationExecutiveDashboard from '../components/fumigation/FumigationExecutiveDashboard';
import FumigationCycles from '../components/fumigation/FumigationCycles';

type SectionType = 'dashboard' | 'executive' | 'cycles' | 'stations' | 'station-logs' | 'room-logs' | 'monthly-plan';

const SECTIONS = [
  {
    id: 'dashboard' as SectionType,
    label: 'Panel Operativo',
    icon: LayoutDashboard,
    description: 'Vista general de operaciones de campo',
    color: 'emerald',
  },
  {
    id: 'executive' as SectionType,
    label: 'Reporte Ejecutivo',
    icon: PieChart,
    description: 'Estadisticas y metricas gerenciales',
    color: 'blue',
  },
  {
    id: 'cycles' as SectionType,
    label: 'Ciclos de Habitaciones',
    icon: Home,
    description: 'Ciclos mensuales de fumigacion por habitacion',
    color: 'cyan',
  },
  {
    id: 'stations' as SectionType,
    label: 'Estaciones de Monitoreo',
    icon: MapPin,
    description: 'Gestion de estaciones de control de plagas',
    color: 'teal',
  },
  {
    id: 'station-logs' as SectionType,
    label: 'Bitacora de Estaciones',
    icon: ClipboardList,
    description: 'Historial de visitas a estaciones',
    color: 'slate',
  },
  {
    id: 'room-logs' as SectionType,
    label: 'Bitacora de Habitaciones',
    icon: Bug,
    description: 'Historial de fumigaciones por habitacion',
    color: 'green',
  },
  {
    id: 'monthly-plan' as SectionType,
    label: 'Plan Mensual',
    icon: Calendar,
    description: 'Calendario y programacion de actividades',
    color: 'amber',
  },
];

export default function Fumigacion() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = (searchParams.get('section') as SectionType) || 'dashboard';

  const setActiveSection = (section: SectionType) => {
    setSearchParams({ section });
  };

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors: Record<string, { bg: string; text: string; border: string; hover: string }> = {
      emerald: {
        bg: isActive ? 'bg-emerald-50' : 'bg-white',
        text: isActive ? 'text-emerald-700' : 'text-gray-700',
        border: isActive ? 'border-emerald-500' : 'border-gray-200',
        hover: 'hover:bg-emerald-50 hover:border-emerald-300',
      },
      blue: {
        bg: isActive ? 'bg-blue-50' : 'bg-white',
        text: isActive ? 'text-blue-700' : 'text-gray-700',
        border: isActive ? 'border-blue-500' : 'border-gray-200',
        hover: 'hover:bg-blue-50 hover:border-blue-300',
      },
      cyan: {
        bg: isActive ? 'bg-cyan-50' : 'bg-white',
        text: isActive ? 'text-cyan-700' : 'text-gray-700',
        border: isActive ? 'border-cyan-500' : 'border-gray-200',
        hover: 'hover:bg-cyan-50 hover:border-cyan-300',
      },
      teal: {
        bg: isActive ? 'bg-teal-50' : 'bg-white',
        text: isActive ? 'text-teal-700' : 'text-gray-700',
        border: isActive ? 'border-teal-500' : 'border-gray-200',
        hover: 'hover:bg-teal-50 hover:border-teal-300',
      },
      slate: {
        bg: isActive ? 'bg-slate-100' : 'bg-white',
        text: isActive ? 'text-slate-700' : 'text-gray-700',
        border: isActive ? 'border-slate-500' : 'border-gray-200',
        hover: 'hover:bg-slate-50 hover:border-slate-300',
      },
      green: {
        bg: isActive ? 'bg-green-50' : 'bg-white',
        text: isActive ? 'text-green-700' : 'text-gray-700',
        border: isActive ? 'border-green-500' : 'border-gray-200',
        hover: 'hover:bg-green-50 hover:border-green-300',
      },
      amber: {
        bg: isActive ? 'bg-amber-50' : 'bg-white',
        text: isActive ? 'text-amber-700' : 'text-gray-700',
        border: isActive ? 'border-amber-500' : 'border-gray-200',
        hover: 'hover:bg-amber-50 hover:border-amber-300',
      },
    };
    return colors[color] || colors.slate;
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <FumigationOperativeDashboard />;
      case 'executive':
        return <FumigationExecutiveDashboard />;
      case 'cycles':
        return <FumigationCycles />;
      case 'stations':
        return <FumigationStations />;
      case 'station-logs':
        return <FumigationStationLogs />;
      case 'room-logs':
        return <FumigationRoomLogs />;
      case 'monthly-plan':
        return <FumigationMonthlyPlan />;
      default:
        return <FumigationOperativeDashboard />;
    }
  };

  const currentSection = SECTIONS.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row gap-6 p-6">
        <aside className="lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Bug className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Fumigacion</h1>
                  <p className="text-emerald-100 text-sm">Control de Plagas</p>
                </div>
              </div>
            </div>

            <nav className="p-3 space-y-1">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const colors = getColorClasses(section.color, isActive);

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${colors.bg} ${colors.text} ${colors.border} ${!isActive ? colors.hover : ''}`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-60'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{section.label}</p>
                      {isActive && (
                        <p className="text-xs opacity-70 truncate mt-0.5">{section.description}</p>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${isActive ? 'rotate-90 opacity-100' : 'opacity-40'}`} />
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex items-center gap-3">
                {currentSection && (
                  <>
                    <currentSection.icon className="w-6 h-6 text-gray-600" />
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{currentSection.label}</h2>
                      <p className="text-sm text-gray-500">{currentSection.description}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="p-6">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
