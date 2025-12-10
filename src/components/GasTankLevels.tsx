import React, { useState, useEffect } from 'react';
import { getApiUrl, getHotelCode } from '../utils/hotelConfig';
import { getMonthName } from '../utils/dateUtils';
import { Fuel, Save, AlertCircle, CheckCircle, Gauge } from 'lucide-react';

interface GasTankLevelsProps {
  selectedDate: string;
  onSave?: () => void;
}

interface GasLevelsData {
  id?: number;
  hotel_codigo: string;
  anio: number;
  mes: number;
  unidad: string;
  capacidad_litros: number;
  tanque01: number;
  tanque02: number;
  tanque03: number;
  tanque04: number;
  tanque05: number;
  tanque06: number;
  tanque07: number;
  tanque08: number;
  tanque09: number;
  tanque10: number;
  tanque11: number;
  tanque12: number;
  tanque13: number;
  tanque14: number;
}

const GasTankLevels: React.FC<GasTankLevelsProps> = ({ selectedDate, onSave }) => {
  const hotelCode = getHotelCode();
  const [tankLevels, setTankLevels] = useState<number[]>(Array(14).fill(0));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingData, setExistingData] = useState<GasLevelsData | null>(null);

  const date = new Date(selectedDate.split('T')[0] + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  useEffect(() => {
    fetchExistingData();
  }, [selectedDate]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchExistingData = async () => {
    try {
      const apiUrl = getApiUrl(hotelCode, 'gas-niveles-mes');
      const response = await fetch(`${apiUrl}/${year}/${month}`);

      if (response.ok) {
        const data = await response.json();
        setExistingData(data);

        const levels = [];
        for (let i = 1; i <= 14; i++) {
          const tankKey = `tanque${String(i).padStart(2, '0')}` as keyof GasLevelsData;
          levels.push(data[tankKey] as number || 0);
        }
        setTankLevels(levels);
      } else if (response.status !== 404) {
        console.error('Error fetching existing data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching existing gas levels:', error);
    }
  };

  const handleTankChange = (index: number, value: string) => {
    const numValue = Math.max(0, Math.min(100, parseFloat(value) || 0));
    const newLevels = [...tankLevels];
    newLevels[index] = numValue;
    setTankLevels(newLevels);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const apiUrl = getApiUrl(hotelCode, 'gas-niveles-mes');
      const payload = {
        anio: year,
        mes: month,
        unidad: '%',
        capacidad_litros: 5000,
        tanques: tankLevels
      };

      let response;
      if (existingData) {
        response = await fetch(`${apiUrl}/${year}/${month}`, {
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

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Niveles de tanques ${existingData ? 'actualizados' : 'guardados'} correctamente`
        });
        await fetchExistingData();
        setTimeout(() => {
          if (onSave) onSave();
        }, 1500);
      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: errorData.message || 'Error al guardar los niveles'
        });
      }
    } catch (error) {
      console.error('Error saving:', error);
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const getTotalLiters = () => {
    return tankLevels.reduce((total, level) => total + (level * 5000 / 100), 0);
  };

  const getAverageLevel = () => {
    return tankLevels.reduce((sum, level) => sum + level, 0) / 14;
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-orange-50 to-red-100 rounded-xl shadow-lg p-6 border border-orange-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Fuel className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            Niveles de Tanques de Gas - {getMonthName(month)} {year}
          </h3>
          <p className="text-sm text-gray-600">
            Registro de niveles al final del mes (14 tanques de 5,000L c/u)
          </p>
        </div>
      </div>

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

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Promedio</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {getAverageLevel().toFixed(1)}%
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <Fuel className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Total Litros</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {getTotalLiters().toLocaleString('es-MX', { maximumFractionDigits: 0 })}L
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-4 bg-orange-600 rounded-full"></span>
            <span className="text-sm font-medium text-gray-700">Capacidad Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-600">70,000L</p>
        </div>
      </div>

      {/* Grid de tanques */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {tankLevels.map((level, index) => (
          <div key={index} className="bg-white rounded-lg p-3 border border-orange-100">
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Tanque {String(index + 1).padStart(2, '0')}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={level}
                onChange={(e) => handleTankChange(index, e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="0"
              />
              <span className="absolute right-2 top-2 text-xs text-gray-500">%</span>
            </div>
            
            {/* Indicador visual del nivel */}
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  level >= 80 ? 'bg-green-500' :
                  level >= 50 ? 'bg-yellow-500' :
                  level >= 20 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
              ></div>
            </div>
            
            <p className="text-xs text-gray-600 mt-1 text-center">
              {(level * 50).toFixed(0)}L
            </p>
          </div>
        ))}
      </div>

      {/* Botón guardar */}
      <div className="flex justify-center">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-3 px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 focus:ring-4 focus:ring-orange-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Guardando...' : (existingData ? 'Actualizar Niveles' : 'Guardar Niveles')}
        </button>
      </div>
    </div>
  );
};

export default GasTankLevels;