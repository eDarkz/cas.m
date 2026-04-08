import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

type ToastListener = (toast: ToastMessage) => void;

const listeners: ToastListener[] = [];

function generateId() {
  return Math.random().toString(36).slice(2);
}

export const toast = {
  success: (message: string, duration = 4000) => {
    const t: ToastMessage = { id: generateId(), type: 'success', message, duration };
    listeners.forEach(fn => fn(t));
  },
  error: (message: string, duration = 6000) => {
    const t: ToastMessage = { id: generateId(), type: 'error', message, duration };
    listeners.forEach(fn => fn(t));
  },
  warning: (message: string, duration = 5000) => {
    const t: ToastMessage = { id: generateId(), type: 'warning', message, duration };
    listeners.forEach(fn => fn(t));
  },
  info: (message: string, duration = 4000) => {
    const t: ToastMessage = { id: generateId(), type: 'info', message, duration };
    listeners.forEach(fn => fn(t));
  },
};

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
};

const styles: Record<ToastType, string> = {
  success: 'border-l-4 border-emerald-500 bg-white',
  error: 'border-l-4 border-red-500 bg-white',
  warning: 'border-l-4 border-amber-500 bg-white',
  info: 'border-l-4 border-blue-500 bg-white',
};

function ToastItem({ toast: t, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(t.id), 300);
    }, t.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onRemove]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg max-w-sm w-full transition-all duration-300 ${styles[t.type]} ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
    >
      {icons[t.type]}
      <p className="text-sm text-stone-800 leading-snug flex-1">{t.message}</p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onRemove(t.id), 300);
        }}
        className="text-stone-400 hover:text-stone-600 transition-colors mt-0.5 flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((t: ToastMessage) => {
    setToasts(prev => [...prev, t]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => {
      const idx = listeners.indexOf(addToast);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
}
