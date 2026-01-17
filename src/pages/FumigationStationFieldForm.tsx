import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bug,
  MapPin,
  Camera,
  Save,
  CheckCircle,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Upload,
  X,
  Loader2,
} from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import {
  fumigationApi,
  BaitStation,
  PhysicalCondition,
} from '../lib/fumigationApi';
import { useGPS } from '../lib/useGPS';
import OperatorAutocomplete from '../components/OperatorAutocomplete';

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

export default function FumigationStationFieldForm() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { gps, loading: gpsLoading, error: gpsError, requestLocation } = useGPS();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [station, setStation] = useState<BaitStation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  const [inspectorNombre, setInspectorNombre] = useState('');
  const [inspectorEmpresa, setInspectorEmpresa] = useState('');
  const [physicalCondition, setPhysicalCondition] = useState<PhysicalCondition>('BUENA');
  const [hasBait, setHasBait] = useState(true);
  const [baitReplaced, setBaitReplaced] = useState(false);
  const [locationOk, setLocationOk] = useState(true);
  const [observations, setObservations] = useState('');

  useEffect(() => {
    loadStation();
  }, [code]);

  const loadStation = async () => {
    if (!code) {
      setLoading(false);
      setError('Codigo de estacion no proporcionado');
      return;
    }

    try {
      const stations = await fumigationApi.getStations();
      const found = stations.find(
        (s) => s.code.toLowerCase() === code.toLowerCase()
      );

      if (found) {
        const detail = await fumigationApi.getStation(found.id);
        setStation(detail);
      } else {
        setError(`No se encontro la estacion con codigo: ${code}`);
      }
    } catch (err) {
      console.error('Error loading station:', err);
      setError('Error al cargar la estacion');
    } finally {
      setLoading(false);
    }
  };

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
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const url = await uploadToImgur(file);
      setPhotoUrl(url);
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Error al subir la imagen. Intenta de nuevo.');
      setPhotoPreview('');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    setPhotoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!station) return;

    if (!inspectorNombre.trim()) {
      alert('El nombre del inspector es requerido');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await fumigationApi.createInspection(station.id, {
        inspector_nombre: inspectorNombre.trim(),
        inspector_empresa: inspectorEmpresa.trim() || undefined,
        physical_condition: physicalCondition,
        has_bait: hasBait,
        bait_replaced: baitReplaced,
        location_ok: locationOk,
        lat: gps?.lat ?? undefined,
        lng: gps?.lng ?? undefined,
        photo_url: photoUrl || undefined,
        observations: observations.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/fumigacion/scanner');
      }, 2000);
    } catch (err: any) {
      console.error('Error saving inspection:', err);
      setError(err.message || 'Error al guardar la inspeccion');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <HamsterLoader />
          <p className="text-center mt-4 text-slate-600">Cargando estacion...</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Estacion no encontrada</h2>
          <p className="text-slate-600 mb-2">{error || 'No se pudo cargar la informacion.'}</p>
          <p className="text-sm text-slate-500 mb-6 font-mono">Codigo: {code}</p>
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
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Inspeccion Guardada</h2>
          <p className="text-slate-600">La inspeccion ha sido registrada exitosamente.</p>
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
                <p className="text-emerald-100 text-sm font-mono">{station.code}</p>
                <h1 className="text-2xl font-bold text-white">{station.name}</h1>
                <p className="text-emerald-100 text-sm mt-1">
                  {station.type === 'ROEDOR'
                    ? 'Cebadera (Roedor)'
                    : station.type === 'UV'
                    ? 'Trampa UV'
                    : 'Otro'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-semibold">Ubicacion GPS</span>
                </div>
                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={gpsLoading}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  {gpsLoading ? 'Obteniendo...' : 'Actualizar'}
                </button>
              </div>
              {gps ? (
                <p className="text-xs text-slate-600 mt-1 font-mono">
                  {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
                </p>
              ) : gpsError ? (
                <p className="text-xs text-amber-600 mt-1">{gpsError}</p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">Obteniendo ubicacion...</p>
              )}
            </div>

            <OperatorAutocomplete
              nombreValue={inspectorNombre}
              empresaValue={inspectorEmpresa}
              onNombreChange={setInspectorNombre}
              onEmpresaChange={setInspectorEmpresa}
              nombreLabel="Inspector"
              empresaLabel="Empresa"
              nombrePlaceholder="Nombre del inspector"
              empresaPlaceholder="Opcional"
              required
            />

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Condicion Fisica *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['BUENA', 'REGULAR', 'MALA'] as PhysicalCondition[]).map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setPhysicalCondition(cond)}
                    className={`px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                      physicalCondition === cond
                        ? cond === 'BUENA'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : cond === 'REGULAR'
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Indicadores de actividad de plagas
              </label>
              <div className="grid grid-cols-1 gap-2">
                <label className="flex items-center gap-3 p-3 border-2 border-red-200 bg-red-50/30 rounded-lg hover:bg-red-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBait}
                    onChange={(e) => setHasBait(e.target.checked)}
                    className="w-5 h-5 text-red-600 border-slate-300 rounded focus:ring-red-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">Consumo de veneno detectado</div>
                    <div className="text-xs text-slate-600">Cebo consumido o mordido</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border-2 border-amber-200 bg-amber-50/30 rounded-lg hover:bg-amber-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={baitReplaced}
                    onChange={(e) => setBaitReplaced(e.target.checked)}
                    className="w-5 h-5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">Presencia de excremento o indicadores</div>
                    <div className="text-xs text-slate-600">Evidencia de actividad de roedores</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!locationOk}
                    onChange={(e) => setLocationOk(!e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-slate-900 text-sm">Estacion desplazada</div>
                    <div className="text-xs text-slate-600">Movida de su ubicacion original</div>
                  </div>
                </label>
              </div>
              {(hasBait || baitReplaced) && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded">
                  <p className="text-xs text-orange-800 font-semibold">
                    ⚠️ Requiere revision en maximo 3 dias
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Camera className="w-4 h-4 inline mr-1" />
                Foto de evidencia
              </label>

              {!photoPreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
                >
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Toca para tomar foto o seleccionar</p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {!uploading && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {photoUrl && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-600 text-white text-xs rounded font-medium">
                      Subida exitosa
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Observaciones
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Notas adicionales sobre la inspeccion..."
              />
            </div>

            <div className="flex gap-3 pt-2">
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
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Guardar
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
