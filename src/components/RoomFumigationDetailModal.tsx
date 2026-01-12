import { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Image as ImageIcon,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Droplets,
} from 'lucide-react';
import { RoomFumigation, RoomFumigationStatus, ServiceType } from '../lib/fumigationApi';

interface Props {
  roomFumigation: RoomFumigation;
  onClose: () => void;
  onUpdate?: () => void;
}

const STATUS_STYLES: Record<RoomFumigationStatus, { bg: string; text: string; border: string }> = {
  PENDIENTE: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  NO_APLICA: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  PREVENTIVO: 'Preventivo',
  CORRECTIVO: 'Correctivo',
  NEBULIZACION: 'Nebulizacion',
  ASPERSION: 'Aspersion',
  GEL: 'Gel',
  OTRO: 'Otro',
};

export default function RoomFumigationDetailModal({ roomFumigation, onClose }: Props) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showFullImage, setShowFullImage] = useState(false);

  const statusStyle = STATUS_STYLES[roomFumigation.status];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No registrada';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const photos = roomFumigation.photos || [];

  const nextPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 0) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Habitacion {roomFumigation.room_number}
              </h2>
              <p className="text-sm text-gray-500">
                {roomFumigation.area || 'Sin area asignada'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div
                className={`px-4 py-2 rounded-lg ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}
              >
                <div className="flex items-center gap-2">
                  {roomFumigation.status === 'COMPLETADA' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : roomFumigation.status === 'PENDIENTE' ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                  <span className="font-semibold">{roomFumigation.status}</span>
                </div>
              </div>
              {roomFumigation.service_type && (
                <div className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium flex items-center gap-1.5">
                  <Droplets className="w-4 h-4" />
                  {SERVICE_LABELS[roomFumigation.service_type]}
                </div>
              )}
            </div>

            {roomFumigation.fumigated_at && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs uppercase font-medium">Fecha de fumigacion</span>
                </div>
                <p className="font-medium text-gray-900">
                  {formatDate(roomFumigation.fumigated_at)}
                </p>
              </div>
            )}

            {(roomFumigation.fumigator_nombre || roomFumigation.fumigator_empresa) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <User className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">Fumigador</span>
                  </div>
                  <p className="font-medium text-gray-900">
                    {roomFumigation.fumigator_nombre || 'No especificado'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">Empresa</span>
                  </div>
                  <p className="font-medium text-gray-900">
                    {roomFumigation.fumigator_empresa || 'No especificada'}
                  </p>
                </div>
              </div>
            )}

            {roomFumigation.utm_x && roomFumigation.utm_y && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs uppercase font-medium">Coordenadas GPS</span>
                </div>
                <p className="font-mono text-sm text-gray-900 mb-3">
                  {Number(roomFumigation.utm_x).toFixed(6)}, {Number(roomFumigation.utm_y).toFixed(6)}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${roomFumigation.utm_x},${roomFumigation.utm_y}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
                >
                  <MapPin className="w-4 h-4" />
                  Ver en Google Maps
                </a>
              </div>
            )}

            {roomFumigation.observations && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs uppercase font-medium">Observaciones</span>
                </div>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {roomFumigation.observations}
                </p>
              </div>
            )}

            {photos.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-gray-500">
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">
                      Fotos ({photos.length})
                    </span>
                  </div>
                  {photos.length > 1 && (
                    <span className="text-sm text-gray-500">
                      {currentPhotoIndex + 1} / {photos.length}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <img
                    src={photos[currentPhotoIndex]}
                    alt={`Foto ${currentPhotoIndex + 1}`}
                    className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setShowFullImage(true)}
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prevPhoto}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      </button>
                    </>
                  )}
                </div>
                {photos.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {photos.map((photo, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                          idx === currentPhotoIndex
                            ? 'border-teal-500'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={photo}
                          alt={`Miniatura ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {roomFumigation.status === 'PENDIENTE' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-amber-800 font-medium">Esta habitacion esta pendiente de fumigar</p>
                <p className="text-amber-600 text-sm mt-1">
                  Usa el formulario de campo para registrar la fumigacion
                </p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {showFullImage && photos.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowFullImage(false)}
        >
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </>
          )}
          <img
            src={photos[currentPhotoIndex]}
            alt={`Foto ${currentPhotoIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
