import { ArrowRight } from 'lucide-react';

const TONE_STYLES: Record<string, { border: string; bg: string; iconBg: string; title: string; desc: string; count: string; cta: string }> = {
  red: {
    border: 'border-red-300',
    bg: 'bg-gradient-to-br from-red-50 to-orange-50/50',
    iconBg: 'bg-red-100 text-red-700',
    title: 'text-red-900',
    desc: 'text-red-700/80',
    count: 'text-red-800',
    cta: 'text-red-700 hover:text-red-900',
  },
  amber: {
    border: 'border-amber-300',
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50/50',
    iconBg: 'bg-amber-100 text-amber-700',
    title: 'text-amber-900',
    desc: 'text-amber-700/80',
    count: 'text-amber-800',
    cta: 'text-amber-700 hover:text-amber-900',
  },
  blue: {
    border: 'border-blue-300',
    bg: 'bg-gradient-to-br from-blue-50 to-sky-50/50',
    iconBg: 'bg-blue-100 text-blue-700',
    title: 'text-blue-900',
    desc: 'text-blue-700/80',
    count: 'text-blue-800',
    cta: 'text-blue-700 hover:text-blue-900',
  },
  rose: {
    border: 'border-rose-300',
    bg: 'bg-gradient-to-br from-rose-50 to-pink-50/50',
    iconBg: 'bg-rose-100 text-rose-700',
    title: 'text-rose-900',
    desc: 'text-rose-700/80',
    count: 'text-rose-800',
    cta: 'text-rose-700 hover:text-rose-900',
  },
};

interface AlertCardProps {
  tone: keyof typeof TONE_STYLES;
  title: string;
  count: number;
  description: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export default function AlertCard({ tone, title, count, description, subtitle, icon, onClick }: AlertCardProps) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.red;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border ${styles.border} ${styles.bg} p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.iconBg}`}>
          {icon}
        </div>
        <span className={`text-3xl font-bold ${styles.count}`}>{count}</span>
      </div>
      <h4 className={`text-sm font-semibold ${styles.title}`}>{title}</h4>
      <p className={`text-xs mt-1 ${styles.desc}`}>{description}</p>
      {subtitle && <p className={`text-xs mt-1 ${styles.desc} opacity-80`}>{subtitle}</p>}
      <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium ${styles.cta} transition-colors`}>
        <span>Ir al modulo</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}
