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
  Users,
  RefreshCw,
  Target,
  Activity,
  Zap,
  Eye,
  MapPin,
  X,
  ExternalLink,
  Calendar,
  Building2,
  Image as ImageIcon,
} from 'lucide-react';
import {
  fumigationApi,
  FumigationCycle,
  RoomFumigation,
  BaitStation,
  StationInspection,
  ServiceType,
} from '../lib/fumigationApi';
import InspectionDetailModal from '../components/InspectionDetailModal';

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

type InspectionPeriod = 'last_7' | 'last_30' | 'last_60' | 'last_90' | 'current_month' | 'last_month' | 'all';

export default function FumigationExecutiveReportPublic() {
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<FumigationCycle[]>([]);
  const [allRooms, setAllRooms] = useState<RoomFumigation[]>([]);
  const [stations, setStations] = useState<BaitStation[]>([]);
  const [inspections, setInspections] = useState<StationInspection[]>([]);
  const [showGPSModal, setShowGPSModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<StationInspection | null>(null);

  const [selectedCycleId, setSelectedCycleId] = useState<number | 'all'>('all');
  const [inspectionPeriod, setInspectionPeriod] = useState<InspectionPeriod>('last_30');

  const loadData = async () => {
    setLoading(true);
    try {
      const [cyclesData, stationsData] = await Promise.all([
        fumigationApi.getCycles(),
        fumigationApi.getStations(),
      ]);

      setCycles(cyclesData);
      setStations(stationsData);

      const openCycle = cyclesData.find((c) => c.status === 'ABIERTO');
      if (openCycle && selectedCycleId === 'all') {
        setSelectedCycleId(openCycle.id);
      }

      const roomsPromises = cyclesData.map((c) => fumigationApi.getCycleRooms(c.id));
      const roomsResults = await Promise.all(roomsPromises);
      const allRoomsData = roomsResults.flat();
      setAllRooms(allRoomsData);

      const inspectionsData = await fumigationApi.getInspections({ limit: 2000 });
      setInspections(inspectionsData);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getInspectionPeriodDates = (period: InspectionPeriod) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'last_7':
        return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'last_30':
        return new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'last_60':
        return new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
      case 'last_90':
        return new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'current_month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'last_month':
        return new Date(now.getFullYear(), now.getMonth() - 1, 1);
      case 'all':
      default:
        return new Date(2000, 0, 1);
    }
  };

  const filteredRooms = useMemo(() => {
    if (selectedCycleId === 'all') return allRooms;
    return allRooms.filter((r) => r.cycle_id === selectedCycleId);
  }, [allRooms, selectedCycleId]);

  const filteredInspections = useMemo(() => {
    const startDate = getInspectionPeriodDates(inspectionPeriod);
    const endDate = inspectionPeriod === 'last_month'
      ? new Date(new Date().getFullYear(), new Date().getMonth(), 0)
      : new Date();

    return inspections.filter((insp) => {
      const inspDate = new Date(insp.inspected_at);
      return inspDate >= startDate && inspDate <= endDate;
    });
  }, [inspections, inspectionPeriod]);

  const selectedCycle = useMemo(() => {
    return cycles.find((c) => c.id === selectedCycleId);
  }, [cycles, selectedCycleId]);

  const cycleStats = useMemo(() => {
    if (!selectedCycle && selectedCycleId !== 'all') {
      return {
        totalRooms: 0,
        completedRooms: 0,
        pendingRooms: 0,
        completionRate: 0,
        daysElapsed: 0,
        daysRemaining: 0,
        totalDays: 0,
        avgRoomsPerDay: 0,
        projectedCompletion: 0,
        onTrack: false,
        velocity: 0,
      };
    }

    const rooms = selectedCycleId === 'all' ? allRooms : filteredRooms;
    const cycle = selectedCycle;

    const totalRooms = cycle ? Number(cycle.total_rooms) : rooms.length;
    const completedRooms = rooms.filter((r) => r.status === 'COMPLETADA').length;
    const pendingRooms = totalRooms - completedRooms;
    const completionRate = totalRooms > 0 ? (completedRooms / totalRooms) * 100 : 0;

    const now = new Date();
    const startDate = cycle ? new Date(cycle.period_start) : new Date(Math.min(...rooms.map(r => new Date(r.created_at).getTime())));
    const endDate = cycle ? new Date(cycle.period_end) : now;

    const daysElapsed = Math.max(1, daysBetween(startDate, now));
    const totalDays = daysBetween(startDate, endDate);
    const daysRemaining = Math.max(0, daysBetween(now, endDate));

    const avgRoomsPerDay = completedRooms / daysElapsed;
    const projectedCompletion = avgRoomsPerDay * totalDays;
    const requiredVelocity = daysRemaining > 0 ? pendingRooms / daysRemaining : 0;
    const onTrack = projectedCompletion >= totalRooms * 0.95;

    return {
      totalRooms,
      completedRooms,
      pendingRooms,
      completionRate,
      daysElapsed,
      daysRemaining,
      totalDays,
      avgRoomsPerDay,
      projectedCompletion,
      onTrack,
      velocity: avgRoomsPerDay,
      requiredVelocity,
    };
  }, [cycles, selectedCycleId, selectedCycle, filteredRooms, allRooms]);

  const roomAnalysis = useMemo(() => {
    const roomMap = new Map<string, RoomStats>();
    const now = new Date();

    filteredRooms.forEach((room) => {
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
  }, [filteredRooms]);

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

    filteredInspections.forEach((insp) => {
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

    filteredInspections.forEach((insp) => {
      const station = stations.find((s) => s.id === insp.station_id);
      if (!station || station.type !== 'ROEDOR') return;

      if (!insp.lat || !insp.lng) {
        inspectionsWithoutGPS.push({ station, inspection: insp });
      } else if (station.utm_x && station.utm_y) {
        const stationLat = Number(station.utm_y);
        const stationLng = Number(station.utm_x);
        const distance = calculateDistance(insp.lat, insp.lng, stationLat, stationLng);
        if (distance > 30) {
          inspectionsFarFromStation.push({ station, inspection: insp, distance });
        }
      }
    });

    return {
      totalStations: stationStats.length,
      activeStations: stations.filter((s) => s.is_active).length,
      totalInspections: filteredInspections.length,
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
        ? (filteredInspections.length / stationStats.length).toFixed(1)
        : '0',
    };
  }, [stations, filteredInspections]);

  const serviceTypeDistribution = useMemo(() => {
    const distribution: Record<ServiceType, number> = {
      PREVENTIVO: 0,
      CORRECTIVO: 0,
      NEBULIZACION: 0,
      ASPERSION: 0,
      GEL: 0,
      OTRO: 0,
    };

    filteredRooms.forEach((room) => {
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
  }, [filteredRooms]);

  const priorityAlerts = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stationsWithPresence: Array<{ station: BaitStation; inspection: StationInspection; daysAgo: number }> = [];
    const stationsWithConsumption: Array<{ station: BaitStation; inspection: StationInspection; daysAgo: number }> = [];
    const criticalRooms: Array<{ room: RoomFumigation; daysOverdue: number }> = [];

    filteredInspections.forEach((insp) => {
      const inspDate = new Date(insp.inspected_at);
      const daysAgo = daysBetween(inspDate, now);

      if (inspDate >= sevenDaysAgo) {
        const station = stations.find((s) => s.id === insp.station_id);
        if (!station) return;

        if (insp.bait_replaced === 1) {
          stationsWithPresence.push({ station, inspection: insp, daysAgo });
        }

        if (insp.has_bait === 1) {
          stationsWithConsumption.push({ station, inspection: insp, daysAgo });
        }
      }
    });

    if (selectedCycle) {
      const cycleEnd = new Date(selectedCycle.period_end);
      filteredRooms
        .filter((r) => r.status === 'PENDIENTE')
        .forEach((room) => {
          const daysToEnd = daysBetween(now, cycleEnd);
          if (daysToEnd <= 3) {
            criticalRooms.push({ room, daysOverdue: -daysToEnd });
          }
        });
    }

    stationsWithPresence.sort((a, b) => a.daysAgo - b.daysAgo);
    stationsWithConsumption.sort((a, b) => a.daysAgo - b.daysAgo);

    return {
      stationsWithPresence: stationsWithPresence.slice(0, 20),
      stationsWithConsumption: stationsWithConsumption.slice(0, 20),
      criticalRooms: criticalRooms.slice(0, 20),
      totalAlerts: stationsWithPresence.length + stationsWithConsumption.length + criticalRooms.length,
    };
  }, [filteredInspections, stations, filteredRooms, selectedCycle]);

  const fumigatorStats = useMemo(() => {
    const fumigatorMap = new Map<string, FumigatorStats>();

    filteredRooms.forEach((room) => {
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

    filteredInspections.forEach((insp) => {
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
  }, [filteredRooms, filteredInspections]);

  const baitStationStats = useMemo(() => {
    const stationInspectionMap = new Map<number, StationInspection>();

    filteredInspections.forEach((insp) => {
      const existing = stationInspectionMap.get(insp.station_id);
      if (!existing || new Date(insp.inspected_at) > new Date(existing.inspected_at)) {
        stationInspectionMap.set(insp.station_id, insp);
      }
    });

    const stationsByType = {
      ROEDOR: 0,
      UV: 0,
      OTRO: 0,
    };

    const stationsWithBait = {
      hasBait: 0,
      noBait: 0,
    };

    const stationsByCondition = {
      BUENA: 0,
      REGULAR: 0,
      MALA: 0,
    };

    let totalInspected = 0;
    let stationsWithBaitReplaced = 0;

    stations.forEach((station) => {
      if (station.type in stationsByType) {
        stationsByType[station.type as keyof typeof stationsByType]++;
      }

      const lastInspection = stationInspectionMap.get(station.id);
      if (lastInspection) {
        totalInspected++;

        if (lastInspection.has_bait === 1) {
          stationsWithBait.hasBait++;
        } else {
          stationsWithBait.noBait++;
        }

        if (lastInspection.bait_replaced === 1) {
          stationsWithBaitReplaced++;
        }

        if (lastInspection.physical_condition in stationsByCondition) {
          stationsByCondition[lastInspection.physical_condition as keyof typeof stationsByCondition]++;
        }
      }
    });

    return {
      totalStations: stations.length,
      totalInspected,
      stationsByType,
      stationsWithBait,
      stationsByCondition,
      stationsWithBaitReplaced,
      inspectionCoverage: stations.length > 0 ? Math.round((totalInspected / stations.length) * 100) : 0,
    };
  }, [stations, filteredInspections]);

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
                    ? { lat: Number(issue.station.utm_y), lng: Number(issue.station.utm_x) }
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
      <GPSIssuesModal />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-sky-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Reporte Ejecutivo de Fumigacion</h1>
              <p className="text-stone-500 text-sm">
                Resumen publico de operaciones de fumigacion y control de plagas
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Ciclo de Fumigacion (Habitaciones)
            </label>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="all">Todos los ciclos</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.label} ({cycle.status}) - {new Date(cycle.period_start).toLocaleDateString('es-MX')}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Periodo de Inspecciones (Estaciones)
            </label>
            <select
              value={inspectionPeriod}
              onChange={(e) => setInspectionPeriod(e.target.value as InspectionPeriod)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="last_7">Ultimos 7 dias</option>
              <option value="last_30">Ultimos 30 dias</option>
              <option value="last_60">Ultimos 60 dias</option>
              <option value="last_90">Ultimos 90 dias</option>
              <option value="current_month">Mes actual</option>
              <option value="last_month">Mes pasado</option>
              <option value="all">Todo el historico</option>
            </select>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl border-4 border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-500 rounded-xl p-3">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Resumen General</h2>
              <p className="text-slate-300 text-sm">Indicadores clave de desempeño</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Total Habitaciones"
              value={cycleStats.totalRooms}
              subtitle={selectedCycle ? selectedCycle.label : 'Todos los ciclos'}
              icon={Home}
              color="teal"
            />
            <StatCard
              title="Completadas"
              value={cycleStats.completedRooms}
              subtitle={`${Math.round(cycleStats.completionRate)}% del total`}
              icon={CheckCircle2}
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
              subtitle={inspectionPeriod === 'last_7' ? 'Ultimos 7 dias' : inspectionPeriod === 'last_30' ? 'Ultimos 30 dias' : 'Periodo seleccionado'}
              icon={Eye}
              color="slate"
            />
            <StatCard
              title="Velocidad"
              value={`${cycleStats.velocity.toFixed(1)}`}
              subtitle="hab/dia"
              icon={Activity}
              color="teal"
            />
          </div>
        </div>

        {priorityAlerts.totalAlerts > 0 && (
          <div className="bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 border-2 border-rose-400 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-rose-700 animate-pulse" />
                Alertas Prioritarias - Requieren Atencion Inmediata
              </h2>
              <div className="bg-rose-600 text-white px-4 py-2 rounded-full font-bold text-lg">
                {priorityAlerts.totalAlerts}
              </div>
            </div>

            {priorityAlerts.stationsWithPresence.length > 0 && (
              <div className="bg-white rounded-lg border-2 border-rose-400 p-4 mb-4">
                <h3 className="font-bold text-rose-900 mb-3 flex items-center gap-2">
                  <Bug className="w-5 h-5" />
                  Estaciones con Presencia de Excremento ({priorityAlerts.stationsWithPresence.length})
                  <span className="text-xs font-normal text-rose-700 bg-rose-100 px-2 py-1 rounded">Revisar en 3 dias</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {priorityAlerts.stationsWithPresence.map((item, idx) => (
                    <div key={idx} className="bg-rose-50 border border-rose-300 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-bold text-stone-900">{item.station.code}</div>
                          <div className="text-sm text-stone-600">{item.station.name}</div>
                          <div className="text-xs text-stone-500">{item.station.type}</div>
                        </div>
                        <div className="bg-rose-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                          Hace {item.daysAgo}d
                        </div>
                      </div>
                      <div className="text-xs text-rose-700 font-medium">
                        Inspeccionada: {new Date(item.inspection.inspected_at).toLocaleDateString('es-MX')}
                      </div>
                      {item.inspection.inspector_nombre && (
                        <div className="text-xs text-stone-600 mt-1">
                          Por: {item.inspection.inspector_nombre}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {priorityAlerts.stationsWithConsumption.length > 0 && (
              <div className="bg-white rounded-lg border-2 border-orange-400 p-4 mb-4">
                <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Estaciones con Consumo de Veneno ({priorityAlerts.stationsWithConsumption.length})
                  <span className="text-xs font-normal text-orange-700 bg-orange-100 px-2 py-1 rounded">Accion requerida</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {priorityAlerts.stationsWithConsumption.map((item, idx) => (
                    <div key={idx} className="bg-orange-50 border border-orange-300 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-bold text-stone-900">{item.station.code}</div>
                          <div className="text-sm text-stone-600">{item.station.name}</div>
                          <div className="text-xs text-stone-500">{item.station.type}</div>
                        </div>
                        <div className="bg-orange-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                          Hace {item.daysAgo}d
                        </div>
                      </div>
                      <div className="text-xs text-orange-700 font-medium">
                        Inspeccionada: {new Date(item.inspection.inspected_at).toLocaleDateString('es-MX')}
                      </div>
                      {item.inspection.inspector_nombre && (
                        <div className="text-xs text-stone-600 mt-1">
                          Por: {item.inspection.inspector_nombre}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {priorityAlerts.criticalRooms.length > 0 && (
              <div className="bg-white rounded-lg border-2 border-amber-400 p-4">
                <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Habitaciones Criticas - Ciclo por Terminar ({priorityAlerts.criticalRooms.length})
                  <span className="text-xs font-normal text-amber-700 bg-amber-100 px-2 py-1 rounded">Ultimos 3 dias del ciclo</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {priorityAlerts.criticalRooms.map((item, idx) => (
                    <div key={idx} className="bg-amber-50 border border-amber-300 rounded-lg p-2 text-center hover:shadow-md transition-shadow">
                      <div className="font-bold text-stone-900">{item.room.room_number}</div>
                      <div className="text-xs text-stone-600">{item.room.area}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl border-4 border-slate-700 mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-500 rounded-xl p-3">
              <Home className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Fumigacion Habitaciones</h2>
              <p className="text-slate-300 text-sm">Ciclos de fumigacion y servicio a habitaciones</p>
            </div>
          </div>
        </div>

        {selectedCycle && (
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-300 rounded-xl p-6">
            <h2 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-sky-700" />
              KPIs Operativos - {selectedCycle.label}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg p-4 border border-sky-300">
                <div className="text-2xl font-bold text-sky-700">{cycleStats.velocity.toFixed(1)}</div>
                <div className="text-xs text-stone-600 mt-1">Hab/dia actual</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-sky-300">
                <div className="text-2xl font-bold text-sky-700">{cycleStats.requiredVelocity?.toFixed(1) || 0}</div>
                <div className="text-xs text-stone-600 mt-1">Hab/dia requerida</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-sky-300">
                <div className="text-2xl font-bold text-sky-700">{cycleStats.daysElapsed}</div>
                <div className="text-xs text-stone-600 mt-1">Dias transcurridos</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-sky-300">
                <div className="text-2xl font-bold text-sky-700">{cycleStats.daysRemaining}</div>
                <div className="text-xs text-stone-600 mt-1">Dias restantes</div>
              </div>
              <div className={`bg-white rounded-lg p-4 border-2 ${cycleStats.onTrack ? 'border-emerald-400' : 'border-rose-400'}`}>
                <div className={`text-2xl font-bold ${cycleStats.onTrack ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {cycleStats.onTrack ? 'En Meta' : 'Atrasado'}
                </div>
                <div className="text-xs text-stone-600 mt-1">Estado del ciclo</div>
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
                  const progress = Number(cycle.total_rooms) > 0
                    ? Math.round((Number(cycle.completed_rooms) / Number(cycle.total_rooms)) * 100)
                    : 0;
                  return (
                    <tr key={cycle.id} className="border-b border-stone-100 last:border-0">
                      <td className="py-3">
                        <span className="font-medium text-stone-900">{cycle.label}</span>
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

        <div className="bg-white rounded-xl border-2 border-sky-400 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-sky-700" />
              Ver Mapa de Habitaciones
            </h3>
            <a
              href="/fumigacion/mapa-habitaciones"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium"
            >
              <MapPin className="w-5 h-5" />
              Abrir Mapa Interactivo
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-sm text-stone-600">
            Visualiza todas las habitaciones fumigadas en un mapa interactivo con su estado actual, ultima fecha de fumigacion y alertas.
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 shadow-2xl border-4 border-slate-700 mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-500 rounded-xl p-3">
              <Bug className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Trampas y Cebaderas</h2>
              <p className="text-slate-300 text-sm">Control de estaciones e inspecciones</p>
            </div>
          </div>
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

        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-300 rounded-xl p-6">
          <h2 className="text-xl font-bold text-stone-900 mb-5 flex items-center gap-2">
            <Bug className="w-6 h-6 text-teal-700" />
            Resumen de Estaciones
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
            <div className="bg-white rounded-lg p-4 border border-teal-200 shadow-sm">
              <div className="text-2xl font-bold text-teal-700">{baitStationStats.totalStations}</div>
              <div className="text-xs text-stone-600 mt-1">Total Estaciones</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-emerald-200 shadow-sm">
              <div className="text-2xl font-bold text-emerald-700">{baitStationStats.totalInspected}</div>
              <div className="text-xs text-stone-600 mt-1">Inspeccionadas</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-sky-200 shadow-sm">
              <div className="text-2xl font-bold text-sky-700">{baitStationStats.inspectionCoverage}%</div>
              <div className="text-xs text-stone-600 mt-1">Cobertura</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
              <div className="text-2xl font-bold text-amber-700">{baitStationStats.stationsWithBait.hasBait}</div>
              <div className="text-xs text-stone-600 mt-1">Con Cebo</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-rose-200 shadow-sm">
              <div className="text-2xl font-bold text-rose-700">{baitStationStats.stationsWithBaitReplaced}</div>
              <div className="text-xs text-stone-600 mt-1">Cebo Reemplazado</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-lg p-4 border border-teal-200">
              <h3 className="font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-700" />
                Por Tipo de Estacion
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600">Cebaderas (Roedor)</span>
                  <span className="font-bold text-orange-700">{baitStationStats.stationsByType.ROEDOR}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600">Trampas UV</span>
                  <span className="font-bold text-cyan-700">{baitStationStats.stationsByType.UV}</span>
                </div>
                {baitStationStats.stationsByType.OTRO > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-600">Otros</span>
                    <span className="font-bold text-stone-900">{baitStationStats.stationsByType.OTRO}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-teal-200">
              <h3 className="font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Estado del Cebo
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-stone-600">Con Cebo</span>
                    <span className="font-bold text-emerald-700">{baitStationStats.stationsWithBait.hasBait}</span>
                  </div>
                  <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{
                        width: `${baitStationStats.totalInspected > 0 ? Math.round((baitStationStats.stationsWithBait.hasBait / baitStationStats.totalInspected) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-stone-600">Sin Cebo</span>
                    <span className="font-bold text-rose-700">{baitStationStats.stationsWithBait.noBait}</span>
                  </div>
                  <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-600 rounded-full"
                      style={{
                        width: `${baitStationStats.totalInspected > 0 ? Math.round((baitStationStats.stationsWithBait.noBait / baitStationStats.totalInspected) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-teal-200">
              <h3 className="font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-700" />
                Condicion Fisica
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                    Buena
                  </span>
                  <span className="font-bold text-emerald-700">{baitStationStats.stationsByCondition.BUENA}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                    Regular
                  </span>
                  <span className="font-bold text-orange-700">{baitStationStats.stationsByCondition.REGULAR}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-rose-600 rounded-full"></span>
                    Mala
                  </span>
                  <span className="font-bold text-rose-700">{baitStationStats.stationsByCondition.MALA}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-teal-400 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-teal-700" />
              Ver Mapa de Estaciones
            </h3>
            <a
              href="/fumigacion/mapa-estaciones"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              <MapPin className="w-5 h-5" />
              Abrir Mapa Interactivo
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-sm text-stone-600">
            Visualiza todas las estaciones de control (cebaderas y trampas UV) en un mapa interactivo con su ubicacion GPS, estado y alertas.
          </p>
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

        <div className="bg-gradient-to-r from-cyan-50 to-sky-50 border-2 border-cyan-300 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Eye className="w-6 h-6 text-cyan-700" />
              Inspecciones Recientes
            </h3>
            <div className="text-sm text-stone-600 bg-white px-3 py-1.5 rounded-lg border border-cyan-200">
              {filteredInspections.length} inspecciones en el periodo
            </div>
          </div>

          {filteredInspections.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-cyan-200">
              <Bug className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500">No hay inspecciones en el periodo seleccionado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInspections
                .slice()
                .sort((a, b) => new Date(b.inspected_at).getTime() - new Date(a.inspected_at).getTime())
                .slice(0, 50)
                .map((inspection) => {
                  const station = stations.find(s => s.id === inspection.station_id);
                  const hasAlerts = inspection.has_bait === 1 || inspection.bait_replaced === 1 || !inspection.location_ok;

                  return (
                    <div
                      key={inspection.id}
                      onClick={() => {
                        const enrichedInspection: StationInspection = {
                          ...inspection,
                          station_code: inspection.station_code || station?.code || '',
                          station_name: inspection.station_name || station?.name || '',
                        };
                        setSelectedInspection(enrichedInspection);
                      }}
                      className={`bg-white rounded-lg border-2 p-4 cursor-pointer hover:shadow-lg transition-all ${
                        hasAlerts ? 'border-amber-300 hover:border-amber-400' : 'border-stone-200 hover:border-cyan-400'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-bold text-stone-900">{inspection.station_code}</div>
                          <div className="text-sm text-stone-600">{inspection.station_name}</div>
                          {station && (
                            <div className="text-xs text-stone-500 mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded ${
                                station.type === 'ROEDOR' ? 'bg-orange-100 text-orange-700' : 'bg-cyan-100 text-cyan-700'
                              }`}>
                                {station.type}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          inspection.physical_condition === 'BUENA' ? 'bg-emerald-100 text-emerald-700' :
                          inspection.physical_condition === 'REGULAR' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {inspection.physical_condition}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(inspection.inspected_at).toLocaleDateString('es-MX', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {inspection.has_bait === 1 && (
                          <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Consumo detectado</span>
                          </div>
                        )}
                        {inspection.bait_replaced === 1 && (
                          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Presencia de excremento</span>
                          </div>
                        )}
                        {!inspection.location_ok && (
                          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                            <MapPin className="w-3 h-3" />
                            <span>Estacion desplazada</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-stone-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-stone-600">
                            <Users className="w-3 h-3" />
                            <span className="truncate">{inspection.inspector_nombre || 'Sin inspector'}</span>
                          </div>
                          {inspection.photo_url && (
                            <div className="flex items-center gap-1 text-xs text-cyan-700 bg-cyan-50 px-2 py-1 rounded">
                              <ImageIcon className="w-3 h-3" />
                              <span>Con foto</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {selectedInspection && (
        <InspectionDetailModal
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
        />
      )}
    </div>
  );
}
