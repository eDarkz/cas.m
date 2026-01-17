import { useEffect, useState } from 'react';
import { api, AmenityType, AmenityLimit, AnalysisParamKey, ANALYSIS_PARAMS } from '../lib/api';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';

export default function AmenityLimitsAdmin() {
  const [amenityTypes, setAmenityTypes] = useState<AmenityType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [limits, setLimits] = useState<AmenityLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLimit, setEditingLimit] = useState<AmenityLimit | null>(null);
  const [formData, setFormData] = useState<{
    param_key: AnalysisParamKey | '';
    min_value: string;
    max_value: string;
    comment: string;
  }>({
    param_key: '',
    min_value: '',
    max_value: '',
    comment: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAmenityTypes();
  }, []);

  useEffect(() => {
    if (selectedTypeId) {
      loadLimits();
    }
  }, [selectedTypeId]);

  const loadAmenityTypes = async () => {
    try {
      const types = await api.getAmenityTypes();
      setAmenityTypes(types);
      if (types.length > 0) {
        setSelectedTypeId(types[0].id);
      }
    } catch (error) {
      console.error('Error loading amenity types:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLimits = async () => {
    if (!selectedTypeId) return;
    try {
      const data = await api.getAmenityLimits({ amenity_type_id: selectedTypeId });
      setLimits(data);
    } catch (error) {
      console.error('Error loading limits:', error);
    }
  };

  const handleAdd = () => {
    setEditingLimit(null);
    setFormData({
      param_key: '',
      min_value: '',
      max_value: '',
      comment: '',
    });
    setShowModal(true);
  };

  const handleEdit = (limit: AmenityLimit) => {
    setEditingLimit(limit);
    setFormData({
      param_key: limit.param_key,
      min_value: limit.min_value !== null ? String(limit.min_value) : '',
      max_value: limit.max_value !== null ? String(limit.max_value) : '',
      comment: limit.comment || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este límite?')) return;
    try {
      await api.deleteAmenityLimit(id);
      await loadLimits();
    } catch (error) {
      console.error('Error deleting limit:', error);
      alert('Error al eliminar el límite');
    }
  };

  const handleSave = async () => {
    if (!selectedTypeId) return;
    if (!formData.param_key) {
      alert('Selecciona un parámetro');
      return;
    }

    setSaving(true);
    try {
      if (editingLimit) {
        await api.updateAmenityLimit(editingLimit.id, {
          min_value: formData.min_value ? Number(formData.min_value) : null,
          max_value: formData.max_value ? Number(formData.max_value) : null,
          comment: formData.comment || null,
        });
      } else {
        await api.createAmenityLimit({
          amenity_type_id: selectedTypeId,
          param_key: formData.param_key as AnalysisParamKey,
          min_value: formData.min_value ? Number(formData.min_value) : null,
          max_value: formData.max_value ? Number(formData.max_value) : null,
          comment: formData.comment || null,
        });
      }
      setShowModal(false);
      await loadLimits();
    } catch (error) {
      console.error('Error saving limit:', error);
      alert('Error al guardar el límite');
    } finally {
      setSaving(false);
    }
  };

  const getParamLabel = (key: AnalysisParamKey): string => {
    return ANALYSIS_PARAMS.find(p => p.key === key)?.label || key;
  };

  const getParamUnit = (key: AnalysisParamKey): string | null => {
    return ANALYSIS_PARAMS.find(p => p.key === key)?.unit || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HamsterLoader />
      </div>
    );
  }

  const selectedType = amenityTypes.find(t => t.id === selectedTypeId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
          LÍMITES POR TIPO DE AMENIDAD
        </h2>
        <button
          onClick={handleAdd}
          disabled={!selectedTypeId}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Agregar Límite
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Amenidad
        </label>
        <select
          value={selectedTypeId || ''}
          onChange={(e) => setSelectedTypeId(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        >
          {amenityTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.nombre}
            </option>
          ))}
        </select>
        {selectedType?.descripcion && (
          <p className="text-xs text-gray-500 mt-2">{selectedType.descripcion}</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-800">LÍMITES CONFIGURADOS</h3>
          <p className="text-sm text-gray-500 mt-1">Total: {limits.length} límites</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Parámetro</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Mínimo</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Máximo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Comentario</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {limits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    No hay límites configurados para este tipo de amenidad
                  </td>
                </tr>
              ) : (
                limits.map((limit) => {
                  const unit = getParamUnit(limit.param_key);
                  return (
                    <tr key={limit.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{getParamLabel(limit.param_key)}</div>
                        {unit && <div className="text-xs text-gray-500">{unit}</div>}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {limit.min_value !== null ? limit.min_value : '-'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {limit.max_value !== null ? limit.max_value : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {limit.comment || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(limit)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar límite"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(limit.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar límite"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editingLimit ? 'Editar Límite' : 'Nuevo Límite'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parámetro <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.param_key}
                  onChange={(e) => setFormData({ ...formData, param_key: e.target.value as AnalysisParamKey })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={!!editingLimit || saving}
                  required
                >
                  <option value="">Selecciona un parámetro</option>
                  {ANALYSIS_PARAMS.map((param) => (
                    <option key={param.key} value={param.key}>
                      {param.label} {param.unit ? `(${param.unit})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Mínimo
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.min_value}
                    onChange={(e) => setFormData({ ...formData, min_value: e.target.value })}
                    placeholder="Ej: 7.2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Máximo
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.max_value}
                    onChange={(e) => setFormData({ ...formData, max_value: e.target.value })}
                    placeholder="Ej: 7.8"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentario
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Notas adicionales sobre este límite..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <HamsterLoader size="small" />
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
