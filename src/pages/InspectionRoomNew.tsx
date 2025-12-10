import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inspectionsApi, InspectionRoomDetail, InspectionAnswer } from '../lib/inspections-api';
import { useGPS } from '../lib/useGPS';
import { ArrowLeft, Save, CheckCircle, Upload, X } from 'lucide-react';

export default function InspectionRoomNew() {
  const { cycleId, roomId } = useParams<{ cycleId: string; roomId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<InspectionRoomDetail | null>(null);
  const [inspectorName, setInspectorName] = useState('');
  const [inspectors, setInspectors] = useState<string[]>([]);
  const [inspectorsLoading, setInspectorsLoading] = useState(true);
  const [showInspectorsList, setShowInspectorsList] = useState(false);
  const [filteredInspectors, setFilteredInspectors] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, { answer: InspectionAnswer; comment: string; photoUrls: string[] }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState<Record<number, boolean>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const { latitude, longitude } = useGPS();

  useEffect(() => {
    loadInspectors();
  }, []);

  useEffect(() => {
    if (cycleId && roomId) {
      loadDetail();
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [cycleId, roomId]);

  const loadInspectors = async () => {
    try {
      console.log('Starting to load inspectors...');
      const response = await fetch('https://bsupers.fly.dev/v1/inspections/inspectors', {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });
      console.log('Response status:', response.status);
      if (!response.ok) throw new Error('Failed to load inspectors');
      const data = await response.json();
      console.log('Raw data:', data);
      const names = data.map((item: { label: string }) => item.label);
      console.log('Parsed names:', names);
      setInspectors(names);
      setFilteredInspectors(names);
    } catch (error) {
      console.error('Error loading inspectors:', error);
    } finally {
      setInspectorsLoading(false);
    }
  };

  const loadDetail = async () => {
    if (!cycleId || !roomId) return;

    try {
      const data = await inspectionsApi.getRoomDetail(Number(cycleId), Number(roomId));
      setDetail(data);

      const answersMap: typeof answers = {};
      data.questions.forEach(q => {
        answersMap[q.questionId] = {
          answer: q.answer,
          comment: q.comment || '',
          photoUrls: q.photoUrls || [],
        };
      });
      setAnswers(answersMap);

      setInspectorName(data.meta.inspectorName || '');

      if (!data.meta.startedAt) {
        const startTime = new Date().toISOString();
        await inspectionsApi.startInspection(Number(cycleId), Number(roomId), {
          inspectorName: data.meta.inspectorName || undefined,
          startedAt: startTime,
          lat: latitude || undefined,
          lng: longitude || undefined,
        });
        data.meta.startedAt = startTime;
      }
    } catch (error) {
      console.error('Error loading room:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSave = async () => {
    if (!cycleId || !roomId) return;

    try {
      const answersArray = Object.entries(answers).map(([qId, data]) => ({
        questionId: Number(qId),
        answer: data.answer,
        comment: data.comment || null,
        photoUrls: data.photoUrls,
      }));

      await inspectionsApi.autosaveInspection(Number(cycleId), Number(roomId), {
        inspectorName: inspectorName || undefined,
        startedAt: detail?.meta.startedAt || new Date().toISOString(),
        lat: latitude || undefined,
        lng: longitude || undefined,
        answers: answersArray,
      });
    } catch (error) {
      console.error('Error auto-saving:', error);
    }
  };

  const handleAnswerChange = (questionId: number, answer: InspectionAnswer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer,
      },
    }));
    handleAutoSave();
  };

  const handleCommentChange = (questionId: number, comment: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        comment,
      },
    }));
    handleAutoSave();
  };

  const handlePhotoUpload = async (questionId: number, file: File) => {
    setUploadingPhotos(prev => ({ ...prev, [questionId]: true }));

    try {
      const formdata = new FormData();
      formdata.append('image', file);

      const response = await fetch('https://api.imgur.com/3/image/', {
        method: 'POST',
        headers: {
          Authorization: 'Client-ID 02a4ea9a28b0429',
        },
        body: formdata,
      });

      const data = await response.json();

      if (data.status === 200 && data.data?.link) {
        setAnswers(prev => ({
          ...prev,
          [questionId]: {
            ...prev[questionId],
            photoUrls: [...(prev[questionId]?.photoUrls || []), data.data.link],
          },
        }));
        handleAutoSave();
      } else {
        alert('Error al subir la imagen');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleRemovePhoto = (questionId: number, photoUrl: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        photoUrls: prev[questionId].photoUrls.filter(url => url !== photoUrl),
      },
    }));
    handleAutoSave();
  };

  const handleFinish = async () => {
    if (!cycleId || !roomId) return;

    const unanswered = detail?.questions.filter(q => !answers[q.questionId]?.answer);
    if (unanswered && unanswered.length > 0) {
      const proceed = window.confirm(
        `Hay ${unanswered.length} pregunta(s) sin responder. ¿Deseas finalizar de todas formas?`
      );
      if (!proceed) return;
    }

    setSaving(true);

    try {
      const answersArray = Object.entries(answers).map(([qId, data]) => ({
        questionId: Number(qId),
        answer: data.answer,
        comment: data.comment || null,
        photoUrls: data.photoUrls,
      }));

      await inspectionsApi.finishInspection(Number(cycleId), Number(roomId), {
        inspectorName: inspectorName || undefined,
        startedAt: detail?.meta.startedAt || undefined,
        finishedAt: new Date().toISOString(),
        lat: latitude || undefined,
        lng: longitude || undefined,
        answers: answersArray,
      });

      navigate(`/inspecciones/ciclos/${cycleId}`);
    } catch (error) {
      console.error('Error finishing inspection:', error);
      alert('Error al finalizar la inspección');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Habitación no encontrada</p>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter(a => a.answer).length;
  const totalCount = detail.questions.length;
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/inspecciones/ciclos/${cycleId}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">
            Habitación {detail.meta.roomNumber}
          </h2>
          <p className="text-sm text-gray-600">
            {answeredCount} de {totalCount} preguntas respondidas ({progress}%)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-lg">
        <div className="mb-2 relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Inspector
            {inspectorsLoading && <span className="text-xs text-gray-500 ml-2">(Cargando inspectores...)</span>}
            {!inspectorsLoading && inspectors.length > 0 && <span className="text-xs text-green-600 ml-2">({inspectors.length} inspectores disponibles)</span>}
          </label>
          <div className="relative">
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => {
                const value = e.target.value;
                setInspectorName(value);
                scheduleAutoSave();

                if (value.length > 0) {
                  const filtered = inspectors.filter(name =>
                    name.toLowerCase().includes(value.toLowerCase())
                  );
                  setFilteredInspectors(filtered);
                  setShowInspectorsList(filtered.length > 0);
                } else {
                  setFilteredInspectors(inspectors);
                  setShowInspectorsList(inspectors.length > 0);
                }
              }}
              onFocus={() => {
                console.log('Input focused, inspectors:', inspectors.length);
                if (inspectorName.length === 0) {
                  setFilteredInspectors(inspectors);
                  setShowInspectorsList(inspectors.length > 0);
                } else if (filteredInspectors.length > 0) {
                  setShowInspectorsList(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setShowInspectorsList(false), 300);
              }}
              placeholder="Ingresa tu nombre completo para identificar esta inspección"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={inspectorsLoading}
            />
            {showInspectorsList && filteredInspectors.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border-2 border-cyan-300 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                <div className="sticky top-0 bg-cyan-50 px-4 py-2 text-xs font-medium text-cyan-800 border-b border-cyan-200">
                  Selecciona un inspector ({filteredInspectors.length})
                </div>
                {filteredInspectors.map((name, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setInspectorName(name);
                      setShowInspectorsList(false);
                      scheduleAutoSave();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-cyan-50 transition-colors text-sm text-gray-800 border-b border-gray-100 last:border-b-0 font-medium"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {detail.questions.map((question, index) => {
          const answer = answers[question.questionId] || {
            answer: null,
            comment: '',
            photoUrls: [],
          };

          return (
            <div
              key={question.questionId}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-1">{question.pregunta}</h3>
                  <p className="text-sm text-gray-600">{question.problema}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => handleAnswerChange(question.questionId, 'OK')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                    answer.answer === 'OK'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  OK
                </button>
                <button
                  onClick={() => handleAnswerChange(question.questionId, 'FAIL')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                    answer.answer === 'FAIL'
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  FAIL
                </button>
                <button
                  onClick={() => handleAnswerChange(question.questionId, 'NA')}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                    answer.answer === 'NA'
                      ? 'bg-gray-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  N/A
                </button>
              </div>

              {answer.answer === 'FAIL' && (
                <div className="space-y-3">
                  <textarea
                    value={answer.comment}
                    onChange={(e) => handleCommentChange(question.questionId, e.target.value)}
                    placeholder="Describe el problema..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />

                  <div className="flex flex-wrap gap-2">
                    {answer.photoUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Foto ${idx + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                        />
                        <button
                          onClick={() => handleRemovePhoto(question.questionId, url)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <input
                      ref={(el) => (fileInputRefs.current[question.questionId] = el)}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handlePhotoUpload(question.questionId, file);
                          if (fileInputRefs.current[question.questionId]) {
                            fileInputRefs.current[question.questionId]!.value = '';
                          }
                        }
                      }}
                    />

                    <button
                      onClick={() => fileInputRefs.current[question.questionId]?.click()}
                      disabled={uploadingPhotos[question.questionId]}
                      className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {uploadingPhotos[question.questionId] ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500">Subir</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-2xl">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={() => navigate(`/inspecciones/ciclos/${cycleId}`)}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Salir sin Finalizar
          </button>
          <button
            onClick={handleFinish}
            disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Finalizando...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Finalizar Inspección
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
