import React from 'react';
import { LucideIcon, FolderSearch } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon | React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderSearch,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xs ${className}`}
      dir="rtl"
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-4 shadow-xs">
        <Icon size={26} strokeWidth={1.75} />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5 tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
          {description}
        </p>
      )}

      {actionLabel && (
        <div>
          {actionHref ? (
            <Link
              to={actionHref}
              className="btn-he-primary px-5 py-2.5 text-sm min-h-[44px]"
            >
              <span>{actionLabel}</span>
            </Link>
          ) : onAction ? (
            <Button variant="primary" size="md" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};
