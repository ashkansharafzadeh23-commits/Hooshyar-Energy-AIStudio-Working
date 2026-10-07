import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Newspaper, 
  Scale, 
  TrendingUp, 
  Coins, 
  FileCheck2, 
  Briefcase, 
  ShieldCheck, 
  Search, 
  ArrowLeft, 
  Sparkles, 
  Info, 
  Inbox, 
  ChevronLeft,
  Tag,
  Zap,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import { 
  EnergyInformationRecord, 
  EnergyCenterFilterState, 
  ENERGY_CATEGORIES, 
  EnergyCategory 
} from '../../types/energyCenter';
import { EnergyContentCard } from '../../components/energy-center/EnergyContentCard';
import { EnergyCenterFilters } from '../../components/energy-center/EnergyCenterFilters';

interface EnergyCenterHomeProps {
  initialRecords?: EnergyInformationRecord[];
}

export default function EnergyCenterHome({ initialRecords = [] }: EnergyCenterHomeProps) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<EnergyCenterFilterState>({
    searchQuery: '',
    category: 'ALL',
    contentType: 'ALL',
    topic: 'ALL',
    sourceName: 'ALL',
    timeRange: 'ALL'
  });

  // Icon mapping for categories
  const categoryIcons: Record<string, React.ReactNode> = {
    Newspaper: <Newspaper size={22} className="text-[#0284C7] dark:text-blue-400" />,
    Scale: <Scale size={22} className="text-purple-600 dark:text-purple-400" />,
    TrendingUp: <TrendingUp size={22} className="text-emerald-600 dark:text-emerald-400" />,
    Coins: <Coins size={22} className="text-amber-600 dark:text-amber-400" />,
    FileCheck2: <FileCheck2 size={22} className="text-indigo-600 dark:text-indigo-400" />,
    Briefcase: <Briefcase size={22} className="text-teal-600 dark:text-teal-400" />
  };

  // Filter verified records (when real records exist)
  const filteredRecords = useMemo(() => {
    return initialRecords.filter((record) => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchTitle = record.title.toLowerCase().includes(q);
        const matchSummary = record.summary.toLowerCase().includes(q);
        const matchTopics = record.topics?.some(t => t.toLowerCase().includes(q));
        const matchSource = record.provenance?.sourceName?.toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchTopics && !matchSource) return false;
      }
      if (filters.category && filters.category !== 'ALL' && record.category !== filters.category) {
        return false;
      }
      if (filters.contentType && filters.contentType !== 'ALL' && record.contentType !== filters.contentType) {
        return false;
      }
      if (filters.topic && filters.topic !== 'ALL' && !record.topics?.includes(filters.topic)) {
        return false;
      }
      if (filters.sourceName && filters.sourceName !== 'ALL' && record.provenance?.sourceName !== filters.sourceName) {
        return false;
      }
      return true;
    });
  }, [initialRecords, filters]);

  // Key developments: featured records from verified data
  const keyDevelopments = useMemo(() => {
    return filteredRecords.filter(r => r.isFeatured);
  }, [filteredRecords]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans pb-24 text-slate-900 dark:text-slate-100" dir="rtl">
      
      {/* 1. Header / Hero Section */}
      <section className="relative overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 py-12 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(#0284C7_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0284C7] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900">
              <ShieldCheck size={14} />
              <span>پایگاه تخصصی تحلیل و رصد صنعت انرژی</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              مرکز اطلاعات انرژی ایران
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              اخبار، مقررات، بازار و فرصت‌های صنعت انرژی در یک مرجع تخصصی
            </p>
          </div>

          {/* Integrated Search and Filter Bar */}
          <div className="pt-2">
            <EnergyCenterFilters 
              filters={filters} 
              onChange={setFilters} 
              totalResultsCount={filteredRecords.length}
            />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 mt-10">

        {/* 2. Key Developments Area (تحولات مهم) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                تحولات مهم
              </h2>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              رصد تحلیلی رویدادهای راهبردی
            </span>
          </div>

          {keyDevelopments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {keyDevelopments.map(item => (
                <EnergyContentCard key={item.id} record={item} />
              ))}
            </div>
          ) : (
            /* Truthful Institutional Empty State */
            <div className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                <Info size={20} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                در انتظار درج اسناد راهبردی رسمی
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                پس از دریافت و تأیید اطلاعات از منابع رسمی، مهم‌ترین تحولات صنعت انرژی در این بخش نمایش داده می‌شود.
              </p>
            </div>
          )}
        </section>

        {/* 3. Category Navigation (۶ دسته‌بندی اصلی) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                دسته‌بندی‌های تخصصی
              </h2>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              دسترسی موضوعی به محورهای شش‌گانه
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ENERGY_CATEGORIES.map((cat) => {
              const active = filters.category === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setFilters(prev => ({ ...prev, category: prev.category === cat.id ? 'ALL' : cat.id }))}
                  className={`group bg-white dark:bg-slate-900 rounded-3xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    active 
                      ? 'border-[#0284C7] ring-2 ring-[#0284C7]/20 shadow-sm' 
                      : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-2xl bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                        {categoryIcons[cat.iconName]}
                      </div>
                      {active && (
                        <span className="text-[11px] font-bold text-[#0284C7] bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                          فعال در فیلتر
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-[#0284C7] dark:group-hover:text-blue-400 transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {cat.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-[#0284C7] dark:text-blue-400">
                    <span>مشاهده اطلاعات این بخش</span>
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Latest Information (تازه‌ترین اطلاعات) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                تازه‌ترین اطلاعات
              </h2>
            </div>
            {filteredRecords.length > 0 && (
              <span className="text-xs text-slate-500 font-bold">
                {filteredRecords.length} سند مستند
              </span>
            )}
          </div>

          {filteredRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecords.map((item) => (
                <EnergyContentCard key={item.id} record={item} />
              ))}
            </div>
          ) : (
            /* Truthful Institutional Empty State */
            <div className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
                <Inbox size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {filters.searchQuery || filters.category !== 'ALL'
                  ? 'نتیجه‌ای مطابق جستجوی شما پیدا نشد.'
                  : 'هنوز اطلاعات تأییدشده‌ای در این بخش منتشر نشده است.'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                سامانه هوشیار انرژی به منظور حفظ اصل صداقت داده‌ها، تنها اسناد و اخباری را منتشر می‌کند که از مبادی رسمی (وزارت نیرو، ساتبا، توانیر، بورس انرژی) دریافت و صحه‌گذاری شده باشند.
              </p>
            </div>
          )}
        </section>

        {/* 5. Market & Opportunities Entry Points (بازار و فرصت‌های انرژی) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                بازار و فرصت‌های انرژی
              </h2>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              درگاه‌های تجاری، بورس و تعاملات صنعتی
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Energy Exchange */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  بورس انرژی و تابلوی سبز
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  اطلاعات و اسناد مرتبط با معاملات برق و سازوکارهای بازار انرژی
                </p>
              </div>
              <button
                onClick={() => setFilters(prev => ({ ...prev, category: 'energy_exchange' }))}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:underline pt-2 border-t border-slate-100 dark:border-slate-800 text-right cursor-pointer"
              >
                <span>مشاهده اطلاعات این بخش</span>
                <ChevronLeft size={14} />
              </button>
            </div>

            {/* Card 2: Electricity Sales & Tariffs */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                  <Coins size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  خرید و فروش برق
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  اطلاعات مرتبط با قراردادهای خرید برق، سازوکارهای فروش و مقررات مرتبط
                </p>
              </div>
              <button
                onClick={() => setFilters(prev => ({ ...prev, category: 'tariffs_purchase' }))}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:underline pt-2 border-t border-slate-100 dark:border-slate-800 text-right cursor-pointer"
              >
                <span>مشاهده اطلاعات این بخش</span>
                <ChevronLeft size={14} />
              </button>
            </div>

            {/* Card 3: Tenders & EPC Calls */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                  <FileCheck2 size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  مناقصات و فراخوان‌ها
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  محل نمایش مناقصات و فراخوان‌های رسمی پس از دریافت و تأیید از منابع معتبر
                </p>
              </div>
              <button
                onClick={() => setFilters(prev => ({ ...prev, category: 'tenders_calls' }))}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:underline pt-2 border-t border-slate-100 dark:border-slate-800 text-right cursor-pointer"
              >
                <span>مشاهده اطلاعات این بخش</span>
                <ChevronLeft size={14} />
              </button>
            </div>

            {/* Card 4: Investment Opportunities */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                  <Briefcase size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  فرصت‌های سرمایه‌گذاری
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  محل نمایش فرصت‌ها و اطلاعیه‌های سرمایه‌گذاری پس از دریافت و اعتبارسنجی
                </p>
              </div>
              <button
                onClick={() => setFilters(prev => ({ ...prev, category: 'investment_opportunities' }))}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:underline pt-2 border-t border-slate-100 dark:border-slate-800 text-right cursor-pointer"
              >
                <span>مشاهده اطلاعات این بخش</span>
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
