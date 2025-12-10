import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getApiUrl } from '../utils/hotelConfig';
import { getMonthName } from '../utils/dateUtils';
import { TrendingUp, Calculator, Zap, Droplets, Fuel, Calendar, AlertTriangle, CheckCircle, BarChart3, Gauge, DollarSign, Activity, Target, Info, TrendingDown, TrendingUp as TrendingUpIcon } from 'lucide-react';

/* =========================
   Hook: drag-to-scroll (X)
   ========================= */
function useDragScrollX<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let down = false;
    let startX = 0;
    let startLeft = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return; // solo botón principal
      down = true;
      el.classList.add('dragging');
      try { el.setPointerCapture(e.pointerId); } catch {}
      startX = e.clientX;
      startLeft = el.scrollLeft;
      // evitar selección de texto
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

/* =========================
   Tipos
   ========================= */
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

interface DailyCost {
  fecha: string;
  electricidad_base_kwh: number;
  electricidad_intermedia_kwh: number;
  electricidad_punta_kwh: number;
  electricidad_total_kwh: number;
  costo_electricidad_base: number;
  costo_electricidad_intermedia: number;
  costo_electricidad_punta: number;

  // prorrateos diarios
  costo_distribucion_diario: number;
  costo_capacidad_diario: number;

  costo_electricidad_total: number;
  agua_municipal_consumo: number;
  costo_agua: number;
  gas_consumo: number;
  costo_gas: number;
  costo_total_dia: number;
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

/* =========================
   Componente
   ========================= */
const EnergyForecast: React.FC = () => {
  const { hotelCode } = useParams<{ hotelCode: string }>();
  const [data, setData] = useState<EnergeticData[]>([]);
  const [precios, setPrecios] = useState<PreciosEnergia[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [monthlyForecast, setMonthlyForecast] = useState<MonthlyForecast | null>(null);
  const [dailyCosts, setDailyCosts] = useState<DailyCost[]>([]);
  const [gasLevelsData, setGasLevelsData] = useState<GasLevelsData[]>([]);
  const [preciosData, setPreciosData] = useState<PreciosEnergia[]>([]);
  const [loading, setLoading] = useState(true);

  // ref para el contenedor de la tabla diaria (drag scroll)
  const { ref: dailyTableScrollerRef } = useDragScrollX<HTMLDivElement>();

  const monthNames = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  useEffect(() => { 
    fetchData(); 
    fetchGasLevelsData();
    fetchPreciosData();
  }, []);
  useEffect(() => {
    if (selectedMonth && data.length > 0 && precios.length > 0) calculateForecast();
    if (selectedMonth) fetchGasLevelsForMonth();
  }, [selectedMonth, data, precios]);

  const fetchData = async () => {
    if (!hotelCode) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [energeticosResponse, preciosResponse] = await Promise.all([
        fetch(getApiUrl(hotelCode, 'energeticos'), { signal: controller.signal }),
        fetch(getApiUrl(hotelCode, 'precios-energia'), { signal: controller.signal })
      ]);

      clearTimeout(timeoutId);

      if (!energeticosResponse.ok || !preciosResponse.ok) {
        throw new Error('Error al cargar los datos');
      }

      const energeticosData = await energeticosResponse.json();
      const preciosData = await preciosResponse.json();

      // Ensure energeticosData is an array before sorting
      const sortedData = Array.isArray(energeticosData) 
        ? energeticosData.sort(
            (a: EnergeticData, b: EnergeticData) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
          )
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

  const fetchGasLevelsData = async () => {
    if (!hotelCode) return;

    try {
      const currentYear = new Date().getFullYear();
      const apiUrl = getApiUrl(hotelCode, 'gas-niveles-mes');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiUrl}/${currentYear}`, { signal: controller.signal });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        setGasLevelsData(result.data || []);
      } else if (response.status === 404) {
        // Normal cuando no hay datos
        setGasLevelsData([]);
      }
    } catch (error) {
      // Silenciar errores de red
    }
  };

  const fetchPreciosData = async () => {
    if (!hotelCode) return;
    
    try {
      const apiUrl = getApiUrl(hotelCode, 'precios-energia');
      const response = await fetch(apiUrl);
      const result = await response.json();
      
      if (Array.isArray(result)) {
        setPreciosData(result);
      }
    } catch (error) {
      console.error('Error fetching precios:', error);
    }
  };

  const fetchGasLevelsForMonth = async () => {
    if (!hotelCode || !selectedMonth) return;

    try {
      const [year, month] = selectedMonth.split('-');
      const apiUrl = getApiUrl(hotelCode, 'gas-niveles-mes');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiUrl}/${year}/${month}`, { signal: controller.signal });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        // Validar que el objeto tenga los campos de tanques
        if (data && typeof data === 'object' && 'tanque01' in data) {
          setGasLevelsData(data);
        } else {
          setGasLevelsData(null);
        }
      } else if (response.status === 404) {
        // 404 es normal cuando no hay datos para ese mes
        setGasLevelsData(null);
      } else {
        setGasLevelsData(null);
      }
    } catch (error) {
      // Error de red o timeout - no mostrar error, solo ocultar la sección
      setGasLevelsData(null);
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

  const safeMultiply = (a: number, b: number): number => {
    if (isNaN(a) || isNaN(b) || !isFinite(a) || !isFinite(b)) return 0;
    const r = a * b;
    return isNaN(r) || !isFinite(r) ? 0 : r;
  };

  // Función para calcular estadísticas del mes
  const calculateMonthStats = (monthData: EnergeticData[]) => {
    if (monthData.length === 0) return null;

    const totalPax = monthData.reduce((sum, item) => sum + (item.pax || 0), 0);
    const totalRooms = monthData.reduce((sum, item) => sum + (item.habitaciones_ocupadas || 0), 0);
    const totalElectricity = monthData.reduce((sum, item) => 
      sum + ((item.electricidad_base || 0) + (item.electricidad_intermedio || 0) + (item.electricidad_punta || 0)), 0
    );
    const totalWater = monthData.reduce((sum, item) => sum + (item.agua_municipal || 0), 0);
    const totalGas = monthData.reduce((sum, item) => sum + (item.consumo_gas || 0), 0);

    const avgPax = totalPax / monthData.length;
    const avgRooms = totalRooms / monthData.length;
    const avgElectricity = totalElectricity / monthData.length;
    const avgWater = totalWater / monthData.length;
    const avgGas = totalGas / monthData.length;

    return {
      totalPax,
      totalRooms,
      totalElectricity,
      totalWater,
      totalGas,
      avgPax,
      avgRooms,
      avgElectricity,
      avgWater,
      avgGas,
      daysWithData: monthData.length
    };
  };

  // Función para obtener análisis financiero del inventario de gas
  const getGasInventoryAnalysis = () => {
    if (!selectedMonth || !gasLevelsData || preciosData.length === 0) {
      return null;
    }

    // Si gasLevelsData es un array, buscar el mes
    let gasLevel = gasLevelsData;
    if (Array.isArray(gasLevelsData)) {
      const [year, month] = selectedMonth.split('-').map(Number);
      gasLevel = gasLevelsData.find(level =>
        level.anio === year && level.mes === month
      );
      if (!gasLevel) return null;
    }

    const [year, month] = selectedMonth.split('-').map(Number);
    
    // Buscar precio del gas del mes seleccionado
    const precio = preciosData.find(p => 
      p.anio === year && p.mes === month
    );
    
    if (!gasLevel || !precio) {
      return null;
    }

    // Calcular niveles de todos los tanques
    const tankValues = [];
    for (let i = 1; i <= 14; i++) {
      const tankKey = `tanque${String(i).padStart(2, '0')}` as keyof GasLevelsData;
      tankValues.push(gasLevel[tankKey] as number);
    }
    
    const totalLiters = tankValues.reduce((sum, level) => sum + (level * 5000 / 100), 0);
    const averageLevel = tankValues.reduce((sum, level) => sum + level, 0) / 14;
    const maxCapacityLiters = 14 * 5000; // 70,000 litros total
    const utilizationPercentage = (totalLiters / maxCapacityLiters) * 100;
    
    // Cálculos financieros
    const inventoryValue = totalLiters * precio.precio_gas;
    const maxPossibleValue = maxCapacityLiters * precio.precio_gas;
    const unutilizedValue = maxPossibleValue - inventoryValue;
    
    // Calcular consumo promedio mensual para proyecciones
    const monthData = data.filter(item => {
      const dateStr = item.fecha.split('T')[0];
      const [itemYear, itemMonth] = dateStr.split('-');
      return `${itemYear}-${itemMonth}` === selectedMonth;
    });
    
    const totalMonthlyConsumption = monthData.reduce((sum, item) => 
      sum + (item.consumo_gas || 0), 0
    );
    const averageDailyConsumption = totalMonthlyConsumption / (monthData.length || 1);
    const daysOfAutonomy = averageDailyConsumption > 0 ? totalLiters / averageDailyConsumption : 0;
    
    return {
      totalLiters,
      averageLevel,
      utilizationPercentage,
      inventoryValue,
      maxPossibleValue,
      unutilizedValue,
      pricePerLiter: precio.precio_gas,
      daysOfAutonomy,
      averageDailyConsumption,
      totalMonthlyConsumption,
      tankValues
    };
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

    // 1) Acumular
    for (let i = 1; i < sortedMonthData.length; i++) {
      const cur = sortedMonthData[i];
      const prev = sortedMonthData[i - 1];

      const elecBase  = Math.max(0, ((cur.electricidad_base || 0)      - (prev.electricidad_base || 0))      * 700);
      const elecInter = Math.max(0, ((cur.electricidad_intermedio || 0) - (prev.electricidad_intermedio || 0)) * 700);
      const elecPunta = Math.max(0, ((cur.electricidad_punta || 0)      - (prev.electricidad_punta || 0))      * 700);

      totalEnergiaBase       += elecBase;
      totalEnergiaIntermedia += elecInter;
      totalEnergiaPunta      += elecPunta;

      if (cur.agua_municipal !== null && prev.agua_municipal !== null &&
          !isNaN(cur.agua_municipal) && !isNaN(prev.agua_municipal)) {
        totalAguaMunicipal += Math.max(0, cur.agua_municipal - prev.agua_municipal);
      }

      totalGas += parseFloat((prev.consumo_gas || 0).toString()) || 0;
      totalReactivo += Math.max(0, ((cur.potencia_reactiva || 0) - (prev.potencia_reactiva || 0)) * 700);

      const dBase = (prev.demanda_base || 0) * 700;
      const dInt  = (prev.demanda_intermedio || 0) * 700;
      const dPun  = (prev.demanda_punta || 0) * 700;
      demandaMaxima = Math.max(demandaMaxima, dBase, dInt, dPun);
    }

    // Último día vs 1º siguiente
    if (sortedMonthData.length > 0) {
      const last = sortedMonthData[sortedMonthData.length - 1];
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear  = month === 12 ? year + 1 : year;

      const nextMonthFirstDay = data.find(item => {
        const [yy, mm, dd] = item.fecha.split('T')[0].split('-').map(Number);
        return yy === nextYear && mm === nextMonth && dd === 1;
      });

      if (nextMonthFirstDay) {
        const elecBase  = Math.max(0, ((nextMonthFirstDay.electricidad_base || 0)      - (last.electricidad_base || 0))      * 700);
        const elecInter = Math.max(0, ((nextMonthFirstDay.electricidad_intermedio || 0) - (last.electricidad_intermedio || 0)) * 700);
        const elecPunta = Math.max(0, ((nextMonthFirstDay.electricidad_punta || 0)      - (last.electricidad_punta || 0))      * 700);
        totalEnergiaBase       += elecBase;
        totalEnergiaIntermedia += elecInter;
        totalEnergiaPunta      += elecPunta;

        if (nextMonthFirstDay.agua_municipal !== null && last.agua_municipal !== null &&
            !isNaN(nextMonthFirstDay.agua_municipal) && !isNaN(last.agua_municipal)) {
          totalAguaMunicipal += Math.max(0, nextMonthFirstDay.agua_municipal - last.agua_municipal);
        }

        totalGas += parseFloat((last.consumo_gas || 0).toString()) || 0;
        totalReactivo += Math.max(0, ((nextMonthFirstDay.potencia_reactiva || 0) - (last.potencia_reactiva || 0)) * 700);

        const dBase = (last.demanda_base || 0) * 700;
        const dInt  = (last.demanda_intermedio || 0) * 700;
        const dPun  = (last.demanda_punta || 0) * 700;
        demandaMaxima = Math.max(demandaMaxima, dBase, dInt, dPun);
      } else {
        // sin día 1 del mes siguiente: sumar gas del último día
        totalGas += parseFloat((last.consumo_gas || 0).toString()) || 0;
      }
    }

    // 2) Proyección antes de costos/demandas
    if (esProyeccion) {
      const factor = diasDelMes / (diasConDatos - 1);
      totalEnergiaBase       *= factor;
      totalEnergiaIntermedia *= factor;
      totalEnergiaPunta      *= factor;
      totalAguaMunicipal     *= factor;
      totalGas               *= factor;
      totalReactivo          *= factor;
    }

    const totalEnergia = totalEnergiaBase + totalEnergiaIntermedia + totalEnergiaPunta;

    // 3) Costos de energía
    const costoEnergiaBase       = totalEnergiaBase       * monthPricing.costo_energia_base;
    const costoEnergiaIntermedia = totalEnergiaIntermedia * monthPricing.costo_energia_intermedia;
    const costoEnergiaPunta      = totalEnergiaPunta      * monthPricing.costo_energia_punta;
    const costoEnergiaSubtotal   = costoEnergiaBase + costoEnergiaIntermedia + costoEnergiaPunta;

    // 4) Demandas
    const demandaPuntaMax = Math.max(...monthData.map(d => (d.demanda_punta || 0) * 700));
    let demandaCapacidad: number;
    if (demandaPuntaMax === 0) {
      demandaCapacidad = Math.round(totalEnergia / (24 * diasDelMes * 0.57));
    } else {
      demandaCapacidad = Math.min(demandaPuntaMax, totalEnergia / (24 * diasDelMes * 0.57));
    }
    const demandaCalculadaDistribucion = totalEnergia / (24 * diasDelMes * 0.57);
    const demandaDistribucion = Math.min(demandaMaxima, demandaCalculadaDistribucion);

    // 5) Costos demandas y prorrateo
    const costoCapacidad    = demandaCapacidad    * monthPricing.costo_capacidad;
    const costoDistribucion = demandaDistribucion * monthPricing.costo_distribucion;
    const costoFijo         = parseFloat(monthPricing.costo_fijo.toString()) || 0;

    const costoCapacidadDiario    = costoCapacidad / diasDelMes;
    const costoDistribucionDiario = costoDistribucion / diasDelMes;

    // 6) FP
    const factorPotencia = totalEnergia > 0
      ? Math.round(Math.cos(Math.atan(totalReactivo / totalEnergia)) * 10000) / 10000
      : 1;

    let bonificacionPenalizacion = 0;
    let esBonificacion = false;
    if (factorPotencia < 0.95) {
      bonificacionPenalizacion = (3/5) * ((0.95 / factorPotencia) - 1);
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
    const costoGasTotal  = safeMultiply(totalGas, monthPricing.precio_gas);
    const costoTotalMes  = totalElectricidad + costoAguaTotal + costoGasTotal;

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

    // 7) Construcción de dailyCosts (días reales)
    for (let i = 1; i < sortedMonthData.length; i++) {
      const cur = sortedMonthData[i];
      const prev = sortedMonthData[i - 1];

      const elecBase  = Math.max(0, ((cur.electricidad_base || 0)      - (prev.electricidad_base || 0))      * 700);
      const elecInter = Math.max(0, ((cur.electricidad_intermedio || 0) - (prev.electricidad_intermedio || 0)) * 700);
      const elecPunta = Math.max(0, ((cur.electricidad_punta || 0)      - (prev.electricidad_punta || 0))      * 700);
      const elecTotal = elecBase + elecInter + elecPunta;

      let aguaMunicipal = 0;
      if (cur.agua_municipal !== null && prev.agua_municipal !== null &&
          !isNaN(cur.agua_municipal) && !isNaN(prev.agua_municipal)) {
        aguaMunicipal = Math.max(0, cur.agua_municipal - prev.agua_municipal);
      }

      const gasConsumo = parseFloat((prev.consumo_gas || 0).toString()) || 0;

      const costoElecBase       = elecBase  * monthPricing.costo_energia_base;
      const costoElecIntermedia = elecInter * monthPricing.costo_energia_intermedia;
      const costoElecPunta      = elecPunta * monthPricing.costo_energia_punta;
      const costoElecTotal      = costoElecBase + costoElecIntermedia + costoElecPunta;

      const costoAgua = aguaMunicipal * monthPricing.precio_agua;
      const costoGas  = safeMultiply(gasConsumo, monthPricing.precio_gas);

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
      const nextYear  = month === 12 ? year + 1 : year;

      const nextMonthFirstDay = data.find(item => {
        const [yy, mm, dd] = item.fecha.split('T')[0].split('-').map(Number);
        return yy === nextYear && mm === nextMonth && dd === 1;
      });

      if (nextMonthFirstDay) {
        const elecBase  = Math.max(0, ((nextMonthFirstDay.electricidad_base || 0)      - (last.electricidad_base || 0))      * 700);
        const elecInter = Math.max(0, ((nextMonthFirstDay.electricidad_intermedio || 0) - (last.electricidad_intermedio || 0)) * 700);
        const elecPunta = Math.max(0, ((nextMonthFirstDay.electricidad_punta || 0)      - (last.electricidad_punta || 0))      * 700);
        const elecTotal = elecBase + elecInter + elecPunta;

        let aguaMunicipal = 0;
        if (nextMonthFirstDay.agua_municipal !== null && last.agua_municipal !== null &&
            !isNaN(nextMonthFirstDay.agua_municipal) && !isNaN(last.agua_municipal)) {
          aguaMunicipal = Math.max(0, nextMonthFirstDay.agua_municipal - last.agua_municipal);
        }

        const gasConsumo = parseFloat((last.consumo_gas || 0).toString()) || 0;

        const costoElecBase       = elecBase  * monthPricing.costo_energia_base;
        const costoElecIntermedia = elecInter * monthPricing.costo_energia_intermedia;
        const costoElecPunta      = elecPunta * monthPricing.costo_energia_punta;
        const costoElecTotal      = costoElecBase + costoElecIntermedia + costoElecPunta;

        const costoAgua = aguaMunicipal * monthPricing.precio_agua;
        const costoGas  = safeMultiply(gasConsumo, monthPricing.precio_gas);

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
        const costoGas   = safeMultiply(gasConsumo, monthPricing.precio_gas);
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

  // ===== FILTRO QUE OCULTA LA ÚLTIMA FILA SI ESTÁ EN CEROS + OCULTAR HOY (LOCAL) =====
  const zeroish = (n: number) => Math.abs(n) < 1e-9;

  const now = new Date();
  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const filteredDailyCosts = dailyCosts
    .filter(cost => cost.fecha.slice(0,10) !== localTodayStr) // ocultar "hoy"
    .filter((cost, index, arr) => {
      const isLast = index === arr.length - 1;
      const isZero = zeroish(cost.electricidad_total_kwh) &&
                     zeroish(cost.agua_municipal_consumo) &&
                     zeroish(cost.gas_consumo);
      return !(isLast && isZero);
    });

  const filteredData = selectedMonth 
    ? data.filter(item => {
        const dateStr = item.fecha.split('T')[0];
        const [year, month] = dateStr.split('-');
        return `${year}-${month}` === selectedMonth;
      })
    : data;

  const monthStats = calculateMonthStats(filteredData);
  const gasAnalysis = getGasInventoryAnalysis();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Calculando pronóstico...</p>
          <p className="text-sm text-gray-500 mt-2">Conectando con el servidor...</p>
        </div>
      </div>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="mb-4 text-red-600">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-800 font-semibold mb-2">No se pudieron cargar los datos</p>
          <p className="text-sm text-gray-600">El servidor no está disponible o hay un problema de conexión.</p>
          <button
            onClick={fetchData}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 rounded-xl shadow-lg p-6 border border-blue-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Pronóstico Energético</h2>
                <p className="text-sm text-gray-600">Cálculo de costos mensuales según tarifa GDMTH de CFE</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Calendar className="w-5 h-5 text-gray-600" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        </div>

        {/* Resumen */}
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
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-yellow-100 rounded-lg"><Zap className="w-6 h-6 text-yellow-600" /></div><h3 className="text-lg font-semibold text-gray-900">Electricidad</h3></div>
                <p className="text-3xl font-bold text-yellow-600 mb-2">{formatCurrency(monthlyForecast.total_electricidad)}</p>
                <p className="text-sm text-gray-600">{formatNumber(monthlyForecast.energia_total_kwh)} kWh</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-blue-100 rounded-lg"><Droplets className="w-6 h-6 text-blue-600" /></div><h3 className="text-lg font-semibold text-gray-900">Agua</h3></div>
                <p className="text-3xl font-bold text-blue-600 mb-2">{formatCurrency(monthlyForecast.costo_agua_total)}</p>
                <p className="text-sm text-gray-600">{formatNumber(monthlyForecast.agua_municipal_total)} m³ (Municipal)</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-orange-100 rounded-lg"><Fuel className="w-6 h-6 text-orange-600" /></div><h3 className="text-lg font-semibold text-gray-900">Gas</h3></div>
                <p className="text-3xl font-bold text-orange-600 mb-2">{formatCurrency(monthlyForecast.costo_gas_total)}</p>
                <p className="text-sm text-gray-600">{formatNumber(monthlyForecast.gas_total)} L</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-green-100 rounded-lg"><Calculator className="w-6 h-6 text-green-600" /></div><h3 className="text-lg font-semibold text-gray-900">Total Mensual</h3></div>
                <p className="text-3xl font-bold text-green-600 mb-2">{formatCurrency(monthlyForecast.costo_total_mes)}</p>
                <p className="text-sm text-gray-600">Costo estimado</p>
              </div>
            </div>

            {/* Eléctrico */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6"><Zap className="w-6 h-6 text-yellow-600" /><h3 className="text-2xl font-semibold text-gray-900">Desglose Eléctrico - Tarifa GDMTH</h3></div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Consumo de Energía</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-gray-700">Base ({formatNumber(monthlyForecast.energia_base_total)} kWh)</span>
                      <span className="font-semibold text-yellow-700">{formatCurrency(monthlyForecast.costo_energia_base)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="text-gray-700">Intermedia ({formatNumber(monthlyForecast.energia_intermedia_total)} kWh)</span>
                      <span className="font-semibold text-orange-700">{formatCurrency(monthlyForecast.costo_energia_intermedia)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-gray-700">Punta ({formatNumber(monthlyForecast.energia_punta_total)} kWh)</span>
                      <span className="font-semibold text-red-700">{formatCurrency(monthlyForecast.costo_energia_punta)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg border-t-2 border-gray-300">
                      <span className="font-semibold text-gray-800">Subtotal Energía</span>
                      <span className="font-bold text-gray-800">{formatCurrency(monthlyForecast.costo_energia_subtotal)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Demandas y Cargos</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-gray-700">Capacidad ({formatNumber(monthlyForecast.demanda_capacidad)} kW)</span>
                      <span className="font-semibold text-purple-700">{formatCurrency(monthlyForecast.costo_capacidad)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                      <span className="text-gray-700">Distribución ({formatNumber(monthlyForecast.demanda_distribucion)} kW)</span>
                      <span className="font-semibold text-indigo-700">{formatCurrency(monthlyForecast.costo_distribucion)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Cargo Fijo</span>
                      <span className="font-semibold text-gray-700">{formatCurrency(monthlyForecast.costo_fijo)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg border-t-2 border-gray-300">
                      <span className="font-semibold text-gray-800">Subtotal Electricidad</span>
                      <span className="font-bold text-gray-800">{formatCurrency(monthlyForecast.subtotal_electricidad)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  {monthlyForecast.es_bonificacion ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                  <h4 className="text-lg font-semibold text-gray-800">Factor de Potencia</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Factor de Potencia</p>
                    <p className="text-2xl font-bold text-blue-600">{monthlyForecast.factor_potencia.toFixed(4)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">{monthlyForecast.es_bonificacion ? 'Bonificación' : 'Penalización'}</p>
                    <p className={`text-2xl font-bold ${monthlyForecast.es_bonificacion ? 'text-green-600' : 'text-red-600'}`}>
                      {(monthlyForecast.bonificacion_penalizacion * 100).toFixed(3)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Ajuste</p>
                    <p className={`text-2xl font-bold ${monthlyForecast.es_bonificacion ? 'text-green-600' : 'text-red-600'}`}>
                      {monthlyForecast.es_bonificacion ? '-' : '+'}{formatCurrency(monthlyForecast.ajuste_factor_potencia)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-800">Total Electricidad Final</span>
                    <span className="text-2xl font-bold text-yellow-600">{formatCurrency(monthlyForecast.total_electricidad)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventario de Gas: Niveles de Tanques y Análisis Financiero */}
            {gasAnalysis && (
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-lg border border-orange-200">
                <div className="px-6 py-4 bg-gradient-to-r from-orange-100 to-red-100 border-b border-orange-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-200 rounded-lg">
                      <Fuel className="w-6 h-6 text-orange-700" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Inventario de Gas - Niveles 
                      </h3>
                      <p className="text-sm text-gray-700">
                        {getMonthDisplayName(selectedMonth)} - 14 tanques de 5,000L c/u
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Resumen de Métricas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-gray-700">Nivel Promedio</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">
                        {gasAnalysis.averageLevel.toFixed(1)}%
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Fuel className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-gray-700">Total Litros</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">
                        {gasAnalysis.totalLiters.toLocaleString('es-MX', { maximumFractionDigits: 0 })}L
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Valor Inventario</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        ${formatNumber(gasAnalysis.inventoryValue)}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-700">Autonomía</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        {gasAnalysis.daysOfAutonomy > 0 ? Math.round(gasAnalysis.daysOfAutonomy) : '∞'} días
                      </p>
                    </div>
                  </div>

                  {/* Grid de tanques */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                    {gasAnalysis.tankValues.map((level, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Tanque {String(index + 1).padStart(2, '0')}
                        </label>
                        <div className="text-center mb-2">
                          <span className="text-lg font-bold text-orange-600">{level.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              level >= 80 ? 'bg-green-500' :
                              level >= 50 ? 'bg-yellow-500' :
                              level >= 20 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 text-center">
                          {(level * 50).toFixed(0)}L
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Análisis Financiero y Consumo */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Resumen Financiero */}
                    <div className="bg-white rounded-xl p-6 border border-orange-200">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-green-600" />
                        Análisis Financiero
                      </h4>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-600">Valor del Inventario:</span>
                          <span className="font-semibold text-green-600">
                            ${formatNumber(gasAnalysis.inventoryValue)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-600">Capacidad Total:</span>
                          <span className="font-semibold text-gray-700">
                            70,000L
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-600">Utilización:</span>
                          <span className="font-semibold text-blue-600">
                            {gasAnalysis.utilizationPercentage.toFixed(1)}%
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-600">Precio por Litro:</span>
                          <span className="font-semibold text-gray-800">
                            ${formatNumber(gasAnalysis.pricePerLiter)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-600">Valor No Utilizado:</span>
                          <span className="font-semibold text-red-600">
                            ${formatNumber(gasAnalysis.unutilizedValue)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Proyección de Consumo */}
                    <div className="bg-white rounded-xl p-6 border border-orange-200">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUpIcon className="w-5 h-5 text-orange-600" />
                        Proyección de Consumo
                      </h4>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-600">Consumo del Mes:</span>
                          <span className="font-semibold text-orange-600">
                            {gasAnalysis.totalMonthlyConsumption.toLocaleString('es-MX', { maximumFractionDigits: 0 })}L
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-600">Consumo Diario Promedio:</span>
                          <span className="font-semibold text-orange-600">
                            {gasAnalysis.averageDailyConsumption.toFixed(0)}L
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-sm text-gray-600">Días de Autonomía:</span>
                          <span className="font-semibold text-purple-600">
                            {gasAnalysis.daysOfAutonomy > 0 ? Math.round(gasAnalysis.daysOfAutonomy) : '∞'} días
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-600">Costo Mensual Estimado:</span>
                          <span className="font-semibold text-green-600">
                            ${formatNumber(gasAnalysis.totalMonthlyConsumption * gasAnalysis.pricePerLiter)}
                          </span>
                        </div>
                      </div>

                      {gasAnalysis.daysOfAutonomy > 0 && gasAnalysis.daysOfAutonomy < 30 && (
                        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-red-700">
                              <span className="font-semibold">Alerta:</span> El inventario se agotará en aproximadamente {Math.round(gasAnalysis.daysOfAutonomy)} días.
                            </p>
                          </div>
                        </div>
                      )}

                      {gasAnalysis.daysOfAutonomy >= 30 && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-green-700">
                              <span className="font-semibold">Óptimo:</span> Inventario suficiente para más de un mes.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla diaria */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3"><BarChart3 className="w-5 h-5 text-gray-600" /><h3 className="text-lg font-semibold text-gray-900">Costos Diarios Detallados</h3></div>
              </div>

              {/* Contenedor con drag-to-scroll horizontal */}
              <div
                ref={dailyTableScrollerRef}
                className="overflow-x-auto cursor-grab select-none"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <style>{`
                  .dragging { cursor: grabbing !important; scroll-behavior: auto; }
                  /* Opcional: adelgazar scrollbar WebKit */
                  .overflow-x-auto::-webkit-scrollbar{height:8px}
                  .overflow-x-auto::-webkit-scrollbar-thumb{background:#c7c7c7;border-radius:8px}
                `}</style>

                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base kWh</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inter. kWh</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punta kWh</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total kWh</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Base</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Inter.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Punta</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Dist</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Capac</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Elec.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agua Mun. m³</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Agua Mun.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gas L</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Gas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Día</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDailyCosts.map((cost, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{formatDate(cost.fecha)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatNumber(cost.electricidad_base_kwh)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatNumber(cost.electricidad_intermedia_kwh)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatNumber(cost.electricidad_punta_kwh)}</td>
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
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                    <tr className="font-bold">
                      <td className="px-4 py-3 text-sm text-gray-900">TOTALES</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatNumber(filteredDailyCosts.reduce((s,c)=>s+c.electricidad_base_kwh,0))}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatNumber(filteredDailyCosts.reduce((s,c)=>s+c.electricidad_intermedia_kwh,0))}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatNumber(filteredDailyCosts.reduce((s,c)=>s+c.electricidad_punta_kwh,0))}</td>
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


        {!monthlyForecast && selectedMonth && (
          <div className="text-center py-12">
            <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay datos suficientes para calcular el pronóstico del mes seleccionado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnergyForecast;