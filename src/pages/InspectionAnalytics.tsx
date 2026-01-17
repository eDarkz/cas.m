import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { inspectionsApi, InspectionCycle, InspectionRoomInCycle, InspectionIssue } from '../lib/inspections-api';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle, Award, BarChart3, X, Calendar, Users } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';

export default function InspectionAnalytics() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<InspectionCycle | null>(null);
  const [rooms, setRooms] = useState<InspectionRoomInCycle[]>([]);
  const [issues, setIssues] = useState<InspectionIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspector, setSelectedInspector] = useState<string | null>(null);

  useEffect(() => {
    if (cycleId) {
      loadData();
    }
  }, [cycleId]);

  const loadData = async () => {
    if (!cycleId) return;

    try {
      const [cyclesData, roomsData, issuesData] = await Promise.all([
        inspectionsApi.getCycles(),
        inspectionsApi.getCycleRooms(Number(cycleId)),
        inspectionsApi.getIssues({ cycleId: Number(cycleId) }),
      ]);

      const currentCycle = cyclesData.find(c => c.id === Number(cycleId));
      setCycle(currentCycle || null);
      setRooms(roomsData);
      setIssues(issuesData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
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

  const completedRooms = rooms.filter(r => r.status === 'SIN_FALLAS' || r.status === 'CON_FALLAS');
  const roomsWithIssues = rooms.filter(r => r.status === 'CON_FALLAS');

  const averageDuration = completedRooms
    .filter(r => r.startedAt && r.finishedAt)
    .reduce((acc, r) => {
      const duration = (new Date(r.finishedAt!).getTime() - new Date(r.startedAt!).getTime()) / 60000;
      return acc + duration;
    }, 0) / completedRooms.filter(r => r.startedAt && r.finishedAt).length || 0;

  const fastestRoom = completedRooms
    .filter(r => r.startedAt && r.finishedAt)
    .sort((a, b) => {
      const durationA = (new Date(a.finishedAt!).getTime() - new Date(a.startedAt!).getTime());
      const durationB = (new Date(b.finishedAt!).getTime() - new Date(b.startedAt!).getTime());
      return durationA - durationB;
    })[0];

  const slowestRoom = completedRooms
    .filter(r => r.startedAt && r.finishedAt)
    .sort((a, b) => {
      const durationA = (new Date(a.finishedAt!).getTime() - new Date(a.startedAt!).getTime());
      const durationB = (new Date(b.finishedAt!).getTime() - new Date(b.startedAt!).getTime());
      return durationB - durationA;
    })[0];

  const buildingStats = rooms.reduce((acc, room) => {
    const building = Math.floor(room.roomNumber / 1000);
    if (!acc[building]) {
      acc[building] = { total: 0, completed: 0, withIssues: 0, noIssues: 0 };
    }
    acc[building].total++;
    if (room.status === 'SIN_FALLAS') {
      acc[building].completed++;
      acc[building].noIssues++;
    } else if (room.status === 'CON_FALLAS') {
      acc[building].completed++;
      acc[building].withIssues++;
    }
    return acc;
  }, {} as Record<number, { total: number; completed: number; withIssues: number; noIssues: number }>);

  const bestBuilding = Object.entries(buildingStats)
    .sort(([, a], [, b]) => b.noIssues - a.noIssues)[0];

  const worstBuilding = Object.entries(buildingStats)
    .sort(([, a], [, b]) => b.withIssues - a.withIssues)[0];

  const inspectorStats = rooms
    .filter(r => r.inspectorName)
    .reduce((acc, room) => {
      const name = room.inspectorName!;
      if (!acc[name]) {
        acc[name] = { total: 0, withIssues: 0, noIssues: 0, totalTime: 0 };
      }
      acc[name].total++;
      if (room.status === 'CON_FALLAS') acc[name].withIssues++;
      if (room.status === 'SIN_FALLAS') acc[name].noIssues++;
      if (room.startedAt && room.finishedAt) {
        const duration = (new Date(room.finishedAt).getTime() - new Date(room.startedAt).getTime()) / 60000;
        acc[name].totalTime += duration;
      }
      return acc;
    }, {} as Record<string, { total: number; withIssues: number; noIssues: number; totalTime: number }>);

  const topInspectors = Object.entries(inspectorStats)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5);

  const issuesByQuestion = issues.reduce((acc, issue) => {
    if (!acc[issue.questionId]) {
      acc[issue.questionId] = { pregunta: issue.pregunta, count: 0 };
    }
    acc[issue.questionId].count++;
    return acc;
  }, {} as Record<number, { pregunta: string; count: number }>);

  const topIssues = Object.values(issuesByQuestion)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month - 1];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/inspecciones')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-700 to-blue-700 bg-clip-text text-transparent">
            Analítica de Inspecciones
          </h2>
          <p className="text-sm text-slate-600">
            {cycle.nombre} - {getMonthName(cycle.month)} {cycle.year}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Habitaciones Completadas"
          value={completedRooms.length}
          total={rooms.length}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Con Fallas"
          value={roomsWithIssues.length}
          total={completedRooms.length}
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          label="Total de Fallas"
          value={issues.length}
          icon={TrendingDown}
          color="orange"
        />
        <StatCard
          label="Tiempo Promedio"
          value={`${Math.round(averageDuration)} min`}
          icon={Clock}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-gray-800">Mejor Desempeño</h3>
          </div>

          <div className="space-y-4">
            {fastestRoom && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm font-medium text-green-800 mb-1">Inspección Más Rápida</div>
                <div className="text-2xl font-bold text-green-900">
                  Habitación {fastestRoom.roomNumber}
                </div>
                <div className="text-sm text-green-700">
                  {Math.round((new Date(fastestRoom.finishedAt!).getTime() - new Date(fastestRoom.startedAt!).getTime()) / 60000)} minutos
                </div>
              </div>
            )}

            {bestBuilding && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm font-medium text-green-800 mb-1">Edificio con Menos Fallas</div>
                <div className="text-2xl font-bold text-green-900">
                  Edificio {bestBuilding[0]}
                </div>
                <div className="text-sm text-green-700">
                  {bestBuilding[1].noIssues} habitaciones sin fallas
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-bold text-gray-800">Áreas de Mejora</h3>
          </div>

          <div className="space-y-4">
            {slowestRoom && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm font-medium text-red-800 mb-1">Inspección Más Lenta</div>
                <div className="text-2xl font-bold text-red-900">
                  Habitación {slowestRoom.roomNumber}
                </div>
                <div className="text-sm text-red-700">
                  {Math.round((new Date(slowestRoom.finishedAt!).getTime() - new Date(slowestRoom.startedAt!).getTime()) / 60000)} minutos
                </div>
              </div>
            )}

            {worstBuilding && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm font-medium text-red-800 mb-1">Edificio con Más Fallas</div>
                <div className="text-2xl font-bold text-red-900">
                  Edificio {worstBuilding[0]}
                </div>
                <div className="text-sm text-red-700">
                  {worstBuilding[1].withIssues} habitaciones con fallas
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-cyan-600" />
          <h3 className="text-lg font-bold text-gray-800">Ranking de Inspectores</h3>
        </div>

        <div className="space-y-3">
          {topInspectors.map(([name, stats], index) => (
            <button
              key={name}
              onClick={() => setSelectedInspector(name)}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                index === 2 ? 'bg-gradient-to-br from-orange-500 to-orange-700' :
                'bg-gradient-to-br from-gray-200 to-gray-400'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-gray-800">{name}</div>
                <div className="text-sm text-gray-600">
                  {stats.total} inspecciones • {stats.withIssues} con fallas • Promedio: {Math.round(stats.totalTime / stats.total)} min
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-cyan-600" />
          <h3 className="text-lg font-bold text-gray-800">Todos los Inspectores</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">#</th>
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Inspector</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Total</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Completadas</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Con Fallas</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Sin Fallas</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">% Éxito</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Tiempo Prom.</th>
                <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(inspectorStats)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([name, stats], index) => {
                  const completedCount = stats.noIssues + stats.withIssues;
                  const successRate = completedCount > 0 ? Math.round((stats.noIssues / completedCount) * 100) : 0;
                  const avgTime = completedCount > 0 ? Math.round(stats.totalTime / completedCount) : 0;

                  return (
                    <tr
                      key={name}
                      className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-gray-600">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800">{name}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-gray-800">{stats.total}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-blue-600">{completedCount}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-red-600">{stats.withIssues}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-green-600">{stats.noIssues}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-gray-700">{successRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm font-semibold text-gray-700">{avgTime} min</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedInspector(name)}
                          className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-xs font-medium hover:from-cyan-600 hover:to-blue-600 transition-all hover:scale-105"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {Object.keys(inspectorStats).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay inspectores registrados en este ciclo
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-cyan-600" />
          <h3 className="text-lg font-bold text-gray-800">Top 10 Fallas Más Comunes</h3>
        </div>

        <div className="space-y-2">
          {topIssues.map((issue, index) => {
            const maxCount = topIssues[0]?.count || 1;
            const percentage = (issue.count / maxCount) * 100;

            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{issue.pregunta}</span>
                  <span className="font-bold text-red-600">{issue.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-cyan-600" />
          <h3 className="text-lg font-bold text-gray-800">Resumen por Edificio</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(buildingStats)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([building, stats]) => {
              const completionRate = Math.round((stats.completed / stats.total) * 100);
              const failureRate = stats.completed > 0 ? Math.round((stats.withIssues / stats.completed) * 100) : 0;

              return (
                <div key={building} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-4">
                  <div className="text-lg font-bold text-gray-800 mb-3">Edificio {building}</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-bold text-gray-800">{stats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completadas:</span>
                      <span className="font-bold text-blue-600">{stats.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Con fallas:</span>
                      <span className="font-bold text-red-600">{stats.withIssues}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sin fallas:</span>
                      <span className="font-bold text-green-600">{stats.noIssues}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">Avance:</span>
                        <span className="font-bold text-cyan-600">{completionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                    {stats.completed > 0 && (
                      <div className="pt-2">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">Tasa de fallas:</span>
                          <span className="font-bold text-red-600">{failureRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full"
                            style={{ width: `${failureRate}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {selectedInspector && (
        <InspectorDetailModal
          inspectorName={selectedInspector}
          rooms={rooms.filter(r => r.inspectorName === selectedInspector)}
          onClose={() => setSelectedInspector(null)}
        />
      )}
    </div>
  );
}

interface InspectorDetailModalProps {
  inspectorName: string;
  rooms: InspectionRoomInCycle[];
  onClose: () => void;
}

function InspectorDetailModal({ inspectorName, rooms, onClose }: InspectorDetailModalProps) {
  const sortedRooms = [...rooms].sort((a, b) => {
    if (!a.finishedAt) return 1;
    if (!b.finishedAt) return -1;
    return new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime();
  });

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = (room: InspectionRoomInCycle) => {
    if (!room.startedAt || !room.finishedAt) return null;
    const duration = (new Date(room.finishedAt).getTime() - new Date(room.startedAt).getTime()) / 60000;
    return Math.round(duration);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SIN_FALLAS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CON_FALLAS':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PENDIENTE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'EN_PROGRESO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SIN_FALLAS': return 'Sin Fallas';
      case 'CON_FALLAS': return 'Con Fallas';
      case 'PENDIENTE': return 'Pendiente';
      case 'EN_PROGRESO': return 'En Progreso';
      default: return status;
    }
  };

  const completedCount = rooms.filter(r => r.status === 'SIN_FALLAS' || r.status === 'CON_FALLAS').length;
  const withIssuesCount = rooms.filter(r => r.status === 'CON_FALLAS').length;
  const avgDuration = rooms
    .filter(r => r.startedAt && r.finishedAt)
    .reduce((acc, r) => acc + getDuration(r)!, 0) / completedCount || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white drop-shadow-md">
              {inspectorName}
            </h3>
            <p className="text-sm text-cyan-100">
              {rooms.length} habitación{rooms.length !== 1 ? 'es' : ''} inspeccionada{rooms.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-cyan-100 transition-colors hover:scale-110 duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4 bg-gradient-to-br from-cyan-50 to-blue-50 border-b border-cyan-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-cyan-200">
              <div className="text-xs text-gray-600 mb-1">Completadas</div>
              <div className="text-2xl font-bold text-cyan-700">{completedCount}</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border border-cyan-200">
              <div className="text-xs text-gray-600 mb-1">Con Fallas</div>
              <div className="text-2xl font-bold text-red-600">{withIssuesCount}</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border border-cyan-200">
              <div className="text-xs text-gray-600 mb-1">Tiempo Promedio</div>
              <div className="text-2xl font-bold text-blue-700">{Math.round(avgDuration)} min</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {sortedRooms.map((room) => {
              const duration = getDuration(room);

              return (
                <div
                  key={room.id}
                  className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl font-bold text-gray-800">
                          Habitación {room.roomNumber}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(room.status)}`}>
                          {getStatusLabel(room.status)}
                        </span>
                      </div>

                      {room.finishedAt && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDateTime(room.finishedAt)}</span>
                        </div>
                      )}

                      {duration !== null && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Duración: <strong>{duration} minutos</strong></span>
                        </div>
                      )}

                      {!room.finishedAt && room.startedAt && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Clock className="w-4 h-4 animate-pulse" />
                          <span>En progreso desde {formatDateTime(room.startedAt)}</span>
                        </div>
                      )}

                      {!room.startedAt && (
                        <div className="text-sm text-gray-400">
                          No iniciada
                        </div>
                      )}
                    </div>

                    {duration !== null && (
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">{duration}</div>
                        <div className="text-xs text-gray-500">minutos</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  total?: number;
  icon: React.ElementType;
  color: 'green' | 'red' | 'orange' | 'blue';
}

function StatCard({ label, value, total, icon: Icon, color }: StatCardProps) {
  const colors = {
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    orange: 'from-orange-500 to-orange-600',
    blue: 'from-blue-500 to-blue-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colors[color]} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
      <div className="text-3xl font-bold text-gray-800">
        {value}
        {total !== undefined && <span className="text-lg text-gray-500">/{total}</span>}
      </div>
    </div>
  );
}
