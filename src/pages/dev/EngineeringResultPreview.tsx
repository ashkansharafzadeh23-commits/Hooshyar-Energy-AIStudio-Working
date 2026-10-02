import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Check, 
  Info, 
  AlertTriangle, 
  Zap, 
  Share, 
  Map, 
  Lightbulb, 
  MessageSquare, 
  Send, 
  Save, 
  Trash2,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  Sun,
  Layers,
  Compass,
  DollarSign,
  TrendingDown,
  Sparkles,
  ShoppingBag,
  Cpu,
  FileCheck2,
  Eye,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import SavingsCalculator from '../../components/SavingsCalculator';
import EnergyEfficiencyChart from '../../components/EnergyEfficiencyChart';
import MonthlyGenerationChart from '../../components/MonthlyGenerationChart';
import { SmartWarning } from '../../components/SmartWarning';
import { AdBanner } from '../../components/AdBanner';
import { PanelComparisonTable } from '../../components/PanelComparisonTable';
import { DataTruthBadge } from '../../components/common/DataTruthBadge';
import { 
  AnalysisExecutiveSummary, 
  SolarDataSource, 
  EngineeringDetails, 
  FinancialOverview, 
  AIResultExplanation 
} from '../../components/analysis';

export default function EngineeringResultPreview() {
  // DEV-ONLY HARD GUARD: Fail closed outside development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  // Preview States: 'COMPLETE' (کامل) or 'FALLBACK' (اطلاعات ناقص)
  const [previewState, setPreviewState] = useState<'COMPLETE' | 'FALLBACK'>('COMPLETE');
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<{ name: string; monthlySunHours: Record<string, number>; systemKwp: number }[]>([]);
  const [previewProjectCreated, setPreviewProjectCreated] = useState(false);

  // ---------------------------------------------------------------------------
  // FIXTURE 1: COMPLETE RESULT (کامل)
  // ---------------------------------------------------------------------------
  const completeFixture = {
    analysisId: 'anl_dev_preview_complete_2026',
    summary: 'بر اساس موقعیت جغرافیایی تهران و مصرف ماهانه ۴۵۰ کیلووات‌ساعت، یک سامانه خورشیدی متصل به شبکه با ظرفیت ۵.۵ کیلووات‌پیک با ۱۰ ماژول ۵۵۰ وات مونوکریستال پیشنهاد می‌شود.',
    energySavingTips: [
      { title: 'استفاده از مصارف سنگین در ساعات اوج تابش', description: 'انتقال مصرف ماشین لباسشویی و ظرفشویی به ساعات ۱۱ الی ۱۵ جهت حداکثر بهره‌برداری مستقیم از برق خورشیدی.' },
      { title: 'سرویس دوره‌ای پنل‌ها در فصل خشک', description: 'شستشوی ماهانه پنل‌ها در تابستان باعث جلوگیری از افت ۵ الی ۱۰ درصدی توان ناشی از گرد و خاک می‌شود.' }
    ],
    solar: {
      finalKwp: 5.5,
      panelCount: 10,
      annualGenerationKwh: 8250,
      estimatedAnnualKwh: 8250,
      requiredAreaM2: 32.5,
      estimatedTotalCost: 2450000000, // 245 Million Tomans (in Rials)
      panelOptions: {
        economy: {
          panelWattage: 450,
          panelCount: 12,
          requiredAreaM2: 35,
          productId: 'prod_econ_450',
          panel: { brand: 'تابان نیرو', model: 'TN-450M Mono' }
        },
        balanced: {
          panelWattage: 550,
          panelCount: 10,
          requiredAreaM2: 32.5,
          productId: 'prod_bal_550',
          panel: { brand: 'Canadian Solar', model: 'HiKu6 CS6W-550MS' }
        },
        spaceSaving: {
          panelWattage: 650,
          panelCount: 8,
          requiredAreaM2: 28,
          productId: 'prod_space_650',
          panel: { brand: 'Jinko Solar', model: 'Tiger Pro 650W' }
        },
        default: {
          panelWattage: 550,
          panelCount: 10,
          requiredAreaM2: 32.5,
          productId: 'prod_bal_550',
          panel: { brand: 'Canadian Solar', model: 'HiKu6 CS6W-550MS' }
        }
      }
    },
    dataSource: {
      source: 'NASA_POWER',
      sourceLabel: 'پایگاه ماهواره‌ای ناسا (NASA POWER - میانگین ۲۲ ساله)',
      sunHours: 5.4,
      isReferenceOnly: false,
      monthlySunHours: {
        JAN: 4.2, FEB: 4.8, MAR: 5.2, APR: 5.8,
        MAY: 6.3, JUN: 6.8, JUL: 6.6, AUG: 6.2,
        SEP: 5.6, OCT: 4.9, NOV: 4.3, DEC: 3.9
      }
    },
    dailyConsumptionEstimate: {
      dailyKwh: 15.0,
      monthlyKwh: 450
    },
    recommendedProducts: [
      {
        id: 'prod_panel_01',
        category: 'پنل خورشیدی',
        brand: 'Canadian Solar',
        model: 'HiKu6 550W Mono-PERC',
        reason: 'بالاترین نسبت راندمان به قیمت و سازگاری با اقلیم نیمه‌خشک تهران',
        vendorName: 'فروشگاه آفتاب تابان',
        vendorCity: 'تهران',
        price: 98000000 // 9.8M Tomans per pack
      },
      {
        id: 'prod_inv_01',
        category: 'اینورتر متصل به شبکه',
        brand: 'SMA',
        model: 'Sunny Boy 5.0 AV-41',
        reason: 'مبدل تک‌فاز ۵ کیلووات با دو ورودی MPPT مجزا جهت جبران سایه‌اندازی جان‌پناه',
        vendorName: 'پارس سولار پایتخت',
        vendorCity: 'تهران',
        price: 112000000 // 11.2M Tomans
      },
      {
        id: 'prod_rack_01',
        category: 'سازه و استراکچر',
        brand: 'البرز سولار',
        model: 'سازه آلومینیومی آندایز ضدزنگ (شیب ۳۰ درجه)',
        reason: 'مقاوم در برابر باد تا سرعت ۱۲۰ کیلومتر و وزن سبک جهت سقف بتنی',
        vendorName: 'سازه گستران انرژی',
        vendorCity: 'کرج',
        price: 35000000 // 3.5M Tomans
      }
    ],
    requiredAccessories: [
      { name: 'کابل مخصوص خورشیدی ۴ میلی‌متر دو روکش ضد UV', availableInCatalog: true },
      { name: 'کانکتور استاندارد ضدآب MC4 اصل', availableInCatalog: true },
      { name: 'تابلو حفاظت AC و DC مجهز به سرج ارستر و فیوز فیوز گازی', availableInCatalog: true },
      { name: 'سیستم اتصال به زمین (چاه ارت مستقل استاندارد)', availableInCatalog: false }
    ],
    warnings: [
      { severity: 'warning', message: 'شیب بهینه ۳۰ درجه نیازمند حداقل فاصله ۲.۲ متری بین ردیف‌ها جهت عدم سایه‌اندازی در انقلاب زمستانی است.' }
    ]
  };

  // ---------------------------------------------------------------------------
  // FIXTURE 2: FALLBACK / MISSING OPTIONAL DATA (اطلاعات ناقص)
  // ---------------------------------------------------------------------------
  const fallbackFixture = {
    analysisId: 'anl_dev_preview_fallback_2026',
    summary: 'تحلیل بر مبنای برآورد امکان‌سنجی اولیه انجام شد. جهت دریافت مدل مهندسی قطعی، ورود مساحت سقف و الگوی مصرف الزامی است.',
    energySavingTips: [],
    solar: {
      finalKwp: 3.2,
      panelCount: null, // missing panel count
      annualGenerationKwh: null, // missing annual generation to test truthful missing state
      estimatedAnnualKwh: null,
      requiredAreaM2: null, // missing area
      estimatedTotalCost: null, // missing cost
      panelOptions: null
    },
    dataSource: {
      source: 'REGIONAL_REFERENCE',
      sourceLabel: 'داده مرجع امکان‌سنجی منطقه‌ای',
      sunHours: 4.6,
      isReferenceOnly: true,
      monthlySunHours: null // missing monthly breakdown
    },
    dailyConsumptionEstimate: {
      dailyKwh: 0,
      monthlyKwh: 0
    },
    recommendedProducts: [],
    requiredAccessories: [],
    warnings: [
      { severity: 'error', message: 'اطلاعات مساحت و مصرف اعلام نشده است؛ ارقام فوق صرفاً برآورد تخمینی هستند.' }
    ]
  };

  const activeResult = previewState === 'COMPLETE' ? completeFixture : fallbackFixture;
  const solar = activeResult.solar;
  const dataSource = activeResult.dataSource;
  const dailyEstimate = activeResult.dailyConsumptionEstimate;

  const handleSimulateChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [
      ...prev,
      { role: 'user', text: msg },
      { role: 'assistant', text: `(پاسخ شبیه‌ساز پیش‌نمایش): به ازای سوال «${msg}»، سیستم به صورت خودکار ظرفیت ماژول‌ها را ارزیابی می‌کند.` }
    ]);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 pb-16" dir="rtl">
      {/* ========================================================================= */}
      {/* COMPACT & COLLAPSIBLE MOBILE DEV PREVIEW TOOLBAR                         */}
      {/* ========================================================================= */}
      <aside 
        aria-label="نوار ابزار پیش‌نمایش مهندسی و مالی"
        className="sticky top-0 z-50 bg-slate-900/95 text-white backdrop-blur-md border-b border-slate-800 shadow-md text-xs"
      >
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-bold text-slate-200">پیش‌نمایش توسعه مرحله ۱۳.۴</span>
            <span className="hidden sm:inline-block bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-400 border border-slate-700">
              بدون اتصال به دیتابیس تولید
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop State Toggle */}
            <div className="hidden sm:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewState('COMPLETE')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${previewState === 'COMPLETE' ? 'bg-[#0284C7] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
              >
                کامل (پروژه نمونه ۵.۵ kWp)
              </button>
              <button
                type="button"
                onClick={() => setPreviewState('FALLBACK')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${previewState === 'FALLBACK' ? 'bg-[#0284C7] text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
              >
                اطلاعات ناقص (Missing / Fallback)
              </button>
            </div>

            {/* Mobile Expand Button */}
            <button
              type="button"
              onClick={() => setIsToolbarOpen(!isToolbarOpen)}
              className="sm:hidden px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center gap-1.5"
            >
              <span>حالت: {previewState === 'COMPLETE' ? 'کامل' : 'ناقص'}</span>
              <ChevronDown size={14} className={`transition-transform ${isToolbarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Collapsed Drawer */}
        {isToolbarOpen && (
          <div className="sm:hidden px-4 pb-3 pt-1 border-t border-slate-800/80 bg-slate-900 space-y-2">
            <div className="text-[11px] text-slate-400">انتخاب وضعیت داده پیش‌نمایش:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setPreviewState('COMPLETE'); setIsToolbarOpen(false); }}
                className={`py-2 px-2 rounded-xl text-center font-bold text-xs ${previewState === 'COMPLETE' ? 'bg-[#0284C7] text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                کامل (۵.۵ kWp)
              </button>
              <button
                type="button"
                onClick={() => { setPreviewState('FALLBACK'); setIsToolbarOpen(false); }}
                className={`py-2 px-2 rounded-xl text-center font-bold text-xs ${previewState === 'FALLBACK' ? 'bg-[#0284C7] text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                اطلاعات ناقص
              </button>
            </div>
            <div className="text-[10px] text-slate-500 pt-1 text-center">
              قابل ارزیابی در عرض‌های ۳۶۰px، ۳۹۰px و ۴۳۰px در آیفون سافاری
            </div>
          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* REAL STAGE 13.4 RESULTS VIEW CANVAS (Rendering actual Result.tsx UI)     */}
      {/* ========================================================================= */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-10">
        {/* Header Breadcrumb & Jump Bar */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-200 dark:border-zinc-800">
            <nav className="flex items-center gap-2" aria-label="مسیر صفحه">
              <Link to="/dev/customer-dashboard-preview" className="hover:text-[#0284C7] transition-colors">پیش‌نمایش پیشخوان</Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-200 font-bold">گزارش تصمیم‌گیری مهندسی و مالی سامانه خورشیدی</span>
            </nav>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-400">
                کد تحلیل: {activeResult.analysisId}
              </span>
              <DataTruthBadge type={previewState === 'COMPLETE' ? 'VERIFIED_SOURCE' : 'REFERENCE_ESTIMATE'} size="sm" />
            </div>
          </div>

          {/* Project created banner if simulated */}
          {previewProjectCreated && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                    این تحلیل به پروژه مهندسی تبدیل شده است
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    می‌توانید اسناد فنی، استعلام قیمت پیمانکاران EPC و فرآیند اجرا را در میز کار پروژه پیگیری کنید.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1.5 rounded-lg">
                کد پروژه: PRJ-2026-PREVIEW
              </span>
            </div>
          )}

          {/* 5-Question Jump Navigation Tabs */}
          <div className="bg-slate-100 dark:bg-zinc-800/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 overflow-x-auto flex items-center gap-1.5 scrollbar-none text-xs">
            <button 
              type="button"
              onClick={() => scrollToSection('preview-q1')}
              className="px-3.5 py-2 rounded-xl font-bold bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-zinc-700 whitespace-nowrap hover:text-[#0284C7] transition-colors"
            >
              ۱. سیستم پیشنهادی
            </button>
            <button 
              type="button"
              onClick={() => scrollToSection('preview-q2')}
              className="px-3.5 py-2 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap transition-colors"
            >
              ۲. تولید برق و تراز فصلی
            </button>
            <button 
              type="button"
              onClick={() => scrollToSection('preview-q3')}
              className="px-3.5 py-2 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap transition-colors"
            >
              ۳. پیکربندی و تجهیزات
            </button>
            <button 
              type="button"
              onClick={() => scrollToSection('preview-q4')}
              className="px-3.5 py-2 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap transition-colors"
            >
              ۴. تحلیل مالی و بازگشت سرمایه
            </button>
            <button 
              type="button"
              onClick={() => scrollToSection('preview-q5')}
              className="px-3.5 py-2 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap transition-colors"
            >
              ۵. گام‌های اجرایی بعدی
            </button>
          </div>
        </header>

        {/* ===================================================================== */}
        {/* QUESTION 1: WHAT SYSTEM IS RECOMMENDED?                               */}
        {/* ===================================================================== */}
        <section id="preview-q1" className="space-y-6" aria-label="سیستم پیشنهادی چیست؟">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0284C7] dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
              گام ۱ از ۵
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              سیستم پیشنهادی خورشیدی و خلاصه مشخصات اجرایی
            </h2>
          </div>

          <AnalysisExecutiveSummary
            data={{
              recommendedKwp: solar.finalKwp,
              panelCount: solar.panelCount,
              estimatedAnnualKwh: solar.estimatedAnnualKwh,
              requiredAreaM2: solar.requiredAreaM2,
              locationLabel: previewState === 'COMPLETE' ? 'تهران، تهران' : 'ایران',
              sourceStatus: dataSource.isReferenceOnly ? 'FALLBACK_REGIONAL' : 'LIVE_NASA'
            }}
            onExploreEngineering={() => scrollToSection('preview-q3')}
            onCreateProject={() => setPreviewProjectCreated(true)}
            isProjectCreated={previewProjectCreated}
            projectId="PRJ-2026-PREVIEW"
          />

          <SolarDataSource
            locationLabel={previewState === 'COMPLETE' ? 'تهران، تهران' : 'منطقه پروژه'}
            sourceType={dataSource.source}
            peakSunHours={dataSource.sunHours}
            isFallback={dataSource.isReferenceOnly}
          />
        </section>

        {/* ===================================================================== */}
        {/* QUESTION 2: HOW MUCH ENERGY CAN IT PRODUCE?                           */}
        {/* ===================================================================== */}
        <section id="preview-q2" className="space-y-6 pt-4 border-t border-slate-200 dark:border-zinc-800" aria-label="چه میزان برق تولید می‌کند؟">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                  گام ۲ از ۵
                </span>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                  برآورد تولید انرژی و منحنی فصلی
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                پیش‌بینی تولید ماهانه با مدل تابش ناسا و تحلیل پوشش مصرف سالانه
              </p>
            </div>

            {dataSource.monthlySunHours && solar.finalKwp && (
              <button 
                type="button"
                onClick={() => {
                  setSavedScenarios(prev => [
                    ...prev,
                    { name: `سناریو آزمایشی ${prev.length + 1}`, monthlySunHours: dataSource.monthlySunHours!, systemKwp: solar.finalKwp! * 1.2 }
                  ]);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-[#0284C7] dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/40 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-xs font-bold min-h-[40px] shrink-0"
              >
                <Save size={15} />
                <span>افزودن سناریو مقایسه‌ای</span>
              </button>
            )}
          </div>

          {savedScenarios.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">سناریوهای مقایسه‌ای:</span>
              {savedScenarios.map(sc => (
                <div key={sc.name} className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-700 shadow-xs text-xs">
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{sc.name}</span>
                  <span className="text-[10px] text-slate-400">({sc.systemKwp.toFixed(1)} kWp)</span>
                  <button 
                    type="button"
                    onClick={() => setSavedScenarios(prev => prev.filter(s => s.name !== sc.name))} 
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Monthly Generation Chart */}
          {dataSource.monthlySunHours && solar.finalKwp ? (
            <MonthlyGenerationChart 
              monthlySunHours={dataSource.monthlySunHours} 
              systemKwp={solar.finalKwp} 
              compareScenarios={savedScenarios}
            />
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 text-center text-slate-500 dark:text-zinc-400 text-xs">
              منحنی ماهانه تابش برای این سناریو به صورت برخط موجود نیست
            </div>
          )}

          {/* Annual Energy Efficiency Chart */}
          {typeof solar.annualGenerationKwh === 'number' ? (
            <EnergyEfficiencyChart 
              monthlyConsumption={dailyEstimate?.monthlyKwh || 0}
              monthlyGeneration={Math.round(solar.annualGenerationKwh / 12)}
            />
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 text-center text-slate-500 dark:text-zinc-400 text-xs">
              داده تولید سالانه ثبت نشده است
            </div>
          )}
        </section>

        {/* ===================================================================== */}
        {/* QUESTION 3: WHAT EQUIPMENT / CONFIGURATION IS RECOMMENDED?             */}
        {/* ===================================================================== */}
        <section id="preview-q3" className="space-y-6 pt-4 border-t border-slate-200 dark:border-zinc-800" aria-label="چه تجهیزاتی پیشنهاد شده است؟">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40">
                گام ۳ از ۵
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                پیکربندی مهندسی و مشخصات فنی تجهیزات
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ماژول‌های فتوولتائیک، اینورتر، زاویه نصب جغرافیایی و استانداردهای حفاظتی
            </p>
          </div>

          <EngineeringDetails
            dcCapacityKwp={solar.finalKwp}
            panelWattage={previewState === 'COMPLETE' ? 550 : null}
            panelCount={solar.panelCount}
            totalAreaM2={previewState === 'COMPLETE' ? 120 : null}
            usableAreaM2={solar.requiredAreaM2}
          />

          {/* Panel Comparison Table */}
          {solar.panelOptions && (
            <PanelComparisonTable panelOptions={solar.panelOptions} />
          )}

          {/* Equipment BOM */}
          {activeResult.recommendedProducts && activeResult.recommendedProducts.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden text-right">
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex flex-wrap justify-between items-center gap-2 bg-slate-50/70 dark:bg-zinc-800/40">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[#0284C7]" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    تجهیزات و برآورد صورت اقلام (BOM)
                  </h3>
                </div>
                <span className="text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-medium">
                  کاتالوگ رسمی تجهیزات
                </span>
              </div>

              <div className="p-4 sm:p-5 divide-y divide-slate-100 dark:divide-zinc-800 space-y-4">
                {activeResult.recommendedProducts.map((prod: any, i: number) => (
                  <div key={i} className="pt-4 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700">
                        <Cpu size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#0284C7] bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                            {prod.category}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {prod.brand} {prod.model}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {prod.reason}
                        </p>
                        <div className="text-[11px] text-slate-400 mt-1">
                          تأمین‌کننده: {prod.vendorName} ({prod.vendorCity})
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block sm:hidden">قیمت:</span>
                        <span className="text-base font-black text-slate-900 dark:text-slate-100">
                          {(prod.price / 10).toLocaleString()} <span className="text-xs font-normal text-slate-500">تومان</span>
                        </span>
                      </div>
                      <span className="px-3 py-1 rounded-lg text-xs font-medium text-[#0284C7] bg-blue-50 dark:bg-blue-950/40">
                        تاییدیه کیفی ساتبا
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {solar.estimatedTotalCost && (
                <div className="p-4 sm:p-5 bg-blue-50/50 dark:bg-blue-950/20 border-t border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      جمع برآورد هزینه تجهیزات اصلی:
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      * بدون احتساب هزینه‌های ترابری، سازه اختصاصی، کابل‌کشی و نظارت مهندسی
                    </p>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#0284C7] dark:text-blue-400">
                    {(solar.estimatedTotalCost / 10).toLocaleString()} <span className="text-xs font-normal text-slate-500">تومان</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accessories Checklist */}
          {activeResult.requiredAccessories && activeResult.requiredAccessories.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-right">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                <FileCheck2 size={16} className="text-[#0284C7]" />
                <span>چک‌لیست تجهیزات جانبی و اتصالات مورد نیاز استاندارد</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {activeResult.requiredAccessories.map((acc: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 text-xs">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${acc.availableInCatalog ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {acc.availableInCatalog ? '✓' : '•'}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{acc.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Warnings */}
          <div className="space-y-3">
            {activeResult.warnings.map((w: any, i: number) => (
              <div key={i} className={`p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed ${
                w.severity === 'error' 
                  ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300' 
                  : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
              }`}>
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-0.5">نکته مهندسی و ایمنی سیستم:</strong>
                  <span>{w.message}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===================================================================== */}
        {/* QUESTION 4: WHAT ARE THE ECONOMICS & PAYBACK?                         */}
        {/* ===================================================================== */}
        <section id="preview-q4" className="space-y-6 pt-4 border-t border-slate-200 dark:border-zinc-800" aria-label="تحلیل مالی و بازگشت سرمایه">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                گام ۴ از ۵
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                ارزیابی مالی، سرمایه‌گذاری و بازگشت سرمایه
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تفکیک دقیق ورودی‌ها، مفروضات بازار و نتایج محاسباتی بدون قطعیت کاذب
            </p>
          </div>

          <FinancialOverview
            estimatedCostIRR={solar.estimatedTotalCost}
            annualSavingsIRR={null}
            simplePaybackYears={null}
            capacityKwp={solar.finalKwp}
            monthlyConsumptionKwh={dailyEstimate.monthlyKwh}
          />

          <SavingsCalculator 
            monthlyKwh={dailyEstimate.monthlyKwh}
            totalCost={solar.estimatedTotalCost || 0}
            targets={['solar']}
          />
        </section>

        {/* ===================================================================== */}
        {/* QUESTION 5: WHAT ARE THE NEXT ACTIONABLE STEPS?                       */}
        {/* ===================================================================== */}
        <section id="preview-q5" className="space-y-6 pt-4 border-t border-slate-200 dark:border-zinc-800" aria-label="گام‌های اجرایی بعدی چیست؟">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0284C7]/10 text-[#0284C7] dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
                گام ۵ از ۵
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                گام‌های بعدی و اقدامات اجرایی پروژه
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تبدیل به پروژه رسمی، انتشار مناقصه و دریافت استعلام قیمت از پیمانکاران واجد صلاحیت
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Action Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/60 to-white dark:from-zinc-900 dark:to-zinc-900 border-2 border-[#0284C7]/30 dark:border-blue-800 shadow-sm flex flex-col justify-between text-right">
              <div>
                <div className="flex items-center gap-2 text-[#0284C7] mb-2 font-bold text-xs">
                  <CheckCircle2 size={16} />
                  <span>اقدام پیشنهادی اول</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                  ثبت پروژه و دریافت استعلام قیمت EPC
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  با تبدیل این تحلیل به پروژه، مشخصات محل و ظرفیت در پیشخوان اختصاصی شما ثبت شده و می‌توانید از پیمانکاران تاییدشده استعلام فنی و مالی دریافت کنید.
                </p>
              </div>

              <button 
                type="button"
                onClick={() => setPreviewProjectCreated(true)}
                className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm min-h-[44px] cursor-pointer"
              >
                <span>تبدیل تحلیل به پروژه و انتشار استعلام (شبیه‌سازی) 🚀</span>
                <ArrowLeft size={16} />
              </button>
            </div>

            {/* Secondary Action: 3D Solar Planner */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between text-right">
              <div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2 font-bold text-xs">
                  <Zap size={16} />
                  <span>شبیه‌ساز بصری</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                  طراحی سه‌بعدی سقف و چیدمان پنل‌ها
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  زاویه شیب، آرایش رشته‌ها (String) و تاثیر موانع سایه‌انداز (کولر، دودکش و جان‌پناه) را روی سقف خود شبیه‌سازی کنید.
                </p>
              </div>

              <Link 
                to="/solar-planner"
                className="w-full bg-slate-900 dark:bg-zinc-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-zinc-900 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors min-h-[44px]"
              >
                <Zap size={16} />
                <span>ورود به شبیه‌ساز سه‌بعدی سقف</span>
              </Link>
            </div>
          </div>

          {/* AI Advisor Explanation */}
          <AIResultExplanation
            summary={activeResult.summary}
            energySavingTips={activeResult.energySavingTips}
            aiStatus="SUCCESS"
            recommendedCapacityKwp={solar.finalKwp}
            locationLabel="تهران"
          />

          {/* Chat Consultation */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm text-right">
            <div className="flex items-center gap-2 mb-2 font-bold text-sm text-slate-900 dark:text-slate-100">
              <MessageSquare size={18} className="text-[#0284C7]" />
              <h3>پرسش از مشاور هوشمند درباره سناریوی بهینه</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              اگر سوالی درباره تغییر ظرفیت، اضافه کردن باتری، یا تغییر الگوی مصرف دارید، اینجا بنویسید:
            </p>
            
            <div className="space-y-3 mb-4 max-h-[220px] overflow-y-auto pr-1">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 border border-blue-100 dark:border-blue-900/50' 
                      : 'bg-slate-50 text-slate-800 dark:bg-zinc-800/60 dark:text-slate-200 border border-slate-100 dark:border-zinc-700/60'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSimulateChat} className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="مثلاً: اگر مصرف تابستان ۲۰٪ بیشتر شود، چه تغییری در ظرفیت نیاز است؟"
                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl pl-12 pr-4 py-3 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-[#0284C7] outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-[#0284C7] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* Ad Banner */}
          <div className="w-full pt-2">
            <AdBanner layout="banner" />
          </div>
        </section>
      </main>
    </div>
  );
}
