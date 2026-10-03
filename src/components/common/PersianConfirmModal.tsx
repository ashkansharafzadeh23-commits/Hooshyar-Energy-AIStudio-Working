import React, { useState } from 'react';
import { PersianModal } from './PersianModal';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';

export interface PersianConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isSubmitting?: boolean;
}

export const PersianConfirmModal: React.FC<PersianConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تایید',
  cancelText = 'انصراف',
  variant = 'primary',
  isSubmitting = false
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleConfirm = async () => {
    if (isSubmitting || internalLoading) return;
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const isBusy = isSubmitting || internalLoading;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-6 h-6 text-blue-500 shrink-0" />;
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-slate-900';
      default:
        return 'bg-amber-400 hover:bg-amber-300 text-slate-900';
    }
  };

  return (
    <PersianModal
      isOpen={isOpen}
      onClose={() => {
        if (!isBusy) onClose();
      }}
      title={title}
      maxWidth="max-w-md"
      showCloseButton={!isBusy}
      role="alertdialog"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {getIcon()}
          <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed pt-0.5">
            {message}
          </p>
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isBusy}
            className={`min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer ${getConfirmButtonClasses()}`}
          >
            {isBusy && <Loader2 size={15} className="animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </PersianModal>
  );
};
