import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Bug, MapPin, Calendar, ArrowLeft, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FumigationStation {
  id: string;
  nombre: string;
  tipo: string;
  ubicacion: string;
  lat: number | null;
  lng: number | null;
  codigo_qr: string | null;
  activa: boolean;
  notas: string;
  last_visit?: {
    fecha_visita: string;
    inspector: string;
    hallazgos: string;
  };
}

const STATION_TYPES = {
  uv: { label: 'UV', color: '#8b5cf6', icon: Zap },
  raton: { label: 'Ratón', color: '#6b7280', icon: Bug },
  cucaracha: { label: 'Cucaracha', color: '#dc2626', icon: Bug },
  hormiga: { label: 'Hormiga', color: '#ea580c', icon: Bug },
  otro: { label: 'Otro', color: '#0891b2', icon: Bug },
};

export default function FumigationMap() {
  const navigate = useNavigate();
  const [stations, setStations] = useState<FumigationStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<FumigationStation | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 23.067296055121364, lng: -109.65953278614275 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: stationsData, error } = await supabase
        .from('fumigacion_estaciones')
        .select('*')
        .eq('activa', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (error) throw error;

      const stationsWithLogs = await Promise.all(
        (stationsData || []).map(async (station) => {
          const { data: lastLog } = await supabase
            .from('fumigacion_estaciones_logs')
            .select('fecha_visita, inspector, hallazgos')
            .eq('estacion_id', station.id)
            .order('fecha_visita', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...station,
            last_visit: lastLog || undefined,
          };
        })
      );

      setStations(stationsWithLogs);

      if (stationsWithLogs.length > 0) {
        const avgLat = stationsWithLogs.reduce((sum, s) => sum + (s.lat || 0), 0) / stationsWithLogs.length;
        const avgLng = stationsWithLogs.reduce((sum, s) => sum + (s.lng || 0), 0) / stationsWithLogs.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStationColor = (station: FumigationStation): string => {
    if (!station.activa) return '#9ca3af';
    return STATION_TYPES[station.tipo as keyof typeof STATION_TYPES]?.color || '#0891b2';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/fumigacion')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent">
              MAPA DE ESTACIONES DE FUMIGACIÓN
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {stations.length} estaciones activas con coordenadas GPS
            </p>
          </div>
        </div>
      </div>

      {stations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No hay estaciones con coordenadas GPS</p>
          <p className="text-gray-400 text-sm mt-2">
            Agrega coordenadas a tus estaciones desde la configuración
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center flex-wrap gap-6 text-sm">
              {Object.entries(STATION_TYPES).map(([key, { label, color }]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-gray-700">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                <span className="text-gray-700">Inactiva</span>
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
                mapId="fumigation-map"
              >
                {stations.map((station) => {
                  if (!station.lat || !station.lng) return null;

                  const color = getStationColor(station);
                  const StationIcon = STATION_TYPES[station.tipo as keyof typeof STATION_TYPES]?.icon || Bug;

                  return (
                    <AdvancedMarker
                      key={station.id}
                      position={{ lat: station.lat, lng: station.lng }}
                      onClick={() => setSelectedStation(station)}
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
                          <StationIcon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {selectedStation && selectedStation.lat && selectedStation.lng && (
                  <InfoWindow
                    position={{ lat: selectedStation.lat, lng: selectedStation.lng }}
                    onCloseClick={() => setSelectedStation(null)}
                  >
                    <div className="p-2 max-w-sm">
                      <div className="flex items-start gap-2 mb-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: getStationColor(selectedStation),
                          }}
                        >
                          {(() => {
                            const StationIcon = STATION_TYPES[selectedStation.tipo as keyof typeof STATION_TYPES]?.icon || Bug;
                            return <StationIcon className="w-4 h-4 text-white" />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-800 text-sm leading-tight">
                            {selectedStation.nombre.toUpperCase()}
                          </h3>
                          {selectedStation.ubicacion && (
                            <p className="text-xs text-gray-500 mt-0.5">{selectedStation.ubicacion}</p>
                          )}
                          <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                            {STATION_TYPES[selectedStation.tipo as keyof typeof STATION_TYPES]?.label || selectedStation.tipo}
                          </span>
                        </div>
                      </div>

                      {selectedStation.last_visit ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 pb-2 border-b border-gray-200">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Última visita: {new Date(selectedStation.last_visit.fecha_visita).toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>

                          <div className="bg-gray-50 rounded px-2 py-1.5">
                            <div className="text-xs text-gray-600">Inspector</div>
                            <div className="text-sm font-bold text-emerald-700">
                              {selectedStation.last_visit.inspector}
                            </div>
                          </div>

                          {selectedStation.last_visit.hallazgos && (
                            <div className="bg-gray-50 rounded px-2 py-1.5">
                              <div className="text-xs text-gray-600">Hallazgos</div>
                              <div className="text-sm text-gray-800">
                                {selectedStation.last_visit.hallazgos}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => navigate('/fumigacion?tab=station-logs')}
                            className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                          >
                            Ver Historial
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <p className="text-xs text-gray-500 mb-3">Sin visitas registradas</p>
                          <button
                            onClick={() => navigate(`/fumigacion/estacion/${selectedStation.id}`)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                          >
                            <Bug className="w-4 h-4" />
                            Registrar Visita
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
