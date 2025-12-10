import { useEffect, useState } from 'react';
import { X, Clock, AlertCircle, TrendingUp, Hash } from 'lucide-react';
import { WorkingOrderListItem } from '../lib/workingOrders';

interface RoomAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomNumber: number;
  orders: WorkingOrderListItem[];
}

export default function RoomAnalyticsModal({
  isOpen,
  onClose,
  roomNumber,
  orders
}: RoomAnalyticsModalProps) {
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [severityStats, setSeverityStats] = useState<Record<string, number>>({});
  const [recentOrders, setRecentOrders] = useState<WorkingOrderListItem[]>([]);

  useEffect(() => {
    if (isOpen && orders.length > 0) {
      analyzeData();
    }
  }, [isOpen, orders]);

  const analyzeData = () => {
    const catStats: Record<string, number> = {};
    const sevStats: Record<string, number> = {};

    orders.forEach(order => {
      if (order.category) {
        catStats[order.category] = (catStats[order.category] || 0) + 1;
      }
      sevStats[order.severity] = (sevStats[order.severity] || 0) + 1;
    });

    setCategoryStats(catStats);
    setSeverityStats(sevStats);
    setRecentOrders(orders.slice(0, 5));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'text-emerald-600 bg-emerald-50';
      case 'MEDIUM': return 'text-blue-600 bg-blue-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      'LOW': 'Baja',
      'MEDIUM': 'Media',
      'HIGH': 'Alta',
      'CRITICAL': 'Crítica'
    };
    return labels[severity] || severity;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Habitación {roomNumber}</h2>
            <p className="text-blue-100 mt-1">{orders.length} Working Orders registradas</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-bold text-slate-900">Total de Reportes</h3>
              </div>
              <div className="text-4xl font-bold text-red-600">{orders.length}</div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900">Estado Resueltos</h3>
              </div>
              <div className="text-4xl font-bold text-blue-600">
                {orders.filter(o => o.status === 'RESOLVED').length}
              </div>
            </div>
          </div>

          {Object.keys(categoryStats).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5 text-slate-600" />
                Problemas por Categoría
              </h3>
              <div className="space-y-2">
                {Object.entries(categoryStats)
                  .sort(([,a], [,b]) => b - a)
                  .map(([category, count]) => {
                    const percentage = (count / orders.length) * 100;
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{category}</span>
                          <span className="text-slate-600">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-lg mb-4">Distribución por Severidad</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(severityStats).map(([severity, count]) => (
                <div
                  key={severity}
                  className={`p-4 rounded-lg border ${getSeverityColor(severity)}`}
                >
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm font-medium">{getSeverityLabel(severity)}</div>
                </div>
              ))}
            </div>
          </div>

          {recentOrders.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                Últimos Reportes
              </h3>
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-slate-900 mb-1">
                          {order.summary}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>
                            {new Date(order.created_at).toLocaleDateString('es-MX', {
                              timeZone: 'America/Mazatlan',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          {order.category && (
                            <span className="px-2 py-0.5 bg-slate-200 rounded text-slate-700">
                              {order.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(order.severity)}`}>
                        {getSeverityLabel(order.severity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
