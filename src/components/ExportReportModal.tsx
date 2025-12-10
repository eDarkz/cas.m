import { useState } from 'react';
import { X, FileText } from 'lucide-react';

interface ExportReportModalProps {
  onClose: () => void;
  onExport: (filters: ExportFilters) => void;
  isLoading?: boolean;
  loadingProgress?: number;
  loadingMessage?: string;
}

export interface ExportFilters {
  includePending: boolean;
  includeInProgress: boolean;
  includeCompleted: boolean;
  dateRange: 'today' | 'week' | 'month' | 'all' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

export default function ExportReportModal({ onClose, onExport, isLoading, loadingProgress, loadingMessage }: ExportReportModalProps) {
  const [filters, setFilters] = useState<ExportFilters>({
    includePending: true,
    includeInProgress: true,
    includeCompleted: true,
    dateRange: 'all',
  });
  const [showCustomDates, setShowCustomDates] = useState(false);

  const handleDateRangeChange = (range: ExportFilters['dateRange']) => {
    setFilters({ ...filters, dateRange: range });
    setShowCustomDates(range === 'custom');
  };

  const handleExport = () => {
    if (!filters.includePending && !filters.includeInProgress && !filters.includeCompleted) {
      alert('Debes seleccionar al menos un estado para exportar');
      return;
    }

    if (filters.dateRange === 'custom' && (!filters.customStartDate || !filters.customEndDate)) {
      alert('Debes seleccionar las fechas de inicio y fin');
      return;
    }

    onExport(filters);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-600" />
            <h3 className="text-xl font-bold text-gray-800">
              {isLoading ? 'Generando Reporte...' : 'Exportar Reporte'}
            </h3>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {isLoading && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{loadingMessage || 'Cargando datos...'}</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress || 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{Math.round(loadingProgress || 0)}% completado</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Por favor espera mientras cargamos los detalles de las notas...
            </p>
          </div>
        )}

        {!isLoading && (
          <>
            <div className="p-6 space-y-6">
              <div>
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-sm">1</span>
              Estados a incluir
            </h4>
            <div className="space-y-2 ml-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.includePending}
                  onChange={(e) => setFilters({ ...filters, includePending: e.target.checked })}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-gray-700">Pendientes</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Estado 0</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.includeInProgress}
                  onChange={(e) => setFilters({ ...filters, includeInProgress: e.target.checked })}
                  className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                />
                <span className="text-gray-700">En Proceso</span>
                <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">Estado 1</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.includeCompleted}
                  onChange={(e) => setFilters({ ...filters, includeCompleted: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-gray-700">Terminadas</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Estado 2</span>
              </label>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-sm">2</span>
              Período de tiempo
            </h4>
            <div className="space-y-2 ml-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateRange"
                  checked={filters.dateRange === 'today'}
                  onChange={() => handleDateRangeChange('today')}
                  className="w-4 h-4 text-cyan-600 border-gray-300 focus:ring-cyan-500"
                />
                <span className="text-gray-700">Hoy</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateRange"
                  checked={filters.dateRange === 'week'}
                  onChange={() => handleDateRangeChange('week')}
                  className="w-4 h-4 text-cyan-600 border-gray-300 focus:ring-cyan-500"
                />
                <span className="text-gray-700">Última semana</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateRange"
                  checked={filters.dateRange === 'month'}
                  onChange={() => handleDateRangeChange('month')}
                  className="w-4 h-4 text-cyan-600 border-gray-300 focus:ring-cyan-500"
                />
                <span className="text-gray-700">Último mes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateRange"
                  checked={filters.dateRange === 'all'}
                  onChange={() => handleDateRangeChange('all')}
                  className="w-4 h-4 text-cyan-600 border-gray-300 focus:ring-cyan-500"
                />
                <span className="text-gray-700">Todas las fechas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateRange"
                  checked={filters.dateRange === 'custom'}
                  onChange={() => handleDateRangeChange('custom')}
                  className="w-4 h-4 text-cyan-600 border-gray-300 focus:ring-cyan-500"
                />
                <span className="text-gray-700">Personalizado</span>
              </label>

              {showCustomDates && (
                <div className="ml-6 mt-3 space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de inicio
                    </label>
                    <input
                      type="date"
                      value={filters.customStartDate || ''}
                      onChange={(e) => setFilters({ ...filters, customStartDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de fin
                    </label>
                    <input
                      type="date"
                      value={filters.customEndDate || ''}
                      onChange={(e) => setFilters({ ...filters, customEndDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              )}
              </div>
            </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleExport}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-5 h-5" />
                Generar Reporte
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
