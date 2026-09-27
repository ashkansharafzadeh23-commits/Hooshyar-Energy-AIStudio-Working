import React, { useState } from 'react';
import { Sparkles, ChevronDown, CheckCircle, HelpCircle, ShieldCheck } from 'lucide-react';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface AIResultExplanationProps {
  summary?: string;
  energySavingTips?: Array<{ title: string; description: string }>;
  aiStatus?: 'SUCCESS' | 'UNAVAILABLE' | 'NOT_CONFIGURED';
  recommendedCapacityKwp?: number;
  locationLabel?: string;
}

export const AIResultExplanation: React.FC<AIResultExplanationProps> = ({
  summary,
  energySavingTips,
  aiStatus = 'SUCCESS',
  recommendedCapacityKwp,
  locationLabel
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (aiStatus === 'UNAVAILABLE' || aiStatus === 'NOT_CONFIGURED' || !summary) {
    return (
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-500 dark:text-zinc-400 text-right leading-relaxed" dir="rtl">
        <div className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300 mb-1">
          <Sparkles size={14} className="text-zinc-400" />
          <span>توضیح هوشمند نتیجه</span>
          <DataTruthBadge type="AI" size="sm" />
        </div>
        <p>
          توضیح هوشمند برای این تحلیل در دسترس نیست. نتایج مهندسی بالا همچنان قابل مشاهده هستند.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden text-right" dir="rtl">
      {/* Trigger Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-right hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                توضیح هوشمند نتیجه
              </h3>
              <DataTruthBadge type="AI" size="sm" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              تحلیل مشاور هوشمند درباره سناریوی بهینه و نکات فنی
            </p>
          </div>
        </div>

        <ChevronDown
          size={18}
          className={`text-zinc-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180 text-amber-500' : ''
          }`}
        />
      </button>

      {/* Expandable Explanation Body */}
      {isExpanded && (
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 space-y-4">
          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
            {summary}
          </p>

          {energySavingTips && energySavingTips.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block mb-2">
                توصیه‌های کاربردی بهینه‌سازی:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {energySavingTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-xs"
                  >
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                      {tip.title}
                    </div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                      {tip.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 pt-1">
            <ShieldCheck size={12} />
            <span>مقادیر مهندسی نمایش‌داده‌شده توسط موتور محاسباتی سامانه تولید شده‌اند.</span>
          </div>
        </div>
      )}
    </div>
  );
};
