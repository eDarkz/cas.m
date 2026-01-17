import { useEffect, useState, useRef } from 'react';
import { X, Calendar, User, MessageCircle, Send, Image as ImageIcon, Upload, Check, Clock, AlertCircle } from 'lucide-react';
import HamsterLoader from './HamsterLoader';
import { api, Note, NoteComment, Supervisor } from '../lib/api';

interface TaskDetailsModalProps {
  noteId: string;
  onClose: () => void;
  supervisors: Supervisor[];
  onStateChange?: (noteId: string, newState: 0 | 1 | 2) => void;
}

export default function TaskDetailsModal({ noteId, onClose, supervisors, onStateChange }: TaskDetailsModalProps) {
  const [note, setNote] = useState<(Note & { images: any[]; comments: NoteComment[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNoteDetails();
  }, [noteId]);

  const loadNoteDetails = async () => {
    try {
      const data = await api.getNoteById(noteId);
      setNote(data);
    } catch (error) {
      console.error('Error loading note details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newState: 0 | 1 | 2) => {
    if (!note) return;

    try {
      await api.updateNote(noteId, { estado: newState });
      setNote({ ...note, estado: newState });

      if (onStateChange) {
        onStateChange(noteId, newState);
      }
    } catch (error) {
      console.error('Error updating note status:', error);
      alert('Error al actualizar el estado de la tarea');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim() || submitting) return;

    setSubmitting(true);
    try {
      await api.addNoteComment(noteId, commentBody);
      setCommentBody('');
      await loadNoteDetails();
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
        await api.addNoteImage(noteId, data.data.link);
        await loadNoteDetails();
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

  const getSupervisorName = (supervisorId: number) => {
    const supervisor = supervisors.find((s) => s.id === supervisorId);
    return supervisor?.alias || supervisor?.nombre || 'Desconocido';
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <HamsterLoader />
        </div>
      </div>
    );
  }

  if (!note) {
    return null;
  }

  const statusColors = {
    0: 'bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 shadow-sm',
    1: 'bg-gradient-to-r from-cyan-100 to-blue-100 text-blue-800 shadow-sm',
    2: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 shadow-sm',
  };

  const statusLabels = {
    0: 'Pendiente',
    1: 'En Proceso',
    2: 'Terminada',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto transform transition-all duration-300">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 border-b border-blue-500 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-xl">
          <h3 className="text-lg sm:text-xl font-bold text-white drop-shadow-md">Detalles de Tarea</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 transition-colors hover:scale-110 duration-200"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">{note.titulo}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full font-medium ${statusColors[note.estado]}`}>
                    {statusLabels[note.estado]}
                  </span>
                  {note.cristal && (
                    <span className="text-xs sm:text-sm bg-red-600 text-white px-2 sm:px-3 py-1 rounded-full font-medium">
                      URGENTE
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-slate-50">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3">Cambiar Estado</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleStatusChange(0)}
                  disabled={note.estado === 0}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                    note.estado === 0
                      ? 'bg-orange-600 text-white shadow-md cursor-not-allowed'
                      : 'bg-white border-2 border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 hover:shadow-md'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Pendiente
                </button>
                <button
                  onClick={() => handleStatusChange(1)}
                  disabled={note.estado === 1}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                    note.estado === 1
                      ? 'bg-cyan-600 text-white shadow-md cursor-not-allowed'
                      : 'bg-white border-2 border-cyan-300 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-400 hover:shadow-md'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  En Proceso
                </button>
                <button
                  onClick={() => handleStatusChange(2)}
                  disabled={note.estado === 2}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                    note.estado === 2
                      ? 'bg-emerald-600 text-white shadow-md cursor-not-allowed'
                      : 'bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-md'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Terminada
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>Fecha: {note.fecha}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Supervisor: {note.supervisor_nombre || getSupervisorName(note.supervisor_id)}</span>
              </div>
            </div>

            <div className="border-t pt-3 sm:pt-4">
              <h4 className="font-semibold text-sm sm:text-base text-slate-800 mb-2">Actividades</h4>
              <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap">{note.actividades}</p>
            </div>

            {note.imagen && (
              <div className="border-t pt-3 sm:pt-4">
                <h4 className="font-semibold text-sm sm:text-base text-slate-800 mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Imagen
                </h4>
                <img
                  src={note.imagen}
                  alt="Imagen de la tarea"
                  className="rounded-lg max-w-full h-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {note.images && note.images.length > 0 && (
              <div className="border-t pt-3 sm:pt-4">
                <h4 className="font-semibold text-sm sm:text-base text-slate-800 mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Imágenes adicionales
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {note.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img.url}
                      alt={`Imagen ${idx + 1}`}
                      className="rounded-lg w-full h-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 sm:pt-6">
            <h4 className="font-semibold text-sm sm:text-base text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              Comentarios y Avances ({note.comments.length})
            </h4>

            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              {note.comments.length === 0 ? (
                <p className="text-slate-400 text-center py-6 sm:py-8 text-sm">No hay comentarios aún</p>
              ) : (
                note.comments.map((comment) => (
                  <div key={comment.id} className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500" />
                        <span className="text-xs sm:text-sm font-medium text-slate-700">
                          {comment.author_id ? getSupervisorName(comment.author_id) : 'Sistema'}
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-xs text-slate-500">{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">{comment.body}</p>
                    {comment.mentions && comment.mentions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {comment.mentions.map((mention, idx) => (
                          <span key={idx} className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            @{mention}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex gap-2">
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
                  className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 sm:px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
                </button>
              </div>

              <form onSubmit={handleSubmitComment} className="space-y-3">
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Agregar comentario o avance... Usa @alias para mencionar"
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none text-xs sm:text-sm"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !commentBody.trim()}
                    className="flex items-center gap-2 bg-cyan-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-xs sm:text-sm font-medium"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Enviando...' : 'Enviar comentario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
