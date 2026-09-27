import React from 'react';
import { Calendar } from 'lucide-react';

export type TelemetryTimeRange = 'TODAY' | '7D' | '30D';

export interface TelemetryTimeRangeSelectorProps {
  selectedRange: TelemetryTimeRange;
  onRangeChange: (range: TelemetryTimeRange) => void;
  disabled?: boolean;
}

export const TelemetryTimeRangeSelector: React.FC<TelemetryTimeRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
  disabled = false,
}) => {
  const ranges: Array<{ id: TelemetryTimeRange; label: string }> = [
    { id: 'TODAY', label: 'امروز' },
    { id: '7D', label: '۷ روز اخیر' },
    { id: '30D', label: '۳۰ روز اخیر' },
  ];

  return (
    <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
      {ranges.map((r) => {
        const isSelected = selectedRange === r.id;
        return (
          <button
            key={r.id}
            type="button"
            disabled={disabled}
            onClick={() => onRangeChange(r.id)}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg font-medium transition-all focus:outline-none ${
              isSelected
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
};
