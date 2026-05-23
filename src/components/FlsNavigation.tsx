import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, PlayCircle, History, AlertTriangle, CalendarDays, Printer } from 'lucide-react';

const links = [
  { to: '/fls', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/fls/checklists', icon: ClipboardList, label: 'Checklists' },
  { to: '/fls/calendar', icon: CalendarDays, label: 'Calendario' },
  { to: '/fls/runs/new', icon: PlayCircle, label: 'Nueva Ejecución' },
  { to: '/fls/history', icon: History, label: 'Historial' },
  { to: '/fls/issues', icon: AlertTriangle, label: 'Hallazgos' },
  { to: '/fls/reports', icon: Printer, label: 'Reportes' },
];

export default function FlsNavigation() {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-wrap gap-2 mb-6">
      {links.map(({ to, icon: Icon, label }) => {
        const active = to === '/fls' ? pathname === '/fls' : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-slate-700 hover:border-red-300 dark:hover:border-red-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
