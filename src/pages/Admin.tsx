import { useEffect, useState } from 'react';
import { api, Supervisor, Note, Requisition } from '../lib/api';
import { workingOrdersAPI, WorkingOrderListItem } from '../lib/workingOrders';
import { Plus, Users, Edit2, Trash2, Link2, Check, FileText, ClipboardList, Wrench, ArrowRight, X, Bell, Mail } from 'lucide-react';

const ADMIN_PASSWORD = '132639';
const COOKIE_NAME = 'admin_auth';
const COOKIE_EXPIRY_DAYS = 30;

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

export default function Admin() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'supervisors' | 'notes' | 'requisitions' | 'workingOrders'>('supervisors');
  const [notes, setNotes] = useState<Note[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [workingOrders, setWorkingOrders] = useState<WorkingOrderListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [reassignModalNote, setReassignModalNote] = useState<Note | null>(null);
  const [sendingDailyReminders, setSendingDailyReminders] = useState(false);
  const [sendingWeeklyReport, setSendingWeeklyReport] = useState(false);

  useEffect(() => {
    const authCookie = getCookie(COOKIE_NAME);
    if (authCookie === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'notes') {
        loadNotes();
      } else if (activeTab === 'requisitions') {
        loadRequisitions();
      } else if (activeTab === 'workingOrders') {
        loadWorkingOrders();
      }
    }
  }, [activeTab, isAuthenticated]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setCookie(COOKIE_NAME, ADMIN_PASSWORD, COOKIE_EXPIRY_DAYS);
      setIsAuthenticated(true);
      setPasswordInput('');
    } else {
      alert('Contraseña incorrecta');
      setPasswordInput('');
    }
  };

  const loadData = async () => {
    console.log('👥 Admin: Loading supervisors...');
    try {
      const data = await api.getSupervisors();
      console.log('✅ Admin: Supervisors loaded', { count: data.length });

      // Normaliza is_active a boolean para toda la app
      const normalized = (data as Supervisor[]).map((s) => ({
        ...s,
        is_active: !!(s as any).is_active,
      })) as Supervisor[];

      setSupervisors(normalized);
    } catch (error) {
      console.error('❌ Admin: Error loading supervisors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const data = await api.getNotes();
      setNotes(data);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const loadRequisitions = async () => {
    try {
      console.log('📋 Admin: Loading requisitions...');
      const data = await api.getRequisitions({ limit: 200 });
      console.log('✅ Admin: Requisitions loaded', { count: data.length, data });
      setRequisitions(data);
    } catch (error) {
      console.error('❌ Admin: Error loading requisitions:', error);
    }
  };

  const loadWorkingOrders = async () => {
    try {
      let allOrders: WorkingOrderListItem[] = [];
      let page = 1;
      const pageSize = 100;

      while (true) {
        const response = await workingOrdersAPI.list({ page, pageSize });
        allOrders = [...allOrders, ...response.data];

        if (response.data.length < pageSize) {
          break;
        }
        page++;
      }

      setWorkingOrders(allOrders);
    } catch (error) {
      console.error('Error loading working orders:', error);
    }
  };

  const handleDelete = async (id: number) => {
    console.log('🗑️ Admin: Delete requested for supervisor:', id);
    if (!confirm('¿Estás seguro de eliminar este supervisor?')) {
      console.log('⚠️ Admin: Delete cancelled by user');
      return;
    }

    try {
      console.log('🗑️ Admin: Deleting supervisor...');
      await api.deleteSupervisor(id);
      console.log('✅ Admin: Supervisor deleted successfully');
      loadData();
    } catch (error) {
      console.error('❌ Admin: Error deleting supervisor:', error);
      alert('Error al eliminar el supervisor');
    }
  };

  const handleCopyLink = (supervisorId: number) => {
    const url = `${window.location.origin}/supervisor/${supervisorId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(supervisorId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch((error) => {
      console.error('Error copying to clipboard:', error);
      alert('Error al copiar el enlace');
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta nota? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await api.deleteNote(noteId);
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Error al eliminar la nota');
    }
  };

  const handleReassignNote = (note: Note) => {
    setReassignModalNote(note);
  };

  const handleConfirmReassign = async (newSupervisorId: number) => {
    if (!reassignModalNote) return;

    try {
      await api.updateNote(reassignModalNote.id, { supervisorId: newSupervisorId } as any);
      loadNotes();
      setReassignModalNote(null);
      alert('Nota reasignada exitosamente');
    } catch (error) {
      console.error('Error reassigning note:', error);
      alert('Error al reasignar la nota');
    }
  };

  const handleDeleteRequisition = async (requisitionId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta requisición? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await api.deleteRequisition(requisitionId);
      loadRequisitions();
    } catch (error) {
      console.error('Error deleting requisition:', error);
      alert('Error al eliminar la requisición');
    }
  };

  const handleDeleteWorkingOrder = async (workingOrderId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta orden de trabajo? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await workingOrdersAPI.delete(workingOrderId);
      loadWorkingOrders();
    } catch (error) {
      console.error('Error deleting working order:', error);
      alert('Error al eliminar la orden de trabajo');
    }
  };

  const handleSendDailyReminders = async () => {
    if (!confirm('¿Enviar recordatorios diarios a todos los supervisores?')) {
      return;
    }
    setSendingDailyReminders(true);
    try {
      const response = await fetch('https://bsupers.fly.dev/v1/reminders/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al enviar recordatorios');
      }

      alert('Recordatorios diarios enviados exitosamente');
    } catch (error) {
      console.error('Error sending daily reminders:', error);
      alert('Error al enviar los recordatorios diarios');
    } finally {
      setSendingDailyReminders(false);
    }
  };

  const handleSendWeeklyReport = async () => {
    if (!confirm('¿Enviar reporte semanal al administrador?')) {
      return;
    }
    setSendingWeeklyReport(true);
    try {
      const response = await fetch('https://bsupers.fly.dev/v1/reminders/weekly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al enviar reporte');
      }

      alert('Reporte semanal enviado exitosamente');
    } catch (error) {
      console.error('Error sending weekly report:', error);
      alert('Error al enviar el reporte semanal');
    } finally {
      setSendingWeeklyReport(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md border border-gray-200">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Acceso Admin
            </h2>
            <p className="text-gray-600 mt-2">Ingresa la contraseña para continuar</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                placeholder="••••••"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium"
            >
              Acceder
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredNotes = notes.filter(note =>
    note.titulo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.actividades?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequisitions = requisitions.filter(req =>
    req.requested_for_area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.requested_by_nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.folio?.toString().includes(searchQuery)
  );

  const filteredWorkingOrders = workingOrders.filter(wo =>
    wo.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.room_number?.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">Administración</h2>
        {activeTab === 'supervisors' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <Plus className="w-5 h-5 drop-shadow-md" />
            Nuevo Supervisor
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('supervisors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium whitespace-nowrap ${
            activeTab === 'supervisors'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white text-gray-700 border border-gray-200 hover:shadow-md'
          }`}
        >
          <Users className="w-4 h-4" />
          Supervisores
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium whitespace-nowrap ${
            activeTab === 'notes'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white text-gray-700 border border-gray-200 hover:shadow-md'
          }`}
        >
          <FileText className="w-4 h-4" />
          Notas
        </button>
        <button
          onClick={() => setActiveTab('requisitions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium whitespace-nowrap ${
            activeTab === 'requisitions'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white text-gray-700 border border-gray-200 hover:shadow-md'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Requisiciones
        </button>
        <button
          onClick={() => setActiveTab('workingOrders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium whitespace-nowrap ${
            activeTab === 'workingOrders'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
              : 'bg-white text-gray-700 border border-gray-200 hover:shadow-md'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Órdenes de Trabajo
        </button>
      </div>

      {(activeTab === 'notes' || activeTab === 'requisitions' || activeTab === 'workingOrders') && (
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {activeTab === 'supervisors' && (
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-gray-200 shadow-lg">
          <div className="border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Supervisores</h3>
              </div>
              <span className="text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-semibold">{supervisors.length} total</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSendDailyReminders}
                disabled={sendingDailyReminders}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Bell className="w-4 h-4" />
                {sendingDailyReminders ? 'Enviando...' : 'Enviar Recordatorios Diarios'}
              </button>

              <button
                onClick={handleSendWeeklyReport}
                disabled={sendingWeeklyReport}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Mail className="w-4 h-4" />
                {sendingWeeklyReport ? 'Enviando...' : 'Enviar Reporte Semanal'}
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {supervisors.map((supervisor) => (
              <div
                key={supervisor.id}
                className="relative overflow-hidden rounded-xl p-3 sm:p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.13)',
                  backdropFilter: 'blur(5px)',
                  WebkitBackdropFilter: 'blur(5px)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-100/30 to-slate-200/20" />
                <div className="relative">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base text-gray-800 truncate">{supervisor.nombre}</h4>
                    {supervisor.alias && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">@{supervisor.alias}</p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-600 mt-1.5 sm:mt-2 truncate">{supervisor.correo}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5 sm:mt-2">
                      {supervisor.kind && (
                        <span className={`inline-block text-[10px] sm:text-xs px-2 py-1 rounded font-medium ${
                          supervisor.kind === 'PROYECTO'
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                        }`}>
                          {supervisor.kind === 'PROYECTO' ? 'Proyecto' : 'Supervisor'}
                        </span>
                      )}
                      {supervisor.role && (
                        <span className="inline-block text-[10px] sm:text-xs bg-slate-500 text-white px-2 py-1 rounded">
                          {supervisor.role}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ml-2 ${
                      supervisor.is_active ? 'bg-blue-500' : 'bg-slate-300'
                    }`}
                    title={supervisor.is_active ? 'Activo' : 'Inactivo'}
                  ></div>
                </div>
                <div className="space-y-2 pt-2 sm:pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleCopyLink(supervisor.id)}
                    className="w-full flex items-center justify-center gap-1.5 text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-2 sm:px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                  >
                    {copiedId === supervisor.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3 h-3" />
                        Copiar enlace
                      </>
                    )}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingSupervisor(supervisor)}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] sm:text-xs bg-cyan-100 text-cyan-700 px-2 sm:px-3 py-2 rounded-lg hover:bg-cyan-200 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(supervisor.id)}
                      className="flex-1 flex items-center justify-center gap-1 text-[10px] sm:text-xs bg-red-100 text-red-700 px-2 sm:px-3 py-2 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                    </button>
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>

            {supervisors.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No hay supervisores registrados
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Notas ({filteredNotes.length})
          </h3>
          <div className="space-y-2">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 truncate">{note.titulo}</h4>
                  <p className="text-sm text-gray-600 truncate">{note.actividades}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supervisor: {note.supervisor_nombre} | Fecha: {note.fecha}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleReassignNote(note)}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Reasignar
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No se encontraron notas
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requisitions' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Requisiciones ({filteredRequisitions.length})
          </h3>
          <div className="space-y-2">
            {filteredRequisitions.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-800">Folio #{req.folio}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      req.status === 'CLOSED' ? 'bg-green-100 text-green-700' :
                      req.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {req.status}
                    </span>
                    {req.priority && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        req.priority === 'ALTA' ? 'bg-red-100 text-red-700' :
                        req.priority === 'MEDIA' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {req.priority}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">Área: {req.requested_for_area}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Solicitante: {req.requested_by_nombre || 'N/A'} | Items: {req.total_items}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteRequisition(req.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm ml-4"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            ))}
            {filteredRequisitions.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No se encontraron requisiciones
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'workingOrders' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Órdenes de Trabajo ({filteredWorkingOrders.length})
          </h3>
          <div className="space-y-2">
            {filteredWorkingOrders.map((wo) => (
              <div
                key={wo.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 truncate">{wo.summary}</h4>
                  <p className="text-sm text-gray-600">Habitación: {wo.room_number}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Estado: {wo.status} | Severidad: {wo.severity}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteWorkingOrder(wo.id)}
                  className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm ml-4"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            ))}
            {filteredWorkingOrders.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No se encontraron órdenes de trabajo
              </div>
            )}
          </div>
        </div>
      )}

      {reassignModalNote && (
        <ReassignNoteModal
          note={reassignModalNote}
          supervisors={supervisors}
          onClose={() => setReassignModalNote(null)}
          onConfirm={handleConfirmReassign}
        />
      )}

      {showCreateModal && (
        <SupervisorModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
        />
      )}

      {editingSupervisor && (
        <SupervisorModal
          supervisor={editingSupervisor}
          onClose={() => setEditingSupervisor(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

interface SupervisorModalProps {
  supervisor?: Supervisor;
  onClose: () => void;
  onSuccess: () => void;
}

function SupervisorModal({ supervisor, onClose, onSuccess }: SupervisorModalProps) {
  const [formData, setFormData] = useState({
    nombre: supervisor?.nombre || '',
    alias: supervisor?.alias || '',
    correo: supervisor?.correo || '',
    role: supervisor?.role || '',
    kind: (supervisor?.kind as 'SUPERVISOR' | 'PROYECTO') || 'SUPERVISOR',
    // Normaliza a boolean desde el inicio
    is_active: supervisor ? !!(supervisor as any).is_active : true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    console.group('💾 SupervisorModal: Saving supervisor');
    console.log('📝 Form data:', formData);
    console.log('🔧 Mode:', supervisor ? 'UPDATE' : 'CREATE');
    if (supervisor) {
      console.log('🆔 Supervisor ID:', supervisor.id);
    }

    // Fuerza boolean justo antes de enviar
    const payload = {
      ...formData,
      is_active: !!formData.is_active,
    };

    try {
      if (supervisor) {
        console.log('🔄 Updating supervisor...');
        await api.updateSupervisor(supervisor.id, payload as any);
        console.log('✅ Supervisor updated successfully');
      } else {
        console.log('➕ Creating supervisor...');
        const result = await api.createSupervisor(payload as any);
        console.log('✅ Supervisor created successfully', result);
      }
      console.groupEnd();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ SupervisorModal: Error saving supervisor:', error);
      console.groupEnd();
      alert('Error al guardar el supervisor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">
            {supervisor ? 'Editar Supervisor' : 'Nuevo Supervisor'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl sm:text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Alias
            </label>
            <input
              type="text"
              value={formData.alias}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Nombre corto o apodo"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Correo *
            </label>
            <input
              type="email"
              required
              value={formData.correo}
              onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Tipo *
            </label>
            <select
              value={formData.kind}
              onChange={(e) => setFormData({ ...formData, kind: e.target.value as 'SUPERVISOR' | 'PROYECTO' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="SUPERVISOR">Supervisor</option>
              <option value="PROYECTO">Proyecto</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">Seleccionar rol</option>
              <option value="Sup. Mantenimiento Preventivo">Mantenimiento Preventivo </option>
              <option value="Supervisor Exteriores">Supervisor Exteriores</option>
              <option value="Supervisor Técnico">Supervisor Técnico</option>
              <option value="Supervisor de Vespertino">Supervisor de Vespertino</option>
              <option value="Supervisor de Cuartos">Supervisor de Cuartos</option>
              <option value="Supervisor Quimico del Agua">Supervisor Quimico del Agua</option>
              <option value="Almacenista">Almacenista</option>
              <option value="Energy Keeper">Energy Keeper</option>
              <option value="Asistente del Dir Ing">Asistente del Dir Ing</option>
              <option value="Subgerente de Mantto">Subgerente de Mantto</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={!!formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
            />
            <label htmlFor="is_active" className="text-xs sm:text-sm font-medium text-gray-700">
              Activo
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {submitting ? 'Guardando...' : supervisor ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ReassignNoteModalProps {
  note: Note;
  supervisors: Supervisor[];
  onClose: () => void;
  onConfirm: (supervisorId: number) => void;
}

function ReassignNoteModal({ note, supervisors, onClose, onConfirm }: ReassignNoteModalProps) {
  const [selectedSupervisor, setSelectedSupervisor] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Reasignar Nota</h3>
            <p className="text-sm text-gray-600 mt-1">{note.titulo}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Asignado actualmente a:</span>{' '}
              {note.supervisor_nombre}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Selecciona el nuevo supervisor o proyecto:
            </label>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {supervisors.map((supervisor) => (
                <button
                  key={supervisor.id}
                  onClick={() => setSelectedSupervisor(supervisor.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedSupervisor === supervisor.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-800">{supervisor.nombre}</h4>
                        {supervisor.alias && (
                          <span className="text-sm text-gray-500">@{supervisor.alias}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{supervisor.correo}</p>
                      <div className="flex gap-2 mt-2">
                        {supervisor.kind && (
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded font-medium ${
                              supervisor.kind === 'PROYECTO'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {supervisor.kind === 'PROYECTO' ? 'Proyecto' : 'Supervisor'}
                          </span>
                        )}
                        {supervisor.role && (
                          <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {supervisor.role}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedSupervisor === supervisor.id && (
                      <Check className="w-6 h-6 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={() => selectedSupervisor && onConfirm(selectedSupervisor)}
              disabled={!selectedSupervisor}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Reasignar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
