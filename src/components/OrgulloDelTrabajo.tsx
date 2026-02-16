import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { workingOrdersAPI } from '../lib/workingOrders';
import { inspectionsApi } from '../lib/inspections-api';
import { fumigationApi } from '../lib/fumigationApi';
import { energyApi } from '../lib/energyApi';
import {
  Trophy,
  ClipboardCheck,
  Wrench,
  Droplets,
  Bug,
  FileSpreadsheet,
  Zap,
  Package,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface HistoricalStats {
  totalTareas: number;
  tareasCompletadas: number;
  totalWorkingOrders: number;
  workingOrdersResueltas: number;
  totalInspectionCycles: number;
  totalRoomsInspected: number;
  totalSabanas: number;
  totalSabanaItems: number;
  totalRequisiciones: number;
  totalRequisicionItems: number;
  totalWaterElements: number;
  totalFumigationStations: number;
  totalFumigationRoomsDone: number;
  totalFumigationCycles: number;
  totalEnergyReadings: number;
}

const EMPTY: HistoricalStats = {
  totalTareas: 0,
  tareasCompletadas: 0,
  totalWorkingOrders: 0,
  workingOrdersResueltas: 0,
  totalInspectionCycles: 0,
  totalRoomsInspected: 0,
  totalSabanas: 0,
  totalSabanaItems: 0,
  totalRequisiciones: 0,
  totalRequisicionItems: 0,
  totalWaterElements: 0,
  totalFumigationStations: 0,
  totalFumigationRoomsDone: 0,
  totalFumigationCycles: 0,
  totalEnergyReadings: 0,
};

function AnimatedNumber({ value, duration = 1800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (value === 0 || hasAnimated.current) {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.2 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{display.toLocaleString('es-MX')}</span>;
}

interface StatBlockProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent: string;
}

function StatBlock({ icon, value, label, accent }: StatBlockProps) {
  return (
    <div className="flex flex-col items-center text-center gap-2 p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent} group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
        <AnimatedNumber value={value} />
      </div>
      <div className="text-xs text-stone-400 font-medium leading-tight uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

export default function OrgulloDelTrabajo() {
  const [stats, setStats] = useState<HistoricalStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const [
          notesAll,
          woRes,
          inspCycles,
          sabanasAll,
          reqSummary,
          waterEl,
          fumStations,
          fumCycles,
          fumInspections,
          energyAll,
        ] = await Promise.all([
          api.getNotes().catch(() => []),
          workingOrdersAPI.list({ withSummary: true }).catch(() => ({
            data: [],
            summary: { total: 0, open_cnt: 0, resolved_cnt: 0 },
          })),
          inspectionsApi.getCycles().catch(() => []),
          api.getSabanas({ fields: 'summary' }).catch(() => []),
          api.getRequisitionsSummary().catch(() => ({
            requisitions: { total_requisitions: 0, open_requisitions: 0, closed_requisitions: 0 },
            items: { total_items: 0, pending_items: 0, received_items: 0 },
          })),
          api.getAquaticElements({ withLast: 0 }).catch(() => ({ data: [], total: 0 })),
          fumigationApi.getStationsWithLastInspection().catch(() => []),
          fumigationApi.getCycles().catch(() => []),
          fumigationApi.getInspections().catch(() => []),
          energyApi.getEnergeticos().catch(() => []),
        ]);

        const notes = Array.isArray(notesAll) ? notesAll : [];
        const cycles = Array.isArray(inspCycles) ? inspCycles : [];
        const sabanas = Array.isArray(sabanasAll) ? sabanasAll : [];
        const stations = Array.isArray(fumStations) ? fumStations : [];
        const fCycles = Array.isArray(fumCycles) ? fumCycles : [];
        const fInsp = Array.isArray(fumInspections) ? fumInspections : [];
        const energy = Array.isArray(energyAll) ? energyAll : [];

        const woSummary = woRes.summary || {} as any;
        const woTotal = woSummary.total ?? woRes.data?.length ?? 0;
        const woResolved = woSummary.resolved_cnt ?? woRes.data?.filter((w: any) => w.status === 'RESOLVED').length ?? 0;

        const totalRoomsInspected = cycles.reduce((sum: number, c: any) => {
          const inspected = (c.totalRooms ?? 0) - (c.roomsSinInspeccionar ?? 0);
          return sum + Math.max(0, inspected);
        }, 0);

        const totalSabanaItems = sabanas.reduce((sum: number, s: any) => sum + (s.rooms_total ?? 0), 0);

        const fumRoomsDone = fCycles.reduce((sum: number, c: any) => sum + (c.completed_rooms ?? 0), 0);

        if (alive) {
          setStats({
            totalTareas: notes.length,
            tareasCompletadas: notes.filter((n: any) => n.estado === 2).length,
            totalWorkingOrders: woTotal,
            workingOrdersResueltas: woResolved,
            totalInspectionCycles: cycles.length,
            totalRoomsInspected,
            totalSabanas: sabanas.length,
            totalSabanaItems,
            totalRequisiciones: reqSummary.requisitions.total_requisitions,
            totalRequisicionItems: reqSummary.items.total_items,
            totalWaterElements: waterEl.total || 0,
            totalFumigationStations: stations.length,
            totalFumigationRoomsDone: fumRoomsDone,
            totalFumigationCycles: fCycles.length,
            totalEnergyReadings: energy.length,
          });
        }
      } catch (err) {
        console.error('Error loading historical stats:', err);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => { alive = false; };
  }, []);

  const completionRate = stats.totalTareas > 0
    ? Math.round((stats.tareasCompletadas / stats.totalTareas) * 100)
    : 0;

  if (loading) {
    return (
      <section className="rounded-2xl bg-stone-900 p-8 animate-pulse">
        <div className="h-8 bg-stone-800 rounded w-64 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-stone-800 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-gradient-to-br from-stone-900 via-stone-900 to-stone-800 p-6 sm:p-8 border border-stone-700/50 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Orgullo del Trabajo
            </h2>
            <p className="text-sm text-stone-400 mt-0.5">
              Resultados acumulados desde el inicio de operaciones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              <AnimatedNumber value={completionRate} />%
            </div>
            <div className="text-[10px] uppercase tracking-widest text-emerald-500/80 font-medium">
              Tasa de cumplimiento
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/5 border border-amber-500/20">
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          <span className="text-xs uppercase tracking-widest text-amber-400/80 font-semibold">
            Total historico de tareas
          </span>
        </div>
        <div className="flex items-baseline gap-4 flex-wrap">
          <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter">
            <AnimatedNumber value={stats.totalTareas} duration={2200} />
          </span>
          <span className="text-lg text-stone-400">
            reportadas &mdash;{' '}
            <span className="text-emerald-400 font-semibold">
              <AnimatedNumber value={stats.tareasCompletadas} duration={2000} />
            </span>{' '}
            completadas
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        <StatBlock
          icon={<Wrench className="w-5 h-5 text-orange-300" />}
          value={stats.totalWorkingOrders}
          label="Ordenes de trabajo"
          accent="bg-orange-500/20"
        />
        <StatBlock
          icon={<Wrench className="w-5 h-5 text-emerald-300" />}
          value={stats.workingOrdersResueltas}
          label="OTs resueltas"
          accent="bg-emerald-500/20"
        />
        <StatBlock
          icon={<ClipboardCheck className="w-5 h-5 text-blue-300" />}
          value={stats.totalRoomsInspected}
          label="Habitaciones inspeccionadas"
          accent="bg-blue-500/20"
        />
        <StatBlock
          icon={<ClipboardCheck className="w-5 h-5 text-sky-300" />}
          value={stats.totalInspectionCycles}
          label="Ciclos de inspeccion"
          accent="bg-sky-500/20"
        />
        <StatBlock
          icon={<Droplets className="w-5 h-5 text-cyan-300" />}
          value={stats.totalWaterElements}
          label="Elementos acuaticos monitoreados"
          accent="bg-cyan-500/20"
        />
        <StatBlock
          icon={<Package className="w-5 h-5 text-green-300" />}
          value={stats.totalRequisiciones}
          label="Requisiciones gestionadas"
          accent="bg-green-500/20"
        />
        <StatBlock
          icon={<Package className="w-5 h-5 text-teal-300" />}
          value={stats.totalRequisicionItems}
          label="Items de requisicion"
          accent="bg-teal-500/20"
        />
        <StatBlock
          icon={<FileSpreadsheet className="w-5 h-5 text-amber-300" />}
          value={stats.totalSabanas}
          label="Sabanas creadas"
          accent="bg-amber-500/20"
        />
        <StatBlock
          icon={<FileSpreadsheet className="w-5 h-5 text-yellow-300" />}
          value={stats.totalSabanaItems}
          label="Items de sabanas revisados"
          accent="bg-yellow-500/20"
        />
        <StatBlock
          icon={<Bug className="w-5 h-5 text-rose-300" />}
          value={stats.totalFumigationStations}
          label="Estaciones de fumigacion"
          accent="bg-rose-500/20"
        />
        <StatBlock
          icon={<Bug className="w-5 h-5 text-pink-300" />}
          value={stats.totalFumigationRoomsDone}
          label="Habitaciones fumigadas"
          accent="bg-pink-500/20"
        />
        <StatBlock
          icon={<Bug className="w-5 h-5 text-red-300" />}
          value={stats.totalFumigationCycles}
          label="Ciclos de fumigacion"
          accent="bg-red-500/20"
        />
        <StatBlock
          icon={<Zap className="w-5 h-5 text-yellow-300" />}
          value={stats.totalEnergyReadings}
          label="Lecturas de energia"
          accent="bg-yellow-500/20"
        />
      </div>
    </section>
  );
}
