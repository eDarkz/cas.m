import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import HamsterLoader from './HamsterLoader';

interface SaveStatusModalProps {
  isOpen: boolean;
  status: 'saving' | 'success' | 'error' | 'offline';
  message?: string;
  onClose: () => void;
}

export function SaveStatusModal({ isOpen, status, message, onClose }: SaveStatusModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-scale-in">
        <div className="flex flex-col items-center text-center gap-4">
          {status === 'saving' && (
            <>
              <HamsterLoader size="small" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Guardando...</h3>
                <p className="text-gray-600">Por favor espera mientras se guarda la inspección</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-900 mb-2">Guardado Exitoso</h3>
                <p className="text-gray-600">{message || 'La inspección se guardó correctamente'}</p>
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
              >
                Continuar
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900 mb-2">Error al Guardar</h3>
                <p className="text-gray-600">{message || 'No se pudo guardar la inspección'}</p>
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-8 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                Cerrar
              </button>
            </>
          )}

          {status === 'offline' && (
            <>
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-10 h-10 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-orange-900 mb-2">Sin Conexión</h3>
                <p className="text-gray-600">
                  No hay conexión a Internet. Por favor verifica tu conexión antes de guardar
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-8 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-colors"
              >
                Entendido
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
