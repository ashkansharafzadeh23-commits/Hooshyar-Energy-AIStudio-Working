import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  AlertTriangle, 
  Wrench, 
  History 
} from 'lucide-react';

export type OperationsTabId = 'OVERVIEW' | 'MONITORING' | 'ALERTS' | 'MAINTENANCE' | 'HISTORY';

export interface OperationsNavigationProps {
  activeTab: OperationsTabId;
  onTabChange: (tab: OperationsTabId) => void;
  openAlertsCount?: number;
  activeCasesCount?: number;
}

export const OperationsNavigation: React.FC<OperationsNavigationProps> = ({
  activeTab,
  onTabChange,
  openAlertsCount = 0,
  activeCasesCount = 0,
}) => {
  const tabs: Array<{
    id: OperationsTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'OVERVIEW',
      label: 'نمای کلی',
      icon: LayoutDashboard,
    },
    {
      id: 'MONITORING',
      label: 'پایش و تله‌متری',
      icon: Activity,
    },
    {
      id: 'ALERTS',
      label: 'هشدارها',
      icon: AlertTriangle,
      badge: openAlertsCount > 0 ? openAlertsCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'MAINTENANCE',
      label: 'عملیات و نگهداری',
      icon: Wrench,
      badge: activeCasesCount > 0 ? activeCasesCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'HISTORY',
      label: 'سابقه و گزارش‌ها',
      icon: History,
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm">
      <nav 
        aria-label="بخش‌های مرکز عملیات و پایش" 
        className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              type="button"
              className={`min-h-[44px] flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400 dark:text-slate-950' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded-full min-w-[18px] ${tab.badgeColor || 'bg-slate-700 text-white'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
