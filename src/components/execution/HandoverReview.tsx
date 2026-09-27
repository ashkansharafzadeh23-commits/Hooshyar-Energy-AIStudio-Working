import React, { useState } from 'react';
import { ProjectHandover } from '../../types/asset';
import { ArrowRightLeft, CheckCircle2, XCircle, FileText, BookOpen, Wrench, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export interface HandoverReadinessData {
  canApprove: boolean;
  commissioningApproved: boolean;
  documentsComplete: boolean;
  trainingComplete: boolean;
  sparePartsDelivered: boolean;
  warrantyDelivered: boolean;
  manualsDelivered: boolean;
  unresolvedCriticalPunchList?: number;
  blockingReasons?: string[];
}

interface HandoverReviewProps {
  projectId: string;
  handover: ProjectHandover | null;
  readiness: HandoverReadinessData | null;
  onUpdateChecklist: (items: Partial<ProjectHandover>) => Promise<void>;
  onApproveHandover: (notes?: string) => Promise<void>;
  loading?: boolean;
  canEdit?: boolean;
  className?: string;
}

export const HandoverReview: React.FC<HandoverReviewProps> = ({
  projectId,
  handover,
  readiness,
  onUpdateChecklist,
  onApproveHandover,
  loading = false,
  canEdit = true,
  className = ''
}) => {
  const [updating, setUpdating] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canApprove = readiness?.canApprove === true;
  const isApproved = handover?.status === 'APPROVED';

  const handleToggle = async (key: keyof ProjectHandover, currentValue: boolean) => {
    if (!canEdit || isApproved) return;
    setUpdating(String(key));
    setError(null);
    try {
      await onUpdateChecklist({ [key]: !currentValue });
    } catch (err: any) {
      setError(err?.message || 'خطا در به‌روزرسانی چک‌لیست تحویل');
    } finally {
      setUpdating(null);
    }
  };

  const handleApprove = async () => {
    if (!canApprove || isApproved) return;
    setApproving(true);
    setError(null);
    try {
      await onApproveHandover(notes);
    } catch (err: any) {
      setError(err?.message || 'خطا در ثبت صورت‌جلسه تحویل نهایی');
    } finally {
      setApproving(false);
    }
  };

  const checklistItems = [
    {
      key: 'documentsComplete' as keyof ProjectHandover,
      title: 'نقشه‌ها و اسناد چون‌ساخت (As-Built Drawings)',
      desc: 'نقشه‌های نهایی تک‌خطی الکتریکی، جانمایی تجهیزات و اسناد سازه',
      icon: FileText,
      value: handover?.documentsComplete ?? false
    },
    {
      key: 'trainingComplete' as keyof ProjectHandover,
      title: 'آموزش پرسنل و بهره‌بردار نیروگاه',
      desc: 'برگزاری کارگاه بهره‌برداری، ایمنی کارگاهی و پروتکل‌های اضطراری',
      icon: BookOpen,
      value: handover?.trainingComplete ?? false
    },
    {
      key: 'sparePartsDelivered' as keyof ProjectHandover,
      title: 'تحویل قطعات یدکی و ابزار مخصوص (Spare Parts)',
      desc: 'فیوزهای DC/AC، صاعقه‌گیرهای یدک و ابزارهای نگهداری اولیه',
      icon: Wrench,
      value: handover?.sparePartsDelivered ?? false
    },
    {
      key: 'warrantyDelivered' as keyof ProjectHandover,
      title: 'برگه‌های ضمانت رسمی سازندگان و پیمانکار (Warranties)',
      desc: 'گارانتی رسمی ماژول‌ها، اینورترها و تضمین حسن انجام کار EPC',
      icon: ShieldCheck,
      value: handover?.warrantyDelivered ?? false
    },
    {
      key: 'manualsDelivered' as keyof ProjectHandover,
      title: 'دفترچه‌های راهنمای بهره‌برداری و نگهداری (O&M Manuals)',
      desc: 'دستورالعمل‌های سرویس دوره‌ای، تمیزکاری پنل‌ها و عیب‌یابی',
      icon: BookOpen,
      value: handover?.manualsDelivered ?? false
    }
  ];

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              مدیریت و صورت‌جلسه تحویل پروژه (Handover)
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              انتقال مالکیت اجرایی از پیمانکار EPC به کارفرما و بهره‌بردار نهایی
            </p>
          </div>
        </div>

        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border self-start sm:self-center ${
          isApproved
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : canApprove
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {isApproved ? 'تحویل قطعی شده' : canApprove ? 'آماده امضای تحویل' : 'در انتظار تکمیل چک‌لیست'}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 text-xs text-rose-700 border border-rose-200">
          {error}
        </div>
      )}

      {/* Distinction notice */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong className="text-slate-800 dark:text-zinc-200 font-bold">تمایز فنی:</strong> راه‌اندازی (Commissioning) بیانگر صحت آزمون‌های فنی است؛ در حالی که تحویل پروژه (Handover) فرآیند حقوقی انتقال دارایی، اسناد چون‌ساخت و مدارک گارانتی است.
        </p>
      </div>

      {/* Interactive checklist */}
      <div className="space-y-2">
        <h5 className="text-xs font-bold text-slate-700 dark:text-zinc-300">
          چک‌لیست الزامات تحویل رسمی
        </h5>

        <div className="space-y-2">
          {checklistItems.map((item) => (
            <div
              key={String(item.key)}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                item.value
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-slate-50/50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <item.icon className={`w-4 h-4 shrink-0 mt-0.5 ${item.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <div>
                  <h6 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                    {item.title}
                  </h6>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {item.desc}
                  </p>
                </div>
              </div>

              {canEdit && !isApproved ? (
                <button
                  disabled={updating === String(item.key)}
                  onClick={() => handleToggle(item.key, item.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] min-w-[70px] flex items-center justify-center shrink-0 border ${
                    item.value
                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                  }`}
                >
                  {updating === String(item.key) ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : item.value ? (
                    'تکمیل شد ✓'
                  ) : (
                    'تأیید تحویل'
                  )}
                </button>
              ) : (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  item.value ? 'text-emerald-600 bg-emerald-100/60' : 'text-slate-400 bg-slate-100'
                }`}>
                  {item.value ? 'تکمیل شد' : 'اقدام نشده'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Blocking Reasons if not ready */}
      {readiness && !canApprove && !isApproved && readiness.blockingReasons && readiness.blockingReasons.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-xs space-y-1">
          <span className="font-bold text-amber-900 dark:text-amber-200 block">
            شرایط لازم برای امضای صورت‌جلسه تحویل نهایی:
          </span>
          <ul className="space-y-1">
            {readiness.blockingReasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-800 dark:text-amber-300">
                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Final approval button */}
      {!isApproved && canApprove && (
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={handleApprove}
            disabled={approving || loading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs min-h-[44px] flex items-center gap-2 transition-all"
          >
            {approving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال ثبت صورت‌جلسه تحویل...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>تأیید و امضای صورت‌جلسه تحویل نهایی</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
