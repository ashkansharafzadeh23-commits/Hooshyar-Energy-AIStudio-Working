import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Briefcase, 
  Wrench, 
  ArrowLeft, 
  Box, 
  Eye, 
  Sparkles, 
  ShieldCheck, 
  Compass, 
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import {
  DashboardHeader,
  AttentionCenter,
  ActiveProjects,
  RoleSummary,
  NewUserOnboarding,
  DashboardAttentionItem,
  DashboardMetric
} from '../../components/dashboard';
import { EnergyProject } from '../../types/project';
import { PageContainer } from '../../components/common/PageContainer';
import { UserProfile } from '../../context/AuthContext';

export default function CustomerDashboardPreview() {
  // DEV-ONLY HARD GUARD: Completely disabled in production builds
  if (!import.meta.env.DEV) {
    return null;
  }

  // Preview Mode: Toggle between Active Customer Workspace and Empty/Onboarding State
  const [previewMode, setPreviewMode] = useState<'ACTIVE' | 'EMPTY'>('ACTIVE');
  // Mobile Collapsible Toolbar state
  const [isMobileToolbarOpen, setIsMobileToolbarOpen] = useState(false);

  // Realistic mock customer user profile
  const mockUser: UserProfile = {
    id: 'dev-preview-customer',
    name: 'مهندس رضایی (پیش‌نمایش خریدار)',
    role: 'PROJECT_OWNER',
    roles: ['PROJECT_OWNER'],
    phone: '09123456789'
  };

  // Sample real-shaped energy projects for active state
  const mockProjects: EnergyProject[] = [
    {
      id: 'prj-dev-1',
      projectCode: 'PRJ-2026-001',
      ownerId: 'dev-preview-customer',
      title: 'نیروگاه خورشیدی متصل به شبکه ۱۰۰ کیلوواتی',
      projectType: 'SOLAR',
      status: 'READY_FOR_RFQ',
      location: {
        country: 'Iran',
        province: 'اصفهان',
        city: 'کاشان',
        address: 'شهرک صنعتی راوند'
      },
      site: {
        type: 'ROOFTOP',
        areaM2: 1200,
        usableAreaM2: 950
      },
      targetCapacityKw: 100,
      createdAt: '2026-09-28T09:00:00Z',
      updatedAt: '2026-10-01T14:30:00Z'
    },
    {
      id: 'prj-dev-2',
      projectCode: 'PRJ-2026-002',
      ownerId: 'dev-preview-customer',
      title: 'سامانه خورشیدی تجاری ۲۰ کیلوواتی با ذخیره‌ساز',
      projectType: 'SOLAR_BATTERY',
      status: 'BIDS_RECEIVED',
      location: {
        country: 'Iran',
        province: 'فارس',
        city: 'شیراز',
        address: 'بلوار مدرس'
      },
      site: {
        type: 'ROOFTOP',
        areaM2: 300,
        usableAreaM2: 220
      },
      targetCapacityKw: 20,
      createdAt: '2026-09-15T11:00:00Z',
      updatedAt: '2026-10-02T08:15:00Z'
    }
  ];

  // Attention Center items for active state
  const activeAttentionItems: DashboardAttentionItem[] = [
    {
      id: 'ready-rfq-prj-dev-1',
      title: 'پروژه آماده انتشار استعلام قیمت (RFQ) است',
      description: 'اسناد فنی و مدارک پروژه «نیروگاه خورشیدی متصل به شبکه ۱۰۰ کیلوواتی» آماده انتشار و ارسال به پیمانکاران EPC است.',
      severity: 'URGENT',
      category: 'RFQ',
      actionLabel: 'مشاهده و انتشار',
      actionHref: '/target-select',
      badgeText: 'PRJ-2026-001'
    },
    {
      id: 'bids-received-prj-dev-2',
      title: 'پیشنهادهای جدید پیمانکاران در انتظار بررسی است',
      description: '۲ پیشنهاد جدید از پیمانکاران EPC برای پروژه شیراز دریافت شده و نیازمند بررسی است.',
      severity: 'WARNING',
      category: 'RFQ',
      actionLabel: 'بررسی پیشنهادها',
      actionHref: '/contractors',
      badgeText: 'PRJ-2026-002'
    }
  ];

  // Portfolio metrics for active state
  const mockMetrics: DashboardMetric[] = [
    {
      id: 'active_projects',
      label: 'پروژه‌های فعال',
      value: '۲ پروژه',
      provenance: 'REAL',
      subtext: 'در حال پیشرفت'
    },
    {
      id: 'planned_capacity',
      label: 'مجموع ظرفیت هدف',
      value: '۱۲۰ کیلووات',
      provenance: 'CALCULATED',
      subtext: 'محاسبه‌شده'
    },
    {
      id: 'rfq_status',
      label: 'استعلام‌های RFQ',
      value: '۱ استعلام فعال',
      provenance: 'REAL',
      subtext: 'آماده ارسال'
    },
    {
      id: 'attention_count',
      label: 'اقدامات فوری',
      value: '۲ مورد',
      provenance: 'REAL',
      subtext: 'نیازمند اقدام'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16" dir="rtl">
      {/* Dev-Only QA Toolbar (Guarded by import.meta.env.DEV) */}
      <aside aria-label="نوار ابزار پیش‌نمایش توسعه" className="sticky top-0 z-40 bg-amber-500/10 dark:bg-amber-950/50 border-b border-amber-300/80 dark:border-amber-800/80 backdrop-blur-md px-3 sm:px-4 py-2">
        {/* Mobile Compact Collapsible Bar */}
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsMobileToolbarOpen(prev => !prev)}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-950 dark:text-amber-100 bg-amber-200/80 dark:bg-amber-900/80 px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 min-h-[36px]"
              aria-expanded={isMobileToolbarOpen}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>پیش‌نمایش توسعه</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/60 dark:bg-black/30 font-medium">
                {previewMode === 'ACTIVE' ? 'فعال' : 'جدید'}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isMobileToolbarOpen ? 'rotate-180' : ''}`} />
            </button>

            <Link
              to="/target-select"
              className="text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 min-h-[36px]"
            >
              <Compass size={13} />
              <span>تست تحلیل</span>
            </Link>
          </div>

          {/* Collapsible Mobile Controls */}
          {isMobileToolbarOpen && (
            <div className="pt-2.5 mt-2 border-t border-amber-300/60 dark:border-amber-800/60 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewMode('ACTIVE');
                  setIsMobileToolbarOpen(false);
                }}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold min-h-[36px] flex items-center justify-center gap-1.5 ${
                  previewMode === 'ACTIVE'
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Briefcase size={14} />
                <span>پروژه‌های فعال</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewMode('EMPTY');
                  setIsMobileToolbarOpen(false);
                }}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold min-h-[36px] flex items-center justify-center gap-1.5 ${
                  previewMode === 'EMPTY'
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Sparkles size={14} />
                <span>کاربر جدید</span>
              </button>
            </div>
          )}
        </div>

        {/* Desktop Inspection Toolbar */}
        <div className="hidden md:flex max-w-7xl mx-auto items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-mono text-[11px]">
              STAGE 13.3 DEV PREVIEW
            </span>
            <span>پیش‌نمایش بصری پیشخوان مشتری و فرآیند پروژه (Development Only)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400 font-medium">حالت نمایش:</span>
            <button
              type="button"
              onClick={() => setPreviewMode('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all min-h-[36px] flex items-center gap-1.5 ${
                previewMode === 'ACTIVE'
                  ? 'bg-[#0284C7] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Briefcase size={14} />
              <span>پیش‌خوان با پروژه‌های فعال</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('EMPTY')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all min-h-[36px] flex items-center gap-1.5 ${
                previewMode === 'EMPTY'
                  ? 'bg-[#0284C7] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Sparkles size={14} />
              <span>حالت کاربر جدید (Onboarding)</span>
            </button>
            <Link
              to="/target-select"
              className="px-3 py-1.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all min-h-[36px] flex items-center gap-1.5"
            >
              <Compass size={14} />
              <span>تست فرآیند تحلیل (/target-select)</span>
            </Link>
          </div>
        </div>
      </aside>

      <PageContainer className="py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* 1. Dashboard Header (Greeting / dashboard introduction) */}
        <DashboardHeader
          user={mockUser}
          activeRole="PROJECT_OWNER"
          activeOrganization={null}
        />

        {/* 2. ONE prominent mobile-specific primary CTA right below greeting (md:hidden) */}
        <div className="md:hidden">
          <Link
            to="/target-select"
            className="w-full flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-2xl bg-[#0284C7] hover:bg-[#0369a1] text-white font-bold text-sm shadow-md transition-all active:scale-[0.99]"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>شروع پروژه جدید</span>
          </Link>
        </div>

        {previewMode === 'ACTIVE' ? (
          /* Active Customer Workspace Layout: Projects first → actions → metrics → tools */
          <div className="flex flex-col space-y-6 sm:space-y-8">
            {/* A. Active Projects Workspace (Prioritized Early on Mobile) */}
            <div className="order-1 md:order-2">
              <ActiveProjects
                projects={mockProjects}
                maxDisplay={5}
              />
            </div>

            {/* B. Attention Center */}
            <div className="order-2 md:order-3">
              <AttentionCenter items={activeAttentionItems} />
            </div>

            {/* C. Portfolio Summary (Desktop Top / Mobile Compact 2x2 grid) */}
            <div className="order-3 md:order-1">
              <RoleSummary
                activeRole="PROJECT_OWNER"
                metrics={mockMetrics}
              />
            </div>

            {/* D. Operational Tools & Services */}
            <div className="order-4 md:order-4 space-y-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Wrench size={18} className="text-[#0284C7] dark:text-blue-400" />
                <h2 className="text-base sm:text-lg font-bold">ابزارها و خدمات عملیاتی</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {/* Dedicated Smart Maintenance Card */}
                <Link
                  to="/smart-maintenance"
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col justify-between group min-h-[130px] sm:min-h-[140px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0284C7] dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Wrench size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0284C7] dark:text-blue-300">
                        سرویس و عیب‌یابی
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0284C7] dark:group-hover:text-blue-400 transition-colors">
                      تعمیرات و نگهداری هوشمند
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      ثبت مشکل، تحلیل تصویر و پیگیری درخواست تعمیر و نگهداری
                    </p>
                  </div>
                  <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-[#0284C7] dark:text-blue-400">
                    <span>ورود به نگهداری هوشمند</span>
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* 3D Solar Planner */}
                <Link
                  to="/solar-planner"
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col justify-between group min-h-[130px] sm:min-h-[140px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Box size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        شبیه‌ساز سه‌بعدی
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      طراحی سه‌بعدی نیروگاه
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      جانمایی پنل‌ها روی سقف و محاسبه اثر سایه‌اندازی تجهیزات
                    </p>
                  </div>
                  <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                    <span>ورود به طراح سه‌بعدی</span>
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* RFQ & EPC Contractors Marketplace */}
                <Link
                  to="/contractors"
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between group min-h-[130px] sm:min-h-[140px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Briefcase size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        شبکه پیمانکاران
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      استعلام قیمت و پیمانکاران EPC
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      ارسال استعلام قیمت، دریافت پیشنهادها و انتخاب پیمانکار معتبر
                    </p>
                  </div>
                  <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>مشاهده بازارگاه پیمانکاران</span>
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Onboarding State Layout */
          <div className="space-y-8">
            {/* New Customer Focused Onboarding State */}
            <NewUserOnboarding activeRole="PROJECT_OWNER" />

            {/* Calm Empty Attention Center */}
            <AttentionCenter items={[]} />

            {/* Operational Tools */}
            <section className="space-y-3" aria-label="ابزارهای پیشخوان">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Wrench size={18} className="text-[#0284C7] dark:text-blue-400" />
                <h2 className="text-base sm:text-lg font-bold">ابزارها و خدمات عملیاتی</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                <Link
                  to="/smart-maintenance"
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col justify-between group min-h-[130px] sm:min-h-[140px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0284C7] dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Wrench size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0284C7] dark:text-blue-300">
                        سرویس و عیب‌یابی
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0284C7] dark:group-hover:text-blue-400 transition-colors">
                      تعمیرات و نگهداری هوشمند
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      ثبت مشکل، تحلیل تصویر و پیگیری درخواست تعمیر و نگهداری
                    </p>
                  </div>
                  <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-[#0284C7] dark:text-blue-400">
                    <span>ورود به نگهداری هوشمند</span>
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>

                <Link
                  to="/solar-planner"
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col justify-between group min-h-[130px] sm:min-h-[140px]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Box size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        شبیه‌ساز سه‌بعدی
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      طراحی سه‌بعدی نیروگاه
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      جانمایی پنل‌ها روی سقف و محاسبه اثر سایه‌اندازی تجهیزات
                    </p>
                  </div>
                  <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                    <span>ورود به طراح سه‌بعدی</span>
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>
            </section>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
