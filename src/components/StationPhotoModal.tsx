import { X } from 'lucide-react';

interface StationPhotoModalProps {
  photoUrl: string;
  stationName: string;
  onClose: () => void;
}

export default function StationPhotoModal({ photoUrl, stationName, onClose }: StationPhotoModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Foto de Inspección - {stationName}
          </h2>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex items-center justify-center bg-slate-50">
          <img
            src={photoUrl}
            alt={`Inspección de ${stationName}`}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
          />
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <a
            href={photoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
          >
            Abrir en nueva pestaña
          </a>
        </div>
      </div>
    </div>
  );
}
