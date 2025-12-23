import { Note } from '../lib/api';
import { Calendar, Clock, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import ImageGalleryModal from './ImageGalleryModal';

interface PrintableReportProps {
  supervisorName: string;
  notes: Note[];
  filters: {
    includePending: boolean;
    includeInProgress: boolean;
    includeCompleted: boolean;
    dateRange: string;
    customStartDate?: string;
    customEndDate?: string;
  };
}

export default function PrintableReport({ supervisorName, notes, filters }: PrintableReportProps) {
  console.log('📊 PrintableReport received:', {
    supervisorName,
    totalNotes: notes.length,
    filters,
    sampleNotes: notes.slice(0, 3).map(n => ({ id: n.id, titulo: n.titulo, estado: n.estado, fecha: n.fecha, imgs: n.imgs }))
  });

  const pendingNotes = filters.includePending ? notes.filter((n) => n.estado === 0) : [];
  const inProgressNotes = filters.includeInProgress ? notes.filter((n) => n.estado === 1) : [];
  const completedNotes = filters.includeCompleted ? notes.filter((n) => n.estado === 2) : [];

  console.log('📊 Separated by state:', {
    pending: pendingNotes.length,
    inProgress: inProgressNotes.length,
    completed: completedNotes.length
  });

  const getAllImages = (note: Note): { url: string; isFollowUp: boolean }[] => {
    const allImages: { url: string; isFollowUp: boolean }[] = [];

    if (note.imagen) {
      allImages.push({ url: note.imagen, isFollowUp: false });
    }

    if (note.imgs && note.imgs.length > 0) {
      allImages.push(...note.imgs.map(url => ({ url, isFollowUp: false })));
    }

    if (note.images && note.images.length > 0) {
      allImages.push(...note.images.map(img => ({ url: img.url, isFollowUp: true })));
    }

    return allImages;
  };

  const getDaysActive = (fecha: string) => {
    const noteDate = new Date(fecha);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - noteDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDateRangeText = () => {
    switch (filters.dateRange) {
      case 'today':
        return 'Hoy';
      case 'week':
        return 'Última semana';
      case 'month':
        return 'Último mes';
      case 'all':
        return 'Todas las fechas';
      case 'custom':
        return `${filters.customStartDate} - ${filters.customEndDate}`;
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 print:bg-white">
      <style>
        {`
          @media print {
            @page {
              size: letter;
              margin: 0.5in;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              background: white !important;
            }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
            .avoid-break { page-break-inside: avoid; }
            /* Asegurar blancos sólidos para papel */
            .print-glass {
              background: #ffffff !important;
              box-shadow: none !important;
              border-color: #e5e7eb !important; /* slate-200 */
            }
            .print-clear { background: transparent !important; }
            .no-shadow-print { box-shadow: none !important; }
          }
        `}
      </style>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Encabezado glass claro */}
        <div className="print-glass rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-xl shadow-xl ring-1 ring-slate-100 mb-6">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white/80 backdrop-blur p-2 ring-1 ring-slate-200 shadow-sm">
                <img
                  src="https://elinge.tech/seplc/logos/casm.png"
                  alt="CAS:M Logo"
                  className="h-12 w-auto"
                />
              </div>
              <div className="rounded-xl bg-white/80 backdrop-blur p-2 ring-1 ring-slate-200 shadow-sm">
                <img
                  src="https://elinge.tech/seplc/logos/seplclogo.png"
                  alt="Secrets Puerto Los Cabos"
                  className="h-12 w-auto"
                />
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-cyan-700">
                CAS:M Control Activities System
              </h1>
            </div>
          </div>
        </div>

        {/* Título y métricas */}
        <div className="print-glass rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-xl shadow-xl ring-1 ring-slate-100 p-6 mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 mb-3">
            Reporte de Actividades
          </h1>
          <div className="flex justify-between items-start text-sm text-slate-600">
            <div className="space-y-1">
              <p className="font-semibold text-base text-slate-800">
                Supervisor: <span className="font-bold">{supervisorName}</span>
              </p>
              <p><span className="text-slate-500">Período:</span> {getDateRangeText()}</p>
              <p>
                <span className="text-slate-500">Fecha de generación:</span>{' '}
                {new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mazatlan', 
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-lg font-semibold text-slate-800">Total de tareas: {notes.length}</p>
              {filters.includePending && <p className="text-amber-700">Pendientes: {pendingNotes.length}</p>}
              {filters.includeInProgress && <p className="text-cyan-700">En proceso: {inProgressNotes.length}</p>}
              {filters.includeCompleted && <p className="text-emerald-700">Terminadas: {completedNotes.length}</p>}
            </div>
          </div>
        </div>

        {/* Secciones */}
        {filters.includePending && pendingNotes.length > 0 && (
          <div className="mb-6">
            <div className="rounded-t-2xl bg-gradient-to-r from-amber-400/80 to-amber-300/80 text-amber-900 px-4 py-2.5 shadow-md backdrop-blur ring-1 ring-amber-200">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Pendientes ({pendingNotes.length})
              </h2>
            </div>
            <TaskTable notes={pendingNotes} getDaysActive={getDaysActive} getAllImages={getAllImages} />
          </div>
        )}

        {filters.includeInProgress && inProgressNotes.length > 0 && (
          <div className="mb-6">
            <div className="rounded-t-2xl bg-gradient-to-r from-cyan-400/80 to-sky-300/80 text-cyan-900 px-4 py-2.5 shadow-md backdrop-blur ring-1 ring-cyan-200">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                En Proceso ({inProgressNotes.length})
              </h2>
            </div>
            <TaskTable notes={inProgressNotes} getDaysActive={getDaysActive} getAllImages={getAllImages} />
          </div>
        )}

        {filters.includeCompleted && completedNotes.length > 0 && (
          <div className="mb-6">
            <div className="rounded-t-2xl bg-gradient-to-r from-emerald-400/80 to-emerald-300/80 text-emerald-900 px-4 py-2.5 shadow-md backdrop-blur ring-1 ring-emerald-200">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Terminadas ({completedNotes.length})
              </h2>
            </div>
            <TaskTable notes={completedNotes} getDaysActive={getDaysActive} getAllImages={getAllImages} />
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 text-center text-xs">
          <div className="inline-block px-4 py-3 rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur shadow-md ring-1 ring-slate-100 print-glass">
            <p className="text-slate-700">CAS:M Control Activities Center</p>
            <p className="text-slate-500">Dirección de Ingeniería - Secrets Puerto Los Cabos</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskTableProps {
  notes: Note[];
  getDaysActive: (fecha: string) => number;
  getAllImages: (note: Note) => { url: string; isFollowUp: boolean }[];
}

function TaskTable({ notes, getDaysActive, getAllImages }: TaskTableProps) {
  const [selectedImages, setSelectedImages] = useState<Array<{ id: number; url: string; created_at: string }> | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const handleImageClick = (images: { url: string; isFollowUp: boolean }[], startIndex: number) => {
    const formattedImages = images.map((img, idx) => ({
      id: idx,
      url: img.url,
      created_at: new Date().toISOString()
    }));
    setSelectedImages(formattedImages);
    setSelectedImageIndex(startIndex);
  };

  // helper para dividir en filas de 10
  const chunkArray = <T,>(arr: T[], size = 10): T[][] =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    );

  return (
    <>
      {selectedImages && (
        <ImageGalleryModal
          images={selectedImages}
          onClose={() => setSelectedImages(null)}
          initialIndex={selectedImageIndex}
        />
      )}
      <div className="overflow-hidden rounded-b-2xl border border-slate-200/80 bg-white/70 backdrop-blur-xl shadow-xl ring-1 ring-slate-100 print-glass">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
            <th className="px-3 py-3 text-left font-semibold w-8">#</th>
            <th className="px-3 py-3 text-left font-semibold">Tarea / Actividades</th>
            <th className="px-3 py-3 text-left font-semibold w-24">Fecha</th>
            <th className="px-3 py-3 text-left font-semibold w-20">Días</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note, index) => {
            const daysActive = getDaysActive(note.fecha);
            const images = getAllImages(note) || [];
            const primaryImages = images.filter((img: any) => !img.isFollowUp);
            const followUpImages = images.filter((img: any) => img.isFollowUp);
            const hasImages = primaryImages.length > 0 || followUpImages.length > 0;

            const Thumb = ({ img, idx, isFollowUp = false, allImages, currentIdx }: any) => (
              <button
                onClick={() => handleImageClick(allImages, currentIdx)}
                className="relative group print:pointer-events-none"
              >
                <img
                  src={img.url}
                  alt={`${isFollowUp ? 'Seguimiento — ' : ''}${note.titulo} - ${idx + 1}`}
                  className={`w-[250px] h-[250px] object-cover rounded-lg border ${
                    isFollowUp ? 'border-cyan-300' : 'border-slate-300'
                  } shadow-sm hover:shadow-xl hover:scale-105 transition-all duration-200 bg-white cursor-pointer`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23e5e7eb" width="80" height="80"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="12"%3E%E2%9D%8C%3C/text%3E%3C/svg%3E';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center print:hidden">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2">
                    <ImageIcon className="w-6 h-6 text-gray-800" />
                  </div>
                </div>
              </button>
            );

            return [
              // Fila principal
              (
                <tr
                  key={note.id}
                  className={`${hasImages ? 'border-b-0' : ''} border-b border-slate-200 hover:bg-slate-50 transition-colors avoid-break`}
                >
                  <td className="px-3 py-3 align-top">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-200 text-slate-700 rounded-full font-bold text-[11px] ring-1 ring-slate-300">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="space-y-1">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-800">{note.titulo}</h4>
                        {!!note.cristal && (
                          <span
                            aria-label="Marcado como urgente"
                            title="Marcado como urgente"
                            className={[
                              // layout
                              "inline-flex items-center gap-1 font-semibold rounded-full",
                              "px-2 py-0.5 text-[10px]",
                              // color (pantalla)
                              "bg-red-600 text-white ring-1 ring-red-500/30 shadow",
                              // sutil brillo y pulso solo si el usuario no prefiere reducir animaciones
                              "motion-safe:animate-pulse",
                              // accesibilidad/contraste y modos
                              "dark:bg-red-600 dark:text-white",
                              // impresión (quitar color y sombras, alto contraste)
                              "print:bg-transparent print:text-black print:ring-0 print:shadow-none",
                              "print:border print:border-black print:px-2 print:py-[2px]"
                            ].join(" ")}
                          >
                            <AlertCircle className="w-3 h-3 print:hidden" />
                            <span className="tracking-wide">URGENTE</span>
                            {/* En impresión añadimos un símbolo para destacar sin color */}
                            <span className="hidden print:inline font-bold ml-1">⚠︎</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {note.actividades}
                      </p>
                      {note.comment && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800 font-medium">💬 {note.comment}</p>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-center gap-1 text-xs text-slate-700">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        {new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(note.fecha))}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-center gap-1 text-xs text-slate-700">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span>{daysActive}d</span>
                    </div>
                  </td>
                </tr>
              ),

              // Fila de imágenes (si hay)
              hasImages ? (
                <tr
                  key={`${note.id}-images`}
                  className="border-b border-slate-200 hover:bg-slate-50/70 transition-colors avoid-break"
                >
                  <td className="px-3 pb-3 pt-0 align-top" />
                  <td className="px-3 pb-3 pt-0 align-top" colSpan={3}>
                    <div className="ml-10 space-y-3">
                      {/* Fotos de pendiente */}
                      {primaryImages.length > 0 && (
                        <div>
                          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded px-2 py-1">
                            Foto Pendiente
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {primaryImages.map((img: any, idx: number) => (
                              <Thumb key={idx} img={img} idx={idx} allImages={images} currentIdx={idx} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fotos de seguimiento */}
                      {followUpImages.length > 0 && (
                        <div>
                          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                            Imágenes de Seguimiento
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {followUpImages.map((img: any, idx: number) => (
                              <Thumb key={idx} img={img} idx={idx} isFollowUp allImages={images} currentIdx={primaryImages.length + idx} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : null,
            ];
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}
