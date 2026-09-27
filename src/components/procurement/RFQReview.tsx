import React from 'react';
import { EnergyProject } from '../../types/project';
import { RFQFormData } from './RFQWizard';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { Send, Edit3, ArrowRight, Calendar, Clock, MapPin, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatCurrencyIRR } from '../../utils/formatters';

interface RFQReviewProps {
  project: EnergyProject;
  formData: RFQFormData;
  isPublishing: boolean;
  onConfirmPublish: () => void;
  onEdit: () => void;
  className?: string;
}

export const RFQReview: React.FC<RFQReviewProps> = ({
  project,
  formData,
  isPublishing,
  onConfirmPublish,
  onEdit,
  className = ''
}) => {
  const scopeLabels: Record<string, string> = {
    ENGINEERING: 'طراحی مهندسی (Engineering)',
    PROCUREMENT: 'تأمین تجهیزات (Procurement)',
    CONSTRUCTION: 'عملیات نصب و ابنیه (Construction)',
    COMMISSIONING: 'تست و راه‌اندازی (Commissioning)',
    PERMITTING: 'اخذ مجوزها و اتصال شبکه',
    O_AND_M: 'بهره‌برداری و نگهداری (O&M)'
  };

  const visibilityLabels: Record<string, string> = {
    VERIFIED_EPCS: 'پیمانکاران احراز هویت‌شده سامانه',
    INVITED_ONLY: 'فقط پیمانکاران دعوت‌شده',
    PUBLIC: 'انتشار عمومی در تابلوی مناقصات'
  };

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              پیش‌نمایش و تایید نهایی
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
            بازبینی و انتشار استعلام قیمت و خدمات پیمانکاران (RFQ)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            پس از انتشار، استعلام برای پیمانکاران ارسال خواهد شد و امکان دریافت و مقایسه پیشنهادات فعال می‌شود.
          </p>
        </div>

        <button
          type="button"
          onClick={onEdit}
          disabled={isPublishing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-50 cursor-pointer min-h-[44px]"
        >
          <Edit3 className="w-4 h-4" />
          <span>ویرایش مشخصات</span>
        </button>
      </div>

      <div className="space-y-4">
        {/* Title & Project Identification */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800">
          <div className="text-xs text-slate-500 dark:text-zinc-400 mb-1">عنوان استعلام:</div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 mb-3">
            {formData.title}
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-zinc-700/60 text-xs">
            <div>
              <span className="text-slate-500 dark:text-zinc-400">کد پروژه: </span>
              <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{project.projectCode}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-zinc-400">موقعیت احداث: </span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                {project.location?.province}، {project.location?.city}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-zinc-400">ظرفیت طراحی: </span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                {project.targetCapacityKw ? `${project.targetCapacityKw} کیلووات` : 'ثبت نشده'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-zinc-400">وضعیت شبکه: </span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                {project.energyRequirement?.gridConnected ? 'متصل به شبکه' : 'مستقل'}
              </span>
            </div>
          </div>
        </div>

        {/* Scope of Work */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
          <h5 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-2">
            دامنه خدمات درخواستی ({formData.scopeOfWork.length} مورد)
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {formData.scopeOfWork.map(s => (
              <div key={s} className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{scopeLabels[s] || s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Commercial & Technical Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>مدت زمان اجرا</span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              {formData.expectedDurationMonths} ماه تقویمی
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>مهلت ارسال پیشنهاد</span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              {formData.submissionDeadlineDays} روز کاری
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>مخاطبان استعلام</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
              {visibilityLabels[formData.visibility] || formData.visibility}
            </div>
          </div>
        </div>

        {/* Budget & Commercial Terms */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-zinc-400">سقف بودجه مدنظر:</span>
            <span className="font-bold text-slate-900 dark:text-zinc-100">
              {formData.budgetCapIRR ? formatCurrencyIRR(formData.budgetCapIRR) : 'بدون سقف اعلام‌شده'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-zinc-400">شرایط پرداخت:</span>
            <span className="font-semibold text-slate-900 dark:text-zinc-100">{formData.paymentTerms}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-zinc-400">گارانتی مورد انتظار:</span>
            <span className="font-semibold text-slate-900 dark:text-zinc-100">{formData.warrantyRequirementYears} سال</span>
          </div>
        </div>
      </div>

      {/* Confirmation CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 mt-5 border-t border-slate-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={onEdit}
          disabled={isPublishing}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold hover:bg-slate-50 cursor-pointer min-h-[44px]"
        >
          بازگشت به ویرایش فرم
        </button>

        <button
          type="button"
          onClick={onConfirmPublish}
          disabled={isPublishing}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer min-h-[44px]"
        >
          {isPublishing ? (
            <span>در حال ارسال استعلام...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>ارسال و انتشار استعلام پیشنهاد</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
