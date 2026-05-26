import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionsApi, InspectionCycle, InspectionRoomInCycle } from '../lib/inspections-api';
import { Calendar, Plus, TrendingUp, ClipboardList, AlertCircle, QrCode, CheckCircle, XCircle, Clock, CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import CreateCycleModal from '../components/CreateCycleModal';

export default function Inspecciones() {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<InspectionCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [calendarCycle, setCalendarCycle] = useState<InspectionCycle | null>(null);

  useEffect(() => {
    loadCycles();
  }, []);

  const loadCycles = async () => {
    try {
      const data = await inspectionsApi.getCycles();
      setCycles(data);
    } catch (error) {
      console.error('Error loading cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months[month - 1] || '';
  };

  const groupByYear = (cycles: InspectionCycle[]) => {
    const grouped: Record<number, InspectionCycle[]> = {};
    cycles.forEach(cycle => {
      if (!grouped[cycle.year]) {
        grouped[cycle.year] = [];
      }
      grouped[cycle.year].push(cycle);
    });
    return grouped;
  };

  const groupedCycles = groupByYear(cycles);
  const years = Object.keys(groupedCycles).map(Number).sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HamsterLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-700 to-blue-700 bg-clip-text text-transparent">
            Programa de Inspección 32 Puntos
          </h2>
          <p className="text-sm text-slate-600 mt-1">Inspecciones mensuales de habitaciones</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => navigate('/qr-scanner')}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white px-6 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <QrCode className="w-5 h-5" />
            Escanear QR
          </button>
          <button
            onClick={() => navigate('/inspecciones/pendientes')}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <AlertCircle className="w-5 h-5" />
            Pendientes
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Nuevo Ciclo
          </button>
        </div>
      </div>

      {cycles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-lg">
          <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No hay ciclos creados</h3>
          <p className="text-slate-500 mb-6">Crea tu primer ciclo mensual de inspecciones</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-xl transition-all duration-300 font-medium shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Crear Primer Ciclo
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {years.map(year => (
            <div key={year} className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-cyan-600" />
                <h3 className="text-xl font-bold text-slate-800">{year}</h3>
                <span className="text-sm text-slate-500">
                  {groupedCycles[year].length} ciclo{groupedCycles[year].length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedCycles[year]
                  .sort((a, b) => b.month - a.month)
                  .map(cycle => (
                    <CycleCard
                      key={cycle.id}
                      cycle={cycle}
                      onClick={() => navigate(`/inspecciones/ciclos/${cycle.id}`)}
                      onCalendarClick={() => setCalendarCycle(cycle)}
                      getMonthName={getMonthName}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {calendarCycle && (
        <InspectionCalendarModal
          cycle={calendarCycle}
          onClose={() => setCalendarCycle(null)}
          getMonthName={getMonthName}
        />
      )}

      {showCreateModal && (
        <CreateCycleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadCycles();
          }}
          existingCycles={cycles}
        />
      )}
    </div>
  );
}

interface CycleCardProps {
  cycle: InspectionCycle;
  onClick: () => void;
  onCalendarClick: () => void;
  getMonthName: (month: number) => string;
}

function CycleCard({ cycle, onClick, onCalendarClick, getMonthName }: CycleCardProps) {
  const totalRooms = cycle.totalRooms || 0;
  const roomsSinFallas = cycle.roomsSinFallas || 0;
  const roomsConFallas = cycle.roomsConFallas || 0;
  const roomsIncompletas = cycle.roomsIncompletas || 0;
  const roomsSinInspeccionar = cycle.roomsSinInspeccionar || 0;
  const progress = cycle.porcentajeInspeccionadas || 0;

  const roomsInspected = roomsSinFallas + roomsConFallas;
  const hasStarted = roomsInspected > 0 || roomsIncompletas > 0;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 text-left group shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <button onClick={onClick} className="flex items-center gap-3 text-left flex-1">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {getMonthName(cycle.month).substring(0, 3)}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 group-hover:text-cyan-600 transition-colors">
              {cycle.nombre}
            </h4>
            <p className="text-sm text-slate-500">
              {getMonthName(cycle.month)} {cycle.year}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onCalendarClick}
            className="p-2 rounded-lg hover:bg-cyan-50 text-slate-400 hover:text-cyan-600 transition-colors"
            title="Ver calendario de inspecciones"
          >
            <CalendarDays className="w-5 h-5" />
          </button>
          <TrendingUp className="w-5 h-5 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <button onClick={onClick} className="w-full text-left">
        {hasStarted ? (
          <div className="space-y-3">
            <div className="bg-slate-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">PROGRESO</span>
                <span className="text-lg font-bold text-cyan-600">{progress}%</span>
              </div>
              <div className="bg-white rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-green-50 rounded-lg p-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-green-700">{roomsSinFallas}</div>
                  <div className="text-green-600">Sin fallas</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-red-50 rounded-lg p-2">
                <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-red-700">{roomsConFallas}</div>
                  <div className="text-red-600">Con fallas</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg p-2">
                <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-amber-700">{roomsIncompletas}</div>
                  <div className="text-amber-600">Incompletas</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg p-2">
                <AlertCircle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-slate-700">{roomsSinInspeccionar}</div>
                  <div className="text-slate-600">Pendientes</div>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 pt-1 border-t border-slate-200">
              Total: {totalRooms} habitaciones
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Creado</span>
              <span className="text-slate-700 font-medium">
                {new Date(cycle.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-amber-600 mt-3">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">No iniciado</span>
            </div>
          </div>
        )}
      </button>
    </div>
  );
}

interface RoomDayEntry {
  roomNumber: number;
  status: string;
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

interface InspectionCalendarModalProps {
  cycle: InspectionCycle;
  onClose: () => void;
  getMonthName: (month: number) => string;
}

function InspectionCalendarModal({ cycle, onClose, getMonthName }: InspectionCalendarModalProps) {
  const [rooms, setRooms] = useState<InspectionRoomInCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(cycle.month);
  const [viewYear, setViewYear] = useState(cycle.year);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    loadRooms();
  }, [cycle.id]);

  const loadRooms = async () => {
    try {
      const data = await inspectionsApi.getCycleRooms(cycle.id);
      setRooms(data);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const fullMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const maxInDay = Math.max(1, ...Object.values(dayMap).map(d => d.finished + d.started));

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else { setViewMonth(viewMonth - 1); }
  };

  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else { setViewMonth(viewMonth + 1); }
  };

  const selectedDayData = selectedDay ? dayMap[`${viewYear}-${viewMonth}-${selectedDay}`] : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Calendario de Inspecciones
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {cycle.nombre} - {getMonthName(cycle.month)} {cycle.year}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <HamsterLoader />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Month navigation */}
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

              {/* Calendar grid */}
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

              {/* Legend */}
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

              {/* Selected day detail */}
              {selectedDay && selectedDayData && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3 animate-in fade-in">
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
          )}
        </div>
      </div>
    </div>
  );
}
