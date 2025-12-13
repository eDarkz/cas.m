import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Home,
  MapPin,
  Camera,
  Save,
  CheckCircle,
  ArrowLeft,
  User,
  Building2,
  RefreshCw,
  AlertTriangle,
  Clock,
  Upload,
  X,
  Loader2,
  Plus,
} from 'lucide-react';
import {
  fumigationApi,
  FumigationCycle,
  RoomFumigation,
  ServiceType,
} from '../lib/fumigationApi';
import { useGPS } from '../lib/useGPS';
import { useNetworkStatus } from '../lib/useNetworkStatus';
import OperatorAutocomplete from '../components/OperatorAutocomplete';
import { NetworkStatusIndicator } from '../components/NetworkStatusIndicator';
import { SaveStatusModal } from '../components/SaveStatusModal';

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'PREVENTIVO', label: 'Preventivo' },
  { value: 'CORRECTIVO', label: 'Correctivo' },
  { value: 'NEBULIZACION', label: 'Nebulizacion' },
  { value: 'ASPERSION', label: 'Aspersion' },
  { value: 'GEL', label: 'Gel' },
  { value: 'OTRO', label: 'Otro' },
];

const IMGUR_CLIENT_ID = '546c25a59c58ad7';

async function uploadToImgur(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: {
      Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Error al subir imagen');
  }

  const data = await response.json();
  return data.data.link;
}

export default function FumigationRoomScanForm() {
  const { cycleId, roomNumber } = useParams<{ cycleId: string; roomNumber: string }>();
  const navigate = useNavigate();
  const { gps, error: gpsError } = useGPS();
  const { isOnline } = useNetworkStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cycle, setCycle] = useState<FumigationCycle | null>(null);
  const [saveModalStatus, setSaveModalStatus] = useState<{
    isOpen: boolean;
    status: 'saving' | 'success' | 'error' | 'offline';
    message?: string;
  }>({ isOpen: false, status: 'saving' });
  const [room, setRoom] = useState<RoomFumigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [photos, setPhotos] = useState<{ url: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    service_type: 'PREVENTIVO' as ServiceType,
    fumigator_nombre: '',
    fumigator_empresa: '',
    observations: '',
  });

  const loadData = async () => {
    if (!cycleId || !roomNumber) return;
    setLoading(true);
    setError('');

    try {
      const [cycleData, roomsData] = await Promise.all([
        fumigationApi.getCycle(Number(cycleId)),
        fumigationApi.getCycleRooms(Number(cycleId)),
      ]);

      setCycle(cycleData);

      const foundRoom = roomsData.find(
        (r) => String(r.room_number) === roomNumber || String(r.room_number).includes(roomNumber)
      );

      if (foundRoom) {
        setRoom(foundRoom);
      } else {
        setError(`Habitacion ${roomNumber} no encontrada en este ciclo`);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cycleId, roomNumber]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen es muy grande. Maximo 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const preview = evt.target?.result as string;
      setUploading(true);
      try {
        const url = await uploadToImgur(file);
        setPhotos((prev) => [...prev, { url, preview }]);
      } catch (err) {
        console.error('Error uploading image:', err);
        alert('Error al subir la imagen. Intenta de nuevo.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;

    if (!formData.fumigator_nombre.trim()) {
      setError('Ingresa el nombre del fumigador');
      return;
    }

    // Verificar conexión a internet
    if (!isOnline) {
      setSaveModalStatus({
        isOpen: true,
        status: 'offline',
        message: 'No hay conexión a Internet. Por favor verifica tu conexión antes de guardar.',
      });
      return;
    }

    setSaving(true);
    setError('');
    setSaveModalStatus({ isOpen: true, status: 'saving' });

    try {
      const photoUrls = photos.map((p) => p.url);
      await fumigationApi.updateRoomFumigation(room.id, {
        status: 'COMPLETADA',
        fumigated_at: new Date().toISOString(),
        service_type: formData.service_type,
        fumigator_nombre: formData.fumigator_nombre.trim(),
        fumigator_empresa: formData.fumigator_empresa.trim() || undefined,
        utm_x: gps?.lat || undefined,
        utm_y: gps?.lng || undefined,
        observations: formData.observations.trim() || undefined,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
      });

      setSuccess(true);
      setSaveModalStatus({
        isOpen: true,
        status: 'success',
        message: `Fumigación de habitación ${roomNumber} guardada correctamente`,
      });

      setTimeout(() => {
        navigate('/fumigacion/scanner');
      }, 2500);
    } catch (err) {
      console.error('Error saving fumigation:', err);
      setError('Error al guardar. Por favor intenta de nuevo.');
      setSaveModalStatus({
        isOpen: true,
        status: 'error',
        message: 'No se pudo guardar la fumigación. Por favor intenta de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-teal-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <RefreshCw className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Buscando habitacion...</p>
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
            Habitacion <span className="font-bold">{room?.room_number}</span> fumigada exitosamente.
          </p>
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-teal-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Habitacion no encontrada</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/fumigacion/scanner')}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            Volver al Scanner
          </button>
        </div>
      </div>
    );
  }

  if (room?.status === 'COMPLETADA') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-teal-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Ya Fumigada</h2>
          <p className="text-slate-600 mb-2">
            La habitacion <span className="font-bold">{room.room_number}</span> ya fue fumigada.
          </p>
          {room.fumigator_nombre && (
            <p className="text-sm text-slate-500">
              Por: {room.fumigator_nombre}
              {room.fumigated_at && (
                <> el {new Date(room.fumigated_at).toLocaleDateString('es-MX')}</>
              )}
            </p>
          )}
          <button
            onClick={() => navigate('/fumigacion/scanner')}
            className="mt-6 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            Escanear otra habitacion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-teal-900 flex flex-col p-4">
      <NetworkStatusIndicator />
      <SaveStatusModal
        isOpen={saveModalStatus.isOpen}
        status={saveModalStatus.status}
        message={saveModalStatus.message}
        onClose={() => setSaveModalStatus({ ...saveModalStatus, isOpen: false })}
      />
      <div className="max-w-2xl w-full mx-auto my-4">
        <button
          onClick={() => navigate('/fumigacion/scanner')}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Scanner
        </button>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Home className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">
                  Habitacion {room?.room_number}
                </h1>
                <p className="text-teal-100 mt-1">
                  {cycle?.label}
                </p>
              </div>
              <div className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Pendiente
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

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Camera className="w-4 h-4 inline mr-1" />
                Evidencia Fotografica
              </label>

              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative w-20 h-20">
                      <img
                        src={photo.preview}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border-2 border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  uploading
                    ? 'border-slate-200 bg-slate-50'
                    : 'border-slate-300 hover:border-teal-500 hover:bg-teal-50/50'
                }`}
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    <span className="text-sm text-slate-600">Subiendo imagen...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {photos.length > 0 ? (
                        <Plus className="w-6 h-6 text-slate-400" />
                      ) : (
                        <Upload className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {photos.length > 0 ? 'Agregar otra foto' : 'Toca para tomar foto'}
                    </p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

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
                disabled={saving || uploading}
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
