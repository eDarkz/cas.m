import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inspectionsApi, InspectionRoomDetail, InspectionAnswer } from '../lib/inspections-api';
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, AlertCircle, User, Clock, MapPin, Image as ImageIcon } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import LocationMapModal from '../components/LocationMapModal';
import ImageGalleryModal from '../components/ImageGalleryModal';

export default function InspectionRoomSummary() {
  const { cycleId, roomId } = useParams<{ cycleId: string; roomId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<InspectionRoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Array<{ id: number; url: string; created_at: string }> | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (cycleId && roomId) {
      loadDetail();
    }
  }, [cycleId, roomId]);

  const loadDetail = async () => {
    if (!cycleId || !roomId) return;

    try {
      const data = await inspectionsApi.getRoomDetail(Number(cycleId), Number(roomId));
      setDetail(data);
    } catch (error) {
      console.error('Error loading room:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HamsterLoader />
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

  const statusColors = {
    SIN_INSPECCIONAR: { bg: 'bg-gray-100', text: 'text-gray-700', icon: MinusCircle },
    INCOMPLETA: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock },
    CON_FALLAS: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
    SIN_FALLAS: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  };

  const statusInfo = statusColors[detail.meta.status];
  const StatusIcon = statusInfo.icon;

  const answeredQuestions = detail.questions.filter(q => q.answer);
  const okCount = detail.questions.filter(q => q.answer === 'OK').length;
  const failCount = detail.questions.filter(q => q.answer === 'FAIL').length;
  const naCount = detail.questions.filter(q => q.answer === 'NA').length;

  const getAnswerIcon = (answer: InspectionAnswer) => {
    switch (answer) {
      case 'OK':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'FAIL':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'NA':
        return <MinusCircle className="w-6 h-6 text-gray-600" />;
      default:
        return <MinusCircle className="w-6 h-6 text-gray-300" />;
    }
  };

  const getAnswerBadge = (answer: InspectionAnswer) => {
    switch (answer) {
      case 'OK':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">OK</span>;
      case 'FAIL':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white">FAIL</span>;
      case 'NA':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500 text-white">N/A</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-300 text-gray-600">Sin responder</span>;
    }
  };

  const duration = detail.meta.startedAt && detail.meta.finishedAt
    ? Math.round((new Date(detail.meta.finishedAt).getTime() - new Date(detail.meta.startedAt).getTime()) / 60000)
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
          <p className="text-sm text-gray-600">Resumen de Inspección</p>
        </div>
        <div className={`px-4 py-2 rounded-lg ${statusInfo.bg} flex items-center gap-2`}>
          <StatusIcon className={`w-5 h-5 ${statusInfo.text}`} />
          <span className={`font-bold ${statusInfo.text}`}>{detail.meta.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-cyan-600" />
            <span className="text-sm font-medium text-gray-600">Inspector</span>
          </div>
          <p className="text-lg font-bold text-gray-800">
            {detail.meta.inspectorName || 'No especificado'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-cyan-600" />
            <span className="text-sm font-medium text-gray-600">Duración</span>
          </div>
          <p className="text-lg font-bold text-gray-800">
            {duration ? `${duration} min` : 'No finalizada'}
          </p>
        </div>

        <button
          onClick={() => {
            if (detail.meta.lastLat && detail.meta.lastLng) {
              setShowMapModal(true);
            }
          }}
          disabled={!detail.meta.lastLat || !detail.meta.lastLng}
          className={`bg-white rounded-xl border border-gray-200 p-6 shadow-lg text-left w-full ${
            detail.meta.lastLat && detail.meta.lastLng
              ? 'hover:border-cyan-500 hover:shadow-xl transition-all cursor-pointer'
              : 'cursor-not-allowed opacity-60'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-5 h-5 text-cyan-600" />
            <span className="text-sm font-medium text-gray-600">Ubicación</span>
            {detail.meta.lastLat && detail.meta.lastLng && (
              <span className="ml-auto text-xs text-cyan-600 font-semibold">Click para ver mapa</span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-800">
            {detail.meta.lastLat && detail.meta.lastLng
              ? `${typeof detail.meta.lastLat === 'number' ? detail.meta.lastLat.toFixed(6) : detail.meta.lastLat}, ${typeof detail.meta.lastLng === 'number' ? detail.meta.lastLng.toFixed(6) : detail.meta.lastLng}`
              : 'No disponible'}
          </p>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-lg">
          <div className="text-3xl font-bold text-gray-800 mb-1">
            {answeredQuestions.length}/{detail.questions.length}
          </div>
          <div className="text-sm text-gray-600">Respondidas</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 shadow-lg text-white">
          <div className="text-3xl font-bold mb-1">{okCount}</div>
          <div className="text-sm opacity-90">OK</div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 shadow-lg text-white">
          <div className="text-3xl font-bold mb-1">{failCount}</div>
          <div className="text-sm opacity-90">FAIL</div>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-4 shadow-lg text-white">
          <div className="text-3xl font-bold mb-1">{naCount}</div>
          <div className="text-sm opacity-90">N/A</div>
        </div>
      </div>

      {detail.meta.startedAt && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-900">Inicio:</span>{' '}
              <span className="text-blue-800">
                {new Date(detail.meta.startedAt).toLocaleString('es-MX')}
              </span>
            </div>
            {detail.meta.finishedAt && (
              <div>
                <span className="font-medium text-blue-900">Fin:</span>{' '}
                <span className="text-blue-800">
                  {new Date(detail.meta.finishedAt).toLocaleString('es-MX')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-800">Detalle de Inspección</h3>
        {detail.questions.map((question, index) => (
          <div
            key={question.questionId}
            className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">{question.pregunta}</h4>
                    <p className="text-sm text-gray-600">{question.problema}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getAnswerIcon(question.answer)}
                    {getAnswerBadge(question.answer)}
                  </div>
                </div>

                {question.comment && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-900 mb-1">Comentario:</p>
                    <p className="text-sm text-red-800">{question.comment}</p>
                  </div>
                )}

                {question.photoUrls && question.photoUrls.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Fotos:</p>
                    <div className="flex flex-wrap gap-2">
                      {question.photoUrls.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const images = question.photoUrls!.map((u, i) => ({
                              id: i,
                              url: u,
                              created_at: new Date().toISOString()
                            }));
                            setSelectedImages(images);
                            setSelectedImageIndex(idx);
                          }}
                          className="relative group"
                        >
                          <img
                            src={url}
                            alt={`Foto ${idx + 1}`}
                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 hover:border-cyan-500 hover:scale-105 transition-all cursor-pointer"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2">
                              <ImageIcon className="w-5 h-5 text-gray-800" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedImages && (
        <ImageGalleryModal
          images={selectedImages}
          onClose={() => setSelectedImages(null)}
          initialIndex={selectedImageIndex}
        />
      )}

      {detail.meta.lastLat && detail.meta.lastLng && (
        <LocationMapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          lat={typeof detail.meta.lastLat === 'number' ? detail.meta.lastLat : parseFloat(detail.meta.lastLat)}
          lng={typeof detail.meta.lastLng === 'number' ? detail.meta.lastLng : parseFloat(detail.meta.lastLng)}
          roomNumber={detail.roomNumber}
        />
      )}
    </div>
  );
}
