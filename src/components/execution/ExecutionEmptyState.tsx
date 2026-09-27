import React from 'react';
import { LucideIcon, AlertCircle, FileX, Clock, PackageX } from 'lucide-react';

interface ExecutionEmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const ExecutionEmptyState: React.FC<ExecutionEmptyStateProps> = ({
  title,
  description,
  icon: Icon = AlertCircle,
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div className={`p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex flex-col items-center justify-center ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md leading-relaxed mb-4">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all min-h-[44px] flex items-center gap-1.5"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
