import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sun, 
  Zap, 
  ArrowLeft, 
  ShieldCheck, 
  Wrench, 
  Calculator, 
  Layers, 
  Store, 
  Building2, 
  Factory, 
  Briefcase, 
  CheckCircle2, 
  Menu, 
  X, 
  ChevronDown,
  Compass,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Activity,
  Megaphone
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';

const HERO_SOLAR_PLANT_IMAGE = '/src/assets/images/94B5ADA2-0D66-41C9-B44A-5DF12CDA85D9.png';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors flex flex-col" dir="rtl">
      
      {/* 1. PUBLIC LANDING HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo & Wordmark */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link 
              to="/" 
              className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] rounded-lg"
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800 bg-amber-500/10 flex items-center justify-center shrink-0">
                <img 
                  src="/src/assets/images/solar_app_logo_1786611269806.jpg" 
                  alt="هوشیار انرژی" 
                  className="w-full h-full object-cover scale-125"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  هوشیار انرژی
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] inline-block" />
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline-block">
                  زیرساخت دیجیتال پروژه‌های خورشیدی
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <Link 
                to="/target-select" 
                className="px-3 py-2 rounded-xl hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
              >
                امکان‌سنجی و طراحی
              </Link>
              <a 
                href="#lifecycle" 
                className="px-3 py-2 rounded-xl hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
              >
                چرخه پروژه
              </a>
              <a 
                href="#solutions" 
                className="px-3 py-2 rounded-xl hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
              >
                راهکارها
              </a>
              <Link 
                to="/contractors" 
                className="px-3 py-2 rounded-xl hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
              >
                شبکه پیمانکاران EPC
              </Link>
              <Link 
                to="/ads/portal" 
                className="px-3 py-2 rounded-xl hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                aria-label="تبلیغات و معرفی برند"
              >
                تبلیغات و معرفی برند
              </Link>
              <Link 
                to="/smart-maintenance" 
                className="px-3 py-2 rounded-xl hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
              >
                تعمیرات هوشمند
              </Link>
            </nav>
          </div>

          {/* Desktop Left Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <ThemeToggle />

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-colors shadow-xs"
              >
                <span>ورود به پیشخوان</span>
                <ArrowLeft size={14} />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/customer-login"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>ورود به سامانه</span>
                </Link>
                <Link
                  to="/target-select"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] transition-colors shadow-xs"
                >
                  <Calculator size={14} />
                  <span>شروع تحلیل پروژه</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden focus:outline-none cursor-pointer"
              aria-label="منوی ناوبری"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <Link
              to="/target-select"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold"
            >
              <span>امکان‌سنجی و طراحی هوشمند</span>
              <ArrowLeft size={16} className="text-slate-400" />
            </Link>
            <a
              href="#lifecycle"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold"
            >
              <span>چرخه اجرای پروژه‌ها</span>
              <ArrowLeft size={16} className="text-slate-400" />
            </a>
            <a
              href="#solutions"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold"
            >
              <span>راهکارها برای صنایع و مالکان</span>
              <ArrowLeft size={16} className="text-slate-400" />
            </a>
            <Link
              to="/contractors"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold"
            >
              <span>شبکه پیمانکاران EPC و استعلام‌ها</span>
              <ArrowLeft size={16} className="text-slate-400" />
            </Link>
            <Link
              to="/ads/portal"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold text-slate-700 dark:text-slate-300"
              aria-label="تبلیغات و معرفی برند"
            >
              <div className="flex items-center gap-2.5">
                <Megaphone size={16} className="text-slate-500 dark:text-slate-400" />
                <span>تبلیغات و معرفی برند</span>
              </div>
              <ArrowLeft size={16} className="text-slate-400" />
            </Link>
            <Link
              to="/smart-maintenance"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold"
            >
              <span>تعمیرات و نگهداری هوشمند</span>
              <ArrowLeft size={16} className="text-slate-400" />
            </Link>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <Link
                to="/customer-login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2.5 text-center rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                ورود به سامانه
              </Link>
              <Link
                to="/target-select"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2.5 text-center rounded-xl bg-[#0284C7] text-white text-xs font-bold shadow-xs"
              >
                تحلیل پروژه
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-28 border-b border-slate-200/80 dark:border-slate-800/80">
        {/* Subtle Architectural Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#0284C7_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] dark:opacity-[0.06] pointer-events-none" />
        
        {/* Real Solar Photo Atmospheric Layer — Approved Hooshyar Energy Asset */}
        <div 
          className="absolute top-0 inset-x-0 h-[620px] sm:h-[680px] lg:h-full lg:inset-0 overflow-hidden pointer-events-none select-none z-0" 
          aria-hidden="true"
        >
          {/* Responsive Photographic Solar Field Layer with Mobile-Specific Crop & Alignment */}
          <img
            src={HERO_SOLAR_PLANT_IMAGE}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-[25%_65%] sm:object-[center_35%] lg:object-[center_28%] scale-115 sm:scale-105 lg:scale-100 origin-[25%_70%] lg:origin-center opacity-45 sm:opacity-40 lg:opacity-40 dark:opacity-25 lg:dark:opacity-25 transition-opacity duration-300"
          />

          {/* Editorial Narrative Mask: Balanced top-down wash on mobile, lateral RTL fade on desktop */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAFC]/65 via-[#F8FAFC]/45 to-[#F8FAFC]/90 lg:bg-gradient-to-l lg:from-[#F8FAFC]/95 lg:via-[#F8FAFC]/75 lg:to-transparent dark:from-slate-950/75 dark:via-slate-950/55 dark:to-slate-950/90 dark:lg:from-slate-950/95 dark:lg:via-slate-950/75 dark:lg:to-transparent" />

          {/* Bottom Edge Dissolve: Seamless transition into canvas before/around the preview card */}
          <div className="absolute inset-x-0 bottom-0 h-32 sm:h-40 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/80 to-transparent dark:from-slate-950 dark:via-slate-950/80 dark:to-transparent" />

          {/* Top Edge Dissolve: Soft integration under sticky navigation header */}
          <div className="absolute inset-x-0 top-0 h-16 sm:h-20 bg-gradient-to-b from-[#F8FAFC] via-[#F8FAFC]/60 to-transparent dark:from-slate-950 dark:via-slate-950/60 dark:to-transparent" />

          {/* Solar Energy Golden Hour Atmosphere Tint */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0284C7]/5 via-transparent to-amber-500/10 dark:from-sky-950/20 dark:to-amber-900/10 mix-blend-multiply dark:mix-blend-screen" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Right: Editorial Narrative */}
            <div className="lg:col-span-7 space-y-6 text-right">
              {/* Product Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[#0284C7] dark:text-blue-300 text-xs font-bold">
                <Sun size={14} className="text-amber-500" />
                <span>زیرساخت دیجیتال یکپارچه پروژه‌های انرژی خورشیدی</span>
              </div>

              {/* Main Headline with Rebalanced Color Hierarchy */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.25] text-balance">
                طراحی، اجرا و مدیریت
                <span className="block text-emerald-600 dark:text-emerald-400 mt-1">
                  پروژه‌های خورشیدی
                </span>
                با هوش مصنوعی
              </h1>

              {/* Supporting Copy */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-2xl">
                از امکان‌سنجی فنی و طراحی مهندسی تا انتشار مناقصه، انتخاب پیمانکار EPC، تأمین تجهیزات و پایش عملیاتی؛ چرخه کامل سرمایه‌گذاری نیروگاه خورشیدی را در یک پلتفرم استاندارد مدیریت کنید.
              </p>

              {/* Primary Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/target-select"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] transition-all shadow-sm hover:shadow hover:-translate-y-0.5"
                >
                  <Calculator size={18} />
                  <span>شروع تحلیل پروژه</span>
                  <ArrowLeft size={16} />
                </Link>

                <a
                  href="#solutions"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <span>مشاهده راهکارها</span>
                  <ChevronDown size={16} className="opacity-70" />
                </a>
              </div>

              {/* Verified Trust Strip with Restrained Semantic Differentiation */}
              <div className="pt-4 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-medium bg-blue-50/80 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200/60 dark:border-blue-900/40 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={13} className="text-[#0284C7] dark:text-blue-400 shrink-0" />
                  محاسبه برمبنای فرمول‌های استاندارد، داده‌های تابش و تعرفه‌های بورس انرژی
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium bg-emerald-50/80 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300">
                  <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  شبکه مجریان و پیمانکاران ارزیابی‌شده
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium bg-amber-50/80 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-900/40 text-slate-700 dark:text-slate-300">
                  <Sun size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  تجهیزات دارای استاندارد فنی
                </span>
              </div>
            </div>

            {/* Left: Architectural Platform Visual Preview */}
            <div className="lg:col-span-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden">
                {/* Browser Titlebar */}
                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    hooshyarenergy.ir/analysis
                  </span>
                  <div className="w-4" />
                </div>

                {/* Simulated Real Dashboard Content */}
                <div className="p-5 space-y-4 text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      نمونه تحلیل پروژه
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#0284C7] dark:text-blue-300">
                      نمایش نمونه
                    </span>
                  </div>

                  {/* Metric Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">ظرفیت پیشنهادی</span>
                      <span className="text-lg font-black font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        ۱۰۰ <span className="text-xs font-sans font-medium text-slate-500">kWp</span>
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">تولید سالانه</span>
                      <span className="text-lg font-black font-mono tabular-nums text-[#0284C7] dark:text-blue-400">
                        ۱۷۵ <span className="text-xs font-sans font-medium text-slate-500">MWh</span>
                      </span>
                    </div>
                  </div>

                  {/* Financial Simulation Preview */}
                  <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 dark:text-slate-400">درآمد سالانه برآوردشده:</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">۶۵۰ میلیون تومان</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#0284C7] h-full rounded-full" style={{ width: '78%' }} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>دوره بازگشت سرمایه: ۳.۲ سال</span>
                      <span>ضریب دسترسی: ۹۸.۵٪</span>
                    </div>
                  </div>

                  {/* Sample Values Disclosure */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-right">
                    اعداد این بخش صرفاً نمونه‌ای از نحوه نمایش نتایج هستند و نتیجه واقعی پس از ورود اطلاعات پروژه محاسبه می‌شود.
                  </div>

                  {/* Micro Next Action */}
                  <Link
                    to="/target-select"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>امکان‌سنجی رایگان ساختگاه شما</span>
                    <ArrowLeft size={14} />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. CAPABILITIES BAR (Verified Product Pillars — Zero Fake Traction Metrics) */}
      <section className="py-12 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-colors flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0284C7] dark:text-blue-400 flex items-center justify-center shrink-0">
                <Calculator size={20} />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">تحلیل دقیق فنی و اقتصادی</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  برآورد تابش اقلیمی، شبیه‌سازی تولید سالانه و محاسبه بازگشت سرمایه.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <FileCheck2 size={20} />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">استعلام رقابتی قیمت (RFQ)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  دریافت و مقایسه شفاف پیشنهادهای فنی و مالی از شرکت‌های مجری EPC.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800 transition-colors flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Store size={20} />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">شبکه تأمین‌کنندگان معتبر</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  دسترسی مستقیم به تأمین‌کنندگان رسمی پنل، اینورتر و تجهیزات استاندارد.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-800 transition-colors flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Wrench size={20} />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">تعمیرات و نگهداری هوشمند</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  ثبت خرابی تجهیزات، بارگذاری تصویر، عیبیابی هوشمند و ارتباط با تعمیرکار متخصص
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. USER SEGMENT SECTION (Ecosystem Value Proposition) */}
      <section id="solutions" className="py-16 sm:py-24 bg-[#F8FAFC] dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold text-[#0284C7] dark:text-blue-400 tracking-wide uppercase">
              اکوسیستم هوشیار انرژی
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              راهکارهای تخصصی برای ذی‌نفعان صنعت خورشیدی
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              پلتفرمی طراحی‌شده برای تمام نقش‌های زنجیره ارزش انرژی خورشیدی در کشور
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Segment 1: Residential & Building Owners */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0284C7] dark:text-blue-400 flex items-center justify-center">
                  <Building2 size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">کاربران خانگی و ساختمان‌ها</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  برآورد هزینه و توان تولید سقف خورشیدی، حذف خاموشی برق اضطراری و معرفی نصابان دارای صلاحیت در هر شهر.
                </p>
              </div>
              <Link 
                to="/target-select" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0284C7] hover:text-[#0369A1] transition-colors"
              >
                <span>محاسبه سقف مسکونی</span>
                <ArrowLeft size={14} />
              </Link>
            </div>

            {/* Segment 2: Commercial & Industrial */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Factory size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">کسب‌وکارها و صنایع</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  پوشش الزامات ماده ۱۶ قانون جهش تولید دانش‌بنیان، جلوگیری از توقف خط تولید در پیک تابستان و درآمدزایی از تابلو سبز.
                </p>
              </div>
              <Link 
                to="/target-select" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <span>امکان‌سنجی صنعتی</span>
                <ArrowLeft size={14} />
              </Link>
            </div>

            {/* Segment 3: EPC Contractors */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <Briefcase size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">شرکت‌های مجری و پیمانکاران EPC</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  دریافت استعلام‌های آماده سرمایه‌گذاران، ارسال پیشنهادهای تفکیک‌شده فنی و تجاری، و مدیریت یکپارچه پرونده‌ها.
                </p>
              </div>
              <Link 
                to="/contractor-auth" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-slate-950 transition-colors"
              >
                <span>ورود به پرتال مجریان</span>
                <ArrowLeft size={14} />
              </Link>
            </div>

            {/* Segment 4: Equipment Vendors */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Store size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">تأمین‌کنندگان تجهیزات</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  معرفی تجهیزات دارای تأییدیه، فروش عمده به پیمانکاران، رزرو تبلیغات بنری و دسترسی مستقیم به خریداران در سراسر کشور.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Link 
                  to="/vendor-auth" 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors min-h-[44px]"
                >
                  <span>ثبت فروشگاه تجهیزات</span>
                  <ArrowLeft size={14} />
                </Link>
                <Link 
                  to="/ads/portal" 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors min-h-[44px]"
                >
                  <Megaphone size={14} />
                  <span>پرتال تبلیغات</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. PRODUCT LIFECYCLE STORY (5-Step Visual Flow with Second Visual Moment) */}
      <section id="lifecycle" className="py-16 sm:py-24 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
        {/* Subtle Architectural Solar Flow Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.025] dark:opacity-[0.05] pointer-events-none" />
        
        {/* Soft Technical Solar Field Contour Overlay */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
              مسیر جامع سرمایه‌گذاری
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              چرخه ۵ مرحله‌ای احداث و بهره‌برداری نیروگاه خورشیدی
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              از امکان‌سنجی اولیه تا نظارت بر بهره‌برداری نیروگاه با ابزارهای دیجیتال هوشیار انرژی
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {/* Desktop Connecting Process Track */}
            <div className="hidden md:block absolute top-12 inset-x-8 h-0.5 bg-gradient-to-r from-blue-200 via-emerald-200 to-sky-200 dark:from-blue-900/60 dark:via-emerald-900/60 dark:to-sky-900/60 pointer-events-none z-0" />
            
            {/* Step 1 */}
            <div className="relative z-10 p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-800 transition-all hover:-translate-y-0.5 shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-black font-mono text-[#0284C7] dark:text-blue-400">گام ۰۱</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">امکان‌سنجی ساختگاه</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  ثبت موقعیت جغرافیایی، تعیین مساحت، بررسی تابش و برآورد ظرفیت نامی.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">امکان‌سنجی سریع و مرحله‌به‌مرحله</div>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all hover:-translate-y-0.5 shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">گام ۰۲</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">طراحی و مدل اقتصادی</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  چیدمان ۳بعدی، محاسبه درآمد تابلو سبز بورس یا قرارداد خرید تضمینی ساتبا.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">شبیه‌سازی خودکار</div>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-800 transition-all hover:-translate-y-0.5 shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-black font-mono text-[#0284C7] dark:text-blue-400">گام ۰۳</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">مناقصه و استعلام RFQ</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  انتشار اسناد فنی و دریافت پیشنهادهای قیمت تفکیک‌شده از پیمانکاران مجاز.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">مقایسه شفاف</div>
            </div>

            {/* Step 4 */}
            <div className="relative z-10 p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-amber-300 dark:hover:border-amber-800 transition-all hover:-translate-y-0.5 shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-black font-mono text-amber-600 dark:text-amber-400">گام ۰۴</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">تأمین و احداث مهندسی</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  تأمین تجهیزات با اصالت، نظارت بر استانداردهای نصب و اتصال نهایی به شبکه.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">استاندارد EPC</div>
            </div>

            {/* Step 5 */}
            <div className="relative z-10 p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-sky-300 dark:hover:border-sky-800 transition-all hover:-translate-y-0.5 shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-black font-mono text-sky-600 dark:text-sky-400">گام ۰۵</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">پایش و تعمیرات O&M</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  عیب‌یابی هوشمند تجهیزات، پایش ضریب دسترسی و اعزام تکنسین در صورت خطا.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">پشتیبانی مداوم</div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. CONVERSION CTA SECTION */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-slate-900 via-[#0C4A6E] to-slate-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-[#0EA5E9] mx-auto flex items-center justify-center">
            <Sun size={28} />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            آماده برآورد و امکان‌سنجی نیروگاه خورشیدی خود هستید؟
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            با ثبت گام‌به‌گام مشخصات سقف یا زمین خود، امکان‌سنجی سریع و مرحله‌به‌مرحله، تحلیل جامع مهندسی، درآمد پیش‌بینی‌شده و گزارش اقتصادی را دریافت فرمایید.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/target-select"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm bg-white text-slate-900 hover:bg-slate-100 transition-colors shadow-lg"
            >
              شروع رایگان تحلیل ساختگاه
            </Link>
            <Link
              to="/contractors"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-colors"
            >
              مشاهده مناقصات و پیمانکاران
            </Link>
          </div>
        </div>
      </section>

      {/* 7. PROFESSIONAL FOOTER */}
      <footer className="w-full py-12 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-right">
            
            {/* Col 1: About Platform */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-amber-500/10 flex items-center justify-center">
                  <img 
                    src="/src/assets/images/solar_app_logo_1786611269806.jpg" 
                    alt="هوشیار انرژی" 
                    className="w-full h-full object-cover scale-125"
                  />
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">هوشیار انرژی</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                زیرساخت دیجیتال یکپارچه چرخه کامل پروژه‌های انرژی خورشیدی؛ پیوند دهنده کارفرمایان، شرکت‌های مجری EPC، تأمین‌کنندگان و متخصصان فنی در سراسر کشور.
              </p>
            </div>

            {/* Col 2: Engineering Tools */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">ابزارها و خدمات فنی</h3>
              <ul className="space-y-1.5">
                <li><Link to="/target-select" className="hover:text-[#0284C7] transition-colors">امکان‌سنجی هوشمند انرژی</Link></li>
                <li><Link to="/solar-planner" className="hover:text-[#0284C7] transition-colors">طراحی سه‌بعدی چینش پنل‌ها</Link></li>
                <li><Link to="/smart-maintenance" className="hover:text-[#0284C7] transition-colors">عیب‌یابی و تعمیرات هوشمند</Link></li>
                <li><Link to="/contractors" className="hover:text-[#0284C7] transition-colors">استعلام قیمت و مناقصات (RFQ)</Link></li>
              </ul>
            </div>

            {/* Col 3: Partner Portals */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">درگاه همکاران و متخصصان</h3>
              <ul className="space-y-1.5">
                <li><Link to="/contractor-auth" className="hover:text-[#0284C7] transition-colors">پرتال شرکت‌های مجری EPC</Link></li>
                <li><Link to="/vendor-auth" className="hover:text-[#0284C7] transition-colors">پرتال فروشندگان و تأمین‌کنندگان</Link></li>
                <li><Link to="/technician-auth" className="hover:text-[#0284C7] transition-colors">پرتال کارشناسان و تعمیرکاران</Link></li>
                <li><Link to="/ads/portal" className="hover:text-[#0284C7] transition-colors">سفارش جایگاه‌های تبلیغاتی</Link></li>
              </ul>
            </div>

            {/* Col 4: Platform Security & Standards */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">استانداردها و امنیت</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                محاسبات فنی و اقتصادی بر پایه فرمول‌های استاندارد، داده‌های تابش اقلیمی و آخرین تعرفه‌های اعلامی تنظیم گردیده است. اسناد مناقصه تحت پروتکل‌های امن نگهداری می‌شوند.
              </p>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <span>© ۱۴۰۵ هوشیار انرژی | تمامی حقوق برای این پلتفرم محفوظ است.</span>
            <div className="flex items-center gap-4">
              <Link to="/customer-login" className="hover:text-slate-800 dark:hover:text-slate-200">ورود به سیستم</Link>
              <span>·</span>
              <Link to="/partners" className="hover:text-slate-800 dark:hover:text-slate-200">همکاری با ما</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
