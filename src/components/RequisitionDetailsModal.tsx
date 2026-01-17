import { useEffect, useState } from 'react';
import { X, Clock, Package, CheckCircle, Send, Edit2, Image as ImageIcon, Save, XCircle } from 'lucide-react';
import HamsterLoader from './HamsterLoader';
import { api, RequisitionDetail, ItemStatus, RequisitionStatus, Priority, RequisitionItem } from '../lib/api';

interface RequisitionDetailsModalProps {
  requisitionId: string;
  onClose: () => void;
}

export default function RequisitionDetailsModal({ requisitionId, onClose }: RequisitionDetailsModalProps) {
  const [requisition, setRequisition] = useState<RequisitionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusComment, setStatusComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingReq, setEditingReq] = useState(false);
  const [editedReqData, setEditedReqData] = useState<{
    requestedForArea: string;
    priority: Priority;
    comentario: string;
    externalReqNumber: string;
    neededDate: string;
  } | null>(null);

  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editedItemData, setEditedItemData] = useState<Partial<RequisitionItem> | null>(null);

  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<RequisitionStatus | ''>();
  const [statusChangeComment, setStatusChangeComment] = useState('');

  useEffect(() => {
    loadRequisitionDetails();
  }, [requisitionId]);

  const loadRequisitionDetails = async () => {
    try {
      const data = await api.getRequisitionById(requisitionId, ['items', 'history']);
      setRequisition(data);
    } catch (error) {
      console.error('Error loading requisition details:', error);
      alert('Error al cargar los detalles de la requisición');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      await api.addRequisitionStatus(requisitionId, {
        comment: statusComment,
      });
      setStatusComment('');
      await loadRequisitionDetails();
    } catch (error) {
      console.error('Error adding status:', error);
      alert('Error al agregar comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkItemReceived = async (itemId: number) => {
    if (!confirm('¿Marcar este artículo como surtido?')) return;

    try {
      await api.markItemReceived(itemId);
      await loadRequisitionDetails();
    } catch (error) {
      console.error('Error marking item as received:', error);
      alert('Error al marcar artículo como surtido');
    }
  };

  const startEditingRequisition = () => {
    if (!requisition) return;
    setEditedReqData({
      requestedForArea: requisition.requested_for_area,
      priority: requisition.priority,
      comentario: requisition.comentario || '',
      externalReqNumber: requisition.external_req_number || '',
      neededDate: requisition.needed_date || '',
    });
    setEditingReq(true);
  };

  const saveRequisitionEdits = async () => {
    if (!editedReqData || submitting) return;

    setSubmitting(true);
    try {
      await api.updateRequisition(requisitionId, {
        requestedForArea: editedReqData.requestedForArea,
        priority: editedReqData.priority,
        comentario: editedReqData.comentario || null,
        neededDate: editedReqData.neededDate || undefined,
      });

      if (editedReqData.externalReqNumber !== requisition?.external_req_number) {
        await api.addRequisitionStatus(requisitionId, {
          comment: `Número de requisición externa actualizado: ${editedReqData.externalReqNumber}`,
          externalReqNumber: editedReqData.externalReqNumber,
        });
      }

      await loadRequisitionDetails();
      setEditingReq(false);
      setEditedReqData(null);
    } catch (error) {
      console.error('Error updating requisition:', error);
      alert('Error al actualizar requisición');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditingItem = (item: RequisitionItem) => {
    setEditingItem(item.id);
    setEditedItemData({
      descripcion: item.descripcion,
      modelo: item.modelo,
      cantidad: item.cantidad,
      unidad: item.unidad,
      destino: item.destino,
      nota: item.nota,
      status: item.status,
      delivered_qty: item.delivered_qty,
    });
  };

  const saveItemEdits = async (itemId: number) => {
    if (!editedItemData || submitting) return;

    setSubmitting(true);
    try {
      await api.updateRequisitionItem(itemId, editedItemData);
      await loadRequisitionDetails();
      setEditingItem(null);
      setEditedItemData(null);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Error al actualizar item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!newStatus || submitting) return;

    setSubmitting(true);
    try {
      await api.addRequisitionStatus(requisitionId, {
        status: newStatus,
        comment: statusChangeComment || undefined,
      });
      await loadRequisitionDetails();
      setChangingStatus(false);
      setNewStatus('');
      setStatusChangeComment('');
    } catch (error) {
      console.error('Error changing status:', error);
      alert('Error al cambiar estado');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ENVIADA':
        return 'from-blue-500 to-cyan-500';
      case 'EN_COMPRAS':
        return 'from-purple-500 to-pink-500';
      case 'PARCIAL':
        return 'from-orange-500 to-amber-500';
      case 'CERRADA':
        return 'from-emerald-500 to-teal-500';
      case 'CANCELADA':
        return 'from-red-500 to-rose-500';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  const getItemStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'SURTIDO':
        return 'bg-emerald-100 text-emerald-800';
      case 'PARCIAL':
        return 'bg-orange-100 text-orange-800';
      case 'PENDIENTE':
        return 'bg-slate-100 text-slate-800';
      case 'CANCELADO':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENTE':
        return 'bg-red-100 text-red-800';
      case 'ALTA':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIA':
        return 'bg-yellow-100 text-yellow-800';
      case 'BAJA':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <HamsterLoader />
        </div>
      </div>
    );
  }

  if (!requisition) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto transform transition-all duration-300">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 border-b border-blue-500 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white drop-shadow-md">
              Requisición #{requisition.folio}
            </h3>
            <p className="text-xs text-blue-100">ID: {requisition.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 transition-colors hover:scale-110 duration-200"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs sm:text-sm px-3 py-1 rounded-full font-medium shadow-sm bg-gradient-to-r ${getStatusColor(requisition.status)} text-white`}>
                  {requisition.status}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(requisition.priority)}`}>
                  {requisition.priority}
                </span>
                {requisition.external_req_number && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-medium">
                    Req. Externa: {requisition.external_req_number}
                  </span>
                )}
              </div>
              {requisition.status !== 'CERRADA' && requisition.status !== 'CANCELADA' && !editingReq && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setChangingStatus(!changingStatus)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs"
                  >
                    <Edit2 className="w-3 h-3" />
                    Cambiar Estado
                  </button>
                  <button
                    onClick={startEditingRequisition}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition text-xs"
                  >
                    <Edit2 className="w-3 h-3" />
                    Editar
                  </button>
                </div>
              )}
            </div>

            {changingStatus && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-blue-900">Cambiar Estado</h4>
                <div className="space-y-2">
                  <select
                    value={newStatus || ''}
                    onChange={(e) => setNewStatus(e.target.value as RequisitionStatus)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Seleccionar estado...</option>
                    <option value="BORRADOR">BORRADOR</option>
                    <option value="ENVIADA">ENVIADA</option>
                    <option value="EN_COMPRAS">EN COMPRAS</option>
                    <option value="PARCIAL">PARCIAL</option>
                    <option value="CERRADA">CERRADA</option>
                    <option value="CANCELADA">CANCELADA</option>
                  </select>
                  <input
                    type="text"
                    value={statusChangeComment}
                    onChange={(e) => setStatusChangeComment(e.target.value)}
                    placeholder="Comentario (opcional)"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleChangeStatus}
                      disabled={!newStatus || submitting}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                    >
                      <Save className="w-4 h-4" />
                      Guardar
                    </button>
                    <button
                      onClick={() => { setChangingStatus(false); setNewStatus(''); setStatusChangeComment(''); }}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {editingReq && editedReqData && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-slate-900">Editar Requisición</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Área</label>
                    <input
                      type="text"
                      value={editedReqData.requestedForArea}
                      onChange={(e) => setEditedReqData({ ...editedReqData, requestedForArea: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Prioridad</label>
                    <select
                      value={editedReqData.priority}
                      onChange={(e) => setEditedReqData({ ...editedReqData, priority: e.target.value as Priority })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="BAJA">BAJA</option>
                      <option value="MEDIA">MEDIA</option>
                      <option value="ALTA">ALTA</option>
                      <option value="URGENTE">URGENTE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fecha Necesaria</label>
                    <input
                      type="date"
                      value={editedReqData.neededDate}
                      onChange={(e) => setEditedReqData({ ...editedReqData, neededDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Número Req. Externa (Compras)</label>
                    <input
                      type="text"
                      value={editedReqData.externalReqNumber}
                      onChange={(e) => setEditedReqData({ ...editedReqData, externalReqNumber: e.target.value })}
                      placeholder="Ej: REQ-2024-001"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Comentario</label>
                    <textarea
                      value={editedReqData.comentario}
                      onChange={(e) => setEditedReqData({ ...editedReqData, comentario: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveRequisitionEdits}
                    disabled={submitting}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                  >
                    <Save className="w-4 h-4" />
                    Guardar
                  </button>
                  <button
                    onClick={() => { setEditingReq(false); setEditedReqData(null); }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {requisition.requested_for_area}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Creada el {formatDate(requisition.created_at)}
              </p>
              {requisition.needed_date && (
                <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  Necesaria para: {new Date(requisition.needed_date).toLocaleDateString('es-MX')}
                </p>
              )}
            </div>

            {requisition.comentario && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Comentario General</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{requisition.comentario}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Solicitado por</h4>
                <p className="text-sm font-medium text-slate-800">{requisition.requested_by_nombre}</p>
                {requisition.requested_by_correo && (
                  <p className="text-xs text-slate-500 mt-1">{requisition.requested_by_correo}</p>
                )}
              </div>
              {requisition.responsible_nombre && (
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Responsable</h4>
                  <p className="text-sm font-medium text-slate-800">{requisition.responsible_nombre}</p>
                  {requisition.responsible_correo && (
                    <p className="text-xs text-slate-500 mt-1">{requisition.responsible_correo}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="text-xs text-slate-500">Total Items</p>
                  <p className="text-lg font-bold text-slate-800">{requisition.total_items}</p>
                </div>
              </div>
              {requisition.pending_items > 0 && (
                <>
                  <div className="h-8 w-px bg-slate-300"></div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-xs text-slate-500">Pendientes</p>
                      <p className="text-lg font-bold text-orange-600">{requisition.pending_items}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {requisition.items && requisition.items.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Artículos
              </h3>

              <div className="space-y-3">
                {requisition.items.map((item) => {
                  const isEditing = editingItem === item.id;

                  if (isEditing && editedItemData) {
                    return (
                      <div
                        key={item.id}
                        className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold text-amber-700">#{item.line_number}</span>
                          <span className="text-xs font-semibold text-amber-900">Editando Item</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                            <input
                              type="text"
                              value={editedItemData.descripcion || ''}
                              onChange={(e) => setEditedItemData({ ...editedItemData, descripcion: e.target.value })}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Modelo</label>
                              <input
                                type="text"
                                value={editedItemData.modelo || ''}
                                onChange={(e) => setEditedItemData({ ...editedItemData, modelo: e.target.value })}
                                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Destino</label>
                              <input
                                type="text"
                                value={editedItemData.destino || ''}
                                onChange={(e) => setEditedItemData({ ...editedItemData, destino: e.target.value })}
                                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Cantidad</label>
                              <input
                                type="number"
                                value={editedItemData.cantidad || 0}
                                onChange={(e) => setEditedItemData({ ...editedItemData, cantidad: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Unidad</label>
                              <input
                                type="text"
                                value={editedItemData.unidad || ''}
                                onChange={(e) => setEditedItemData({ ...editedItemData, unidad: e.target.value })}
                                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Entregado</label>
                              <input
                                type="number"
                                value={editedItemData.delivered_qty || 0}
                                onChange={(e) => setEditedItemData({ ...editedItemData, delivered_qty: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Estado</label>
                            <select
                              value={editedItemData.status || 'PENDIENTE'}
                              onChange={(e) => setEditedItemData({ ...editedItemData, status: e.target.value as ItemStatus })}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                            >
                              <option value="PENDIENTE">PENDIENTE</option>
                              <option value="PARCIAL">PARCIAL</option>
                              <option value="SURTIDO">SURTIDO</option>
                              <option value="CANCELADO">CANCELADO</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Nota</label>
                            <textarea
                              value={editedItemData.nota || ''}
                              onChange={(e) => setEditedItemData({ ...editedItemData, nota: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveItemEdits(item.id)}
                              disabled={submitting}
                              className="flex items-center gap-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 text-sm"
                            >
                              <Save className="w-4 h-4" />
                              Guardar
                            </button>
                            <button
                              onClick={() => { setEditingItem(null); setEditedItemData(null); }}
                              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className="bg-gradient-to-br from-white to-slate-50 rounded-lg p-4 border border-slate-200 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-slate-500">#{item.line_number}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getItemStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          <h4 className="font-semibold text-slate-800">{item.descripcion}</h4>
                          {item.modelo && (
                            <p className="text-sm text-slate-600 mt-1">Modelo: {item.modelo}</p>
                          )}
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                            <span>Cantidad: <strong>{item.cantidad} {item.unidad}</strong></span>
                            <span>Destino: <strong>{item.destino}</strong></span>
                          </div>
                          {item.nota && (
                            <p className="text-xs text-slate-500 mt-2 italic">{item.nota}</p>
                          )}
                          {item.delivered_qty > 0 && (
                            <p className="text-xs text-emerald-600 mt-2">
                              Entregado: {item.delivered_qty} {item.unidad}
                              {item.delivered_at && ` el ${formatDate(item.delivered_at)}`}
                            </p>
                          )}
                          {item.imagen_url && (
                            <div className="mt-2">
                              <img
                                src={item.imagen_url}
                                alt="Imagen del item"
                                className="max-w-xs rounded border border-slate-200 cursor-pointer hover:opacity-90"
                                onClick={() => window.open(item.imagen_url!, '_blank')}
                              />
                            </div>
                          )}
                        </div>
                        {requisition.status !== 'CERRADA' && requisition.status !== 'CANCELADA' && (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => startEditingItem(item)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition text-xs whitespace-nowrap"
                            >
                              <Edit2 className="w-3 h-3" />
                              Editar
                            </button>
                            {item.status !== 'SURTIDO' && (
                              <button
                                onClick={() => handleMarkItemReceived(item.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 text-xs whitespace-nowrap"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Surtido
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Historial
            </h3>

            <div className="space-y-2">
              {requisition.history && requisition.history.length > 0 ? (
                requisition.history.map((log) => (
                  <div
                    key={log.id}
                    className="bg-gradient-to-br from-white to-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {log.status && (
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-1 bg-gradient-to-r ${getStatusColor(log.status)} text-white`}>
                            {log.status}
                          </span>
                        )}
                        {log.comment && (
                          <p className="text-sm text-slate-700 mt-1">{log.comment}</p>
                        )}
                        {log.performed_by_nombre && (
                          <p className="text-xs text-slate-500 mt-1">Por: {log.performed_by_nombre}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No hay historial</p>
              )}
            </div>

            {requisition.status !== 'CERRADA' && requisition.status !== 'CANCELADA' && (
              <form onSubmit={handleAddStatus} className="flex gap-2">
                <input
                  type="text"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Agregar comentario al historial..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
                />
                <button
                  type="submit"
                  disabled={submitting || !statusComment.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
