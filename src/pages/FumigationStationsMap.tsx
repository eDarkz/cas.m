import { useEffect, useState } from 'react';
import { fumigationApi, BaitStation } from '../lib/fumigationApi';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Target, MapPin, Calendar, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

const DEFAULT_CENTER = { lat: 23.067296055121364, lng: -109.65953278614275 };

export default function FumigationStationsMap() {
  const [stations, setStations] = useState<BaitStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<BaitStation | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stationsData = await fumigationApi.getStations();

      const stationsWithCoords = stationsData.filter(s => {
        const x = Number(s.utm_x);
        const y = Number(s.utm_y);
        return (
          s.utm_x != null &&
          s.utm_y != null &&
          !isNaN(x) &&
          !isNaN(y) &&
          isFinite(x) &&
          isFinite(y) &&
          x !== 0 &&
          y !== 0
        );
      });

      console.log('Stations with valid coords:', stationsWithCoords.length);
      console.log('Sample station:', stationsWithCoords[0]);

      setStations(stationsWithCoords);

      if (stationsWithCoords.length > 0) {
        const avgLat = stationsWithCoords.reduce((sum, s) => sum + Number(s.utm_y), 0) / stationsWithCoords.length;
        const avgLng = stationsWithCoords.reduce((sum, s) => sum + Number(s.utm_x), 0) / stationsWithCoords.length;

        console.log('Map center:', { lat: avgLat, lng: avgLng });

        if (!isNaN(avgLat) && !isNaN(avgLng) && isFinite(avgLat) && isFinite(avgLng)) {
          setMapCenter({ lat: avgLat, lng: avgLng });
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (station: BaitStation): string => {
    if (!station.lastInspection) return '#6b7280';

    const lastInspection = station.lastInspection;
    const daysSinceInspection = lastInspection.inspected_at
      ? Math.floor((Date.now() - new Date(lastInspection.inspected_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceInspection === null) return '#6b7280';

    if (lastInspection.physical_condition === 'MALA') return '#ef4444';
    if (!lastInspection.has_bait) return '#f59e0b';
    if (daysSinceInspection > 30) return '#f59e0b';
    if (lastInspection.physical_condition === 'BUENA' && lastInspection.has_bait) return '#10b981';

    return '#6b7280';
  };

  const getStatusIcon = (station: BaitStation) => {
    if (!station.lastInspection) return <Clock className="w-5 h-5 text-gray-500" />;

    const lastInspection = station.lastInspection;

    if (lastInspection.physical_condition === 'MALA') return <XCircle className="w-5 h-5 text-red-600" />;
    if (!lastInspection.has_bait) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    if (lastInspection.physical_condition === 'BUENA' && lastInspection.has_bait) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }

    return <Clock className="w-5 h-5 text-gray-500" />;
  };

  const getTypeIcon = (type: string) => {
    return <Target className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando estaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
                Mapa de Estaciones de Control de Plagas
              </h1>
              <p className="text-gray-600 mt-1">
                {stations.length} estaciones activas con coordenadas GPS
              </p>
            </div>
          </div>
        </div>

        {stations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
            <MapPin className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No hay estaciones con coordenadas GPS</h2>
            <p className="text-gray-500">
              Las estaciones necesitan coordenadas GPS para aparecer en el mapa
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Leyenda</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full shadow-md"></div>
                  <span className="text-sm text-gray-700 font-medium">Estado Óptimo</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-yellow-500 rounded-full shadow-md"></div>
                  <span className="text-sm text-gray-700 font-medium">Requiere Atención</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-red-500 rounded-full shadow-md"></div>
                  <span className="text-sm text-gray-700 font-medium">Estado Crítico</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-500 rounded-full shadow-md"></div>
                  <span className="text-sm text-gray-700 font-medium">Sin Inspección</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200" style={{ height: '800px', position: 'relative' }}>
              <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAfHwSd0bw9zaLmy1qG06FYQJv63Hcp9Os'}>
                <Map
                  style={{ width: '100%', height: '100%', borderRadius: '1rem' }}
                  defaultCenter={mapCenter}
                  defaultZoom={17}
                  gestureHandling={'greedy'}
                  disableDefaultUI={false}
                  mapTypeId={'hybrid'}
                  clickableIcons={false}
                  mapId="e86f25b8c3d58a3e"
                >
                  {stations.map((station) => {
                    const lat = Number(station.utm_y);
                    const lng = Number(station.utm_x);

                    if (!station.utm_x || !station.utm_y || isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
                      return null;
                    }

                    const color = getMarkerColor(station);
                    const position = { lat, lng };

                    return (
                      <AdvancedMarker
                        key={station.id}
                        position={position}
                        onClick={() => setSelectedStation(station)}
                      >
                        <div
                          className="relative cursor-pointer transform transition-transform hover:scale-110"
                          style={{
                            width: '44px',
                            height: '44px',
                          }}
                        >
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center shadow-xl border-3 border-white"
                            style={{ backgroundColor: color }}
                          >
                            <Target className="w-6 h-6 text-white" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-200">
                            <span className="text-xs font-bold" style={{ color }}>
                              {station.type === 'ROEDOR' ? 'R' : station.type === 'UV' ? 'U' : 'O'}
                            </span>
                          </div>
                        </div>
                      </AdvancedMarker>
                    );
                  })}

                  {selectedStation && (() => {
                    const lat = Number(selectedStation.utm_y);
                    const lng = Number(selectedStation.utm_x);
                    return selectedStation.utm_x &&
                           selectedStation.utm_y &&
                           !isNaN(lat) &&
                           !isNaN(lng) &&
                           isFinite(lat) &&
                           isFinite(lng);
                  })() && (
                    <InfoWindow
                      position={{ lat: Number(selectedStation.utm_y), lng: Number(selectedStation.utm_x) }}
                      onCloseClick={() => setSelectedStation(null)}
                    >
                      <div className="p-4 max-w-sm">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getTypeIcon(selectedStation.type)}
                              <h3 className="text-lg font-bold text-gray-900">{selectedStation.name}</h3>
                            </div>
                            <p className="text-sm text-gray-600 font-mono">{selectedStation.code}</p>
                          </div>
                          {getStatusIcon(selectedStation)}
                        </div>

                        <div className="space-y-2 border-t border-gray-200 pt-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 font-medium">Tipo:</span>
                            <span className="font-semibold text-gray-900">{selectedStation.type}</span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 font-medium">Estado:</span>
                            <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                              selectedStation.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedStation.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>

                          {selectedStation.installed_at && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 font-medium">Instalada:</span>
                              <span className="text-gray-900">
                                {new Date(selectedStation.installed_at).toLocaleDateString('es-MX', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}

                          {selectedStation.lastInspection && (
                            <>
                              <div className="border-t border-gray-200 pt-2 mt-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                  Última Inspección
                                </p>
                              </div>

                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-900">
                                  {new Date(selectedStation.lastInspection.inspected_at).toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 font-medium">Condición Física:</span>
                                <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                                  selectedStation.lastInspection.physical_condition === 'BUENA'
                                    ? 'bg-green-100 text-green-800'
                                    : selectedStation.lastInspection.physical_condition === 'REGULAR'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {selectedStation.lastInspection.physical_condition}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 font-medium">Cebo presente:</span>
                                <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                                  selectedStation.lastInspection.has_bait
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {selectedStation.lastInspection.has_bait ? 'Sí' : 'No'}
                                </span>
                              </div>

                              {selectedStation.lastInspection.bait_replaced && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600 font-medium">Cebo reemplazado:</span>
                                  <span className="font-semibold text-green-800">Sí</span>
                                </div>
                              )}

                              {selectedStation.lastInspection.inspector_nombre && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600 font-medium">Inspector:</span>
                                  <span className="text-gray-900 truncate ml-2" style={{ maxWidth: '150px' }}>
                                    {selectedStation.lastInspection.inspector_nombre}
                                  </span>
                                </div>
                              )}

                              {selectedStation.lastInspection.observations && (
                                <div className="border-t border-gray-200 pt-2 mt-2">
                                  <p className="text-xs font-medium text-gray-600 mb-1">Observaciones:</p>
                                  <p className="text-sm text-gray-900">{selectedStation.lastInspection.observations}</p>
                                </div>
                              )}
                            </>
                          )}

                          {!selectedStation.lastInspection && (
                            <div className="border-t border-gray-200 pt-2 mt-2">
                              <p className="text-sm text-gray-500 italic text-center">
                                Sin inspecciones registradas
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span className="font-mono">
                              {Number(selectedStation.utm_x).toFixed(6)}, {Number(selectedStation.utm_y).toFixed(6)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen de Estaciones</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Total Estaciones</p>
                      <p className="text-2xl font-bold text-gray-900">{stations.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Estado Óptimo</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stations.filter(s => getMarkerColor(s) === '#10b981').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Requieren Atención</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stations.filter(s => {
                          const color = getMarkerColor(s);
                          return color === '#f59e0b' || color === '#ef4444';
                        }).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
