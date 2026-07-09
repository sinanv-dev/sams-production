import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
};

const iconStyles = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl border backdrop-blur-md shadow-lg shadow-black/10 animate-in slide-in-from-right-4 fade-in duration-300 ${styles[t.type]}`}
          >
            <Icon size={18} className={`flex-shrink-0 mt-0.5 ${iconStyles[t.type]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t.title}</p>
              {t.message && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="flex-shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
