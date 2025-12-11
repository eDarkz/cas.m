import { useState, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Calendar, MapPin, User } from 'lucide-react';
import { BaitStation, StationType } from '../lib/fumigationApi';

interface Props {
  stations: BaitStation[];
  filterType: StationType | '';
  onFilterChange: (type: StationType | '') => void;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyAfHwSd0bw9zaLmy1qG06FYQJv63Hcp9Os';

const TYPE_LABELS: Record<StationType, string> = {
  ROEDOR: 'Cebadera',
  UV: 'Trampa UV',
  OTRO: 'Otro',
};

function getDaysSinceInspection(lastInspectionDate: string | null | undefined): number | null {
  if (!lastInspectionDate) return null;
  const lastDate = new Date(lastInspectionDate);
  const today = new Date();
  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getInspectionStatusColor(days: number | null): { bg: string; border: string; text: string } {
  if (days === null) {
    return { bg: '#fecaca', border: '#dc2626', text: '#991b1b' };
  }
  if (days <= 15) {
    return { bg: '#bbf7d0', border: '#16a34a', text: '#166534' };
  }
  if (days <= 30) {
    return { bg: '#fed7aa', border: '#ea580c', text: '#9a3412' };
  }
  return { bg: '#fecaca', border: '#dc2626', text: '#991b1b' };
}

function getStatusLabel(days: number | null): string {
  if (days === null) return 'Sin inspecciones';
  if (days <= 15) return 'Al dia';
  if (days <= 30) return 'Proxima a vencer';
  return 'Vencida';
}

function StationMarker({
  station,
  isHovered,
  onHover,
  onLeave,
  onClick
}: {
  station: BaitStation;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const days = getDaysSinceInspection(station.lastInspection?.inspected_at);
  const colors = getInspectionStatusColor(days);
  const isUV = station.type === 'UV';
  const isRoedor = station.type === 'ROEDOR';

  return (
    <AdvancedMarker
      position={{ lat: Number(station.utm_y), lng: Number(station.utm_x) }}
      onClick={onClick}
    >
      <div
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        className="relative cursor-pointer transition-transform"
        style={{ transform: isHovered ? 'scale(1.2)' : 'scale(1)' }}
      >
        <div
          className={`w-8 h-8 flex items-center justify-center shadow-lg border-2 ${
            isUV ? 'rounded-md' : isRoedor ? 'rounded-full' : 'rounded-lg rotate-45'
          }`}
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.border,
          }}
        >
          <span
            className={`text-[10px] font-bold ${!isUV && !isRoedor ? '-rotate-45' : ''}`}
            style={{ color: colors.text }}
          >
            {isUV ? 'UV' : isRoedor ? 'C' : 'O'}
          </span>
        </div>
        {!station.is_active && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-600 rounded-full border border-white" />
        )}
      </div>
    </AdvancedMarker>
  );
}

export default function StationsMapView({ stations, filterType, onFilterChange }: Props) {
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<BaitStation | null>(null);

  const stationsWithCoords = stations.filter(
    (s) => s.utm_x && s.utm_y && !isNaN(Number(s.utm_x)) && !isNaN(Number(s.utm_y))
  );

  const filteredStations = filterType
    ? stationsWithCoords.filter((s) => s.type === filterType)
    : stationsWithCoords;

  const center = filteredStations.length > 0
    ? {
        lat: filteredStations.reduce((sum, s) => sum + Number(s.utm_y), 0) / filteredStations.length,
        lng: filteredStations.reduce((sum, s) => sum + Number(s.utm_x), 0) / filteredStations.length,
      }
    : { lat: 23.067296055121364, lng: -109.65953278614275 };

  const handleMarkerHover = useCallback((stationId: string) => {
    setHoveredStation(stationId);
  }, []);

  const handleMarkerLeave = useCallback(() => {
    setHoveredStation(null);
  }, []);

  const handleMarkerClick = useCallback((station: BaitStation) => {
    setSelectedStation(station);
  }, []);

  const hoveredStationData = hoveredStation
    ? filteredStations.find(s => s.id === Number(hoveredStation))
    : null;

  const stats = {
    total: filteredStations.length,
    roedor: stationsWithCoords.filter((s) => s.type === 'ROEDOR').length,
    uv: stationsWithCoords.filter((s) => s.type === 'UV').length,
    otro: stationsWithCoords.filter((s) => s.type === 'OTRO').length,
  };

  const inspectionStats = {
    upToDate: filteredStations.filter(s => {
      const days = getDaysSinceInspection(s.lastInspection?.inspected_at);
      return days !== null && days <= 15;
    }).length,
    expiringSoon: filteredStations.filter(s => {
      const days = getDaysSinceInspection(s.lastInspection?.inspected_at);
      return days !== null && days > 15 && days <= 30;
    }).length,
    expired: filteredStations.filter(s => {
      const days = getDaysSinceInspection(s.lastInspection?.inspected_at);
      return days === null || days > 30;
    }).length,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-gray-900">Mapa de Estaciones</h2>
            <span className="text-sm text-gray-500">
              ({filteredStations.length} con ubicacion)
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onFilterChange('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === ''
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas ({stats.total})
            </button>
            <button
              onClick={() => onFilterChange('ROEDOR')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'ROEDOR'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Cebaderas ({stats.roedor})
            </button>
            <button
              onClick={() => onFilterChange('UV')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'UV'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Trampas UV ({stats.uv})
            </button>
            {stats.otro > 0 && (
              <button
                onClick={() => onFilterChange('OTRO')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'OTRO'
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Otros ({stats.otro})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative h-[500px]">
        {filteredStations.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay estaciones con ubicacion</p>
              <p className="text-sm">Agrega coordenadas a las estaciones para verlas en el mapa</p>
            </div>
          </div>
        ) : (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={center}
              defaultZoom={16}
              mapTypeId="hybrid"
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapId="stations-overview-map"
            >
              {filteredStations.map((station) => (
                <StationMarker
                  key={station.id}
                  station={station}
                  isHovered={hoveredStation === String(station.id)}
                  onHover={() => handleMarkerHover(String(station.id))}
                  onLeave={handleMarkerLeave}
                  onClick={() => handleMarkerClick(station)}
                />
              ))}

              {hoveredStationData && !selectedStation && (
                <InfoWindow
                  position={{
                    lat: Number(hoveredStationData.utm_y),
                    lng: Number(hoveredStationData.utm_x)
                  }}
                  onCloseClick={handleMarkerLeave}
                >
                  <div className="p-2 max-w-xs">
                    {(() => {
                      const days = getDaysSinceInspection(hoveredStationData.lastInspection?.inspected_at);
                      const colors = getInspectionStatusColor(days);
                      return (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                            {TYPE_LABELS[hoveredStationData.type]}
                          </span>
                          <span
                            className="px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            {getStatusLabel(days)}
                          </span>
                        </div>
                      );
                    })()}
                    <p className="font-bold text-gray-900 font-mono text-lg">{hoveredStationData.code}</p>
                    <p className="text-sm text-gray-600 truncate">{hoveredStationData.name}</p>
                    {hoveredStationData.lastInspection ? (
                      <div className="mt-2 pt-2 border-t space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(hoveredStationData.lastInspection.inspected_at).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        {hoveredStationData.lastInspection.inspector_nombre && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            <span>{hoveredStationData.lastInspection.inspector_nombre}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-red-600 mt-2">Sin inspecciones</div>
                    )}
                  </div>
                </InfoWindow>
              )}

              {selectedStation && (
                <InfoWindow
                  position={{ lat: Number(selectedStation.utm_y), lng: Number(selectedStation.utm_x) }}
                  onCloseClick={() => setSelectedStation(null)}
                >
                  <div className="p-2 min-w-[220px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                        {TYPE_LABELS[selectedStation.type]}
                      </span>
                      {(() => {
                        const days = getDaysSinceInspection(selectedStation.lastInspection?.inspected_at);
                        const colors = getInspectionStatusColor(days);
                        return (
                          <span
                            className="px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            {getStatusLabel(days)}
                          </span>
                        );
                      })()}
                      {!selectedStation.is_active && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 font-mono text-lg">{selectedStation.code}</p>
                    <p className="text-sm text-gray-600 mb-2">{selectedStation.name}</p>
                    {selectedStation.lastInspection ? (
                      <div className="border-t pt-2 mt-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            Ultima: {new Date(selectedStation.lastInspection.inspected_at).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        {selectedStation.lastInspection.inspector_nombre && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>{selectedStation.lastInspection.inspector_nombre}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-red-600 border-t pt-2 mt-2">
                        Sin inspecciones registradas
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        )}
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700">Tipo:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-gray-200 border-2 border-gray-400 flex items-center justify-center">
                <span className="text-[6px] font-bold text-gray-600">C</span>
              </div>
              <span>Cebadera</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md bg-gray-200 border-2 border-gray-400 flex items-center justify-center">
                <span className="text-[6px] font-bold text-gray-600">UV</span>
              </div>
              <span>Trampa UV</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700">Estado:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-green-200 border-2 border-green-600" />
              <span>0-15 dias ({inspectionStats.upToDate})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-orange-200 border-2 border-orange-600" />
              <span>16-30 dias ({inspectionStats.expiringSoon})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-red-200 border-2 border-red-600" />
              <span>+30 dias ({inspectionStats.expired})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
