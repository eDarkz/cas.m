import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface ImageGalleryModalProps {
  images: Array<{
    id: number;
    url: string;
    created_at: string;
  }>;
  onClose: () => void;
  initialIndex?: number;
}

export default function ImageGalleryModal({ images, onClose, initialIndex = 0 }: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = () => {
    const img = images[currentIndex];
    window.open(img.url, '_blank');
  };

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-4 z-[9999]">
      <div className="relative w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="text-white">
            <h2 className="text-2xl font-bold">Galería de Imágenes</h2>
            <p className="text-sm text-gray-300">
              {currentIndex + 1} de {images.length}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              title="Descargar imagen"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center relative min-h-0">
          {images.length > 1 && (
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <img
            src={currentImage.url}
            alt={`Imagen ${currentIndex + 1}`}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
            style={{ maxHeight: 'calc(100vh - 250px)' }}
          />

          {images.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {images.length > 1 && (
          <div className="mt-4 flex gap-2 justify-center overflow-x-auto pb-2">
            {images.map((img, index) => (
              <button
                key={img.id}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-blue-500 scale-110'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <img
                  src={img.url}
                  alt={`Miniatura ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 text-center text-sm text-gray-400">
          <p>
            Capturada: {new Date(currentImage.created_at).toLocaleString('es-MX', {
              timeZone: 'America/Mazatlan',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}
