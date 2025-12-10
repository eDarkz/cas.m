import { useEffect, useState } from 'react';
import { api, Requisition, Supervisor, RequisitionItem } from '../lib/api';
import { Plus, Search, AlertCircle, Package, Clock, FileText, ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react';
import CreateRequisicionModal from '../components/CreateRequisicionModal';
import RequisitionDetailsModal from '../components/RequisitionDetailsModal';
import RequisitionsReportModal from '../components/RequisitionsReportModal';

export default function Requisiciones() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedRequisitionId, setSelectedRequisitionId] = useState<string | null>(null);
  const [requisitionItems, setRequisitionItems] = useState<Map<string, RequisitionItem[]>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [filter, setFilter] = useState({
    search: '',
    status: undefined as 'ENVIADA' | 'EN_COMPRAS' | 'PARCIAL' | 'CERRADA' | undefined,
    pendingOnly: false,
  });

  useEffect(() => {
    loadData();
  }, [filter.status, filter.pendingOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requisData, supervisorsData] = await Promise.all([
        api.getRequisitions({
          status: filter.status,
          pendingOnly: filter.pendingOnly
        }),
        api.getSupervisors(),
      ]);
      setRequisitions(requisData);
      setSupervisors(supervisorsData);

      // Cargar items para todas las requisiciones
      const itemsMap = new Map<string, RequisitionItem[]>();
      await Promise.all(
        requisData.map(async (req) => {
          try {
            const items = await api.getRequisitionItems(req.id);
            itemsMap.set(req.id, items);
          } catch (error) {
            console.error(`Error loading items for requisition ${req.id}:`, error);
            itemsMap.set(req.id, []);
          }
        })
      );
      setRequisitionItems(itemsMap);
    } catch (error) {
      console.error('Error loading requisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequisitions = requisitions.filter((req) => {
    if (
      filter.search &&
      !req.requested_for_area.toLowerCase().includes(filter.search.toLowerCase()) &&
      !req.comentario?.toLowerCase().includes(filter.search.toLowerCase()) &&
      !req.folio.toString().includes(filter.search) &&
      !req.external_req_number?.toLowerCase().includes(filter.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredRequisitions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequisitions = filteredRequisitions.slice(startIndex, endIndex);

  const getDaysAgo = (dateString: string) => {
    const created = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ENVIADA':
        return 'bg-blue-100 text-blue-800';
      case 'EN_COMPRAS':
        return 'bg-purple-100 text-purple-800';
      case 'PARCIAL':
        return 'bg-orange-100 text-orange-800';
      case 'CERRADA':
        return 'bg-emerald-100 text-emerald-800';
      case 'CANCELADA':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENTE':
        return 'bg-red-500 text-white';
      case 'ALTA':
        return 'bg-orange-500 text-white';
      case 'MEDIA':
        return 'bg-yellow-500 text-white';
      case 'BAJA':
        return 'bg-green-500 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Requisiciones
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {filteredRequisitions.length} {filteredRequisitions.length === 1 ? 'requisición' : 'requisiciones'}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-slate-600 to-slate-800 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <FileText className="w-5 h-5 drop-shadow-md" />
            <span className="hidden sm:inline">Reporte</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <Plus className="w-5 h-5 drop-shadow-md" />
            <span className="hidden sm:inline">Nueva</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por folio, área, comentario..."
            value={filter.search}
            onChange={(e) => {
              setFilter({ ...filter, search: e.target.value });
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-shadow text-sm"
          />
        </div>
        <select
          value={filter.status || ''}
          onChange={(e) => {
            setFilter({
              ...filter,
              status: e.target.value ? (e.target.value as any) : undefined,
            });
            setCurrentPage(1);
          }}
          className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-shadow text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="ENVIADA">Enviada</option>
          <option value="EN_COMPRAS">En Compras</option>
          <option value="PARCIAL">Parcial</option>
          <option value="CERRADA">Cerrada</option>
        </select>
        <button
          onClick={() => {
            setFilter({ ...filter, pendingOnly: !filter.pendingOnly });
            setCurrentPage(1);
          }}
          className={`px-4 py-2.5 rounded-lg transition-all duration-300 text-sm font-medium whitespace-nowrap ${
            filter.pendingOnly
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
              : 'bg-white border border-slate-300 text-slate-700 hover:shadow-md'
          }`}
        >
          Solo Pendientes
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-700 to-slate-900 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Folio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Descripción Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Área</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Prioridad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Solicitante</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedRequisitions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No se encontraron requisiciones
                  </td>
                </tr>
              ) : (
                paginatedRequisitions.map((req) => {
                  const daysAgo = getDaysAgo(req.created_at);
                  const items = requisitionItems.get(req.id) || [];

                  if (items.length === 0) {
                    return (
                      <tr
                        key={req.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedRequisitionId(req.id)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">#{req.folio}</span>
                            {req.pending_items > 0 && (
                              <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                {req.pending_items}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-slate-400">
                            <Package className="w-4 h-4" />
                            <span>Sin items</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-900 font-medium">
                            {req.requested_for_area}
                          </div>
                          {req.comentario && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {req.comentario}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getPriorityColor(req.priority)}`}>
                            {req.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="truncate max-w-[150px]">{req.requested_by_nombre || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{daysAgo === 0 ? 'Hoy' : `Hace ${daysAgo}d`}</span>
                          </div>
                          {req.needed_date && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(req.needed_date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  return items.map((item, idx) => (
                    <tr
                      key={`${req.id}-${item.id}`}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${idx === 0 ? '' : 'border-t-0'}`}
                      onClick={() => setSelectedRequisitionId(req.id)}
                    >
                      {idx === 0 && (
                        <td
                          className="px-4 py-3 whitespace-nowrap align-top"
                          rowSpan={items.length}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">#{req.folio}</span>
                            {req.pending_items > 0 && (
                              <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                {req.pending_items}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-2">
                        <div className="text-sm text-slate-900 font-medium">
                          {item.descripcion}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-600 flex-wrap">
                          <span>Cant: <span className="font-medium">{item.cantidad} {item.unidad}</span></span>
                          {item.destino && (
                            <span className="truncate">Destino: <span className="font-medium">{item.destino}</span></span>
                          )}
                          {item.delivered_qty > 0 && (
                            <span className="text-emerald-700">
                              Entregado: <span className="font-medium">{item.delivered_qty}</span>
                            </span>
                          )}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                            item.status === 'SURTIDO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'PARCIAL'
                              ? 'bg-orange-100 text-orange-800'
                              : item.status === 'CANCELADO'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </td>
                      {idx === 0 && (
                        <>
                          <td
                            className="px-4 py-3 align-top"
                            rowSpan={items.length}
                          >
                            <div className="text-sm text-slate-900 font-medium">
                              {req.requested_for_area}
                            </div>
                            {req.comentario && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {req.comentario}
                              </div>
                            )}
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap align-top"
                            rowSpan={items.length}
                          >
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                              {req.status}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap align-top"
                            rowSpan={items.length}
                          >
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getPriorityColor(req.priority)}`}>
                              {req.priority}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 hidden md:table-cell align-top"
                            rowSpan={items.length}
                          >
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="truncate max-w-[150px]">{req.requested_by_nombre || 'N/A'}</span>
                            </div>
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap hidden lg:table-cell align-top"
                            rowSpan={items.length}
                          >
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span>{daysAgo === 0 ? 'Hoy' : `Hace ${daysAgo}d`}</span>
                            </div>
                            {req.needed_date && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(req.needed_date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredRequisitions.length)} de {filteredRequisitions.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateRequisicionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
        />
      )}

      {selectedRequisitionId && (
        <RequisitionDetailsModal
          requisitionId={selectedRequisitionId}
          onClose={() => {
            setSelectedRequisitionId(null);
            loadData();
          }}
        />
      )}

      {showReportModal && (
        <RequisitionsReportModal
          requisitions={filteredRequisitions}
          supervisors={supervisors}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
