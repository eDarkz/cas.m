import { useState } from 'react';
import { X, Calculator, AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown } from 'lucide-react';

interface WaterCalculatorModalProps {
  onClose: () => void;
}

export default function WaterCalculatorModal({ onClose }: WaterCalculatorModalProps) {
  const [formData, setFormData] = useState({
    ph: '',
    tds: '',
    temperatura: '',
    alcalinidad: '',
    dureza_calcio: '',
  });

  const [result, setResult] = useState<{
    lsi: number;
    rsi: number;
    phs: number;
  } | null>(null);

  const handleCalculate = () => {
    const ph = Number(formData.ph);
    const tds = Number(formData.tds);
    const tempC = Number(formData.temperatura);
    const alcalinidad = Number(formData.alcalinidad);
    const dureza = Number(formData.dureza_calcio);

    if (isNaN(ph) || isNaN(tds) || isNaN(tempC) || isNaN(alcalinidad) || isNaN(dureza)) {
      alert('Por favor completa todos los campos con valores numéricos válidos');
      return;
    }

    if (tds <= 0 || alcalinidad <= 0 || dureza <= 0) {
      alert('Los valores de TDS, Alcalinidad y Dureza Ca deben ser mayores a 0');
      return;
    }

    const log10 = (x: number) => Math.log(x) / Math.LN10;
    const A = (log10(tds) - 1) / 10;
    const B = -13.12 * log10(tempC + 273) + 34.55;
    const C = log10(dureza) - 0.4;
    const D = log10(alcalinidad);
    const pHs = (9.3 + A + B) - (C + D);
    const LSI = ph - pHs;
    const RSI = 2 * pHs - ph;

    const round3 = (v: number) => Math.round(v * 1000) / 1000;

    setResult({
      lsi: round3(LSI),
      rsi: round3(RSI),
      phs: round3(pHs),
    });
  };

  const handleReset = () => {
    setFormData({
      ph: '',
      tds: '',
      temperatura: '',
      alcalinidad: '',
      dureza_calcio: '',
    });
    setResult(null);
  };

  const getLSIStatus = (lsi: number) => {
    if (lsi < -0.5) return { color: 'red', text: 'CORROSIVO', icon: TrendingDown };
    if (lsi < -0.3) return { color: 'yellow', text: 'Ligeramente Corrosivo', icon: TrendingDown };
    if (lsi <= 0.3) return { color: 'green', text: 'EQUILIBRADO', icon: CheckCircle };
    if (lsi <= 0.5) return { color: 'yellow', text: 'Ligeramente Incrustante', icon: TrendingUp };
    return { color: 'red', text: 'INCRUSTANTE', icon: TrendingUp };
  };

  const getRSIStatus = (rsi: number) => {
    if (rsi < 6.0) return { color: 'red', text: 'Muy Incrustante', icon: TrendingUp };
    if (rsi < 6.5) return { color: 'yellow', text: 'Moderadamente Incrustante', icon: TrendingUp };
    if (rsi <= 7.5) return { color: 'green', text: 'EQUILIBRADO', icon: CheckCircle };
    if (rsi <= 8.0) return { color: 'yellow', text: 'Ligeramente Corrosivo', icon: TrendingDown };
    if (rsi <= 8.5) return { color: 'yellow', text: 'Moderadamente Corrosivo', icon: TrendingDown };
    return { color: 'red', text: 'Muy Corrosivo', icon: TrendingDown };
  };

  const calculateAdjustments = () => {
    if (!result) return null;

    const currentPh = Number(formData.ph);
    const targetPh = result.phs;
    const phDiff = targetPh - currentPh;

    const alcalinidad = Number(formData.alcalinidad);
    const dureza = Number(formData.dureza_calcio);

    return {
      phAdjustment: {
        needed: Math.abs(phDiff) > 0.1,
        direction: phDiff > 0 ? 'aumentar' : 'reducir',
        amount: Math.abs(phDiff).toFixed(2),
        targetPh: targetPh.toFixed(2),
      },
      alcalinidadAdjustment: {
        current: alcalinidad,
        recommended: alcalinidad < 80 ? '80-120' : alcalinidad > 150 ? '80-120' : 'OK',
        needsAdjustment: alcalinidad < 80 || alcalinidad > 150,
      },
      durezaAdjustment: {
        current: dureza,
        recommended: dureza < 200 ? '200-400' : dureza > 400 ? '200-400' : 'OK',
        needsAdjustment: dureza < 200 || dureza > 400,
      },
    };
  };

  const adjustments = result ? calculateAdjustments() : null;
  const lsiStatus = result ? getLSIStatus(result.lsi) : null;
  const rsiStatus = result ? getRSIStatus(result.rsi) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Calculadora LSI / RSI</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Calculadora de Índices de Saturación</p>
                <p>Calcula el LSI (Índice de Saturación de Langelier) y RSI (Índice de Estabilidad de Ryznar) para determinar si el agua está en equilibrio, es corrosiva o incrustante.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 text-lg">Parámetros del Agua</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  pH <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.ph}
                  onChange={(e) => setFormData({ ...formData, ph: e.target.value })}
                  placeholder="7.4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Rango típico: 7.2 - 7.8</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperatura (°C) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperatura}
                  onChange={(e) => setFormData({ ...formData, temperatura: e.target.value })}
                  placeholder="25"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Temperatura del agua</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TDS / SDT (mg/L) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  value={formData.tds}
                  onChange={(e) => setFormData({ ...formData, tds: e.target.value })}
                  placeholder="500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Sólidos Disueltos Totales</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alcalinidad (mg/L CaCO₃) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  value={formData.alcalinidad}
                  onChange={(e) => setFormData({ ...formData, alcalinidad: e.target.value })}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Rango ideal: 80-120 mg/L</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dureza Ca (mg/L CaCO₃) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  value={formData.dureza_calcio}
                  onChange={(e) => setFormData({ ...formData, dureza_calcio: e.target.value })}
                  placeholder="200"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Dureza de calcio como CaCO₃</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCalculate}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                Calcular
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Limpiar
              </button>
            </div>
          </div>

          {result && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-6">
                <h3 className="font-semibold text-purple-900 mb-4 text-lg">Resultados</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="text-sm text-gray-600 mb-1">pH de Saturación (pHs)</div>
                    <div className="text-3xl font-bold text-purple-700">{result.phs.toFixed(2)}</div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="text-sm text-gray-600 mb-1">LSI (Langelier)</div>
                    <div className="text-3xl font-bold text-purple-700">{result.lsi.toFixed(2)}</div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="text-sm text-gray-600 mb-1">RSI (Ryznar)</div>
                    <div className="text-3xl font-bold text-purple-700">{result.rsi.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {lsiStatus && rsiStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`bg-${lsiStatus.color}-50 border-2 border-${lsiStatus.color}-300 rounded-lg p-6`}>
                    <div className="flex items-center gap-3 mb-3">
                      <lsiStatus.icon className={`w-6 h-6 text-${lsiStatus.color}-700`} />
                      <h4 className={`font-bold text-${lsiStatus.color}-900 text-lg`}>Índice LSI</h4>
                    </div>
                    <div className={`text-2xl font-bold text-${lsiStatus.color}-700 mb-2`}>
                      {lsiStatus.text}
                    </div>
                    <div className={`text-sm text-${lsiStatus.color}-800`}>
                      {result.lsi < -0.3 && (
                        <p>El agua es corrosiva y puede dañar superficies metálicas y revestimientos.</p>
                      )}
                      {result.lsi >= -0.3 && result.lsi <= 0.3 && (
                        <p>El agua está en equilibrio. Condición ideal para piscinas.</p>
                      )}
                      {result.lsi > 0.3 && (
                        <p>El agua es incrustante y puede formar depósitos de calcio.</p>
                      )}
                    </div>
                    <div className={`mt-3 p-3 bg-white rounded border border-${lsiStatus.color}-200`}>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Escala LSI:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>&lt; -0.5: Muy corrosivo</li>
                        <li>-0.3 a 0.3: Equilibrado ✓</li>
                        <li>&gt; 0.5: Muy incrustante</li>
                      </ul>
                    </div>
                  </div>

                  <div className={`bg-${rsiStatus.color}-50 border-2 border-${rsiStatus.color}-300 rounded-lg p-6`}>
                    <div className="flex items-center gap-3 mb-3">
                      <rsiStatus.icon className={`w-6 h-6 text-${rsiStatus.color}-700`} />
                      <h4 className={`font-bold text-${rsiStatus.color}-900 text-lg`}>Índice RSI</h4>
                    </div>
                    <div className={`text-2xl font-bold text-${rsiStatus.color}-700 mb-2`}>
                      {rsiStatus.text}
                    </div>
                    <div className={`text-sm text-${rsiStatus.color}-800`}>
                      {result.rsi < 6.5 && (
                        <p>Tendencia a formar incrustaciones de carbonato de calcio.</p>
                      )}
                      {result.rsi >= 6.5 && result.rsi <= 7.5 && (
                        <p>El agua está balanceada. No es ni corrosiva ni incrustante.</p>
                      )}
                      {result.rsi > 7.5 && (
                        <p>El agua tiene propiedades corrosivas significativas.</p>
                      )}
                    </div>
                    <div className={`mt-3 p-3 bg-white rounded border border-${rsiStatus.color}-200`}>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Escala RSI:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>&lt; 6.0: Muy incrustante</li>
                        <li>6.5 - 7.5: Equilibrado ✓</li>
                        <li>&gt; 8.5: Muy corrosivo</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {adjustments && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                    <h4 className="font-bold text-orange-900 text-lg">Recomendaciones de Ajuste</h4>
                  </div>

                  <div className="space-y-4">
                    {adjustments.phAdjustment.needed && (
                      <div className="bg-white rounded-lg p-4 border border-orange-200">
                        <h5 className="font-semibold text-gray-900 mb-2">Ajuste de pH</h5>
                        <p className="text-sm text-gray-700">
                          Se recomienda <strong>{adjustments.phAdjustment.direction}</strong> el pH en aproximadamente{' '}
                          <strong>{adjustments.phAdjustment.amount}</strong> unidades.
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                          pH objetivo: <strong>{adjustments.phAdjustment.targetPh}</strong>
                        </p>
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-900">
                          {adjustments.phAdjustment.direction === 'aumentar' ? (
                            <p>💡 Usa carbonato de sodio (soda ash) o bicarbonato de sodio para subir el pH</p>
                          ) : (
                            <p>💡 Usa ácido muriático o bisulfato de sodio para bajar el pH</p>
                          )}
                        </div>
                      </div>
                    )}

                    {adjustments.alcalinidadAdjustment.needsAdjustment && (
                      <div className="bg-white rounded-lg p-4 border border-orange-200">
                        <h5 className="font-semibold text-gray-900 mb-2">Ajuste de Alcalinidad</h5>
                        <p className="text-sm text-gray-700">
                          Alcalinidad actual: <strong>{adjustments.alcalinidadAdjustment.current} mg/L</strong>
                        </p>
                        <p className="text-sm text-gray-700">
                          Rango recomendado: <strong>{adjustments.alcalinidadAdjustment.recommended} mg/L CaCO₃</strong>
                        </p>
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-900">
                          {adjustments.alcalinidadAdjustment.current < 80 ? (
                            <p>💡 Aumenta con bicarbonato de sodio</p>
                          ) : (
                            <p>💡 Reduce con ácido muriático gradualmente</p>
                          )}
                        </div>
                      </div>
                    )}

                    {adjustments.durezaAdjustment.needsAdjustment && (
                      <div className="bg-white rounded-lg p-4 border border-orange-200">
                        <h5 className="font-semibold text-gray-900 mb-2">Ajuste de Dureza de Calcio</h5>
                        <p className="text-sm text-gray-700">
                          Dureza actual: <strong>{adjustments.durezaAdjustment.current} mg/L</strong>
                        </p>
                        <p className="text-sm text-gray-700">
                          Rango recomendado: <strong>{adjustments.durezaAdjustment.recommended} mg/L CaCO₃</strong>
                        </p>
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-900">
                          {adjustments.durezaAdjustment.current < 200 ? (
                            <p>💡 Aumenta con cloruro de calcio</p>
                          ) : (
                            <p>💡 Diluye parcialmente con agua de menor dureza</p>
                          )}
                        </div>
                      </div>
                    )}

                    {!adjustments.phAdjustment.needed &&
                     !adjustments.alcalinidadAdjustment.needsAdjustment &&
                     !adjustments.durezaAdjustment.needsAdjustment && (
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-5 h-5" />
                          <p className="font-semibold">¡Agua en condiciones óptimas!</p>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          No se requieren ajustes mayores en este momento.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
