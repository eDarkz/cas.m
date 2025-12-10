import { useEffect, useState, useRef } from 'react';
import { api, Sabana, SabanaItem, SabanaItemDetail, SabanaSummary, Supervisor } from '../lib/api';
import { Plus, FileSpreadsheet, Download, ChevronLeft, ChevronRight, X, Upload, MessageCircle, Image as ImageIcon, Clock, Trash2, Archive, ArchiveRestore, Search, Link } from 'lucide-react';
import CreateSabanaModal from '../components/CreateSabanaModal';
import PublicSabanaLinkModal from '../components/PublicSabanaLinkModal';

export default function Sabanas() {
  const [sabanas, setSabanas] = useState<Sabana[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [selectedSabana, setSelectedSabana] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'active' | 'completed' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [view]);

  const loadData = async () => {
    try {
      const [sabanasData, supervisorsData] = await Promise.all([
        api.getSabanas({ archived: view === 'archived' ? 1 : 0, fields: 'basic' }),
        api.getSupervisors(),
      ]);
      console.log('📊 Loaded sabanas:', sabanasData.map(s => ({
        titulo: s.titulo,
        avance_pct: s.avance_pct,
        is_archived: s.is_archived,
        rooms_completed: s.rooms_completed,
        rooms_total: s.rooms_total
      })));
      setSabanas(sabanasData);
      setSupervisors(supervisorsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (sabanaId: string) => {
    setShowCreateModal(false);
    loadData();
    setSelectedSabana(sabanaId);
  };

  const handleDeleteSabana = async (sabanaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de eliminar esta sábana? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await api.deleteSabana(sabanaId);
      loadData();
    } catch (error) {
      console.error('Error deleting sabana:', error);
      alert('Error al eliminar la sábana');
    }
  };

  const handleArchiveSabana = async (sabanaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Archivar esta sábana?')) {
      return;
    }

    try {
      await api.archiveSabana(sabanaId);
      loadData();
    } catch (error) {
      console.error('Error archiving sabana:', error);
      alert('Error al archivar la sábana');
    }
  };

  const handleUnarchiveSabana = async (sabanaId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await api.unarchiveSabana(sabanaId);
      loadData();
    } catch (error) {
      console.error('Error unarchiving sabana:', error);
      alert('Error al desarchivar la sábana');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredSabanas = sabanas.filter((sabana) => {
    let matchesView = false;
    if (view === 'active') {
      matchesView = (sabana.avance_pct || 0) < 100;
    } else if (view === 'completed') {
      matchesView = (sabana.avance_pct || 0) >= 100;
    } else {
      matchesView = true;
    }

    const matchesSearch = searchQuery.trim() === '' ||
      sabana.titulo.toUpperCase().includes(searchQuery.toUpperCase()) ||
      (sabana.responsible_nombre && sabana.responsible_nombre.toUpperCase().includes(searchQuery.toUpperCase()));

    return matchesView && matchesSearch;
  });

  console.log(`🔍 View: ${view}, Total sabanas: ${sabanas.length}, Filtered: ${filteredSabanas.length}`);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">Sábanas de Control</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
        >
          <Plus className="w-5 h-5 drop-shadow-md" />
          Nueva Sábana
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setView('active'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg ${
              view === 'active'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => { setView('completed'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg ${
              view === 'completed'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300'
            }`}
          >
            Completadas
          </button>
          <button
            onClick={() => { setView('archived'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg ${
              view === 'archived'
                ? 'bg-gradient-to-r from-slate-600 to-slate-800 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            Archivadas
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar sábana por título o responsable..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm shadow-sm"
        />
      </div>

      {filteredSabanas.length > 0 && !selectedSabana && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredSabanas.map((sabana) => (
            <div
              key={sabana.id}
              className="relative bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 shadow-md group"
            >
              <button
                onClick={() => setSelectedSabana(sabana.id)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800 truncate">{sabana.titulo.toUpperCase()}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {sabana.date ? new Date(sabana.date).toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan' }) : new Date(sabana.created_at).toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan' })}
                    </p>
                    {sabana.responsible_nombre && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {sabana.responsible_nombre}
                      </p>
                    )}
                  </div>
                </div>
                {sabana.avance_pct !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progreso</span>
                      <span className="font-semibold">{sabana.avance_pct}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${sabana.avance_pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{sabana.rooms_completed || 0} completadas</span>
                      <span>{sabana.rooms_total || 0} total</span>
                    </div>
                  </div>
                )}
              </button>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {view !== 'archived' && (
                  <button
                    onClick={(e) => handleArchiveSabana(sabana.id, e)}
                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                    title="Archivar sábana"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
                {view === 'archived' && (
                  <button
                    onClick={(e) => handleUnarchiveSabana(sabana.id, e)}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Desarchivar sábana"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => handleDeleteSabana(sabana.id, e)}
                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  title="Eliminar sábana"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!selectedSabana && filteredSabanas.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center space-y-2">
            <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-300" />
            <p>
              {view === 'active' && 'No hay sábanas activas'}
              {view === 'completed' && 'No hay sábanas completadas'}
              {view === 'archived' && 'No hay sábanas archivadas'}
            </p>
          </div>
        </div>
      )}

      {selectedSabana && (
        <SabanaDetail
          sabanaId={selectedSabana}
          supervisors={supervisors}
          onBack={() => setSelectedSabana(null)}
        />
      )}

      {showCreateModal && (
        <CreateSabanaModal
          supervisors={supervisors}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}

interface SabanaDetailProps {
  sabanaId: string;
  supervisors: Supervisor[];
  onBack: () => void;
}

function SabanaDetail({ sabanaId, supervisors, onBack }: SabanaDetailProps) {
  const [sabana, setSabana] = useState<Sabana | null>(null);
  const [allItems, setAllItems] = useState<SabanaItem[]>([]);
  const [summary, setSummary] = useState<SabanaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PENDIENTE' | 'PROCESO' | 'TERMINADA'>('all');
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [searchRoom, setSearchRoom] = useState('');
  const [showPublicLinkModal, setShowPublicLinkModal] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [sabanaId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [sabanaData, summaryData, allItemsData] = await Promise.all([
        api.getSabana(sabanaId),
        api.getSabanaSummary(sabanaId),
        api.getSabanaItems(sabanaId, { page: 1, pageSize: 500 }),
      ]);
      setSabana(sabanaData);
      setSummary(summaryData);
      setAllItems(allItemsData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.open(api.exportSabanaUrl(sabanaId), '_blank');
  };

  const getBuilding = (room: number) => Math.floor(room / 1000);
  const getFloor = (room: number) => Math.floor((room % 1000) / 100);

  const buildings = [...new Set(allItems.map(item => getBuilding(item.habitacion)))].sort();
  const floors = selectedBuilding !== null
    ? [...new Set(allItems.filter(item => getBuilding(item.habitacion) === selectedBuilding).map(item => getFloor(item.habitacion)))].sort()
    : [];

  const filteredItems = allItems.filter(item => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (selectedBuilding !== null && getBuilding(item.habitacion) !== selectedBuilding) return false;
    if (selectedFloor !== null && getFloor(item.habitacion) !== selectedFloor) return false;
    if (searchRoom && !item.habitacion.toString().includes(searchRoom)) return false;
    return true;
  });

  const getBuildingSummary = (building: number) => {
    const buildingItems = allItems.filter(item => getBuilding(item.habitacion) === building);
    const total = buildingItems.length;
    const terminadas = buildingItems.filter(item => item.estado === 'TERMINADA').length;
    const pendientes = buildingItems.filter(item => item.estado === 'PENDIENTE').length;
    const enProceso = buildingItems.filter(item => item.estado === 'PROCESO').length;
    const avance = total > 0 ? Math.round((terminadas / total) * 100) : 0;
    return { total, terminadas, pendientes, enProceso, avance };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!sabana || !summary) {
    return <div className="text-center text-gray-400 py-12">Sábana no encontrada</div>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
        Volver a sábanas
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{sabana.titulo.toUpperCase()}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Creada: {new Date(sabana.created_at).toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPublicLinkModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:shadow-xl transition-all shadow-lg"
            >
              <Link className="w-4 h-4" />
              Enlace Público
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar HTML
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
          <div className="relative overflow-hidden rounded-xl p-4 backdrop-blur-xl bg-white/60 border border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-slate-200/30" />
            <div className="relative">
              <div className="text-2xl font-bold text-slate-700">{summary.total}</div>
              <div className="text-sm text-slate-600 font-medium">Total</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl p-4 backdrop-blur-xl bg-white/60 border border-orange-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 to-orange-200/30" />
            <div className="relative">
              <div className="text-2xl font-bold text-orange-700">{summary.pendientes}</div>
              <div className="text-sm text-orange-600 font-medium">Pendientes</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl p-4 backdrop-blur-xl bg-white/60 border border-cyan-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/50 to-cyan-200/30" />
            <div className="relative">
              <div className="text-2xl font-bold text-cyan-700">{summary.en_proceso}</div>
              <div className="text-sm text-cyan-600 font-medium">En Proceso</div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl p-4 backdrop-blur-xl bg-white/60 border border-blue-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-blue-200/30" />
            <div className="relative">
              <div className="text-2xl font-bold text-blue-700">{summary.terminadas}</div>
              <div className="text-sm text-blue-600 font-medium">Terminadas</div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Avance</span>
            <span className="font-semibold">{summary.avance_pct}%</span>
          </div>
          <div className="w-full bg-slate-200/60 rounded-full h-3 backdrop-blur-sm">
            <div
              className="bg-gradient-to-r from-blue-600 to-cyan-600 h-3 rounded-full transition-all shadow-lg"
              style={{ width: `${summary.avance_pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-slate-600 to-slate-800 text-white'
                  : 'backdrop-blur-sm bg-white/60 text-slate-700 hover:bg-white/80 border border-slate-200/60'
              }`}
            >
              Todas ({summary.total})
            </button>
            <button
              onClick={() => setFilter('PENDIENTE')}
              className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg ${
                filter === 'PENDIENTE'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white'
                  : 'backdrop-blur-sm bg-white/60 text-slate-700 hover:bg-white/80 border border-orange-200/60'
              }`}
            >
              Pendientes ({summary.pendientes})
            </button>
            <button
              onClick={() => setFilter('PROCESO')}
              className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg ${
                filter === 'PROCESO'
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white'
                  : 'backdrop-blur-sm bg-white/60 text-slate-700 hover:bg-white/80 border border-cyan-200/60'
              }`}
            >
              En Proceso ({summary.en_proceso})
            </button>
            <button
              onClick={() => setFilter('TERMINADA')}
              className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg ${
                filter === 'TERMINADA'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  : 'backdrop-blur-sm bg-white/60 text-slate-700 hover:bg-white/80 border border-blue-200/60'
              }`}
            >
              Terminadas ({summary.terminadas})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Buscar habitación (ej: 1234)..."
              value={searchRoom}
              onChange={(e) => setSearchRoom(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
            />
            <select
              value={selectedBuilding ?? ''}
              onChange={(e) => {
                setSelectedBuilding(e.target.value ? parseInt(e.target.value) : null);
                setSelectedFloor(null);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
            >
              <option value="">Todos los edificios</option>
              {buildings.map(building => (
                <option key={building} value={building}>Edificio {building}</option>
              ))}
            </select>
            {selectedBuilding !== null && (
              <select
                value={selectedFloor ?? ''}
                onChange={(e) => setSelectedFloor(e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              >
                <option value="">Todos los pisos</option>
                {floors.map(floor => (
                  <option key={floor} value={floor}>Piso {floor}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {selectedBuilding !== null && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Edificio {selectedBuilding}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="relative overflow-hidden rounded-xl p-3 shadow-lg" style={{background: 'rgba(255, 255, 255, 0.13)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(255, 255, 255, 0.3)'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-slate-200/30" />
              <div className="relative">
                <div className="text-xl font-bold text-slate-700">{getBuildingSummary(selectedBuilding).total}</div>
                <div className="text-xs text-slate-600 font-medium">Total</div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl p-3 shadow-lg" style={{background: 'rgba(255, 255, 255, 0.13)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(251, 146, 60, 0.3)'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 to-orange-200/30" />
              <div className="relative">
                <div className="text-xl font-bold text-orange-700">{getBuildingSummary(selectedBuilding).pendientes}</div>
                <div className="text-xs text-orange-600 font-medium">Pendientes</div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl p-3 shadow-lg" style={{background: 'rgba(255, 255, 255, 0.13)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(34, 211, 238, 0.3)'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/50 to-cyan-200/30" />
              <div className="relative">
                <div className="text-xl font-bold text-cyan-700">{getBuildingSummary(selectedBuilding).enProceso}</div>
                <div className="text-xs text-cyan-600 font-medium">En Proceso</div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl p-3 shadow-lg" style={{background: 'rgba(255, 255, 255, 0.13)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', border: '1px solid rgba(59, 130, 246, 0.3)'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-blue-200/30" />
              <div className="relative">
                <div className="text-xl font-bold text-blue-700">{getBuildingSummary(selectedBuilding).terminadas}</div>
                <div className="text-xs text-blue-600 font-medium">Terminadas</div>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Avance Edificio {selectedBuilding}</span>
              <span className="font-semibold">{getBuildingSummary(selectedBuilding).avance}%</span>
            </div>
            <div className="w-full rounded-full h-2" style={{background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)'}}>
              <div
                className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all shadow-lg"
                style={{ width: `${getBuildingSummary(selectedBuilding).avance}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {selectedBuilding === null && selectedFloor === null && !searchRoom ? (
        <div className="space-y-6">
          {buildings.map(building => {
            const buildingRooms = filteredItems.filter(item => getBuilding(item.habitacion) === building);
            if (buildingRooms.length === 0) return null;

            return (
              <div key={building} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-800">Edificio {building}</h4>
                  <button
                    onClick={() => setSelectedBuilding(building)}
                    className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    Ver detalles →
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {buildingRooms.map((item) => (
                    <SabanaItemCard
                      key={item.habitacion}
                      item={item}
                      onClick={() => setSelectedRoom(item.habitacion)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
          {filteredItems.map((item) => (
            <SabanaItemCard
              key={item.habitacion}
              item={item}
              onClick={() => setSelectedRoom(item.habitacion)}
            />
          ))}
        </div>
      )}

      {filteredItems.length === 0 && allItems.length > 0 && (
        <div className="text-center py-8 text-gray-400">
          No se encontraron habitaciones con los filtros seleccionados
        </div>
      )}

      {selectedRoom !== null && (
        <RoomDetailModal
          sabanaId={sabanaId}
          roomNumber={selectedRoom}
          supervisors={supervisors}
          onClose={() => setSelectedRoom(null)}
          onUpdate={loadInitialData}
        />
      )}

      {showPublicLinkModal && sabana && (
        <PublicSabanaLinkModal
          sabanaId={sabanaId}
          sabanaTitle={sabana.titulo}
          onClose={() => setShowPublicLinkModal(false)}
        />
      )}
    </div>
  );
}

interface SabanaItemCardProps {
  item: SabanaItem;
  onClick: () => void;
}

function SabanaItemCard({ item, onClick }: SabanaItemCardProps) {
  const statusStyles = {
    PENDIENTE: {
      background: '#818181',
      border: '1px solid rgba(129, 129, 129, 0.6)',
      textColor: 'text-white',
      gradient: ''
    },
    PROCESO: {
      background: '#d56300',
      border: '1px solid rgba(213, 99, 0, 0.6)',
      textColor: 'text-white',
      gradient: ''
    },
    TERMINADA: {
      background: '#bfff00',
      border: '1px solid rgba(191, 255, 0, 0.6)',
      textColor: 'text-gray-900',
      gradient: ''
    },
  };

  const style = statusStyles[item.status];

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden p-3 rounded-xl transition-all hover:scale-105 hover:shadow-xl ${style.textColor} font-bold text-lg`}
      style={{
        background: style.background,
        border: style.border,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
      }}
    >
      {item.habitacion}
    </button>
  );
}

interface RoomDetailModalProps {
  sabanaId: string;
  roomNumber: number;
  supervisors: Supervisor[];
  onClose: () => void;
  onUpdate: () => void;
}

function RoomDetailModal({ sabanaId, roomNumber, supervisors, onClose, onUpdate }: RoomDetailModalProps) {
  const [detail, setDetail] = useState<SabanaItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<number>(supervisors[0]?.id || 1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    try {
      const data = await api.getSabanaItemDetail(sabanaId, roomNumber);
      console.log('🏨 Room Detail Response:', data);
      console.log('🏨 Comments:', data.comments);
      console.log('🏨 Images:', data.images);
      setDetail(data);
    } catch (error) {
      console.error('Error loading room detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: 'PENDIENTE' | 'PROCESO' | 'TERMINADA') => {
    const statusMessages = {
      'PENDIENTE': 'HABITACIÓN MARCADA COMO PENDIENTE',
      'PROCESO': 'HABITACIÓN MARCADA COMO EN PROCESO',
      'TERMINADA': 'HABITACIÓN MARCADA COMO TERMINADA'
    };

    const finalComment = commentBody.trim()
      ? commentBody.toUpperCase()
      : statusMessages[status];

    setSubmitting(true);
    try {
      await api.updateSabanaItem(sabanaId, roomNumber, {
        status,
        comentario: finalComment,
        performedBy: selectedAuthor,
      });
      setCommentBody('');
      await loadDetail();
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentBody.trim() || submitting) return;

    setSubmitting(true);
    try {
      await api.addSabanaItemComment(sabanaId, roomNumber, {
        authorId: selectedAuthor,
        body: commentBody.toUpperCase(),
      });
      setCommentBody('');
      await loadDetail();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error al agregar comentario');
    } finally {
      setSubmitting(false);
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
        await api.addSabanaItemImage(sabanaId, roomNumber, data.data.link);
        await loadDetail();
        alert('Imagen subida exitosamente');
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

  const statusColors = {
    PENDIENTE: 'text-white',
    PROCESO: 'text-white',
    TERMINADA: 'text-gray-900',
  };

  const statusBackgrounds = {
    PENDIENTE: '#818181',
    PROCESO: '#d56300',
    TERMINADA: '#bfff00',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Habitación {roomNumber}</h3>
            {detail && (
              <span
                className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[detail.status]}`}
                style={{ backgroundColor: statusBackgrounds[detail.status] }}
              >
                {detail.status}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : !detail ? (
            <p className="text-center text-gray-400 py-12">Error al cargar detalles</p>
          ) : (
            <>
              {detail.images && detail.images.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Fotos ({detail.images.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {detail.images.map((image) => (
                      <img
                        key={image.id}
                        src={image.url}
                        alt="Foto habitación"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Historial ({detail.comments?.length || 0})
                </h4>
                <div className="space-y-3">
                  {!detail.comments || detail.comments.length === 0 ? (
                    <p className="text-gray-400 text-center py-8 text-sm">No hay comentarios aún</p>
                  ) : (
                    detail.comments.map((entry) => (
                      <div key={entry.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {supervisors.find((s) => s.id === entry.author_id)?.nombre || 'Sistema'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.created_at).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Responsable</label>
                  <select
                    value={selectedAuthor}
                    onChange={(e) => setSelectedAuthor(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {supervisors.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentario o cambio de estado
                  </label>
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Describe el avance, problema o cambio..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {detail.status !== 'PENDIENTE' && (
                    <button
                      onClick={() => handleStatusChange('PENDIENTE')}
                      disabled={submitting}
                      className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#818181' }}
                    >
                      Marcar Pendiente
                    </button>
                  )}
                  {detail.status !== 'PROCESO' && (
                    <button
                      onClick={() => handleStatusChange('PROCESO')}
                      disabled={submitting}
                      className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#d56300' }}
                    >
                      Iniciar Proceso
                    </button>
                  )}
                  {detail.status !== 'TERMINADA' && (
                    <button
                      onClick={() => handleStatusChange('TERMINADA')}
                      disabled={submitting}
                      className="px-4 py-2 text-gray-900 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#bfff00' }}
                    >
                      Marcar Terminada
                    </button>
                  )}
                  <button
                    onClick={handleAddComment}
                    disabled={submitting || !commentBody.trim()}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <MessageCircle className="w-4 h-4 inline mr-1" />
                    Solo Comentar
                  </button>
                </div>

                <div className="border-t pt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingImage ? 'Subiendo...' : 'Subir foto'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
