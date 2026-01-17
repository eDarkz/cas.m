import { useEffect, useState } from 'react';
import { inspectionsApi, InspectionIssue, IssueStatus, InspectionCycle } from '../lib/inspections-api';
import { AlertCircle, CheckCircle, Filter, Search, X, Printer } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import PrintableIssuesReport from '../components/PrintableIssuesReport';

export default function InspectionIssues() {
  const [issues, setIssues] = useState<InspectionIssue[]>([]);
  const [cycles, setCycles] = useState<InspectionCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('PENDIENTE');
  const [cycleFilter, setCycleFilter] = useState<number | 'all'>('all');
  const [roomSearch, setRoomSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<InspectionIssue | null>(null);
  const [groupByRoom, setGroupByRoom] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, cycleFilter, roomSearch]);

  const loadData = async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (cycleFilter !== 'all') params.cycleId = cycleFilter;
      if (roomSearch) params.roomNumber = Number(roomSearch);

      const [issuesData, cyclesData] = await Promise.all([
        inspectionsApi.getIssues(params),
        inspectionsApi.getCycles(),
      ]);

      setIssues(issuesData);
      setCycles(cyclesData);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIssue = async (issue: InspectionIssue) => {
    const resolvedBy = prompt('¿Quién resolvió este pendiente?');
    if (!resolvedBy) return;

    const resolutionComment = prompt('Comentario de resolución (opcional):');

    try {
      await inspectionsApi.updateIssue(issue.id, {
        status: 'RESUELTO',
        resolvedBy,
        resolutionComment: resolutionComment || undefined,
      });
      await loadData();
      setSelectedIssue(null);
    } catch (error) {
      console.error('Error resolving issue:', error);
      alert('Error al resolver el pendiente');
    }
  };

  const handleReopenIssue = async (issue: InspectionIssue) => {
    const resolvedBy = prompt('¿Quién reabre este pendiente?');
    if (!resolvedBy) return;

    const resolutionComment = prompt('Razón de reapertura:');

    try {
      await inspectionsApi.updateIssue(issue.id, {
        status: 'PENDIENTE',
        resolvedBy,
        resolutionComment: resolutionComment || undefined,
      });
      await loadData();
      setSelectedIssue(null);
    } catch (error) {
      console.error('Error reopening issue:', error);
      alert('Error al reabrir el pendiente');
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months[month - 1];
  };

  const summary = {
    total: issues.length,
    pendiente: issues.filter(i => i.status === 'PENDIENTE').length,
    resuelto: issues.filter(i => i.status === 'RESUELTO').length,
  };

  const groupedIssues = groupByRoom
    ? issues.reduce((acc, issue) => {
        const key = issue.roomNumber;
        if (!acc[key]) acc[key] = [];
        acc[key].push(issue);
        return acc;
      }, {} as Record<number, InspectionIssue[]>)
    : null;

  const roomNumbers = groupedIssues ? Object.keys(groupedIssues).map(Number).sort((a, b) => a - b) : [];

  const handlePrint = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const getReportTitle = () => {
    let title = 'REPORTE DE PENDIENTES';
    const parts: string[] = [];

    if (statusFilter !== 'all') {
      parts.push(statusFilter === 'PENDIENTE' ? 'Pendientes' : 'Resueltos');
    }

    if (cycleFilter !== 'all') {
      const cycle = cycles.find(c => c.id === cycleFilter);
      if (cycle) {
        const monthName = getMonthName(cycle.month);
        parts.push(`${cycle.nombre} (${monthName} ${cycle.year})`);
      }
    }

    if (roomSearch) {
      parts.push(`Habitación ${roomSearch}`);
    }

    if (parts.length > 0) {
      title += ' - ' + parts.join(' - ');
    }

    return title;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HamsterLoader />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-700 to-blue-700 bg-clip-text text-transparent">
            Gestión de Pendientes
          </h2>
          <p className="text-sm text-slate-600 mt-1">Fallas detectadas en inspecciones</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 shadow-lg">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
          </div>
          <div className="text-sm text-gray-600">Total de Issues</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{summary.pendiente}</div>
          </div>
          <div className="text-sm text-gray-600">Pendientes</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{summary.resuelto}</div>
          </div>
          <div className="text-sm text-gray-600">Resueltos</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número de habitación..."
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            <option value="all">Todos los ciclos</option>
            {cycles.map(cycle => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.nombre} ({getMonthName(cycle.month)} {cycle.year})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({summary.total})
            </button>
            <button
              onClick={() => setStatusFilter('PENDIENTE')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === 'PENDIENTE'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes ({summary.pendiente})
            </button>
            <button
              onClick={() => setStatusFilter('RESUELTO')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === 'RESUELTO'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Resueltos ({summary.resuelto})
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition">
              <input
                type="checkbox"
                checked={groupByRoom}
                onChange={(e) => setGroupByRoom(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-blue-900">Agrupar por habitación</span>
            </label>

            {issues.length > 0 && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Reporte</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-lg">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay pendientes</h3>
          <p className="text-gray-500">No se encontraron pendientes con los filtros seleccionados</p>
        </div>
      ) : groupByRoom && groupedIssues ? (
        <div className="space-y-6">
          {roomNumbers.map(roomNumber => {
            const roomIssues = groupedIssues[roomNumber];
            const pendingCount = roomIssues.filter(i => i.status === 'PENDIENTE').length;

            return (
              <div key={roomNumber} className="bg-white rounded-xl border-2 border-gray-300 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">
                      Habitación {roomNumber}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white">
                        {roomIssues.length} issue{roomIssues.length !== 1 ? 's' : ''}
                      </span>
                      {pendingCount > 0 && (
                        <span className="px-3 py-1 bg-red-500 rounded-full text-sm font-bold text-white">
                          {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {roomIssues.map(issue => (
                    <button
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className="w-full p-6 hover:bg-gray-50 transition-all text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              issue.status === 'PENDIENTE'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {issue.status}
                            </span>
                            <span className="text-sm text-gray-500">
                              {getMonthName(issue.month)} {issue.year}
                            </span>
                          </div>

                          <h4 className="font-semibold text-gray-800 mb-1">{issue.pregunta}</h4>
                          <p className="text-sm text-gray-600 mb-2">{issue.problema}</p>

                          {issue.comment && (
                            <p className="text-sm text-gray-700 bg-gray-100 rounded-lg p-3 mb-2">
                              {issue.comment}
                            </p>
                          )}

                          <div className="text-xs text-gray-500">
                            Creado: {new Date(issue.createdAt).toLocaleString('es-MX')}
                            {issue.inspectorName && (
                              <span className="ml-2">
                                • Inspector: <span className="font-medium text-gray-700">{issue.inspectorName}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {issue.photoMainUrl && (
                          <img
                            src={issue.photoMainUrl}
                            alt="Foto del problema"
                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                          />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map(issue => (
            <button
              key={issue.id}
              onClick={() => setSelectedIssue(issue)}
              className="w-full bg-white rounded-xl border border-gray-200 p-6 hover:shadow-2xl transition-all text-left shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-bold text-gray-800">
                      Habitación {issue.roomNumber}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      issue.status === 'PENDIENTE'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {issue.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {getMonthName(issue.month)} {issue.year}
                    </span>
                  </div>

                  <h4 className="font-semibold text-gray-800 mb-1">{issue.pregunta}</h4>
                  <p className="text-sm text-gray-600 mb-2">{issue.problema}</p>

                  {issue.comment && (
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 mb-2">
                      {issue.comment}
                    </p>
                  )}

                  <div className="text-xs text-gray-500">
                    Creado: {new Date(issue.createdAt).toLocaleString('es-MX')}
                    {issue.inspectorName && (
                      <span className="ml-2">
                        • Inspector: <span className="font-medium text-gray-700">{issue.inspectorName}</span>
                      </span>
                    )}
                  </div>
                </div>

                {issue.photoMainUrl && (
                  <img
                    src={issue.photoMainUrl}
                    alt="Foto del problema"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedIssue && (
        <IssueDetailModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onResolve={handleResolveIssue}
          onReopen={handleReopenIssue}
        />
      )}
      </div>

      {showPrintPreview && (
        <div className="hidden print:block">
          <PrintableIssuesReport
            issues={issues}
            title={getReportTitle()}
          />
        </div>
      )}
    </>
  );
}

interface IssueDetailModalProps {
  issue: InspectionIssue;
  onClose: () => void;
  onResolve: (issue: InspectionIssue) => void;
  onReopen: (issue: InspectionIssue) => void;
}

function IssueDetailModal({ issue, onClose, onResolve, onReopen }: IssueDetailModalProps) {
  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month - 1];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-xl font-bold text-white">
            Detalle del Pendiente - Habitación {issue.roomNumber}
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-cyan-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                issue.status === 'PENDIENTE'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {issue.status}
              </span>
              <span className="text-gray-600">
                {getMonthName(issue.month)} {issue.year}
              </span>
            </div>

            <h4 className="font-bold text-gray-800 text-lg mb-2">{issue.pregunta}</h4>
            <p className="text-gray-600 mb-4">{issue.problema}</p>

            {issue.comment && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Comentario:</p>
                <p className="text-gray-800">{issue.comment}</p>
              </div>
            )}

            {issue.photoMainUrl && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Foto:</p>
                <img
                  src={issue.photoMainUrl}
                  alt="Foto del problema"
                  className="w-full rounded-lg border-2 border-gray-300"
                />
              </div>
            )}

            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Creado:</span> {new Date(issue.createdAt).toLocaleString('es-MX')}</p>
              {issue.resolvedAt && (
                <p><span className="font-medium">Resuelto:</span> {new Date(issue.resolvedAt).toLocaleString('es-MX')}</p>
              )}
              {issue.resolvedBy && (
                <p><span className="font-medium">Resuelto por:</span> {issue.resolvedBy}</p>
              )}
              {issue.resolutionComment && (
                <div className="mt-3 bg-green-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800 mb-1">Comentario de resolución:</p>
                  <p className="text-green-900">{issue.resolutionComment}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            {issue.status === 'PENDIENTE' ? (
              <button
                onClick={() => onResolve(issue)}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-xl transition-all font-medium shadow-lg"
              >
                Marcar como Resuelto
              </button>
            ) : (
              <button
                onClick={() => onReopen(issue)}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:shadow-xl transition-all font-medium shadow-lg"
              >
                Reabrir Pendiente
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
