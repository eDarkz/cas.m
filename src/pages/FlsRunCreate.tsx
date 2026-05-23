import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlayCircle, ArrowLeft } from 'lucide-react';
import { flsApi, type FlsTemplate } from '../lib/flsApi';
import { api } from '../lib/api';
import FlsNavigation from '../components/FlsNavigation';

export default function FlsRunCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('checklist_id') || '';

  const [checklistId, setChecklistId] = useState(preselectedId);
  const [inspectorId, setInspectorId] = useState<number>(0);
  const [inspectorName, setInspectorName] = useState('');
  const [targetArea, setTargetArea] = useState('');
  const [targetAssetCode, setTargetAssetCode] = useState('');
  const [notes, setNotes] = useState('');
  const [startNow, setStartNow] = useState(true);
  const [scheduledFor, setScheduledFor] = useState('');

  const { data: templates } = useQuery({
    queryKey: ['fls-templates-active'],
    queryFn: () => flsApi.listTemplates({ active: true }),
    staleTime: 120_000,
  });

  const { data: supervisors } = useQuery({
    queryKey: ['supervisors'],
    queryFn: () => api.getSupervisors(),
    staleTime: 300_000,
  });

  const createMutation = useMutation({
    mutationFn: () => flsApi.createRun({
      checklist_id: checklistId,
      scheduled_for: startNow ? undefined : scheduledFor,
      start_now: startNow,
      inspector_id: inspectorId,
      inspector_name: inspectorName,
      target_area: targetArea || undefined,
      target_asset_code: targetAssetCode || undefined,
      notes: notes || undefined,
      created_by: inspectorId || 1,
    }),
    onSuccess: (run) => {
      if (startNow) {
        navigate(`/fls/runs/${run.id}/execute`);
      } else {
        navigate('/fls/history');
      }
    },
  });

  function handleInspectorChange(id: number) {
    setInspectorId(id);
    const sup = supervisors?.find((s) => s.id === id);
    if (sup) setInspectorName(sup.nombre);
  }

  const selectedTemplate = templates?.find((t: FlsTemplate) => t.id === checklistId);

  return (
    <div>
      <FlsNavigation />

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/fls')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Nueva Ejecución</h2>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5">

          <Field label="Checklist *">
            <select value={checklistId} onChange={(e) => setChecklistId(e.target.value)} className="input-fls">
              <option value="">Seleccionar checklist...</option>
              {templates?.map((t: FlsTemplate) => (
                <option key={t.id} value={t.id}>{t.code} - {t.title}</option>
              ))}
            </select>
          </Field>

          {selectedTemplate && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium">{selectedTemplate.title}</span>
              {selectedTemplate.description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedTemplate.description}</p>}
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                {selectedTemplate.questions_count && <span>{selectedTemplate.questions_count} preguntas</span>}
                {selectedTemplate.estimated_minutes && <span>~{selectedTemplate.estimated_minutes} min</span>}
                <span>{selectedTemplate.category}</span>
              </div>
            </div>
          )}

          <Field label="Inspector *">
            <select value={inspectorId} onChange={(e) => handleInspectorChange(Number(e.target.value))} className="input-fls">
              <option value={0}>Seleccionar inspector...</option>
              {supervisors?.filter((s) => s.is_active).map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Área / Ubicación">
              <input type="text" value={targetArea} onChange={(e) => setTargetArea(e.target.value)} placeholder="Lobby, Piscina..." className="input-fls" />
            </Field>
            <Field label="Código de Equipo">
              <input type="text" value={targetAssetCode} onChange={(e) => setTargetAssetCode(e.target.value)} placeholder="EXT-LBY-001" className="input-fls" />
            </Field>
          </div>

          <Field label="Notas">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notas adicionales..." className="input-fls resize-none" />
          </Field>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="radio" checked={startNow} onChange={() => setStartNow(true)} className="text-red-600 focus:ring-red-500" />
              Iniciar ahora
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="radio" checked={!startNow} onChange={() => setStartNow(false)} className="text-red-600 focus:ring-red-500" />
              Programar
            </label>
          </div>

          {!startNow && (
            <Field label="Fecha programada">
              <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="input-fls" />
            </Field>
          )}

          <button
            onClick={() => createMutation.mutate()}
            disabled={!checklistId || !inspectorId || createMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <PlayCircle className="w-5 h-5" />
            {createMutation.isPending ? 'Creando...' : startNow ? 'Iniciar Ejecución' : 'Programar Ejecución'}
          </button>

          {createMutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">{(createMutation.error as Error).message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
