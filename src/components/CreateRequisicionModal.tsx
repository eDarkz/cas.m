import { useState, useEffect } from 'react';
import { api, Supervisor, Priority } from '../lib/api';
import { X, Plus, Trash2 } from 'lucide-react';
import HamsterLoader from './HamsterLoader';

interface CreateRequisicionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemFormData {
  descripcion: string;
  modelo: string;
  cantidad: number;
  unidad: string;
  destino: string;
  nota: string;
}

export default function CreateRequisicionModal({
  onClose,
  onSuccess,
}: CreateRequisicionModalProps) {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    requestedById: 0,
    requestedForArea: '',
    priority: 'MEDIA' as Priority,
    comentario: '',
    responsibleId: undefined as number | undefined,
    neededDate: '',
  });

  const [items, setItems] = useState<ItemFormData[]>([
    {
      descripcion: '',
      modelo: '',
      cantidad: 1,
      unidad: 'PZA',
      destino: '',
      nota: '',
    }
  ]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSupervisors();
  }, []);

  const loadSupervisors = async () => {
    try {
      const data = await api.getSupervisors();
      setSupervisors(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, requestedById: data[0].id }));
      }
    } catch (error) {
      console.error('Error loading supervisors:', error);
      alert('Error al cargar supervisores');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, {
      descripcion: '',
      modelo: '',
      cantidad: 1,
      unidad: 'PZA',
      destino: '',
      nota: '',
    }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof ItemFormData, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter(item => item.descripcion.trim());
    if (validItems.length === 0) {
      alert('Debes agregar al menos un artículo');
      return;
    }

    setSubmitting(true);

    try {
      await api.createRequisition({
        requestedById: formData.requestedById,
        requestedForArea: formData.requestedForArea,
        priority: formData.priority,
        comentario: formData.comentario || undefined,
        responsibleId: formData.responsibleId,
        neededDate: formData.neededDate || undefined,
        initialStatus: 'ENVIADA',
        items: validItems.map(item => ({
          descripcion: item.descripcion,
          modelo: item.modelo || undefined,
          cantidad: item.cantidad,
          unidad: item.unidad,
          destino: item.destino,
          nota: item.nota || undefined,
        })),
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating requisition:', error);
      alert('Error al crear la requisición');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <HamsterLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Nueva Requisición</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-700 border-b pb-2">Información General</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Solicitado por *
                </label>
                <select
                  required
                  value={formData.requestedById}
                  onChange={(e) =>
                    setFormData({ ...formData, requestedById: parseInt(e.target.value) })
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
                  Responsable
                </label>
                <select
                  value={formData.responsibleId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      responsibleId: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">Sin asignar</option>
                  {supervisors.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Área General *
              </label>
              <input
                type="text"
                required
                value={formData.requestedForArea}
                onChange={(e) => setFormData({ ...formData, requestedForArea: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Ej: Torre 2 - Pisos 4 y 5"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prioridad
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fecha Necesaria
                </label>
                <input
                  type="date"
                  value={formData.neededDate}
                  onChange={(e) => setFormData({ ...formData, neededDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Comentario General
              </label>
              <textarea
                value={formData.comentario}
                onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Comentarios adicionales..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-semibold text-slate-700">Artículos</h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Artículo
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-slate-700">Artículo #{index + 1}</h5>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Descripción *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.descripcion}
                        onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                        placeholder="Ej: Filtro de aire acondicionado"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Modelo/Parte
                      </label>
                      <input
                        type="text"
                        value={item.modelo}
                        onChange={(e) => handleItemChange(index, 'modelo', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                        placeholder="Ej: FILTRO-20X20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Destino *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.destino}
                        onChange={(e) => handleItemChange(index, 'destino', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                        placeholder="Ej: Habitaciones 3201-3215"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.cantidad}
                        onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Unidad *
                      </label>
                      <select
                        required
                        value={item.unidad}
                        onChange={(e) => handleItemChange(index, 'unidad', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                      >
                        <option value="PZA">Pieza</option>
                        <option value="KG">Kilogramo</option>
                        <option value="LT">Litro</option>
                        <option value="MT">Metro</option>
                        <option value="M2">Metro Cuadrado</option>
                        <option value="M3">Metro Cúbico</option>
                        <option value="CJA">Caja</option>
                        <option value="PAQ">Paquete</option>
                        <option value="JGO">Juego</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Nota
                      </label>
                      <input
                        type="text"
                        value={item.nota}
                        onChange={(e) => handleItemChange(index, 'nota', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                        placeholder="Notas adicionales..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
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
              {submitting ? 'Creando...' : 'Crear Requisición'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
