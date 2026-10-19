import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Activity,
  Megaphone,
  Newspaper,
  Scale,
  Coins,
  Cpu,
  BarChart3,
  Sliders,
  Sparkles,
  ExternalLink,
  Check,
  Compass,
  Box,
  HardHat,
  ShoppingBag
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';

import heroSolarCinematic from '../assets/images/landing/hero-solar-cinematic.webp';
import solarEngineeringImg from '../assets/images/landing/solar-engineering.webp';
import solarResidentialImg from '../assets/images/landing/solar-residential.webp';
import solarMaintenanceImg from '../assets/images/landing/solar-maintenance.webp';
import solarIndustrialImg from '../assets/images/landing/solar-industrial.webp';
import solarEquipmentImg from '../assets/images/landing/solar-equipment.webp';
import logoImage from '../assets/images/solar_app_logo_1786611269806.jpg';
import { VerifiedProjectShowcase } from '../components/landing/VerifiedProjectShowcase';

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [otherSectionsOpen, setOtherSectionsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOtherSectionsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOtherSectionsOpen(false);
      }
    }
    if (otherSectionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [otherSectionsOpen]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors flex flex-col overflow-x-hidden selection:bg-[#0284C7]/20 selection:text-[#0284C7]" dir="rtl">

      {/* 1. COMPACT ARCHITECTURAL HEADER WITH ACCESSIBLE DROPDOWN */}
      <header className="sticky top-0 z-50 w-full bg-white/92 dark:bg-slate-950/92 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">

          {/* Brand Logo & Editorial Wordmark */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link
              to="/"
              className="flex items-center gap-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] rounded-xl group min-h-[44px]"
              aria-label="صفحه اصلی هوشیار انرژی"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-200/90 dark:border-slate-800 bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-[#0284C7]/50 transition-all">
                <img
                  src={logoImage}
                  alt="لوگوی هوشیار انرژی"
                  className="w-full h-full object-cover scale-125"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  هوشیار انرژی
                  <span className="w-2 h-2 rounded-full bg-[#0284C7] inline-block ring-4 ring-[#0284C7]/15" />
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wide hidden sm:inline-block">
                  پلتفرم مهندسی و مدل‌سازی نیروگاه‌های خورشیدی
                </span>
              </div>
            </Link>

            {/* Desktop Refined Navigation System */}
            <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <Link
                to="/target-select"
                className="px-3.5 py-2.5 min-h-[44px] inline-flex items-center rounded-xl hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
              >
                امکان‌سنجی و طراحی
              </Link>
              <a
                href="#solutions"
                className="px-3.5 py-2.5 min-h-[44px] inline-flex items-center rounded-xl hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
              >
                راهکارها
              </a>
              <a
                href="#tools"
                className="px-3.5 py-2.5 min-h-[44px] inline-flex items-center rounded-xl hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
              >
                خدمات
              </a>

              {/* Accessible "سایر بخش‌ها" Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setOtherSectionsOpen(!otherSectionsOpen)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOtherSectionsOpen(true);
                    }
                  }}
                  className={`px-3.5 py-2.5 min-h-[44px] inline-flex items-center gap-1.5 rounded-xl transition-colors cursor-pointer ${
                    otherSectionsOpen
                      ? 'text-[#0284C7] bg-slate-100 dark:bg-slate-800'
                      : 'hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                  }`}
                  aria-expanded={otherSectionsOpen}
                  aria-haspopup="true"
                  aria-label="سایر بخش‌های پلتفرم"
                >
                  <span>سایر بخش‌ها</span>
                  <ChevronDown size={15} className={`transition-transform duration-200 ${otherSectionsOpen ? 'rotate-180 text-[#0284C7]' : 'text-slate-400'}`} />
                </button>

                {otherSectionsOpen && (
                  <div
                    role="menu"
                    aria-orientation="vertical"
                    className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl p-2.5 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <Link
                      to="/contractors"
                      role="menuitem"
                      onClick={() => setOtherSectionsOpen(false)}
                      className="flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#0284C7] dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Briefcase size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100">شبکه مجریان EPC</span>
                        <span className="text-[10px] text-slate-400">استعلام رقابتی قیمت و پیمانکاران</span>
                      </div>
                    </Link>

                    <Link
                      to="/energy-center"
                      role="menuitem"
                      onClick={() => setOtherSectionsOpen(false)}
                      className="flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Newspaper size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100">مرکز اطلاعات انرژی ایران</span>
                        <span className="text-[10px] text-slate-400">اخبار، مصوبات، تابلو سبز و تعرفه‌ها</span>
                      </div>
                    </Link>

                    <Link
                      to="/smart-maintenance"
                      role="menuitem"
                      onClick={() => setOtherSectionsOpen(false)}
                      className="flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Wrench size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100">تعمیرات و نگهداری هوشمند</span>
                        <span className="text-[10px] text-slate-400">ثبت خرابی و اعزام تکنسین O&M</span>
                      </div>
                    </Link>

                    <Link
                      to="/vendor-auth"
                      role="menuitem"
                      onClick={() => setOtherSectionsOpen(false)}
                      className="flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Store size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100">تأمین‌کنندگان تجهیزات</span>
                        <span className="text-[10px] text-slate-400">پرتال فروشندگان پنل و اینورتر</span>
                      </div>
                    </Link>

                    <Link
                      to="/ads/portal"
                      role="menuitem"
                      onClick={() => setOtherSectionsOpen(false)}
                      className="flex items-center gap-3 p-2.5 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Megaphone size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-slate-100">تبلیغات و معرفی برند</span>
                        <span className="text-[10px] text-slate-400">جایگاه‌های تخصصی صنعت انرژی</span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Desktop Left Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] transition-all shadow-xs hover:shadow-sm"
              >
                <span>ورود به پیشخوان</span>
                <ArrowLeft size={15} />
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/customer-login"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>ورود به سامانه</span>
                </Link>
                <Link
                  to="/target-select"
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] transition-all shadow-sm hover:shadow"
                >
                  <Calculator size={15} />
                  <span>شروع تحلیل پروژه</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] cursor-pointer"
              aria-label={mobileMenuOpen ? 'بستن منوی ناوبری' : 'باز کردن منوی ناوبری'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-5 pt-4 pb-6 space-y-1.5 shadow-xl">
            <Link
              to="/target-select"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold"
            >
              <span>امکان‌سنجی و طراحی هوشمند</span>
              <ArrowLeft size={16} className="text-slate-400" />
            </Link>
            <a
              href="#solutions"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold"
            >
              <span>راهکارها برای صنایع و مالکان</span>
              <ArrowLeft size={16} className="text-slate-400" />
            </a>
            <a
              href="#tools"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold"
            >
              <span>جعبه‌ابزار دیجیتال و خدمات مهندسی</span>
              <ArrowLeft size={16} className="text-slate-400" />
            </a>
            <a
              href="#lifecycle"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold"
            >
              <span>چرخه احداث نیروگاه</span>
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
              to="/energy-center"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold"
            >
              <span>مرکز اطلاعات انرژی ایران</span>
              <ArrowLeft size={16} className="text-slate-400" />
            </Link>
            <Link
              to="/vendor-auth"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 min-h-[44px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm font-semibold"
            >
              <span>پرتال تأمین‌کنندگان تجهیزات</span>
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
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2.5">
              <Link
                to="/customer-login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-3 min-h-[44px] flex items-center justify-center text-center rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                ورود به سامانه
              </Link>
              <Link
                to="/target-select"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-3 min-h-[44px] flex items-center justify-center text-center rounded-xl bg-[#0284C7] text-white text-xs font-bold shadow-sm"
              >
                تحلیل پروژه
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. RESTRAINED CINEMATIC HERO (Pale Ice Blue #D7F0FF + Single Turquoise #5EEAD4 Emphasis + Compact Glass HUD) */}
      <section className="relative overflow-hidden min-h-[640px] lg:min-h-[700px] flex items-center border-b border-slate-200/80 dark:border-slate-800/80">

        {/* Dominant Panoramic Solar-Farm Background (100% Opacity, Crisp Sunlight, Photovoltaic Panels & Mountains) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
          aria-hidden="true"
        >
          <img
            src={heroSolarCinematic}
            alt="چشم‌انداز پانورامیک نیروگاه خورشیدی هوشیار انرژی در نور صبحگاهی"
            aria-hidden="true"
            className="w-full h-full object-cover object-[center_35%] opacity-100 select-none scale-100 transition-all duration-700"
          />

          {/* Localized Dark Gradient Scrim ONLY Behind the Right-Hand Text Column (Desktop) */}
          <div className="hidden lg:block absolute inset-y-0 right-0 w-[55%] bg-gradient-to-l from-slate-950/75 via-slate-950/35 to-transparent pointer-events-none" />

          {/* Mobile Localized Soft Scrim */}
          <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-slate-950/15 pointer-events-none" />

          {/* Subtle Top Atmospheric Scrim */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-950/30 to-transparent pointer-events-none" />

          {/* Soft Bottom-Edge Dissolve */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F8FAFC] dark:from-slate-950 to-transparent pointer-events-none" />
        </div>

        {/* Hero Content Stack: Typography Directly Layered over the Photographic Scrim */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

            {/* Right: Editorial Narrative (7-8 Cols on Desktop) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6 text-right">

              {/* Product Kicker with Clean Contrast Pill */}
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-sky-200 bg-black/45 backdrop-blur-md px-4 py-1.5 rounded-full border border-sky-400/30 shadow-md">
                <Sun size={15} className="text-[#5EEAD4] animate-spin-slow" />
                <span>پلتفرم جامع مهندسی، مدل‌سازی و پایش نیروگاه‌های خورشیدی</span>
              </div>

              {/* Architectural Display Headline (Reduced 15-20%, Pale Ice Blue #D7F0FF with Single Turquoise #5EEAD4 Emphasis) */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#D7F0FF] tracking-tight leading-[1.3] lg:leading-[1.35] text-balance drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                از تحلیل تا اجرای نیروگاه خورشیدی،
                <span className="block mt-2.5 text-[#5EEAD4] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                  هوشمندتر تصمیم بگیرید
                </span>
              </h1>

              {/* High-Contrast Supporting Copy in Understated Pale Blue-Gray */}
              <p className="text-base sm:text-lg text-slate-200/95 leading-relaxed font-normal max-w-2xl text-balance drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
                امکان‌سنجی مهندسی، مدل‌سازی اقتصادی بورس انرژی، مناقصه رقابتی پیمانکاران EPC، تأمین قطعات استاندارد و پایش عملیاتی را در یک پلتفرم یکپارچه هدایت کنید.
              </p>

              {/* Primary & Secondary Action Buttons (2:1 Ratio + >=44px) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <Link
                  to="/target-select"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 min-h-[48px] rounded-xl font-black text-sm text-white bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <Calculator size={18} />
                  <span>شروع تحلیل پروژه</span>
                  <ArrowLeft size={16} />
                </Link>

                <Link
                  to="/contractors"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 min-h-[48px] rounded-xl font-bold text-sm text-white bg-white/20 hover:bg-white/30 active:bg-white/35 border border-white/35 backdrop-blur-md transition-all shadow-md"
                >
                  <Briefcase size={17} className="text-[#5EEAD4]" />
                  <span>مشاهده شبکه مجریان EPC</span>
                </Link>
              </div>

              {/* Trust Markers Bar Over Image */}
              <div className="pt-3 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-semibold text-slate-100 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#5EEAD4] shrink-0" />
                  محاسبه بر مبنای فرمول‌های مهندسی و اطلس تابش
                </span>
                <span aria-hidden="true" className="text-slate-400 hidden sm:inline">·</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-sky-300 shrink-0" />
                  شبکه مجریان و پیمانکاران ارزیابی‌شده
                </span>
                <span aria-hidden="true" className="text-slate-400 hidden sm:inline">·</span>
                <span className="flex items-center gap-1.5">
                  <Sun size={15} className="text-amber-300 shrink-0" />
                  تجهیزات دارای استاندارد فنی و اصالت
                </span>
              </div>
            </div>

            {/* Left: Verified Solar Project Showcase Card (4-5 Cols on Desktop) */}
            <div className="lg:col-span-5 xl:col-span-4">
              {/* ویترین پروژه‌ها شامل نمونه تحلیل پروژه؛ محاسبات و شاخص‌های فنی صرفاً نمونه‌ای از اعتبارسنجی ساختگاه‌ها هستند */}
              <VerifiedProjectShowcase />
            </div>

          </div>
        </div>
      </section>

      {/* 3. SIGNATURE SOLUTIONS SHOWCASE — INTEGRATED SOLAR ECOSYSTEM (Asymmetrical Editorial Architecture) */}
      <section id="solutions" className="py-20 sm:py-28 bg-[#F8FAFC] dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          {/* Editorial Section Introduction */}
          <div className="max-w-3xl space-y-3 text-right">
            <div className="text-xs font-bold text-[#0284C7] dark:text-sky-400 tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0284C7] dark:bg-sky-400" />
              <span>زنجیره ارزش انرژی خورشیدی</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">راهکارهای متمرکز بر مقیاس</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              راهکارهای تخصصی برای ساختمان‌ها، صنایع و متخصصان انرژی
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              طراحی هدفمند برای نیازمندی‌های مقیاس‌های مختلف خورشیدی؛ از تأمین برق پایدار سقف‌های شهری تا انطباق با الزامات ماده ۱۶ صنایع و اتصال به شبکه ملی.
            </p>
          </div>

          {/* Asymmetric Tier 1: Two Prominent Anchors (Residential 7 cols + Industrial 5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Tile A: Residential & Buildings (Tehran Rooftop — 7 Cols) */}
            <div className="lg:col-span-7 relative h-[440px] sm:h-[480px] lg:h-[500px] rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-md group">
              <img
                src={solarResidentialImg}
                alt="سقف‌های خورشیدی مسکونی، ویلایی و تجاری"
                className="w-full h-full object-cover object-center filter saturate-[1.05] transition-transform duration-700 group-hover:scale-105"
              />
              {/* Localized Bottom & Right Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-transparent pointer-events-none" />

              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end space-y-3.5 text-white">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <Building2 size={15} />
                  <span>سقف‌های ساختمانی، ویلایی و تجاری</span>
                  <span aria-hidden="true" className="text-white/40">·</span>
                  <span className="text-slate-300 font-normal">متصل به شبکه و هیبرید</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  تولید برق پاک بر فراز ساختمان‌ها و سقف‌های مسکونی
                </h3>
                <p className="text-xs sm:text-sm text-slate-200/95 max-w-xl leading-relaxed">
                  امکان‌سنجی هوشمند بر اساس مساحت سقف و زاویه تابش، حذف قطعی برق در ساعات اوج بار با سیستم‌های متصل به شبکه و هیبرید، و اتصال امن به شبکه توزیع برق.
                </p>
                <div className="pt-2">
                  <Link
                    to="/target-select"
                    className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl text-xs font-black text-white bg-[#0284C7] hover:bg-[#0369A1] transition-all shadow-md hover:shadow-lg w-fit"
                  >
                    <span>محاسبه آنلاین سقف خورشیدی</span>
                    <ArrowLeft size={15} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Tile B: Industrial & Commercial Solar (Factory Solar — 5 Cols) */}
            <div className="lg:col-span-5 relative h-[440px] sm:h-[480px] lg:h-[500px] rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-md group">
              <img
                src={solarIndustrialImg}
                alt="نیروگاه‌های خورشیدی صنعتی و کارخانجات در شهرک‌های صنعتی"
                className="w-full h-full object-cover object-center filter saturate-[1.05] transition-transform duration-700 group-hover:scale-105"
              />
              {/* Localized Bottom & Right Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-transparent pointer-events-none" />

              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end space-y-3.5 text-white">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5EEAD4]">
                  <Factory size={15} />
                  <span>صنایع، شهرک‌های صنعتی و کارخانجات</span>
                  <span aria-hidden="true" className="text-white/40">·</span>
                  <span className="text-slate-300 font-normal">ماده ۱۶ و بورس سبز</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  تأمین انرژی پایدار کارخانجات و حضور در بورس سبز
                </h3>
                <p className="text-xs sm:text-sm text-slate-200/95 leading-relaxed">
                  پوشش تکالیف قانونی ماده ۱۶ جهش تولید، جلوگیری از قطع برق خطوط تولید در تابستان، و فروش برق تولیدی در تابلوی سبز بورس انرژی.
                </p>
                <div className="pt-2">
                  <Link
                    to="/target-select"
                    className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl text-xs font-black text-slate-950 bg-[#5EEAD4] hover:bg-[#2DD4BF] transition-all shadow-md hover:shadow-lg w-fit"
                  >
                    <span>امکان‌سنجی نیروگاه صنعتی</span>
                    <ArrowLeft size={15} />
                  </Link>
                </div>
              </div>
            </div>

          </div>

          {/* Asymmetric Tier 2: 3 Specialized Architecture Tiles (4-4-4 on desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            {/* Tile C: EPC Engineering & Contractors (Engineers at Solar Farm) */}
            <div className="relative h-[380px] lg:h-[400px] rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-sm group flex flex-col justify-end">
              <img
                src={solarEngineeringImg}
                alt="مهندسان ایرانی طراح و مجری در حال ارزیابی ساختگاه خورشیدی"
                className="absolute inset-0 w-full h-full object-cover object-center filter saturate-[1.05] transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-black/20 pointer-events-none" />

              <div className="relative z-10 p-6 sm:p-7 space-y-3 text-white">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
                  <Briefcase size={14} />
                  <span>طراحی و اجرای مهندسی (EPC)</span>
                </div>
                <h3 className="text-lg font-black text-white">
                  شبکه شرکت‌های مهندسی و مجریان
                </h3>
                <p className="text-xs text-slate-200/90 leading-relaxed">
                  ثبت استعلام‌های تفکیک‌شده ساختگاه، دریافت پیش‌فاکتورهای شفاف و نظارت فنی بر استانداردهای احداث نیروگاه.
                </p>
                <div className="pt-1">
                  <Link
                    to="/contractors"
                    className="inline-flex items-center gap-2 text-xs font-black text-sky-300 hover:text-sky-200 transition-colors min-h-[44px]"
                  >
                    <span>مشاهده مجریان و مناقصات</span>
                    <ArrowLeft size={15} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Tile D: Equipment Marketplace & Sourcing (High-Tech Inverters & Components) */}
            <div className="relative h-[380px] lg:h-[400px] rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-sm group flex flex-col justify-end">
              <img
                src={solarEquipmentImg}
                alt="اینورترها و تجهیزات استاندارد خورشیدی در بازار تأمین‌کنندگان"
                className="absolute inset-0 w-full h-full object-cover object-center filter saturate-[1.05] transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-black/20 pointer-events-none" />

              <div className="relative z-10 p-6 sm:p-7 space-y-3 text-white">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <Store size={14} />
                  <span>تأمین تجهیزات استاندارد</span>
                </div>
                <h3 className="text-lg font-black text-white">
                  بازار پنل، اینورتر و استراکچر
                </h3>
                <p className="text-xs text-slate-200/90 leading-relaxed">
                  ارتباط مستقیم با تأمین‌کنندگان معتبر پنل، اینورتر و استراکچر با گواهی اصالت کالا و تحویل پروژه‌ای استاندارد.
                </p>
                <div className="pt-1">
                  <Link
                    to="/vendor-auth"
                    className="inline-flex items-center gap-2 text-xs font-black text-amber-300 hover:text-amber-200 transition-colors min-h-[44px]"
                  >
                    <span>ورود تأمین‌کنندگان تجهیزات</span>
                    <ArrowLeft size={15} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Tile E: Smart Maintenance & Operations (Technician Inspecting Combiner Box) */}
            <div className="relative h-[380px] lg:h-[400px] rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-sm group flex flex-col justify-end">
              <img
                src={solarMaintenanceImg}
                alt="تکنسین متخصص در حال بازرسی و تست تجهیزات الکتریکی خورشیدی"
                className="absolute inset-0 w-full h-full object-cover object-center filter saturate-[1.05] transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-black/20 pointer-events-none" />

              <div className="relative z-10 p-6 sm:p-7 space-y-3 text-white">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5EEAD4]">
                  <Wrench size={14} />
                  <span>پایش و نگهداری تخصصی (O&M)</span>
                </div>
                <h3 className="text-lg font-black text-white">
                  تعمیرات هوشمند و پایش عملیاتی
                </h3>
                <p className="text-xs text-slate-200/90 leading-relaxed">
                  عیب‌یابی تخصصی با تصویربرداری حرارتی، پایش راندمان اینورترها و اعزام سریع کارشناسان مجرب نگهداری.
                </p>
                <div className="pt-1">
                  <Link
                    to="/smart-maintenance"
                    className="inline-flex items-center gap-2 text-xs font-black text-[#5EEAD4] hover:text-white transition-colors min-h-[44px]"
                  >
                    <span>سامانه تعمیرات و نگهداری</span>
                    <ArrowLeft size={15} />
                  </Link>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. DIGITAL TOOLS & ENGINEERING MATRIX (Premium Engineering SaaS Architecture) */}
      <section id="tools" className="py-20 sm:py-28 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          {/* Section Heading & SaaS Leadership Framing */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-6 border-b border-slate-200/70 dark:border-slate-800">
            <div className="space-y-3 max-w-3xl text-right">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0284C7] dark:text-sky-400">
                <Cpu size={16} />
                <span>زیرساخت نرم‌افزاری یکپارچه</span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">مهندسی، طراحی و مدیریت</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                ابزارهای هوشمند انرژی
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                با استفاده از ابزارهای محاسباتی هوشیار انرژی، می‌توانید پروژه‌های خورشیدی خود را از مرحله شبیه‌سازی تابش و چیدمان سه‌بعدی تا مناقصه و پایش بهره‌برداری تحلیل و هدایت نمایید.
              </p>
            </div>

            <div className="shrink-0">
              <Link
                to="/target-select"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition-all shadow-xs"
              >
                <Calculator size={16} />
                <span>شروع امکان‌سنجی رایگان</span>
              </Link>
            </div>
          </div>

          {/* Differentiated Bento Matrix: Flagship Engineering Card + Core 3D CAD Planner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Tool 1: Flagship Engineering Calculation & Economic Engine (Span 7) */}
            <div className="lg:col-span-7 p-7 sm:p-9 rounded-3xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-6 shadow-xs hover:border-[#0284C7]/50 transition-all">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center shadow-sm">
                    <Calculator size={22} />
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>موتور شبیه‌سازی اقلیمی</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    تحلیل دقیق فنی و اقتصادی ساختگاه
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    شبیه‌سازی بر پایه داده‌های اطلس تابش اقلیمی، محاسبه تلفات سیستم، افت حرارتی و زاویه بهینه چیدمان. محاسبه جریان نقدی و بازگشت سرمایه با تعرفه‌های مصوب یا تابلوی سبز بورس انرژی.
                  </p>
                </div>

                {/* Meaningful Engineering Pipeline Microvisualization */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    مراحل پردازش مهندسی و مالی ساختگاه:
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="font-mono text-[10px] text-slate-400 mb-1">گام اول</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs">تابش و جغرافیا</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">اطلس اقلیمی ماهواره‌ای</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="font-mono text-[10px] text-slate-400 mb-1">گام دوم</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs">زاویه و تلفات</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">محاسبه افت توان حرارتی</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="font-mono text-[10px] text-slate-400 mb-1">گام سوم</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs">تراز مالی و PPA</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">درآمد بورس سبز و بازگشت</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-[#0284C7] dark:text-sky-400">
                <Link
                  to="/target-select"
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-white bg-[#0284C7] hover:bg-[#0369A1] transition-all shadow-xs w-fit"
                >
                  <span>ورود به فرآیند مدل‌سازی ساختگاه</span>
                  <ArrowLeft size={15} />
                </Link>
                <span className="text-slate-400 dark:text-slate-500 font-normal">برآورد ظرفیت و توان تولید</span>
              </div>
            </div>

            {/* Tool 2: 3D Spatial Solar CAD Studio (Span 5 - High-Contrast Technical Theme) */}
            <div className="lg:col-span-5 p-7 sm:p-9 rounded-3xl bg-slate-900 text-white dark:bg-slate-950 border border-slate-800 shadow-sm flex flex-col justify-between space-y-6 hover:border-[#5EEAD4]/40 transition-all">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-[#5EEAD4] flex items-center justify-center shadow-sm">
                    <Layers size={22} />
                  </div>
                  <div className="text-xs font-mono text-[#5EEAD4] flex items-center gap-1.5">
                    <Compass size={14} />
                    <span>3D Spatial Engine</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    طراحی سه‌بعدی چینش پنل‌ها
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    جانمایی هندسی استراکچرها و استرینگ‌های پنل روی سقف یا زمین، بررسی موانع سایه‌انداز و بهینه‌سازی چگالی توان خروجی با ابزار سه‌بعدی.
                  </p>
                </div>

                {/* Meaningful 3D CAD/Spatial Microvisualization */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                    <span>پارامترهای هندسی مدل:</span>
                    <span className="text-[#5EEAD4]">آرایه بهینه</span>
                  </div>
                  <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                      <span>زاویه شیب (Tilt):</span>
                      <span className="text-white font-bold">۲۸٫۰ درجه</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                      <span>جهت جغرافیایی (Azimuth):</span>
                      <span className="text-white font-bold">۱۸۰ درجه (جنوب)</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>تحلیل موانع سایه‌انداز:</span>
                      <span className="text-emerald-400 font-bold">بدون افت بحرانی</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold">
                <Link
                  to="/solar-planner"
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-slate-950 bg-[#5EEAD4] hover:bg-[#2DD4BF] transition-all shadow-xs w-fit"
                >
                  <span>ورود به استودیوی طراحی چینش</span>
                  <ArrowLeft size={15} />
                </Link>
                <span className="text-slate-400 font-normal">مدل‌سازی فضایی آرایه‌ها</span>
              </div>
            </div>

          </div>

          {/* Tier 2: Three Balanced Supporting Operational Cards (4 / 4 / 4 Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Secondary Tool A: RFQ Competitive Bidding Hub */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-5 shadow-xs hover:border-emerald-400/50 transition-all">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <FileCheck2 size={20} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    استعلام رقابتی قیمت (RFQ)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    ارسال اسناد استاندارد فنی ساختگاه به پیمانکاران دارای تاییدیه صلاحیت، دریافت پیش‌فاکتورهای تفکیک‌شده و مقایسه شفاف قیمت تجهیزات و نصب.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Link to="/contractors" className="inline-flex items-center gap-1.5 hover:underline min-h-[44px]">
                  <span>مشاهده پیمانکاران و استعلام‌ها</span>
                  <ArrowLeft size={15} />
                </Link>
                <span className="text-slate-400 font-normal">مقایسه تفکیک‌شده</span>
              </div>
            </div>

            {/* Secondary Tool B: Smart Maintenance & Diagnostics */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-5 shadow-xs hover:border-sky-400/50 transition-all">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-[#0284C7] text-white flex items-center justify-center shadow-sm">
                  <Wrench size={20} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    عیب‌یابی و تعمیرات هوشمند (O&M)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    ثبت آنلاین خطاها، اعزام کارشناسان فنی مجرب، ترموگرافی عیب‌یابی و تضمین پایداری ضریب تولید سالانه نیروگاه.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-[#0284C7] dark:text-sky-400">
                <Link to="/smart-maintenance" className="inline-flex items-center gap-1.5 hover:underline min-h-[44px]">
                  <span>سامانه تعمیرات و نگهداری</span>
                  <ArrowLeft size={15} />
                </Link>
                <span className="text-slate-400 font-normal">پایش ضریب دسترسی</span>
              </div>
            </div>

            {/* Secondary Tool C: Energy Market & Regulatory Center */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-5 shadow-xs hover:border-indigo-400/50 transition-all">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Activity size={20} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    رصدخانه بازار و اطلاعات انرژی
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    رصد لحظه‌ای تحولات تابلوی سبز بورس انرژی، مصوبات ساتبا، قوانین ماده ۱۶ و مناقصات رسمی کشور در یک مرجع تخصصی.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Link to="/energy-center" className="inline-flex items-center gap-1.5 hover:underline min-h-[44px]">
                  <span>ورود به مرکز اطلاعات انرژی</span>
                  <ArrowLeft size={15} />
                </Link>
                <span className="text-slate-400 font-normal">تابلوی سبز و PPA</span>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* 5. PRODUCT LIFECYCLE (5-Step Visual Flow) */}
      <section id="lifecycle" className="py-20 sm:py-28 bg-[#F8FAFC] dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">

          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
              مسیر جامع سرمایه‌گذاری
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              چرخه ۵ مرحله‌ای احداث و بهره‌برداری نیروگاه خورشیدی
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              از امکان‌سنجی اولیه تا نظارت بر بهره‌برداری نیروگاه با ابزارهای دیجیتال هوشیار انرژی
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {/* Desktop Connecting Process Track */}
            <div className="hidden md:block absolute top-12 inset-x-8 h-0.5 bg-gradient-to-r from-blue-200 via-emerald-200 to-sky-200 dark:from-blue-900/60 dark:via-emerald-900/60 dark:to-sky-900/60 pointer-events-none z-0" />

            {/* Step 1 */}
            <div className="relative z-10 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-800 transition-all hover:-translate-y-1 shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-black font-mono text-[#0284C7] dark:text-sky-400">گام ۰۱</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">امکان‌سنجی ساختگاه</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  ثبت موقعیت جغرافیایی، تعیین مساحت، بررسی تابش و برآورد ظرفیت نامی.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">امکان‌سنجی سریع و مرحله‌به‌مرحله</div>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all hover:-translate-y-1 shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">گام ۰۲</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">طراحی و مدل اقتصادی</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  چیدمان سه‌بعدی، محاسبه درآمد تابلو سبز بورس یا قرارداد خرید تضمینی ساتبا.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">شبیه‌سازی خودکار</div>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-800 transition-all hover:-translate-y-1 shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-black font-mono text-[#0284C7] dark:text-sky-400">گام ۰۳</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">مناقصه و استعلام RFQ</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  انتشار اسناد فنی و دریافت پیشنهادهای قیمت تفکیک‌شده از پیمانکاران مجاز.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">مقایسه شفاف</div>
            </div>

            {/* Step 4 */}
            <div className="relative z-10 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-amber-300 dark:hover:border-amber-800 transition-all hover:-translate-y-1 shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-black font-mono text-amber-600 dark:text-amber-400">گام ۰۴</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">تأمین و احداث مهندسی</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  تأمین تجهیزات با اصالت، نظارت بر استانداردهای نصب و اتصال نهایی به شبکه.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">استاندارد EPC</div>
            </div>

            {/* Step 5 */}
            <div className="relative z-10 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-sky-300 dark:hover:border-sky-800 transition-all hover:-translate-y-1 shadow-xs">
              <div className="space-y-2">
                <span className="text-xs font-black font-mono text-sky-600 dark:text-sky-400">گام ۰۵</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">پایش و تعمیرات O&M</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  عیب‌یابی تجهیزات، پایش ضریب دسترسی و اعزام تکنسین در صورت خطا.
                </p>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">پشتیبانی مداوم</div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. IRAN ENERGY INTELLIGENCE CENTER */}
      <section className="py-20 sm:py-28 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-4 border-b border-slate-200/70 dark:border-slate-800">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0284C7] dark:text-sky-400">
                <ShieldCheck size={15} />
                <span>مرجع هوشمندی و رصد صنعت انرژی ایران</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                مرکز اطلاعات انرژی ایران
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                اخبار، مقررات، بازار، مناقصات و فرصت‌های صنعت انرژی ایران در یک مرجع تخصصی و قابل استناد
              </p>
            </div>

            <div className="shrink-0">
              <Link
                to="/energy-center"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[44px] rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-bold transition-all shadow-xs hover:shadow-sm"
              >
                <span>ورود به مرکز اطلاعات انرژی</span>
                <ArrowLeft size={16} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

            <Link
              to="/energy-center"
              className="group p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-[#0284C7]/60 transition-all hover:shadow-xs flex flex-col justify-between min-h-[120px]"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0284C7] dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
                <Newspaper size={20} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0284C7] transition-colors">
                  اخبار و اطلاعیه‌ها
                </h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  رخدادهای رسمی صنعت
                </span>
              </div>
            </Link>

            <Link
              to="/energy-center"
              className="group p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-purple-500/60 transition-all hover:shadow-xs flex flex-col justify-between min-h-[120px]"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
                <Scale size={20} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 transition-colors">
                  قوانین و مقررات
                </h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  مصوبات و ضوابط فنی
                </span>
              </div>
            </Link>

            <Link
              to="/energy-center"
              className="group p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 transition-all hover:shadow-xs flex flex-col justify-between min-h-[120px]"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                  بازار برق و بورس انرژی
                </h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  تابلو سبز و گواهی ظرفیت
                </span>
              </div>
            </Link>

            <Link
              to="/energy-center"
              className="group p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/60 transition-all hover:shadow-xs flex flex-col justify-between min-h-[120px]"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
                <Coins size={20} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors">
                  تعرفه‌ها و خرید برق
                </h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  خرید تضمینی و PPA
                </span>
              </div>
            </Link>

            <Link
              to="/energy-center"
              className="group p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/60 transition-all hover:shadow-xs flex flex-col justify-between min-h-[120px]"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
                <FileCheck2 size={20} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                  مناقصات و فراخوان‌ها
                </h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  استعلام‌ها و واگذاری
                </span>
              </div>
            </Link>

            <Link
              to="/energy-center"
              className="group p-5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500/60 transition-all hover:shadow-xs flex flex-col justify-between min-h-[120px]"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform mb-2">
                <Briefcase size={20} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
                  سرمایه‌گذاری و فرصت‌ها
                </h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  طرح‌های توسعه و بازگشت
                </span>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* 7. CONVERSION CALL TO ACTION SECTION */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-slate-900 via-[#075985] to-slate-950 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7 relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 text-[#38BDF8] mx-auto flex items-center justify-center shadow-lg">
            <Sun size={32} />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            آماده برآورد و امکان‌سنجی نیروگاه خورشیدی خود هستید؟
          </h2>
          <p className="text-base sm:text-lg text-slate-200 max-w-2xl mx-auto leading-relaxed font-normal">
            با ثبت گام‌به‌گام مشخصات سقف یا زمین خود، امکان‌سنجی سریع و مرحله‌به‌مرحله، تحلیل جامع مهندسی، درآمد پیش‌بینی‌شده و گزارش اقتصادی را دریافت فرمایید.
          </p>
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/target-select"
              className="w-full sm:w-auto px-9 py-4 min-h-[48px] flex items-center justify-center rounded-xl font-black text-sm bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-xl hover:shadow-2xl"
            >
              شروع رایگان تحلیل ساختگاه
            </Link>
            <Link
              to="/contractors"
              className="w-full sm:w-auto px-7 py-4 min-h-[48px] flex items-center justify-center rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white border border-white/25 transition-all"
            >
              مشاهده مناقصات و پیمانکاران
            </Link>
          </div>
        </div>
      </section>

      {/* 8. PROFESSIONAL ENTERPRISE FOOTER */}
      <footer className="w-full py-14 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12 text-right">

            {/* Col 1: Platform Identity */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-amber-500/10 flex items-center justify-center">
                  <img
                    src={logoImage}
                    alt="لوگوی هوشیار انرژی"
                    className="w-full h-full object-cover scale-125"
                  />
                </div>
                <span className="font-black text-base text-slate-900 dark:text-slate-100">هوشیار انرژی</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-xs">
                زیرساخت دیجیتال یکپارچه چرخه کامل پروژه‌های انرژی خورشیدی؛ پیوند دهنده کارفرمایان، شرکت‌های مجری EPC، تأمین‌کنندگان و متخصصان فنی در سراسر کشور.
              </p>
            </div>

            {/* Col 2: Engineering Tools */}
            <div className="space-y-3">
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-xs">ابزارها و خدمات فنی</h3>
              <ul className="space-y-2">
                <li><Link to="/target-select" className="hover:text-[#0284C7] transition-colors min-h-[36px] inline-flex items-center">امکان‌سنجی هوشمند انرژی</Link></li>
                <li><Link to="/solar-planner" className="hover:text-[#0284C7] transition-colors min-h-[36px] inline-flex items-center">طراحی سه‌بعدی چینش پنل‌ها</Link></li>
                <li><Link to="/energy-center" className="hover:text-[#0284C7] transition-colors min-h-[36px] inline-flex items-center">مرکز اطلاعات انرژی ایران</Link></li>
                <li><Link to="/smart-maintenance" className="hover:text-[#0284C7] transition-colors min-h-[36px] inline-flex items-center">عیب‌یابی و تعمیرات هوشمند</Link></li>
                <li><Link to="/contractors" className="hover:text-[#0284C7] transition-colors min-h-[36px] inline-flex items-center">استعلام قیمت و مناقصات (RFQ)</Link></li>
              </ul>
            </div>

            {/* Col 3: Partner Portals */}
            <div className="space-y-3">
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-xs">درگاه همکاران و متخصصان</h3>
              <ul className="space-y-2">
                <li><Link to="/contractor-auth" className="hover:text-[#0284C7] transition-colors min-h-[36px] inline-flex items-center">پرتال شرکت‌های مجری EPC</Link></li>
                <li><Link to="/vendor-auth" className="hover:text-[#0284C7] transition-colors min-h-[36px] inline-flex items-center">پرتال فروشندگان و تأمین‌کنندگان</Link></li>
                <li><Link to="/technician-auth" className="hover:text-[#0284C7] transition-colors min-h-[36px] inline-flex items-center">پرتال کارشناسان و تعمیرکاران</Link></li>
                <li><Link to="/ads/portal" className="hover:text-[#0284C7] transition-colors min-h-[36px] inline-flex items-center">سفارش جایگاه‌های تبلیغاتی</Link></li>
              </ul>
            </div>

            {/* Col 4: Platform Security & Standards */}
            <div className="space-y-3">
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-xs">استانداردها و امنیت</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                محاسبات فنی و اقتصادی بر پایه فرمول‌های استاندارد، داده‌های تابش اقلیمی و آخرین تعرفه‌های اعلامی تنظیم گردیده است. اسناد مناقصه تحت پروتکل‌های امن نگهداری می‌شوند.
              </p>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span>© ۱۴۰۵ هوشیار انرژی | تمامی حقوق برای این پلتفرم محفوظ است.</span>
            <div className="flex items-center gap-4 font-medium">
              <Link to="/customer-login" className="hover:text-slate-800 dark:hover:text-slate-200 min-h-[36px] inline-flex items-center">ورود به سیستم</Link>
              <span>·</span>
              <Link to="/partners" className="hover:text-slate-800 dark:hover:text-slate-200 min-h-[36px] inline-flex items-center">همکاری با ما</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
