import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { flsApi, type FlsTemplate, type FlsQuestion, type FlsCategory, type RecurrenceType, type ScoringMethod, type ResponseType, type Criticality, type RequirePhoto } from '../lib/flsApi';
import FlsNavigation from '../components/FlsNavigation';

const CATEGORIES: FlsCategory[] = ['FIRE', 'LIFE_SAFETY', 'ELECTRICAL', 'STRUCTURAL', 'GENERAL'];
const RECURRENCE_TYPES: { value: RecurrenceType; label: string }[] = [
  { value: 'ON_DEMAND', label: 'Bajo Demanda' },
  { value: 'DAILY', label: 'Diario' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'SEMIANNUAL', label: 'Semestral' },
  { value: 'ANNUAL', label: 'Anual' },
  { value: 'CUSTOM_DAYS', label: 'Personalizado (días)' },
];
const SCORING_METHODS: { value: ScoringMethod; label: string }[] = [
  { value: 'PERCENT', label: 'Porcentaje' },
  { value: 'POINTS', label: 'Puntos' },
  { value: 'CRITICAL_FAIL', label: 'Falla Crítica' },
];
const RESPONSE_TYPES: { value: ResponseType; label: string }[] = [
  { value: 'PASS_FAIL_NA', label: 'Cumple / No cumple / N/A' },
  { value: 'YES_NO_NA', label: 'Sí / No / N/A' },
  { value: 'OK_FAIL', label: 'OK / Falla' },
  { value: 'NUMBER', label: 'Numérico' },
  { value: 'TEXT', label: 'Texto' },
  { value: 'SELECT', label: 'Selección única' },
  { value: 'MULTI_SELECT', label: 'Selección múltiple' },
  { value: 'RATING', label: 'Calificación' },
  { value: 'DATE', label: 'Fecha' },
  { value: 'TIME', label: 'Hora' },
];
const CRITICALITIES: Criticality[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PHOTO_REQS: { value: RequirePhoto; label: string }[] = [
  { value: 'NEVER', label: 'Nunca' },
  { value: 'ALWAYS', label: 'Siempre' },
  { value: 'ON_FAIL', label: 'Al fallar' },
  { value: 'ON_PASS', label: 'Al cumplir' },
  { value: 'ON_NA', label: 'Cuando N/A' },
];

function emptyQuestion(order: number): FlsQuestion {
  return {
    section: '',
    text: '',
    help_text: '',
    response_type: 'PASS_FAIL_NA',
    required: true,
    weight: 1,
    criticality: 'MEDIUM',
    require_photo: 'ON_FAIL',
    order,
    options: null,
    min_value: null,
    max_value: null,
  };
}

export default function FlsChecklistEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: existing } = useQuery({
    queryKey: ['fls-template', id],
    queryFn: () => flsApi.getTemplate(id!),
    enabled: isEdit,
  });

  const [form, setForm] = useState<Partial<FlsTemplate>>({
    code: '',
    title: '',
    description: '',
    category: 'GENERAL',
    location_scope: '',
    asset_type: '',
    recurrence: { type: 'MONTHLY', interval_days: null, grace_days: 3, start_date: '', due_time: '' },
    estimated_minutes: 30,
    scoring: { method: 'PERCENT', passing_score: 80 },
    requires_signature: false,
    active: true,
    created_by: 1,
  });

  const [questions, setQuestions] = useState<FlsQuestion[]>([emptyQuestion(1)]);
  const [expandedQ, setExpandedQ] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [importJson, setImportJson] = useState(false);
  const [jsonText, setJsonText] = useState('');

  useEffect(() => {
    if (existing) {
      setForm({
        code: existing.code,
        title: existing.title,
        description: existing.description,
        category: existing.category,
        location_scope: existing.location_scope,
        asset_type: existing.asset_type,
        recurrence: existing.recurrence,
        estimated_minutes: existing.estimated_minutes,
        scoring: existing.scoring,
        requires_signature: existing.requires_signature,
        active: existing.active,
        created_by: existing.created_by,
      });
      if (existing.questions && existing.questions.length > 0) {
        setQuestions(existing.questions);
      }
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: (payload: Partial<FlsTemplate> & { questions?: FlsQuestion[] }) => flsApi.createTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-templates'] });
      navigate('/fls/checklists');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<FlsTemplate>) => flsApi.updateTemplate(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-templates'] });
      queryClient.invalidateQueries({ queryKey: ['fls-template', id] });
    },
  });

  const replaceQuestionsMutation = useMutation({
    mutationFn: (qs: FlsQuestion[]) => flsApi.replaceQuestions(id!, qs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-template', id] });
    },
  });

  async function handleSave() {
    if (!form.title?.trim()) return;
    if (questions.length === 0 || !questions[0].text?.trim()) return;

    setSaving(true);
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(form);
        await replaceQuestionsMutation.mutateAsync(questions);
        navigate('/fls/checklists');
      } else {
        await createMutation.mutateAsync({ ...form, questions });
      }
    } finally {
      setSaving(false);
    }
  }

  function handleImportJson() {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        setQuestions(parsed.questions.map((q: FlsQuestion, i: number) => ({ ...q, order: i + 1 })));
      }
      if (parsed.title) {
        setForm((prev) => ({
          ...prev,
          title: parsed.title,
          code: parsed.code || prev.code,
          description: parsed.description || prev.description,
          category: parsed.category || prev.category,
          location_scope: parsed.location_scope || prev.location_scope,
          asset_type: parsed.asset_type || prev.asset_type,
          recurrence: parsed.recurrence || prev.recurrence,
          estimated_minutes: parsed.estimated_minutes || prev.estimated_minutes,
          scoring: parsed.scoring || prev.scoring,
          requires_signature: parsed.requires_signature ?? prev.requires_signature,
          metadata: parsed.metadata || prev.metadata,
        }));
      }
      setImportJson(false);
      setJsonText('');
    } catch {
      alert('JSON inválido. Verifica el formato.');
    }
  }

  function addQuestion() {
    const newQ = emptyQuestion(questions.length + 1);
    setQuestions([...questions, newQ]);
    setExpandedQ(questions.length);
  }

  function removeQuestion(idx: number) {
    const updated = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i + 1 }));
    setQuestions(updated);
    if (expandedQ >= updated.length) setExpandedQ(Math.max(0, updated.length - 1));
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const copy = [...questions];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setQuestions(copy.map((q, i) => ({ ...q, order: i + 1 })));
    setExpandedQ(newIdx);
  }

  function updateQuestion(idx: number, patch: Partial<FlsQuestion>) {
    setQuestions(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  return (
    <div>
      <FlsNavigation />

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/fls/checklists')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {isEdit ? 'Editar Checklist' : 'Nuevo Checklist'}
        </h2>
        <div className="flex-1" />
        <button
          onClick={() => setImportJson(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Importar JSON
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.title?.trim()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {/* Import JSON Modal */}
      {importJson && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setImportJson(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Importar Checklist desde JSON</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Sube un archivo .json o pega el contenido generado por IA con el checklist completo.
            </p>

            {/* File upload zone */}
            <div className="mb-4">
              <label
                className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors"
              >
                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Subir archivo .json</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Clic o arrastra aquí</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const content = ev.target?.result as string;
                      setJsonText(content);
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">o pega el contenido</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{"title": "...", "questions": [...]}'
              className="w-full h-52 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono text-slate-800 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />

            {jsonText && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {jsonText.length.toLocaleString()} caracteres cargados
              </p>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setImportJson(false); setJsonText(''); }} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                Cancelar
              </button>
              <button onClick={handleImportJson} disabled={!jsonText.trim()} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                Importar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Template Settings */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wide">Configuración</h3>

            <Field label="Código (opcional)">
              <input type="text" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="FLS-EXT-001" className="input-fls" />
            </Field>
            <Field label="Título *">
              <input type="text" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Revisión de extintores" className="input-fls" />
            </Field>
            <Field label="Descripción">
              <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input-fls resize-none" />
            </Field>
            <Field label="Categoría">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as FlsCategory })} className="input-fls">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Ubicación / Alcance">
              <input type="text" value={form.location_scope || ''} onChange={(e) => setForm({ ...form, location_scope: e.target.value })} placeholder="Lobby, BOH..." className="input-fls" />
            </Field>
            <Field label="Tipo de Activo">
              <input type="text" value={form.asset_type || ''} onChange={(e) => setForm({ ...form, asset_type: e.target.value })} placeholder="Extintor, Panel..." className="input-fls" />
            </Field>

            <hr className="border-slate-200 dark:border-slate-700" />

            <h4 className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">Recurrencia</h4>
            <Field label="Tipo">
              <select value={form.recurrence?.type} onChange={(e) => setForm({ ...form, recurrence: { ...form.recurrence!, type: e.target.value as RecurrenceType } })} className="input-fls">
                {RECURRENCE_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            {form.recurrence?.type === 'CUSTOM_DAYS' && (
              <Field label="Intervalo (días)">
                <input type="number" value={form.recurrence?.interval_days || ''} onChange={(e) => setForm({ ...form, recurrence: { ...form.recurrence!, interval_days: Number(e.target.value) } })} className="input-fls" />
              </Field>
            )}
            <Field label="Días de tolerancia">
              <input type="number" value={form.recurrence?.grace_days || 0} onChange={(e) => setForm({ ...form, recurrence: { ...form.recurrence!, grace_days: Number(e.target.value) } })} className="input-fls" />
            </Field>
            <Field label="Fecha inicio">
              <input type="date" value={form.recurrence?.start_date || ''} onChange={(e) => setForm({ ...form, recurrence: { ...form.recurrence!, start_date: e.target.value } })} className="input-fls" />
            </Field>

            <hr className="border-slate-200 dark:border-slate-700" />

            <h4 className="font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wide">Evaluación</h4>
            <Field label="Método">
              <select value={form.scoring?.method} onChange={(e) => setForm({ ...form, scoring: { ...form.scoring!, method: e.target.value as ScoringMethod } })} className="input-fls">
                {SCORING_METHODS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Calificación mínima">
              <input type="number" value={form.scoring?.passing_score || 0} onChange={(e) => setForm({ ...form, scoring: { ...form.scoring!, passing_score: Number(e.target.value) } })} className="input-fls" />
            </Field>
            <Field label="Tiempo estimado (min)">
              <input type="number" value={form.estimated_minutes || ''} onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })} className="input-fls" />
            </Field>

            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.requires_signature || false} onChange={(e) => setForm({ ...form, requires_signature: e.target.checked })} className="rounded border-slate-300 text-red-600 focus:ring-red-500" />
              Requiere firma
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded border-slate-300 text-red-600 focus:ring-red-500" />
              Activo
            </label>
          </div>
        </div>

        {/* Right: Questions Builder */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Preguntas ({questions.length})</h3>
              <button onClick={addQuestion} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>

            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  {/* Question Header */}
                  <div
                    className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 cursor-pointer"
                    onClick={() => setExpandedQ(expandedQ === idx ? -1 : idx)}
                  >
                    <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-slate-400 w-6">{q.order}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate flex-1">
                      {q.text || '(sin texto)'}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      q.criticality === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      q.criticality === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                    }`}>
                      {q.criticality}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); moveQuestion(idx, -1); }} disabled={idx === 0} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveQuestion(idx, 1); }} disabled={idx === questions.length - 1} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); removeQuestion(idx); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Details */}
                  {expandedQ === idx && (
                    <div className="px-4 py-4 space-y-3 border-t border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Sección">
                          <input type="text" value={q.section} onChange={(e) => updateQuestion(idx, { section: e.target.value })} placeholder="Identificación, Condición..." className="input-fls" />
                        </Field>
                        <Field label="Tipo de Respuesta">
                          <select value={q.response_type} onChange={(e) => updateQuestion(idx, { response_type: e.target.value as ResponseType })} className="input-fls">
                            {RESPONSE_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </Field>
                      </div>
                      <Field label="Pregunta *">
                        <input type="text" value={q.text} onChange={(e) => updateQuestion(idx, { text: e.target.value })} placeholder="El extintor se encuentra en su ubicación..." className="input-fls" />
                      </Field>
                      <Field label="Texto de ayuda">
                        <input type="text" value={q.help_text || ''} onChange={(e) => updateQuestion(idx, { help_text: e.target.value })} placeholder="Instrucciones o aclaraciones" className="input-fls" />
                      </Field>

                      {(q.response_type === 'NUMBER') && (
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Valor mínimo">
                            <input type="number" value={q.min_value ?? ''} onChange={(e) => updateQuestion(idx, { min_value: e.target.value ? Number(e.target.value) : null })} className="input-fls" />
                          </Field>
                          <Field label="Valor máximo">
                            <input type="number" value={q.max_value ?? ''} onChange={(e) => updateQuestion(idx, { max_value: e.target.value ? Number(e.target.value) : null })} className="input-fls" />
                          </Field>
                        </div>
                      )}

                      {(q.response_type === 'SELECT' || q.response_type === 'MULTI_SELECT') && (
                        <Field label="Opciones (una por línea: valor|etiqueta)">
                          <textarea
                            value={(q.options || []).map((o) => `${o.value}|${o.label}`).join('\n')}
                            onChange={(e) => {
                              const opts = e.target.value.split('\n').filter(Boolean).map((line) => {
                                const [value, label] = line.split('|');
                                return { value: value?.trim() || '', label: label?.trim() || value?.trim() || '' };
                              });
                              updateQuestion(idx, { options: opts });
                            }}
                            rows={3}
                            placeholder="BUENO|Bueno&#10;REGULAR|Regular&#10;MALO|Malo"
                            className="input-fls resize-none font-mono text-xs"
                          />
                        </Field>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Field label="Criticidad">
                          <select value={q.criticality} onChange={(e) => updateQuestion(idx, { criticality: e.target.value as Criticality })} className="input-fls">
                            {CRITICALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </Field>
                        <Field label="Peso">
                          <input type="number" min={0} value={q.weight} onChange={(e) => updateQuestion(idx, { weight: Number(e.target.value) })} className="input-fls" />
                        </Field>
                        <Field label="Foto requerida">
                          <select value={q.require_photo} onChange={(e) => updateQuestion(idx, { require_photo: e.target.value as RequirePhoto })} className="input-fls">
                            {PHOTO_REQS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        </Field>
                        <Field label="Obligatoria">
                          <select value={q.required ? 'true' : 'false'} onChange={(e) => updateQuestion(idx, { required: e.target.value === 'true' })} className="input-fls">
                            <option value="true">Sí</option>
                            <option value="false">No</option>
                          </select>
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
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