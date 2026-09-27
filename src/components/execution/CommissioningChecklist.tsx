import React, { useState } from 'react';
import { CommissioningTest } from '../../types/asset';
import { CommissioningTestResult } from './CommissioningTestResult';
import { ExecutionEmptyState } from './ExecutionEmptyState';
import { CheckCircle2, Settings, Plus, Send, X, Save } from 'lucide-react';

interface CommissioningChecklistProps {
  tests: CommissioningTest[];
  loading?: boolean;
  onRecordResult?: (testId: string, measuredValue: string, status: string, notes?: string) => Promise<void>;
  canEdit?: boolean;
  className?: string;
}

export const CommissioningChecklist: React.FC<CommissioningChecklistProps> = ({
  tests,
  loading = false,
  onRecordResult,
  canEdit = true,
  className = ''
}) => {
  const [selectedTest, setSelectedTest] = useState<CommissioningTest | null>(null);
  const [measuredValue, setMeasuredValue] = useState('');
  const [testStatus, setTestStatus] = useState('PASSED');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openRecordModal = (t: CommissioningTest) => {
    setSelectedTest(t);
    setMeasuredValue(t.measuredValue || '');
    setTestStatus(t.status === 'NOT_STARTED' ? 'PASSED' : t.status);
    setNotes(t.notes || '');
    setError(null);
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest || !onRecordResult) return;
    setSubmitting(true);
    setError(null);
    try {
      await onRecordResult(selectedTest.id, measuredValue, testStatus, notes);
      setSelectedTest(null);
    } catch (err: any) {
      setError(err?.message || 'خطا در ثبت نتیجه آزمون راه‌اندازی');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>چک‌لیست آزمون‌های راه‌اندازی ({tests.length})</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            آزمون‌های الکتریکی، حفاظتی و اتصال به شبکه ثبت‌شده در پرونده پروژه
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          در حال بارگذاری چک‌لیست آزمون‌ها...
        </div>
      ) : tests.length === 0 ? (
        <ExecutionEmptyState
          icon={Settings}
          title="هیچ آزمون راه‌اندازی ثبت نشده است."
          description="آزمون‌های راه‌اندازی ثبت‌شده برای پروژه در این بخش نمایش داده می‌شوند."
        />
      ) : (
        <div className="space-y-3">
          {tests.map((test) => (
            <div key={test.id} className="relative group">
              <CommissioningTestResult test={test} />

              {canEdit && onRecordResult && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => openRecordModal(test)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all min-h-[38px] flex items-center gap-1 border border-slate-200 dark:border-zinc-700"
                  >
                    <span>{test.measuredValue ? 'ویرایش نتیجه' : 'ثبت مقدار و نتیجه آزمون'}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Record Result Modal */}
      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                ثبت نتیجه آزمون فنی
              </h4>
              <button
                onClick={() => setSelectedTest(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-xs text-rose-700 border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitResult} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  نوع آزمون:
                </label>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 font-bold text-slate-800 dark:text-zinc-200">
                  {selectedTest.testType}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  مقدار اندازه‌گیری شده ({selectedTest.unit || 'واحد سنجش'}):
                </label>
                <input
                  type="text"
                  required
                  value={measuredValue}
                  onChange={(e) => setMeasuredValue(e.target.value)}
                  placeholder={`مثلاً: ${selectedTest.expectedRange || '500'}`}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 font-mono text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  وضعیت قبولی آزمون:
                </label>
                <select
                  value={testStatus}
                  onChange={(e) => setTestStatus(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PASSED">مورد تأیید (PASSED)</option>
                  <option value="FAILED">مردود (FAILED)</option>
                  <option value="REQUIRES_RETEST">نیازمند تکرار آزمون (REQUIRES_RETEST)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  توضیحات و شرایط تست:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="شرایط محیطی، تجهیز کالیبره‌شده یا یادداشت فنی..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTest(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 text-xs font-bold min-h-[44px]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs min-h-[44px] flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>ثبت و ذخیره نتیجه</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
