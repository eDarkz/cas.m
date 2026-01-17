import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workingOrdersAPI, WorkingOrderDetail as WODetail, WorkingOrderStatus } from '../lib/workingOrders';
import { ArrowLeft, Clock, User, Calendar, CheckCircle2, Image as ImageIcon, MessageSquare, FileText, UserPlus, CheckCircle } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';
import AssignWorkingOrderModal from '../components/AssignWorkingOrderModal';

export default function WorkingOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<WODetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    if (!id) return;
    try {
      const data = await workingOrdersAPI.getById(id);
      setOrder(data);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleAssign = async (supervisorId: number, note: string, fecha: string) => {
    if (!id) return;
    try {
      await workingOrdersAPI.assignWithNote(id, supervisorId, note, fecha);
      await loadOrder();
    } catch (error) {
      console.error('Error assigning order:', error);
      throw error;
    }
  };

  const handleResolve = async () => {
    if (!id || updating) return;
    if (!confirm('¿Marcar esta Working Order como RESUELTA?')) return;
    setUpdating(true);
    try {
      await workingOrdersAPI.resolveWorkingOrder(id, undefined, 'Marcada como resuelta');
      await loadOrder();
    } catch (error) {
      console.error('Error resolving order:', error);
      alert('Error al resolver la orden');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) return;
    try {
      await workingOrdersAPI.addComment(id, newComment);
      setNewComment('');
      await loadOrder();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAddImage = async () => {
    if (!id || !newImageUrl.trim()) return;
    try {
      await workingOrdersAPI.addImage(id, newImageUrl);
      setNewImageUrl('');
      await loadOrder();
    } catch (error) {
      console.error('Error adding image:', error);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center h-screen">
        <HamsterLoader />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/working-orders')} className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl lg:text-2xl font-bold text-slate-900">Working Order - Hab {order.room_number}</h2>
          <p className="text-sm text-slate-600 mt-1">{order.summary.toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-lg mb-4">Detalles</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Estancia: {order.stay_from} → {order.stay_to}</span>
              </div>
              {order.assigned_nombre && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Asignado: {order.assigned_nombre}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Creado: {new Date(order.created_at).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })}</span>
              </div>
            </div>
            {order.detail && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">{order.detail}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comentarios
            </h3>
            <div className="space-y-3 mb-4">
              {order.comments.map((c) => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{c.author_nombre || 'Sistema'}</span>
                    <span className="text-xs text-slate-500">{new Date(c.created_at).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })}</span>
                  </div>
                  <p className="text-sm text-slate-700">{c.body}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Agregar comentario..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button onClick={handleAddComment} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Enviar
              </button>
            </div>
          </div>

          {order.images.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Imágenes ({order.images.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {order.images.map((img) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer">
                    <img src={img.url} alt="WO" className="w-full h-32 object-cover rounded-lg border border-slate-200 hover:border-blue-400" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-lg mb-4">Acciones Rápidas</h3>
            <div className="space-y-2">
              {(order.status === 'OPEN' || !order.assigned_to) && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Asignar
                </button>
              )}
              {order.status !== 'RESOLVED' && order.status !== 'DISMISSED' && (
                <button
                  onClick={handleResolve}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  Resolver
                </button>
              )}
              {(order.status === 'RESOLVED' || order.status === 'DISMISSED') && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <p className="text-sm text-slate-600 font-medium">
                    {order.status === 'RESOLVED' ? '✓ Orden Resuelta' : '✗ Orden Descartada'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Historial
            </h3>
            <div className="space-y-2">
              {order.statusLogs.map((log) => (
                <div key={log.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span className="font-medium">{log.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 ml-5">{new Date(log.created_at).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })}</p>
                  {log.note && <p className="text-xs text-slate-600 ml-5">{log.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AssignWorkingOrderModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={handleAssign}
        roomNumber={order.room_number}
        summary={order.summary}
      />
    </div>
  );
}
