import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, Clock, User, MapPin, FileText, Trash2, CreditCard as Edit3, Ban, MoreVertical } from 'lucide-react';
import { flsApi, type FlsRunAnswer } from '../lib/flsApi';
import { RunStatusBadge, ScoreBadge, SeverityBadge } from '../components/FlsBadges';
import FlsNavigation from '../components/FlsNavigation';

export default function FlsRunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelNotes, setCancelNotes] = useState('');
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null);
  const [editAnswerValue, setEditAnswerValue] = useState('');
  const [editAnswerComment, setEditAnswerComment] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: run, isLoading } = useQuery({
    queryKey: ['fls-run', id],
    queryFn: () => flsApi.getRun(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => flsApi.cancelRun(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-runs'] });
      navigate('/fls/history');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => flsApi.cancelRun(id!, cancelNotes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-run', id] });
      queryClient.invalidateQueries({ queryKey: ['fls-runs'] });
      setShowCancelModal(false);
    },
  });

  const updateAnswerMutation = useMutation({
    mutationFn: ({ answerId, payload }: { answerId: string; payload: Partial<FlsRunAnswer> }) =>
      flsApi.updateAnswer(answerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-run', id] });
      setEditingAnswer(null);
    },
  });

  const deleteAnswerMutation = useMutation({
    mutationFn: (answerId: string) => flsApi.deleteAnswer(answerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fls-run', id] }),
  });

  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">Cargando...</div>;
  }

  if (!run) {
    return <div className="p-6 text-center text-red-500">Ejecución no encontrada.</div>;
  }

  const questions = run.questions || [];
  const answers = run.answers || [];
  const answerMap = new Map(answers.map((a) => [a.question_id, a]));
  const sections = [...new Set(questions.map((q) => q.section || 'General'))];

  return (
    <div>
      <FlsNavigation />

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/fls/history')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{run.checklist_title || run.checklist_code}</h2>
          <div className="flex items-center gap-3 mt-1">
            <RunStatusBadge status={run.status} />
            <ScoreBadge score={run.score} passed={run.passed} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {run.status === 'IN_PROGRESS' && (
            <Link to={`/fls/runs/${id}/execute`} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
              Continuar
            </Link>
          )}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <MoreVertical className="w-5 h-5 text-slate-500" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-20 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                  {(run.status === 'SCHEDULED' || run.status === 'IN_PROGRESS') && (
                    <button
                      onClick={() => { setMenuOpen(false); setShowCancelModal(true); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Cancelar Ejecución
                    </button>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); setShowDeleteModal(true); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetaCard icon={User} label="Inspector" value={run.inspector_name} />
        <MetaCard icon={MapPin} label="Área" value={run.target_area || run.target_asset_code || '-'} />
        <MetaCard icon={Clock} label="Inicio" value={run.started_at ? new Date(run.started_at).toLocaleString('es-MX') : '-'} />
        <MetaCard icon={CheckCircle2} label="Cierre" value={run.completed_at ? new Date(run.completed_at).toLocaleString('es-MX') : '-'} />
      </div>

      {run.notes && (
        <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex gap-2">
          <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{run.notes}</p>
        </div>
      )}

      {/* Answers by section */}
      <div className="space-y-6">
        {sections.map((section) => {
          const sectionQs = questions.filter((q) => (q.section || 'General') === section);
          return (
            <div key={section} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">{section}</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {sectionQs.map((q) => {
                  const a = answerMap.get(q.id!);
                  const isEditing = editingAnswer === q.id;
                  return (
                    <div key={q.id} className="px-5 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {a?.answer_status === 'PASS' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                          {a?.answer_status === 'FAIL' && <XCircle className="w-5 h-5 text-red-500" />}
                          {a?.answer_status === 'NA' && <MinusCircle className="w-5 h-5 text-slate-400" />}
                          {(!a || a.answer_status === 'INFO') && <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 dark:text-slate-100">{q.text}</p>
                          {a && !isEditing && (
                            <>
                              {a.answer_value && a.answer_status === 'INFO' && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{a.answer_value}</p>
                              )}
                              {a.numeric_value != null && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Valor: {a.numeric_value}</p>
                              )}
                              {a.comment && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">{a.comment}</p>
                              )}
                              {a.photo_urls && a.photo_urls.length > 0 && (
                                <div className="flex gap-2 mt-2">
                                  {a.photo_urls.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                      <img src={url} alt="" className="w-full h-full object-cover" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                          {/* Inline edit */}
                          {isEditing && a && (
                            <div className="mt-2 space-y-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                              <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400">Valor</label>
                                <input type="text" value={editAnswerValue} onChange={(e) => setEditAnswerValue(e.target.value)} className="input-fls text-sm" />
                              </div>
                              <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400">Comentario</label>
                                <input type="text" value={editAnswerComment} onChange={(e) => setEditAnswerComment(e.target.value)} className="input-fls text-sm" />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    updateAnswerMutation.mutate({
                                      answerId: q.id!,
                                      payload: { answer_value: editAnswerValue, comment: editAnswerComment },
                                    });
                                  }}
                                  className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                                >
                                  Guardar
                                </button>
                                <button onClick={() => setEditingAnswer(null)} className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg">
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <SeverityBadge severity={q.criticality} />
                          {a && !isEditing && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingAnswer(q.id!);
                                  setEditAnswerValue(a.answer_value || '');
                                  setEditAnswerComment(a.comment || '');
                                }}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Editar respuesta"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                              <button
                                onClick={() => { if (confirm('Eliminar esta respuesta?')) deleteAnswerMutation.mutate(q.id!); }}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Eliminar respuesta"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Signature */}
      {run.signature_url && (
        <div className="mt-6 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Firma</p>
          <img src={run.signature_url} alt="Firma" className="h-16 object-contain" />
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Cancelar Ejecución</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">La ejecución se marcará como cancelada y no se podrá continuar.</p>
            <textarea
              value={cancelNotes}
              onChange={(e) => setCancelNotes(e.target.value)}
              placeholder="Motivo de cancelación (opcional)..."
              rows={3}
              className="input-fls resize-none w-full mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                Volver
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">Eliminar Ejecución</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Esta acción eliminará permanentemente la ejecución y todas sus respuestas. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
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

function MetaCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{value}</p>
    </div>
  );
}
