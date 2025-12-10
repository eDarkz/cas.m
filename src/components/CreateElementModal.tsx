import { useState, useEffect } from 'react';
import { api, AmenityType } from '../lib/api';
import { X, Droplets, MapPin } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

interface CreateElementModalProps {
  onClose: () => void;
  onSuccess: () => void;
  element?: {
    id: string;
    nombre: string;
    ubicacion?: string;
    amenity_type_id?: number | null;
    tipo?: string | null;
    lat?: number | null;
    lon?: number | null;
  };
}

export default function CreateElementModal({ onClose, onSuccess, element }: CreateElementModalProps) {
  const [formData, setFormData] = useState({
    nombre: element?.nombre || '',
    ubicacion: element?.ubicacion || '',
    amenity_type_id: element?.amenity_type_id || null,
    tipo: element?.tipo || '',
    lat: element?.lat || null,
    lon: element?.lon || null,
  });
  const [loading, setLoading] = useState(false);
  const [amenityTypes, setAmenityTypes] = useState<AmenityType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 23.066634543513885, lng: -109.6599670181324 });

  useEffect(() => {
    loadAmenityTypes();
    if (element?.lat && element?.lon) {
      setMapCenter({ lat: element.lat, lng: element.lon });
    } else {
      setMapCenter({ lat: 23.066634543513885, lng: -109.6599670181324 });
    }
  }, []);

  const loadAmenityTypes = async () => {
    try {
      const types = await api.getAmenityTypes();
      setAmenityTypes(types);
    } catch (error) {
      console.error('Error loading amenity types:', error);
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }

    setLoading(true);
    try {
      if (element) {
        await api.updateAquaticElement(element.id, formData);
      } else {
        await api.createAquaticElement(formData);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving element:', error);
      alert('Error al guardar el elemento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-600" />
            <h3 className="text-xl font-bold text-gray-800">
              {element ? 'Editar Elemento' : 'Nuevo Elemento Acuático'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Alberca Principal, Fuente Lobby, Spa..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación
            </label>
            <input
              type="text"
              value={formData.ubicacion}
              onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
              placeholder="Ej: Área de piscinas, Jardín principal..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Amenidad
            </label>
            <select
              value={formData.amenity_type_id || ''}
              onChange={(e) => setFormData({ ...formData, amenity_type_id: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={loading || loadingTypes}
            >
              <option value="">Sin tipo específico</option>
              {amenityTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.nombre}
                </option>
              ))}
            </select>
            {formData.amenity_type_id && amenityTypes.find(t => t.id === formData.amenity_type_id)?.descripcion && (
              <p className="text-xs text-gray-500 mt-1">
                {amenityTypes.find(t => t.id === formData.amenity_type_id)?.descripcion}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo (campo libre)
            </label>
            <input
              type="text"
              value={formData.tipo || ''}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              placeholder="Ej: infinita, techada, climatizada..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coordenadas GPS
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  value={formData.lat || ''}
                  onChange={(e) => {
                    const lat = e.target.value ? Number(e.target.value) : null;
                    setFormData({ ...formData, lat });
                    if (lat && formData.lon) {
                      setMapCenter({ lat, lng: formData.lon });
                    }
                  }}
                  placeholder="Latitud: 23.0666"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={loading}
                />
                <input
                  type="number"
                  step="any"
                  value={formData.lon || ''}
                  onChange={(e) => {
                    const lon = e.target.value ? Number(e.target.value) : null;
                    setFormData({ ...formData, lon });
                    if (formData.lat && lon) {
                      setMapCenter({ lat: formData.lat, lng: lon });
                    }
                  }}
                  placeholder="Longitud: -109.6600"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-cyan-300 text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors text-sm font-medium"
              >
                <MapPin className="w-4 h-4" />
                {showMap ? 'Ocultar Mapa' : 'Seleccionar en Mapa'}
              </button>
            </div>

            {showMap && (
              <div className="mt-3 border border-gray-300 rounded-lg overflow-hidden relative z-0">
                <APIProvider apiKey="AIzaSyAfHwSd0bw9zaLmy1qG06FYQJv63Hcp9Os">
                  <Map
                    style={{ width: '100%', height: '300px' }}
                    defaultCenter={mapCenter}
                    defaultZoom={16}
                    gestureHandling={'greedy'}
                    disableDefaultUI={false}
                    mapTypeId={'hybrid'}
                    clickableIcons={false}
                    options={{
                      zoomControl: true,
                      mapTypeControl: true,
                      streetViewControl: false,
                      fullscreenControl: true,
                      mapTypeControlOptions: {
                        style: 1,
                        position: 3,
                      },
                    }}
                    onClick={(e) => {
                      const lat = e.detail.latLng?.lat;
                      const lng = e.detail.latLng?.lng;
                      if (lat && lng) {
                        setFormData({ ...formData, lat, lon: lng });
                      }
                    }}
                  >
                    {formData.lat && formData.lon && (
                      <AdvancedMarker
                        position={{ lat: formData.lat, lng: formData.lon }}
                      />
                    )}
                  </Map>
                </APIProvider>
                <p className="text-xs text-gray-500 p-2 bg-gray-50">
                  Haz clic en el mapa para seleccionar la ubicación
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                element ? 'Actualizar' : 'Crear Elemento'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
