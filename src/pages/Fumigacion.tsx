import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bug,
  Plus,
  Search,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Trash2,
  Edit3,
  ClipboardCheck,
  QrCode,
  List,
  Map as MapIcon,
} from 'lucide-react';
import {
  fumigationApi,
  BaitStation,
  StationType,
  StationInspection,
} from '../lib/fumigationApi';
import CreateStationModal from '../components/CreateStationModal';
import CreateInspectionModal from '../components/CreateInspectionModal';
import StationDetailModal from '../components/StationDetailModal';
import StationsMapView from '../components/StationsMapView';

const TYPE_LABELS: Record<StationType, string> = {
  ROEDOR: 'Cebadera (Roedor)',
  UV: 'Trampa UV',
  OTRO: 'Otro',
};

const TYPE_COLORS: Record<StationType, string> = {
  ROEDOR: 'bg-amber-100 text-amber-800 border-amber-300',
  UV: 'bg-blue-100 text-blue-800 border-blue-300',
  OTRO: 'bg-gray-100 text-gray-800 border-gray-300',
};

const CONDITION_COLORS = {
  BUENA: 'text-green-600',
  REGULAR: 'text-amber-600',
  MALA: 'text-red-600',
};

export default function Fumigacion() {
  const [stations, setStations] = useState<BaitStation[]>([]);
  const [recentInspections, setRecentInspections] = useState<StationInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<StationType | ''>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState<BaitStation | null>(null);
  const [editingStation, setEditingStation] = useState<BaitStation | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [mapFilterType, setMapFilterType] = useState<StationType | ''>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [stationsData, inspectionsData] = await Promise.all([
        fumigationApi.getStations({
          type: filterType || undefined,
          active: filterActive ?? undefined,
        }),
        fumigationApi.getInspections({ limit: 20 }),
      ]);
      setStations(stationsData);
      setRecentInspections(inspectionsData);
    } catch (error) {
      console.error('Error loading fumigation data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterType, filterActive]);

  const filteredStations = stations.filter((station) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      station.code.toLowerCase().includes(q) ||
      station.name.toLowerCase().includes(q)
    );
  });

  const handleCreateStation = () => {
    setEditingStation(null);
    setShowCreateModal(true);
  };

  const handleEditStation = (station: BaitStation) => {
    setEditingStation(station);
    setShowCreateModal(true);
  };

  const handleDeleteStation = async (station: BaitStation) => {
    if (!confirm(`¿Eliminar la estacion "${station.name}"? Esta accion no se puede deshacer.`)) {
      return;
    }
    try {
      await fumigationApi.deleteStation(station.id);
      loadData();
    } catch (error) {
      console.error('Error deleting station:', error);
      alert('Error al eliminar la estacion');
    }
  };

  const handleNewInspection = (station: BaitStation) => {
    setSelectedStation(station);
    setShowInspectionModal(true);
  };

  const handleViewDetail = (station: BaitStation) => {
    setSelectedStation(station);
    setShowDetailModal(true);
  };

  const handleStationSaved = () => {
    setShowCreateModal(false);
    setEditingStation(null);
    loadData();
  };

  const handleInspectionSaved = () => {
    setShowInspectionModal(false);
    setSelectedStation(null);
    loadData();
  };

  const stats = {
    total: stations.length,
    active: stations.filter((s) => s.is_active).length,
    roedor: stations.filter((s) => s.type === 'ROEDOR').length,
    uv: stations.filter((s) => s.type === 'UV').length,
    needsInspection: stations.filter((s) => {
      if (!s.lastInspection) return true;
      const lastDate = new Date(s.lastInspection.inspected_at);
      const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 30;
    }).length,
  };

  if (loading && stations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <span className="text-gray-600">Cargando datos de fumigacion...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Bug className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Control de Cebaderas y Trampas UV
              </h1>
              <p className="text-gray-500">
                Gestion y monitoreo de estaciones de control de plagas
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/fumigacion/scanner"
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            <QrCode className="w-5 h-5" />
            Scanner Campo
          </Link>
          <button
            onClick={handleCreateStation}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nueva Estacion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total estaciones</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-3xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-500">Activas</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-3xl font-bold text-amber-600">{stats.roedor}</div>
          <div className="text-sm text-gray-500">Cebaderas</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-3xl font-bold text-blue-600">{stats.uv}</div>
          <div className="text-sm text-gray-500">Trampas UV</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-3xl font-bold text-red-600">{stats.needsInspection}</div>
          <div className="text-sm text-gray-500">Requieren revision</div>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <List className="w-4 h-4" />
          Lista
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'map'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          Mapa
        </button>
      </div>

      {viewMode === 'map' ? (
        <StationsMapView
          stations={stations}
          filterType={mapFilterType}
          onFilterChange={setMapFilterType}
        />
      ) : (
        <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por codigo o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as StationType | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Todos los tipos</option>
                <option value="ROEDOR">Cebadera (Roedor)</option>
                <option value="UV">Trampa UV</option>
                <option value="OTRO">Otro</option>
              </select>
              <select
                value={filterActive === null ? '' : filterActive ? '1' : '0'}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterActive(val === '' ? null : val === '1');
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Activas e inactivas</option>
                <option value="1">Solo activas</option>
                <option value="0">Solo inactivas</option>
              </select>
              <button
                onClick={loadData}
                className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Recargar"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Codigo
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Ultima inspeccion
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Condicion
                </th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {searchQuery || filterType || filterActive !== null
                      ? 'No se encontraron estaciones con los filtros aplicados'
                      : 'No hay estaciones registradas'}
                  </td>
                </tr>
              ) : (
                filteredStations.map((station) => {
                  const lastInsp = station.lastInspection;
                  const daysSinceInspection = lastInsp
                    ? Math.floor(
                        (Date.now() - new Date(lastInsp.inspected_at).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : null;
                  const needsAttention = daysSinceInspection === null || daysSinceInspection > 30;

                  return (
                    <tr
                      key={station.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetail(station)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-gray-900">
                          {station.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{station.name}</div>
                        {station.utm_x && station.utm_y && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {Number(station.utm_x).toFixed(4)}, {Number(station.utm_y).toFixed(4)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                            TYPE_COLORS[station.type]
                          }`}
                        >
                          {TYPE_LABELS[station.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {station.is_active ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
                            <XCircle className="w-4 h-4" />
                            Inactiva
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lastInsp ? (
                          <div>
                            <div className="flex items-center gap-1 text-sm text-gray-900">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {new Date(lastInsp.inspected_at).toLocaleDateString('es-MX')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {lastInsp.inspector_nombre || 'Sin inspector'}
                              {daysSinceInspection !== null && (
                                <span
                                  className={`ml-1 ${needsAttention ? 'text-red-500 font-medium' : ''}`}
                                >
                                  ({daysSinceInspection}d)
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            Sin inspecciones
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lastInsp ? (
                          <span
                            className={`font-medium text-sm ${
                              CONDITION_COLORS[lastInsp.physical_condition]
                            }`}
                          >
                            {lastInsp.physical_condition}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleNewInspection(station)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Nueva inspeccion"
                          >
                            <ClipboardCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditStation(station)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStation(station)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {recentInspections.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Inspecciones Recientes</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentInspections.slice(0, 10).map((insp) => (
              <div
                key={insp.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      insp.physical_condition === 'BUENA'
                        ? 'bg-green-100'
                        : insp.physical_condition === 'REGULAR'
                        ? 'bg-amber-100'
                        : 'bg-red-100'
                    }`}
                  >
                    <ClipboardCheck
                      className={`w-5 h-5 ${CONDITION_COLORS[insp.physical_condition]}`}
                    />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {insp.station_code} - {insp.station_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {insp.inspector_nombre || 'Sin inspector'} -{' '}
                      {new Date(insp.inspected_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <div className={`font-medium ${CONDITION_COLORS[insp.physical_condition]}`}>
                      {insp.physical_condition}
                    </div>
                    <div className="text-gray-500">
                      {insp.has_bait ? 'Con cebo' : 'Sin cebo'}
                      {insp.bait_replaced ? ' (reemplazado)' : ''}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}

      {showCreateModal && (
        <CreateStationModal
          station={editingStation}
          onClose={() => {
            setShowCreateModal(false);
            setEditingStation(null);
          }}
          onSave={handleStationSaved}
        />
      )}

      {showInspectionModal && selectedStation && (
        <CreateInspectionModal
          station={selectedStation}
          onClose={() => {
            setShowInspectionModal(false);
            setSelectedStation(null);
          }}
          onSave={handleInspectionSaved}
        />
      )}

      {showDetailModal && selectedStation && (
        <StationDetailModal
          station={selectedStation}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedStation(null);
          }}
          onEdit={() => {
            setShowDetailModal(false);
            handleEditStation(selectedStation);
          }}
          onNewInspection={() => {
            setShowDetailModal(false);
            handleNewInspection(selectedStation);
          }}
        />
      )}
    </div>
  );
}
