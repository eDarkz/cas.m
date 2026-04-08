import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Home,
  Users,
  RefreshCw,
  AlertTriangle,
  Target,
  Activity,
  Calendar,
  ArrowLeft,
  Zap,
  Award,
  FileSpreadsheet,
} from 'lucide-react';
import { api, Sabana, SabanaSummary } from '../lib/api';
import HamsterLoader from '../components/HamsterLoader';

interface SabanaWithSummary extends Sabana {
  summary?: SabanaSummary;
  daysActive: number;
  velocity: number;
  etaDays: number | null;
  etaDate: Date | null;
  isStalled: boolean;
}

interface ResponsibleStats {
  nombre: string;
  responsibleId: number;
  totalSabanas: number;
  completedSabanas: number;
  avgCompletion: number;
  totalRoomsCompleted: number;
  totalRoomsAssigned: number;
}

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.ceil(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  delta,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'sky' | 'emerald' | 'amber' | 'rose' | 'stone' | 'teal';
  delta?: { value: number; label: string };
}) {
  const styles = {
    sky: { bg: 'bg-sky-50', border: 'border-sky-200', icon: 'text-sky-600', val: 'text-sky-700' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', val: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', val: 'text-amber-700' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-600', val: 'text-rose-700' },
    stone: { bg: 'bg-stone-50', border: 'border-stone-200', icon: 'text-stone-600', val: 'text-stone-700' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-teal-600', val: 'text-teal-700' },
  };
  const s = styles[color];
  return (
    <div className={`${s.bg} border ${s.border} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-5 h-5 ${s.icon}`} />
        {delta && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
            delta.value >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {delta.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {delta.value >= 0 ? '+' : ''}{delta.value}{delta.label}
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${s.val}`}>{value}</div>
      <div className="text-sm font-medium text-stone-700 mt-0.5">{title}</div>
      {subtitle && <div className="text-xs text-stone-500 mt-1">{subtitle}</div>}
    </div>
  );
}

function ProgressRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7e5e4" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-stone-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function SabanasExecutiveReport() {
  const [loading, setLoading] = useState(true);
  const [allActive, setAllActive] = useState<Sabana[]>([]);
  const [allCompleted, setAllCompleted] = useState<Sabana[]>([]);
  const [allArchived, setAllArchived] = useState<Sabana[]>([]);
  const [summaries, setSummaries] = useState<Record<string, SabanaSummary>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'activas' | 'completadas' | 'responsables'>('overview');

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeData, archivedData] = await Promise.all([
        api.getSabanas({ archived: 0, fields: 'basic' }),
        api.getSabanas({ archived: 1, fields: 'basic' }),
      ]);

      const active = activeData.filter((s) => (s.avance_pct ?? 0) < 100);
      const completed = activeData.filter((s) => (s.avance_pct ?? 0) >= 100);

      setAllActive(active);
      setAllCompleted(completed);
      setAllArchived(archivedData);

      const summaryMap: Record<string, SabanaSummary> = {};
      await Promise.allSettled(
        active.map(async (s) => {
          try {
            const sum = await api.getSabanaSummary(s.id);
            summaryMap[s.id] = sum;
          } catch { }
        })
      );
      setSummaries(summaryMap);
    } catch (err) {
      console.error('Error loading executive sabana data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const enrichedActive = useMemo<SabanaWithSummary[]>(() => {
    const now = new Date();
    return allActive.map((s) => {
      const summary = summaries[s.id];
      const created = new Date(s.created_at);
      const daysActive = daysBetween(created, now);
      const completed = summary?.terminadas ?? s.rooms_completed ?? 0;
      const total = summary?.total ?? s.rooms_total ?? 0;
      const pending = total - completed;
      const velocity = daysActive > 0 ? completed / daysActive : 0;
      const etaDays = velocity > 0 && pending > 0 ? Math.ceil(pending / velocity) : null;
      const etaDate = etaDays !== null ? new Date(now.getTime() + etaDays * 86400000) : null;
      const isStalled = daysActive > 3 && velocity < 1 && (summary?.avance_pct ?? s.avance_pct ?? 0) < 95;
      return { ...s, summary, daysActive, velocity, etaDays, etaDate, isStalled };
    });
  }, [allActive, summaries]);

  const globalKpis = useMemo(() => {
    const totalActive = allActive.length;
    const totalCompleted = allCompleted.length + allArchived.filter(s => (s.avance_pct ?? 0) >= 100).length;
    const totalArchived = allArchived.length;

    const totalRoomsActive = enrichedActive.reduce((acc, s) => acc + (s.summary?.total ?? s.rooms_total ?? 0), 0);
    const totalRoomsCompleted = enrichedActive.reduce((acc, s) => acc + (s.summary?.terminadas ?? s.rooms_completed ?? 0), 0);
    const totalRoomsPendiente = enrichedActive.reduce((acc, s) => acc + (s.summary?.pendientes ?? 0), 0);
    const totalRoomsEnProceso = enrichedActive.reduce((acc, s) => acc + (s.summary?.en_proceso ?? 0), 0);

    const avgCompletion = enrichedActive.length > 0
      ? enrichedActive.reduce((acc, s) => acc + (s.summary?.avance_pct ?? s.avance_pct ?? 0), 0) / enrichedActive.length
      : 0;

    const stalledCount = enrichedActive.filter(s => s.isStalled).length;

    const avgVelocity = enrichedActive.filter(s => s.velocity > 0).length > 0
      ? enrichedActive.filter(s => s.velocity > 0).reduce((acc, s) => acc + s.velocity, 0) / enrichedActive.filter(s => s.velocity > 0).length
      : 0;

    return {
      totalActive,
      totalCompleted,
      totalArchived,
      totalRoomsActive,
      totalRoomsCompleted,
      totalRoomsPendiente,
      totalRoomsEnProceso,
      avgCompletion,
      stalledCount,
      avgVelocity,
    };
  }, [enrichedActive, allActive, allCompleted, allArchived]);

  const responsibleStats = useMemo<ResponsibleStats[]>(() => {
    const map = new Map<number, ResponsibleStats>();
    const allSabanas = [...allActive, ...allCompleted, ...allArchived];

    allSabanas.forEach((s) => {
      const id = s.responsible_id ?? 0;
      const nombre = s.responsible_nombre ?? 'Sin asignar';
      const existing = map.get(id);
      const pct = s.avance_pct ?? 0;
      const completed_r = s.rooms_completed ?? 0;
      const total_r = s.rooms_total ?? 0;
      if (existing) {
        existing.totalSabanas++;
        existing.avgCompletion = (existing.avgCompletion * (existing.totalSabanas - 1) + pct) / existing.totalSabanas;
        if (pct >= 100) existing.completedSabanas++;
        existing.totalRoomsCompleted += completed_r;
        existing.totalRoomsAssigned += total_r;
      } else {
        map.set(id, {
          nombre,
          responsibleId: id,
          totalSabanas: 1,
          completedSabanas: pct >= 100 ? 1 : 0,
          avgCompletion: pct,
          totalRoomsCompleted: completed_r,
          totalRoomsAssigned: total_r,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalRoomsCompleted - a.totalRoomsCompleted);
  }, [allActive, allCompleted, allArchived]);

  const statusDistribution = useMemo(() => {
    const total = globalKpis.totalRoomsActive;
    const terminadas = globalKpis.totalRoomsCompleted;
    const en_proceso = globalKpis.totalRoomsEnProceso;
    const pendientes = globalKpis.totalRoomsPendiente;
    return [
      { label: 'Terminadas', count: terminadas, pct: total > 0 ? Math.round((terminadas / total) * 100) : 0, color: 'bg-emerald-500', dot: 'bg-emerald-500' },
      { label: 'En Proceso', count: en_proceso, pct: total > 0 ? Math.round((en_proceso / total) * 100) : 0, color: 'bg-amber-500', dot: 'bg-amber-500' },
      { label: 'Pendientes', count: pendientes, pct: total > 0 ? Math.round((pendientes / total) * 100) : 0, color: 'bg-stone-300', dot: 'bg-stone-400' },
    ];
  }, [globalKpis]);

  const completedSabanasList = useMemo(() => {
    return [...allCompleted].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);
  }, [allCompleted]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <HamsterLoader />
          <p className="text-stone-500 text-sm mt-2">Cargando reporte ejecutivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/sabanas" className="p-2 rounded-lg hover:bg-stone-200 transition-colors">
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </Link>
            <div className="w-11 h-11 bg-sky-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-sky-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Reporte Ejecutivo - Sabanas</h1>
              <p className="text-stone-500 text-sm">Vision general de progreso y productividad</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>

        <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1 w-fit">
          {([
            { key: 'overview', label: 'General' },
            { key: 'activas', label: `Activas (${globalKpis.totalActive})` },
            { key: 'completadas', label: `Completadas (${globalKpis.totalCompleted})` },
            { key: 'responsables', label: 'Responsables' },
          ] as { key: typeof activeTab; label: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-sky-700 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiCard title="Sabanas activas" value={globalKpis.totalActive} icon={FileSpreadsheet} color="sky" subtitle="en progreso" />
              <KpiCard title="Completadas" value={globalKpis.totalCompleted} icon={CheckCircle2} color="emerald" subtitle="100% avance" />
              <KpiCard title="Archivadas" value={globalKpis.totalArchived} icon={Activity} color="stone" />
              <KpiCard title="Habitaciones activas" value={globalKpis.totalRoomsActive.toLocaleString()} icon={Home} color="teal" subtitle="en sabanas activas" />
              <KpiCard title="Terminadas" value={globalKpis.totalRoomsCompleted.toLocaleString()} icon={CheckCircle2} color="emerald" subtitle={`${Math.round(globalKpis.avgCompletion)}% promedio`} />
              <KpiCard
                title="Sabanas estancadas"
                value={globalKpis.stalledCount}
                icon={AlertTriangle}
                color={globalKpis.stalledCount > 0 ? 'rose' : 'emerald'}
                subtitle="menos de 1 hab/dia"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white rounded-xl border border-stone-200 p-5">
                <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-700" />
                  Distribucion de habitaciones activas
                </h3>
                <div className="space-y-4">
                  {statusDistribution.map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-sm text-stone-700">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`}></span>
                          {item.label}
                        </span>
                        <span className="text-sm font-semibold text-stone-700">{item.count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                      </div>
                      <div className="text-xs text-stone-400 text-right mt-0.5">{item.pct}%</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <div className="text-xs text-stone-500">Total en sabanas activas</div>
                  <div className="text-xl font-bold text-stone-800">{globalKpis.totalRoomsActive.toLocaleString()} hab.</div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5">
                <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-sky-700" />
                  KPIs de productividad
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                    <div className="text-xs text-sky-600 font-medium uppercase mb-1">Velocidad promedio</div>
                    <div className="text-3xl font-bold text-sky-700">{globalKpis.avgVelocity.toFixed(1)}</div>
                    <div className="text-xs text-stone-500 mt-1">habitaciones / dia</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="text-xs text-emerald-600 font-medium uppercase mb-1">Completacion promedio</div>
                    <div className="text-3xl font-bold text-emerald-700">{Math.round(globalKpis.avgCompletion)}%</div>
                    <div className="text-xs text-stone-500 mt-1">por sabana activa</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="text-xs text-amber-600 font-medium uppercase mb-1">En proceso</div>
                    <div className="text-3xl font-bold text-amber-700">{globalKpis.totalRoomsEnProceso.toLocaleString()}</div>
                    <div className="text-xs text-stone-500 mt-1">habitaciones en trabajo</div>
                  </div>
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                    <div className="text-xs text-stone-600 font-medium uppercase mb-1">Pendientes totales</div>
                    <div className="text-3xl font-bold text-stone-700">{globalKpis.totalRoomsPendiente.toLocaleString()}</div>
                    <div className="text-xs text-stone-500 mt-1">por iniciar</div>
                  </div>
                </div>

                {globalKpis.stalledCount > 0 && (
                  <div className="bg-rose-50 border border-rose-300 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span className="font-semibold text-rose-800 text-sm">Sabanas con bajo rendimiento</span>
                    </div>
                    <div className="space-y-1">
                      {enrichedActive.filter(s => s.isStalled).map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-sm bg-white/60 rounded-lg px-3 py-1.5">
                          <span className="font-medium text-stone-800">{s.titulo}</span>
                          <span className="text-rose-600 text-xs">{s.velocity.toFixed(2)} hab/dia</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-700" />
                Progreso de sabanas activas
              </h3>
              {enrichedActive.length === 0 ? (
                <p className="text-stone-500 text-sm text-center py-8">No hay sabanas activas</p>
              ) : (
                <div className="space-y-4">
                  {enrichedActive
                    .sort((a, b) => (b.summary?.avance_pct ?? b.avance_pct ?? 0) - (a.summary?.avance_pct ?? a.avance_pct ?? 0))
                    .map((s) => {
                      const pct = s.summary?.avance_pct ?? s.avance_pct ?? 0;
                      const total = s.summary?.total ?? s.rooms_total ?? 0;
                      const done = s.summary?.terminadas ?? s.rooms_completed ?? 0;
                      const inProc = s.summary?.en_proceso ?? 0;
                      const pend = s.summary?.pendientes ?? (total - done);
                      return (
                        <div key={s.id} className={`border rounded-xl p-4 ${s.isStalled ? 'border-rose-300 bg-rose-50' : 'border-stone-200'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <ProgressRing pct={pct} size={52} />
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-stone-700">
                                  {pct}%
                                </span>
                              </div>
                              <div>
                                <div className="font-semibold text-stone-900">{s.titulo}</div>
                                <div className="text-xs text-stone-500 flex items-center gap-3 mt-0.5">
                                  {s.responsible_nombre && (
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {s.responsible_nombre}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(s.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  <span>{s.daysActive} dias activa</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm shrink-0">
                              <div className="text-center">
                                <div className="font-bold text-emerald-700">{done.toLocaleString()}</div>
                                <div className="text-xs text-stone-500">Terminadas</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-amber-600">{inProc.toLocaleString()}</div>
                                <div className="text-xs text-stone-500">En proceso</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-stone-500">{pend.toLocaleString()}</div>
                                <div className="text-xs text-stone-500">Pendientes</div>
                              </div>
                              {s.velocity > 0 && (
                                <div className="text-center">
                                  <div className="font-bold text-sky-700">{s.velocity.toFixed(1)}</div>
                                  <div className="text-xs text-stone-500">hab/dia</div>
                                </div>
                              )}
                              {s.etaDate && (
                                <div className="text-center">
                                  <div className={`font-bold text-xs ${s.etaDays && s.etaDays > 30 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                    {s.etaDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                  </div>
                                  <div className="text-xs text-stone-500">ETA</div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="h-2 bg-stone-200 rounded-full overflow-hidden flex">
                            {total > 0 && (
                              <>
                                <div className="h-full bg-emerald-500" style={{ width: `${Math.round((done / total) * 100)}%` }} />
                                <div className="h-full bg-amber-400" style={{ width: `${Math.round((inProc / total) * 100)}%` }} />
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activas' && (
          <div className="space-y-4">
            {enrichedActive.length === 0 ? (
              <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
                <FileSpreadsheet className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500">No hay sabanas activas</p>
              </div>
            ) : (
              enrichedActive
                .sort((a, b) => (b.summary?.avance_pct ?? b.avance_pct ?? 0) - (a.summary?.avance_pct ?? a.avance_pct ?? 0))
                .map((s) => {
                  const pct = s.summary?.avance_pct ?? s.avance_pct ?? 0;
                  const total = s.summary?.total ?? s.rooms_total ?? 0;
                  const done = s.summary?.terminadas ?? s.rooms_completed ?? 0;
                  const inProc = s.summary?.en_proceso ?? 0;
                  const pend = s.summary?.pendientes ?? (total - done);
                  const doneBarPct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const inProcBarPct = total > 0 ? Math.round((inProc / total) * 100) : 0;

                  return (
                    <div key={s.id} className={`bg-white rounded-xl border ${s.isStalled ? 'border-rose-300' : 'border-stone-200'} p-5`}>
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="relative shrink-0">
                            <ProgressRing pct={pct} size={64} />
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-stone-700">
                              {pct}%
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 flex-wrap">
                              <h3 className="font-bold text-stone-900">{s.titulo}</h3>
                              {s.isStalled && (
                                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">Estancada</span>
                              )}
                              {pct >= 90 && !s.isStalled && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Casi lista</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-stone-500">
                              {s.responsible_nombre && <span><Users className="w-3 h-3 inline mr-1" />{s.responsible_nombre}</span>}
                              {s.date && <span><Calendar className="w-3 h-3 inline mr-1" />{new Date(s.date).toLocaleDateString('es-MX')}</span>}
                              <span>Creada: {new Date(s.created_at).toLocaleDateString('es-MX')}</span>
                              <span>{s.daysActive} dias activa</span>
                            </div>
                            <div className="mt-2 h-2.5 bg-stone-100 rounded-full overflow-hidden flex">
                              <div className="h-full bg-emerald-500" style={{ width: `${doneBarPct}%` }} />
                              <div className="h-full bg-amber-400" style={{ width: `${inProcBarPct}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 lg:grid-cols-4 gap-3 shrink-0">
                          {[
                            { label: 'Total', val: total, color: 'text-stone-700' },
                            { label: 'Terminadas', val: done, color: 'text-emerald-700' },
                            { label: 'En proceso', val: inProc, color: 'text-amber-600' },
                            { label: 'Pendientes', val: pend, color: 'text-stone-500' },
                          ].map((item) => (
                            <div key={item.label} className="text-center">
                              <div className={`text-xl font-bold ${item.color}`}>{item.val.toLocaleString()}</div>
                              <div className="text-xs text-stone-500">{item.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="bg-sky-50 rounded-lg p-3 text-center">
                          <div className="font-bold text-sky-700">{s.velocity.toFixed(2)}</div>
                          <div className="text-xs text-stone-500">hab / dia</div>
                        </div>
                        <div className={`rounded-lg p-3 text-center ${s.etaDays && s.etaDays > 30 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                          <div className={`font-bold ${s.etaDays && s.etaDays > 30 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {s.etaDays !== null ? `${s.etaDays} dias` : 'N/A'}
                          </div>
                          <div className="text-xs text-stone-500">ETA restante</div>
                        </div>
                        <div className={`rounded-lg p-3 text-center ${s.etaDays && s.etaDays > 30 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                          <div className={`font-bold text-xs ${s.etaDays && s.etaDays > 30 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {s.etaDate
                              ? s.etaDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'N/A'}
                          </div>
                          <div className="text-xs text-stone-500">Fecha estimada</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 text-center">
                          <div className="font-bold text-amber-700">
                            {total > 0 ? Math.round(((done) / total) * 500).toLocaleString() : 0}
                          </div>
                          <div className="text-xs text-stone-500">de 500 completadas</div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {activeTab === 'completadas' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="text-3xl font-bold text-emerald-700">{globalKpis.totalCompleted}</div>
                <div className="text-sm text-stone-700 mt-1">Sabanas completadas totales</div>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                <div className="text-3xl font-bold text-sky-700">
                  {completedSabanasList.length > 0
                    ? Math.round(completedSabanasList.reduce((acc, s) => acc + daysBetween(new Date(s.created_at), new Date()), 0) / completedSabanasList.length)
                    : 0}
                </div>
                <div className="text-sm text-stone-700 mt-1">Promedio de dias activa</div>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                <div className="text-3xl font-bold text-stone-700">
                  {completedSabanasList.reduce((acc, s) => acc + (s.rooms_completed ?? 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-stone-700 mt-1">Habitaciones completadas en total</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="p-4 border-b border-stone-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-stone-900">Historial de sabanas completadas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50">
                    <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                      <th className="px-4 py-3 font-medium">Sabana</th>
                      <th className="px-4 py-3 font-medium">Responsable</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Creada</th>
                      <th className="px-4 py-3 font-medium text-right">Habitaciones</th>
                      <th className="px-4 py-3 font-medium text-right">Avance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedSabanasList.map((s) => (
                      <tr key={s.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-stone-800">{s.titulo}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-600">{s.responsible_nombre || '—'}</td>
                        <td className="px-4 py-3 text-sm text-stone-600">
                          {s.date ? new Date(s.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-500">
                          {new Date(s.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-700">{(s.rooms_completed ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.avance_pct ?? 0}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-emerald-700 w-8 text-right">{s.avance_pct ?? 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {completedSabanasList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-stone-400 text-sm">
                          No hay sabanas completadas aun
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'responsables' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="p-4 border-b border-stone-100 flex items-center gap-2">
                <Award className="w-5 h-5 text-sky-600" />
                <h3 className="font-semibold text-stone-900">Ranking de responsables</h3>
              </div>
              <div className="divide-y divide-stone-100">
                {responsibleStats.length === 0 ? (
                  <p className="p-8 text-center text-stone-400 text-sm">Sin datos de responsables</p>
                ) : (
                  responsibleStats.map((resp, idx) => {
                    const completionRate = resp.totalRoomsAssigned > 0
                      ? Math.round((resp.totalRoomsCompleted / resp.totalRoomsAssigned) * 100)
                      : 0;
                    const maxRooms = responsibleStats[0].totalRoomsCompleted;
                    return (
                      <div key={resp.responsibleId} className="p-4 hover:bg-stone-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            idx === 0 ? 'bg-amber-400 text-white' :
                            idx === 1 ? 'bg-stone-300 text-stone-700' :
                            idx === 2 ? 'bg-amber-700 text-white' :
                            'bg-sky-100 text-sky-800'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-stone-900">{resp.nombre}</span>
                              {idx === 0 && (
                                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <Award className="w-3 h-3" />Top rendimiento
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5">
                              <MiniBar value={resp.totalRoomsCompleted} max={maxRooms} color="bg-sky-500" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center shrink-0">
                            <div>
                              <div className="text-lg font-bold text-stone-800">{resp.totalSabanas}</div>
                              <div className="text-xs text-stone-500">Sabanas</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-emerald-700">{resp.completedSabanas}</div>
                              <div className="text-xs text-stone-500">Completadas</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-sky-700">{resp.totalRoomsCompleted.toLocaleString()}</div>
                              <div className="text-xs text-stone-500">Hab. terminadas</div>
                            </div>
                            <div>
                              <div className={`text-lg font-bold ${completionRate >= 80 ? 'text-emerald-700' : completionRate >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {completionRate}%
                              </div>
                              <div className="text-xs text-stone-500">Efectividad</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5">
              <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                Comparativa de rendimiento
              </h3>
              <div className="space-y-3">
                {responsibleStats.slice(0, 10).map((resp) => {
                  const completionRate = resp.totalRoomsAssigned > 0
                    ? Math.round((resp.totalRoomsCompleted / resp.totalRoomsAssigned) * 100)
                    : 0;
                  return (
                    <div key={resp.responsibleId} className="flex items-center gap-3">
                      <div className="w-32 text-sm text-stone-700 truncate shrink-0">{resp.nombre.split(' ')[0]}</div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-5 bg-stone-100 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full ${completionRate >= 80 ? 'bg-emerald-500' : completionRate >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                            style={{ width: `${completionRate}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-stone-700">
                            {resp.totalRoomsCompleted.toLocaleString()} hab. ({completionRate}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
