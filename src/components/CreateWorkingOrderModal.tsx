import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { workingOrdersAPI, WorkingOrderSeverity, WorkingOrderSource } from '../lib/workingOrders';
import { api, Supervisor } from '../lib/api';

interface CreateWorkingOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Aire acondicionado / HVAC de habitación',
  'Plomería (WC, lavabos, regaderas, drenajes)',
  'Iluminación (lámparas, luminarios, balcones)',
  'Albercas y exteriores (turbidez, filtros, temperatura)',
  'Humedad / olores / moho-hongo / filtraciones',
  'Puertas y herrajes (pestillos, cerraduras, ajustes)',
  'Minibar / refrigerador en habitación',
  'Electrónica y amenidades (TV, control remoto, telefonía, USB, iPad)',
  'Jacuzzi / tina de hidromasaje (función y sellos)',
  'Eléctrico (contactos, GFCI, breakers, voltajes)',
  'Ventiladores de techo / abanicos',
  'Acabados y albañilería (plafón, pintura, azulejos, cantera)',
  'Limpieza / housekeeping (suciedad, polvo, residuos)',
  'Plagas y fauna (cucarachas, insectos, mosquitos, abejas, ácaros)',
  'Ruido / vibraciones (equipos, ventiladores)',
  'Carpintería y mobiliario (closets, puertas de armario, ajustes)',
  'Controles / señalizador DND-MUR / BMS (incluye pantallas/control de habitación)',
  'Seguridad y detección (detectores de humo, alarmas)',
];

export default function CreateWorkingOrderModal({ isOpen, onClose, onSuccess }: CreateWorkingOrderModalProps) {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    roomNumber: '',
    stay_from: '',
    stay_to: '',
    summary: '',
    detail: '',
    source: 'MANUAL' as WorkingOrderSource,
    category: '',
    severity: 'MEDIUM' as WorkingOrderSeverity,
    assigned_to: '',
    convertToNote: false,
  });

  useEffect(() => {
    if (isOpen) {
      loadSupervisors();
      setDefaultDates();
    }
  }, [isOpen]);

  const loadSupervisors = async () => {
    try {
      const data = await api.getSupervisors();
      setSupervisors(data.filter((s) => s.is_active));
    } catch (error) {
      console.error('Error loading supervisors:', error);
    }
  };

  const setDefaultDates = () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setFormData((prev) => ({
      ...prev,
      stay_from: today,
      stay_to: tomorrowStr,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await workingOrdersAPI.create({
        roomNumber: parseInt(formData.roomNumber),
        stay_from: formData.stay_from,
        stay_to: formData.stay_to,
        summary: formData.summary,
        detail: formData.detail || undefined,
        source: formData.source,
        category: formData.category || undefined,
        severity: formData.severity,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : undefined,
        convertToNote: formData.convertToNote,
        noteSupervisorId: formData.assigned_to ? parseInt(formData.assigned_to) : undefined,
      });

      setFormData({
        roomNumber: '',
        stay_from: '',
        stay_to: '',
        summary: '',
        detail: '',
        source: 'MANUAL',
        category: '',
        severity: 'MEDIUM',
        assigned_to: '',
        convertToNote: false,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating working order:', error);
      alert('Error al crear la Working Order. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Nueva Working Order</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Número de Habitación *
              </label>
              <input
                type="number"
                required
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                placeholder="Ej: 3402"
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Severidad *
              </label>
              <select
                required
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as WorkingOrderSeverity })}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Check-in *
              </label>
              <input
                type="date"
                required
                value={formData.stay_from}
                onChange={(e) => setFormData({ ...formData, stay_from: e.target.value })}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Check-out *
              </label>
              <input
                type="date"
                required
                value={formData.stay_to}
                onChange={(e) => setFormData({ ...formData, stay_to: e.target.value })}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Resumen *
            </label>
            <input
              type="text"
              required
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Ej: AA no enfría adecuadamente"
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Detalle
            </label>
            <textarea
              value={formData.detail}
              onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
              placeholder="Descripción detallada del problema..."
              rows={3}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Categoría
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar categoría...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Fuente
            </label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value as WorkingOrderSource })}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="MANUAL">Manual</option>
              <option value="MEDALLIA">Medallia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Asignar a
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({
                ...formData,
                assigned_to: e.target.value,
                convertToNote: e.target.value ? true : false
              })}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sin asignar</option>
              {supervisors.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.nombre}
                </option>
              ))}
            </select>
          </div>

          {formData.assigned_to && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="convertToNote"
                checked={formData.convertToNote}
                onChange={(e) => setFormData({ ...formData, convertToNote: e.target.checked })}
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="convertToNote" className="text-sm font-medium text-slate-700 cursor-pointer">
                Crear Tarea (Nota) automáticamente para el supervisor asignado
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Working Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
