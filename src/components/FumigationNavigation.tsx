import { NavLink } from 'react-router-dom';
import { Bug, Home, QrCode, BarChart3, History, MapPin, Map } from 'lucide-react';

const NAV_ITEMS = [
  {
    to: '/fumigacion/habitaciones',
    label: 'Habitaciones',
    icon: Home,
  },
  {
    to: '/fumigacion/trampas',
    label: 'Cebaderas',
    icon: Bug,
  },
  {
    to: '/fumigacion/historial',
    label: 'Historial',
    icon: History,
  },
  {
    to: '/fumigacion/mapa-estaciones',
    label: 'Mapa',
    icon: MapPin,
  },
  {
    to: '/fumigacion/mapa-habitaciones',
    label: 'Mapa Hab.',
    icon: Map,
  },
  {
    to: '/fumigacion/reporte',
    label: 'Reporte',
    icon: BarChart3,
  },
  {
    to: '/fumigacion/scanner',
    label: 'Scanner',
    icon: QrCode,
  },
];

export default function FumigationNavigation() {
  return (
    <div className="bg-white border-b border-stone-200">
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto no-scrollbar">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-sky-100 text-sky-800'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`
            }
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
