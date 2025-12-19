import { useState, useEffect, useMemo } from 'react';
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
  Eye,
  MapPin,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  fumigationApi,
  FumigationCycle,
  RoomFumigation,
  BaitStation,
  StationInspection,
  ServiceType,
} from '../lib/fumigationApi';
import FumigationNavigation from '../components/FumigationNavigation';

interface RoomStats {
  room_number: string;
  area: string | null;
  fumigationCount: number;
  lastFumigated: string | null;
  daysSinceLastFumigation: number | null;
}

interface StationStats {
  id: number;
  code: string;
  name: string;
  type: string;
  inspectionCount: number;
  lastInspected: string | null;
  daysSinceLastInspection: number | null;
  avgCondition: string;
  consumptionCount: number;
  presenceCount: number;
  locationMovedCount: number;
}

interface FumigatorStats {
  name: string;
  empresa: string | null;
  totalFumigations: number;
  totalInspections: number;
}

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function utmToLatLng(utmX: number, utmY: number): { lat: number; lng: number } | null {
  const zone = 13;
  const falseEasting = 500000;
  const falseNorthing = 0;
  const k0 = 0.9996;
  const e = 0.081819191;
  const e1sq = 0.006739497;
  const a = 6378137;

  const x = utmX - falseEasting;
  const y = utmY - falseNorthing;

  const M = y / k0;
  const mu = M / (a * (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));

  const phi1 = mu + (3 * e1sq / 2 - 27 * Math.pow(e1sq, 3) / 32) * Math.sin(2 * mu)
    + (21 * Math.pow(e1sq, 2) / 16 - 55 * Math.pow(e1sq, 4) / 32) * Math.sin(4 * mu)
    + (151 * Math.pow(e1sq, 3) / 96) * Math.sin(6 * mu);

  const N1 = a / Math.sqrt(1 - Math.pow(e * Math.sin(phi1), 2));
  const T1 = Math.pow(Math.tan(phi1), 2);
  const C1 = e1sq * Math.pow(Math.cos(phi1), 2);
  const R1 = a * (1 - Math.pow(e, 2)) / Math.pow(1 - Math.pow(e * Math.sin(phi1), 2), 1.5);
  const D = x / (N1 * k0);

  const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (Math.pow(D, 2) / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e1sq) * Math.pow(D, 4) / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * e1sq - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720);

  const lng = ((D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e1sq + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120)
    / Math.cos(phi1)) * (180 / Math.PI) + (zone * 6 - 183);

  return {
    lat: lat * (180 / Math.PI),
    lng: lng
  };
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const colorClasses: Record<string, { bg: string; icon: string; text: string }> = {
    teal: { bg: 'bg-sky-50', icon: 'text-sky-700', text: 'text-sky-800' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-700', text: 'text-emerald-800' },
    amber: { bg: 'bg-orange-50', icon: 'text-orange-700', text: 'text-orange-800' },
    red: { bg: 'bg-rose-50', icon: 'text-rose-700', text: 'text-rose-800' },
    blue: { bg: 'bg-indigo-50', icon: 'text-indigo-700', text: 'text-indigo-800' },
    slate: { bg: 'bg-stone-50', icon: 'text-stone-700', text: 'text-stone-800' },
  };

  const classes = colorClasses[color] || colorClasses.slate;

  return (
    <div className={`${classes.bg} rounded-xl p-4 border border-${color}-100`}>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${classes.bg}`}>
          <Icon className={`w-5 h-5 ${classes.icon}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-emerald-700' : trend === 'down' ? 'text-rose-700' : 'text-stone-500'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
             trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className={`text-2xl font-bold ${classes.text}`}>{value}</div>
        <div className="text-sm font-medium text-stone-700 mt-0.5">{title}</div>
        {subtitle && <div className="text-xs text-stone-500 mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}

function AlertCard({
  title,
  items,
  type,
  linkPrefix,
}: {
  title: string;
  items: { label: string; value: string; id?: number | string }[];
  type: 'warning' | 'danger' | 'info';
  linkPrefix?: string;
}) {
  const typeStyles = {
    warning: { bg: 'bg-orange-50', border: 'border-orange-300', icon: 'text-orange-600', title: 'text-orange-900' },
    danger: { bg: 'bg-rose-50', border: 'border-rose-300', icon: 'text-rose-600', title: 'text-rose-900' },
    info: { bg: 'bg-indigo-50', border: 'border-indigo-300', icon: 'text-indigo-600', title: 'text-indigo-900' },
  };

  const styles = typeStyles[type];

  if (items.length === 0) return null;

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className={`w-5 h-5 ${styles.icon}`} />
        <h3 className={`font-semibold ${styles.title}`}>{title}</h3>
        <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.slice(0, 10).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm bg-white/50 rounded-lg px-3 py-2">
            <span className="font-medium text-stone-700">{item.label}</span>
            <span className="text-stone-500">{item.value}</span>
          </div>
        ))}
        {items.length > 10 && (
          <div className="text-xs text-center text-stone-500 pt-1">
            y {items.length - 10} mas...
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-stone-600 w-12 text-right">{percentage}%</span>
    </div>
  );
}

export default function FumigationExecutiveReport() {
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<FumigationCycle[]>([]);
  const [allRooms, setAllRooms] = useState<RoomFumigation[]>([]);
  const [stations, setStations] = useState<BaitStation[]>([]);
  const [inspections, setInspections] = useState<StationInspection[]>([]);
  const [showGPSModal, setShowGPSModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cyclesData, stationsData, inspectionsData] = await Promise.all([
        fumigationApi.getCycles(),
        fumigationApi.getStations(),
        fumigationApi.getInspections({ limit: 500 }),
      ]);

      setCycles(cyclesData);
      setStations(stationsData);
      setInspections(inspectionsData);

      const roomsPromises = cyclesData.map((c) => fumigationApi.getCycleRooms(c.id));
      const roomsResults = await Promise.all(roomsPromises);
      const allRoomsData = roomsResults.flat();
      setAllRooms(allRoomsData);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cycleStats = useMemo(() => {
    const openCycles = cycles.filter((c) => c.status === 'ABIERTO');
    const closedCycles = cycles.filter((c) => c.status === 'CERRADO');

    const totalRooms = cycles.reduce((acc, c) => acc + c.total_rooms, 0);
    const completedRooms = cycles.reduce((acc, c) => acc + c.completed_rooms, 0);
    const pendingRooms = cycles.reduce((acc, c) => acc + c.pending_rooms, 0);

    const avgCompletion = cycles.length > 0
      ? Math.round(cycles.reduce((acc, c) => {
          const rate = c.total_rooms > 0 ? (c.completed_rooms / c.total_rooms) * 100 : 0;
          return acc + rate;
        }, 0) / cycles.length)
      : 0;

    return {
      totalCycles: cycles.length,
      openCycles: openCycles.length,
      closedCycles: closedCycles.length,
      totalRooms,
      completedRooms,
      pendingRooms,
      avgCompletion,
    };
  }, [cycles]);

  const roomAnalysis = useMemo(() => {
    const roomMap = new Map<string, RoomStats>();
    const now = new Date();

    allRooms.forEach((room) => {
      const key = room.room_number;
      const existing = roomMap.get(key);

      if (existing) {
        if (room.status === 'COMPLETADA') {
          existing.fumigationCount++;
          if (room.fumigated_at) {
            if (!existing.lastFumigated || new Date(room.fumigated_at) > new Date(existing.lastFumigated)) {
              existing.lastFumigated = room.fumigated_at;
            }
          }
        }
      } else {
        roomMap.set(key, {
          room_number: room.room_number,
          area: room.area,
          fumigationCount: room.status === 'COMPLETADA' ? 1 : 0,
          lastFumigated: room.status === 'COMPLETADA' ? room.fumigated_at : null,
          daysSinceLastFumigation: null,
        });
      }
    });

    roomMap.forEach((room) => {
      if (room.lastFumigated) {
        room.daysSinceLastFumigation = daysBetween(new Date(room.lastFumigated), now);
      }
    });

    const roomStats = Array.from(roomMap.values());

    const mostFumigated = [...roomStats]
      .filter((r) => r.fumigationCount > 0)
      .sort((a, b) => b.fumigationCount - a.fumigationCount)
      .slice(0, 10);

    const leastFumigated = [...roomStats]
      .filter((r) => r.fumigationCount > 0)
      .sort((a, b) => a.fumigationCount - b.fumigationCount)
      .slice(0, 10);

    const neverFumigated = roomStats.filter((r) => r.fumigationCount === 0);

    const longTimeSinceFumigation = [...roomStats]
      .filter((r) => r.daysSinceLastFumigation !== null && r.daysSinceLastFumigation > 60)
      .sort((a, b) => (b.daysSinceLastFumigation || 0) - (a.daysSinceLastFumigation || 0))
      .slice(0, 20);

    return {
      totalUniqueRooms: roomStats.length,
      mostFumigated,
      leastFumigated,
      neverFumigated,
      longTimeSinceFumigation,
      avgFumigationsPerRoom: roomStats.length > 0
        ? (roomStats.reduce((acc, r) => acc + r.fumigationCount, 0) / roomStats.length).toFixed(1)
        : '0',
    };
  }, [allRooms]);

  const stationAnalysis = useMemo(() => {
    const now = new Date();
    const stationMap = new Map<number, StationStats>();

    stations.forEach((station) => {
      stationMap.set(station.id, {
        id: station.id,
        code: station.code,
        name: station.name,
        type: station.type,
        inspectionCount: 0,
        lastInspected: null,
        daysSinceLastInspection: null,
        avgCondition: 'N/A',
        consumptionCount: 0,
        presenceCount: 0,
        locationMovedCount: 0,
      });
    });

    const conditionScores: Record<number, number[]> = {};

    inspections.forEach((insp) => {
      const station = stationMap.get(insp.station_id);
      if (station) {
        station.inspectionCount++;
        if (insp.inspected_at) {
          if (!station.lastInspected || new Date(insp.inspected_at) > new Date(station.lastInspected)) {
            station.lastInspected = insp.inspected_at;
          }
        }

        if (insp.has_bait) station.consumptionCount++;
        if (insp.bait_replaced) station.presenceCount++;
        if (!insp.location_ok) station.locationMovedCount++;

        if (!conditionScores[insp.station_id]) {
          conditionScores[insp.station_id] = [];
        }
        const score = insp.physical_condition === 'BUENA' ? 3 : insp.physical_condition === 'REGULAR' ? 2 : 1;
        conditionScores[insp.station_id].push(score);
      }
    });

    stationMap.forEach((station) => {
      if (station.lastInspected) {
        station.daysSinceLastInspection = daysBetween(new Date(station.lastInspected), now);
      }

      const scores = conditionScores[station.id];
      if (scores && scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        station.avgCondition = avg >= 2.5 ? 'BUENA' : avg >= 1.5 ? 'REGULAR' : 'MALA';
      }
    });

    const stationStats = Array.from(stationMap.values());

    const mostInspected = [...stationStats]
      .filter((s) => s.inspectionCount > 0)
      .sort((a, b) => b.inspectionCount - a.inspectionCount)
      .slice(0, 10);

    const leastInspected = [...stationStats]
      .filter((s) => s.inspectionCount > 0)
      .sort((a, b) => a.inspectionCount - b.inspectionCount)
      .slice(0, 10);

    const neverInspected = stationStats.filter((s) => s.inspectionCount === 0);

    const longTimeSinceInspection = [...stationStats]
      .filter((s) => s.daysSinceLastInspection !== null && s.daysSinceLastInspection > 30)
      .sort((a, b) => (b.daysSinceLastInspection || 0) - (a.daysSinceLastInspection || 0))
      .slice(0, 20);

    const stationsInBadCondition = stationStats.filter((s) => s.avgCondition === 'MALA');

    const mostConsumption = [...stationStats]
      .filter((s) => s.consumptionCount > 0)
      .sort((a, b) => b.consumptionCount - a.consumptionCount)
      .slice(0, 10);

    const mostPresence = [...stationStats]
      .filter((s) => s.presenceCount > 0)
      .sort((a, b) => b.presenceCount - a.presenceCount)
      .slice(0, 10);

    const mostMoved = [...stationStats]
      .filter((s) => s.locationMovedCount > 0)
      .sort((a, b) => b.locationMovedCount - a.locationMovedCount)
      .slice(0, 10);

    const totalConsumption = stationStats.reduce((acc, s) => acc + s.consumptionCount, 0);
    const totalPresence = stationStats.reduce((acc, s) => acc + s.presenceCount, 0);

    const inspectionsWithoutGPS: Array<{ station: BaitStation; inspection: StationInspection }> = [];
    const inspectionsFarFromStation: Array<{ station: BaitStation; inspection: StationInspection; distance: number }> = [];

    inspections.forEach((insp) => {
      const station = stations.find((s) => s.id === insp.station_id);
      if (!station || station.type !== 'ROEDOR') return;

      if (!insp.lat || !insp.lng) {
        inspectionsWithoutGPS.push({ station, inspection: insp });
      } else if (station.utm_x && station.utm_y) {
        const stationCoords = utmToLatLng(station.utm_y, station.utm_x);
        if (stationCoords) {
          const distance = calculateDistance(insp.lat, insp.lng, stationCoords.lat, stationCoords.lng);
          if (distance > 30) {
            inspectionsFarFromStation.push({ station, inspection: insp, distance });
          }
        }
      }
    });

    return {
      totalStations: stationStats.length,
      activeStations: stations.filter((s) => s.is_active).length,
      totalInspections: inspections.length,
      mostInspected,
      leastInspected,
      neverInspected,
      longTimeSinceInspection,
      stationsInBadCondition,
      mostConsumption,
      mostPresence,
      mostMoved,
      totalConsumption,
      totalPresence,
      inspectionsWithoutGPS,
      inspectionsFarFromStation,
      avgInspectionsPerStation: stationStats.length > 0
        ? (inspections.length / stationStats.length).toFixed(1)
        : '0',
    };
  }, [stations, inspections]);

  const serviceTypeDistribution = useMemo(() => {
    const distribution: Record<ServiceType, number> = {
      PREVENTIVO: 0,
      CORRECTIVO: 0,
      NEBULIZACION: 0,
      ASPERSION: 0,
      GEL: 0,
      OTRO: 0,
    };

    allRooms.forEach((room) => {
      if (room.status === 'COMPLETADA' && room.service_type) {
        distribution[room.service_type]++;
      }
    });

    const total = Object.values(distribution).reduce((a, b) => a + b, 0);

    return Object.entries(distribution)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allRooms]);

  const fumigatorStats = useMemo(() => {
    const fumigatorMap = new Map<string, FumigatorStats>();

    allRooms.forEach((room) => {
      if (room.status === 'COMPLETADA' && room.fumigator_nombre) {
        const key = room.fumigator_nombre.toLowerCase();
        const existing = fumigatorMap.get(key);
        if (existing) {
          existing.totalFumigations++;
        } else {
          fumigatorMap.set(key, {
            name: room.fumigator_nombre,
            empresa: room.fumigator_empresa,
            totalFumigations: 1,
            totalInspections: 0,
          });
        }
      }
    });

    inspections.forEach((insp) => {
      if (insp.inspector_nombre) {
        const key = insp.inspector_nombre.toLowerCase();
        const existing = fumigatorMap.get(key);
        if (existing) {
          existing.totalInspections++;
        } else {
          fumigatorMap.set(key, {
            name: insp.inspector_nombre,
            empresa: insp.inspector_empresa,
            totalFumigations: 0,
            totalInspections: 1,
          });
        }
      }
    });

    return Array.from(fumigatorMap.values())
      .sort((a, b) => (b.totalFumigations + b.totalInspections) - (a.totalFumigations + a.totalInspections))
      .slice(0, 10);
  }, [allRooms, inspections]);

  const GPSIssuesModal = () => {
    if (!showGPSModal) return null;

    const allGPSIssues = [
      ...stationAnalysis.inspectionsWithoutGPS.map(item => ({
        ...item,
        issueType: 'SIN_GPS' as const,
        distance: null,
      })),
      ...stationAnalysis.inspectionsFarFromStation.map(item => ({
        ...item,
        issueType: 'LEJOS' as const,
      })),
    ].sort((a, b) => new Date(b.inspection.inspected_at).getTime() - new Date(a.inspection.inspected_at).getTime());

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-amber-50">
            <div>
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-amber-700" />
                Detalle de Inspecciones con Problemas de GPS
              </h2>
              <p className="text-sm text-stone-600 mt-1">
                {allGPSIssues.length} inspecciones de cebaderas con problemas detectados
              </p>
            </div>
            <button
              onClick={() => setShowGPSModal(false)}
              className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-stone-600" />
            </button>
          </div>

          <div className="overflow-auto flex-1 p-6">
            <table className="w-full">
              <thead className="sticky top-0 bg-stone-50">
                <tr className="text-left text-sm text-stone-600 border-b border-stone-200">
                  <th className="pb-3 font-medium">Problema</th>
                  <th className="pb-3 font-medium">Estacion</th>
                  <th className="pb-3 font-medium">Nombre</th>
                  <th className="pb-3 font-medium">Fecha Inspeccion</th>
                  <th className="pb-3 font-medium">Inspector</th>
                  <th className="pb-3 font-medium">Distancia</th>
                  <th className="pb-3 font-medium">GPS Inspector</th>
                  <th className="pb-3 font-medium">GPS Estacion</th>
                </tr>
              </thead>
              <tbody>
                {allGPSIssues.map((issue, idx) => {
                  const stationCoords = issue.station.utm_x && issue.station.utm_y
                    ? utmToLatLng(issue.station.utm_y, issue.station.utm_x)
                    : null;

                  return (
                    <tr key={idx} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          issue.issueType === 'SIN_GPS'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {issue.issueType === 'SIN_GPS' ? 'Sin GPS' : 'Muy lejos'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="font-medium text-stone-900">{issue.station.code}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-stone-600">{issue.station.name}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-stone-700">
                          {new Date(issue.inspection.inspected_at).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="text-sm">
                          <div className="font-medium text-stone-700">{issue.inspection.inspector_nombre}</div>
                          {issue.inspection.inspector_empresa && (
                            <div className="text-xs text-stone-500">{issue.inspection.inspector_empresa}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        {issue.distance !== null ? (
                          <span className="text-sm font-medium text-orange-700">
                            {Math.round(issue.distance)}m
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3">
                        {issue.inspection.lat && issue.inspection.lng ? (
                          <a
                            href={`https://www.google.com/maps?q=${issue.inspection.lat},${issue.inspection.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sky-700 hover:text-sky-800 flex items-center gap-1"
                          >
                            {Number(issue.inspection.lat).toFixed(6)}, {Number(issue.inspection.lng).toFixed(6)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-rose-600 font-medium">Sin GPS</span>
                        )}
                      </td>
                      <td className="py-3">
                        {stationCoords ? (
                          <a
                            href={`https://www.google.com/maps?q=${stationCoords.lat},${stationCoords.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sky-700 hover:text-sky-800 flex items-center gap-1"
                          >
                            {Number(stationCoords.lat).toFixed(6)}, {Number(stationCoords.lng).toFixed(6)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-stone-400">No configurado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {allGPSIssues.length === 0 && (
              <div className="text-center py-12 text-stone-500">
                No hay inspecciones con problemas de GPS
              </div>
            )}
          </div>

          <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end">
            <button
              onClick={() => setShowGPSModal(false)}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <FumigationNavigation />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 text-sky-700 animate-spin mx-auto mb-4" />
            <p className="text-stone-600">Generando reporte ejecutivo...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <FumigationNavigation />
      <GPSIssuesModal />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-sky-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Reporte Ejecutivo</h1>
              <p className="text-stone-500 text-sm">
                Resumen de operaciones de fumigacion y control de plagas
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Ciclos Totales"
            value={cycleStats.totalCycles}
            subtitle={`${cycleStats.openCycles} abiertos`}
            icon={Calendar}
            color="teal"
          />
          <StatCard
            title="Habitaciones"
            value={cycleStats.completedRooms}
            subtitle={`de ${cycleStats.totalRooms} totales`}
            icon={Home}
            color="green"
          />
          <StatCard
            title="Pendientes"
            value={cycleStats.pendingRooms}
            subtitle="habitaciones"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Estaciones"
            value={stationAnalysis.totalStations}
            subtitle={`${stationAnalysis.activeStations} activas`}
            icon={Bug}
            color="blue"
          />
          <StatCard
            title="Inspecciones"
            value={stationAnalysis.totalInspections}
            subtitle="registradas"
            icon={Eye}
            color="slate"
          />
          <StatCard
            title="Promedio Ciclo"
            value={`${cycleStats.avgCompletion}%`}
            subtitle="completado"
            icon={Target}
            color="teal"
          />
        </div>

        <div className="bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-300 rounded-xl p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-700" />
            Indicadores de Actividad de Plagas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-rose-300">
              <div className="text-3xl font-bold text-rose-700">{stationAnalysis.totalConsumption}</div>
              <div className="text-sm text-stone-600 mt-1">Casos de consumo de veneno</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-300">
              <div className="text-3xl font-bold text-orange-700">{stationAnalysis.totalPresence}</div>
              <div className="text-sm text-stone-600 mt-1">Presencia de excremento</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-rose-300">
              <div className="text-3xl font-bold text-rose-700">{stationAnalysis.mostConsumption.length}</div>
              <div className="text-sm text-stone-600 mt-1">Estaciones con consumo</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-orange-300">
              <div className="text-3xl font-bold text-orange-700">{stationAnalysis.mostPresence.length}</div>
              <div className="text-sm text-stone-600 mt-1">Estaciones con presencia</div>
            </div>
          </div>
        </div>

        {(stationAnalysis.inspectionsWithoutGPS.length > 0 || stationAnalysis.inspectionsFarFromStation.length > 0) && (
          <div
            className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setShowGPSModal(true)}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-amber-700" />
                Alertas de Validacion GPS (Solo Cebaderas)
              </h2>
              <button className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium">
                Ver Detalles
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              Las trampas UV no requieren validacion GPS ya que se encuentran en interiores donde la señal GPS no es confiable.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-amber-300">
                <div className="text-3xl font-bold text-amber-700">{stationAnalysis.inspectionsWithoutGPS.length}</div>
                <div className="text-sm text-stone-600 mt-1">Inspecciones sin GPS</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-orange-300">
                <div className="text-3xl font-bold text-orange-700">{stationAnalysis.inspectionsFarFromStation.length}</div>
                <div className="text-sm text-stone-600 mt-1">Inspecciones a mas de 30m</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AlertCard
            title="Habitaciones sin fumigar (nunca)"
            items={roomAnalysis.neverFumigated.map((r) => ({
              label: `Hab. ${r.room_number}`,
              value: r.area || 'Sin area',
            }))}
            type="danger"
          />

          <AlertCard
            title="Habitaciones con mas de 60 dias sin fumigar"
            items={roomAnalysis.longTimeSinceFumigation.map((r) => ({
              label: `Hab. ${r.room_number}`,
              value: `${r.daysSinceLastFumigation} dias`,
            }))}
            type="warning"
          />

          <AlertCard
            title="Estaciones nunca inspeccionadas"
            items={stationAnalysis.neverInspected.map((s) => ({
              label: s.code,
              value: s.name,
            }))}
            type="danger"
          />

          <AlertCard
            title="Estaciones con mas de 30 dias sin inspeccion"
            items={stationAnalysis.longTimeSinceInspection.map((s) => ({
              label: s.code,
              value: `${s.daysSinceLastInspection} dias`,
            }))}
            type="warning"
          />

          {stationAnalysis.stationsInBadCondition.length > 0 && (
            <AlertCard
              title="Estaciones en mala condicion"
              items={stationAnalysis.stationsInBadCondition.map((s) => ({
                label: s.code,
                value: s.name,
              }))}
              type="danger"
            />
          )}

          <AlertCard
            title="Inspecciones de cebaderas sin GPS"
            items={stationAnalysis.inspectionsWithoutGPS.map((item) => ({
              label: item.station.code,
              value: new Date(item.inspection.inspected_at).toLocaleDateString('es-MX', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }),
            }))}
            type="warning"
          />

          <AlertCard
            title="Inspecciones de cebaderas a mas de 30m de distancia"
            items={stationAnalysis.inspectionsFarFromStation.map((item) => ({
              label: item.station.code,
              value: `${Math.round(item.distance)}m`,
            }))}
            type="warning"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-700" />
              <h3 className="font-semibold text-stone-900">Habitaciones mas fumigadas</h3>
            </div>
            <div className="space-y-3">
              {roomAnalysis.mostFumigated.length === 0 ? (
                <p className="text-sm text-stone-500">Sin datos disponibles</p>
              ) : (
                roomAnalysis.mostFumigated.map((room, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-stone-700">Hab. {room.room_number}</span>
                    </div>
                    <span className="text-sm text-emerald-700 font-semibold">{room.fumigationCount} veces</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-orange-700" />
              <h3 className="font-semibold text-stone-900">Habitaciones menos fumigadas</h3>
            </div>
            <div className="space-y-3">
              {roomAnalysis.leastFumigated.length === 0 ? (
                <p className="text-sm text-stone-500">Sin datos disponibles</p>
              ) : (
                roomAnalysis.leastFumigated.map((room, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-stone-700">Hab. {room.room_number}</span>
                    </div>
                    <span className="text-sm text-orange-700 font-semibold">{room.fumigationCount} veces</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-sky-700" />
              <h3 className="font-semibold text-stone-900">Distribucion por tipo de servicio</h3>
            </div>
            <div className="space-y-3">
              {serviceTypeDistribution.map((item) => (
                <div key={item.type}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-stone-700">{item.type}</span>
                    <span className="text-stone-500">{item.count}</span>
                  </div>
                  <ProgressBar
                    value={item.count}
                    max={serviceTypeDistribution[0]?.count || 1}
                    color={item.type === 'PREVENTIVO' ? 'bg-emerald-600' : item.type === 'CORRECTIVO' ? 'bg-rose-600' : 'bg-sky-600'}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-rose-300 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
              <h3 className="font-semibold text-stone-900">Mayor consumo de veneno</h3>
            </div>
            <div className="space-y-3">
              {stationAnalysis.mostConsumption.length === 0 ? (
                <p className="text-sm text-stone-500">Sin datos disponibles</p>
              ) : (
                stationAnalysis.mostConsumption.map((station, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-rose-100 text-rose-800 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-stone-700">{station.code}</span>
                        <span className="text-xs text-stone-500 ml-2">{station.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-rose-700 font-semibold">{station.consumptionCount} veces</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-orange-300 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-700" />
              <h3 className="font-semibold text-stone-900">Mayor presencia de excremento</h3>
            </div>
            <div className="space-y-3">
              {stationAnalysis.mostPresence.length === 0 ? (
                <p className="text-sm text-stone-500">Sin datos disponibles</p>
              ) : (
                stationAnalysis.mostPresence.map((station, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-stone-700">{station.code}</span>
                        <span className="text-xs text-stone-500 ml-2">{station.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-orange-700 font-semibold">{station.presenceCount} veces</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-indigo-300 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-indigo-700" />
              <h3 className="font-semibold text-stone-900">Estaciones mas desplazadas</h3>
            </div>
            <div className="space-y-3">
              {stationAnalysis.mostMoved.length === 0 ? (
                <p className="text-sm text-stone-500">Sin datos disponibles</p>
              ) : (
                stationAnalysis.mostMoved.map((station, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-stone-700">{station.code}</span>
                        <span className="text-xs text-stone-500 ml-2">{station.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-indigo-700 font-semibold">{station.locationMovedCount} veces</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bug className="w-5 h-5 text-indigo-700" />
              <h3 className="font-semibold text-stone-900">Estaciones mas inspeccionadas</h3>
            </div>
            <div className="space-y-3">
              {stationAnalysis.mostInspected.length === 0 ? (
                <p className="text-sm text-stone-500">Sin datos disponibles</p>
              ) : (
                stationAnalysis.mostInspected.map((station, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-stone-700">{station.code}</span>
                        <span className="text-xs text-stone-500 ml-2">{station.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-indigo-700 font-semibold">{station.inspectionCount}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                        station.avgCondition === 'BUENA' ? 'bg-emerald-100 text-emerald-800' :
                        station.avgCondition === 'REGULAR' ? 'bg-orange-100 text-orange-800' :
                        station.avgCondition === 'MALA' ? 'bg-rose-100 text-rose-800' :
                        'bg-stone-100 text-stone-600'
                      }`}>
                        {station.avgCondition}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-sky-700" />
              <h3 className="font-semibold text-stone-900">Rendimiento de fumigadores</h3>
            </div>
            <div className="space-y-3">
              {fumigatorStats.length === 0 ? (
                <p className="text-sm text-stone-500">Sin datos disponibles</p>
              ) : (
                fumigatorStats.map((fumigator, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-sky-100 text-sky-800 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-stone-700">{fumigator.name}</span>
                        {fumigator.empresa && (
                          <span className="text-xs text-stone-500 ml-1">({fumigator.empresa})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="font-medium text-stone-700">{fumigator.totalFumigations}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bug className="w-3.5 h-3.5 text-indigo-700" />
                        <span className="font-medium text-stone-700">{fumigator.totalInspections}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-orange-700" />
            <h3 className="font-semibold text-stone-900">Resumen de ciclos recientes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-stone-500 border-b border-stone-200">
                  <th className="pb-3 font-medium">Ciclo</th>
                  <th className="pb-3 font-medium">Periodo</th>
                  <th className="pb-3 font-medium">Estado</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium text-right">Completadas</th>
                  <th className="pb-3 font-medium text-right">Pendientes</th>
                  <th className="pb-3 font-medium">Progreso</th>
                </tr>
              </thead>
              <tbody>
                {cycles.slice(0, 10).map((cycle) => {
                  const progress = cycle.total_rooms > 0
                    ? Math.round((cycle.completed_rooms / cycle.total_rooms) * 100)
                    : 0;
                  return (
                    <tr key={cycle.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-3">
                        <Link
                          to={`/fumigacion/habitaciones/ciclo/${cycle.id}`}
                          className="font-medium text-sky-700 hover:text-sky-800"
                        >
                          {cycle.label}
                        </Link>
                      </td>
                      <td className="py-3 text-sm text-stone-600">
                        {new Date(cycle.period_start).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                        {' - '}
                        {new Date(cycle.period_end).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          cycle.status === 'ABIERTO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          {cycle.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-stone-700 text-right font-medium">{cycle.total_rooms}</td>
                      <td className="py-3 text-sm text-emerald-700 text-right font-medium">{cycle.completed_rooms}</td>
                      <td className="py-3 text-sm text-orange-700 text-right font-medium">{cycle.pending_rooms}</td>
                      <td className="py-3 w-32">
                        <ProgressBar
                          value={progress}
                          max={100}
                          color={progress >= 80 ? 'bg-emerald-600' : progress >= 50 ? 'bg-orange-600' : 'bg-rose-600'}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
