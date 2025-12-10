import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api, FumigationCycle, FumigationRoomByCycle, FumigationRoomLog, Supervisor } from '../lib/api';
import {
  Home, CheckCircle, Clock, X, Calendar, User, FileText,
  Image as ImageIcon, MapPin, Search, Filter, ArrowLeft,
  TrendingUp, AlertCircle, ChevronDown, ExternalLink, Loader2
} from 'lucide-react';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface RoomWithLogs extends FumigationRoomByCycle {
  logs: FumigationRoomLog[];
  visitCount: number;
}

type StatusFilter = 'all' | 'done' | 'pending' | 'partial';

export default function FumigationRoomsMap() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cycles, setCycles] = useState<FumigationCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(cycleId ? Number(cycleId) : null);
  const [rooms, setRooms] = useState<FumigationRoomByCycle[]>([]);
  const [allLogs, setAllLogs] = useState<FumigationRoomLog[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [fumigatorFilter, setFumigatorFilter] = useState<number | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);

  const [selectedRoom, setSelectedRoom] = useState<RoomWithLogs | null>(null);
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
      const [cyclesData, supervisorsData] = await Promise.all([
        api.getFumigationCycles(),
        api.getSupervisors(),
      ]);
      setCycles(cyclesData.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }));
      setSupervisors(supervisorsData);

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
      const [roomsData, logsData] = await Promise.all([
        api.getFumigationRoomsByCycle(id),
        api.getFumigationRoomsLogsByCycle(id),
      ]);
      setRooms(roomsData);
      setAllLogs(logsData);
    } catch (err) {
      setError('Error al cargar datos del ciclo');
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const roomsWithLogs = useMemo(() => {
    return rooms.map(room => {
      const roomLogs = allLogs.filter(log => log.room_id === room.room_id);
      return {
        ...room,
        logs: roomLogs.sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime()),
        visitCount: roomLogs.length,
      };
    });
  }, [rooms, allLogs]);

  const filteredRooms = useMemo(() => {
    return roomsWithLogs.filter(room => {
      const roomNumber = room.room_number || room.room_id;

      if (searchQuery && !roomNumber.toString().includes(searchQuery)) {
        return false;
      }

      if (statusFilter === 'done' && room.status !== 'done') return false;
      if (statusFilter === 'pending' && room.status === 'done') return false;
      if (statusFilter === 'partial' && room.visitCount <= 1) return false;

      if (fumigatorFilter !== null) {
        const hasFumigator = room.logs.some(log => log.fumigator_id === fumigatorFilter);
        if (!hasFumigator) return false;
      }

      if (selectedBuilding !== null) {
        const building = Math.floor(roomNumber / 1000);
        if (building !== selectedBuilding) return false;
      }

      return true;
    });
  }, [roomsWithLogs, searchQuery, statusFilter, fumigatorFilter, selectedBuilding]);

  const buildings = useMemo(() => {
    const buildingSet = new Set(roomsWithLogs.map(r => Math.floor((r.room_number || r.room_id) / 1000)));
    return Array.from(buildingSet).sort();
  }, [roomsWithLogs]);

  const stats = useMemo(() => {
    const total = rooms.length;
    const done = rooms.filter(r => r.status === 'done').length;
    const pending = total - done;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    const visitDates = allLogs.map(l => new Date(l.visited_at).getTime()).sort();
    let avgTimeBetweenVisits = 0;
    if (visitDates.length > 1) {
      let totalDiff = 0;
      for (let i = 1; i < visitDates.length; i++) {
        totalDiff += visitDates[i] - visitDates[i - 1];
      }
      avgTimeBetweenVisits = Math.round(totalDiff / (visitDates.length - 1) / (1000 * 60 * 60));
    }

    return { total, done, pending, progress, avgTimeBetweenVisits };
  }, [rooms, allLogs]);

  const fumigators = useMemo(() => {
    const fumigatorIds = new Set(allLogs.map(l => l.fumigator_id).filter(Boolean));
    return supervisors.filter(s => fumigatorIds.has(s.id));
  }, [allLogs, supervisors]);

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  const getRoomStatus = (room: RoomWithLogs): 'done' | 'pending' | 'partial' => {
    if (room.status === 'done') {
      return room.visitCount > 1 ? 'partial' : 'done';
    }
    return 'pending';
  };

  const getRoomStyle = (room: RoomWithLogs) => {
    const status = getRoomStatus(room);
    switch (status) {
      case 'done':
        return 'bg-green-100 border-green-500 text-green-800 hover:bg-green-200';
      case 'partial':
        return 'bg-emerald-100 border-emerald-500 text-emerald-800 hover:bg-emerald-200';
      case 'pending':
        return 'bg-red-100 border-red-500 text-red-800 hover:bg-red-200';
    }
  };

  const getRoomIcon = (room: RoomWithLogs) => {
    const status = getRoomStatus(room);
    switch (status) {
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'partial':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-red-600" />;
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setFumigatorFilter(null);
    setSelectedBuilding(null);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || fumigatorFilter !== null || selectedBuilding !== null;

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
          onClick={() => navigate('/fumigacion')}
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
              onClick={() => navigate('/fumigacion')}
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
                {MONTHS[cycle.month - 1]} {cycle.year}
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
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="done">Fumigadas</option>
                  <option value="pending">Pendientes</option>
                  <option value="partial">Multiples visitas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fumigador</label>
                <select
                  value={fumigatorFilter || ''}
                  onChange={(e) => setFumigatorFilter(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  {fumigators.map(f => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))}
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
                <div className="md:col-span-3">
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
                <span className="text-gray-600">Fumigada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded" />
                <span className="text-gray-600">Multiples visitas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span className="text-gray-600">Pendiente</span>
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
                .sort((a, b) => (a.room_number || a.room_id) - (b.room_number || b.room_id))
                .map(room => {
                  const roomNumber = room.room_number || room.room_id;
                  const lastLog = room.logs[0];

                  return (
                    <div
                      key={room.room_id}
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
                        {room.visitCount > 1 && (
                          <span className="text-[10px] font-medium opacity-75">x{room.visitCount}</span>
                        )}
                      </button>

                      <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                        <p className="font-bold mb-1">Habitación {roomNumber}</p>
                        {lastLog ? (
                          <>
                            <p className="text-gray-300">
                              {new Date(lastLog.visited_at).toLocaleDateString('es-MX')}
                            </p>
                            {lastLog.fumigator_nombre && (
                              <p className="text-gray-300 truncate">{lastLog.fumigator_nombre}</p>
                            )}
                            {lastLog.notes && (
                              <p className="text-gray-400 truncate mt-1">{lastLog.notes}</p>
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
              selectedRoom.status === 'done'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                : 'bg-gradient-to-r from-red-600 to-rose-600'
            } text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Home className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Habitación {selectedRoom.room_number || selectedRoom.room_id}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${
                        selectedRoom.status === 'done'
                          ? 'bg-white/20 text-white'
                          : 'bg-white/20 text-white'
                      }`}>
                        {selectedRoom.status === 'done' ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Fumigada
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4" />
                            Pendiente
                          </>
                        )}
                      </span>
                      {selectedRoom.visitCount > 0 && (
                        <span className="text-sm text-white/80">
                          {selectedRoom.visitCount} visita{selectedRoom.visitCount > 1 ? 's' : ''}
                        </span>
                      )}
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
              {selectedRoom.logs.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">Pendiente de fumigación</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Esta habitación aún no ha sido fumigada en este ciclo
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedRoom.logs.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                        Última Visita
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Fecha</p>
                          <p className="font-medium text-gray-900">
                            {new Date(selectedRoom.logs[0].visited_at).toLocaleString('es-MX', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Fumigador</p>
                          <p className="font-medium text-gray-900">
                            {selectedRoom.logs[0].fumigator_nombre || 'No especificado'}
                          </p>
                        </div>
                        {(selectedRoom.logs[0].utm_x && selectedRoom.logs[0].utm_y) && (
                          <div className="col-span-2">
                            <p className="text-sm text-gray-500">Coordenadas UTM</p>
                            <p className="font-medium text-gray-900 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              {selectedRoom.logs[0].utm_x?.toFixed(6)}, {selectedRoom.logs[0].utm_y?.toFixed(6)}
                            </p>
                          </div>
                        )}
                        {selectedRoom.logs[0].notes && (
                          <div className="col-span-2">
                            <p className="text-sm text-gray-500">Notas</p>
                            <p className="font-medium text-gray-900">{selectedRoom.logs[0].notes}</p>
                          </div>
                        )}
                        {selectedRoom.logs[0].photo_url && (
                          <div className="col-span-2">
                            <a
                              href={selectedRoom.logs[0].photo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                            >
                              <ImageIcon className="w-5 h-5" />
                              Ver fotografía
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Historial Completo ({selectedRoom.logs.length} visita{selectedRoom.logs.length > 1 ? 's' : ''})
                    </h4>
                    <div className="space-y-3">
                      {selectedRoom.logs.map((log, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-gray-900 mb-2">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span className="font-bold">
                                  {new Date(log.visited_at).toLocaleString('es-MX', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              <div className="space-y-1 text-sm">
                                {log.fumigator_nombre && (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span>{log.fumigator_nombre}</span>
                                  </div>
                                )}

                                {log.notes && (
                                  <div className="flex items-start gap-2 text-gray-600">
                                    <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                                    <span>{log.notes}</span>
                                  </div>
                                )}

                                {(log.utm_x && log.utm_y) && (
                                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                                    <MapPin className="w-3 h-3" />
                                    <span>{log.utm_x.toFixed(6)}, {log.utm_y.toFixed(6)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {log.photo_url && (
                              <a
                                href={log.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 p-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Ver foto"
                              >
                                <ImageIcon className="w-5 h-5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
