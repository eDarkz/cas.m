import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { energyApi } from '../lib/energyApi';
import { workingOrdersAPI } from '../lib/workingOrders';
import { inspectionsApi } from '../lib/inspections-api';
import { fumigationApi } from '../lib/fumigationApi';
import KpiCard from '../components/dashboard/KpiCard';
import AlertCard from '../components/dashboard/AlertCard';
import ModuleCard from '../components/dashboard/ModuleCard';
import HamsterLoader from '../components/HamsterLoader';
import OrgulloDelTrabajo from '../components/OrgulloDelTrabajo';

import {
  Droplets,
  ClipboardCheck,
  Package,
  AlertCircle,
  Activity,
  Zap,
  Wrench,
  FileSpreadsheet,
  LayoutDashboard,
  Calendar,
  Bug,
  UtensilsCrossed,
  ThumbsUp,
  ThumbsDown,
  MessageSquarePlus,
} from 'lucide-react';

interface DailyMenu {
  id: string;
  menu_ppal: string;
  acompanamiento: string;
  bebida?: string;
  fecha: string;
  megusto: number;
  nomegusto: number;
}

interface Stats {
  waterElements: number;
  waterAlertsCount: number;
  waterAlertsPct: number;

  inspectionAvance: number;
  inspectionConDetalles: number;
  inspectionCycleName: string;
  inspectionRoomsTotal: number;

  requisitionsOpen: number;
  requisitionsPendingItems: number;

  sabanasActive: number;
  notesActive: number;

  workingOrdersOpen: number;
  workingOrdersTotal: number;

  energyReadings: number;
  energyMonthCost: number;

  fumigationTotal: number;
  fumigationActive: number;
  fumigationNeedsInspection: number;
  fumigationCebaderas: number;
  fumigationUV: number;
}

const INITIAL_STATS: Stats = {
  waterElements: 0,
  waterAlertsCount: 0,
  waterAlertsPct: 0,
  inspectionAvance: 0,
  inspectionConDetalles: 0,
  inspectionCycleName: '',
  inspectionRoomsTotal: 0,
  requisitionsOpen: 0,
  requisitionsPendingItems: 0,
  sabanasActive: 0,
  notesActive: 0,
  workingOrdersOpen: 0,
  workingOrdersTotal: 0,
  energyReadings: 0,
  energyMonthCost: 0,
  fumigationTotal: 0,
  fumigationActive: 0,
  fumigationNeedsInspection: 0,
  fumigationCebaderas: 0,
  fumigationUV: 0,
};

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [dailyMenu, setDailyMenu] = useState<DailyMenu | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;

        const [
          requisitionsSummary,
          elementsRes,
          sabanasRes,
          notesRes,
          workingOrdersRes,
          energyRes,
          inspectionCycles,
          energiaPrecio,
          fumigationStations,
        ] = await Promise.all([
          api.getRequisitionsSummary().catch(() => ({
            requisitions: { total_requisitions: 0, open_requisitions: 0, closed_requisitions: 0 },
            items: { pending_items: 0 },
          })),
          api.getAquaticElements({ archived: 0, withLast: 1 }).catch(() => ({ data: [], total: 0 })),
          api.getSabanas({ archived: 0, fields: 'summary' }).catch(() => []),
          api.getNotes().catch(() => []),
          workingOrdersAPI.list().catch(() => ({
            data: [],
            summary: { total: 0, open: 0, assigned: 0, in_progress: 0, resolved: 0, dismissed: 0 },
          })),
          energyApi.getEnergeticos().catch(() => []),
          inspectionsApi.getCycles().catch(() => []),
          energyApi.getPrecioEnergia(year, month).catch(() => null),
          fumigationApi.getStationsWithLastInspection().catch(() => []),
        ]);

        const nowTs = Date.now();

        const waterAlertsCount = (elementsRes.data || []).filter((e: any) => {
          if (!e.last?.sampled_at) return true;
          const daysSince = (nowTs - new Date(e.last.sampled_at).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince > 7;
        }).length;

        const waterElementsTotal = elementsRes.total || 0;
        const waterAlertsPct = waterElementsTotal > 0 ? (waterAlertsCount / waterElementsTotal) * 100 : 0;

        const workingOrdersOpen =
          workingOrdersRes.summary?.open ??
          workingOrdersRes.data.filter(
            (wo: any) => wo.status === 'OPEN' || wo.status === 'ASSIGNED' || wo.status === 'IN_PROGRESS',
          ).length;

        const workingOrdersTotal = workingOrdersRes.summary?.total ?? workingOrdersRes.data.length ?? 0;

        const energyReadingsThisMonth = Array.isArray(energyRes)
          ? energyRes.filter((reading: any) => {
              if (!reading.fecha) return false;
              const d = new Date(reading.fecha);
              return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
            }).length
          : 0;

        let energyMonthCost = 0;
        if (energiaPrecio && typeof energiaPrecio === 'object') {
          for (const key of ['costo_estimado', 'costoTotal', 'costo_total', 'total']) {
            if (Object.prototype.hasOwnProperty.call(energiaPrecio, key) && typeof (energiaPrecio as any)[key] === 'number') {
              energyMonthCost = (energiaPrecio as any)[key];
              break;
            }
          }
        }

        let inspectionAvance = 0;
        let inspectionConDetalles = 0;
        let inspectionCycleName = '';
        let inspectionRoomsTotal = 0;

        if (Array.isArray(inspectionCycles) && inspectionCycles.length > 0) {
          const latest = inspectionCycles.reduce((acc: any, item: any) => {
            if (!acc) return item;
            if (item.year > acc.year) return item;
            if (item.year === acc.year && item.month > acc.month) return item;
            return acc;
          }, inspectionCycles[0]);

          inspectionAvance = latest.porcentajeInspeccionadas ?? 0;
          inspectionConDetalles = latest.roomsConFallas ?? 0;
          inspectionCycleName = latest.nombre ?? '';
          inspectionRoomsTotal = latest.totalRooms ?? 0;
        }

        const stations = Array.isArray(fumigationStations) ? fumigationStations : [];
        const fumigationActive = stations.filter((s: any) => s.is_active).length;
        const fumigationNeedsInspection = stations.filter((s: any) => {
          if (!s.is_active) return false;
          if (!s.lastInspection) return true;
          const lastDate = new Date(s.lastInspection.inspected_at);
          const daysSince = (nowTs - lastDate.getTime()) / (1000 * 60 * 60 * 24);
          const requiresUrgent = s.lastInspection.has_bait || s.lastInspection.bait_replaced;
          const threshold = requiresUrgent ? 3 : 30;
          return daysSince > threshold;
        }).length;

        const nextStats: Stats = {
          waterElements: waterElementsTotal,
          waterAlertsCount,
          waterAlertsPct,
          inspectionAvance,
          inspectionConDetalles,
          inspectionCycleName,
          inspectionRoomsTotal,
          requisitionsOpen: requisitionsSummary.requisitions.open_requisitions,
          requisitionsPendingItems: requisitionsSummary.items.pending_items,
          sabanasActive: sabanasRes.length,
          notesActive: notesRes.filter((n: any) => n.estado === 0 || n.estado === 1).length,
          workingOrdersOpen,
          workingOrdersTotal,
          energyReadings: energyReadingsThisMonth,
          energyMonthCost,
          fumigationTotal: stations.length,
          fumigationActive,
          fumigationNeedsInspection,
          fumigationCebaderas: stations.filter((s: any) => s.type === 'ROEDOR').length,
          fumigationUV: stations.filter((s: any) => s.type === 'UV').length,
        };

        if (isMounted) setStats(nextStats);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStats();

    const fetchMenu = async () => {
      try {
        const d = new Date();
        const fecha = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const res = await fetch(`https://back-menu.fly.dev/menus/by-date?fecha=${fecha}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.menu_ppal) setDailyMenu(data);
        }
      } catch {
        // no menu available
      }
    };
    fetchMenu();

    return () => { isMounted = false; };
  }, []);

  const formattedDate = useMemo(
    () => now.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
    [now],
  );

  const systemPressure = useMemo(() => {
    const score =
      stats.workingOrdersOpen * 1.4 +
      stats.requisitionsPendingItems * 0.8 +
      stats.waterAlertsCount * 1.2 +
      stats.fumigationNeedsInspection * 0.6;

    if (score === 0) return { label: 'Sistema en calma', tone: 'ok' as const };
    if (score < 15) return { label: 'Carga ligera', tone: 'low' as const };
    if (score < 40) return { label: 'Carga moderada', tone: 'medium' as const };
    if (score < 80) return { label: 'Alta demanda', tone: 'high' as const };
    return { label: 'Modo incendio', tone: 'critical' as const };
  }, [stats.workingOrdersOpen, stats.requisitionsPendingItems, stats.waterAlertsCount, stats.fumigationNeedsInspection]);

  const pressureStyles: Record<string, { dot: string; ring: string; text: string }> = {
    ok: { dot: 'bg-emerald-500 shadow-emerald-400/60', ring: 'border-emerald-200', text: 'text-emerald-700' },
    low: { dot: 'bg-blue-500 shadow-blue-400/60', ring: 'border-blue-200', text: 'text-blue-700' },
    medium: { dot: 'bg-amber-500 shadow-amber-400/60', ring: 'border-amber-200', text: 'text-amber-700' },
    high: { dot: 'bg-orange-500 shadow-orange-400/60', ring: 'border-orange-200', text: 'text-orange-700' },
    critical: { dot: 'bg-red-500 shadow-red-400/60', ring: 'border-red-200', text: 'text-red-700' },
  };

  const pStyle = pressureStyles[systemPressure.tone];

  const hasAlerts =
    stats.waterAlertsCount > 0 ||
    stats.requisitionsPendingItems > 0 ||
    stats.inspectionConDetalles > 0 ||
    stats.fumigationNeedsInspection > 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <HamsterLoader />
        <span className="text-stone-500 text-sm">Preparando el panel de ingenieria...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-blue-600 mb-1">
            Secrets Puerto Los Cabos -- Ingenieria
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Centro de Control Operativo
          </h1>
          <p className="text-sm text-stone-500 mt-1 max-w-lg">
            Vision ejecutiva: agua, energia, inspecciones, fumigacion, requisiciones y ordenes de trabajo.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white rounded-xl border border-stone-200 shadow-sm">
            <Activity className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-xs font-medium text-stone-800 capitalize">{formattedDate}</div>
              <div className="text-[10px] text-stone-400">Actualizado en tiempo real</div>
            </div>
          </div>

          <div className={`flex items-center gap-2.5 px-4 py-2.5 bg-white rounded-xl border shadow-sm ${pStyle.ring}`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shadow-md ${pStyle.dot}`} />
              <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">Estado</span>
            </div>
            <span className={`text-xs font-semibold ${pStyle.text}`}>{systemPressure.label}</span>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon={<Droplets className="w-5 h-5" />}
          label="Agua"
          value={stats.waterElements}
          detail={
            stats.waterAlertsCount > 0
              ? `${stats.waterAlertsCount} en alerta`
              : 'Todos con muestreo reciente'
          }
          variant="cyan"
          onClick={() => navigate('/water-chemistry')}
        />
        <KpiCard
          icon={<ClipboardCheck className="w-5 h-5" />}
          label="Inspecciones"
          value={`${Math.round(stats.inspectionAvance)}%`}
          detail={
            stats.inspectionRoomsTotal > 0
              ? `${stats.inspectionRoomsTotal} hab. - ${stats.inspectionConDetalles} fallas`
              : 'Sin ciclo activo'
          }
          variant="blue"
          onClick={() => navigate('/inspecciones')}
        />
        <KpiCard
          icon={<Package className="w-5 h-5" />}
          label="Requisiciones"
          value={stats.requisitionsOpen}
          detail={`${stats.requisitionsPendingItems} items pendientes`}
          variant="green"
          onClick={() => navigate('/requisiciones')}
        />
        <KpiCard
          icon={<Wrench className="w-5 h-5" />}
          label="OTs abiertas"
          value={stats.workingOrdersOpen}
          detail={`${stats.workingOrdersTotal} totales en periodo`}
          variant="orange"
          onClick={() => navigate('/working-orders')}
        />
        <KpiCard
          icon={<Zap className="w-5 h-5" />}
          label="Energia"
          value={stats.energyReadings}
          detail={
            stats.energyMonthCost > 0
              ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(stats.energyMonthCost)
              : 'Costo pendiente'
          }
          variant="gold"
          onClick={() => navigate('/energy')}
        />
        <KpiCard
          icon={<Bug className="w-5 h-5" />}
          label="Fumigacion"
          value={stats.fumigationActive}
          detail={
            stats.fumigationNeedsInspection > 0
              ? `${stats.fumigationNeedsInspection} requieren revision`
              : 'Todas al dia'
          }
          variant="rose"
          onClick={() => navigate('/fumigacion')}
        />
      </section>

      {dailyMenu && (() => {
        const total = (dailyMenu.megusto ?? 0) + (dailyMenu.nomegusto ?? 0);
        const positiveRate = total > 0 ? Math.round(((dailyMenu.megusto ?? 0) / total) * 100) : 0;
        const sentiment = positiveRate >= 80 ? 'great' : positiveRate >= 60 ? 'ok' : positiveRate >= 40 ? 'mixed' : 'poor';
        const sentimentLabel: Record<string, string> = {
          great: 'Excelente aceptacion',
          ok: 'Buena aceptacion',
          mixed: 'Opinion dividida',
          poor: 'Baja aceptacion',
        };
        const sentimentColor: Record<string, string> = {
          great: 'text-emerald-600',
          ok: 'text-blue-600',
          mixed: 'text-amber-600',
          poor: 'text-red-600',
        };
        const barColor: Record<string, string> = {
          great: 'bg-emerald-500',
          ok: 'bg-blue-500',
          mixed: 'bg-amber-500',
          poor: 'bg-red-500',
        };

        return (
          <section className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/20 rounded-2xl border border-amber-200/70 overflow-hidden">
            <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-amber-200/50">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-amber-700">Menu del Dia</span>
                  <span className="text-xs text-stone-400">{dailyMenu.fecha}</span>
                </div>
              </div>
              {total > 0 && (
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-stone-200/80 ${sentimentColor[sentiment]}`}>
                  {sentimentLabel[sentiment]}
                </span>
              )}
            </div>

            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
              <div className="space-y-1 min-w-0">
                <p className="text-2xl font-bold text-amber-900 leading-tight capitalize">
                  {dailyMenu.menu_ppal.toLowerCase()}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  <span className="text-sm text-stone-600 capitalize">{dailyMenu.acompanamiento.toLowerCase()}</span>
                  {dailyMenu.bebida && (
                    <span className="text-sm text-stone-500 capitalize">
                      Bebida: {dailyMenu.bebida.toLowerCase()}
                    </span>
                  )}
                </div>
              </div>

              <a
                href="https://menus.fly.dev/comentarios"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-4 py-2.5 rounded-xl shadow-sm shadow-amber-300/40 transition-colors duration-150 whitespace-nowrap shrink-0"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Comentar el menu
              </a>
            </div>

            {total > 0 && (
              <div className="px-5 pb-4">
                <div className="bg-white/60 border border-amber-200/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Percepcion del personal</span>
                    <span className={`text-xs font-bold ${sentimentColor[sentiment]}`}>{positiveRate}% positivo</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium shrink-0">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{dailyMenu.megusto}</span>
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor[sentiment]}`}
                        style={{ width: `${positiveRate}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-red-400 font-medium shrink-0">
                      <span>{dailyMenu.nomegusto}</span>
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        );
      })()}

      {hasAlerts && (
        <section className="bg-gradient-to-br from-red-50/60 via-orange-50/40 to-amber-50/30 rounded-2xl border border-red-200/60 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Frente inmediato de trabajo</h2>
              <p className="text-xs text-stone-500">Areas que pueden impactar la experiencia del huesped</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.waterAlertsCount > 0 && (
              <AlertCard
                tone="red"
                title="Analisis de agua atrasados"
                count={stats.waterAlertsCount}
                description="Elementos sin muestreo en los ultimos 7 dias."
                subtitle={`${Math.round(stats.waterAlertsPct)}% del parque acuatico`}
                icon={<Droplets className="w-5 h-5" />}
                onClick={() => navigate('/water-chemistry')}
              />
            )}
            {stats.requisitionsPendingItems > 0 && (
              <AlertCard
                tone="amber"
                title="Items pendientes"
                count={stats.requisitionsPendingItems}
                description="Material solicitado aun no surtido."
                subtitle={`${stats.requisitionsOpen} requisiciones abiertas`}
                icon={<Package className="w-5 h-5" />}
                onClick={() => navigate('/requisiciones')}
              />
            )}
            {stats.inspectionConDetalles > 0 && (
              <AlertCard
                tone="blue"
                title="Habitaciones con fallas"
                count={stats.inspectionConDetalles}
                description="Detectadas en el ciclo actual."
                subtitle={stats.inspectionCycleName ? `Ciclo: ${stats.inspectionCycleName}` : undefined}
                icon={<ClipboardCheck className="w-5 h-5" />}
                onClick={() => navigate('/inspecciones')}
              />
            )}
            {stats.fumigationNeedsInspection > 0 && (
              <AlertCard
                tone="rose"
                title="Estaciones sin revision"
                count={stats.fumigationNeedsInspection}
                description="Cebaderas/UV que requieren inspeccion."
                subtitle={`${stats.fumigationCebaderas} cebaderas, ${stats.fumigationUV} UV`}
                icon={<Bug className="w-5 h-5" />}
                onClick={() => navigate('/fumigacion')}
              />
            )}
          </div>
        </section>
      )}

      <OrgulloDelTrabajo />

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-stone-900">Modulos del sistema</h2>
          <p className="text-xs text-stone-500 mt-0.5">Navega directo a cada flujo operativo</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <ModuleCard
            accent="cyan"
            icon={<Droplets className="w-5 h-5" />}
            title="Quimica del Agua"
            description="Control de piscinas, jacuzzis, spas y fuentes."
            primaryValue={`${stats.waterElements} elementos`}
            secondaryValue={
              stats.waterAlertsCount > 0
                ? `${stats.waterAlertsCount} en alerta`
                : 'Todos en rango'
            }
            onClick={() => navigate('/water-chemistry')}
            footerChip="Reportes y tendencias"
          />
          <ModuleCard
            accent="blue"
            icon={<ClipboardCheck className="w-5 h-5" />}
            title="Inspecciones"
            description="Ciclos mensuales, evidencias y analisis de patrones."
            primaryValue={`${Math.round(stats.inspectionAvance)}% avance`}
            secondaryValue={
              stats.inspectionRoomsTotal > 0
                ? `${stats.inspectionRoomsTotal} hab. - ${stats.inspectionConDetalles} fallas`
                : 'Configura tu primer ciclo'
            }
            onClick={() => navigate('/inspecciones')}
            footerChip="Analisis por ciclo"
          />
          <ModuleCard
            accent="green"
            icon={<Package className="w-5 h-5" />}
            title="Requisiciones"
            description="Flujo desde supervisor hasta compras y almacen."
            primaryValue={`${stats.requisitionsOpen} abiertas`}
            secondaryValue={`${stats.requisitionsPendingItems} items pendientes`}
            onClick={() => navigate('/requisiciones')}
            footerChip="Reportes de antiguedad"
          />
          <ModuleCard
            accent="orange"
            icon={<Wrench className="w-5 h-5" />}
            title="Ordenes de Trabajo"
            description="Asignacion, tiempos de respuesta y trazabilidad."
            primaryValue={`${stats.workingOrdersOpen} abiertas`}
            secondaryValue={`${stats.workingOrdersTotal} en el periodo`}
            onClick={() => navigate('/working-orders')}
            footerChip="KPIs y SLA"
          />
          <ModuleCard
            accent="rose"
            icon={<Bug className="w-5 h-5" />}
            title="Fumigacion"
            description="Cebaderas, trampas UV y ciclos de fumigacion por habitacion."
            primaryValue={`${stats.fumigationActive} estaciones activas`}
            secondaryValue={
              stats.fumigationNeedsInspection > 0
                ? `${stats.fumigationNeedsInspection} requieren revision`
                : 'Todas al dia'
            }
            onClick={() => navigate('/fumigacion')}
            footerChip="Control de plagas"
          />
          <ModuleCard
            accent="amber"
            icon={<FileSpreadsheet className="w-5 h-5" />}
            title="Sabanas"
            description="Control de ocupacion diaria y proyecciones."
            primaryValue={`${stats.sabanasActive} activos`}
            secondaryValue="Integracion con OTs y energia"
            onClick={() => navigate('/sabanas')}
            footerChip="Historico exportable"
          />
          <ModuleCard
            accent="slate"
            icon={<LayoutDashboard className="w-5 h-5" />}
            title="Tablero de Tareas"
            description="Kanban para supervisores con priorizacion visual."
            primaryValue={`${stats.notesActive} tareas activas`}
            secondaryValue="Organiza por responsable"
            onClick={() => navigate('/dashboard')}
            footerChip="Vista por supervisor"
          />
          <ModuleCard
            accent="gold"
            icon={<Zap className="w-5 h-5" />}
            title="Energia"
            description="Consumos de agua, gas y electricidad."
            primaryValue={`${stats.energyReadings} lecturas este mes`}
            secondaryValue={
              stats.energyMonthCost > 0
                ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(stats.energyMonthCost)
                : 'Configura precios de energia'
            }
            onClick={() => navigate('/energy')}
            footerChip="Alertas y proyecciones"
          />
          <ModuleCard
            accent="blue"
            icon={<Calendar className="w-5 h-5" />}
            title="BEOs"
            description="Calendario de eventos, montajes y necesidades."
            primaryValue="Calendario de grupos"
            secondaryValue="Integracion con mantenimiento"
            onClick={() => navigate('/beos')}
            footerChip="Vista diaria y mensual"
          />
        </div>
      </section>

      <footer className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-4 border-t border-stone-200">
        <FooterStat label="Elementos acuaticos" value={stats.waterElements} color="text-cyan-700" />
        <FooterStat label="Requisiciones abiertas" value={stats.requisitionsOpen} color="text-emerald-700" />
        <FooterStat label="OTs abiertas" value={stats.workingOrdersOpen} color="text-orange-700" />
        <FooterStat label="Tareas activas" value={stats.notesActive} color="text-blue-700" />
        <FooterStat label="Estaciones plagas" value={stats.fumigationActive} color="text-rose-700" />
        <FooterStat label="Lecturas energia" value={stats.energyReadings} color="text-amber-700" />
      </footer>
    </div>
  );
}

function FooterStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200/80 p-3">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
