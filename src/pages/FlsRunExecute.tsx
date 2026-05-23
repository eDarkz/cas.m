import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, MinusCircle, Camera, AlertTriangle, Save, Send, ArrowLeft, Loader2 } from 'lucide-react';
import { flsApi, type FlsRun, type FlsRunAnswer, type FlsQuestion, type AnswerStatus } from '../lib/flsApi';
import { SeverityBadge } from '../components/FlsBadges';

const IMGUR_CLIENT_ID = '546c25a59c58ad7';

async function uploadToImgur(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}` },
    body: formData,
  });
  if (!response.ok) throw new Error('Error al subir imagen');
  const data = await response.json();
  return data.data.link;
}

export default function FlsRunExecute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: run, isLoading } = useQuery({
    queryKey: ['fls-run', id],
    queryFn: () => flsApi.getRun(id!),
    enabled: !!id,
  });

  const [answers, setAnswers] = useState<Record<string, FlsRunAnswer>>({});
  const answersRef = useRef<Record<string, FlsRunAnswer>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlight = useRef(false);
  const dirty = useRef(false);

  const questions = run?.questions || [];
  const sections = [...new Set(questions.map((q) => q.section || 'General'))];

  useEffect(() => {
    if (run?.answers) {
      const map: Record<string, FlsRunAnswer> = {};
      run.answers.forEach((a) => { map[a.question_id] = a; });
      setAnswers(map);
      answersRef.current = map;
    }
  }, [run]);

  const doSave = useCallback(async () => {
    if (!id) return;
    const list = Object.values(answersRef.current).filter((a) => a.answer_value);
    if (list.length === 0) return;
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    dirty.current = false;
    setSaveStatus('saving');
    try {
      await flsApi.saveAnswers(id, list);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus((s) => s === 'saved' ? 'idle' : s), 2000);
    } catch {
      setSaveStatus('error');
      dirty.current = true;
    } finally {
      saveInFlight.current = false;
      if (dirty.current) {
        autosaveTimer.current = setTimeout(doSave, 2000);
      }
    }
  }, [id]);

  useEffect(() => {
    const saveBeforeLeave = () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      if (!dirty.current || !id) return;
      const list = Object.values(answersRef.current).filter((a) => a.answer_value);
      if (list.length > 0) {
        navigator.sendBeacon(
          `https://bsupers.fly.dev/v1/fls/runs/${id}/answers`,
          new Blob([JSON.stringify({ answers: list })], { type: 'application/json' })
        );
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') saveBeforeLeave();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', saveBeforeLeave);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', saveBeforeLeave);
      saveBeforeLeave();
    };
  }, [id]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      const list = Object.values(answersRef.current).filter((a) => a.answer_value);
      if (list.length > 0) await flsApi.saveAnswers(id!, list);
      return flsApi.completeRun(id!, {
        completed_at: new Date().toISOString(),
        inspector_id: run!.inspector_id,
        inspector_name: run!.inspector_name,
        notes: completeNotes || undefined,
        signature_url: signatureUrl || undefined,
        create_issues: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fls-run', id] });
      queryClient.invalidateQueries({ queryKey: ['fls-runs'] });
      queryClient.invalidateQueries({ queryKey: ['fls-dashboard'] });
      navigate(`/fls/runs/${id}`);
    },
  });

  const triggerAutosave = useCallback(() => {
    dirty.current = true;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(doSave, 2000);
  }, [doSave]);

  function setAnswer(questionId: string, value: string, status: AnswerStatus, numericValue?: number | null) {
    const updated: FlsRunAnswer = {
      question_id: questionId,
      answer_value: value,
      numeric_value: numericValue ?? null,
      answer_status: status,
      comment: answersRef.current[questionId]?.comment || '',
      photo_urls: answersRef.current[questionId]?.photo_urls || [],
      answered_by: run?.inspector_id || 1,
    };
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: updated };
      answersRef.current = next;
      return next;
    });
    triggerAutosave();
  }

  function setAnswerComment(questionId: string, comment: string) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: { ...prev[questionId], comment } };
      answersRef.current = next;
      return next;
    });
    triggerAutosave();
  }

  function setAnswerPhotos(questionId: string, urls: string[]) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: { ...prev[questionId], photo_urls: urls } };
      answersRef.current = next;
      return next;
    });
    triggerAutosave();
  }

  function handleManualSave() {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    doSave();
  }

  function getMissingItems(): { questionId: string; section: string; label: string; reason: string }[] {
    const missing: { questionId: string; section: string; label: string; reason: string }[] = [];
    for (const q of questions) {
      if (!q.required) continue;
      const a = answers[q.id!];
      const sec = q.section || 'General';
      const label = q.text || q.code || `Pregunta ${q.id}`;
      if (!a || !a.answer_value) {
        missing.push({ questionId: q.id!, section: sec, label, reason: 'Sin respuesta' });
        continue;
      }
    }
    if (run?.requires_signature && !signatureUrl) {
      missing.push({ questionId: '__signature__', section: '', label: 'Firma', reason: 'Firma requerida' });
    }
    return missing;
  }

  function canComplete(): boolean {
    return getMissingItems().length === 0;
  }

  const answeredCount = Object.values(answers).filter((a) => a.answer_value).length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">Cargando ejecución...</div>;
  }

  if (!run) {
    return <div className="p-6 text-center text-red-500">Ejecución no encontrada.</div>;
  }

  if (run.status === 'COMPLETED' || run.status === 'CANCELLED') {
    navigate(`/fls/runs/${id}`);
    return null;
  }

  const sectionQuestions = questions.filter((q) => (q.section || 'General') === sections[currentSection]);

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 -mx-4 sm:-mx-6 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/fls/history')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{run.checklist_title || 'Checklist'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{run.inspector_name} · {run.target_area || run.target_asset_code || ''}</p>
          </div>
          <button onClick={handleManualSave} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 relative" title="Guardar">
            <Save className={`w-5 h-5 ${
              saveStatus === 'saving' ? 'text-amber-500 animate-pulse' :
              saveStatus === 'saved' ? 'text-emerald-500' :
              saveStatus === 'error' ? 'text-red-500' :
              'text-slate-500 dark:text-slate-400'
            }`} />
            {saveStatus === 'saved' && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />}
            {saveStatus === 'error' && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
        </div>

        {/* Progress */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{answeredCount}/{questions.length} respondidas</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Section Tabs */}
        {sections.length > 1 && (
          <div className="flex gap-1 mt-3 overflow-x-auto pb-2 flex-wrap">
            {sections.map((sec, i) => {
              const secQs = questions.filter((q) => (q.section || 'General') === sec);
              const secAnswered = secQs.filter((q) => answers[q.id!]?.answer_value).length;
              const allDone = secAnswered === secQs.length;
              return (
                <button
                  key={sec}
                  onClick={() => setCurrentSection(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    currentSection === i
                      ? 'bg-red-600 text-white'
                      : allDone
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {sec} ({secAnswered}/{secQs.length})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-4 px-1">
        {sectionQuestions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q}
            answer={answers[q.id!]}
            onAnswer={(val, status, num) => setAnswer(q.id!, val, status, num)}
            onComment={(c) => setAnswerComment(q.id!, c)}
            onPhotos={(urls) => setAnswerPhotos(q.id!, urls)}
          />
        ))}
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-4 py-3 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {currentSection > 0 && (
            <button onClick={() => setCurrentSection(currentSection - 1)} className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">
              Anterior
            </button>
          )}
          <div className="flex-1" />
          {currentSection < sections.length - 1 ? (
            <button onClick={() => setCurrentSection(currentSection + 1)} className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              Siguiente
            </button>
          ) : (
            <button onClick={() => { if (canComplete()) { setShowComplete(true); } else { setShowMissing(true); } }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
              <Send className="w-4 h-4" />
              Completar
            </button>
          )}
        </div>
      </div>

      {/* Missing Items Modal */}
      {showMissing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowMissing(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Pendientes para completar</h3>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {getMissingItems().map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (item.questionId === '__signature__') {
                      setShowMissing(false);
                      setShowComplete(true);
                      return;
                    }
                    const secIdx = sections.indexOf(item.section);
                    if (secIdx >= 0) setCurrentSection(secIdx);
                    setShowMissing(false);
                    setTimeout(() => {
                      const el = document.getElementById(`q-${item.questionId}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.section}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 whitespace-nowrap">{item.reason}</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowMissing(false)} className="mt-4 w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showComplete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowComplete(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Completar Ejecución</h3>

            {run.requires_signature && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Firma</label>
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setSignatureUploading(true);
                    try {
                      const url = await uploadToImgur(file);
                      setSignatureUrl(url);
                    } catch {
                      alert('Error al subir firma.');
                    } finally {
                      setSignatureUploading(false);
                    }
                  }}
                />
                {signatureUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={signatureUrl} alt="Firma" className="h-12 rounded border border-slate-200 dark:border-slate-700" />
                    <button onClick={() => setSignatureUrl('')} className="text-xs text-red-600 hover:underline">Quitar</button>
                  </div>
                ) : (
                  <button
                    onClick={() => signatureInputRef.current?.click()}
                    disabled={signatureUploading}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
                  >
                    {signatureUploading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...</>
                    ) : (
                      <><Camera className="w-3.5 h-3.5" /> Capturar Firma</>
                    )}
                  </button>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notas de cierre</label>
              <textarea value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} rows={3} className="input-fls resize-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowComplete(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300">
                Cancelar
              </button>
              <button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending || (run.requires_signature && !signatureUrl)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {completeMutation.isPending ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question: q,
  answer,
  onAnswer,
  onComment,
  onPhotos,
}: {
  question: FlsQuestion;
  answer?: FlsRunAnswer;
  onAnswer: (val: string, status: AnswerStatus, num?: number | null) => void;
  onComment: (c: string) => void;
  onPhotos: (urls: string[]) => void;
}) {
  const [showComment, setShowComment] = useState(!!answer?.comment);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isFail = answer?.answer_status === 'FAIL';
  const needsPhoto = q.require_photo === 'ALWAYS' ||
    (q.require_photo === 'ON_FAIL' && isFail) ||
    (q.require_photo === 'ON_PASS' && answer?.answer_status === 'PASS') ||
    (q.require_photo === 'ON_NA' && answer?.answer_status === 'NA');

  function handleNumericChange(val: string) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    let status: AnswerStatus = 'INFO';
    if (q.min_value != null && q.max_value != null) {
      status = (num >= q.min_value && num <= q.max_value) ? 'PASS' : 'FAIL';
    }
    onAnswer(val, status, num);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen es muy grande. Máximo 10MB.');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadToImgur(file);
      const current = answer?.photo_urls || [];
      onPhotos([...current, url]);
    } catch {
      alert('Error al subir la imagen. Intenta de nuevo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div id={`q-${q.id}`} className={`bg-white dark:bg-slate-800 border rounded-xl p-4 transition-all ${
      isFail ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' :
      answer?.answer_status === 'PASS' ? 'border-emerald-200 dark:border-emerald-800' :
      'border-slate-200 dark:border-slate-700'
    }`}>
      <div className="flex items-start gap-3 mb-3">
        <span className="text-xs font-mono text-slate-400 mt-0.5">{q.order}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{q.text}</p>
          {q.help_text && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{q.help_text}</p>}
        </div>
        <SeverityBadge severity={q.criticality} />
      </div>

      {/* Response Input */}
      <div className="ml-7">
        {(q.response_type === 'PASS_FAIL_NA' || q.response_type === 'YES_NO_NA' || q.response_type === 'OK_FAIL') && (
          <div className="flex gap-2">
            <ToggleBtn active={answer?.answer_status === 'PASS'} onClick={() => onAnswer('PASS', 'PASS')} color="emerald" icon={<CheckCircle2 className="w-4 h-4" />}>
              {q.response_type === 'YES_NO_NA' ? 'Sí' : q.response_type === 'OK_FAIL' ? 'OK' : 'Cumple'}
            </ToggleBtn>
            <ToggleBtn active={answer?.answer_status === 'FAIL'} onClick={() => onAnswer('FAIL', 'FAIL')} color="red" icon={<XCircle className="w-4 h-4" />}>
              {q.response_type === 'YES_NO_NA' ? 'No' : q.response_type === 'OK_FAIL' ? 'Falla' : 'No cumple'}
            </ToggleBtn>
            {q.response_type !== 'OK_FAIL' && (
              <ToggleBtn active={answer?.answer_status === 'NA'} onClick={() => onAnswer('NA', 'NA')} color="slate" icon={<MinusCircle className="w-4 h-4" />}>
                N/A
              </ToggleBtn>
            )}
          </div>
        )}

        {q.response_type === 'NUMBER' && (
          <div>
            <input
              type="number"
              value={answer?.answer_value || ''}
              onChange={(e) => handleNumericChange(e.target.value)}
              placeholder={q.min_value != null ? `${q.min_value} - ${q.max_value}` : 'Valor'}
              className="input-fls w-32"
            />
            {q.min_value != null && q.max_value != null && (
              <span className="ml-2 text-xs text-slate-500">Rango: {q.min_value} - {q.max_value}</span>
            )}
          </div>
        )}

        {q.response_type === 'TEXT' && (
          <textarea
            value={answer?.answer_value || ''}
            onChange={(e) => onAnswer(e.target.value, 'INFO')}
            rows={2}
            className="input-fls resize-none w-full"
          />
        )}

        {q.response_type === 'SELECT' && (
          <select
            value={answer?.answer_value || ''}
            onChange={(e) => {
              const val = e.target.value;
              const status: AnswerStatus = q.expected_answer ? (val === q.expected_answer ? 'PASS' : 'FAIL') : 'INFO';
              onAnswer(val, status);
            }}
            className="input-fls"
          >
            <option value="">Seleccionar...</option>
            {q.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {q.response_type === 'MULTI_SELECT' && (
          <div className="flex flex-wrap gap-2">
            {q.options?.map((o) => {
              const selected = (answer?.answer_value || '').split(',').includes(o.value);
              return (
                <button
                  key={o.value}
                  onClick={() => {
                    const current = (answer?.answer_value || '').split(',').filter(Boolean);
                    const updated = selected ? current.filter((v) => v !== o.value) : [...current, o.value];
                    onAnswer(updated.join(','), 'INFO');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selected ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        )}

        {q.response_type === 'RATING' && (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onAnswer(String(n), n >= 3 ? 'PASS' : 'FAIL', n)}
                className={`w-9 h-9 rounded-lg text-sm font-bold border transition-colors ${
                  Number(answer?.answer_value) === n
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {q.response_type === 'DATE' && (
          <input type="date" value={answer?.answer_value || ''} onChange={(e) => onAnswer(e.target.value, 'INFO')} className="input-fls" />
        )}

        {q.response_type === 'TIME' && (
          <input type="time" value={answer?.answer_value || ''} onChange={(e) => onAnswer(e.target.value, 'INFO')} className="input-fls" />
        )}

        {/* Critical Fail Alert */}
        {isFail && q.criticality === 'CRITICAL' && (
          <div className="mt-2 p-2 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Falla crítica detectada. Se generará un hallazgo automáticamente.
          </div>
        )}

        {/* Photo requirement */}
        {needsPhoto && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <Camera className="w-3.5 h-3.5" />
              <span>Foto requerida</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  Tomar / Seleccionar Foto
                </>
              )}
            </button>
            {answer?.photo_urls && answer.photo_urls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {answer.photo_urls.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => onPhotos(answer.photo_urls!.filter((_, idx) => idx !== i))}
                      className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white flex items-center justify-center text-xs rounded-bl-lg"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comment toggle */}
        <div className="mt-2">
          {!showComment ? (
            <button onClick={() => setShowComment(true)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400">
              + Comentario
            </button>
          ) : (
            <input
              type="text"
              value={answer?.comment || ''}
              onChange={(e) => onComment(e.target.value)}
              placeholder="Comentario..."
              className="input-fls text-xs w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleBtn({ active, onClick, color, icon, children }: {
  active: boolean; onClick: () => void; color: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    emerald: active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-emerald-400',
    red: active ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-red-400',
    slate: active ? 'bg-slate-600 text-white border-slate-600' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400',
  };
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${colorMap[color]}`}>
      {icon}
      {children}
    </button>
  );
}