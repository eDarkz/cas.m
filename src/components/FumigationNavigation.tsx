import { NavLink } from 'react-router-dom';
import { Bug, Home, QrCode } from 'lucide-react';

const NAV_ITEMS = [
  {
    to: '/fumigacion/trampas',
    label: 'Trampas y Cebaderas',
    icon: Bug,
  },
  {
    to: '/fumigacion/habitaciones',
    label: 'Fumigacion Habitaciones',
    icon: Home,
  },
  {
    to: '/fumigacion/scanner',
    label: 'Scanner QR',
    icon: QrCode,
  },
];

export default function FumigationNavigation() {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
