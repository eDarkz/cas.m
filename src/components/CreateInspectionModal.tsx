import { useState } from 'react';
import { X, Save, Camera } from 'lucide-react';
import {
  fumigationApi,
  BaitStation,
  PhysicalCondition,
  CreateInspectionParams,
} from '../lib/fumigationApi';

interface Props {
  station: BaitStation;
  onClose: () => void;
  onSave: () => void;
}

export default function CreateInspectionModal({ station, onClose, onSave }: Props) {
  const [inspectorNombre, setInspectorNombre] = useState('');
  const [inspectorEmpresa, setInspectorEmpresa] = useState('');
  const [physicalCondition, setPhysicalCondition] = useState<PhysicalCondition>('BUENA');
  const [hasBait, setHasBait] = useState(true);
  const [baitReplaced, setBaitReplaced] = useState(false);
  const [locationOk, setLocationOk] = useState(true);
  const [photoUrl, setPhotoUrl] = useState('');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!inspectorNombre.trim()) {
      setError('El nombre del inspector es requerido');
      return;
    }

    setSaving(true);
    try {
      const data: CreateInspectionParams = {
        inspector_nombre: inspectorNombre.trim(),
        inspector_empresa: inspectorEmpresa.trim() || undefined,
        physical_condition: physicalCondition,
        has_bait: hasBait,
        bait_replaced: baitReplaced,
        location_ok: locationOk,
        photo_url: photoUrl.trim() || undefined,
        observations: observations.trim() || undefined,
      };

      await fumigationApi.createInspection(station.id, data);
      onSave();
    } catch (err: any) {
      console.error('Error saving inspection:', err);
      setError(err.message || 'Error al guardar la inspeccion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Nueva Inspeccion</h2>
            <p className="text-sm text-gray-500">
              {station.code} - {station.name}
            </p>
          </div>
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
                Inspector *
              </label>
              <input
                type="text"
                value={inspectorNombre}
                onChange={(e) => setInspectorNombre(e.target.value)}
                placeholder="Nombre del inspector"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Empresa
              </label>
              <input
                type="text"
                value={inspectorEmpresa}
                onChange={(e) => setInspectorEmpresa(e.target.value)}
                placeholder="Empresa (opcional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condicion fisica *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['BUENA', 'REGULAR', 'MALA'] as PhysicalCondition[]).map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setPhysicalCondition(cond)}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    physicalCondition === cond
                      ? cond === 'BUENA'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : cond === 'REGULAR'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Estado del cebo / trampa
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasBait}
                  onChange={(e) => setHasBait(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Tiene cebo</div>
                  <div className="text-sm text-gray-500">
                    La estacion cuenta con cebo en su interior
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={baitReplaced}
                  onChange={(e) => setBaitReplaced(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Cebo reemplazado</div>
                  <div className="text-sm text-gray-500">
                    Se reemplazo el cebo durante esta inspeccion
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationOk}
                  onChange={(e) => setLocationOk(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Ubicacion correcta</div>
                  <div className="text-sm text-gray-500">
                    La estacion se encuentra en su ubicacion designada
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Camera className="w-4 h-4 inline mr-1" />
              URL de foto (opcional)
            </label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas adicionales sobre la inspeccion..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
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
              {saving ? 'Guardando...' : 'Registrar Inspeccion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
