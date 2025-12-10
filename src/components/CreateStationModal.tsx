import { useState, useEffect } from 'react';
import { X, MapPin, Save, Map as MapIcon } from 'lucide-react';
import {
  fumigationApi,
  BaitStation,
  StationType,
  CreateStationParams,
} from '../lib/fumigationApi';
import MapCoordinatePicker from './MapCoordinatePicker';

interface Props {
  station: BaitStation | null;
  onClose: () => void;
  onSave: () => void;
}

const CODE_PREFIXES: Record<StationType, string> = {
  ROEDOR: 'CEB',
  UV: 'TUV',
  OTRO: 'OTR',
};

function extractCodeNumber(code: string, prefix: string): number | null {
  const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  const match = code.match(regex);
  return match ? parseInt(match[1], 10) : null;
}

function generateNextCode(stations: BaitStation[], type: StationType): string {
  const prefix = CODE_PREFIXES[type];

  const relevantStations = stations.filter((s) => {
    const stationPrefix = s.code.split('-')[0]?.toUpperCase();
    return stationPrefix === prefix;
  });

  let maxNumber = 0;
  for (const s of relevantStations) {
    const num = extractCodeNumber(s.code, prefix);
    if (num !== null && num > maxNumber) {
      maxNumber = num;
    }
  }

  const nextNumber = maxNumber + 1;
  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
}

export default function CreateStationModal({ station, onClose, onSave }: Props) {
  const isEditing = !!station;

  const [allStations, setAllStations] = useState<BaitStation[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<StationType>('ROEDOR');
  const [utmX, setUtmX] = useState('');
  const [utmY, setUtmY] = useState('');
  const [installedAt, setInstalledAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      fumigationApi.getStations().then(setAllStations).catch(console.error);
    }
  }, [isEditing]);

  useEffect(() => {
    if (station) {
      setCode(station.code);
      setName(station.name);
      setType(station.type);
      setUtmX(station.utm_x?.toString() || '');
      setUtmY(station.utm_y?.toString() || '');
      setInstalledAt(station.installed_at?.split('T')[0] || '');
      setIsActive(!!station.is_active);
    }
  }, [station]);

  useEffect(() => {
    if (!isEditing && allStations.length > 0) {
      const suggestedCode = generateNextCode(allStations, type);
      setCode(suggestedCode);
    }
  }, [type, allStations, isEditing]);

  const handleTypeChange = (newType: StationType) => {
    setType(newType);
  };

  const handleMapSelect = (lat: number, lng: number) => {
    setUtmY(lat.toString());
    setUtmX(lng.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim() || !name.trim()) {
      setError('Codigo y nombre son requeridos');
      return;
    }

    setSaving(true);
    try {
      const data: CreateStationParams = {
        code: code.trim(),
        name: name.trim(),
        type,
        utm_x: utmX ? parseFloat(utmX) : null,
        utm_y: utmY ? parseFloat(utmY) : null,
        installed_at: installedAt || null,
        is_active: isActive,
      };

      if (isEditing && station) {
        await fumigationApi.updateStation(station.id, data);
      } else {
        await fumigationApi.createStation(data);
      }

      onSave();
    } catch (err: any) {
      console.error('Error saving station:', err);
      setError(err.message || 'Error al guardar la estacion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Editar Estacion' : 'Nueva Estacion'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Estacion *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange('ROEDOR')}
                  className={`px-3 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    type === 'ROEDOR'
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Cebadera
                  <div className="text-xs font-normal mt-0.5 opacity-70">Roedor</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('UV')}
                  className={`px-3 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    type === 'UV'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Trampa UV
                  <div className="text-xs font-normal mt-0.5 opacity-70">Insectos</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('OTRO')}
                  className={`px-3 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    type === 'OTRO'
                      ? 'border-gray-500 bg-gray-50 text-gray-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Otro
                  <div className="text-xs font-normal mt-0.5 opacity-70">General</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Codigo *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`Ej: ${CODE_PREFIXES[type]}-001`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                required
              />
              {!isEditing && (
                <p className="text-xs text-gray-500 mt-1">
                  Codigo sugerido automaticamente. Puedes modificarlo si lo necesitas.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre / Descripcion *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Cebadera junto a cocina principal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Ubicacion (Coordenadas)
              </label>

              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors mb-3"
              >
                <MapIcon className="w-5 h-5" />
                {utmX && utmY ? 'Cambiar ubicacion en mapa' : 'Seleccionar en mapa'}
              </button>

              {utmX && utmY && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-700 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-semibold">Ubicacion seleccionada</span>
                  </div>
                  <p className="text-sm font-mono text-slate-600">
                    Lat: {Number(utmY).toFixed(6)}, Lng: {Number(utmX).toFixed(6)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Longitud (X)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={utmX}
                    onChange={(e) => setUtmX(e.target.value)}
                    placeholder="-109.7123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Latitud (Y)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={utmY}
                    onChange={(e) => setUtmY(e.target.value)}
                    placeholder="23.0456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de instalacion
              </label>
              <input
                type="date"
                value={installedAt}
                onChange={(e) => setInstalledAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Estacion activa
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <MapCoordinatePicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelect={handleMapSelect}
        initialLat={utmY ? parseFloat(utmY) : 23.067296055121364}
        initialLng={utmX ? parseFloat(utmX) : -109.65953278614275}
        title="Seleccionar Ubicacion de Estacion"
      />
    </>
  );
}
