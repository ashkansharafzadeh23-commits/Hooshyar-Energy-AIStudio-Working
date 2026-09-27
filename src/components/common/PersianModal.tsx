import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface PersianModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
  role?: 'dialog' | 'alertdialog';
}

export const PersianModal: React.FC<PersianModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  showCloseButton = true,
  role = 'dialog'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
          return;
        }

        // Trap focus inside modal
        if (event.key === 'Tab' && modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (event.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              event.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              event.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus first input or button inside modal
      setTimeout(() => {
        if (modalRef.current) {
          const firstInput = modalRef.current.querySelector<HTMLElement>('input, textarea, select, button');
          if (firstInput) {
            firstInput.focus();
          } else {
            modalRef.current.focus();
          }
        }
      }, 50);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          dir="rtl"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <motion.div
            ref={modalRef}
            role={role}
            aria-modal="true"
            aria-labelledby="persian-modal-title"
            aria-describedby={description ? 'persian-modal-desc' : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full ${maxWidth} bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden z-10 my-8`}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800/80 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-zinc-800/30">
              <div className="space-y-1">
                <h3 
                  id="persian-modal-title" 
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
                >
                  {title}
                </h3>
                {description && (
                  <p 
                    id="persian-modal-desc" 
                    className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed"
                  >
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="بستن پنجره"
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 shrink-0"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
