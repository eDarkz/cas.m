import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Archive, Clock, AlertTriangle, ChevronRight, MoreVertical, Trash2, Copy, PlayCircle, ArchiveRestore, FileCode2, X, ClipboardCopy } from 'lucide-react';
import { flsApi, type FlsTemplate, type FlsCategory } from '../lib/flsApi';
import FlsNavigation from '../components/FlsNavigation';

const CATEGORIES: { value: FlsCategory | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'FIRE', label: 'Fuego' },
  { value: 'LIFE_SAFETY', label: 'Seguridad de Vida' },
  { value: 'ELECTRICAL', label: 'Eléctrico' },
  { value: 'STRUCTURAL', label: 'Estructural' },
  { value: 'GENERAL', label: 'General' },
];

const RECURRENCE_LABELS: Record<string, string> = {
  ON_DEMAND: 'Bajo Demanda',
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
  CUSTOM_DAYS: 'Personalizado',
};

export default function FlsChecklists() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FlsCategory | ''>('');
  const [showInactive, setShowInactive] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlsTemplate | null>(null);
  const [showJsonContract, setShowJsonContract] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['fls-templates', category, showInactive, search],
    queryFn: () => flsApi.listTemplates({
      active: showInactive ? undefined : true,
      category: category || undefined,
      q: search || undefined,
    }),
    staleTime: 60_000,
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => flsApi.archiveTemplate(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fls-templates'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => flsApi.archiveTemplate(id, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-templates'] });
      setDeleteTarget(null);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: async (template: FlsTemplate) => {
      const detail = await flsApi.getTemplate(template.id);
      const clonePayload = {
        code: `${detail.code}-COPIA`,
        title: `${detail.title} (copia)`,
        description: detail.description,
        category: detail.category,
        location_scope: detail.location_scope,
        asset_type: detail.asset_type,
        recurrence: detail.recurrence,
        estimated_minutes: detail.estimated_minutes,
        scoring: detail.scoring,
        requires_signature: detail.requires_signature,
        active: false,
        created_by: detail.created_by,
        metadata: detail.metadata,
        questions: detail.questions?.map(({ id: _id, checklist_id: _cid, ...q }) => q),
      };
      return flsApi.createTemplate(clonePayload);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['fls-templates'] });
      navigate(`/fls/checklists/${created.id}/edit`);
    },
  });

  const now = new Date();

  function getDueStatus(t: FlsTemplate): 'overdue' | 'due_soon' | 'ok' | null {
    if (!t.next_due_at) return null;
    const due = new Date(t.next_due_at);
    if (due < now) return 'overdue';
    const diff = due.getTime() - now.getTime();
    if (diff < 7 * 24 * 60 * 60 * 1000) return 'due_soon';
    return 'ok';
  }

  return (
    <div>
      <FlsNavigation />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Catálogo de Checklists</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJsonContract(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Ver contrato JSON para IA"
          >
            <FileCode2 className="w-4 h-4" />
            Contrato JSON
          </button>
          <Link
            to="/fls/checklists/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Checklist
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar checklists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as FlsCategory | '')}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600 text-red-600 focus:ring-red-500"
          />
          Mostrar inactivos
        </label>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          No se encontraron checklists.
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => {
            const dueStatus = getDueStatus(t);
            return (
              <div
                key={t.id}
                className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-red-300 dark:hover:border-red-700 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link to={`/fls/checklists/${t.id}/edit`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{t.code}</span>
                      {!t.active && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                          <Archive className="w-3 h-3" />
                          Inactivo
                        </span>
                      )}
                      {dueStatus === 'overdue' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                          <AlertTriangle className="w-3 h-3" />
                          Vencido
                        </span>
                      )}
                      {dueStatus === 'due_soon' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          <Clock className="w-3 h-3" />
                          Por vencer
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {t.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">{t.category}</span>
                      {t.location_scope && <span>{t.location_scope}</span>}
                      {t.asset_type && <span>{t.asset_type}</span>}
                      <span>{RECURRENCE_LABELS[t.recurrence?.type] || t.recurrence?.type}</span>
                      {t.questions_count != null && <span>{t.questions_count} preguntas</span>}
                      {t.last_inspector_name && <span>Último: {t.last_inspector_name}</span>}
                    </div>
                  </Link>

                  {/* Actions Menu */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => { e.preventDefault(); setMenuOpen(menuOpen === t.id ? null : t.id); }}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>

                    {menuOpen === t.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-10 z-20 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                          <button
                            onClick={() => { setMenuOpen(null); navigate(`/fls/checklists/${t.id}/edit`); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => { setMenuOpen(null); navigate(`/fls/runs/new?checklist_id=${t.id}`); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Iniciar Ejecución
                          </button>
                          <button
                            onClick={() => { setMenuOpen(null); cloneMutation.mutate(t); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Clonar
                          </button>
                          <button
                            onClick={() => { setMenuOpen(null); archiveMutation.mutate({ id: t.id, active: !t.active }); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                          >
                            {t.active ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                            {t.active ? 'Desactivar' : 'Reactivar'}
                          </button>
                          {t.active && (
                            <>
                              <hr className="border-slate-200 dark:border-slate-700" />
                              <button
                                onClick={() => { setMenuOpen(null); setDeleteTarget(t); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showJsonContract && <JsonContractModal onClose={() => setShowJsonContract(false)} />}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Desactivar Checklist</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Se desactivara el siguiente checklist:
            </p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4">
              {deleteTarget.code} - {deleteTarget.title}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
              No se pierde historial. Puedes reactivarlo desde la lista marcando "Mostrar inactivos".
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Desactivando...' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const JSON_CONTRACT = `{
  "title": "Nombre del checklist (obligatorio, 2-255 caracteres)",
  "code": "CODIGO-UNICO (opcional, se genera automaticamente)",
  "description": "Descripcion breve del proposito (opcional)",
  "category": "FIRE | LIFE_SAFETY | ELECTRICAL | STRUCTURAL | GENERAL",
  "location_scope": "Areas aplicables, ej: Lobby, BOH, Alberca (opcional)",
  "asset_type": "Tipo de activo, ej: Extintor, Panel Electrico (opcional)",
  "estimated_minutes": 30,
  "recurrence": {
    "type": "ON_DEMAND | DAILY | WEEKLY | MONTHLY | QUARTERLY | SEMIANNUAL | ANNUAL | CUSTOM_DAYS",
    "interval_days": null,
    "grace_days": 3,
    "start_date": "2024-01-01",
    "due_time": "09:00"
  },
  "scoring": {
    "method": "PERCENT | POINTS | CRITICAL_FAIL",
    "passing_score": 80
  },
  "requires_signature": false,
  "metadata": {},
  "questions": [
    {
      "section": "Nombre de la seccion (agrupa preguntas visualmente)",
      "text": "Texto de la pregunta (obligatorio, max 1000 caracteres)",
      "help_text": "Instruccion o aclaracion para el inspector (opcional)",
      "response_type": "PASS_FAIL_NA | YES_NO_NA | OK_FAIL | NUMBER | TEXT | SELECT | MULTI_SELECT | RATING | DATE | TIME",
      "required": true,
      "weight": 1,
      "criticality": "LOW | MEDIUM | HIGH | CRITICAL",
      "expected_answer": null,
      "min_value": null,
      "max_value": null,
      "options": [
        { "value": "opcion1", "label": "Etiqueta visible 1" }
      ],
      "require_photo": "NEVER | ALWAYS | ON_FAIL | ON_PASS | ON_NA",
      "order": 1
    }
  ]
}`;

const AI_PROMPT_TEMPLATE = `Genera un checklist de seguridad en formato JSON compatible con el sistema FLS.

REGLAS:
- Sigue EXACTAMENTE la estructura del contrato JSON de abajo.
- "questions" debe ser un array con al menos 1 pregunta.
- Cada pregunta DEBE tener: section, text, response_type, required, weight, criticality, require_photo, order.
- Los valores de "order" deben ser consecutivos empezando desde 1.
- "response_type" mas comun es "PASS_FAIL_NA" para inspecciones visuales.
- "weight" va de 0 a 100 (default 1). Usa mayor peso en preguntas criticas.
- "criticality" para extintores vencidos o salidas bloqueadas debe ser "CRITICAL".
- "require_photo" usa "ON_FAIL" para evidencia fotografica solo cuando hay falla.
- "options" solo se usa cuando response_type es SELECT o MULTI_SELECT, de lo contrario pon null o [].
- "scoring.method": usa "PERCENT" para porcentaje simple, "CRITICAL_FAIL" si una falla critica reprueba todo.
- Regresa UNICAMENTE el JSON sin texto adicional.

CONTRATO JSON:
\`\`\`json
${JSON_CONTRACT}
\`\`\`

Genera el checklist para: [DESCRIBE AQUI EL TEMA DEL CHECKLIST]`;

function JsonContractModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState<'contract' | 'prompt' | null>(null);
  const [tab, setTab] = useState<'contract' | 'prompt'>('contract');

  function handleCopy(text: string, type: 'contract' | 'prompt') {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Contrato JSON para IA</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Usa este esquema al pedirle a una IA que genere checklists compatibles
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-700 px-5">
          <button
            onClick={() => setTab('contract')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'contract'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Estructura JSON
          </button>
          <button
            onClick={() => setTab('prompt')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'prompt'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Prompt para IA
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'contract' ? (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                Este es el formato exacto que debe seguir el JSON para ser importado correctamente en el editor de checklists.
              </p>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono">
                {JSON_CONTRACT}
              </pre>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                Copia este prompt y pegalo en ChatGPT, Claude u otra IA. Solo modifica la ultima linea
                describiendo el checklist que necesitas.
              </p>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono">
                {AI_PROMPT_TEMPLATE}
              </pre>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => handleCopy(tab === 'contract' ? JSON_CONTRACT : AI_PROMPT_TEMPLATE, tab)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 dark:bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-900 dark:hover:bg-slate-500 transition-colors"
          >
            <ClipboardCopy className="w-4 h-4" />
            {copied === tab ? 'Copiado!' : tab === 'contract' ? 'Copiar JSON' : 'Copiar Prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}
