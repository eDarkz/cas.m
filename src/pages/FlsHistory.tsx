import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Filter, ChevronRight, Trash2, Ban, MoreVertical } from 'lucide-react';
import { flsApi, type FlsRun, type RunStatus } from '../lib/flsApi';
import { RunStatusBadge, ScoreBadge } from '../components/FlsBadges';
import FlsNavigation from '../components/FlsNavigation';

const STATUS_OPTIONS: { value: RunStatus | '' | 'ALL'; label: string }[] = [
  { value: '', label: 'Activas' },
  { value: 'ALL', label: 'Todas (incl. canceladas)' },
  { value: 'SCHEDULED', label: 'Programada' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

export default function FlsHistory() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RunStatus | '' | 'ALL'>('');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlsRun | null>(null);
  const [cancelTarget, setCancelTarget] = useState<FlsRun | null>(null);
  const [cancelNotes, setCancelNotes] = useState('');
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['fls-runs', status, from, to, page],
    queryFn: () => flsApi.listRuns({
      status: (status === '' || status === 'ALL') ? undefined : status,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize,
    }),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => flsApi.cancelRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-runs'] });
      setDeleteTarget(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => flsApi.cancelRun(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-runs'] });
      setCancelTarget(null);
      setCancelNotes('');
    },
  });

  const rawRuns = data?.data || [];
  const runs = status === '' ? rawRuns.filter((r) => r.status !== 'CANCELLED') : rawRuns;
  const total = status === '' ? runs.length : (data?.total || 0);
  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  return (
    <div>
      <FlsNavigation />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Historial de Ejecuciones</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">{total} ejecuciones</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={status} onChange={(e) => { setStatus(e.target.value as RunStatus | '' | 'ALL'); setPage(1); }} className="input-fls text-sm">
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="input-fls text-sm" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="input-fls text-sm" />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          No se encontraron ejecuciones.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                <Link
                  to={run.status === 'IN_PROGRESS' ? `/fls/runs/${run.id}/execute` : `/fls/runs/${run.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {run.checklist_title || run.checklist_code || 'Checklist'}
                    </span>
                    <RunStatusBadge status={run.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{run.inspector_name}</span>
                    {run.target_area && <span>{run.target_area}</span>}
                    {run.target_asset_code && <span>{run.target_asset_code}</span>}
                    {run.scheduled_for && <span>Prog: {new Date(run.scheduled_for).toLocaleDateString('es-MX')}</span>}
                    {run.completed_at && <span>Cierre: {new Date(run.completed_at).toLocaleDateString('es-MX')}</span>}
                  </div>
                </Link>
                <div className="flex items-center gap-2 ml-4">
                  <ScoreBadge score={run.score} passed={run.passed} />
                  {/* Actions */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === run.id ? null : run.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                    {menuOpen === run.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                          {(run.status === 'SCHEDULED' || run.status === 'IN_PROGRESS') && (
                            <button
                              onClick={() => { setMenuOpen(null); setCancelTarget(run); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Cancelar
                            </button>
                          )}
                          <button
                            onClick={() => { setMenuOpen(null); setDeleteTarget(run); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Eliminar Ejecución</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Se eliminará permanentemente:</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-4">
              {deleteTarget.checklist_title} - {deleteTarget.inspector_name}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCancelTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Cancelar Ejecución</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">La ejecución se marcará como cancelada.</p>
            <textarea
              value={cancelNotes}
              onChange={(e) => setCancelNotes(e.target.value)}
              placeholder="Motivo (opcional)..."
              rows={2}
              className="input-fls resize-none w-full mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setCancelTarget(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                Volver
              </button>
              <button
                onClick={() => cancelMutation.mutate({ id: cancelTarget.id, notes: cancelNotes || undefined })}
                disabled={cancelMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
