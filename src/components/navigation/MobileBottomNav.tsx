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
  ArrowRight, 
  Wrench, 
  Box, 
  Briefcase, 
  ShieldCheck, 
  Megaphone 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeRole, canAccessPortfolio, isAuthenticated } = useAuth();
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // AUTHENTICATION-FIRST NAVIGATION RULE:
  // MobileBottomNav must NEVER appear on unauthenticated screens or public landing
  const isPublicOrAuthPath = [
    '/',
    '/customer-login',
    '/contractor-auth',
    '/vendor-auth',
    '/technician-auth'
  ].includes(location.pathname);

  if (!isAuthenticated || isPublicOrAuthPath) {
    return null;
  }

  const role = (activeRole || user?.role || 'PROJECT_OWNER').toUpperCase();
  const isContractor = ['EPC', 'EPC_CONTRACTOR', 'CONTRACTOR'].includes(role);
  const isVendor = ['VENDOR', 'SUPPLIER'].includes(role);
  const isTechnician = ['TECHNICIAN'].includes(role);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);

  const canCreateAds = ['VENDOR', 'CONTRACTOR', 'EPC', 'TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'].includes(role);

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
             location.pathname === '/marketplace';
    }
    if (path === '/solar-assets') {
      return location.pathname === '/solar-assets' || 
             location.pathname.startsWith('/solar-assets/') || 
             location.pathname === '/assets';
    }
    if (path === '/contractor-dashboard') {
      return location.pathname === '/contractor-dashboard';
    }
    if (path === '/vendor-portal') {
      return location.pathname.startsWith('/vendor-portal');
    }
    if (path === '/technician-dashboard') {
      return location.pathname === '/technician-dashboard';
    }
    if (path === '/smart-maintenance') {
      return location.pathname === '/smart-maintenance' || location.pathname === '/maintenance';
    }
    if (path === '/ads/portal') {
      return location.pathname === '/ads/portal' || location.pathname === '/ads-portal';
    }
    if (path === '/admin/solar-assets') {
      return location.pathname === '/admin/solar-assets';
    }
    if (path === '/admin/ads') {
      return location.pathname === '/admin/ads';
    }
    if (path === '/portfolio') {
      return location.pathname === '/portfolio' || location.pathname === '/enterprise/portfolio';
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

      {/* Action Sheet / Drawer (for quick solar actions) */}
      {isActionSheetOpen && (
        <div 
          className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl p-5 pb-safe pb-8 md:hidden animate-in slide-in-from-bottom duration-200"
          dir="rtl"
        >
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
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
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-800 transition-all text-right group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-[#0284C7] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Calculator size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0284C7] dark:group-hover:text-blue-400 transition-colors">
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
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-right group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <SunMedium size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    ایجاد و ثبت پروژه نیروگاهی جدید
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    تعریف ساختگاه، بارگذاری اسناد و آغاز چرخه مهندسی و EPC
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-400 rotate-180 group-hover:-translate-x-1 transition-transform shrink-0" />
            </button>

            {/* Action 3: Smart Maintenance & Repair */}
            <button
              onClick={() => handleAction('/smart-maintenance')}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-800 transition-all text-right group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-[#0284C7] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Wrench size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0284C7] dark:group-hover:text-blue-400 transition-colors">
                    تعمیرات و نگهداری هوشمند
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ثبت خرابی تجهیزات، بارگذاری تصویر، عیب‌یابی هوشمند و ارتباط با متخصصان
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-400 rotate-180 group-hover:-translate-x-1 transition-transform shrink-0" />
            </button>

            {/* Action 4: 3D Solar Planner */}
            <button
              onClick={() => handleAction('/solar-planner')}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-right group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Box size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    طراحی سه‌بعدی پنل خورشیدی
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    شبیه‌سازی سه‌بعدی چیدمان پنل‌ها و محاسبه زوایای بهینه تابش
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-400 rotate-180 group-hover:-translate-x-1 transition-transform shrink-0" />
            </button>

            {/* Action 5 (Conditional): Enterprise Portfolio */}
            {canAccessPortfolio && (
              <button
                onClick={() => handleAction('/portfolio')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all text-right group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      داشبورد پرتفوی سازمانی
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      نظارت یکپارچه بر عملکرد مالی و عملیات نیروگاه‌های تجمیعی
                    </p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-400 rotate-180 group-hover:-translate-x-1 transition-transform shrink-0" />
              </button>
            )}

            {/* Action 6: Advertising Portal */}
            {canCreateAds && (
              <button
                onClick={() => handleAction('/ads/portal')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/60 dark:bg-purple-950/20 hover:bg-purple-100/60 transition-all text-right group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Megaphone size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      پرتال تبلیغات تجاری و سفارش پلن
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      رزرو جایگاه بنری در پلتفرم با پرداخت آنلاین
                    </p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-400 rotate-180 group-hover:-translate-x-1 transition-transform shrink-0" />
              </button>
            )}

            {/* Action 7: Admin Review */}
            {isAdmin && (
              <>
                <button
                  onClick={() => handleAction('/admin/solar-assets')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100/60 transition-all text-right group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-[#0284C7] dark:text-blue-400 flex items-center justify-center shrink-0">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0284C7] dark:group-hover:text-blue-400 transition-colors">
                        تأیید و بررسی پرونده‌ها (مدیریت)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        بررسی فنی، استعلام و تأیید مدارک نیروگاه‌های ثبت‌شده
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-slate-400 rotate-180 group-hover:-translate-x-1 transition-transform shrink-0" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Role-Scoped Bottom Bar */}
      <nav 
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
        dir="rtl"
        aria-label="ناوبری اصلی موبایل"
      >
        {/* CONTRACTOR BOTTOM NAV */}
        {isContractor && (
          <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-2 items-center">
            <Link
              to="/contractor-dashboard"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/contractor-dashboard')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <LayoutDashboard size={20} strokeWidth={isNavActive('/contractor-dashboard') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">پیشخوان</span>
            </Link>

            <Link
              to="/contractors"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/contractors')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Store size={20} strokeWidth={isNavActive('/contractors') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">استعلام‌ها</span>
            </Link>

            <Link
              to="/contractor-dashboard"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium`}
            >
              <Layers size={20} strokeWidth={1.75} />
              <span className="text-[11px] mt-1">پیشنهادات من</span>
            </Link>

            <Link
              to="/smart-maintenance"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/smart-maintenance')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Wrench size={20} strokeWidth={isNavActive('/smart-maintenance') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">نگهداری</span>
            </Link>
          </div>
        )}

        {/* VENDOR BOTTOM NAV */}
        {isVendor && (
          <div className="grid grid-cols-3 h-16 max-w-lg mx-auto px-2 items-center">
            <Link
              to="/vendor-portal"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/vendor-portal')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <LayoutDashboard size={20} strokeWidth={isNavActive('/vendor-portal') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">پرتال تأمین</span>
            </Link>

            <Link
              to="/contractors"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/contractors')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Store size={20} strokeWidth={isNavActive('/contractors') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">استعلام‌ها</span>
            </Link>

            <Link
              to="/ads/portal"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/ads/portal')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Megaphone size={20} strokeWidth={isNavActive('/ads/portal') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">تبلیغات</span>
            </Link>
          </div>
        )}

        {/* TECHNICIAN BOTTOM NAV */}
        {isTechnician && (
          <div className="grid grid-cols-3 h-16 max-w-lg mx-auto px-2 items-center">
            <Link
              to="/technician-dashboard"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/technician-dashboard')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <LayoutDashboard size={20} strokeWidth={isNavActive('/technician-dashboard') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">مأموریت‌ها</span>
            </Link>

            <Link
              to="/smart-maintenance"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/smart-maintenance')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Wrench size={20} strokeWidth={isNavActive('/smart-maintenance') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">عیب‌یابی</span>
            </Link>

            <Link
              to="/technicians"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium`}
            >
              <ShieldCheck size={20} strokeWidth={1.75} />
              <span className="text-[11px] mt-1">متخصصان</span>
            </Link>
          </div>
        )}

        {/* ADMIN BOTTOM NAV */}
        {isAdmin && (
          <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-2 items-center">
            <Link
              to="/dashboard"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/dashboard')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <LayoutDashboard size={20} strokeWidth={isNavActive('/dashboard') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">پیشخوان</span>
            </Link>

            <Link
              to="/admin/solar-assets"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/admin/solar-assets')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <ShieldCheck size={20} strokeWidth={isNavActive('/admin/solar-assets') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">تأیید اسناد</span>
            </Link>

            <Link
              to="/admin/ads"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/admin/ads')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Megaphone size={20} strokeWidth={isNavActive('/admin/ads') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">آگهی‌ها</span>
            </Link>

            <Link
              to="/portfolio"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/portfolio')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Briefcase size={20} strokeWidth={isNavActive('/portfolio') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">پورتفو</span>
            </Link>
          </div>
        )}

        {/* CUSTOMER / PROJECT OWNER BOTTOM NAV (Default) */}
        {!isContractor && !isVendor && !isTechnician && !isAdmin && (
          <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-2 items-center">
            {/* 1. پیشخوان */}
            <Link
              to="/dashboard"
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isNavActive('/dashboard')
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
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
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
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
                className="w-12 h-12 -mt-5 rounded-2xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-black shadow-lg shadow-blue-500/25 flex flex-col items-center justify-center transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]"
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
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
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
                  ? 'text-[#0284C7] dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Zap size={20} strokeWidth={isNavActive('/solar-assets') ? 2.5 : 1.75} />
              <span className="text-[11px] mt-1">دارایی‌ها</span>
            </Link>
          </div>
        )}
      </nav>
    </>
  );
};
