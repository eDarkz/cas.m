import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionsApi, InspectionCycle } from '../lib/inspections-api';
import { Calendar, Plus, TrendingUp, ClipboardList, AlertCircle, QrCode, CheckCircle, XCircle, Clock } from 'lucide-react';
import CreateCycleModal from '../components/CreateCycleModal';

export default function Inspecciones() {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<InspectionCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadCycles();
  }, []);

  const loadCycles = async () => {
    try {
      const data = await inspectionsApi.getCycles();
      console.log('Cycles loaded:', data);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
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
        <div className="flex gap-3">
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
                      getMonthName={getMonthName}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
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
  getMonthName: (month: number) => string;
}

function CycleCard({ cycle, onClick, getMonthName }: CycleCardProps) {
  const totalRooms = cycle.totalRooms || 0;
  const roomsSinFallas = cycle.roomsSinFallas || 0;
  const roomsConFallas = cycle.roomsConFallas || 0;
  const roomsIncompletas = cycle.roomsIncompletas || 0;
  const roomsSinInspeccionar = cycle.roomsSinInspeccionar || 0;
  const progress = cycle.porcentajeInspeccionadas || 0;

  const roomsInspected = roomsSinFallas + roomsConFallas;
  const hasStarted = roomsInspected > 0 || roomsIncompletas > 0;

  console.log('CycleCard rendering:', {
    id: cycle.id,
    nombre: cycle.nombre,
    hasStarted,
    totalRooms,
    roomsInspected,
    progress: `${progress}%`,
    data: cycle,
  });

  return (
    <button
      onClick={onClick}
      className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left group shadow-lg"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
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
        </div>
        <TrendingUp className="w-5 h-5 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

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
  );
}
