import React from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';

export interface InvestmentFilterState {
  searchQuery: string;
  province: string;
  stage: string;
  minCapacityKw?: number;
  maxCapacityKw?: number;
  maxCapitalToman?: number;
}

interface InvestmentFiltersProps {
  filters: InvestmentFilterState;
  onChange: (filters: InvestmentFilterState) => void;
  onReset: () => void;
  availableProvinces?: string[];
}

export const InvestmentFilters: React.FC<InvestmentFiltersProps> = ({
  filters,
  onChange,
  onReset,
  availableProvinces = [
    'یزد',
    'اصفهان',
    'کرمان',
    'فارس',
    'سمنان',
    'خراسان رضوی',
    'مرکزی',
    'قزوین',
    'تهران',
    'خوزستان'
  ]
}) => {
  const stageOptions = [
    { value: '', label: 'همه مراحل' },
    { value: 'FEASIBILITY', label: 'امکان‌سنجی اولیه' },
    { value: 'READY_FOR_RFQ', label: 'آماده استعلام' },
    { value: 'RFQ_OPEN', label: 'در حال مناقصه' },
    { value: 'EPC_SELECTED', label: 'پیمانکار مشخص' },
    { value: 'CONTRACTING', label: 'مذاکرات قراردادی' },
    { value: 'FINANCING', label: 'تأمین مالی' }
  ];

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>فیلتر و غربالگری فرصت‌های سرمایه‌گذاری</span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 cursor-pointer min-h-[44px] px-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>بازنشانی فیلترها</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
            جستجو در عنوان یا کد
          </label>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder="مثال: OPP- یا نیروگاه یزد..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          />
        </div>

        {/* Province Select */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
            استان ساختگاه
          </label>
          <select
            value={filters.province}
            onChange={(e) => onChange({ ...filters, province: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px] cursor-pointer"
          >
            <option value="">همه استان‌ها</option>
            {availableProvinces.map((prov) => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
        </div>

        {/* Project Stage */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
            مرحله پروژه
          </label>
          <select
            value={filters.stage}
            onChange={(e) => onChange({ ...filters, stage: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px] cursor-pointer"
          >
            {stageOptions.map((stg) => (
              <option key={stg.value} value={stg.value}>{stg.label}</option>
            ))}
          </select>
        </div>

        {/* Minimum Capacity */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
            حداقل توان نیروگاهی (kWp)
          </label>
          <select
            value={filters.minCapacityKw || ''}
            onChange={(e) => onChange({ ...filters, minCapacityKw: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px] cursor-pointer"
          >
            <option value="">بدون محدودیت</option>
            <option value="50">حداقل ۵۰ کیلووات</option>
            <option value="100">حداقل ۱۰۰ کیلووات</option>
            <option value="500">حداقل ۵۰۰ کیلووات</option>
            <option value="1000">حداقل ۱ مگاوات (1000 kW)</option>
            <option value="5000">حداقل ۵ مگاوات</option>
          </select>
        </div>
      </div>
    </div>
  );
};
