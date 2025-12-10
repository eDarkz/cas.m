import { useState, useEffect } from 'react';
import { X, MapPin, Save } from 'lucide-react';
import {
  fumigationApi,
  BaitStation,
  StationType,
  CreateStationParams,
} from '../lib/fumigationApi';

interface Props {
  station: BaitStation | null;
  onClose: () => void;
  onSave: () => void;
}

export default function CreateStationModal({ station, onClose, onSave }: Props) {
  const isEditing = !!station;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<StationType>('ROEDOR');
  const [utmX, setUtmX] = useState('');
  const [utmY, setUtmY] = useState('');
  const [installedAt, setInstalledAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Codigo *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: CEB-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as StationType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="ROEDOR">Cebadera (Roedor)</option>
                <option value="UV">Trampa UV</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Coordenada X (UTM)
              </label>
              <input
                type="number"
                step="any"
                value={utmX}
                onChange={(e) => setUtmX(e.target.value)}
                placeholder="Ej: -109.7123"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Coordenada Y (UTM)
              </label>
              <input
                type="number"
                step="any"
                value={utmY}
                onChange={(e) => setUtmY(e.target.value)}
                placeholder="Ej: 23.0456"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
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
  );
}
