import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Users, CalendarDays, Plus, Search, ChevronLeft, ChevronRight, X, Check, XCircle, Clock, Briefcase, TrendingUp, AlertCircle, CreditCard as Edit2, Trash2, Archive, RotateCcw, Calendar, Star, BarChart3, Settings, ChevronDown, ArrowUp, ArrowDown, UserX, Network, Crown, Camera, Loader2, List, GitBranch, Maximize2, Minimize2 } from 'lucide-react';
import { vacacionarioApi, VacEmployee, VacCalendarEvent, VacRequest, VacHoliday, VacBalance, VacDashboard, VacAccrualInfo, VacDayCalculation } from '../lib/vacacionarioApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart, Scatter, ScatterChart, ZAxis } from 'recharts';
import HamsterLoader from '../components/HamsterLoader';

const IMGUR_CLIENT_ID = '546c25a59c58ad7';
async function uploadToImgur(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}` },
    body: formData,
  });
  if (!response.ok) throw new Error('Error al subir imagen');
  const data = await response.json();
  return data.data.link;
}

type Tab = 'calendar' | 'employees' | 'requests' | 'holidays' | 'report' | 'organigrama';

const ADMIN_TABS: { key: Tab; icon: React.ElementType; label: string }[] = [
  { key: 'employees', icon: Users, label: 'Colaboradores' },
  { key: 'organigrama', icon: Network, label: 'Organigrama' },
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

  const isAdminTab = tab === 'employees' || tab === 'holidays' || tab === 'report' || tab === 'organigrama';
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
      {tab === 'organigrama' && <OrgChartView />}
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

const VIBRANT_COLORS = [
  'bg-rose-500 text-white',
  'bg-orange-500 text-white',
  'bg-amber-500 text-white',
  'bg-lime-600 text-white',
  'bg-green-600 text-white',
  'bg-emerald-600 text-white',
  'bg-sky-500 text-white',
  'bg-blue-600 text-white',
  'bg-indigo-500 text-white',
  'bg-violet-600 text-white',
  'bg-fuchsia-600 text-white',
  'bg-pink-600 text-white',
  'bg-red-600 text-white',
  'bg-yellow-500 text-black',
  'bg-teal-600 text-white',
  'bg-cyan-600 text-white',
];

function getPersonColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return VIBRANT_COLORS[Math.abs(hash) % VIBRANT_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function isAdminUnlocked(): boolean {
  const ts = localStorage.getItem('vac_admin_ts');
  return !!ts && (Date.now() - Number(ts)) < THIRTY_DAYS;
}

function requireAdminAccess(): boolean {
  if (isAdminUnlocked()) return true;
  const pwd = prompt('Ingresa la clave de administrador:');
  if (pwd !== 'wendy') {
    alert('Clave incorrecta');
    return false;
  }
  localStorage.setItem('vac_admin_ts', String(Date.now()));
  return true;
}

function isDeleteUnlocked(): boolean {
  const ts = localStorage.getItem('vac_delete_ts');
  return !!ts && (Date.now() - Number(ts)) < THIRTY_DAYS;
}

function requireDeleteAccess(): boolean {
  if (isDeleteUnlocked()) return true;
  const pwd = prompt('Ingresa la clave para eliminar:');
  if (pwd !== 'epa') {
    alert('Clave incorrecta');
    return false;
  }
  localStorage.setItem('vac_delete_ts', String(Date.now()));
  return true;
}

function CalendarView() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<VacCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<{ day: number; month: number; year: number } | null>(null);
  const [monthsToShow, setMonthsToShow] = useState<1 | 2 | 4>(1);
  const [showQuickAssign, setShowQuickAssign] = useState(false);
  const [quickEmployees, setQuickEmployees] = useState<VacEmployee[]>([]);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickSelectedId, setQuickSelectedId] = useState('');
  const [quickEndDate, setQuickEndDate] = useState('');
  const [quickReason, setQuickReason] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickDropdownOpen, setQuickDropdownOpen] = useState(false);
  const [quickCalc, setQuickCalc] = useState<VacDayCalculation | null>(null);
  const [quickCalcLoading, setQuickCalcLoading] = useState(false);

  const getMonthInfo = (offset: number) => {
    let m = viewMonth + offset;
    let y = viewYear;
    while (m > 12) { m -= 12; y++; }
    while (m < 1) { m += 12; y--; }
    return { month: m, year: y };
  };

  useEffect(() => {
    loadCalendar();
  }, [viewMonth, viewYear, monthsToShow]);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const from = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`;
      const lastMonthInfo = getMonthInfo(monthsToShow - 1);
      const lastDay = new Date(lastMonthInfo.year, lastMonthInfo.month, 0).getDate();
      const to = `${lastMonthInfo.year}-${String(lastMonthInfo.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const data = await vacacionarioApi.getCalendar(from, to, {
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

  const eventsForDate = (day: number, month: number, year: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(ev => ev.start <= dateStr && ev.end >= dateStr);
  };

  const selectedDayEvents = selectedDay ? eventsForDate(selectedDay.day, selectedDay.month, selectedDay.year) : [];

  const totalPeopleThisMonth = useMemo(() => {
    const unique = new Set(events.map(e => e.employee_id));
    return unique.size;
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
    setSelectedDay({ day: today.getDate(), month: today.getMonth() + 1, year: today.getFullYear() });
  };

  const openQuickAssign = async () => {
    setShowQuickAssign(true);
    setQuickSelectedId('');
    setQuickSearch('');
    setQuickReason('');
    setQuickDropdownOpen(false);
    setQuickCalc(null);
    if (selectedDay) {
      setQuickEndDate(`${selectedDay.year}-${String(selectedDay.month).padStart(2, '0')}-${String(selectedDay.day).padStart(2, '0')}`);
    }
    try {
      const data = await vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: todayYmd() });
      setQuickEmployees(data);
    } catch (e) { console.error(e); }
  };

  const recalcQuickDays = async (employeeId: string, endDate: string) => {
    if (!employeeId || !selectedDay) return;
    const startDate = `${selectedDay.year}-${String(selectedDay.month).padStart(2, '0')}-${String(selectedDay.day).padStart(2, '0')}`;
    const end = endDate || startDate;
    if (end < startDate) return;
    setQuickCalcLoading(true);
    try {
      const calc = await vacacionarioApi.calculateDays({
        employee_id: employeeId,
        start_date: startDate,
        end_date: end,
        include_rest_days: false,
        include_holidays: false,
      });
      setQuickCalc(calc);
    } catch (e) {
      console.error(e);
      setQuickCalc(null);
    } finally {
      setQuickCalcLoading(false);
    }
  };

  const handleQuickAssign = async () => {
    if (!quickSelectedId || !selectedDay) return;
    setQuickSaving(true);
    const startDate = `${selectedDay.year}-${String(selectedDay.month).padStart(2, '0')}-${String(selectedDay.day).padStart(2, '0')}`;
    const endDate = quickEndDate || startDate;
    try {
      await vacacionarioApi.createRequest({
        employee_id: quickSelectedId,
        start_date: startDate,
        end_date: endDate,
        requested_days: null,
        reason: quickReason || null,
        status: 'APPROVED',
        approved_by: 'Admin',
        include_rest_days: false,
        include_holidays: false,
      });
      setShowQuickAssign(false);
      setQuickSelectedId('');
      setQuickSearch('');
      setQuickReason('');
      setQuickCalc(null);
      loadCalendar();
    } catch (err) {
      alert('Error al asignar vacaciones');
    } finally {
      setQuickSaving(false);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const eventsForDay = (day: number) => eventsForDate(day, viewMonth, viewYear);

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Personas este periodo</p>
          <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{totalPeopleThisMonth}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Solicitudes aprobadas</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{events.length}</p>
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
              {monthsToShow === 1
                ? `${fullMonths[viewMonth - 1]} ${viewYear}`
                : `${fullMonths[viewMonth - 1]} ${viewYear} — ${(() => { const e = getMonthInfo(monthsToShow - 1); return `${fullMonths[e.month - 1]} ${e.year}`; })()}`
              }
            </h3>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <button onClick={goToToday} className="ml-2 px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              Hoy
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
              {([1, 2, 4] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setMonthsToShow(n)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${monthsToShow === n ? 'bg-teal-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                >
                  {n === 1 ? 'Actual' : `${n} meses`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><HamsterLoader /></div>
        ) : (
          <div className={`grid gap-4 ${monthsToShow === 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {Array.from({ length: monthsToShow }).map((_, offset) => {
              const { month: m, year: y } = getMonthInfo(offset);
              const mDays = new Date(y, m, 0).getDate();
              const mFirstDay = new Date(y, m - 1, 1).getDay();

              return (
                <div key={`${y}-${m}`}>
                  {monthsToShow > 1 && (
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 text-center">
                      {fullMonths[m - 1]} {y}
                    </h4>
                  )}
                  <div className={`grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-600 rounded-lg overflow-hidden`}>
                    {dayNames.map(d => (
                      <div key={d} className={`bg-slate-50 dark:bg-slate-700 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 ${monthsToShow === 4 ? 'py-1.5' : 'py-2.5'}`}>{monthsToShow === 4 ? d.charAt(0) : d}</div>
                    ))}
                    {Array.from({ length: mFirstDay }).map((_, i) => (
                      <div key={`e-${i}`} className={`bg-white dark:bg-slate-800 ${monthsToShow === 4 ? 'min-h-[64px]' : monthsToShow === 2 ? 'min-h-[80px]' : 'min-h-[80px] sm:min-h-[100px]'}`} />
                    ))}
                    {Array.from({ length: mDays }).map((_, i) => {
                      const day = i + 1;
                      const dayEvents = eventsForDate(day, m, y);
                      const count = dayEvents.length;
                      const isSelected = selectedDay?.day === day && selectedDay?.month === m && selectedDay?.year === y;
                      const isToday = day === today.getDate() && m === today.getMonth() + 1 && y === today.getFullYear();

                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDay(isSelected ? null : { day, month: m, year: y })}
                          className={`bg-white dark:bg-slate-800 ${monthsToShow === 4 ? 'min-h-[64px]' : monthsToShow === 2 ? 'min-h-[80px]' : 'min-h-[80px] sm:min-h-[100px]'} p-1 flex flex-col items-start text-left transition-all relative group ${
                            isSelected ? 'ring-2 ring-inset ring-teal-500 bg-teal-50/50 dark:bg-teal-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-750'
                          }`}
                        >
                          <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-0.5 ${
                            isToday ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'
                          }`}>
                            {day}
                          </span>
                          {count > 0 && (
                            <div className="flex flex-col gap-0.5 w-full overflow-hidden flex-1">
                              {dayEvents.slice(0, 4).map(ev => (
                                <div
                                  key={ev.id}
                                  className={`rounded px-1 py-px text-[8px] sm:text-[9px] font-bold truncate leading-tight ${getPersonColor(ev.employee_name)}`}
                                  title={ev.employee_name}
                                >
                                  {ev.employee_name}
                                </div>
                              ))}
                              {count > 4 && (
                                <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 pl-0.5">+{count - 4}</span>
                              )}
                            </div>
                          )}
                          {count > 0 && (
                            <div className={`absolute top-0.5 right-0.5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center ${monthsToShow === 4 ? 'w-3.5 h-3.5 text-[7px]' : 'w-4 h-4 text-[8px]'}`}>
                              {count}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Day detail modal */}
      {selectedDay !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <div>
                <h3 className="text-lg font-bold">{selectedDay.day} de {fullMonths[selectedDay.month - 1]} {selectedDay.year}</h3>
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
                    const todayDate = new Date(`${selectedDay.year}-${String(selectedDay.month).padStart(2, '0')}-${String(selectedDay.day).padStart(2, '0')}T12:00:00`);
                    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const dayNumber = Math.round((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                    return (
                      <div key={ev.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-600">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getPersonColor(ev.employee_name)}`}>
                            {getInitials(ev.employee_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{ev.employee_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{ev.position || 'Mantenimiento'}</p>
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

            {/* Quick assign section - only for admins */}
            {isAdminUnlocked() && (
            <div className="border-t border-slate-200 dark:border-slate-700 p-4">
              {!showQuickAssign ? (
                <button
                  onClick={openQuickAssign}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Asignar Vacaciones
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Asignar vacaciones</p>

                  {/* Employee selector */}
                  <div className="relative">
                    {quickSelectedId ? (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-teal-300 bg-teal-50 dark:bg-teal-900/20 dark:border-teal-700">
                        <div>
                          <span className="text-sm font-medium text-teal-800 dark:text-teal-200">
                            {quickEmployees.find(e => e.id === quickSelectedId)?.full_name}
                          </span>
                          {(() => {
                            const emp = quickEmployees.find(e => e.id === quickSelectedId);
                            const avail = emp?.balance ? Math.floor(emp.balance.available_days) : null;
                            return avail !== null ? (
                              <span className={`ml-2 text-xs font-bold ${avail > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({avail} dias disp.)
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <button onClick={() => { setQuickSelectedId(''); setQuickSearch(''); }} className="text-teal-600 hover:text-teal-800">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar colaborador..."
                          value={quickSearch}
                          onChange={(e) => { setQuickSearch(e.target.value); setQuickDropdownOpen(true); }}
                          onFocus={() => setQuickDropdownOpen(true)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
                        />
                        {quickDropdownOpen && (
                          <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 shadow-lg">
                            {quickEmployees
                              .filter(emp => !quickSearch || emp.full_name.toLowerCase().includes(quickSearch.toLowerCase()))
                              .map(emp => {
                                const avail = emp.balance ? Math.floor(emp.balance.available_days) : null;
                                return (
                                <button
                                  key={emp.id}
                                  type="button"
                                  onClick={() => { setQuickSelectedId(emp.id); setQuickSearch(''); setQuickDropdownOpen(false); recalcQuickDays(emp.id, quickEndDate); }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2"
                                >
                                  <span className="truncate">{emp.full_name}</span>
                                  {avail !== null && (
                                    <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${
                                      avail > 0
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                    }`}>
                                      {avail}d
                                    </span>
                                  )}
                                </button>
                                );
                              })
                            }
                            {quickEmployees.filter(emp => !quickSearch || emp.full_name.toLowerCase().includes(quickSearch.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-sm text-slate-400">Sin resultados</div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* End date */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase">Ultimo dia de vacaciones</label>
                    <input
                      type="date"
                      value={quickEndDate}
                      onChange={(e) => { setQuickEndDate(e.target.value); recalcQuickDays(quickSelectedId, e.target.value); }}
                      min={selectedDay ? `${selectedDay.year}-${String(selectedDay.month).padStart(2, '0')}-${String(selectedDay.day).padStart(2, '0')}` : ''}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  {/* Day calculation preview */}
                  {quickSelectedId && quickCalc && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 border border-slate-200 dark:border-slate-600">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Dias calendario:</span>
                          <span className="ml-1 font-medium text-slate-700 dark:text-slate-200">{quickCalc.calendar_days}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Descansos:</span>
                          <span className="ml-1 font-medium text-orange-600">-{quickCalc.rest_days_crossed}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Festivos:</span>
                          <span className="ml-1 font-medium text-red-600">-{quickCalc.holiday_days_crossed}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Se descuentan:</span>
                          <span className="ml-1 font-bold text-teal-700 dark:text-teal-300">{quickCalc.requested_days} dias</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {quickSelectedId && quickCalcLoading && (
                    <p className="text-xs text-slate-400 text-center">Calculando dias...</p>
                  )}

                  {/* Reason */}
                  <input
                    type="text"
                    placeholder="Motivo (opcional)"
                    value={quickReason}
                    onChange={(e) => setQuickReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
                  />

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowQuickAssign(false)}
                      className="flex-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleQuickAssign}
                      disabled={!quickSelectedId || quickSaving}
                      className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {quickSaving ? 'Guardando...' : 'Asignar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}
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
  const [editEmployee, setEditEmployee] = useState<VacEmployee | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [balanceData, setBalanceData] = useState<VacBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showInactive, setShowInactive] = useState(false);
  const [inactiveEmployees, setInactiveEmployees] = useState<VacEmployee[]>([]);
  const [inactiveLoading, setInactiveLoading] = useState(false);

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

  const loadInactive = async () => {
    setInactiveLoading(true);
    try {
      const data = await vacacionarioApi.getEmployees({ active: false });
      setInactiveEmployees(data);
    } catch (e) {
      console.error(e);
    } finally {
      setInactiveLoading(false);
    }
  };

  const handleToggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const getEmpSortValue = (emp: VacEmployee, key: string): number | string => {
    const b = emp.balance;
    switch (key) {
      case 'name': return emp.full_name.toLowerCase();
      case 'ingreso': return emp.hire_date || '0000-00-00';
      case 'ganados': return (b?.initial_balance_days ?? 0) + (b?.adjustment_days ?? 0);
      case 'proporcional': return b?.accrued_proportional_days ?? 0;
      case 'total': return (b?.initial_balance_days ?? 0) + (b?.adjustment_days ?? 0) + (b?.accrued_proportional_days ?? 0);
      case 'tomados': return b?.taken_days ?? 0;
      case 'disponibles': return b ? Math.floor(b.available_days) : 0;
      default: return 0;
    }
  };

  const filtered = useMemo(() => {
    let list = employees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.full_name.toLowerCase().includes(q) ||
        (e.employee_number || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const av = getEmpSortValue(a, sortKey);
      const bv = getEmpSortValue(b, sortKey);
      let cmp = 0;
      if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv);
      else cmp = (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [employees, search, sortKey, sortDir]);

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

  const handleReactivate = async (emp: VacEmployee) => {
    if (!confirm(`Reactivar a ${emp.full_name}?`)) return;
    try {
      await vacacionarioApi.archiveEmployee(emp.id, true);
      loadInactive();
      loadEmployees();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEmployee = async (emp: VacEmployee) => {
    if (!requireDeleteAccess()) return;
    if (!confirm(`ELIMINAR permanentemente a ${emp.full_name}? Esta accion no se puede deshacer.`)) return;
    try {
      await vacacionarioApi.deleteEmployee(emp.id);
      loadInactive();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenInactive = () => {
    if (!requireAdminAccess()) return;
    setShowInactive(true);
    loadInactive();
  };

  const SortHeader = ({ label, sortKeyName, align = 'center' }: { label: string; sortKeyName: string; align?: string }) => (
    <th
      className={`py-3 px-3 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors ${align === 'left' ? 'text-left' : 'text-center'}`}
      onClick={() => handleToggleSort(sortKeyName)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === sortKeyName ? (
          sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <span className="w-3 h-3 opacity-30 inline-block text-[9px] leading-3">&#8597;</span>
        )}
      </span>
    </th>
  );

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenInactive}
            className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            <UserX className="w-4 h-4" />
            Inactivos
          </button>
          <button
            onClick={() => { if (requireAdminAccess()) setShowCreate(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Colaborador
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <SortHeader label="Nombre" sortKeyName="name" align="left" />
                <th className="text-left py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">Puesto</th>
                <SortHeader label="Ingreso" sortKeyName="ingreso" align="left" />
                <th className="text-center py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">Descanso</th>
                <SortHeader label="Ganados" sortKeyName="ganados" />
                <SortHeader label="Proporcional" sortKeyName="proporcional" />
                <SortHeader label="Total" sortKeyName="total" />
                <SortHeader label="Tomados" sortKeyName="tomados" />
                <SortHeader label="Disponibles" sortKeyName="disponibles" />
                <th className="text-center py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map(emp => {
                const b = emp.balance;
                const nonProportional = (b?.initial_balance_days ?? 0) + (b?.adjustment_days ?? 0);
                const proportional = b?.accrued_proportional_days ?? 0;
                const total = nonProportional + proportional;
                const realAvailable = b ? Math.floor(b.available_days) : null;
                return (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3 px-3">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{emp.full_name}</p>
                    {emp.employee_number && <p className="text-xs text-slate-500">{emp.employee_number}</p>}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{emp.position || '—'}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 text-xs">
                    <span>{formatDate(emp.hire_date)}</span>
                    {b && (
                      <span className="block text-[10px] text-slate-400">{b.completed_service_years} años</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      {(() => {
                        const days = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
                        const work = [emp.work_sunday, emp.work_monday, emp.work_tuesday, emp.work_wednesday, emp.work_thursday, emp.work_friday, emp.work_saturday];
                        const rest = days.filter((_, i) => !work[i]);
                        return rest.length > 0 ? rest.join(', ') : '—';
                      })()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      {b ? nonProportional : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-xs font-medium text-teal-700 dark:text-teal-300">
                      {b ? proportional.toFixed(6) : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {b ? total.toFixed(6) : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                      {b?.taken_days ?? '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                      (realAvailable ?? 0) > 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {realAvailable ?? '—'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewBalance(emp)}
                        className="p-1.5 rounded hover:bg-teal-50 dark:hover:bg-teal-900/30 text-teal-600"
                        title="Ver saldo"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (requireAdminAccess()) setEditEmployee(emp); }}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (requireAdminAccess()) handleArchive(emp); }}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        title="Desactivar"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-slate-400">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateEmployeeModal onClose={() => setShowCreate(false)} onCreated={loadEmployees} />}
      {editEmployee && <EditEmployeeModal employee={editEmployee} onClose={() => setEditEmployee(null)} onSaved={loadEmployees} />}
      {showBalance && balanceData && selectedEmployee && (
        <BalanceModal employee={selectedEmployee} balance={balanceData} loading={balanceLoading} onClose={() => { setShowBalance(false); setBalanceData(null); }} />
      )}

      {showInactive && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInactive(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-slate-500" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Colaboradores Inactivos</h3>
              </div>
              <button onClick={() => setShowInactive(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5">
              {inactiveLoading ? (
                <div className="flex justify-center py-8"><HamsterLoader /></div>
              ) : inactiveEmployees.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay colaboradores inactivos</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Nombre</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Puesto</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Ingreso</th>
                      <th className="text-center py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {inactiveEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{emp.full_name}</p>
                          {emp.employee_number && <p className="text-xs text-slate-500">{emp.employee_number}</p>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{emp.position || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-xs">{formatDate(emp.hire_date)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleReactivate(emp)}
                              className="p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                              title="Reactivar"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp)}
                              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                              title="Eliminar permanentemente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
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
      const today = todayYmd();
      const toTransition = data.filter(r => r.status === 'APPROVED' && r.end_date < today);
      if (toTransition.length > 0) {
        await Promise.all(
          toTransition.map(r => vacacionarioApi.updateRequestStatus(r.id, { status: 'TAKEN' }).catch(() => {}))
        );
        const refreshed = await vacacionarioApi.getRequests({ status: statusFilter || undefined });
        setRequests(refreshed);
      } else {
        setRequests(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req: VacRequest) => {
    if (!requireAdminAccess()) return;
    try {
      await vacacionarioApi.updateRequestStatus(req.id, { status: 'APPROVED', approved_by: 'Admin' });
      loadRequests();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (req: VacRequest) => {
    if (!requireAdminAccess()) return;
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
    if (!requireDeleteAccess()) return;
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
          onClick={() => { if (requireAdminAccess()) setShowCreate(true); }}
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
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {formatDate(req.start_date)} → {formatDate(req.end_date)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{req.requested_days}</span>
                    {req.calendar_days > 0 && req.calendar_days !== req.requested_days && (
                      <span className="block text-[10px] text-slate-400" title={`${req.rest_days_crossed || 0} descansos + ${req.holiday_days_crossed || 0} festivos excluidos`}>
                        de {req.calendar_days} cal.
                      </span>
                    )}
                  </td>
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
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Recurrente</th>
                <th className="text-center py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {holidays.map(h => (
                <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-100">{formatDate(h.holiday_date)}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{h.name}</td>
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

function EditEmployeeModal({ employee, onClose, onSaved }: { employee: VacEmployee; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: employee.full_name || '',
    employee_number: employee.employee_number || '',
    email: employee.email || '',
    position: employee.position || '',
    hire_date: employee.hire_date || '',
    balance_start_date: employee.balance_start_date || '',
    initial_balance_days: employee.initial_balance_days ?? 0,
    is_area_executive: employee.is_area_executive ?? false,
    manager_employee_number: employee.manager_employee_number || '',
    work_monday: employee.work_monday ?? true,
    work_tuesday: employee.work_tuesday ?? true,
    work_wednesday: employee.work_wednesday ?? true,
    work_thursday: employee.work_thursday ?? true,
    work_friday: employee.work_friday ?? true,
    work_saturday: employee.work_saturday ?? false,
    work_sunday: employee.work_sunday ?? false,
  });
  const [photoUrl, setPhotoUrl] = useState(employee.photo_url || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allEmployees, setAllEmployees] = useState<VacEmployee[]>([]);

  useEffect(() => {
    vacacionarioApi.getEmployees({ active: true }).then(list => setAllEmployees(list.filter(e => e.id !== employee.id))).catch(console.error);
  }, [employee.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadToImgur(file);
      setPhotoUrl(url);
    } catch { alert('Error al subir foto'); }
    finally { setUploadingPhoto(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await vacacionarioApi.updateEmployee(employee.id, {
        full_name: form.full_name,
        employee_number: form.employee_number || null,
        email: form.email || null,
        position: form.position || null,
        hire_date: form.hire_date,
        balance_start_date: form.balance_start_date || null,
        initial_balance_days: form.initial_balance_days,
        department: 'Mantenimiento',
        photo_url: photoUrl || null,
        is_area_executive: form.is_area_executive,
        manager_employee_number: form.is_area_executive ? null : (form.manager_employee_number || null),
        work_monday: form.work_monday,
        work_tuesday: form.work_tuesday,
        work_wednesday: form.work_wednesday,
        work_thursday: form.work_thursday,
        work_friday: form.work_friday,
        work_saturday: form.work_saturday,
        work_sunday: form.work_sunday,
      });
      onSaved();
      onClose();
    } catch (err) {
      alert('Error al actualizar colaborador');
    } finally {
      setSaving(false);
    }
  };

  const dayLabels = [
    { key: 'work_monday', label: 'Lun' },
    { key: 'work_tuesday', label: 'Mar' },
    { key: 'work_wednesday', label: 'Mie' },
    { key: 'work_thursday', label: 'Jue' },
    { key: 'work_friday', label: 'Vie' },
    { key: 'work_saturday', label: 'Sab' },
    { key: 'work_sunday', label: 'Dom' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Editar Colaborador</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {photoUrl ? (
                <img src={photoUrl} alt={form.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-lg font-bold text-slate-500 dark:text-slate-300">
                  {getInitials(form.full_name || 'NN')}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center cursor-pointer shadow-md transition-colors">
                {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
              </label>
            </div>
            <div className="flex-1">
              <Field label="Nombre completo *" value={form.full_name} onChange={v => setForm({ ...form, full_name: v })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="No. Empleado" value={form.employee_number} onChange={v => setForm({ ...form, employee_number: v })} />
            <Field label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" />
          </div>
          <Field label="Puesto" value={form.position} onChange={v => setForm({ ...form, position: v })} />
          <Field label="Fecha ingreso *" value={form.hire_date} onChange={v => setForm({ ...form, hire_date: v })} type="date" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha inicio saldo" value={form.balance_start_date} onChange={v => setForm({ ...form, balance_start_date: v })} type="date" />
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
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Jerarquia</label>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_area_executive}
                onChange={e => setForm({ ...form, is_area_executive: e.target.checked, manager_employee_number: e.target.checked ? '' : form.manager_employee_number })}
                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">Ejecutivo del area (nivel mas alto)</span>
            </label>
            {!form.is_area_executive && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Supervisor directo</label>
                <select
                  value={form.manager_employee_number}
                  onChange={e => setForm({ ...form, manager_employee_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
                >
                  <option value="">-- Sin supervisor --</option>
                  {allEmployees.filter(e => e.employee_number).map(e => (
                    <option key={e.id} value={e.employee_number!}>{e.full_name} ({e.employee_number})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Dias laborales (click para marcar descanso)</label>
            <div className="flex gap-1.5">
              {dayLabels.map(({ key, label }) => {
                const isWork = form[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, [key]: !isWork })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      isWork
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-700'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400" /> Labora</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Descansa</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateEmployeeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    full_name: '',
    employee_number: '',
    email: '',
    position: '',
    hire_date: '',
    balance_start_date: todayYmd(),
    initial_balance_days: 0,
    is_area_executive: false,
    manager_employee_number: '',
    work_monday: true,
    work_tuesday: true,
    work_wednesday: true,
    work_thursday: true,
    work_friday: true,
    work_saturday: false,
    work_sunday: false,
  });
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allEmployees, setAllEmployees] = useState<VacEmployee[]>([]);

  useEffect(() => {
    vacacionarioApi.getEmployees({ active: true }).then(setAllEmployees).catch(console.error);
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadToImgur(file);
      setPhotoUrl(url);
    } catch { alert('Error al subir foto'); }
    finally { setUploadingPhoto(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await vacacionarioApi.createEmployee({
        ...form,
        department: 'Mantenimiento',
        employee_number: form.employee_number || null,
        email: form.email || null,
        balance_start_date: form.balance_start_date || todayYmd(),
        photo_url: photoUrl || null,
        is_area_executive: form.is_area_executive,
        manager_employee_number: form.is_area_executive ? null : (form.manager_employee_number || null),
      });
      onCreated();
      onClose();
    } catch (err) {
      alert('Error al crear colaborador');
    } finally {
      setSaving(false);
    }
  };

  const dayLabels = [
    { key: 'work_monday', label: 'Lun' },
    { key: 'work_tuesday', label: 'Mar' },
    { key: 'work_wednesday', label: 'Mie' },
    { key: 'work_thursday', label: 'Jue' },
    { key: 'work_friday', label: 'Vie' },
    { key: 'work_saturday', label: 'Sab' },
    { key: 'work_sunday', label: 'Dom' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nuevo Colaborador</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {photoUrl ? (
                <img src={photoUrl} alt={form.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-lg font-bold text-slate-500 dark:text-slate-300">
                  {getInitials(form.full_name || 'NN')}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center cursor-pointer shadow-md transition-colors">
                {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
              </label>
            </div>
            <div className="flex-1">
              <Field label="Nombre completo *" value={form.full_name} onChange={v => setForm({ ...form, full_name: v })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="No. Empleado" value={form.employee_number} onChange={v => setForm({ ...form, employee_number: v })} />
            <Field label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" />
          </div>
          <Field label="Puesto" value={form.position} onChange={v => setForm({ ...form, position: v })} />
          <Field label="Fecha ingreso *" value={form.hire_date} onChange={v => setForm({ ...form, hire_date: v })} type="date" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha inicio saldo" value={form.balance_start_date} onChange={v => setForm({ ...form, balance_start_date: v })} type="date" />
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
          <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-2">
            Saldo inicial = dias disponibles al momento de darlo de alta. Los proporcionales se generan desde el aniversario anterior a la fecha de inicio de saldo.
          </p>
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Jerarquia</label>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_area_executive}
                onChange={e => setForm({ ...form, is_area_executive: e.target.checked, manager_employee_number: e.target.checked ? '' : form.manager_employee_number })}
                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">Ejecutivo del area (nivel mas alto)</span>
            </label>
            {!form.is_area_executive && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Supervisor directo</label>
                <select
                  value={form.manager_employee_number}
                  onChange={e => setForm({ ...form, manager_employee_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200"
                >
                  <option value="">-- Sin supervisor --</option>
                  {allEmployees.filter(e => e.employee_number).map(e => (
                    <option key={e.id} value={e.employee_number!}>{e.full_name} ({e.employee_number})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Dias laborales (click para marcar descanso)</label>
            <div className="flex gap-1.5">
              {dayLabels.map(({ key, label }) => {
                const isWork = form[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, [key]: !isWork })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      isWork
                        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-700'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400" /> Labora</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Descansa</span>
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
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [dayCalc, setDayCalc] = useState<VacDayCalculation | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());

  useEffect(() => {
    vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: todayYmd() }).then(setEmployees).catch(console.error);
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

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || null;

  const isRestDay = (dateStr: string) => {
    if (!selectedEmployee) return false;
    const d = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const workDays = [
      selectedEmployee.work_sunday,
      selectedEmployee.work_monday,
      selectedEmployee.work_tuesday,
      selectedEmployee.work_wednesday,
      selectedEmployee.work_thursday,
      selectedEmployee.work_friday,
      selectedEmployee.work_saturday,
    ];
    return !workDays[dayOfWeek];
  };

  const fullMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

  const getMonthOffset = (offset: number) => {
    let m = viewMonth + offset;
    let y = viewYear;
    while (m > 12) { m -= 12; y++; }
    while (m < 1) { m += 12; y--; }
    return { month: m, year: y };
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else { setViewMonth(viewMonth - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else { setViewMonth(viewMonth + 1); }
  };

  const toggleDay = (dateStr: string) => {
    if (holidays.has(dateStr) || isRestDay(dateStr)) return;
    const next = new Set(selectedDays);
    if (next.has(dateStr)) next.delete(dateStr);
    else next.add(dateStr);
    setSelectedDays(next);
    recalcDays(next);
  };

  const recalcDays = async (days: Set<string>) => {
    if (!selectedEmployeeId || days.size === 0) { setDayCalc(null); return; }
    const sorted = Array.from(days).sort();
    const start = sorted[0];
    const end = sorted[sorted.length - 1];
    setCalcLoading(true);
    try {
      const calc = await vacacionarioApi.calculateDays({
        employee_id: selectedEmployeeId,
        start_date: start,
        end_date: end,
        include_rest_days: false,
        include_holidays: false,
      });
      setDayCalc(calc);
    } catch (e) {
      console.error(e);
      setDayCalc(null);
    } finally {
      setCalcLoading(false);
    }
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
        requested_days: null,
        reason: reason || null,
        status: 'REQUESTED',
        include_rest_days: false,
        include_holidays: false,
      });
      onCreated();
      onClose();
    } catch (err) {
      alert('Error al crear solicitud');
    } finally {
      setSaving(false);
    }
  };

  const effectiveDays = dayCalc?.requested_days ?? selectedDays.size;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nueva Solicitud de Vacaciones</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Employee selector */}
          {!selectedEmployeeId ? (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Selecciona colaborador *</label>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre..."
                  value={employeeSearch}
                  onChange={e => setEmployeeSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
                />
              </div>

              {/* Desktop: Table view */}
              <div className="hidden sm:block border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Nombre</th>
                        <th className="text-left py-2 px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Puesto</th>
                        <th className="text-center py-2 px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Descanso</th>
                        <th className="text-center py-2 px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Disponibles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {employees
                        .filter(emp => {
                          const q = employeeSearch.toLowerCase();
                          return !q || emp.full_name.toLowerCase().includes(q) || (emp.position || '').toLowerCase().includes(q);
                        })
                        .map(emp => {
                          const avail = emp.balance ? Math.floor(emp.balance.available_days) : null;
                          const restDayNames = (() => {
                            const days = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'];
                            const work = [emp.work_sunday, emp.work_monday, emp.work_tuesday, emp.work_wednesday, emp.work_thursday, emp.work_friday, emp.work_saturday];
                            return days.filter((_, i) => !work[i]);
                          })();
                          return (
                            <tr
                              key={emp.id}
                              onClick={() => { setSelectedEmployeeId(emp.id); setEmployeeSearch(''); setSelectedDays(new Set()); setDayCalc(null); }}
                              className="hover:bg-teal-50 dark:hover:bg-teal-900/10 cursor-pointer transition-colors"
                            >
                              <td className="py-2.5 px-3">
                                <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">{emp.full_name}</p>
                                {emp.employee_number && <p className="text-[10px] text-slate-400">{emp.employee_number}</p>}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-300">{emp.position || '—'}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                  {restDayNames.length > 0 ? restDayNames.join(', ') : '—'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {avail !== null && (
                                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                                    avail > 0
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  }`}>
                                    {avail}d
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      }
                      {employees.filter(emp => {
                        const q = employeeSearch.toLowerCase();
                        return !q || emp.full_name.toLowerCase().includes(q) || (emp.position || '').toLowerCase().includes(q);
                      }).length === 0 && (
                        <tr><td colSpan={4} className="py-4 text-center text-sm text-slate-400">Sin resultados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile: List view */}
              <div className="sm:hidden max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-700">
                {employees
                  .filter(emp => {
                    const q = employeeSearch.toLowerCase();
                    return !q || emp.full_name.toLowerCase().includes(q);
                  })
                  .map(emp => {
                    const avail = emp.balance ? Math.floor(emp.balance.available_days) : null;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => { setSelectedEmployeeId(emp.id); setEmployeeSearch(''); setSelectedDays(new Set()); setDayCalc(null); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-900/10 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{emp.full_name}</p>
                          <p className="text-[10px] text-slate-400">{emp.position || 'Sin puesto'}</p>
                        </div>
                        {avail !== null && (
                          <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${
                            avail > 0
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {avail}d
                          </span>
                        )}
                      </button>
                    );
                  })
                }
                {employees.filter(emp => {
                  const q = employeeSearch.toLowerCase();
                  return !q || emp.full_name.toLowerCase().includes(q);
                }).length === 0 && (
                  <div className="px-3 py-4 text-sm text-slate-400 text-center">Sin resultados</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/20">
              <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {selectedEmployee?.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-teal-900 dark:text-teal-100 truncate">{selectedEmployee?.full_name}</p>
                <p className="text-[10px] text-teal-700 dark:text-teal-300">
                  {selectedEmployee?.position || '—'}
                  {selectedEmployee?.balance && (
                    <span className="ml-2 font-bold">{Math.floor(selectedEmployee.balance.available_days)} dias disponibles</span>
                  )}
                </p>
              </div>
              <button type="button" onClick={() => { setSelectedEmployeeId(''); setEmployeeSearch(''); setSelectedDays(new Set()); setDayCalc(null); }} className="p-1.5 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors">
                <X className="w-4 h-4 text-teal-700 dark:text-teal-300" />
              </button>
            </div>
          )}

          {selectedEmployeeId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {fullMonths[viewMonth - 1]} {viewYear} — {(() => { const e = getMonthOffset(3); return `${fullMonths[e.month - 1]} ${e.year}`; })()}
                </span>
                <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map(offset => {
                  const { month: m, year: y } = getMonthOffset(offset);
                  const days = new Date(y, m, 0).getDate();
                  const firstDay = new Date(y, m - 1, 1).getDay();
                  return (
                    <div key={`${y}-${m}`} className="space-y-1">
                      <div className="text-center text-xs font-semibold text-slate-700 dark:text-slate-200 py-1">
                        {fullMonths[m - 1]} {y}
                      </div>
                      <div className="grid grid-cols-7 gap-px">
                        {dayNames.map(d => (
                          <div key={d} className="text-center text-[9px] font-semibold text-slate-400 dark:text-slate-500">{d}</div>
                        ))}
                        {Array.from({ length: firstDay }).map((_, i) => (
                          <div key={`e-${i}`} className="aspect-square" />
                        ))}
                        {Array.from({ length: days }).map((_, i) => {
                          const day = i + 1;
                          const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const isHoliday = holidays.has(dateStr);
                          const isRest = isRestDay(dateStr);
                          const isSelected = selectedDays.has(dateStr);
                          const isDisabled = isHoliday || isRest;

                          let bgClass = 'hover:bg-slate-100 dark:hover:bg-slate-700';
                          if (isSelected) bgClass = 'bg-teal-500 text-white ring-1 ring-teal-400';
                          else if (isHoliday) bgClass = 'bg-red-50 dark:bg-red-900/20';
                          else if (isRest) bgClass = 'bg-amber-50 dark:bg-amber-900/20';

                          return (
                            <button
                              key={day}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => toggleDay(dateStr)}
                              className={`aspect-square rounded flex items-center justify-center text-[10px] transition-all ${bgClass} ${isDisabled && !isSelected ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              title={isHoliday ? 'Dia festivo' : isRest ? 'Dia de descanso' : ''}
                            >
                              <span className={`font-medium ${isSelected ? 'text-white' : isDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                {day}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Seleccionado</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Festivo</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Descanso</div>
              </div>

              {selectedDays.size > 0 && (
                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-3">
                  <p className="text-sm font-bold text-teal-800 dark:text-teal-200">
                    {effectiveDays} dia{effectiveDays !== 1 ? 's' : ''} de vacaciones se descontaran
                  </p>
                  <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">
                    {formatDate(startDate)} → {formatDate(endDate)}
                  </p>
                  {dayCalc && (dayCalc.rest_days_crossed > 0 || dayCalc.holiday_days_crossed > 0) && (
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-1">
                      {dayCalc.calendar_days} dias calendario
                      {dayCalc.rest_days_crossed > 0 && ` - ${dayCalc.rest_days_crossed} descanso${dayCalc.rest_days_crossed > 1 ? 's' : ''}`}
                      {dayCalc.holiday_days_crossed > 0 && ` - ${dayCalc.holiday_days_crossed} festivo${dayCalc.holiday_days_crossed > 1 ? 's' : ''}`}
                      {` = ${dayCalc.requested_days} dias descontados`}
                    </p>
                  )}
                  {calcLoading && <p className="text-[10px] text-teal-500 mt-1">Calculando...</p>}
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
              {saving ? 'Guardando...' : `Solicitar ${effectiveDays > 0 ? `(${effectiveDays} dias)` : ''}`}
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
        department: null,
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
  const [accrual, setAccrual] = useState<VacAccrualInfo | null>(null);
  const [accrualLoading, setAccrualLoading] = useState(false);

  useEffect(() => {
    if (!loading && balance) {
      setAccrualLoading(true);
      vacacionarioApi.getAccrual(employee.id, todayYmd())
        .then(setAccrual)
        .catch(console.error)
        .finally(() => setAccrualLoading(false));
    }
  }, [employee.id, loading, balance]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{employee.full_name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{employee.position || 'Mantenimiento'} &middot; Ingreso: {formatDate(employee.hire_date)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><HamsterLoader /></div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Main balance cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <BalanceStat label="Ganados" value={balance.earned_days} color="text-blue-600" />
              <BalanceStat label="Usados" value={balance.taken_days} color="text-orange-600" />
              <BalanceStat label="Disponibles" value={balance.available_days} color="text-green-600" />
              <BalanceStat label="Proyectados" value={balance.projected_available_days} color="text-teal-600" />
            </div>

            {/* Formula breakdown */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Formula de Saldo</h4>
              <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Saldo inicial al alta:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-right">{balance.initial_balance_days} dias</span>

                <span className="text-slate-500 dark:text-slate-400">Proporcional generado (desde {formatDate(balance.accrual_anchor_date)}):</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-right">+{balance.accrued_proportional_days} dias</span>

                <span className="text-slate-500 dark:text-slate-400">Ajustes manuales:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-right">{balance.adjustment_days >= 0 ? '+' : ''}{balance.adjustment_days} dias</span>

                <span className="text-slate-500 dark:text-slate-400 font-medium border-t border-slate-200 dark:border-slate-600 pt-1.5">= Dias ganados:</span>
                <span className="font-bold text-blue-600 text-right border-t border-slate-200 dark:border-slate-600 pt-1.5">{balance.earned_days} dias</span>

                <span className="text-slate-500 dark:text-slate-400">Dias tomados/en curso:</span>
                <span className="font-bold text-orange-600 text-right">-{balance.taken_days} dias</span>

                <span className="text-slate-500 dark:text-slate-400 font-medium border-t border-slate-200 dark:border-slate-600 pt-1.5">= Disponibles hoy:</span>
                <span className={`font-bold text-right border-t border-slate-200 dark:border-slate-600 pt-1.5 ${balance.available_days >= 0 ? 'text-green-600' : 'text-red-600'}`}>{balance.available_days} dias</span>
              </div>

              {balance.future_approved_days > 0 && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {balance.future_approved_days} dias aprobados a futuro (proyectado: {balance.projected_available_days})
                </div>
              )}
              {balance.pending_requested_days > 0 && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {balance.pending_requested_days} dias en solicitudes pendientes
                </div>
              )}
            </div>

            {/* Service info */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Informacion de Servicio</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Años completos de servicio:</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{balance.completed_service_years}</span>
                <span className="text-slate-500 dark:text-slate-400">Proximo aniversario:</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{formatDate(balance.next_anniversary_date)}</span>
                <span className="text-slate-500 dark:text-slate-400">Dias legales al proximo aniversario:</span>
                <span className="font-medium text-teal-700 dark:text-teal-300">{balance.next_anniversary_days} dias</span>
                <span className="text-slate-500 dark:text-slate-400">Fecha inicio saldo:</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{formatDate(balance.balance_start_date)}</span>
                <span className="text-slate-500 dark:text-slate-400">Fecha ancla de devengado:</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{formatDate(balance.accrual_anchor_date)}</span>
              </div>
            </div>

            {/* Current period accrual */}
            {accrual && !accrualLoading && (
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-bold text-teal-800 dark:text-teal-200">Ciclo Actual (Ano {accrual.current_service_year})</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-teal-700 dark:text-teal-300">Periodo:</span>
                  <span className="font-medium text-teal-900 dark:text-teal-100">
                    {formatDate(accrual.current_service_period.start_date)} → {formatDate(accrual.current_service_period.end_date)}
                  </span>
                  <span className="text-teal-700 dark:text-teal-300">Dias del periodo:</span>
                  <span className="font-medium text-teal-900 dark:text-teal-100">{accrual.current_service_period.period_days}</span>
                  <span className="text-teal-700 dark:text-teal-300">Dias transcurridos:</span>
                  <span className="font-medium text-teal-900 dark:text-teal-100">{accrual.current_service_period.elapsed_days}</span>
                  <span className="text-teal-700 dark:text-teal-300">Proporcional generado:</span>
                  <span className="font-bold text-teal-900 dark:text-teal-100">{accrual.current_service_period.proportional_days_generated} dias</span>
                  <span className="text-teal-700 dark:text-teal-300">Pendiente por generar:</span>
                  <span className="font-medium text-teal-900 dark:text-teal-100">{accrual.current_service_period.remaining_proportional_days} dias</span>
                  <span className="text-teal-700 dark:text-teal-300">Total al aniversario:</span>
                  <span className="font-bold text-teal-900 dark:text-teal-100">{accrual.current_service_period.legal_days_at_next_anniversary} dias</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-teal-600 dark:text-teal-400 mb-1">
                    <span>{accrual.current_service_period.proportional_days_generated} generados</span>
                    <span>{accrual.current_service_period.legal_days_at_next_anniversary} total</span>
                  </div>
                  <div className="h-2 bg-teal-200 dark:bg-teal-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 dark:bg-teal-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (accrual.current_service_period.proportional_days_generated / accrual.current_service_period.legal_days_at_next_anniversary) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
            {accrualLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Cargando acumulacion...
              </div>
            )}

            {/* Proportional accrual segments */}
            {balance.proportional_accrual?.segments?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Desglose Proporcional (desde ancla)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-700">
                      <tr>
                        <th className="text-left py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Ano</th>
                        <th className="text-left py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Periodo</th>
                        <th className="text-center py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Legal</th>
                        <th className="text-center py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Transcurrido</th>
                        <th className="text-center py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Proporcional</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                      {balance.proportional_accrual.segments.map(seg => (
                        <tr key={seg.service_year}>
                          <td className="py-1.5 px-2 text-slate-700 dark:text-slate-200">{seg.service_year}</td>
                          <td className="py-1.5 px-2 text-slate-600 dark:text-slate-300 text-[10px]">{formatDate(seg.period_start)} - {formatDate(seg.period_end)}</td>
                          <td className="py-1.5 px-2 text-center text-slate-700 dark:text-slate-200">{seg.legal_days_at_anniversary}</td>
                          <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-300">{seg.elapsed_days_in_range}/{seg.period_days}</td>
                          <td className="py-1.5 px-2 text-center font-bold text-teal-700 dark:text-teal-300">{seg.proportional_days}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <td colSpan={4} className="py-1.5 px-2 text-right font-bold text-slate-600 dark:text-slate-300">Total proporcional:</td>
                        <td className="py-1.5 px-2 text-center font-bold text-teal-700 dark:text-teal-300">{balance.proportional_accrual.proportional_days}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Legal periods */}
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
                              <span className="text-slate-400">-</span>
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
const CHART_STATUS_COLORS: Record<string, string> = { APPROVED: '#10b981', TAKEN: '#0d9488', REQUESTED: '#f59e0b', REJECTED: '#ef4444', CANCELLED: '#94a3b8', DRAFT: '#6b7280' };

function ExecutiveReportView() {
  const [dashboard, setDashboard] = useState<VacDashboard | null>(null);
  const [employees, setEmployees] = useState<VacEmployee[]>([]);
  const [requests, setRequests] = useState<VacRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [accrualComparison, setAccrualComparison] = useState<{
    today: number; yesterday: number; weekAgo: number; monthAgo: number;
    takenLast1: number; takenLast7: number; takenLast30: number;
    dailyRate: number; weeklyRate: number; monthlyRate: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = todayYmd();
      const d1 = new Date(); d1.setDate(d1.getDate() - 1);
      const d7 = new Date(); d7.setDate(d7.getDate() - 7);
      const d30 = new Date(); d30.setDate(d30.getDate() - 30);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const [dash, emps, reqs, emps1, emps7, emps30] = await Promise.all([
        vacacionarioApi.getDashboard(today),
        vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: today }),
        vacacionarioApi.getRequests({ from: `${year}-01-01`, to: `${year}-12-31` }),
        vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: fmt(d1) }),
        vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: fmt(d7) }),
        vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: fmt(d30) }),
      ]);
      setDashboard(dash);
      setEmployees(emps);
      setRequests(reqs);

      const sumProp = (list: VacEmployee[]) => list.reduce((s, e) => s + (e.balance?.accrued_proportional_days ?? 0), 0);
      const sumUsed = (list: VacEmployee[]) => list.reduce((s, e) => s + (e.balance?.used_days ?? 0), 0);
      const todayProp = sumProp(emps);
      const yesterdayProp = sumProp(emps1);
      const weekAgoProp = sumProp(emps7);
      const monthAgoProp = sumProp(emps30);
      const todayUsed = sumUsed(emps);
      const yesterdayUsed = sumUsed(emps1);
      const weekAgoUsed = sumUsed(emps7);
      const monthAgoUsed = sumUsed(emps30);

      setAccrualComparison({
        today: todayProp,
        yesterday: yesterdayProp,
        weekAgo: weekAgoProp,
        monthAgo: monthAgoProp,
        takenLast1: todayUsed - yesterdayUsed,
        takenLast7: todayUsed - weekAgoUsed,
        takenLast30: todayUsed - monthAgoUsed,
        dailyRate: todayProp - yesterdayProp,
        weeklyRate: todayProp - weekAgoProp,
        monthlyRate: todayProp - monthAgoProp,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    const approved = requests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN');
    const totalDaysGranted = approved.reduce((s, r) => s + r.requested_days, 0);
    const avgDaysPerRequest = approved.length > 0 ? totalDaysGranted / approved.length : 0;
    const totalAvailable = employees.reduce((s, e) => s + (e.balance?.available_days ?? 0), 0);
    const avgAvailable = employees.length > 0 ? totalAvailable / employees.length : 0;
    const totalEarned = employees.reduce((s, e) => s + (e.balance?.earned_days ?? 0), 0);
    const totalUsed = employees.reduce((s, e) => s + (e.balance?.used_days ?? 0), 0);
    const utilizationRate = totalEarned > 0 ? (totalUsed / totalEarned) * 100 : 0;
    const pendingDays = employees.reduce((s, e) => s + (e.balance?.pending_requested_days ?? 0), 0);
    const futureDays = employees.reduce((s, e) => s + (e.balance?.future_approved_days ?? 0), 0);

    // Equivalencia a personal ausente
    const workingDaysInYear = 260;
    const avgWorkDaysPerPerson = workingDaysInYear;
    const equivalentAbsentPersons = totalDaysGranted / avgWorkDaysPerPerson;
    const equivalentAbsentNow = pendingDays > 0 ? (pendingDays + futureDays) / 20 : 0;

    // Tasa de aprobacion
    const totalDecided = requests.filter(r => ['APPROVED', 'TAKEN', 'REJECTED'].includes(r.status)).length;
    const approvalRate = totalDecided > 0 ? (approved.length / totalDecided) * 100 : 0;

    // Rejection rate
    const rejected = requests.filter(r => r.status === 'REJECTED').length;
    const rejectionRate = totalDecided > 0 ? (rejected / totalDecided) * 100 : 0;

    // Avg calendar days vs work days
    const avgCalendarDays = approved.length > 0 ? approved.reduce((s, r) => s + r.calendar_days, 0) / approved.length : 0;
    const avgRestDaysCrossed = approved.length > 0 ? approved.reduce((s, r) => s + r.rest_days_crossed, 0) / approved.length : 0;
    const avgHolidaysCrossed = approved.length > 0 ? approved.reduce((s, r) => s + r.holiday_days_crossed, 0) / approved.length : 0;

    // Seniority stats
    const today = new Date();
    const seniorityYears = employees.map(e => {
      const hire = new Date(e.hire_date);
      return (today.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    });
    const avgSeniority = seniorityYears.length > 0 ? seniorityYears.reduce((a, b) => a + b, 0) / seniorityYears.length : 0;
    const maxSeniority = seniorityYears.length > 0 ? Math.max(...seniorityYears) : 0;

    // Employees with zero balance
    const zeroBalance = employees.filter(e => (e.balance?.available_days ?? 0) <= 0).length;
    const zeroBalanceRate = employees.length > 0 ? (zeroBalance / employees.length) * 100 : 0;

    // Never taken vacation (no requests at all)
    const employeesWithRequests = new Set(requests.map(r => r.employee_id));
    const neverTaken = employees.filter(e => !employeesWithRequests.has(e.id)).length;
    const neverTakenRate = employees.length > 0 ? (neverTaken / employees.length) * 100 : 0;

    // Avg days between request creation and start_date (anticipation)
    const avgAnticipation = approved.length > 0
      ? approved.reduce((s, r) => {
          const start = new Date(r.start_date);
          const created = r.approved_at ? new Date(r.approved_at) : start;
          return s + Math.max(0, (start.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
        }, 0) / approved.length
      : 0;

    return {
      totalRequests: requests.length, approved: approved.length, rejected,
      totalDaysGranted, avgDaysPerRequest, totalAvailable, avgAvailable,
      totalEarned, totalUsed, utilizationRate, pendingDays, futureDays,
      equivalentAbsentPersons, equivalentAbsentNow, approvalRate, rejectionRate,
      avgCalendarDays, avgRestDaysCrossed, avgHolidaysCrossed,
      avgSeniority, maxSeniority, zeroBalance, zeroBalanceRate,
      neverTaken, neverTakenRate, avgAnticipation,
    };
  }, [requests, employees]);

  // Monthly trend
  const monthlyData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const data = months.map((m) => ({ mes: m, aprobadas: 0, solicitadas: 0, rechazadas: 0, dias: 0 }));
    requests.forEach(r => {
      const month = parseInt(r.start_date.slice(5, 7)) - 1;
      if (month >= 0 && month < 12) {
        if (r.status === 'APPROVED' || r.status === 'TAKEN') { data[month].aprobadas++; data[month].dias += r.requested_days; }
        else if (r.status === 'REQUESTED') data[month].solicitadas++;
        else if (r.status === 'REJECTED') data[month].rechazadas++;
      }
    });
    return data;
  }, [requests]);

  // Weekly distribution (day of week start)
  const weekdayDistribution = useMemo(() => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    requests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN').forEach(r => {
      const d = new Date(r.start_date + 'T12:00:00').getDay();
      counts[d]++;
    });
    return days.map((name, i) => ({ dia: name.slice(0, 3), solicitudes: counts[i] }));
  }, [requests]);

  // Duration distribution
  const durationDistribution = useMemo(() => {
    const ranges = [
      { label: '1 dia', min: 1, max: 1 },
      { label: '2-3 dias', min: 2, max: 3 },
      { label: '4-5 dias', min: 4, max: 5 },
      { label: '6-10 dias', min: 6, max: 10 },
      { label: '11-15 dias', min: 11, max: 15 },
      { label: '16+ dias', min: 16, max: Infinity },
    ];
    const approved = requests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN');
    return ranges.map(range => ({
      rango: range.label,
      cantidad: approved.filter(r => r.requested_days >= range.min && r.requested_days <= range.max).length,
    }));
  }, [requests]);

  // Balance distribution
  const balanceDistribution = useMemo(() => {
    const ranges = [
      { label: 'Negativo', min: -Infinity, max: -1 },
      { label: '0 dias', min: 0, max: 0 },
      { label: '1-5 dias', min: 1, max: 5 },
      { label: '6-10 dias', min: 6, max: 10 },
      { label: '11-15 dias', min: 11, max: 15 },
      { label: '16-20 dias', min: 16, max: 20 },
      { label: '21-30 dias', min: 21, max: 30 },
      { label: '31+ dias', min: 31, max: Infinity },
    ];
    return ranges.map(r => ({
      rango: r.label,
      personas: employees.filter(e => {
        const avail = e.balance?.available_days ?? 0;
        return avail >= r.min && avail <= r.max;
      }).length,
    }));
  }, [employees]);

  // Department breakdown
  const departmentStats = useMemo(() => {
    const deptMap: Record<string, { name: string; total: number; usedDays: number; availDays: number; requests: number; approved: number; earnedDays: number }> = {};
    employees.forEach(e => {
      const dept = e.department || 'Sin Depto';
      if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, usedDays: 0, availDays: 0, requests: 0, approved: 0, earnedDays: 0 };
      deptMap[dept].total++;
      deptMap[dept].usedDays += e.balance?.used_days ?? 0;
      deptMap[dept].availDays += e.balance?.available_days ?? 0;
      deptMap[dept].earnedDays += e.balance?.earned_days ?? 0;
    });
    requests.forEach(r => {
      const dept = r.department || 'Sin Depto';
      if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, usedDays: 0, availDays: 0, requests: 0, approved: 0, earnedDays: 0 };
      deptMap[dept].requests++;
      if (r.status === 'APPROVED' || r.status === 'TAKEN') deptMap[dept].approved++;
    });
    return Object.values(deptMap).sort((a, b) => b.total - a.total);
  }, [employees, requests]);

  // Department utilization radar
  const deptRadar = useMemo(() => {
    return departmentStats.slice(0, 8).map(d => ({
      dept: d.name.length > 12 ? d.name.slice(0, 12) + '..' : d.name,
      utilizacion: d.earnedDays > 0 ? Math.round((d.usedDays / d.earnedDays) * 100) : 0,
      promDisponible: d.total > 0 ? Math.round(d.availDays / d.total) : 0,
    }));
  }, [departmentStats]);

  // Seniority vs balance scatter
  const seniorityVsBalance = useMemo(() => {
    return employees.map(e => {
      const hire = new Date(e.hire_date);
      const years = (new Date().getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return {
        antiguedad: Math.round(years * 10) / 10,
        disponible: e.balance?.available_days ?? 0,
        nombre: e.full_name,
        dept: e.department,
      };
    });
  }, [employees]);

  // Top consumers
  const topConsumers = useMemo(() => {
    const map: Record<string, { name: string; dept: string; days: number; requests: number; avgDuration: number }> = {};
    requests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN').forEach(r => {
      if (!map[r.employee_id]) map[r.employee_id] = { name: r.full_name || '', dept: r.department || '', days: 0, requests: 0, avgDuration: 0 };
      map[r.employee_id].days += r.requested_days;
      map[r.employee_id].requests++;
    });
    Object.values(map).forEach(v => { v.avgDuration = v.requests > 0 ? Math.round((v.days / v.requests) * 10) / 10 : 0; });
    return Object.values(map).sort((a, b) => b.days - a.days).slice(0, 15);
  }, [requests]);

  // Employees with most balance (risk of accumulation)
  const topAccumulators = useMemo(() => {
    return employees
      .filter(e => (e.balance?.available_days ?? 0) > 0)
      .sort((a, b) => (b.balance?.available_days ?? 0) - (a.balance?.available_days ?? 0))
      .slice(0, 10)
      .map(e => ({
        name: e.full_name,
        dept: e.department,
        available: e.balance?.available_days ?? 0,
        earned: e.balance?.earned_days ?? 0,
        used: e.balance?.used_days ?? 0,
        utilization: (e.balance?.earned_days ?? 0) > 0
          ? Math.round(((e.balance?.used_days ?? 0) / (e.balance!.earned_days)) * 100) : 0,
      }));
  }, [employees]);

  // Service year distribution
  const serviceYearDist = useMemo(() => {
    const ranges = [
      { label: '<1 año', min: 0, max: 1 },
      { label: '1-2 años', min: 1, max: 2 },
      { label: '2-5 años', min: 2, max: 5 },
      { label: '5-10 años', min: 5, max: 10 },
      { label: '10-15 años', min: 10, max: 15 },
      { label: '15-20 años', min: 15, max: 20 },
      { label: '20+ años', min: 20, max: Infinity },
    ];
    const today = new Date();
    return ranges.map(r => ({
      rango: r.label,
      personas: employees.filter(e => {
        const years = (today.getTime() - new Date(e.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return years >= r.min && years < r.max;
      }).length,
    }));
  }, [employees]);

  // Status data for pie
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      status,
    }));
  }, [requests]);

  // Cumulative days granted by month
  const cumulativeDays = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    let cumul = 0;
    return months.map((m, i) => {
      const monthDays = requests
        .filter(r => (r.status === 'APPROVED' || r.status === 'TAKEN') && parseInt(r.start_date.slice(5, 7)) - 1 === i)
        .reduce((s, r) => s + r.requested_days, 0);
      cumul += monthDays;
      return { mes: m, diasAcumulados: cumul, diasMes: monthDays };
    });
  }, [requests]);

  // Monthly concurrent absences estimate
  const monthlyAbsentees = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months.map((m, i) => {
      const monthApproved = requests.filter(r => {
        if (r.status !== 'APPROVED' && r.status !== 'TAKEN') return false;
        const startMonth = parseInt(r.start_date.slice(5, 7)) - 1;
        const endMonth = parseInt(r.end_date.slice(5, 7)) - 1;
        return startMonth <= i && endMonth >= i;
      });
      const totalDaysInMonth = monthApproved.reduce((s, r) => s + r.requested_days, 0);
      const workingDaysMonth = 22;
      const equivalentPersons = totalDaysInMonth / workingDaysMonth;
      return { mes: m, personasAusentes: Math.round(equivalentPersons * 10) / 10, solicitudes: monthApproved.length };
    });
  }, [requests]);

  // Quarterly comparison
  const quarterlyData = useMemo(() => {
    const quarters = ['Q1 (Ene-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dic)'];
    return quarters.map((q, qi) => {
      const startMonth = qi * 3;
      const endMonth = startMonth + 2;
      const qRequests = requests.filter(r => {
        const m = parseInt(r.start_date.slice(5, 7)) - 1;
        return m >= startMonth && m <= endMonth;
      });
      const qApproved = qRequests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN');
      const qDays = qApproved.reduce((s, r) => s + r.requested_days, 0);
      return { trimestre: q, solicitudes: qRequests.length, dias: qDays, aprobadas: qApproved.length };
    });
  }, [requests]);

  if (loading) return <div className="flex justify-center py-12"><HamsterLoader /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* KPI Row 1: General */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiBox label="Total Solicitudes" value={analytics.totalRequests} color="text-slate-800 dark:text-slate-100" />
        <KpiBox label="Aprobadas/Tomadas" value={analytics.approved} color="text-green-600 dark:text-green-400" />
        <KpiBox label="Rechazadas" value={analytics.rejected} color="text-red-600 dark:text-red-400" />
        <KpiBox label="Dias Otorgados" value={analytics.totalDaysGranted} color="text-teal-600 dark:text-teal-400" />
        <KpiBox label="Tasa Aprobacion" value={`${analytics.approvalRate.toFixed(0)}%`} color="text-emerald-600 dark:text-emerald-400" />
        <KpiBox label="Tasa Rechazo" value={`${analytics.rejectionRate.toFixed(0)}%`} color="text-rose-600 dark:text-rose-400" />
      </div>

      {/* KPI Row 2: Balance & Utilization */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiBox label="Dias Disponibles Totales" value={Math.round(analytics.totalAvailable)} color="text-amber-600 dark:text-amber-400" />
        <KpiBox label="Prom. Disponible/Persona" value={analytics.avgAvailable.toFixed(1)} color="text-blue-600 dark:text-blue-400" />
        <KpiBox label="% Utilizacion" value={`${analytics.utilizationRate.toFixed(0)}%`} color="text-cyan-600 dark:text-cyan-400" />
        <KpiBox label="Dias Pendientes" value={Math.round(analytics.pendingDays)} color="text-orange-600 dark:text-orange-400" />
        <KpiBox label="Dias Futuros Aprobados" value={Math.round(analytics.futureDays)} color="text-violet-600 dark:text-violet-400" />
        <KpiBox label="Prom. Dias/Solicitud" value={analytics.avgDaysPerRequest.toFixed(1)} color="text-indigo-600 dark:text-indigo-400" />
      </div>

      {/* Accrual vs Taken comparison */}
      {accrualComparison && (
        <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 border border-sky-200 dark:border-sky-700 rounded-xl p-5">
          <h4 className="text-sm font-bold text-sky-800 dark:text-sky-200 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Generacion Proporcional vs Dias Tomados
          </h4>
          <p className="text-xs text-sky-600 dark:text-sky-400 mb-4">Comparativa de dias proporcionales generados vs dias consumidos en periodos recientes</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Last 1 day */}
            <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-4 border border-sky-100 dark:border-sky-800">
              <p className="text-[10px] uppercase tracking-wider font-bold text-sky-500 dark:text-sky-400 mb-2">Ultimo dia (ayer vs hoy)</p>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Generados</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{accrualComparison.dailyRate.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tomados</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{accrualComparison.takenLast1 > 0 ? '-' : ''}{Math.abs(accrualComparison.takenLast1).toFixed(1)}</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${accrualComparison.dailyRate >= accrualComparison.takenLast1 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                  style={{ width: `${Math.min(100, accrualComparison.dailyRate > 0 ? (accrualComparison.dailyRate / Math.max(accrualComparison.dailyRate, accrualComparison.takenLast1 || 0.01)) * 100 : 50)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                Balance neto: <span className={`font-bold ${(accrualComparison.dailyRate - accrualComparison.takenLast1) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {(accrualComparison.dailyRate - accrualComparison.takenLast1) >= 0 ? '+' : ''}{(accrualComparison.dailyRate - accrualComparison.takenLast1).toFixed(2)} dias
                </span>
              </p>
            </div>

            {/* Last 7 days */}
            <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-4 border border-sky-100 dark:border-sky-800">
              <p className="text-[10px] uppercase tracking-wider font-bold text-sky-500 dark:text-sky-400 mb-2">Ultimos 7 dias</p>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Generados</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{accrualComparison.weeklyRate.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tomados</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{accrualComparison.takenLast7 > 0 ? '-' : ''}{Math.abs(accrualComparison.takenLast7).toFixed(1)}</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${accrualComparison.weeklyRate >= accrualComparison.takenLast7 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                  style={{ width: `${Math.min(100, accrualComparison.weeklyRate > 0 ? (accrualComparison.weeklyRate / Math.max(accrualComparison.weeklyRate, accrualComparison.takenLast7 || 0.01)) * 100 : 50)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                Balance neto: <span className={`font-bold ${(accrualComparison.weeklyRate - accrualComparison.takenLast7) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {(accrualComparison.weeklyRate - accrualComparison.takenLast7) >= 0 ? '+' : ''}{(accrualComparison.weeklyRate - accrualComparison.takenLast7).toFixed(2)} dias
                </span>
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Prom. diario: {(accrualComparison.weeklyRate / 7).toFixed(3)} dias/dia</p>
            </div>

            {/* Last 30 days */}
            <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-4 border border-sky-100 dark:border-sky-800">
              <p className="text-[10px] uppercase tracking-wider font-bold text-sky-500 dark:text-sky-400 mb-2">Ultimos 30 dias</p>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Generados</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{accrualComparison.monthlyRate.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tomados</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{accrualComparison.takenLast30 > 0 ? '-' : ''}{Math.abs(accrualComparison.takenLast30).toFixed(1)}</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${accrualComparison.monthlyRate >= accrualComparison.takenLast30 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                  style={{ width: `${Math.min(100, accrualComparison.monthlyRate > 0 ? (accrualComparison.monthlyRate / Math.max(accrualComparison.monthlyRate, accrualComparison.takenLast30 || 0.01)) * 100 : 50)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                Balance neto: <span className={`font-bold ${(accrualComparison.monthlyRate - accrualComparison.takenLast30) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {(accrualComparison.monthlyRate - accrualComparison.takenLast30) >= 0 ? '+' : ''}{(accrualComparison.monthlyRate - accrualComparison.takenLast30).toFixed(2)} dias
                </span>
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Prom. diario: {(accrualComparison.monthlyRate / 30).toFixed(3)} dias/dia</p>
            </div>
          </div>

          {/* Summary row */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/50 dark:bg-slate-800/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Proporcional Total Hoy</p>
              <p className="text-lg font-bold text-sky-700 dark:text-sky-300">{accrualComparison.today.toFixed(2)}</p>
            </div>
            <div className="bg-white/50 dark:bg-slate-800/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Velocidad de Generacion</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{(accrualComparison.monthlyRate / 30).toFixed(3)} <span className="text-xs font-normal">dias/dia</span></p>
            </div>
            <div className="bg-white/50 dark:bg-slate-800/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Proyeccion Mensual</p>
              <p className="text-lg font-bold text-sky-700 dark:text-sky-300">{((accrualComparison.monthlyRate / 30) * 30).toFixed(1)} <span className="text-xs font-normal">dias/mes</span></p>
            </div>
            <div className="bg-white/50 dark:bg-slate-800/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Proyeccion Anual</p>
              <p className="text-lg font-bold text-sky-700 dark:text-sky-300">{((accrualComparison.monthlyRate / 30) * 365).toFixed(1)} <span className="text-xs font-normal">dias/año</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Equivalent absent persons - highlight card */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-700 rounded-xl p-5">
        <h4 className="text-sm font-bold text-teal-800 dark:text-teal-200 mb-3 flex items-center gap-2">
          <UserX className="w-4 h-4" />
          Equivalencia en Personal Ausente
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Dias otorgados este año</p>
            <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{analytics.totalDaysGranted}</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">equivale a <span className="font-bold text-teal-800 dark:text-teal-200">{analytics.equivalentAbsentPersons.toFixed(1)}</span> personas ausentes todo el año</p>
          </div>
          <div>
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Dias disponibles sin tomar</p>
            <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{Math.round(analytics.totalAvailable)}</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">si se toman, equivaldria a <span className="font-bold text-teal-800 dark:text-teal-200">{(analytics.totalAvailable / 260).toFixed(1)}</span> personas ausentes un año</p>
          </div>
          <div>
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Personal sin vacaciones ({year})</p>
            <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{analytics.neverTaken}</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">{analytics.neverTakenRate.toFixed(0)}% del total no ha solicitado vacaciones</p>
          </div>
          <div>
            <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Personal con saldo en cero</p>
            <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{analytics.zeroBalance}</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">{analytics.zeroBalanceRate.toFixed(0)}% del equipo ya utilizo todos sus dias</p>
          </div>
        </div>
      </div>

      {/* KPI Row 3: Advanced metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <KpiBox label="Prom. Dias Calendario" value={analytics.avgCalendarDays.toFixed(1)} color="text-slate-700 dark:text-slate-200" />
        <KpiBox label="Prom. Descansos Cruzados" value={analytics.avgRestDaysCrossed.toFixed(1)} color="text-slate-600 dark:text-slate-300" />
        <KpiBox label="Prom. Festivos Cruzados" value={analytics.avgHolidaysCrossed.toFixed(1)} color="text-slate-600 dark:text-slate-300" />
        <KpiBox label="Antiguedad Promedio" value={`${analytics.avgSeniority.toFixed(1)} a`} color="text-sky-600 dark:text-sky-400" />
        <KpiBox label="Max Antiguedad" value={`${analytics.maxSeniority.toFixed(1)} a`} color="text-sky-600 dark:text-sky-400" />
        <KpiBox label="Total Devengados" value={Math.round(analytics.totalEarned)} color="text-emerald-600 dark:text-emerald-400" />
        <KpiBox label="Total Usados" value={Math.round(analytics.totalUsed)} color="text-orange-600 dark:text-orange-400" />
        <KpiBox label="Anticipacion Prom." value={`${analytics.avgAnticipation.toFixed(0)}d`} color="text-blue-600 dark:text-blue-400" />
      </div>

      {/* Charts Row 1: Monthly trend + Status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Distribucion por Estatus</h4>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={CHART_STATUS_COLORS[entry.status] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Cumulative days + Monthly absentees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Dias Otorgados Acumulados</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Curva acumulada de dias de vacaciones a lo largo del año</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeDays}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="diasAcumulados" name="Dias Acumulados" stroke="#0d9488" fill="#0d948833" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Equivalente Personas Ausentes por Mes</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Cuantas personas equivalentes estan ausentes cada mes por vacaciones</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyAbsentees}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar yAxisId="right" dataKey="solicitudes" name="Solicitudes" fill="#e2e8f044" stroke="#94a3b8" />
                <Line yAxisId="left" type="monotone" dataKey="personasAusentes" name="Personas Equivalentes" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#dc2626', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 3: Duration dist + Weekday dist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Distribucion por Duracion</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Cuantos dias suelen tomar las solicitudes aprobadas</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="cantidad" name="Solicitudes" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Dia de Inicio Preferido</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">En que dia de la semana inician las vacaciones aprobadas</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="solicitudes" name="Inicios" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 4: Balance distribution + Service year */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Distribucion de Saldos Disponibles</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Cuantos dias tiene disponible cada segmento del personal</p>
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

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Distribucion por Antiguedad</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Cuantos años de servicio tiene el equipo</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceYearDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="personas" name="Personas" fill="#ca8a04" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 5: Dept radar + Seniority scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Utilizacion por Departamento</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">% de dias devengados que han sido usados por departamento</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={deptRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dept" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar name="% Utilizacion" dataKey="utilizacion" stroke="#0d9488" fill="#0d9488" fillOpacity={0.3} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Antiguedad vs Dias Disponibles</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Relacion entre años de servicio y saldo de vacaciones</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="antiguedad" name="Antiguedad" unit=" a" tick={{ fontSize: 11 }} />
                <YAxis dataKey="disponible" name="Disponible" unit=" d" tick={{ fontSize: 11 }} />
                <ZAxis range={[40, 40]} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value: any, name: string) => [value, name === 'antiguedad' ? 'Antiguedad' : 'Dias Disponibles']} />
                <Scatter data={seniorityVsBalance} fill="#4f46e5" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quarterly comparison */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Comparativo Trimestral</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Solicitudes y dias otorgados por trimestre</p>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {quarterlyData.map((q, i) => (
            <div key={i} className="text-center bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{q.trimestre}</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">{q.dias} <span className="text-xs font-normal text-slate-500">dias</span></p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{q.solicitudes} solic. / {q.aprobadas} aprob.</p>
            </div>
          ))}
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="trimestre" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="dias" name="Dias Otorgados" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="solicitudes" name="Solicitudes" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Detalle por Departamento</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Departamento</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Personas</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Solicitudes</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Aprobadas</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Dias Usados</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Dias Disponibles</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Dias Devengados</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">% Utilizacion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {departmentStats.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-100">{d.name}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{d.total}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{d.requests}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{d.approved}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{Math.round(d.usedDays)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{Math.round(d.availDays)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{Math.round(d.earnedDays)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      d.earnedDays > 0 && (d.usedDays / d.earnedDays) > 0.7
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : d.earnedDays > 0 && (d.usedDays / d.earnedDays) > 0.4
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {d.earnedDays > 0 ? `${Math.round((d.usedDays / d.earnedDays) * 100)}%` : '0%'}
                    </span>
                  </td>
                </tr>
              ))}
              {departmentStats.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-slate-400">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top consumers table - extended */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Top 15 - Mayor Consumo de Dias ({year})</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">#</th>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Colaborador</th>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Departamento</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Dias Tomados</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Solicitudes</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Prom. Duracion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {topConsumers.map((tc, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">{i + 1}</td>
                  <td className="py-2.5 px-3 text-slate-800 dark:text-slate-100 font-medium">{tc.name}</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-xs">{tc.dept}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                      {tc.days} dias
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{tc.requests}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{tc.avgDuration} dias</td>
                </tr>
              ))}
              {topConsumers.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Sin datos para este periodo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top accumulators (risk) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Top 10 - Mayor Acumulacion de Dias</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Colaboradores con mas dias disponibles sin tomar - riesgo de pasivo laboral</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">#</th>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Colaborador</th>
                <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Departamento</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Disponibles</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Devengados</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Usados</th>
                <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">% Utilizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {topAccumulators.map((ta, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">{i + 1}</td>
                  <td className="py-2.5 px-3 text-slate-800 dark:text-slate-100 font-medium">{ta.name}</td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-xs">{ta.dept}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      {Math.round(ta.available)} dias
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{Math.round(ta.earned)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{Math.round(ta.used)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      ta.utilization > 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : ta.utilization > 40 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {ta.utilization}%
                    </span>
                  </td>
                </tr>
              ))}
              {topAccumulators.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly days line chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Dias Otorgados por Mes</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Tendencia mensual de dias de vacaciones otorgados</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="dias" name="Dias" stroke="#0284c7" strokeWidth={2} dot={{ fill: '#0284c7', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h5 className="text-sm font-bold text-sky-800 dark:text-sky-200">Proyeccion de Impacto</h5>
          </div>
          <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed">
            Con {Math.round(analytics.totalAvailable)} dias pendientes por tomar, si se programan en los proximos 6 meses, se tendria un promedio de <span className="font-bold">{(analytics.totalAvailable / 6 / 22).toFixed(1)}</span> personas ausentes adicionales por mes. Planificar cobertura es clave.
          </p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h5 className="text-sm font-bold text-amber-800 dark:text-amber-200">Riesgo de Acumulacion</h5>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            {analytics.zeroBalance > 0 ? `${analytics.zeroBalance} colaboradores` : 'Nadie'} tiene saldo en cero, mientras {analytics.neverTaken} no han solicitado vacaciones este año. La acumulacion excesiva genera pasivo laboral y riesgo legal.
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h5 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Eficiencia Operativa</h5>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
            La tasa de utilizacion es {analytics.utilizationRate.toFixed(0)}%. Se anticipan en promedio {analytics.avgAnticipation.toFixed(0)} dias antes. La duracion media es {analytics.avgDaysPerRequest.toFixed(1)} dias, con {analytics.avgCalendarDays.toFixed(1)} dias calendario ({analytics.avgRestDaysCrossed.toFixed(1)} descansos incluidos).
          </p>
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

/* ============================================================
   ORG CHART VIEW
   ============================================================ */

interface OrgTreeNode {
  employee: VacEmployee;
  children: OrgTreeNode[];
}

function buildOrgTree(employees: VacEmployee[]): OrgTreeNode[] {
  const byNumber = new Map<string, VacEmployee>();
  employees.forEach(e => { if (e.employee_number) byNumber.set(e.employee_number, e); });

  const nodeMap = new Map<string, OrgTreeNode>();
  employees.forEach(e => { nodeMap.set(e.id, { employee: e, children: [] }); });

  const roots: OrgTreeNode[] = [];
  employees.forEach(e => {
    const node = nodeMap.get(e.id)!;
    if (e.is_area_executive || !e.manager_employee_number) {
      roots.push(node);
    } else {
      const manager = byNumber.get(e.manager_employee_number);
      if (manager) {
        const parentNode = nodeMap.get(manager.id);
        if (parentNode) parentNode.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    }
  });
  return roots;
}

function OrgNode({ node, level = 0 }: { node: OrgTreeNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2);
  const emp = node.employee;
  const hasChildren = node.children.length > 0;

  return (
    <div className={level > 0 ? 'ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-600' : ''}>
      <div
        className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md mb-1 ${
          emp.is_area_executive
            ? 'bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-200 dark:border-teal-700'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600'
        }`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <button className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-400">
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          </button>
        ) : <div className="w-5" />}

        {emp.photo_url ? (
          <img src={emp.photo_url} alt={emp.full_name} className="flex-shrink-0 w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600" />
        ) : (
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
            emp.is_area_executive ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200'
          }`}>
            {getInitials(emp.full_name)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{emp.full_name}</span>
            {emp.is_area_executive && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {emp.position && <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{emp.position}</span>}
            {emp.employee_number && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">#{emp.employee_number}</span>
            )}
          </div>
        </div>

        {hasChildren && (
          <div className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded-full">
            <Users className="w-3 h-3" />
            <span>{node.children.length}</span>
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="space-y-0">
          {node.children.map(child => (
            <OrgNode key={child.employee.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgTreePhotos({ tree }: { tree: OrgTreeNode[] }) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        setZoom(prev => Math.min(2, Math.max(0.3, prev - e.deltaY * 0.002)));
      }
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, scrollLeft: container.scrollLeft, scrollTop: container.scrollTop };
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollLeft = dragStart.current.scrollLeft - (e.clientX - dragStart.current.x);
    container.scrollTop = dragStart.current.scrollTop - (e.clientY - dragStart.current.y);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    const container = containerRef.current;
    if (container) { container.style.cursor = ''; container.style.userSelect = ''; }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false); };
    const handleGlobalMouseUp = () => { isDragging.current = false; const c = containerRef.current; if (c) { c.style.cursor = ''; c.style.userSelect = ''; } };
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => { document.removeEventListener('keydown', handleEsc); document.removeEventListener('mouseup', handleGlobalMouseUp); };
  }, [isFullscreen]);

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col' : 'relative'}>
      {zoomedPhoto && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center cursor-pointer" onClick={() => setZoomedPhoto(null)}>
          <img src={zoomedPhoto} alt="" className="max-w-[85vw] max-h-[85vh] rounded-2xl shadow-2xl object-contain animate-scale-in" />
        </div>,
        document.body
      )}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm px-1 py-0.5">
        <button onClick={() => setZoom(prev => Math.max(0.3, prev - 0.15))} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-lg font-bold">-</button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 w-10 text-center font-medium">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(prev => Math.min(2, prev + 0.15))} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-lg font-bold">+</button>
        <button onClick={() => setZoom(1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 text-[10px] font-medium ml-0.5">1:1</button>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-0.5" />
        <button onClick={() => setIsFullscreen(!isFullscreen)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300" title={isFullscreen ? 'Salir (Esc)' : 'Pantalla completa'}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`overflow-auto pb-4 cursor-grab ${isFullscreen ? 'flex-1' : 'max-h-[70vh]'}`}
      >
        <div
          className="flex flex-col items-center min-w-max py-6 px-4 transition-transform duration-100"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {tree.map((root, idx) => (
            <div key={root.employee.id} className={idx > 0 ? 'mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 w-full flex flex-col items-center' : ''}>
              <OrgPhotoCard node={root} onPhotoClick={setZoomedPhoto} />
            </div>
          ))}
        </div>
      </div>
      <p className={`text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1 ${isFullscreen ? 'pb-2' : ''}`}>
        Ctrl + rueda del mouse para zoom {isFullscreen && '| Esc para salir'}
      </p>
    </div>
  );
}

function OrgPhotoCard({ node, onPhotoClick }: { node: OrgTreeNode; onPhotoClick: (url: string) => void }) {
  const emp = node.employee;
  const hasChildren = node.children.length > 0;
  const allChildrenAreLeaves = hasChildren && node.children.every(c => c.children.length === 0);

  return (
    <div className="flex flex-col items-center">
      <div className={`flex flex-col items-center p-3 rounded-2xl border transition-all hover:shadow-xl group ${
        emp.is_area_executive
          ? 'bg-gradient-to-b from-teal-50 to-white dark:from-teal-900/30 dark:to-slate-800 border-teal-300 dark:border-teal-600'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}>
        <div className="overflow-visible">
          {emp.photo_url ? (
            <img
              src={emp.photo_url}
              alt={emp.full_name}
              onClick={(e) => { e.stopPropagation(); onPhotoClick(emp.photo_url!); }}
              className={`w-32 h-32 rounded-xl object-cover shadow-lg border-4 cursor-pointer transition-transform duration-200 hover:scale-150 ${
                emp.is_area_executive ? 'border-teal-200 dark:border-teal-700' : 'border-slate-100 dark:border-slate-600'
              }`}
            />
          ) : (
            <div className={`w-32 h-32 rounded-xl flex items-center justify-center text-3xl font-bold shadow-lg border-4 transition-transform duration-200 hover:scale-150 ${
              emp.is_area_executive
                ? 'bg-teal-600 text-white border-teal-200 dark:border-teal-700'
                : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 border-slate-100 dark:border-slate-700'
            }`}>
              {getInitials(emp.full_name)}
            </div>
          )}
        </div>
        <div className="mt-2 text-center max-w-[140px]">
          <div className="flex items-center justify-center gap-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{emp.full_name}</p>
            {emp.is_area_executive && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
          </div>
          {emp.position && <p className="text-[10px] text-slate-500 dark:text-slate-400 italic truncate mt-0.5">{emp.position}</p>}
        </div>
      </div>

      {hasChildren && allChildrenAreLeaves && (
        <>
          <div className="w-0.5 h-5 bg-sky-400 dark:bg-sky-500" />
          <div className="flex flex-wrap justify-center gap-3 max-w-[600px]">
            {node.children.map(child => {
              const c = child.employee;
              return (
                <div key={c.id} className="flex flex-col items-center">
                  <div className="w-0.5 h-3 bg-sky-400 dark:bg-sky-500" />
                  <div className="flex flex-col items-center p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow overflow-visible">
                    {c.photo_url ? (
                      <img
                        src={c.photo_url}
                        alt={c.full_name}
                        onClick={(e) => { e.stopPropagation(); onPhotoClick(c.photo_url!); }}
                        className="w-20 h-20 rounded-lg object-cover shadow border-2 border-slate-100 dark:border-slate-600 cursor-pointer transition-transform duration-200 hover:scale-150"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-lg font-bold text-slate-500 dark:text-slate-300 border-2 border-slate-100 dark:border-slate-700 transition-transform duration-200 hover:scale-150">
                        {getInitials(c.full_name)}
                      </div>
                    )}
                    <p className="text-[10px] font-medium text-slate-700 dark:text-slate-200 mt-1.5 text-center max-w-[90px] truncate">{c.full_name}</p>
                    {c.position && <p className="text-[9px] text-slate-400 dark:text-slate-500 italic truncate max-w-[90px]">{c.position}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {hasChildren && !allChildrenAreLeaves && (
        <>
          <div className="w-0.5 h-6 bg-sky-400 dark:bg-sky-500" />
          <div className="flex items-start">
            {node.children.map((child, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === node.children.length - 1;
              const isOnly = node.children.length === 1;
              return (
                <div key={child.employee.id} className="flex flex-col items-center">
                  <div className="relative self-stretch h-6">
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-px bg-sky-400 dark:bg-sky-500" />
                    {!isOnly && (
                      <div className={`absolute top-0 h-0.5 bg-sky-400 dark:bg-sky-500 ${
                        isFirst ? 'left-1/2 right-0' : isLast ? 'left-0 right-1/2' : 'left-0 right-0'
                      }`} />
                    )}
                  </div>
                  <OrgPhotoCard node={child} onPhotoClick={onPhotoClick} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function OrgTreeHorizontal({ tree }: { tree: OrgTreeNode[] }) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        setZoom(prev => Math.min(2, Math.max(0.3, prev - e.deltaY * 0.002)));
      }
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const container = containerRef.current;
    if (!container) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    container.scrollLeft = dragStart.current.scrollLeft - dx;
    container.scrollTop = dragStart.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    const container = containerRef.current;
    if (container) {
      container.style.cursor = '';
      container.style.userSelect = '';
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
      const container = containerRef.current;
      if (container) {
        container.style.cursor = '';
        container.style.userSelect = '';
      }
    };
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isFullscreen]);

  return (
    <div className={isFullscreen
      ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col'
      : 'relative'
    }>
      <div className={`${isFullscreen ? 'absolute' : 'absolute'} top-2 right-2 z-10 flex items-center gap-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-sm px-1 py-0.5`}>
        <button
          onClick={() => setZoom(prev => Math.max(0.3, prev - 0.15))}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-lg font-bold"
        >-</button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 w-10 text-center font-medium">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(prev => Math.min(2, prev + 0.15))}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-lg font-bold"
        >+</button>
        <button
          onClick={() => setZoom(1)}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 text-[10px] font-medium ml-0.5"
        >1:1</button>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-0.5" />
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
          title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`overflow-auto pb-4 cursor-grab ${isFullscreen ? 'flex-1' : 'max-h-[70vh]'}`}
      >
        <div
          className="flex flex-col items-center min-w-max py-6 px-4 transition-transform duration-100"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {tree.map((root, idx) => (
            <div key={root.employee.id} className={idx > 0 ? 'mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 w-full flex flex-col items-center' : ''}>
              <OrgTreeCardFull node={root} />
            </div>
          ))}
        </div>
      </div>
      <p className={`text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1 ${isFullscreen ? 'pb-2' : ''}`}>
        Ctrl + rueda del mouse para zoom {isFullscreen && '| Esc para salir'}
      </p>
    </div>
  );
}

function OrgTreeCardFull({ node }: { node: OrgTreeNode }) {
  const emp = node.employee;
  const hasChildren = node.children.length > 0;
  const allChildrenAreLeaves = hasChildren && node.children.every(c => c.children.length === 0);

  return (
    <div className="flex flex-col items-center">
      <div className={`flex flex-col items-center px-4 py-3 rounded-xl border transition-shadow hover:shadow-lg ${
        emp.is_area_executive
          ? 'bg-gradient-to-b from-teal-50 to-white dark:from-teal-900/30 dark:to-slate-800 border-teal-300 dark:border-teal-600'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}>
        {emp.photo_url ? (
          <img src={emp.photo_url} alt={emp.full_name} className={`w-20 h-20 rounded-full object-cover shadow-md border-4 ${
            emp.is_area_executive ? 'border-teal-200 dark:border-teal-700' : 'border-slate-100 dark:border-slate-600'
          }`} />
        ) : (
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold shadow-md border-4 ${
            emp.is_area_executive
              ? 'bg-teal-600 text-white border-teal-200 dark:border-teal-700'
              : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 border-slate-100 dark:border-slate-700'
          }`}>
            {getInitials(emp.full_name)}
          </div>
        )}
        <div className="mt-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{emp.full_name}</p>
            {emp.is_area_executive && <Crown className="w-3.5 h-3.5 text-amber-500" />}
          </div>
          {emp.position && <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">{emp.position}</p>}
        </div>
      </div>

      {hasChildren && allChildrenAreLeaves && (
        <>
          <div className="w-0.5 h-5 bg-sky-400 dark:bg-sky-500" />
          <div className="relative flex flex-col border-l-2 border-sky-400 dark:border-sky-500">
            {node.children.map((child, i) => {
              const c = child.employee;
              const isLast = i === node.children.length - 1;
              return (
                <div key={c.id} className="relative flex items-center gap-3 pl-5 py-1.5">
                  <div className="absolute left-0 top-1/2 -translate-y-px w-5 h-0.5 bg-sky-400 dark:bg-sky-500" />
                  {isLast && (
                    <div className="absolute left-[-2px] top-1/2 bottom-0 w-0.5 bg-white dark:bg-slate-800" />
                  )}
                  {c.photo_url ? (
                    <img src={c.photo_url} alt={c.full_name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-200 flex-shrink-0">
                      {getInitials(c.full_name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{c.full_name}</p>
                    {c.position && <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate">{c.position}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {hasChildren && !allChildrenAreLeaves && (
        <>
          <div className="w-0.5 h-6 bg-sky-400 dark:bg-sky-500" />
          <div className="flex items-start">
            {node.children.map((child, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === node.children.length - 1;
              const isOnly = node.children.length === 1;
              return (
                <div key={child.employee.id} className="flex flex-col items-center">
                  <div className="relative self-stretch h-6">
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-px bg-sky-400 dark:bg-sky-500" />
                    {!isOnly && (
                      <div className={`absolute top-0 h-0.5 bg-sky-400 dark:bg-sky-500 ${
                        isFirst ? 'left-1/2 right-0' : isLast ? 'left-0 right-1/2' : 'left-0 right-0'
                      }`} />
                    )}
                  </div>
                  <OrgTreeCardFull node={child} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function OrgChartView() {
  const [employees, setEmployees] = useState<VacEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'tree' | 'photos'>('tree');

  useEffect(() => {
    setLoading(true);
    vacacionarioApi.getDirectory({ active: true })
      .then(setEmployees)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const tree = buildOrgTree(employees);
  const totalEmployees = employees.length;
  const executives = employees.filter(e => e.is_area_executive).length;
  const withManager = employees.filter(e => e.manager_employee_number).length;

  if (loading) return <div className="flex justify-center py-16"><HamsterLoader /></div>;
  if (error) return <div className="text-center py-16 text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="w-4 h-4 text-teal-600" />
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalEmployees}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Total Colaboradores</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{executives}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Ejecutivos</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Network className="w-4 h-4 text-blue-600" />
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{withManager}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Con Supervisor</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Network className="w-4 h-4 text-teal-600" />
            Organigrama
          </h3>
          <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'tree'
                  ? 'bg-white dark:bg-slate-600 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Arbol
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-600 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('photos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'photos'
                  ? 'bg-white dark:bg-slate-600 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Fotos
            </button>
          </div>
        </div>
        {tree.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay colaboradores con jerarquia definida</p>
            <p className="text-xs mt-1">Edita cada colaborador para asignar su supervisor o marcarlo como ejecutivo del area</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-1">
            {tree.map(root => (
              <OrgNode key={root.employee.id} node={root} level={0} />
            ))}
          </div>
        ) : viewMode === 'photos' ? (
          <OrgTreePhotos tree={tree} />
        ) : (
          <OrgTreeHorizontal tree={tree} />
        )}
      </div>
    </div>
  );
}