import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, FileWarning, ShieldAlert, ArrowLeft } from 'lucide-react';

export interface AttentionItem {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  category: 'DOCUMENT' | 'EQUIPMENT' | 'TEST' | 'HANDOVER' | 'CONTRACT';
  title: string;
  description: string;
  targetTab?: string;
  actionLabel?: string;
}

interface ExecutionAttentionItemsProps {
  items: AttentionItem[];
  onAction?: (targetTab: string) => void;
  className?: string;
}

export const ExecutionAttentionItems: React.FC<ExecutionAttentionItemsProps> = ({
  items,
  onAction,
  className = ''
}) => {
  if (items.length === 0) {
    return (
      <div className={`p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center gap-3 ${className}`}>
        <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
            وضعیت پروژه منظم است
          </h4>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            مورد فوری نیازمند توجه یا نقص مدارک/آزمون ثبت نشده است.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>موارد نیازمند پیگیری و توجه ({items.length})</span>
        </h3>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
              item.severity === 'HIGH'
                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                : item.severity === 'MEDIUM'
                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                : 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {item.severity === 'HIGH' ? (
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              ) : item.severity === 'MEDIUM' ? (
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <FileWarning className="w-4 h-4 text-slate-500 dark:text-zinc-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold">{item.title}</h5>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    item.severity === 'HIGH'
                      ? 'bg-rose-200 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200'
                      : item.severity === 'MEDIUM'
                      ? 'bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200'
                      : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                  }`}>
                    {item.severity === 'HIGH' ? 'اولویت بالا' : item.severity === 'MEDIUM' ? 'اولویت متوسط' : 'اطلاع'}
                  </span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>

            {item.actionLabel && item.targetTab && onAction && (
              <button
                onClick={() => onAction(item.targetTab!)}
                className="self-end sm:self-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 min-h-[44px] px-2"
              >
                <span>{item.actionLabel}</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
