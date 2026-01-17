import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getApiUrl } from '../utils/hotelConfig';
import { getMonthName } from '../utils/dateUtils';
import { CreditCard as Edit3, Save, X, Trash2, Calendar, Database, Filter, ChevronLeft, ChevronRight, Fuel, Search, Plus, Eye, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';

interface EnergeticData {
  id: number;
  fecha: string;
  tipo_cambio: number | null;
  pax: number | null;
  habitaciones_ocupadas: number | null;
  agua_municipal: number | null;
  medidor_testigo: number | null;
  medidor_desaladora: number | null;
  consumo_gas: number | null;
  electricidad_base: number | null;
  electricidad_intermedio: number | null;
  electricidad_punta: number | null;
  demanda_base: number | null;
  demanda_intermedio: number | null;
  demanda_punta: number | null;
  potencia_reactiva: number | null;
}

interface GasLevelsData {
  id: number;
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

const RawDataView: React.FC = () => {
  const { hotelCode } = useParams<{ hotelCode: string }>();
  const [data, setData] = useState<EnergeticData[]>([]);
  const [filteredData, setFilteredData] = useState<EnergeticData[]>([]);
  const [gasLevelsData, setGasLevelsData] = useState<GasLevelsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<EnergeticData>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<'water' | 'gas' | 'electric' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    fetchData();
    fetchGasLevelsData();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      const filtered = data.filter(item => {
        const dateStr = item.fecha.split('T')[0];
        const [year, month] = dateStr.split('-');
        const itemMonth = `${year}-${month}`;
        const matchesMonth = itemMonth === selectedMonth;
        
        // Filtro de búsqueda
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const dateFormatted = formatDate(item.fecha);
          return matchesMonth;
        }
        return matchesMonth;
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [selectedMonth, data]);

  const fetchData = async () => {
    if (!hotelCode) return;
    
    try {
      const apiUrl = getApiUrl(hotelCode, 'energeticos');
      const response = await fetch(apiUrl);
      const result = await response.json();
      setData(result);
      
      // Extraer meses únicos
      const months = [...new Set(result.map((item: EnergeticData) => {
        // Extraer año-mes directamente del string sin crear objeto Date
        const dateStr = item.fecha.split('T')[0]; // Solo la parte de fecha
        const [year, month] = dateStr.split('-');
        return `${year}-${month}`;
      }))].sort().reverse();
      
      setAvailableMonths(months);
      if (months.length > 0) {
        setSelectedMonth(months[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Error al cargar los datos' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGasLevelsData = async () => {
    if (!hotelCode) return;
    
    try {
      const currentYear = new Date().getFullYear();
      const apiUrl = getApiUrl(hotelCode, 'gas-niveles-mes');
      const response = await fetch(`${apiUrl}/${currentYear}`);
      
      if (response.ok) {
        const result = await response.json();
        setGasLevelsData(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching gas levels:', error);
    }
  };

  const handleEdit = (item: EnergeticData) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const handleSave = async () => {
    if (!hotelCode) return;
    
    if (!editingId || !editData.fecha) return;

    try {
      const apiUrl = getApiUrl(hotelCode, 'energeticos');
      const response = await fetch(`${apiUrl}/${editData.fecha}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Datos actualizados correctamente' });
        fetchData();
        setEditingId(null);
        setEditData({});
      } else {
        setMessage({ type: 'error', text: 'Error al actualizar los datos' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!hotelCode) return;
    
    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;

    try {
      const apiUrl = getApiUrl(hotelCode, 'energeticos');
      const response = await fetch(`${apiUrl}/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Registro eliminado correctamente' });
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Error al eliminar el registro' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleInputChange = (field: keyof EnergeticData, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: field === 'fecha' ? value : (value === '' ? null : parseFloat(value))
    }));
  };

  const formatDate = (dateString: string) => {
    // No interpretar como UTC, usar la fecha tal como viene de la BD
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const getMonthDisplayName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const renderEditableCell = (item: EnergeticData, field: keyof EnergeticData, type: 'date' | 'number' = 'number') => {
    if (editingId === item.id) {
      return (
        <input
          type={type}
          value={editData[field] || ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          step={type === 'number' ? '0.01' : undefined}
        />
      );
    }
    
    if (field === 'fecha') {
      return formatDate(item[field] as string);
    }
    
    return item[field] !== null ? item[field] : '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <HamsterLoader />
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 rounded-xl shadow-lg">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative px-6 py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Datos de medicion registrados</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <p className="text-blue-100 mb-4">
                Visualiza, edita y gestiona todos los registros de energéticos
              </p>
              
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-white/80" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-gray-900 placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50"
                >
                  <option value="">Todos los meses</option>
                  {availableMonths.map(month => (
                    <option key={month} value={month} className="text-gray-900">
                      {getMonthDisplayName(month)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Column View Selector */}
        <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setExpandedColumns('water')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                expandedColumns === 'water'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Consumo de Agua
            </button>
            <button
              onClick={() => setExpandedColumns('gas')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                expandedColumns === 'gas'
                  ? 'bg-orange-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Consumo de Gas
            </button>
            <button
              onClick={() => setExpandedColumns('electric')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                expandedColumns === 'electric'
                  ? 'bg-yellow-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Datos Eléctricos
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <Save className="w-5 h-5 text-green-600" />
            ) : (
              <X className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T. Cambio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PAX</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Habitaciones</th>
                  
                  {expandedColumns === 'water' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agua Municipal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medidor Testigo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desaladora</th>
                    </>
                  )}
                  
                  {expandedColumns === 'gas' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumo Gas (L)</th>
                    </>
                  )}
                  
                  {expandedColumns === 'electric' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Elec. Base</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Elec. Inter.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Elec. Punta</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dem. Base</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dem. Inter.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dem. Punta</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P. Reactiva</th>
                    </>
                  )}
                  
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item) => (
                  <tr key={item.id} className={`transition-colors ${editingId === item.id ? 'bg-blue-50 ring-2 ring-blue-200' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {renderEditableCell(item, 'fecha', 'date')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {renderEditableCell(item, 'tipo_cambio')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {renderEditableCell(item, 'pax')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {renderEditableCell(item, 'habitaciones_ocupadas')}
                    </td>
                    
                    {expandedColumns === 'water' && (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {renderEditableCell(item, 'agua_municipal')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {renderEditableCell(item, 'medidor_testigo')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {renderEditableCell(item, 'medidor_desaladora')}
                        </td>
                      </>
                    )}
                    
                    {expandedColumns === 'gas' && (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className="text-orange-600 font-medium">
                            {renderEditableCell(item, 'consumo_gas')}
                          </span>
                        </td>
                      </>
                    )}
                    
                    {expandedColumns === 'electric' && (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {renderEditableCell(item, 'electricidad_base')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {renderEditableCell(item, 'electricidad_intermedio')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {renderEditableCell(item, 'electricidad_punta')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {renderEditableCell(item, 'demanda_base')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {renderEditableCell(item, 'demanda_intermedio')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {renderEditableCell(item, 'demanda_punta')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {renderEditableCell(item, 'potencia_reactiva')}
                        </td>
                      </>
                    )}
                    
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {editingId === item.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={handleSave}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                            title="Guardar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay datos disponibles para el período seleccionado</p>
            </div>
          )}
        </div>

        {/* Sección de Niveles de Tanques de Gas */}
        {gasLevelsData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-orange-50 border-b border-orange-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Fuel className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Niveles de Tanques de Gas</h3>
                <span className="text-sm text-gray-500">({gasLevelsData.length} registros)</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promedio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Litros</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T01-T07</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T08-T14</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gasLevelsData.map((gasLevel) => {
                    const tankValues = [];
                    for (let i = 1; i <= 14; i++) {
                      const tankKey = `tanque${String(i).padStart(2, '0')}` as keyof GasLevelsData;
                      tankValues.push(gasLevel[tankKey] as number);
                    }
                    
                    const averageLevel = tankValues.reduce((sum, val) => sum + val, 0) / 14;
                    const totalLiters = tankValues.reduce((sum, val) => sum + (val * 5000 / 100), 0);
                    
                    return (
                      <tr key={gasLevel.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {getMonthName(gasLevel.mes)} {gasLevel.anio}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-orange-600">
                            {averageLevel.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-bold text-orange-700">
                            {totalLiters.toLocaleString('es-MX', { maximumFractionDigits: 0 })}L
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1">
                            {tankValues.slice(0, 7).map((level, idx) => (
                              <div key={idx} className="text-xs text-gray-600">
                                {level.toFixed(0)}%
                                {idx < 6 && ','}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-1">
                            {tankValues.slice(7, 14).map((level, idx) => (
                              <div key={idx} className="text-xs text-gray-600">
                                {level.toFixed(0)}%
                                {idx < 6 && ','}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RawDataView;