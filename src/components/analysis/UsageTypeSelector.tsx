import React from 'react';
import { Home, Building2, Factory, Tractor, Sparkles, Check } from 'lucide-react';
import { LocationType } from '../../types';

export type DisplayUsageType = 'residential' | 'commercial' | 'industrial' | 'agricultural' | 'other';

interface UsageTypeSelectorProps {
  value: string | null;
  onChange: (type: LocationType) => void;
}

interface UsageOption {
  id: DisplayUsageType;
  mappedType: LocationType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const USAGE_OPTIONS: UsageOption[] = [
  {
    id: 'residential',
    mappedType: 'residential',
    title: 'مسکونی',
    subtitle: 'آپارتمان، منزل ویلایی، مجتمع مسکونی یا باغ شخصی',
    icon: Home
  },
  {
    id: 'commercial',
    mappedType: 'industrial_warehouse',
    title: 'تجاری',
    subtitle: 'ساختمان اداری، فروشگاه، هتل، بیمارستان یا مرکز خدماتی',
    icon: Building2
  },
  {
    id: 'industrial',
    mappedType: 'factory',
    title: 'صنعتی',
    subtitle: 'کارخانه، کارگاه تولیدی، سوله صنعتی یا خطوط فرآوری',
    icon: Factory
  },
  {
    id: 'agricultural',
    mappedType: 'agricultural',
    title: 'کشاورزی',
    subtitle: 'پمپاژ آب، گلخانه، دامداری، مرغداری یا سردخانه روستایی',
    icon: Tractor
  },
  {
    id: 'other',
    mappedType: 'residential',
    title: 'سایر',
    subtitle: 'مراکز آموزشی، مذهبی، ورزشی یا کاربری‌های خاص',
    icon: Sparkles
  }
];

export const UsageTypeSelector: React.FC<UsageTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-3" role="radiogroup" aria-label="نوع کاربری سامانه خورشیدی">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {USAGE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = value === opt.mappedType || (opt.id === 'commercial' && value === 'industrial_warehouse');

          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(opt.mappedType)}
              className={`p-4 rounded-xl border text-right transition-all flex items-start gap-3.5 cursor-pointer relative min-h-[88px] ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500 shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Icon size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    {opt.title}
                  </h3>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal line-clamp-2">
                  {opt.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
