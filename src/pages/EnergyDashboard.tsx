import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl, getHotelCode } from '../utils/hotelConfig';
import { getMonthName } from '../utils/dateUtils';
import { BarChart3, Droplets, Fuel, Zap, TrendingUp, Calendar, Calculator, Leaf, Users, Home, TreePine, DollarSign, Activity } from 'lucide-react';
import EnergyNavigation from '../components/EnergyNavigation';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

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

interface DailyConsumption {
  fecha: string;
  agua_testigo_consumo: number;
  agua_municipal_consumo: number;
  agua_desaladora_consumo: number;
  agua_total_hotel: number;
  gas_consumo: number;
  electricidad_base: number;
  electricidad_intermedio: number;
  electricidad_punta: number;
  pax: number | null;
  habitaciones: number | null;
}

interface MonthlyStats {
  mes: string;
  agua_testigo_total: number;
  agua_municipal_total: number;
  agua_desaladora_total: number;
  agua_total_hotel: number;
  gas_total: number;
  electricidad_total: number;
  demanda_base_max: number;
  demanda_intermedio_max: number;
  demanda_punta_max: number;
  total_pax: number;
  total_habitaciones: number;
  promedio_tipo_cambio: number;
  dias_con_datos: number;
}

interface SustainabilityStats {
  co2_emissions_kg: number;
  water_efficiency_per_guest: number;
  energy_efficiency_per_guest: number;
  gas_efficiency_per_guest: number;
  occupancy_rate: number;
  carbon_footprint_per_room: number;
  municipal_water_efficiency_per_guest: number;
  desal_water_efficiency_per_guest: number;
  power_factor: number;
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

const EnergyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const hotelCode = getHotelCode();
  const [data, setData] = useState<EnergeticData[]>([]);
  const [dailyConsumptions, setDailyConsumptions] = useState<DailyConsumption[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [sustainabilityStats, setSustainabilityStats] = useState<SustainabilityStats | null>(null);
  const [gasLevelsData, setGasLevelsData] = useState<GasLevelsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (availableMonths.length > 0) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

      if (availableMonths.includes(currentMonthKey)) {
        setSelectedPeriod(currentMonthKey);
      } else {
        setSelectedPeriod(availableMonths[0]);
      }
    }
  }, [availableMonths]);

  useEffect(() => {
    if (data.length > 0) {
      calculateConsumptions();
    }
  }, [data]);

  useEffect(() => {
    if (dailyConsumptions.length > 0) {
      calculateSustainabilityStats();
      fetchGasLevelsForPeriod();
    }
  }, [selectedPeriod, dailyConsumptions]);

  const fetchData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const apiUrl = getApiUrl(hotelCode, 'energeticos');
      const response = await fetch(apiUrl, { signal: controller.signal });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Error al cargar los datos');
      }

      const result = await response.json();

      const sortedData = result.sort((a: EnergeticData, b: EnergeticData) =>
        new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );

      setData(sortedData);

      const months = [...new Set(sortedData.map((item: EnergeticData) => {
        const dateStr = item.fecha.split('T')[0];
        const [year, month] = dateStr.split('-');
        return `${year}-${month}`;
      }))].sort().reverse();

      setAvailableMonths(months);

    } catch (error) {
      console.error('Error fetching data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGasLevelsForPeriod = async () => {
    if (selectedPeriod === 'all' || selectedPeriod === 'ytd') {
      setGasLevelsData(null);
      return;
    }

    try {
      const [year, month] = selectedPeriod.split('-');
      const apiUrl = getApiUrl(hotelCode, 'gas-niveles-mes');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiUrl}/${year}/${month}`, { signal: controller.signal });

      clearTimeout(timeoutId);

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
      setGasLevelsData(null);
    }
  };

  const calculateConsumptions = () => {
    const consumptions: DailyConsumption[] = [];
    const monthlyData: { [key: string]: MonthlyStats } = {};

    for (let i = 1; i < data.length; i++) {
      const currentDay = data[i];
      const previousDay = data[i - 1];

      let aguaTestigo = 0;
      let aguaMunicipal = 0;
      let aguaDesaladora = 0;

      const currentTestigo = currentDay.medidor_testigo;
      const previousTestigo = previousDay.medidor_testigo;
      if (currentTestigo !== null && previousTestigo !== null &&
          !isNaN(currentTestigo) && !isNaN(previousTestigo)) {
        aguaTestigo = Math.max(0, currentTestigo - previousTestigo);
      }

      const currentMunicipal = currentDay.agua_municipal;
      const previousMunicipal = previousDay.agua_municipal;
      if (currentMunicipal !== null && previousMunicipal !== null &&
          !isNaN(currentMunicipal) && !isNaN(previousMunicipal)) {
        aguaMunicipal = Math.max(0, currentMunicipal - previousMunicipal);
      }

      const currentDesaladora = currentDay.medidor_desaladora;
      const previousDesaladora = previousDay.medidor_desaladora;
      if (currentDesaladora !== null && previousDesaladora !== null &&
          !isNaN(currentDesaladora) && !isNaN(previousDesaladora)) {
        aguaDesaladora = Math.max(0, currentDesaladora - previousDesaladora);
      }

      const aguaTotalHotel = aguaMunicipal + aguaDesaladora;
      const gasConsumo = Math.max(0, previousDay.consumo_gas || 0);

      const elecBase = Math.max(0, ((currentDay.electricidad_base || 0) - (previousDay.electricidad_base || 0)) * 700);
      const elecIntermedio = Math.max(0, ((currentDay.electricidad_intermedio || 0) - (previousDay.electricidad_intermedio || 0)) * 700);
      const elecPunta = Math.max(0, ((currentDay.electricidad_punta || 0) - (previousDay.electricidad_punta || 0)) * 700);

      const consumption: DailyConsumption = {
        fecha: previousDay.fecha,
        agua_testigo_consumo: aguaTestigo,
        agua_municipal_consumo: aguaMunicipal,
        agua_desaladora_consumo: aguaDesaladora,
        agua_total_hotel: aguaTotalHotel,
        gas_consumo: gasConsumo,
        electricidad_base: elecBase,
        electricidad_intermedio: elecIntermedio,
        electricidad_punta: elecPunta,
        pax: previousDay.pax,
        habitaciones: previousDay.habitaciones_ocupadas
      };

      consumptions.push(consumption);

      const dateStr = previousDay.fecha.split('T')[0];
      const [year, month] = dateStr.split('-');
      const monthKey = `${year}-${month}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          mes: monthKey,
          agua_testigo_total: 0,
          agua_municipal_total: 0,
          agua_desaladora_total: 0,
          agua_total_hotel: 0,
          gas_total: 0,
          electricidad_total: 0,
          demanda_base_max: 0,
          demanda_intermedio_max: 0,
          demanda_punta_max: 0,
          total_pax: 0,
          total_habitaciones: 0,
          promedio_tipo_cambio: 0,
          dias_con_datos: 0
        };
      }

      monthlyData[monthKey].agua_testigo_total += aguaTestigo;
      monthlyData[monthKey].agua_municipal_total += aguaMunicipal;
      monthlyData[monthKey].agua_desaladora_total += aguaDesaladora;
      monthlyData[monthKey].agua_total_hotel += aguaTotalHotel;
      monthlyData[monthKey].gas_total += gasConsumo;
      monthlyData[monthKey].electricidad_total += elecBase + elecIntermedio + elecPunta;
      monthlyData[monthKey].total_pax += previousDay.pax || 0;
      monthlyData[monthKey].total_habitaciones += previousDay.habitaciones_ocupadas || 0;
      monthlyData[monthKey].promedio_tipo_cambio += previousDay.tipo_cambio || 0;
      monthlyData[monthKey].dias_con_datos += 1;
    }

    Object.values(monthlyData).forEach(month => {
      if (month.dias_con_datos > 0) {
        month.promedio_tipo_cambio = month.promedio_tipo_cambio / month.dias_con_datos;
      }
    });

    data.forEach(item => {
      const dateStr = item.fecha.split('T')[0];
      const [year, month] = dateStr.split('-');
      const monthKey = `${year}-${month}`;

      if (monthlyData[monthKey]) {
        monthlyData[monthKey].demanda_base_max = Math.max(
          monthlyData[monthKey].demanda_base_max,
          (item.demanda_base || 0) * 700
        );
        monthlyData[monthKey].demanda_intermedio_max = Math.max(
          monthlyData[monthKey].demanda_intermedio_max,
          (item.demanda_intermedio || 0) * 700
        );
        monthlyData[monthKey].demanda_punta_max = Math.max(
          monthlyData[monthKey].demanda_punta_max,
          (item.demanda_punta || 0) * 700
        );
      }
    });

    setDailyConsumptions(consumptions);
    setMonthlyStats(Object.values(monthlyData));
  };

  const calculateSustainabilityStats = () => {
    const filteredData = getFilteredConsumptions();
    if (filteredData.length === 0) return;

    const totalDays = filteredData.length;
    if (totalDays === 0) return;

    const periodStats = {
      agua_total_hotel: filteredData.reduce((sum, item) => sum + item.agua_total_hotel, 0),
      agua_municipal_total: filteredData.reduce((sum, item) => sum + item.agua_municipal_consumo, 0),
      agua_desaladora_total: filteredData.reduce((sum, item) => sum + item.agua_desaladora_consumo, 0),
      gas_total: filteredData.reduce((sum, item) => sum + item.gas_consumo, 0),
      electricidad_total: filteredData.reduce((sum, item) => sum + (item.electricidad_base + item.electricidad_intermedio + item.electricidad_punta), 0),
      total_pax: filteredData.reduce((sum, item) => sum + (item.pax || 0), 0),
      total_habitaciones: filteredData.reduce((sum, item) => sum + (item.habitaciones || 0), 0)
    };

    const totalReactivo = data
      .filter(item => {
        if (selectedPeriod === 'all') return true;
        if (selectedPeriod === 'ytd') {
          const itemYear = new Date(item.fecha).getFullYear();
          return itemYear === new Date().getFullYear();
        }
        const dateStr = item.fecha.split('T')[0];
        const [year, month] = dateStr.split('-');
        const itemMonth = `${year}-${month}`;
        return itemMonth === selectedPeriod;
      })
      .reduce((sum, item, index, arr) => {
        if (index === 0) return sum;
        const current = item.potencia_reactiva || 0;
        const previous = arr[index - 1].potencia_reactiva || 0;
        return sum + Math.max(0, (current - previous) * 700);
      }, 0);

    const WATER_CO2_FACTOR = 0.298;
    const GAS_CO2_FACTOR = 2.3;
    const ELECTRICITY_CO2_FACTOR = 0.458;

    const waterEmissions = periodStats.agua_total_hotel * WATER_CO2_FACTOR;
    const gasEmissions = periodStats.gas_total * GAS_CO2_FACTOR;
    const electricityEmissions = periodStats.electricidad_total * ELECTRICITY_CO2_FACTOR;
    const totalCO2 = waterEmissions + gasEmissions + electricityEmissions;

    const totalPax = periodStats.total_pax;
    const totalRooms = periodStats.total_habitaciones;
    const avgRooms = totalRooms / totalDays;

    const waterEfficiency = totalPax > 0 ? periodStats.agua_total_hotel / totalPax : 0;
    const municipalWaterEfficiency = totalPax > 0 ? periodStats.agua_municipal_total / totalPax : 0;
    const desalWaterEfficiency = totalPax > 0 ? periodStats.agua_desaladora_total / totalPax : 0;
    const energyEfficiency = totalPax > 0 ? periodStats.electricidad_total / totalPax : 0;
    const gasEfficiency = totalPax > 0 ? periodStats.gas_total / totalPax : 0;

    const maxRooms = 500;
    const occupancyRate = (avgRooms / maxRooms) * 100;
    const carbonFootprintPerRoom = avgRooms > 0 ? totalCO2 / avgRooms : 0;

    const factorPotencia = periodStats.electricidad_total > 0
      ? Math.cos(Math.atan(totalReactivo / periodStats.electricidad_total))
      : 1;

    setSustainabilityStats({
      co2_emissions_kg: totalCO2,
      water_efficiency_per_guest: waterEfficiency,
      municipal_water_efficiency_per_guest: municipalWaterEfficiency,
      desal_water_efficiency_per_guest: desalWaterEfficiency,
      energy_efficiency_per_guest: energyEfficiency,
      gas_efficiency_per_guest: gasEfficiency,
      occupancy_rate: occupancyRate,
      carbon_footprint_per_room: carbonFootprintPerRoom,
      power_factor: factorPotencia
    });
  };

  const getFilteredConsumptions = () => {
    const currentYear = new Date().getFullYear();

    switch (selectedPeriod) {
      case 'ytd':
        return dailyConsumptions.filter(item => {
          const itemYear = new Date(item.fecha).getFullYear();
          return itemYear === currentYear;
        });
      case 'all':
        return dailyConsumptions;
      default:
        return dailyConsumptions.filter(item => {
          const dateStr = item.fecha.split('T')[0];
          const [year, month] = dateStr.split('-');
          const itemMonth = `${year}-${month}`;
          return itemMonth === selectedPeriod;
        });
    }
  };

  const getFilteredMonthlyStats = () => {
    const currentYear = new Date().getFullYear();

    switch (selectedPeriod) {
      case 'ytd':
        return monthlyStats.filter(stat => {
          const [year] = stat.mes.split('-');
          return parseInt(year) === currentYear;
        });
      case 'all':
        return monthlyStats;
      default:
        return monthlyStats.filter(stat => stat.mes === selectedPeriod);
    }
  };

  const getPeriodDisplayName = () => {
    switch (selectedPeriod) {
      case 'ytd':
        return `Año a la Fecha (${new Date().getFullYear()})`;
      case 'all':
        return 'Todos los Meses';
      default:
        const [year, month] = selectedPeriod.split('-');
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    }
  };

  const calculatePeriodTotals = () => {
    const filteredStats = getFilteredMonthlyStats();

    if (filteredStats.length === 0) return null;

    return {
      agua_testigo_total: filteredStats.reduce((sum, stat) => sum + stat.agua_testigo_total, 0),
      agua_municipal_total: filteredStats.reduce((sum, stat) => sum + stat.agua_municipal_total, 0),
      agua_desaladora_total: filteredStats.reduce((sum, stat) => sum + stat.agua_desaladora_total, 0),
      agua_total_hotel: filteredStats.reduce((sum, stat) => sum + stat.agua_total_hotel, 0),
      gas_total: filteredStats.reduce((sum, stat) => sum + stat.gas_total, 0),
      electricidad_total: filteredStats.reduce((sum, stat) => sum + stat.electricidad_total, 0),
      total_pax: filteredStats.reduce((sum, stat) => sum + stat.total_pax, 0),
      total_habitaciones: filteredStats.reduce((sum, stat) => sum + stat.total_habitaciones, 0),
      demanda_maxima: Math.max(...filteredStats.map(stat => Math.max(
        stat.demanda_base_max,
        stat.demanda_intermedio_max,
        stat.demanda_punta_max
      )))
    };
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const filteredConsumptions = getFilteredConsumptions();
  const periodTotals = calculatePeriodTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Calculando consumos...</p>
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
          <p className="text-slate-800 font-semibold mb-2">No se pudieron cargar los datos</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <EnergyNavigation
          title="Dashboard de Consumos"
          description="Análisis detallado de consumos energéticos - Secrets Puerto Los Cabos"
          currentSection="dashboard"
        />

        {/* Period Selector */}
        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Período de análisis:</span>
            </div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los Meses</option>
              <option value="ytd">Año a la Fecha</option>
              <optgroup label="Meses Individuales">
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {(() => {
                      const [year, monthNum] = month.split('-');
                      return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
                    })()}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Estadísticas Principales */}
        {periodTotals && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Droplets className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Agua Total Hotel</h3>
                </div>
                <p className="text-3xl font-bold text-blue-600 mb-2">
                  {formatNumber(periodTotals.agua_total_hotel)}
                </p>
                <p className="text-sm text-slate-600">m³ (Municipal + Desaladora)</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Fuel className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Gas Total</h3>
                </div>
                <p className="text-3xl font-bold text-orange-600 mb-2">
                  {formatNumber(periodTotals.gas_total)}
                </p>
                <p className="text-sm text-slate-600">litros consumidos</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Zap className="w-6 h-6 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Electricidad</h3>
                </div>
                <p className="text-3xl font-bold text-yellow-600 mb-2">
                  {formatNumber(periodTotals.electricidad_total)}
                </p>
                <p className="text-sm text-slate-600">kWh consumidos</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Demanda Máx.</h3>
                </div>
                <p className="text-2xl font-bold text-teal-600 mb-2">
                  {formatNumber(periodTotals.demanda_maxima)}
                </p>
                <p className="text-sm text-slate-600">kW máximos</p>
              </div>
            </div>

            {/* Segunda fila de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Droplets className="w-6 h-6 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Testigo</h3>
                </div>
                <p className="text-3xl font-bold text-slate-600 mb-2">
                  {formatNumber(periodTotals.agua_testigo_total)}
                </p>
                <p className="text-sm text-slate-600">m³ consumidos</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Droplets className="w-6 h-6 text-cyan-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Municipal</h3>
                </div>
                <p className="text-3xl font-bold text-cyan-600 mb-2">
                  {formatNumber(periodTotals.agua_municipal_total)}
                </p>
                <p className="text-sm text-slate-600">m³ (se factura)</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <Droplets className="w-6 h-6 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Desaladora</h3>
                </div>
                <p className="text-3xl font-bold text-teal-600 mb-2">
                  {formatNumber(periodTotals.agua_desaladora_total)}
                </p>
                <p className="text-sm text-slate-600">m³ (sin costo)</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">PAX</h3>
                </div>
                <p className="text-3xl font-bold text-indigo-600 mb-2">
                  {formatNumber(periodTotals.total_pax)}
                </p>
                <p className="text-sm text-slate-600">huéspedes</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <Home className="w-6 h-6 text-pink-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Habitaciones</h3>
                </div>
                <p className="text-3xl font-bold text-pink-600 mb-2">
                  {formatNumber(periodTotals.total_habitaciones)}
                </p>
                <p className="text-sm text-slate-600">ocupadas</p>
              </div>
            </div>
          </>
        )}

        {/* Stats de Sustentabilidad - CONTINÚA EN EL SIGUIENTE BLOQUE */}
        {sustainabilityStats && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900">Indicadores de Sustentabilidad</h3>
              <span className="text-sm text-slate-500">- {getPeriodDisplayName()}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Emisiones de CO2 */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TreePine className="w-5 h-5 text-red-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800">Emisiones CO₂</h4>
                </div>
                <p className="text-2xl font-bold text-red-600 mb-2">
                  {formatNumber(sustainabilityStats.co2_emissions_kg)}
                </p>
                <p className="text-sm text-slate-600">kg CO₂ equivalente</p>
                <div className="mt-3 text-xs text-slate-500">
                  <p>≈ {formatNumber(sustainabilityStats.co2_emissions_kg / 21.77)} árboles necesarios*</p>
                </div>
              </div>

              {/* Tasa de Ocupación */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Home className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800">Ocupación</h4>
                </div>
                <p className="text-2xl font-bold text-indigo-600 mb-2">
                  {formatNumber(sustainabilityStats.occupancy_rate)}%
                </p>
                <p className="text-sm text-slate-600">ocupación promedio</p>
                <div className="mt-3 text-xs text-slate-500">
                  <p className={sustainabilityStats.occupancy_rate >= 70 ? 'text-green-600' :
                    sustainabilityStats.occupancy_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                    {sustainabilityStats.occupancy_rate >= 70 ? '✓ Óptima' :
                     sustainabilityStats.occupancy_rate >= 50 ? '⚠ Moderada' : '⚠ Baja'}
                  </p>
                </div>
              </div>

              {/* Huella por Habitación */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800">Huella por Habitación</h4>
                </div>
                <p className="text-2xl font-bold text-green-600 mb-2">
                  {formatNumber(sustainabilityStats.carbon_footprint_per_room)}
                </p>
                <p className="text-sm text-slate-600">kg CO₂ por habitación</p>
              </div>
            </div>

            {/* Segunda fila de indicadores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {/* Eficiencia Hídrica */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Droplets className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800">Eficiencia Hídrica</h4>
                </div>
                <p className="text-2xl font-bold text-blue-600 mb-2">
                  {formatNumber(sustainabilityStats.water_efficiency_per_guest)}
                </p>
                <p className="text-sm text-slate-600">m³ por huésped (Hotel)</p>
                <div className="mt-3 text-xs text-slate-500">
                  <p className={sustainabilityStats.water_efficiency_per_guest <= 0.5 ? 'text-green-600' :
                    sustainabilityStats.water_efficiency_per_guest <= 1.0 ? 'text-yellow-600' : 'text-red-600'}>
                    {sustainabilityStats.water_efficiency_per_guest <= 0.5 ? '✓ Excelente' :
                     sustainabilityStats.water_efficiency_per_guest <= 1.0 ? '⚠ Bueno' : '⚠ Mejorable'}
                  </p>
                </div>
              </div>

              {/* Eficiencia Energética */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Zap className="w-5 h-5 text-yellow-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800">Eficiencia Energética</h4>
                </div>
                <p className="text-2xl font-bold text-yellow-600 mb-2">
                  {formatNumber(sustainabilityStats.energy_efficiency_per_guest)}
                </p>
                <p className="text-sm text-slate-600">kWh por huésped</p>
                <div className="mt-3 text-xs text-slate-500">
                  <p className={sustainabilityStats.energy_efficiency_per_guest <= 50 ? 'text-green-600' : 'text-yellow-600'}>
                    {sustainabilityStats.energy_efficiency_per_guest <= 50 ? '✓ Eficiente' : '⚠ Promedio'}
                  </p>
                </div>
              </div>

              {/* Eficiencia de Gas */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Fuel className="w-5 h-5 text-orange-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800">Eficiencia de Gas</h4>
                </div>
                <p className="text-2xl font-bold text-orange-600 mb-2">
                  {formatNumber(sustainabilityStats.gas_efficiency_per_guest)}
                </p>
                <p className="text-sm text-slate-600">litros por huésped</p>
                <div className="mt-3 text-xs text-slate-500">
                  <p className={sustainabilityStats.gas_efficiency_per_guest <= 20 ? 'text-green-600' :
                    sustainabilityStats.gas_efficiency_per_guest <= 40 ? 'text-yellow-600' : 'text-red-600'}>
                    {sustainabilityStats.gas_efficiency_per_guest <= 20 ? '✓ Eficiente' :
                     sustainabilityStats.gas_efficiency_per_guest <= 40 ? '⚠ Promedio' : '⚠ Alto consumo'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tercera fila */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Droplets className="w-5 h-5 text-cyan-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800">Agua Municipal</h4>
                </div>
                <p className="text-2xl font-bold text-cyan-600 mb-2">
                  {formatNumber(sustainabilityStats.municipal_water_efficiency_per_guest)}
                </p>
                <p className="text-sm text-slate-600">m³/huésped (Facturada)</p>
              </div>

              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <Droplets className="w-5 h-5 text-teal-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800">Desaladora</h4>
                </div>
                <p className="text-2xl font-bold text-teal-600 mb-2">
                  {formatNumber(sustainabilityStats.desal_water_efficiency_per_guest)}
                </p>
                <p className="text-sm text-slate-600">m³/huésped (Gratis)</p>
              </div>

              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-6 border border-violet-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <Zap className="w-5 h-5 text-violet-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800">Factor de Potencia</h4>
                </div>
                <p className="text-2xl font-bold text-violet-600 mb-2">
                  {(sustainabilityStats.power_factor * 100).toFixed(2)}%
                </p>
                <p className="text-sm text-slate-600">Eficiencia eléctrica</p>
                <div className="mt-3 text-xs text-slate-500">
                  <p className={sustainabilityStats.power_factor >= 0.95 ? 'text-green-600' :
                    sustainabilityStats.power_factor >= 0.90 ? 'text-yellow-600' : 'text-red-600'}>
                    {sustainabilityStats.power_factor >= 0.95 ? '✓ Bueno (≥95%)' :
                     sustainabilityStats.power_factor >= 0.90 ? '⚠ Aceptable (≥90%)' : '⚠ Deficiente (<90%)'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">
                <strong>Nota:</strong> *Cálculo basado en que un árbol absorbe aprox. 21.77 kg de CO₂ por año.
                Los factores de emisión utilizados son: Agua 0.298 kg CO₂/m³, Gas LP 2.3 kg CO₂/L, Electricidad 0.458 kg CO₂/kWh.
                Las clasificaciones están basadas en estándares internacionales para la industria hotelera.
              </p>
            </div>
          </div>
        )}

        {/* Niveles de Tanques de Gas - Solo si hay datos */}
        {gasLevelsData && typeof gasLevelsData === 'object' && 'tanque01' in gasLevelsData && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Fuel className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900">
                Niveles de Tanques de Gas - {getPeriodDisplayName()}
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
                      <p className="text-sm text-slate-600">14 tanques × 5,000L</p>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-6 border border-indigo-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Calculator className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h4 className="text-lg font-semibold text-slate-800">Utilización</h4>
                      </div>
                      <p className="text-3xl font-bold text-indigo-600 mb-2">
                        {((totalLiters / maxCapacity) * 100).toFixed(1)}%
                      </p>
                      <p className="text-sm text-slate-600">Del total de capacidad</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-slate-800 mb-4">Detalle por Tanque</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                      {tankValues.map((level, index) => {
                        const safeLevel = level || 0;
                        return (
                          <div key={index} className="bg-white rounded-lg p-4 border border-slate-200 text-center">
                            <div className="text-xs font-medium text-slate-600 mb-2">
                              T{String(index + 1).padStart(2, '0')}
                            </div>

                            <div className="relative w-8 h-16 mx-auto mb-2 bg-slate-200 rounded-lg overflow-hidden">
                              <div
                                className={`absolute bottom-0 left-0 right-0 transition-all duration-300 rounded-lg ${
                                  safeLevel >= 80 ? 'bg-green-500' :
                                  safeLevel >= 50 ? 'bg-yellow-500' :
                                  safeLevel >= 20 ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                                style={{ height: `${Math.min(100, Math.max(0, safeLevel))}%` }}
                              ></div>
                            </div>

                            <div className="text-sm font-bold text-slate-800">
                              {safeLevel.toFixed(1)}%
                            </div>
                            <div className="text-xs text-slate-600">
                              {(safeLevel * 50).toFixed(0)}L
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Tabla de Consumos Diarios */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Consumos Diarios - {getPeriodDisplayName()}
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">PAX</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Habitaciones</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Testigo (m³)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Municipal (m³)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Desaladora (m³)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Hotel (m³)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Gas (L)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Elec. Base (kWh)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Elec. Inter. (kWh)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Elec. Punta (kWh)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Elec. (kWh)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredConsumptions.map((consumption, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                      {formatDate(consumption.fecha)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                      {consumption.pax || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                      {consumption.habitaciones || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 font-medium">
                      {formatNumber(consumption.agua_testigo_consumo)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-cyan-600 font-medium">
                      {formatNumber(consumption.agua_municipal_consumo)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-teal-600 font-medium">
                      {formatNumber(consumption.agua_desaladora_consumo)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-bold">
                      {formatNumber(consumption.agua_total_hotel)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 font-medium">
                      {formatNumber(consumption.gas_consumo)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600 font-medium">
                      {formatNumber(consumption.electricidad_base)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600 font-medium">
                      {formatNumber(consumption.electricidad_intermedio)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600 font-medium">
                      {formatNumber(consumption.electricidad_punta)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-700 font-bold">
                      {formatNumber(consumption.electricidad_base + consumption.electricidad_intermedio + consumption.electricidad_punta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredConsumptions.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500">No hay datos disponibles para el período seleccionado</p>
            </div>
          )}
        </div>

        {/* Demandas Máximas */}
        {periodTotals && getFilteredMonthlyStats().length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Demandas Máximas - {getPeriodDisplayName()}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-slate-700 mb-2">Base</h4>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatNumber(Math.max(...getFilteredMonthlyStats().map(stat => stat.demanda_base_max)))}
                </p>
                <p className="text-sm text-slate-600">kW</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-slate-700 mb-2">Intermedia</h4>
                <p className="text-2xl font-bold text-orange-600">
                  {formatNumber(Math.max(...getFilteredMonthlyStats().map(stat => stat.demanda_intermedio_max)))}
                </p>
                <p className="text-sm text-slate-600">kW</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <h4 className="font-medium text-slate-700 mb-2">Punta</h4>
                <p className="text-2xl font-bold text-red-600">
                  {formatNumber(Math.max(...getFilteredMonthlyStats().map(stat => stat.demanda_punta_max)))}
                </p>
                <p className="text-sm text-slate-600">kW</p>
              </div>
            </div>
          </div>
        )}

        {/* Gráficas Comparativas: Ocupación vs Consumos */}
        {filteredConsumptions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">
                Análisis Comparativo: Ocupación vs Consumos
              </h3>
            </div>

            {/* Si es un mes específico, mostrar gráficas diarias */}
            {selectedPeriod !== 'all' && selectedPeriod !== 'ytd' ? (
              <div className="space-y-8">
                {/* Gráfica Ocupación vs Agua */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-600" />
                    Ocupación vs Consumo de Agua por Día
                  </h4>
                  <div className="relative h-80">
                    <svg className="w-full h-full" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3"/>
                        </linearGradient>
                      </defs>

                      {(() => {
                        const data = filteredConsumptions.slice(-30);
                        if (data.length === 0) return null;

                        const maxWater = Math.max(...data.map(d => d.agua_total_hotel)) || 1;
                        const maxOccupancy = Math.max(...data.map(d => d.habitaciones || 0)) || 1;
                        const width = 900;
                        const height = 300;
                        const paddingLeft = 60;
                        const paddingRight = 60;
                        const paddingTop = 20;
                        const paddingBottom = 40;

                        const waterPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const y = paddingTop + (1 - (item.agua_total_hotel / maxWater)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        const occupancyPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const y = paddingTop + (1 - ((item.habitaciones || 0) / maxOccupancy)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <>
                            {/* Grid */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => (
                              <line key={i}
                                    x1={paddingLeft}
                                    y1={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    x2={width - paddingRight}
                                    y2={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    stroke="#e5e7eb" strokeWidth="1" />
                            ))}

                            {/* Agua línea */}
                            <polyline fill="url(#waterGradient)" stroke="none"
                                      points={`${paddingLeft},${height - paddingBottom} ${waterPoints} ${width - paddingRight},${height - paddingBottom}`}
                                      opacity="0.3" />
                            <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={waterPoints} />

                            {/* Ocupación línea */}
                            <polyline fill="none" stroke="#8b5cf6" strokeWidth="3" points={occupancyPoints} strokeDasharray="5,5" />

                            {/* Ejes */}
                            <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={width - paddingRight} y1={paddingTop} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>

                            {/* Escalas Eje Y Izquierdo (Agua) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxWater * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`left-${i}`}>
                                  <text x={paddingLeft - 10} y={y + 4} fill="#3b82f6" fontSize="11" textAnchor="end" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={paddingLeft - 5} y1={y} x2={paddingLeft} y2={y} stroke="#3b82f6" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Escalas Eje Y Derecho (Habitaciones) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxOccupancy * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`right-${i}`}>
                                  <text x={width - paddingRight + 10} y={y + 4} fill="#8b5cf6" fontSize="11" textAnchor="start" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={width - paddingRight} y1={y} x2={width - paddingRight + 5} y2={y} stroke="#8b5cf6" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Etiquetas Eje X (días) */}
                            {data.filter((_, i) => i % Math.ceil(data.length / 10) === 0).map((item, index, arr) => {
                              const origIndex = data.indexOf(item);
                              const x = paddingLeft + (origIndex / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const day = new Date(item.fecha).getDate();
                              return (
                                <text key={`x-${origIndex}`} x={x} y={height - paddingBottom + 20} fill="#6b7280" fontSize="10" textAnchor="middle">
                                  {day}
                                </text>
                              );
                            })}

                            {/* Labels de ejes */}
                            <text x={paddingLeft - 45} y={height / 2} fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(-90, ${paddingLeft - 45}, ${height / 2})`}>
                              Agua (m³)
                            </text>
                            <text x={width - paddingRight + 45} y={height / 2} fill="#8b5cf6" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(90, ${width - paddingRight + 45}, ${height / 2})`}>
                              Habitaciones
                            </text>
                            <text x={width / 2} y={height - 5} fill="#6b7280" fontSize="12" textAnchor="middle" fontWeight="500">Días del Mes</text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Gráfica Ocupación vs Electricidad */}
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    Ocupación vs Consumo Eléctrico por Día
                  </h4>
                  <div className="relative h-80">
                    <svg className="w-full h-full" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="electricGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8"/>
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3"/>
                        </linearGradient>
                      </defs>

                      {(() => {
                        const data = filteredConsumptions.slice(-30);
                        if (data.length === 0) return null;

                        const maxElectric = Math.max(...data.map(d => d.electricidad_base + d.electricidad_intermedio + d.electricidad_punta)) || 1;
                        const maxOccupancy = Math.max(...data.map(d => d.habitaciones || 0)) || 1;
                        const width = 900;
                        const height = 300;
                        const paddingLeft = 60;
                        const paddingRight = 60;
                        const paddingTop = 20;
                        const paddingBottom = 40;

                        const electricPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const totalElec = item.electricidad_base + item.electricidad_intermedio + item.electricidad_punta;
                          const y = paddingTop + (1 - (totalElec / maxElectric)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        const occupancyPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const y = paddingTop + (1 - ((item.habitaciones || 0) / maxOccupancy)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <>
                            {/* Grid */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => (
                              <line key={i}
                                    x1={paddingLeft}
                                    y1={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    x2={width - paddingRight}
                                    y2={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    stroke="#e5e7eb" strokeWidth="1" />
                            ))}

                            {/* Electricidad línea */}
                            <polyline fill="url(#electricGradient)" stroke="none"
                                      points={`${paddingLeft},${height - paddingBottom} ${electricPoints} ${width - paddingRight},${height - paddingBottom}`}
                                      opacity="0.3" />
                            <polyline fill="none" stroke="#f59e0b" strokeWidth="3" points={electricPoints} />

                            {/* Ocupación línea */}
                            <polyline fill="none" stroke="#8b5cf6" strokeWidth="3" points={occupancyPoints} strokeDasharray="5,5" />

                            {/* Ejes */}
                            <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={width - paddingRight} y1={paddingTop} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>

                            {/* Escalas Eje Y Izquierdo (Electricidad) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxElectric * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`left-${i}`}>
                                  <text x={paddingLeft - 10} y={y + 4} fill="#f59e0b" fontSize="11" textAnchor="end" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={paddingLeft - 5} y1={y} x2={paddingLeft} y2={y} stroke="#f59e0b" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Escalas Eje Y Derecho (Habitaciones) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxOccupancy * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`right-${i}`}>
                                  <text x={width - paddingRight + 10} y={y + 4} fill="#8b5cf6" fontSize="11" textAnchor="start" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={width - paddingRight} y1={y} x2={width - paddingRight + 5} y2={y} stroke="#8b5cf6" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Etiquetas Eje X (días) */}
                            {data.filter((_, i) => i % Math.ceil(data.length / 10) === 0).map((item, index, arr) => {
                              const origIndex = data.indexOf(item);
                              const x = paddingLeft + (origIndex / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const day = new Date(item.fecha).getDate();
                              return (
                                <text key={`x-${origIndex}`} x={x} y={height - paddingBottom + 20} fill="#6b7280" fontSize="10" textAnchor="middle">
                                  {day}
                                </text>
                              );
                            })}

                            {/* Labels de ejes */}
                            <text x={paddingLeft - 45} y={height / 2} fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(-90, ${paddingLeft - 45}, ${height / 2})`}>
                              Electricidad (kWh)
                            </text>
                            <text x={width - paddingRight + 45} y={height / 2} fill="#8b5cf6" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(90, ${width - paddingRight + 45}, ${height / 2})`}>
                              Habitaciones
                            </text>
                            <text x={width / 2} y={height - 5} fill="#6b7280" fontSize="12" textAnchor="middle" fontWeight="500">Días del Mes</text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Gráfica Ocupación vs Gas */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-orange-600" />
                    Ocupación vs Consumo de Gas por Día
                  </h4>
                  <div className="relative h-80">
                    <svg className="w-full h-full" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="gasGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#f97316" stopOpacity="0.8"/>
                          <stop offset="100%" stopColor="#f97316" stopOpacity="0.3"/>
                        </linearGradient>
                      </defs>

                      {(() => {
                        const data = filteredConsumptions.slice(-30);
                        if (data.length === 0) return null;

                        const maxGas = Math.max(...data.map(d => d.gas_consumo)) || 1;
                        const maxOccupancy = Math.max(...data.map(d => d.habitaciones || 0)) || 1;
                        const width = 900;
                        const height = 300;
                        const paddingLeft = 60;
                        const paddingRight = 60;
                        const paddingTop = 20;
                        const paddingBottom = 40;

                        const gasPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const y = paddingTop + (1 - (item.gas_consumo / maxGas)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        const occupancyPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const y = paddingTop + (1 - ((item.habitaciones || 0) / maxOccupancy)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <>
                            {/* Grid */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => (
                              <line key={i}
                                    x1={paddingLeft}
                                    y1={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    x2={width - paddingRight}
                                    y2={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    stroke="#e5e7eb" strokeWidth="1" />
                            ))}

                            {/* Gas línea */}
                            <polyline fill="url(#gasGradient)" stroke="none"
                                      points={`${paddingLeft},${height - paddingBottom} ${gasPoints} ${width - paddingRight},${height - paddingBottom}`}
                                      opacity="0.3" />
                            <polyline fill="none" stroke="#f97316" strokeWidth="3" points={gasPoints} />

                            {/* Ocupación línea */}
                            <polyline fill="none" stroke="#8b5cf6" strokeWidth="3" points={occupancyPoints} strokeDasharray="5,5" />

                            {/* Ejes */}
                            <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={width - paddingRight} y1={paddingTop} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>

                            {/* Escalas Eje Y Izquierdo (Gas) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxGas * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`left-${i}`}>
                                  <text x={paddingLeft - 10} y={y + 4} fill="#f97316" fontSize="11" textAnchor="end" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={paddingLeft - 5} y1={y} x2={paddingLeft} y2={y} stroke="#f97316" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Escalas Eje Y Derecho (Habitaciones) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxOccupancy * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`right-${i}`}>
                                  <text x={width - paddingRight + 10} y={y + 4} fill="#8b5cf6" fontSize="11" textAnchor="start" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={width - paddingRight} y1={y} x2={width - paddingRight + 5} y2={y} stroke="#8b5cf6" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Etiquetas Eje X (días) */}
                            {data.filter((_, i) => i % Math.ceil(data.length / 10) === 0).map((item, index, arr) => {
                              const origIndex = data.indexOf(item);
                              const x = paddingLeft + (origIndex / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const day = new Date(item.fecha).getDate();
                              return (
                                <text key={`x-${origIndex}`} x={x} y={height - paddingBottom + 20} fill="#6b7280" fontSize="10" textAnchor="middle">
                                  {day}
                                </text>
                              );
                            })}

                            {/* Labels de ejes */}
                            <text x={paddingLeft - 45} y={height / 2} fill="#f97316" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(-90, ${paddingLeft - 45}, ${height / 2})`}>
                              Gas (Litros)
                            </text>
                            <text x={width - paddingRight + 45} y={height / 2} fill="#8b5cf6" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(90, ${width - paddingRight + 45}, ${height / 2})`}>
                              Habitaciones
                            </text>
                            <text x={width / 2} y={height - 5} fill="#6b7280" fontSize="12" textAnchor="middle" fontWeight="500">Días del Mes</text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              /* Si son múltiples meses, mostrar gráficas mensuales */
              <div className="space-y-8">
                {/* Gráfica Mensual Ocupación vs Agua */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-600" />
                    Ocupación vs Consumo de Agua por Mes
                  </h4>
                  <div className="relative h-80">
                    <svg className="w-full h-full" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid meet">
                      {(() => {
                        const data = getFilteredMonthlyStats();
                        if (data.length === 0) return null;

                        const maxWater = Math.max(...data.map(d => d.agua_total_hotel)) || 1;
                        const maxRooms = Math.max(...data.map(d => d.total_habitaciones)) || 1;
                        const width = 900;
                        const height = 300;
                        const paddingLeft = 70;
                        const paddingRight = 70;
                        const paddingTop = 20;
                        const paddingBottom = 50;

                        const waterPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const y = paddingTop + (1 - (item.agua_total_hotel / maxWater)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        const roomsPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const y = paddingTop + (1 - (item.total_habitaciones / maxRooms)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <>
                            {/* Grid */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => (
                              <line key={i}
                                    x1={paddingLeft}
                                    y1={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    x2={width - paddingRight}
                                    y2={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    stroke="#e5e7eb" strokeWidth="1" />
                            ))}

                            {/* Agua línea */}
                            <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={waterPoints} />
                            {data.map((item, index) => {
                              const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const y = paddingTop + (1 - (item.agua_total_hotel / maxWater)) * (height - paddingTop - paddingBottom);
                              return <circle key={`w-${index}`} cx={x} cy={y} r="4" fill="#3b82f6" />;
                            })}

                            {/* Habitaciones línea */}
                            <polyline fill="none" stroke="#8b5cf6" strokeWidth="3" points={roomsPoints} strokeDasharray="5,5" />
                            {data.map((item, index) => {
                              const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const y = paddingTop + (1 - (item.total_habitaciones / maxRooms)) * (height - paddingTop - paddingBottom);
                              return <circle key={`r-${index}`} cx={x} cy={y} r="4" fill="#8b5cf6" />;
                            })}

                            {/* Ejes */}
                            <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={width - paddingRight} y1={paddingTop} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>

                            {/* Escalas Eje Y Izquierdo (Agua) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxWater * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`left-${i}`}>
                                  <text x={paddingLeft - 10} y={y + 4} fill="#3b82f6" fontSize="11" textAnchor="end" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={paddingLeft - 5} y1={y} x2={paddingLeft} y2={y} stroke="#3b82f6" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Escalas Eje Y Derecho (Habitaciones) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxRooms * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`right-${i}`}>
                                  <text x={width - paddingRight + 10} y={y + 4} fill="#8b5cf6" fontSize="11" textAnchor="start" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={width - paddingRight} y1={y} x2={width - paddingRight + 5} y2={y} stroke="#8b5cf6" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Labels meses */}
                            {data.map((item, index) => {
                              const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const [year, month] = item.mes.split('-');
                              return (
                                <text key={`l-${index}`} x={x} y={height - paddingBottom + 20} fill="#6b7280" fontSize="10" textAnchor="middle">
                                  {monthNames[parseInt(month) - 1].substring(0, 3)}
                                </text>
                              );
                            })}

                            {/* Labels de ejes */}
                            <text x={paddingLeft - 50} y={height / 2} fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(-90, ${paddingLeft - 50}, ${height / 2})`}>
                              Agua (m³)
                            </text>
                            <text x={width - paddingRight + 50} y={height / 2} fill="#8b5cf6" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(90, ${width - paddingRight + 50}, ${height / 2})`}>
                              Habitaciones
                            </text>
                            <text x={width / 2} y={height - 5} fill="#6b7280" fontSize="12" textAnchor="middle" fontWeight="500">Meses</text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Gráfica Mensual Ocupación vs Electricidad */}
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    Ocupación vs Consumo Eléctrico por Mes
                  </h4>
                  <div className="relative h-80">
                    <svg className="w-full h-full" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid meet">
                      {(() => {
                        const data = getFilteredMonthlyStats();
                        if (data.length === 0) return null;

                        const maxElectric = Math.max(...data.map(d => d.electricidad_total)) || 1;
                        const maxRooms = Math.max(...data.map(d => d.total_habitaciones)) || 1;
                        const width = 900;
                        const height = 300;
                        const paddingLeft = 70;
                        const paddingRight = 70;
                        const paddingTop = 20;
                        const paddingBottom = 50;

                        const electricPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const y = paddingTop + (1 - (item.electricidad_total / maxElectric)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        const roomsPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const y = paddingTop + (1 - (item.total_habitaciones / maxRooms)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <>
                            {/* Grid */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => (
                              <line key={i}
                                    x1={paddingLeft}
                                    y1={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    x2={width - paddingRight}
                                    y2={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    stroke="#e5e7eb" strokeWidth="1" />
                            ))}

                            {/* Electricidad línea */}
                            <polyline fill="none" stroke="#f59e0b" strokeWidth="3" points={electricPoints} />
                            {data.map((item, index) => {
                              const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const y = paddingTop + (1 - (item.electricidad_total / maxElectric)) * (height - paddingTop - paddingBottom);
                              return <circle key={`e-${index}`} cx={x} cy={y} r="4" fill="#f59e0b" />;
                            })}

                            {/* Habitaciones línea */}
                            <polyline fill="none" stroke="#8b5cf6" strokeWidth="3" points={roomsPoints} strokeDasharray="5,5" />
                            {data.map((item, index) => {
                              const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const y = paddingTop + (1 - (item.total_habitaciones / maxRooms)) * (height - paddingTop - paddingBottom);
                              return <circle key={`r-${index}`} cx={x} cy={y} r="4" fill="#8b5cf6" />;
                            })}

                            {/* Ejes */}
                            <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={width - paddingRight} y1={paddingTop} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>

                            {/* Escalas Eje Y Izquierdo (Electricidad) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxElectric * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`left-${i}`}>
                                  <text x={paddingLeft - 10} y={y + 4} fill="#f59e0b" fontSize="11" textAnchor="end" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={paddingLeft - 5} y1={y} x2={paddingLeft} y2={y} stroke="#f59e0b" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Escalas Eje Y Derecho (Habitaciones) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxRooms * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`right-${i}`}>
                                  <text x={width - paddingRight + 10} y={y + 4} fill="#8b5cf6" fontSize="11" textAnchor="start" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={width - paddingRight} y1={y} x2={width - paddingRight + 5} y2={y} stroke="#8b5cf6" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Labels meses */}
                            {data.map((item, index) => {
                              const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const [year, month] = item.mes.split('-');
                              return (
                                <text key={`l-${index}`} x={x} y={height - paddingBottom + 20} fill="#6b7280" fontSize="10" textAnchor="middle">
                                  {monthNames[parseInt(month) - 1].substring(0, 3)}
                                </text>
                              );
                            })}

                            {/* Labels de ejes */}
                            <text x={paddingLeft - 50} y={height / 2} fill="#f59e0b" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(-90, ${paddingLeft - 50}, ${height / 2})`}>
                              Electricidad (kWh)
                            </text>
                            <text x={width - paddingRight + 50} y={height / 2} fill="#8b5cf6" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(90, ${width - paddingRight + 50}, ${height / 2})`}>
                              Habitaciones
                            </text>
                            <text x={width / 2} y={height - 5} fill="#6b7280" fontSize="12" textAnchor="middle" fontWeight="500">Meses</text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Gráfica Mensual Ocupación vs Gas */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-orange-600" />
                    Ocupación vs Consumo de Gas por Mes
                  </h4>
                  <div className="relative h-80">
                    <svg className="w-full h-full" viewBox="0 0 900 300" preserveAspectRatio="xMidYMid meet">
                      {(() => {
                        const data = getFilteredMonthlyStats();
                        if (data.length === 0) return null;

                        const maxGas = Math.max(...data.map(d => d.gas_total)) || 1;
                        const maxRooms = Math.max(...data.map(d => d.total_habitaciones)) || 1;
                        const width = 900;
                        const height = 300;
                        const paddingLeft = 70;
                        const paddingRight = 70;
                        const paddingTop = 20;
                        const paddingBottom = 50;

                        const gasPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const y = paddingTop + (1 - (item.gas_total / maxGas)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        const roomsPoints = data.map((item, index) => {
                          const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                          const y = paddingTop + (1 - (item.total_habitaciones / maxRooms)) * (height - paddingTop - paddingBottom);
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <>
                            {/* Grid */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => (
                              <line key={i}
                                    x1={paddingLeft}
                                    y1={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    x2={width - paddingRight}
                                    y2={paddingTop + (1 - factor) * (height - paddingTop - paddingBottom)}
                                    stroke="#e5e7eb" strokeWidth="1" />
                            ))}

                            {/* Gas línea */}
                            <polyline fill="none" stroke="#f97316" strokeWidth="3" points={gasPoints} />
                            {data.map((item, index) => {
                              const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const y = paddingTop + (1 - (item.gas_total / maxGas)) * (height - paddingTop - paddingBottom);
                              return <circle key={`g-${index}`} cx={x} cy={y} r="4" fill="#f97316" />;
                            })}

                            {/* Habitaciones línea */}
                            <polyline fill="none" stroke="#8b5cf6" strokeWidth="3" points={roomsPoints} strokeDasharray="5,5" />
                            {data.map((item, index) => {
                              const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const y = paddingTop + (1 - (item.total_habitaciones / maxRooms)) * (height - paddingTop - paddingBottom);
                              return <circle key={`r-${index}`} cx={x} cy={y} r="4" fill="#8b5cf6" />;
                            })}

                            {/* Ejes */}
                            <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={width - paddingRight} y1={paddingTop} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>
                            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#6b7280" strokeWidth="2"/>

                            {/* Escalas Eje Y Izquierdo (Gas) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxGas * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`left-${i}`}>
                                  <text x={paddingLeft - 10} y={y + 4} fill="#f97316" fontSize="11" textAnchor="end" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={paddingLeft - 5} y1={y} x2={paddingLeft} y2={y} stroke="#f97316" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Escalas Eje Y Derecho (Habitaciones) */}
                            {[0, 0.25, 0.5, 0.75, 1].map((factor, i) => {
                              const value = (maxRooms * factor).toFixed(0);
                              const y = paddingTop + (1 - factor) * (height - paddingTop - paddingBottom);
                              return (
                                <g key={`right-${i}`}>
                                  <text x={width - paddingRight + 10} y={y + 4} fill="#8b5cf6" fontSize="11" textAnchor="start" fontWeight="500">
                                    {value}
                                  </text>
                                  <line x1={width - paddingRight} y1={y} x2={width - paddingRight + 5} y2={y} stroke="#8b5cf6" strokeWidth="2"/>
                                </g>
                              );
                            })}

                            {/* Labels meses */}
                            {data.map((item, index) => {
                              const x = paddingLeft + (index / (data.length - 1 || 1)) * (width - paddingLeft - paddingRight);
                              const [year, month] = item.mes.split('-');
                              return (
                                <text key={`l-${index}`} x={x} y={height - paddingBottom + 20} fill="#6b7280" fontSize="10" textAnchor="middle">
                                  {monthNames[parseInt(month) - 1].substring(0, 3)}
                                </text>
                              );
                            })}

                            {/* Labels de ejes */}
                            <text x={paddingLeft - 50} y={height / 2} fill="#f97316" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(-90, ${paddingLeft - 50}, ${height / 2})`}>
                              Gas (Litros)
                            </text>
                            <text x={width - paddingRight + 50} y={height / 2} fill="#8b5cf6" fontSize="12" fontWeight="bold" textAnchor="middle" transform={`rotate(90, ${width - paddingRight + 50}, ${height / 2})`}>
                              Habitaciones
                            </text>
                            <text x={width / 2} y={height - 5} fill="#6b7280" fontSize="12" textAnchor="middle" fontWeight="500">Meses</text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Leyenda */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Interpretación:</strong> Las gráficas comparan la relación entre ocupación (habitaciones) y consumos de recursos.
                La línea continua representa el consumo del recurso, mientras que la línea punteada muestra las habitaciones ocupadas.
                Una correlación alta indica que el consumo está directamente relacionado con la ocupación.
                {selectedPeriod !== 'all' && selectedPeriod !== 'ytd'
                  ? ' Los datos son diarios para el mes seleccionado.'
                  : ' Los datos son totales mensuales.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnergyDashboard;
