import { useEffect, useState, useMemo, useCallback } from 'react';
import { fumigationApi } from '../lib/fumigationApi';
import type { StationInspection, BaitStation, StationType, PhysicalCondition } from '../lib/fumigationApi';
import FumigationNavigation from '../components/FumigationNavigation';
import StationPhotoModal from '../components/StationPhotoModal';
import {
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Camera,
  Bug,
  Eye,
  RefreshCw,
} from 'lucide-react';

type SortField = 'inspected_at' | 'station_name' | 'physical_condition' | 'inspector_nombre';
type SortDir = 'asc' | 'desc';

const CONDITION_STYLES: Record<PhysicalCondition, { bg: string; text: string; label: string }> = {
  BUENA: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Buena' },
  REGULAR: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Regular' },
  MALA: { bg: 'bg-red-100', text: 'text-red-800', label: 'Mala' },
};

const TYPE_LABELS: Record<StationType, string> = {
  ROEDOR: 'Cebadera',
  UV: 'Trampa UV',
  OTRO: 'Otro',
};

export default function FumigationInspectionHistory() {
  const [inspections, setInspections] = useState<StationInspection[]>([]);
  const [stations, setStations] = useState<BaitStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStation, setFilterStation] = useState<number | ''>('');
  const [filterType, setFilterType] = useState<StationType | ''>('');
  const [filterCondition, setFilterCondition] = useState<PhysicalCondition | ''>('');
  const [filterHasBait, setFilterHasBait] = useState<'' | '1' | '0'>('');
  const [showFilters, setShowFilters] = useState(false);

  const [sortField, setSortField] = useState<SortField>('inspected_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [inspRes, stationsRes] = await Promise.all([
        fumigationApi.getInspections({
          from: dateFrom || undefined,
          to: dateTo || undefined,
          station_id: filterStation || undefined,
          limit: 500,
        }),
        fumigationApi.getStations(),
      ]);
      setInspections(inspRes);
      setStations(stationsRes);
    } catch (err) {
      console.error('Error loading inspection history:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, filterStation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stationMap = useMemo(() => {
    const m = new Map<number, BaitStation>();
    stations.forEach((s) => m.set(s.id, s));
    return m;
  }, [stations]);

  const filtered = useMemo(() => {
    let result = [...inspections];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          (i.station_name || '').toLowerCase().includes(q) ||
          (i.station_code || '').toLowerCase().includes(q) ||
          (i.inspector_nombre || '').toLowerCase().includes(q) ||
          (i.observations || '').toLowerCase().includes(q),
      );
    }

    if (filterType) {
      const stationIds = new Set(stations.filter((s) => s.type === filterType).map((s) => s.id));
      result = result.filter((i) => stationIds.has(i.station_id));
    }

    if (filterCondition) {
      result = result.filter((i) => i.physical_condition === filterCondition);
    }

    if (filterHasBait === '1') {
      result = result.filter((i) => i.has_bait);
    } else if (filterHasBait === '0') {
      result = result.filter((i) => !i.has_bait);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'inspected_at') {
        cmp = new Date(a.inspected_at).getTime() - new Date(b.inspected_at).getTime();
      } else if (sortField === 'station_name') {
        cmp = (a.station_name || '').localeCompare(b.station_name || '');
      } else if (sortField === 'physical_condition') {
        cmp = a.physical_condition.localeCompare(b.physical_condition);
      } else if (sortField === 'inspector_nombre') {
        cmp = (a.inspector_nombre || '').localeCompare(b.inspector_nombre || '');
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [inspections, searchTerm, filterType, filterCondition, filterHasBait, sortField, sortDir, stations]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const withBait = filtered.filter((i) => i.has_bait).length;
    const baitReplaced = filtered.filter((i) => i.bait_replaced).length;
    const badCondition = filtered.filter((i) => i.physical_condition === 'MALA').length;
    const displaced = filtered.filter((i) => !i.location_ok).length;
    const withPhoto = filtered.filter((i) => i.photo_url).length;
    const uniqueStations = new Set(filtered.map((i) => i.station_id)).size;
    const uniqueInspectors = new Set(filtered.filter((i) => i.inspector_nombre).map((i) => i.inspector_nombre)).size;
    return { total, withBait, baitReplaced, badCondition, displaced, withPhoto, uniqueStations, uniqueInspectors };
  }, [filtered]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === 'desc' ? (
        <ChevronDown className="w-3.5 h-3.5" />
      ) : (
        <ChevronUp className="w-3.5 h-3.5" />
      )
    ) : (
      <ChevronDown className="w-3.5 h-3.5 opacity-30" />
    );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <FumigationNavigation />
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Historial de Inspecciones</h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Todas las inspecciones realizadas a cebaderas y trampas UV
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatPill label="Total" value={stats.total} color="text-stone-800" />
          <StatPill label="Estaciones" value={stats.uniqueStations} color="text-blue-700" />
          <StatPill label="Inspectores" value={stats.uniqueInspectors} color="text-cyan-700" />
          <StatPill label="Con consumo" value={stats.withBait} color="text-orange-700" />
          <StatPill label="Cebo repuesto" value={stats.baitReplaced} color="text-amber-700" />
          <StatPill label="Mala condicion" value={stats.badCondition} color="text-red-700" />
          <StatPill label="Desplazadas" value={stats.displaced} color="text-rose-700" />
          <StatPill label="Con foto" value={stats.withPhoto} color="text-emerald-700" />
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por estacion, inspector, observaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-stone-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
                <span className="text-stone-400 text-xs">a</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <button
                onClick={() => setShowFilters((f) => !f)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  showFilters
                    ? 'bg-sky-50 border-sky-300 text-sky-700'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filtros
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-2 border-t border-stone-100">
              <select
                value={filterStation}
                onChange={(e) => setFilterStation(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="">Todas las estaciones</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as StationType | '')}
                className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="">Todos los tipos</option>
                <option value="ROEDOR">Cebadera</option>
                <option value="UV">Trampa UV</option>
                <option value="OTRO">Otro</option>
              </select>
              <select
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value as PhysicalCondition | '')}
                className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="">Toda condicion</option>
                <option value="BUENA">Buena</option>
                <option value="REGULAR">Regular</option>
                <option value="MALA">Mala</option>
              </select>
              <select
                value={filterHasBait}
                onChange={(e) => setFilterHasBait(e.target.value as '' | '1' | '0')}
                className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="">Consumo: todos</option>
                <option value="1">Con consumo</option>
                <option value="0">Sin consumo</option>
              </select>
              <button
                onClick={() => {
                  setFilterStation('');
                  setFilterType('');
                  setFilterCondition('');
                  setFilterHasBait('');
                  setSearchTerm('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700 underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-stone-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando inspecciones...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <Bug className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No se encontraron inspecciones</p>
            <p className="text-xs mt-1">Ajusta los filtros o el rango de fechas</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="text-left px-4 py-3">
                      <button onClick={() => toggleSort('inspected_at')} className="flex items-center gap-1 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                        Fecha <SortIcon field="inspected_at" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3">
                      <button onClick={() => toggleSort('station_name')} className="flex items-center gap-1 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                        Estacion <SortIcon field="station_name" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Tipo</span>
                    </th>
                    <th className="text-left px-4 py-3">
                      <button onClick={() => toggleSort('physical_condition')} className="flex items-center gap-1 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                        Condicion <SortIcon field="physical_condition" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Indicadores</span>
                    </th>
                    <th className="text-left px-4 py-3">
                      <button onClick={() => toggleSort('inspector_nombre')} className="flex items-center gap-1 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                        Inspector <SortIcon field="inspector_nombre" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3 w-16">
                      <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Detalle</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((insp) => {
                    const station = stationMap.get(insp.station_id);
                    const isExpanded = expandedId === insp.id;
                    const condStyle = CONDITION_STYLES[insp.physical_condition] || CONDITION_STYLES.BUENA;

                    return (
                      <InspectionRow
                        key={insp.id}
                        insp={insp}
                        station={station}
                        condStyle={condStyle}
                        isExpanded={isExpanded}
                        onToggle={() => setExpandedId(isExpanded ? null : insp.id)}
                        onPhoto={setPhotoUrl}
                        formatDate={formatDate}
                        formatTime={formatTime}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 text-xs text-stone-500">
              Mostrando {filtered.length} de {inspections.length} inspecciones
            </div>
          </div>
        )}
      </div>
      {photoUrl && <StationPhotoModal url={photoUrl} onClose={() => setPhotoUrl(null)} />}
    </>
  );
}

function InspectionRow({
  insp,
  station,
  condStyle,
  isExpanded,
  onToggle,
  onPhoto,
  formatDate,
  formatTime,
}: {
  insp: StationInspection;
  station: BaitStation | undefined;
  condStyle: { bg: string; text: string; label: string };
  isExpanded: boolean;
  onToggle: () => void;
  onPhoto: (url: string) => void;
  formatDate: (d: string) => string;
  formatTime: (d: string) => string;
}) {
  return (
    <>
      <tr
        className={`border-b border-stone-100 hover:bg-stone-50/50 transition-colors cursor-pointer ${
          isExpanded ? 'bg-sky-50/30' : ''
        }`}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="text-sm font-medium text-stone-800">{formatDate(insp.inspected_at)}</div>
          <div className="text-[11px] text-stone-400">{formatTime(insp.inspected_at)}</div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm font-medium text-stone-800">{insp.station_code || `#${insp.station_id}`}</div>
          <div className="text-[11px] text-stone-500 truncate max-w-[180px]">{insp.station_name}</div>
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          {station && (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600">
              {TYPE_LABELS[station.type]}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${condStyle.bg} ${condStyle.text}`}>
            {condStyle.label}
          </span>
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <div className="flex items-center gap-2">
            {insp.has_bait ? (
              <span className="flex items-center gap-1 text-[10px] text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Consumo
              </span>
            ) : null}
            {insp.bait_replaced ? (
              <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                <RefreshCw className="w-3 h-3" /> Repuesto
              </span>
            ) : null}
            {!insp.location_ok ? (
              <span className="flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full">
                <MapPin className="w-3 h-3" /> Desplazada
              </span>
            ) : null}
            {insp.photo_url ? (
              <span className="text-[10px] text-sky-600">
                <Camera className="w-3 h-3" />
              </span>
            ) : null}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-stone-700">{insp.inspector_nombre || '-'}</div>
          {insp.inspector_empresa && (
            <div className="text-[10px] text-stone-400">{insp.inspector_empresa}</div>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <button className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600">
            <Eye className="w-4 h-4" />
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-sky-50/40 border-b border-stone-200">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Estacion</h4>
                <div className="text-sm text-stone-800">
                  <strong>{insp.station_code}</strong> - {insp.station_name}
                </div>
                {station && (
                  <div className="text-xs text-stone-500">
                    Tipo: {TYPE_LABELS[station.type]} | Instalada: {station.installed_at ? formatDate(station.installed_at) : 'No registrada'}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Indicadores</h4>
                <div className="flex flex-wrap gap-2">
                  <IndicatorPill
                    active={!!insp.has_bait}
                    label="Consumo de cebo"
                    icon={insp.has_bait ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  />
                  <IndicatorPill
                    active={!!insp.bait_replaced}
                    label="Cebo repuesto"
                    icon={insp.bait_replaced ? <RefreshCw className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  />
                  <IndicatorPill
                    active={!insp.location_ok}
                    label={insp.location_ok ? 'En posicion' : 'Desplazada'}
                    icon={<MapPin className="w-3 h-3" />}
                  />
                </div>
                <div className="text-xs text-stone-600">
                  Condicion fisica: <span className={`font-semibold ${condStyle.text}`}>{condStyle.label}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Detalles</h4>
                {insp.observations && (
                  <p className="text-xs text-stone-600 bg-white rounded-lg border border-stone-200 p-2">
                    {insp.observations}
                  </p>
                )}
                {insp.lat && insp.lng && (
                  <a
                    href={`https://maps.google.com/?q=${insp.lat},${insp.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MapPin className="w-3 h-3" />
                    Ver ubicacion GPS
                  </a>
                )}
                {insp.photo_url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPhoto(insp.photo_url!);
                    }}
                    className="block"
                  >
                    <img
                      src={insp.photo_url}
                      alt="Foto de inspeccion"
                      className="w-24 h-24 object-cover rounded-lg border border-stone-200 hover:opacity-80 transition-opacity"
                    />
                  </button>
                )}
                {!insp.observations && !insp.photo_url && !insp.lat && (
                  <p className="text-xs text-stone-400 italic">Sin detalles adicionales</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function IndicatorPill({ active, label, icon }: { active: boolean; label: string; icon: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
        active ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200/80 p-3">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
