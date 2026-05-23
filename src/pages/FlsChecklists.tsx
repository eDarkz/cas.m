import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Archive, Clock, AlertTriangle, ChevronRight, MoreVertical, Trash2, Copy, PlayCircle, ArchiveRestore } from 'lucide-react';
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
        <Link
          to="/fls/checklists/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Checklist
        </Link>
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
