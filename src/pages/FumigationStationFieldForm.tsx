import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bug, MapPin, Camera, Save, CheckCircle, ArrowLeft } from 'lucide-react';
import { api, FumigationStation } from '../lib/api';
import { useGPS } from '../lib/useGPS';

export default function FumigationStationFieldForm() {
  const { stationId } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { gps } = useGPS();

  const [station, setStation] = useState<FumigationStation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    inspector: '',
    notes: '',
    photo_url: '',
  });

  useEffect(() => {
    loadStation();
  }, [stationId]);

  const loadStation = async () => {
    if (!stationId) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.getFumigationStation(parseInt(stationId, 10));
      setStation(data);
    } catch (error) {
      console.error('Error loading station:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationId) return;

    setSaving(true);

    try {
      await api.createFumigationStationLog({
        station_id: parseInt(stationId, 10),
        inspector_id: undefined,
        visited_at: new Date().toISOString(),
        utm_x: gps?.lng || undefined,
        utm_y: gps?.lat || undefined,
        photo_url: formData.photo_url || undefined,
        notes: `Inspector: ${formData.inspector}. ${formData.notes}`.trim(),
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-center mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Bug className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Estación no encontrada</h2>
          <p className="text-slate-600 mb-6">No se pudo cargar la información de la estación.</p>
          <button
            onClick={() => navigate('/fumigacion/scanner')}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-xl transition-all font-medium"
          >
            Volver al Scanner
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registro Guardado</h2>
          <p className="text-slate-600">La visita ha sido registrada exitosamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-900 flex flex-col p-4">
      <div className="max-w-2xl w-full mx-auto my-4">
        <button
          onClick={() => navigate('/fumigacion/scanner')}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Scanner
        </button>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Bug className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">
                  {station.name}
                </h1>
                {station.area && (
                  <p className="text-emerald-100 mt-1">
                    Área: {station.area}
                  </p>
                )}
                {station.location && (
                  <p className="text-emerald-100 text-sm">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {station.location}
                  </p>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {gps && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-semibold">GPS Capturado</span>
                </div>
                <p className="text-xs text-emerald-600 mt-1 font-mono">
                  {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Inspector / Responsable <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.inspector}
                onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Nombre del inspector"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Observaciones / Hallazgos
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[120px]"
                placeholder="Describe lo encontrado en la estación (estado de la trampa, plagas encontradas, acciones realizadas, etc.)"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Camera className="w-4 h-4" />
                <span className="text-sm font-semibold">Evidencia Fotográfica</span>
              </div>
              <p className="text-xs text-blue-600">
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
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
