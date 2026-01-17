import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, AquaticElement, ANALYSIS_PARAMS } from '../lib/api';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Droplets, MapPin, TrendingUp, Calendar, ArrowLeft } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import { adjustDateFromDB } from '../lib/utils';

export default function WaterChemistryMap() {
  const navigate = useNavigate();
  const [elements, setElements] = useState<AquaticElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedElement, setSelectedElement] = useState<AquaticElement | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 23.067296055121364, lng: -109.65953278614275 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.getAquaticElements({
        archived: 0,
        withLast: 1,
        pageSize: 200,
      });
      const elementsWithCoords = response.data.filter(e => e.lat != null && e.lon != null);
      setElements(elementsWithCoords);

      if (elementsWithCoords.length > 0) {
        const avgLat = elementsWithCoords.reduce((sum, e) => sum + (e.lat || 0), 0) / elementsWithCoords.length;
        const avgLng = elementsWithCoords.reduce((sum, e) => sum + (e.lon || 0), 0) / elementsWithCoords.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
      }
    } catch (error) {
      console.error('Error loading elements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getParamLabel = (key: string): string => {
    return ANALYSIS_PARAMS.find(p => p.key === key)?.label || key;
  };

  const getParamUnit = (key: string): string | null => {
    return ANALYSIS_PARAMS.find(p => p.key === key)?.unit || null;
  };

  const getMarkerColor = (element: AquaticElement): string => {
    if (!element.last) return '#6b7280';

    const last = element.last;
    const phOk = last.ph != null && last.ph >= 7.2 && last.ph <= 7.6;
    const clOk = last.cloro_libre != null && last.cloro_libre >= 1.0 && last.cloro_libre <= 3.0;

    if (phOk && clOk) return '#10b981';
    if (last.ph != null || last.cloro_libre != null) return '#f59e0b';
    return '#6b7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HamsterLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/water-chemistry')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
              MAPA DE ELEMENTOS ACUÁTICOS
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {elements.length} elementos con coordenadas GPS
            </p>
          </div>
        </div>
      </div>

      {elements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No hay elementos con coordenadas GPS</p>
          <p className="text-gray-400 text-sm mt-2">
            Agrega coordenadas a tus elementos desde la configuración
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Parámetros OK</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-700">Requiere atención</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                <span className="text-gray-700">Sin análisis reciente</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: '1200px' }}>
            <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAfHwSd0bw9zaLmy1qG06FYQJv63Hcp9Os'}>
              <Map
                style={{ width: '100%', height: '100%' }}
                defaultCenter={mapCenter}
                defaultZoom={16}
                gestureHandling={'greedy'}
                disableDefaultUI={false}
                mapTypeId={'hybrid'}
                clickableIcons={false}
                mapId="e86f25b8c3d58a3e"
              >
                {elements.map((element) => {
                  if (!element.lat || !element.lon) return null;

                  const color = getMarkerColor(element);

                  return (
                    <AdvancedMarker
                      key={element.id}
                      position={{ lat: element.lat, lng: element.lon }}
                      onClick={() => setSelectedElement(element)}
                    >
                      <div
                        className="relative cursor-pointer transform transition-transform hover:scale-110"
                        style={{
                          width: '40px',
                          height: '40px',
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                          style={{ backgroundColor: color }}
                        >
                          <Droplets className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {selectedElement && selectedElement.lat && selectedElement.lon && (
                  <InfoWindow
                    position={{ lat: selectedElement.lat, lng: selectedElement.lon }}
                    onCloseClick={() => setSelectedElement(null)}
                  >
                    <div className="p-2 max-w-sm">
                      <div className="flex items-start gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Droplets className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-800 text-sm leading-tight">
                            {selectedElement.nombre.toUpperCase()}
                          </h3>
                          {selectedElement.ubicacion && (
                            <p className="text-xs text-gray-500 mt-0.5">{selectedElement.ubicacion}</p>
                          )}
                          {selectedElement.amenity_nombre && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                              {selectedElement.amenity_nombre}
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedElement.last ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 pb-2 border-b border-gray-200">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {adjustDateFromDB(selectedElement.last.sampled_at).toLocaleDateString('es-MX', {
                                timeZone: 'America/Mazatlan',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'ph', value: selectedElement.last.ph },
                              { key: 'cloro_libre', value: selectedElement.last.cloro_libre },
                              { key: 'cloro_total', value: selectedElement.last.cloro_total },
                              { key: 'temperatura', value: selectedElement.last.temperatura },
                              { key: 'alcalinidad', value: selectedElement.last.alcalinidad },
                              { key: 'lsi', value: selectedElement.last.lsi },
                            ].map(({ key, value }) => {
                              if (value == null) return null;
                              const numValue = Number(value);
                              if (isNaN(numValue)) return null;

                              const label = getParamLabel(key);
                              const unit = getParamUnit(key);

                              return (
                                <div key={key} className="bg-gray-50 rounded px-2 py-1.5">
                                  <div className="text-xs text-gray-600">{label}</div>
                                  <div className="text-sm font-bold text-blue-700">
                                    {numValue.toFixed(numValue < 10 ? 1 : 0)}
                                    {unit && <span className="text-xs ml-0.5">{unit}</span>}
                                  </div>
                                </div>
                              );
                            }).filter(Boolean)}
                          </div>

                          <button
                            onClick={() => navigate(`/water-chemistry/${selectedElement.id}`)}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                          >
                            <TrendingUp className="w-4 h-4" />
                            Ver Detalles
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <p className="text-xs text-gray-500 mb-3">Sin análisis registrados</p>
                          <button
                            onClick={() => navigate(`/water-chemistry/${selectedElement.id}`)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                          >
                            <TrendingUp className="w-4 h-4" />
                            Ver Elemento
                          </button>
                        </div>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          </div>
        </>
      )}
    </div>
  );
}
