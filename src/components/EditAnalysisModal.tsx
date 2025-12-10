import { useState, useEffect } from 'react';
import { api, WaterAnalysis } from '../lib/api';
import { X, Save, Calculator } from 'lucide-react';

interface EditAnalysisModalProps {
  analysis: WaterAnalysis;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAnalysisModal({ analysis, onClose, onSuccess }: EditAnalysisModalProps) {
  const [formData, setFormData] = useState({
    sampled_at: analysis.sampled_at.slice(0, 16),
    ph: analysis.ph?.toString() || '',
    cloro_libre: analysis.cloro_libre?.toString() || '',
    cloro_total: analysis.cloro_total?.toString() || '',
    cloraminas: analysis.cloraminas?.toString() || '',
    alcalinidad: analysis.alcalinidad?.toString() || '',
    temperatura: analysis.temperatura?.toString() || '',
    turbidez: analysis.turbidez?.toString() || '',
    sdt: analysis.sdt?.toString() || '',
    conductividad: analysis.conductividad?.toString() || '',
    dureza_calcio: analysis.dureza_calcio?.toString() || '',
    fe: analysis.fe?.toString() || '',
    cu: analysis.cu?.toString() || '',
    lsi: analysis.lsi?.toString() || '',
    rsi: analysis.rsi?.toString() || '',
    comentario: analysis.comentario || '',
  });
  const [loading, setLoading] = useState(false);

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

      const autoCalculated = getAutoCalculatedValues();

      await api.updateWaterAnalysis(analysis.id, {
        sampled_at: sampledAtISO,
        ph: toNullableNumber(formData.ph),
        cloro_libre: toNullableNumber(formData.cloro_libre),
        cloro_total: toNullableNumber(formData.cloro_total),
        cloraminas: autoCalculated.cloraminas ?? toNullableNumber(formData.cloraminas),
        alcalinidad: toNullableNumber(formData.alcalinidad),
        temperatura: toNullableNumber(formData.temperatura),
        turbidez: toNullableNumber(formData.turbidez),
        sdt: toNullableNumber(formData.sdt),
        conductividad: toNullableNumber(formData.conductividad),
        dureza_calcio: toNullableNumber(formData.dureza_calcio),
        fe: toNullableNumber(formData.fe),
        cu: toNullableNumber(formData.cu),
        lsi: autoCalculated.lsi ?? toNullableNumber(formData.lsi),
        rsi: autoCalculated.rsi ?? toNullableNumber(formData.rsi),
        comentario: formData.comentario || null,
      });
      onSuccess();
    } catch (error) {
      console.error('Error updating analysis:', error);
      alert('Error al actualizar el análisis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-6 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <Save className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Editar Análisis</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha y Hora de Muestreo</label>
            <input
              type="datetime-local"
              value={formData.sampled_at}
              onChange={(e) => setFormData({ ...formData, sampled_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              required
              disabled={loading}
            />
          </div>

          <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
            <h4 className="font-semibold text-cyan-900 mb-3">PARÁMETROS PRINCIPALES</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">pH</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.ph}
                  onChange={(e) => setFormData({ ...formData, ph: e.target.value })}
                  placeholder="7.4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cloro Libre (ppm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.cloro_libre}
                  onChange={(e) => setFormData({ ...formData, cloro_libre: e.target.value })}
                  placeholder="2.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Temperatura (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperatura}
                  onChange={(e) => setFormData({ ...formData, temperatura: e.target.value })}
                  placeholder="26.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">CLORO Y ALCALINIDAD</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cloro Total (ppm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.cloro_total}
                  onChange={(e) => setFormData({ ...formData, cloro_total: e.target.value })}
                  placeholder="2.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cloraminas (ppm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.cloraminas}
                  onChange={(e) => setFormData({ ...formData, cloraminas: e.target.value })}
                  placeholder="0.3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alcalinidad (ppm CaCO3)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.alcalinidad}
                  onChange={(e) => setFormData({ ...formData, alcalinidad: e.target.value })}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-3">PARÁMETROS ADICIONALES</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SDT (ppm)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.sdt}
                  onChange={(e) => setFormData({ ...formData, sdt: e.target.value })}
                  placeholder="500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Conductividad (µS/cm)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.conductividad}
                  onChange={(e) => setFormData({ ...formData, conductividad: e.target.value })}
                  placeholder="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Turbidez (NTU)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.turbidez}
                  onChange={(e) => setFormData({ ...formData, turbidez: e.target.value })}
                  placeholder="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dureza Ca (ppm CaCO3)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.dureza_calcio}
                  onChange={(e) => setFormData({ ...formData, dureza_calcio: e.target.value })}
                  placeholder="200"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hierro (mg/L)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fe}
                  onChange={(e) => setFormData({ ...formData, fe: e.target.value })}
                  placeholder="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cobre (mg/L)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cu}
                  onChange={(e) => setFormData({ ...formData, cu: e.target.value })}
                  placeholder="0.05"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-semibold text-green-900 mb-3">ÍNDICES</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LSI (Índice Saturación Langelier)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.lsi}
                  onChange={(e) => setFormData({ ...formData, lsi: e.target.value })}
                  placeholder="0.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RSI (Índice Estabilidad Ryznar)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rsi}
                  onChange={(e) => setFormData({ ...formData, rsi: e.target.value })}
                  placeholder="7.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

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
                  Estos valores se calcularán y guardarán automáticamente al guardar los cambios
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
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-lg hover:from-cyan-700 hover:to-blue-800 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
