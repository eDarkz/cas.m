import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, AlertCircle, UserX, Briefcase, Eye, EyeOff,
  SlidersHorizontal, Download, RotateCcw
} from 'lucide-react';
import {
  vacacionarioApi, VacEmployee, VacRequest
} from '../lib/vacacionarioApi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ComposedChart, Scatter, ScatterChart, ZAxis
} from 'recharts';
import HamsterLoader from './HamsterLoader';

const CHART_COLORS = ['#0d9488', '#0284c7', '#d97706', '#dc2626', '#7c3aed', '#059669', '#e11d48', '#4f46e5', '#ca8a04', '#0891b2'];
const CHART_STATUS_COLORS: Record<string, string> = { APPROVED: '#10b981', TAKEN: '#0d9488', REQUESTED: '#f59e0b', REJECTED: '#ef4444', CANCELLED: '#94a3b8', DRAFT: '#6b7280' };
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador', REQUESTED: 'Solicitada', APPROVED: 'Aprobada',
  REJECTED: 'Rechazada', CANCELLED: 'Cancelada', TAKEN: 'Tomada',
};

type PeriodPreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisSemester' | 'lastSemester' | 'thisYear' | 'lastYear' | 'last30' | 'last90' | 'last180' | 'custom';

type ReportSection = 'kpis' | 'accrual' | 'absent' | 'advancedKpis' | 'monthlyTrend' | 'statusPie' | 'cumulative' | 'absentees' | 'duration' | 'weekday' | 'balance' | 'seniority' | 'deptRadar' | 'scatter' | 'quarterly' | 'deptTable' | 'topConsumers' | 'topAccumulators' | 'monthlyDays' | 'insights';

const ALL_SECTIONS: { key: ReportSection; label: string; group: string }[] = [
  { key: 'kpis', label: 'KPIs Generales', group: 'Indicadores' },
  { key: 'advancedKpis', label: 'KPIs Avanzados', group: 'Indicadores' },
  { key: 'accrual', label: 'Generacion vs Tomados', group: 'Indicadores' },
  { key: 'absent', label: 'Personal Ausente', group: 'Indicadores' },
  { key: 'monthlyTrend', label: 'Solicitudes por Mes', group: 'Graficas' },
  { key: 'statusPie', label: 'Distribucion por Estatus', group: 'Graficas' },
  { key: 'cumulative', label: 'Dias Acumulados', group: 'Graficas' },
  { key: 'absentees', label: 'Personas Ausentes/Mes', group: 'Graficas' },
  { key: 'duration', label: 'Distribucion Duracion', group: 'Graficas' },
  { key: 'weekday', label: 'Dia Inicio Preferido', group: 'Graficas' },
  { key: 'balance', label: 'Saldos Disponibles', group: 'Graficas' },
  { key: 'seniority', label: 'Distribucion Antiguedad', group: 'Graficas' },
  { key: 'deptRadar', label: 'Radar Departamentos', group: 'Graficas' },
  { key: 'scatter', label: 'Antiguedad vs Disponible', group: 'Graficas' },
  { key: 'quarterly', label: 'Comparativo Trimestral', group: 'Tablas' },
  { key: 'deptTable', label: 'Detalle Departamentos', group: 'Tablas' },
  { key: 'topConsumers', label: 'Top Consumo', group: 'Tablas' },
  { key: 'topAccumulators', label: 'Top Acumulacion', group: 'Tablas' },
  { key: 'monthlyDays', label: 'Dias por Mes (linea)', group: 'Graficas' },
  { key: 'insights', label: 'Insights Ejecutivos', group: 'Resumen' },
];

const PERIOD_PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'thisMonth', label: 'Este Mes' },
  { key: 'lastMonth', label: 'Mes Anterior' },
  { key: 'thisQuarter', label: 'Este Trimestre' },
  { key: 'lastQuarter', label: 'Trimestre Anterior' },
  { key: 'thisSemester', label: 'Este Semestre' },
  { key: 'lastSemester', label: 'Semestre Anterior' },
  { key: 'thisYear', label: 'Este Año' },
  { key: 'lastYear', label: 'Año Anterior' },
  { key: 'last30', label: 'Ultimos 30 dias' },
  { key: 'last90', label: 'Ultimos 90 dias' },
  { key: 'last180', label: 'Ultimos 180 dias' },
  { key: 'custom', label: 'Personalizado' },
];

function todayYmd() { return new Date().toISOString().slice(0, 10); }
function fmt(d: Date) { return d.toISOString().slice(0, 10); }

function getDateRange(preset: PeriodPreset, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'thisMonth': return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: fmt(new Date(y, m + 1, 0)) };
    case 'lastMonth': return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
    case 'thisQuarter': { const qs = Math.floor(m / 3) * 3; return { from: fmt(new Date(y, qs, 1)), to: fmt(new Date(y, qs + 3, 0)) }; }
    case 'lastQuarter': { const qs = Math.floor(m / 3) * 3 - 3; return { from: fmt(new Date(y, qs, 1)), to: fmt(new Date(y, qs + 3, 0)) }; }
    case 'thisSemester': return m < 6 ? { from: `${y}-01-01`, to: `${y}-06-30` } : { from: `${y}-07-01`, to: `${y}-12-31` };
    case 'lastSemester': return m < 6 ? { from: `${y - 1}-07-01`, to: `${y - 1}-12-31` } : { from: `${y}-01-01`, to: `${y}-06-30` };
    case 'thisYear': return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'lastYear': return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case 'last30': { const d = new Date(); d.setDate(d.getDate() - 30); return { from: fmt(d), to: fmt(now) }; }
    case 'last90': { const d = new Date(); d.setDate(d.getDate() - 90); return { from: fmt(d), to: fmt(now) }; }
    case 'last180': { const d = new Date(); d.setDate(d.getDate() - 180); return { from: fmt(d), to: fmt(now) }; }
    case 'custom': return { from: customFrom || `${y}-01-01`, to: customTo || fmt(now) };
  }
}

function KpiBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export default function VacacionarioReport() {
  const [employees, setEmployees] = useState<VacEmployee[]>([]);
  const [allRequests, setAllRequests] = useState<VacRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Customization state
  const [showSettings, setShowSettings] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('thisYear');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [visibleSections, setVisibleSections] = useState<Set<ReportSection>>(new Set(ALL_SECTIONS.map(s => s.key)));
  const [showCompare, setShowCompare] = useState(false);
  const [comparePreset, setComparePreset] = useState<PeriodPreset>('lastYear');
  const [compareFrom, setCompareFrom] = useState('');
  const [compareTo, setCompareTo] = useState('');
  const [topN, setTopN] = useState(15);

  const [accrualComparison, setAccrualComparison] = useState<{
    today: number; yesterday: number; weekAgo: number; monthAgo: number;
    takenLast1: number; takenLast7: number; takenLast30: number;
    dailyRate: number; weeklyRate: number; monthlyRate: number;
  } | null>(null);

  const dateRange = useMemo(() => getDateRange(periodPreset, customFrom, customTo), [periodPreset, customFrom, customTo]);
  const compareDateRange = useMemo(() => showCompare ? getDateRange(comparePreset, compareFrom, compareTo) : null, [showCompare, comparePreset, compareFrom, compareTo]);

  const allDepts = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    if (selectedDepts.length === 0) return employees;
    return employees.filter(e => selectedDepts.includes(e.department || ''));
  }, [employees, selectedDepts]);

  const requests = useMemo(() => {
    let filtered = allRequests.filter(r => r.start_date >= dateRange.from && r.start_date <= dateRange.to);
    if (selectedDepts.length > 0) filtered = filtered.filter(r => selectedDepts.includes(r.department || ''));
    return filtered;
  }, [allRequests, dateRange, selectedDepts]);

  const compareRequests = useMemo(() => {
    if (!compareDateRange) return [];
    let filtered = allRequests.filter(r => r.start_date >= compareDateRange.from && r.start_date <= compareDateRange.to);
    if (selectedDepts.length > 0) filtered = filtered.filter(r => selectedDepts.includes(r.department || ''));
    return filtered;
  }, [allRequests, compareDateRange, selectedDepts]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = todayYmd();
      const d1 = new Date(); d1.setDate(d1.getDate() - 1);
      const d7 = new Date(); d7.setDate(d7.getDate() - 7);
      const d30 = new Date(); d30.setDate(d30.getDate() - 30);
      const y = new Date().getFullYear();

      const [emps, reqs, emps1, emps7, emps30] = await Promise.all([
        vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: today }),
        vacacionarioApi.getRequests({ from: `${y - 2}-01-01`, to: `${y + 1}-12-31` }),
        vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: fmt(d1) }),
        vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: fmt(d7) }),
        vacacionarioApi.getEmployees({ active: true, include_balance: true, as_of: fmt(d30) }),
      ]);
      setEmployees(emps);
      setAllRequests(reqs);

      const sumProp = (list: VacEmployee[]) => list.reduce((s, e) => s + (e.balance?.accrued_proportional_days ?? 0), 0);
      const sumUsed = (list: VacEmployee[]) => list.reduce((s, e) => s + (e.balance?.used_days ?? 0), 0);
      setAccrualComparison({
        today: sumProp(emps), yesterday: sumProp(emps1), weekAgo: sumProp(emps7), monthAgo: sumProp(emps30),
        takenLast1: sumUsed(emps) - sumUsed(emps1), takenLast7: sumUsed(emps) - sumUsed(emps7), takenLast30: sumUsed(emps) - sumUsed(emps30),
        dailyRate: sumProp(emps) - sumProp(emps1), weeklyRate: sumProp(emps) - sumProp(emps7), monthlyRate: sumProp(emps) - sumProp(emps30),
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const analytics = useMemo(() => {
    const approved = requests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN');
    const totalDaysGranted = approved.reduce((s, r) => s + r.requested_days, 0);
    const avgDaysPerRequest = approved.length > 0 ? totalDaysGranted / approved.length : 0;
    const totalAvailable = filteredEmployees.reduce((s, e) => s + (e.balance?.available_days ?? 0), 0);
    const avgAvailable = filteredEmployees.length > 0 ? totalAvailable / filteredEmployees.length : 0;
    const totalEarned = filteredEmployees.reduce((s, e) => s + (e.balance?.earned_days ?? 0), 0);
    const totalUsed = filteredEmployees.reduce((s, e) => s + (e.balance?.used_days ?? 0), 0);
    const utilizationRate = totalEarned > 0 ? (totalUsed / totalEarned) * 100 : 0;
    const pendingDays = filteredEmployees.reduce((s, e) => s + (e.balance?.pending_requested_days ?? 0), 0);
    const futureDays = filteredEmployees.reduce((s, e) => s + (e.balance?.future_approved_days ?? 0), 0);
    const equivalentAbsentPersons = totalDaysGranted / 260;
    const totalDecided = requests.filter(r => ['APPROVED', 'TAKEN', 'REJECTED'].includes(r.status)).length;
    const approvalRate = totalDecided > 0 ? (approved.length / totalDecided) * 100 : 0;
    const rejected = requests.filter(r => r.status === 'REJECTED').length;
    const rejectionRate = totalDecided > 0 ? (rejected / totalDecided) * 100 : 0;
    const avgCalendarDays = approved.length > 0 ? approved.reduce((s, r) => s + r.calendar_days, 0) / approved.length : 0;
    const avgRestDaysCrossed = approved.length > 0 ? approved.reduce((s, r) => s + r.rest_days_crossed, 0) / approved.length : 0;
    const avgHolidaysCrossed = approved.length > 0 ? approved.reduce((s, r) => s + r.holiday_days_crossed, 0) / approved.length : 0;
    const today = new Date();
    const seniorityYears = filteredEmployees.map(e => (today.getTime() - new Date(e.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const avgSeniority = seniorityYears.length > 0 ? seniorityYears.reduce((a, b) => a + b, 0) / seniorityYears.length : 0;
    const maxSeniority = seniorityYears.length > 0 ? Math.max(...seniorityYears) : 0;
    const zeroBalance = filteredEmployees.filter(e => (e.balance?.available_days ?? 0) <= 0).length;
    const zeroBalanceRate = filteredEmployees.length > 0 ? (zeroBalance / filteredEmployees.length) * 100 : 0;
    const employeesWithRequests = new Set(requests.map(r => r.employee_id));
    const neverTaken = filteredEmployees.filter(e => !employeesWithRequests.has(e.id)).length;
    const neverTakenRate = filteredEmployees.length > 0 ? (neverTaken / filteredEmployees.length) * 100 : 0;
    const avgAnticipation = approved.length > 0
      ? approved.reduce((s, r) => { const start = new Date(r.start_date); const created = r.approved_at ? new Date(r.approved_at) : start; return s + Math.max(0, (start.getTime() - created.getTime()) / (24 * 60 * 60 * 1000)); }, 0) / approved.length : 0;
    return { totalRequests: requests.length, approved: approved.length, rejected, totalDaysGranted, avgDaysPerRequest, totalAvailable, avgAvailable, totalEarned, totalUsed, utilizationRate, pendingDays, futureDays, equivalentAbsentPersons, approvalRate, rejectionRate, avgCalendarDays, avgRestDaysCrossed, avgHolidaysCrossed, avgSeniority, maxSeniority, zeroBalance, zeroBalanceRate, neverTaken, neverTakenRate, avgAnticipation };
  }, [requests, filteredEmployees]);

  const compareAnalytics = useMemo(() => {
    if (!showCompare || compareRequests.length === 0) return null;
    const approved = compareRequests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN');
    const totalDaysGranted = approved.reduce((s, r) => s + r.requested_days, 0);
    const totalDecided = compareRequests.filter(r => ['APPROVED', 'TAKEN', 'REJECTED'].includes(r.status)).length;
    const approvalRate = totalDecided > 0 ? (approved.length / totalDecided) * 100 : 0;
    const rejected = compareRequests.filter(r => r.status === 'REJECTED').length;
    return { totalRequests: compareRequests.length, approved: approved.length, rejected, totalDaysGranted, approvalRate };
  }, [showCompare, compareRequests]);

  const monthlyData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const data = months.map((m) => ({ mes: m, aprobadas: 0, solicitadas: 0, rechazadas: 0, dias: 0 }));
    requests.forEach(r => {
      const month = parseInt(r.start_date.slice(5, 7)) - 1;
      if (month >= 0 && month < 12) {
        if (r.status === 'APPROVED' || r.status === 'TAKEN') { data[month].aprobadas++; data[month].dias += r.requested_days; }
        else if (r.status === 'REQUESTED') data[month].solicitadas++;
        else if (r.status === 'REJECTED') data[month].rechazadas++;
      }
    });
    return data;
  }, [requests]);

  const weekdayDistribution = useMemo(() => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    requests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN').forEach(r => {
      const d = new Date(r.start_date + 'T12:00:00').getDay();
      counts[d]++;
    });
    return days.map((name, i) => ({ dia: name.slice(0, 3), solicitudes: counts[i] }));
  }, [requests]);

  const durationDistribution = useMemo(() => {
    const ranges = [
      { label: '1 dia', min: 1, max: 1 }, { label: '2-3 dias', min: 2, max: 3 },
      { label: '4-5 dias', min: 4, max: 5 }, { label: '6-10 dias', min: 6, max: 10 },
      { label: '11-15 dias', min: 11, max: 15 }, { label: '16+ dias', min: 16, max: Infinity },
    ];
    const approved = requests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN');
    return ranges.map(range => ({ rango: range.label, cantidad: approved.filter(r => r.requested_days >= range.min && r.requested_days <= range.max).length }));
  }, [requests]);

  const balanceDistribution = useMemo(() => {
    const ranges = [
      { label: 'Negativo', min: -Infinity, max: -1 }, { label: '0 dias', min: 0, max: 0 },
      { label: '1-5 dias', min: 1, max: 5 }, { label: '6-10 dias', min: 6, max: 10 },
      { label: '11-15 dias', min: 11, max: 15 }, { label: '16-20 dias', min: 16, max: 20 },
      { label: '21-30 dias', min: 21, max: 30 }, { label: '31+ dias', min: 31, max: Infinity },
    ];
    return ranges.map(r => ({ rango: r.label, personas: filteredEmployees.filter(e => { const avail = e.balance?.available_days ?? 0; return avail >= r.min && avail <= r.max; }).length }));
  }, [filteredEmployees]);

  const departmentStats = useMemo(() => {
    const deptMap: Record<string, { name: string; total: number; usedDays: number; availDays: number; requests: number; approved: number; earnedDays: number }> = {};
    filteredEmployees.forEach(e => {
      const dept = e.department || 'Sin Depto';
      if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, usedDays: 0, availDays: 0, requests: 0, approved: 0, earnedDays: 0 };
      deptMap[dept].total++; deptMap[dept].usedDays += e.balance?.used_days ?? 0; deptMap[dept].availDays += e.balance?.available_days ?? 0; deptMap[dept].earnedDays += e.balance?.earned_days ?? 0;
    });
    requests.forEach(r => {
      const dept = r.department || 'Sin Depto';
      if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, usedDays: 0, availDays: 0, requests: 0, approved: 0, earnedDays: 0 };
      deptMap[dept].requests++; if (r.status === 'APPROVED' || r.status === 'TAKEN') deptMap[dept].approved++;
    });
    return Object.values(deptMap).sort((a, b) => b.total - a.total);
  }, [filteredEmployees, requests]);

  const deptRadar = useMemo(() => {
    return departmentStats.slice(0, 8).map(d => ({
      dept: d.name.length > 12 ? d.name.slice(0, 12) + '..' : d.name,
      utilizacion: d.earnedDays > 0 ? Math.round((d.usedDays / d.earnedDays) * 100) : 0,
      promDisponible: d.total > 0 ? Math.round(d.availDays / d.total) : 0,
    }));
  }, [departmentStats]);

  const seniorityVsBalance = useMemo(() => {
    return filteredEmployees.map(e => {
      const years = (new Date().getTime() - new Date(e.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return { antiguedad: Math.round(years * 10) / 10, disponible: e.balance?.available_days ?? 0, nombre: e.full_name, dept: e.department };
    });
  }, [filteredEmployees]);

  const topConsumers = useMemo(() => {
    const map: Record<string, { name: string; dept: string; days: number; requests: number; avgDuration: number }> = {};
    requests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN').forEach(r => {
      if (!map[r.employee_id]) map[r.employee_id] = { name: r.full_name || '', dept: r.department || '', days: 0, requests: 0, avgDuration: 0 };
      map[r.employee_id].days += r.requested_days; map[r.employee_id].requests++;
    });
    Object.values(map).forEach(v => { v.avgDuration = v.requests > 0 ? Math.round((v.days / v.requests) * 10) / 10 : 0; });
    return Object.values(map).sort((a, b) => b.days - a.days).slice(0, topN);
  }, [requests, topN]);

  const topAccumulators = useMemo(() => {
    return filteredEmployees
      .filter(e => (e.balance?.available_days ?? 0) > 0)
      .sort((a, b) => (b.balance?.available_days ?? 0) - (a.balance?.available_days ?? 0))
      .slice(0, topN)
      .map(e => ({ name: e.full_name, dept: e.department, available: e.balance?.available_days ?? 0, earned: e.balance?.earned_days ?? 0, used: e.balance?.used_days ?? 0, utilization: (e.balance?.earned_days ?? 0) > 0 ? Math.round(((e.balance?.used_days ?? 0) / (e.balance!.earned_days)) * 100) : 0 }));
  }, [filteredEmployees, topN]);

  const serviceYearDist = useMemo(() => {
    const ranges = [
      { label: '<1 año', min: 0, max: 1 }, { label: '1-2 años', min: 1, max: 2 },
      { label: '2-5 años', min: 2, max: 5 }, { label: '5-10 años', min: 5, max: 10 },
      { label: '10-15 años', min: 10, max: 15 }, { label: '15-20 años', min: 15, max: 20 },
      { label: '20+ años', min: 20, max: Infinity },
    ];
    const today = new Date();
    return ranges.map(r => ({ rango: r.label, personas: filteredEmployees.filter(e => { const years = (today.getTime() - new Date(e.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000); return years >= r.min && years < r.max; }).length }));
  }, [filteredEmployees]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ name: STATUS_LABELS[status] || status, value: count, status }));
  }, [requests]);

  const cumulativeDays = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    let cumul = 0;
    return months.map((m, i) => {
      const monthDays = requests.filter(r => (r.status === 'APPROVED' || r.status === 'TAKEN') && parseInt(r.start_date.slice(5, 7)) - 1 === i).reduce((s, r) => s + r.requested_days, 0);
      cumul += monthDays;
      return { mes: m, diasAcumulados: cumul, diasMes: monthDays };
    });
  }, [requests]);

  const monthlyAbsentees = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months.map((m, i) => {
      const monthApproved = requests.filter(r => {
        if (r.status !== 'APPROVED' && r.status !== 'TAKEN') return false;
        const startMonth = parseInt(r.start_date.slice(5, 7)) - 1;
        const endMonth = parseInt(r.end_date.slice(5, 7)) - 1;
        return startMonth <= i && endMonth >= i;
      });
      const totalDaysInMonth = monthApproved.reduce((s, r) => s + r.requested_days, 0);
      return { mes: m, personasAusentes: Math.round((totalDaysInMonth / 22) * 10) / 10, solicitudes: monthApproved.length };
    });
  }, [requests]);

  const quarterlyData = useMemo(() => {
    const quarters = ['Q1 (Ene-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dic)'];
    return quarters.map((q, qi) => {
      const startMonth = qi * 3;
      const endMonth = startMonth + 2;
      const qRequests = requests.filter(r => { const m = parseInt(r.start_date.slice(5, 7)) - 1; return m >= startMonth && m <= endMonth; });
      const qApproved = qRequests.filter(r => r.status === 'APPROVED' || r.status === 'TAKEN');
      return { trimestre: q, solicitudes: qRequests.length, dias: qApproved.reduce((s, r) => s + r.requested_days, 0), aprobadas: qApproved.length };
    });
  }, [requests]);

  const toggleSection = (key: ReportSection) => {
    setVisibleSections(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };

  const selectAllSections = () => setVisibleSections(new Set(ALL_SECTIONS.map(s => s.key)));
  const selectNoneSections = () => setVisibleSections(new Set());

  const resetSettings = () => {
    setPeriodPreset('thisYear');
    setCustomFrom(''); setCustomTo('');
    setSelectedDepts([]);
    setVisibleSections(new Set(ALL_SECTIONS.map(s => s.key)));
    setShowCompare(false);
    setTopN(15);
  };

  const show = (key: ReportSection) => visibleSections.has(key);

  if (loading) return <div className="flex justify-center py-12"><HamsterLoader /></div>;

  const periodLabel = PERIOD_PRESETS.find(p => p.key === periodPreset)?.label || 'Personalizado';

  return (
    <div className="space-y-4">
      {/* Header with settings toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Reporte Ejecutivo de Vacaciones</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Periodo: {dateRange.from} al {dateRange.to}
            {selectedDepts.length > 0 && ` | Deptos: ${selectedDepts.length}`}
            {showCompare && compareDateRange && ` | Comparando con: ${compareDateRange.from} al ${compareDateRange.to}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showSettings
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-teal-400 hover:text-teal-700 dark:hover:text-teal-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Personalizar
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-slate-400 transition-all"
            title="Imprimir reporte"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-5 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-teal-600" />
              Opciones de Personalizacion
            </h3>
            <button onClick={resetSettings} className="flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600 transition-colors">
              <RotateCcw className="w-3 h-3" /> Restablecer
            </button>
          </div>

          {/* Period Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Periodo de Tiempo</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {PERIOD_PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriodPreset(p.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    periodPreset === p.key
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {periodPreset === 'custom' && (
              <div className="flex items-center gap-3 mt-2">
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">Desde</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">Hasta</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100" />
                </div>
              </div>
            )}
          </div>

          {/* Comparison toggle */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Comparar con otro periodo</label>
              <button
                onClick={() => setShowCompare(!showCompare)}
                className={`relative w-10 h-5 rounded-full transition-colors ${showCompare ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showCompare ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {showCompare && (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {PERIOD_PRESETS.filter(p => p.key !== 'custom').map(p => (
                  <button
                    key={p.key}
                    onClick={() => setComparePreset(p.key)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      comparePreset === p.key
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Department filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Filtrar por Departamento {selectedDepts.length > 0 && <span className="text-teal-600">({selectedDepts.length})</span>}
              </label>
              {selectedDepts.length > 0 && (
                <button onClick={() => setSelectedDepts([])} className="text-[10px] text-slate-500 hover:text-red-500 transition-colors">Limpiar</button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {allDepts.map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedDepts.includes(dept)
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200 border border-teal-300 dark:border-teal-600'
                      : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-teal-300'
                  }`}
                >
                  {dept}
                </button>
              ))}
              {allDepts.length === 0 && <p className="text-xs text-slate-400">Sin departamentos disponibles</p>}
            </div>
          </div>

          {/* Top N selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Cantidad de resultados en tablas Top</label>
            <div className="flex items-center gap-2">
              {[5, 10, 15, 20, 30].map(n => (
                <button
                  key={n}
                  onClick={() => setTopN(n)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    topN === n
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-teal-300'
                  }`}
                >
                  Top {n}
                </button>
              ))}
            </div>
          </div>

          {/* Section visibility */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Secciones Visibles</label>
              <div className="flex items-center gap-2">
                <button onClick={selectAllSections} className="text-[10px] text-teal-600 hover:text-teal-700 font-medium">Todas</button>
                <span className="text-slate-300">|</span>
                <button onClick={selectNoneSections} className="text-[10px] text-slate-500 hover:text-red-500 font-medium">Ninguna</button>
              </div>
            </div>
            {['Indicadores', 'Graficas', 'Tablas', 'Resumen'].map(group => (
              <div key={group}>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1.5 uppercase">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_SECTIONS.filter(s => s.group === group).map(section => (
                    <button
                      key={section.key}
                      onClick={() => toggleSection(section.key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        visibleSections.has(section.key)
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
                          : 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600 line-through'
                      }`}
                    >
                      {visibleSections.has(section.key) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {section.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison banner */}
      {showCompare && compareAnalytics && (
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-700 rounded-xl p-4">
          <h4 className="text-xs font-bold text-sky-700 dark:text-sky-300 mb-3 uppercase tracking-wider">Comparacion de Periodos</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <CompareCell label="Solicitudes" current={analytics.totalRequests} previous={compareAnalytics.totalRequests} />
            <CompareCell label="Aprobadas" current={analytics.approved} previous={compareAnalytics.approved} />
            <CompareCell label="Rechazadas" current={analytics.rejected} previous={compareAnalytics.rejected} />
            <CompareCell label="Dias Otorgados" current={analytics.totalDaysGranted} previous={compareAnalytics.totalDaysGranted} />
            <CompareCell label="% Aprobacion" current={Math.round(analytics.approvalRate)} previous={Math.round(compareAnalytics.approvalRate)} suffix="%" />
          </div>
        </div>
      )}

      {/* KPI Row 1 */}
      {show('kpis') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiBox label="Total Solicitudes" value={analytics.totalRequests} color="text-slate-800 dark:text-slate-100" />
          <KpiBox label="Aprobadas/Tomadas" value={analytics.approved} color="text-green-600 dark:text-green-400" />
          <KpiBox label="Rechazadas" value={analytics.rejected} color="text-red-600 dark:text-red-400" />
          <KpiBox label="Dias Otorgados" value={analytics.totalDaysGranted} color="text-teal-600 dark:text-teal-400" />
          <KpiBox label="Tasa Aprobacion" value={`${analytics.approvalRate.toFixed(0)}%`} color="text-emerald-600 dark:text-emerald-400" />
          <KpiBox label="Tasa Rechazo" value={`${analytics.rejectionRate.toFixed(0)}%`} color="text-rose-600 dark:text-rose-400" />
        </div>
      )}

      {/* KPI Row 2 */}
      {show('kpis') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiBox label="Dias Disponibles Totales" value={Math.round(analytics.totalAvailable)} color="text-amber-600 dark:text-amber-400" />
          <KpiBox label="Prom. Disponible/Persona" value={analytics.avgAvailable.toFixed(1)} color="text-blue-600 dark:text-blue-400" />
          <KpiBox label="% Utilizacion" value={`${analytics.utilizationRate.toFixed(0)}%`} color="text-cyan-600 dark:text-cyan-400" />
          <KpiBox label="Dias Pendientes" value={Math.round(analytics.pendingDays)} color="text-orange-600 dark:text-orange-400" />
          <KpiBox label="Dias Futuros Aprobados" value={Math.round(analytics.futureDays)} color="text-sky-600 dark:text-sky-400" />
          <KpiBox label="Prom. Dias/Solicitud" value={analytics.avgDaysPerRequest.toFixed(1)} color="text-blue-600 dark:text-blue-400" />
        </div>
      )}

      {/* Accrual comparison */}
      {show('accrual') && accrualComparison && (
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-700 rounded-xl p-5">
          <h4 className="text-sm font-bold text-sky-800 dark:text-sky-200 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Generacion Proporcional vs Dias Tomados
          </h4>
          <p className="text-xs text-sky-600 dark:text-sky-400 mb-4">Comparativa de dias proporcionales generados vs dias consumidos en periodos recientes</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AccrualCard label="Ultimo dia (ayer vs hoy)" generated={accrualComparison.dailyRate} taken={accrualComparison.takenLast1} />
            <AccrualCard label="Ultimos 7 dias" generated={accrualComparison.weeklyRate} taken={accrualComparison.takenLast7} avgDaily={accrualComparison.weeklyRate / 7} />
            <AccrualCard label="Ultimos 30 dias" generated={accrualComparison.monthlyRate} taken={accrualComparison.takenLast30} avgDaily={accrualComparison.monthlyRate / 30} />
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/50 dark:bg-slate-800/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Proporcional Total Hoy</p>
              <p className="text-lg font-bold text-sky-700 dark:text-sky-300">{accrualComparison.today.toFixed(2)}</p>
            </div>
            <div className="bg-white/50 dark:bg-slate-800/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Velocidad de Generacion</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{(accrualComparison.monthlyRate / 30).toFixed(3)} <span className="text-xs font-normal">dias/dia</span></p>
            </div>
            <div className="bg-white/50 dark:bg-slate-800/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Proyeccion Mensual</p>
              <p className="text-lg font-bold text-sky-700 dark:text-sky-300">{((accrualComparison.monthlyRate / 30) * 30).toFixed(1)} <span className="text-xs font-normal">dias/mes</span></p>
            </div>
            <div className="bg-white/50 dark:bg-slate-800/30 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Proyeccion Anual</p>
              <p className="text-lg font-bold text-sky-700 dark:text-sky-300">{((accrualComparison.monthlyRate / 30) * 365).toFixed(1)} <span className="text-xs font-normal">dias/año</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Absent equivalence */}
      {show('absent') && (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-700 rounded-xl p-5">
          <h4 className="text-sm font-bold text-teal-800 dark:text-teal-200 mb-3 flex items-center gap-2">
            <UserX className="w-4 h-4" />
            Equivalencia en Personal Ausente
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Dias otorgados en periodo</p>
              <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{analytics.totalDaysGranted}</p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">equivale a <span className="font-bold text-teal-800 dark:text-teal-200">{analytics.equivalentAbsentPersons.toFixed(1)}</span> personas ausentes todo el año</p>
            </div>
            <div>
              <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Dias disponibles sin tomar</p>
              <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{Math.round(analytics.totalAvailable)}</p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">equivaldria a <span className="font-bold text-teal-800 dark:text-teal-200">{(analytics.totalAvailable / 260).toFixed(1)}</span> personas ausentes un año</p>
            </div>
            <div>
              <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Personal sin vacaciones</p>
              <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{analytics.neverTaken}</p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">{analytics.neverTakenRate.toFixed(0)}% no ha solicitado vacaciones</p>
            </div>
            <div>
              <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Personal con saldo en cero</p>
              <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{analytics.zeroBalance}</p>
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">{analytics.zeroBalanceRate.toFixed(0)}% ya utilizo todos sus dias</p>
            </div>
          </div>
        </div>
      )}

      {/* Advanced KPIs */}
      {show('advancedKpis') && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <KpiBox label="Prom. Dias Calendario" value={analytics.avgCalendarDays.toFixed(1)} color="text-slate-700 dark:text-slate-200" />
          <KpiBox label="Prom. Descansos Cruzados" value={analytics.avgRestDaysCrossed.toFixed(1)} color="text-slate-600 dark:text-slate-300" />
          <KpiBox label="Prom. Festivos Cruzados" value={analytics.avgHolidaysCrossed.toFixed(1)} color="text-slate-600 dark:text-slate-300" />
          <KpiBox label="Antiguedad Promedio" value={`${analytics.avgSeniority.toFixed(1)} a`} color="text-sky-600 dark:text-sky-400" />
          <KpiBox label="Max Antiguedad" value={`${analytics.maxSeniority.toFixed(1)} a`} color="text-sky-600 dark:text-sky-400" />
          <KpiBox label="Total Devengados" value={Math.round(analytics.totalEarned)} color="text-emerald-600 dark:text-emerald-400" />
          <KpiBox label="Total Usados" value={Math.round(analytics.totalUsed)} color="text-orange-600 dark:text-orange-400" />
          <KpiBox label="Anticipacion Prom." value={`${analytics.avgAnticipation.toFixed(0)}d`} color="text-blue-600 dark:text-blue-400" />
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {show('monthlyTrend') && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Solicitudes por Mes</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="aprobadas" name="Aprobadas" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="solicitadas" name="Pendientes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rechazadas" name="Rechazadas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {show('statusPie') && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Distribucion por Estatus</h4>
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={CHART_STATUS_COLORS[entry.status] || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {show('cumulative') && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Dias Otorgados Acumulados</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Curva acumulada de dias de vacaciones</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeDays}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="diasAcumulados" name="Dias Acumulados" stroke="#0d9488" fill="#0d948833" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {show('absentees') && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Equivalente Personas Ausentes por Mes</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Personas equivalentes ausentes cada mes por vacaciones</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyAbsentees}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar yAxisId="right" dataKey="solicitudes" name="Solicitudes" fill="#e2e8f044" stroke="#94a3b8" />
                  <Line yAxisId="left" type="monotone" dataKey="personasAusentes" name="Personas Equivalentes" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#dc2626', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {show('duration') && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Distribucion por Duracion</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Cuantos dias suelen tomar las solicitudes aprobadas</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="cantidad" name="Solicitudes" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {show('weekday') && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Dia de Inicio Preferido</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">En que dia de la semana inician las vacaciones aprobadas</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="solicitudes" name="Inicios" fill="#0891b2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {show('balance') && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Distribucion de Saldos Disponibles</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Dias disponibles por segmento del personal</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={balanceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="personas" name="Personas" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {show('seniority') && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Distribucion por Antiguedad</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Cuantos años de servicio tiene el equipo</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceYearDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="personas" name="Personas" fill="#ca8a04" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {show('deptRadar') && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Utilizacion por Departamento</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">% de dias devengados que han sido usados por departamento</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={deptRadar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dept" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Radar name="% Utilizacion" dataKey="utilizacion" stroke="#0d9488" fill="#0d9488" fillOpacity={0.3} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {show('scatter') && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Antiguedad vs Dias Disponibles</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Relacion entre años de servicio y saldo de vacaciones</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="antiguedad" name="Antiguedad" unit=" a" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="disponible" name="Disponible" unit=" d" tick={{ fontSize: 11 }} />
                  <ZAxis range={[40, 40]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(value: any, name: string) => [value, name === 'antiguedad' ? 'Antiguedad' : 'Dias Disponibles']} />
                  <Scatter data={seniorityVsBalance} fill="#4f46e5" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Quarterly */}
      {show('quarterly') && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Comparativo Trimestral</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Solicitudes y dias otorgados por trimestre</p>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {quarterlyData.map((q, i) => (
              <div key={i} className="text-center bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{q.trimestre}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">{q.dias} <span className="text-xs font-normal text-slate-500">dias</span></p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{q.solicitudes} solic. / {q.aprobadas} aprob.</p>
              </div>
            ))}
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="trimestre" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="dias" name="Dias Otorgados" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="solicitudes" name="Solicitudes" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Department table */}
      {show('deptTable') && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Detalle por Departamento</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Departamento</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Personas</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Solicitudes</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Aprobadas</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Dias Usados</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Dias Disponibles</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Dias Devengados</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">% Utilizacion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {departmentStats.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-100">{d.name}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{d.total}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{d.requests}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{d.approved}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{Math.round(d.usedDays)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{Math.round(d.availDays)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{Math.round(d.earnedDays)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        d.earnedDays > 0 && (d.usedDays / d.earnedDays) > 0.7 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : d.earnedDays > 0 && (d.usedDays / d.earnedDays) > 0.4 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {d.earnedDays > 0 ? `${Math.round((d.usedDays / d.earnedDays) * 100)}%` : '0%'}
                      </span>
                    </td>
                  </tr>
                ))}
                {departmentStats.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-slate-400">Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top consumers */}
      {show('topConsumers') && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Top {topN} - Mayor Consumo de Dias</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">#</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Colaborador</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Departamento</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Dias Tomados</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Solicitudes</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Prom. Duracion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {topConsumers.map((tc, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">{i + 1}</td>
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-100 font-medium">{tc.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-xs">{tc.dept}</td>
                    <td className="py-2.5 px-3 text-right"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">{tc.days} dias</span></td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{tc.requests}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{tc.avgDuration} dias</td>
                  </tr>
                ))}
                {topConsumers.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">Sin datos para este periodo</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top accumulators */}
      {show('topAccumulators') && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Top {topN} - Mayor Acumulacion de Dias</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Colaboradores con mas dias disponibles sin tomar - riesgo de pasivo laboral</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">#</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Colaborador</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Departamento</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Disponibles</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Devengados</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">Usados</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">% Utilizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {topAccumulators.map((ta, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">{i + 1}</td>
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-100 font-medium">{ta.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-xs">{ta.dept}</td>
                    <td className="py-2.5 px-3 text-right"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{Math.round(ta.available)} dias</span></td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{Math.round(ta.earned)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">{Math.round(ta.used)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        ta.utilization > 70 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : ta.utilization > 40 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>{ta.utilization}%</span>
                    </td>
                  </tr>
                ))}
                {topAccumulators.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400">Sin datos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly days line chart */}
      {show('monthlyDays') && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Dias Otorgados por Mes</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Tendencia mensual de dias de vacaciones otorgados</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="dias" name="Dias" stroke="#0284c7" strokeWidth={2} dot={{ fill: '#0284c7', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Insights */}
      {show('insights') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h5 className="text-sm font-bold text-sky-800 dark:text-sky-200">Proyeccion de Impacto</h5>
            </div>
            <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed">
              Con {Math.round(analytics.totalAvailable)} dias pendientes por tomar, si se programan en los proximos 6 meses, se tendria un promedio de <span className="font-bold">{(analytics.totalAvailable / 6 / 22).toFixed(1)}</span> personas ausentes adicionales por mes.
            </p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h5 className="text-sm font-bold text-amber-800 dark:text-amber-200">Riesgo de Acumulacion</h5>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {analytics.zeroBalance > 0 ? `${analytics.zeroBalance} colaboradores` : 'Nadie'} tiene saldo en cero, mientras {analytics.neverTaken} no han solicitado vacaciones. La acumulacion excesiva genera pasivo laboral y riesgo legal.
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h5 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Eficiencia Operativa</h5>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              Tasa de utilizacion: {analytics.utilizationRate.toFixed(0)}%. Anticipacion promedio: {analytics.avgAnticipation.toFixed(0)} dias. Duracion media: {analytics.avgDaysPerRequest.toFixed(1)} dias ({analytics.avgCalendarDays.toFixed(1)} calendario, {analytics.avgRestDaysCrossed.toFixed(1)} descansos).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AccrualCard({ label, generated, taken, avgDaily }: { label: string; generated: number; taken: number; avgDaily?: number }) {
  const net = generated - taken;
  return (
    <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-4 border border-sky-100 dark:border-sky-800">
      <p className="text-[10px] uppercase tracking-wider font-bold text-sky-500 dark:text-sky-400 mb-2">{label}</p>
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Generados</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{generated.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-slate-400">Tomados</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{taken > 0 ? '-' : ''}{Math.abs(taken).toFixed(1)}</p>
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${generated >= taken ? 'bg-emerald-500' : 'bg-orange-500'}`}
          style={{ width: `${Math.min(100, generated > 0 ? (generated / Math.max(generated, taken || 0.01)) * 100 : 50)}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
        Balance neto: <span className={`font-bold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {net >= 0 ? '+' : ''}{net.toFixed(2)} dias
        </span>
      </p>
      {avgDaily !== undefined && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Prom. diario: {avgDaily.toFixed(3)} dias/dia</p>
      )}
    </div>
  );
}

function CompareCell({ label, current, previous, suffix = '' }: { label: string; current: number; previous: number; suffix?: string }) {
  const diff = current - previous;
  const pctChange = previous > 0 ? ((diff / previous) * 100) : 0;
  return (
    <div className="bg-white/60 dark:bg-slate-800/40 rounded-lg p-3 text-center">
      <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{current}{suffix}</p>
      <div className="flex items-center justify-center gap-1 mt-1">
        <span className={`text-[10px] font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {diff >= 0 ? '+' : ''}{diff}{suffix}
        </span>
        {previous > 0 && (
          <span className={`text-[9px] ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            ({pctChange >= 0 ? '+' : ''}{pctChange.toFixed(0)}%)
          </span>
        )}
      </div>
      <p className="text-[9px] text-slate-400 mt-0.5">antes: {previous}{suffix}</p>
    </div>
  );
}
