import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sun } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors" dir="rtl">
      {/* Clean Minimal Header for Authentication */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] rounded-lg"
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
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                زیرساخت دیجیتال پروژه‌های خورشیدی
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowRight size={14} />
              <span>بازگشت به صفحه اصلی</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Auth Viewport — Zero customer bottom navigation */}
      <main className="flex-1 flex flex-col justify-center items-center py-8 sm:py-12 px-4 sm:px-6">
        <Outlet />
      </main>

      {/* Trust & Security Footer */}
      <footer className="w-full py-4 border-t border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>سامانه امن احراز هویت و مدیریت دسترسی یکپارچه هوشیار انرژی</span>
          </div>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">·</span>
          <span>© ۱۴۰۵ تمامی حقوق محفوظ است</span>
        </div>
      </footer>
    </div>
  );
}
