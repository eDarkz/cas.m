import { useState, useRef, useEffect } from 'react';
import { api, AnalysisParamKey, ANALYSIS_PARAMS } from '../lib/api';
import { X, TestTube, Upload, Trash2, Calculator } from 'lucide-react';

interface CreateAnalysisModalProps {
  elementId: string;
  elementName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateAnalysisModal({ elementId, elementName, onClose, onSuccess }: CreateAnalysisModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({
    sampled_at: new Date().toISOString().slice(0, 16),
    comentario: '',
  });
  const [requiredParams, setRequiredParams] = useState<AnalysisParamKey[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingParams, setLoadingParams] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRequiredParams();
  }, [elementId]);

  const loadRequiredParams = async () => {
    try {
      const config = await api.getElementRequiredParams(elementId);
      setRequiredParams(config.params);
      const initialData: Record<string, string> = {
        sampled_at: new Date().toISOString().slice(0, 16),
        comentario: '',
      };
      config.params.forEach(param => {
        initialData[param] = '';
      });
      setFormData(initialData);
    } catch (error) {
      console.error('Error loading required params:', error);
      alert('Error al cargar la configuración del elemento');
    } finally {
      setLoadingParams(false);
    }
  };

  const toNullableNumber = (value: string): number | null => {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  const calculateCloraminas = (cloroTotal: number | null, cloroLibre: number | null): number | null => {
    if (cloroTotal === null || cloroLibre === null) return null;
    const cloraminas = cloroTotal - cloroLibre;
    return cloraminas >= 0 ? Number(cloraminas.toFixed(2)) : null;
  };

  const calculateLSI = (
    ph: number | null,
    temperatura: number | null,
    calcio: number | null,
    alcalinidad: number | null,
    tds: number | null
  ): number | null => {
    if (ph === null || temperatura === null || calcio === null || alcalinidad === null || tds === null) return null;

    const tempC = temperatura;
    const calcioMgL = calcio;
    const alcalinidadMgL = alcalinidad;
    const tdsMgL = tds;

    const A = (Math.log10(tdsMgL) - 1) / 10;
    const B = -13.12 * Math.log10(tempC + 273) + 34.55;
    const C = Math.log10(calcioMgL) - 0.4;
    const D = Math.log10(alcalinidadMgL);

    const pHs = (9.3 + A + B) - (C + D);
    const lsi = ph - pHs;

    console.log('Cálculo LSI detallado:', { A, B, C, D, pHs, lsi });

    return Number(lsi.toFixed(2));
  };

  const calculateRSI = (
    ph: number | null,
    temperatura: number | null,
    calcio: number | null,
    alcalinidad: number | null,
    tds: number | null
  ): number | null => {
    const lsi = calculateLSI(ph, temperatura, calcio, alcalinidad, tds);
    if (lsi === null || ph === null) return null;

    const pHs = ph - lsi;
    const rsi = 2 * pHs - ph;

    return Number(rsi.toFixed(2));
  };

  const getAutoCalculatedValues = (): Record<string, number | null> => {
    const autoCalc: Record<string, number | null> = {};

    const cloroTotal = toNullableNumber(formData.cloro_total);
    const cloroLibre = toNullableNumber(formData.cloro_libre);
    if (cloroTotal !== null && cloroLibre !== null) {
      autoCalc.cloraminas = calculateCloraminas(cloroTotal, cloroLibre);
    }

    const ph = toNullableNumber(formData.ph);
    const temperatura = toNullableNumber(formData.temperatura);
    const calcio = toNullableNumber(formData.dureza_calcio);
    const alcalinidad = toNullableNumber(formData.alcalinidad);
    const tds = toNullableNumber(formData.sdt);

    console.log('Debug LSI/RSI - Valores ingresados:', {
      ph, temperatura, calcio, alcalinidad, tds,
      formData: {
        ph: formData.ph,
        temperatura: formData.temperatura,
        dureza_calcio: formData.dureza_calcio,
        alcalinidad: formData.alcalinidad,
        sdt: formData.sdt
      }
    });

    if (ph !== null && temperatura !== null && calcio !== null && alcalinidad !== null && tds !== null) {
      const calculatedLSI = calculateLSI(ph, temperatura, calcio, alcalinidad, tds);
      const calculatedRSI = calculateRSI(ph, temperatura, calcio, alcalinidad, tds);
      console.log('LSI calculado:', calculatedLSI, 'RSI calculado:', calculatedRSI);
      autoCalc.lsi = calculatedLSI;
      autoCalc.rsi = calculatedRSI;
    } else {
      console.log('No se calculó LSI/RSI - faltan valores');
    }

    return autoCalc;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const sampledAtISO = formData.sampled_at ? new Date(formData.sampled_at).toISOString() : new Date().toISOString();

      const analysisData: any = {
        element_id: elementId,
        sampled_at: sampledAtISO,
        comentario: formData.comentario || null,
        images: images.length > 0 ? images : undefined,
      };

      requiredParams.forEach(param => {
        analysisData[param] = toNullableNumber(formData[param]);
      });

      const autoCalculated = getAutoCalculatedValues();
      Object.keys(autoCalculated).forEach(key => {
        if (autoCalculated[key] !== null) {
          analysisData[key] = autoCalculated[key];
        }
      });

      await api.createWaterAnalysis(analysisData);
      onSuccess();
    } catch (error) {
      console.error('Error creating analysis:', error);
      alert('Error al registrar el análisis');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formdata = new FormData();
      formdata.append('image', file);

      const response = await fetch('https://api.imgur.com/3/image/', {
        method: 'POST',
        headers: {
          Authorization: 'Client-ID 02a4ea9a28b0429',
        },
        body: formdata,
      });

      const data = await response.json();

      if (data.status === 200 && data.data?.link) {
        setImages([...images, data.data.link]);
      } else {
        alert('Error al subir la imagen a Imgur');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const getStepValue = (paramKey: string): string => {
    if (paramKey === 'ph' || paramKey.includes('lsi') || paramKey.includes('rsi') ||
        paramKey.includes('turbidez') || paramKey.includes('fe') || paramKey.includes('cu')) {
      return '0.01';
    }
    if (paramKey.includes('cloro') || paramKey.includes('temperatura')) {
      return '0.1';
    }
    return '1';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl my-8">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white rounded-t-xl z-10">
          <div className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-cyan-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">NUEVO ANÁLISIS FISICOQUÍMICO</h3>
              <p className="text-sm text-gray-500">{elementName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loadingParams ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha y Hora de Muestreo
                </label>
                <input
                  type="datetime-local"
                  value={formData.sampled_at}
                  onChange={(e) => setFormData({ ...formData, sampled_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {requiredParams.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-yellow-800">No hay parámetros configurados para este elemento.</p>
                  <p className="text-sm text-yellow-600 mt-1">Ve a Configurar para seleccionar los parámetros a capturar.</p>
                </div>
              ) : (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3">PARÁMETROS CONFIGURADOS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {requiredParams.map(paramKey => {
                      const paramConfig = ANALYSIS_PARAMS.find(p => p.key === paramKey);
                      if (!paramConfig) return null;
                      return (
                        <div key={paramKey}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {paramConfig.label} {paramConfig.unit && `(${paramConfig.unit})`}
                          </label>
                          <input
                            type="number"
                            step={getStepValue(paramKey)}
                            value={formData[paramKey] || ''}
                            onChange={(e) => setFormData({ ...formData, [paramKey]: e.target.value })}
                            placeholder={paramConfig.placeholder || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                            disabled={loading}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(() => {
                const autoCalc = getAutoCalculatedValues();
                const hasAutoCalc = Object.values(autoCalc).some(v => v !== null && v !== undefined);

                if (!hasAutoCalc) return null;

                return (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-4 border-2 border-emerald-300 shadow-md">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg">
                        <Calculator className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-bold text-emerald-900 text-lg">VALORES CALCULADOS AUTOMÁTICAMENTE</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {autoCalc.cloraminas !== null && autoCalc.cloraminas !== undefined && (
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-emerald-200">
                          <div className="text-xs text-gray-600 mb-1 font-medium">Cloraminas</div>
                          <div className="text-2xl font-bold text-emerald-700">{autoCalc.cloraminas.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">ppm</div>
                        </div>
                      )}
                      {autoCalc.lsi !== null && autoCalc.lsi !== undefined && (
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-emerald-200">
                          <div className="text-xs text-gray-600 mb-1 font-medium">LSI (Langelier)</div>
                          <div className="text-2xl font-bold text-emerald-700">{autoCalc.lsi.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">
                            {autoCalc.lsi < -0.5 ? 'Corrosivo' : autoCalc.lsi > 0.5 ? 'Incrustante' : 'Balanceado'}
                          </div>
                        </div>
                      )}
                      {autoCalc.rsi !== null && autoCalc.rsi !== undefined && (
                        <div className="bg-white rounded-lg p-3 shadow-sm border border-emerald-200">
                          <div className="text-xs text-gray-600 mb-1 font-medium">RSI (Ryznar)</div>
                          <div className="text-2xl font-bold text-emerald-700">{autoCalc.rsi.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">
                            {autoCalc.rsi < 6 ? 'Incrustante' : autoCalc.rsi > 7 ? 'Corrosivo' : 'Balanceado'}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-emerald-800 bg-emerald-100 rounded px-3 py-2">
                      Estos valores se calcularán y guardarán automáticamente con el análisis
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comentarios</label>
                <textarea
                  value={formData.comentario}
                  onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes</label>
                <div className="mb-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={loading || uploadingImage}
                    className="hidden"
                    id="image-upload-analysis"
                  />
                  <label
                    htmlFor="image-upload-analysis"
                    className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-cyan-500 hover:bg-cyan-50 transition-all ${
                      (loading || uploadingImage) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploadingImage ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600"></div>
                        <span className="text-sm text-gray-600">Subiendo imagen...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">Haz clic para seleccionar una imagen</span>
                      </>
                    )}
                  </label>
                </div>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3E❌%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || loadingParams}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-xl transition-all font-medium disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Registrar Análisis'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
