import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAppContext } from './AppContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (options: { type: ToastType; message: string; title?: string; duration?: number }) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const appContext = useAppContext();

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(({
    type,
    message,
    title,
    duration = 4500
  }: {
    type: ToastType;
    message: string;
    title?: string;
    duration?: number;
  }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = { id, type, title, message, duration };

    setToasts(prev => [...prev, newToast]);

    // Also register in AppContext notifications center if available
    try {
      if (appContext?.addNotification) {
        appContext.addNotification({
          title: title || (type === 'success' ? 'عملیات موفق' : type === 'error' ? 'خطا' : 'اطلاعیه'),
          message,
          type
        });
      }
    } catch {
      // safe fallback if outside provider
    }

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [appContext, dismissToast]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title });
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', message, title });
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', message, title });
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', message, title });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, showSuccess, showError, showWarning, showInfo, dismissToast }}>
      {children}

      {/* Accessible Persian Toast Notification Container */}
      <div 
        aria-live="polite" 
        aria-atomic="false"
        className="fixed bottom-4 left-4 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
        dir="rtl"
      >
        <AnimatePresence>
          {toasts.map(toast => {
            const isError = toast.type === 'error';
            return (
              <motion.div
                key={toast.id}
                role={isError ? 'alert' : 'status'}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto rounded-2xl p-4 shadow-xl border flex items-start gap-3 backdrop-blur-md ${
                  toast.type === 'success'
                    ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                    : toast.type === 'error'
                    ? 'bg-rose-50/95 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                    : toast.type === 'warning'
                    ? 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
                    : 'bg-white/95 dark:bg-zinc-900/90 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                  {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                  {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                  {toast.type === 'info' && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                </div>

                <div className="flex-1 text-xs sm:text-sm">
                  {toast.title && (
                    <div className="font-bold mb-0.5">{toast.title}</div>
                  )}
                  <div className="leading-relaxed opacity-90">{toast.message}</div>
                </div>

                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="بستن اعلان"
                  className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
