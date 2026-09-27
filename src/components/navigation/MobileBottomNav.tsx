import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  Plus, 
  Store, 
  Zap, 
  X, 
  Calculator, 
  SunMedium, 
  ArrowRight 
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Active check helper
  const isNavActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/user-dashboard';
    }
    if (path === '/projects') {
      return location.pathname === '/projects' || 
             location.pathname.startsWith('/projects/') || 
             location.pathname === '/powerplant-setup';
    }
    if (path === '/contractors') {
      return location.pathname === '/contractors' || 
             location.pathname === '/vendors' || 
             location.pathname === '/marketplace' || 
             location.pathname.startsWith('/vendor/') ||
             location.pathname.startsWith('/investment-hub');
    }
    if (path === '/solar-assets') {
      return location.pathname === '/solar-assets' || 
             location.pathname.startsWith('/solar-assets/') || 
             location.pathname === '/assets' || 
             location.pathname.startsWith('/assets/') || 
             location.pathname.startsWith('/admin/solar-assets');
    }
    return false;
  };

  const handleAction = (path: string) => {
    setIsActionSheetOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Action Sheet Modal Backdrop */}
      {isActionSheetOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs transition-opacity md:hidden"
          onClick={() => setIsActionSheetOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Action Sheet / Drawer */}
      {isActionSheetOpen && (
        <div 
          className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl p-5 pb-safe pb-8 md:hidden animate-in slide-in-from-bottom duration-200"
          dir="rtl"
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                اقدام سریع خورشیدی
              </h3>
            </div>
            <button
              onClick={() => setIsActionSheetOpen(false)}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="بستن منو"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Action 1: Energy Analysis */}
            <button
              onClick={() => handleAction('/target-select')}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-800 transition-all text-right group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Calculator size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    شروع تحلیل و برآورد انرژی
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    برآورد ظرفیت نامی، تابش منطقه، تولید سالانه و مدل اقتصادی
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-400 rotate-180 group-hover:-translate-x-1 transition-transform shrink-0" />
            </button>

            {/* Action 2: New Power Plant Project */}
            <button
              onClick={() => handleAction('/powerplant-setup')}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-800 transition-all text-right group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <SunMedium size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    ایجاد و ثبت پروژه نیروگاهی جدید
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    تعریف ساختگاه، بارگذاری اسناد و آغاز چرخه مهندسی و EPC
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-400 rotate-180 group-hover:-translate-x-1 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <nav 
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
        dir="rtl"
        aria-label="ناوبری اصلی موبایل"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-2 items-center">
          
          {/* 1. پیشخوان */}
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
              isNavActive('/dashboard')
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <LayoutDashboard size={20} strokeWidth={isNavActive('/dashboard') ? 2.5 : 1.75} />
            <span className="text-[11px] mt-1">پیشخوان</span>
          </Link>

          {/* 2. پروژه‌ها */}
          <Link
            to="/projects"
            className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
              isNavActive('/projects')
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Layers size={20} strokeWidth={isNavActive('/projects') ? 2.5 : 1.75} />
            <span className="text-[11px] mt-1">پروژه‌ها</span>
          </Link>

          {/* 3. دکمه مرکزی شناور: + جدید */}
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => setIsActionSheetOpen(true)}
              className="w-12 h-12 -mt-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30 flex flex-col items-center justify-center transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="اقدام جدید خورشیدی"
            >
              <Plus size={24} strokeWidth={2.75} />
            </button>
          </div>

          {/* 4. بازارگاه */}
          <Link
            to="/contractors"
            className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
              isNavActive('/contractors')
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Store size={20} strokeWidth={isNavActive('/contractors') ? 2.5 : 1.75} />
            <span className="text-[11px] mt-1">بازارگاه</span>
          </Link>

          {/* 5. دارایی‌ها */}
          <Link
            to="/solar-assets"
            className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
              isNavActive('/solar-assets')
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <Zap size={20} strokeWidth={isNavActive('/solar-assets') ? 2.5 : 1.75} />
            <span className="text-[11px] mt-1">دارایی‌ها</span>
          </Link>

        </div>
      </nav>
    </>
  );
};
