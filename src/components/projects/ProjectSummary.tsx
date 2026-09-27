import React from 'react';
import { 
  MapPin, 
  Zap, 
  Coins, 
  Calendar, 
  Building2, 
  Layers, 
  Copy, 
  Check 
} from 'lucide-react';
import { EnergyProject } from '../../types/project';
import { 
  formatCurrencyIRR, 
  formatSolarCapacity, 
  formatEnergyGeneration, 
  formatJalaliDate, 
  toPersianDigits 
} from '../../utils/formatters';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { getProjectPhase } from './lifecycleMapping';

interface ProjectSummaryProps {
  project: EnergyProject;
}

export const ProjectSummary: React.FC<ProjectSummaryProps> = ({ project }) => {
  const [copiedCode, setCopiedCode] = React.useState(false);
  const phaseInfo = getProjectPhase(project.status);

  const handleCopyCode = () => {
    if (project.projectCode) {
      navigator.clipboard.writeText(project.projectCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const hasArea = !!project.site?.areaM2;
  const hasCapacity = !!project.targetCapacityKw;
  const hasBudget = !!project.estimatedBudgetIRR;
  const hasConsumption = !!project.energyRequirement?.monthlyConsumptionKwh;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">شناسنامه و مشخصات کلیدی پروژه</h3>
        </div>

        {project.projectCode && (
          <button
            type="button"
            onClick={handleCopyCode}
            title="کپی شناسه رسمی پروژه"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span dir="ltr">{project.projectCode}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Capacity */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              ظرفیت هدف نیروگاه
            </span>
            <DataTruthBadge type="CALCULATED" size="sm" />
          </div>
          <div className="text-base font-bold text-slate-900">
            {hasCapacity ? formatSolarCapacity(project.targetCapacityKw!) : '—'}
          </div>
        </div>

        {/* Location */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              موقعیت جغرافیایی
            </span>
            <DataTruthBadge type="USER_PROVIDED" size="sm" />
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {project.location?.province && project.location?.city
              ? `${project.location.province}، ${project.location.city}`
              : project.location?.province || project.location?.city || '—'}
          </div>
        </div>

        {/* Site Area */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-purple-500" />
              مساحت و نوع سایت
            </span>
            <DataTruthBadge type="USER_PROVIDED" size="sm" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            {hasArea ? `${toPersianDigits(project.site!.areaM2)} مترمربع` : '—'}
            {project.site?.type && (
              <span className="text-xs font-normal text-slate-500 mr-1">
                ({project.site.type === 'residential' ? 'مسکونی' : project.site.type === 'commercial' ? 'تجاری' : project.site.type === 'industrial' ? 'صنعتی' : project.site.type})
              </span>
            )}
          </div>
        </div>

        {/* Estimated Budget */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-emerald-500" />
              برآورد سرمایه‌گذاری
            </span>
            <DataTruthBadge type="MARKET" size="sm" />
          </div>
          <div className="text-base font-bold text-slate-900">
            {hasBudget ? formatCurrencyIRR(project.estimatedBudgetIRR!) : '—'}
          </div>
        </div>

        {/* Consumption */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-500" />
              مصرف ماهیانه مبنا
            </span>
            <DataTruthBadge type="USER_PROVIDED" size="sm" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            {hasConsumption ? formatEnergyGeneration(project.energyRequirement!.monthlyConsumptionKwh!) : '—'}
          </div>
        </div>

        {/* Phase and Updated At */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              آخرین به‌روزرسانی
            </span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {phaseInfo.phase?.title || 'نامشخص'}
            </span>
          </div>
          <div className="text-xs font-bold text-slate-800">
            {formatJalaliDate(project.updatedAt || project.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
};
