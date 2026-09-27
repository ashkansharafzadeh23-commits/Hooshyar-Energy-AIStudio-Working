import React, { useState, useEffect } from 'react';
import { PersianModal } from './PersianModal';
import { Loader2, AlertCircle } from 'lucide-react';

export interface PromptField {
  id: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'url' | 'select' | 'textarea';
  defaultValue?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  helpText?: string;
  validate?: (value: string) => string | null;
}

export interface PersianPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: PromptField[];
  submitText?: string;
  cancelText?: string;
  onSubmit: (values: Record<string, string>) => Promise<void> | void;
  isSubmitting?: boolean;
  externalError?: string | null;
}

export const PersianPromptModal: React.FC<PersianPromptModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  fields,
  submitText = 'تایید و ثبت',
  cancelText = 'انصراف',
  onSubmit,
  isSubmitting = false,
  externalError = null
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [internalSubmitting, setInternalSubmitting] = useState(false);

  // Initialize or reset form values when opening
  useEffect(() => {
    if (isOpen) {
      const initialValues: Record<string, string> = {};
      fields.forEach(f => {
        initialValues[f.id] = f.defaultValue !== undefined ? f.defaultValue : (f.options?.[0]?.value || '');
      });
      setValues(initialValues);
      setErrors({});
      setInternalSubmitting(false);
    }
  }, [isOpen, fields]);

  const handleChange = (id: string, val: string) => {
    setValues(prev => ({ ...prev, [id]: val }));
    if (errors[id]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const validateAll = (): boolean => {
    const nextErrors: Record<string, string> = {};
    for (const field of fields) {
      const val = (values[field.id] || '').trim();
      if (field.required && !val) {
        nextErrors[field.id] = `لطفاً ${field.label} را وارد نمایید.`;
        continue;
      }
      if (field.type === 'url' && val) {
        if (!val.startsWith('http://') && !val.startsWith('https://') && !val.startsWith('/')) {
          nextErrors[field.id] = 'آدرس اینترنتی باید با http:// یا https:// آغاز شود.';
          continue;
        }
      }
      if (field.validate) {
        const customErr = field.validate(val);
        if (customErr) {
          nextErrors[field.id] = customErr;
        }
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || internalSubmitting) return;

    if (!validateAll()) {
      return;
    }

    try {
      setInternalSubmitting(true);
      await onSubmit(values);
    } catch {
      // Errors handled by parent component via externalError or throw
    } finally {
      setInternalSubmitting(false);
    }
  };

  const isBusy = isSubmitting || internalSubmitting;

  return (
    <PersianModal
      isOpen={isOpen}
      onClose={() => {
        if (!isBusy) onClose();
      }}
      title={title}
      description={description}
      maxWidth="max-w-md"
      showCloseButton={!isBusy}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {externalError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{externalError}</span>
          </div>
        )}

        {fields.map(field => (
          <div key={field.id} className="space-y-1.5">
            <label 
              htmlFor={`prompt-field-${field.id}`}
              className="block text-xs font-bold text-slate-700 dark:text-zinc-300"
            >
              {field.label}
              {field.required && <span className="text-red-500 mr-1">*</span>}
            </label>

            {field.type === 'select' && field.options ? (
              <select
                id={`prompt-field-${field.id}`}
                value={values[field.id] || ''}
                onChange={e => handleChange(field.id, e.target.value)}
                disabled={isBusy}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all disabled:opacity-50"
              >
                {field.options.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                id={`prompt-field-${field.id}`}
                rows={3}
                placeholder={field.placeholder}
                value={values[field.id] || ''}
                onChange={e => handleChange(field.id, e.target.value)}
                disabled={isBusy}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none disabled:opacity-50"
              />
            ) : (
              <input
                id={`prompt-field-${field.id}`}
                type={field.type === 'url' ? 'url' : 'text'}
                dir={field.type === 'url' ? 'ltr' : 'rtl'}
                placeholder={field.placeholder}
                value={values[field.id] || ''}
                onChange={e => handleChange(field.id, e.target.value)}
                disabled={isBusy}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all disabled:opacity-50"
              />
            )}

            {field.helpText && !errors[field.id] && (
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">{field.helpText}</p>
            )}

            {errors[field.id] && (
              <p className="text-xs text-rose-500 font-medium">{errors[field.id]}</p>
            )}
          </div>
        ))}

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="px-5 py-2 text-xs sm:text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isBusy && <Loader2 size={15} className="animate-spin" />}
            <span>{submitText}</span>
          </button>
        </div>
      </form>
    </PersianModal>
  );
};
