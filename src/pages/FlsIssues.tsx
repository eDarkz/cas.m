import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Filter, X, User, Calendar, MessageSquare, Plus, Trash2, ClipboardList, Check } from 'lucide-react';
import { flsApi, type FlsIssue, type IssueStatus, type IssueSeverity } from '../lib/flsApi';
import { api } from '../lib/api';
import { IssueStatusBadge, SeverityBadge } from '../components/FlsBadges';
import FlsNavigation from '../components/FlsNavigation';

const STATUS_OPTIONS: { value: IssueStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'OPEN', label: 'Abierto' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'CLOSED', label: 'Cerrado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

const SEVERITY_OPTIONS: { value: IssueSeverity | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'CRITICAL', label: 'Crítica' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'LOW', label: 'Baja' },
];

export default function FlsIssues() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<IssueStatus | ''>('OPEN');
  const [severity, setSeverity] = useState<IssueSeverity | ''>('');
  const [selectedIssue, setSelectedIssue] = useState<FlsIssue | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FlsIssue | null>(null);
  const [page, setPage] = useState(1);

  const { data: supervisors } = useQuery({
    queryKey: ['supervisors'],
    queryFn: () => api.getSupervisors(),
    staleTime: 300_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['fls-issues', status, severity, page],
    queryFn: () => flsApi.listIssues({
      status: status || undefined,
      severity: severity || undefined,
      page,
      pageSize: 25,
    }),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<FlsIssue> }) =>
      flsApi.updateIssue(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-issues'] });
      queryClient.invalidateQueries({ queryKey: ['fls-dashboard'] });
      setSelectedIssue(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<FlsIssue>) => flsApi.createIssue(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-issues'] });
      queryClient.invalidateQueries({ queryKey: ['fls-dashboard'] });
      setShowCreateModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => flsApi.deleteIssue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-issues'] });
      queryClient.invalidateQueries({ queryKey: ['fls-dashboard'] });
      setDeleteTarget(null);
    },
  });

  const issues = data?.data || [];
  const total = data?.total || 0;

  return (
    <div>
      <FlsNavigation />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Hallazgos y Correctivos</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">{total} hallazgos</span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Hallazgo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-slate-400" />
        <select value={status} onChange={(e) => { setStatus(e.target.value as IssueStatus | ''); setPage(1); }} className="input-fls text-sm">
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={severity} onChange={(e) => { setSeverity(e.target.value as IssueSeverity | ''); setPage(1); }} className="input-fls text-sm">
          {SEVERITY_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Issues List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          No se encontraron hallazgos.
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`bg-white dark:bg-slate-800 border rounded-xl p-4 transition-all hover:shadow-sm ${
                issue.severity === 'CRITICAL' ? 'border-red-200 dark:border-red-800 hover:border-red-400' :
                issue.severity === 'HIGH' ? 'border-orange-200 dark:border-orange-800 hover:border-orange-400' :
                'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedIssue(issue)}>
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={issue.severity} />
                    <IssueStatusBadge status={issue.status} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2">
                    {issue.question_text || issue.description || 'Sin descripción'}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {issue.checklist_title && <span>{issue.checklist_title}</span>}
                    {issue.target_area && <span>{issue.target_area}</span>}
                    {issue.target_asset_code && <span>{issue.target_asset_code}</span>}
                    {issue.assigned_to_name && <span>Asignado: {issue.assigned_to_name}</span>}
                    {issue.due_at && <span>Compromiso: {new Date(issue.due_at).toLocaleDateString('es-MX')}</span>}
                    {issue.created_at && <span>{new Date(issue.created_at).toLocaleDateString('es-MX')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {issue.severity === 'CRITICAL' && (
                    <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                  )}
                  <button
                    onClick={() => setDeleteTarget(issue)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar hallazgo"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Issue Modal */}
      {showCreateModal && (
        <CreateIssueModal
          supervisors={supervisors || []}
          onClose={() => setShowCreateModal(false)}
          onCreate={(payload) => createMutation.mutate(payload)}
          isCreating={createMutation.isPending}
        />
      )}

      {/* Issue Detail Drawer */}
      {selectedIssue && (
        <IssueDrawer
          issue={selectedIssue}
          supervisors={supervisors || []}
          onClose={() => setSelectedIssue(null)}
          onUpdate={(payload) => updateMutation.mutate({ id: selectedIssue.id, payload })}
          onDelete={() => { setSelectedIssue(null); setDeleteTarget(selectedIssue); }}
          isUpdating={updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Eliminar Hallazgo</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Se eliminará permanentemente este hallazgo. No se puede deshacer.
            </p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-4 line-clamp-2">
              {deleteTarget.question_text || deleteTarget.description}
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
    </div>
  );
}

function CreateIssueModal({
  supervisors,
  onClose,
  onCreate,
  isCreating,
}: {
  supervisors: { id: number; nombre: string; is_active: boolean }[];
  onClose: () => void;
  onCreate: (payload: Partial<FlsIssue>) => void;
  isCreating: boolean;
}) {
  const [description, setDescription] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<IssueSeverity>('MEDIUM');
  const [assignedTo, setAssignedTo] = useState<number | null>(null);
  const [targetArea, setTargetArea] = useState('');
  const [targetAssetCode, setTargetAssetCode] = useState('');
  const [dueAt, setDueAt] = useState('');

  function handleCreate() {
    if (!description.trim()) return;
    onCreate({
      description,
      severity: issueSeverity,
      status: 'OPEN',
      assigned_to: assignedTo,
      target_area: targetArea || undefined,
      target_asset_code: targetAssetCode || undefined,
      due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Nuevo Hallazgo Manual</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descripción *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-fls resize-none w-full" placeholder="Describe el hallazgo..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Severidad</label>
            <select value={issueSeverity} onChange={(e) => setIssueSeverity(e.target.value as IssueSeverity)} className="input-fls w-full">
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Asignar a</label>
            <select value={assignedTo || ''} onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : null)} className="input-fls w-full">
              <option value="">Sin asignar</option>
              {supervisors.filter((s) => s.is_active).map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Área</label>
              <input type="text" value={targetArea} onChange={(e) => setTargetArea(e.target.value)} placeholder="Lobby..." className="input-fls" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Equipo</label>
              <input type="text" value={targetAssetCode} onChange={(e) => setTargetAssetCode(e.target.value)} placeholder="EXT-001" className="input-fls" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha compromiso</label>
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="input-fls w-full" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !description.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {isCreating ? 'Creando...' : 'Crear Hallazgo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function IssueDrawer({
  issue,
  supervisors,
  onClose,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  issue: FlsIssue;
  supervisors: { id: number; nombre: string; is_active: boolean }[];
  onClose: () => void;
  onUpdate: (payload: Partial<FlsIssue>) => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const [issueStatus, setIssueStatus] = useState(issue.status);
  const [issueSeverity, setIssueSeverity] = useState(issue.severity);
  const [assignedTo, setAssignedTo] = useState<number | null>(issue.assigned_to || null);
  const [dueAt, setDueAt] = useState(issue.due_at ? issue.due_at.slice(0, 16) : '');
  const [closeComment, setCloseComment] = useState('');
  const [description, setDescription] = useState(issue.description || '');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskSupervisorId, setTaskSupervisorId] = useState<number>(issue.assigned_to || supervisors.find((s) => s.is_active)?.id || 0);
  const [taskCreated, setTaskCreated] = useState(false);

  const createTaskMutation = useMutation({
    mutationFn: () => {
      const sevLabel = issue.severity === 'CRITICAL' ? 'CRITICO' : issue.severity === 'HIGH' ? 'ALTO' : issue.severity === 'MEDIUM' ? 'MEDIO' : 'BAJO';
      return api.createNote({
        supervisorId: taskSupervisorId,
        titulo: `[FLS ${sevLabel}] ${issue.question_text || issue.description || 'Hallazgo de seguridad'}`,
        actividades: [
          issue.description || issue.question_text || '',
          issue.checklist_title ? `Checklist: ${issue.checklist_title}` : '',
          issue.target_area ? `Area: ${issue.target_area}` : '',
          issue.target_asset_code ? `Equipo: ${issue.target_asset_code}` : '',
        ].filter(Boolean).join('\n'),
        fecha: new Date().toISOString().slice(0, 10),
        cristal: issue.severity === 'CRITICAL' || issue.severity === 'HIGH',
      });
    },
    onSuccess: () => {
      setTaskCreated(true);
      setShowTaskForm(false);
    },
  });

  function handleSave() {
    const payload: Partial<FlsIssue> = {
      status: issueStatus,
      severity: issueSeverity,
      assigned_to: assignedTo,
      due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
      description,
    };
    if (issueStatus === 'CLOSED') {
      (payload as Record<string, unknown>).close_comment = closeComment;
      (payload as Record<string, unknown>).closed_by = assignedTo;
    }
    onUpdate(payload);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 w-full max-w-md h-full overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Hallazgo</h3>
          <div className="flex items-center gap-2">
            <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Eliminar">
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={issue.severity} />
            <IssueStatusBadge status={issue.status} />
          </div>

          {issue.question_text && (
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-700 dark:text-slate-200">{issue.question_text}</p>
            </div>
          )}

          {issue.photo_urls && issue.photo_urls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {issue.photo_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Descripción / Notas
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-fls resize-none w-full" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Estado</label>
              <select value={issueStatus} onChange={(e) => setIssueStatus(e.target.value as IssueStatus)} className="input-fls w-full">
                <option value="OPEN">Abierto</option>
                <option value="IN_PROGRESS">En Progreso</option>
                <option value="CLOSED">Cerrado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Severidad</label>
              <select value={issueSeverity} onChange={(e) => setIssueSeverity(e.target.value as IssueSeverity)} className="input-fls w-full">
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <User className="w-3 h-3 inline mr-1" />
              Asignado a
            </label>
            <select value={assignedTo || ''} onChange={(e) => setAssignedTo(e.target.value ? Number(e.target.value) : null)} className="input-fls w-full">
              <option value="">Sin asignar</option>
              {supervisors.filter((s) => s.is_active).map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <Calendar className="w-3 h-3 inline mr-1" />
              Fecha compromiso
            </label>
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="input-fls w-full" />
          </div>

          {issueStatus === 'CLOSED' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Comentario de cierre</label>
              <textarea value={closeComment} onChange={(e) => setCloseComment(e.target.value)} rows={2} className="input-fls resize-none w-full" placeholder="Acción correctiva realizada..." />
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="w-full py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isUpdating ? 'Guardando...' : 'Actualizar Hallazgo'}
          </button>

          {/* Create Task in Kanban */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            {taskCreated ? (
              <div className="flex items-center gap-2 py-2.5 px-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Tarea creada en Tablero</span>
              </div>
            ) : showTaskForm ? (
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Asignar tarea a:</p>
                <select
                  value={taskSupervisorId}
                  onChange={(e) => setTaskSupervisorId(Number(e.target.value))}
                  className="input-fls w-full"
                >
                  {supervisors.filter((s) => s.is_active).map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTaskForm(false)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => createTaskMutation.mutate()}
                    disabled={createTaskMutation.isPending || !taskSupervisorId}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-800 dark:bg-slate-600 text-white text-xs font-medium hover:bg-slate-900 dark:hover:bg-slate-500 disabled:opacity-50 transition-colors"
                  >
                    {createTaskMutation.isPending ? 'Creando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowTaskForm(true)}
                className="w-full py-2.5 inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                Crear Tarea en Tablero
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
