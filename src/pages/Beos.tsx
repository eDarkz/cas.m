import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, List, AlertCircle, Plus, Edit2, Trash2, X, Monitor } from 'lucide-react';
import HamsterLoader from '../components/HamsterLoader';

interface BeoEvent {
  grupo: string;
  lugar: string;
  horariode: string;
  horarioa: string;
  actividades: string;
  fecha: string;
  uuid: string;
  id: number;
  fecha_date?: string | null;
}

type EventStatus = 'PROXIMO' | 'EN_CURSO' | 'FINALIZADO';

const TZ = 'America/Mazatlan';
const API_BASE = 'https://bsupers.fly.dev/v1/beosing';

const colorTokens = {
  blue:  { grad:'from-blue-600 to-cyan-600', icon:'text-blue-600',    border:'border-blue-200/60',  chip:'from-blue-100/50 to-cyan-200/30' },
  green: { grad:'from-emerald-600 to-teal-600', icon:'text-emerald-600', border:'border-emerald-200/60', chip:'from-emerald-100/50 to-teal-200/30' },
  orange:{ grad:'from-orange-600 to-amber-600', icon:'text-orange-600', border:'border-orange-200/60', chip:'from-orange-100/50 to-amber-200/30' },
  purple:{ grad:'from-slate-600 to-slate-800', icon:'text-slate-600',   border:'border-slate-200/60',  chip:'from-slate-100/50 to-slate-200/30' },
} as const;

type ColorKey = keyof typeof colorTokens;

const statusStyles: Record<EventStatus, string> = {
  PROXIMO:    'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  EN_CURSO:   'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  FINALIZADO: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

function sanitizeText(text: string) {
  return (text ?? '').replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseActivities(raw: string) {
  const cleaned = sanitizeText(raw);
  return cleaned.split('*').map(s => s.trim()).filter(Boolean);
}

function dateAtMidnightLocal(dateLike: string | Date) {
  if (typeof dateLike === 'string') {
    const [y, m, d] = dateLike.split('-').map(n => parseInt(n, 10));
    return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  }
  const d = new Date(dateLike);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function combineLocalDateTime(fecha: string, hhmm: string) {
  const [hRaw, mRaw = '00'] = (hhmm || '00:00').split(':');
  const h = String(parseInt(hRaw || '0', 10)).padStart(2, '0');
  const m = String(parseInt(mRaw || '0', 10)).padStart(2, '0');
  const [y, mo, da] = fecha.split('-').map(n => parseInt(n, 10));
  return new Date(y, (mo ?? 1) - 1, da ?? 1, parseInt(h, 10), parseInt(m, 10), 0, 0);
}

function formatLongDateES(fechaYYYYMMDD: string) {
  const [y, m, d] = fechaYYYYMMDD.split('-').map(n => parseInt(n, 10));
  const local = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  return local.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: TZ,
  });
}

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getTodayStatus(fecha: string, horariode: string, horarioa: string, now = new Date()): EventStatus | null {
  const evDateMid = dateAtMidnightLocal(fecha);
  const todayMid = dateAtMidnightLocal(now);
  if (!isSameLocalDay(evDateMid, todayMid)) return null;

  const start = combineLocalDateTime(fecha, horariode || '00:00');
  const end   = combineLocalDateTime(fecha, horarioa || horariode || '00:00');

  if (now < start) return 'PROXIMO';
  if (now >= start && now <= end) return 'EN_CURSO';
  return 'FINALIZADO';
}

export default function Beos() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<BeoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BeoEvent | null>(null);

  useEffect(() => {
    loadBeos();
  }, []);

  const loadBeos = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_BASE}/upcoming`, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: BeoEvent[] = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading BEOs:', err);
      setErrorMsg('No se pudieron obtener los BEOs. Revisa tu conexión o el servicio.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setShowModal(true);
  };

  const handleEdit = (event: BeoEvent) => {
    setEditingEvent(event);
    setShowModal(true);
  };

  const handleDelete = async (event: BeoEvent) => {
    if (!confirm(`¿Estás seguro de eliminar el evento "${event.grupo}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${event.uuid}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await loadBeos();
    } catch (err: any) {
      console.error('Error deleting BEO:', err);
      alert('Error al eliminar el evento');
    }
  };

  const categorized = useMemo(() => {
    const now = new Date();
    const todayMid = dateAtMidnightLocal(now);
    const tomorrowMid = new Date(todayMid); tomorrowMid.setDate(tomorrowMid.getDate() + 1);
    const dayAfterMid = new Date(todayMid); dayAfterMid.setDate(dayAfterMid.getDate() + 2);
    const thirdDayMid = new Date(todayMid); thirdDayMid.setDate(thirdDayMid.getDate() + 3);

    const today: BeoEvent[] = [];
    const tomorrow: BeoEvent[] = [];
    const dayAfter: BeoEvent[] = [];
    const future: BeoEvent[] = [];

    for (const ev of events) {
      const evDateMid = dateAtMidnightLocal(ev.fecha);

      if (evDateMid.getTime() === todayMid.getTime()) {
        today.push(ev);
      } else if (evDateMid.getTime() === tomorrowMid.getTime()) {
        tomorrow.push(ev);
      } else if (evDateMid.getTime() === dayAfterMid.getTime()) {
        dayAfter.push(ev);
      } else if (evDateMid.getTime() >= thirdDayMid.getTime()) {
        future.push(ev);
      }
    }

    const byStart = (a: BeoEvent, b: BeoEvent) =>
      combineLocalDateTime(a.fecha, a.horariode || '00:00').getTime() -
      combineLocalDateTime(b.fecha, b.horariode || '00:00').getTime();

    return {
      todayEvents: today.sort(byStart),
      tomorrowEvents: tomorrow.sort(byStart),
      dayAfterEvents: dayAfter.sort(byStart),
      futureEvents: future.sort(byStart),
    };
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <HamsterLoader />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
        <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
          Banquet Event Orders
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/beos-kiosk')}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-600 to-slate-800 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <Monitor className="w-5 h-5 drop-shadow-md" />
            Modo Kiosco
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <Plus className="w-5 h-5 drop-shadow-md" />
            Nuevo BEO
          </button>
          <button
            onClick={loadBeos}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300 font-medium shadow-lg"
          >
            <Calendar className="w-5 h-5 drop-shadow-md" />
            Actualizar
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm">{errorMsg}</p>
            <button
              onClick={loadBeos}
              className="mt-2 text-xs font-semibold underline underline-offset-4"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <EventSection
          title="Hoy"
          events={categorized.todayEvents}
          color="blue"
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <EventSection
          title="Mañana"
          events={categorized.tomorrowEvents}
          color="green"
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <EventSection
          title="Pasado Mañana"
          events={categorized.dayAfterEvents}
          color="orange"
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <EventSection
          title="Futuros"
          events={categorized.futureEvents}
          color="purple"
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {showModal && (
        <BeoModal
          event={editingEvent}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadBeos();
          }}
        />
      )}
    </div>
  );
}

interface EventSectionProps {
  title: string;
  events: BeoEvent[];
  color: ColorKey;
  onEdit: (event: BeoEvent) => void;
  onDelete: (event: BeoEvent) => void;
}

function EventSection({ title, events, color, onEdit, onDelete }: EventSectionProps) {
  const c = colorTokens[color];

  if (events.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-gray-200 p-4 shadow-lg">
        <h3 className={`text-lg font-bold bg-gradient-to-r ${c.grad} bg-clip-text text-transparent mb-3`}>
          {title}
        </h3>
        <p className="text-gray-400 text-center py-4">No hay eventos programados</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-gray-200 p-4 shadow-lg">
      <h3 className={`text-lg font-bold bg-gradient-to-r ${c.grad} bg-clip-text text-transparent mb-4`}>
        {title} ({events.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => {
          const activities = parseActivities(event.actividades);
          const status = getTodayStatus(event.fecha, event.horariode, event.horarioa);

          return (
            <div
              key={event.uuid}
              className={`relative overflow-hidden rounded-xl p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border ${c.border}`}
              style={{
                background: 'rgba(255, 255, 255, 0.13)',
                backdropFilter: 'blur(5px)',
                WebkitBackdropFilter: 'blur(5px)',
                boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
              }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${c.chip}`} />
              <div className="relative space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className={`text-base font-bold bg-gradient-to-r ${c.grad} bg-clip-text text-transparent flex-1`}>
                    {sanitizeText(event.grupo)}
                  </h4>

                  <div className="flex items-center gap-1">
                    {status && (
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${statusStyles[status]}`}
                        title={
                          status === 'PROXIMO' ? 'Aún no inicia' :
                          status === 'EN_CURSO' ? 'Se está llevando a cabo' :
                          'Ya finalizó'
                        }
                      >
                        {status === 'PROXIMO' ? 'PRÓXIMO' : status === 'EN_CURSO' ? 'EN CURSO' : 'FINALIZADO'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className={`w-4 h-4 ${c.icon} flex-shrink-0 mt-0.5`} />
                  <span className="text-sm font-semibold text-slate-700">
                    {sanitizeText(event.lugar)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${c.icon} flex-shrink-0`} />
                  <span className="text-sm font-medium text-slate-600">
                    {event.horariode} - {event.horarioa}
                  </span>
                </div>

                {activities.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <List className={`w-4 h-4 ${c.icon}`} />
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        Actividades
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {activities.map((activity, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-600 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-slate-400"
                        >
                          {activity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200">
                  <span className="text-xs text-slate-500 font-medium">
                    {formatLongDateES(event.fecha)}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => onEdit(event)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
                  >
                    <Edit2 className="w-3 h-3" />
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(event)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"
                  >
                    <Trash2 className="w-3 h-3" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface BeoModalProps {
  event: BeoEvent | null;
  onClose: () => void;
  onSuccess: () => void;
}

function BeoModal({ event, onClose, onSuccess }: BeoModalProps) {
  const [formData, setFormData] = useState({
    grupo: event?.grupo || '',
    lugar: event?.lugar || '',
    horariode: event?.horariode || '',
    horarioa: event?.horarioa || '',
    actividades: event?.actividades || '',
    fecha: event?.fecha || new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = event ? `${API_BASE}/${event.uuid}` : API_BASE;
      const method = event ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving BEO:', err);
      alert(`Error al guardar el evento: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">
            {event ? 'Editar BEO' : 'Nuevo BEO'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grupo / Evento *
            </label>
            <input
              type="text"
              required
              value={formData.grupo}
              onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre del grupo o evento"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lugar *
            </label>
            <input
              type="text"
              required
              value={formData.lugar}
              onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ubicación del evento"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha *
            </label>
            <input
              type="date"
              required
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de inicio *
              </label>
              <input
                type="time"
                required
                value={formData.horariode}
                onChange={(e) => setFormData({ ...formData, horariode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de fin *
              </label>
              <input
                type="time"
                required
                value={formData.horarioa}
                onChange={(e) => setFormData({ ...formData, horarioa: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actividades *
            </label>
            <textarea
              required
              value={formData.actividades}
              onChange={(e) => setFormData({ ...formData, actividades: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={5}
              placeholder="Separa cada actividad con un asterisco (*)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ejemplo: Registro * Desayuno * Conferencia * Almuerzo
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Guardando...' : event ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
