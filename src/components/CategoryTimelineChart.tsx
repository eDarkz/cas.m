import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface TimelineData {
  date: string;
  count: number;
}

interface CategoryTimelineChartProps {
  data: TimelineData[];
  categoryName: string;
}

export default function CategoryTimelineChart({ data, categoryName }: CategoryTimelineChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border-2 border-blue-500 rounded-lg shadow-xl p-3">
          <p className="text-xs font-medium text-slate-600 mb-1">
            {new Date(data.date).toLocaleDateString('es-MX', {
              weekday: 'short',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p className="text-lg font-bold text-blue-600">
            {data.count} {data.count === 1 ? 'caso' : 'casos'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="ml-11 mt-4 p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border-2 border-slate-200 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-bold text-base text-slate-900">
            Evolución Temporal de "{categoryName}"
          </h4>
          <p className="text-sm text-slate-600 mt-1">
            Tendencia de aparición a lo largo del tiempo
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {data.reduce((sum, d) => sum + d.count, 0)}
          </div>
          <div className="text-xs text-slate-600">Total casos</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="displayDate"
            stroke="#64748b"
            style={{ fontSize: '12px', fontWeight: 500 }}
            tick={{ fill: '#64748b' }}
          />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px', fontWeight: 500 }}
            tick={{ fill: '#64748b' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorCount)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {data.map((point, i) => (
          <div
            key={i}
            className="bg-white border-2 border-blue-200 rounded-lg p-3 hover:shadow-md hover:border-blue-400 transition-all"
          >
            <div className="text-xs font-medium text-slate-600 mb-1">
              {new Date(point.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
            </div>
            <div className="text-xl font-bold text-blue-600">{point.count}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 p-4 bg-blue-100 border border-blue-300 rounded-lg">
        <div className="flex-1">
          <div className="text-xs font-medium text-blue-800 mb-1">Promedio Diario</div>
          <div className="text-lg font-bold text-blue-900">
            {(data.reduce((sum, d) => sum + d.count, 0) / data.length).toFixed(1)} casos
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-blue-800 mb-1">Día Pico</div>
          <div className="text-lg font-bold text-blue-900">
            {Math.max(...data.map(d => d.count))} casos
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs font-medium text-blue-800 mb-1">Período</div>
          <div className="text-sm font-bold text-blue-900">
            {data.length} {data.length === 1 ? 'día' : 'días'}
          </div>
        </div>
      </div>
    </div>
  );
}
