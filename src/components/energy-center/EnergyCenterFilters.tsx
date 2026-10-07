import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  SlidersHorizontal, 
  RotateCcw,
  Check
} from 'lucide-react';
import { 
  EnergyCategory, 
  EnergyContentType, 
  ENERGY_CATEGORIES, 
  CONTENT_TYPE_LABELS, 
  ENERGY_TOPICS,
  EnergyCenterFilterState
} from '../../types/energyCenter';

interface EnergyCenterFiltersProps {
  filters: EnergyCenterFilterState;
  onChange: (updated: EnergyCenterFilterState) => void;
  availableSources?: string[];
  totalResultsCount?: number;
}

export const EnergyCenterFilters: React.FC<EnergyCenterFiltersProps> = ({
  filters,
  onChange,
  availableSources = ['ساتبا', 'وزارت نیرو', 'توانیر', 'بورس انرژی ایران', 'شورای اقتصاد'],
  totalResultsCount
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleSearchChange = (val: string) => {
    onChange({ ...filters, searchQuery: val });
  };

  const handleCategorySelect = (cat: EnergyCategory | 'ALL') => {
    onChange({ ...filters, category: cat });
  };

  const handleContentTypeSelect = (type: EnergyContentType | 'ALL') => {
    onChange({ ...filters, contentType: type });
  };

  const handleTopicSelect = (topic: string | 'ALL') => {
    onChange({ ...filters, topic });
  };

  const handleSourceSelect = (source: string | 'ALL') => {
    onChange({ ...filters, sourceName: source });
  };

  const handleReset = () => {
    onChange({
      searchQuery: '',
      category: 'ALL',
      contentType: 'ALL',
      topic: 'ALL',
      sourceName: 'ALL',
      timeRange: 'ALL'
    });
  };

  const hasActiveFilters = 
    Boolean(filters.searchQuery) ||
    (filters.category && filters.category !== 'ALL') ||
    (filters.contentType && filters.contentType !== 'ALL') ||
    (filters.topic && filters.topic !== 'ALL') ||
    (filters.sourceName && filters.sourceName !== 'ALL');

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Search Input & Mobile Drawer Toggle */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="جستجو در اخبار، قوانین، بازار و فرصت‌های انرژی..."
            className="w-full pl-10 pr-11 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent transition-all shadow-xs"
          />
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          {filters.searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              aria-label="پاک کردن متن جستجو"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Mobile Filter Sheet Button */}
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="lg:hidden flex items-center gap-1.5 px-4 py-3.5 min-h-[44px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-xs shrink-0 cursor-pointer"
          aria-label="باز کردن فیلترهای پیشرفته"
        >
          <SlidersHorizontal size={16} className="text-[#0284C7]" />
          <span>فیلترها</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
          )}
        </button>
      </div>

      {/* Desktop Filter Bar */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4 shadow-xs">
        {/* Category Pills */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">دسته‌بندی اصلی:</span>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>حذف فیلترها</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleCategorySelect('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !filters.category || filters.category === 'ALL'
                  ? 'bg-[#0284C7] text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              همه دسته‌ها
            </button>
            {ENERGY_CATEGORIES.map((cat) => {
              const active = filters.category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter Line: Content Type & Topics */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Content Type Filter */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">نوع محتوا:</span>
            <select
              value={filters.contentType || 'ALL'}
              onChange={(e) => handleContentTypeSelect(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-[#0284C7]"
            >
              <option value="ALL">همه انواع محتوا</option>
              {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Topic Select */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">موضوع:</span>
            <select
              value={filters.topic || 'ALL'}
              onChange={(e) => handleTopicSelect(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-[#0284C7]"
            >
              <option value="ALL">تمام موضوعات</option>
              {ENERGY_TOPICS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Official Source Select */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">منبع رسمی:</span>
            <select
              value={filters.sourceName || 'ALL'}
              onChange={(e) => handleSourceSelect(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-[#0284C7]"
            >
              <option value="ALL">همه منابع رسمی</option>
              {availableSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          <div 
            className="relative bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-6 max-h-[85vh] overflow-y-auto space-y-6 animate-in slide-in-from-bottom duration-200"
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-[#0284C7]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">فیلترهای مرکز اطلاعات انرژی</h3>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="بستن پنجره فیلترها"
              >
                <X size={20} />
              </button>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">دسته‌بندی:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCategorySelect('ALL')}
                  className={`p-3 min-h-[44px] rounded-xl text-xs font-bold text-right transition-colors ${
                    !filters.category || filters.category === 'ALL'
                      ? 'bg-[#0284C7] text-white'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  همه دسته‌ها
                </button>
                {ENERGY_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCategorySelect(c.id)}
                    className={`p-3 min-h-[44px] rounded-xl text-xs font-bold text-right transition-colors line-clamp-1 ${
                      filters.category === c.id
                        ? 'bg-[#0284C7] text-white'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">نوع محتوا:</label>
              <select
                value={filters.contentType || 'ALL'}
                onChange={(e) => handleContentTypeSelect(e.target.value as any)}
                className="w-full p-3 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">همه انواع محتوا</option>
                {Object.entries(CONTENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">موضوع تخصصی:</label>
              <select
                value={filters.topic || 'ALL'}
                onChange={(e) => handleTopicSelect(e.target.value)}
                className="w-full p-3 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">تمام موضوعات</option>
                {ENERGY_TOPICS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">منبع رسمی:</label>
              <select
                value={filters.sourceName || 'ALL'}
                onChange={(e) => handleSourceSelect(e.target.value)}
                className="w-full p-3 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">همه منابع رسمی</option>
                {availableSources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 py-3 min-h-[44px] text-center rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                پاک‌سازی همه
              </button>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex-1 py-3 min-h-[44px] text-center rounded-xl bg-[#0284C7] text-white text-xs font-bold shadow-xs"
              >
                اعمال فیلترها
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
