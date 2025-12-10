import { useState, useEffect } from 'react';
import { X, User, Calendar, FileText } from 'lucide-react';
import { api, Supervisor } from '../lib/api';

interface AssignWorkingOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (supervisorId: number, note: string, fecha: string) => Promise<void>;
  roomNumber?: number;
  summary?: string;
}

export default function AssignWorkingOrderModal({
  isOpen,
  onClose,
  onAssign,
  roomNumber,
  summary
}: AssignWorkingOrderModalProps) {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSupervisors();
      setSelectedSupervisorId(null);
      setNote('');
      setFecha(new Date().toISOString().slice(0, 10));
    }
  }, [isOpen]);

  const loadSupervisors = async () => {
    try {
      const data = await api.getSupervisors();
      setSupervisors(data.filter(s => s.is_active));
    } catch (error) {
      console.error('Error loading supervisors:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupervisorId) {
      alert('Selecciona un supervisor');
      return;
    }

    setLoading(true);
    try {
      await onAssign(selectedSupervisorId, note, fecha);
      onClose();
    } catch (error) {
      console.error('Error assigning working order:', error);
      alert('Error al asignar la orden de trabajo');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Asignar Working Order</h2>
            {roomNumber && summary && (
              <p className="text-sm text-slate-600 mt-1">
                Hab {roomNumber} - {summary}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Supervisor *
            </label>
            <select
              value={selectedSupervisorId || ''}
              onChange={(e) => setSelectedSupervisorId(Number(e.target.value))}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar supervisor...</option>
              {supervisors.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha de la Tarea
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Nota / Instrucciones
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Agrega instrucciones o notas para el supervisor..."
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Se creará una tarea ligada a esta Working Order. El supervisor recibirá la notificación y podrá gestionar ambos registros de forma sincronizada.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedSupervisorId}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Asignando...' : 'Asignar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
