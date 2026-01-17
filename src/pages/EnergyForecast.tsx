import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { energyApi } from '../lib/energyApi';
import { getApiUrl, getHotelCode } from '../utils/hotelConfig';
import { ArrowLeft, TrendingUp, Calculator, Zap, Droplets, Fuel, Calendar, AlertTriangle, CheckCircle, BarChart3, Gauge, DollarSign, Activity } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';

function useDragScrollX<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let down = false;
    let startX = 0;
    let startLeft = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      down = true;
      el.classList.add('dragging');
      try { el.setPointerCapture(e.pointerId); } catch {}
      startX = e.clientX;
      startLeft = el.scrollLeft;
      document.documentElement.style.userSelect = 'none';
      (document.documentElement as any).style.webkitUserSelect = 'none';
    };

    const onMove = (e: PointerEvent) => {
      if (!down) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      el.scrollLeft = startLeft - dx;
    };

    const end = (e?: PointerEvent) => {
      if (!down) return;
      down = false;
      el.classList.remove('dragging');
      if (e) { try { el.releasePointerCapture(e.pointerId); } catch {} }
      document.documentElement.style.userSelect = '';
      (document.documentElement as any).style.webkitUserSelect = '';
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointerleave', end);
    el.addEventListener('pointercancel', end);

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointerleave', end);
      el.removeEventListener('pointercancel', end);
    };
  }, []);
  return { ref };
}

interface EnergeticData {
  id: number;
  fecha: string;
  tipo_cambio: number | null;
  pax: number | null;
  habitaciones_ocupadas: number | null;
  agua_municipal: number | null;
  medidor_testigo: number | null;
  medidor_desaladora: number | null;
  consumo_gas: number | null;
  electricidad_base: number | null;
  electricidad_intermedio: number | null;
  electricidad_punta: number | null;
  demanda_base: number | null;
  demanda_intermedio: number | null;
  demanda_punta: number | null;
  potencia_reactiva: number | null;
}

interface PreciosEnergia {
  id: number;
  mes: number;
  anio: number;
  costo_fijo: number;
  costo_energia_base: number;
  costo_energia_intermedia: number;
  costo_energia_punta: number;
  costo_distribucion: number;
  costo_capacidad: number;
  precio_gas: number;
  precio_agua: number;
}

interface MonthlyForecast {
  mes: string;
  dias_del_mes: number;
  dias_con_datos: number;
  es_proyeccion: boolean;
  energia_base_total: number;
  energia_intermedia_total: number;
  energia_punta_total: number;
  energia_total_kwh: number;
  costo_energia_base: number;
  costo_energia_intermedia: number;
  costo_energia_punta: number;
  costo_energia_subtotal: number;
  demanda_maxima_registrada: number;
  demanda_capacidad: number;
  demanda_distribucion: number;
  costo_capacidad: number;
  costo_distribucion: number;
  costo_fijo: number;
  consumo_reactivo_total: number;
  factor_potencia: number;
  bonificacion_penalizacion: number;
  es_bonificacion: boolean;
  subtotal_electricidad: number;
  ajuste_factor_potencia: number;
  total_electricidad: number;
  agua_municipal_total: number;
  costo_agua_total: number;
  gas_total: number;
  costo_gas_total: number;
  costo_total_mes: number;
}

interface DailyCost {
  fecha: string;
  electricidad_base_kwh: number;
  electricidad_intermedia_kwh: number;
  electricidad_punta_kwh: number;
  electricidad_total_kwh: number;
  costo_electricidad_base: number;
  costo_electricidad_intermedia: number;
  costo_electricidad_punta: number;
  costo_distribucion_diario: number;
  costo_capacidad_diario: number;
  costo_electricidad_total: number;
  agua_municipal_consumo: number;
  costo_agua: number;
  gas_consumo: number;
  costo_gas: number;
  costo_total_dia: number;
}

interface GasLevelsData {
  id: number;
  hotel_codigo: string;
  anio: number;
  mes: number;
  unidad: string;
  capacidad_litros: number;
  tanque01: number;
  tanque02: number;
  tanque03: number;
  tanque04: number;
  tanque05: number;
  tanque06: number;
  tanque07: number;
  tanque08: number;
  tanque09: number;
  tanque10: number;
  tanque11: number;
  tanque12: number;
  tanque13: number;
  tanque14: number;
}

export default function EnergyForecast() {
  const navigate = useNavigate();
  const hotelCode = getHotelCode();
  const [data, setData] = useState<EnergeticData[]>([]);
  const [precios, setPrecios] = useState<PreciosEnergia[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [monthlyForecast, setMonthlyForecast] = useState<MonthlyForecast | null>(null);
  const [gasLevelsData, setGasLevelsData] = useState<GasLevelsData | null>(null);
  const [dailyCosts, setDailyCosts] = useState<DailyCost[]>([]);
  const [loading, setLoading] = useState(true);

  const { ref: dailyTableScrollerRef } = useDragScrollX<HTMLDivElement>();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedMonth && data.length > 0 && precios.length > 0) {
      calculateForecast();
      fetchGasLevels();
    }
  }, [selectedMonth, data, precios]);

  const fetchGasLevels = async () => {
    if (!selectedMonth) {
      setGasLevelsData(null);
      return;
    }

    try {
      const [year, month] = selectedMonth.split('-');
      const apiUrl = getApiUrl(hotelCode, 'gas-niveles-mes');

      const response = await fetch(`${apiUrl}/${year}/${month}`);

      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === 'object' && 'tanque01' in data) {
          setGasLevelsData(data);
        } else {
          setGasLevelsData(null);
        }
      } else {
        setGasLevelsData(null);
      }
    } catch (error) {
      console.error('Error fetching gas levels:', error);
      setGasLevelsData(null);
    }
  };

  const fetchData = async () => {
    try {
      const [energeticosData, preciosData] = await Promise.all([
        energyApi.getEnergeticos(),
        energyApi.getPreciosEnergia()
      ]);

      const sortedData = Array.isArray(energeticosData)
        ? energeticosData.sort((a: EnergeticData, b: EnergeticData) =>
            new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        : [];

      setData(sortedData);
      setPrecios(preciosData);

      const months = [...new Set(sortedData.map((item: EnergeticData) => {
        const dateStr = item.fecha.split('T')[0];
        const [year, month] = dateStr.split('-');
        return `${year}-${month}`;
      }))].sort().reverse();

      setAvailableMonths(months);
      if (months.length > 0) setSelectedMonth(months[0]);
    } catch (e) {
      console.error('Error fetching data:', e);
      setData([]);
      setPrecios([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

  const safeMultiply = (a: number, b: number): number => {
    if (isNaN(a) || isNaN(b) || !isFinite(a) || !isFinite(b)) return 0;
    const r = a * b;
    return isNaN(r) || !isFinite(r) ? 0 : r;
  };

  const calculateForecast = () => {
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const monthData = data.filter(item => {
      const [y, m] = item.fecha.split('T')[0].split('-').map(Number);
      return y === year && m === month;
    });

    const monthPricing = precios.find(p => p.anio === year && p.mes === month);
    if (!monthPricing || monthData.length === 0) return;
    if (isNaN(monthPricing.precio_gas) || !isFinite(monthPricing.precio_gas)) return;

    const diasDelMes = getDaysInMonth(year, month);
    const diasConDatos = monthData.length;
    const esProyeccion = diasConDatos < diasDelMes && diasConDatos >= 3;

    const dailyCostsArray: DailyCost[] = [];
    let totalEnergiaBase = 0;
    let totalEnergiaIntermedia = 0;
    let totalEnergiaPunta = 0;
    let totalAguaMunicipal = 0;
    let totalGas = 0;
    let totalReactivo = 0;
    let demandaMaxima = 0;

    const sortedMonthData = monthData.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    for (let i = 1; i < sortedMonthData.length; i++) {
      const cur = sortedMonthData[i];
      const prev = sortedMonthData[i - 1];

      const elecBase = Math.max(0, ((cur.electricidad_base || 0) - (prev.electricidad_base || 0)) * 700);
      const elecInter = Math.max(0, ((cur.electricidad_intermedio || 0) - (prev.electricidad_intermedio || 0)) * 700);
      const elecPunta = Math.max(0, ((cur.electricidad_punta || 0) - (prev.electricidad_punta || 0)) * 700);

      totalEnergiaBase += elecBase;
      totalEnergiaIntermedia += elecInter;
      totalEnergiaPunta += elecPunta;

      if (cur.agua_municipal !== null && prev.agua_municipal !== null &&
          !isNaN(cur.agua_municipal) && !isNaN(prev.agua_municipal)) {
        totalAguaMunicipal += Math.max(0, cur.agua_municipal - prev.agua_municipal);
      }

      totalGas += parseFloat((prev.consumo_gas || 0).toString()) || 0;
      totalReactivo += Math.max(0, ((cur.potencia_reactiva || 0) - (prev.potencia_reactiva || 0)) * 700);

      const dBase = (prev.demanda_base || 0) * 700;
      const dInt = (prev.demanda_intermedio || 0) * 700;
      const dPun = (prev.demanda_punta || 0) * 700;
      demandaMaxima = Math.max(demandaMaxima, dBase, dInt, dPun);
    }

    if (sortedMonthData.length > 0) {
      const last = sortedMonthData[sortedMonthData.length - 1];
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;

      const nextMonthFirstDay = data.find(item => {
        const [yy, mm, dd] = item.fecha.split('T')[0].split('-').map(Number);
        return yy === nextYear && mm === nextMonth && dd === 1;
      });

      if (nextMonthFirstDay) {
        const elecBase = Math.max(0, ((nextMonthFirstDay.electricidad_base || 0) - (last.electricidad_base || 0)) * 700);
        const elecInter = Math.max(0, ((nextMonthFirstDay.electricidad_intermedio || 0) - (last.electricidad_intermedio || 0)) * 700);
        const elecPunta = Math.max(0, ((nextMonthFirstDay.electricidad_punta || 0) - (last.electricidad_punta || 0)) * 700);
        totalEnergiaBase += elecBase;
        totalEnergiaIntermedia += elecInter;
        totalEnergiaPunta += elecPunta;

        if (nextMonthFirstDay.agua_municipal !== null && last.agua_municipal !== null &&
            !isNaN(nextMonthFirstDay.agua_municipal) && !isNaN(last.agua_municipal)) {
          totalAguaMunicipal += Math.max(0, nextMonthFirstDay.agua_municipal - last.agua_municipal);
        }

        totalGas += parseFloat((last.consumo_gas || 0).toString()) || 0;
        totalReactivo += Math.max(0, ((nextMonthFirstDay.potencia_reactiva || 0) - (last.potencia_reactiva || 0)) * 700);

        const dBase = (last.demanda_base || 0) * 700;
        const dInt = (last.demanda_intermedio || 0) * 700;
        const dPun = (last.demanda_punta || 0) * 700;
        demandaMaxima = Math.max(demandaMaxima, dBase, dInt, dPun);
      } else {
        totalGas += parseFloat((last.consumo_gas || 0).toString()) || 0;
      }
    }

    if (esProyeccion) {
      const factor = diasDelMes / (diasConDatos - 1);
      totalEnergiaBase *= factor;
      totalEnergiaIntermedia *= factor;
      totalEnergiaPunta *= factor;
      totalAguaMunicipal *= factor;
      totalGas *= factor;
      totalReactivo *= factor;
    }

    const totalEnergia = totalEnergiaBase + totalEnergiaIntermedia + totalEnergiaPunta;

    const costoEnergiaBase = totalEnergiaBase * monthPricing.costo_energia_base;
    const costoEnergiaIntermedia = totalEnergiaIntermedia * monthPricing.costo_energia_intermedia;
    const costoEnergiaPunta = totalEnergiaPunta * monthPricing.costo_energia_punta;
    const costoEnergiaSubtotal = costoEnergiaBase + costoEnergiaIntermedia + costoEnergiaPunta;

    const demandaPuntaMax = Math.max(...monthData.map(d => (d.demanda_punta || 0) * 700));
    let demandaCapacidad: number;
    if (demandaPuntaMax === 0) {
      demandaCapacidad = Math.round(totalEnergia / (24 * diasDelMes * 0.57));
    } else {
      demandaCapacidad = Math.min(demandaPuntaMax, totalEnergia / (24 * diasDelMes * 0.57));
    }
    const demandaCalculadaDistribucion = totalEnergia / (24 * diasDelMes * 0.57);
    const demandaDistribucion = Math.min(demandaMaxima, demandaCalculadaDistribucion);

    const costoCapacidad = demandaCapacidad * monthPricing.costo_capacidad;
    const costoDistribucion = demandaDistribucion * monthPricing.costo_distribucion;
    const costoFijo = parseFloat(monthPricing.costo_fijo.toString()) || 0;

    const costoCapacidadDiario = costoCapacidad / diasDelMes;
    const costoDistribucionDiario = costoDistribucion / diasDelMes;

    const factorPotencia = totalEnergia > 0
      ? Math.round(Math.cos(Math.atan(totalReactivo / totalEnergia)) * 10000) / 10000
      : 1;

    let bonificacionPenalizacion = 0;
    let esBonificacion = false;
    if (factorPotencia < 0.95) {
      bonificacionPenalizacion = (3 / 5) * ((0.95 / factorPotencia) - 1);
      esBonificacion = false;
    } else {
      bonificacionPenalizacion = 0.25 * (1 - (0.9 / factorPotencia));
      esBonificacion = true;
    }

    const subtotalElectricidad = costoEnergiaSubtotal + costoCapacidad + costoDistribucion + costoFijo;
    const ajusteFactorPotencia = subtotalElectricidad * bonificacionPenalizacion;
    const totalElectricidad = esBonificacion ? (subtotalElectricidad - ajusteFactorPotencia)
      : (subtotalElectricidad + ajusteFactorPotencia);

    const costoAguaTotal = totalAguaMunicipal * monthPricing.precio_agua;
    const costoGasTotal = safeMultiply(totalGas, monthPricing.precio_gas);
    const costoTotalMes = totalElectricidad + costoAguaTotal + costoGasTotal;

    const forecast: MonthlyForecast = {
      mes: selectedMonth,
      dias_del_mes: diasDelMes,
      dias_con_datos: diasConDatos,
      es_proyeccion: esProyeccion,
      energia_base_total: totalEnergiaBase,
      energia_intermedia_total: totalEnergiaIntermedia,
      energia_punta_total: totalEnergiaPunta,
      energia_total_kwh: totalEnergia,
      costo_energia_base: costoEnergiaBase,
      costo_energia_intermedia: costoEnergiaIntermedia,
      costo_energia_punta: costoEnergiaPunta,
      costo_energia_subtotal: costoEnergiaSubtotal,
      demanda_maxima_registrada: demandaMaxima,
      demanda_capacidad: demandaCapacidad,
      demanda_distribucion: demandaDistribucion,
      costo_capacidad: costoCapacidad,
      costo_distribucion: costoDistribucion,
      costo_fijo: costoFijo,
      consumo_reactivo_total: totalReactivo,
      factor_potencia: factorPotencia,
      bonificacion_penalizacion: bonificacionPenalizacion,
      es_bonificacion: esBonificacion,
      subtotal_electricidad: subtotalElectricidad,
      ajuste_factor_potencia: ajusteFactorPotencia,
      total_electricidad: totalElectricidad,
      agua_municipal_total: totalAguaMunicipal,
      costo_agua_total: costoAguaTotal,
      gas_total: totalGas,
      costo_gas_total: costoGasTotal,
      costo_total_mes: costoTotalMes
    };

    for (let i = 1; i < sortedMonthData.length; i++) {
      const cur = sortedMonthData[i];
      const prev = sortedMonthData[i - 1];

      const elecBase = Math.max(0, ((cur.electricidad_base || 0) - (prev.electricidad_base || 0)) * 700);
      const elecInter = Math.max(0, ((cur.electricidad_intermedio || 0) - (prev.electricidad_intermedio || 0)) * 700);
      const elecPunta = Math.max(0, ((cur.electricidad_punta || 0) - (prev.electricidad_punta || 0)) * 700);
      const elecTotal = elecBase + elecInter + elecPunta;

      let aguaMunicipal = 0;
      if (cur.agua_municipal !== null && prev.agua_municipal !== null &&
          !isNaN(cur.agua_municipal) && !isNaN(prev.agua_municipal)) {
        aguaMunicipal = Math.max(0, cur.agua_municipal - prev.agua_municipal);
      }

      const gasConsumo = parseFloat((prev.consumo_gas || 0).toString()) || 0;

      const costoElecBase = elecBase * monthPricing.costo_energia_base;
      const costoElecIntermedia = elecInter * monthPricing.costo_energia_intermedia;
      const costoElecPunta = elecPunta * monthPricing.costo_energia_punta;
      const costoElecTotal = costoElecBase + costoElecIntermedia + costoElecPunta;

      const costoAgua = aguaMunicipal * monthPricing.precio_agua;
      const costoGas = safeMultiply(gasConsumo, monthPricing.precio_gas);

      const costoTotalDia = costoElecTotal + costoAgua + costoGas + costoDistribucionDiario + costoCapacidadDiario;

      dailyCostsArray.push({
        fecha: prev.fecha,
        electricidad_base_kwh: elecBase,
        electricidad_intermedia_kwh: elecInter,
        electricidad_punta_kwh: elecPunta,
        electricidad_total_kwh: elecTotal,
        costo_electricidad_base: costoElecBase,
        costo_electricidad_intermedia: costoElecIntermedia,
        costo_electricidad_punta: costoElecPunta,
        costo_distribucion_diario: costoDistribucionDiario,
        costo_capacidad_diario: costoCapacidadDiario,
        costo_electricidad_total: costoElecTotal,
        agua_municipal_consumo: aguaMunicipal,
        costo_agua: costoAgua,
        gas_consumo: gasConsumo,
        costo_gas: costoGas,
        costo_total_dia: costoTotalDia
      });
    }

    if (sortedMonthData.length > 0) {
      const last = sortedMonthData[sortedMonthData.length - 1];
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;

      const nextMonthFirstDay = data.find(item => {
        const [yy, mm, dd] = item.fecha.split('T')[0].split('-').map(Number);
        return yy === nextYear && mm === nextMonth && dd === 1;
      });

      if (nextMonthFirstDay) {
        const elecBase = Math.max(0, ((nextMonthFirstDay.electricidad_base || 0) - (last.electricidad_base || 0)) * 700);
        const elecInter = Math.max(0, ((nextMonthFirstDay.electricidad_intermedio || 0) - (last.electricidad_intermedio || 0)) * 700);
        const elecPunta = Math.max(0, ((nextMonthFirstDay.electricidad_punta || 0) - (last.electricidad_punta || 0)) * 700);
        const elecTotal = elecBase + elecInter + elecPunta;

        let aguaMunicipal = 0;
        if (nextMonthFirstDay.agua_municipal !== null && last.agua_municipal !== null &&
            !isNaN(nextMonthFirstDay.agua_municipal) && !isNaN(last.agua_municipal)) {
          aguaMunicipal = Math.max(0, nextMonthFirstDay.agua_municipal - last.agua_municipal);
        }

        const gasConsumo = parseFloat((last.consumo_gas || 0).toString()) || 0;

        const costoElecBase = elecBase * monthPricing.costo_energia_base;
        const costoElecIntermedia = elecInter * monthPricing.costo_energia_intermedia;
        const costoElecPunta = elecPunta * monthPricing.costo_energia_punta;
        const costoElecTotal = costoElecBase + costoElecIntermedia + costoElecPunta;

        const costoAgua = aguaMunicipal * monthPricing.precio_agua;
        const costoGas = safeMultiply(gasConsumo, monthPricing.precio_gas);

        const costoTotalDia = costoElecTotal + costoAgua + costoGas + costoDistribucionDiario + costoCapacidadDiario;

        dailyCostsArray.push({
          fecha: last.fecha,
          electricidad_base_kwh: elecBase,
          electricidad_intermedia_kwh: elecInter,
          electricidad_punta_kwh: elecPunta,
          electricidad_total_kwh: elecTotal,
          costo_electricidad_base: costoElecBase,
          costo_electricidad_intermedia: costoElecIntermedia,
          costo_electricidad_punta: costoElecPunta,
          costo_distribucion_diario: costoDistribucionDiario,
          costo_capacidad_diario: costoCapacidadDiario,
          costo_electricidad_total: costoElecTotal,
          agua_municipal_consumo: aguaMunicipal,
          costo_agua: costoAgua,
          gas_consumo: gasConsumo,
          costo_gas: costoGas,
          costo_total_dia: costoTotalDia
        });
      } else {
        const gasConsumo = parseFloat((last.consumo_gas || 0).toString()) || 0;
        const costoGas = safeMultiply(gasConsumo, monthPricing.precio_gas);
        const costoTotalDia = costoGas + costoDistribucionDiario + costoCapacidadDiario;

        dailyCostsArray.push({
          fecha: last.fecha,
          electricidad_base_kwh: 0,
          electricidad_intermedia_kwh: 0,
          electricidad_punta_kwh: 0,
          electricidad_total_kwh: 0,
          costo_electricidad_base: 0,
          costo_electricidad_intermedia: 0,
          costo_electricidad_punta: 0,
          costo_distribucion_diario: costoDistribucionDiario,
          costo_capacidad_diario: costoCapacidadDiario,
          costo_electricidad_total: 0,
          agua_municipal_consumo: 0,
          costo_agua: 0,
          gas_consumo: gasConsumo,
          costo_gas: costoGas,
          costo_total_dia: costoTotalDia
        });
      }
    }

    setMonthlyForecast(forecast);
    setDailyCosts(dailyCostsArray);
  };

  const formatNumber = (n: number) =>
    new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const formatCurrency = (n: number) => {
    if (isNaN(n) || !isFinite(n)) return '$0.00';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
  };

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  };

  const getMonthDisplayName = (key: string) => {
    const [y, m] = key.split('-');
    return `${monthNames[parseInt(m) - 1]} ${y}`;
  };

  const zeroish = (n: number) => Math.abs(n) < 1e-9;

  const now = new Date();
  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const filteredDailyCosts = dailyCosts
    .filter(cost => cost.fecha.slice(0, 10) !== localTodayStr)
    .filter((cost, index, arr) => {
      const isLast = index === arr.length - 1;
      const isZero = zeroish(cost.electricidad_total_kwh) &&
        zeroish(cost.agua_municipal_consumo) &&
        zeroish(cost.gas_consumo);
      return !(isLast && isZero);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <HamsterLoader />
          <p className="text-slate-600">Calculando pronóstico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/energy')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Pronóstico Energético
            </h1>
            <p className="text-slate-600 mt-1">Secrets Puerto Los Cabos</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-slate-600" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
          >
            <option value="">Seleccionar mes</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {getMonthDisplayName(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {monthlyForecast && (
        <>
          {monthlyForecast.es_proyeccion && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-800">Pronóstico Proyectado</h3>
                  <p className="text-sm text-amber-700">
                    Datos disponibles: {monthlyForecast.dias_con_datos - 1} de {monthlyForecast.dias_del_mes} días. Valores proyectados al mes completo.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Zap className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Electricidad</h3>
              </div>
              <p className="text-3xl font-bold text-yellow-600 mb-2">{formatCurrency(monthlyForecast.total_electricidad)}</p>
              <p className="text-sm text-slate-600">{formatNumber(monthlyForecast.energia_total_kwh)} kWh</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Droplets className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Agua</h3>
              </div>
              <p className="text-3xl font-bold text-blue-600 mb-2">{formatCurrency(monthlyForecast.costo_agua_total)}</p>
              <p className="text-sm text-slate-600">{formatNumber(monthlyForecast.agua_municipal_total)} m³</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Fuel className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Gas</h3>
              </div>
              <p className="text-3xl font-bold text-orange-600 mb-2">{formatCurrency(monthlyForecast.costo_gas_total)}</p>
              <p className="text-sm text-slate-600">{formatNumber(monthlyForecast.gas_total)} L</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calculator className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Total Mensual</h3>
              </div>
              <p className="text-3xl font-bold text-green-600 mb-2">{formatCurrency(monthlyForecast.costo_total_mes)}</p>
              <p className="text-sm text-slate-600">Costo estimado</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-yellow-600" />
              <h3 className="text-2xl font-semibold text-slate-900">Desglose Eléctrico - Tarifa GDMTH</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-4">Consumo de Energía</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-slate-700">Base ({formatNumber(monthlyForecast.energia_base_total)} kWh)</span>
                    <span className="font-semibold text-yellow-700">{formatCurrency(monthlyForecast.costo_energia_base)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-slate-700">Intermedia ({formatNumber(monthlyForecast.energia_intermedia_total)} kWh)</span>
                    <span className="font-semibold text-orange-700">{formatCurrency(monthlyForecast.costo_energia_intermedia)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-slate-700">Punta ({formatNumber(monthlyForecast.energia_punta_total)} kWh)</span>
                    <span className="font-semibold text-red-700">{formatCurrency(monthlyForecast.costo_energia_punta)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg border-t-2 border-slate-300">
                    <span className="font-semibold text-slate-800">Subtotal Energía</span>
                    <span className="font-bold text-slate-800">{formatCurrency(monthlyForecast.costo_energia_subtotal)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-4">Demandas y Cargos</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-slate-700">Capacidad ({formatNumber(monthlyForecast.demanda_capacidad)} kW)</span>
                    <span className="font-semibold text-blue-700">{formatCurrency(monthlyForecast.costo_capacidad)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-teal-50 rounded-lg">
                    <span className="text-slate-700">Distribución ({formatNumber(monthlyForecast.demanda_distribucion)} kW)</span>
                    <span className="font-semibold text-teal-700">{formatCurrency(monthlyForecast.costo_distribucion)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-700">Cargo Fijo</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(monthlyForecast.costo_fijo)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg border-t-2 border-slate-300">
                    <span className="font-semibold text-slate-800">Subtotal Electricidad</span>
                    <span className="font-bold text-slate-800">{formatCurrency(monthlyForecast.subtotal_electricidad)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                {monthlyForecast.es_bonificacion ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                <h4 className="text-lg font-semibold text-slate-800">Factor de Potencia</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-slate-600">Factor de Potencia</p>
                  <p className="text-2xl font-bold text-blue-600">{monthlyForecast.factor_potencia.toFixed(4)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600">{monthlyForecast.es_bonificacion ? 'Bonificación' : 'Penalización'}</p>
                  <p className={`text-2xl font-bold ${monthlyForecast.es_bonificacion ? 'text-green-600' : 'text-red-600'}`}>
                    {(monthlyForecast.bonificacion_penalizacion * 100).toFixed(3)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600">Ajuste</p>
                  <p className={`text-2xl font-bold ${monthlyForecast.es_bonificacion ? 'text-green-600' : 'text-red-600'}`}>
                    {monthlyForecast.es_bonificacion ? '-' : '+'}{formatCurrency(monthlyForecast.ajuste_factor_potencia)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-800">Total Electricidad Final</span>
                  <span className="text-2xl font-bold text-yellow-600">{formatCurrency(monthlyForecast.total_electricidad)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">Costos Diarios Detallados</h3>
              </div>
            </div>

            <div
              ref={dailyTableScrollerRef}
              className="overflow-x-auto cursor-grab select-none"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <style>{`
                .dragging { cursor: grabbing !important; scroll-behavior: auto; }
                .overflow-x-auto::-webkit-scrollbar{height:8px}
                .overflow-x-auto::-webkit-scrollbar-thumb{background:#c7c7c7;border-radius:8px}
              `}</style>

              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Base kWh</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inter. kWh</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Punta kWh</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total kWh</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Costo Base</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Costo Inter.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Costo Punta</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Costo Dist</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Costo Capac</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Elec.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Agua Mun. m³</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Costo Agua Mun.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Gas L</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Costo Gas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Día</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredDailyCosts.map((cost, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{formatDate(cost.fecha)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{formatNumber(cost.electricidad_base_kwh)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{formatNumber(cost.electricidad_intermedia_kwh)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{formatNumber(cost.electricidad_punta_kwh)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-purple-600 font-medium">{formatNumber(cost.electricidad_total_kwh)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600">{formatCurrency(cost.costo_electricidad_base)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600">{formatCurrency(cost.costo_electricidad_intermedia)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">{formatCurrency(cost.costo_electricidad_punta)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-indigo-600">{formatCurrency(cost.costo_distribucion_diario)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-purple-600">{formatCurrency(cost.costo_capacidad_diario)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600 font-bold">{formatCurrency(cost.costo_electricidad_total)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">{formatNumber(cost.agua_municipal_consumo)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">{formatCurrency(cost.costo_agua)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600">{formatNumber(cost.gas_consumo)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 font-medium">{formatCurrency(cost.costo_gas)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-bold">{formatCurrency(cost.costo_total_dia)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                  <tr className="font-bold">
                    <td className="px-4 py-3 text-sm text-slate-900">TOTALES</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatNumber(filteredDailyCosts.reduce((s,c)=>s+c.electricidad_base_kwh,0))}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatNumber(filteredDailyCosts.reduce((s,c)=>s+c.electricidad_intermedia_kwh,0))}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatNumber(filteredDailyCosts.reduce((s,c)=>s+c.electricidad_punta_kwh,0))}</td>
                    <td className="px-4 py-3 text-sm text-purple-700">{formatNumber(filteredDailyCosts.reduce((s,c)=>s+c.electricidad_total_kwh,0))}</td>
                    <td className="px-4 py-3 text-sm text-yellow-700">{formatCurrency(filteredDailyCosts.reduce((s,c)=>s+c.costo_electricidad_base,0))}</td>
                    <td className="px-4 py-3 text-sm text-orange-700">{formatCurrency(filteredDailyCosts.reduce((s,c)=>s+c.costo_electricidad_intermedia,0))}</td>
                    <td className="px-4 py-3 text-sm text-red-700">{formatCurrency(filteredDailyCosts.reduce((s,c)=>s+c.costo_electricidad_punta,0))}</td>
                    <td className="px-4 py-3 text-sm text-indigo-700">{formatCurrency(filteredDailyCosts.reduce((s,c)=>s+c.costo_distribucion_diario,0))}</td>
                    <td className="px-4 py-3 text-sm text-purple-700">{formatCurrency(filteredDailyCosts.reduce((s,c)=>s+c.costo_capacidad_diario,0))}</td>
                    <td className="px-4 py-3 text-sm text-yellow-700">{formatCurrency(filteredDailyCosts.reduce((s,c)=>s+c.costo_electricidad_total,0))}</td>
                    <td className="px-4 py-3 text-sm text-blue-700">{formatNumber(filteredDailyCosts.reduce((s,c)=>s+c.agua_municipal_consumo,0))}</td>
                    <td className="px-4 py-3 text-sm text-blue-700">{formatCurrency(filteredDailyCosts.reduce((s,c)=>s+c.costo_agua,0))}</td>
                    <td className="px-4 py-3 text-sm text-orange-700">{formatNumber(filteredDailyCosts.reduce((s,c)=>s+c.gas_consumo,0))}</td>
                    <td className="px-4 py-3 text-sm text-orange-700">{formatCurrency(filteredDailyCosts.reduce((s,c)=>s+c.costo_gas,0))}</td>
                    <td className="px-4 py-3 text-sm text-green-700">{formatCurrency(filteredDailyCosts.reduce((s,c)=>s+c.costo_total_dia,0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Niveles de Tanques de Gas - Solo si hay datos */}
      {gasLevelsData && typeof gasLevelsData === 'object' && 'tanque01' in gasLevelsData && (
        <div className="bg-white rounded-xl shadow-lg border border-orange-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Fuel className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900">
              Niveles de Tanques de Gas - {selectedMonth && (() => {
                const [year, month] = selectedMonth.split('-');
                return `${monthNames[parseInt(month) - 1]} ${year}`;
              })()}
            </h3>
          </div>

          {(() => {
            const tankValues = [];
            for (let i = 1; i <= 14; i++) {
              const tankKey = `tanque${String(i).padStart(2, '0')}` as keyof GasLevelsData;
              const value = gasLevelsData[tankKey];
              tankValues.push(typeof value === 'number' ? value : 0);
            }

            const averageLevel = tankValues.reduce((sum, val) => sum + (val || 0), 0) / 14;
            const totalLiters = tankValues.reduce((sum, val) => sum + ((val || 0) * 5000 / 100), 0);
            const maxCapacity = 70000;

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-orange-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-800">Nivel Promedio</h4>
                    </div>
                    <p className="text-3xl font-bold text-orange-600 mb-2">
                      {averageLevel.toFixed(1)}%
                    </p>
                    <p className="text-sm text-slate-600">Promedio de 14 tanques</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Fuel className="w-6 h-6 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-800">Total Disponible</h4>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      {totalLiters.toLocaleString('es-MX', { maximumFractionDigits: 0 })}L
                    </p>
                    <p className="text-sm text-slate-600">Litros disponibles</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-800">Capacidad Total</h4>
                    </div>
                    <p className="text-3xl font-bold text-green-600 mb-2">
                      {maxCapacity.toLocaleString('es-MX')}L
                    </p>
                    <p className="text-sm text-slate-600">Capacidad máxima</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Gauge className="w-6 h-6 text-purple-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-800">Ocupación</h4>
                    </div>
                    <p className="text-3xl font-bold text-purple-600 mb-2">
                      {((totalLiters / maxCapacity) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-slate-600">Del total instalado</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                  {tankValues.map((level, index) => {
                    const getColorClass = (lvl: number) => {
                      if (lvl >= 70) return 'from-green-500 to-emerald-600';
                      if (lvl >= 40) return 'from-yellow-500 to-orange-600';
                      return 'from-red-500 to-rose-600';
                    };

                    return (
                      <div key={index} className="relative">
                        <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-4 border-2 border-slate-300 shadow-md">
                          <div className="text-center mb-3">
                            <p className="text-sm font-medium text-slate-700">Tanque {index + 1}</p>
                          </div>

                          <div className="relative h-32 bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-300">
                            <div
                              className={`absolute bottom-0 w-full bg-gradient-to-t ${getColorClass(level)} transition-all duration-500`}
                              style={{ height: `${level}%` }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-2xl font-bold text-slate-800 drop-shadow-lg">
                                {level}%
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 text-center">
                            <p className="text-xs text-slate-600">
                              {((level * 5000) / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })}L
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {!monthlyForecast && selectedMonth && (
        <div className="text-center py-12">
          <Calculator className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">No hay datos suficientes para calcular el pronóstico del mes seleccionado</p>
        </div>
      )}
    </div>
  );
}
