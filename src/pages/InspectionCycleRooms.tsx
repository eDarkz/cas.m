import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inspectionsApi, InspectionRoomInCycle, InspectionCycle, InspectionRoomStatus } from '../lib/inspections-api';
import { ArrowLeft, Search, Filter, CheckCircle, AlertCircle, Clock, XCircle, Home, TrendingUp, BarChart3 } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';

export default function InspectionCycleRooms() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<InspectionCycle | null>(null);
  const [rooms, setRooms] = useState<InspectionRoomInCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | InspectionRoomStatus>('all');
  const [searchRoom, setSearchRoom] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);

  useEffect(() => {
    if (cycleId) {
      loadData();
    }
  }, [cycleId]);

  const loadData = async () => {
    if (!cycleId) return;

    try {
      const [cyclesData, roomsData] = await Promise.all([
        inspectionsApi.getCycles(),
        inspectionsApi.getCycleRooms(Number(cycleId)),
      ]);

      const currentCycle = cyclesData.find(c => c.id === Number(cycleId));
      setCycle(currentCycle || null);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBuilding = (room: number) => Math.floor(room / 1000);

  const buildings = [...new Set(rooms.map(r => getBuilding(r.roomNumber)))].sort();

  const filteredRooms = rooms.filter(room => {
    if (filter !== 'all' && room.status !== filter) return false;
    if (selectedBuilding !== null && getBuilding(room.roomNumber) !== selectedBuilding) return false;
    if (searchRoom && !room.roomNumber.toString().includes(searchRoom)) return false;
    return true;
  });

  const summary = {
    total: rooms.length,
    sinInspeccionar: rooms.filter(r => r.status === 'SIN_INSPECCIONAR').length,
    incompleta: rooms.filter(r => r.status === 'INCOMPLETA').length,
    conFallas: rooms.filter(r => r.status === 'CON_FALLAS').length,
    sinFallas: rooms.filter(r => r.status === 'SIN_FALLAS').length,
  };

  const progress = summary.total > 0
    ? Math.round((summary.sinFallas / summary.total) * 100)
    : 0;

  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HamsterLoader />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ciclo no encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/inspecciones')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-700 to-blue-700 bg-clip-text text-transparent">
              {cycle.nombre}
            </h2>
            <p className="text-sm text-slate-600">{getMonthName(cycle.month)} {cycle.year}</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/inspecciones/ciclos/${cycleId}/analytics`)}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
        >
          <BarChart3 className="w-5 h-5" />
          Ver Analítica
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          label="Total"
          value={summary.total}
          icon={Home}
          color="slate"
        />
        <StatCard
          label="Sin Inspeccionar"
          value={summary.sinInspeccionar}
          icon={XCircle}
          color="gray"
        />
        <StatCard
          label="Incompletas"
          value={summary.incompleta}
          icon={Clock}
          color="orange"
        />
        <StatCard
          label="Con Fallas"
          value={summary.conFallas}
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          label="Sin Fallas"
          value={summary.sinFallas}
          icon={CheckCircle}
          color="green"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-600" />
            <span className="font-semibold text-gray-700">Progreso General</span>
          </div>
          <span className="text-2xl font-bold text-cyan-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-500 shadow-lg"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar habitación..."
              value={searchRoom}
              onChange={(e) => setSearchRoom(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedBuilding ?? ''}
            onChange={(e) => setSelectedBuilding(e.target.value ? Number(e.target.value) : null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            <option value="">Todos los edificios</option>
            {buildings.map(b => (
              <option key={b} value={b}>Edificio {b}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          <FilterButton
            label="Todas"
            count={summary.total}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            color="slate"
          />
          <FilterButton
            label="Sin Inspeccionar"
            count={summary.sinInspeccionar}
            active={filter === 'SIN_INSPECCIONAR'}
            onClick={() => setFilter('SIN_INSPECCIONAR')}
            color="gray"
          />
          <FilterButton
            label="Incompletas"
            count={summary.incompleta}
            active={filter === 'INCOMPLETA'}
            onClick={() => setFilter('INCOMPLETA')}
            color="orange"
          />
          <FilterButton
            label="Con Fallas"
            count={summary.conFallas}
            active={filter === 'CON_FALLAS'}
            onClick={() => setFilter('CON_FALLAS')}
            color="red"
          />
          <FilterButton
            label="Sin Fallas"
            count={summary.sinFallas}
            active={filter === 'SIN_FALLAS'}
            onClick={() => setFilter('SIN_FALLAS')}
            color="green"
          />
        </div>
      </div>

      {selectedBuilding === null ? (
        <div className="space-y-6">
          {buildings.map(building => {
            const buildingRooms = filteredRooms.filter(r => getBuilding(r.roomNumber) === building);
            if (buildingRooms.length === 0) return null;

            return (
              <div key={building} className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Edificio {building}</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {buildingRooms.map(room => (
                    <RoomCard
                      key={room.roomCycleId}
                      room={room}
                      onClick={() => navigate(`/inspecciones/ciclos/${cycleId}/resumen/${room.roomId}`)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Edificio {selectedBuilding}</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {filteredRooms.map(room => (
              <RoomCard
                key={room.roomCycleId}
                room={room}
                onClick={() => navigate(`/inspecciones/ciclos/${cycleId}/habitaciones/${room.roomId}`)}
              />
            ))}
          </div>
        </div>
      )}

      {filteredRooms.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-lg">
          <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No se encontraron habitaciones con los filtros seleccionados</p>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'slate' | 'gray' | 'orange' | 'red' | 'green';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colors = {
    slate: 'from-slate-500 to-slate-600',
    gray: 'from-gray-500 to-gray-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    green: 'from-green-500 to-green-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-lg">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colors[color]} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="text-2xl font-bold text-gray-800">{value}</div>
      </div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: 'slate' | 'gray' | 'orange' | 'red' | 'green';
}

function FilterButton({ label, count, active, onClick, color }: FilterButtonProps) {
  const activeColors = {
    slate: 'bg-gradient-to-r from-slate-600 to-slate-700 text-white',
    gray: 'bg-gradient-to-r from-gray-600 to-gray-700 text-white',
    orange: 'bg-gradient-to-r from-orange-600 to-orange-700 text-white',
    red: 'bg-gradient-to-r from-red-600 to-red-700 text-white',
    green: 'bg-gradient-to-r from-green-600 to-green-700 text-white',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-all text-sm font-medium shadow-md ${
        active
          ? activeColors[color]
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label} ({count})
    </button>
  );
}

interface RoomCardProps {
  room: InspectionRoomInCycle;
  onClick: () => void;
}

function RoomCard({ room, onClick }: RoomCardProps) {
  const statusColors = {
    SIN_INSPECCIONAR: 'bg-gray-400',
    INCOMPLETA: 'bg-orange-500',
    CON_FALLAS: 'bg-red-500',
    SIN_FALLAS: 'bg-green-500',
  };

  return (
    <button
      onClick={onClick}
      className={`${statusColors[room.status]} text-white font-bold text-lg p-4 rounded-xl hover:scale-110 hover:shadow-2xl transition-all duration-200 shadow-lg`}
    >
      {room.roomNumber}
    </button>
  );
}
