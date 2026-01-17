import { useState } from 'react';
import { api, Note, Supervisor } from '../lib/api';
import { Plus, User, FileText, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TaskCard from '../components/TaskCard';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import ExportReportModal, { ExportFilters } from '../components/ExportReportModal';
import { generatePrintableReport } from '../components/PrintableNotesReport';

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // --- ESTADOS DE INTERFAZ (UI) ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');
  const [filter, setFilter] = useState({
    supervisorId: undefined as number | undefined,
    search: '',
  });

  // --- GESTIÓN DE DATOS CON REACT QUERY ---

  // 1. Obtener Notas (Caché automática)
  const { data: notes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.getNotes(),
  });

  // 2. Obtener Supervisores (Caché automática)
  const { data: allSupervisorsData = [] } = useQuery({
    queryKey: ['supervisors'],
    queryFn: () => api.getSupervisors(),
  });

  // 3. Mutación para cambiar estado (Optimista o con invalidación)
  const changeStateMutation = useMutation({
    mutationFn: ({ noteId, newState }: { noteId: string; newState: 0 | 1 | 2 }) => 
      api.changeNoteState(noteId, newState),
    onSuccess: () => {
      // Recarga las notas automáticamente sin refrescar la página
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error) => {
      console.error('Error al cambiar estado:', error);
      alert('Hubo un error al actualizar la tarea. Intente nuevamente.');
    }
  });

  // --- LÓGICA DERIVADA ---
  const supervisors = allSupervisorsData.filter(s => s.kind === 'SUPERVISOR');
  const projects = allSupervisorsData.filter(s => s.kind === 'PROYECTO');
  const loading = loadingNotes; // Mantener compatibilidad visual

  const handleStateChange = (noteId: string, newState: 0 | 1 | 2) => {
    changeStateMutation.mutate({ noteId, newState });
  };

  // Lógica de filtrado
  const filteredNotes = notes.filter((note) => {
    if (filter.supervisorId && note.supervisor_id !== filter.supervisorId) return false;
    if (
      filter.search &&
      !note.titulo.toLowerCase().includes(filter.search.toLowerCase()) &&
      !note.actividades.toLowerCase().includes(filter.search.toLowerCase())
    )
      return false;
    return true;
  });

  const pendingNotes = filteredNotes.filter((n) => n.estado === 0);
  const inProgressNotes = filteredNotes.filter((n) => n.estado === 1);
  const completedNotes = filteredNotes.filter((n) => n.estado === 2);

  // Función auxiliar para exportar (Mantiene lógica original)
  const filterNotesByDateAndState = (allNotes: Note[], filters: ExportFilters): Note[] => {
    let filtered = allNotes;
    const states: number[] = [];
    if (filters.includePending) states.push(0);
    if (filters.includeInProgress) states.push(1);
    if (filters.includeCompleted) states.push(2);
    filtered = filtered.filter((note) => states.includes(note.estado));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filters.dateRange) {
      case 'today':
        filtered = filtered.filter((note) => {
          const noteDate = new Date(note.fecha);
          noteDate.setHours(0, 0, 0, 0);
          return noteDate.getTime() === today.getTime();
        });
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter((note) => {
          const noteDate = new Date(note.fecha);
          return noteDate >= weekAgo;
        });
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter((note) => {
          const noteDate = new Date(note.fecha);
          return noteDate >= monthAgo;
        });
        break;
      case 'custom':
        if (filters.customStartDate && filters.customEndDate) {
          const startDate = new Date(filters.customStartDate);
          const endDate = new Date(filters.customEndDate);
          endDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter((note) => {
            const noteDate = new Date(note.fecha);
            return noteDate >= startDate && noteDate <= endDate;
          });
        }
        break;
      default: break;
    }
    return filtered;
  };

  const handleExport = async (filters: ExportFilters) => {
    const filtered = filterNotesByDateAndState(filteredNotes, filters);
    const totalNotes = filtered.length;

    if (totalNotes === 0) {
      alert('No hay notas que cumplan con los filtros seleccionados');
      return;
    }

    setExportLoading(true);
    setExportProgress(0);
    setExportMessage(`Preparando ${totalNotes} ${totalNotes === 1 ? 'nota' : 'notas'}...`);

    try {
      const notesWithDetails: Note[] = [];

      for (let i = 0; i < filtered.length; i++) {
        const note = filtered[i];
        const progress = ((i + 1) / totalNotes) * 100;

        setExportProgress(progress);
        setExportMessage(`Cargando nota ${i + 1} de ${totalNotes}...`);

        try {
          const fullNote = await api.getNoteById(note.id);
          notesWithDetails.push(fullNote);
        } catch (error) {
          console.error('Error loading details for note:', note.id, error);
          notesWithDetails.push(note);
        }
      }

      setExportMessage('Generando reporte...');

      const getDateRangeText = () => {
        switch (filters.dateRange) {
          case 'today': return 'Hoy';
          case 'week': return 'Última semana';
          case 'month': return 'Último mes';
          case 'custom':
            return `${filters.customStartDate} - ${filters.customEndDate}`;
          default: return 'Todas las fechas';
        }
      };

      const getStatesText = () => {
        const states = [];
        if (filters.includePending) states.push('Pendientes');
        if (filters.includeInProgress) states.push('En Progreso');
        if (filters.includeCompleted) states.push('Completadas');
        return states.join(', ');
      };

      generatePrintableReport(notesWithDetails, [...supervisors, ...projects], {
        dateRange: getDateRangeText(),
        states: getStatesText().split(', ')
      });

      setExportLoading(false);
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      setExportLoading(false);
      alert('Error al cargar los detalles de las notas');
    }
  };

  const standaloneUrl = filter.supervisorId
    ? `/supervisor/${filter.supervisorId}`
    : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HamsterLoader />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-full hover:shadow-2xl hover:scale-110 transition-all duration-300 font-medium shadow-xl"
        >
          <Plus className="w-6 h-6 drop-shadow-md" />
          <span className="font-semibold">Nueva Tarea</span>
        </button>
      </div>

      <div className="w-full lg:w-64 space-y-2 lg:space-y-3">
        <div className="lg:hidden mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Filtrar por supervisor</label>
          <select
            value={filter.supervisorId || ''}
            onChange={(e) => setFilter({ ...filter, supervisorId: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white"
          >
            <option value="">Todos ({notes.length} tareas)</option>
            <optgroup label="Supervisores">
              {supervisors.map((supervisor) => {
                const supervisorNotes = notes.filter((n) => n.supervisor_id === supervisor.id);
                const pendingAndInProgress = supervisorNotes.filter((n) => n.estado === 0 || n.estado === 1).length;
                return (
                  <option key={supervisor.id} value={supervisor.id}>
                    {supervisor.alias || supervisor.nombre} ({pendingAndInProgress} activas)
                  </option>
                );
              })}
            </optgroup>
            <optgroup label="Proyectos">
              {projects.map((project) => {
                const projectNotes = notes.filter((n) => n.supervisor_id === project.id);
                const pendingAndInProgress = projectNotes.filter((n) => n.estado === 0 || n.estado === 1).length;
                return (
                  <option key={project.id} value={project.id}>
                    {project.alias || project.nombre} ({pendingAndInProgress} activas)
                  </option>
                );
              })}
            </optgroup>
          </select>
        </div>

        <button
          onClick={() => setFilter({ ...filter, supervisorId: undefined })}
          className="hidden lg:flex w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-left transition-all duration-300 bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] mb-4"
        >
          <div className="flex items-center gap-2">
            <User className="w-4 lg:w-5 h-4 lg:h-5 drop-shadow-md" />
            <span className="text-sm lg:text-base font-medium">Todos</span>
          </div>
          <div className="text-xs lg:text-sm mt-1 opacity-90">
            {notes.length} tareas
          </div>
        </button>

        <h3 className="hidden lg:block text-base lg:text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2 lg:mb-3">Supervisores</h3>

        <div className="hidden lg:block space-y-2 lg:space-y-3">
          {!filter.supervisorId ? (
            <>
              {supervisors.map((supervisor) => {
                const supervisorNotes = notes.filter((n) => n.supervisor_id === supervisor.id);
                const pendingAndInProgress = supervisorNotes.filter((n) => n.estado === 0 || n.estado === 1).length;

                return (
                  <button
                    key={supervisor.id}
                    onClick={() => setFilter({ ...filter, supervisorId: supervisor.id })}
                    className="w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-left transition-all duration-300 bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:scale-[1.02] shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 lg:w-5 h-4 lg:h-5" />
                      <span className="text-sm lg:text-base font-medium truncate">{supervisor.alias || supervisor.nombre}</span>
                    </div>
                    <div className="text-xs lg:text-sm mt-1 opacity-90">
                      {pendingAndInProgress} tareas activas
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            <>
              {supervisors.map((supervisor) => {
                const isSelected = filter.supervisorId === supervisor.id;

                return (
                  <button
                    key={supervisor.id}
                    onClick={() => setFilter({ ...filter, supervisorId: supervisor.id })}
                    className={`w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-left transition-all duration-300 ${
                      isSelected
                        ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg hover:shadow-xl'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:scale-[1.02] shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 lg:w-5 h-4 lg:h-5" />
                      <span className="text-sm lg:text-base font-medium truncate">{supervisor.alias || supervisor.nombre}</span>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <h3 className="hidden lg:block text-base lg:text-lg font-semibold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-2 lg:mb-3 mt-6">Proyectos</h3>

        <div className="hidden lg:block space-y-2 lg:space-y-3">
          {!filter.supervisorId ? (
            <>
              {projects.map((project) => {
                const projectNotes = notes.filter((n) => n.supervisor_id === project.id);
                const pendingAndInProgress = projectNotes.filter((n) => n.estado === 0 || n.estado === 1).length;

                return (
                  <button
                    key={project.id}
                    onClick={() => setFilter({ ...filter, supervisorId: project.id })}
                    className="w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-left transition-all duration-300 bg-white text-slate-700 border border-orange-200 hover:border-orange-400 hover:shadow-lg hover:scale-[1.02] shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 lg:w-5 h-4 lg:h-5 text-orange-600" />
                      <span className="text-sm lg:text-base font-medium truncate">{project.alias || project.nombre}</span>
                    </div>
                    <div className="text-xs lg:text-sm mt-1 opacity-90">
                      {pendingAndInProgress} tareas activas
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            <>
              {projects.map((project) => {
                const isSelected = filter.supervisorId === project.id;

                return (
                  <button
                    key={project.id}
                    onClick={() => setFilter({ ...filter, supervisorId: project.id })}
                    className={`w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-left transition-all duration-300 ${
                      isSelected
                        ? 'bg-gradient-to-br from-orange-600 to-amber-600 text-white shadow-lg hover:shadow-xl'
                        : 'bg-white text-slate-700 border border-orange-200 hover:border-orange-400 hover:shadow-lg hover:scale-[1.02] shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 lg:w-5 h-4 lg:h-5" />
                      <span className="text-sm lg:text-base font-medium truncate">{project.alias || project.nombre}</span>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {filter.supervisorId && (() => {
          const selectedSupervisor = supervisors.find(s => s.id === filter.supervisorId);
          const selectedProject = projects.find(p => p.id === filter.supervisorId);
          const supervisorNotes = notes.filter((n) => n.supervisor_id === filter.supervisorId);
          const pending = supervisorNotes.filter((n) => n.estado === 0).length;
          const inProgress = supervisorNotes.filter((n) => n.estado === 1).length;
          const completed = supervisorNotes.filter((n) => n.estado === 2).length;
          const total = supervisorNotes.length;
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-3 lg:p-4 shadow-lg">
              <h3 className={`text-base lg:text-lg font-bold bg-gradient-to-r ${selectedProject ? 'from-orange-600 to-amber-600' : 'from-blue-600 to-cyan-600'} bg-clip-text text-transparent mb-2 lg:mb-3`}>
                {selectedSupervisor?.nombre || selectedProject?.nombre}
                <span className="ml-4 text-base lg:text-lg font-bold inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {selectedSupervisor?.role || selectedProject?.role}
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
                <div className="relative overflow-hidden rounded-xl p-3 backdrop-blur-xl bg-white/60 border border-orange-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 to-orange-200/30" />
                  <div className="relative">
                    <div className="text-xl lg:text-2xl font-bold text-orange-700">{pending}</div>
                    <div className="text-xs text-orange-600 font-medium">Pendientes</div>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl p-3 backdrop-blur-xl bg-white/60 border border-cyan-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/50 to-cyan-200/30" />
                  <div className="relative">
                    <div className="text-xl lg:text-2xl font-bold text-cyan-700">{inProgress}</div>
                    <div className="text-xs text-cyan-600 font-medium">En Proceso</div>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl p-3 backdrop-blur-xl bg-white/60 border border-blue-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-blue-200/30" />
                  <div className="relative">
                    <div className="text-xl lg:text-2xl font-bold text-blue-700">{completed}</div>
                    <div className="text-xs text-blue-600 font-medium">Terminadas</div>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl p-3 backdrop-blur-xl bg-white/60 border border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-slate-200/30" />
                  <div className="relative">
                    <div className="text-xl lg:text-2xl font-bold text-slate-800">{progress}%</div>
                    <div className="text-xs text-slate-600 font-medium">Avance</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
          <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">Tablero de Tareas</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            {standaloneUrl ? (
              <a
                href={standaloneUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 to-stone-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
              >
                <FileText className="w-5 h-5 drop-shadow-md" />
                <span className="hidden sm:inline">Abrir Vista Independiente</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gray-300 text-gray-600 px-4 py-2.5 rounded-lg cursor-not-allowed font-medium shadow-lg"
                title="Selecciona un supervisor o proyecto para abrir la vista stand-alone"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden sm:inline">Abrir Vista Independiente</span>
              </button>
            )}

            <button
              onClick={() => setShowExportModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
            >
              <FileText className="w-5 h-5 drop-shadow-md" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="hidden lg:flex flex-1 sm:flex-initial items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
            >
              <Plus className="w-5 h-5 drop-shadow-md" />
              Nueva Tarea
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar tareas por título, actividades o comentarios..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-shadow text-sm lg:text-base"
          />
          {filter.search && (
            <button
              onClick={() => setFilter({ ...filter, search: '' })}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <TaskColumn
            title="Pendientes"
            color="yellow"
            count={pendingNotes.length}
            notes={pendingNotes}
            onStateChange={handleStateChange}
            onViewDetails={(noteId) => setSelectedNoteId(noteId)}
          />
          <TaskColumn
            title="En Proceso"
            color="blue"
            count={inProgressNotes.length}
            notes={inProgressNotes}
            onStateChange={handleStateChange}
            onViewDetails={(noteId) => setSelectedNoteId(noteId)}
          />
          <TaskColumn
            title="Terminadas"
            color="green"
            count={completedNotes.length}
            notes={completedNotes}
            onStateChange={handleStateChange}
            onViewDetails={(noteId) => setSelectedNoteId(noteId)}
          />
        </div>

        {showCreateModal && (
          <CreateTaskModal
            supervisors={[...supervisors, ...projects]}
            defaultSupervisorId={filter.supervisorId}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['notes'] })}
          />
        )}

        {selectedNoteId && (
          <TaskDetailsModal
            noteId={selectedNoteId}
            supervisors={[...supervisors, ...projects]}
            onClose={() => setSelectedNoteId(null)}
            onStateChange={handleStateChange}
          />
        )}

        {showExportModal && (
          <ExportReportModal
            onClose={() => {
              if (!exportLoading) {
                setShowExportModal(false);
              }
            }}
            onExport={handleExport}
            isLoading={exportLoading}
            loadingProgress={exportProgress}
            loadingMessage={exportMessage}
          />
        )}
      </div>
    </div>
  );
}

interface TaskColumnProps {
  title: string;
  color: 'yellow' | 'blue' | 'green';
  count: number;
  notes: Note[];
  onStateChange: (noteId: string, newState: 0 | 1 | 2) => void;
  onViewDetails: (noteId: string) => void;
}

function TaskColumn({ title, color, count, notes, onStateChange, onViewDetails }: TaskColumnProps) {
  const [draggedOver, setDraggedOver] = useState(false);
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const glassStyles = {
    yellow: {
      background: 'rgba(255, 255, 255, 0.13)',
      border: '1px solid rgba(251, 146, 60, 0.3)',
      gradient: 'from-orange-100/50 to-orange-200/30'
    },
    blue: {
      background: 'rgba(255, 255, 255, 0.13)',
      border: '1px solid rgba(34, 211, 238, 0.3)',
      gradient: 'from-cyan-100/50 to-cyan-200/30'
    },
    green: {
      background: 'rgba(255, 255, 255, 0.13)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      gradient: 'from-blue-100/50 to-blue-200/30'
    }
  };

  const headerColors = {
    yellow: 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md',
    blue: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md',
    green: 'bg-gradient-to-r from-blue-600 to-cyan-700 text-white shadow-md',
  };

  const getStateFromColumn = (columnTitle: string): 0 | 1 | 2 => {
    if (columnTitle === 'Pendientes') return 0;
    if (columnTitle === 'En Proceso') return 1;
    return 2;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(true);
    const noteData = e.dataTransfer.getData('noteData');
    if (noteData && !draggedNote) {
      try {
        setDraggedNote(JSON.parse(noteData));
      } catch (err) {
        console.error('Error parsing note data:', err);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isOutside = e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom;
    if (isOutside) {
      setDraggedOver(false);
      setDraggedNote(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(false);
    setDraggedNote(null);
    const noteId = e.dataTransfer.getData('noteId');
    const newState = getStateFromColumn(title);
    if (noteId) {
      onStateChange(noteId, newState);
    }
  };

  const totalPages = Math.ceil(notes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotes = notes.slice(startIndex, endIndex);

  const style = glassStyles[color];

  return (
    <div
      className={`relative overflow-hidden rounded-xl min-h-[300px] lg:min-h-[400px] transition-all duration-300 flex flex-col shadow-lg hover:shadow-xl ${
        draggedOver ? 'ring-4 ring-blue-500 ring-opacity-60 scale-[1.03] shadow-2xl' : ''
      }`}
      style={{
        background: style.background,
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        border: style.border,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`} />
      <div className={`relative px-3 lg:px-4 py-2 lg:py-3 rounded-t-xl ${headerColors[color]} flex items-center justify-between`}>
        <h3 className="font-semibold text-base lg:text-lg">{title}</h3>
        <span className="text-xs lg:text-sm font-medium bg-white bg-opacity-30 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
          {count}
        </span>
      </div>
      <div className="relative p-2 lg:p-4 space-y-2 flex-1">
        {draggedOver && draggedNote && (
          <div className="mb-2 opacity-70 scale-[0.98] transition-all duration-200">
            <div className="rounded-lg border-2 border-dashed border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 p-2.5 lg:p-3 shadow-lg animate-pulse">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-xs lg:text-sm text-slate-800 line-clamp-2 flex-1">
                  {draggedNote.titulo}
                </h4>
                {draggedNote.cristal && (
                  <span className="text-[10px] lg:text-xs bg-gradient-to-r from-red-600 to-rose-600 text-white px-1.5 lg:px-2 py-0.5 rounded-full font-medium shadow-md flex-shrink-0">
                    URGENTE
                  </span>
                )}
              </div>
              <p className="text-[11px] lg:text-xs text-slate-600 mt-1 line-clamp-2">
                {draggedNote.actividades}
              </p>
              {draggedNote.supervisor_nombre && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-500">
                  <User className="w-3 h-3" />
                  <span>{draggedNote.supervisor_nombre}</span>
                </div>
              )}
            </div>
          </div>
        )}
        {notes.length === 0 && !draggedOver ? (
          <p className="text-gray-400 text-center py-6 lg:py-8 text-xs lg:text-sm">No hay tareas</p>
        ) : (
          paginatedNotes.map((note) => (
            <DraggableTaskCard
              key={note.id}
              note={note}
              onStateChange={onStateChange}
              onViewDetails={onViewDetails}
            />
          ))
        )}
      </div>
      {totalPages > 1 && (
        <div className="relative px-2 lg:px-4 pb-2 lg:pb-4 flex items-center justify-between border-t border-gray-200 pt-2 lg:pt-3">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="text-xs px-2 lg:px-3 py-1.5 bg-white text-gray-700 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-xs text-gray-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="text-xs px-2 lg:px-3 py-1.5 bg-white text-gray-700 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

interface DraggableTaskCardProps {
  note: Note;
  onStateChange: (noteId: string, newState: 0 | 1 | 2) => void;
  onViewDetails: (noteId: string) => void;
}

function DraggableTaskCard({ note, onStateChange, onViewDetails }: DraggableTaskCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('noteId', note.id);
    e.dataTransfer.setData('noteData', JSON.stringify({
      id: note.id,
      titulo: note.titulo,
      actividades: note.actividades,
      fecha: note.fecha,
      cristal: note.cristal,
      supervisor_nombre: note.supervisor_nombre,
    }));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <TaskCard
        note={note}
        onStateChange={onStateChange}
        onViewDetails={onViewDetails}
        isDragging={isDragging}
      />
    </div>
  );
}