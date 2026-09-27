import React, { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataTruthBadge, DataProvenanceType } from './DataTruthBadge';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backUrl?: string;
  onBack?: () => void;
  showBack?: boolean;
  actions?: ReactNode;
  dataTruth?: DataProvenanceType;
  meta?: ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backUrl,
  onBack,
  showBack = false,
  actions,
  dataTruth,
  meta,
  className = ''
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      navigate(backUrl);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`mb-6 sm:mb-8 space-y-3 ${className}`} dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              aria-label="بازگشت به صفحه قبل"
              className="mt-0.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 shadow-sm"
            >
              <ArrowRight size={18} />
            </button>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h1>
              {dataTruth && <DataTruthBadge type={dataTruth} />}
            </div>

            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                {subtitle}
              </p>
            )}

            {meta && <div className="mt-2">{meta}</div>}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
