import React from 'react';
import { EnergyProject } from '../../types/project';
import { useAuth } from '../../context/AuthContext';
import { NextActionCard } from './NextActionCard';
import { ProjectHealthCard } from './ProjectHealthCard';
import { AttentionItems } from './AttentionItems';
import { ProjectSummary } from './ProjectSummary';
import { ProjectAssetTransition } from './ProjectAssetTransition';
import { Shield, Briefcase, HardHat, Wrench, DollarSign, UserCheck } from 'lucide-react';

interface ProjectCockpitProps {
  project: EnergyProject;
  onNavigateTab: (tab: string, capability?: string) => void;
}

export const ProjectCockpit: React.FC<ProjectCockpitProps> = ({
  project,
  onNavigateTab,
}) => {
  const { activeRole, getRolePersianLabel } = useAuth();

  const renderRolePerspective = () => {
    switch (activeRole) {
      case 'INVESTOR':
        return {
          icon: DollarSign,
          title: 'دیدگاه سرمایه‌گذار',
          description: 'تمرکز بر مدل بازگشت سرمایه (IRR)، دوره بازگشت و شفافیت پیشرفت پروژه در فازهای تأمین مالی و قرارداد.',
          ctaText: 'مشاهده مدل مالی و سرمایه‌گذاری',
          targetTab: 'process',
          targetCap: 'investment'
        };
      case 'EPC':
        return {
          icon: HardHat,
          title: 'دیدگاه پیمانکار احداث (EPC)',
          description: 'پایش مستمر استعلام‌ها، پیشنهادهای فنی/مالی، فهرست تجهیزات (BOQ) و نقاط عطف اجرایی احداث.',
          ctaText: 'ورود به مایل‌استون‌های اجرایی',
          targetTab: 'process',
          targetCap: 'milestones'
        };
      case 'TECHNICIAN':
        return {
          icon: Wrench,
          title: 'دیدگاه مهندسی و تکنسین',
          description: 'پیگیری چک‌لیست آزمون‌های راه‌اندازی (Commissioning)، پانچ‌لیست‌های رفع نقص و گارانتی تجهیزات.',
          ctaText: 'چک‌لیست آزمون‌های راه‌اندازی',
          targetTab: 'process',
          targetCap: 'commissioning'
        };
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return {
          icon: Shield,
          title: 'دیدگاه راهبردی سامانه (مدیر)',
          description: 'دسترسی کامل به نظارت بر گردش کار، اعتبارسنجی مدارک، تغییر فاز و ممیزی جامع پروژه.',
          ctaText: 'مدیریت فرایند پروژه',
          targetTab: 'process',
          targetCap: undefined
        };
      case 'PROJECT_OWNER':
      default:
        return {
          icon: UserCheck,
          title: 'دیدگاه مالک پروژه',
          description: 'مدیریت یکپارچه احداث نیروگاه، انتخاب پیمانکاران، امضای قراردادها و پیگیری تا مرحله اتصال به شبکه.',
          ctaText: 'مشاهده کل فرایند پروژه',
          targetTab: 'process',
          targetCap: undefined
        };
    }
  };

  const roleInfo = renderRolePerspective();
  const RoleIcon = roleInfo.icon;

  return (
    <div className="space-y-6">
      {/* 1. Next Recommended Action (Single most important card) */}
      <NextActionCard
        project={project}
        onNavigateAction={(tab, cap) => onNavigateTab(tab, cap)}
      />

      {/* 2. Top Tier: Attention Items & Health Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttentionItems
          project={project}
          onNavigateTab={(tab) => onNavigateTab(tab)}
        />
        <ProjectHealthCard project={project} />
      </div>

      {/* 3. Project Identity & Summary */}
      <ProjectSummary project={project} />

      {/* 4. Role-Aware Context Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <RoleIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white">{roleInfo.title}</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {getRolePersianLabel(activeRole)}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
              {roleInfo.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab(roleInfo.targetTab, roleInfo.targetCap)}
          className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
        >
          {roleInfo.ctaText}
        </button>
      </div>

      {/* 5. Project to Asset Transition (Truthful pre/post operational state) */}
      <ProjectAssetTransition
        project={project}
        onNavigateTab={(tab) => onNavigateTab(tab)}
      />
    </div>
  );
};
