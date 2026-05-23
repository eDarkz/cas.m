import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer, FileText, ClipboardList, CheckCircle2, XCircle,
  MinusCircle, AlertTriangle, Calendar, User,
  BarChart3, ArrowLeft,
} from 'lucide-react';
import { flsApi, type FlsRun, type FlsTemplate, type FlsIssue } from '../lib/flsApi';
import { RunStatusBadge, ScoreBadge, SeverityBadge } from '../components/FlsBadges';
import FlsNavigation from '../components/FlsNavigation';

type ReportType = 'blank_checklist' | 'completed_run' | 'summary' | 'issues' | 'inspector';

const REPORT_TYPES: { id: ReportType; label: string; description: string; icon: typeof FileText }[] = [
  { id: 'blank_checklist', label: 'Checklist en Blanco', description: 'Imprimir checklist vacio para llenado manual', icon: ClipboardList },
  { id: 'completed_run', label: 'Ejecucion Completada', description: 'Imprimir detalle de una ejecucion realizada', icon: CheckCircle2 },
  { id: 'summary', label: 'Resumen Ejecutivo', description: 'Resumen general con KPIs y estadisticas', icon: BarChart3 },
  { id: 'issues', label: 'Reporte de Hallazgos', description: 'Listado de hallazgos abiertos y su seguimiento', icon: AlertTriangle },
  { id: 'inspector', label: 'Reporte por Inspector', description: 'Desempeno y ejecuciones por inspector', icon: User },
];

const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critico',
  HIGH: 'Alto',
  MEDIUM: 'Medio',
  LOW: 'Bajo',
};

const CATEGORY_LABELS: Record<string, string> = {
  FIRE: 'Incendio',
  LIFE_SAFETY: 'Seguridad de Vida',
  ELECTRICAL: 'Electrico',
  ELECTRICAL_SAFETY: 'Seguridad Electrica',
  STRUCTURAL: 'Estructural',
  GENERAL: 'General',
};

export default function FlsReports() {
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedInspector, setSelectedInspector] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const { data: templates } = useQuery({
    queryKey: ['fls-templates-reports'],
    queryFn: () => flsApi.listTemplates({ active: true, includeQuestions: true }),
    staleTime: 120_000,
  });

  const { data: runsData } = useQuery({
    queryKey: ['fls-runs-reports'],
    queryFn: () => flsApi.listRuns({ pageSize: 500 }),
    staleTime: 60_000,
  });

  const { data: issuesData } = useQuery({
    queryKey: ['fls-issues-reports'],
    queryFn: () => flsApi.listIssues({ pageSize: 500 }),
    staleTime: 60_000,
  });

  const { data: runDetail } = useQuery({
    queryKey: ['fls-run-detail-report', selectedRunId],
    queryFn: () => flsApi.getRun(selectedRunId),
    enabled: !!selectedRunId && activeReport === 'completed_run',
  });

  const { data: templateDetail } = useQuery({
    queryKey: ['fls-template-detail-report', selectedTemplateId],
    queryFn: () => flsApi.getTemplate(selectedTemplateId),
    enabled: !!selectedTemplateId && activeReport === 'blank_checklist',
  });

  const allRuns = (runsData?.data || []).filter((r) => r.status !== 'CANCELLED');
  const allIssues = issuesData?.data || [];
  const completedRuns = allRuns.filter((r) => r.status === 'COMPLETED');

  const inspectors = [...new Set(allRuns.map((r) => r.inspector_name))].filter(Boolean).sort();

  const handlePrint = () => {
    window.print();
  };

  const filteredRuns = allRuns.filter((r) => {
    if (dateFrom && (r.started_at || r.completed_at || '') < dateFrom) return false;
    if (dateTo && (r.started_at || r.completed_at || '') > dateTo + 'T23:59:59') return false;
    if (selectedInspector && r.inspector_name !== selectedInspector) return false;
    return true;
  });

  const filteredIssues = allIssues.filter((issue) => {
    if (dateFrom && (issue.created_at || '') < dateFrom) return false;
    if (dateTo && (issue.created_at || '') > dateTo + 'T23:59:59') return false;
    return true;
  });

  return (
    <div>
      <div className="print:hidden">
        <FlsNavigation />
      </div>

      <div className="print:hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {activeReport && (
              <button
                onClick={() => { setActiveReport(null); setSelectedTemplateId(''); setSelectedRunId(''); }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Regresar"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reporteador FLS</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {activeReport ? REPORT_TYPES.find((r) => r.id === activeReport)?.label : 'Genera e imprime reportes del modulo de seguridad'}
              </p>
            </div>
          </div>
          {activeReport && (
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition-colors shadow-md"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          )}
        </div>

        {/* Report Type Selection */}
        {!activeReport && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_TYPES.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveReport(id)}
                className="text-left p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-red-300 dark:hover:border-red-700 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{label}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Report Config Panel */}
        {activeReport && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {REPORT_TYPES.find((r) => r.id === activeReport)?.label}
              </h3>
              <button
                onClick={() => { setActiveReport(null); setSelectedTemplateId(''); setSelectedRunId(''); }}
                className="text-xs text-slate-500 hover:text-red-600 transition-colors"
              >
                Cambiar reporte
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {activeReport === 'blank_checklist' && (
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Checklist</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Seleccionar checklist...</option>
                    {(templates || []).map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeReport === 'completed_run' && (
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Ejecucion</label>
                  <select
                    value={selectedRunId}
                    onChange={(e) => setSelectedRunId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Seleccionar ejecucion...</option>
                    {completedRuns
                      .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.checklist_title} - {r.inspector_name} ({r.completed_at ? new Date(r.completed_at).toLocaleDateString('es-MX') : 'N/A'})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {(activeReport === 'summary' || activeReport === 'issues' || activeReport === 'inspector') && (
                <>
                  <div className="min-w-[140px]">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Desde</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="min-w-[140px]">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Hasta</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </>
              )}

              {activeReport === 'inspector' && (
                <div className="min-w-[180px]">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">Inspector</label>
                  <select
                    value={selectedInspector}
                    onChange={(e) => setSelectedInspector(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Todos</option>
                    {inspectors.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Printable Area */}
      <div ref={printRef}>
        {activeReport === 'blank_checklist' && templateDetail && (
          <BlankChecklistReport template={templateDetail} />
        )}
        {activeReport === 'completed_run' && runDetail && (
          <CompletedRunReport run={runDetail} />
        )}
        {activeReport === 'summary' && (
          <SummaryReport runs={filteredRuns} issues={filteredIssues} templates={templates || []} dateFrom={dateFrom} dateTo={dateTo} />
        )}
        {activeReport === 'issues' && (
          <IssuesReport issues={filteredIssues} dateFrom={dateFrom} dateTo={dateTo} />
        )}
        {activeReport === 'inspector' && (
          <InspectorReport runs={filteredRuns} inspector={selectedInspector} dateFrom={dateFrom} dateTo={dateTo} />
        )}
      </div>
    </div>
  );
}

/* ======================== BLANK CHECKLIST ======================== */

function BlankChecklistReport({ template }: { template: FlsTemplate }) {
  const questions = template.questions || [];
  const sections = [...new Set(questions.map((q) => q.section || 'General'))];

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{template.title}</h1>
            {template.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{template.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1">
                <ClipboardList className="w-3 h-3" />
                {CATEGORY_LABELS[template.category] || template.category}
              </span>
              <span className="inline-flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {questions.length} preguntas
              </span>
              {template.estimated_minutes && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  ~{template.estimated_minutes} min
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-medium">Codigo: {template.code}</p>
          </div>
        </div>

        {/* Fill-in fields */}
        <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div>
            <label className="text-xs font-medium text-slate-500">Inspector:</label>
            <div className="mt-1 border-b border-slate-300 h-6"></div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Fecha:</label>
            <div className="mt-1 border-b border-slate-300 h-6"></div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Area / Ubicacion:</label>
            <div className="mt-1 border-b border-slate-300 h-6"></div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Firma:</label>
            <div className="mt-1 border-b border-slate-300 h-6"></div>
          </div>
        </div>
      </div>

      {/* Questions by section */}
      <div className="p-6">
        {sections.map((section) => {
          const sectionQs = questions.filter((q) => (q.section || 'General') === section);
          return (
            <div key={section} className="mb-6 last:mb-0">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 pb-1 border-b border-slate-200 dark:border-slate-700 uppercase">
                {section}
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left py-1.5 w-8">#</th>
                    <th className="text-left py-1.5">Pregunta</th>
                    <th className="text-center py-1.5 w-16">OK</th>
                    <th className="text-center py-1.5 w-16">Falla</th>
                    <th className="text-center py-1.5 w-16">N/A</th>
                    <th className="text-left py-1.5 w-32">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sectionQs.map((q, idx) => (
                    <tr key={q.id} className="print:break-inside-avoid">
                      <td className="py-2 text-slate-500 dark:text-slate-400 text-xs">{idx + 1}</td>
                      <td className="py-2 text-slate-800 dark:text-slate-100">
                        <p>{q.text}</p>
                        {q.help_text && <p className="text-xs text-slate-400 mt-0.5">{q.help_text}</p>}
                      </td>
                      <td className="py-2 text-center"><div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-500 rounded mx-auto"></div></td>
                      <td className="py-2 text-center"><div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-500 rounded mx-auto"></div></td>
                      <td className="py-2 text-center"><div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-500 rounded mx-auto"></div></td>
                      <td className="py-2"><div className="border-b border-slate-300 dark:border-slate-500 h-5"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Notes section */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">Notas Adicionales</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-slate-200 dark:border-slate-700 h-6"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================== COMPLETED RUN ======================== */

function CompletedRunReport({ run }: { run: FlsRun }) {
  const questions = run.questions || [];
  const answers = run.answers || [];
  const answerMap = new Map(answers.map((a) => [a.question_id, a]));
  const sections = [...new Set(questions.map((q) => q.section || 'General'))];

  const passCount = answers.filter((a) => a.answer_status === 'PASS').length;
  const failCount = answers.filter((a) => a.answer_status === 'FAIL').length;
  const naCount = answers.filter((a) => a.answer_status === 'NA').length;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{run.checklist_title}</h1>
            <p className="text-sm text-slate-500 mt-1">Ejecucion completada</p>
          </div>
          <div className="text-right">
            <ScoreBadge score={run.score} passed={run.passed} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <div>
            <label className="text-xs font-medium text-slate-500">Inspector</label>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{run.inspector_name}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Fecha Inicio</label>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
              {run.started_at ? new Date(run.started_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Fecha Fin</label>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
              {run.completed_at ? new Date(run.completed_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Area</label>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{run.target_area || run.target_room_number || '--'}</p>
          </div>
        </div>

        {/* Score summary */}
        <div className="flex gap-4 mt-4">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> {passCount} OK
          </span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
            <XCircle className="w-3 h-3" /> {failCount} Fallas
          </span>
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            <MinusCircle className="w-3 h-3" /> {naCount} N/A
          </span>
        </div>
      </div>

      {/* Questions and answers */}
      <div className="p-6">
        {sections.map((section) => {
          const sectionQs = questions.filter((q) => (q.section || 'General') === section);
          return (
            <div key={section} className="mb-6 last:mb-0">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 pb-1 border-b border-slate-200 dark:border-slate-700 uppercase">
                {section}
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left py-1.5 w-8">#</th>
                    <th className="text-left py-1.5">Pregunta</th>
                    <th className="text-center py-1.5 w-20">Resultado</th>
                    <th className="text-left py-1.5 w-40">Comentario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sectionQs.map((q, idx) => {
                    const answer = q.id ? answerMap.get(q.id) : undefined;
                    return (
                      <tr key={q.id || idx} className="print:break-inside-avoid">
                        <td className="py-2 text-slate-500 dark:text-slate-400 text-xs">{idx + 1}</td>
                        <td className="py-2 text-slate-800 dark:text-slate-100">{q.text}</td>
                        <td className="py-2 text-center">
                          {answer ? (
                            <AnswerStatusIcon status={answer.answer_status} />
                          ) : (
                            <span className="text-xs text-slate-400">--</span>
                          )}
                        </td>
                        <td className="py-2 text-xs text-slate-600 dark:text-slate-300">
                          {answer?.comment || ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {run.notes && (
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase">Notas</h3>
            <p className="text-sm text-slate-700 dark:text-slate-200">{run.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================== EXECUTIVE SUMMARY ======================== */

function SummaryReport({
  runs, issues, templates, dateFrom, dateTo,
}: { runs: FlsRun[]; issues: FlsIssue[]; templates: FlsTemplate[]; dateFrom: string; dateTo: string }) {
  const completed = runs.filter((r) => r.status === 'COMPLETED');
  const inProgress = runs.filter((r) => r.status === 'IN_PROGRESS');
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((sum, r) => sum + (r.score || 0), 0) / completed.length)
    : 0;
  const passRate = completed.length > 0
    ? Math.round((completed.filter((r) => r.passed).length / completed.length) * 100)
    : 0;

  const openIssues = issues.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
  const criticalIssues = openIssues.filter((i) => i.severity === 'CRITICAL');

  const byChecklist = templates.map((t) => {
    const tRuns = completed.filter((r) => r.checklist_id === t.id);
    return { title: t.title, count: tRuns.length, avgScore: tRuns.length > 0 ? Math.round(tRuns.reduce((s, r) => s + (r.score || 0), 0) / tRuns.length) : null };
  }).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);

  const dateLabel = dateFrom || dateTo
    ? `${dateFrom ? new Date(dateFrom).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Inicio'} - ${dateTo ? new Date(dateTo).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Hoy'}`
    : 'Todo el historial';

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Resumen Ejecutivo - Seguridad FLS</h1>
        <p className="text-sm text-slate-500 mt-1">Periodo: {dateLabel}</p>
      </div>

      <div className="p-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <KpiBox label="Ejecuciones" value={runs.length} />
          <KpiBox label="Completadas" value={completed.length} />
          <KpiBox label="Puntaje Promedio" value={`${avgScore}%`} />
          <KpiBox label="Tasa Aprobacion" value={`${passRate}%`} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <KpiBox label="En Progreso" value={inProgress.length} />
          <KpiBox label="Hallazgos Abiertos" value={openIssues.length} />
          <KpiBox label="Hallazgos Criticos" value={criticalIssues.length} highlight />
          <KpiBox label="Checklists Activos" value={templates.length} />
        </div>

        {/* By checklist */}
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 uppercase">Ejecuciones por Checklist</h2>
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2">Checklist</th>
              <th className="text-center py-2">Completadas</th>
              <th className="text-center py-2">Puntaje Prom.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {byChecklist.map((item) => (
              <tr key={item.title}>
                <td className="py-2 text-slate-800 dark:text-slate-100">{item.title}</td>
                <td className="py-2 text-center font-semibold text-slate-700 dark:text-slate-200">{item.count}</td>
                <td className="py-2 text-center">
                  <span className={`font-semibold ${(item.avgScore || 0) >= 80 ? 'text-emerald-600' : (item.avgScore || 0) >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {item.avgScore != null ? `${item.avgScore}%` : '--'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Critical issues summary */}
        {criticalIssues.length > 0 && (
          <>
            <h2 className="text-sm font-bold text-red-700 dark:text-red-400 mb-3 uppercase">Hallazgos Criticos Abiertos</h2>
            <div className="space-y-2 mb-6">
              {criticalIssues.map((issue) => (
                <div key={issue.id} className="p-3 border border-red-200 dark:border-red-900/50 rounded-xl">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{issue.description || issue.question_text}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Checklist: {issue.checklist_title} {issue.assigned_to_name ? `| Asignado: ${issue.assigned_to_name}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
          <p>Generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  );
}

/* ======================== ISSUES REPORT ======================== */

function IssuesReport({ issues, dateFrom, dateTo }: { issues: FlsIssue[]; dateFrom: string; dateTo: string }) {
  const openIssues = issues.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
  const closedIssues = issues.filter((i) => i.status === 'CLOSED');

  const bySeverity = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => ({
    severity: sev,
    open: openIssues.filter((i) => i.severity === sev).length,
    closed: closedIssues.filter((i) => i.severity === sev).length,
  })).filter((x) => x.open + x.closed > 0);

  const dateLabel = dateFrom || dateTo
    ? `${dateFrom ? new Date(dateFrom).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Inicio'} - ${dateTo ? new Date(dateTo).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Hoy'}`
    : 'Todo el historial';

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Reporte de Hallazgos - FLS</h1>
        <p className="text-sm text-slate-500 mt-1">Periodo: {dateLabel}</p>
      </div>

      <div className="p-6">
        {/* Summary by severity */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <KpiBox label="Total Hallazgos" value={issues.length} />
          <KpiBox label="Abiertos" value={openIssues.length} highlight={openIssues.length > 0} />
          <KpiBox label="Cerrados" value={closedIssues.length} />
          <KpiBox label="Tasa Cierre" value={issues.length > 0 ? `${Math.round((closedIssues.length / issues.length) * 100)}%` : '--'} />
        </div>

        {/* Severity breakdown table */}
        {bySeverity.length > 0 && (
          <>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 uppercase">Por Severidad</h2>
            <table className="w-full text-sm mb-8">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2">Severidad</th>
                  <th className="text-center py-2">Abiertos</th>
                  <th className="text-center py-2">Cerrados</th>
                  <th className="text-center py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {bySeverity.map((item) => (
                  <tr key={item.severity}>
                    <td className="py-2 text-slate-800 dark:text-slate-100 font-medium">{SEVERITY_LABELS[item.severity]}</td>
                    <td className="py-2 text-center font-semibold text-red-600">{item.open}</td>
                    <td className="py-2 text-center text-emerald-600">{item.closed}</td>
                    <td className="py-2 text-center text-slate-700 dark:text-slate-200">{item.open + item.closed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Detailed list of open issues */}
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 uppercase">Hallazgos Abiertos</h2>
        {openIssues.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2">Descripcion</th>
                <th className="text-center py-2 w-20">Severidad</th>
                <th className="text-left py-2 w-28">Checklist</th>
                <th className="text-left py-2 w-28">Asignado</th>
                <th className="text-center py-2 w-24">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {openIssues.map((issue) => (
                <tr key={issue.id} className="print:break-inside-avoid">
                  <td className="py-2 text-slate-800 dark:text-slate-100 text-xs">{issue.description || issue.question_text || '--'}</td>
                  <td className="py-2 text-center">
                    <SeverityBadge severity={issue.severity} />
                  </td>
                  <td className="py-2 text-xs text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{issue.checklist_title || '--'}</td>
                  <td className="py-2 text-xs text-slate-600 dark:text-slate-300">{issue.assigned_to_name || 'Sin asignar'}</td>
                  <td className="py-2 text-center text-xs text-slate-600 dark:text-slate-300">
                    {issue.due_at ? new Date(issue.due_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-400 py-4 text-center">No hay hallazgos abiertos</p>
        )}

        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
          <p>Generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  );
}

/* ======================== INSPECTOR REPORT ======================== */

function InspectorReport({ runs, inspector, dateFrom, dateTo }: { runs: FlsRun[]; inspector: string; dateFrom: string; dateTo: string }) {
  const inspectorGroups = inspector
    ? [{ name: inspector, runs: runs.filter((r) => r.inspector_name === inspector) }]
    : [...new Set(runs.map((r) => r.inspector_name))].filter(Boolean).sort().map((name) => ({
        name,
        runs: runs.filter((r) => r.inspector_name === name),
      }));

  const dateLabel = dateFrom || dateTo
    ? `${dateFrom ? new Date(dateFrom).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Inicio'} - ${dateTo ? new Date(dateTo).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Hoy'}`
    : 'Todo el historial';

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Reporte por Inspector{inspector ? `: ${inspector}` : ''}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Periodo: {dateLabel}</p>
      </div>

      <div className="p-6">
        {inspectorGroups.map(({ name, runs: iRuns }) => {
          const completed = iRuns.filter((r) => r.status === 'COMPLETED');
          const avgScore = completed.length > 0
            ? Math.round(completed.reduce((s, r) => s + (r.score || 0), 0) / completed.length)
            : 0;
          const passRate = completed.length > 0
            ? Math.round((completed.filter((r) => r.passed).length / completed.length) * 100)
            : 0;

          return (
            <div key={name} className="mb-8 last:mb-0 print:break-inside-avoid">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> {name}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <KpiBox label="Total Ejecuciones" value={iRuns.length} small />
                <KpiBox label="Completadas" value={completed.length} small />
                <KpiBox label="Puntaje Prom." value={`${avgScore}%`} small />
                <KpiBox label="Tasa Aprobacion" value={`${passRate}%`} small />
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-1.5">Checklist</th>
                    <th className="text-center py-1.5 w-20">Status</th>
                    <th className="text-center py-1.5 w-16">Score</th>
                    <th className="text-center py-1.5 w-28">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {iRuns
                    .sort((a, b) => (b.started_at || b.completed_at || '').localeCompare(a.started_at || a.completed_at || ''))
                    .slice(0, 20)
                    .map((r) => (
                    <tr key={r.id}>
                      <td className="py-1.5 text-slate-800 dark:text-slate-100 text-xs">{r.checklist_title || '--'}</td>
                      <td className="py-1.5 text-center text-xs">
                        <RunStatusBadge status={r.status} />
                      </td>
                      <td className="py-1.5 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {r.score != null ? `${r.score}%` : '--'}
                      </td>
                      <td className="py-1.5 text-center text-xs text-slate-500">
                        {(r.started_at || r.completed_at) ? new Date((r.started_at || r.completed_at) as string).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {iRuns.length > 20 && (
                <p className="text-xs text-slate-400 mt-2 text-center">Mostrando 20 de {iRuns.length} ejecuciones</p>
              )}
            </div>
          );
        })}

        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
          <p>Generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  );
}

/* ======================== UTILITIES ======================== */

function AnswerStatusIcon({ status }: { status: string }) {
  if (status === 'PASS') return <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (status === 'FAIL') return <XCircle className="w-4 h-4 text-red-500 mx-auto" />;
  if (status === 'NA') return <MinusCircle className="w-4 h-4 text-slate-400 mx-auto" />;
  return <span className="text-xs text-slate-400">--</span>;
}

function KpiBox({ label, value, highlight, small }: { label: string; value: string | number; highlight?: boolean; small?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${highlight ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30'}`}>
      <p className={`${small ? 'text-lg' : 'text-2xl'} font-bold text-slate-800 dark:text-slate-100`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
