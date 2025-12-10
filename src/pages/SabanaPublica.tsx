import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api, SabanaItem, SabanaItemDetail, SabanaSummary, Supervisor } from '../lib/api';
import { FileSpreadsheet, X, Upload, MessageCircle, Image as ImageIcon, Clock, AlertCircle } from 'lucide-react';

export default function SabanaPublica() {
  const { sabanaId } = useParams<{ sabanaId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sabanaTitle, setSabanaTitle] = useState<string>('');
  const [allItems, setAllItems] = useState<SabanaItem[]>([]);
  const [summary, setSummary] = useState<SabanaSummary | null>(null);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [filter, setFilter] = useState<'all' | 'PENDIENTE' | 'PROCESO' | 'TERMINADA'>('all');
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [searchRoom, setSearchRoom] = useState('');

  useEffect(() => {
    if (sabanaId) {
      loadSabana();
    }
  }, [sabanaId]);

  const loadSabana = async () => {
    if (!sabanaId) return;

    setLoading(true);
    setError(null);

    try {
      const [sabanaData, summaryData, itemsData, supervisorsData] = await Promise.all([
        api.getSabana(sabanaId),
        api.getSabanaSummary(sabanaId),
        api.getSabanaItems(sabanaId, { page: 1, pageSize: 500 }),
        api.getSupervisors(),
      ]);

      setSabanaTitle(sabanaData.titulo);
      setSummary(summaryData);
      setAllItems(itemsData);
      setSupervisors(supervisorsData);
    } catch (err: any) {
      console.error('Error loading sabana:', err);
      setError('No se pudo cargar la sábana.');
    } finally {
      setLoading(false);
    }
  };

  const getBuilding = (room: number) => Math.floor(room / 1000);
  const getFloor = (room: number) => Math.floor((room % 1000) / 100);

  const buildings = [...new Set(allItems.map(item => getBuilding(item.habitacion)))].sort();
  const floors = selectedBuilding !== null
    ? [...new Set(allItems.filter(item => getBuilding(item.habitacion) === selectedBuilding).map(item => getFloor(item.habitacion)))].sort()
    : [];

  const filteredItems = allItems.filter(item => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (selectedBuilding !== null && getBuilding(item.habitacion) !== selectedBuilding) return false;
    if (selectedFloor !== null && getFloor(item.habitacion) !== selectedFloor) return false;
    if (searchRoom && !item.habitacion.toString().includes(searchRoom)) return false;
    return true;
  });

  const getBuildingSummary = (building: number) => {
    const buildingItems = allItems.filter(item => getBuilding(item.habitacion) === building);
    const total = buildingItems.length;
    const terminadas = buildingItems.filter(item => item.estado === 'TERMINADA').length;
    const pendientes = buildingItems.filter(item => item.estado === 'PENDIENTE').length;
    const enProceso = buildingItems.filter(item => item.estado === 'PROCESO').length;
    const avance = total > 0 ? Math.round((terminadas / total) * 100) : 0;
    return { total, terminadas, pendientes, enProceso, avance };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando sábana...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-red-400/50 shadow-2xl">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Error de Acceso</h2>
            <p className="text-cyan-100">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <p className="text-white text-lg">No se encontró la sábana</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pb-20">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-cyan-600 to-blue-600 border-b-2 border-cyan-400 shadow-2xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                {sabanaTitle.toUpperCase()}
              </h1>
              <p className="text-sm text-cyan-100">Vista Pública - Solo Consulta</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="relative overflow-hidden rounded-xl p-4 backdrop-blur-xl bg-white/60 border border-slate-200/60 shadow-lg">
                <div className="text-2xl font-bold text-slate-700">{summary.total}</div>
                <div className="text-sm text-slate-600 font-medium">Total</div>
              </div>
              <div className="relative overflow-hidden rounded-xl p-4 backdrop-blur-xl bg-white/60 border border-orange-200/60 shadow-lg">
                <div className="text-2xl font-bold text-orange-700">{summary.pendientes}</div>
                <div className="text-sm text-orange-600 font-medium">Pendientes</div>
              </div>
              <div className="relative overflow-hidden rounded-xl p-4 backdrop-blur-xl bg-white/60 border border-cyan-200/60 shadow-lg">
                <div className="text-2xl font-bold text-cyan-700">{summary.en_proceso}</div>
                <div className="text-sm text-cyan-600 font-medium">En Proceso</div>
              </div>
              <div className="relative overflow-hidden rounded-xl p-4 backdrop-blur-xl bg-white/60 border border-blue-200/60 shadow-lg">
                <div className="text-2xl font-bold text-blue-700">{summary.terminadas}</div>
                <div className="text-sm text-blue-600 font-medium">Terminadas</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-cyan-100 mb-2">
                <span>Avance</span>
                <span className="font-semibold">{summary.avance_pct}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-3 rounded-full transition-all shadow-lg"
                  style={{ width: `${summary.avance_pct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl">
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md ${
                    filter === 'all'
                      ? 'bg-gradient-to-r from-slate-600 to-slate-800 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Todas ({summary.total})
                </button>
                <button
                  onClick={() => setFilter('PENDIENTE')}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md ${
                    filter === 'PENDIENTE'
                      ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Pendientes ({summary.pendientes})
                </button>
                <button
                  onClick={() => setFilter('PROCESO')}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md ${
                    filter === 'PROCESO'
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  En Proceso ({summary.en_proceso})
                </button>
                <button
                  onClick={() => setFilter('TERMINADA')}
                  className={`px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium shadow-md ${
                    filter === 'TERMINADA'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Terminadas ({summary.terminadas})
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Buscar habitación..."
                  value={searchRoom}
                  onChange={(e) => setSearchRoom(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-cyan-200/50 focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-sm"
                />
                <select
                  value={selectedBuilding ?? ''}
                  onChange={(e) => {
                    setSelectedBuilding(e.target.value ? parseInt(e.target.value) : null);
                    setSelectedFloor(null);
                  }}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-sm"
                >
                  <option value="">Todos los edificios</option>
                  {buildings.map(building => (
                    <option key={building} value={building}>Edificio {building}</option>
                  ))}
                </select>
                {selectedBuilding !== null && (
                  <select
                    value={selectedFloor ?? ''}
                    onChange={(e) => setSelectedFloor(e.target.value ? parseInt(e.target.value) : null)}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-sm"
                  >
                    <option value="">Todos los pisos</option>
                    {floors.map(floor => (
                      <option key={floor} value={floor}>Piso {floor}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {selectedBuilding !== null && (
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl">
              <h4 className="font-semibold text-white mb-3">Edificio {selectedBuilding}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                  <div className="text-xl font-bold text-white">{getBuildingSummary(selectedBuilding).total}</div>
                  <div className="text-xs text-cyan-100">Total</div>
                </div>
                <div className="bg-orange-500/20 backdrop-blur-sm rounded-xl p-3 border border-orange-400/30">
                  <div className="text-xl font-bold text-orange-300">{getBuildingSummary(selectedBuilding).pendientes}</div>
                  <div className="text-xs text-orange-200">Pendientes</div>
                </div>
                <div className="bg-cyan-500/20 backdrop-blur-sm rounded-xl p-3 border border-cyan-400/30">
                  <div className="text-xl font-bold text-cyan-300">{getBuildingSummary(selectedBuilding).enProceso}</div>
                  <div className="text-xs text-cyan-200">En Proceso</div>
                </div>
                <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-3 border border-blue-400/30">
                  <div className="text-xl font-bold text-blue-300">{getBuildingSummary(selectedBuilding).terminadas}</div>
                  <div className="text-xs text-blue-200">Terminadas</div>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-2 rounded-full transition-all"
                  style={{ width: `${getBuildingSummary(selectedBuilding).avance}%` }}
                />
              </div>
            </div>
          )}

          {selectedBuilding === null && selectedFloor === null && !searchRoom ? (
            <div className="space-y-6">
              {buildings.map(building => {
                const buildingRooms = filteredItems.filter(item => getBuilding(item.habitacion) === building);
                if (buildingRooms.length === 0) return null;

                return (
                  <div key={building} className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-white">Edificio {building}</h4>
                      <button
                        onClick={() => setSelectedBuilding(building)}
                        className="text-sm text-cyan-300 hover:text-cyan-100 font-medium"
                      >
                        Ver detalles →
                      </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                      {buildingRooms.map((item) => (
                        <SabanaItemCard
                          key={item.habitacion}
                          item={item}
                          onClick={() => setSelectedRoom(item.habitacion)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {filteredItems.map((item) => (
                <SabanaItemCard
                  key={item.habitacion}
                  item={item}
                  onClick={() => setSelectedRoom(item.habitacion)}
                />
              ))}
            </div>
          )}

          {filteredItems.length === 0 && allItems.length > 0 && (
            <div className="text-center py-8 text-cyan-100">
              No se encontraron habitaciones con los filtros seleccionados
            </div>
          )}
        </div>
      </div>

      {selectedRoom !== null && sabanaId && (
        <RoomDetailModal
          sabanaId={sabanaId}
          roomNumber={selectedRoom}
          supervisors={supervisors}
          onClose={() => setSelectedRoom(null)}
          onUpdate={loadSabana}
        />
      )}
    </div>
  );
}

interface SabanaItemCardProps {
  item: SabanaItem;
  onClick: () => void;
}

function SabanaItemCard({ item, onClick }: SabanaItemCardProps) {
  const statusStyles = {
    PENDIENTE: {
      background: '#818181',
      textColor: 'text-white',
    },
    PROCESO: {
      background: '#d56300',
      textColor: 'text-white',
    },
    TERMINADA: {
      background: '#bfff00',
      textColor: 'text-gray-900',
    },
  };

  const style = statusStyles[item.status];

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden p-3 rounded-xl transition-all hover:scale-105 hover:shadow-2xl ${style.textColor} font-bold text-lg shadow-lg`}
      style={{
        background: style.background,
      }}
    >
      {item.habitacion}
    </button>
  );
}

interface RoomDetailModalProps {
  sabanaId: string;
  roomNumber: number;
  supervisors: Supervisor[];
  onClose: () => void;
  onUpdate: () => void;
}

function RoomDetailModal({ sabanaId, roomNumber, supervisors, onClose, onUpdate }: RoomDetailModalProps) {
  const [detail, setDetail] = useState<SabanaItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<number>(supervisors[0]?.id || 1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    try {
      const data = await api.getSabanaItemDetail(sabanaId, roomNumber);
      setDetail(data);
    } catch (error) {
      console.error('Error loading room detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: 'PENDIENTE' | 'PROCESO' | 'TERMINADA') => {
    const statusMessages = {
      'PENDIENTE': 'HABITACIÓN MARCADA COMO PENDIENTE',
      'PROCESO': 'HABITACIÓN MARCADA COMO EN PROCESO',
      'TERMINADA': 'HABITACIÓN MARCADA COMO TERMINADA'
    };

    const finalComment = commentBody.trim()
      ? commentBody.toUpperCase()
      : statusMessages[status];

    setSubmitting(true);
    try {
      await api.updateSabanaItem(sabanaId, roomNumber, {
        status,
        comentario: finalComment,
        performedBy: selectedAuthor,
      });
      setCommentBody('');
      await loadDetail();
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentBody.trim() || submitting) return;

    setSubmitting(true);
    try {
      await api.addSabanaItemComment(sabanaId, roomNumber, {
        authorId: selectedAuthor,
        body: commentBody.toUpperCase(),
      });
      setCommentBody('');
      await loadDetail();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error al agregar comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formdata = new FormData();
      formdata.append('image', file);

      const response = await fetch('https://api.imgur.com/3/image/', {
        method: 'POST',
        headers: {
          Authorization: 'Client-ID 02a4ea9a28b0429',
        },
        body: formdata,
      });

      const data = await response.json();

      if (data.status === 200 && data.data?.link) {
        await api.addSabanaItemImage(sabanaId, roomNumber, data.data.link);
        await loadDetail();
        alert('Imagen subida exitosamente');
      } else {
        alert('Error al subir la imagen a Imgur');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const statusColors = {
    PENDIENTE: 'text-white',
    PROCESO: 'text-white',
    TERMINADA: 'text-gray-900',
  };

  const statusBackgrounds = {
    PENDIENTE: '#818181',
    PROCESO: '#d56300',
    TERMINADA: '#bfff00',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-cyan-400/50 shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-600 border-b-2 border-cyan-400 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Habitación {roomNumber}</h3>
            {detail && (
              <span
                className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[detail.status]}`}
                style={{ backgroundColor: statusBackgrounds[detail.status] }}
              >
                {detail.status}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-white hover:text-cyan-200 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
            </div>
          ) : !detail ? (
            <p className="text-center text-cyan-100 py-12">Error al cargar detalles</p>
          ) : (
            <>
              {detail.images && detail.images.length > 0 && (
                <div>
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-cyan-400" />
                    Fotos ({detail.images.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {detail.images.map((image) => (
                      <img
                        key={image.id}
                        src={image.url}
                        alt="Foto habitación"
                        className="w-full h-32 object-cover rounded-lg border-2 border-cyan-400/50"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  Historial ({detail.comments?.length || 0})
                </h4>
                <div className="space-y-3">
                  {!detail.comments || detail.comments.length === 0 ? (
                    <p className="text-cyan-200 text-center py-8 text-sm">No hay comentarios aún</p>
                  ) : (
                    detail.comments.map((entry) => (
                      <div key={entry.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-medium text-cyan-100">
                            {supervisors.find((s) => s.id === entry.author_id)?.nombre || 'Sistema'}
                          </span>
                          <span className="text-xs text-cyan-300">
                            {new Date(entry.created_at).toLocaleString('es-MX', { timeZone: 'America/Mazatlan' })}
                          </span>
                        </div>
                        <p className="text-sm text-white whitespace-pre-wrap">{entry.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-white/20 pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cyan-100 mb-2">Responsable</label>
                  <select
                    value={selectedAuthor}
                    onChange={(e) => setSelectedAuthor(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  >
                    {supervisors.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-100 mb-2">
                    Comentario o cambio de estado
                  </label>
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Describe el avance, problema o cambio..."
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white placeholder-cyan-200/50 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {detail.status !== 'PENDIENTE' && (
                    <button
                      onClick={() => handleStatusChange('PENDIENTE')}
                      disabled={submitting}
                      className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 shadow-lg"
                      style={{ backgroundColor: '#818181' }}
                    >
                      Marcar Pendiente
                    </button>
                  )}
                  {detail.status !== 'PROCESO' && (
                    <button
                      onClick={() => handleStatusChange('PROCESO')}
                      disabled={submitting}
                      className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 shadow-lg"
                      style={{ backgroundColor: '#d56300' }}
                    >
                      Iniciar Proceso
                    </button>
                  )}
                  {detail.status !== 'TERMINADA' && (
                    <button
                      onClick={() => handleStatusChange('TERMINADA')}
                      disabled={submitting}
                      className="px-4 py-2 text-gray-900 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 shadow-lg"
                      style={{ backgroundColor: '#bfff00' }}
                    >
                      Marcar Terminada
                    </button>
                  )}
                  <button
                    onClick={handleAddComment}
                    disabled={submitting || !commentBody.trim()}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4 inline mr-1" />
                    Solo Comentar
                  </button>
                </div>

                <div className="border-t border-white/20 pt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors disabled:bg-white/10 disabled:cursor-not-allowed shadow-lg border border-white/30"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingImage ? 'Subiendo...' : 'Subir foto'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
