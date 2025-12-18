import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inspectionsApi, InspectionRoomDetail, InspectionAnswer } from '../lib/inspections-api';
import { useGPS } from '../lib/useGPS';
import { useNetworkStatus } from '../lib/useNetworkStatus';
import { CheckCircle, XCircle, MinusCircle, Upload, X, Camera, Save, CheckSquare, User, RotateCcw } from 'lucide-react';
import { NetworkStatusIndicator } from '../components/NetworkStatusIndicator';
import { SaveStatusModal } from '../components/SaveStatusModal';

export default function InspectionRoomStandalone() {
  const { cycleId, roomId } = useParams<{ cycleId: string; roomId: string }>();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
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
  const [saveModalStatus, setSaveModalStatus] = useState<{
    isOpen: boolean;
    status: 'saving' | 'success' | 'error' | 'offline';
    message?: string;
  }>({ isOpen: false, status: 'saving' });
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const inspectorInputRef = useRef<HTMLInputElement>(null);
  const { gps } = useGPS();

  useEffect(() => {
    loadInspectors();
  }, []);

  useEffect(() => {
    if (cycleId && roomId) {
      loadDetail();
    }
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
    } catch (error) {
      console.error('Error loading room:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectorNameChange = (name: string) => {
    setInspectorName(name);
  };

  const handleAnswerChange = async (questionId: number, answer: InspectionAnswer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer,
      },
    }));

    if (!detail?.meta.startedAt && cycleId && roomId) {
      try {
        const startTime = new Date().toISOString();
        await inspectionsApi.startInspection(Number(cycleId), Number(roomId), {
          inspectorName: inspectorName || undefined,
          startedAt: startTime,
          lat: gps?.lat,
          lng: gps?.lng,
        });

        setDetail(prev => prev ? {
          ...prev,
          meta: { ...prev.meta, startedAt: startTime }
        } : null);
      } catch (error) {
        console.error('Error starting inspection:', error);
      }
    }
  };

  const handleCommentChange = (questionId: number, comment: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        comment,
      },
    }));
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
  };

  const handleFinish = async () => {
    if (!cycleId || !roomId) return;

    const answeredQuestions = Object.values(answers).filter(a => a.answer);
    if (answeredQuestions.length === 0) {
      alert('Debes responder al menos una pregunta');
      return;
    }

    if (!inspectorName.trim()) {
      alert('Debes ingresar el nombre del inspector');
      inspectorInputRef.current?.focus();
      inspectorInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Verificar conexión a internet
    if (!isOnline) {
      setSaveModalStatus({
        isOpen: true,
        status: 'offline',
        message: 'No hay conexión a Internet. Por favor verifica tu conexión antes de finalizar.',
      });
      return;
    }

    setSaving(true);
    setSaveModalStatus({ isOpen: true, status: 'saving' });

    const allAnswered = detail?.questions.every(q => answers[q.questionId]?.answer);
    if (!allAnswered) {
      const confirm = window.confirm(
        'No has respondido todas las preguntas. ¿Deseas finalizar la inspección de todas formas?'
      );
      if (!confirm) {
        setSaving(false);
        setSaveModalStatus({ isOpen: false, status: 'saving' });
        return;
      }
    }

    try {
      const answersArray = Object.entries(answers).map(([qId, data]) => ({
        questionId: Number(qId),
        answer: data.answer,
        comment: data.comment || null,
        photoUrls: data.photoUrls,
      }));

      await inspectionsApi.finishInspection(Number(cycleId), Number(roomId), {
        inspectorName: inspectorName.trim(),
        startedAt: detail?.meta.startedAt || new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        lat: gps?.lat,
        lng: gps?.lng,
        answers: answersArray,
      });

      setSaveModalStatus({
        isOpen: true,
        status: 'success',
        message: `Inspección de habitación ${detail?.meta.roomNumber} finalizada correctamente`,
      });

      setTimeout(() => {
        navigate('/qr-scanner');
      }, 2500);
    } catch (error) {
      console.error('Error finishing inspection:', error);
      setSaveModalStatus({
        isOpen: true,
        status: 'error',
        message: 'No se pudo finalizar la inspección. Por favor intenta de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearInspection = () => {
    const confirmClear = window.confirm(
      '¿Estás seguro de que deseas limpiar el formulario? Podrás llenar las respuestas de nuevo. Los datos anteriores se mantendrán si no finalizas la nueva inspección.'
    );

    if (!confirmClear) return;

    const cleanAnswers: Record<number, { answer: InspectionAnswer; comment: string; photoUrls: string[] }> = {};
    detail?.questions.forEach(q => {
      cleanAnswers[q.questionId] = {
        answer: null,
        comment: '',
        photoUrls: [],
      };
    });

    setAnswers(cleanAnswers);
    setSaveModalStatus({
      isOpen: true,
      status: 'success',
      message: 'Formulario limpiado. Puedes realizar la inspección nuevamente.',
    });

    setTimeout(() => {
      setSaveModalStatus({ isOpen: false, status: 'saving' });
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Habitación no encontrada</div>
      </div>
    );
  }

  const hasInspectorName = inspectorName.trim() !== '';
  const answeredCount = Object.values(answers).filter(a => a.answer).length;
  const totalQuestions = detail.questions.length + 1;
  const progressCount = answeredCount + (hasInspectorName ? 1 : 0);
  const progress = Math.round((progressCount / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <NetworkStatusIndicator />
      <SaveStatusModal
        isOpen={saveModalStatus.isOpen}
        status={saveModalStatus.status}
        message={saveModalStatus.message}
        onClose={() => setSaveModalStatus({ ...saveModalStatus, isOpen: false })}
      />

      <div className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-cyan-600 shadow-xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white">
              <div className="text-3xl font-bold">Habitación {detail.meta.roomNumber}</div>
              <div className="text-blue-100 text-sm">Inspección 32 Puntos</div>
            </div>
          </div>
          <div className="bg-white/20 rounded-full h-3 backdrop-blur-sm">
            <div
              className="bg-white h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${progress}%` }}
            >
              <span className="text-xs font-bold text-blue-600">{progress}%</span>
            </div>
          </div>
          <div className="text-white text-sm mt-2 text-center">
            {progressCount} de {totalQuestions} completadas
          </div>
        </div>
      </div>

      {detail.meta.finishedAt && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-400 rounded-full p-2 flex-shrink-0">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-900 text-lg mb-1">
                  Esta habitación ya fue inspeccionada
                </h3>
                <p className="text-yellow-800 text-sm mb-3">
                  Inspección finalizada el {new Date(detail.meta.finishedAt).toLocaleString('es-MX', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {detail.meta.inspectorName && ` por ${detail.meta.inspectorName}`}
                </p>
                <button
                  onClick={handleClearInspection}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Limpiar y Realizar Nueva Inspección
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-4">
        <div
          className={`bg-white rounded-2xl shadow-xl overflow-visible transition-all ${
            hasInspectorName ? 'ring-2 ring-green-500' : 'ring-2 ring-orange-400'
          }`}
        >
          <div className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg ${
                hasInspectorName ? 'bg-green-500 text-white' : 'bg-orange-400 text-white'
              }`}>
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Nombre del Inspector
                  {inspectorsLoading && <span className="text-sm text-gray-500 ml-2 font-normal">(Cargando...)</span>}
                  {!inspectorsLoading && inspectors.length > 0 && <span className="text-sm text-green-600 ml-2 font-normal">({inspectors.length} disponibles)</span>}
                </h3>
                <p className="text-gray-600">Ingresa tu nombre completo para identificar esta inspección</p>
              </div>
            </div>

            <div className="relative">
              <input
                ref={inspectorInputRef}
                type="text"
                value={inspectorName}
                onChange={(e) => {
                  const value = e.target.value;
                  handleInspectorNameChange(value);

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
                placeholder="Ej: Juan Pérez"
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium"
                disabled={inspectorsLoading}
              />
              {inspectorsLoading && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              )}
              {showInspectorsList && filteredInspectors.length > 0 && (
                <div className="fixed z-[9999] mt-2 bg-white border-2 border-blue-300 rounded-xl shadow-2xl max-h-60 overflow-y-auto" style={{ width: inspectorInputRef.current?.offsetWidth || 'auto', top: (inspectorInputRef.current?.getBoundingClientRect().bottom || 0) + 8, left: inspectorInputRef.current?.getBoundingClientRect().left || 0 }}>
                  <div className="sticky top-0 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 border-b border-blue-200">
                    Selecciona un inspector ({filteredInspectors.length} disponibles)
                  </div>
                  {filteredInspectors.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleInspectorNameChange(name);
                        setShowInspectorsList(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors text-base text-gray-800 border-b border-gray-100 last:border-b-0 font-medium"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {detail.questions.map((question, index) => {
          const currentAnswer = answers[question.questionId];
          const isAnswered = !!currentAnswer?.answer;

          return (
            <div
              key={question.questionId}
              className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all ${
                isAnswered ? 'ring-2 ring-green-500' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg ${
                    isAnswered ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 2}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{question.pregunta}</h3>
                    <p className="text-gray-600">{question.problema}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    onClick={() => handleAnswerChange(question.questionId, 'OK')}
                    className={`py-4 rounded-xl font-bold text-lg transition-all flex flex-col items-center gap-2 ${
                      currentAnswer?.answer === 'OK'
                        ? 'bg-green-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <CheckCircle className="w-8 h-8" />
                    OK
                  </button>
                  <button
                    onClick={() => handleAnswerChange(question.questionId, 'FAIL')}
                    className={`py-4 rounded-xl font-bold text-lg transition-all flex flex-col items-center gap-2 ${
                      currentAnswer?.answer === 'FAIL'
                        ? 'bg-red-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <XCircle className="w-8 h-8" />
                    FAIL
                  </button>
                  <button
                    onClick={() => handleAnswerChange(question.questionId, 'NA')}
                    className={`py-4 rounded-xl font-bold text-lg transition-all flex flex-col items-center gap-2 ${
                      currentAnswer?.answer === 'NA'
                        ? 'bg-gray-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <MinusCircle className="w-8 h-8" />
                    N/A
                  </button>
                </div>

                {currentAnswer?.answer === 'FAIL' && (
                  <div className="space-y-3 mt-4 p-4 bg-red-50 rounded-xl">
                    <textarea
                      value={currentAnswer.comment}
                      onChange={(e) => handleCommentChange(question.questionId, e.target.value)}
                      placeholder="Describe el problema encontrado..."
                      className="w-full px-4 py-3 border-2 border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows={3}
                    />

                    <div className="flex flex-wrap gap-2">
                      {currentAnswer.photoUrls.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={url}
                            alt={`Foto ${idx + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border-2 border-red-300"
                          />
                          <button
                            onClick={() => handleRemovePhoto(question.questionId, url)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => fileInputRefs.current[question.questionId]?.click()}
                        disabled={uploadingPhotos[question.questionId]}
                        className="w-24 h-24 border-2 border-dashed border-red-300 rounded-lg flex flex-col items-center justify-center hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        {uploadingPhotos[question.questionId] ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                        ) : (
                          <>
                            <Camera className="w-8 h-8 text-red-500 mb-1" />
                            <span className="text-xs text-red-600 font-medium">Foto</span>
                          </>
                        )}
                      </button>

                      <input
                        ref={el => fileInputRefs.current[question.questionId] = el}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handlePhotoUpload(question.questionId, file);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-blue-500 shadow-2xl p-4 z-50">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={() => navigate('/qr-scanner')}
            className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-300 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleFinish}
            disabled={answeredCount === 0 || !inspectorName.trim() || saving}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <CheckSquare className="w-6 h-6" />
                Finalizar Inspección
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
