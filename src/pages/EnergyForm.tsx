import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { energyApi } from '../lib/energyApi';
import { getApiUrl, getHotelCode } from '../utils/hotelConfig';
import { Calendar, Droplets, Zap, Fuel, Save, CheckCircle, AlertCircle, ArrowLeft, Gauge } from 'lucide-react';

interface FormData {
  fecha: string;
  tipo_cambio: string;
  pax: string;
  habitaciones_ocupadas: string;
  agua_municipal: string;
  medidor_testigo: string;
  medidor_desaladora: string;
  consumo_gas: string;
  electricidad_base: string;
  electricidad_intermedio: string;
  electricidad_punta: string;
  demanda_base: string;
  demanda_intermedio: string;
  demanda_punta: string;
  potencia_reactiva: string;
}

export default function EnergyForm() {
  const navigate = useNavigate();
  const hotelCode = getHotelCode();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fecha: new Date().toISOString().split('T')[0],
    tipo_cambio: '',
    pax: '',
    habitaciones_ocupadas: '',
    agua_municipal: '',
    medidor_testigo: '',
    medidor_desaladora: '',
    consumo_gas: '',
    electricidad_base: '',
    electricidad_intermedio: '',
    electricidad_punta: '',
    demanda_base: '',
    demanda_intermedio: '',
    demanda_punta: '',
    potencia_reactiva: '',
  });
  const [isLastDayOfMonth, setIsLastDayOfMonth] = useState(false);
  const [tankLevels, setTankLevels] = useState<number[]>(Array(14).fill(0));
  const [existingGasLevels, setExistingGasLevels] = useState<any>(null);

  useEffect(() => {
    checkIfLastDayOfMonth(formData.fecha);
    if (isLastDayOfMonth) {
      fetchExistingGasLevels(formData.fecha);
    }
  }, [formData.fecha]);

  const checkIfLastDayOfMonth = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const lastDay = new Date(year, month + 1, 0).getDate();
    setIsLastDayOfMonth(day === lastDay);
  };

  const fetchExistingGasLevels = async (dateString: string) => {
    try {
      const date = new Date(dateString + 'T00:00:00');
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const apiUrl = getApiUrl(hotelCode, 'gas-niveles-mes');

      const response = await fetch(`${apiUrl}/${year}/${month}`);

      if (response.ok) {
        const data = await response.json();
        setExistingGasLevels(data);

        const levels = [];
        for (let i = 1; i <= 14; i++) {
          const tankKey = `tanque${String(i).padStart(2, '0')}`;
          levels.push(data[tankKey] || 0);
        }
        setTankLevels(levels);
      } else {
        setExistingGasLevels(null);
        setTankLevels(Array(14).fill(0));
      }
    } catch (error) {
      console.error('Error fetching gas levels:', error);
      setExistingGasLevels(null);
      setTankLevels(Array(14).fill(0));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTankChange = (index: number, value: string) => {
    const numValue = Math.max(0, Math.min(100, parseFloat(value) || 0));
    const newLevels = [...tankLevels];
    newLevels[index] = numValue;
    setTankLevels(newLevels);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const dataToSend = Object.entries(formData).reduce((acc, [key, value]) => {
        if (key === 'fecha') {
          acc[key] = value;
        } else if (value === '') {
          acc[key] = null;
        } else {
          acc[key] = parseFloat(value);
        }
        return acc;
      }, {} as any);

      await energyApi.createEnergetico(dataToSend);

      if (isLastDayOfMonth) {
        await saveGasLevels();
      }

      setMessage({
        type: 'success',
        text: isLastDayOfMonth
          ? 'Datos y niveles de tanques guardados correctamente'
          : 'Datos guardados correctamente'
      });

      const currentDate = formData.fecha;
      setFormData({
        ...Object.keys(formData).reduce((acc, key) => {
          acc[key as keyof FormData] = key === 'fecha' ? currentDate : '';
          return acc;
        }, {} as FormData)
      });

      if (isLastDayOfMonth) {
        setTankLevels(Array(14).fill(0));
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar los datos' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveGasLevels = async () => {
    try {
      const date = new Date(formData.fecha + 'T00:00:00');
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const apiUrl = getApiUrl(hotelCode, 'gas-niveles-mes');

      const payload = {
        anio: year,
        mes: month,
        unidad: '%',
        capacidad_litros: 5000,
        tanques: tankLevels
      };

      let response;
      if (existingGasLevels) {
        response = await fetch(apiUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        throw new Error('Error al guardar niveles de tanques');
      }
    } catch (error) {
      console.error('Error saving gas levels:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/energy')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Registro de Energéticos
            </h1>
            <p className="text-slate-600 mt-1">Secrets Puerto Los Cabos</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Datos Generales</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha *</label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Cambio</label>
              <input
                type="number"
                step="0.0001"
                name="tipo_cambio"
                value={formData.tipo_cambio}
                onChange={handleInputChange}
                placeholder="0.0000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">PAX (Huéspedes)</label>
              <input
                type="number"
                name="pax"
                value={formData.pax}
                onChange={handleInputChange}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Habitaciones Ocupadas</label>
              <input
                type="number"
                name="habitaciones_ocupadas"
                value={formData.habitaciones_ocupadas}
                onChange={handleInputChange}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Droplets className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Lecturas de Agua</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Medidor Testigo *</label>
                <input
                  type="number"
                  step="0.01"
                  name="medidor_testigo"
                  value={formData.medidor_testigo}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Municipal</label>
                <input
                  type="number"
                  step="0.01"
                  name="agua_municipal"
                  value={formData.agua_municipal}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Desaladora</label>
                <input
                  type="number"
                  step="0.01"
                  name="medidor_desaladora"
                  value={formData.medidor_desaladora}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Fuel className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-slate-900">Consumo de Gas</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Consumo del Día (Litros)</label>
              <input
                type="number"
                step="0.01"
                name="consumo_gas"
                value={formData.consumo_gas}
                onChange={handleInputChange}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-yellow-600" />
            <h2 className="text-2xl font-semibold text-slate-900">Lecturas Eléctricas</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-slate-800 mb-4">Energía (kWh)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Base *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="electricidad_base"
                    value={formData.electricidad_base}
                    onChange={handleInputChange}
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Intermedia *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="electricidad_intermedio"
                    value={formData.electricidad_intermedio}
                    onChange={handleInputChange}
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Punta *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="electricidad_punta"
                    value={formData.electricidad_punta}
                    onChange={handleInputChange}
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-slate-800 mb-4">Demanda (kW)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Base *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="demanda_base"
                    value={formData.demanda_base}
                    onChange={handleInputChange}
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Intermedia *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="demanda_intermedio"
                    value={formData.demanda_intermedio}
                    onChange={handleInputChange}
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Punta *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="demanda_punta"
                    value={formData.demanda_punta}
                    onChange={handleInputChange}
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>
            </div>

            <div className="max-w-xs">
              <label className="block text-sm font-medium text-slate-700 mb-2">Energía Reactiva *</label>
              <input
                type="number"
                step="0.01"
                name="potencia_reactiva"
                value={formData.potencia_reactiva}
                onChange={handleInputChange}
                required
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>
        </div>

        {isLastDayOfMonth && (
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-300 shadow-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Fuel className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-orange-900">Niveles de Tanques de Gas - Cierre de Mes</h2>
                <p className="text-sm text-orange-700">Captura los niveles de los 14 tanques al cierre del mes</p>
              </div>
            </div>

            <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 mb-6 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Importante:</strong> Esta información se utilizará para el pronóstico energético y análisis de consumo de gas del próximo mes.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {tankLevels.map((level, index) => {
                const getColorClass = (lvl: number) => {
                  if (lvl >= 70) return 'border-green-400 bg-green-50';
                  if (lvl >= 40) return 'border-yellow-400 bg-yellow-50';
                  return 'border-red-400 bg-red-50';
                };

                return (
                  <div key={index} className="relative">
                    <div className={`rounded-xl p-4 border-2 ${getColorClass(level)} shadow-md transition-all`}>
                      <div className="text-center mb-3">
                        <p className="text-sm font-bold text-slate-800">Tanque {index + 1}</p>
                      </div>

                      <div className="relative h-24 bg-slate-200 rounded-lg overflow-hidden border-2 border-slate-300 mb-3">
                        <div
                          className={`absolute bottom-0 w-full transition-all duration-300 ${
                            level >= 70 ? 'bg-gradient-to-t from-green-500 to-emerald-600' :
                            level >= 40 ? 'bg-gradient-to-t from-yellow-500 to-orange-600' :
                            'bg-gradient-to-t from-red-500 to-rose-600'
                          }`}
                          style={{ height: `${level}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold text-slate-800 drop-shadow">
                            {level}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1 text-center">
                          Nivel (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={level}
                          onChange={(e) => handleTankChange(index, e.target.value)}
                          className="w-full px-2 py-1 text-center text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>

                      <div className="mt-2 text-center">
                        <p className="text-xs text-slate-600">
                          {((level * 5000) / 100).toLocaleString('es-MX', { maximumFractionDigits: 0 })}L
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 bg-white rounded-lg p-4 border border-orange-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-slate-600">Nivel Promedio</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {(tankLevels.reduce((sum, val) => sum + val, 0) / 14).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Disponible</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {tankLevels.reduce((sum, val) => sum + ((val * 5000) / 100), 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}L
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Capacidad Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    70,000L
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Ocupación</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {((tankLevels.reduce((sum, val) => sum + ((val * 5000) / 100), 0) / 70000) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/energy')}
            className="px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {isLoading ? 'Guardando...' : (isLastDayOfMonth ? 'Guardar Datos y Niveles' : 'Guardar Datos')}
          </button>
        </div>
      </form>
    </div>
  );
}
