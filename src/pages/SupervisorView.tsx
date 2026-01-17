import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Note, Supervisor } from '../lib/api';
import { workingOrdersAPI, WorkingOrderStatus } from '../lib/workingOrders';
import { FileText, Search, Plus, Filter, Calendar, SortAsc, SortDesc, X } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import TaskCard from '../components/TaskCard';
import TaskDetailsModal from '../components/TaskDetailsModal';
import ExportReportModal, { ExportFilters } from '../components/ExportReportModal';
import CreateTaskModal from '../components/CreateTaskModal';

export default function SupervisorView() {
  const { supervisorId } = useParams<{ supervisorId: string }>();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [supervisorName, setSupervisorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<{ pending: boolean; inProgress: boolean; completed: boolean }>({
    pending: true,
    inProgress: true,
    completed: true,
  });
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'title-asc' | 'title-desc'>('date-desc');

  useEffect(() => {
    if (!supervisorId) {
      navigate('/');
      return;
    }
    loadData();
  }, [supervisorId]);

  const loadData = async () => {
    try {
      const [allNotes, supervisorsData] = await Promise.all([
        api.getNotes(),
        api.getSupervisors(),
      ]);

      setSupervisors(supervisorsData);

      const supervisor = supervisorsData.find(s => s.id === parseInt(supervisorId!));
      if (supervisor) {
        setSupervisorName(supervisor.alias || supervisor.nombre);
      }

      const filteredNotes = allNotes.filter(
        (n) => n.supervisor_id === parseInt(supervisorId!)
      );
      setNotes(filteredNotes);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleStateChange = async (noteId: string, newState: 0 | 1 | 2) => {
    try {
      await api.changeNoteState(noteId,  newState );
      await loadData();

      // Actualizar el Working Order asociado si existe
      await updateAssociatedWorkingOrder(noteId, newState);

      await loadData();
    } catch (error) {
      console.error('Error updating note state:', error);
      alert('Error al actualizar el estado de la tarea');
    }
  };

  const updateAssociatedWorkingOrder = async (noteId: string, noteState: 0 | 1 | 2) => {
    try {
      console.log('🔄 Sincronizando nota', noteId, 'con estado:', noteState);

      // Buscar WO asociado a esta nota
      const response = await workingOrdersAPI.list({ pageSize: 100 });
      const associatedWO = response.data.find(wo => wo.note_id === noteId);

      if (!associatedWO) {
        console.log('ℹ️ Esta nota no tiene WO asociado');
        return;
      }

      console.log('✅ WO encontrado:', associatedWO.id, '- Sincronizando...');

      // Usar el webhook del backend para sincronización automática
      await workingOrdersAPI.syncNoteStatus(
        associatedWO.id,
        noteState,
        parseInt(supervisorId!),
        `Actualizado desde tablero de supervisor`
      );

      console.log('✅ WO sincronizado correctamente con el backend');
    } catch (error) {
      console.error('❌ Error sincronizando con WO:', error);
      // No interrumpimos el flujo del usuario
    }
  };

  const handleExport = async (filters: ExportFilters) => {
    const filtered = filterNotesByDateAndState(notes, filters);
    const totalNotes = filtered.length;

    console.log('📊 Export: Loading full note details for', totalNotes, 'notes');

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
          console.log('📷 Loaded details for note:', note.id, {
            imagen: fullNote.imagen,
            imgs: fullNote.imgs?.length || 0,
            images: fullNote.images?.length || 0,
          });
          notesWithDetails.push(fullNote);
        } catch (error) {
          console.error('❌ Error loading details for note:', note.id, error);
          notesWithDetails.push(note);
        }
      }

      setExportMessage('Preparando reporte...');

      const reportData = {
        supervisorName: supervisorName,
        notes: notesWithDetails,
        filters: filters,
      };

      localStorage.setItem('reportData', JSON.stringify(reportData));

      setExportLoading(false);
      setShowExportModal(false);

      const reportUrl = `${window.location.origin}/report`;
      const newWindow = window.open(reportUrl, '_blank', 'width=1200,height=800');

      if (!newWindow) {
        alert('Por favor permite ventanas emergentes para ver el reporte');
      }
    } catch (error) {
      console.error('❌ Export: Error loading note details:', error);
      setExportLoading(false);
      alert('Error al cargar los detalles de las notas');
    }
  };

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
      case 'all':
      default:
        break;
    }

    return filtered;
  };

  const filterNotesBySearch = (notesList: Note[]) => {
    if (!searchQuery.trim()) return notesList;

    const query = searchQuery.toLowerCase();
    return notesList.filter((note) =>
      note.titulo.toLowerCase().includes(query) ||
      note.actividades.toLowerCase().includes(query) ||
      (note.comment && note.comment.toLowerCase().includes(query))
    );
  };

  const filterNotesByDate = (notesList: Note[]) => {
    if (dateFilter === 'all') return notesList;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return notesList.filter((note) => {
      const noteDate = new Date(note.fecha);
      noteDate.setHours(0, 0, 0, 0);

      switch (dateFilter) {
        case 'today':
          return noteDate.getTime() === today.getTime();
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return noteDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return noteDate >= monthAgo;
        default:
          return true;
      }
    });
  };

  const sortNotes = (notesList: Note[]) => {
    const sorted = [...notesList];

    switch (sortBy) {
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      case 'title-asc':
        return sorted.sort((a, b) => a.titulo.localeCompare(b.titulo));
      case 'title-desc':
        return sorted.sort((a, b) => b.titulo.localeCompare(a.titulo));
      default:
        return sorted;
    }
  };

  const applyAllFilters = (notesList: Note[]) => {
    let filtered = filterNotesByDate(notesList);
    filtered = filterNotesBySearch(filtered);
    filtered = sortNotes(filtered);
    return filtered;
  };

  const handleCreateNote = () => {
    setShowCreateModal(true);
  };

  const handleNoteCreated = () => {
    setShowCreateModal(false);
    loadData();
  };

  const filteredNotes = applyAllFilters(notes);
  const pendingNotes = statusFilter.pending ? filteredNotes.filter((n) => n.estado === 0) : [];
  const inProgressNotes = statusFilter.inProgress ? filteredNotes.filter((n) => n.estado === 1) : [];
  const completedNotes = statusFilter.completed ? filteredNotes.filter((n) => n.estado === 2) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <HamsterLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
                Tablero de Tareas
              </h1>
              <p className="text-slate-600 mt-1">
                Supervisor: <span className="font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{supervisorName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateNote}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
              >
                <Plus className="w-5 h-5 drop-shadow-md" />
                Nueva Tarea
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
              >
                <FileText className="w-5 h-5 drop-shadow-md" />
                Exportar
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar tareas por título, actividades o comentarios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-shadow text-sm lg:text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-300 font-medium ${
                  showFilters
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <Filter className="w-5 h-5" />
                Filtros
              </button>
            </div>

            {showFilters && (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-lg space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Rango de Fechas
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'today', 'week', 'month'] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => setDateFilter(range)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          dateFilter === range
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {range === 'all' && 'Todas'}
                        {range === 'today' && 'Hoy'}
                        {range === 'week' && 'Esta Semana'}
                        {range === 'month' && 'Este Mes'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setStatusFilter({ ...statusFilter, pending: !statusFilter.pending })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        statusFilter.pending
                          ? 'bg-orange-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Pendientes
                    </button>
                    <button
                      onClick={() => setStatusFilter({ ...statusFilter, inProgress: !statusFilter.inProgress })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        statusFilter.inProgress
                          ? 'bg-cyan-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      En Proceso
                    </button>
                    <button
                      onClick={() => setStatusFilter({ ...statusFilter, completed: !statusFilter.completed })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        statusFilter.completed
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Terminadas
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    {sortBy.includes('asc') ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    Ordenar Por
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSortBy('date-desc')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        sortBy === 'date-desc'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Fecha (Más Reciente)
                    </button>
                    <button
                      onClick={() => setSortBy('date-asc')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        sortBy === 'date-asc'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Fecha (Más Antigua)
                    </button>
                    <button
                      onClick={() => setSortBy('title-asc')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        sortBy === 'title-asc'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Título (A-Z)
                    </button>
                    <button
                      onClick={() => setSortBy('title-desc')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        sortBy === 'title-desc'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Título (Z-A)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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

        {selectedNoteId && (
          <TaskDetailsModal
            noteId={selectedNoteId}
            supervisors={supervisors}
            onClose={() => setSelectedNoteId(null)}
            onStateChange={handleStateChange}
          />
        )}

        {showExportModal && (
          <ExportReportModal
            onClose={() => setShowExportModal(false)}
            onExport={handleExport}
            isLoading={exportLoading}
            loadingProgress={exportProgress}
            loadingMessage={exportMessage}
          />
        )}

        {showCreateModal && (
          <CreateTaskModal
            supervisors={supervisors}
            defaultSupervisorId={parseInt(supervisorId!)}
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleNoteCreated}
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const colorClasses = {
    yellow: 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300',
    blue: 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-300',
    green: 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300',
  };

  const headerColors = {
    yellow: 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md',
    blue: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md',
    green: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md',
  };

  const targetState = {
    yellow: 0,
    blue: 1,
    green: 2,
  } as const;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(true);
  };

  const handleDragLeave = () => {
    setDraggedOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOver(false);

    const noteId = e.dataTransfer.getData('noteId');
    if (noteId) {
      onStateChange(noteId, targetState[color]);
    }
  };

  const totalPages = Math.ceil(notes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotes = notes.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div
      className={`rounded-xl border-2 ${colorClasses[color]} ${
        draggedOver ? 'border-dashed border-4 scale-[1.02] ring-4 ring-blue-400 ring-opacity-50' : ''
      } transition-all duration-300 flex flex-col h-[calc(100vh-12rem)] lg:h-[calc(100vh-14rem)] shadow-lg hover:shadow-xl`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`${headerColors[color]} px-3 lg:px-4 py-2.5 lg:py-3 rounded-t-xl`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm lg:text-base">{title}</h3>
          <span className="bg-white bg-opacity-30 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs lg:text-sm font-medium shadow-sm">
            {count}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-2 lg:space-y-3">
        {notes.length === 0 ? (
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
        <div className="px-2 lg:px-4 pb-2 lg:pb-4 flex items-center justify-between border-t border-gray-200 pt-2 lg:pt-3">
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
