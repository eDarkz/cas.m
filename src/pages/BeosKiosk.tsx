import { useEffect, useMemo, useState, useRef } from 'react';
import { Calendar, Clock, MapPin, List, Sun, CloudSun, CalendarDays, Rocket } from 'lucide-react';

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
  const end = combineLocalDateTime(fecha, horarioa || horariode || '00:00');

  if (now < start) return 'PROXIMO';
  if (now >= start && now <= end) return 'EN_CURSO';
  return 'FINALIZADO';
}

function hashHue(str: string): number {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

export default function BeosKiosk() {
  const [events, setEvents] = useState<BeoEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDay, setCurrentDay] = useState(new Date().getDate());

  useEffect(() => {
    loadBeos();

    const timeInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (now.getDate() !== currentDay) {
        setCurrentDay(now.getDate());
      }
    }, 1000);

    const refreshInterval = setInterval(() => {
      loadBeos();
    }, 3600000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(refreshInterval);
    };
  }, [currentDay]);

  const loadBeos = async () => {
    try {
      const response = await fetch(`${API_BASE}/upcoming`, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: BeoEvent[] = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading BEOs:', err);
    }
  };

  const categorized = useMemo(() => {
    const todayMid = dateAtMidnightLocal(new Date());
    const tomorrowMid = new Date(todayMid);
    tomorrowMid.setDate(tomorrowMid.getDate() + 1);
    const dayAfterMid = new Date(todayMid);
    dayAfterMid.setDate(dayAfterMid.getDate() + 2);
    const thirdDayMid = new Date(todayMid);
    thirdDayMid.setDate(thirdDayMid.getDate() + 3);

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
  }, [events, currentDay]);

  const formattedTime = currentTime.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: TZ,
  });

  const formattedDate = currentTime
    .toLocaleDateString('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: TZ,
    })
    .toUpperCase();

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="px-6 pt-6 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src="https://elinge.tech/seplc/logos/casm.png"
            alt="CAS:M LOGO"
            className="h-16 w-auto md:h-20 select-none pointer-events-none drop-shadow"
          />
          <h1 className="text-2xl md:text-3xl font-extrabold leading-tight text-white uppercase tracking-wide">
            CAS:M - (BEO'S) PARA MANTENIMIENTO SECRETS PUERTO LOS CABOS
          </h1>
        </div>

        <div className="flex items-center gap-4 whitespace-nowrap">
          <div className="flex items-center gap-2 text-2xl md:text-3xl font-extrabold leading-none text-white uppercase">
            <Clock className="w-5 h-5 opacity-80" />
            <span className="tabular-nums">{formattedTime}</span>
            <span className="opacity-60">·</span>
            <Calendar className="w-5 h-5 opacity-80" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 px-6 pb-6 flex-1 min-h-0 overflow-hidden">
        <KioskSection
          title="HOY"
          icon={<Sun className="w-4 h-4" />}
          events={categorized.todayEvents}
          color="green"
          currentTime={currentTime}
        />
        <KioskSection
          title="MAÑANA"
          icon={<CloudSun className="w-4 h-4" />}
          events={categorized.tomorrowEvents}
          color="sky"
          currentTime={currentTime}
        />
        <KioskSection
          title="PASADO MAÑANA"
          icon={<CalendarDays className="w-4 h-4" />}
          events={categorized.dayAfterEvents}
          color="violet"
          currentTime={currentTime}
        />
        <KioskSection
          title="FUTURO"
          icon={<Rocket className="w-4 h-4" />}
          events={categorized.futureEvents}
          color="amber"
          currentTime={currentTime}
        />
      </main>
    </div>
  );
}

interface KioskSectionProps {
  title: string;
  icon: React.ReactNode;
  events: BeoEvent[];
  color: 'green' | 'sky' | 'violet' | 'amber';
  currentTime: Date;
}

function KioskSection({ title, icon, events, color, currentTime }: KioskSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);
  const [needsDuplication, setNeedsDuplication] = useState(false);

  const colorClasses = {
    green: 'from-green-400/8 ring-green-400/25 bg-green-400/5',
    sky: 'from-sky-400/7 ring-sky-400/25 bg-sky-400/5',
    violet: 'from-violet-400/7 ring-violet-400/25 bg-violet-400/5',
    amber: 'from-amber-400/6 ring-amber-400/20 bg-amber-400/5',
  };

  useEffect(() => {
    const setupMarquee = () => {
      if (!containerRef.current || !innerRef.current) return;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const container = containerRef.current;
      const inner = innerRef.current;

      inner.style.transition = 'none';
      inner.style.transform = 'translateY(0)';
      indexRef.current = 0;

      const needsOverflow = inner.scrollHeight > container.clientHeight + 2;

      setNeedsDuplication(needsOverflow);

      if (!needsOverflow) {
        return;
      }

      setTimeout(() => {
        const stepPct = 10;
        const stepMs = 10000;

      const tick = () => {
        if (!inner) return;

        inner.style.transition = `transform ${stepMs}ms linear`;
        indexRef.current -= stepPct;
        inner.style.transform = `translateY(${indexRef.current}%)`;

        const halfPx = inner.scrollHeight / 2;
        const movedPx = Math.abs((indexRef.current / 100) * inner.scrollHeight);

        if (movedPx > halfPx) {
          inner.style.transition = 'none';
          indexRef.current = 0;
          inner.style.transform = 'translateY(0%)';
          setTimeout(() => {
            if (inner) {
              inner.style.transition = `transform ${stepMs}ms linear`;
            }
          }, 20);
        }
      };

        timerRef.current = setInterval(tick, stepMs);
        setTimeout(tick, 300);
      }, 100);
    };

    setupMarquee();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [events]);

  return (
    <section
      className={`backdrop-blur-lg rounded-2xl p-4 ring-1 flex flex-col min-h-0 ${colorClasses[color]}`}
      style={{
        background: `linear-gradient(180deg, ${
          color === 'green'
            ? 'rgba(34,197,94,0.08)'
            : color === 'sky'
            ? 'rgba(56,189,248,0.07)'
            : color === 'violet'
            ? 'rgba(167,139,250,0.07)'
            : 'rgba(251,191,36,0.06)'
        }, transparent 35%), rgba(255,255,255,0.06)`,
      }}
    >
      <h2 className="text-base font-semibold mb-3 flex items-center gap-2 shrink-0 text-white uppercase tracking-wide">
        {icon} {title}
      </h2>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden relative no-scrollbar">
        {events.length === 0 ? (
          <p className="text-white/40 text-center py-4 uppercase text-sm">
            No hay eventos programados
          </p>
        ) : (
          <div ref={innerRef} className="space-y-4">
            {events.map((event) => (
              <KioskCard key={event.uuid} event={event} currentTime={currentTime} />
            ))}
            {needsDuplication && events.map((event) => (
              <KioskCard key={`${event.uuid}-dup`} event={event} currentTime={currentTime} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface KioskCardProps {
  event: BeoEvent;
  currentTime: Date;
}

function KioskCard({ event, currentTime }: KioskCardProps) {
  const activities = parseActivities(event.actividades);
  const status = getTodayStatus(event.fecha, event.horariode, event.horarioa, currentTime);
  const signature = `${event.grupo || ''}|${event.lugar || ''}`;
  const hue = hashHue(signature);

  const statusStyles = {
    PROXIMO: 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40',
    EN_CURSO: 'bg-red-500/20 text-red-200 ring-1 ring-red-400/40',
    FINALIZADO: 'bg-slate-500/25 text-slate-200 ring-1 ring-slate-400/40',
  };

  const cardStyles = {
    PROXIMO: 'ring-2 ring-cyan-400 bg-cyan-400/10',
    EN_CURSO: 'ring-2 ring-red-500 bg-red-500/10 animate-pulse',
    FINALIZADO: 'opacity-75 ring-slate-400/30 bg-slate-500/10',
  };

  return (
    <article
      className={`relative overflow-hidden rounded-xl p-4 border border-white/10 transition-all ${
        status ? cardStyles[status] : 'ring-1 ring-white/15 bg-white/5'
      }`}
      style={{
        background: `linear-gradient(90deg, hsl(${hue} 90% 60% / 0.08), transparent 35%), rgba(255,255,255,0.06)`,
        backdropFilter: 'blur(5px)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.1)',
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-2 rounded-l-xl"
        style={{
          background: `linear-gradient(180deg, hsl(${hue} 95% 60% / 0.95), hsl(${hue} 95% 60% / 0.55))`,
          boxShadow: `0 0 10px hsl(${hue} 95% 60% / 0.35)`,
        }}
      />

      <div className="relative space-y-3 ml-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-extrabold leading-tight text-white uppercase truncate">
            {sanitizeText(event.grupo)}
          </h3>
          {status && (
            <span
              className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide whitespace-nowrap ${statusStyles[status]}`}
            >
              {status === 'PROXIMO' ? 'SIGUIENTE' : status === 'EN_CURSO' ? 'EN CURSO' : 'YA TERMINADO'}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 text-xl leading-none font-extrabold px-3 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/15 text-white uppercase">
              <Clock className="w-5 h-5" />
              <span>{event.horariode} – {event.horarioa}</span>
            </span>
            <span className="text-white/40 select-none px-1">•</span>
            <span className="inline-flex items-center gap-2 text-xl leading-none font-extrabold px-3 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/15 text-white uppercase truncate max-w-[18rem]">
              <MapPin className="w-5 h-5" />
              <span className="truncate">{sanitizeText(event.lugar)}</span>
            </span>
          </div>
          <div className="text-[11px] text-white/60 uppercase">
            <span>{event.fecha}</span>
          </div>
        </div>

        {activities.length > 0 && (
          <ul className="text-[12px] leading-6 text-white/90 list-disc list-inside uppercase">
            {activities.map((activity, idx) => (
              <li key={idx}>{activity}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
