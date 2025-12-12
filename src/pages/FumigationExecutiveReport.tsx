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
    teal: { bg: 'bg-teal-50', icon: 'text-teal-600', text: 'text-teal-700' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-700' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-700' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', text: 'text-blue-700' },
    slate: { bg: 'bg-slate-50', icon: 'text-slate-600', text: 'text-slate-700' },
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
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
             trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className={`text-2xl font-bold ${classes.text}`}>{value}</div>
        <div className="text-sm font-medium text-slate-700 mt-0.5">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
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
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', title: 'text-amber-800' },
    danger: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', title: 'text-red-800' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', title: 'text-blue-800' },
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
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="text-slate-500">{item.value}</span>
          </div>
        ))}
        {items.length > 10 && (
          <div className="text-xs text-center text-slate-500 pt-1">
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
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-slate-600 w-12 text-right">{percentage}%</span>
    </div>
  );
}

export default function FumigationExecutiveReport() {
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<FumigationCycle[]>([]);
  const [allRooms, setAllRooms] = useState<RoomFumigation[]>([]);
  const [stations, setStations] = useState<BaitStation[]>([]);
  const [inspections, setInspections] = useState<StationInspection[]>([]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FumigationNavigation />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Generando reporte ejecutivo...</p>
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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reporte Ejecutivo</h1>
              <p className="text-gray-500 text-sm">
                Resumen de operaciones de fumigacion y control de plagas
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
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

        <div className="bg-gradient-to-r from-red-50 to-amber-50 border-2 border-red-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            Indicadores de Actividad de Plagas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="text-3xl font-bold text-red-600">{stationAnalysis.totalConsumption}</div>
              <div className="text-sm text-gray-600 mt-1">Casos de consumo de veneno</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-amber-200">
              <div className="text-3xl font-bold text-amber-600">{stationAnalysis.totalPresence}</div>
              <div className="text-sm text-gray-600 mt-1">Presencia de excremento</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-red-200">
              <div className="text-3xl font-bold text-red-600">{stationAnalysis.mostConsumption.length}</div>
              <div className="text-sm text-gray-600 mt-1">Estaciones con consumo</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-amber-200">
              <div className="text-3xl font-bold text-amber-600">{stationAnalysis.mostPresence.length}</div>
              <div className="text-sm text-gray-600 mt-1">Estaciones con presencia</div>
            </div>
          </div>
        </div>

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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Habitaciones mas fumigadas</h3>
            </div>
            <div className="space-y-3">
              {roomAnalysis.mostFumigated.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos disponibles</p>
              ) : (
                roomAnalysis.mostFumigated.map((room, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-gray-700">Hab. {room.room_number}</span>
                    </div>
                    <span className="text-sm text-green-600 font-semibold">{room.fumigationCount} veces</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Habitaciones menos fumigadas</h3>
            </div>
            <div className="space-y-3">
              {roomAnalysis.leastFumigated.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos disponibles</p>
              ) : (
                roomAnalysis.leastFumigated.map((room, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-gray-700">Hab. {room.room_number}</span>
                    </div>
                    <span className="text-sm text-amber-600 font-semibold">{room.fumigationCount} veces</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-gray-900">Distribucion por tipo de servicio</h3>
            </div>
            <div className="space-y-3">
              {serviceTypeDistribution.map((item) => (
                <div key={item.type}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{item.type}</span>
                    <span className="text-gray-500">{item.count}</span>
                  </div>
                  <ProgressBar
                    value={item.count}
                    max={serviceTypeDistribution[0]?.count || 1}
                    color={item.type === 'PREVENTIVO' ? 'bg-green-500' : item.type === 'CORRECTIVO' ? 'bg-red-500' : 'bg-teal-500'}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-gray-900">Mayor consumo de veneno</h3>
            </div>
            <div className="space-y-3">
              {stationAnalysis.mostConsumption.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos disponibles</p>
              ) : (
                stationAnalysis.mostConsumption.map((station, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-gray-700">{station.code}</span>
                        <span className="text-xs text-gray-500 ml-2">{station.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-red-600 font-semibold">{station.consumptionCount} veces</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-amber-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Mayor presencia de excremento</h3>
            </div>
            <div className="space-y-3">
              {stationAnalysis.mostPresence.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos disponibles</p>
              ) : (
                stationAnalysis.mostPresence.map((station, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-gray-700">{station.code}</span>
                        <span className="text-xs text-gray-500 ml-2">{station.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-amber-600 font-semibold">{station.presenceCount} veces</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-blue-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Estaciones mas desplazadas</h3>
            </div>
            <div className="space-y-3">
              {stationAnalysis.mostMoved.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos disponibles</p>
              ) : (
                stationAnalysis.mostMoved.map((station, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-gray-700">{station.code}</span>
                        <span className="text-xs text-gray-500 ml-2">{station.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-blue-600 font-semibold">{station.locationMovedCount} veces</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bug className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Estaciones mas inspeccionadas</h3>
            </div>
            <div className="space-y-3">
              {stationAnalysis.mostInspected.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos disponibles</p>
              ) : (
                stationAnalysis.mostInspected.map((station, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-gray-700">{station.code}</span>
                        <span className="text-xs text-gray-500 ml-2">{station.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-blue-600 font-semibold">{station.inspectionCount}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                        station.avgCondition === 'BUENA' ? 'bg-green-100 text-green-700' :
                        station.avgCondition === 'REGULAR' ? 'bg-amber-100 text-amber-700' :
                        station.avgCondition === 'MALA' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {station.avgCondition}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-gray-900">Rendimiento de fumigadores</h3>
            </div>
            <div className="space-y-3">
              {fumigatorStats.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos disponibles</p>
              ) : (
                fumigatorStats.map((fumigator, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium text-gray-700">{fumigator.name}</span>
                        {fumigator.empresa && (
                          <span className="text-xs text-gray-500 ml-1">({fumigator.empresa})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-green-600" />
                        <span className="font-medium text-gray-700">{fumigator.totalFumigations}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bug className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-medium text-gray-700">{fumigator.totalInspections}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-gray-900">Resumen de ciclos recientes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
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
                    <tr key={cycle.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3">
                        <Link
                          to={`/fumigacion/habitaciones/ciclo/${cycle.id}`}
                          className="font-medium text-teal-600 hover:text-teal-700"
                        >
                          {cycle.label}
                        </Link>
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {new Date(cycle.period_start).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                        {' - '}
                        {new Date(cycle.period_end).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          cycle.status === 'ABIERTO'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {cycle.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-700 text-right font-medium">{cycle.total_rooms}</td>
                      <td className="py-3 text-sm text-green-600 text-right font-medium">{cycle.completed_rooms}</td>
                      <td className="py-3 text-sm text-amber-600 text-right font-medium">{cycle.pending_rooms}</td>
                      <td className="py-3 w-32">
                        <ProgressBar
                          value={progress}
                          max={100}
                          color={progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500'}
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
