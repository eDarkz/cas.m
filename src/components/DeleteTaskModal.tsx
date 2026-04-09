import { useState } from 'react';
import { X, AlertTriangle, Lock, Trash2, Eye, EyeOff } from 'lucide-react';
import { verifyAdminPassword } from '../lib/auth';
import HamsterLoader from './HamsterLoader';

interface DeleteTaskModalProps {
  noteTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function DeleteTaskModal({ noteTitle, onConfirm, onCancel }: DeleteTaskModalProps) {
  const [step, setStep] = useState<'password' | 'confirm'>('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('Ingresa la contraseña de administrador');
      return;
    }
    if (verifyAdminPassword(password)) {
      setPasswordError('');
      setStep('confirm');
    } else {
      setPasswordError('Contraseña incorrecta. Acceso denegado.');
      setPassword('');
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">

        {step === 'password' ? (
          <>
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight">Verificacion de Administrador</h2>
                  <p className="text-xs text-slate-300">Se requiere contrasena para eliminar</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyPassword} className="p-6 space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Tarea a eliminar:</p>
                <p className="text-sm font-semibold text-slate-800 line-clamp-2">{noteTitle}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contrasena de administrador
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError('');
                    }}
                    placeholder="Ingresa la contrasena..."
                    autoFocus
                    className={`w-full px-4 py-3 pr-11 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${
                      passwordError
                        ? 'border-red-400 focus:ring-red-300 bg-red-50'
                        : 'border-slate-300 focus:ring-slate-400 bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-lg hover:from-slate-800 hover:to-black transition-all text-sm font-medium"
                >
                  Verificar
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight">Confirmar eliminacion</h2>
                  <p className="text-xs text-red-200">Esta accion es irreversible</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                disabled={deleting}
                className="text-white hover:bg-white/20 rounded-full p-1.5 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-700 text-sm">
                Se eliminara permanentemente la siguiente tarea y todos sus datos asociados (comentarios, imagenes).
              </p>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-600 mb-1 font-medium">Tarea a eliminar:</p>
                <p className="text-sm font-semibold text-red-900 line-clamp-2">{noteTitle}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  <strong>Advertencia:</strong> Esta accion no se puede deshacer.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <HamsterLoader size="small" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Eliminar tarea
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
