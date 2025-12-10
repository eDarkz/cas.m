import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, AquaticElement, AnalysisParamKey, ANALYSIS_PARAMS } from '../lib/api';
import { ArrowLeft, Save, Settings } from 'lucide-react';

export default function ElementConfig() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [element, setElement] = useState<AquaticElement | null>(null);
  const [selectedParams, setSelectedParams] = useState<AnalysisParamKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate('/water-chemistry');
      return;
    }
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const [elementData, paramsData] = await Promise.all([
        api.getAquaticElement(id),
        api.getElementRequiredParams(id),
      ]);
      setElement(elementData);
      setSelectedParams(paramsData.params);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleParam = (paramKey: AnalysisParamKey) => {
    if (selectedParams.includes(paramKey)) {
      setSelectedParams(selectedParams.filter(p => p !== paramKey));
    } else {
      setSelectedParams([...selectedParams, paramKey]);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.updateElementRequiredParams(id, selectedParams);
      alert('Parámetros guardados correctamente');
      navigate(`/water-chemistry/${id}`);
    } catch (error) {
      console.error('Error saving params:', error);
      alert('Error al guardar los parámetros');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!element) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Elemento no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/water-chemistry/${id}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">CONFIGURAR PARÁMETROS</h2>
          <p className="text-gray-500 text-sm mt-1">{element.nombre}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-cyan-600" />
          <h3 className="text-lg font-bold text-gray-800">PARÁMETROS A CAPTURAR</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Selecciona los parámetros que se mostrarán al registrar un nuevo análisis para este elemento.
          Si no seleccionas ninguno, se mostrarán todos los parámetros disponibles.
        </p>

        <div className="space-y-2">
          {ANALYSIS_PARAMS.map((param) => (
            <label
              key={param.key}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedParams.includes(param.key)}
                onChange={() => handleToggleParam(param.key)}
                className="w-5 h-5 text-cyan-600 rounded focus:ring-2 focus:ring-cyan-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-800">{param.label}</div>
                {param.unit && (
                  <div className="text-xs text-gray-500">Unidad: {param.unit}</div>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Total seleccionado:</strong> {selectedParams.length} parámetros
          </p>
        </div>
      </div>
    </div>
  );
}
