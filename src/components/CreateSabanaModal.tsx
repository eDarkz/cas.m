import { useState } from 'react';
import { api, Supervisor } from '../lib/api';
import { X } from 'lucide-react';
import { getToday } from '../lib/utils';

interface CreateSabanaModalProps {
  supervisors: Supervisor[];
  onClose: () => void;
  onSuccess: (sabanaId: string) => void;
}

export default function CreateSabanaModal({
  supervisors,
  onClose,
  onSuccess,
}: CreateSabanaModalProps) {
  const [formData, setFormData] = useState({
    titulo: '',
    createdBy: supervisors.length > 0 ? supervisors[0].id : 0,
    responsibleId: supervisors.length > 0 ? supervisors[0].id : 0,
    date: getToday(),
  });
  const [submitting, setSubmitting] = useState(false);

  if (supervisors.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Cargando...</h3>
          <p className="text-slate-600">Esperando datos de supervisores</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.createdBy || !formData.responsibleId) {
      alert('Debes seleccionar quién crea la sábana y quién es el responsable');
      return;
    }

    const payload = {
      titulo: formData.titulo,
      date: formData.date,
      createdBy: formData.createdBy,
      responsibleId: formData.responsibleId,
    };

    console.log('📤 Enviando sábana:', payload);
    console.log('👥 Supervisores disponibles:', supervisors);

    setSubmitting(true);

    try {
      const result = await api.createSabana(payload);
      console.log('✅ Sábana creada:', result);
      onSuccess(result.id);
    } catch (error) {
      console.error('❌ Error creating sabana:', error);
      alert('Error al crear la sábana');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Nueva Sábana</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              required
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Ej: 12 puntos octubre"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Creado por *
            </label>
            <select
              required
              value={formData.createdBy}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  createdBy: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              {supervisors.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Responsable *
            </label>
            <select
              required
              value={formData.responsibleId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  responsibleId: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              {supervisors.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <p className="text-sm text-cyan-800">
              Al crear la sábana, se generarán automáticamente 500 habitaciones con estado "PENDIENTE".
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creando...' : 'Crear Sábana'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
