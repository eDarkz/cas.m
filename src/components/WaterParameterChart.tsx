import { useEffect, useState } from 'react';
import { api, WaterParameter, AmenityLimit } from '../lib/api';
import HamsterLoader from './HamsterLoader';
import { adjustDateFromDB } from '../lib/utils';

interface WaterParameterChartProps {
  elementId: string;
  parameter: WaterParameter;
  timeRange: TimeRange;
  customFrom?: string;
  customTo?: string;
  limits?: AmenityLimit[];
}

interface DataPoint {
  sampled_at: string;
  value: number | null;
}

export type TimeRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'all' | 'custom';

const PARAMETER_INFO: Record<WaterParameter, { label: string; unit: string; min?: number; max?: number; ideal?: [number, number] }> = {
  ph: { label: 'pH', unit: '', min: 6, max: 9, ideal: [7.2, 7.6] },
  cloro_libre: { label: 'Cloro Libre', unit: 'ppm', min: 0, max: 5, ideal: [1.0, 3.0] },
  cloro_total: { label: 'Cloro Total', unit: 'ppm', min: 0, max: 6 },
  cloraminas: { label: 'Cloraminas', unit: 'ppm', min: 0, max: 3 },
  acidoiso: { label: 'Ácido Isocianúrico', unit: 'ppm', min: 0, max: 100, ideal: [30, 50] },
  alcalinidad: { label: 'Alcalinidad', unit: 'ppm', min: 0, max: 300, ideal: [80, 120] },
  temperatura: { label: 'Temperatura', unit: '°C', min: 20, max: 35 },
  turbidez: { label: 'Turbidez', unit: 'NTU', min: 0, max: 5 },
  sdt: { label: 'TDS', unit: 'mg/L', min: 0, max: 2000 },
  conductividad: { label: 'Conductividad', unit: 'µS/cm', min: 0, max: 3000 },
  lsi: { label: 'LSI', unit: '', min: -2, max: 2, ideal: [-0.3, 0.3] },
  rsi: { label: 'RSI', unit: '', min: 4, max: 10, ideal: [6.8, 8.5] },
  dureza_calcio: { label: 'Dureza Calcio', unit: 'ppm', min: 0, max: 500 },
  fe: { label: 'Hierro', unit: 'mg/L', min: 0, max: 1 },
  cu: { label: 'Cobre', unit: 'mg/L', min: 0, max: 1 },
  nitritos: { label: 'Nitritos', unit: 'mg/L', min: 0, max: 1 },
  zinc: { label: 'Zinc', unit: 'mg/L', min: 0, max: 5 },
  t3dt22: { label: 'T3DT22', unit: '', min: 0, max: 100 },
  oxigeno_disuelto: { label: 'Oxígeno Disuelto', unit: 'mg/L', min: 0, max: 15, ideal: [5, 8] },
  ivl: { label: 'IVL', unit: 'mL/g', min: 0, max: 200, ideal: [50, 150] },
};

export default function WaterParameterChart({ elementId, parameter, timeRange, customFrom, customTo, limits }: WaterParameterChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [elementId, parameter, timeRange, customFrom, customTo]);

  const getDateRange = () => {
    const now = new Date();
    let from: string | undefined;
    let to: string | undefined;

    switch (timeRange) {
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '6m':
        from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1y':
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'custom':
        from = customFrom || undefined;
        to = customTo || undefined;
        break;
      case 'all':
      default:
        break;
    }

    return { from, to };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange();
      const response = await api.getWaterTimeseries({
        element_id: elementId,
        param: parameter,
        from,
        to,
        limit: 2000,
      });
      setData(response.data);
    } catch (error) {
      console.error('Error loading timeseries:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HamsterLoader />
      </div>
    );
  }

  const validData = data.filter(d => d.value != null) as Array<{ sampled_at: string; value: number }>;

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No hay datos suficientes para mostrar la gráfica
      </div>
    );
  }

  const info = PARAMETER_INFO[parameter] || { label: parameter, unit: '', min: 0, max: 100 };

  const limit = limits?.find(l => l.param_key === parameter);
  const idealRange: [number, number] | undefined = limit && limit.min_value != null && limit.max_value != null
    ? [limit.min_value, limit.max_value]
    : info.ideal;

  const values = validData.map(d => d.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  const yMin = info.min !== undefined ? Math.min(info.min, Math.floor(dataMin * 0.9)) : Math.floor(dataMin * 0.9);
  const yMax = info.max !== undefined ? Math.max(info.max, Math.ceil(dataMax * 1.1)) : Math.ceil(dataMax * 1.1);
  const yRange = yMax - yMin;

  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xScale = (index: number) => padding.left + (index / (validData.length - 1 || 1)) * chartWidth;
  const yScale = (value: number) => padding.top + chartHeight - ((value - yMin) / yRange) * chartHeight;

  const pathData = validData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`)
    .join(' ');

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yRange / yTicks) * i);

  const showEveryNth = Math.ceil(validData.length / 8);

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          {idealRange && (
            <pattern id="idealZone" patternUnits="userSpaceOnUse" width="8" height="8">
              <rect width="8" height="8" fill="rgba(34, 197, 94, 0.05)" />
              <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="rgba(34, 197, 94, 0.2)" strokeWidth="0.5" />
            </pattern>
          )}
        </defs>

        {idealRange && (
          <rect
            x={padding.left}
            y={yScale(idealRange[1])}
            width={chartWidth}
            height={yScale(idealRange[0]) - yScale(idealRange[1])}
            fill="url(#idealZone)"
          />
        )}

        {yTickValues.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={yScale(tick)}
              x2={padding.left + chartWidth}
              y2={yScale(tick)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs fill-gray-600"
            >
              {tick.toFixed(parameter === 'ph' || parameter === 'lsi' || parameter === 'rsi' ? 1 : 0)}
            </text>
          </g>
        ))}

        <path
          d={pathData}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {validData.map((d, i) => (
          <g key={i}>
            <circle
              cx={xScale(i)}
              cy={yScale(d.value)}
              r="4"
              fill="#06b6d4"
              stroke="white"
              strokeWidth="2"
            />
            {i % showEveryNth === 0 && (
              <text
                x={xScale(i)}
                y={height - padding.bottom + 15}
                textAnchor="middle"
                className="text-xs fill-gray-600"
                transform={`rotate(-45 ${xScale(i)} ${height - padding.bottom + 15})`}
              >
                {adjustDateFromDB(d.sampled_at).toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan', month: 'short', day: 'numeric' })}
              </text>
            )}
          </g>
        ))}

        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="#94a3b8"
          strokeWidth="2"
        />
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="#94a3b8"
          strokeWidth="2"
        />

        <text
          x={padding.left - 45}
          y={padding.top + chartHeight / 2}
          textAnchor="middle"
          className="text-sm font-semibold fill-gray-700"
          transform={`rotate(-90 ${padding.left - 45} ${padding.top + chartHeight / 2})`}
        >
          {info.label} {info.unit && `(${info.unit})`}
        </text>
      </svg>

      <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
          <span>Lecturas</span>
        </div>
        {idealRange && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-4 bg-green-100 border border-green-300"></div>
            <span>Rango ideal: {idealRange[0]}-{idealRange[1]} {info.unit}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-semibold">Total de muestras:</span>
          <span>{validData.length}</span>
        </div>
      </div>
    </div>
  );
}
