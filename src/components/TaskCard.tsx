import { Note } from '../lib/api';
import { Calendar, User, ChevronDown, ChevronUp, Image as ImageIcon, Clock } from 'lucide-react';
import { useState } from 'react';

interface TaskCardProps {
  note: Note;
  onStateChange: (noteId: string, newState: 0 | 1 | 2) => void;
  onViewDetails?: (noteId: string) => void;
  isDragging?: boolean;
}

export default function TaskCard({ note, onViewDetails, isDragging }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getDaysActive = () => {
    const noteDate = new Date(note.fecha);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - noteDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getAgeStyles = () => {
    if (note.estado === 2) return { border: '', background: '', buttonClass: '' };
    const days = getDaysActive();
    if (days > 14) return {
      border: 'border-l-4 border-l-red-600',
      background: 'bg-gradient-to-r from-red-50 to-transparent',
      buttonClass: 'bg-gradient-to-r from-red-600 to-rose-600'
    };
    if (days > 7) return {
      border: 'border-l-4 border-l-orange-500',
      background: 'bg-gradient-to-r from-orange-50 to-transparent',
      buttonClass: 'bg-gradient-to-r from-orange-600 to-amber-600'
    };
    return { border: '', background: '', buttonClass: 'bg-gradient-to-r from-blue-600 to-cyan-600' };
  };

  const daysActive = getDaysActive();
  const showDaysActive = note.estado === 0 || note.estado === 1;
  const ageStyles = getAgeStyles();

  return (
    <div
      className={`rounded-lg border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-white hover:scale-[1.02] ${
        isDragging ? 'opacity-50 rotate-2' : ''
      } ${ageStyles.border} ${ageStyles.background}`}
    >
      <div
        className="p-2.5 lg:p-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-xs lg:text-sm text-slate-800 line-clamp-2 lg:truncate">{note.titulo.toLocaleUpperCase()}</h4>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {note.cristal ? (
              <span className="text-[10px] lg:text-xs bg-gradient-to-r from-red-600 to-rose-600 text-white px-1.5 lg:px-2 py-0.5 rounded-full font-medium shadow-md animate-pulse">
                URGENTE 
              </span>
            ) : null}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </div>

        <p className="text-[11px] lg:text-xs text-slate-600 mt-1 line-clamp-2">{note.actividades}</p>

        {showDaysActive && (
          <div className={`flex items-center gap-1 mt-1.5 lg:mt-2 px-1.5 lg:px-2 py-1 rounded-md shadow-sm ${
            daysActive > 14 ? 'bg-gradient-to-r from-red-100 to-rose-100' : daysActive > 7 ? 'bg-gradient-to-r from-orange-100 to-amber-100' : 'bg-gradient-to-r from-slate-100 to-slate-50'
          }`}>
            <Clock className={`w-3 h-3 flex-shrink-0 ${
              daysActive > 14 ? 'text-red-600' : daysActive > 7 ? 'text-orange-600' : 'text-slate-500'
            }`} />
            <span className={`text-[10px] lg:text-xs font-semibold ${
              daysActive > 14 ? 'text-red-700' : daysActive > 7 ? 'text-orange-700' : 'text-slate-600'
            }`}>
              {daysActive} {daysActive === 1 ? 'día' : 'días'} activo
            </span>
          </div>
        )}

        {expanded && (
          <div className="mt-2 lg:mt-3 space-y-2 border-t pt-2">
            <p className="text-[11px] lg:text-xs text-slate-700 whitespace-pre-wrap">{note.actividades}</p>

            <div className="flex flex-wrap gap-1.5 lg:gap-2 text-[10px] lg:text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{note.fecha}</span>
              </div>
              {note.supervisor_nombre && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{note.supervisor_nombre}</span>
                </div>
              )}
              {note.imagen && (
                <div className="flex items-center gap-1 text-cyan-600">
                  <ImageIcon className="w-3 h-3" />
                  <span>Con imagen</span>
                </div>
              )}
            </div>

            {note.comment && (
              <div className="text-[11px] lg:text-xs text-slate-600 bg-gradient-to-br from-slate-50 to-slate-100 p-2 rounded border border-slate-200 shadow-sm">
                {note.comment}
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('🔍 TaskCard: Ver detalles clicked for note:', note.id);
                console.log('🔍 TaskCard: onViewDetails exists?', !!onViewDetails);
                onViewDetails?.(note.id);
              }}
              className={`w-full text-xs lg:text-sm ${ageStyles.buttonClass || 'bg-gradient-to-r from-blue-600 to-cyan-600'} text-white px-3 py-2 lg:py-2.5 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 mt-2 font-medium shadow-md`}
            >
              Ver detalles completos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
