import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DesktopHeader } from '../components/navigation/DesktopHeader';
import { MobileBottomNav } from '../components/navigation/MobileBottomNav';
import { useAppContext } from '../context/AppContext';

export default function MainLayout() {
  const { state } = useAppContext();
  const location = useLocation();

  // Determine if on a calculation wizard step
  const isWizardFlow = [
    '/location-type',
    '/area-city',
    '/checklist',
    '/consumption',
    '/result',
    '/recommendation'
  ].some(path => location.pathname === path);

  const getWizardStepInfo = () => {
    switch (location.pathname) {
      case '/location-type': return { step: 1, total: 5, label: 'نوع ساختگاه' };
      case '/area-city': return { step: 2, total: 5, label: 'شهر و مساحت' };
      case '/checklist': return { step: 3, total: 5, label: 'تجهیزات و پایداری شبکه' };
      case '/consumption': return { step: 4, total: 5, label: 'اطلاعات مصرف برق' };
      case '/result': return { step: 5, total: 5, label: 'نتایج تحلیل اقتصادی و مهندسی' };
      default: return null;
    }
  };

  const wizardInfo = isWizardFlow ? getWizardStepInfo() : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors" dir="rtl">
      {/* Global Unified Header */}
      <DesktopHeader />

      {/* Optional Contextual Breadcrumb/Progress Bar for Energy Analysis Flow */}
      {wizardInfo && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-2.5">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">تحلیل هوشمند انرژی:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{wizardInfo.label}</span>
              {state.city && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2 hidden sm:inline">
                  موقعیت: {state.city}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                گام {wizardInfo.step} از {wizardInfo.total}
              </span>
              <div className="w-20 sm:w-28 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                  style={{ width: `${(wizardInfo.step / wizardInfo.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Page Content - with bottom padding on mobile so MobileBottomNav never overlaps */}
      <main className="flex-1 w-full pb-24 md:pb-10">
        <Outlet />
      </main>

      {/* Persistent Mobile Bottom Navigation (Visible below md / 768px) */}
      <MobileBottomNav />

      {/* Clean Technical Context Footer on Analysis Results */}
      {location.pathname === '/result' && (
        <footer className="h-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 hidden md:flex items-center justify-center px-4 gap-6 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>محاسبات اقتصادی بر مبنای تعرفه‌های رسمی ساتبا و تابلو سبز بورس انرژی</span>
          </div>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
          <span>هوشیار انرژی | زیرساخت دیجیتال چرخه کامل پروژه‌های خورشیدی</span>
        </footer>
      )}
    </div>
  );
}
