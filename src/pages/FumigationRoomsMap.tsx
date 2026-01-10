import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fumigationApi, FumigationCycle, RoomFumigation, RoomFumigationStatus } from '../lib/fumigationApi';
import {
  Home, CheckCircle, Clock, X, Calendar, User, FileText,
  Image as ImageIcon, MapPin, Search, Filter, ArrowLeft,
  TrendingUp, AlertCircle, ChevronDown, Loader2, XCircle
} from 'lucide-react';

type StatusFilter = 'all' | 'COMPLETADA' | 'PENDIENTE' | 'NO_APLICA';

export default function FumigationRoomsMap() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();

  const [cycles, setCycles] = useState<FumigationCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(cycleId ? Number(cycleId) : null);
  const [rooms, setRooms] = useState<RoomFumigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);

  const [selectedRoom, setSelectedRoom] = useState<RoomFumigation | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      loadCycleData(selectedCycleId);
    }
  }, [selectedCycleId]);

  const loadInitialData = async () => {
    try {
      const cyclesData = await fumigationApi.getCycles();
      setCycles(cyclesData.sort((a, b) => {
        const dateA = new Date(a.period_start).getTime();
        const dateB = new Date(b.period_start).getTime();
        return dateB - dateA;
      }));

      if (!selectedCycleId && cyclesData.length > 0) {
        setSelectedCycleId(cyclesData[0].id);
      }
    } catch (err) {
      setError('Error al cargar los ciclos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCycleData = async (id: number) => {
    setLoadingData(true);
    setError(null);
    try {
      const roomsData = await fumigationApi.getCycleRooms(id);
      setRooms(roomsData);
    } catch (err) {
      setError('Error al cargar datos del ciclo');
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const roomNumber = room.room_number;

      if (searchQuery && !roomNumber.toString().includes(searchQuery)) {
        return false;
      }

      if (statusFilter !== 'all' && room.status !== statusFilter) return false;

      if (selectedBuilding !== null) {
        const building = Math.floor(Number(roomNumber) / 1000);
        if (building !== selectedBuilding) return false;
      }

      return true;
    });
  }, [rooms, searchQuery, statusFilter, selectedBuilding]);

  const buildings = useMemo(() => {
    const buildingSet = new Set(rooms.map(r => Math.floor(Number(r.room_number) / 1000)));
    return Array.from(buildingSet).sort();
  }, [rooms]);

  const stats = useMemo(() => {
    const total = rooms.length;
    const done = rooms.filter(r => r.status === 'COMPLETADA').length;
    const pending = rooms.filter(r => r.status === 'PENDIENTE').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, pending, progress };
  }, [rooms]);

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  const getRoomStatus = (room: RoomFumigation): RoomFumigationStatus => {
    return room.status;
  };

  const getRoomStyle = (room: RoomFumigation) => {
    const status = getRoomStatus(room);
    switch (status) {
      case 'COMPLETADA':
        return 'bg-green-100 border-green-500 text-green-800 hover:bg-green-200';
      case 'NO_APLICA':
        return 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200';
      case 'PENDIENTE':
        return 'bg-red-100 border-red-500 text-red-800 hover:bg-red-200';
      default:
        return 'bg-yellow-100 border-yellow-500 text-yellow-800 hover:bg-yellow-200';
    }
  };

  const getRoomIcon = (room: RoomFumigation) => {
    const status = getRoomStatus(room);
    switch (status) {
      case 'COMPLETADA':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'NO_APLICA':
        return <XCircle className="w-4 h-4 text-gray-600" />;
      case 'PENDIENTE':
        return <Clock className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedBuilding(null);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || selectedBuilding !== null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No hay ciclos disponibles</h2>
        <p className="text-gray-500 mb-6">Crea un ciclo de fumigación para comenzar</p>
        <button
          onClick={() => navigate('/fumigacion/habitaciones')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Ir a Fumigación
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate('/fumigacion/habitaciones')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Mapa de Habitaciones</h1>
          </div>
          <p className="text-gray-500 ml-11">Visualiza el avance de fumigación por ciclo</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCycleId || ''}
            onChange={(e) => setSelectedCycleId(Number(e.target.value))}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
          >
            {cycles.map(cycle => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => selectedCycleId && loadCycleData(selectedCycleId)}
            className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Fumigadas</p>
              <p className="text-2xl font-bold text-green-600">{stats.done}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Pendientes</p>
              <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Progreso</p>
              <p className="text-2xl font-bold text-cyan-600">{stats.progress}%</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número de habitación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-600 rounded-full" />
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="NO_APLICA">No aplica</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Edificio</label>
                <select
                  value={selectedBuilding ?? ''}
                  onChange={(e) => setSelectedBuilding(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  {buildings.map(b => (
                    <option key={b} value={b}>Edificio {b}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <div className="md:col-span-2">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span className="text-gray-600">Completada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span className="text-gray-600">Pendiente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-400 rounded" />
                <span className="text-gray-600">No aplica</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Mostrando {filteredRooms.length} de {rooms.length} habitaciones
            </p>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-16">
              <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">
                {hasActiveFilters ? 'No hay habitaciones que coincidan con los filtros' : 'No hay habitaciones en este ciclo'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
              {filteredRooms
                .sort((a, b) => Number(a.room_number) - Number(b.room_number))
                .map(room => {
                  const roomNumber = room.room_number;

                  return (
                    <div
                      key={room.id}
                      className="relative group"
                    >
                      <button
                        onClick={() => setSelectedRoom(room)}
                        className={`
                          w-full aspect-square rounded-lg border-2 p-1 flex flex-col items-center justify-center
                          transition-all hover:scale-105 hover:shadow-lg cursor-pointer
                          ${getRoomStyle(room)}
                        `}
                      >
                        {getRoomIcon(room)}
                        <span className="text-xs font-bold mt-0.5">{roomNumber}</span>
                      </button>

                      <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                        <p className="font-bold mb-1">Habitación {roomNumber}</p>
                        {room.fumigated_at ? (
                          <>
                            <p className="text-gray-300">
                              {new Date(room.fumigated_at).toLocaleDateString('es-MX')}
                            </p>
                            {room.fumigator_nombre && (
                              <p className="text-gray-300 truncate">{room.fumigator_nombre}</p>
                            )}
                            {room.observations && (
                              <p className="text-gray-400 truncate mt-1">{room.observations}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-400">Pendiente de fumigación</p>
                        )}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className={`p-6 ${
              selectedRoom.status === 'COMPLETADA'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                : selectedRoom.status === 'NO_APLICA'
                ? 'bg-gradient-to-r from-gray-500 to-gray-600'
                : 'bg-gradient-to-r from-red-600 to-rose-600'
            } text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Home className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Habitación {selectedRoom.room_number}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium bg-white/20 text-white`}>
                        {selectedRoom.status === 'COMPLETADA' ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Completada
                          </>
                        ) : selectedRoom.status === 'NO_APLICA' ? (
                          <>
                            <XCircle className="w-4 h-4" />
                            No aplica
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4" />
                            Pendiente
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {selectedRoom.status === 'PENDIENTE' || !selectedRoom.fumigated_at ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">Pendiente de fumigación</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Esta habitación aún no ha sido fumigada en este ciclo
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                      Información de Fumigación
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Fecha</p>
                        <p className="font-medium text-gray-900">
                          {new Date(selectedRoom.fumigated_at).toLocaleString('es-MX', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tipo de Servicio</p>
                        <p className="font-medium text-gray-900">
                          {selectedRoom.service_type}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Fumigador</p>
                        <p className="font-medium text-gray-900">
                          {selectedRoom.fumigator_nombre || 'No especificado'}
                        </p>
                      </div>
                      {selectedRoom.fumigator_empresa && (
                        <div>
                          <p className="text-sm text-gray-500">Empresa</p>
                          <p className="font-medium text-gray-900">
                            {selectedRoom.fumigator_empresa}
                          </p>
                        </div>
                      )}
                      {selectedRoom.area && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Área</p>
                          <p className="font-medium text-gray-900">{selectedRoom.area}</p>
                        </div>
                      )}
                      {(selectedRoom.utm_x && selectedRoom.utm_y) && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Coordenadas UTM</p>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {selectedRoom.utm_x?.toFixed(6)}, {selectedRoom.utm_y?.toFixed(6)}
                          </p>
                        </div>
                      )}
                      {selectedRoom.observations && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Observaciones</p>
                          <p className="font-medium text-gray-900">{selectedRoom.observations}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRoom.photos && selectedRoom.photos.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                        Fotografías ({selectedRoom.photos.length})
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedRoom.photos.map((photo, idx) => (
                          <a
                            key={idx}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-colors group"
                          >
                            <img
                              src={photo}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
