import { X } from 'lucide-react';
import { useState } from 'react';

interface MedalliaCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MedalliaCalculatorModal({ isOpen, onClose }: MedalliaCalculatorModalProps) {
  const [currentScore, setCurrentScore] = useState('');
  const [totalSurveys, setTotalSurveys] = useState('');
  const [targetScore, setTargetScore] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showMath, setShowMath] = useState(false);
  const [results, setResults] = useState({
    needed: 0,
    currentYes: 0,
    total: 0,
    target: 0,
    targetDecimal: 0,
    num: 0,
    den: 0,
    riskScoreRaw: 0,
    penalty: 0,
    surplusPerYes: 0,
    deficitPerNo: 0,
    ratio: 0,
  });

  const calculate = () => {
    const score = parseFloat(currentScore);
    const total = parseInt(totalSurveys);
    const target = parseFloat(targetScore);

    setShowResults(false);
    setShowMath(false);
    setErrorMsg('');

    if (isNaN(score) || isNaN(total) || isNaN(target)) {
      setErrorMsg('Por favor ingresa todos los datos numéricos.');
      return;
    }
    if (target >= 100 && score < 100) {
      setErrorMsg('Es imposible matemáticamente llegar al 100% con un error histórico.');
      return;
    }

    const currentYes = total * (score / 100);
    const targetDecimal = target / 100;

    const num = (target * total) - (100 * currentYes);
    const den = 100 - target;
    let needed = 0;
    if (target > score) {
      needed = Math.ceil(num / den);
      if (needed < 0) needed = 0;
    }

    const totalRisk = total + 1;
    const yesRisk = currentYes;
    const riskScoreRaw = (yesRisk / totalRisk) * 100;

    const numRisk = (target * totalRisk) - (100 * yesRisk);
    const neededRisk = Math.ceil(numRisk / den);
    const penalty = (neededRisk < 0 ? 0 : neededRisk) - needed;

    const surplusPerYes = 100 - target;
    const deficitPerNo = target;
    const ratio = deficitPerNo / surplusPerYes;

    setResults({
      needed,
      currentYes,
      total,
      target,
      targetDecimal,
      num,
      den,
      riskScoreRaw,
      penalty,
      surplusPerYes,
      deficitPerNo,
      ratio,
    });

    setShowResults(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="bg-blue-900 text-white p-6 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold">Calculadora de Objetivo Medallia</h2>
            <p className="text-sm opacity-90 mt-1">Proyección de Métricas y Análisis de Impacto</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-800 rounded-lg p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Score Actual (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={currentScore}
                onChange={(e) => setCurrentScore(e.target.value)}
                placeholder="82.5"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-900 focus:outline-none text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Total Encuestas (n)
              </label>
              <input
                type="number"
                value={totalSurveys}
                onChange={(e) => setTotalSurveys(e.target.value)}
                placeholder="150"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-900 focus:outline-none text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Meta Objetivo (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                placeholder="90"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-900 focus:outline-none text-lg"
              />
            </div>
          </div>

          <button
            onClick={calculate}
            className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-800 transition"
          >
            Calcular Proyección
          </button>

          {errorMsg && (
            <p className="text-red-600 text-center mt-3 font-medium">{errorMsg}</p>
          )}

          {showResults && (
            <div className="mt-6">
              <div className="bg-blue-50 border-l-4 border-blue-900 p-6 rounded-lg text-center mb-6">
                <div className="text-sm text-gray-700 mb-2">Necesitas obtener:</div>
                <div className="text-6xl font-extrabold text-blue-900 my-3">{results.needed}</div>
                <div className="text-gray-700">
                  Respuestas <strong>"SÍ"</strong> consecutivas para llegar al <strong>{Math.round(results.target)}%</strong>
                </div>
              </div>

              <button
                onClick={() => setShowMath(!showMath)}
                className="w-full py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                📐 {showMath ? 'Ocultar' : 'Ver'} Demostración Matemática (Para explicar al equipo)
              </button>

              {showMath && (
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-blue-900 border-b border-gray-300 pb-2 mb-4">
                      1. Planteamiento de la Ecuación
                    </h3>
                    <p className="mb-4">Buscamos <strong>X</strong> (cantidad de "SÍ" futuros) para que se cumpla la media:</p>
                    <div className="flex items-center justify-center text-2xl my-6">
                      <div className="inline-flex flex-col items-center border-b-2 border-black mx-2">
                        <div className="pb-1 px-2">{Math.round(results.currentYes)} + <strong className="text-blue-900">X</strong></div>
                        <div className="pt-1 px-2">{Math.round(results.total)} + <strong className="text-blue-900">X</strong></div>
                      </div>
                      <span className="mx-2">=</span>
                      <span>{results.targetDecimal.toFixed(3)}</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-blue-900 border-b border-gray-300 pb-2 mb-4">
                      2. Resultado Matemático
                    </h3>
                    <div className="text-center text-xl my-4">
                      Necesitas exactamente <strong>{(results.num / results.den).toFixed(2)}</strong> encuestas "SÍ".
                    </div>
                    <p className="text-center text-sm text-gray-600">(Redondeado a {results.needed})</p>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-blue-900 border-b border-gray-300 pb-2 mb-4">
                      3. Análisis de Impacto: El "Costo" de un NO
                    </h3>
                    <p className="mb-3">Si recibes <strong>1 queja</strong> hoy, el impacto es desproporcionado:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Tu score cae inmediatamente a: <strong>{results.riskScoreRaw.toFixed(3)}%</strong></li>
                      <li>La meta se aleja, requiriendo <strong>{results.penalty} encuestas extra</strong> solo para limpiar ese error.</li>
                    </ul>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-red-700 border-b border-red-300 pb-2 mb-4">
                      4. ¿Por qué 1 NO hace tanto daño? (Explicación Visual)
                    </h3>
                    <p className="mb-4">
                      Para mantener un promedio del <strong>{results.target}%</strong>, cada encuesta debe aportar puntos.
                      Imaginemos que es una cuenta bancaria:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white border-t-4 border-green-600 rounded-lg p-4 text-center">
                        <div className="text-sm text-gray-700 mb-2">Cuando recibes un SÍ (100%)</div>
                        <div className="text-3xl font-bold text-green-600 my-2">
                          +{results.surplusPerYes.toFixed(1)} Puntos
                        </div>
                        <div className="text-xs text-gray-600">
                          Abonas un poco al promedio<br />(100 - {results.target})
                        </div>
                      </div>
                      <div className="bg-white border-t-4 border-red-600 rounded-lg p-4 text-center">
                        <div className="text-sm text-gray-700 mb-2">Cuando recibes un NO (0%)</div>
                        <div className="text-3xl font-bold text-red-600 my-2">
                          -{results.deficitPerNo.toFixed(1)} Puntos
                        </div>
                        <div className="text-xs text-gray-600">
                          Generas una deuda enorme<br />(0 - {results.target})
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <strong className="block mb-3">LA REGLA DE COMPENSACIÓN:</strong>
                      <p className="mb-3">
                        Para pagar la "deuda" de <strong>-{results.deficitPerNo.toFixed(1)}</strong> puntos que deja un solo "NO",<br />
                        necesitas usar los pequeños "ahorros" de <strong>+{results.surplusPerYes.toFixed(1)}</strong> puntos que da cada "SÍ".
                      </p>
                      <div className="flex items-center justify-center text-xl my-4">
                        <div className="inline-flex flex-col items-center border-b-2 border-black mx-2">
                          <div className="pb-1 px-2 text-sm">Deuda ({results.deficitPerNo.toFixed(1)})</div>
                          <div className="pt-1 px-2 text-sm">Ahorro ({results.surplusPerYes.toFixed(1)})</div>
                        </div>
                        <span className="mx-2">=</span>
                        <strong>{results.ratio.toFixed(1)}</strong>
                        <span className="ml-2">Encuestas</span>
                      </div>
                      <p className="text-red-700 font-bold">
                        Conclusión: ¡Necesitas {Math.ceil(results.ratio)} "SÍ" perfectos solo para neutralizar 1 "NO"!
                      </p>
                    </div>
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
