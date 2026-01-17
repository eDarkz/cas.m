import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, AquaticElement, WaterAnalysis, WaterParameter, AmenityLimit, ANALYSIS_PARAMS, AnalysisParamKey } from '../lib/api';
import { ArrowLeft, Plus, Download, TrendingUp, Droplets, Calendar, AlertTriangle, CheckCircle, FileText, Edit2, Trash2, Image, Settings, Edit, MapPin } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import CreateAnalysisModal from '../components/CreateAnalysisModal';
import EditAnalysisModal from '../components/EditAnalysisModal';
import CreateElementModal from '../components/CreateElementModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import WaterParameterChart, { TimeRange } from '../components/WaterParameterChart';
import ImageGalleryModal from '../components/ImageGalleryModal';
import { openHTMLReportInWindow } from '../lib/reportGenerator';
import { formatDateTime, formatDate, formatTime } from '../lib/utils';

export default function WaterChemistryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [element, setElement] = useState<AquaticElement | null>(null);
  const [analyses, setAnalyses] = useState<WaterAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<AmenityLimit[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditElementModal, setShowEditElementModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<WaterAnalysis | null>(null);
  const [analysisToDelete, setAnalysisToDelete] = useState<WaterAnalysis | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedParam, setSelectedParam] = useState<WaterParameter>('ph');
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Array<{ id: number; url: string; created_at: string }>>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [requiredParams, setRequiredParams] = useState<AnalysisParamKey[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);

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
      const [elementData, analysesData, paramsData] = await Promise.all([
        api.getAquaticElement(id),
        api.getWaterAnalyses({ element_id: id, pageSize: 100, orderDir: 'desc', withImages: 1 }),
        api.getElementRequiredParams(id),
      ]);

      setElement(elementData);
      setAnalyses(analysesData.data);
      setRequiredParams(paramsData.params);

      if (paramsData.params.length > 0) {
        setSelectedParam(paramsData.params[0] as WaterParameter);
      }

      if (elementData.amenity_type_id) {
        const limitsData = await api.getAmenityLimits({ amenity_type_id: elementData.amenity_type_id });
        setLimits(limitsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!element) return;

    openHTMLReportInWindow({
      element,
      analyses,
    });
  };

  const handleEdit = (analysis: WaterAnalysis) => {
    setSelectedAnalysis(analysis);
    setShowEditModal(true);
  };

  const handleDeleteClick = (analysis: WaterAnalysis) => {
    setAnalysisToDelete(analysis);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!analysisToDelete) return;
    setDeleting(true);
    try {
      await api.deleteWaterAnalysis(analysisToDelete.id);
      setShowDeleteModal(false);
      setAnalysisToDelete(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      alert('Error al eliminar el análisis');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setAnalysisToDelete(null);
  };

  const getStatusColor = (param: string, value: number | null | undefined): string => {
    if (value == null) return 'text-gray-400';

    const limit = limits.find(l => l.param_key === param);
    if (limit) {
      const isOutOfRange =
        (limit.min_value != null && value < limit.min_value) ||
        (limit.max_value != null && value > limit.max_value);

      if (isOutOfRange) {
        return 'text-red-600';
      }
      return 'text-green-600';
    }

    return 'text-blue-600';
  };

  const getLimitText = (paramKey: string): string | null => {
    const limit = limits.find(l => l.param_key === paramKey);
    if (!limit) return null;

    const paramDef = ANALYSIS_PARAMS.find(p => p.key === paramKey);
    const unit = paramDef?.unit || '';

    if (limit.min_value != null && limit.max_value != null) {
      return `Rango: ${limit.min_value} - ${limit.max_value} ${unit}`.trim();
    } else if (limit.min_value != null) {
      return `Mínimo: ${limit.min_value} ${unit}`.trim();
    } else if (limit.max_value != null) {
      return `Máximo: ${limit.max_value} ${unit}`.trim();
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HamsterLoader />
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

  const lastAnalysis = analyses[0];

  if (lastAnalysis) {
    console.log('🔍 lastAnalysis values:');
    console.log('  pH:', lastAnalysis.ph, typeof lastAnalysis.ph);
    console.log('  cloro_libre:', lastAnalysis.cloro_libre, typeof lastAnalysis.cloro_libre);
    console.log('  temperatura:', lastAnalysis.temperatura, typeof lastAnalysis.temperatura);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/water-chemistry')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">{element.nombre.toUpperCase()}</h2>
          <div className="flex items-center gap-4 mt-1">
            {element.ubicacion && (
              <p className="text-gray-500 text-sm">{element.ubicacion}</p>
            )}
            {element.amenity_nombre && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                {element.amenity_nombre}
              </span>
            )}
            {element.tipo && (
              <span className="text-gray-500 text-xs">({element.tipo})</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {element.lat && element.lon && (
            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
            >
              <MapPin className="w-4 h-4" />
              Ver en Mapa
            </button>
          )}
          <button
            onClick={() => setShowEditElementModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
          >
            <Edit className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={() => navigate(`/water-chemistry/${id}/config`)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            Configurar
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            Exportar Reporte
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:shadow-xl transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Nuevo Análisis
          </button>
        </div>
      </div>

      {lastAnalysis && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-bold text-blue-900">ÚLTIMAS LECTURAS</h3>
            <span className="ml-auto text-sm text-blue-700">
              {formatDateTime(lastAnalysis.sampled_at)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {requiredParams.map(paramKey => {
              const paramConfig = ANALYSIS_PARAMS.find(p => p.key === paramKey);
              if (!paramConfig) return null;
              const value = lastAnalysis[paramKey];
              const label = paramConfig.label;
              const unit = paramConfig.unit || '';
              const key = paramKey;
              const numValue = value != null ? Number(value) : null;
              const isValid = numValue != null && !isNaN(numValue);
              const limitText = getLimitText(key);
              return (
                <div key={label} className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="text-xs text-gray-600 mb-1">{label}</div>
                  <div className={`text-2xl font-bold ${getStatusColor(key, numValue)}`}>
                    {isValid ? `${numValue.toFixed(numValue < 10 ? 1 : 0)}${unit}` : '-'}
                  </div>
                  {limitText && isValid && (
                    <div className="text-xs text-gray-500 mt-1">{limitText}</div>
                  )}
                </div>
              );
            })}
          </div>
          {lastAnalysis.comentario && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700"><strong>Comentario:</strong> {lastAnalysis.comentario}</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <Calendar className="w-4 h-4" />
            <span>Rango de Tiempo</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setTimeRange('7d');
                setShowCustom(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === '7d'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => {
                setTimeRange('30d');
                setShowCustom(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === '30d'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
              }`}
            >
              30 días
            </button>
            <button
              onClick={() => {
                setTimeRange('90d');
                setShowCustom(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === '90d'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
              }`}
            >
              3 meses
            </button>
            <button
              onClick={() => {
                setTimeRange('6m');
                setShowCustom(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === '6m'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
              }`}
            >
              6 meses
            </button>
            <button
              onClick={() => {
                setTimeRange('1y');
                setShowCustom(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === '1y'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
              }`}
            >
              1 año
            </button>
            <button
              onClick={() => {
                setTimeRange('all');
                setShowCustom(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => {
                setTimeRange('custom');
                setShowCustom(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === 'custom'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
              }`}
            >
              Personalizado
            </button>
          </div>

          {showCustom && (
            <div className="flex flex-wrap gap-3 items-end bg-white p-3 rounded-lg border border-blue-200">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-600" />
            <h3 className="text-lg font-bold text-gray-800">GRÁFICA DE PARÁMETROS</h3>
          </div>
          <select
            value={selectedParam}
            onChange={(e) => setSelectedParam(e.target.value as WaterParameter)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
          >
            {requiredParams.length === 0 ? (
              <option value="">Sin parámetros configurados</option>
            ) : (
              requiredParams.map(paramKey => {
                const paramConfig = ANALYSIS_PARAMS.find(p => p.key === paramKey);
                return paramConfig ? (
                  <option key={paramKey} value={paramKey}>
                    {paramConfig.label}
                  </option>
                ) : null;
              })
            )}
          </select>
        </div>

        {id && (
          <WaterParameterChart
            elementId={id}
            parameter={selectedParam}
            timeRange={timeRange}
            customFrom={customFrom}
            customTo={customTo}
            limits={limits}
          />
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-800">HISTORIAL DE ANÁLISIS</h3>
          <p className="text-sm text-gray-500 mt-1">Total: {analyses.length} registros</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Fecha</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">pH</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">CL</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">CT</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Alcal.</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Temp</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">LSI</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Estado</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {analyses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    No hay análisis registrados
                  </td>
                </tr>
              ) : (
                analyses.map((analysis) => {
                  const phOk = analysis.ph != null && analysis.ph >= 7.2 && analysis.ph <= 7.6;
                  const clOk = analysis.cloro_libre != null && analysis.cloro_libre >= 1.0 && analysis.cloro_libre <= 3.0;
                  const lsiOk = analysis.lsi != null && analysis.lsi >= -0.3 && analysis.lsi <= 0.3;
                  const allOk = phOk && clOk && lsiOk;

                  return (
                    <tr key={analysis.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {formatDate(analysis.sampled_at)}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {formatTime(analysis.sampled_at)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold ${getStatusColor('ph', analysis.ph)}`}>
                        {analysis.ph != null && !isNaN(Number(analysis.ph)) ? Number(analysis.ph).toFixed(1) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold ${getStatusColor('cloro_libre', analysis.cloro_libre)}`}>
                        {analysis.cloro_libre != null && !isNaN(Number(analysis.cloro_libre)) ? Number(analysis.cloro_libre).toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {analysis.cloro_total != null && !isNaN(Number(analysis.cloro_total)) ? Number(analysis.cloro_total).toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {analysis.alcalinidad != null && !isNaN(Number(analysis.alcalinidad)) ? Number(analysis.alcalinidad).toFixed(0) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {analysis.temperatura != null && !isNaN(Number(analysis.temperatura)) ? `${Number(analysis.temperatura).toFixed(1)}°C` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-center font-semibold ${getStatusColor('lsi', analysis.lsi)}`}>
                        {analysis.lsi != null && !isNaN(Number(analysis.lsi)) ? Number(analysis.lsi).toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {allOk ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            OK
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            Revisar
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {analysis.images && analysis.images.length > 0 && (
                            <button
                              onClick={() => {
                                setSelectedImages(analysis.images || []);
                                setShowImageGallery(true);
                              }}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors relative"
                              title={`Ver ${analysis.images.length} imagen${analysis.images.length > 1 ? 'es' : ''}`}
                            >
                              <Image className="w-4 h-4" />
                              {analysis.images.length > 1 && (
                                <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                  {analysis.images.length}
                                </span>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(analysis)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar análisis"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(analysis)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar análisis"
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

      {showCreateModal && (
        <CreateAnalysisModal
          elementId={id!}
          elementName={element.nombre}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {showEditModal && selectedAnalysis && (
        <EditAnalysisModal
          analysis={selectedAnalysis}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAnalysis(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedAnalysis(null);
            loadData();
          }}
        />
      )}

      {showDeleteModal && analysisToDelete && (
        <ConfirmDeleteModal
          title="Eliminar Análisis"
          message="¿Estás seguro de que deseas eliminar este análisis fisicoquímico?"
          itemName={`Muestreo del ${formatDate(analysisToDelete.sampled_at)} a las ${formatTime(analysisToDelete.sampled_at)}`}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          loading={deleting}
        />
      )}

      {showEditElementModal && element && (
        <CreateElementModal
          element={{
            id: element.id,
            nombre: element.nombre,
            ubicacion: element.ubicacion || undefined,
            amenity_type_id: element.amenity_type_id,
            tipo: element.tipo,
            lat: element.lat,
            lon: element.lon,
          }}
          onClose={() => setShowEditElementModal(false)}
          onSuccess={() => {
            setShowEditElementModal(false);
            loadData();
          }}
        />
      )}

      {showImageGallery && selectedImages.length > 0 && (
        <ImageGalleryModal
          images={selectedImages}
          onClose={() => {
            setShowImageGallery(false);
            setSelectedImages([]);
          }}
        />
      )}

      {showLocationModal && element?.lat && element?.lon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-green-600" />
                  Ubicación: {element.nombre}
                </h3>
                {element.ubicacion && (
                  <p className="text-sm text-gray-600 mt-1">{element.ubicacion}</p>
                )}
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 relative">
              <iframe
                src={`https://www.google.com/maps?q=${element.lat},${element.lon}&z=19&output=embed`}
                className="w-full h-[600px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Coordenadas:</span> {element.lat.toFixed(6)}, {element.lon.toFixed(6)}
              </div>
              <a
                href={`https://www.google.com/maps?q=${element.lat},${element.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
              >
                <MapPin className="w-4 h-4" />
                Abrir en Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
