import type { Criticality, RunStatus, IssueStatus, IssueSeverity } from '../lib/flsApi';

export function SeverityBadge({ severity }: { severity: IssueSeverity | Criticality }) {
  const map: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
    HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${map[severity] || map.LOW}`}>
      {severity}
    </span>
  );
}

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  const labels: Record<RunStatus, string> = {
    SCHEDULED: 'Programada',
    IN_PROGRESS: 'En Progreso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const map: Record<IssueStatus, string> = {
    OPEN: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    CLOSED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  const labels: Record<IssueStatus, string> = {
    OPEN: 'Abierto',
    IN_PROGRESS: 'En Progreso',
    CLOSED: 'Cerrado',
    CANCELLED: 'Cancelado',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

export function ScoreBadge({ score, passed }: { score: number | null | undefined; passed: boolean | null | undefined }) {
  if (score == null) return null;
  const color = passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400';
  return (
    <span className={`font-bold text-sm ${color}`}>
      {score.toFixed(0)}%
    </span>
  );
}
