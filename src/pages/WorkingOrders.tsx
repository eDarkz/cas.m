import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  workingOrdersAPI,
  WorkingOrderListItem,
  WorkingOrderStatus,
  WorkingOrderSeverity,
  WorkingOrderSource,
  WorkingOrderSummary
} from '../lib/workingOrders';
import { api, Supervisor } from '../lib/api';
import {
  AlertCircle,
  Plus,
  Filter,
  Search,
  Download,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  FileText,
  X,
  Calendar
} from 'lucide-react';
import CreateWorkingOrderModal from '../components/CreateWorkingOrderModal';

export default function WorkingOrders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<WorkingOrderListItem[]>([]);
  const [summary, setSummary] = useState<WorkingOrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Filtros
  const statusFilter = searchParams.get('status') as WorkingOrderStatus | null;
  const severityFilter = (searchParams.get('severity') as WorkingOrderSeverity) || '';
  const sourceFilter = (searchParams.get('source') as WorkingOrderSource) || '';
  const assignedToFilter = searchParams.get('assigned_to') || '';
  const categoryFilter = searchParams.get('category') || '';
  const fromDateFilter = searchParams.get('from') || '';
  const toDateFilter = searchParams.get('to') || '';
  const searchQuery = searchParams.get('q') || '';
  const roomNumberFilter = searchParams.get('roomNumber') || '';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    if (!initialLoadDone) {
      // Si no hay parámetro de status en la URL inicial, establecer el filtro por defecto
      if (!searchParams.has('status')) {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('status', 'ASSIGNED,IN_PROGRESS');
        setSearchParams(newParams, { replace: true });
      }
      loadSummary();
      loadSupervisors();
      loadCategories();
      setInitialLoadDone(true);
    }
    loadOrders();
  }, [searchParams]);

  const loadSummary = async () => {
    try {
      const response = await workingOrdersAPI.list({
        page: 1,
        pageSize: 1,
        withSummary: 1,
      });
      if (response.summary) setSummary(response.summary);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const loadSupervisors = async () => {
    try {
      const data = await api.getSupervisors();
      setSupervisors(data.filter(s => s.is_active));
    } catch (error) {
      console.error('Error loading supervisors:', error);
    }
  };

  const loadCategories = async () => {
    // Por ahora usamos categorías estáticas, pero podrían venir del backend
    setCategories(['Limpieza', 'Mantenimiento', 'Electricidad', 'Plomería', 'Aire Acondicionado', 'Muebles', 'Otro']);
  };

  const loadOrders = async () => {
    try {
      // Si el filtro es la combinación de ASSIGNED e IN_PROGRESS, hacer dos llamadas
      if (statusFilter === 'ASSIGNED,IN_PROGRESS') {
        const baseParams: any = {
          page: 1,
          pageSize: 1000, // Obtener todos para paginar en el cliente
        };
        if (severityFilter) baseParams.severity = severityFilter;
        if (sourceFilter) baseParams.source = sourceFilter;
        if (assignedToFilter) baseParams.assigned_to = parseInt(assignedToFilter);
        if (fromDateFilter) baseParams.from = fromDateFilter;
        if (toDateFilter) baseParams.to = toDateFilter;
        if (searchQuery) baseParams.q = searchQuery;
        if (roomNumberFilter) baseParams.roomNumber = parseInt(roomNumberFilter);

        const [assignedResponse, inProgressResponse] = await Promise.all([
          workingOrdersAPI.list({ ...baseParams, status: 'ASSIGNED' }),
          workingOrdersAPI.list({ ...baseParams, status: 'IN_PROGRESS' })
        ]);

        // Combinar y ordenar por fecha de creación (más reciente primero)
        let combinedOrders = [...assignedResponse.data, ...inProgressResponse.data]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Filtrar por categoría si es necesario
        if (categoryFilter) {
          combinedOrders = combinedOrders.filter(order =>
            order.category?.toLowerCase() === categoryFilter.toLowerCase()
          );
        }

        // Paginar en el cliente
        const totalCombined = combinedOrders.length;
        const startIdx = (page - 1) * 25;
        const endIdx = startIdx + 25;
        const paginatedOrders = combinedOrders.slice(startIdx, endIdx);

        setOrders(paginatedOrders);
        setTotal(totalCombined);
      } else {
        // Llamada normal para otros filtros
        const params: any = {
          page,
          pageSize: 25,
        };
        if (statusFilter) params.status = statusFilter;
        if (severityFilter) params.severity = severityFilter;
        if (sourceFilter) params.source = sourceFilter;
        if (assignedToFilter) params.assigned_to = parseInt(assignedToFilter);
        if (fromDateFilter) params.from = fromDateFilter;
        if (toDateFilter) params.to = toDateFilter;
        if (searchQuery) params.q = searchQuery;
        if (roomNumberFilter) params.roomNumber = parseInt(roomNumberFilter);

        const response = await workingOrdersAPI.list(params);

        // Filtrar por categoría en el cliente si es necesario
        let filteredOrders = response.data;
        if (categoryFilter) {
          filteredOrders = filteredOrders.filter(order =>
            order.category?.toLowerCase() === categoryFilter.toLowerCase()
          );
        }

        setOrders(filteredOrders);
        setTotal(categoryFilter ? filteredOrders.length : response.total);
      }
    } catch (error) {
      console.error('Error loading working orders:', error);
    } finally {
      setLoading(false);
    }
  };


  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Solo resetear la página si no estamos cambiando la página misma
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const goToPage = (pageNum: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', pageNum.toString());
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = () => {
    return searchQuery || roomNumberFilter || statusFilter || severityFilter ||
           sourceFilter || assignedToFilter || categoryFilter || fromDateFilter || toDateFilter;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (roomNumberFilter) count++;
    if (statusFilter) count++;
    if (severityFilter) count++;
    if (sourceFilter) count++;
    if (assignedToFilter) count++;
    if (categoryFilter) count++;
    if (fromDateFilter || toDateFilter) count++;
    return count;
  };

  const getStatusColor = (status: WorkingOrderStatus) => {
    switch (status) {
      case 'OPEN': return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-300';
      case 'DISMISSED': return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getStatusIcon = (status: WorkingOrderStatus) => {
    switch (status) {
      case 'OPEN': return <AlertCircle className="w-4 h-4" />;
      case 'ASSIGNED': return <Users className="w-4 h-4" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4" />;
      case 'RESOLVED': return <CheckCircle2 className="w-4 h-4" />;
      case 'DISMISSED': return <XCircle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: WorkingOrderSeverity) => {
    switch (severity) {
      case 'LOW': return 'bg-emerald-500 text-white';
      case 'MEDIUM': return 'bg-blue-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'CRITICAL': return 'bg-red-600 text-white';
    }
  };

  const getStatusLabel = (status: WorkingOrderStatus) => {
    const labels: Record<WorkingOrderStatus, string> = {
      'OPEN': 'Abierta',
      'ASSIGNED': 'Asignada',
      'IN_PROGRESS': 'En Progreso',
      'RESOLVED': 'Resuelta',
      'DISMISSED': 'Descartada',
    };
    return labels[status];
  };

  const getSeverityLabel = (severity: WorkingOrderSeverity) => {
    const labels: Record<WorkingOrderSeverity, string> = {
      'LOW': 'Baja',
      'MEDIUM': 'Media',
      'HIGH': 'Alta',
      'CRITICAL': 'Crítica',
    };
    return labels[severity];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">Working Orders</h2>
          <p className="text-sm text-slate-600 mt-1">Gestión de comentarios y fallas de huéspedes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/working-orders/analytics')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg hover:shadow-xl transition-all text-sm font-medium"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </button>
          <a
            href={workingOrdersAPI.getExportUrl('csv', { status: statusFilter || undefined })}
            download
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </a>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-xl transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva WO</span>
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-7 gap-2">
          <button
            onClick={() => updateFilter('status', '')}
            className={`p-3 rounded-xl border-2 transition-all ${
              !statusFilter
                ? 'bg-gradient-to-br from-slate-700 to-slate-900 border-slate-900 shadow-lg'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className={`text-2xl font-bold ${!statusFilter ? 'text-white' : 'text-slate-900'}`}>
              {Number(summary.open_cnt) + Number(summary.assigned_cnt) + Number(summary.inprog_cnt) + Number(summary.resolved_cnt) + Number(summary.dismissed_cnt)}
            </div>
            <div className={`text-xs font-medium mt-1 ${!statusFilter ? 'text-slate-200' : 'text-slate-600'}`}>Todas</div>
          </button>
          <button
            onClick={() => updateFilter('status', 'ASSIGNED,IN_PROGRESS')}
            className={`p-3 rounded-xl border-2 transition-all ${
              statusFilter === 'ASSIGNED,IN_PROGRESS'
                ? 'bg-gradient-to-br from-blue-600 to-purple-600 border-purple-500 shadow-lg'
                : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className={`text-2xl font-bold ${statusFilter === 'ASSIGNED,IN_PROGRESS' ? 'text-white' : 'text-slate-900'}`}>
              {Number(summary.assigned_cnt) + Number(summary.inprog_cnt)}
            </div>
            <div className={`text-xs font-medium mt-1 whitespace-nowrap ${statusFilter === 'ASSIGNED,IN_PROGRESS' ? 'text-white' : 'text-slate-600'}`}>Asig + Prog</div>
          </button>
          <button
            onClick={() => updateFilter('status', 'ASSIGNED')}
            className={`p-3 rounded-xl border-2 transition-all ${
              statusFilter === 'ASSIGNED'
                ? 'bg-blue-50 border-blue-400 shadow-lg'
                : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="text-2xl font-bold text-blue-700">{summary.assigned_cnt}</div>
            <div className="text-xs font-medium text-blue-600 mt-1">Asignadas</div>
          </button>
          <button
            onClick={() => updateFilter('status', 'IN_PROGRESS')}
            className={`p-3 rounded-xl border-2 transition-all ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-purple-50 border-purple-400 shadow-lg'
                : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-md'
            }`}
          >
            <div className="text-2xl font-bold text-purple-700">{summary.inprog_cnt}</div>
            <div className="text-xs font-medium text-purple-600 mt-1 whitespace-nowrap">En Progreso</div>
          </button>
          <button
            onClick={() => updateFilter('status', 'RESOLVED')}
            className={`p-3 rounded-xl border-2 transition-all ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-50 border-emerald-400 shadow-lg'
                : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
            }`}
          >
            <div className="text-2xl font-bold text-emerald-700">{summary.resolved_cnt}</div>
            <div className="text-xs font-medium text-emerald-600 mt-1">Resueltas</div>
          </button>
          <button
            onClick={() => updateFilter('status', 'DISMISSED')}
            className={`p-3 rounded-xl border-2 transition-all ${
              statusFilter === 'DISMISSED'
                ? 'bg-red-50 border-red-400 shadow-lg'
                : 'bg-white border-slate-200 hover:border-red-300 hover:shadow-md'
            }`}
          >
            <div className="text-2xl font-bold text-red-700">{summary.dismissed_cnt}</div>
            <div className="text-xs font-medium text-red-600 mt-1">Descartadas</div>
          </button>
          <button
            onClick={() => updateFilter('status', 'OPEN')}
            className={`p-3 rounded-xl border-2 transition-all ${
              statusFilter === 'OPEN'
                ? 'bg-slate-50 border-slate-400 shadow-lg'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="text-2xl font-bold text-slate-900">{summary.open_cnt}</div>
            <div className="text-xs font-medium text-slate-600 mt-1">Abiertas</div>
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-md">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col gap-3">
            {/* Barra de búsqueda principal */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => updateFilter('q', e.target.value)}
                    placeholder="Buscar en resumen, detalle, categoría..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="w-32 relative">
                  <input
                    type="number"
                    value={roomNumberFilter}
                    onChange={(e) => updateFilter('roomNumber', e.target.value)}
                    placeholder="# Hab"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                    showFilters || hasActiveFilters()
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filtros</span>
                  {getActiveFiltersCount() > 0 && (
                    <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {getActiveFiltersCount()}
                    </span>
                  )}
                </button>
                {hasActiveFilters() && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Limpiar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Panel de filtros expandible */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Supervisor Asignado</label>
                  <select
                    value={assignedToFilter}
                    onChange={(e) => updateFilter('assigned_to', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    {supervisors.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Categoría</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Severidad</label>
                  <select
                    value={severityFilter}
                    onChange={(e) => updateFilter('severity', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas</option>
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Origen</label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => updateFilter('source', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="MEDALLIA">Medallia</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha Desde</label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={fromDateFilter}
                      onChange={(e) => updateFilter('from', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha Hasta</label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={toDateFilter}
                      onChange={(e) => updateFilter('to', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No se encontraron working orders</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/working-orders/${order.id}`)}
                  className="group p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-white hover:bg-blue-50/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-12 h-9 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white font-bold text-sm flex-shrink-0">
                      {order.room_number}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {order.summary.toUpperCase()}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(order.created_at).toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {order.assigned_nombre && (
                          <span className="flex items-center gap-1 truncate max-w-[120px]">
                            <Users className="w-3 h-3 flex-shrink-0" />
                            {order.assigned_nombre}
                          </span>
                        )}
                        {order.category && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium truncate max-w-[100px]">
                            {order.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getSeverityColor(order.severity)}`} title={getSeverityLabel(order.severity)} />
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="text-xs font-semibold whitespace-nowrap hidden sm:inline">{getStatusLabel(order.status)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {total > 25 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-md p-4">
          <p className="text-sm text-slate-600">
            Mostrando {((page - 1) * 25) + 1} - {Math.min(page * 25, total)} de {total} resultados
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => goToPage(page - 1)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {(() => {
                const totalPages = Math.ceil(total / 25);
                const pages = [];

                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  if (page <= 4) {
                    pages.push(1, 2, 3, 4, 5, -1, totalPages);
                  } else if (page >= totalPages - 3) {
                    pages.push(1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    pages.push(1, -1, page - 1, page, page + 1, -1, totalPages);
                  }
                }

                return pages.map((p, idx) => {
                  if (p === -1) {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        p === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                });
              })()}
            </div>
            <button
              disabled={page * 25 >= total}
              onClick={() => goToPage(page + 1)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <CreateWorkingOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadOrders}
      />
    </div>
  );
}
