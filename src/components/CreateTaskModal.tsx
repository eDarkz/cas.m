import { useState, useRef } from 'react';
import { api, Supervisor } from '../lib/api';
import { X, Upload, Trash2 } from 'lucide-react';
import { getToday } from '../lib/utils';

interface CreateTaskModalProps {
  supervisors: Supervisor[];
  defaultSupervisorId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTaskModal({ supervisors, defaultSupervisorId, onClose, onSuccess }: CreateTaskModalProps) {
  const [formData, setFormData] = useState({
    supervisorId: defaultSupervisorId || supervisors[0]?.id || 0,
    titulo: '',
    actividades: '',
    fecha: getToday(),
    cristal: false,
    imagen: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    console.group('📝 CreateTaskModal: Creating task');
    console.log('📦 Form data:', formData);

    try {
      console.log('➕ Creating note...');
      await api.createNote(formData);
      console.log('✅ Note created successfully');
      console.groupEnd();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ CreateTaskModal: Error creating note:', error);
      console.groupEnd();
      alert('Error al crear la tarea');
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
        setFormData({ ...formData, imagen: data.data.link });
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

  const handleRemoveImage = () => {
    setFormData({ ...formData, imagen: '' });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto transform transition-all duration-300">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 border-b border-blue-500 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-xl">
          <h3 className="text-lg sm:text-xl font-bold text-white drop-shadow-md">Nueva Tarea</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 transition-colors hover:scale-110 duration-200"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
              Asignar a *
            </label>
            <select
              required
              value={formData.supervisorId}
              onChange={(e) =>
                setFormData({ ...formData, supervisorId: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
            >
              {supervisors.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.kind === 'PROYECTO' ? '📁 ' : '👤 '}
                  {sup.nombre} {sup.alias ? `(${sup.alias})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              required
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              placeholder="Ej: Revisar caldera"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
              Actividades *
            </label>
            <textarea
              required
              value={formData.actividades}
              onChange={(e) => setFormData({ ...formData, actividades: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              placeholder="Describe las actividades a realizar..."
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
              Fecha *
            </label>
            <input
              type="date"
              required
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
              Imagen
            </label>

            {formData.imagen ? (
              <div className="space-y-2">
                <img
                  src={formData.imagen}
                  alt="Vista previa"
                  className="w-full max-h-48 object-cover rounded-lg border border-slate-300"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-size="18"%3EError al cargar imagen%3C/text%3E%3C/svg%3E';
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar imagen
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
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
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
                </button>
                <input
                  type="url"
                  value={formData.imagen}
                  onChange={(e) => setFormData({ ...formData, imagen: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                  placeholder="O pega una URL de imagen..."
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cristal"
              checked={formData.cristal}
              onChange={(e) => setFormData({ ...formData, cristal: e.target.checked })}
              className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
            />
            <label htmlFor="cristal" className="text-xs sm:text-sm font-medium text-slate-700">
              Marcar como urgente
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 hover:border-slate-400 transition-all duration-200 text-sm font-medium shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-lg"
            >
              {submitting ? 'Creando...' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
