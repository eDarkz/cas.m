import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Trash2,
  Lock,
  Unlock,
} from 'lucide-react';
import { fumigationApi, FumigationCycle, CycleStatus } from '../lib/fumigationApi';
import FumigationNavigation from '../components/FumigationNavigation';
import CreateFumigationCycleModal from '../components/CreateFumigationCycleModal';

const STATUS_STYLES: Record<CycleStatus, { bg: string; text: string; icon: typeof Lock }> = {
  ABIERTO: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: Unlock },
  CERRADO: { bg: 'bg-stone-100', text: 'text-stone-600', icon: Lock },
};

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 6 }, (_, i) => currentYear + i);

export default function FumigacionHabitaciones() {
  const [cycles, setCycles] = useState<FumigationCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<CycleStatus | ''>('');
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadCycles = async () => {
    setLoading(true);
    try {
      const data = await fumigationApi.getCycles({
        status: filterStatus || undefined,
        year: filterYear,
      });
      setCycles(data);
    } catch (error) {
      console.error('Error loading cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCycles();
  }, [filterStatus, filterYear]);

  const handleDeleteCycle = async (cycle: FumigationCycle) => {
    if (!confirm(`¿Eliminar el ciclo "${cycle.label}"? Se eliminaran todas las fumigaciones asociadas.`)) {
      return;
    }
    try {
      await fumigationApi.deleteCycle(cycle.id);
      loadCycles();
    } catch (error) {
      console.error('Error deleting cycle:', error);
      alert('Error al eliminar el ciclo');
    }
  };

  const handleToggleStatus = async (cycle: FumigationCycle) => {
    const newStatus: CycleStatus = cycle.status === 'ABIERTO' ? 'CERRADO' : 'ABIERTO';
    try {
      await fumigationApi.updateCycle(cycle.id, { status: newStatus });
      loadCycles();
    } catch (error) {
      console.error('Error updating cycle status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getProgressPercent = (cycle: FumigationCycle) => {
    if (cycle.total_rooms === 0) return 0;
    return Math.round((cycle.completed_rooms / cycle.total_rooms) * 100);
  };

  const stats = {
    total: cycles.length,
    open: cycles.filter((c) => c.status === 'ABIERTO').length,
    closed: cycles.filter((c) => c.status === 'CERRADO').length,
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <FumigationNavigation />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <Home className="w-7 h-7 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Ciclos de Fumigacion
                </h1>
                <p className="text-gray-500">
                  Gestion mensual de fumigacion de habitaciones
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Nuevo Ciclo
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total ciclos</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-green-600">{stats.open}</div>
            <div className="text-sm text-gray-500">Abiertos</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-600">{stats.closed}</div>
            <div className="text-sm text-gray-500">Cerrados</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                <h2 className="font-semibold text-gray-900">Ciclos Mensuales</h2>
                <span className="text-sm text-gray-500">({cycles.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-medium"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as CycleStatus | '')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="ABIERTO">Abiertos</option>
                  <option value="CERRADO">Cerrados</option>
                </select>
                <button
                  onClick={loadCycles}
                  className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  title="Recargar"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {loading && cycles.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
              <span className="text-gray-600">Cargando ciclos...</span>
            </div>
          ) : cycles.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay ciclos en {filterYear}</p>
              <p className="text-xs mt-1">Seleccione otro ano o cree un nuevo ciclo</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-3 text-teal-600 hover:text-teal-700 font-medium"
              >
                Crear ciclo para {filterYear}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cycles.map((cycle) => {
                const progress = getProgressPercent(cycle);
                const statusStyle = STATUS_STYLES[cycle.status];
                const StatusIcon = statusStyle.icon;

                return (
                  <div
                    key={cycle.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <Link
                        to={`/fumigacion/ciclo/${cycle.id}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {cycle.status}
                          </div>
                          <span className="font-bold text-gray-900 text-lg">
                            {cycle.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(cycle.period_start)} - {formatDate(cycle.period_end)}
                          </span>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Progreso</span>
                            <span className="font-medium">
                              {cycle.completed_rooms} / {cycle.total_rooms} habitaciones
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                progress === 100
                                  ? 'bg-green-500'
                                  : progress > 50
                                  ? 'bg-teal-500'
                                  : progress > 0
                                  ? 'bg-amber-500'
                                  : 'bg-gray-300'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs">
                            <span className="text-gray-400">{progress}% completado</span>
                            {cycle.pending_rooms > 0 && (
                              <span className="text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {cycle.pending_rooms} pendientes
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(cycle)}
                          className={`p-2 rounded-lg transition-colors ${
                            cycle.status === 'ABIERTO'
                              ? 'text-gray-600 hover:bg-gray-100'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={cycle.status === 'ABIERTO' ? 'Cerrar ciclo' : 'Abrir ciclo'}
                        >
                          {cycle.status === 'ABIERTO' ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteCycle(cycle)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/fumigacion/ciclo/${cycle.id}`}
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateFumigationCycleModal
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            loadCycles();
          }}
        />
      )}
    </div>
  );
}
