import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, CheckCircle2, ShieldCheck, Sparkles, Building, Loader2 } from 'lucide-react';

interface AnalysisNextStepProps {
  analysisId?: string | null;
  projectId?: string | null;
  isSaved?: boolean;
  onSaveAnalysis?: () => Promise<boolean>;
  onCreateProject?: () => Promise<string | void>;
}

export const AnalysisNextStep: React.FC<AnalysisNextStepProps> = ({
  analysisId,
  projectId,
  isSaved = false,
  onSaveAnalysis,
  onCreateProject
}) => {
  const navigate = useNavigate();
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(isSaved);
  const [projectLoading, setProjectLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!onSaveAnalysis || saveLoading || saveSuccess) return;
    try {
      setSaveLoading(true);
      setActionError(null);
      const ok = await onSaveAnalysis();
      if (ok) {
        setSaveSuccess(true);
      }
    } catch (err: any) {
      setActionError(err.message || 'خطا در ذخیره‌سازی تحلیل');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleConvert = async () => {
    if (projectId) {
      navigate(`/projects/${projectId}`);
      return;
    }

    if (!onCreateProject || projectLoading) return;
    try {
      setProjectLoading(true);
      setActionError(null);
      const newProjectId = await onCreateProject();
      if (newProjectId) {
        navigate(`/projects/${newProjectId}`);
      }
    } catch (err: any) {
      setActionError(err.message || 'خطا در تبدیل تحلیل به پروژه');
    } finally {
      setProjectLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-500/30 dark:border-amber-500/20 text-right space-y-5" dir="rtl">
      {/* Title & Pitch */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-zinc-950 mb-3">
          <Building size={14} />
          <span>گام بعدی: پیاده‌سازی و اجرا</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50 mb-2">
          تبدیل تحلیل به پروژه رسمی انرژی
        </h3>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
          با ایجاد پروژه، می‌توانید مراحل طراحی، استعلام از پیمانکاران، تأمین مالی، خرید تجهیزات، اجرا و راه‌اندازی را در هوشیار انرژی مدیریت کنید.
        </p>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {actionError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        {/* Primary CTA: Convert to Project */}
        <button
          type="button"
          onClick={handleConvert}
          disabled={projectLoading}
          className="flex-1 min-h-[48px] py-3.5 px-6 rounded-xl font-bold text-base bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-zinc-950 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {projectLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span>در حال ایجاد پروژه در میزکار...</span>
            </span>
          ) : projectId ? (
            <span className="flex items-center gap-2">
              <span>مشاهده پروژه در میزکار</span>
              <ArrowLeft size={18} />
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>تبدیل تحلیل به پروژه</span>
              <ArrowLeft size={18} />
            </span>
          )}
        </button>

        {/* Secondary CTA: Save Analysis */}
        {onSaveAnalysis && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saveLoading || saveSuccess}
            className={`min-h-[48px] py-3.5 px-5 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 cursor-default'
                : 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700'
            }`}
          >
            {saveLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>تحلیل ذخیره شد</span>
              </>
            ) : (
              <>
                <Bookmark size={16} />
                <span>ذخیره تحلیل</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 pt-1">
        <ShieldCheck size={14} className="text-zinc-400 shrink-0" />
        <span>اطلاعات پروژه شما محرمانه خواهد ماند و صرفاً برای دریافت پیشنهاد و استعلام در پلتفرم به کار می‌رود.</span>
      </div>
    </div>
  );
};
