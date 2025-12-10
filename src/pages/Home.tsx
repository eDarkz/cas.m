import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { energyApi } from '../lib/energyApi';
import { workingOrdersAPI } from '../lib/workingOrders';
import { inspectionsApi } from '../lib/inspections-api';

import {
  Droplets,
  ClipboardCheck,
  Package,
  AlertCircle,
  CheckCircle2,
  LayoutDashboard,
  FileSpreadsheet,
  Calendar,
  Activity,
  ArrowRight,
  Zap,
  Target,
  Wrench,
} from 'lucide-react';

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
}

export default function Home() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats>({
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
  });

  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

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
        ] = await Promise.all([
          api
            .getRequisitionsSummary()
            .catch(() => ({
              requisitions: {
                total_requisitions: 0,
                open_requisitions: 0,
                closed_requisitions: 0,
              },
              items: { pending_items: 0 },
            })),
          api
            .getAquaticElements({ archived: 0, withLast: 1 })
            .catch(() => ({ data: [], total: 0 })),
          api.getSabanas({ archived: 0, fields: 'summary' }).catch(() => []),
          api.getNotes().catch(() => []),
          workingOrdersAPI
            .list()
            .catch(() => ({
              data: [],
              summary: {
                total: 0,
                open: 0,
                assigned: 0,
                in_progress: 0,
                resolved: 0,
                dismissed: 0,
              },
            })),
          energyApi.getEnergeticos().catch(() => []),
          inspectionsApi.getCycles().catch(() => []),
          energyApi.getPrecioEnergia(year, month).catch(() => null),
        ]);

        const now = new Date();

        const waterAlertsCount = (elementsRes.data || []).filter((e: any) => {
          if (!e.last?.sampled_at) return true;
          const daysSince =
            (now.getTime() - new Date(e.last.sampled_at).getTime()) /
            (1000 * 60 * 60 * 24);
          return daysSince > 7;
        }).length;

        const waterElementsTotal = elementsRes.total || 0;
        const waterAlertsPct =
          waterElementsTotal > 0
            ? (waterAlertsCount / waterElementsTotal) * 100
            : 0;

        const workingOrdersOpen =
          workingOrdersRes.summary?.open ??
          workingOrdersRes.data.filter(
            (wo: any) =>
              wo.status === 'OPEN' ||
              wo.status === 'ASSIGNED' ||
              wo.status === 'IN_PROGRESS',
          ).length;

        const workingOrdersTotal =
          workingOrdersRes.summary?.total ??
          workingOrdersRes.data.length ??
          0;

        const energyReadingsThisMonth = Array.isArray(energyRes)
          ? energyRes.filter((reading: any) => {
              if (!reading.fecha) return false;
              const d = new Date(reading.fecha);
              return (
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
              );
            }).length
          : 0;

        let energyMonthCost = 0;
        if (energiaPrecio && typeof energiaPrecio === 'object') {
          const possibleFields = [
            'costo_estimado',
            'costoTotal',
            'costo_total',
            'total',
          ];
          for (const key of possibleFields) {
            if (
              Object.prototype.hasOwnProperty.call(energiaPrecio, key) &&
              typeof (energiaPrecio as any)[key] === 'number'
            ) {
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
          notesActive: notesRes.filter(
            (n: any) => n.estado === 0 || n.estado === 1,
          ).length,

          workingOrdersOpen,
          workingOrdersTotal,

          energyReadings: energyReadingsThisMonth,
          energyMonthCost,
        };

        if (isMounted) {
          setStats(nextStats);
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const formattedDate = useMemo(
    () =>
      now.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    [now],
  );

  const systemPressureLabel = useMemo(() => {
    const openWO = stats.workingOrdersOpen;
    const pendingReq = stats.requisitionsPendingItems;
    const waterAlerts = stats.waterAlertsCount;
    const score = openWO * 1.4 + pendingReq * 0.8 + waterAlerts * 1.2;

    if (score === 0) return 'Sistema en calma';
    if (score < 15) return 'Carga ligera';
    if (score < 40) return 'Carga moderada';
    if (score < 80) return 'Alta demanda';
    return 'Modo incendio';
  }, [
    stats.workingOrdersOpen,
    stats.requisitionsPendingItems,
    stats.waterAlertsCount,
  ]);

  const systemPressureTone = useMemo(() => {
    const openWO = stats.workingOrdersOpen;
    const pendingReq = stats.requisitionsPendingItems;
    const waterAlerts = stats.waterAlertsCount;
    const score = openWO * 1.4 + pendingReq * 0.8 + waterAlerts * 1.2;

    if (score === 0) return 'ok';
    if (score < 15) return 'low';
    if (score < 40) return 'medium';
    if (score < 80) return 'high';
    return 'critical';
  }, [
    stats.workingOrdersOpen,
    stats.requisitionsPendingItems,
    stats.waterAlertsCount,
  ]);

  if (loading) {
    return (
      <div className="hotel-home hotel-home--loading">
        <div className="hotel-home__loading-orbit">
          <div className="hotel-home__loading-core" />
        </div>
        <div className="hotel-home__loading-text">
          Preparando el panel de ingeniería…
        </div>
      </div>
    );
  }

  return (
    <div className="hotel-home">
      <div className="hotel-home__background">
        <div className="hotel-home__background-gradient" />
        <div className="hotel-home__background-grid" />
      </div>

      <main className="hotel-home__content">
        <header className="hotel-home__header">
          <div className="hotel-home__header-main">
            <div className="hotel-home__tagline">
              Secrets Puerto Los Cabos · Ingeniería
            </div>
            <h1 className="hotel-home__title">Centro de Control Operativo</h1>
            <p className="hotel-home__subtitle">
              Visión ejecutiva en un solo tablero: agua, energía, inspecciones,
              requisiciones y órdenes de trabajo.
            </p>
          </div>

          <div className="hotel-home__header-side">
            <div className="hotel-home__header-date">
              <Activity className="hotel-home__header-date-icon" />
              <div>
                <div className="hotel-home__header-date-label">
                  {formattedDate}
                </div>
                <div className="hotel-home__header-date-time">
                  Actualizado en tiempo casi real
                </div>
              </div>
            </div>

            <div
              className={`hotel-home__pressure-chip hotel-home__pressure-chip--${systemPressureTone}`}
            >
              <span className="hotel-home__pressure-badge">
                <span className="hotel-home__pressure-dot" />
                Estado general
              </span>
              <span className="hotel-home__pressure-label">
                {systemPressureLabel}
              </span>
            </div>
          </div>
        </header>

        <section className="hotel-home__kpi-strip">
          <KpiCard
            icon={<Droplets />}
            label="Elementos acuáticos"
            value={stats.waterElements}
            detail={
              stats.waterAlertsCount > 0
                ? `${stats.waterAlertsCount} en rojo / ${
                    stats.waterElements || 0
                  } totales`
                : 'Todos con muestreo reciente'
            }
            variant="cyan"
          />

          <KpiCard
            icon={<ClipboardCheck />}
            label={
              stats.inspectionCycleName
                ? `Inspecciones · ${stats.inspectionCycleName}`
                : 'Inspecciones'
            }
            value={`${Math.round(stats.inspectionAvance)}%`}
            detail={
              stats.inspectionRoomsTotal > 0
                ? `${stats.inspectionRoomsTotal} habitaciones · ${
                    stats.inspectionConDetalles
                  } con fallas`
                : 'Aún sin ciclo activo'
            }
            variant="violet"
          />

          <KpiCard
            icon={<Package />}
            label="Requisiciones abiertas"
            value={stats.requisitionsOpen}
            detail={`${stats.requisitionsPendingItems} ítems pendientes`}
            variant="green"
          />

          <KpiCard
            icon={<Wrench />}
            label="Órdenes de trabajo"
            value={stats.workingOrdersOpen}
            detail={`${stats.workingOrdersTotal} en el ciclo actual`}
            variant="orange"
          />

          <KpiCard
            icon={<Zap />}
            label="Energía · lecturas mes"
            value={stats.energyReadings}
            detail={
              stats.energyMonthCost > 0
                ? new Intl.NumberFormat('es-MX', {
                    style: 'currency',
                    currency: 'MXN',
                    maximumFractionDigits: 0,
                  }).format(stats.energyMonthCost)
                : 'Costo estimado pendiente'
            }
            variant="gold"
          />
        </section>

        {(stats.waterAlertsCount > 0 ||
          stats.requisitionsPendingItems > 0 ||
          stats.inspectionConDetalles > 0) && (
          <section className="hotel-home__alerts">
            <div className="hotel-home__alerts-header">
              <div className="hotel-home__alerts-title">
                <AlertCircle className="hotel-home__alerts-icon" />
                <div>
                  <h2>Frente inmediato de trabajo</h2>
                  <p>
                    Priorizamos las áreas que pueden impactar más la experiencia
                    del huésped.
                  </p>
                </div>
              </div>
            </div>

            <div className="hotel-home__alerts-grid">
              {stats.waterAlertsCount > 0 && (
                <AlertCard
                  tone="red"
                  title="Análisis de agua atrasados"
                  count={stats.waterAlertsCount}
                  description="Elementos sin muestreo en los últimos 7 días."
                  subtitle={`${Math.round(
                    stats.waterAlertsPct,
                  )}% de tu parque acuático requiere atención.`}
                  icon={<Droplets />}
                  onClick={() => navigate('/water-chemistry')}
                />
              )}

              {stats.requisitionsPendingItems > 0 && (
                <AlertCard
                  tone="amber"
                  title="Items de requisición pendientes"
                  count={stats.requisitionsPendingItems}
                  description="Material solicitado aún no surtido."
                  subtitle={`${
                    stats.requisitionsOpen
                  } requisiciones abiertas en seguimiento.`}
                  icon={<Package />}
                  onClick={() => navigate('/requisiciones')}
                />
              )}

              {stats.inspectionConDetalles > 0 && (
                <AlertCard
                  tone="violet"
                  title="Habitaciones con fallas"
                  count={stats.inspectionConDetalles}
                  description="Detectadas en el ciclo de inspección actual."
                  subtitle={
                    stats.inspectionCycleName
                      ? `Ciclo: ${stats.inspectionCycleName}`
                      : undefined
                  }
                  icon={<ClipboardCheck />}
                  onClick={() => navigate('/inspecciones')}
                />
              )}
            </div>
          </section>
        )}

        <section className="hotel-home__modules">
          <div className="hotel-home__modules-header">
            <div>
              <h2>Módulos del sistema</h2>
              <p>
                Navega directo a cada flujo. Todo está conectado al mismo
                ecosistema de datos.
              </p>
            </div>
          </div>

          <div className="hotel-home__modules-grid">
            <ModuleCard
              accent="cyan"
              icon={<Droplets />}
              title="Química del Agua"
              description="Control detallado de piscinas, jacuzzis, spas y fuentes."
              primaryValue={`${stats.waterElements} elementos`}
              secondaryValue={
                stats.waterAlertsCount > 0
                  ? `${stats.waterAlertsCount} en alerta`
                  : 'Todos en rango de muestreo'
              }
              onClick={() => navigate('/water-chemistry')}
              footerChip="Reportes ejecutivos y tendencias"
            />

            <ModuleCard
              accent="violet"
              icon={<ClipboardCheck />}
              title="Inspecciones de habitaciones"
              description="Ciclos mensuales, evidencias fotográficas y análisis de patrones."
              primaryValue={`${Math.round(stats.inspectionAvance)}% avance`}
              secondaryValue={
                stats.inspectionRoomsTotal > 0
                  ? `${stats.inspectionRoomsTotal} habitaciones · ${stats.inspectionConDetalles} con fallas`
                  : 'Configura tu primer ciclo'
              }
              onClick={() => navigate('/inspecciones')}
              footerChip="Word cloud de problemas recurrentes"
            />

            <ModuleCard
              accent="green"
              icon={<Package />}
              title="Requisiciones"
              description="Flujo completo desde el supervisor hasta compras y almacén."
              primaryValue={`${stats.requisitionsOpen} abiertas`}
              secondaryValue={`${stats.requisitionsPendingItems} ítems pendientes`}
              onClick={() => navigate('/requisiciones')}
              footerChip="Reportes de antigüedad y estatus"
            />

            <ModuleCard
              accent="orange"
              icon={<Wrench />}
              title="Órdenes de Trabajo"
              description="Asignación por categoría, tiempos de respuesta y trazabilidad."
              primaryValue={`${stats.workingOrdersOpen} abiertas`}
              secondaryValue={`${stats.workingOrdersTotal} en el periodo actual`}
              onClick={() => navigate('/ordenes-trabajo')}
              footerChip="KPIs de SLA y desempeño"
            />

            <ModuleCard
              accent="amber"
              icon={<FileSpreadsheet />}
              title="Sábanas"
              description="Control de ocupación diaria, pick-up y proyecciones de habitaciones."
              primaryValue={`${stats.sabanasActive} activos`}
              secondaryValue="Integración con Working Orders y energía"
              onClick={() => navigate('/sabanas')}
              footerChip="Histórico exportable"
            />

            <ModuleCard
              accent="blue"
              icon={<LayoutDashboard />}
              title="Tablero de tareas"
              description="Kanban para supervisores, priorización y seguimiento visual."
              primaryValue={`${stats.notesActive} tareas activas`}
              secondaryValue="Organiza por responsable y categoría"
              onClick={() => navigate('/dashboard')}
              footerChip="Vista concentrada por supervisor"
            />

            <ModuleCard
              accent="rose"
              icon={<Calendar />}
              title="Banquet Events (BEOs)"
              description="Calendario visual de eventos, montajes y necesidades especiales."
              primaryValue="Calendario de grupos"
              secondaryValue="Integración con mantenimiento y A&B"
              onClick={() => navigate('/beos')}
              footerChip="Vista diaria, semanal y mensual"
            />

            <ModuleCard
              accent="gold"
              icon={<Zap />}
              title="Energía"
              description="Consumos de agua, gas y electricidad con proyección de costos."
              primaryValue={`${stats.energyReadings} lecturas este mes`}
              secondaryValue={
                stats.energyMonthCost > 0
                  ? new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                      maximumFractionDigits: 0,
                    }).format(stats.energyMonthCost)
                  : 'Configura tus precios de energía'
              }
              onClick={() => navigate('/energy')}
              footerChip="Alertas por desviaciones contra presupuesto"
            />
          </div>
        </section>

        <section className="hotel-home__footer-summary">
          <div className="hotel-home__footer-block">
            <h3>Estado general de operación</h3>
            <div className="hotel-home__footer-grid">
              <FooterStat
                label="Elementos acuáticos"
                value={stats.waterElements}
                tone="cyan"
              />
              <FooterStat
                label="Requisiciones abiertas"
                value={stats.requisitionsOpen}
                tone="green"
              />
              <FooterStat
                label="OT abiertas"
                value={stats.workingOrdersOpen}
                tone="orange"
              />
              <FooterStat
                label="Tareas activas"
                value={stats.notesActive}
                tone="indigo"
              />
            </div>
          </div>

          <div className="hotel-home__footer-note">
            <Target className="hotel-home__footer-note-icon" />
            <div>
              <div className="hotel-home__footer-note-title">
                Diseño para operación real
              </div>
              <div className="hotel-home__footer-note-text">
                Este tablero está pensado para que un Director de Ingeniería
                pueda, de un vistazo, decidir en qué frente poner primero a su
                equipo: agua, habitaciones, compras o energía.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ==== Componentes auxiliares ==== */

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail?: string;
  variant: 'cyan' | 'violet' | 'green' | 'orange' | 'gold';
}

function KpiCard({ icon, label, value, detail, variant }: KpiCardProps) {
  return (
    <article className={`hotel-kpi hotel-kpi--${variant}`}>
      <div className="hotel-kpi__icon">{icon}</div>
      <div className="hotel-kpi__content">
        <div className="hotel-kpi__label">{label}</div>
        <div className="hotel-kpi__value">{value}</div>
        {detail && <div className="hotel-kpi__detail">{detail}</div>}
      </div>
    </article>
  );
}

interface AlertCardProps {
  tone: 'red' | 'amber' | 'violet';
  title: string;
  count: number;
  description: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function AlertCard({
  tone,
  title,
  count,
  description,
  subtitle,
  icon,
  onClick,
}: AlertCardProps) {
  return (
    <button
      className={`hotel-alert hotel-alert--${tone}`}
      type="button"
      onClick={onClick}
    >
      <div className="hotel-alert__header">
        <div className="hotel-alert__icon">{icon}</div>
        <div className="hotel-alert__count">{count}</div>
      </div>
      <div className="hotel-alert__title">{title}</div>
      <div className="hotel-alert__description">{description}</div>
      {subtitle && <div className="hotel-alert__subtitle">{subtitle}</div>}
      <div className="hotel-alert__cta">
        <span>Ir al módulo</span>
        <ArrowRight className="hotel-alert__cta-icon" />
      </div>
    </button>
  );
}

interface ModuleCardProps {
  accent:
    | 'cyan'
    | 'violet'
    | 'green'
    | 'orange'
    | 'amber'
    | 'blue'
    | 'rose'
    | 'gold';
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryValue: string;
  secondaryValue: string;
  footerChip?: string;
  onClick: () => void;
}

function ModuleCard({
  accent,
  icon,
  title,
  description,
  primaryValue,
  secondaryValue,
  footerChip,
  onClick,
}: ModuleCardProps) {
  return (
    <button
      type="button"
      className={`hotel-module hotel-module--${accent}`}
      onClick={onClick}
    >
      <div className="hotel-module__click-layer" />
      <div className="hotel-module__header">
        <div className="hotel-module__icon-wrap">{icon}</div>
        <div className="hotel-module__header-text">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className="hotel-module__body">
        <div className="hotel-module__primary">{primaryValue}</div>
        <div className="hotel-module__secondary">{secondaryValue}</div>
      </div>

      <div className="hotel-module__footer">
        <div className="hotel-module__footer-left">
          <CheckCircle2 className="hotel-module__check-icon" />
          <span>{footerChip}</span>
        </div>
        <div className="hotel-module__footer-right">
          <span>Entrar</span>
          <ArrowRight className="hotel-module__footer-arrow" />
        </div>
      </div>
    </button>
  );
}

interface FooterStatProps {
  label: string;
  value: number | string;
  tone: 'cyan' | 'green' | 'orange' | 'indigo';
}

function FooterStat({ label, value, tone }: FooterStatProps) {
  return (
    <div className={`hotel-footer-stat hotel-footer-stat--${tone}`}>
      <div className="hotel-footer-stat__value">{value}</div>
      <div className="hotel-footer-stat__label">{label}</div>
    </div>
  );
}
