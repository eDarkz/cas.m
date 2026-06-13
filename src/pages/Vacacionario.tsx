import { useState, useEffect, useMemo, useRef } from 'react';
import { Users, CalendarDays, Plus, Search, ChevronLeft, ChevronRight, X, Check, XCircle, Clock, Briefcase, TrendingUp, AlertCircle, CreditCard as Edit2, Trash2, Archive, RotateCcw, Calendar, Star, BarChart3, Settings, ChevronDown } from 'lucide-react';
import { vacacionarioApi, VacEmployee, VacCalendarEvent, VacRequest, VacHoliday, VacBalance, VacDashboard } from '../lib/vacacionarioApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import HamsterLoader from '../components/HamsterLoader';

type Tab = 'calendar' | 'employees' | 'requests' | 'holidays' | 'report';

const ADMIN_TABS: { key: Tab; icon: React.ElementType; label: string }[] = [
  { key: 'employees', icon: Users, label: 'Colaboradores' },
  { key: 'holidays', icon: Star, label: 'Dias Festivos' },
  { key: 'report', icon: BarChart3, label: 'Reporte' },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
  TAKEN: 'Tomada',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  REQUESTED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-200 text-slate-600',
  TAKEN: 'bg-blue-100 text-blue-800',
};

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: string | null) {
  if (!d) return '—';
  const date = new Date(d + 'T12:00:00');
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Vacacionario() {
  const [tab, setTab] = useState<Tab>('calendar');
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isAdminTab = tab === 'employees' || tab === 'holidays' || tab === 'report';
  const activeAdminLabel = ADMIN_TABS.find(t => t.key === tab)?.label;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700 overflow-visible flex-wrap">
        <TabButton active={tab === 'calendar'} onClick={() => setTab('calendar')} icon={CalendarDays} label="Calendario" />
        <TabButton active={tab === 'requests'} onClick={() => setTab('requests')} icon={Briefcase} label="Solicitudes" />

        {/* Administracion dropdown */}
        <div ref={adminRef} className="relative">
          <button
            onClick={() => setAdminOpen(!adminOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              isAdminTab
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            {isAdminTab ? activeAdminLabel : 'Administracion'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
          </button>

          {adminOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg py-1 min-w-[180px]">
              {ADMIN_TABS.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); setAdminOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    tab === key
                      ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tab === 'calendar' && <CalendarView />}
      {tab === 'employees' && <EmployeesView />}
      {tab === 'requests' && <RequestsView />}
      {tab === 'holidays' && <HolidaysView />}
      {tab === 'report' && <ExecutiveReportView />}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
        active
          ? 'bg-teal-600 text-white shadow-md'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

/* ============================================================
   CALENDAR VIEW
   ============================================================ */

const DEPT_COLORS: Record<string, string> = {
  'Ama de Llaves': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'Mantenimiento': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Recepcion': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Alimentos y Bebidas': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Cocina': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'Seguridad': 'bg-slate-200 text-slate-800 dark:bg-slate-600/30 dark:text-slate-300',
  'Animacion': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Spa': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Administracion': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
};

function getDeptColor(dept: string) {
  return DEPT_COLORS[dept] || 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function CalendarView() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<VacCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState('');

  useEffect(() => {
    loadCalendar();
  }, [viewMonth, viewYear, departmentFilter]);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const from = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(viewYear, viewMonth, 0).getDate();
      const to = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const data = await vacacionarioApi.getCalendar(from, to, {
        department: departmentFilter || undefined,
        status: 'APPROVED',
      });
      setEvents(data);
    } catch (e) {
      console.error('Error loading calendar:', e);
    } finally {
      setLoading(false);
    }
  };

  const fullMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();

  const eventsForDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(ev => ev.start <= dateStr && ev.end >= dateStr);
  };

  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const totalPeopleThisMonth = useMemo(() => {
    const unique = new Set(events.map(e => e.employee_id));
    return unique.size;
  }, [events]);

  const departments = useMemo(() => {
    const set = new Set(events.map(e => e.department));
    return Array.from(set).sort();
  }, [events]);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else { setViewMonth(viewMonth - 1); }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else { setViewMonth(viewMonth + 1); }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setViewMonth(today.getMonth() + 1);
    setViewYear(today.getFullYear());
    setSelectedDay(today.getDate());
  };

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Personas este mes</p>
          <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{totalPeopleThisMonth}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Solicitudes aprobadas</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{events.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Deptos. con vacaciones</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{departments.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Dia pico</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {(() => {
              let max = 0;
              let maxDay = 0;
              for (let d = 1; d <= daysInMonth; d++) {
                const c = eventsForDay(d).length;
                if (c > max) { max = c; maxDay = d; }
              }
              return max > 0 ? `${maxDay} (${max})` : '—';
            })()}
          </p>
        </div>
      </div>

      {/* Calendar card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 min-w-[180px] text-center">
              {fullMonths[viewMonth - 1]} {viewYear}
            </h3>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <button onClick={goToToday} className="ml-2 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              Hoy
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="">Todos los deptos.</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><HamsterLoader /></div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-600 rounded-lg overflow-hidden">
            {dayNames.map(d => (
              <div key={d} className="bg-slate-50 dark:bg-slate-700 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2.5">{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`e-${i}`} className="bg-white dark:bg-slate-800 min-h-[80px] sm:min-h-[100px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = eventsForDay(day);
              const count = dayEvents.length;
              const isSelected = selectedDay === day;
              const isToday = day === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`bg-white dark:bg-slate-800 min-h-[80px] sm:min-h-[100px] p-1 flex flex-col items-start text-left transition-all relative group ${
                    isSelected ? 'ring-2 ring-inset ring-teal-500 bg-teal-50/50 dark:bg-teal-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${
                    isToday ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}>
                    {day}
                  </span>
                  {count > 0 && (
                    <div className="flex flex-col gap-0.5 w-full overflow-hidden flex-1">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          className={`rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-medium truncate leading-tight ${getDeptColor(ev.department)}`}
                          title={`${ev.employee_name} (${ev.department})`}
                        >
                          <span className="hidden sm:inline">{ev.employee_name.split(' ')[0]}</span>
                          <span className="sm:hidden">{getInitials(ev.employee_name)}</span>
                        </div>
                      ))}
                      {count > 3 && (
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 pl-1">+{count - 3} mas</span>
                      )}
                    </div>
                  )}
                  {count > 0 && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-teal-600 text-white text-[8px] font-bold flex items-center justify-center">
                      {count}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Department color legend */}
        {departments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
            {departments.map(d => (
              <span key={d} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${getDeptColor(d)}`}>
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Day detail modal */}
      {selectedDay !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <div>
                <h3 className="text-lg font-bold">{selectedDay} de {fullMonths[viewMonth - 1]} {viewYear}</h3>
                <p className="text-sm text-teal-100">
                  {selectedDayEvents.length === 0
                    ? 'Sin vacaciones programadas'
                    : `${selectedDayEvents.length} persona${selectedDayEvents.length > 1 ? 's' : ''} de vacaciones`
                  }
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No hay vacaciones este dia.</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Todos los colaboradores trabajan normalmente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map(ev => {
                    const startDate = new Date(ev.start + 'T12:00:00');
                    const endDate = new Date(ev.end + 'T12:00:00');
                    const todayDate = new Date(`${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}T12:00:00`);
                    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const dayNumber = Math.round((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                    return (
                      <div key={ev.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-600">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getDeptColor(ev.department)}`}>
                            {getInitials(ev.employee_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{ev.employee_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{ev.department}{ev.position ? ` - ${ev.position}` : ''}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-100 dark:border-slate-600">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Periodo</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatDate(ev.start)} — {formatDate(ev.end)}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-100 dark:border-slate-600">
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Progreso</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Dia {dayNumber} de {totalDays}</p>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (dayNumber / totalDays) * 100)}%` }}
                          />
                        </div>
                        {ev.reason && (
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">"{ev.reason}"</p>
                        )}
                        {ev.return_date && (
                          <p className="mt-1 text-[10px] text-teal-600 dark:text-teal-400 font-medium">Regresa: {formatDate(ev.return_date)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   EMPLOYEES VIEW
   ============================================================ */

function EmployeesView() {
  const [employees, setEmployees] = useState<VacEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<VacEmployee | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [balanceData, setBalanceData] = useState<VacBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: todayYmd() });
      setEmployees(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(e =>
      e.full_name.toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q) ||
      (e.employee_number || '').toLowerCase().includes(q)
    );
  }, [employees, search]);

  const handleViewBalance = async (emp: VacEmployee) => {
    setSelectedEmployee(emp);
    setShowBalance(true);
    setBalanceLoading(true);
    try {
      const data = await vacacionarioApi.getBalance(emp.id, todayYmd());
      setBalanceData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleArchive = async (emp: VacEmployee) => {
    if (!confirm(`Desactivar a ${emp.full_name}?`)) return;
    try {
      await vacacionarioApi.archiveEmployee(emp.id, false);
      loadEmployees();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><HamsterLoader /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Colaborador
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Nombre</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Depto</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Puesto</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Ingreso</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Disponibles</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{emp.full_name}</p>
                    {emp.employee_number && <p className="text-xs text-slate-500">{emp.employee_number}</p>}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{emp.department}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{emp.position || '—'}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{formatDate(emp.hire_date)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                      (emp.balance?.available_days ?? 0) > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.balance?.available_days ?? '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewBalance(emp)}
                        className="p-1.5 rounded hover:bg-teal-50 dark:hover:bg-teal-900/30 text-teal-600"
                        title="Ver saldo"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(emp)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        title="Desactivar"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateEmployeeModal onClose={() => setShowCreate(false)} onCreated={loadEmployees} />}
      {showBalance && balanceData && selectedEmployee && (
        <BalanceModal employee={selectedEmployee} balance={balanceData} loading={balanceLoading} onClose={() => { setShowBalance(false); setBalanceData(null); }} />
      )}
    </div>
  );
}

/* ============================================================
   REQUESTS VIEW
   ============================================================ */

function RequestsView() {
  const [requests, setRequests] = useState<VacRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadRequests(); }, [statusFilter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await vacacionarioApi.getRequests({ status: statusFilter || undefined });
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isApprovalUnlocked = () => {
    const ts = localStorage.getItem('vac_approval_ts');
    if (!ts) return false;
    const diff = Date.now() - Number(ts);
    return diff < 30 * 24 * 60 * 60 * 1000;
  };

  const handleApprove = async (req: VacRequest) => {
    if (!isApprovalUnlocked()) {
      const pwd = prompt('Ingresa la clave de aprobacion:');
      if (pwd !== 'epa') {
        alert('Clave incorrecta');
        return;
      }
      localStorage.setItem('vac_approval_ts', String(Date.now()));
    }
    try {
      await vacacionarioApi.updateRequestStatus(req.id, { status: 'APPROVED', approved_by: 'Admin' });
      loadRequests();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (req: VacRequest) => {
    const reason = prompt('Motivo de rechazo:');
    if (!reason) return;
    try {
      await vacacionarioApi.updateRequestStatus(req.id, { status: 'REJECTED', approved_by: 'Admin', rejection_reason: reason });
      loadRequests();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (req: VacRequest) => {
    if (!confirm('Eliminar solicitud?')) return;
    try {
      await vacacionarioApi.deleteRequest(req.id);
      loadRequests();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><HamsterLoader /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {['', 'REQUESTED', 'APPROVED', 'TAKEN', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {s ? STATUS_LABELS[s] : 'Todas'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Solicitud
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Colaborador</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Periodo</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Dias</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Estado</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Motivo</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{req.full_name || '—'}</p>
                    <p className="text-xs text-slate-500">{req.department}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {formatDate(req.start_date)} → {formatDate(req.end_date)}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-100">{req.requested_days}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold ${STATUS_COLORS[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-[150px] truncate">{req.reason || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {req.status === 'REQUESTED' && (
                        <>
                          <button onClick={() => handleApprove(req)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Aprobar">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleReject(req)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Rechazar">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDelete(req)} className="p-1.5 rounded hover:bg-red-50 text-red-400" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Sin solicitudes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateRequestModal onClose={() => setShowCreate(false)} onCreated={loadRequests} />}
    </div>
  );
}

/* ============================================================
   HOLIDAYS VIEW
   ============================================================ */

function HolidaysView() {
  const [holidays, setHolidays] = useState<VacHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadHolidays(); }, []);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await vacacionarioApi.getHolidays({ active: true });
      setHolidays(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (h: VacHoliday) => {
    if (!confirm(`Eliminar "${h.name}"?`)) return;
    try {
      await vacacionarioApi.deleteHoliday(h.id);
      loadHolidays();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><HamsterLoader /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{holidays.length} dias festivos configurados</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Dia Festivo
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Fecha</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Nombre</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Depto</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Recurrente</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {holidays.map(h => (
                <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-100">{formatDate(h.holiday_date)}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{h.name}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{h.department || 'Todos'}</td>
                  <td className="py-3 px-4 text-center">
                    {h.recurring ? (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Si</span>
                    ) : (
                      <span className="text-xs text-slate-400">No</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => handleDelete(h)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {holidays.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400">Sin dias festivos configurados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateHolidayModal onClose={() => setShowCreate(false)} onCreated={loadHolidays} />}
    </div>
  );
}

/* ============================================================
   MODALS
   ============================================================ */

function CreateEmployeeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    full_name: '',
    employee_number: '',
    email: '',
    department: '',
    position: '',
    hire_date: '',
    initial_balance_days: 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await vacacionarioApi.createEmployee({
        ...form,
        employee_number: form.employee_number || null,
        email: form.email || null,
        balance_start_date: todayYmd(),
      });
      onCreated();
      onClose();
    } catch (err) {
      alert('Error al crear colaborador');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nuevo Colaborador</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Nombre completo *" value={form.full_name} onChange={v => setForm({ ...form, full_name: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="No. Empleado" value={form.employee_number} onChange={v => setForm({ ...form, employee_number: v })} />
            <Field label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Departamento *" value={form.department} onChange={v => setForm({ ...form, department: v })} required />
            <Field label="Puesto" value={form.position} onChange={v => setForm({ ...form, position: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha ingreso *" value={form.hire_date} onChange={v => setForm({ ...form, hire_date: v })} type="date" required />
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Saldo inicial (dias)</label>
              <input
                type="number"
                value={form.initial_balance_days}
                onChange={e => setForm({ ...form, initial_balance_days: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
              {saving ? 'Guardando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateRequestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [employees, setEmployees] = useState<VacEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());

  useEffect(() => {
    vacacionarioApi.getEmployees({ active: true }).then(setEmployees).catch(console.error);
    vacacionarioApi.getHolidays({ active: true }).then(list => {
      const set = new Set<string>();
      list.forEach(h => {
        if (h.recurring) {
          for (let y = today.getFullYear(); y <= today.getFullYear() + 2; y++) {
            set.add(`${y}-${h.holiday_date.slice(5)}`);
          }
        } else {
          set.add(h.holiday_date);
        }
      });
      setHolidays(set);
    }).catch(console.error);
  }, []);

  const fullMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else { setViewMonth(viewMonth - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else { setViewMonth(viewMonth + 1); }
  };

  const toggleDay = (dateStr: string) => {
    const isHoliday = holidays.has(dateStr);
    if (isHoliday) return;
    const next = new Set(selectedDays);
    if (next.has(dateStr)) next.delete(dateStr);
    else next.add(dateStr);
    setSelectedDays(next);
  };

  const sortedDays = Array.from(selectedDays).sort();
  const startDate = sortedDays[0] || '';
  const endDate = sortedDays[sortedDays.length - 1] || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || selectedDays.size === 0) return;
    setSaving(true);
    try {
      await vacacionarioApi.createRequest({
        employee_id: selectedEmployeeId,
        start_date: startDate,
        end_date: endDate,
        requested_days: selectedDays.size,
        reason: reason || null,
        status: 'REQUESTED',
        include_weekends: true,
        include_holidays: true,
      });
      onCreated();
      onClose();
    } catch (err) {
      alert('Error al crear solicitud');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nueva Solicitud de Vacaciones</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Colaborador *</label>
            <select
              value={selectedEmployeeId}
              onChange={e => { setSelectedEmployeeId(e.target.value); setSelectedDays(new Set()); }}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="">Seleccionar...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.department})</option>
              ))}
            </select>
          </div>

          {selectedEmployeeId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {fullMonths[viewMonth - 1]} {viewYear}
                </span>
                <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {dayNames.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 py-1">{d}</div>
                ))}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`e-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dateObj = new Date(viewYear, viewMonth - 1, day);
                  const isHoliday = holidays.has(dateStr);
                  const isSelected = selectedDays.has(dateStr);
                  const isPast = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isDisabled = isHoliday || isPast;

                  let bgClass = 'hover:bg-slate-100 dark:hover:bg-slate-700';
                  if (isSelected) bgClass = 'bg-teal-500 text-white ring-2 ring-teal-400';
                  else if (isHoliday) bgClass = 'bg-red-50 dark:bg-red-900/20';
                  else if (isPast) bgClass = 'opacity-40';

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => toggleDay(dateStr)}
                      className={`aspect-square rounded-md flex flex-col items-center justify-center text-[11px] transition-all ${bgClass} ${isDisabled && !isSelected ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      title={isHoliday ? 'Dia festivo' : ''}
                    >
                      <span className={`font-medium ${isSelected ? 'text-white' : isDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                        {day}
                      </span>
                      {isHoliday && !isSelected && <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Seleccionado</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Festivo</div>
              </div>

              {selectedDays.size > 0 && (
                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-3">
                  <p className="text-sm font-bold text-teal-800 dark:text-teal-200">
                    {selectedDays.size} dia{selectedDays.size > 1 ? 's' : ''} seleccionado{selectedDays.size > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">
                    {formatDate(startDate)} → {formatDate(endDate)}
                  </p>
                </div>
              )}
            </div>
          )}

          <Field label="Motivo" value={reason} onChange={v => setReason(v)} />

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || selectedDays.size === 0 || !selectedEmployeeId}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? 'Guardando...' : `Solicitar ${selectedDays.size > 0 ? `(${selectedDays.size} dias)` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateHolidayModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    holiday_date: '',
    name: '',
    department: '',
    recurring: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await vacacionarioApi.createHoliday({
        holiday_date: form.holiday_date,
        name: form.name,
        department: form.department || null,
        recurring: form.recurring,
      });
      onCreated();
      onClose();
    } catch (err) {
      alert('Error al crear dia festivo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nuevo Dia Festivo</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Fecha *" value={form.holiday_date} onChange={v => setForm({ ...form, holiday_date: v })} type="date" required />
          <Field label="Nombre *" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <Field label="Departamento (vacio = todos)" value={form.department} onChange={v => setForm({ ...form, department: v })} />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.recurring}
              onChange={e => setForm({ ...form, recurring: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <label className="text-sm text-slate-700 dark:text-slate-300">Recurrente (cada ano)</label>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
              {saving ? 'Guardando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BalanceModal({ employee, balance, loading, onClose }: { employee: VacEmployee; balance: VacBalance; loading: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{employee.full_name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{employee.department} · {employee.position || 'Sin puesto'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><HamsterLoader /></div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <BalanceStat label="Ganados" value={balance.earned_days} color="text-blue-600" />
              <BalanceStat label="Usados" value={balance.used_days} color="text-orange-600" />
              <BalanceStat label="Disponibles" value={balance.available_days} color="text-green-600" />
              <BalanceStat label="Proyectados" value={balance.projected_available_days} color="text-teal-600" />
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Detalles</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-500 dark:text-slate-400">Anos de servicio:</div>
                <div className="font-medium text-slate-800 dark:text-slate-100">{balance.completed_service_years}</div>
                <div className="text-slate-500 dark:text-slate-400">Proximo aniversario:</div>
                <div className="font-medium text-slate-800 dark:text-slate-100">{formatDate(balance.next_anniversary_date)} ({balance.next_anniversary_days} dias)</div>
                <div className="text-slate-500 dark:text-slate-400">Saldo inicial:</div>
                <div className="font-medium text-slate-800 dark:text-slate-100">{balance.initial_balance_days} dias</div>
                <div className="text-slate-500 dark:text-slate-400">Devengados:</div>
                <div className="font-medium text-slate-800 dark:text-slate-100">{balance.accrued_after_balance_start_days} dias</div>
                <div className="text-slate-500 dark:text-slate-400">Ajustes:</div>
                <div className="font-medium text-slate-800 dark:text-slate-100">{balance.adjustment_days} dias</div>
                <div className="text-slate-500 dark:text-slate-400">Pendientes:</div>
                <div className="font-medium text-slate-800 dark:text-slate-100">{balance.pending_requested_days} dias</div>
                <div className="text-slate-500 dark:text-slate-400">Futuras aprobadas:</div>
                <div className="font-medium text-slate-800 dark:text-slate-100">{balance.future_approved_days} dias</div>
              </div>
            </div>

            {balance.periods.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Periodos Legales (LFT)</h4>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700">
                      <tr>
                        <th className="text-left py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Ano</th>
                        <th className="text-left py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Aniversario</th>
                        <th className="text-center py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Dias</th>
                        <th className="text-center py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Incluido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                      {balance.periods.map(p => (
                        <tr key={p.service_year}>
                          <td className="py-1.5 px-2 text-slate-700 dark:text-slate-200">{p.service_year}</td>
                          <td className="py-1.5 px-2 text-slate-600 dark:text-slate-300">{formatDate(p.anniversary_date)}</td>
                          <td className="py-1.5 px-2 text-center font-bold text-slate-800 dark:text-slate-100">{p.legal_days}</td>
                          <td className="py-1.5 px-2 text-center">
                            {p.included_in_balance ? (
                              <Check className="w-3.5 h-3.5 text-green-600 mx-auto" />
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BalanceStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600 text-center">
      <div className={`font-bold text-xl ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
      />
    </div>
  );
}

/* ============================================================
   EXECUTIVE REPORT VIEW
   ============================================================ */

const CHART_COLORS = ['#0d9488', '#0284c7', '#d97706', '#dc2626', '#7c3aed', '#059669', '#e11d48', '#4f46e5', '#ca8a04', '#0891b2'];

function ExecutiveReportView() {
  const [dashboard, setDashboard] = useState<VacDashboard | null>(null);
  const [employees, setEmployees] = useState<VacEmployee[]>([]);
  const [requests, setRequests] = useState<VacRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, emps, reqs] = await Promise.all([
        vacacionarioApi.getDashboard(todayYmd()),
        vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: todayYmd() }),
        vacacionarioApi.getRequests({ from: `${year}-01-01`, to: `${year}-12-31` }),
      ]);
      setDashboard(dash);
      setEmployees(emps);
      setRequests(reqs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      status,
    }));
  }, [requests]);

  const deptData = useMemo(() => {
    const map: Record<string, { total: number; days: number }> = {};
    requests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN').forEach(r => {
      const dept = r.department || 'Sin depto';
      if (!map[dept]) map[dept] = { total: 0, days: 0 };
      map[dept].total++;
      map[dept].days += r.requested_days;
    });
    return Object.entries(map)
      .map(([dept, { total, days }]) => ({ department: dept, solicitudes: total, dias: days }))
      .sort((a, b) => b.dias - a.dias);
  }, [requests]);

  const monthlyData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const data = months.map((m, i) => ({ mes: m, aprobadas: 0, solicitadas: 0, rechazadas: 0 }));
    requests.forEach(r => {
      const month = parseInt(r.start_date.slice(5, 7)) - 1;
      if (month >= 0 && month < 12) {
        if (r.status === 'APPROVED' || r.status === 'TAKEN') data[month].aprobadas++;
        else if (r.status === 'REQUESTED') data[month].solicitadas++;
        else if (r.status === 'REJECTED') data[month].rechazadas++;
      }
    });
    return data;
  }, [requests]);

  const balanceDistribution = useMemo(() => {
    const ranges = [
      { label: '0 dias', min: -Infinity, max: 0 },
      { label: '1-5 dias', min: 1, max: 5 },
      { label: '6-10 dias', min: 6, max: 10 },
      { label: '11-15 dias', min: 11, max: 15 },
      { label: '16-20 dias', min: 16, max: 20 },
      { label: '21+ dias', min: 21, max: Infinity },
    ];
    return ranges.map(r => ({
      rango: r.label,
      personas: employees.filter(e => {
        const avail = e.balance?.available_days ?? 0;
        return avail >= r.min && avail <= r.max;
      }).length,
    }));
  }, [employees]);

  const topConsumers = useMemo(() => {
    const map: Record<string, { name: string; dept: string; days: number }> = {};
    requests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN').forEach(r => {
      if (!map[r.employee_id]) map[r.employee_id] = { name: r.full_name || '', dept: r.department || '', days: 0 };
      map[r.employee_id].days += r.requested_days;
    });
    return Object.values(map).sort((a, b) => b.days - a.days).slice(0, 10);
  }, [requests]);

  const summaryStats = useMemo(() => {
    const approved = requests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN');
    const totalDays = approved.reduce((s, r) => s + r.requested_days, 0);
    const avgDays = approved.length > 0 ? (totalDays / approved.length).toFixed(1) : '0';
    const totalAvailable = employees.reduce((s, e) => s + (e.balance?.available_days ?? 0), 0);
    const avgAvailable = employees.length > 0 ? (totalAvailable / employees.length).toFixed(1) : '0';
    return { totalDays, avgDays, totalAvailable, avgAvailable, totalRequests: requests.length, approved: approved.length };
  }, [requests, employees]);

  if (loading) return <div className="flex justify-center py-12"><HamsterLoader /></div>;

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Reporte Ejecutivo de Vacaciones</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(year - 1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 min-w-[50px] text-center">{year}</span>
          <button onClick={() => setYear(year + 1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiBox label="Total Solicitudes" value={summaryStats.totalRequests} color="text-slate-800 dark:text-slate-100" />
        <KpiBox label="Aprobadas/Tomadas" value={summaryStats.approved} color="text-green-600 dark:text-green-400" />
        <KpiBox label="Dias Otorgados" value={summaryStats.totalDays} color="text-teal-600 dark:text-teal-400" />
        <KpiBox label="Prom. Dias/Solicitud" value={summaryStats.avgDays} color="text-blue-600 dark:text-blue-400" />
        <KpiBox label="Dias Disponibles Total" value={summaryStats.totalAvailable} color="text-amber-600 dark:text-amber-400" />
        <KpiBox label="Prom. Disponible/Pers." value={summaryStats.avgAvailable} color="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly trend */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Solicitudes por Mes</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="aprobadas" name="Aprobadas" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="solicitadas" name="Pendientes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rechazadas" name="Rechazadas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status pie */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Distribucion por Estatus</h4>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Dias por Departamento</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="department" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="dias" name="Dias" fill="#0284c7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Balance distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Distribucion de Saldos Disponibles</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balanceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="personas" name="Personas" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top consumers table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Top 10 - Mayor Consumo de Dias ({year})</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">#</th>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Colaborador</th>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Departamento</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Dias Tomados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {topConsumers.map((tc, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">{i + 1}</td>
                  <td className="py-2.5 px-3 text-slate-800 dark:text-slate-100 font-medium">{tc.name}</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{tc.dept}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                      {tc.days} dias
                    </span>
                  </td>
                </tr>
              ))}
              {topConsumers.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-slate-400">Sin datos para este periodo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department summary table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Resumen por Departamento</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Departamento</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Colaboradores</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Solicitudes</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Dias Usados</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Prom/Persona</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {deptData.map(d => {
                const empCount = employees.filter(e => e.department === d.department).length;
                return (
                  <tr key={d.department} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-100 font-medium">{d.department}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{empCount}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{d.solicitudes}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{d.dias}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-teal-600 dark:text-teal-400">
                      {empCount > 0 ? (d.dias / empCount).toFixed(1) : '0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}