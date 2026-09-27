import React from 'react';
import { CommissioningRecord, CommissioningTest } from '../../../types/asset';
import { ShieldCheck, Calendar, FileText, User } from 'lucide-react';
import { CommissioningTestResult } from '../../execution/CommissioningTestResult';

interface AssetCommissioningRecordProps {
  commissioningRecord: CommissioningRecord | null;
  tests: CommissioningTest[];
  loading?: boolean;
  className?: string;
}

export const AssetCommissioningRecord: React.FC<AssetCommissioningRecordProps> = ({
  commissioningRecord,
  tests,
  loading = false,
  className = ''
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  if (!commissioningRecord) {
    return (
      <div className={`p-8 text-center rounded-2xl bg-slate-50/60 dark:bg-zinc-800/30 border border-dashed border-slate-200 dark:border-zinc-800 ${className}`}>
        <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
          سابقه راه‌اندازی برای این دارایی ثبت نشده است.
        </p>
      </div>
    );
  }

  // Derive explicit approval state from stored backend status only
  const isApproved = commissioningRecord.status === 'APPROVED';

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          label: 'تأیید شده',
          className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'IN_PROGRESS':
        return {
          label: 'در جریان بررسی و آزمون',
          className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'DRAFT':
        return {
          label: 'پیش‌نویس',
          className: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
        };
      case 'REJECTED':
        return {
          label: 'رد شده',
          className: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      default:
        return {
          label: status ? `وضعیت: ${status}` : 'وضعیت تأیید ثبت نشده است',
          className: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
        };
    }
  };

  const statusBadge = getStatusBadge(commissioningRecord.status);

  // Approval date logic: only show "تاریخ تأیید" if an actual approval/actualDate exists when approved
  const approvalDateFormatted = isApproved && commissioningRecord.actualDate
    ? formatDate(commissioningRecord.actualDate)
    : null;

  const lastUpdatedFormatted = formatDate(commissioningRecord.updatedAt);

  // Approver logic: only display recorded approver
  const approverDisplay = commissioningRecord.approvedByUserId
    ? `کاربر #${commissioningRecord.approvedByUserId}`
    : 'تأییدکننده ثبت نشده است';

  const passedTestsCount = tests.filter(t => t.status === 'PASSED').length;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>پرونده و نتایج آزمون‌های راه‌اندازی (Commissioning Record)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            آزمون‌های ثبت‌شده الکتریکی و انطباق فنی در پرونده پروژه
          </p>
        </div>

        <span className={`text-xs font-bold px-2.5 py-1 rounded-md border self-start sm:self-auto ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Record Metadata summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 dark:bg-zinc-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
        <div>
          <span className="text-slate-500 dark:text-zinc-400 block mb-0.5">تاریخ تأیید:</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200">
            {approvalDateFormatted || 'تاریخ تأیید ثبت نشده است'}
          </span>
          {lastUpdatedFormatted && !approvalDateFormatted && (
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-0.5">
              آخرین به‌روزرسانی: {lastUpdatedFormatted}
            </span>
          )}
        </div>

        <div>
          <span className="text-slate-500 dark:text-zinc-400 block mb-0.5">تعداد آزمون‌های موفق:</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
            {passedTestsCount} از {tests.length} آزمون
          </span>
        </div>

        <div>
          <span className="text-slate-500 dark:text-zinc-400 block mb-0.5">تأییدکننده:</span>
          <span className={`font-bold ${commissioningRecord.approvedByUserId ? 'text-slate-800 dark:text-zinc-200' : 'text-slate-500 dark:text-zinc-400 font-normal italic'}`}>
            {approverDisplay}
          </span>
        </div>
      </div>

      {/* Verified Tests list */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300">
          نتایج آزمون‌های ثبت‌شده در پرونده:
        </h4>

        {tests.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-zinc-500 italic p-3 bg-slate-50 dark:bg-zinc-850 rounded-xl">
            آزمونی در این پرونده ثبت نشده است.
          </p>
        ) : (
          <div className="space-y-2.5">
            {tests.map((test) => (
              <CommissioningTestResult key={test.id} test={test} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
