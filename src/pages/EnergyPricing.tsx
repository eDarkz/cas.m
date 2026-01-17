import React, { useState, useEffect } from 'react';
import { getApiUrl, getHotelCode } from '../utils/hotelConfig';
import { DollarSign, Plus, Edit3, Save, X, Trash2, TrendingUp, BarChart3, Calculator, Zap, Droplets, Fuel, Calendar } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import EnergyNavigation from '../components/EnergyNavigation';

interface PreciosEnergia {
  id: number;
  mes: number;
  anio: number;
  costo_fijo: number;
  costo_energia_base: number;
  costo_energia_intermedia: number;
  costo_energia_punta: number;
  costo_distribucion: number;
  costo_capacidad: number;
  precio_gas: number;
  precio_agua: number;
}

interface FormData {
  mes: string;
  anio: string;
  costo_fijo: string;
  costo_energia_base: string;
  costo_energia_intermedia: string;
  costo_energia_punta: string;
  costo_capacidad: string;
  precio_gas: string;
  precio_agua: string;
}

export default function EnergyPricing() {
  const hotelCode = getHotelCode();
  const [precios, setPrecios] = useState<PreciosEnergia[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    mes: '',
    anio: new Date().getFullYear().toString(),
    costo_fijo: '',
    costo_energia_base: '',
    costo_energia_intermedia: '',
    costo_energia_punta: '',
    costo_distribucion: '',
    costo_capacidad: '',
    precio_gas: '',
    precio_agua: ''
  });

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    fetchPrecios();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchPrecios = async () => {
    if (!hotelCode) return;
    
    try {
      const apiUrl = getApiUrl(hotelCode, 'precios-energia');
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      // Check if data is an array before processing
      if (Array.isArray(data)) {
        setPrecios(data.sort((a: PreciosEnergia, b: PreciosEnergia) => b.anio - a.anio || b.mes - a.mes));
        
        // Extraer años únicos
        const years = [...new Set(data.map((item: PreciosEnergia) => item.anio))].sort((a, b) => b - a);
        setAvailableYears(years);
        if (years.length > 0) {
          setSelectedYear(years[0]);
        }
      } else {
        // Handle case where data is not an array
        setPrecios([]);
        setAvailableYears([]);
        setMessage({ type: 'error', text: 'Formato de datos inválido recibido del servidor' });
      }
    } catch (error) {
      console.error('Error fetching precios:', error);
      setMessage({ type: 'error', text: 'Error al cargar los precios' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (!hotelCode) return;
    
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        mes: parseInt(formData.mes),
        anio: parseInt(formData.anio),
        costo_fijo: parseFloat(formData.costo_fijo),
        costo_energia_base: parseFloat(formData.costo_energia_base),
        costo_energia_intermedia: parseFloat(formData.costo_energia_intermedia),
        costo_energia_punta: parseFloat(formData.costo_energia_punta),
        costo_distribucion: parseFloat(formData.costo_distribucion),
        costo_capacidad: parseFloat(formData.costo_capacidad),
        precio_gas: parseFloat(formData.precio_gas),
        precio_agua: parseFloat(formData.precio_agua)
      };

      let response;
      const apiUrl = getApiUrl(hotelCode, 'precios-energia');
      if (editingId) {
        response = await fetch(`${apiUrl}/${formData.anio}/${formData.mes}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        });
      } else {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend)
        });
      }

      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: editingId ? 'Precio actualizado correctamente' : 'Precio agregado correctamente' });
        fetchPrecios();
        resetForm();
      } else {
        setMessage({ type: 'error', text: 'Error al guardar el precio' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (precio: PreciosEnergia) => {
    setEditingId(precio.id);
    setFormData({
      mes: precio.mes.toString(),
      anio: precio.anio.toString(),
      costo_fijo: precio.costo_fijo.toString(),
      costo_energia_base: precio.costo_energia_base.toString(),
      costo_energia_intermedia: precio.costo_energia_intermedia.toString(),
      costo_energia_punta: precio.costo_energia_punta.toString(),
      costo_distribucion: precio.costo_distribucion.toString(),
      costo_capacidad: precio.costo_capacidad.toString(),
      precio_gas: precio.precio_gas.toString(),
      precio_agua: precio.precio_agua.toString()
    });
    setShowEditModal(true);
  };

  const handleDelete = async (anio: number, mes: number) => {
    if (!hotelCode) return;
    
    if (window.confirm('¿Estás seguro de que deseas eliminar esta tarifa?')) {
      try {
        const apiUrl = getApiUrl(hotelCode, 'precios-energia');
        const response = await fetch(`${apiUrl}/${anio}/${mes}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setMessage({ type: 'success', text: 'Precio eliminado correctamente' });
          fetchPrecios();
        } else {
          setMessage({ type: 'error', text: 'Error al eliminar el precio' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      mes: '',
      anio: new Date().getFullYear().toString(),
      costo_fijo: '',
      costo_energia_base: '',
      costo_energia_intermedia: '',
      costo_energia_punta: '',
      costo_distribucion: '',
      costo_capacidad: '',
      precio_gas: '',
      precio_agua: ''
    });
    setEditingId(null);
    setShowForm(false);
    setShowEditModal(false);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency',
      currency: 'MXN'
    }).format(num);
  };

  // Filtrar precios por año seleccionado
  const filteredPrecios = precios.filter(precio => precio.anio === selectedYear);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <HamsterLoader />
          <p className="text-gray-600">Cargando datos de precios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <EnergyNavigation
          title="Gestión de Precios"
          description="Administra tarifas de energéticos y visualiza tendencias de precios"
          currentSection="pricing"
        />

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Año:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              {showForm ? (
                <>
                  <X className="w-5 h-5" />
                  Cancelar
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Nueva Tarifa
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mensaje de estado */}
        {message && (
          <div className={`p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <Save className="w-5 h-5 text-green-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Tabla de Datos de Precios */}
        {(showForm || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  {editingId ? 'Editar Precio' : 'Nuevo Precio'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mes
                  </label>
                  <select
                    name="mes"
                    value={formData.mes}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Seleccionar mes</option>
                    {monthNames.map((month, index) => (
                      <option key={index} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año
                  </label>
                  <input
                    type="number"
                    name="anio"
                    value={formData.anio}
                    onChange={handleInputChange}
                    required
                    min="2020"
                    max="2030"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo Fijo
                  </label>
                  <input
                    type="number"
                    name="costo_fijo"
                    value={formData.costo_fijo}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo Energía Base
                  </label>
                  <input
                    type="number"
                    name="costo_energia_base"
                    value={formData.costo_energia_base}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo Energía Intermedia
                  </label>
                  <input
                    type="number"
                    name="costo_energia_intermedia"
                    value={formData.costo_energia_intermedia}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo Energía Punta
                  </label>
                  <input
                    type="number"
                    name="costo_energia_punta"
                    value={formData.costo_energia_punta}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo Distribución
                  </label>
                  <input
                    type="number"
                    name="costo_distribucion"
                    value={formData.costo_distribucion}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo Capacidad
                  </label>
                  <input
                    type="number"
                    name="costo_capacidad"
                    value={formData.costo_capacidad}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Gas
                  </label>
                  <input
                    type="number"
                    name="precio_gas"
                    value={formData.precio_gas}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Agua
                  </label>
                  <input
                    type="number"
                    name="precio_agua"
                    value={formData.precio_agua}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Registro de Precios - {selectedYear}</h3>
              <span className="text-sm text-gray-500">({filteredPrecios.length} registros)</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Fijo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Energía Base</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Energía Inter.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Energía Punta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distribución</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Gas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Agua</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPrecios.map((precio) => (
                  <tr key={precio.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {monthNames[precio.mes - 1]} {precio.anio}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      ${formatNumber(precio.costo_fijo)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600 font-medium">
                      ${formatNumber(precio.costo_energia_base)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 font-medium">
                      ${formatNumber(precio.costo_energia_intermedia)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">
                      ${formatNumber(precio.costo_energia_punta)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-purple-600 font-medium">
                      ${formatNumber(precio.costo_distribucion)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-indigo-600 font-medium">
                      ${formatNumber(precio.costo_capacidad)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                      ${formatNumber(precio.precio_gas)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-cyan-600 font-medium">
                      ${formatNumber(precio.precio_agua)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(precio)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(precio.anio, precio.mes)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráficas de Tendencias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Gráfica Costo Fijo */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              Costo Fijo
            </h4>
            <div className="relative h-48">
              <svg className="w-full h-full" viewBox="0 0 300 150">
                {/* Grid lines */}
                <defs>
                  <pattern id="grid-gray" width="30" height="15" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 15" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="300" height="150" fill="url(#grid-gray)" />
                
                {/* Line chart */}
                {(() => {
                  const data = precios.slice(0, 12).reverse();
                  if (data.length < 2) return null;
                  
                  const maxValue = Math.max(...data.map(p => p.costo_fijo));
                  const minValue = Math.min(...data.map(p => p.costo_fijo));
                  const range = maxValue - minValue || 1;
                  
                  const points = data.map((precio, index) => {
                    const x = (index / (data.length - 1)) * 280 + 10;
                    const y = 140 - ((precio.costo_fijo - minValue) / range) * 120;
                    return `${x},${y}`;
                  }).join(' ');
                  
                  return (
                    <>
                      {/* Grid lines */}
                      <defs>
                        <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                        </pattern>
                      </defs>
                      <rect width="300" height="150" fill="url(#grid)" />
                      
                      {/* Y-axis labels */}
                      <text x="5" y="15" fontSize="8" fill="#6b7280" textAnchor="start">
                        ${formatNumber(maxValue)}
                      </text>
                      <text x="5" y="80" fontSize="8" fill="#6b7280" textAnchor="start">
                        ${formatNumber((maxValue + minValue) / 2)}
                      </text>
                      <text x="5" y="145" fontSize="8" fill="#6b7280" textAnchor="start">
                        ${formatNumber(minValue)}
                      </text>
                      
                      <polyline
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth="3"
                        points={points}
                        className="drop-shadow-sm"
                      />
                      {data.map((precio, index) => {
                        const x = (index / (data.length - 1)) * 280 + 10;
                        const y = 140 - ((precio.costo_fijo - minValue) / range) * 120;
                        return (
                          <g key={index}>
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill="#6b7280"
                              className="drop-shadow-sm"
                            />
                            {/* Month label */}
                            <text 
                              x={x} 
                              y="165" 
                              fontSize="7" 
                              fill="#6b7280" 
                              textAnchor="middle"
                            >
                              {monthNames[precio.mes - 1].substring(0, 3)}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-gray-700">
                ${formatNumber(precios[0]?.costo_fijo || 0)}
              </p>
              <p className="text-sm text-gray-500">Último registro</p>
            </div>
          </div>

          {/* Gráfica Energía Base */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              Energía Base
            </h4>
            <div className="relative h-48">
              <svg className="w-full h-full" viewBox="0 0 300 150">
                <defs>
                  <pattern id="grid-yellow" width="30" height="15" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 15" fill="none" stroke="#fef3c7" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="300" height="150" fill="url(#grid-yellow)" />
                
                {(() => {
                  const data = precios.slice(0, 12).reverse();
                  if (data.length < 2) return null;
                  
                  const maxValue = Math.max(...data.map(p => p.costo_energia_base));
                  const minValue = Math.min(...data.map(p => p.costo_energia_base));
                  const range = maxValue - minValue || 1;
                  
                  const points = data.map((precio, index) => {
                    const x = (index / (data.length - 1)) * 280 + 10;
                    const y = 140 - ((precio.costo_energia_base - minValue) / range) * 120;
                    return `${x},${y}`;
                  }).join(' ');
                  
                  return (
                    <>
                      {/* Y-axis labels */}
                      <text x="5" y="15" fontSize="8" fill="#ca8a04" textAnchor="start">
                        ${formatNumber(maxValue)}
                      </text>
                      <text x="5" y="80" fontSize="8" fill="#ca8a04" textAnchor="start">
                        ${formatNumber((maxValue + minValue) / 2)}
                      </text>
                      <text x="5" y="145" fontSize="8" fill="#ca8a04" textAnchor="start">
                        ${formatNumber(minValue)}
                      </text>
                      
                      <polyline
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="3"
                        points={points}
                        className="drop-shadow-sm"
                      />
                      {data.map((precio, index) => {
                        const x = (index / (data.length - 1)) * 280 + 10;
                        const y = 140 - ((precio.costo_energia_base - minValue) / range) * 120;
                        return (
                          <g key={index}>
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill="#eab308"
                              className="drop-shadow-sm"
                            />
                            <text 
                              x={x} 
                              y="165" 
                              fontSize="7" 
                              fill="#ca8a04" 
                              textAnchor="middle"
                            >
                              {monthNames[precio.mes - 1].substring(0, 3)}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">
                ${formatNumber(precios[0]?.costo_energia_base || 0)}
              </p>
              <p className="text-sm text-gray-500">Último registro</p>
            </div>
          </div>

          {/* Gráfica Energía Intermedia */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              Energía Intermedia
            </h4>
            <div className="relative h-48">
              <svg className="w-full h-full" viewBox="0 0 300 150">
                <defs>
                  <pattern id="grid-orange" width="30" height="15" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 15" fill="none" stroke="#fed7aa" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="300" height="150" fill="url(#grid-orange)" />
                
                {(() => {
                  const data = precios.slice(0, 12).reverse();
                  if (data.length < 2) return null;
                  
                  const maxValue = Math.max(...data.map(p => p.costo_energia_intermedia));
                  const minValue = Math.min(...data.map(p => p.costo_energia_intermedia));
                  const range = maxValue - minValue || 1;
                  
                  const points = data.map((precio, index) => {
                    const x = (index / (data.length - 1)) * 280 + 10;
                    const y = 140 - ((precio.costo_energia_intermedia - minValue) / range) * 120;
                    return `${x},${y}`;
                  }).join(' ');
                  
                  return (
                    <>
                      {/* Y-axis labels */}
                      <text x="5" y="15" fontSize="8" fill="#ea580c" textAnchor="start">
                        ${formatNumber(maxValue)}
                      </text>
                      <text x="5" y="80" fontSize="8" fill="#ea580c" textAnchor="start">
                        ${formatNumber((maxValue + minValue) / 2)}
                      </text>
                      <text x="5" y="145" fontSize="8" fill="#ea580c" textAnchor="start">
                        ${formatNumber(minValue)}
                      </text>
                      
                      <polyline
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="3"
                        points={points}
                        className="drop-shadow-sm"
                      />
                      {data.map((precio, index) => {
                        const x = (index / (data.length - 1)) * 280 + 10;
                        const y = 140 - ((precio.costo_energia_intermedia - minValue) / range) * 120;
                        return (
                          <g key={index}>
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill="#f97316"
                              className="drop-shadow-sm"
                            />
                            <text 
                              x={x} 
                              y="165" 
                              fontSize="7" 
                              fill="#ea580c" 
                              textAnchor="middle"
                            >
                              {monthNames[precio.mes - 1].substring(0, 3)}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-orange-700">
                ${formatNumber(precios[0]?.costo_energia_intermedia || 0)}
              </p>
              <p className="text-sm text-gray-500">Último registro</p>
            </div>
          </div>

          {/* Gráfica Energía Punta */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Energía Punta
            </h4>
            <div className="relative h-48">
              <svg className="w-full h-full" viewBox="0 0 300 150">
                <defs>
                  <pattern id="grid-red" width="30" height="15" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 15" fill="none" stroke="#fecaca" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="300" height="150" fill="url(#grid-red)" />
                
                {(() => {
                  const data = precios.slice(0, 12).reverse();
                  if (data.length < 2) return null;
                  
                  const maxValue = Math.max(...data.map(p => p.costo_energia_punta));
                  const minValue = Math.min(...data.map(p => p.costo_energia_punta));
                  const range = maxValue - minValue || 1;
                  
                  const points = data.map((precio, index) => {
                    const x = (index / (data.length - 1)) * 280 + 10;
                    const y = 140 - ((precio.costo_energia_punta - minValue) / range) * 120;
                    return `${x},${y}`;
                  }).join(' ');
                  
                  return (
                    <>
                      {/* Y-axis labels */}
                      <text x="5" y="15" fontSize="8" fill="#dc2626" textAnchor="start">
                        ${formatNumber(maxValue)}
                      </text>
                      <text x="5" y="80" fontSize="8" fill="#dc2626" textAnchor="start">
                        ${formatNumber((maxValue + minValue) / 2)}
                      </text>
                      <text x="5" y="145" fontSize="8" fill="#dc2626" textAnchor="start">
                        ${formatNumber(minValue)}
                      </text>
                      
                      <polyline
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="3"
                        points={points}
                        className="drop-shadow-sm"
                      />
                      {data.map((precio, index) => {
                        const x = (index / (data.length - 1)) * 280 + 10;
                        const y = 140 - ((precio.costo_energia_punta - minValue) / range) * 120;
                        return (
                          <g key={index}>
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill="#dc2626"
                              className="drop-shadow-sm"
                            />
                            <text 
                              x={x} 
                              y="165" 
                              fontSize="7" 
                              fill="#dc2626" 
                              textAnchor="middle"
                            >
                              {monthNames[precio.mes - 1].substring(0, 3)}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-red-700">
                ${formatNumber(precios[0]?.costo_energia_punta || 0)}
              </p>
              <p className="text-sm text-gray-500">Último registro</p>
            </div>
          </div>

          {/* Gráfica Costo Distribución */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              Costo Distribución
            </h4>
            <div className="relative h-48">
              <svg className="w-full h-full" viewBox="0 0 300 150">
                <defs>
                  <pattern id="grid-purple" width="30" height="15" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 15" fill="none" stroke="#e9d5ff" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="300" height="150" fill="url(#grid-purple)" />
                
                {(() => {
                  const data = precios.slice(0, 12).reverse();
                  if (data.length < 2) return null;
                  
                  const maxValue = Math.max(...data.map(p => p.costo_distribucion));
                  const minValue = Math.min(...data.map(p => p.costo_distribucion));
                  const range = maxValue - minValue || 1;
                  
                  const points = data.map((precio, index) => {
                    const x = (index / (data.length - 1)) * 280 + 10;
                    const y = 140 - ((precio.costo_distribucion - minValue) / range) * 120;
                    return `${x},${y}`;
                  }).join(' ');
                  
                  return (
                    <>
                      {/* Y-axis labels */}
                      <text x="5" y="15" fontSize="8" fill="#9333ea" textAnchor="start">
                        ${formatNumber(maxValue)}
                      </text>
                      <text x="5" y="80" fontSize="8" fill="#9333ea" textAnchor="start">
                        ${formatNumber((maxValue + minValue) / 2)}
                      </text>
                      <text x="5" y="145" fontSize="8" fill="#9333ea" textAnchor="start">
                        ${formatNumber(minValue)}
                      </text>
                      
                      <polyline
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="3"
                        points={points}
                        className="drop-shadow-sm"
                      />
                      {data.map((precio, index) => {
                        const x = (index / (data.length - 1)) * 280 + 10;
                        const y = 140 - ((precio.costo_distribucion - minValue) / range) * 120;
                        return (
                          <g key={index}>
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill="#a855f7"
                              className="drop-shadow-sm"
                            />
                            <text 
                              x={x} 
                              y="165" 
                              fontSize="7" 
                              fill="#9333ea" 
                              textAnchor="middle"
                            >
                              {monthNames[precio.mes - 1].substring(0, 3)}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-purple-700">
                ${formatNumber(precios[0]?.costo_distribucion || 0)}
              </p>
              <p className="text-sm text-gray-500">Último registro</p>
            </div>
          </div>

          {/* Gráfica Costo Capacidad */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              Costo Capacidad
            </h4>
            <div className="relative h-48">
              <svg className="w-full h-full" viewBox="0 0 300 150">
                <defs>
                  <pattern id="grid-indigo" width="30" height="15" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 15" fill="none" stroke="#c7d2fe" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="300" height="150" fill="url(#grid-indigo)" />
                
                {(() => {
                  const data = precios.slice(0, 12).reverse();
                  if (data.length < 2) return null;
                  
                  const maxValue = Math.max(...data.map(p => p.costo_capacidad));
                  const minValue = Math.min(...data.map(p => p.costo_capacidad));
                  const range = maxValue - minValue || 1;
                  
                  const points = data.map((precio, index) => {
                    const x = (index / (data.length - 1)) * 280 + 10;
                    const y = 140 - ((precio.costo_capacidad - minValue) / range) * 120;
                    return `${x},${y}`;
                  }).join(' ');
                  
                  return (
                    <>
                      {/* Y-axis labels */}
                      <text x="5" y="15" fontSize="8" fill="#4f46e5" textAnchor="start">
                        ${formatNumber(maxValue)}
                      </text>
                      <text x="5" y="80" fontSize="8" fill="#4f46e5" textAnchor="start">
                        ${formatNumber((maxValue + minValue) / 2)}
                      </text>
                      <text x="5" y="145" fontSize="8" fill="#4f46e5" textAnchor="start">
                        ${formatNumber(minValue)}
                      </text>
                      
                      <polyline
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="3"
                        points={points}
                        className="drop-shadow-sm"
                      />
                      {data.map((precio, index) => {
                        const x = (index / (data.length - 1)) * 280 + 10;
                        const y = 140 - ((precio.costo_capacidad - minValue) / range) * 120;
                        return (
                          <g key={index}>
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill="#6366f1"
                              className="drop-shadow-sm"
                            />
                            <text 
                              x={x} 
                              y="165" 
                              fontSize="7" 
                              fill="#4f46e5" 
                              textAnchor="middle"
                            >
                              {monthNames[precio.mes - 1].substring(0, 3)}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-indigo-700">
                ${formatNumber(precios[0]?.costo_capacidad || 0)}
              </p>
              <p className="text-sm text-gray-500">Último registro</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

