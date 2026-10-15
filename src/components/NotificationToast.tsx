import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const NotificationToastContainer: React.FC<NotificationToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const type = toast.type || 'info';

        let bgClass = 'bg-slate-900 border-slate-700 text-white';
        let icon = <Info className="w-4 h-4 text-sky-400 shrink-0" />;

        if (type === 'warning') {
          bgClass = 'bg-[#1e1b18] border-amber-500/60 text-amber-50';
          icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
        } else if (type === 'error') {
          bgClass = 'bg-[#211515] border-red-500/60 text-red-50';
          icon = <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
        } else if (type === 'success') {
          bgClass = 'bg-[#132219] border-emerald-500/60 text-emerald-50';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto border rounded-lg p-3 shadow-xl backdrop-blur-md flex items-start space-x-2.5 transition-all animate-in slide-in-from-bottom-2 duration-150 ${bgClass}`}
          >
            <div className="mt-0.5">{icon}</div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <div className="text-xs font-semibold leading-tight mb-0.5">
                  {toast.title}
                </div>
              )}
              <div className="text-xs text-slate-200 dark:text-slate-300 leading-snug">
                {toast.message}
              </div>

              {toast.actionLabel && toast.onAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    onDismiss(toast.id);
                  }}
                  className="mt-2 text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                >
                  {toast.actionLabel}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
