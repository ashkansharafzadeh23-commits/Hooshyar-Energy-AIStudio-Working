import React, { useState } from 'react';
import { Zap, HelpCircle, FileText, Upload, Sparkles, AlertCircle, Check } from 'lucide-react';
import { DataTruthBadge } from '../common/DataTruthBadge';
import SmartAnalyzer from '../SmartAnalyzer';

interface ConsumptionStepProps {
  monthlyKwh: number | null;
  area: number;
  onChange: (monthlyKwh: number) => void;
  onAnalysisExtracted?: (extractedKwh: number, capacityKwp?: number) => void;
}

export const ConsumptionStep: React.FC<ConsumptionStepProps> = ({
  monthlyKwh,
  area,
  onChange,
  onAnalysisExtracted
}) => {
  const [inputValue, setInputValue] = useState<string>(
    monthlyKwh && monthlyKwh > 0 ? String(monthlyKwh) : ''
  );
  const [showBillUpload, setShowBillUpload] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleInputChange = (val: string) => {
    setInputValue(val);
    const num = parseFloat(val);
    if (!val || isNaN(num) || num <= 0) {
      setErrorMsg('لطفاً عددی معتبر و بزرگتر از صفر وارد کنید.');
    } else {
      setErrorMsg(null);
      onChange(num);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Primary Input Box */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label htmlFor="consumption-input" className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
            مصرف ماهانه برق
          </label>
          <DataTruthBadge type="USER_PROVIDED" size="sm" />
        </div>

        <div className="relative mt-2">
          <input
            id="consumption-input"
            type="number"
            min="1"
            max="1000000"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="میزان مصرف ماهانه بر حسب کیلووات‌ساعت"
            className="w-full min-h-[50px] px-4 py-3 text-lg font-bold bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors pl-28 text-left"
            dir="ltr"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/80 dark:bg-zinc-700/80 px-2.5 py-1.5 rounded-lg pointer-events-none">
            <Zap size={14} className="text-amber-500" />
            <span>کیلووات‌ساعت در ماه</span>
          </div>
        </div>

        {errorMsg && (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </p>
        )}

        {/* Helper Explanation */}
        <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900/90 dark:text-blue-200 leading-relaxed flex items-start gap-2.5">
          <HelpCircle size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong>راهنمای یافتن مصرف در قبض:</strong> این مقدار در قبض برق با عنوان <strong>«مصرف دوره»</strong> یا <strong>«کیلووات‌ساعت»</strong> درج شده است. اگر قبض برق دوره ۳۰ روزه دارید، همان مقدار مصرف را وارد نمایید.
          </div>
        </div>
      </div>

      {/* Real Bill Upload Option (SmartAnalyzer integration) */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setShowBillUpload(!showBillUpload)}
          className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Upload size={14} />
          <span>{showBillUpload ? 'بستن آپلود تصویر قبض' : 'بارگذاری عکس قبض برق (استخراج خودکار)'}</span>
        </button>

        {showBillUpload && (
          <div className="mt-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <SmartAnalyzer
              area={area || 100}
              isSolar={true}
              onAnalysisComplete={(extractedKwh, recommendation, capacityKwp) => {
                if (extractedKwh && extractedKwh > 0) {
                  setInputValue(String(Math.round(extractedKwh)));
                  onChange(Math.round(extractedKwh));
                }
                if (onAnalysisExtracted) {
                  onAnalysisExtracted(extractedKwh, capacityKwp);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
