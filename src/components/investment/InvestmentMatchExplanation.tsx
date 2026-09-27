import React from 'react';
import { CheckCircle2, XCircle, Info, Sparkles } from 'lucide-react';
import { ProjectMatch } from '../../types/investment';

interface InvestmentMatchExplanationProps {
  match?: Partial<ProjectMatch>;
  reasons?: string[];
  investorContext?: {
    capitalMin?: number;
    capitalMax?: number;
    preferredProvinces?: string[];
    preferredStages?: string[];
    riskPreference?: string;
  };
  opportunityContext?: {
    province?: string;
    stage?: string;
    requiredCapital?: number;
    capacityKw?: number;
  };
}

export const InvestmentMatchExplanation: React.FC<InvestmentMatchExplanationProps> = ({
  match,
  reasons = [],
  investorContext,
  opportunityContext
}) => {
  const breakdown = match?.scoreBreakdown;

  // Compile transparent, objective match points
  const matchPoints: { label: string; passed: boolean; explanation: string }[] = [];

  if (investorContext && opportunityContext) {
    if (investorContext.preferredProvinces && investorContext.preferredProvinces.length > 0 && opportunityContext.province) {
      const locationFit = investorContext.preferredProvinces.includes(opportunityContext.province);
      matchPoints.push({
        label: 'مکان و استان ساختگاه',
        passed: locationFit,
        explanation: locationFit
          ? `پروژه در استان ${opportunityContext.province} قرار دارد که با استان‌های انتخابی شما همخوانی دارد.`
          : `استان پروژه (${opportunityContext.province}) جزو اولویت‌های اعلام‌شده اولیه شما نیست.`
      });
    }

    if (opportunityContext.requiredCapital !== undefined && (investorContext.capitalMin !== undefined || investorContext.capitalMax !== undefined)) {
      const min = investorContext.capitalMin || 0;
      const max = investorContext.capitalMax || Infinity;
      const capitalFit = opportunityContext.requiredCapital >= min && opportunityContext.requiredCapital <= max;
      matchPoints.push({
        label: 'محدوده سرمایه موردنیاز',
        passed: capitalFit,
        explanation: capitalFit
          ? 'سرمایه موردنیاز در محدوده توان سرمایه‌گذاری اعلام‌شده در پروفایل شما قرار دارد.'
          : 'سرمایه موردنیاز با بازه اولیه پروفایل سرمایه‌گذاری همخوانی کامل ندارد.'
      });
    }

    if (investorContext.preferredStages && investorContext.preferredStages.length > 0 && opportunityContext.stage) {
      const stageFit = investorContext.preferredStages.includes(opportunityContext.stage);
      matchPoints.push({
        label: 'مرحله تکوین پروژه',
        passed: stageFit,
        explanation: stageFit
          ? `وضعیت چرخه عمر پروژه (${opportunityContext.stage}) در فهرست مراحل مورد علاقه شما ثبت شده است.`
          : `مرحله فعلی پروژه با ترجیحات ثبت‌شده شما انطباق تقریبی دارد.`
      });
    }
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span>دلیل انطباق با معیارهای سرمایه‌گذاری:</span>
      </div>

      {reasons.length > 0 ? (
        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
          {reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : matchPoints.length > 0 ? (
        <div className="space-y-2">
          {matchPoints.map((point, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              {point.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              )}
              <div>
                <span className="font-bold text-slate-700 dark:text-zinc-300 ml-1">{point.label}:</span>
                <span className="text-slate-500 dark:text-zinc-400">{point.explanation}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          انطباق بر مبنای پارامترهای قطعی ثبت‌شده در مشخصات ساختگاه، ظرفیت و مدل مالی پروژه صورت پذیرفته است.
        </p>
      )}

      {/* Breakdown Scores if available from backend */}
      {breakdown && (
        <div className="pt-2 border-t border-slate-200 dark:border-zinc-700/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          {breakdown.capitalFit !== undefined && (
            <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700">
              <span className="text-slate-400 block">تناسب سرمایه:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{breakdown.capitalFit}٪</span>
            </div>
          )}
          {breakdown.locationFit !== undefined && (
            <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700">
              <span className="text-slate-400 block">تناسب جغرافیایی:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{breakdown.locationFit}٪</span>
            </div>
          )}
          {breakdown.stageFit !== undefined && (
            <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700">
              <span className="text-slate-400 block">تناسب مرحله:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{breakdown.stageFit}٪</span>
            </div>
          )}
          {breakdown.readinessFit !== undefined && (
            <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700">
              <span className="text-slate-400 block">آمادگی اسناد:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{breakdown.readinessFit}٪</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
