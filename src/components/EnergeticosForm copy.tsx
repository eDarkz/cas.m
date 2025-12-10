import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getApiUrl } from '../utils/hotelConfig';
import { isLastDayOfMonth } from '../utils/dateUtils';
import GasTankLevels from './GasTankLevels';
import { Calendar, Droplets, Zap, Fuel, Save, CheckCircle, AlertCircle, BarChart3, TrendingUp } from 'lucide-react';

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

interface PreviousDayData {
  agua_municipal: number | null;
  medidor_testigo: number | null;
  medidor_desaladora: number | null;
  electricidad_base: number | null;
  electricidad_intermedio: number | null;
  electricidad_punta: number | null;
  demanda_base: number | null;
  demanda_intermedio: number | null;
  demanda_punta: number | null;
  potencia_reactiva: number | null;
}

const EnergeticosForm: React.FC = () => {
  const { hotelCode } = useParams<{ hotelCode: string }>();
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

  // Cargar datos del día anterior cuando cambia la fecha
  useEffect(() => {
    if (formData.fecha) {
      fetchPreviousDayData(formData.fecha);
    }
  }, [formData.fecha]);

  const fetchPreviousDayData = async (currentDate: string) => {
    if (!hotelCode) return;
    
    try {
      // Calcular fecha del día anterior
      const date = new Date(currentDate);
      date.setDate(date.getDate() - 1);
      const previousDate = date.toISOString().split('T')[0];
      
      console.log(`Buscando datos del día anterior: ${previousDate}`);
      
      const apiUrl = getApiUrl(hotelCode, 'energeticos');
      const response = await fetch(`${apiUrl}?inicio=${previousDate}&fin=${previousDate}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Datos del día anterior recibidos:', data);
        if (data && data.length > 0) {
          const dayData = data[0]; // Tomar el primer (y único) registro del día
          setPreviousDayData({
            agua_municipal: dayData.agua_municipal,
            medidor_testigo: dayData.medidor_testigo,
            medidor_desaladora: dayData.medidor_desaladora,
            electricidad_base: dayData.electricidad_base,
            electricidad_intermedio: dayData.electricidad_intermedio,
            electricidad_punta: dayData.electricidad_punta,
            demanda_base: dayData.demanda_base,
            demanda_intermedio: dayData.demanda_intermedio,
            demanda_punta: dayData.demanda_punta,
            potencia_reactiva: dayData.potencia_reactiva
          });
        } else {
          console.log('No se encontraron datos para el día anterior');
          setPreviousDayData(null);
        }
      } else {
        console.log('Error en la respuesta del servidor:', response.status);
        setPreviousDayData(null);
      }
    } catch (error) {
      console.warn('No se pudieron cargar los datos del día anterior:', error instanceof Error ? error.message : 'Error desconocido');
      // Silently fail - don't show error to user as this is not critical functionality
      setPreviousDayData(null);
    }
  };

  const validateReadings = (): string[] => {
    const errors: string[] = [];
    
    if (!previousDayData) {
      console.log('No hay datos del día anterior para validar');
      return errors;
    }

    console.log('Validando lecturas contra día anterior:', previousDayData);

    // Validar lecturas de agua
    const waterFields = [
      { field: 'agua_municipal', label: 'Agua Municipal', current: parseFloat(formData.agua_municipal) || 0, previous: previousDayData.agua_municipal },
      { field: 'medidor_testigo', label: 'Medidor Testigo', current: parseFloat(formData.medidor_testigo) || 0, previous: previousDayData.medidor_testigo },
      { field: 'medidor_desaladora', label: 'Medidor Desaladora', current: parseFloat(formData.medidor_desaladora) || 0, previous: previousDayData.medidor_desaladora }
    ];

    // Validar lecturas eléctricas
    const electricFields = [
      { field: 'electricidad_base', label: 'Electricidad Base', current: parseFloat(formData.electricidad_base) || 0, previous: previousDayData.electricidad_base },
      { field: 'electricidad_intermedio', label: 'Electricidad Intermedia', current: parseFloat(formData.electricidad_intermedio) || 0, previous: previousDayData.electricidad_intermedio },
      { field: 'electricidad_punta', label: 'Electricidad Punta', current: parseFloat(formData.electricidad_punta) || 0, previous: previousDayData.electricidad_punta },
      { field: 'potencia_reactiva', label: 'Potencia Reactiva', current: parseFloat(formData.potencia_reactiva) || 0, previous: previousDayData.potencia_reactiva }
    ];

    // Validar todos los campos
    [...waterFields, ...electricFields].forEach(({ field, label, current, previous }) => {
      // Solo validar si hay un valor ingresado y hay datos del día anterior
      if (formData[field as keyof FormData] && formData[field as keyof FormData] !== '' && previous !== null) {
        const currentValue = current;
        const previousValue = previous;
        
        console.log(`Validando ${label}: actual=${currentValue}, anterior=${previousValue}`);
        
        if (!isNaN(currentValue) && !isNaN(previousValue) && currentValue < previousValue) {
          console.log(`Error encontrado en ${label}: ${currentValue} < ${previousValue}`);
          errors.push(`${label}: ${currentValue.toFixed(2)} no puede ser menor que el día anterior (${previousValue.toFixed(2)})`);
        }
      }
    });

    console.log('Errores de validación encontrados:', errors);
    return errors;
  };

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previousDayData, setPreviousDayData] = useState<PreviousDayData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Estado para mostrar/ocultar la sección de tanques
  const [showGasTanks, setShowGasTanks] = useState(false);

  // Verificar si es último día del mes cuando cambia la fecha
  useEffect(() => {
    setShowGasTanks(isLastDayOfMonth(formData.fecha));
  }, [formData.fecha]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar errores de validación cuando el usuario modifica un campo
    if (validationErrors.length > 0) {
      setValidationErrors([]);
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar lecturas antes de enviar
    const errors = validateReadings();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setMessage({ type: 'error', text: 'Por favor corrige los errores de validación antes de continuar' });
      return;
    }
    
    setIsLoading(true);
    setMessage(null);
    setValidationErrors([]);

    if (!hotelCode) {
      setMessage({ type: 'error', text: 'Código de hotel no válido' });
      setIsLoading(false);
      return;
    }

    try {
      // Convertir strings vacíos a null y números a float
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

      const apiUrl = getApiUrl(hotelCode, 'energeticos');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Datos guardados correctamente' });
        // Resetear formulario manteniendo la fecha
        const currentDate = formData.fecha;
        setFormData({
          ...Object.keys(formData).reduce((acc, key) => {
            acc[key as keyof FormData] = key === 'fecha' ? currentDate : '';
            return acc;
          }, {} as FormData)
        });
      } else {
        setMessage({ type: 'error', text: 'Error al guardar los datos' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
    } finally {
      setIsLoading(false);
    }
  };

  const getGasPercentageColor = (percentage: string) => {
    const num = parseFloat(percentage);
    if (isNaN(num)) return 'bg-gray-200';
    if (num <= 20) return 'bg-red-500';
    if (num <= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header mejorado */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
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

        {/* Errores de validación */}
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800 mb-2">Errores de Validación:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sección Superior: Datos Generales con Instructivo + Agua y Gas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Columna Izquierda: Instructivo + Datos Generales */}
            <div className="space-y-6">
              {/* Mini Instructivo */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 h-64">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900">Guía de Registro</h3>
                </div>
                
                <div className="space-y-2.5 text-sm text-blue-800">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p><strong>Fecha:</strong> Selecciona el día del registro de datos</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p><strong>Lecturas:</strong> Ingresa los valores exactos de los medidores</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p><strong>Gas:</strong> Consumo diario en litros (opcional)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p><strong>Electricidad:</strong> Lecturas acumuladas de los medidores (obligatorio)</p>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium">
                    💡 Tip: Los campos marcados con * son obligatorios.
                  </p>
                </div>
              </div>
              
              {/* Datos Generales */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 h-64">
                <div className="flex items-center gap-3 mb-6">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Datos Generales</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      id="fecha"
                      name="fecha"
                      value={formData.fecha}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="tipo_cambio" className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Cambio
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      id="tipo_cambio"
                      name="tipo_cambio"
                      value={formData.tipo_cambio}
                      onChange={handleInputChange}
                      placeholder="0.0000"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="pax" className="block text-sm font-medium text-gray-700 mb-2">
                      PAX (Huéspedes)
                    </label>
                    <input
                      type="number"
                      id="pax"
                      name="pax"
                      value={formData.pax}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="habitaciones_ocupadas" className="block text-sm font-medium text-gray-700 mb-2">
                      Habitaciones Ocupadas
                    </label>
                    <input
                      type="number"
                      id="habitaciones_ocupadas"
                      name="habitaciones_ocupadas"
                      value={formData.habitaciones_ocupadas}
                      onChange={handleInputChange}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Agua y Gas */}
            <div className="space-y-6">
              {/* Lecturas de Agua */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 h-80">
                <div className="flex items-center gap-3 mb-4">
                  <Droplets className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Lecturas de Agua</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="medidor_testigo" className="block text-sm font-medium text-gray-700 mb-2">
                      Consumo del Día (Litros)
                      Medidor Testigo *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="medidor_testigo"
                      name="medidor_testigo"
                      value={formData.medidor_testigo}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="w-1/2 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="agua_municipal" className="block text-sm font-medium text-gray-700 mb-2">
                        Municipal
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="agua_municipal"
                        name="agua_municipal"
                        value={formData.agua_municipal}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="medidor_desaladora" className="block text-sm font-medium text-gray-700 mb-2">
                        Desaladora
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        id="medidor_desaladora"
                        name="medidor_desaladora"
                        value={formData.medidor_desaladora}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Consumo de Gas */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 h-48">
                <div className="flex items-center gap-3 mb-4">
                  <Fuel className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Consumo de Gas</h3>
                </div>
                
                <div>
                  <label htmlFor="consumo_gas" className="block text-sm font-medium text-gray-700 mb-2">
                    Consumo del Día (Litros) 
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="consumo_gas"
                    name="consumo_gas"
                    value={formData.consumo_gas}
                    onChange={handleInputChange}
                   
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-600">
                    Consumo total de gas del día
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Electricidad */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-yellow-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Lecturas Eléctricas</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Energía (kWh)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="electricidad_base" className="block text-sm font-medium text-gray-700 mb-2">
                      Energía Base *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="electricidad_base"
                      name="electricidad_base"
                      value={formData.electricidad_base}
                      onChange={handleInputChange}
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="electricidad_intermedio" className="block text-sm font-medium text-gray-700 mb-2">
                      Energía Intermedia *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="electricidad_intermedio"
                      name="electricidad_intermedio"
                      value={formData.electricidad_intermedio}
                      onChange={handleInputChange}
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="electricidad_punta" className="block text-sm font-medium text-gray-700 mb-2">
                      Energía Punta *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="electricidad_punta"
                      name="electricidad_punta"
                      value={formData.electricidad_punta}
                      onChange={handleInputChange}
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Demanda (kW)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="demanda_base" className="block text-sm font-medium text-gray-700 mb-2">
                      Potencia Base *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="demanda_base"
                      name="demanda_base"
                      value={formData.demanda_base}
                      onChange={handleInputChange}
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="demanda_intermedio" className="block text-sm font-medium text-gray-700 mb-2">
                      Potencia Intermedia *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="demanda_intermedio"
                      name="demanda_intermedio"
                      value={formData.demanda_intermedio}
                      onChange={handleInputChange}
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="demanda_punta" className="block text-sm font-medium text-gray-700 mb-2">
                      Potencia Punta *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="demanda_punta"
                      name="demanda_punta"
                      value={formData.demanda_punta}
                      onChange={handleInputChange}
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="max-w-xs">
                <label htmlFor="potencia_reactiva" className="block text-sm font-medium text-gray-700 mb-2">
                  Energía Reactiva *
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="potencia_reactiva"
                  name="potencia_reactiva"
                  value={formData.potencia_reactiva}
                  onChange={handleInputChange}
                  required
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Sección de Niveles de Tanques de Gas - Solo último día del mes */}
          {showGasTanks && (
            <GasTankLevels 
              selectedDate={formData.fecha}
              onSave={() => {
                // Opcional: callback cuando se guardan los niveles
                console.log('Niveles de tanques guardados');
              }}
            />
          )}

          {/* Botón Guardar */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Save className="w-5 h-5" />
              {isLoading ? 'Guardando...' : 'Guardar Datos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnergeticosForm;