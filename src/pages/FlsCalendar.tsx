import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, CalendarDays, Plus, Clock,
  CheckCircle2, PlayCircle, Ban, Calendar as CalendarIcon,
  RefreshCw, Settings, Eye,
} from 'lucide-react';
import { flsApi, type FlsCalendarEvent, type FlsSchedule } from '../lib/flsApi';
import FlsNavigation from '../components/FlsNavigation';
import CreateScheduleModal from '../components/CreateScheduleModal';

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  PLANNED: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-l-blue-500', text: 'text-blue-700 dark:text-blue-300' },
  SCHEDULED: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-l-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  IN_PROGRESS: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-l-orange-500', text: 'text-orange-700 dark:text-orange-300' },
  COMPLETED: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-l-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  CANCELLED: { bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-l-slate-400', text: 'text-slate-500 dark:text-slate-400' },
  RESCHEDULED: { bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-l-violet-500', text: 'text-violet-700 dark:text-violet-300' },
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  PLANNED: CalendarIcon,
  SCHEDULED: Clock,
  IN_PROGRESS: PlayCircle,
  COMPLETED: CheckCircle2,
  CANCELLED: Ban,
  RESCHEDULED: RefreshCw,
};

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days: Array<{ date: Date; currentMonth: boolean }> = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, currentMonth: false });
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), currentMonth: true });
  }
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), currentMonth: false });
    }
  }
  return days;
}

function getEventTime(event: FlsCalendarEvent) {
  if (!event.start) return '';
  const time = event.start.includes(' ') ? event.start.split(' ')[1] : event.start.slice(11, 16);
  return time ? time.slice(0, 5) : '';
}

function getEventDate(event: FlsCalendarEvent) {
  if (!event.start) return '';
  const raw = String(event.start);
  const datePart = raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10);
  // Backend returns dates shifted +1 day, compensate
  const [y, m, d] = datePart.split('-').map(Number);
  const corrected = new Date(y, m - 1, d - 1);
  const cy = corrected.getFullYear();
  const cm = String(corrected.getMonth() + 1).padStart(2, '0');
  const cd = String(corrected.getDate()).padStart(2, '0');
  return `${cy}-${cm}-${cd}`;
}

type ViewMode = 'month' | 'week';

function getWeekStart(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekDays(weekStart: Date) {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function FlsCalendar() {
  const queryClient = useQueryClient();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(today));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FlsCalendarEvent | null>(null);
  const [showSchedules, setShowSchedules] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarRange = useMemo(() => {
    if (viewMode === 'month') {
      const from = formatDate(new Date(year, month, -6));
      const to = formatDate(new Date(year, month + 1, 7));
      return { from, to };
    }
    const sunday = new Date(currentWeekStart);
    sunday.setDate(currentWeekStart.getDate() + 6);
    return { from: formatDate(currentWeekStart), to: formatDate(sunday) };
  }, [year, month, viewMode, currentWeekStart]);

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['fls-calendar-runs', calendarRange.from, calendarRange.to],
    queryFn: () => flsApi.listRuns({
      from: calendarRange.from,
      to: calendarRange.to,
      pageSize: 500,
    }),
    staleTime: 30_000,
  });

  const events: FlsCalendarEvent[] = useMemo(() => {
    const runs = runsData?.data || [];
    return runs.map((run) => ({
      id: `run:${run.id}`,
      source: 'RUN' as const,
      run_id: run.id,
      schedule_id: null,
      checklist_id: run.checklist_id,
      checklist_title: run.checklist_title,
      checklist_code: run.checklist_code,
      title: run.checklist_title,
      start: run.scheduled_for || run.started_at || run.completed_at || run.created_at || '',
      end: undefined,
      status: run.status,
      color: null,
      inspector_id: run.inspector_id,
      inspector_name: run.inspector_name,
      target_area: run.target_area,
      target_room_id: run.target_room_id,
      room_number: run.target_room_number,
      target_asset_code: run.target_asset_code,
      score: run.score,
      passed: run.passed,
    }));
  }, [runsData]);

  const { data: schedules = [] } = useQuery({
    queryKey: ['fls-schedules'],
    queryFn: () => flsApi.listSchedules({ active: true, limit: 100 }),
    staleTime: 60_000,
  });

  const generateMutation = useMutation({
    mutationFn: () => flsApi.generateAllScheduleRuns({
      from: formatDate(new Date()),
      to: formatDate(new Date(Date.now() + 30 * 86400000)),
      auto_generate_only: false,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-calendar-runs'] });
      queryClient.invalidateQueries({ queryKey: ['fls-runs'] });
    },
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, FlsCalendarEvent[]>();
    for (const ev of events) {
      const date = getEventDate(ev);
      if (!date) continue;
      const list = map.get(date) || [];
      list.push(ev);
      map.set(date, list);
    }
    return map;
  }, [events]);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);
  const todayStr = formatDate(today);

  const monthLabel = currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const navigate = (dir: number) => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + dir, 1));
    } else {
      const newWeek = new Date(currentWeekStart);
      newWeek.setDate(currentWeekStart.getDate() + dir * 7);
      setCurrentWeekStart(newWeek);
    }
  };

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

  const recurrenceLabel = (s: FlsSchedule) => {
    const labels: Record<string, string> = {
      DAILY: 'Diario', WEEKLY: 'Semanal', MONTHLY: 'Mensual',
      QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral', ANNUAL: 'Anual',
      CUSTOM_DAYS: `Cada ${s.recurrence?.interval_days || '?'} dias`,
      ON_DEMAND: 'Bajo demanda',
    };
    return labels[s.recurrence?.type || 'ON_DEMAND'] || s.recurrence?.type;
  };

  return (
    <div>
      <FlsNavigation />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Calendario FLS</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
            className="px-3 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {viewMode === 'month' ? 'Vista Semanal' : 'Vista Mensual'}
          </button>
          <button
            onClick={() => setShowSchedules(!showSchedules)}
            className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              showSchedules
                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Programaciones
          </button>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="px-3 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            Generar
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-3 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Programar
          </button>
        </div>
      </div>

      {/* Schedules Panel */}
      {showSchedules && (
        <div className="mb-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Programaciones Activas</h3>
          {schedules.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No hay programaciones activas. Crea una nueva para comenzar.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {schedules.map((s) => (
                <div
                  key={s.id}
                  className="border border-slate-200 dark:border-slate-600 rounded-xl p-3 hover:shadow-md transition-shadow"
                  style={{ borderLeftColor: s.color || '#3b82f6', borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {s.title || s.checklist_title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {recurrenceLabel(s)}
                        {s.inspector_name || s.inspector_nombre ? ` - ${s.inspector_name || s.inspector_nombre}` : ''}
                      </p>
                      {s.next_run_at && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Proxima: {new Date(s.next_run_at.replace(' ', 'T')).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500'}`}>
                      {s.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar Nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 capitalize">
          {viewMode === 'month'
            ? monthLabel
            : `${currentWeekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${weekDays[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
          }
        </h3>
        <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { label: 'Planificada', color: 'bg-blue-500' },
          { label: 'Programada', color: 'bg-amber-500' },
          { label: 'En Progreso', color: 'bg-orange-500' },
          { label: 'Completada', color: 'bg-emerald-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="animate-pulse grid grid-cols-7 gap-1">
          {Array.from({ length: viewMode === 'month' ? 35 : 7 }).map((_, i) => (
            <div key={i} className={`${viewMode === 'month' ? 'h-28' : 'h-48'} bg-slate-100 dark:bg-slate-700 rounded-lg`} />
          ))}
        </div>
      ) : viewMode === 'month' ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-2.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {days.map(({ date, currentMonth }, idx) => {
              const dateStr = formatDate(date);
              const dayEvents = eventsByDate.get(dateStr) || [];
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] md:min-h-[120px] border-b border-r border-slate-100 dark:border-slate-700/50 p-1.5 transition-colors ${
                    !currentMonth ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''
                  } ${isToday ? 'bg-red-50/50 dark:bg-red-900/10' : ''} ${isPast && currentMonth ? 'bg-white dark:bg-slate-800' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 ${
                    isToday
                      ? 'text-white bg-red-600 w-6 h-6 rounded-full flex items-center justify-center'
                      : currentMonth
                        ? 'text-slate-700 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const style = STATUS_STYLES[ev.status] || STATUS_STYLES.PLANNED;
                      const Icon = STATUS_ICONS[ev.status] || CalendarIcon;
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`w-full text-left px-1.5 py-0.5 rounded-md text-[10px] leading-tight truncate border-l-2 ${style.bg} ${style.border} ${style.text} hover:opacity-80 transition-opacity`}
                          style={ev.color ? { borderLeftColor: ev.color } : undefined}
                          title={`${ev.title || ev.checklist_title} (${getEventTime(ev)})`}
                        >
                          <span className="inline-flex items-center gap-0.5">
                            <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{ev.title || ev.checklist_title}</span>
                          </span>
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 px-1.5 font-medium">
                        +{dayEvents.length - 3} mas
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Week View */
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
            {weekDays.map((date, idx) => {
              const dateStr = formatDate(date);
              const isToday = dateStr === todayStr;
              return (
                <div key={idx} className={`py-3 text-center border-r last:border-r-0 border-slate-100 dark:border-slate-700/50 ${isToday ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">{WEEKDAYS[idx]}</div>
                  <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-700/50">
            {weekDays.map((date, idx) => {
              const dateStr = formatDate(date);
              const dayEvents = eventsByDate.get(dateStr) || [];
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={idx}
                  className={`min-h-[300px] p-2 space-y-1.5 ${isToday ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}
                >
                  {dayEvents.map((ev) => {
                    const style = STATUS_STYLES[ev.status] || STATUS_STYLES.PLANNED;
                    const Icon = STATUS_ICONS[ev.status] || CalendarIcon;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left p-2 rounded-lg border-l-3 ${style.bg} ${style.border} ${style.text} hover:opacity-80 transition-opacity border-l-[3px]`}
                        style={ev.color ? { borderLeftColor: ev.color } : undefined}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          <span className="text-[10px] font-medium">{getEventTime(ev)}</span>
                        </div>
                        <p className="text-xs font-medium leading-tight truncate">
                          {ev.title || ev.checklist_title}
                        </p>
                        {ev.inspector_name && (
                          <p className="text-[10px] opacity-70 truncate mt-0.5">{ev.inspector_name}</p>
                        )}
                      </button>
                    );
                  })}
                  {dayEvents.length === 0 && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-4">Sin eventos</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Detail Popup */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <CreateScheduleModal onClose={() => setShowScheduleModal(false)} />
      )}
    </div>
  );
}

function EventDetail({ event, onClose }: { event: FlsCalendarEvent; onClose: () => void }) {
  const style = STATUS_STYLES[event.status] || STATUS_STYLES.PLANNED;
  const Icon = STATUS_ICONS[event.status] || CalendarIcon;

  const statusLabels: Record<string, string> = {
    PLANNED: 'Planificada',
    SCHEDULED: 'Programada',
    IN_PROGRESS: 'En Progreso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    RESCHEDULED: 'Reprogramada',
  };

  const linkTo = event.run_id
    ? (event.status === 'IN_PROGRESS' ? `/fls/runs/${event.run_id}/execute` : `/fls/runs/${event.run_id}`)
    : null;

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${style.bg}`}>
            <Icon className={`w-5 h-5 ${style.text}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {event.title || event.checklist_title}
            </h3>
            {event.checklist_code && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{event.checklist_code}</p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <span className="text-xl leading-none">&times;</span>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            {statusLabels[event.status] || event.status}
          </span>
          {event.source === 'SCHEDULE' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
              Automatica
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Fecha/Hora</p>
            <p className="text-slate-700 dark:text-slate-200 font-medium">
              {event.start ? new Date(event.start.replace(' ', 'T')).toLocaleDateString('es-MX', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              }) : '-'}
            </p>
          </div>
          {event.inspector_name && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Inspector</p>
              <p className="text-slate-700 dark:text-slate-200 font-medium">{event.inspector_name}</p>
            </div>
          )}
          {event.target_area && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Area</p>
              <p className="text-slate-700 dark:text-slate-200 font-medium">{event.target_area}</p>
            </div>
          )}
          {event.room_number && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Habitacion</p>
              <p className="text-slate-700 dark:text-slate-200 font-medium">{event.room_number}</p>
            </div>
          )}
          {event.score != null && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Calificacion</p>
              <p className={`font-bold ${event.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                {event.score}%
              </p>
            </div>
          )}
        </div>

        {event.original_start && (
          <p className="text-xs text-violet-600 dark:text-violet-400">
            Fecha original: {event.original_start}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2 justify-end">
        {linkTo && (
          <Link
            to={linkTo}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver Detalle
          </Link>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
