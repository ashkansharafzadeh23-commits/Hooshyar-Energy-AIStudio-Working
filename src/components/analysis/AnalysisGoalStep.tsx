import React from 'react';
import { DollarSign, ShieldAlert, Maximize2, TrendingUp, Zap, HelpCircle, Check } from 'lucide-react';

export type UserSolarGoal = 
  | 'REDUCE_BILL' 
  | 'OFFSET_PARTIAL' 
  | 'MAX_ROOF_CAPACITY' 
  | 'INVESTMENT_PLANT' 
  | 'ELECTRICITY_SALE' 
  | 'FEASIBILITY';

interface AnalysisGoalStepProps {
  selectedGoal: UserSolarGoal;
  onChange: (goal: UserSolarGoal) => void;
}

interface GoalOption {
  id: UserSolarGoal;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'REDUCE_BILL',
    title: 'کاهش هزینه برق',
    desc: 'کاهش پله‌های تصاعدی مصرف شبکه و صرفه‌جویی اقتصادی ماهانه',
    icon: DollarSign
  },
  {
    id: 'OFFSET_PARTIAL',
    title: 'تأمین بخشی از مصرف',
    desc: 'تأمین برق ساعات پیک روزانه و کاهش وابستگی به شبکه',
    icon: Zap
  },
  {
    id: 'MAX_ROOF_CAPACITY',
    title: 'حداکثر استفاده از فضای موجود',
    desc: 'نصب بیشترین ظرفیت ممکن متناسب با متراژ و استحکام سقف یا زمین',
    icon: Maximize2
  },
  {
    id: 'INVESTMENT_PLANT',
    title: 'احداث نیروگاه سرمایه‌گذاری',
    desc: 'سرمایه‌گذاری روی نیروگاه مگاواتی یا کیلوواتی با بازدهی اقتصادی سالانه',
    icon: TrendingUp
  },
  {
    id: 'ELECTRICITY_SALE',
    title: 'بررسی امکان فروش برق',
    desc: 'بررسی امکان اتصال به شبکه و فروش برق بر اساس ضوابط جاری انرژی',
    icon: TrendingUp
  },
  {
    id: 'FEASIBILITY',
    title: 'بررسی اولیه امکان‌پذیری',
    desc: 'سنجش مقدماتی توان تولید، متراژ مورد نیاز و برآورد اولیه سرمایه',
    icon: HelpCircle
  }
];

export const AnalysisGoalStep: React.FC<AnalysisGoalStepProps> = ({
  selectedGoal,
  onChange
}) => {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="mb-2">
        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
          هدف اصلی شما از احداث سامانه خورشیدی چیست؟
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOAL_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selectedGoal === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-3 min-h-[82px] ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 ring-1 ring-amber-500 shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Icon size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{opt.title}</h4>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal line-clamp-2">
                  {opt.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center pt-2">
        این هدف جهت ارائه سناریوی مناسب در نتایج استفاده می‌شود و بر فرمول‌های فیزیکی تولید برق تأثیری ندارد.
      </p>
    </div>
  );
};
