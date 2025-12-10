import { useState } from 'react';
import { X, MapPin, Check } from 'lucide-react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

interface MapCoordinatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  title?: string;
}

export default function MapCoordinatePicker({
  isOpen,
  onClose,
  onSelect,
  initialLat = 23.067296055121364,
  initialLng = -109.65953278614275,
  title = 'Seleccionar Ubicación',
}: MapCoordinatePickerProps) {
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });

  if (!isOpen) return null;

  const GOOGLE_MAPS_API_KEY =  'AIzaSyAfHwSd0bw9zaLmy1qG06FYQJv63Hcp9Os';

  const handleMapClick = (e: any) => {
    if (e.detail && e.detail.latLng) {
      setSelectedPosition({
        lat: e.detail.latLng.lat,
        lng: e.detail.latLng.lng,
      });
    }
  };

  const handleConfirm = () => {
    onSelect(selectedPosition.lat, selectedPosition.lng);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-emerald-100 mt-1">Haz clic en el mapa para seleccionar coordenadas</p>
            </div>
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
            <p className="text-sm text-slate-600 mb-2">
              <span className="font-semibold">Coordenadas seleccionadas:</span>
            </p>
            <p className="text-lg font-mono font-bold text-slate-800">
              {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
            </p>
          </div>

          <div className="h-[600px] rounded-xl overflow-hidden border-2 border-slate-200 shadow-lg">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                defaultCenter={selectedPosition}
                defaultZoom={18}
                mapTypeId="hybrid"
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapId="coordinate-picker-map"
                onClick={handleMapClick}
              >
                <Marker position={selectedPosition} />
              </Map>
            </APIProvider>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all"
            >
              <Check className="w-5 h-5" />
              Confirmar Ubicación
            </button>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Instrucciones:</span> Haz clic en cualquier punto del mapa para seleccionar las coordenadas GPS.
              El marcador se moverá automáticamente a la ubicación seleccionada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
