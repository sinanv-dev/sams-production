import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      confirmRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') onConfirm();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  const confirmBtnClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
      : variant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20';

  const iconBgClass =
    variant === 'danger'
      ? 'bg-red-500/10 text-red-500'
      : variant === 'warning'
      ? 'bg-amber-500/10 text-amber-500'
      : 'bg-brand-500/10 text-brand-500';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 fade-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${iconBgClass}`}>
            {variant === 'danger' ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground mb-1">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border border-border bg-muted hover:bg-muted/80 text-foreground transition-all duration-150 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              ref={confirmRef}
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold shadow-lg transition-all duration-150 disabled:opacity-50 ${confirmBtnClass}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
