import { X } from 'lucide-react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  roomNumber: number;
}

export default function LocationMapModal({ isOpen, onClose, lat, lng, roomNumber }: LocationMapModalProps) {
  if (!isOpen) return null;

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAfHwSd0bw9zaLmy1qG06FYQJv63Hcp9Os';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Ubicación de Inspección</h2>
            <p className="text-cyan-100 mt-1">Habitación {roomNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Coordenadas:</span>
            </p>
            <p className="text-lg font-mono font-bold text-slate-800 mt-1">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          </div>

          <div className="h-[500px] rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={{ lat, lng }}
                defaultZoom={18}
                mapTypeId="hybrid"
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapId="inspection-location-map"
              >
                <Marker position={{ lat, lng }} />
              </Map>
            </APIProvider>
          </div>

          <div className="mt-4 flex gap-3">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all text-center"
            >
              Abrir en Google Maps
            </a>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
