import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Home,
  Bug,
  Calendar,
  Users,
  RefreshCw,
  ArrowLeft,
  Target,
  Activity,
  Zap,
  MapPin,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Eye,
  Shield,
  Thermometer,
  X,
} from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import {
  fumigationApi,
  FumigationCycle,
  RoomFumigation,
  BaitStation,
  StationInspection,
  ServiceType,
} from '../lib/fumigationApi';
import FumigationNavigation from '../components/FumigationNavigation';

function parseRoomArea(roomNumber: string): { edificio: number; piso: number; habitacion: string; zona: string; label: string } {
  const num = roomNumber.replace(/\D/g, '');
  if (num.length < 3) return { edificio: 0, piso: 0, habitacion: num, zona: 'Otro', label: 'Otro' };
  const edificio = parseInt(num[0], 10);
  const piso = parseInt(num[1], 10);
  const habitacion = num.slice(2);
  const zona = [1, 2, 3, 4, 5].includes(edificio) ? 'Regular' : [6, 7, 8].includes(edificio) ? 'Preferred' : 'Otro';
  const label = `Torre ${edificio} - Piso ${piso} (${zona})`;
  return { edificio, piso, habitacion, zona, label };
}


type TabId = 'overview' | 'rooms' | 'stations' | 'operators' | 'alerts';

interface ExpandableTableProps<T> {
  title: string;
  icon: React.ReactNode;
  data: T[];
  columns: { key: string; label: string; render: (item: T) => React.ReactNode; sortable?: boolean; className?: string }[];
  emptyMessage?: string;
  badgeCount?: number;
  badgeColor?: string;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  defaultExpanded?: boolean;
  maxHeight?: string;
}

function ExpandableTable<T extends Record<string, any>>({
  title, icon, data, columns, emptyMessage, badgeCount, badgeColor = 'bg-slate-500',
  searchable = false, searchKeys = [], defaultExpanded = false, maxHeight = 'max-h-[600px]',
}: ExpandableTableProps<T>) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(item =>
      searchKeys.some(k => String(item[k] ?? '').toLowerCase().includes(q))
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortCol, sortDir]);

  const count = badgeCount ?? data.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-slate-800">{title}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${badgeColor}`}>{count}</span>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      {expanded && (
        <div className="border-t border-slate-100">
          {searchable && (
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
          <div className={`overflow-auto ${maxHeight}`}>
            {sorted.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">{emptyMessage || 'Sin datos'}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {columns.map(col => (
                      <th
                        key={col.key}
                        className={`px-4 py-2.5 text-left font-medium text-slate-600 ${col.sortable ? 'cursor-pointer hover:text-slate-900' : ''} ${col.className || ''}`}
                        onClick={() => {
                          if (!col.sortable) return;
                          if (sortCol === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                          else { setSortCol(col.key); setSortDir('asc'); }
                        }}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {col.sortable && sortCol === col.key && (
                            <span className="text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {columns.map(col => (
                        <td key={col.key} className={`px-4 py-2.5 ${col.className || ''}`}>
                          {col.render(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="p-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-right">
            {sorted.length} de {data.length} registros
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, subtitle, icon, color = 'blue', trend }: {
  label: string; value: string | number; subtitle?: string; icon: React.ReactNode;
  color?: string; trend?: { value: number; label: string };
}) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-indigo-500 to-indigo-600',
    teal: 'from-teal-500 to-teal-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors[color] || colors.blue} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      {trend && (
        <div className={`flex items-center gap-1 text-xs ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(trend.value).toFixed(1)}% {trend.label}</span>
        </div>
      )}
    </div>
  );
}

function ProgressRing({ value, size = 80, strokeWidth = 8, color = '#3b82f6' }: {
  value: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
        strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-700"
      />
    </svg>
  );
}

export default function FumigationExecutiveReport() {
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<FumigationCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [allRooms, setAllRooms] = useState<Map<number, RoomFumigation[]>>(new Map());
  const [stations, setStations] = useState<BaitStation[]>([]);
  const [inspections, setInspections] = useState<StationInspection[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [inspectionPeriod, setInspectionPeriod] = useState('30');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cyclesData, stationsData, inspectionsData] = await Promise.all([
        fumigationApi.getCycles(),
        fumigationApi.getStations(),
        fumigationApi.getInspections({ limit: 5000 }),
      ]);
      setCycles(cyclesData);
      setStations(stationsData);
      setInspections(inspectionsData);

      const openCycle = cyclesData.find(c => c.status === 'ABIERTO') || cyclesData[0];
      if (openCycle && !selectedCycleId) setSelectedCycleId(openCycle.id);

      const roomsMap = new Map<number, RoomFumigation[]>();
      await Promise.all(cyclesData.map(async (cycle) => {
        try {
          const rooms = await fumigationApi.getCycleRooms(cycle.id);
          roomsMap.set(cycle.id, rooms);
        } catch { /* skip */ }
      }));
      setAllRooms(roomsMap);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedCycle = cycles.find(c => c.id === selectedCycleId) || null;
  const currentRooms = selectedCycleId ? (allRooms.get(selectedCycleId) || []) : [];

  const inspectionCutoff = useMemo(() => {
    if (inspectionPeriod === 'all') return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(inspectionPeriod));
    return d.toISOString();
  }, [inspectionPeriod]);

  const filteredInspections = useMemo(() => {
    if (!inspectionCutoff) return inspections;
    return inspections.filter(i => i.inspected_at >= inspectionCutoff);
  }, [inspections, inspectionCutoff]);

  const cycleStats = useMemo(() => {
    if (!selectedCycle) return null;
    const total = currentRooms.length;
    const completed = currentRooms.filter(r => r.status === 'COMPLETADA').length;
    const pending = currentRooms.filter(r => r.status === 'PENDIENTE').length;
    const noAplica = currentRooms.filter(r => r.status === 'NO_APLICA').length;
    const applicable = total - noAplica;
    const completionPct = applicable > 0 ? (completed / applicable) * 100 : 0;

    const startDate = new Date(selectedCycle.period_start);
    const endDate = new Date(selectedCycle.period_end);
    const today = new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
    const elapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / 86400000));
    const remaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / 86400000));

    const completedRooms = currentRooms.filter(r => r.status === 'COMPLETADA' && r.fumigated_at);
    const velocityActual = elapsed > 0 ? completed / elapsed : 0;
    const velocityRequired = remaining > 0 ? pending / remaining : pending;

    const projectedCompletion = velocityActual > 0
      ? new Date(today.getTime() + (pending / velocityActual) * 86400000)
      : null;

    const isOnTrack = velocityActual >= velocityRequired || pending === 0;

    return {
      total, completed, pending, noAplica, applicable, completionPct,
      totalDays, elapsed, remaining, velocityActual, velocityRequired,
      projectedCompletion, isOnTrack, completedRooms,
    };
  }, [selectedCycle, currentRooms]);

  const roomAnalysis = useMemo(() => {
    const roomHistory: Map<string, { room_number: string; area: string | null; fumigations: { date: string; service: ServiceType; operator: string | null; cycle: string }[] }> = new Map();

    for (const [cycleId, rooms] of allRooms.entries()) {
      const cycle = cycles.find(c => c.id === cycleId);
      for (const room of rooms) {
        if (!roomHistory.has(room.room_number)) {
          roomHistory.set(room.room_number, { room_number: room.room_number, area: room.area, fumigations: [] });
        }
        if (room.status === 'COMPLETADA' && room.fumigated_at) {
          roomHistory.get(room.room_number)!.fumigations.push({
            date: room.fumigated_at,
            service: room.service_type,
            operator: room.fumigator_nombre,
            cycle: cycle?.label || `Ciclo ${cycleId}`,
          });
        }
      }
    }

    const allRoomStats = Array.from(roomHistory.values()).map(r => {
      const lastFum = r.fumigations.sort((a, b) => b.date.localeCompare(a.date))[0];
      const daysSince = lastFum ? Math.ceil((Date.now() - new Date(lastFum.date).getTime()) / 86400000) : null;
      const parsed = parseRoomArea(r.room_number);
      return {
        room_number: r.room_number,
        area: parsed.label,
        zona: parsed.zona,
        edificio: parsed.edificio,
        piso: parsed.piso,
        fumigationCount: r.fumigations.length,
        lastFumigated: lastFum?.date || null,
        daysSinceLastFumigation: daysSince,
        lastService: lastFum?.service || null,
        lastOperator: lastFum?.operator || null,
      };
    });

    const neverFumigated = allRoomStats.filter(r => r.fumigationCount === 0);
    const over60Days = allRoomStats.filter(r => r.daysSinceLastFumigation !== null && r.daysSinceLastFumigation > 60);
    const over30Days = allRoomStats.filter(r => r.daysSinceLastFumigation !== null && r.daysSinceLastFumigation > 30);

    return { allRoomStats, neverFumigated, over60Days, over30Days };
  }, [allRooms, cycles]);

  const stationAnalysis = useMemo(() => {
    const stationMap = new Map<number, { station: BaitStation; inspections: StationInspection[] }>();
    for (const s of stations) {
      stationMap.set(s.id, { station: s, inspections: [] });
    }
    for (const insp of filteredInspections) {
      const entry = stationMap.get(insp.station_id);
      if (entry) entry.inspections.push(insp);
    }

    const stats = Array.from(stationMap.values()).map(({ station, inspections: insps }) => {
      const sorted = insps.sort((a, b) => b.inspected_at.localeCompare(a.inspected_at));
      const last = sorted[0];
      const daysSince = last ? Math.ceil((Date.now() - new Date(last.inspected_at).getTime()) / 86400000) : null;
      const consumptions = insps.filter(i => !i.has_bait).length;
      const presences = insps.filter(i => i.observations?.toLowerCase().includes('excremento') || i.observations?.toLowerCase().includes('presencia')).length;
      const badCondition = insps.filter(i => i.physical_condition === 'MALA').length;
      const noGps = insps.filter(i => !i.lat || !i.lng).length;

      return {
        id: station.id,
        code: station.code,
        name: station.name,
        type: station.type,
        is_active: station.is_active,
        inspectionCount: insps.length,
        lastInspected: last?.inspected_at || null,
        daysSinceLastInspection: daysSince,
        lastCondition: last?.physical_condition || null,
        consumptions,
        presences,
        badCondition,
        noGps,
        hasBait: last?.has_bait ?? null,
      };
    });

    const neverInspected = stats.filter(s => s.inspectionCount === 0 && s.is_active);
    const over30Days = stats.filter(s => s.daysSinceLastInspection !== null && s.daysSinceLastInspection > 30);
    const withConsumption = stats.filter(s => s.consumptions > 0).sort((a, b) => b.consumptions - a.consumptions);
    const withPresence = stats.filter(s => s.presences > 0).sort((a, b) => b.presences - a.presences);
    const inBadCondition = stats.filter(s => s.lastCondition === 'MALA');

    const totalInspected = stats.filter(s => s.inspectionCount > 0).length;
    const coverage = stations.length > 0 ? (totalInspected / stations.filter(s => s.is_active).length) * 100 : 0;

    return { stats, neverInspected, over30Days, withConsumption, withPresence, inBadCondition, totalInspected, coverage };
  }, [stations, filteredInspections]);

  const operatorStats = useMemo(() => {
    const opMap = new Map<string, { name: string; rooms: number; services: Map<string, number>; avgPerDay: number; dates: Set<string> }>();
    for (const rooms of allRooms.values()) {
      for (const room of rooms) {
        if (room.status !== 'COMPLETADA' || !room.fumigator_nombre) continue;
        const key = room.fumigator_nombre;
        if (!opMap.has(key)) opMap.set(key, { name: key, rooms: 0, services: new Map(), avgPerDay: 0, dates: new Set() });
        const op = opMap.get(key)!;
        op.rooms++;
        op.services.set(room.service_type, (op.services.get(room.service_type) || 0) + 1);
        if (room.fumigated_at) op.dates.add(room.fumigated_at.split('T')[0]);
      }
    }
    return Array.from(opMap.values()).map(op => ({
      name: op.name,
      rooms: op.rooms,
      daysWorked: op.dates.size,
      avgPerDay: op.dates.size > 0 ? op.rooms / op.dates.size : 0,
      services: Object.fromEntries(op.services),
    })).sort((a, b) => b.rooms - a.rooms);
  }, [allRooms]);

  const serviceDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const rooms of allRooms.values()) {
      for (const room of rooms) {
        if (room.status !== 'COMPLETADA') continue;
        dist[room.service_type] = (dist[room.service_type] || 0) + 1;
      }
    }
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
  }, [allRooms]);

  const alerts = useMemo(() => {
    const items: { severity: 'critical' | 'warning' | 'info'; message: string; detail: string }[] = [];

    if (cycleStats && !cycleStats.isOnTrack && cycleStats.remaining > 0) {
      items.push({ severity: 'critical', message: 'Ciclo atrasado', detail: `Necesita ${cycleStats.velocityRequired.toFixed(1)} hab/dia pero lleva ${cycleStats.velocityActual.toFixed(1)} hab/dia` });
    }
    if (stationAnalysis.withConsumption.length > 0) {
      items.push({ severity: 'critical', message: `${stationAnalysis.withConsumption.length} estaciones con consumo de veneno`, detail: 'Posible actividad de roedores detectada' });
    }
    if (stationAnalysis.withPresence.length > 0) {
      items.push({ severity: 'critical', message: `${stationAnalysis.withPresence.length} estaciones con presencia de plagas`, detail: 'Excrementos u otros indicadores encontrados' });
    }
    if (roomAnalysis.neverFumigated.length > 0) {
      items.push({ severity: 'warning', message: `${roomAnalysis.neverFumigated.length} habitaciones nunca fumigadas`, detail: 'No tienen registro historico de fumigacion' });
    }
    if (roomAnalysis.over60Days.length > 0) {
      items.push({ severity: 'warning', message: `${roomAnalysis.over60Days.length} habitaciones con +60 dias sin fumigar`, detail: 'Riesgo alto de infestacion' });
    }
    if (stationAnalysis.neverInspected.length > 0) {
      items.push({ severity: 'warning', message: `${stationAnalysis.neverInspected.length} estaciones nunca inspeccionadas`, detail: 'Sin registro historico de revision' });
    }
    if (stationAnalysis.inBadCondition.length > 0) {
      items.push({ severity: 'info', message: `${stationAnalysis.inBadCondition.length} estaciones en mala condicion`, detail: 'Requieren mantenimiento o reemplazo' });
    }
    return items;
  }, [cycleStats, stationAnalysis, roomAnalysis]);

  const exportCSV = (rows: Record<string, any>[], filename: string) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <HamsterLoader />
    </div>
  );

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Resumen', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'rooms', label: 'Habitaciones', icon: <Home className="w-4 h-4" />, badge: currentRooms.length },
    { id: 'stations', label: 'Estaciones', icon: <MapPin className="w-4 h-4" />, badge: stations.length },
    { id: 'operators', label: 'Operadores', icon: <Users className="w-4 h-4" />, badge: operatorStats.length },
    { id: 'alerts', label: 'Alertas', icon: <AlertTriangle className="w-4 h-4" />, badge: alerts.filter(a => a.severity === 'critical').length },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <FumigationNavigation />
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to="/fumigacion" className="text-slate-400 hover:text-slate-600">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Centro de Control Fumigacion</h1>
            </div>
            <p className="text-sm text-slate-500 ml-8">Panel ejecutivo de decision y seguimiento operativo</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCycleId || ''}
              onChange={e => setSelectedCycleId(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {cycles.map(c => (
                <option key={c.id} value={c.id}>
                  {c.label} {c.status === 'ABIERTO' ? '(Activo)' : ''}
                </option>
              ))}
            </select>
            <select
              value={inspectionPeriod}
              onChange={e => setInspectionPeriod(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Ultimos 7 dias</option>
              <option value="30">Ultimos 30 dias</option>
              <option value="60">Ultimos 60 dias</option>
              <option value="90">Ultimos 90 dias</option>
              <option value="all">Todo el historial</option>
            </select>
            <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'
                }`}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && <OverviewTab cycleStats={cycleStats} selectedCycle={selectedCycle} currentRooms={currentRooms} stationAnalysis={stationAnalysis} roomAnalysis={roomAnalysis} operatorStats={operatorStats} serviceDistribution={serviceDistribution} alerts={alerts} filteredInspections={filteredInspections} stations={stations} cycles={cycles} allRooms={allRooms} />}
        {activeTab === 'rooms' && <RoomsTab currentRooms={currentRooms} roomAnalysis={roomAnalysis} selectedCycle={selectedCycle} exportCSV={exportCSV} />}
        {activeTab === 'stations' && <StationsTab stationAnalysis={stationAnalysis} stations={stations} filteredInspections={filteredInspections} exportCSV={exportCSV} />}
        {activeTab === 'operators' && <OperatorsTab operatorStats={operatorStats} exportCSV={exportCSV} />}
        {activeTab === 'alerts' && <AlertsTab alerts={alerts} roomAnalysis={roomAnalysis} stationAnalysis={stationAnalysis} />}
      </div>
    </div>
  );
}

function OverviewTab({ cycleStats, selectedCycle, currentRooms, stationAnalysis, roomAnalysis, operatorStats, serviceDistribution, alerts, filteredInspections, stations, cycles, allRooms }: any) {
  return (
    <div className="space-y-6">
      {/* Critical alerts banner */}
      {alerts.filter((a: any) => a.severity === 'critical').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-800">Alertas Criticas</span>
          </div>
          <div className="grid gap-2">
            {alerts.filter((a: any) => a.severity === 'critical').map((alert: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                <span className="font-medium text-red-800">{alert.message}</span>
                <span className="text-red-600">{alert.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      {cycleStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label="Total Habitaciones" value={cycleStats.applicable} subtitle={`${cycleStats.noAplica} no aplican`} icon={<Home className="w-4 h-4 text-white" />} color="blue" />
          <KpiCard label="Completadas" value={cycleStats.completed} subtitle={`${cycleStats.completionPct.toFixed(1)}% avance`} icon={<CheckCircle2 className="w-4 h-4 text-white" />} color="green" />
          <KpiCard label="Pendientes" value={cycleStats.pending} subtitle={`${cycleStats.remaining} dias restantes`} icon={<Clock className="w-4 h-4 text-white" />} color="amber" />
          <KpiCard label="Velocidad Actual" value={`${cycleStats.velocityActual.toFixed(1)}`} subtitle={`Necesita ${cycleStats.velocityRequired.toFixed(1)} hab/dia`} icon={<Zap className="w-4 h-4 text-white" />} color={cycleStats.isOnTrack ? 'green' : 'red'} />
          <KpiCard label="Estaciones" value={stations.filter((s: BaitStation) => s.is_active).length} subtitle={`${stationAnalysis.coverage.toFixed(0)}% cobertura`} icon={<MapPin className="w-4 h-4 text-white" />} color="teal" />
          <KpiCard label="Inspecciones" value={filteredInspections.length} subtitle={`Periodo seleccionado`} icon={<Eye className="w-4 h-4 text-white" />} color="purple" />
        </div>
      )}

      {/* Cycle progress */}
      {cycleStats && selectedCycle && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center gap-6">
            <div className="relative">
              <ProgressRing value={cycleStats.completionPct} size={100} strokeWidth={10} color={cycleStats.isOnTrack ? '#10b981' : '#ef4444'} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-900">{cycleStats.completionPct.toFixed(0)}%</span>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{selectedCycle.label}</h3>
              <p className="text-sm text-slate-500">{selectedCycle.period_start} → {selectedCycle.period_end}</p>
              <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                cycleStats.isOnTrack ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {cycleStats.isOnTrack ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {cycleStats.isOnTrack ? 'En meta' : 'Atrasado'}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-sm font-medium text-slate-500 mb-3">Proyeccion</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Dias transcurridos</span>
                <span className="font-medium">{cycleStats.elapsed} / {cycleStats.totalDays}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (cycleStats.elapsed / cycleStats.totalDays) * 100)}%` }} />
              </div>
              {cycleStats.projectedCompletion && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Fin proyectado</span>
                  <span className={`font-medium ${cycleStats.projectedCompletion > new Date(selectedCycle.period_end) ? 'text-red-600' : 'text-emerald-600'}`}>
                    {cycleStats.projectedCompletion.toISOString().split('T')[0]}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Aceleracion requerida</span>
                <span className={`font-medium ${cycleStats.velocityRequired > cycleStats.velocityActual ? 'text-red-600' : 'text-emerald-600'}`}>
                  {cycleStats.velocityRequired > cycleStats.velocityActual ? '+' : ''}{(cycleStats.velocityRequired - cycleStats.velocityActual).toFixed(1)} hab/dia
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h4 className="text-sm font-medium text-slate-500 mb-3">Distribucion de Servicios</h4>
            <div className="space-y-2">
              {serviceDistribution.slice(0, 6).map(([type, count]: [string, number]) => {
                const total = serviceDistribution.reduce((s: number, [, c]: [string, number]) => s + c, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-28 truncate">{type}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-700 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pest activity summary */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bug className="w-5 h-5 text-red-500" />
            <h4 className="font-semibold text-slate-900">Actividad de Plagas</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{stationAnalysis.withConsumption.length}</div>
              <div className="text-xs text-red-600">Con consumo</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">{stationAnalysis.withPresence.length}</div>
              <div className="text-xs text-amber-600">Con presencia</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-700">{stationAnalysis.inBadCondition.length}</div>
              <div className="text-xs text-slate-600">Mala condicion</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{stationAnalysis.neverInspected.length}</div>
              <div className="text-xs text-blue-600">Sin inspeccionar</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-slate-900">Estado de Habitaciones</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{roomAnalysis.neverFumigated.length}</div>
              <div className="text-xs text-red-600">Nunca fumigadas</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">{roomAnalysis.over60Days.length}</div>
              <div className="text-xs text-amber-600">+60 dias</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{roomAnalysis.over30Days.length}</div>
              <div className="text-xs text-yellow-600">+30 dias</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-700">
                {roomAnalysis.allRoomStats.filter((r: any) => r.daysSinceLastFumigation !== null && r.daysSinceLastFumigation <= 30).length}
              </div>
              <div className="text-xs text-emerald-600">Al dia (&lt;30d)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top operators quick view */}
      {operatorStats.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-500" />
            <h4 className="font-semibold text-slate-900">Rendimiento de Operadores</h4>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {operatorStats.slice(0, 6).map((op: any, i: number) => (
              <div key={op.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{op.name}</div>
                  <div className="text-xs text-slate-500">{op.rooms} hab &middot; {op.avgPerDay.toFixed(1)} hab/dia</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoomsTab({ currentRooms, roomAnalysis, selectedCycle, exportCSV }: any) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'never' | 'over60'>('all');

  const displayData = useMemo(() => {
    const mapRoom = (r: RoomFumigation) => {
      const p = parseRoomArea(r.room_number);
      return {
        room_number: r.room_number, area: p.label, zona: p.zona, edificio: p.edificio, piso: p.piso,
        status: r.status, fumigated_at: r.fumigated_at?.split('T')[0] || '-',
        service_type: r.service_type || '-', fumigator: r.fumigator_nombre || '-',
      };
    };
    switch (filter) {
      case 'pending': return currentRooms.filter((r: RoomFumigation) => r.status === 'PENDIENTE').map(mapRoom);
      case 'completed': return currentRooms.filter((r: RoomFumigation) => r.status === 'COMPLETADA').map(mapRoom);
      case 'never': return roomAnalysis.neverFumigated.map((r: any) => ({
        room_number: r.room_number, area: r.area, zona: r.zona, edificio: r.edificio, piso: r.piso,
        status: 'NUNCA', fumigated_at: '-', service_type: '-', fumigator: '-',
      }));
      case 'over60': return roomAnalysis.over60Days.map((r: any) => ({
        room_number: r.room_number, area: r.area, zona: r.zona, edificio: r.edificio, piso: r.piso,
        status: `${r.daysSinceLastFumigation}d`, fumigated_at: r.lastFumigated?.split('T')[0] || '-',
        service_type: r.lastService || '-', fumigator: r.lastOperator || '-',
      }));
      default: return currentRooms.map(mapRoom);
    }
  }, [filter, currentRooms, roomAnalysis]);

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'Todas', currentRooms.length],
          ['pending', 'Pendientes', currentRooms.filter((r: RoomFumigation) => r.status === 'PENDIENTE').length],
          ['completed', 'Completadas', currentRooms.filter((r: RoomFumigation) => r.status === 'COMPLETADA').length],
          ['never', 'Nunca fumigadas', roomAnalysis.neverFumigated.length],
          ['over60', '+60 dias', roomAnalysis.over60Days.length],
        ] as [string, string, number][]).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {label} <span className="ml-1 opacity-75">({count})</span>
          </button>
        ))}
        <button
          onClick={() => exportCSV(displayData, `habitaciones_${filter}_${new Date().toISOString().split('T')[0]}.csv`)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Full table */}
      <ExpandableTable
        title={`Habitaciones - ${filter === 'all' ? 'Todas' : filter === 'pending' ? 'Pendientes' : filter === 'completed' ? 'Completadas' : filter === 'never' ? 'Nunca fumigadas' : '+60 dias'}`}
        icon={<Home className="w-5 h-5 text-blue-500" />}
        data={displayData}
        columns={[
          { key: 'room_number', label: 'Habitacion', sortable: true, render: (item: any) => <span className="font-medium text-slate-900">{item.room_number}</span> },
          { key: 'zona', label: 'Zona', sortable: true, render: (item: any) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              item.zona === 'Preferred' ? 'bg-amber-100 text-amber-700' : item.zona === 'Regular' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
            }`}>{item.zona}</span>
          )},
          { key: 'edificio', label: 'Torre', sortable: true, render: (item: any) => <span className="text-slate-700">T{item.edificio}</span> },
          { key: 'piso', label: 'Piso', sortable: true, render: (item: any) => <span className="text-slate-600">{item.piso}</span> },
          { key: 'status', label: 'Estado', sortable: true, render: (item: any) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              item.status === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' :
              item.status === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' :
              item.status === 'NUNCA' ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-700'
            }`}>{item.status}</span>
          )},
          { key: 'fumigated_at', label: 'Fecha', sortable: true, render: (item: any) => <span className="text-slate-600 text-xs">{item.fumigated_at}</span> },
          { key: 'service_type', label: 'Servicio', sortable: true, render: (item: any) => <span className="text-slate-600 text-xs">{item.service_type}</span> },
          { key: 'fumigator', label: 'Operador', sortable: true, render: (item: any) => <span className="text-slate-600 text-xs">{item.fumigator}</span> },
        ]}
        searchable
        searchKeys={['room_number', 'zona', 'fumigator']}
        defaultExpanded
        badgeCount={displayData.length}
        badgeColor={filter === 'never' || filter === 'over60' ? 'bg-red-500' : filter === 'pending' ? 'bg-amber-500' : 'bg-blue-500'}
        maxHeight="max-h-[700px]"
      />

      {/* Area breakdown */}
      <ExpandableTable
        title="Desglose por Torre"
        icon={<BarChart3 className="w-5 h-5 text-teal-500" />}
        data={(() => {
          const towerMap = new Map<string, { total: number; completed: number; pending: number; zona: string }>();
          currentRooms.forEach((r: RoomFumigation) => {
            const p = parseRoomArea(r.room_number);
            const key = `Torre ${p.edificio}`;
            if (!towerMap.has(key)) towerMap.set(key, { total: 0, completed: 0, pending: 0, zona: p.zona });
            const a = towerMap.get(key)!;
            a.total++;
            if (r.status === 'COMPLETADA') a.completed++;
            if (r.status === 'PENDIENTE') a.pending++;
          });
          return Array.from(towerMap.entries()).map(([torre, stats]) => ({
            torre, zona: stats.zona, ...stats, pct: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0',
          })).sort((a, b) => a.torre.localeCompare(b.torre));
        })()}
        columns={[
          { key: 'torre', label: 'Torre', sortable: true, render: (item: any) => <span className="font-medium">{item.torre}</span> },
          { key: 'zona', label: 'Zona', sortable: true, render: (item: any) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              item.zona === 'Preferred' ? 'bg-amber-100 text-amber-700' : item.zona === 'Regular' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
            }`}>{item.zona}</span>
          )},
          { key: 'total', label: 'Total', sortable: true, render: (item: any) => item.total },
          { key: 'completed', label: 'Completadas', sortable: true, render: (item: any) => <span className="text-emerald-600 font-medium">{item.completed}</span> },
          { key: 'pending', label: 'Pendientes', sortable: true, render: (item: any) => <span className="text-amber-600 font-medium">{item.pending}</span> },
          { key: 'pct', label: '% Avance', sortable: true, render: (item: any) => (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-2 max-w-[80px]">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${item.pct}%` }} />
              </div>
              <span className="text-xs font-medium">{item.pct}%</span>
            </div>
          )},
        ]}
        badgeColor="bg-teal-500"
        defaultExpanded
      />
    </div>
  );
}

function StationsTab({ stationAnalysis, stations, filteredInspections, exportCSV }: any) {
  const [filter, setFilter] = useState<'all' | 'never' | 'over30' | 'consumption' | 'presence' | 'bad'>('all');

  const displayData = useMemo(() => {
    switch (filter) {
      case 'never': return stationAnalysis.neverInspected;
      case 'over30': return stationAnalysis.over30Days;
      case 'consumption': return stationAnalysis.withConsumption;
      case 'presence': return stationAnalysis.withPresence;
      case 'bad': return stationAnalysis.inBadCondition;
      default: return stationAnalysis.stats;
    }
  }, [filter, stationAnalysis]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'Todas', stationAnalysis.stats.length],
          ['never', 'Nunca inspeccionadas', stationAnalysis.neverInspected.length],
          ['over30', '+30 dias sin inspeccion', stationAnalysis.over30Days.length],
          ['consumption', 'Con consumo', stationAnalysis.withConsumption.length],
          ['presence', 'Con presencia', stationAnalysis.withPresence.length],
          ['bad', 'Mala condicion', stationAnalysis.inBadCondition.length],
        ] as [string, string, number][]).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {label} <span className="ml-1 opacity-75">({count})</span>
          </button>
        ))}
        <button
          onClick={() => exportCSV(displayData.map((s: any) => ({
            codigo: s.code, nombre: s.name, tipo: s.type, inspecciones: s.inspectionCount,
            ultima_inspeccion: s.lastInspected || '-', dias_desde: s.daysSinceLastInspection ?? '-',
            condicion: s.lastCondition || '-', consumos: s.consumptions, presencias: s.presences,
          })), `estaciones_${filter}_${new Date().toISOString().split('T')[0]}.csv`)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <ExpandableTable
        title="Estaciones"
        icon={<MapPin className="w-5 h-5 text-teal-500" />}
        data={displayData}
        columns={[
          { key: 'code', label: 'Codigo', sortable: true, render: (item: any) => <span className="font-mono font-medium text-slate-900">{item.code}</span> },
          { key: 'name', label: 'Nombre', sortable: true, render: (item: any) => <span className="text-slate-700">{item.name}</span> },
          { key: 'type', label: 'Tipo', sortable: true, render: (item: any) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              item.type === 'ROEDOR' ? 'bg-red-100 text-red-700' : item.type === 'UV' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'
            }`}>{item.type}</span>
          )},
          { key: 'inspectionCount', label: 'Inspecciones', sortable: true, render: (item: any) => item.inspectionCount },
          { key: 'daysSinceLastInspection', label: 'Dias desde', sortable: true, render: (item: any) => (
            <span className={`font-medium ${
              item.daysSinceLastInspection === null ? 'text-red-600' :
              item.daysSinceLastInspection > 30 ? 'text-amber-600' : 'text-emerald-600'
            }`}>{item.daysSinceLastInspection ?? 'Nunca'}</span>
          )},
          { key: 'lastCondition', label: 'Condicion', sortable: true, render: (item: any) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              item.lastCondition === 'BUENA' ? 'bg-emerald-100 text-emerald-700' :
              item.lastCondition === 'REGULAR' ? 'bg-amber-100 text-amber-700' :
              item.lastCondition === 'MALA' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
            }`}>{item.lastCondition || '-'}</span>
          )},
          { key: 'consumptions', label: 'Consumos', sortable: true, render: (item: any) => (
            <span className={item.consumptions > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>{item.consumptions}</span>
          )},
          { key: 'presences', label: 'Presencia', sortable: true, render: (item: any) => (
            <span className={item.presences > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}>{item.presences}</span>
          )},
        ]}
        searchable
        searchKeys={['code', 'name', 'type']}
        defaultExpanded
        badgeCount={displayData.length}
        badgeColor={filter === 'consumption' || filter === 'presence' ? 'bg-red-500' : filter === 'never' || filter === 'over30' ? 'bg-amber-500' : 'bg-teal-500'}
        maxHeight="max-h-[700px]"
      />

      {/* Station type breakdown */}
      <div className="grid lg:grid-cols-3 gap-4">
        {(['ROEDOR', 'UV', 'OTRO'] as const).map(type => {
          const typeStations = stationAnalysis.stats.filter((s: any) => s.type === type);
          const active = typeStations.filter((s: any) => s.is_active).length;
          const inspected = typeStations.filter((s: any) => s.inspectionCount > 0).length;
          return (
            <div key={type} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800">{type}</h4>
                <span className="text-lg font-bold text-slate-900">{typeStations.length}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Activas</span><span className="font-medium">{active}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Inspeccionadas</span><span className="font-medium">{inspected}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Cobertura</span><span className="font-medium">{active > 0 ? ((inspected / active) * 100).toFixed(0) : 0}%</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OperatorsTab({ operatorStats, exportCSV }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => exportCSV(operatorStats.map((op: any) => ({
            operador: op.name, habitaciones: op.rooms, dias_trabajados: op.daysWorked,
            promedio_dia: op.avgPerDay.toFixed(1),
          })), `operadores_${new Date().toISOString().split('T')[0]}.csv`)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <ExpandableTable
        title="Rendimiento de Operadores"
        icon={<Users className="w-5 h-5 text-blue-500" />}
        data={operatorStats}
        columns={[
          { key: 'name', label: 'Operador', sortable: true, render: (item: any) => <span className="font-medium text-slate-900">{item.name}</span> },
          { key: 'rooms', label: 'Habitaciones', sortable: true, render: (item: any) => <span className="font-bold text-slate-900">{item.rooms}</span> },
          { key: 'daysWorked', label: 'Dias Trabajados', sortable: true, render: (item: any) => item.daysWorked },
          { key: 'avgPerDay', label: 'Promedio/Dia', sortable: true, render: (item: any) => (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-2 max-w-[100px]">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (item.avgPerDay / Math.max(...operatorStats.map((o: any) => o.avgPerDay))) * 100)}%` }} />
              </div>
              <span className="text-sm font-medium">{item.avgPerDay.toFixed(1)}</span>
            </div>
          )},
          { key: 'services', label: 'Servicios', render: (item: any) => (
            <div className="flex flex-wrap gap-1">
              {Object.entries(item.services).map(([svc, count]) => (
                <span key={svc} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{svc}: {count as number}</span>
              ))}
            </div>
          )},
        ]}
        searchable
        searchKeys={['name']}
        defaultExpanded
        badgeColor="bg-blue-500"
        maxHeight="max-h-[600px]"
      />

      {/* Performance comparison visual */}
      {operatorStats.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h4 className="font-semibold text-slate-900 mb-4">Comparativa Visual</h4>
          <div className="space-y-3">
            {operatorStats.slice(0, 15).map((op: any, i: number) => {
              const maxRooms = operatorStats[0]?.rooms || 1;
              return (
                <div key={op.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-6 text-right">{i + 1}</span>
                  <span className="text-sm text-slate-700 w-40 truncate">{op.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 relative overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                      style={{ width: `${(op.rooms / maxRooms) * 100}%` }}
                    />
                    <span className="absolute right-2 top-0.5 text-xs font-medium text-slate-600">{op.rooms}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AlertsTab({ alerts, roomAnalysis, stationAnalysis }: any) {
  return (
    <div className="space-y-4">
      {/* Alert summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-700">{alerts.filter((a: any) => a.severity === 'critical').length}</div>
          <div className="text-sm text-red-600 font-medium">Criticas</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-amber-700">{alerts.filter((a: any) => a.severity === 'warning').length}</div>
          <div className="text-sm text-amber-600 font-medium">Advertencias</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">{alerts.filter((a: any) => a.severity === 'info').length}</div>
          <div className="text-sm text-blue-600 font-medium">Informativas</div>
        </div>
      </div>

      {/* All alerts listed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {alerts.map((alert: any, i: number) => (
          <div key={i} className="p-4 flex items-start gap-3">
            <div className={`mt-0.5 w-3 h-3 rounded-full flex-shrink-0 ${
              alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            }`} />
            <div>
              <p className="font-medium text-slate-900">{alert.message}</p>
              <p className="text-sm text-slate-500">{alert.detail}</p>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="p-8 text-center text-slate-500">Sin alertas activas</div>
        )}
      </div>

      {/* Detailed lists for action */}
      <ExpandableTable
        title="Habitaciones Nunca Fumigadas (accion requerida)"
        icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        data={roomAnalysis.neverFumigated}
        columns={[
          { key: 'room_number', label: 'Habitacion', sortable: true, render: (item: any) => <span className="font-medium">{item.room_number}</span> },
          { key: 'zona', label: 'Zona', sortable: true, render: (item: any) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              item.zona === 'Preferred' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            }`}>{item.zona}</span>
          )},
          { key: 'edificio', label: 'Torre', sortable: true, render: (item: any) => <span>T{item.edificio}</span> },
          { key: 'piso', label: 'Piso', sortable: true, render: (item: any) => item.piso },
        ]}
        searchable
        searchKeys={['room_number', 'zona']}
        badgeColor="bg-red-500"
        defaultExpanded={roomAnalysis.neverFumigated.length > 0}
      />

      <ExpandableTable
        title="Habitaciones +60 dias sin fumigacion"
        icon={<Clock className="w-5 h-5 text-amber-500" />}
        data={roomAnalysis.over60Days}
        columns={[
          { key: 'room_number', label: 'Habitacion', sortable: true, render: (item: any) => <span className="font-medium">{item.room_number}</span> },
          { key: 'zona', label: 'Zona', sortable: true, render: (item: any) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              item.zona === 'Preferred' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            }`}>{item.zona}</span>
          )},
          { key: 'edificio', label: 'Torre', sortable: true, render: (item: any) => <span>T{item.edificio}</span> },
          { key: 'daysSinceLastFumigation', label: 'Dias', sortable: true, render: (item: any) => (
            <span className="text-red-600 font-medium">{item.daysSinceLastFumigation}d</span>
          )},
          { key: 'lastFumigated', label: 'Ultima fecha', sortable: true, render: (item: any) => (
            <span className="text-xs text-slate-500">{item.lastFumigated?.split('T')[0] || '-'}</span>
          )},
        ]}
        searchable
        searchKeys={['room_number', 'area']}
        badgeColor="bg-amber-500"
        defaultExpanded={roomAnalysis.over60Days.length > 0}
      />

      <ExpandableTable
        title="Estaciones Nunca Inspeccionadas"
        icon={<MapPin className="w-5 h-5 text-amber-500" />}
        data={stationAnalysis.neverInspected}
        columns={[
          { key: 'code', label: 'Codigo', sortable: true, render: (item: any) => <span className="font-mono font-medium">{item.code}</span> },
          { key: 'name', label: 'Nombre', sortable: true, render: (item: any) => item.name },
          { key: 'type', label: 'Tipo', sortable: true, render: (item: any) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              item.type === 'ROEDOR' ? 'bg-red-100 text-red-700' : item.type === 'UV' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'
            }`}>{item.type}</span>
          )},
        ]}
        searchable
        searchKeys={['code', 'name']}
        badgeColor="bg-amber-500"
        defaultExpanded={stationAnalysis.neverInspected.length > 0}
      />

      <ExpandableTable
        title="Estaciones con Consumo de Veneno"
        icon={<Bug className="w-5 h-5 text-red-500" />}
        data={stationAnalysis.withConsumption}
        columns={[
          { key: 'code', label: 'Codigo', sortable: true, render: (item: any) => <span className="font-mono font-medium">{item.code}</span> },
          { key: 'name', label: 'Nombre', sortable: true, render: (item: any) => item.name },
          { key: 'type', label: 'Tipo', render: (item: any) => item.type },
          { key: 'consumptions', label: 'Consumos', sortable: true, render: (item: any) => <span className="text-red-600 font-bold">{item.consumptions}</span> },
          { key: 'lastInspected', label: 'Ultima inspeccion', sortable: true, render: (item: any) => (
            <span className="text-xs text-slate-500">{item.lastInspected?.split('T')[0] || '-'}</span>
          )},
        ]}
        searchable
        searchKeys={['code', 'name']}
        badgeColor="bg-red-500"
        defaultExpanded={stationAnalysis.withConsumption.length > 0}
      />
    </div>
  );
}
