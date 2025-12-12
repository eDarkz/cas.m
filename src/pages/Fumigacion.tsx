import { useState, useEffect, useMemo } from 'react';
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
  Clock,
  Share2,
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
import InspectionDetailModal from '../components/InspectionDetailModal';
import FumigationNavigation from '../components/FumigationNavigation';

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

const CONDITION_BG = {
  BUENA: 'bg-green-100',
  REGULAR: 'bg-amber-100',
  MALA: 'bg-red-100',
};

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const availableYears = Array.from({ length: 6 }, (_, i) => currentYear + i);
const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export default function Fumigacion() {
  const [stations, setStations] = useState<BaitStation[]>([]);
  const [recentInspections, setRecentInspections] = useState<StationInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<StationType | ''>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [inspectionYear, setInspectionYear] = useState<number>(currentYear);
  const [inspectionMonth, setInspectionMonth] = useState<number | ''>(currentMonth);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState<BaitStation | null>(null);
  const [editingStation, setEditingStation] = useState<BaitStation | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'list' | 'map'>('dashboard');
  const [mapFilterType, setMapFilterType] = useState<StationType | ''>('');
  const [selectedInspection, setSelectedInspection] = useState<StationInspection | null>(null);

  const getDateRange = (year: number, month: number | '') => {
    if (month === '') {
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      };
    }
    const lastDay = new Date(year, month, 0).getDate();
    const monthStr = String(month).padStart(2, '0');
    return {
      from: `${year}-${monthStr}-01`,
      to: `${year}-${monthStr}-${lastDay}`,
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange(inspectionYear, inspectionMonth);
      const [stationsData, inspectionsData] = await Promise.all([
        fumigationApi.getStations({
          type: filterType || undefined,
          active: filterActive ?? undefined,
        }),
        fumigationApi.getInspections({
          limit: 100,
          from: dateRange.from,
          to: dateRange.to,
        }),
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
  }, [filterType, filterActive, inspectionYear, inspectionMonth]);

  const enrichedStations = useMemo(() => {
    const inspectionsByStation = new Map<number, StationInspection>();
    recentInspections.forEach((insp) => {
      if (!inspectionsByStation.has(insp.station_id)) {
        inspectionsByStation.set(insp.station_id, insp);
      }
    });

    return stations.map((station) => ({
      ...station,
      lastInspection: station.lastInspection || inspectionsByStation.get(station.id) || null,
    }));
  }, [stations, recentInspections]);

  const filteredStations = enrichedStations.filter((station) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      station.code.toLowerCase().includes(q) ||
      station.name.toLowerCase().includes(q)
    );
  });

  const stationsNeedingAttention = enrichedStations
    .map((station) => {
      const lastInsp = station.lastInspection;
      const daysSinceInspection = lastInsp
        ? Math.floor((Date.now() - new Date(lastInsp.inspected_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const requiresUrgentInspection = lastInsp && (lastInsp.has_bait || lastInsp.bait_replaced);
      const inspectionThreshold = requiresUrgentInspection ? 3 : 30;

      return { ...station, daysSinceInspection, requiresUrgentInspection, inspectionThreshold };
    })
    .filter((s) => s.is_active && (s.daysSinceInspection === 999 || s.daysSinceInspection > s.inspectionThreshold))
    .sort((a, b) => b.daysSinceInspection - a.daysSinceInspection);

  const criticalStations = stationsNeedingAttention.filter((s) => {
    if (s.daysSinceInspection === 999) return true;
    if (s.requiresUrgentInspection) return s.daysSinceInspection > 3;
    return s.daysSinceInspection > 45;
  });

  const warningStations = stationsNeedingAttention.filter((s) => {
    if (s.requiresUrgentInspection) return s.daysSinceInspection <= 3;
    return s.daysSinceInspection > 30 && s.daysSinceInspection <= 45;
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

  const handleCopyScannerLink = async () => {
    const scannerUrl = `${window.location.origin}/fumigacion/scanner`;
    try {
      await navigator.clipboard.writeText(scannerUrl);
      alert('Link del scanner copiado al portapapeles');
    } catch (error) {
      console.error('Error al copiar:', error);
      alert(`Link del scanner: ${scannerUrl}`);
    }
  };

  const stats = {
    total: enrichedStations.length,
    active: enrichedStations.filter((s) => s.is_active).length,
    roedor: enrichedStations.filter((s) => s.type === 'ROEDOR').length,
    uv: enrichedStations.filter((s) => s.type === 'UV').length,
    needsInspection: enrichedStations.filter((s) => {
      if (!s.lastInspection) return true;
      const lastDate = new Date(s.lastInspection.inspected_at);
      const daysSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      const requiresUrgent = s.lastInspection.has_bait || s.lastInspection.bait_replaced;
      const threshold = requiresUrgent ? 3 : 30;
      return daysSince > threshold;
    }).length,
  };

  if (loading && stations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FumigationNavigation />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="text-gray-600">Cargando datos de fumigacion...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FumigationNavigation />
      <div className="p-4 sm:p-6 space-y-6">
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
          <div className="flex gap-1 bg-teal-50 border border-teal-200 rounded-lg p-0.5">
            <Link
              to="/fumigacion/scanner"
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors font-medium"
            >
              <QrCode className="w-5 h-5" />
              Scanner Campo
            </Link>
            <button
              onClick={handleCopyScannerLink}
              className="px-3 py-2 text-teal-700 hover:bg-teal-100 rounded-md transition-colors"
              title="Copiar link para compartir"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
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
          onClick={() => setViewMode('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'dashboard'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          Operativo
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <List className="w-4 h-4" />
          Listado
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

      {viewMode === 'dashboard' ? (
        <div className="space-y-6">
          {criticalStations.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900">Atención Urgente</h3>
                  <p className="text-sm text-red-700">
                    {criticalStations.length} estaciones sin inspección por más de 45 días
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {criticalStations.slice(0, 6).map((station) => (
                  <div
                    key={station.id}
                    className="bg-white border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewDetail(station)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-gray-900">{station.code}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[station.type]}`}>
                            {station.type === 'ROEDOR' ? 'Cebadera' : station.type === 'UV' ? 'UV' : 'Otro'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{station.name}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-bold text-red-600">
                            {station.daysSinceInspection === 999
                              ? 'Sin inspecciones'
                              : `${station.daysSinceInspection} días sin inspección`}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNewInspection(station);
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Inspeccionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {criticalStations.length > 6 && (
                <button
                  onClick={() => setViewMode('list')}
                  className="mt-4 text-sm text-red-700 hover:text-red-800 font-medium flex items-center gap-1"
                >
                  Ver todas las estaciones críticas ({criticalStations.length})
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {warningStations.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-900">Requieren Atención</h3>
                  <p className="text-sm text-amber-700">
                    {warningStations.length} estaciones sin inspección por más de 30 días
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {warningStations.slice(0, 6).map((station) => (
                  <div
                    key={station.id}
                    className="bg-white border border-amber-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewDetail(station)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-semibold text-gray-900 text-sm">{station.code}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${TYPE_COLORS[station.type]}`}>
                            {station.type === 'ROEDOR' ? 'C' : 'UV'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">{station.name}</p>
                        <span className="text-xs text-amber-600 font-medium">
                          {station.daysSinceInspection}d
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNewInspection(station);
                        }}
                        className="px-2 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 transition-colors"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {warningStations.length > 6 && (
                <button
                  onClick={() => setViewMode('list')}
                  className="mt-4 text-sm text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1"
                >
                  Ver todas ({warningStations.length})
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {criticalStations.length === 0 && warningStations.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-green-900 mb-2">¡Todo al día!</h3>
              <p className="text-green-700">
                Todas las estaciones activas han sido inspeccionadas en los últimos 30 días
              </p>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-teal-600" />
                <h3 className="text-lg font-bold text-gray-900">Inspecciones Recientes</h3>
              </div>
              <div className="flex gap-2">
                <select
                  value={inspectionYear}
                  onChange={(e) => setInspectionYear(Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={inspectionMonth}
                  onChange={(e) => setInspectionMonth(e.target.value === '' ? '' : Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Año completo</option>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
              {recentInspections.slice(0, 12).map((insp) => (
                <div
                  key={insp.id}
                  className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedInspection(insp)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${CONDITION_BG[insp.physical_condition]}`}>
                      <ClipboardCheck className={`w-4 h-4 ${CONDITION_COLORS[insp.physical_condition]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-gray-900 text-sm">{insp.station_code}</span>
                        <span className={`text-xs font-medium ${CONDITION_COLORS[insp.physical_condition]}`}>
                          {insp.physical_condition}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{insp.station_name}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(insp.inspected_at).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {recentInspections.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay inspecciones en este periodo</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setViewMode('map')}
              className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl hover:shadow-lg transition-shadow text-left"
            >
              <MapIcon className="w-8 h-8 mb-3" />
              <h4 className="font-bold text-lg mb-1">Ver Mapa</h4>
              <p className="text-sm text-blue-100">Ubicación de estaciones</p>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="bg-gradient-to-br from-gray-500 to-gray-600 text-white p-6 rounded-xl hover:shadow-lg transition-shadow text-left"
            >
              <List className="w-8 h-8 mb-3" />
              <h4 className="font-bold text-lg mb-1">Listado Completo</h4>
              <p className="text-sm text-gray-100">Todas las estaciones</p>
            </button>
            <button
              onClick={handleCreateStation}
              className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-xl hover:shadow-lg transition-shadow text-left"
            >
              <Plus className="w-8 h-8 mb-3" />
              <h4 className="font-bold text-lg mb-1">Nueva Estación</h4>
              <p className="text-sm text-emerald-100">Agregar ubicación</p>
            </button>
          </div>
        </div>
      ) : viewMode === 'map' ? (
        <StationsMapView
          stations={enrichedStations}
          filterType={mapFilterType}
          onFilterChange={setMapFilterType}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bug className="w-5 h-5 text-emerald-600" />
                    <h2 className="font-semibold text-gray-900">Listado de Estaciones</h2>
                    <span className="text-sm text-gray-500">({filteredStations.length})</span>
                  </div>
                  <button
                    onClick={loadData}
                    className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Recargar"
                  >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
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
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    >
                      <option value="">Todos</option>
                      <option value="ROEDOR">Cebaderas</option>
                      <option value="UV">Trampas UV</option>
                      <option value="OTRO">Otros</option>
                    </select>
                    <select
                      value={filterActive === null ? '' : filterActive ? '1' : '0'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilterActive(val === '' ? null : val === '1');
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    >
                      <option value="">Todas</option>
                      <option value="1">Activas</option>
                      <option value="0">Inactivas</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {filteredStations.length === 0 ? (
                  <div className="px-4 py-12 text-center text-gray-500">
                    {searchQuery || filterType || filterActive !== null
                      ? 'No se encontraron estaciones con los filtros aplicados'
                      : 'No hay estaciones registradas'}
                  </div>
                ) : (
                  filteredStations.map((station) => {
                    const lastInsp = station.lastInspection;
                    const daysSinceInspection = lastInsp
                      ? Math.floor(
                          (Date.now() - new Date(lastInsp.inspected_at).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : null;
                    const requiresUrgent = lastInsp && (lastInsp.has_bait || lastInsp.bait_replaced);
                    const threshold = requiresUrgent ? 3 : 30;
                    const needsAttention = daysSinceInspection === null || daysSinceInspection > threshold;

                    return (
                      <div
                        key={station.id}
                        className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleViewDetail(station)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-gray-900 text-lg">
                                {station.code}
                              </span>
                              <span
                                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${
                                  TYPE_COLORS[station.type]
                                }`}
                              >
                                {station.type === 'ROEDOR' ? 'Cebadera' : station.type === 'UV' ? 'Trampa UV' : 'Otro'}
                              </span>
                              {station.is_active ? (
                                <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Activa
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                                  <XCircle className="w-3 h-3" />
                                  Inactiva
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{station.name}</p>
                            {station.utm_x && station.utm_y && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                <MapPin className="w-3 h-3" />
                                {Number(station.utm_x).toFixed(5)}, {Number(station.utm_y).toFixed(5)}
                              </div>
                            )}
                            <div className="mt-2 flex items-center gap-3">
                              {lastInsp ? (
                                <>
                                  <div className="flex items-center gap-1 text-xs">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-600">
                                      {new Date(lastInsp.inspected_at).toLocaleDateString('es-MX', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })}
                                    </span>
                                    <span
                                      className={`ml-1 ${needsAttention ? 'text-red-500 font-medium' : 'text-gray-400'}`}
                                    >
                                      ({daysSinceInspection}d)
                                    </span>
                                  </div>
                                  <span
                                    className={`text-xs font-medium ${CONDITION_COLORS[lastInsp.physical_condition]}`}
                                  >
                                    {lastInsp.physical_condition}
                                  </span>
                                </>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-600 text-xs">
                                  <AlertTriangle className="w-3 h-3" />
                                  Sin inspecciones
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className="flex items-center gap-1"
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
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-teal-600" />
                    <h2 className="font-semibold text-gray-900">Inspecciones</h2>
                    <span className="text-xs text-gray-500">({recentInspections.length})</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={inspectionYear}
                    onChange={(e) => setInspectionYear(Number(e.target.value))}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <select
                    value={inspectionMonth}
                    onChange={(e) => setInspectionMonth(e.target.value === '' ? '' : Number(e.target.value))}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Todo el ano</option>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {recentInspections.length === 0 ? (
                  <div className="px-4 py-12 text-center text-gray-500">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No hay inspecciones en {inspectionMonth ? MONTHS.find(m => m.value === inspectionMonth)?.label : ''} {inspectionYear}</p>
                    <p className="text-xs mt-1">Seleccione otra fecha o realice una inspeccion</p>
                  </div>
                ) : (
                  recentInspections.map((insp) => (
                    <div
                      key={insp.id}
                      className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedInspection(insp)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            CONDITION_BG[insp.physical_condition]
                          }`}
                        >
                          <ClipboardCheck
                            className={`w-5 h-5 ${CONDITION_COLORS[insp.physical_condition]}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-gray-900 text-sm">
                              {insp.station_code}
                            </span>
                            <span
                              className={`text-xs font-medium ${CONDITION_COLORS[insp.physical_condition]}`}
                            >
                              {insp.physical_condition}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 truncate">{insp.station_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>
                              {new Date(insp.inspected_at).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {insp.inspector_nombre && (
                              <>
                                <span>-</span>
                                <span className="truncate">{insp.inspector_nombre}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                insp.has_bait
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {insp.has_bait ? 'Con cebo' : 'Sin cebo'}
                            </span>
                            {insp.bait_replaced ? (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                Reemplazado
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
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

      {selectedInspection && (
        <InspectionDetailModal
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
        />
      )}
      </div>
    </div>
  );
}
