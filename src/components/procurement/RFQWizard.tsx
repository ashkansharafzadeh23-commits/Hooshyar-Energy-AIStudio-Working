import React, { useState } from 'react';
import { EnergyProject } from '../../types/project';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { ChevronDown, ChevronUp, ArrowLeft, ArrowRight, Sliders, CheckSquare, Calendar, DollarSign, Shield, FileText } from 'lucide-react';

export interface RFQFormData {
  title: string;
  scopeOfWork: string[];
  preferredPanelTech: string;
  preferredInverterTech: string;
  structureType: string;
  expectedDurationMonths: number;
  submissionDeadlineDays: number;
  budgetCapIRR?: number;
  paymentTerms: string;
  warrantyRequirementYears: number;
  visibility: 'INVITED_ONLY' | 'VERIFIED_EPCS' | 'PUBLIC';
  specialRequirements: string;
}

interface RFQWizardProps {
  project: EnergyProject;
  initialData?: Partial<RFQFormData>;
  onSubmitDraft: (data: RFQFormData) => void;
  onCancel: () => void;
  className?: string;
}

export const RFQWizard: React.FC<RFQWizardProps> = ({
  project,
  initialData,
  onSubmitDraft,
  onCancel,
  className = ''
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState<RFQFormData>({
    title: initialData?.title || `استعلام خدمات احداث نیروگاه خورشیدی ${project.title}`,
    scopeOfWork: initialData?.scopeOfWork || ['ENGINEERING', 'PROCUREMENT', 'CONSTRUCTION', 'COMMISSIONING'],
    preferredPanelTech: initialData?.preferredPanelTech || 'MONO_PERC_TIER1',
    preferredInverterTech: initialData?.preferredInverterTech || 'STRING_INVERTER',
    structureType: initialData?.structureType || 'FIXED_GROUND',
    expectedDurationMonths: initialData?.expectedDurationMonths || 4,
    submissionDeadlineDays: initialData?.submissionDeadlineDays || 14,
    budgetCapIRR: initialData?.budgetCapIRR || (project.estimatedBudgetIRR ? Number(project.estimatedBudgetIRR) : undefined),
    paymentTerms: initialData?.paymentTerms || 'مرحله‌ای بر اساس پیشرفت کار و تحویل عینی فازها',
    warrantyRequirementYears: initialData?.warrantyRequirementYears || 2,
    visibility: initialData?.visibility || 'VERIFIED_EPCS',
    specialRequirements: initialData?.specialRequirements || ''
  });

  const toggleScope = (scopeKey: string) => {
    setFormData(prev => {
      const exists = prev.scopeOfWork.includes(scopeKey);
      return {
        ...prev,
        scopeOfWork: exists
          ? prev.scopeOfWork.filter(s => s !== scopeKey)
          : [...prev.scopeOfWork, scopeKey]
      };
    });
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitDraft(formData);
  };

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
            تنظیم استعلام رسمی پیمانکار خورشیدی (EPC RFQ)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            مشخصات فنی و شرایط مدنظر خود را مشخص کنید تا پیمانکاران پیشنهادهای منطبق ارسال کنند.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer min-h-[44px] px-3 flex items-center"
        >
          انصراف
        </button>
      </div>

      {/* Project-derived information badge */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
            اطلاعات استخراج‌شده از پروژه (غیرقابل تغییر در این فرم)
          </span>
          <DataTruthBadge type="USER_PROVIDED" size="sm" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-slate-500 dark:text-zinc-400">موقعیت: </span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">
              {project.location?.province || 'ثبت نشده'} - {project.location?.city || 'ثبت نشده'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-zinc-400">ظرفیت: </span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">
              {project.targetCapacityKw ? `${project.targetCapacityKw} کیلووات` : 'ثبت نشده'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-zinc-400">مساحت: </span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">
              {project.site?.areaM2 ? `${project.site.areaM2} م²` : 'ثبت نشده'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-zinc-400">شبکه: </span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200">
              {project.energyRequirement?.gridConnected ? 'متصل به شبکه' : 'جدا از شبکه'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleNext} className="space-y-6">
        {/* RFQ Title */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 mb-1.5">
            عنوان استعلام
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Scope of Work */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 mb-2">
            دامنه خدمات مورد نیاز (Scope of Work)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[
              { id: 'ENGINEERING', label: 'طراحی پایه و تفصیلی (Engineering)' },
              { id: 'PROCUREMENT', label: 'تأمین تجهیزات اصلی و فرعی (Procurement)' },
              { id: 'CONSTRUCTION', label: 'عملیات نصب و ابنیه (Construction)' },
              { id: 'COMMISSIONING', label: 'تست، راه‌اندازی و تزریق به شبکه' },
              { id: 'PERMITTING', label: 'اخذ مجوزها و پیگیری اتصال شرکت توزیع' },
              { id: 'O_AND_M', label: 'بهره‌برداری و نگهداری اولیه (O&M)' }
            ].map(item => {
              const isChecked = formData.scopeOfWork.includes(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggleScope(item.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-right transition-colors cursor-pointer min-h-[44px] ${
                    isChecked
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200'
                      : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                    isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-zinc-600'
                  }`}>
                    {isChecked && <CheckSquare className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Timelines and Deadlines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1.5">
              مدت زمان مورد انتظار اجرای کامل (ماه)
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={formData.expectedDurationMonths}
              onChange={(e) => setFormData({ ...formData, expectedDurationMonths: Number(e.target.value) })}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1.5">
              مهلت ارسال پیشنهاد توسط پیمانکاران (روز کاری)
            </label>
            <input
              type="number"
              min="3"
              max="60"
              value={formData.submissionDeadlineDays}
              onChange={(e) => setFormData({ ...formData, submissionDeadlineDays: Number(e.target.value) })}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Audience / Visibility */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1.5">
            مخاطبان دریافت استعلام
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'VERIFIED_EPCS', title: 'پیمانکاران احراز هویت‌شده', desc: 'ارسال به شرکت‌های دارای رتبه فنی در سامانه' },
              { id: 'INVITED_ONLY', title: 'فقط پیمانکاران منتخب', desc: 'تنها پیمانکارانی که دعوت اختصاصی دریافت کنند' },
              { id: 'PUBLIC', title: 'عمومی در تابلو مناقصات', desc: 'قابل مشاهده برای کلیه شرکت‌های عضو' }
            ].map(v => (
              <button
                type="button"
                key={v.id}
                onClick={() => setFormData({ ...formData, visibility: v.id as any })}
                className={`p-3 rounded-xl border text-right transition-colors cursor-pointer min-h-[44px] ${
                  formData.visibility === v.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <div className="text-xs font-bold mb-0.5">{v.title}</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Technical & Commercial Accordion */}
        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer min-h-[44px]"
          >
            <Sliders className="w-4 h-4" />
            <span>{showAdvanced ? 'بستن تنظیمات فنی و تجاری پیشرفته' : 'تنظیمات فنی و تجاری پیشرفته (اختیاری)'}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    ترجیح تکنولوژی پنل خورشیدی
                  </label>
                  <select
                    value={formData.preferredPanelTech}
                    onChange={(e) => setFormData({ ...formData, preferredPanelTech: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                  >
                    <option value="MONO_PERC_TIER1">مونو کریستال Tier-1 (راندمان بالا)</option>
                    <option value="TOPCON">فناوری پیشرفته TOPCon یا HJT</option>
                    <option value="STANDARD_MONO">مونوکریستال استاندارد</option>
                    <option value="NO_PREFERENCE">بدون اولویت خاص (پیشنهاد پیمانکار)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    ترجیح اینورتر
                  </label>
                  <select
                    value={formData.preferredInverterTech}
                    onChange={(e) => setFormData({ ...formData, preferredInverterTech: e.target.value })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                  >
                    <option value="STRING_INVERTER">اینورتر رشته‌ای (String Inverter)</option>
                    <option value="CENTRAL_INVERTER">اینورتر مرکزی (Central)</option>
                    <option value="MICRO_INVERTER">میکرو اینورتر</option>
                    <option value="NO_PREFERENCE">طبق طراحی بهینه پیمانکار</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    حداقل مدت گارانتی اجرا و راندمان (سال)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.warrantyRequirementYears}
                    onChange={(e) => setFormData({ ...formData, warrantyRequirementYears: Number(e.target.value) })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                    سقف بودجه مدنظر کارفرما (تومان - اختیاری)
                  </label>
                  <input
                    type="number"
                    placeholder="بدون سقف تعیین‌شده"
                    value={formData.budgetCapIRR || ''}
                    onChange={(e) => setFormData({ ...formData, budgetCapIRR: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  توضیحات و نیازمندی‌های خاص فنی
                </label>
                <textarea
                  rows={3}
                  value={formData.specialRequirements}
                  onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                  placeholder="شرایط دسترسی زمین، محدودیت‌های ساختمانی، تحویل نقشه‌های ژئوتکنیک و سایر جزئیات..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold hover:bg-slate-50 min-h-[44px] cursor-pointer"
          >
            بازگشت
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors min-h-[44px] cursor-pointer"
          >
            <span>بازبینی و پیش‌نمایش نهایی</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
