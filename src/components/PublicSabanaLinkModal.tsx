import { useState } from 'react';
import { X, Copy, ExternalLink, CheckCircle2, Link as LinkIcon } from 'lucide-react';

interface PublicSabanaLinkModalProps {
  sabanaId: string;
  sabanaTitle: string;
  onClose: () => void;
}

export default function PublicSabanaLinkModal({ sabanaId, sabanaTitle, onClose }: PublicSabanaLinkModalProps) {
  const [copied, setCopied] = useState(false);

  const publicUrl = `${window.location.origin}/share-public-list-to/${sabanaId}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Error al copiar al portapapeles');
    }
  };

  const handleOpenUrl = () => {
    window.open(publicUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h3 className="text-xl font-bold text-white">Enlace Público</h3>
            <p className="text-sm text-cyan-100">{sabanaTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-cyan-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <LinkIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-gray-700">
                <p className="font-medium mb-1">Enlace Público de la Sábana</p>
                <p>Comparte este enlace con personas que necesiten ver o trabajar en esta sábana. No requiere inicio de sesión y tiene acceso completo para actualizar estados, agregar comentarios y subir fotos.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Pública
            </label>
            <div className="bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm text-gray-700 break-all border border-gray-200">
              {publicUrl}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopyUrl}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg hover:shadow-xl transition-all font-medium shadow-lg"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copiar Enlace
                </>
              )}
            </button>
            <button
              onClick={handleOpenUrl}
              className="flex items-center justify-center gap-2 bg-cyan-100 text-cyan-700 px-6 py-3 rounded-lg hover:bg-cyan-200 transition-colors font-medium"
            >
              <ExternalLink className="w-5 h-5" />
              Abrir
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Nota:</span> Cualquier persona con este enlace podrá acceder y modificar la sábana. Compártelo solo con personas de confianza.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
