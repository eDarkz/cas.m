import { ArrowRight } from 'lucide-react';

const ACCENT_STYLES: Record<string, { border: string; iconBg: string; iconColor: string; chip: string }> = {
  cyan: {
    border: 'hover:border-cyan-400/70',
    iconBg: 'bg-gradient-to-br from-cyan-50 to-cyan-100',
    iconColor: 'text-cyan-700',
    chip: 'bg-cyan-50 text-cyan-700',
  },
  blue: {
    border: 'hover:border-blue-400/70',
    iconBg: 'bg-gradient-to-br from-blue-50 to-blue-100',
    iconColor: 'text-blue-700',
    chip: 'bg-blue-50 text-blue-700',
  },
  green: {
    border: 'hover:border-emerald-400/70',
    iconBg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    iconColor: 'text-emerald-700',
    chip: 'bg-emerald-50 text-emerald-700',
  },
  orange: {
    border: 'hover:border-orange-400/70',
    iconBg: 'bg-gradient-to-br from-orange-50 to-orange-100',
    iconColor: 'text-orange-700',
    chip: 'bg-orange-50 text-orange-700',
  },
  amber: {
    border: 'hover:border-amber-400/70',
    iconBg: 'bg-gradient-to-br from-amber-50 to-amber-100',
    iconColor: 'text-amber-700',
    chip: 'bg-amber-50 text-amber-700',
  },
  rose: {
    border: 'hover:border-rose-400/70',
    iconBg: 'bg-gradient-to-br from-rose-50 to-rose-100',
    iconColor: 'text-rose-700',
    chip: 'bg-rose-50 text-rose-700',
  },
  gold: {
    border: 'hover:border-yellow-400/70',
    iconBg: 'bg-gradient-to-br from-yellow-50 to-amber-100',
    iconColor: 'text-yellow-700',
    chip: 'bg-yellow-50 text-yellow-700',
  },
  slate: {
    border: 'hover:border-slate-400/70',
    iconBg: 'bg-gradient-to-br from-slate-50 to-slate-100',
    iconColor: 'text-slate-700',
    chip: 'bg-slate-50 text-slate-700',
  },
};

interface ModuleCardProps {
  accent: keyof typeof ACCENT_STYLES;
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryValue: string;
  secondaryValue: string;
  footerChip?: string;
  onClick: () => void;
}

export default function ModuleCard({
  accent,
  icon,
  title,
  description,
  primaryValue,
  secondaryValue,
  footerChip,
  onClick,
}: ModuleCardProps) {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.blue;

  return (
    <button
      type="button"
      className={`group bg-white rounded-2xl border border-stone-200/80 p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-200/50 ${styles.border}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg} ${styles.iconColor}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-stone-900 leading-tight">{title}</h3>
          <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">{description}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-stone-100">
        <div className="text-sm font-semibold text-stone-800">{primaryValue}</div>
        <div className="text-xs text-stone-500 mt-0.5">{secondaryValue}</div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {footerChip && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles.chip}`}>
            {footerChip}
          </span>
        )}
        <div className="flex items-center gap-1 text-xs font-medium text-stone-400 group-hover:text-stone-700 transition-colors ml-auto">
          <span>Entrar</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
}
