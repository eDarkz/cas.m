import { ArrowUpRight } from 'lucide-react';

const VARIANT_STYLES: Record<string, { bg: string; iconBg: string; iconColor: string; accent: string }> = {
  cyan: {
    bg: 'hover:border-cyan-400/60',
    iconBg: 'bg-gradient-to-br from-cyan-50 to-cyan-100',
    iconColor: 'text-cyan-700',
    accent: 'text-cyan-600',
  },
  blue: {
    bg: 'hover:border-blue-400/60',
    iconBg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    iconColor: 'text-blue-700',
    accent: 'text-blue-600',
  },
  green: {
    bg: 'hover:border-emerald-400/60',
    iconBg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    iconColor: 'text-emerald-700',
    accent: 'text-emerald-600',
  },
  orange: {
    bg: 'hover:border-orange-400/60',
    iconBg: 'bg-gradient-to-br from-orange-50 to-orange-100',
    iconColor: 'text-orange-700',
    accent: 'text-orange-600',
  },
  gold: {
    bg: 'hover:border-amber-400/60',
    iconBg: 'bg-gradient-to-br from-amber-50 to-amber-100',
    iconColor: 'text-amber-700',
    accent: 'text-amber-600',
  },
  rose: {
    bg: 'hover:border-rose-400/60',
    iconBg: 'bg-gradient-to-br from-rose-50 to-rose-100',
    iconColor: 'text-rose-700',
    accent: 'text-rose-600',
  },
};

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail?: string;
  variant: keyof typeof VARIANT_STYLES;
  onClick?: () => void;
}

export default function KpiCard({ icon, label, value, detail, variant, onClick }: KpiCardProps) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative bg-white rounded-2xl border border-stone-200/80 p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-200/50 ${styles.bg} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.iconBg} ${styles.iconColor} shrink-0`}>
          {icon}
        </div>
        {onClick && (
          <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
        )}
      </div>
      <div className="mt-3">
        <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500 leading-tight">
          {label}
        </div>
        <div className="text-2xl font-bold text-stone-900 mt-0.5 tracking-tight">
          {value}
        </div>
        {detail && (
          <div className="text-xs text-stone-500 mt-1 leading-snug">{detail}</div>
        )}
      </div>
    </button>
  );
}
