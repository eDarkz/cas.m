import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Clock, CheckCircle2, PlayCircle, ShieldAlert,
  TrendingUp, Activity, Users, ClipboardList, ArrowRight, X, Hash,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import { flsApi, type FlsRun, type FlsTemplate } from '../lib/flsApi';
import { RunStatusBadge, ScoreBadge } from '../components/FlsBadges';
import FlsNavigation from '../components/FlsNavigation';

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#94a3b8',
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#94a3b8',
};

const CATEGORY_COLORS: Record<string, string> = {
  FIRE: '#ef4444',
  LIFE_SAFETY: '#f59e0b',
  ELECTRICAL: '#3b82f6',
  ELECTRICAL_SAFETY: '#3b82f6',
  STRUCTURAL: '#8b5cf6',
  GENERAL: '#6b7280',
};

export default function FlsDashboard() {
  const [selectedChecklist, setSelectedChecklist] = useState<{ id: string; title: string; runs: FlsRun[] } | null>(null);

  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ['fls-dashboard'],
    queryFn: () => flsApi.getDashboard(),
    staleTime: 60_000,
  });

  const { data: runsData } = useQuery({
    queryKey: ['fls-runs-all'],
    queryFn: () => flsApi.listRuns({ pageSize: 500 }),
    staleTime: 60_000,
  });

  const { data: templates } = useQuery({
    queryKey: ['fls-templates-dash'],
    queryFn: () => flsApi.listTemplates({ active: true }),
    staleTime: 120_000,
  });

  const { data: issuesData } = useQuery({
    queryKey: ['fls-issues-dash'],
    queryFn: () => flsApi.listIssues({ pageSize: 500 }),
    staleTime: 60_000,
  });

  if (loadingDash) {
    return (
      <div className="animate-pulse space-y-6">
        <FlsNavigation />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const d = dashboard!;
  const allRuns = (runsData?.data || []).filter((r) => r.status !== 'CANCELLED');
  const allIssues = issuesData?.data || [];

  const statusDistribution = buildStatusDistribution(allRuns);
  const inspectorData = buildInspectorData(allRuns);
  const categoryData = buildCategoryData(templates || []);
  const timelineData = buildTimelineData(allRuns);
  const issuesBySeverity = buildIssuesBySeverity(allIssues);

  const totalRuns = d.runs_scheduled + d.runs_in_progress + d.runs_completed;
  const completionRate = totalRuns > 0 ? Math.round((d.runs_completed / totalRuns) * 100) : 0;

  return (
    <div>
      <FlsNavigation />

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        <KpiCard label="Vencidos" value={d.checklists_overdue} icon={AlertTriangle} variant="danger" />
        <KpiCard label="Por Vencer" value={d.checklists_due_soon} icon={Clock} variant="warning" />
        <KpiCard label="Activos" value={d.checklists_active} icon={ClipboardList} variant="info" />
        <KpiCard label="Programadas" value={d.runs_scheduled} icon={Clock} variant="neutral" />
        <KpiCard label="En Progreso" value={d.runs_in_progress} icon={PlayCircle} variant="warning" />
        <KpiCard label="Completadas" value={d.runs_completed} icon={CheckCircle2} variant="success" />
        <KpiCard label="Issues" value={d.issues_open} icon={AlertTriangle} variant="danger" />
        <KpiCard label="Criticos" value={d.issues_critical} icon={ShieldAlert} variant="critical" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Completion Rate Radial */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Tasa de Completado
          </h3>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="60%" outerRadius="90%"
                startAngle={180} endAngle={0}
                data={[{ value: completionRate, fill: completionRate >= 70 ? '#10b981' : completionRate >= 40 ? '#f59e0b' : '#ef4444' }]}
              >
                <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#e2e8f0' }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center -mt-8">
            <span className="text-4xl font-bold text-slate-800 dark:text-slate-100">{completionRate}%</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{d.runs_completed} de {totalRuns} inspecciones</p>
          </div>
        </div>

        {/* Status Distribution Pie */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Distribucion por Estado
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%" cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [value, 'Inspecciones']}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issues by Severity */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Hallazgos por Severidad
          </h3>
          {issuesBySeverity.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issuesBySeverity} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {issuesBySeverity.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
              Sin hallazgos registrados
            </div>
          )}
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Timeline - Inspecciones por dia */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Actividad Reciente (Ultimos 14 dias)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStarted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="started" stroke="#f59e0b" fill="url(#colorStarted)" strokeWidth={2} name="Iniciadas" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#colorCompleted)" strokeWidth={2} name="Completadas" />
                <Legend verticalAlign="top" height={30} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inspector Performance */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Inspecciones por Inspector
          </h3>
          {inspectorData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inspectorData.slice(0, 8)} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completadas" stackId="a" />
                  <Bar dataKey="inProgress" fill="#f59e0b" radius={[4, 4, 0, 0]} name="En Progreso" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
              Sin datos de inspectores
            </div>
          )}
        </div>
      </div>

      {/* Checklist Completion Summary */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-8">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Resumen de Ejecuciones por Checklist
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Checklist</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Completadas</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">Total</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">Ultima Ejecucion</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(templates || []).map((tmpl) => {
                const tmplRuns = allRuns.filter((r) => r.checklist_id === tmpl.id);
                const completedRuns = tmplRuns.filter((r) => r.status === 'COMPLETED');
                const inProgressCount = tmplRuns.filter((r) => r.status === 'IN_PROGRESS').length;
                const scheduledCount = tmplRuns.filter((r) => r.status === 'SCHEDULED').length;
                const lastRun = tmplRuns.length > 0
                  ? tmplRuns.reduce((a, b) => (a.started_at || a.completed_at || '') > (b.started_at || b.completed_at || '') ? a : b)
                  : null;
                return (
                  <tr
                    key={tmpl.id}
                    onClick={() => setSelectedChecklist({ id: tmpl.id, title: tmpl.title, runs: tmplRuns })}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-2">
                      <p className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[180px] sm:max-w-[250px] lg:max-w-none">{tmpl.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden mt-0.5">
                        {completedRuns.length} completadas
                        {lastRun && ` - ${new Date(lastRun.started_at || lastRun.completed_at || '').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`}
                      </p>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                        {completedRuns.length}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center hidden sm:table-cell">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{tmplRuns.length}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center hidden sm:table-cell text-xs text-slate-600 dark:text-slate-300">
                      {lastRun
                        ? new Date(lastRun.started_at || lastRun.completed_at || '').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span className="text-slate-400">Nunca</span>}
                    </td>
                    <td className="py-2.5 px-2 text-center hidden md:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {completedRuns.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />{completedRuns.length}
                          </span>
                        )}
                        {inProgressCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            <PlayCircle className="w-3 h-3" />{inProgressCount}
                          </span>
                        )}
                        {scheduledCount > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            <Clock className="w-3 h-3" />{scheduledCount}
                          </span>
                        )}
                        {tmplRuns.length === 0 && (
                          <span className="text-xs text-slate-400">--</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!templates || templates.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">Sin checklists configurados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checklist Runs Detail Modal */}
      {selectedChecklist && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedChecklist(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{selectedChecklist.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedChecklist.runs.filter((r) => r.status === 'COMPLETED').length} completadas de {selectedChecklist.runs.length} ejecuciones
                </p>
              </div>
              <button onClick={() => setSelectedChecklist(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {selectedChecklist.runs.length > 0 ? (
                <div className="space-y-2">
                  {selectedChecklist.runs
                    .sort((a, b) => (b.started_at || b.completed_at || '').localeCompare(a.started_at || a.completed_at || ''))
                    .map((run) => (
                    <Link
                      key={run.id}
                      to={run.status === 'IN_PROGRESS' ? `/fls/runs/${run.id}/execute` : `/fls/runs/${run.id}`}
                      onClick={() => setSelectedChecklist(null)}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{run.inspector_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {run.started_at
                            ? new Date(run.started_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : run.completed_at
                            ? new Date(run.completed_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'Sin fecha'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <ScoreBadge score={run.score} passed={run.passed} />
                        <RunStatusBadge status={run.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm">Sin ejecuciones para este checklist</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Category Distribution */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Checklists por Categoria
          </h3>
          {categoryData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%" cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    strokeWidth={0}
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
              Sin checklists
            </div>
          )}
        </div>

        {/* Recent Runs Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Ultimas Inspecciones
            </h3>
            <Link to="/fls/history" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-hidden">
            {d.recent_runs && d.recent_runs.filter((r) => r.status !== 'CANCELLED').length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {d.recent_runs.filter((r) => r.status !== 'CANCELLED').slice(0, 8).map((run) => (
                  <Link
                    key={run.id}
                    to={run.status === 'IN_PROGRESS' ? `/fls/runs/${run.id}/execute` : `/fls/runs/${run.id}`}
                    className="flex items-center justify-between py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {run.checklist_title || 'Checklist'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {run.inspector_name}
                        {run.started_at && ` · ${new Date(run.started_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <ScoreBadge score={run.score} passed={run.passed} />
                      <RunStatusBadge status={run.status} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                Sin inspecciones recientes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, variant }: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'danger' | 'warning' | 'success' | 'info' | 'neutral' | 'critical';
}) {
  const styles: Record<string, { bg: string; text: string; icon: string }> = {
    danger: { bg: 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30', text: 'text-red-700 dark:text-red-400', icon: 'text-red-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: 'text-amber-500' },
    success: { bg: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: 'text-emerald-500' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: 'text-blue-500' },
    neutral: { bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300', icon: 'text-slate-500' },
    critical: { bg: 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-300', icon: 'text-red-600' },
  };

  const s = styles[variant];

  return (
    <div className={`${s.bg} border rounded-2xl p-3.5 transition-transform hover:scale-[1.02]`}>
      <Icon className={`w-4 h-4 ${s.icon} mb-2`} />
      <div className={`text-2xl font-bold ${s.text} leading-none`}>{value}</div>
      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

// ─── Data Builders ───────────────────────────────────────────────────────────

function buildStatusDistribution(runs: FlsRun[]) {
  const counts: Record<string, number> = {};
  for (const r of runs) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }
  const labels: Record<string, string> = {
    SCHEDULED: 'Programada',
    IN_PROGRESS: 'En Progreso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
  };
  return Object.entries(counts).map(([status, value]) => ({
    name: labels[status] || status,
    value,
    color: STATUS_COLORS[status] || '#94a3b8',
  }));
}

function buildInspectorData(runs: FlsRun[]) {
  const map: Record<string, { completed: number; inProgress: number }> = {};
  for (const r of runs) {
    const name = r.inspector_name || 'Sin nombre';
    if (!map[name]) map[name] = { completed: 0, inProgress: 0 };
    if (r.status === 'COMPLETED') map[name].completed++;
    else if (r.status === 'IN_PROGRESS') map[name].inProgress++;
  }
  return Object.entries(map)
    .map(([name, data]) => ({ name: name.length > 15 ? name.slice(0, 14) + '...' : name, ...data }))
    .sort((a, b) => (b.completed + b.inProgress) - (a.completed + a.inProgress));
}

function buildCategoryData(tmpls: FlsTemplate[]) {
  const counts: Record<string, number> = {};
  for (const t of tmpls) {
    const cat = t.category || 'GENERAL';
    counts[cat] = (counts[cat] || 0) + 1;
  }
  const labels: Record<string, string> = {
    FIRE: 'Fuego',
    LIFE_SAFETY: 'Seguridad',
    ELECTRICAL: 'Electrico',
    ELECTRICAL_SAFETY: 'Electrico',
    STRUCTURAL: 'Estructural',
    GENERAL: 'General',
  };
  return Object.entries(counts).map(([cat, value]) => ({
    name: labels[cat] || cat,
    value,
    color: CATEGORY_COLORS[cat] || '#6b7280',
  }));
}

function buildTimelineData(runs: FlsRun[]) {
  const days: Record<string, { started: number; completed: number }> = {};
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(5, 10);
    days[key] = { started: 0, completed: 0 };
  }

  for (const r of runs) {
    if (r.started_at) {
      const key = r.started_at.slice(5, 10);
      if (days[key]) days[key].started++;
    }
    if (r.completed_at) {
      const key = r.completed_at.slice(5, 10);
      if (days[key]) days[key].completed++;
    }
  }

  return Object.entries(days).map(([date, data]) => ({ date, ...data }));
}

function buildIssuesBySeverity(issues: { severity?: string }[]) {
  const counts: Record<string, number> = {};
  for (const i of issues) {
    const sev = i.severity || 'LOW';
    counts[sev] = (counts[sev] || 0) + 1;
  }
  const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const labels: Record<string, string> = { CRITICAL: 'Critico', HIGH: 'Alto', MEDIUM: 'Medio', LOW: 'Bajo' };
  return order
    .filter((s) => counts[s])
    .map((s) => ({ name: labels[s], value: counts[s], color: SEVERITY_COLORS[s] }));
}
