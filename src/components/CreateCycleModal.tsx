import { useState } from 'react';
import { inspectionsApi, InspectionCycle } from '../lib/inspections-api';
import { X, Calendar, AlertCircle } from 'lucide-react';

interface CreateCycleModalProps {
  onClose: () => void;
  onSuccess: () => void;
  existingCycles: InspectionCycle[];
}

export default function CreateCycleModal({ onClose, onSuccess, existingCycles }: CreateCycleModalProps) {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [copyFromCycleId, setCopyFromCycleId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMonthName = (m: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[m - 1];
  };

  const cycleExists = existingCycles.some(c => c.year === year && c.month === month);

  const previousCycles = existingCycles
    .filter(c => {
      const cycleDate = new Date(c.year, c.month - 1);
      const selectedDate = new Date(year, month - 1);
      return cycleDate < selectedDate;
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cycleExists) {
      setError(`Ya existe un ciclo para ${getMonthName(month)} ${year}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nombre = `Ciclo ${year}-${month.toString().padStart(2, '0')}`;
      await inspectionsApi.createCycle({
        nombre,
        year,
        month,
        copyPendingFromCycleId: copyFromCycleId,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al crear el ciclo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-white" />
            <h3 className="text-xl font-bold text-white">Crear Nuevo Ciclo Mensual</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-cyan-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{getMonthName(m)}</option>
                ))}
              </select>
            </div>
          </div>

          {cycleExists && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Ya existe un ciclo para este mes</p>
                <p>Selecciona otro período para crear un nuevo ciclo.</p>
              </div>
            </div>
          )}

          {previousCycles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arrastrar pendientes de ciclo anterior (opcional)
              </label>
              <select
                value={copyFromCycleId || ''}
                onChange={(e) => setCopyFromCycleId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">No arrastrar pendientes</option>
                {previousCycles.map(cycle => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.nombre} ({getMonthName(cycle.month)} {cycle.year})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Los pendientes sin resolver del ciclo seleccionado se copiarán al nuevo ciclo
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Vista previa</h4>
            <p className="text-blue-800">
              <span className="font-medium">Nombre del ciclo:</span> Ciclo {year}-{month.toString().padStart(2, '0')}
            </p>
            <p className="text-blue-800 mt-1">
              <span className="font-medium">Período:</span> {getMonthName(month)} {year}
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || cycleExists}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Creando...' : 'Crear Ciclo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
