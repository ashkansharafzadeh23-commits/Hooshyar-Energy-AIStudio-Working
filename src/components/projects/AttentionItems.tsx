import React from 'react';
import { AlertTriangle, CheckCircle2, ArrowLeft, Info, BellRing } from 'lucide-react';
import { EnergyProject } from '../../types/project';
import { getAttentionItems, AttentionItem } from './lifecycleMapping';

interface AttentionItemsProps {
  project: EnergyProject;
  onNavigateTab?: (tab: string) => void;
}

export const AttentionItems: React.FC<AttentionItemsProps> = ({ project, onNavigateTab }) => {
  const items: AttentionItem[] = getAttentionItems(project);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <BellRing className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">موارد نیازمند توجه</h3>
        </div>
        {items.length > 0 && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            {items.length} مورد
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3 text-slate-600">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-sm font-medium">
            در حال حاضر مورد فوری وجود ندارد.
            <span className="block text-xs text-slate-400 mt-0.5">
              تمامی گام‌های الزامی این فاز تا این لحظه طبق برنامه ثبت شده‌اند.
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isAction = item.type === 'ACTION_REQUIRED';
            const isWarning = item.type === 'WARNING';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isAction
                    ? 'bg-blue-50/50 border-blue-200/80 text-blue-950'
                    : isWarning
                    ? 'bg-amber-50/50 border-amber-200/80 text-amber-950'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isAction ? (
                      <BellRing className="w-4 h-4 text-blue-600" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Info className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.linkTab && onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab(item.linkTab!)}
                    className="self-end sm:self-center shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition-colors min-h-[40px] cursor-pointer"
                  >
                    <span>{item.linkText || 'مشاهده'}</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
