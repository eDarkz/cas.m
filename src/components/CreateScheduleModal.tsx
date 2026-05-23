import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CalendarDays } from 'lucide-react';
import { flsApi, type RecurrenceType, type FlsTemplate, type Weekday } from '../lib/flsApi';

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'DAILY', label: 'Diario' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'SEMIANNUAL', label: 'Semestral' },
  { value: 'ANNUAL', label: 'Anual' },
  { value: 'CUSTOM_DAYS', label: 'Dias personalizados' },
];

const WEEKDAY_OPTIONS: { value: Weekday; label: string }[] = [
  { value: 'MO', label: 'L' },
  { value: 'TU', label: 'M' },
  { value: 'WE', label: 'X' },
  { value: 'TH', label: 'J' },
  { value: 'FR', label: 'V' },
  { value: 'SA', label: 'S' },
  { value: 'SU', label: 'D' },
];

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
];

interface Props {
  onClose: () => void;
  editSchedule?: {
    id: string;
    checklist_id: string;
    title?: string | null;
    recurrence?: {
      type: RecurrenceType;
      interval_days?: number | null;
      weekly_days?: Weekday[];
      day_of_month?: number | null;
      start_date?: string | null;
      end_date?: string | null;
      due_time?: string | null;
    };
    inspector_name?: string | null;
    target_area?: string | null;
    color?: string | null;
    auto_generate?: boolean;
  };
}

export default function CreateScheduleModal({ onClose, editSchedule }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!editSchedule;

  const [checklistId, setChecklistId] = useState(editSchedule?.checklist_id || '');
  const [title, setTitle] = useState(editSchedule?.title || '');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(editSchedule?.recurrence?.type || 'MONTHLY');
  const [intervalDays, setIntervalDays] = useState(editSchedule?.recurrence?.interval_days || 7);
  const [weeklyDays, setWeeklyDays] = useState<Weekday[]>(editSchedule?.recurrence?.weekly_days || []);
  const [dayOfMonth, setDayOfMonth] = useState(editSchedule?.recurrence?.day_of_month || 1);
  const [startDate, setStartDate] = useState(editSchedule?.recurrence?.start_date || new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(editSchedule?.recurrence?.end_date || '');
  const [dueTime, setDueTime] = useState(editSchedule?.recurrence?.due_time || '09:00');
  const [inspectorName, setInspectorName] = useState(editSchedule?.inspector_name || '');
  const [targetArea, setTargetArea] = useState(editSchedule?.target_area || '');
  const [color, setColor] = useState(editSchedule?.color || COLORS[0]);
  const [autoGenerate, setAutoGenerate] = useState(editSchedule?.auto_generate ?? true);

  const { data: templates = [] } = useQuery({
    queryKey: ['fls-templates-for-schedule'],
    queryFn: () => flsApi.listTemplates({ active: true }),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
        checklist_id: checklistId,
        title: title || undefined,
        schedule_type: 'RECURRING' as const,
        recurrence: {
          type: recurrenceType,
          interval_days: recurrenceType === 'CUSTOM_DAYS' ? intervalDays : undefined,
          weekly_days: recurrenceType === 'WEEKLY' ? weeklyDays : undefined,
          day_of_month: ['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'].includes(recurrenceType) ? dayOfMonth : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          due_time: dueTime || undefined,
        },
        inspector_name: inspectorName || undefined,
        target_area: targetArea || undefined,
        color: color || undefined,
        auto_generate: autoGenerate,
        generate_days_ahead: 30,
        active: true,
      };

      if (isEdit) {
        return flsApi.updateSchedule(editSchedule!.id, payload as any);
      }
      return flsApi.createSchedule(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['fls-schedules'] });
      onClose();
    },
  });

  const toggleWeekday = (day: Weekday) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const canSubmit = checklistId && startDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {isEdit ? 'Editar Programacion' : 'Nueva Programacion'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Checklist Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Checklist *
            </label>
            <select
              value={checklistId}
              onChange={(e) => setChecklistId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            >
              <option value="">Seleccionar checklist...</option>
              {templates.map((t: FlsTemplate) => (
                <option key={t.id} value={t.id}>{t.code} - {t.title}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Titulo (opcional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre para esta programacion..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>

          {/* Recurrence Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Periodicidad *
            </label>
            <select
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            >
              {RECURRENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Custom days interval */}
          {recurrenceType === 'CUSTOM_DAYS' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Cada cuantos dias
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
          )}

          {/* Weekly days picker */}
          {recurrenceType === 'WEEKLY' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Dias de la semana
              </label>
              <div className="flex gap-1.5">
                {WEEKDAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleWeekday(opt.value)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                      weeklyDays.includes(opt.value)
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Day of month */}
          {['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'].includes(recurrenceType) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Dia del mes
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Fecha inicio *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Fecha fin (opcional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
          </div>

          {/* Due Time */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Hora programada
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>

          {/* Inspector & Area */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Inspector
              </label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Nombre..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                Area
              </label>
              <input
                type="text"
                value={targetArea}
                onChange={(e) => setTargetArea(e.target.value)}
                placeholder="Area objetivo..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Auto Generate */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              Generar ejecuciones automaticamente
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-5 rounded-b-2xl flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit || createMutation.isPending}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Programacion'}
          </button>
        </div>

        {/* Error */}
        {createMutation.isError && (
          <div className="px-5 pb-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              Error: {(createMutation.error as Error).message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
