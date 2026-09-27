import React from 'react';
import { Radio, Plus, ShieldAlert } from 'lucide-react';
import { TelemetrySource } from '../../types/monitoring';
import { TelemetrySourceCard } from './TelemetrySourceCard';

export interface TelemetrySourceListProps {
  sources: TelemetrySource[];
  loading?: boolean;
  canAddSource?: boolean;
  onAddSource?: () => void;
  equipmentMap?: Record<string, string>;
}

export const TelemetrySourceList: React.FC<TelemetrySourceListProps> = ({
  sources,
  loading = false,
  canAddSource = false,
  onAddSource,
  equipmentMap = {},
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <Radio className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          منبع تله‌متری ثبت نشده است
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
          برای این دارایی هنوز هیچ دستگاه کنتور، اینورتر یا وب‌سرویس پایش داده‌ای پیکربندی نشده است.
        </p>
        {canAddSource && onAddSource && (
          <button
            type="button"
            onClick={onAddSource}
            className="mt-4 min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن منبع تله‌متری</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-500" />
            <span>منابع تله‌متری و درگاه‌های پایش</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            تجهیزات و درگاه‌های ثبت‌شده برای تبادل تله‌متری با نیروگاه
          </p>
        </div>

        {canAddSource && onAddSource && (
          <button
            type="button"
            onClick={onAddSource}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Plus className="w-4 h-4" />
            <span>منبع جدید</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {sources.map((source) => (
          <TelemetrySourceCard
            key={source.id}
            source={source}
            equipmentName={source.externalSourceId ? equipmentMap[source.externalSourceId] : undefined}
          />
        ))}
      </div>
    </div>
  );
};
