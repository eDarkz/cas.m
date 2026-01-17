import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Home, MapPin, Camera, Save, CheckCircle, ArrowLeft, Calendar } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import { api, FumigationCycle } from '../lib/api';
import { useGPS } from '../lib/useGPS';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function FumigationRoomFieldForm() {
  const { roomNumber } = useParams<{ roomNumber: string }>();
  const navigate = useNavigate();
  const { gps } = useGPS();

  const [cycles, setCycles] = useState<FumigationCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    cycle_id: '',
    fumigator: '',
    notes: '',
    photo_url: '',
  });

  useEffect(() => {
    loadCycles();
  }, []);

  const loadCycles = async () => {
    try {
      const data = await api.getFumigationCycles();
      setCycles(data.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }));
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, cycle_id: data[0].id.toString() }));
      }
    } catch (error) {
      console.error('Error loading cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber || !formData.cycle_id) return;

    setSaving(true);

    try {
      await api.createFumigationRoomLog({
        cycle_id: parseInt(formData.cycle_id, 10),
        room_id: parseInt(roomNumber, 10),
        fumigator_id: undefined,
        visited_at: new Date().toISOString(),
        utm_x: gps?.lng || undefined,
        utm_y: gps?.lat || undefined,
        photo_url: formData.photo_url || undefined,
        notes: `Fumigador: ${formData.fumigator}. ${formData.notes}`.trim(),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/fumigacion/scanner');
      }, 2000);
    } catch (error) {
      console.error('Error saving log:', error);
      alert('Error al guardar el registro. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-900 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <HamsterLoader />
          <p className="text-center mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-900 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registro Guardado</h2>
          <p className="text-slate-600">La fumigación ha sido registrada exitosamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-900 to-blue-900 flex flex-col p-4">
      <div className="max-w-2xl w-full mx-auto my-4">
        <button
          onClick={() => navigate('/fumigacion/scanner')}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Scanner
        </button>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Home className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">
                  Habitación {roomNumber}
                </h1>
                <p className="text-blue-100 mt-1">
                  Registro de Fumigación
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {gps && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-semibold">GPS Capturado</span>
                </div>
                <p className="text-xs text-blue-600 mt-1 font-mono">
                  {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Ciclo de Fumigación <span className="text-red-500">*</span>
              </label>
              {cycles.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    No hay ciclos disponibles. Crea un ciclo desde el panel administrativo.
                  </p>
                </div>
              ) : (
                <select
                  value={formData.cycle_id}
                  onChange={(e) => setFormData({ ...formData, cycle_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {MONTHS[cycle.month - 1]} {cycle.year}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Técnico Fumigador <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fumigator}
                onChange={(e) => setFormData({ ...formData, fumigator: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre del técnico"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
                placeholder="Notas adicionales, incidencias, tipo de tratamiento aplicado, etc."
              />
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <Camera className="w-4 h-4" />
                <span className="text-sm font-semibold">Evidencia Fotográfica</span>
              </div>
              <p className="text-xs text-gray-600">
                Las fotos se pueden agregar desde la vista administrativa del sistema.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/fumigacion/scanner')}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || cycles.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <HamsterLoader size="small" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar Registro
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
