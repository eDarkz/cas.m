import { useState, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Calendar, MapPin } from 'lucide-react';
import { BaitStation, StationType } from '../lib/fumigationApi';

interface Props {
  stations: BaitStation[];
  filterType: StationType | '';
  onFilterChange: (type: StationType | '') => void;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyAfHwSd0bw9zaLmy1qG06FYQJv63Hcp9Os';

const TYPE_COLORS: Record<StationType, { bg: string; border: string; text: string }> = {
  ROEDOR: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  UV: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  OTRO: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' },
};

const TYPE_LABELS: Record<StationType, string> = {
  ROEDOR: 'Cebadera',
  UV: 'Trampa UV',
  OTRO: 'Otro',
};

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
  const colors = TYPE_COLORS[station.type];

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
          className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2"
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.border,
          }}
        >
          {station.type === 'ROEDOR' ? (
            <span className="text-xs font-bold" style={{ color: colors.text }}>C</span>
          ) : station.type === 'UV' ? (
            <span className="text-xs font-bold" style={{ color: colors.text }}>UV</span>
          ) : (
            <span className="text-xs font-bold" style={{ color: colors.text }}>O</span>
          )}
        </div>
        {!station.is_active && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" />
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
    ? filteredStations.find(s => s.id === hoveredStation)
    : null;

  const stats = {
    total: filteredStations.length,
    roedor: stationsWithCoords.filter((s) => s.type === 'ROEDOR').length,
    uv: stationsWithCoords.filter((s) => s.type === 'UV').length,
    otro: stationsWithCoords.filter((s) => s.type === 'OTRO').length,
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
                  isHovered={hoveredStation === station.id}
                  onHover={() => handleMarkerHover(station.id)}
                  onLeave={handleMarkerLeave}
                  onClick={() => handleMarkerClick(station)}
                />
              ))}

              {selectedStation && (
                <InfoWindow
                  position={{ lat: Number(selectedStation.utm_y), lng: Number(selectedStation.utm_x) }}
                  onCloseClick={() => setSelectedStation(null)}
                >
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded-full"
                        style={{
                          backgroundColor: TYPE_COLORS[selectedStation.type].bg,
                          color: TYPE_COLORS[selectedStation.type].text,
                          border: `1px solid ${TYPE_COLORS[selectedStation.type].border}`,
                        }}
                      >
                        {TYPE_LABELS[selectedStation.type]}
                      </span>
                      {!selectedStation.is_active && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 font-mono">{selectedStation.code}</p>
                    <p className="text-sm text-gray-600 mb-2">{selectedStation.name}</p>
                    {selectedStation.lastInspection ? (
                      <div className="flex items-center gap-1 text-xs text-gray-500 border-t pt-2 mt-2">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Ultima inspeccion:{' '}
                          {new Date(selectedStation.lastInspection.inspected_at).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 border-t pt-2 mt-2">
                        Sin inspecciones registradas
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        )}

        {hoveredStationData && !selectedStation && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 pointer-events-none z-10 max-w-xs">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-2 py-0.5 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: TYPE_COLORS[hoveredStationData.type].bg,
                  color: TYPE_COLORS[hoveredStationData.type].text,
                  border: `1px solid ${TYPE_COLORS[hoveredStationData.type].border}`,
                }}
              >
                {TYPE_LABELS[hoveredStationData.type]}
              </span>
            </div>
            <p className="font-bold text-gray-900 font-mono text-lg">{hoveredStationData.code}</p>
            <p className="text-sm text-gray-600 truncate">{hoveredStationData.name}</p>
            {hoveredStationData.lastInspection ? (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                <Calendar className="w-3 h-3" />
                <span>
                  {new Date(hoveredStationData.lastInspection.inspected_at).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            ) : (
              <div className="text-xs text-amber-600 mt-2">Sin inspecciones</div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center">
              <span className="text-[8px] font-bold text-amber-800">C</span>
            </div>
            <span>Cebadera (Roedor)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center">
              <span className="text-[8px] font-bold text-blue-800">UV</span>
            </div>
            <span>Trampa UV</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-500 flex items-center justify-center">
              <span className="text-[8px] font-bold text-gray-700">O</span>
            </div>
            <span>Otro</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-4 h-4">
              <div className="w-4 h-4 rounded-full bg-gray-200 border-2 border-gray-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </div>
            <span>Inactiva</span>
          </div>
        </div>
      </div>
    </div>
  );
}
