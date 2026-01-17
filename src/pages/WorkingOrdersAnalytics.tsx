import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workingOrdersAPI, HeatmapDataPoint, WorkingOrderListItem } from '../lib/workingOrders';
import { ArrowLeft, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Package, Calendar, CalendarDays } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import RoomAnalyticsModal from '../components/RoomAnalyticsModal';
import WordCloudAnalytics from '../components/WordCloudAnalytics';
import CategoryTimelineChart from '../components/CategoryTimelineChart';

type DateRange = 'last_month' | 'last_3_months' | 'last_6_months' | 'current_year' | 'all_time' | 'custom';

export default function WorkingOrdersAnalytics() {
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState<HeatmapDataPoint[]>([]);
  const [towerData, setTowerData] = useState<HeatmapDataPoint[]>([]);
  const [floorData, setFloorData] = useState<HeatmapDataPoint[]>([]);
  const [allOrders, setAllOrders] = useState<WorkingOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tower' | 'floor' | 'room'>('overview');
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [roomOrders, setRoomOrders] = useState<WorkingOrderListItem[]>([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [categoryStats, setCategoryStats] = useState<Array<{ name: string; count: number; percentage: number }>>([]);
  const [wordCloud, setWordCloud] = useState<Array<{ text: string; count: number }>>([]);
  const [dateRange, setDateRange] = useState<DateRange>('last_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTimeline, setCategoryTimeline] = useState<Array<{ date: string; count: number }>>([]);

  useEffect(() => {
    loadData();
  }, [dateRange, customFrom, customTo]);

  const getDateRangeParams = () => {
    const now = new Date();
    let from: string | undefined;
    let to: string | undefined;

    switch (dateRange) {
      case 'last_month': {
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        from = lastMonth.toISOString().split('T')[0];
        break;
      }
      case 'last_3_months': {
        const last3Months = new Date(now);
        last3Months.setMonth(last3Months.getMonth() - 3);
        from = last3Months.toISOString().split('T')[0];
        break;
      }
      case 'last_6_months': {
        const last6Months = new Date(now);
        last6Months.setMonth(last6Months.getMonth() - 6);
        from = last6Months.toISOString().split('T')[0];
        break;
      }
      case 'current_year': {
        from = `${now.getFullYear()}-01-01`;
        break;
      }
      case 'custom': {
        from = customFrom || undefined;
        to = customTo || undefined;
        break;
      }
      case 'all_time':
      default:
        break;
    }

    return { from, to };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const dateParams = getDateRangeParams();
      const [room, tower, floor, orders] = await Promise.all([
        workingOrdersAPI.getHeatmap({ by: 'room', ...dateParams }),
        workingOrdersAPI.getHeatmap({ by: 'tower', ...dateParams }),
        workingOrdersAPI.getHeatmap({ by: 'floor', ...dateParams }),
        workingOrdersAPI.list({ pageSize: 1000, ...dateParams })
      ]);

      setRoomData(room.data);
      setTowerData(tower.data);
      setFloorData(floor.data);
      setAllOrders(orders.data);

      analyzeCategoryStats(orders.data);
      generateWordCloud(orders.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeCategoryStats = (orders: WorkingOrderListItem[]) => {
    const categoryCount: Record<string, number> = {};
    orders.forEach(order => {
      if (order.category) {
        categoryCount[order.category] = (categoryCount[order.category] || 0) + 1;
      }
    });

    const total = orders.length;
    const stats = Object.entries(categoryCount)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);

    setCategoryStats(stats);
  };

  const generateWordCloud = (orders: WorkingOrderListItem[]) => {
    const wordCount: Record<string, number> = {};
    const stopWords = ['el', 'la', 'de', 'en', 'y', 'a', 'los', 'las', 'un', 'una', 'es', 'por', 'con', 'no', 'se'];

    orders.forEach(order => {
      const words = order.summary.toLowerCase().split(/\s+/);
      words.forEach(word => {
        const cleaned = word.replace(/[^a-záéíóúñ]/g, '');
        if (cleaned.length > 3 && !stopWords.includes(cleaned)) {
          wordCount[cleaned] = (wordCount[cleaned] || 0) + 1;
        }
      });

      if (order.category) {
        wordCount[order.category.toLowerCase()] = (wordCount[order.category.toLowerCase()] || 0) + 1;
      }
    });

    const cloud = Object.entries(wordCount)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    setWordCloud(cloud);
  };

  const handleRoomClick = async (roomNumber: number) => {
    setSelectedRoom(roomNumber);
    const orders = allOrders.filter(o => o.room_number === roomNumber);
    setRoomOrders(orders);
    setShowRoomModal(true);
  };

  const handleCategoryClick = (categoryName: string) => {
    if (selectedCategory === categoryName) {
      setSelectedCategory(null);
      setCategoryTimeline([]);
    } else {
      setSelectedCategory(categoryName);
      generateCategoryTimeline(categoryName);
    }
  };

  const generateCategoryTimeline = (categoryName: string) => {
    const categoryOrders = allOrders.filter(o => o.category === categoryName);
    const dateCount: Record<string, number> = {};

    categoryOrders.forEach(order => {
      const date = order.created_at?.split('T')[0] || 'Sin fecha';
      dateCount[date] = (dateCount[date] || 0) + 1;
    });

    const timeline = Object.entries(dateCount)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setCategoryTimeline(timeline);
  };

  const totalOrders = allOrders.length;
  const resolvedOrders = allOrders.filter(o => o.status === 'RESOLVED').length;
  const openOrders = allOrders.filter(o => o.status === 'OPEN' || o.status === 'ASSIGNED').length;
  const inProgressOrders = allOrders.filter(o => o.status === 'IN_PROGRESS').length;
  const resolutionRate = totalOrders > 0 ? (resolvedOrders / totalOrders) * 100 : 0;

  const topRooms = roomData.slice(0, 10);
  const avgOrdersPerRoom = roomData.length > 0
    ? (roomData.reduce((sum, r) => sum + r.total, 0) / roomData.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <HamsterLoader />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={() => navigate('/working-orders')} className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Analytics Avanzado</h2>
            <p className="text-sm text-slate-600 mt-1">Análisis detallado de Working Orders para mejora continua</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-slate-600" />
          <select
            value={dateRange}
            onChange={(e) => {
              const value = e.target.value as DateRange;
              setDateRange(value);
              setShowCustomDates(value === 'custom');
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-sm"
          >
            <option value="last_month">Último Mes</option>
            <option value="last_3_months">Últimos 3 Meses</option>
            <option value="last_6_months">Últimos 6 Meses</option>
            <option value="current_year">Año Actual</option>
            <option value="all_time">Todo el Tiempo</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
      </div>

      {showCustomDates && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-md p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Desde</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Hasta</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => loadData()}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-medium mt-auto"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-md">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {[
            { key: 'overview', label: 'Resumen General' },
            { key: 'tower', label: 'Por Torre' },
            { key: 'floor', label: 'Por Piso' },
            { key: 'room', label: 'Por Habitación' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-700 text-sm">Total WOs</h3>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{totalOrders}</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-slate-700 text-sm">Resueltas</h3>
                  </div>
                  <div className="text-3xl font-bold text-green-600">{resolvedOrders}</div>
                  <div className="text-xs text-green-700 mt-1">{resolutionRate.toFixed(1)}% tasa</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <h3 className="font-semibold text-slate-700 text-sm">Abiertas</h3>
                  </div>
                  <div className="text-3xl font-bold text-orange-600">{openOrders}</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-slate-700 text-sm">En Progreso</h3>
                  </div>
                  <div className="text-3xl font-bold text-purple-600">{inProgressOrders}</div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-slate-600" />
                  Ranking de Categorías Problemáticas
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Haz clic en una categoría para ver su evolución en el tiempo
                </p>
                <div className="space-y-3">
                  {categoryStats.slice(0, 8).map((cat, index) => (
                    <div key={cat.name} className="space-y-1">
                      <button
                        onClick={() => handleCategoryClick(cat.name)}
                        className={`w-full text-left transition-all ${
                          selectedCategory === cat.name ? 'ring-2 ring-blue-500 rounded-lg' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
                              index === 0 ? 'bg-red-100 text-red-700' :
                              index === 1 ? 'bg-orange-100 text-orange-700' :
                              index === 2 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              #{index + 1}
                            </span>
                            <span className="font-semibold text-slate-900">{cat.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">{cat.count} casos</div>
                            <div className="text-xs text-slate-600">{cat.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      </button>
                      <div className="ml-11">
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              index === 0 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                              index === 1 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                              index === 2 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                              'bg-gradient-to-r from-blue-500 to-cyan-500'
                            }`}
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>

                      {selectedCategory === cat.name && categoryTimeline.length > 0 && (
                        <CategoryTimelineChart data={categoryTimeline} categoryName={cat.name} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-lg mb-4">Nube de Palabras - Problemas Frecuentes</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Visualización de los términos más mencionados en los reportes
                </p>
                <WordCloudAnalytics words={wordCloud} />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  Top 10 Habitaciones con Más Reportes
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {topRooms.map((room) => (
                    <button
                      key={room.room}
                      onClick={() => handleRoomClick(room.room!)}
                      className="p-4 bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                    >
                      <div className="text-2xl font-bold text-slate-900">Hab {room.room}</div>
                      <div className="text-lg font-bold text-red-600">{room.total} WOs</div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Promedio:</strong> {avgOrdersPerRoom} WOs por habitación con reportes
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tower' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Distribución de Working Orders por torre</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {towerData.map((item) => {
                  const intensity = Math.min(item.total * 5, 100);
                  const towerOrders = allOrders.filter(o => {
                    const tower = Math.floor(o.room_number / 1000);
                    return tower === item.tower;
                  });
                  const categoryCount: Record<string, number> = {};
                  towerOrders.forEach(order => {
                    if (order.category) {
                      categoryCount[order.category] = (categoryCount[order.category] || 0) + 1;
                    }
                  });
                  const topCategories = Object.entries(categoryCount)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3);

                  return (
                    <div
                      key={item.tower}
                      className="relative overflow-hidden rounded-xl border-2 border-slate-200 hover:shadow-xl transition-all"
                      style={{
                        background: `linear-gradient(135deg, rgba(239, 68, 68, ${intensity / 100}) 0%, rgba(249, 115, 22, ${intensity / 100}) 100%)`,
                      }}
                    >
                      <div className="relative z-10 p-5">
                        <div className="text-2xl font-bold text-slate-900 mb-1">Torre {item.tower}</div>
                        <div className="text-lg font-bold text-red-700 mb-4">{item.total} WOs</div>

                        {topCategories.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-300/50">
                            <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Top 3 Problemas</h4>
                            <div className="space-y-2">
                              {topCategories.map(([category, count], idx) => (
                                <div key={category} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-800/80 text-white text-xs font-bold">
                                      {idx + 1}
                                    </span>
                                    <span className="font-medium text-slate-900">{category}</span>
                                  </div>
                                  <span className="font-bold text-slate-900">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'floor' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Distribución de Working Orders por piso</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {floorData.map((item) => {
                  const intensity = Math.min(item.total * 5, 100);
                  const floorOrders = allOrders.filter(o => {
                    const floor = Math.floor((o.room_number % 1000) / 100);
                    return floor === item.floor;
                  });
                  const categoryCount: Record<string, number> = {};
                  floorOrders.forEach(order => {
                    if (order.category) {
                      categoryCount[order.category] = (categoryCount[order.category] || 0) + 1;
                    }
                  });
                  const topCategories = Object.entries(categoryCount)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3);

                  return (
                    <div
                      key={item.floor}
                      className="relative overflow-hidden rounded-xl border-2 border-slate-200 hover:shadow-xl transition-all"
                      style={{
                        background: `linear-gradient(135deg, rgba(59, 130, 246, ${intensity / 100}) 0%, rgba(14, 165, 233, ${intensity / 100}) 100%)`,
                      }}
                    >
                      <div className="relative z-10 p-5">
                        <div className="text-xl font-bold text-slate-900 mb-1">Piso {item.floor}</div>
                        <div className="text-lg font-bold text-blue-700 mb-4">{item.total} WOs</div>

                        {topCategories.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-300/50">
                            <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Top 3 Problemas</h4>
                            <div className="space-y-2">
                              {topCategories.map(([category, count], idx) => (
                                <div key={category} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded bg-slate-800/80 text-white text-xs font-bold">
                                      {idx + 1}
                                    </span>
                                    <span className="font-medium text-slate-900">{category}</span>
                                  </div>
                                  <span className="font-bold text-slate-900">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'room' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Click en cualquier habitación para ver el historial detallado
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[600px] overflow-y-auto">
                {roomData.map((item) => (
                  <button
                    key={item.room}
                    onClick={() => handleRoomClick(item.room!)}
                    className={`p-3 border-2 rounded-lg hover:shadow-md transition-all ${
                      item.total > 5
                        ? 'bg-red-50 border-red-300 hover:bg-red-100'
                        : item.total > 3
                        ? 'bg-orange-50 border-orange-300 hover:bg-orange-100'
                        : item.total > 1
                        ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-slate-900">Hab {item.room}</div>
                    <div className={`text-sm font-semibold ${
                      item.total > 5 ? 'text-red-600' :
                      item.total > 3 ? 'text-orange-600' :
                      item.total > 1 ? 'text-yellow-600' :
                      'text-slate-600'
                    }`}>
                      {item.total} WOs
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showRoomModal && selectedRoom && (
        <RoomAnalyticsModal
          isOpen={showRoomModal}
          onClose={() => setShowRoomModal(false)}
          roomNumber={selectedRoom}
          orders={roomOrders}
        />
      )}
    </div>
  );
}
