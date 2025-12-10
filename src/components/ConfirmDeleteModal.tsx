import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
  title: string;
  message: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDeleteModal({
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
  loading = false
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-700">{message}</p>
          {itemName && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Se eliminará:</p>
              <p className="font-semibold text-gray-900">{itemName}</p>
            </div>
          )}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
