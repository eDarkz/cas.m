import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Filter,
  Calendar,
  User,
  MapPin,
  ChevronRight,
  Image as ImageIcon,
  QrCode,
} from 'lucide-react';
import {
  fumigationApi,
  FumigationCycle,
  RoomFumigation,
  RoomFumigationStatus,
} from '../lib/fumigationApi';
import FumigationNavigation from '../components/FumigationNavigation';
import RoomFumigationDetailModal from '../components/RoomFumigationDetailModal';

const STATUS_STYLES: Record<RoomFumigationStatus, { bg: string; text: string; border: string }> = {
  PENDIENTE: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  NO_APLICA: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
};

export default function FumigacionCicloDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cycleId = Number(id);

  const [cycle, setCycle] = useState<FumigationCycle | null>(null);
  const [rooms, setRooms] = useState<RoomFumigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<RoomFumigationStatus | ''>('');
  const [filterArea, setFilterArea] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<RoomFumigation | null>(null);

  const loadData = async () => {
    if (!cycleId) return;
    setLoading(true);
    try {
      const [cycleData, roomsData] = await Promise.all([
        fumigationApi.getCycle(cycleId),
        fumigationApi.getCycleRooms(cycleId, {
          status: filterStatus || undefined,
        }),
      ]);
      setCycle(cycleData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading cycle data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cycleId, filterStatus]);

  const areas = useMemo(() => {
    const areaSet = new Set<string>();
    rooms.forEach((r) => {
      if (r.area) areaSet.add(r.area);
    });
    return Array.from(areaSet).sort();
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!room.room_number.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filterArea && room.area !== filterArea) {
        return false;
      }
      return true;
    });
  }, [rooms, searchQuery, filterArea]);

  const groupedByArea = useMemo(() => {
    const groups: Record<string, RoomFumigation[]> = {};
    filteredRooms.forEach((room) => {
      const area = room.area || 'Sin area';
      if (!groups[area]) groups[area] = [];
      groups[area].push(room);
    });
    return groups;
  }, [filteredRooms]);

  const stats = useMemo(() => {
    const pending = rooms.filter((r) => r.status === 'PENDIENTE').length;
    const completed = rooms.filter((r) => r.status === 'COMPLETADA').length;
    const total = rooms.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { pending, completed, total, progress };
  }, [rooms]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!cycleId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">ID de ciclo invalido</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FumigationNavigation />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/fumigacion/habitaciones')}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a ciclos
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <Home className="w-7 h-7 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {cycle?.label || 'Cargando...'}
                </h1>
                {cycle && (
                  <p className="text-gray-500">
                    {new Date(cycle.period_start).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'long',
                    })}{' '}
                    -{' '}
                    {new Date(cycle.period_end).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
          <Link
            to={`/fumigacion/habitaciones/campo/${cycleId}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            <QrCode className="w-5 h-5" />
            Formulario Campo
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total habitaciones</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completadas</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pendientes</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-3xl font-bold text-teal-600">{stats.progress}%</div>
            <div className="text-sm text-gray-500">Progreso</div>
            <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-teal-600" />
                <h2 className="font-semibold text-gray-900">Habitaciones</h2>
                <span className="text-sm text-gray-500">({filteredRooms.length})</span>
              </div>
              <button
                onClick={loadData}
                className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="Recargar"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar habitacion..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as RoomFumigationStatus | '')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="PENDIENTE">Pendientes</option>
                  <option value="COMPLETADA">Completadas</option>
                  <option value="NO_APLICA">No aplica</option>
                </select>
                {areas.length > 0 && (
                  <select
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                  >
                    <option value="">Todas las areas</option>
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {loading && rooms.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
              <span className="text-gray-600">Cargando habitaciones...</span>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500">
              <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No se encontraron habitaciones</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              {Object.entries(groupedByArea).map(([area, areaRooms]) => (
                <div key={area}>
                  <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 sticky top-0">
                    <span className="font-medium text-gray-700">{area}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({areaRooms.filter((r) => r.status === 'COMPLETADA').length}/{areaRooms.length})
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {areaRooms.map((room) => {
                      const statusStyle = STATUS_STYLES[room.status];
                      return (
                        <div
                          key={room.id}
                          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedRoom(room)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusStyle.bg}`}
                              >
                                {room.status === 'COMPLETADA' ? (
                                  <CheckCircle2 className={`w-5 h-5 ${statusStyle.text}`} />
                                ) : room.status === 'PENDIENTE' ? (
                                  <Clock className={`w-5 h-5 ${statusStyle.text}`} />
                                ) : (
                                  <AlertTriangle className={`w-5 h-5 ${statusStyle.text}`} />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900">
                                    {room.room_number}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                                  >
                                    {room.status}
                                  </span>
                                </div>
                                {room.status === 'COMPLETADA' && (
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(room.fumigated_at)}
                                    </span>
                                    {room.fumigator_nombre && (
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {room.fumigator_nombre}
                                      </span>
                                    )}
                                    {room.photos.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                        {room.photos.length}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedRoom && (
        <RoomFumigationDetailModal
          roomFumigation={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onUpdate={() => {
            setSelectedRoom(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
