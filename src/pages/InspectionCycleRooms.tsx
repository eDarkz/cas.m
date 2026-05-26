import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inspectionsApi, InspectionRoomInCycle, InspectionCycle, InspectionRoomStatus } from '../lib/inspections-api';
import { ArrowLeft, Search, Filter, CheckCircle, AlertCircle, Clock, XCircle, Home, TrendingUp, BarChart3, CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [showCalendar, setShowCalendar] = useState(false);

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
        <div className="flex gap-3">
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300 font-medium"
          >
            <CalendarDays className="w-5 h-5" />
            Calendario
          </button>
          <button
            onClick={() => navigate(`/inspecciones/ciclos/${cycleId}/analytics`)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <BarChart3 className="w-5 h-5" />
            Ver Analítica
          </button>
        </div>
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

      {showCalendar && cycle && (
        <InspectionCalendarModal
          cycle={cycle}
          rooms={rooms}
          onClose={() => setShowCalendar(false)}
        />
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

interface RoomDayEntry {
  roomNumber: number;
  status: InspectionRoomStatus;
  startedAt: string | null;
  finishedAt: string | null;
  inspectorName: string | null;
}

interface DayData {
  started: number;
  finished: number;
  conFallas: number;
  sinFallas: number;
  rooms: number[];
  entries: RoomDayEntry[];
}

function InspectionCalendarModal({ cycle, rooms, onClose }: { cycle: InspectionCycle; rooms: InspectionRoomInCycle[]; onClose: () => void }) {
  const [viewMonth, setViewMonth] = useState(cycle.month);
  const [viewYear, setViewYear] = useState(cycle.year);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const fullMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  const getDayMap = (): Record<string, DayData> => {
    const map: Record<string, DayData> = {};
    rooms.forEach(room => {
      const dateStr = room.finishedAt || room.startedAt;
      if (!dateStr) return;
      const date = new Date(dateStr);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      if (!map[key]) {
        map[key] = { started: 0, finished: 0, conFallas: 0, sinFallas: 0, rooms: [], entries: [] };
      }
      if (room.finishedAt) {
        map[key].finished++;
        if (room.status === 'CON_FALLAS') map[key].conFallas++;
        if (room.status === 'SIN_FALLAS') map[key].sinFallas++;
      } else {
        map[key].started++;
      }
      map[key].rooms.push(room.roomNumber);
      map[key].entries.push({
        roomNumber: room.roomNumber,
        status: room.status,
        startedAt: room.startedAt,
        finishedAt: room.finishedAt,
        inspectorName: room.inspectorName,
      });
    });
    return map;
  };

  const dayMap = getDayMap();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const maxInDay = Math.max(1, ...Object.values(dayMap).map(d => d.finished + d.started));

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else { setViewMonth(viewMonth - 1); }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else { setViewMonth(viewMonth + 1); }
    setSelectedDay(null);
  };

  const selectedDayData = selectedDay ? dayMap[`${viewYear}-${viewMonth}-${selectedDay}`] : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Calendario de Inspecciones
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {cycle.nombre}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {fullMonths[viewMonth - 1]} {viewYear}
            </h4>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">
                {d}
              </div>
            ))}

            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = `${viewYear}-${viewMonth}-${day}`;
              const data = dayMap[key];
              const total = data ? data.finished + data.started : 0;
              const intensity = total > 0 ? Math.max(0.2, total / maxInDay) : 0;
              const isSelected = selectedDay === day;
              const today = new Date();
              const isToday = day === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative ${
                    isSelected
                      ? 'ring-2 ring-cyan-500 bg-cyan-50 dark:bg-cyan-900/30'
                      : total > 0
                        ? 'hover:ring-2 hover:ring-cyan-300'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                  } ${isToday ? 'ring-1 ring-slate-300' : ''}`}
                >
                  <span className={`font-medium ${total > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    {day}
                  </span>
                  {total > 0 && (
                    <div
                      className="w-5 h-1.5 rounded-full mt-0.5"
                      style={{
                        backgroundColor: data.conFallas > 0
                          ? `rgba(239, 68, 68, ${intensity})`
                          : `rgba(6, 182, 212, ${intensity})`,
                      }}
                    />
                  )}
                  {total > 0 && (
                    <span className="text-[9px] font-bold text-cyan-700 dark:text-cyan-400">{total}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 justify-center pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded-full bg-cyan-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Sin fallas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded-full bg-red-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Con fallas</span>
            </div>
          </div>

          {selectedDay && selectedDayData && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {selectedDay} de {fullMonths[viewMonth - 1]} — {selectedDayData.entries.length} habitaciones
              </h5>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-600 text-center">
                  <div className="font-bold text-base text-cyan-600">{selectedDayData.finished}</div>
                  <div className="text-slate-500">Completadas</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-600 text-center">
                  <div className="font-bold text-base text-amber-600">{selectedDayData.started}</div>
                  <div className="text-slate-500">Iniciadas</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-600 text-center">
                  <div className="font-bold text-base text-green-600">{selectedDayData.sinFallas}</div>
                  <div className="text-slate-500">Sin fallas</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-600 text-center">
                  <div className="font-bold text-base text-red-600">{selectedDayData.conFallas}</div>
                  <div className="text-slate-500">Con fallas</div>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700">
                    <tr>
                      <th className="text-left py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Hab.</th>
                      <th className="text-left py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Inicio</th>
                      <th className="text-left py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Fin</th>
                      <th className="text-center py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Estado</th>
                      <th className="text-left py-1.5 px-2 font-semibold text-slate-600 dark:text-slate-300">Inspector</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                    {selectedDayData.entries
                      .sort((a, b) => a.roomNumber - b.roomNumber)
                      .map((entry) => {
                        const startDate = entry.startedAt ? new Date(new Date(entry.startedAt).getTime() - 7 * 60 * 60 * 1000) : null;
                        const endDate = entry.finishedAt ? new Date(new Date(entry.finishedAt).getTime() - 7 * 60 * 60 * 1000) : null;
                        const startTime = startDate ? startDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
                        const endTime = endDate ? endDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
                        const statusLabel = entry.status === 'SIN_FALLAS' ? 'OK' : entry.status === 'CON_FALLAS' ? 'Fallas' : entry.status === 'INCOMPLETA' ? 'Incompleta' : 'Pendiente';
                        const statusColor = entry.status === 'SIN_FALLAS' ? 'text-green-700 bg-green-100' : entry.status === 'CON_FALLAS' ? 'text-red-700 bg-red-100' : entry.status === 'INCOMPLETA' ? 'text-amber-700 bg-amber-100' : 'text-slate-600 bg-slate-100';

                        return (
                          <tr key={entry.roomNumber} className="hover:bg-white dark:hover:bg-slate-600/50">
                            <td className="py-1.5 px-2 font-bold text-slate-800 dark:text-slate-100">{entry.roomNumber}</td>
                            <td className="py-1.5 px-2 text-slate-600 dark:text-slate-300">{startTime}</td>
                            <td className="py-1.5 px-2 text-slate-600 dark:text-slate-300">{endTime}</td>
                            <td className="py-1.5 px-2 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-slate-500 dark:text-slate-400 truncate max-w-[80px]">{entry.inspectorName || '—'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedDay && !selectedDayData && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sin inspecciones el dia {selectedDay} de {fullMonths[viewMonth - 1]}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
