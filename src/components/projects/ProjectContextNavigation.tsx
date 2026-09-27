import React from 'react';
import { LayoutDashboard, GitFork, ShoppingBag, FolderKanban, History } from 'lucide-react';

export type ProjectContextTab = 'overview' | 'process' | 'commercial' | 'documents' | 'activity';

interface ProjectContextNavigationProps {
  activeTab: ProjectContextTab;
  onChangeTab: (tab: ProjectContextTab) => void;
  documentCount?: number;
  activityCount?: number;
}

export const ProjectContextNavigation: React.FC<ProjectContextNavigationProps> = ({
  activeTab,
  onChangeTab,
  documentCount,
  activityCount,
}) => {
  const tabs: {
    id: ProjectContextTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'overview', label: 'نمای کلی و کاک‌پیت', icon: LayoutDashboard },
    { id: 'process', label: 'فرایند و چرخه عمر', icon: GitFork },
    { id: 'commercial', label: 'تأمین و قراردادها', icon: ShoppingBag },
    { id: 'documents', label: 'اسناد پروژه', icon: FolderKanban, badge: documentCount },
    { id: 'activity', label: 'فعالیت‌ها و رویدادها', icon: History, badge: activityCount },
  ];

  return (
    <div className="border-b border-slate-200 bg-white sticky top-16 z-20 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-2 space-x-reverse overflow-x-auto py-2.5 no-scrollbar" aria-label="پیمایش بخش‌های پروژه">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer min-h-[44px] ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
