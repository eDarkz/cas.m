import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Home,
  MapPin,
  Camera,
  Save,
  CheckCircle,
  ArrowLeft,
  Search,
  Droplets,
  User,
  Building2,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import {
  fumigationApi,
  FumigationCycle,
  RoomFumigation,
  ServiceType,
} from '../lib/fumigationApi';
import { useGPS } from '../lib/useGPS';
import OperatorAutocomplete from '../components/OperatorAutocomplete';

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'PREVENTIVO', label: 'Preventivo' },
  { value: 'CORRECTIVO', label: 'Correctivo' },
  { value: 'NEBULIZACION', label: 'Nebulizacion' },
  { value: 'ASPERSION', label: 'Aspersion' },
  { value: 'GEL', label: 'Gel' },
  { value: 'OTRO', label: 'Otro' },
];

export default function FumigacionHabitacionCampo() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const { gps, error: gpsError } = useGPS();

  const [cycle, setCycle] = useState<FumigationCycle | null>(null);
  const [rooms, setRooms] = useState<RoomFumigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successRoom, setSuccessRoom] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<RoomFumigation | null>(null);
  const [showRoomSelector, setShowRoomSelector] = useState(false);

  const [formData, setFormData] = useState({
    service_type: 'PREVENTIVO' as ServiceType,
    fumigator_nombre: '',
    fumigator_empresa: '',
    observations: '',
  });

  const loadData = async () => {
    if (!cycleId) return;
    setLoading(true);
    try {
      const [cycleData, roomsData] = await Promise.all([
        fumigationApi.getCycle(Number(cycleId)),
        fumigationApi.getCycleRooms(Number(cycleId), { status: 'PENDIENTE' }),
      ]);
      setCycle(cycleData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cycleId]);

  const filteredRooms = useMemo(() => {
    if (!searchQuery) return rooms;
    const q = searchQuery.toLowerCase();
    return rooms.filter((r) => r.room_number.toLowerCase().includes(q));
  }, [rooms, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) {
      alert('Selecciona una habitacion');
      return;
    }
    if (!formData.fumigator_nombre.trim()) {
      alert('Ingresa el nombre del fumigador');
      return;
    }

    setSaving(true);

    try {
      await fumigationApi.updateRoomFumigation(selectedRoom.id, {
        status: 'COMPLETADA',
        fumigated_at: new Date().toISOString(),
        service_type: formData.service_type,
        fumigator_nombre: formData.fumigator_nombre.trim(),
        fumigator_empresa: formData.fumigator_empresa.trim() || undefined,
        utm_x: gps?.lat || undefined,
        utm_y: gps?.lng || undefined,
        observations: formData.observations.trim() || undefined,
      });

      setSuccessRoom(selectedRoom.room_number);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        setSelectedRoom(null);
        setFormData((prev) => ({
          ...prev,
          observations: '',
        }));
        loadData();
      }, 2000);
    } catch (error) {
      console.error('Error saving fumigation:', error);
      alert('Error al guardar. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-teal-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <RefreshCw className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Cargando habitaciones...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-teal-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registro Guardado</h2>
          <p className="text-slate-600">
            Habitacion <span className="font-bold">{successRoom}</span> fumigada exitosamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-teal-900 flex flex-col p-4">
      <div className="max-w-2xl w-full mx-auto my-4">
        <button
          onClick={() => navigate(`/fumigacion/ciclo/${cycleId}`)}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al ciclo
        </button>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Droplets className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">
                  Fumigacion de Habitacion
                </h1>
                <p className="text-teal-100 mt-1">
                  {cycle?.label || 'Ciclo'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {gps ? (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-teal-700">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-semibold">GPS Capturado</span>
                </div>
                <p className="text-xs text-teal-600 mt-1 font-mono">
                  {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                </p>
              </div>
            ) : gpsError ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-semibold">GPS no disponible</span>
                </div>
                <p className="text-xs text-amber-600 mt-1">{gpsError}</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 animate-pulse" />
                  <span className="text-sm">Obteniendo ubicacion GPS...</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Habitacion <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoomSelector(!showRoomSelector)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-left flex items-center justify-between focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {selectedRoom ? (
                    <div className="flex items-center gap-2">
                      <Home className="w-5 h-5 text-teal-600" />
                      <span className="font-medium">{selectedRoom.room_number}</span>
                      {selectedRoom.area && (
                        <span className="text-sm text-gray-500">- {selectedRoom.area}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">Seleccionar habitacion...</span>
                  )}
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showRoomSelector ? 'rotate-180' : ''}`} />
                </button>

                {showRoomSelector && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-72 overflow-hidden">
                    <div className="p-2 border-b border-gray-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar habitacion..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredRooms.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {rooms.length === 0
                            ? 'Todas las habitaciones estan fumigadas'
                            : 'No se encontraron habitaciones'}
                        </div>
                      ) : (
                        filteredRooms.map((room) => (
                          <button
                            key={room.id}
                            type="button"
                            onClick={() => {
                              setSelectedRoom(room);
                              setShowRoomSelector(false);
                              setSearchQuery('');
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-teal-50 flex items-center gap-3 transition-colors"
                          >
                            <Home className="w-5 h-5 text-gray-400" />
                            <div>
                              <span className="font-medium text-gray-900">{room.room_number}</span>
                              {room.area && (
                                <span className="text-sm text-gray-500 ml-2">{room.area}</span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {rooms.length} habitaciones pendientes
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Tipo de Servicio <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SERVICE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, service_type: type.value }))}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                      formData.service_type === type.value
                        ? 'bg-teal-100 border-teal-500 text-teal-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <OperatorAutocomplete
              nombreValue={formData.fumigator_nombre}
              empresaValue={formData.fumigator_empresa}
              onNombreChange={(value) => setFormData((prev) => ({ ...prev, fumigator_nombre: value }))}
              onEmpresaChange={(value) => setFormData((prev) => ({ ...prev, fumigator_empresa: value }))}
              nombreLabel="Fumigador"
              empresaLabel="Empresa"
              nombrePlaceholder="Nombre del fumigador"
              empresaPlaceholder="Empresa externa"
              required
            />

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={formData.observations}
                onChange={(e) => setFormData((prev) => ({ ...prev, observations: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent min-h-[100px]"
                placeholder="Notas adicionales, incidencias encontradas, etc."
              />
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-700 mb-2">
                <Camera className="w-4 h-4" />
                <span className="text-sm font-semibold">Evidencia Fotografica</span>
              </div>
              <p className="text-xs text-gray-600">
                Las fotos se pueden agregar desde la vista de detalles del ciclo.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/fumigacion/ciclo/${cycleId}`)}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !selectedRoom}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Registrar Fumigacion
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
