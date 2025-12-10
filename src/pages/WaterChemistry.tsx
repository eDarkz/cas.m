import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, AquaticElement } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Droplets, MapPin, Archive, ArchiveRestore, Search, TrendingUp, Trash2, Calculator, Settings, Map, FileText, FileSpreadsheet } from 'lucide-react';
import CreateElementModal from '../components/CreateElementModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import WaterCalculatorModal from '../components/WaterCalculatorModal';
import WaterChemistryExecutiveReport from '../components/WaterChemistryExecutiveReport';
import CustomWaterReportModal from '../components/CustomWaterReportModal';
import { formatDate } from '../lib/utils';

export default function WaterChemistry() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- ESTADOS DE INTERFAZ (UI) ---
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'analyses'>('name');
  
  // Estados de Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showExecutiveReport, setShowExecutiveReport] = useState(false);
  const [showCustomReport, setShowCustomReport] = useState(false);
  const [elementToDelete, setElementToDelete] = useState<AquaticElement | null>(null);

  // --- GESTIÓN DE DATOS CON REACT QUERY ---

  // 1. Obtener Elementos (Lista Principal)
  // Se actualiza automáticamente cuando cambia la vista (activos/archivados)
  const { data: elementsResponse, isLoading: loadingElements } = useQuery({
    queryKey: ['aquaticElements', view],
    queryFn: () => api.getAquaticElements({
      archived: view === 'archived' ? 1 : 0,
      withLast: 1,
      pageSize: 100,
    }),
  });
  const elements = elementsResponse?.data || [];

  // 2. Obtener Límites (Configuración)
  const { data: limits = [] } = useQuery({
    queryKey: ['amenityLimits'],
    queryFn: () => api.getAmenityLimits(),
    staleTime: 1000 * 60 * 10, // Los límites cambian poco, mantenerlos por 10 mins
  });

  // 3. Obtener TODOS los elementos (Para Reportes)
  // Esta consulta puede ser pesada, React Query la manejará eficientemente en caché
  const { data: allElements = [] } = useQuery({
    queryKey: ['allAquaticElementsFull'],
    queryFn: async () => {
      const allElementsArray: AquaticElement[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const pageResponse = await api.getAquaticElements({
          withLast: 1,
          pageSize: 200,
          page: currentPage,
        });
        allElementsArray.push(...pageResponse.data);
        if (pageResponse.data.length < 200) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }
      return allElementsArray;
    },
    staleTime: 1000 * 60 * 5, // Cachear por 5 minutos
  });

  // --- MUTACIONES (ACCIONES) ---

  // Archivar Elemento
  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.updateAquaticElement(id, { is_archived: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aquaticElements'] });
      // También invalidamos la lista completa de reportes para mantenerla fresca
      queryClient.invalidateQueries({ queryKey: ['allAquaticElementsFull'] });
    },
    onError: () => alert('Error al archivar el elemento'),
  });

  // Desarchivar Elemento
  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => api.updateAquaticElement(id, { is_archived: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aquaticElements'] });
      queryClient.invalidateQueries({ queryKey: ['allAquaticElementsFull'] });
    },
    onError: () => alert('Error al desarchivar el elemento'),
  });

  // Eliminar Elemento
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAquaticElement(id),
    onSuccess: () => {
      setShowDeleteModal(false);
      setElementToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['aquaticElements'] });
      queryClient.invalidateQueries({ queryKey: ['allAquaticElementsFull'] });
    },
    onError: () => alert('Error al eliminar el elemento'),
  });

  // --- MANEJADORES DE EVENTOS ---

  const handleArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Archivar este elemento acuático?')) {
      archiveMutation.mutate(id);
    }
  };

  const handleUnarchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    unarchiveMutation.mutate(id);
  };

  const handleDeleteClick = (element: AquaticElement, e: React.MouseEvent) => {
    e.stopPropagation();
    setElementToDelete(element);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (elementToDelete) {
      deleteMutation.mutate(elementToDelete.id);
    }
  };

  const handleSuccessCreate = () => {
    setShowCreateModal(false);
    queryClient.invalidateQueries({ queryKey: ['aquaticElements'] });
    queryClient.invalidateQueries({ queryKey: ['allAquaticElementsFull'] });
  };

  // --- LÓGICA DE FILTRADO Y ORDENAMIENTO (UI) ---

  const getAmenityTypes = () => {
    const amenityMap: Record<string, { id: number; nombre: string; count: number }> = {};
    elements.forEach(el => {
      if (el.amenity_type_id && el.amenity_nombre) {
        const key = `${el.amenity_type_id}`;
        if (amenityMap[key]) {
          amenityMap[key].count += 1;
        } else {
          amenityMap[key] = {
            id: el.amenity_type_id,
            nombre: el.amenity_nombre,
            count: 1
          };
        }
      }
    });
    return Object.values(amenityMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  const filteredElements = elements.filter((el) => {
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toUpperCase();
      const matchesSearch = el.nombre.toUpperCase().includes(query) ||
        (el.ubicacion && el.ubicacion.toUpperCase().includes(query)) ||
        (el.amenity_nombre && el.amenity_nombre.toUpperCase().includes(query)) ||
        (el.amenity_code && el.amenity_code.toUpperCase().includes(query));
      if (!matchesSearch) return false;
    }

    if (typeFilter !== 'all') {
      const filterValue = parseInt(typeFilter);
      if (filterValue === 0) {
        if (el.amenity_type_id) return false;
      } else {
        if (el.amenity_type_id !== filterValue) return false;
      }
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.nombre.localeCompare(b.nombre);
    if (sortBy === 'recent') {
      const aDate = a.last_sampled_at ? new Date(a.last_sampled_at).getTime() : 0;
      const bDate = b.last_sampled_at ? new Date(b.last_sampled_at).getTime() : 0;
      return bDate - aDate;
    }
    if (sortBy === 'analyses') return (b.analyses_count || 0) - (a.analyses_count || 0);
    return 0;
  });

  const amenityTypes = getAmenityTypes();
  const elementsWithoutAmenity = elements.filter(el => !el.amenity_type_id).length;

  if (loadingElements) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-start justify-center">
        <div className="flex gap-2 flex-wrap justify-center">
          <button
            onClick={() => setShowExecutiveReport(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <FileText className="w-5 h-5" />
            Reporte Ejecutivo
          </button>
          <button
            onClick={() => setShowCustomReport(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Reporte Personalizado
          </button>
          <button
            onClick={() => navigate('/water-chemistry/map')}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <Map className="w-5 h-5" />
            Mapa
          </button>
          <button
            onClick={() => navigate('/water-chemistry/amenity-limits')}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <Settings className="w-5 h-5" />
            Límites
          </button>
          <button
            onClick={() => setShowCalculator(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <Calculator className="w-5 h-5" />
            Calculadora LSI/RSI
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Nuevo Elemento
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, ubicación o tipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">
                Filtrar por Tipo
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm bg-white"
              >
                <option value="all">Todos los tipos ({elements.length})</option>
                {amenityTypes.map(({ id, nombre, count }) => (
                  <option key={id} value={id.toString()}>
                    {nombre} ({count})
                  </option>
                ))}
                {elementsWithoutAmenity > 0 && (
                  <option value="0" className="text-gray-500 italic">
                    Sin tipo asignado ({elementsWithoutAmenity})
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'recent' | 'analyses')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm bg-white"
              >
                <option value="name">Nombre (A-Z)</option>
                <option value="recent">Último análisis (reciente)</option>
                <option value="analyses">Más análisis</option>
              </select>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setView('active'); setSearchQuery(''); setTypeFilter('all'); }}
                className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg ${
                  view === 'active'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
                }`}
              >
                Activos ({elements.filter(e => e.is_archived === 0).length})
              </button>
              <button
                onClick={() => { setView('archived'); setSearchQuery(''); setTypeFilter('all'); }}
                className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg ${
                  view === 'archived'
                    ? 'bg-gradient-to-r from-slate-600 to-slate-800 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                Archivados ({elements.filter(e => e.is_archived === 1).length})
              </button>
            </div>
          </div>

          {(typeFilter !== 'all' || sortBy !== 'name' || searchQuery) && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-sm text-gray-600">
                Mostrando <strong className="text-cyan-700">{filteredElements.length}</strong> de <strong>{elements.length}</strong> elementos
              </span>
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setSortBy('name');
                  setSearchQuery('');
                }}
                className="text-xs text-cyan-600 hover:text-cyan-800 font-medium underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {typeFilter === 'all' && !searchQuery && amenityTypes.length > 0 && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-5 border border-cyan-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-600" />
            Resumen por Tipo de Amenidad
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {amenityTypes.map(({ id, nombre, count }) => {
              const elementsOfType = elements.filter(el => el.amenity_type_id === id);
              const withAnalyses = elementsOfType.filter(el => (el.analyses_count || 0) > 0).length;
              const percentage = elementsOfType.length > 0
                ? Math.round((withAnalyses / elementsOfType.length) * 100)
                : 0;

              return (
                <button
                  key={id}
                  onClick={() => setTypeFilter(id.toString())}
                  className="bg-white rounded-lg p-3 hover:shadow-lg hover:border-cyan-400 border border-slate-200 transition-all duration-300 text-left group"
                >
                  <div className="text-2xl font-bold text-cyan-600 mb-1">{count}</div>
                  <div className="text-xs font-semibold text-gray-700 mb-2 line-clamp-2 group-hover:text-cyan-700">
                    {nombre}
                  </div>
                  <div className="text-xs text-gray-500">
                    {percentage}% con análisis
                  </div>
                </button>
              );
            })}
            {elementsWithoutAmenity > 0 && (
              <button
                onClick={() => setTypeFilter('0')}
                className="bg-white rounded-lg p-3 hover:shadow-lg hover:border-orange-400 border border-orange-200 transition-all duration-300 text-left group"
              >
                <div className="text-2xl font-bold text-orange-600 mb-1">{elementsWithoutAmenity}</div>
                <div className="text-xs font-semibold text-gray-700 mb-2 line-clamp-2 group-hover:text-orange-700">
                  Sin Tipo Asignado
                </div>
                <div className="text-xs text-orange-600 font-medium">
                  Requiere configuración
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {filteredElements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Droplets className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No hay elementos acuáticos</p>
          <p className="text-gray-400 text-sm mt-2">
            {searchQuery ? 'Intenta con otro término de búsqueda' : 'Crea tu primer elemento para comenzar'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredElements.map((element) => (
            <div
              key={element.id}
              onClick={() => navigate(`/water-chemistry/${element.id}`)}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-xl hover:border-cyan-300 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Droplets className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 group-hover:text-cyan-600 transition-colors">
                        {element.nombre.toUpperCase()}
                      </h3>
                      {element.amenity_nombre && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-800 border border-cyan-200">
                          {element.amenity_nombre}
                        </span>
                      )}
                      {!element.amenity_type_id && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-orange-100 text-orange-700 border border-orange-200">
                          Sin tipo asignado
                        </span>
                      )}
                    </div>
                  </div>
                  {element.ubicacion && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 ml-15">
                      <MapPin className="w-3 h-3" />
                      {element.ubicacion}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {view === 'active' ? (
                    <button
                      onClick={(e) => handleArchive(element.id, e)}
                      className="text-gray-400 hover:text-orange-600 transition-colors"
                      title="Archivar"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleUnarchive(element.id, e)}
                      className="text-gray-400 hover:text-green-600 transition-colors"
                      title="Desarchivar"
                    >
                      <ArchiveRestore className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDeleteClick(element, e)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Eliminar permanentemente"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {element.amenity_nombre && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-semibold text-gray-800">{element.amenity_nombre}</span>
                  </div>
                )}
                {element.tipo && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Características:</span>
                    <span className="font-semibold text-gray-800">{element.tipo}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Análisis registrados:</span>
                  <span className="font-semibold text-gray-800">{element.analyses_count || 0}</span>
                </div>
                {element.last_sampled_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Último muestreo:</span>
                    <span className="font-semibold text-gray-800">
                      {formatDate(element.last_sampled_at)}
                    </span>
                  </div>
                )}
                {element.last?.ph != null && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-700 uppercase">Últimas lecturas</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {element.last.ph != null && !isNaN(Number(element.last.ph)) && (
                        <div>
                          <div className="text-gray-500">pH</div>
                          <div className="font-bold text-blue-700">{Number(element.last.ph).toFixed(1)}</div>
                        </div>
                      )}
                      {element.last.cloro_libre != null && !isNaN(Number(element.last.cloro_libre)) && (
                        <div>
                          <div className="text-gray-500">CL</div>
                          <div className="font-bold text-blue-700">{Number(element.last.cloro_libre).toFixed(1)}</div>
                        </div>
                      )}
                      {element.last.temperatura != null && !isNaN(Number(element.last.temperatura)) && (
                        <div>
                          <div className="text-gray-500">Temp</div>
                          <div className="font-bold text-blue-700">{Number(element.last.temperatura).toFixed(1)}°C</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateElementModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSuccessCreate}
        />
      )}

      {showDeleteModal && elementToDelete && (
        <ConfirmDeleteModal
          title="Eliminar Elemento Acuático"
          message="¿Estás seguro de que deseas eliminar este elemento? Se eliminarán también todos los análisis y datos relacionados."
          itemName={elementToDelete.nombre}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleteMutation.isPending}
        />
      )}

      {showExecutiveReport && (
        <WaterChemistryExecutiveReport
          elements={allElements}
          limits={limits}
          onClose={() => setShowExecutiveReport(false)}
        />
      )}

      {showCustomReport && (
        <CustomWaterReportModal
          elements={allElements}
          onClose={() => setShowCustomReport(false)}
        />
      )}

      {showCalculator && (
        <WaterCalculatorModal
          onClose={() => setShowCalculator(false)}
        />
      )}
    </div>
  );
}