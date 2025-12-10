import { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Image as ImageIcon,
  MessageSquare,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StationInspection, PhysicalCondition } from '../lib/fumigationApi';

interface Props {
  inspection: StationInspection;
  onClose: () => void;
}

const CONDITION_STYLES: Record<PhysicalCondition, { bg: string; text: string; border: string }> = {
  BUENA: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  REGULAR: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  MALA: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

export default function InspectionDetailModal({ inspection, onClose }: Props) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const conditionStyle = CONDITION_STYLES[inspection.physical_condition];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Detalle de Inspeccion</h2>
              <p className="text-sm text-gray-500">
                {inspection.station_code} - {inspection.station_name}
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
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-lg ${conditionStyle.bg} ${conditionStyle.text} border ${conditionStyle.border}`}>
                  <span className="font-semibold text-lg">{inspection.physical_condition}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{formatDate(inspection.inspected_at)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <User className="w-4 h-4" />
                  <span className="text-xs uppercase font-medium">Inspector</span>
                </div>
                <p className="font-medium text-gray-900">
                  {inspection.inspector_nombre || 'No especificado'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs uppercase font-medium">Empresa</span>
                </div>
                <p className="font-medium text-gray-900">
                  {inspection.inspector_empresa || 'No especificada'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className={`p-4 rounded-xl border-2 ${
                inspection.has_bait
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  {inspection.has_bait ? (
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <p className={`text-center text-sm font-medium ${
                  inspection.has_bait ? 'text-green-700' : 'text-gray-500'
                }`}>
                  {inspection.has_bait ? 'Con cebo' : 'Sin cebo'}
                </p>
              </div>

              <div className={`p-4 rounded-xl border-2 ${
                inspection.bait_replaced
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  {inspection.bait_replaced ? (
                    <RefreshCw className="w-8 h-8 text-blue-600" />
                  ) : (
                    <RefreshCw className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <p className={`text-center text-sm font-medium ${
                  inspection.bait_replaced ? 'text-blue-700' : 'text-gray-500'
                }`}>
                  {inspection.bait_replaced ? 'Cebo reemplazado' : 'No reemplazado'}
                </p>
              </div>

              <div className={`p-4 rounded-xl border-2 ${
                inspection.location_ok
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  {inspection.location_ok ? (
                    <MapPin className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                  )}
                </div>
                <p className={`text-center text-sm font-medium ${
                  inspection.location_ok ? 'text-green-700' : 'text-amber-700'
                }`}>
                  {inspection.location_ok ? 'Ubicacion OK' : 'Verificar ubicacion'}
                </p>
              </div>
            </div>

            {inspection.lat && inspection.lng && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs uppercase font-medium">Coordenadas GPS</span>
                </div>
                <p className="font-mono text-sm text-gray-900">
                  {inspection.lat.toFixed(6)}, {inspection.lng.toFixed(6)}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${inspection.lat},${inspection.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 hover:text-emerald-700 mt-1 inline-block"
                >
                  Ver en Google Maps
                </a>
              </div>
            )}

            {inspection.observations && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs uppercase font-medium">Observaciones</span>
                </div>
                <p className="text-gray-900 whitespace-pre-wrap">{inspection.observations}</p>
              </div>
            )}

            {inspection.photo_url && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-3">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-xs uppercase font-medium">Foto de la inspeccion</span>
                </div>
                <div className="relative">
                  {imageLoading && !imageError && (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                  )}
                  {imageError ? (
                    <div className="bg-gray-200 rounded-lg p-8 text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No se pudo cargar la imagen</p>
                      <a
                        href={inspection.photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-600 hover:text-emerald-700 mt-2 inline-block"
                      >
                        Abrir enlace directo
                      </a>
                    </div>
                  ) : (
                    <img
                      src={inspection.photo_url}
                      alt="Foto de inspeccion"
                      className={`w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${
                        imageLoading ? 'opacity-0' : 'opacity-100'
                      }`}
                      onLoad={() => setImageLoading(false)}
                      onError={() => {
                        setImageLoading(false);
                        setImageError(true);
                      }}
                      onClick={() => setShowFullImage(true)}
                    />
                  )}
                </div>
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

      {showFullImage && inspection.photo_url && (
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
          <img
            src={inspection.photo_url}
            alt="Foto de inspeccion"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
