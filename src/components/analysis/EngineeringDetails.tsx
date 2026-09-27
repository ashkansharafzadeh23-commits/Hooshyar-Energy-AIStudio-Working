import React, { useState } from 'react';
import { ChevronDown, Cpu, Zap, Grid, Sliders, ShieldCheck } from 'lucide-react';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface TechnicalSpecification {
  label: string;
  value: string;
  badge?: 'CALCULATED' | 'USER_PROVIDED' | 'VERIFIED_SOURCE' | 'REFERENCE_ESTIMATE';
}

interface EngineeringDetailsProps {
  panelWattage?: number | null;
  panelCount?: number | null;
  panelModel?: string | null;
  inverterCount?: number | null;
  inverterType?: string | null;
  dcCapacityKwp?: number | null;
  acCapacityKw?: number | null;
  systemLossesPercent?: number | null;
  tiltAngle?: number | null;
  azimuthAngle?: number | null;
  totalAreaM2?: number | null;
  usableAreaM2?: number | null;
  defaultExpanded?: boolean;
}

export const EngineeringDetails: React.FC<EngineeringDetailsProps> = ({
  panelWattage,
  panelCount,
  panelModel,
  inverterCount,
  inverterType,
  dcCapacityKwp,
  acCapacityKw,
  systemLossesPercent,
  tiltAngle,
  azimuthAngle,
  totalAreaM2,
  usableAreaM2,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const specs: TechnicalSpecification[] = [
    {
      label: 'ظرفیت اسمی DC (مجموع پنل‌ها)',
      value: dcCapacityKwp ? `${dcCapacityKwp.toLocaleString('fa-IR')} کیلووات‌پیک` : 'اطلاعات کافی موجود نیست',
      badge: 'CALCULATED'
    },
    {
      label: 'ظرفیت خروجی AC اینورتر',
      value: acCapacityKw ? `${acCapacityKw.toLocaleString('fa-IR')} کیلووات` : 'اطلاعات کافی موجود نیست',
      badge: 'CALCULATED'
    },
    {
      label: 'مشخصات ماژول فتوولتائیک',
      value: panelWattage ? `${panelWattage} وات${panelModel ? ` (${panelModel})` : ''}` : (panelModel || 'اطلاعات کافی موجود نیست'),
      badge: 'REFERENCE_ESTIMATE'
    },
    {
      label: 'تعداد کل پنل‌ها',
      value: panelCount ? `${panelCount.toLocaleString('fa-IR')} ماژول` : 'اطلاعات کافی موجود نیست',
      badge: 'CALCULATED'
    },
    {
      label: 'تجهیزات تبدیل توان (اینورتر)',
      value: inverterCount ? `${inverterCount} دستگاه${inverterType ? ` (${inverterType})` : ''}` : (inverterType || 'اطلاعات در دسترس نیست'),
      badge: 'REFERENCE_ESTIMATE'
    },
    {
      label: 'مساحت کل محل / فضای مفید',
      value: totalAreaM2 ? `${totalAreaM2} متر مربع کل${usableAreaM2 ? ` / ${usableAreaM2} متر مفید` : ''}` : '–',
      badge: 'USER_PROVIDED'
    },
    {
      label: 'زاویه شیب بهینه (Tilt)',
      value: tiltAngle !== null && tiltAngle !== undefined ? `${tiltAngle} درجه رو به جنوب (۰ درجه آزیموت)` : 'اطلاعات در دسترس نیست',
      badge: 'REFERENCE_ESTIMATE'
    },
    {
      label: 'ضریب کل تلفات سیستم (Derate Factor)',
      value: systemLossesPercent !== null && systemLossesPercent !== undefined ? `تقریباً ${systemLossesPercent}٪ (شامل تلفات حرارتی، سیم‌کشی و گرد و غبار)` : 'اطلاعات در دسترس نیست',
      badge: 'REFERENCE_ESTIMATE'
    }
  ];

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden" dir="rtl">
      {/* Accordion Trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-right hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Cpu size={18} />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              جزئیات فنی و پیکربندی مهندسی
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              پارامترهای محاسباتی ماژول‌ها، اینورتر، زاویه نصب و متراژ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 hidden sm:inline">
            {isExpanded ? 'بستن مشخصات' : 'مشاهده مشخصات'}
          </span>
          <ChevronDown
            size={18}
            className={`text-zinc-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180 text-amber-500' : ''
            }`}
          />
        </div>
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {specs.map((spec, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    {spec.label}
                  </span>
                  {spec.badge && <DataTruthBadge type={spec.badge} size="sm" />}
                </div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {spec.value}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-900/80 dark:text-blue-300 leading-relaxed">
            * تجهیزات اعلام‌شده به صورت پیکربندی مرجع استاندارد می‌باشند. در زمان استعلام از پیمانکاران (EPC)، برندها و مدل‌های دقیق موجود در بازار با گارانتی رسمی ارائه خواهد شد.
          </div>
        </div>
      )}
    </div>
  );
};
