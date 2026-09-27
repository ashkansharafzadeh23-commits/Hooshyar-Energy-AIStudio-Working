import React from 'react';
import { AlertCircle, Inbox, FileQuestion, PackageOpen, HelpCircle } from 'lucide-react';

interface CommercialEmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: 'inbox' | 'question' | 'package' | 'alert';
  helpNotice?: string;
  className?: string;
}

export const CommercialEmptyState: React.FC<CommercialEmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon = 'inbox',
  helpNotice,
  className = ''
}) => {
  const IconComponent = () => {
    switch (icon) {
      case 'question':
        return <FileQuestion className="w-10 h-10 text-slate-400" />;
      case 'package':
        return <PackageOpen className="w-10 h-10 text-slate-400" />;
      case 'alert':
        return <AlertCircle className="w-10 h-10 text-amber-500" />;
      case 'inbox':
      default:
        return <Inbox className="w-10 h-10 text-slate-400" />;
    }
  };

  return (
    <div className={`p-8 text-center bg-white dark:bg-zinc-900/60 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 ${className}`}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 flex items-center justify-center">
        <IconComponent />
      </div>
      <h4 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-1">
        {title}
      </h4>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto mb-5 leading-relaxed">
        {description}
      </p>

      {helpNotice && (
        <div className="mb-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-medium border border-amber-200 dark:border-amber-800/50">
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{helpNotice}</span>
        </div>
      )}

      {actionText && onAction && (
        <div>
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer min-h-[44px]"
          >
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
};
